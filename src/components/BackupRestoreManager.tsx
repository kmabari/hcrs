import React, { useState, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  writeBatch, 
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Database, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert, 
  Download,
  Terminal,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface BackupRestoreManagerProps {
  adminUser: any;
  onRefresh?: () => void;
}

export default function BackupRestoreManager({ adminUser, onRefresh }: BackupRestoreManagerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [targetCollection, setTargetCollection] = useState<string>('auto');
  const [statSummary, setStatSummary] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInputText, setClearInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security check - Only master admin
  const MAIN_ADMINS = [
    'kmabarikiyafoods@gmail.com',
    'hcrsindia@gmail.com',
    'admin@hcrs.society',
    '9645934571@hcrs.society',
    'mabarikiyafoods@gmail.com',
    'hcrskerala@gmail.com'
  ];
  const isSuperAdmin = MAIN_ADMINS.includes(adminUser?.email || '');

  if (!isSuperAdmin) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto border border-red-250 bg-red-50/20 rounded-3xl mt-12 space-y-4 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Access Restricted: Database Restore</h3>
        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
          ഈ ഡാറ്റാബേസ് റീസ്റ്റോർ (Database Restore) പാനൽ അതീവ സുരക്ഷാ വിഭാഗത്തിൽ ഉള്ളതാണ്. ഇത് പ്രവർത്തിപ്പിക്കാൻ മാസ്റ്റർ അഡ്മിൻമാർക്ക് മാത്രമേ അവകാശമുള്ളൂ.
        </p>
        <p className="text-[10px] font-mono text-slate-400">Authorized Admin Email check failed: {adminUser?.email || 'Guest'}</p>
      </Card>
    );
  }

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const handleTextParse = () => {
    if (!pastedText.trim()) {
      toast.error("ദയവായി ആദ്യം ശരിയായ JSON കോഡ് കോപ്പി പേസ്റ്റ് ചെയ്യുക!");
      return;
    }

    setFile(null);
    setParsedData(null);
    setStatSummary('');
    setLogs([]);

    try {
      const json = JSON.parse(pastedText);
      setParsedData(json);
      addLog("പേസ്റ്റ് ചെയ്ത വരികൾ വിജയകരമായി വേർതിരിച്ചെടുത്തു.");
      
      if (Array.isArray(json)) {
        addLog(`കണ്ടെത്തിയ ഡാറ്റ: ${json.length} ഡോക്യുമെന്റുകൾ അടങ്ങിയ അറേ (Array).`);
        setStatSummary(`Array format detected: contains ${json.length} records.`);
      } else if (typeof json === 'object' && json !== null) {
        const keys = Object.keys(json);
        addLog(`കണ്ടെത്തിയ ഡാറ്റ: ഉള്ളടക്കം ഉള്ള ഒബ്ജക്റ്റ് (Object). ഉൾക്കൊള്ളുന്ന Keys: [${keys.join(', ')}]`);
        
        let breakdown = 'Object shape detected.\n';
        keys.forEach(k => {
          if (Array.isArray(json[k])) {
            breakdown += `- "${k}": ${json[k].length} records (Array)\n`;
          } else if (typeof json[k] === 'object' && json[k] !== null) {
            breakdown += `- "${k}": ${Object.keys(json[k]).length} fields/records (Object Map)\n`;
          }
        });
        setStatSummary(breakdown);
      }
      toast.success("JSON ഡാറ്റ വിജയകരമായി ലോഡ് ചെയ്തു!");
    } catch (err: any) {
      toast.error("പകർത്തൽ പരാജയപ്പെട്ടു: നൽകിയ വരികൾ ശരിയായ JSON ഫോർമാറ്റിൽ അല്ല.");
      addLog(`Error parsing pasted JSON: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData(null);
    setStatSummary('');
    setLogs([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        setParsedData(json);
        
        addLog(`ഫയൽ വിജയകരമായി റീഡ് ചെയ്തു: ${selectedFile.name}`);
        
        if (Array.isArray(json)) {
          addLog(`കണ്ടെത്തിയ ഡാറ്റ: ${json.length} ഡോക്യുമെന്റുകൾ അടങ്ങിയ അറേ (Array).`);
          setStatSummary(`Array format detected: contains ${json.length} records.`);
        } else if (typeof json === 'object') {
          const keys = Object.keys(json);
          addLog(`കണ്ടെത്തിയ ഡാറ്റ: ഉള്ളടക്കം ഉള്ള ഒബ്ജക്റ്റ് (Object). ഉൾക്കൊള്ളുന്ന Keys: [${keys.join(', ')}]`);
          
          let breakdown = 'Object shape detected.\n';
          keys.forEach(k => {
            if (Array.isArray(json[k])) {
              breakdown += `- "${k}": ${json[k].length} records (Array)\n`;
            } else if (typeof json[k] === 'object' && json[k] !== null) {
              breakdown += `- "${k}": ${Object.keys(json[k]).length} fields/records (Object Map)\n`;
            }
          });
          setStatSummary(breakdown);
        }
      } catch (err: any) {
        toast.error("JSON ഫയൽ ഇൻവാലിഡ് ആണ്: " + err.message);
        addLog(`Error parsing JSON: ${err.message}`);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleRestore = async () => {
    if (!parsedData) {
      toast.error("സംരക്ഷിച്ച ബാക്കപ്പ് ഫയൽ ആദ്യം തിരഞ്ഞെടുക്കുക!");
      return;
    }

    setIsProcessing(true);
    setShowRestoreConfirm(false);
    addLog("റീസ്റ്റോർ പ്രക്രിയ ആരംഭിക്കുന്നു...");
    const toastId = toast.loading("ഡാറ്റാബേസ് റീസ്റ്റോർ ചെയ്യുന്നു...");

    try {
      let writeCount = 0;
      let dataToRestore = parsedData;

      // 1. INTELLIGENT DEEP UNWRAPPING (SELF-HEALING)
      if (dataToRestore && !Array.isArray(dataToRestore) && typeof dataToRestore === 'object') {
        let unwrapped = false;
        
        for (let level = 0; level < 3; level++) {
          const keys = Object.keys(dataToRestore);
          const wrapperKeys = ['data', 'collections', 'db', 'backup', 'exports', 'payload'];
          let wrapperFound = '';
          for (const wk of wrapperKeys) {
            if (keys.includes(wk) && dataToRestore[wk] && typeof dataToRestore[wk] === 'object' && !Array.isArray(dataToRestore[wk])) {
              wrapperFound = wk;
              break;
            }
          }

          if (wrapperFound) {
            addLog(`കണ്ടെത്തി: സുരക്ഷിതമായ '${wrapperFound}' എന്ന എൻവലപ്പ് അൺവ്രാപ്പ് (Unwrap) ചെയ്യുന്നു...`);
            dataToRestore = dataToRestore[wrapperFound];
            unwrapped = true;
            continue;
          }

          if (keys.length === 1) {
            const singleKey = keys[0];
            const innerVal = dataToRestore[singleKey];
            if (innerVal && typeof innerVal === 'object' && !Array.isArray(innerVal)) {
              addLog(`കണ്ടെത്തി: സിംഗിൾ പ്രോപ്പർട്ടി '${singleKey}' എൻവലപ്പ് അൺവ്രാപ്പ് ചെയ്യുന്നു...`);
              dataToRestore = innerVal;
              unwrapped = true;
              continue;
            }
          }
          
          break;
        }

        if (unwrapped) {
          addLog("അൺവ്രാപ്പ് ചെയ്ത് ലഭിച്ച കളക്ഷനുകൾ: [" + Object.keys(dataToRestore).join(', ') + "]");
        }
      }

      // Type 1: Multi-collection JSON map: { "users": [...], "districtQuotas": [...] }
      if (!Array.isArray(dataToRestore) && typeof dataToRestore === 'object' && targetCollection === 'auto') {
        const keys = Object.keys(dataToRestore);
        addLog(`മൾട്ടി-കളക്ഷൻ റീസ്റ്റോർ ആരംഭിക്കുന്നു: [${keys.join(', ')}]`);

        for (const collName of keys) {
          try {
            const content = dataToRestore[collName];

            if (content === null || content === undefined) {
              addLog(`കളക്ഷൻ "${collName}" ഒഴിവാക്കുന്നു (ശൂന്യമാണ്).`);
              continue;
            }

            if (['logs', 'migration_logs', 'system_logs', 'sessions', 'audit'].includes(collName)) {
              addLog(`സിസ്റ്റം കമ്പാനിയൻ കളക്ഷൻ "${collName}" സുരക്ഷിതമായി ഒഴിവാക്കി.`);
              continue;
            }

            addLog(`കളക്ഷൻ പ്രോസസ്സ് ചെയ്യുന്നു: "${collName}"`);

            const existingDocsSet = new Set<string>();
            try {
              const querySnap = await getDocs(collection(db, collName));
              querySnap.forEach(d => existingDocsSet.add(d.id));
              if (existingDocsSet.size > 0) {
                addLog(`ആകെ ${existingDocsSet.size} രേഖകൾ ഇതിനകം ഡാറ്റാബേസിൽ ഉണ്ടെന്ന് കണ്ടെത്തി.`);
              }
            } catch (err) {
              console.warn(`Could not fetch existing docs for deduplication of ${collName}:`, err);
            }

            // Case A: Simple array of items (e.g. { "users": [...] })
            if (Array.isArray(content)) {
              let skippedCount = 0;
              
              const itemsToRestore = content.filter((item: any, idInChunk: number) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
                let docId = item.uid || item.id || item.membershipId || item.mobile || `imported_${collName}_${idInChunk}`;
                if (collName === 'settings' && item.id === 'main_config') {
                  docId = 'main_config';
                }
                if (existingDocsSet.has(String(docId))) {
                  skippedCount++;
                  return false;
                }
                return true;
              });

              if (skippedCount > 0) {
                addLog(`സ്മാർട്ട് സ്കിപ്പ് (Skipped): ഇതിനകം കയറ്റിയിട്ടുള്ള ${skippedCount} റെക്കോർഡുകൾ കണ്ടെത്തി, അവ വിട്ടുകളഞ്ഞു.`);
              }

              if (itemsToRestore.length === 0) {
                addLog(`"${collName}": പുതിയതായി ചേർക്കാൻ റെക്കോർഡുകൾ ഒന്നുമില്ല (എല്ലാം ഇതിനകം നിലവിലുണ്ട്).`);
                continue;
              }

              for (let i = 0; i < itemsToRestore.length; i += 100) {
                const chunk = itemsToRestore.slice(i, i + 100);
                const batch = writeBatch(db);
                
                chunk.forEach((item: any, idInChunk: number) => {
                  let docId = item.uid || item.id || item.membershipId || item.mobile || `imported_${collName}_${i + idInChunk}`;
                  if (collName === 'settings' && item.id === 'main_config') {
                    docId = 'main_config';
                  }
                  const itemRef = doc(db, collName, String(docId));
                  const cleanItem = { ...item };
                  delete cleanItem.id;
                  
                  batch.set(itemRef, cleanItem, { merge: true });
                  writeCount++;
                });
                
                await batch.commit();
                addLog(`"${collName}": പുതിയ ${chunk.length} രേഖകൾ വിജയകരമായി എഴുതി കഴിഞ്ഞു.`);
              }
            } 
            // Case B: Map of document ID to document data (e.g. { "users": { "uid123": {...} } })
            else if (typeof content === 'object') {
              const docIds = Object.keys(content);
              const hasArrayValues = docIds.some(dId => Array.isArray(content[dId]));
              if (hasArrayValues) {
                addLog(`⚠️ മുന്നറിയിപ്പ്: കളക്ഷൻ "${collName}" ൽ ലിസ്റ്റ് കണ്ടെത്തി. അതിലെ ഡോക്യുമെന്റ് ഡാറ്റ ഒബ്ജക്റ്റ് അല്ല. ഒഴിവാക്കുന്നു!`);
                continue;
              }

              let skippedCount = 0;
              const docIdsToRestore = docIds.filter(docId => {
                if (existingDocsSet.has(docId)) {
                  skippedCount++;
                  return false;
                }
                return true;
              });

              if (skippedCount > 0) {
                addLog(`സ്മാർട്ട് സ്കിപ്പ് (Skipped): ഇതിനകം കയറ്റിയിട്ടുള്ള ${skippedCount} മാപ്പ് ചെയ്ത രേഖകൾ ഒഴിവാക്കി.`);
              }

              if (docIdsToRestore.length === 0) {
                addLog(`"${collName}": പുതിയതായി ചേർക്കാൻ പുതിയ രേഖകൾ ഒന്നുമില്ല.`);
                continue;
              }

              const batch = writeBatch(db);
              let subCounter = 0;

              for (const docId of docIdsToRestore) {
                const docData = content[docId];
                if (!docData || typeof docData !== 'object' || Array.isArray(docData)) {
                  continue;
                }

                const itemRef = doc(db, collName, docId);
                batch.set(itemRef, docData, { merge: true });
                writeCount++;
                subCounter++;

                if (subCounter >= 100) {
                  await batch.commit();
                  subCounter = 0;
                }
              }
              if (subCounter > 0) {
                await batch.commit();
              }
              addLog(`"${collName}": ${subCounter} പുതിയ രേഖകൾ വിജയകരമായി പൂർത്തിയാക്കി.`);
            }
          } catch (collErr: any) {
            console.error(`Error restoring collection ${collName}:`, collErr);
            addLog(`⚠️ തടസ്സം: "${collName}" കളക്ഷൻ എഴുതുന്നത് താൽക്കാലികമായി തടസ്സപ്പെട്ടു: ${collErr.message}`);
          }
        }
      } 
      // Type 2: Single-collection backup array imported to specific collection
      else {
        const targetColl = targetCollection === 'auto' ? 'users' : targetCollection;
        addLog(`സിംഗിൾ കളക്ഷൻ റീസ്റ്റോർ ആരംഭിക്കുന്നു. ടാർഗെറ്റ് കളക്ഷൻ: "${targetColl}"`);

        let recordsList: any[] = [];
        if (Array.isArray(dataToRestore)) {
          recordsList = dataToRestore;
        } else if (typeof dataToRestore === 'object' && dataToRestore !== null) {
          const keys = Object.keys(dataToRestore);
          if (keys.length === 1 && Array.isArray(dataToRestore[keys[0]])) {
            recordsList = dataToRestore[keys[0]];
            addLog(`യാദൃശ്ചികമായി കണ്ടെത്തിയ ഇന്നർ കളക്ഷൻ അറേ ഉപയോഗിക്കുന്നു: "${keys[0]}"`);
          } else {
            recordsList = keys
              .filter(k => dataToRestore[k] && typeof dataToRestore[k] === 'object' && !Array.isArray(dataToRestore[k]))
              .map(k => ({ uid: k, ...dataToRestore[k] }));
          }
        }

        if (recordsList.length === 0) {
          throw new Error("റീസ്റ്റോർ ചെയ്യാൻ തക്ക രേഖകൾ ഒന്നും കണ്ടെത്തിയില്ല.");
        }

        const existingDocsSet = new Set<string>();
        try {
          const querySnap = await getDocs(collection(db, targetColl));
          querySnap.forEach(d => existingDocsSet.add(d.id));
          if (existingDocsSet.size > 0) {
            addLog(`ആകെ ${existingDocsSet.size} രേഖകൾ ഇതിനകം "${targetColl}" കളക്ഷനിൽ ഉണ്ടെന്ന് കണ്ടെത്തി.`);
          }
        } catch (err) {
          console.warn(`Could not fetch existing docs for deduplication of single collection ${targetColl}:`, err);
        }

        let skippedCount = 0;
        const filteredRecordsList = recordsList.filter((item: any, idInChunk: number) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
          const docId = item.uid || item.id || item.membershipId || item.mobile || `restored_${targetColl}_${idInChunk}`;
          if (existingDocsSet.has(String(docId))) {
            skippedCount++;
            return false;
          }
          return true;
        });

        if (skippedCount > 0) {
          addLog(`സ്മാർട്ട് സ്കിപ്പ് (Skipped): ഇതിനകം കയറ്റിയിട്ടുള്ള ${skippedCount} രേഖകൾ വിട്ടുകളഞ്ഞു.`);
        }

        if (filteredRecordsList.length === 0) {
          addLog(`"${targetColl}": ഇതിനകം എല്ലാ വിവരങ്ങളും ഉണ്ട്. പുതിയ റെക്കോർഡുകൾ ഒന്നുമില്ല.`);
        } else {
          for (let i = 0; i < filteredRecordsList.length; i += 100) {
            const chunk = filteredRecordsList.slice(i, i + 100);
            const batch = writeBatch(db);

            chunk.forEach((item: any, idInChunk: number) => {
              const docId = item.uid || item.id || item.membershipId || item.mobile || `restored_${targetColl}_${i + idInChunk}`;
              const itemRef = doc(db, targetColl, String(docId));
              batch.set(itemRef, item, { merge: true });
              writeCount++;
            });

            await batch.commit();
            addLog(`Live Update: ${Math.min(i + chunk.length, filteredRecordsList.length)} / ${filteredRecordsList.length} രേഖകൾ പ്രോസസ്സ് ചെയ്തു.`);
          }
        }
      }

      toast.success(`ഡാറ്റാബേസ് റീസ്റ്റോർ വിജയകരമായി പൂർത്തിയായി! ആകെ ${writeCount} പുതിയ രേഖകൾ ചേർത്തുകഴിഞ്ഞു.`, { id: toastId });
      addLog(`SUCCESS: ഡാറ്റാബേസ് വിജയകരമായി പുനഃസ്ഥാപിച്ചു. എഴുതിയ ആകെ ഡോക്സ്: ${writeCount}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Restore failed:", err);
      toast.error("റീസ്റ്റോർ പരാജയപ്പെട്ടു: " + err.message, { id: toastId });
      addLog(`ERROR: റീസ്റ്റോർ പ്രക്രിയയ്ക്കിടയിൽ അപ്രതീختیത തടസ്സം ഉണ്ടായി: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearDatabaseBeforeRestore = async () => {
    setIsProcessing(true);
    setShowClearConfirm(false);
    addLog("കളക്ഷനുകൾ ഡിലീറ്റ് ചെയ്യാൻ ആരംഭിക്കുന്നു...");
    const toastId = toast.loading("കളക്ഷനുകൾ നീക്കം ചെയ്യുന്നു...");

    try {
      const collectionsToClear = ['users', 'districtQuotas', 'claims', 'support_tickets', 'announcements', 'committees'];
      let totalDeleted = 0;

      for (const collName of collectionsToClear) {
        addLog(`ഡിലീറ്റ് ചെയ്യുന്നു കളക്ഷൻ: "${collName}"`);
        const q = collection(db, collName);
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const docs = snap.docs;
          for (let i = 0; i < docs.length; i += 100) {
            const chunk = docs.slice(i, i + 100);
            const batch = writeBatch(db);
            chunk.forEach(d => {
              batch.delete(doc(db, collName, d.id));
              totalDeleted++;
            });
            await batch.commit();
          }
          addLog(`"${collName}": ${docs.length} ഡോക്യുമെന്റുകൾ പൂർണ്ണമായും ഡിലീറ്റ് ചെയ്തു.`);
        }
      }

      // Reset the system/totals counters/metadata
      const systemTotalsRef = doc(db, 'system', 'totals');
      await setDoc(systemTotalsRef, {
        count: 1000,
        redClaimsCounter: 0,
        orangeClaimsCounter: 0,
        greenClaimsCounter: 0,
        claimsCounter: 0
      });
      addLog("സിസ്റ്റം ടോട്ടലുകളും അപേക്ഷാ കൗണ്ടറുകളും പൂജ്യത്തിലേക്ക് (Reset) മാറ്റിയിരിക്കുന്നു.");

      toast.success(`വിജയകരമായി കളക്ഷനുകൾ ഡിലീറ്റ് ചെയ്തു (Deleted docs: ${totalDeleted})`, { id: toastId });
      addLog(`SUCCESS: കളക്ഷനുകൾ ഡിലീറ്റ് ചെയ്തു കഴിഞ്ഞു. ക്ലീൻ സ്ലേറ്റ് റെഡിയാണ്.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("ഡിലീറ്റ് ചെയ്യുന്നത് പരാജയപ്പെട്ടു: " + err.message, { id: toastId });
      addLog(`ERROR: ഡിലീറ്റ് പ്രക്രിയയിൽ എറർ: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper validation for the confirm input text
  const getVerificationIsValid = () => {
    const validPhrases = ['RESTORE-CLEAR', 'CLEAR', 'DELETE', 'ക്ലിയർ', 'ഡിലീറ്റ്'];
    const cleanedInput = clearInputText.trim().toUpperCase();
    return validPhrases.includes(cleanedInput) || clearInputText.trim() === 'ക്ലിയർ' || clearInputText.trim() === 'ഡിലീറ്റ്';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* Alert Panel detailing manual restore benefits */}
      <Card className="border border-brand-blue/20 bg-brand-blue/5 rounded-3xl overflow-hidden shadow-xs">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start gap-4">
          <div className="bg-brand-blue/10 p-3 rounded-2xl text-brand-blue shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
              HCRS Database Restore & Setup Wizard (ഡാറ്റാബേസ് സുരക്ഷാ പാനൽ)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              നിലവിലുള്ള ക്വാട്ട പരിധികൾ മറികടക്കുന്നതിനും, പ്ലാറ്റ്‌ഫോമിന്റെ ഡിഫോൾട്ട് ഡാറ്റാബേസിലേക്ക് (default database) മാറുന്നതിനും വേണ്ടി നിങ്ങളുടെ പഴയ ബാക്കപ്പ് ഡാറ്റ നേരിട്ട് പുതിയ ഡാറ്റാബേസിലേക്ക് അപ്‌ലോഡ് ചെയ്യാൻ ഈ ഡിജിറ്റൽ റീസ്റ്റോർ ഉപകരണം നിങ്ങളെ സഹായിക്കും.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Operations Controls Panel */}
        <Card className="p-6 border border-slate-200 bg-white rounded-3xl shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-blue" />
                Upload / Import Backup Data
              </h4>
              <p className="text-[11px] text-slate-400 font-bold uppercase">പഴയ ബാക്കപ്പ് ലോഡ് ചെയ്യുക</p>
            </div>

            {/* Split Method Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setImportMethod('file')}
                className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                  importMethod === 'file' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                File Upload (ബാക്കപ്പ് ഫയൽ)
              </button>
              <button
                type="button"
                onClick={() => setImportMethod('text')}
                className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                  importMethod === 'text' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Copy Paste (കോഡ് പേസ്റ്റ്)
              </button>
            </div>

            {importMethod === 'file' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-brand-blue/35 bg-slate-50/50 hover:bg-brand-blue/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200"
              >
                <div className="h-10 w-10 rounded-xl bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center text-brand-blue shrink-0">
                  <FileJson className="w-5 h-5" />
                </div>
                <div className="text-center space-y-1 select-none">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Select Backup JSON File</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Supports multi-collection objects & arrays</p>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="w-full h-36 bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 text-[11px] font-mono leading-relaxed text-slate-700 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue/35 transition-all text-left"
                  placeholder="നിങ്ങൾ ഗൂഗിൾ ഡ്രൈവിലോ മറ്റോ ബാക്കപ്പ് ചെയ്തു വച്ചിരിക്കുന്ന മുഴുവൻ JSON ടെക്സ്റ്റും (കോഡ്) ഇവിടെ കോപ്പി ചെയ്ത് പേസ്റ്റ് ചെയ്യുക..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={handleTextParse}
                  className="w-full bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider py-4.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileJson className="w-4 h-4 text-emerald-400" />
                  Parse Pasted Code (പേസ്റ്റ് ചെയ്ത കോഡ് ലോഡ് ചെയ്യുക)
                </Button>
              </div>
            )}

            {importMethod === 'file' && file && (
              <div className="p-3 bg-brand-blue/5 border border-brand-blue/10 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate font-mono">{file.name}</p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">Size: {(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}

            {statSummary && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Detected structure analysis:</p>
                <code className="text-[10px] font-mono leading-relaxed text-slate-700 block whitespace-pre-wrap text-left break-all bg-white p-2.5 border border-slate-100 rounded-lg">
                  {statSummary}
                </code>
              </div>
            )}

            {/* Target Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">Target Destination Collection</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/5"
                value={targetCollection}
                onChange={(e) => setTargetCollection(e.target.value)}
              >
                <option value="auto">Auto-detect Collections (മൾട്ടി-പാക്ക് ഓട്ടോമാറ്റിക്)</option>
                <option value="users">Force into 'users' (മെമ്പർമാർ മാത്രമായി)</option>
                <option value="districtQuotas">Force into 'districtQuotas' (ജില്ലാ ക്വാട്ടകൾ)</option>
                <option value="claims">Force into 'claims' (ക്ലെയിമുകൾ)</option>
                <option value="announcements">Force into 'announcements' (നോട്ടിഫിക്കേഷനുകൾ)</option>
                <option value="committees">Force into 'committees' (കമ്മിറ്റികൾ)</option>
              </select>
            </div>
          </div>

          {showRestoreConfirm ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 pt-6 border-t mt-6">
              <p className="text-xs font-bold text-amber-800 leading-normal flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>മുന്നറിയിപ്പ്:</strong> തീർച്ചയായും നിങ്ങൾ ഈ ബാക്കപ്പ് ഡാറ്റ പുതിയ ഫയർബേസ് ഡാറ്റാബേസിലേക്ക് റീസ്റ്റോർ ചെയ്യാൻ ആഗ്രഹിക്കുന്നുണ്ടോ? തെറ്റായ ഫോർമാറ്റ് ആണെങ്കിൽ ഡാറ്റ ക്രമരഹിതമാകാൻ സാധ്യതയുണ്ട്.
                </span>
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleRestore}
                  disabled={isProcessing}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl flex-1"
                >
                  Confirm Restore (തീർച്ചയായും)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRestoreConfirm(false)}
                  disabled={isProcessing}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200"
                >
                  Cancel (റദ്ദാക്കുക)
                </Button>
              </div>
            </div>
          ) : showClearConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 pt-6 border-t mt-6">
              <div className="text-xs font-bold text-red-800 leading-normal flex flex-col gap-1.5">
                <span className="flex items-start gap-1.5 font-black uppercase text-red-700 tracking-wider text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  ആക്ഷൻ ആവശ്യമാണ് (Action Required)
                </span>
                <span>
                  ആകെ മെമ്പർമാരെയും ക്വാട്ടകളെയും നീക്കം ചെയ്യാൻ ദയവായി താഴെ കോളം ടൈപ്പ് ചെയ്ത ശേഷം നിർവഹിക്കുക:
                </span>
                <span className="text-[10px] text-red-600 italic leading-relaxed">
                  ടൈപ്പ് ചെയ്യുക: <strong>RESTORE-CLEAR</strong> അല്ലെങ്കിൽ <strong>ക്ലിയർ</strong>
                </span>
              </div>
              <input
                type="text"
                placeholder="RESTORE-CLEAR / ക്ലിയർ"
                className="w-full bg-white border-2 border-red-200 rounded-xl px-3 py-2.5 text-xs text-center uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-red-100"
                value={clearInputText}
                onChange={(e) => setClearInputText(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!getVerificationIsValid()) {
                      toast.error("സ്ഥിരീകരണ വാക്ക് തെറ്റാണ്! ദയവായി 'RESTORE-CLEAR' അല്ലെങ്കിൽ 'ക്ലിയർ' എന്ന് ടൈപ്പ് ചെയ്യുക.");
                      return;
                    }
                    clearDatabaseBeforeRestore();
                  }}
                  disabled={isProcessing || !getVerificationIsValid()}
                  className="bg-red-600 hover:bg-red-750 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl flex-1 disabled:opacity-50"
                >
                  Verify & Clear (സ്ഥിരീകരിച്ച് നീക്കുക)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowClearConfirm(false);
                    setClearInputText('');
                  }}
                  disabled={isProcessing}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200"
                >
                  Cancel (റദ്ദാക്കുക)
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 mt-6 shrink-0">
              <Button 
                onClick={() => {
                  if (!parsedData) {
                    toast.error("സംരക്ഷിച്ച ബാക്കപ്പ് ഫയൽ ആദ്യം തിരഞ്ഞെടുക്കുക!");
                    return;
                  }
                  setShowRestoreConfirm(true);
                }}
                disabled={isProcessing || !parsedData}
                className="bg-brand-blue text-white font-bold text-xs uppercase tracking-wider py-5.5 rounded-2xl flex-1 flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Begin Data Restore (റീസ്റ്റോർ ചെയ്യുക)
              </Button>

              <Button 
                onClick={() => setShowClearConfirm(true)}
                variant="destructive"
                disabled={isProcessing}
                className="bg-red-500 hover:bg-red-650 text-white font-bold text-xs uppercase tracking-wider py-5.5 rounded-2xl flex items-center justify-center gap-1.5 shrink-0"
              >
                <AlertTriangle className="w-4 h-4" />
                Clear New Firestore
              </Button>
            </div>
          )}
        </Card>

        {/* Console Log Auditing Output Panel */}
        <Card className="p-6 border border-slate-200 bg-slate-900 rounded-3xl shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                Live Operation logs
              </h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase">പുരോഗതി ലോഗുകൾ</p>
            </div>

            <div className="bg-black/40 border border-slate-800 rounded-2xl p-4 min-h-[220px] max-h-[300px] overflow-y-auto font-mono text-[10px] text-slate-300 space-y-2 text-left scrollbar-thin">
              {logs.length === 0 ? (
                <p className="text-slate-500 italic select-none">No actions processed yet. Upload a JSON backup file above and initiate restore.</p>
              ) : (
                logs.map((log, index) => (
                  <p key={index} className={`leading-relaxed break-words py-0.5 ${
                    log.includes('ERROR') ? 'text-rose-400 font-bold' : 
                    log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : 
                    log.includes('PROGRESS') || log.includes('രേഖകൾ') || log.includes('സ്മാർട്ട്') ? 'text-teal-400' : 'text-slate-300'
                  }`}>
                    {log}
                  </p>
                ))
              )}
            </div>
            
            <div className="p-4 bg-slate-800/50 border border-slate-800 rounded-2xl space-y-2">
              <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                Safe database transition checklist:
              </p>
              <ul className="text-[9px] text-slate-400 space-y-1 list-disc pl-3 leading-relaxed">
                <li>ലോഗ് ഇൻ ചെയ്യുമ്പോൾ തന്നെ നിങ്ങളെ ഡിഫോൾട്ട് ഡാറ്റാബേസിലേക്ക് മാറ്റിയിരിക്കും (പൂർണ്ണമായും സുരക്ഷിതമാണ്).</li>
                <li>ഡ്യൂപ്ലിക്കേഷനുകൾ തടയാൻ ആദ്യം <span className="text-rose-400 font-bold">'Clear New Firestore'</span> നൽകുന്നത് നല്ലതാണ്.</li>
                <li>ബാക്കപ്പ് ചെയ്ത JSON ഫയൽ നേരിട്ട് തിരഞ്ഞെടുത്ത് 'Begin Data Restore' കമാൻഡ് നൽകുക.</li>
              </ul>
            </div>
          </div>
        </Card>

      </div>

    </div>
  );
}
