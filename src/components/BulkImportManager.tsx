import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { collection, doc, writeBatch, doc as firestoreDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { DISTRICTS, CONSTITUENCIES, getDistrictCode, getAssemblyCode, generateNewMembershipId } from '../constants';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  AlertCircle, 
  BookOpen, 
  RefreshCw, 
  UserPlus, 
  UserCheck, 
  FileUp, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
  ChevronDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface BulkImportProps {
  members: UserProfile[];
  adminUser: any;
  onRefresh: () => void;
}

export default function BulkImportManager({ members, adminUser, onRefresh }: BulkImportProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  
  // Parsed raw sheet data (header row + values rows)
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Selected Column Mappings
  const [mappings, setMappings] = useState<Record<string, number>>({
    name: -1,
    firstName: -1,
    lastName: -1,
    address: -1,
    mobile: -1,
    pincode: -1,
    post: -1,
    highrichId: -1,
    assembly: -1,
    district: -1,
    joinDate: -1,
    username: -1,
  });

  // Parsed and standardized objects
  const [parsedMembers, setParsedMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    duplicates: 0,
    invalid: 0,
  });

  // Execution progress
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [currentImportIndex, setCurrentImportIndex] = useState<number>(0);
  const [importLog, setImportLog] = useState<{ type: 'success' | 'skip' | 'error'; message: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV string safely
  const parseRawCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    const result: string[][] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const row: string[] = [];
      let insideQuote = false;
      let currentPart = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          row.push(currentPart.trim().replace(/^"|"$/g, ''));
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      row.push(currentPart.trim().replace(/^"|"$/g, ''));
      result.push(row);
    }
    return result;
  };

  // Process selected file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseRawCSV(text);
        if (parsed.length > 0) {
          processRawMatrix(parsed);
        } else {
          toast.error("CSV file is empty or format invalid");
        }
      };
      reader.readAsText(file);
    } else {
      // Excel parse
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          
          const filteredMatrix = matrix.filter((row: any) => row && row.length > 0);
          if (filteredMatrix.length > 0) {
            processRawMatrix(filteredMatrix);
          } else {
            toast.error("Spreadsheet is empty");
          }
        } catch (err) {
          console.error("Excel parse error:", err);
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Convert pasted text to rows
  const handleProcessPastedText = () => {
    if (!inputText.trim()) {
      toast.error('Please paste or select some data first');
      return;
    }
    const lines = parseRawCSV(inputText);
    if (lines.length > 0) {
      processRawMatrix(lines);
      toast.success(`Successfully parsed ${lines.length} lines`);
    } else {
      toast.error('Could not parse text lines into valid table rows');
    }
  };

  // Guess columns from headers
  const guessMappings = (headersList: string[]) => {
    const newMappings = { ...mappings };
    
    headersList.forEach((h, index) => {
      const lower = h.toString().toLowerCase().trim().replace(/[\s_\-]/g, '');
      
      // Name mapping
      if (['name', 'displayname', 'fullname', 'fullname(പേര്)', 'membername'].includes(lower)) {
        newMappings.name = index;
      }
      if (['firstname', 'first'].includes(lower)) {
        newMappings.firstName = index;
      }
      if (['lastname', 'last', 'surname'].includes(lower)) {
        newMappings.lastName = index;
      }
      
      // Mobile mapping
      if (['mobile', 'mob', 'phone', 'phonenumber', 'highrichmob', 'memberhighrichmob', 'contact'].includes(lower)) {
        newMappings.mobile = index;
      }
      
      // Address mapping
      if (['address', 'memberaddress', 'permanentaddress', 'location', 'residence'].includes(lower)) {
        newMappings.address = index;
      }
      
      // Pincode and Post office
      if (['pincode', 'pin', 'zip', 'zipcode', 'postal'].includes(lower)) {
        newMappings.pincode = index;
      }
      if (['post', 'postoffice', 'po', 'postoffice(പി.ഒ)'].includes(lower)) {
        newMappings.post = index;
      }
      
      // Highrich ID / shareid
      if (['highrichid', 'memberhighrichid', 'shareid', 'share_id', 'siareicr', 'member_id'].includes(lower)) {
        newMappings.highrichId = index;
      }
      
      // Assembly and district
      if (['assembly', 'memberassembly', 'constituency', 'constituencycode'].includes(lower)) {
        newMappings.assembly = index;
      }
      if (['district', 'memberdistrict', 'dist', 'districtcode'].includes(lower)) {
        newMappings.district = index;
      }
      
      // Join date
      if (['joindate', 'registered', 'created', 'createdat', 'date', 'registeredat'].includes(lower)) {
        newMappings.joinDate = index;
      }
      
      // Username
      if (['username', 'usernm', 'login', 'userid'].includes(lower)) {
        newMappings.username = index;
      }
    });
    
    setMappings(newMappings);
  };

  // Setup header and data matrix
  const processRawMatrix = (matrix: any[][]) => {
    const rawHeaders = matrix[0].map(h => (h || '').toString().trim());
    setHeaders(rawHeaders);
    setRawRows(matrix.slice(1));
    guessMappings(rawHeaders);
    setStep(2);
  };

  // Render first 5 records in Step 2 for preview
  const previewRows = useMemo(() => {
    return rawRows.slice(0, 5);
  }, [rawRows]);

  // Perform validation, check for duplicates
  const analyzeAndValidate = () => {
    // We need either Name or FirstName, and Mobile
    const useNameIndex = mappings.name !== -1;
    const useFirstLastName = mappings.firstName !== -1;
    const useMobileIndex = mappings.mobile !== -1;

    if (!useMobileIndex) {
      toast.error("Please match the Mobile Number column (മൊബൈൽ നമ്പർ കോളം കണ്ടെത്തേണ്ടതുണ്ട്).");
      return;
    }

    if (!useNameIndex && !useFirstLastName) {
      toast.warning("Neither Full Name nor First/Last Name is mapped. Values will be set to 'Imported Member'");
    }

    const validated: any[] = [];
    let duplicatesOfMobile = 0;
    let inValidRecords = 0;

    // Create a local map of existing members for ultra-fast lookup (O(1))
    const existingMobilesMap = new Map<string, UserProfile>();
    const existingUsernamesMap = new Map<string, UserProfile>();

    members.forEach(member => {
      if (member.mobile) {
        existingMobilesMap.set(member.mobile.toString().replace(/\D/g, '').trim(), member);
      }
      if (member.username) {
        existingUsernamesMap.set(member.username.toString().trim().toLowerCase(), member);
      }
    });

    rawRows.forEach((row, rowIndex) => {
      const rawMobile = row[mappings.mobile];
      if (!rawMobile) {
        inValidRecords++;
        return; // Skip records with no phone number
      }

      const mobileStr = rawMobile.toString().replace(/\D/g, '').trim();
      if (mobileStr.length < 10) {
        inValidRecords++;
        return; // Skip invalid numbers
      }

      const mobile = mobileStr.slice(-10); // get last 10 digits
      
      // Determine Name
      let name = 'Imported Member';
      if (mappings.name !== -1 && row[mappings.name]) {
        name = row[mappings.name].toString().trim();
      } else {
        const first = mappings.firstName !== -1 && row[mappings.firstName] ? row[mappings.firstName].toString().trim() : '';
        const last = mappings.lastName !== -1 && row[mappings.lastName] ? row[mappings.lastName].toString().trim() : '';
        if (first || last) name = `${first} ${last}`.trim();
      }

      // Details mapping
      const address = mappings.address !== -1 && row[mappings.address] ? row[mappings.address].toString().trim() : '';
      const pincode = mappings.pincode !== -1 && row[mappings.pincode] ? row[mappings.pincode].toString().replace(/\D/g, '').trim() : '';
      const postOffice = mappings.post !== -1 && row[mappings.post] ? row[mappings.post].toString().trim() : '';
      const highrichId = mappings.highrichId !== -1 && row[mappings.highrichId] ? row[mappings.highrichId].toString().trim() : '';
      const rawAssembly = mappings.assembly !== -1 && row[mappings.assembly] ? row[mappings.assembly].toString().trim() : 'Malappuram';
      const rawDistrict = mappings.district !== -1 && row[mappings.district] ? row[mappings.district].toString().trim() : 'MLP';
      const rawJoinDate = mappings.joinDate !== -1 && row[mappings.joinDate] ? row[mappings.joinDate] : null;
      const rawUsername = mappings.username !== -1 && row[mappings.username] ? row[mappings.username].toString().trim().toLowerCase() : '';

      // Extrapolate District & Assembly codes
      const districtCode = getDistrictCode(rawDistrict || 'MLP');
      const assembly = rawAssembly || 'Malappuram';
      const assemblyCode = getAssemblyCode(assembly);

      // Generate stable/default Username if empty
      const username = rawUsername || `hcrs_${mobile}`;

      // Join date extrapolation (parsing formats intelligently)
      let registrationDate = new Date('2025-06-11T12:00:00Z'); // Default Joint Date
      if (rawJoinDate) {
        try {
          if (typeof rawJoinDate === 'number') {
            // Excel Serial Date parsing
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const totalMs = rawJoinDate * 24 * 60 * 60 * 1000;
            const parsedD = new Date(excelEpoch.getTime() + totalMs);
            if (!isNaN(parsedD.getTime())) registrationDate = parsedD;
          } else {
            const parsedD = new Date(rawJoinDate);
            if (!isNaN(parsedD.getTime())) registrationDate = parsedD;
          }
        } catch (e) {
          // Fallback to default
        }
      }

      // Dynamic pincode extraction from Address if empty
      let finalPin = pincode;
      if (!pincode && address) {
        const pinMatch = address.match(/\b\d{6}\b/);
        if (pinMatch) finalPin = pinMatch[0];
      }

      // Check if duplicate
      const isMobileDup = existingMobilesMap.has(mobile);
      const isUserDup = existingUsernamesMap.has(username);

      if (isMobileDup || isUserDup) {
        duplicatesOfMobile++;
        return; // Avoid duplicating existing records!
      }

      validated.push({
        id: rowIndex + 1,
        name,
        mobile,
        address,
        pincode: finalPin,
        postOffice,
        highrichId,
        assemblyConstituency: assembly,
        constituencyCode: assemblyCode,
        district: districtCode,
        registrationDate,
        username,
        pin: '123456', // default pass
        status: 'active',
        isPaid: true,
        isApproved: true,
        role: 'member',
        createdAt: registrationDate,
      });
    });

    setParsedMembers(validated);
    setStats({
      total: rawRows.length,
      valid: validated.length,
      duplicates: duplicatesOfMobile,
      invalid: inValidRecords,
    });
    setStep(3);
  };

  // Write users to Firestore incrementally with logs & progress UI
  const executeFirestoreImport = async () => {
    if (parsedMembers.length === 0) {
      toast.error("No entries to import.");
      return;
    }

    setIsImporting(true);
    setCurrentImportIndex(0);
    setImportLog([]);
    const logs: typeof importLog = [];

    // Progressive asynchronous import loop
    for (let i = 0; i < parsedMembers.length; i++) {
      const member = parsedMembers[i];
      setCurrentImportIndex(i);

      try {
        // Find next numeric serial No
        const serial = 1000 + members.length + i; // Offset from current total
        const membershipId = generateNewMembershipId(member.district, member.assemblyConstituency, serial);

        // Derive active expiry date 1 year from join date
        const expiryDate = new Date(member.registrationDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        // Set stable uid (for imported members, we can use their unique phone-based ID)
        // This is extremely safe and prevents duplicate collisions!
        const docUid = `hcrs_imp_${member.mobile}`;
        
        const memberRef = doc(db, 'users', docUid);

        // User profile document mapping
        const saveData: UserProfile = {
          uid: docUid,
          name: member.name,
          mobile: member.mobile,
          email: `${member.username}@hcrs.society`,
          address: member.address || '',
          pincode: member.pincode || '',
          postOffice: member.postOffice || '',
          highrichId: member.highrichId || '',
          assemblyConstituency: member.assemblyConstituency,
          constituencyCode: member.constituencyCode,
          district: member.district,
          state: 'Kerala',
          bloodGroup: 'A+',
          registrationDate: member.registrationDate,
          expiryDate: expiryDate,
          issueDate: member.registrationDate,
          username: member.username,
          pin: member.pin,
          status: 'active',
          isPaid: true,
          isApproved: true,
          role: 'member',
          isAdmin: false,
          serialNo: serial,
          membershipId,
          waStatus: 'Pending',
        };

        await setDoc(memberRef, saveData);
        
        logs.unshift({
          type: 'success',
          message: `[SUCCESS] #${serial} Mapped & Saved: ${member.name} (${member.mobile}) with ID ${membershipId}`
        });
      } catch (err: any) {
        logs.unshift({
          type: 'error',
          message: `[ERROR] Failed to save ${member.name}: ${err?.message || 'Firestore Write Failed'}`
        });
      }
      setImportLog([...logs]);
      
      // Delay slightly for high refresh and network rate limits
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    setIsImporting(false);
    toast.success("Successfully completed all database member imports!");
    onRefresh();
    setStep(4);
  };

  const handleReset = () => {
    setStep(1);
    setFileName('');
    setInputText('');
    setRawRows([]);
    setHeaders([]);
    setParsedMembers([]);
    setImportLog([]);
    setCurrentImportIndex(0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      
      {/* Stepper Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-brand-blue/10 p-2.5 rounded-xl text-brand-blue">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bulk Member Importer</h2>
            <p className="text-[10px] uppercase font-black text-slate-400 mt-0.5">ബൾക്ക് മെമ്പർ ഇംപോർട്ടർ</p>
          </div>
        </div>

        {/* Dynamic visual step bubbles */}
        <div className="flex items-center gap-1.5 md:gap-3 text-xs">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black transition-colors ${
                step === s 
                  ? 'bg-brand-blue text-white ring-4 ring-brand-blue/10'
                  : step > s 
                    ? 'bg-green-500 text-white' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 4 && <ChevronRight className="w-3.5 h-3.5 text-slate-350 hidden sm:block" />}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <Card className="p-8 border-none bg-white shadow-xs space-y-6 animate-in fade-in duration-300">
          <div className="text-center space-y-2">
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 1: Map Spreadsheet File (എക്സൽ അല്ലെങ്കിൽ CSV ഫയൽ)</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              നിങ്ങളുടെ പക്കലുള്ള മെമ്പർ വിവരങ്ങളടങ്ങിയ എക്സൽ (Excel / CSV) ഫയൽ ഇവിടെ അപ്‌ലോഡ് ചെയ്യുകയോ, താഴെ ബോക്സിൽ നേരിട്ട് പേസ്റ്റ് ചെയ്യുകയോ ചെയ്യാം.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* File Drag and Drop zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-brand-blue/40 bg-slate-50/50 hover:bg-brand-blue/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
                <FileUp className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-black text-slate-800 uppercase">Select spreadsheet file</p>
                <p className="text-[10px] text-slate-400">Click to browse your computer (.xlsx, .csv, .xls)</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              {fileName && (
                <div className="mt-2 bg-brand-blue/10 border border-brand-blue/20 rounded-lg py-1.5 px-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-brand-blue shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-slate-700 truncate max-w-[180px]">{fileName}</span>
                  <button onClick={(e) => { e.stopPropagation(); setFileName(''); }} className="text-slate-400 hover:text-red-500 font-bold text-xs font-mono ml-1">✕</button>
                </div>
              )}
            </div>

            {/* Pasting area */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block leading-none">Or Paste Text directly (നെറ്റിൽ നിന്നും പകർത്തിയത് ഒട്ടിക്കുക)</label>
              <textarea 
                className="flex-1 w-full min-h-[140px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:border-brand-blue/30 focus:outline-none focus:ring-4 focus:ring-brand-blue/5"
                placeholder="Name,Mobile,Address,Pincode&#10;KUNHAMMED JAMSHEER K,9947573657,KALAPPADAN -H,676519&#10;SADANANDAN,9497697956,MACHERI,670001"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Button 
                onClick={handleProcessPastedText}
                className="bg-brand-blue text-white h-11 w-full rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
              >
                <ClipboardCheck className="w-4 h-4" /> Parse Pasted Text
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 border-none bg-white shadow-xs space-y-6 animate-in slide-in-from-right duration-350">
          <div className="text-left">
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 2: Map Table Columns (കോളങ്ങൾ മാപ്പ് ചെയ്യുക)</h3>
            <p className="text-xs text-slate-500 mt-1">
              താഴെയുള്ള നിർദ്ദിഷ്ട ഫീൽഡുകളിൽ ഓരോന്നിനും നിങ്ങളുടെ ഫയലിലെ അനുയോജ്യമായ കോളം ഹെഡ്ഡറുകൾ തെരഞ്ഞെടുക്കുക.
            </p>
          </div>

          {/* Grid column mapping selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4.5 bg-slate-50 p-5 rounded-2xl border border-slate-150">
            {Object.keys(mappings).map((key) => {
              const labelMap: Record<string, string> = {
                name: 'Name (മുഴുവൻ പേര്)',
                firstName: 'First Name (ആദ്യ പേര്)',
                lastName: 'Last Name (അവസാന പേര്)',
                mobile: 'Mobile Number (മൊബൈൽ)',
                address: 'Address Details (വിലാസം)',
                pincode: 'PIN Code (പിൻകോഡ്)',
                post: 'Post Office (പോസ്റ്റ്)',
                highrichId: 'Highrich Share ID (ഹൈറിച്ച് ഐഡി)',
                assembly: 'Assembly constituency',
                district: 'District (ജില്ല)',
                joinDate: 'Join Date (ജോയിൻ തീയതി)',
                username: 'Username (യൂസർ നെയിം)',
              };

              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-tight">{labelMap[key]}</span>
                  <div className="relative">
                    <select 
                      className="bg-white border border-slate-200 w-full h-10 px-3 pr-8 rounded-lg text-xs font-semibold focus:border-brand-blue/30 focus:outline-none appearance-none"
                      value={mappings[key]}
                      onChange={(e) => setMappings({ ...mappings, [key]: parseInt(e.target.value) })}
                    >
                      <option value="-1">-- Unmapped / ഒഴിവാക്കുക --</option>
                      {headers.map((h, hIdx) => (
                        <option key={hIdx} value={hIdx}>{h}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* First rows preview table check */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest block leading-none">Matrix Preview (ആദ്യ 5 വരികളുടെ വിവരണം)</h4>
            <div className="overflow-x-auto border border-slate-150 rounded-xl bg-slate-50/50">
              <table className="w-full text-xs text-left text-slate-705">
                <thead className="bg-slate-100/70 text-slate-550 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-[10px] font-black uppercase">Line</th>
                    {headers.map((h, i) => (
                      <th key={i} className="py-2.5 px-3 border-r border-slate-200 text-[10px] font-black uppercase max-w-[150px] truncate">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold font-mono text-[10px] text-slate-400">{rIdx + 1}</td>
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 border-r border-slate-205 font-medium max-w-[150px] truncate">{val?.toString() || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleReset} className="h-11 rounded-xl px-5 text-slate-500 font-bold uppercase tracking-wider text-xs">Reset All</Button>
            <Button 
              onClick={analyzeAndValidate}
              className="bg-brand-blue text-white hover:bg-brand-blue/95 h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-xs"
            >
              Analyze & Check Duplicates <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 border-none bg-white shadow-xs space-y-6 animate-in slide-in-from-right duration-350">
          <div className="text-left space-y-1">
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 3: Quality Check & Double-Entry Scan (തനിപ്പകർപ്പ് പരിശോധന)</h3>
            <p className="text-xs text-slate-500">
              ഡാറ്റയിലുള്ള അതേ മൊബൈൽ നമ്പറോ അല്ലെങ്കിൽ യൂസർ നെയിമോ ആയ മെമ്പർമാർ നിലവിൽ ഉള്ളതുകൊണ്ട് ഡ്യൂപ്ലിക്കേഷൻ വരാതിരിക്കാൻ സിസ്റ്റം പരിശോധന പൂർത്തിയാക്കി.
            </p>
          </div>

          {/* Verification Cards Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Checked</span>
              <span className="text-2xl font-black text-slate-800 leading-tight block mt-1">{stats.total}</span>
              <span className="text-[8px] font-semibold text-slate-400 block mt-1">ആകെ വിവരങ്ങൾ</span>
            </div>
            
            <div className="bg-green-50/40 p-4 rounded-xl border border-green-105 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-green-500 block">Ready to Import</span>
              <span className="text-2xl font-black text-green-600 leading-tight block mt-1">{stats.valid}</span>
              <span className="text-[8px] font-semibold text-green-400 block mt-1">ചേർക്കാൻ സാധിക്കുന്നവർ</span>
            </div>

            <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-105 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 block">Identified Duplicates (Skip)</span>
              <span className="text-2xl font-black text-rose-600 leading-tight block mt-1">{stats.duplicates}</span>
              <span className="text-[8px] font-semibold text-rose-400 block mt-1">നിലവിൽ സിസ്റ്റത്തിൽ ഉള്ളവർ</span>
            </div>

            <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-105 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">Incomplete / Invalid</span>
              <span className="text-2xl font-black text-amber-600 leading-tight block mt-1">{stats.invalid}</span>
              <span className="text-[8px] font-semibold text-amber-400 block mt-1">അപൂർണ്ണമായ വിവരങ്ങൾ</span>
            </div>
          </div>

          {/* Warning notice about default password */}
          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 flex gap-3 text-slate-700">
            <Sparkles className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
            <div className="text-left space-y-1 text-[11px] leading-relaxed">
              <p className="font-extrabold text-slate-800">ഭദ്രത സംബന്ധിച്ച അറിയിപ്പ് (Dynamic Auth Password Set):</p>
              <p className="font-medium text-slate-600">
                എല്ലാ ഇറക്കുമതി ചെയ്യുന്ന അക്കൗണ്ടുകൾക്കും ഡിഫോൾട്ട് പാസ്സ്‌വേർഡ് <strong>123456</strong> ആയിരിക്കും. അവർ വെബ്സൈറ്റിൽ സ്വന്തം നമ്പറും ഈ പാസ്സ്‌വേർഡും നൽകി ലോഗിൻ ചെയ്യുമ്പോൾ സിസ്റ്റം ഓട്ടോമാറ്റിക്കായി അവരുടെ ബാക്ക് എൻഡ് പ്രൊഫൈൽ സുരക്ഷിതമായി ആക്റ്റിവേറ്റ് ചെയ്ത് തരുന്നതായിരിക്കും.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
            <div className="text-left">
              <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-green-500" />
                {stats.valid} Members Ready for Direct Seed
              </p>
              <p className="text-[10px] text-slate-400 mt-1 leading-none uppercase font-black">Ready to bulk seed Firestore collection</p>
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setStep(2)} className="h-11 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500">Back</Button>
              <Button 
                onClick={executeFirestoreImport}
                disabled={stats.valid === 0}
                className="bg-green-600 hover:bg-green-700 text-white h-11 px-5 rounded-xl font-bold uppercase tracking-wider text-xs"
              >
                Begin Bulk Import <Database className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-6 border-none bg-white shadow-xs space-y-6 animate-in zoom-in-95 duration-300 text-center">
          
          <div className="py-4 space-y-3">
            <div className="h-16 w-16 bg-green-500/15 border border-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">Bulk Import Completed!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto uppercase font-black tracking-wider leading-relaxed">
              മെമ്പേഴ്‌സ് അക്കൗണ്ടുകൾ വിജയകരമായി സുരക്ഷിതമായി ഡാറ്റാബേസിൽ രജിസ്റ്റർ ചെയ്തു പൂർത്തിയാക്കിയിരിക്കുന്നു.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={handleReset} className="bg-brand-blue text-white hover:bg-brand-blue/95 h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md">Import another board</Button>
          </div>
        </Card>
      )}

      {/* Importing Real-Time Progress View */}
      {isImporting && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white p-6 shadow-2xl space-y-5 rounded-3xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-brand-blue mx-auto animate-spin" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Importing to Firebase...</h4>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed uppercase">
                Direct seed: {currentImportIndex + 1} of {parsedMembers.length} records processed ({Math.round(((currentImportIndex + 1) / parsedMembers.length) * 100)}%)
              </p>
            </div>

            {/* Custom progress HTML bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-blue rounded-full transition-all duration-100"
                style={{ width: `${((currentImportIndex + 1) / parsedMembers.length) * 100}%` }}
              />
            </div>

            {/* Scrolling log viewport */}
            <div className="bg-slate-950 text-[10px] text-slate-350 font-mono p-3 rounded-lg max-h-[160px] overflow-y-auto space-y-1.5 text-left border border-white/10 select-all">
              {importLog.slice(0, 10).map((log, index) => (
                <div 
                  key={index}
                  className={
                    log.type === 'error' ? 'text-red-400 font-bold' : 
                    log.type === 'skip' ? 'text-amber-400' : 'text-green-400'
                  }
                >
                  {log.message}
                </div>
              ))}
              {importLog.length === 0 && <span className="text-slate-500 italic block">Warming Firestore connection writers...</span>}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
