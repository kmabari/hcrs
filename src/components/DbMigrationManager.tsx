import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Loader2, 
  ShieldAlert, 
  FileText,
  Clock,
  Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface DbMigrationManagerProps {
  user: any;
}

// Collections to backup and restore
const TARGET_COLLECTIONS = [
  'users',
  'claims',
  'gallery',
  'gallery_categories',
  'announcements',
  'committees',
  'support_tickets',
  'districtQuotas',
  'org_settings',
  'settings'
];

export default function DbMigrationManager({ user }: DbMigrationManagerProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; collection: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [generatedBackupJson, setGeneratedBackupJson] = useState<string>('');
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Helper: Recursive Timestamp Serializer
  const serializeValue = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (val instanceof Timestamp) {
      return { __type: 'timestamp', seconds: val.seconds, nanoseconds: val.nanoseconds };
    }
    // Handle standard JS Date as well
    if (val instanceof Date) {
      return { __type: 'timestamp', seconds: Math.floor(val.getTime() / 1000), nanoseconds: (val.getTime() % 1000) * 1000000 };
    }
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.map(serializeValue);
      }
      const res: any = {};
      for (const key of Object.keys(val)) {
        res[key] = serializeValue(val[key]);
      }
      return res;
    }
    return val;
  };

  // Helper: Recursive Timestamp Deserializer
  const deserializeValue = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'object') {
      if (val.__type === 'timestamp') {
        return new Timestamp(val.seconds, val.nanoseconds);
      }
      if (Array.isArray(val)) {
        return val.map(deserializeValue);
      }
      const res: any = {};
      for (const key of Object.keys(val)) {
        res[key] = deserializeValue(val[key]);
      }
      return res;
    }
    return val;
  };

  // Action: Export Database
  const handleExport = async () => {
    setExporting(true);
    setGeneratedBackupJson('');
    const toastId = toast.loading('ഡാറ്റാബേസ് വായിക്കുന്നു, ദയവായി കാത്തിരിക്കുക (Fetching database rows...)...');
    try {
      const backupPayload: any = {
        backupVersion: '2.0',
        exportedAt: new Date().toISOString(),
        exportedByEmail: user?.email || 'admin',
        data: {}
      };

      for (const colName of TARGET_COLLECTIONS) {
        console.log(`Backing up collection: ${colName}`);
        try {
          const snapshot = await getDocs(collection(db, colName));
          backupPayload.data[colName] = snapshot.docs.map(docSnap => ({
            __id: docSnap.id,
            ...serializeValue(docSnap.data())
          }));
        } catch (collectionErr: any) {
          console.warn(`Failed to export collection ${colName}:`, collectionErr);
          // If some collections fail due to quota during backup, we don't want the entire backup to abort
          // we can include what we managed or raise warning
          backupPayload.data[colName] = [];
          if (collectionErr.message?.includes('Quota') || collectionErr.message?.includes('quota')) {
            throw new Error(`ഫയർബേസ് ഗൂഗിൾ ക്വോട്ട (Quota Limit) കവിഞ്ഞിരിക്കുന്നു. ${colName} ലേക്ക് പ്രവേശിക്കാൻ പറ്റിയില്ല. ദയവായി റീസെറ്റ് ടൈം വരെ കാത്തിരിക്കുക.`);
          }
        }
      }

      // Generate downloadable JSON
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      setGeneratedBackupJson(jsonStr);
      
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `HCRS_FIREBASE_GOLD_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('ബാക്കപ്പ് ഡാറ്റ വിജയകരമായി തയ്യാറാക്കിയിരിക്കുന്നു! ഡൗൺലോഡ് ആയിട്ടില്ലെങ്കിൽ ചുവടെയുള്ള കോപ്പി ഓപ്ഷൻ ഉപയോഗിക്കുക.', { id: toastId, duration: 8000 });
    } catch (error: any) {
      console.error('Backup export failed:', error);
      toast.error(`ബാക്കപ്പ് പരാജയപ്പെട്ടു: ${error.message || error}`, { id: toastId, duration: 8000 });
    } finally {
      setExporting(false);
    }
  };

  const copyBackupToClipboard = () => {
    if (!generatedBackupJson) return;
    navigator.clipboard.writeText(generatedBackupJson);
    setCopiedBackup(true);
    toast.success('ബാക്കപ്പ് കോഡ് ക്ലിപ്പ്ബോർഡിലേക്ക് കോപ്പി ചെയ്തു! (Backup JSON copied to clipboard!)');
    setTimeout(() => setCopiedBackup(false), 3000);
  };

  // Action: Handle File Upload & Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.backupVersion || !json.data) {
          toast.error('സാധുവായ ഒരു HCRS ബാക്കപ്പ് ഫയൽ തിരഞ്ഞെടുക്കുക! (Invalid local HCRS backup file format.)');
          setSelectedFile(null);
          setParsedData(null);
          return;
        }
        setParsedData(json);
        toast.success('ബാക്കപ്പ് ഫയൽ കണ്ടെത്തി വിശകലനം ചെയ്തിരിക്കുന്നു (Backup file loaded and verified!)');
      } catch (err: any) {
        toast.error(`ഫയൽ വായിക്കാൻ സാധിക്കുന്നില്ല: ${err.message}`);
        setSelectedFile(null);
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  // Action: Restore Database
  const handleRestore = async () => {
    if (!parsedData) return;
    const confirmRestore = window.confirm(
      "ഈ ബാക്കപ്പ് നിലവിലെ ഡാറ്റാബേസിലേക്ക് മാറ്റി എഴുതാൻ പോവുകയാണ്. നിലവിലുള്ള റൗഡുകൾ നിലനിൽക്കും, കൂടുതൽ റോകൾ കൂട്ടിചേർക്കും. തുടരട്ടെ?\n\nThis will write restore files to Firestore. Are you sure you want to proceed?"
    );
    if (!confirmRestore) return;

    setImporting(true);
    const toastId = toast.loading('ബാക്കപ്പ് പുനഃസ്ഥാപിക്കുന്നു (Restoring firebase collections)...');

    try {
      const collections = Object.keys(parsedData.data);
      let overallTotal = 0;
      let overallRestored = 0;

      // Count total docs to restore
      collections.forEach(col => {
        overallTotal += parsedData.data[col].length;
      });

      for (const colName of TARGET_COLLECTIONS) {
        const docsArray = parsedData.data[colName] || [];
        if (docsArray.length === 0) continue;

        console.log(`Restoring collection: ${colName}`);
        
        // Restore documents sequentially or in batches
        // We write sequentially to prevent hitting Firebase transactional load and gracefully update progress
        for (let i = 0; i < docsArray.length; i++) {
          const docItem = { ...docsArray[i] };
          const docId = docItem.__id;
          delete docItem.__id; // Extract inner system id

          // Restore native Firestore Timestamps recursively
          const cleanedDocItem = deserializeValue(docItem);

          // Write directly to Firestore with original ID
          await setDoc(doc(db, colName, docId), cleanedDocItem);
          
          overallRestored++;
          setProgress({
            current: overallRestored,
            total: overallTotal,
            collection: `${colName} (${i + 1}/${docsArray.length})`
          });
        }
      }

      toast.success('ഡാറ്റ വിജയകരമായി പുതിയ ഡാറ്റാബേസിലേക്ക് പുനഃസ്ഥാപിച്ചിരിക്കുന്നു! (Total items imported: ' + overallRestored + ')', { id: toastId });
      setProgress(null);
      setSelectedFile(null);
      setParsedData(null);
    } catch (error: any) {
      console.error('Migration restore failure:', error);
      toast.error(`ഡാറ്റ മാറ്റം പരാജയപ്പെട്ടു: ${error.message || error}`, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-brand-magenta" />
          ഡാറ്റാബേസ് മൈഗ്രേഷൻ & ബാക്കപ്പ് (Project Database Migration Core)
        </h2>
        <p className="text-xs text-slate-500 font-bold max-w-3xl">
          ഫയർബേസ് സഫാരി അക്കൗണ്ടുകൾ മാറ്റുമ്പോഴോ, ഡാറ്റ നഷ്ടപ്പെടാതെ ബാക്കപ്പ് എടുക്കാനോ ഈ പ്രീമിയം സെല്ലുലാർ വിൻഡോ ഉപയോഗിക്കാം.
        </p>
      </div>

      {/* WARNING BANNER */}
      <Card className="border-red-250 bg-red-50/50 shadow-none overflow-hidden">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="bg-red-550/10 p-2 rounded-xl text-red-500 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-red-750 uppercase tracking-wider">അതീവ ശ്രദ്ധിക്കുക! (Critical Security Notice)</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
              തങ്കൾ ഇപ്പോഴുള്ള <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">kmabarikiyafoods@gmail.com</span> പ്രൊജക്റ്റിൽ നിന്നും പുതിയ <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">hcrskerala@gmail.com</span> Blaze പ്രൊജക്റ്റിലേക്ക് ഡാറ്റ സുരക്ഷിതമായി മാറ്റുന്നതിനുള്ള സഹായിയാണിത്. 
              താഴെയുള്ള നിർദ്ദേശങ്ങൾ അതേപടി പാലിക്കുക.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* STEP 1: EXPORT */}
        <Card className="border-slate-100 dark:border-slate-800 shadow-md shadow-slate-100/40 overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center bg-blue-500 text-white w-5 h-5 rounded-full text-[10px] font-black">1</span>
              <CardTitle className="text-sm font-extrabold text-slate-800">സ്റ്റെപ്പ് 1: ഡാറ്റാബേസ് ഡൗൺലോഡ് ചെയ്യുക (Export)</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold text-slate-400">
              നിലവിലുള്ള മുഴുവൻ അംഗങ്ങളുടെ വിവരങ്ങളും മറ്റ് സജ്ജീകരണങ്ങളും ഒരു സുരക്ഷിത സിംഗിൾ ഫയലായി നിങ്ങളുടെ കമ്പ്യൂട്ടറിലേക്ക് ഡൗൺലോഡ് ചെയ്യുക.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Clock className="w-4 h-4 text-brand-blue" />
                <span>സുരക്ഷിതമായി സൂക്ഷിക്കുന്ന വിവരങ്ങൾ:</span>
              </div>
              <ul className="text-[11px] leading-relaxed font-medium text-slate-500 list-disc list-inside space-y-1 pl-1">
                <li>മുഴുവൻ അംഗങ്ങളുടെ പ്രൊഫൈലുകൾ (അപ്പ്രൂവ്ഡ് & പെൻഡിങ്)</li>
                <li>ക്ലെയിമുകൾ, ഇൻക്വയറികൾ & സപ്പോർട്ട് ടിക്കറ്റുകൾ</li>
                <li>വാട്സ്ആപ്പ് ക്വാട്ട സെറ്റിംഗ്സ്, ജില്ലകളുടെ യൂആർഎല്ലുകൾ</li>
                <li>കമ്മിറ്റി അംഗങ്ങളുടം ലിസ്റ്റ്, ഗാലറി & മറ്റ് ഡാറ്റകൾ</li>
              </ul>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full h-11 text-xs font-black rounded-xl tracking-tight uppercase bg-brand-blue hover:bg-brand-blue/90 text-white shadow-md shadow-brand-blue/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  കംപൈൽ ചെയ്യുന്നു... (Exporting...)
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  ബാക്കപ്പ് ഡൗൺലോഡ് ചെയ്യുക (Download Gold Backup)
                </>
              )}
            </Button>

            {/* Programmatic Download Iframe warning & Clipboard copy section */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[10px] text-amber-600 font-bold leading-normal">
                ⚠️ ബ്രൗസറുകൾ സൈഡ് കിറ്റിലെ ഐഫ്രെയിമിൽ ഫയൽ ഡൗൺലോഡ് ചെയ്യാൻ അനുവദിക്കാതിരുന്നാൽ, പുതിയ ടാബിൽ തുറക്കുകയോ താഴെയുള്ള കോഡ് കോപ്പി ചെയ്യുകയോ ചെയ്യുക:
              </p>
              
              <div className="flex gap-2">
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 h-9 text-[10px] font-bold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ആപ്പ് പുതിയ ടാബിൽ തുറക്കുക
                </a>

                {generatedBackupJson && (
                  <Button
                    onClick={copyBackupToClipboard}
                    className="flex-1 h-9 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 rotate-180" />
                    {copiedBackup ? 'കോപ്പി ചെയ്തു!' : 'ഡാറ്റ കോപ്പി ചെയ്യുക'}
                  </Button>
                )}
              </div>

              {generatedBackupJson && (
                <div className="space-y-1.5 animate-in fade-in">
                  <span className="text-[9px] font-black uppercase text-slate-400">തയ്യാറാക്കിയ ബാക്കപ്പ് കോഡ് (Backup Row Data):</span>
                  <textarea
                    readOnly
                    value={generatedBackupJson}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    className="w-full h-32 text-[9px] font-mono p-2 border border-slate-200 rounded-lg bg-slate-50/50 resize-none"
                    placeholder="ബാക്കപ്പ് ഫയൽ ഇവിടെ കാണാം..."
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    * ഈ കോ ബോക്സിൽ നിന്നും എല്ലാം സെലക്ട് ചെയ്തു കോപ്പി ചെയ്തു നിങ്ങളുടെ കമ്പ്യൂട്ടറിൽ ഒരു ടെക്സ്റ്റ് ഫയലിൽ (ഉദാഹരണത്തിന് <span className="font-mono">backup.json</span>) സേവ് ചെയ്തു സൂക്ഷിക്കാം.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* STEP 2: RESTORE / IMPORT */}
        <Card className="border-slate-100 dark:border-slate-800 shadow-md shadow-slate-100/40 overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center bg-emerald-500 text-white w-5 h-5 rounded-full text-[10px] font-black">2</span>
              <CardTitle className="text-sm font-extrabold text-slate-800">സ്റ്റെപ്പ് 2: ഡാറ്റ അപ്‌ലോഡ് ചെയ്യുക (Restore / Import)</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold text-slate-400">
              പുതിയ ബ്ലൈസ് പ്രൊജക്റ്റ് ലിങ്ക് ചെയ്തുകഴിഞ്ഞ ശേഷം ഈ വിൻഡോ വഴി ഡൗൺലോഡ് ചെയ്ത ഫയൽ അപ്‌ലോഡ് ചെയ്താൽ എല്ലാ വിവരങ്ങളും സ്വയമേ റീസ്റ്റോർ ചെയ്യപ്പെടും.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            
            {/* FILE INPUT UPLOADER */}
            <div className="border-2 border-dashed border-slate-200 hover:border-brand-magenta/40 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/30 relative">
              <input 
                type="file" 
                accept=".json"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={importing}
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-black text-slate-700">
                  {selectedFile ? selectedFile.name : "ബാക്കപ്പ് ഫയൽ ഇവിടെ തിരഞ്ഞെടുക്കുക"}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {selectedFile 
                    ? `Size: ${(selectedFile.size / 1024).toFixed(1)} KB` 
                    : ".json വിപുലീകരണമുള്ള ഫയൽ മാത്രം"}
                </span>
              </div>
            </div>

            {/* PRE-UPLOAD STATISTICS SUMMARY */}
            {parsedData && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-2 animate-in fade-in">
                <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4" /> Validated Backup Found
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 pl-1 font-mono">
                  <div>Exported: {parsedData.exportedAt ? new Date(parsedData.exportedAt).toLocaleDateString() : 'N/A'}</div>
                  <div>Version: {parsedData.backupVersion || '1.0'}</div>
                  <div>Users found: {parsedData.data?.users?.length || 0}</div>
                  <div>Claims found: {parsedData.data?.claims?.length || 0}</div>
                  <div>Announcements: {parsedData.data?.announcements?.length || 0}</div>
                  <div>Tickets found: {parsedData.data?.support_tickets?.length || 0}</div>
                </div>
              </div>
            )}

            {/* PROGRESS BAR */}
            {progress && (
              <div className="space-y-1.5 animate-in fade-in">
                <div className="flex justify-between text-[11px] font-black text-slate-600 font-mono">
                  <span>Uploading: {progress.collection}</span>
                  <span>{progress.current} / {progress.total} docs</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-magenta h-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleRestore}
              disabled={importing || !parsedData}
              className="w-full h-11 text-xs font-black rounded-xl tracking-tight uppercase bg-brand-magenta hover:bg-brand-magenta/90 text-white shadow-md shadow-brand-magenta/5 flex items-center justify-center gap-2 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  റീസ്റ്റോർ ചെയ്യുന്നു... {progress ? `${Math.round((progress.current / progress.total) * 100)}%` : ''}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  റീസ്റ്റോർ ആരംഭിക്കുക (Import & Restore Data)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* QUICK VERIFICATION CHECKLIST */}
      <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/40">
          <CardTitle className="text-xs font-black uppercase text-slate-700 tracking-wider">മൈഗ്രേഷൻ പ്രക്രിയ വിജയിക്കാനുള്ള മാർഗ്ഗദർശി (Migration Step Guide):</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ol className="text-[11px] font-bold text-slate-600 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
            <li>ആദ്യം ഈ <span className="text-brand-blue font-extrabold">"Download Gold Backup"</span> ബട്ടൺ വച്ച് ഡാറ്റാബേസ് മുഴുവനായി ഫയലിലേക്ക് ഡൗൺലോഡ് ചെയ്യുക.</li>
            <li>അതിന് ശേഷം പുതിയ അഡ്മിൻ പ്രോജക്റ്റിൽ (അല്ലെങ്കിൽ പുതിയ മെയിൽ ലിങ്ക് ചെയ്ത ശേഷം) ഈ പ്രോജക്റ്റിൽ പ്രവേശിച്ച് ഇതേ വിൻഡോയിൽ വരിക.</li>
            <li>സ്റ്റെപ്പ് 2 ലെ ബാക്സിലേക്ക് ഈ ഡൗൺലോഡ് ചെയ്ത ഫയൽ സെലക്ട് ചെയ്യുക.</li>
            <li><span className="text-brand-magenta font-extrabold">"Import & Restore Data"</span> ബട്ടൺ ക്ലിക്ക് ചെയ്ത് ഫയർ സ്റ്റോറിലേക്ക് ഡാറ്റ മുഴുവൻ റീലോഡ് ചെയ്യുക.</li>
            <li>ഇത്രയും ചെയ്താൽ ഒരു വിവരവും നഷ്ടപ്പെടാതെ ഡാറ്റ മുഴുവൻ പുതിയ ഫയർബേസിലേക്ക് മാറുന്നതായിരിക്കും!</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
