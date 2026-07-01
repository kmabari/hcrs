import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc,
  writeBatch, 
  serverTimestamp, 
  increment,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
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
  RefreshCw, 
  UserPlus, 
  UserCheck, 
  FileUp, 
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ClipboardCheck,
  X,
  History,
  Undo2,
  FileText,
  Printer,
  Check,
  Users,
  Info,
  ChevronLeft,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface BulkImportProps {
  members: UserProfile[];
  adminUser: any;
  onRefresh: () => void;
}

export default function BulkImportManager({ members, adminUser, onRefresh }: BulkImportProps) {
  // Navigation: "import" or "history"
  const [panelTab, setPanelTab] = useState<'import' | 'history'>('import');

  // Step state: 1: Upload, 2: Map columns, 3: Validate, 4: Live progress, 5: Summary Report
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fileName, setFileName] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  
  // Spreadsheet files extracted from ZIP
  const [availableSpreadsheets, setAvailableSpreadsheets] = useState<{ filename: string; file: any }[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);

  // Extracted photos from ZIP folder mapped by lowercase filename
  const [zipPhotos, setZipPhotos] = useState<Map<string, string>>(new Map());

  // Raw matrix rows from current sheet
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Custom smart columns map (values are header indices, -1 means unmapped)
  const [mappings, setMappings] = useState<Record<string, number>>({
    name: -1,
    mobile: -1,
    district: -1,
    assembly: -1,
    membershipId: -1,
    registrationDate: -1,
    membership_type: -1,
    status: -1,
    photo: -1
  });

  // Duplicate treatment configuration: 'skip' (Import New Only) | 'update' (Update Existing)
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');

  // Normalized ready/invalid records
  const [validatedRecords, setValidatedRecords] = useState<any[]>([]);
  const [duplicateRecords, setDuplicateRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<any[]>([]);
  const [mismatchedRecords, setMismatchedRecords] = useState<any[]>([]); // District/Constituency Mismatches

  // Execution engine state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [currentProgressIndex, setCurrentProgressIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [importLog, setImportLog] = useState<{ type: 'success' | 'update' | 'skip' | 'error'; message: string }[]>([]);

  // Generated statistics for the active operation
  const [importStats, setImportStats] = useState({
    totalRows: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    timestamp: new Date()
  });

  // Migration History List
  const [migrationLogs, setMigrationLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load migration logs from Firestore
  const fetchMigrationLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const q = query(collection(db, 'migration_logs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const logs: any[] = [];
      snap.forEach(docSnap => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMigrationLogs(logs);
    } catch (err) {
      console.error("Error loaded logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (panelTab === 'history') {
      fetchMigrationLogs();
    }
  }, [panelTab]);

  // Security warning state (Only Master Admin check)
  const MAIN_ADMINS = [
    'kmabarikiyafoods@gmail.com',
    'hcrsindia@gmail.com',
    'admin@hcrs.society',
    '9645934571@hcrs.society',
    'mabarikiyafoods@gmail.com'
  ];
  const isSuperAdmin = MAIN_ADMINS.includes(adminUser?.email || '');

  if (!isSuperAdmin) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto border border-red-200 bg-red-50/20 rounded-3xl mt-12 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Access Restrict System</h3>
        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
          തനിപ്പകർപ്പുകൾ തടയുന്നതിനും ഡാറ്റാബേസ് പൂർണ്ണത സംരക്ഷിക്കുന്നതിനും വേണ്ടി ഈ മെമ്പേഴ്‌സ് കുടിയേറ്റ (Migration) സംവിധാനം മാസ്റ്റർ അഡ്മിന്മാർക്ക് മാത്രമേ കാണാനും പ്രവർത്തിപ്പിക്കാനും അനുവാദമുള്ളൂ.
        </p>
        <p className="text-[10px] font-mono text-slate-400">Restricted for Admin Email: {adminUser?.email || 'Guest'}</p>
      </Card>
    );
  }

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

  // Helper to parse spreadsheet buffer and move to columns mapping
  const parseSpreadsheetBuffer = (buffer: ArrayBuffer, name: string) => {
    try {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheet];
      const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      
      const filteredMatrix = matrix.filter((row: any) => row && row.length > 0);
      if (filteredMatrix.length > 0) {
        processRawMatrix(filteredMatrix);
      } else {
        toast.error("Spreadsheet sheet has no dynamic records.");
      }
    } catch (err: any) {
      console.error("Spreadsheet parse issue:", err);
      toast.error("Failed to parse sheet: " + err.message);
    }
  };

  // Process selected file (excel/csv/zip)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    
    if (lowerName.endsWith('.zip')) {
      toast.loading("Decompressing ZIP migration archive...", { id: 'zip-load' });
      await handleZipUpload(file);
      toast.dismiss('zip-load');
    } else if (lowerName.endsWith('.csv')) {
      setFileName(file.name);
      setZipPhotos(new Map());
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseRawCSV(text);
        if (parsed.length > 0) {
          processRawMatrix(parsed);
        } else {
          toast.error("CSV file is unreadable or empty.");
        }
      };
      reader.readAsText(file);
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      setFileName(file.name);
      setZipPhotos(new Map());
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        parseSpreadsheetBuffer(buffer, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Unsupported file format. Please upload .xlsx, .xls, .csv or .zip file.");
    }
  };

  // Handle manual extraction select if multiple spreadsheet sheets reside in ZIP
  const selectZipSpreadsheet = async (item: { filename: string; file: any }) => {
    setFileName(`${selectedZipFile?.name} (extracted: ${item.filename})`);
    setAvailableSpreadsheets([]);
    
    if (item.filename.toLowerCase().endsWith('.csv')) {
      const text = await item.file.async('string');
      const parsed = parseRawCSV(text);
      processRawMatrix(parsed);
    } else {
      const buffer = await item.file.async('arraybuffer');
      parseSpreadsheetBuffer(buffer, item.filename);
    }
  };

  const handleZipUpload = async (zipFile: File) => {
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const extractedPhotos = new Map<string, string>();
      const spreadsheetFiles: { filename: string; file: any }[] = [];
      let photoCount = 0;
      
      for (const [relativePath, fileObj] of Object.entries(zip.files)) {
        if (fileObj.dir) continue;
        const lowerName = relativePath.toLowerCase();
        
        if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
          spreadsheetFiles.push({ filename: relativePath, file: fileObj });
        } else if (/\.(png|jpg|jpeg|webp)$/.test(lowerName)) {
          const dataUrl = await fileObj.async('base64');
          const cleanName = relativePath.split('/').pop() || relativePath;
          const mime = lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg';
          extractedPhotos.set(cleanName.toLowerCase(), `data:${mime};base64,${dataUrl}`);
          photoCount++;
        }
      }
      
      setZipPhotos(extractedPhotos);
      setSelectedZipFile(zipFile);
      
      if (spreadsheetFiles.length > 0) {
        if (spreadsheetFiles.length === 1) {
          const mainSheet = spreadsheetFiles[0];
          setFileName(`${zipFile.name} (extracted: ${mainSheet.filename})`);
          toast.success(`ZIP extracted successfully: Found 1 sheet & ${photoCount} member photos.`);
          if (mainSheet.filename.toLowerCase().endsWith('.csv')) {
            const text = await mainSheet.file.async('string');
            const parsed = parseRawCSV(text);
            processRawMatrix(parsed);
          } else {
            const buffer = await mainSheet.file.async('arraybuffer');
            parseSpreadsheetBuffer(buffer, mainSheet.filename);
          }
        } else {
          setAvailableSpreadsheets(spreadsheetFiles);
          toast.success(`Successfully decompressed zip. Detected ${spreadsheetFiles.length} spreadsheets. Please select one.`);
        }
      } else {
        toast.error("No valid spreadsheet (.xlsx, .xls, csv) detected inside ZIP.");
      }
    } catch (err: any) {
      console.error("ZIP extract issue:", err);
      toast.error("Unpacking ZIP failed: " + err.message);
    }
  };

  // Convert pasted text to rows
  const handleProcessPastedText = () => {
    if (!inputText.trim()) {
      toast.error('Please paste or select some comma separated spreadsheet text first');
      return;
    }
    const lines = parseRawCSV(inputText);
    if (lines.length > 0) {
      setFileName("Direct Plain Text Import");
      setZipPhotos(new Map());
      processRawMatrix(lines);
      toast.success(`Successfully formatted ${lines.length} lines`);
    } else {
      toast.error('Plain values could not be parsed into valid structural table columns');
    }
  };

  // Guess mappings based on clean regex matching headers
  const guessMappings = (headersList: string[]) => {
    const newMappings = { ...mappings };
    
    headersList.forEach((h, index) => {
      const lower = h.toString().toLowerCase().trim().replace(/[\s_\-]/g, '');
      
      if (/full|name|display|membername|പേര്/i.test(lower)) {
        newMappings.name = index;
      }
      if (/mobile|mob|phone|phone_number|phonenumber|highrichmob|contact|മൊബൈൽ/i.test(lower)) {
        newMappings.mobile = index;
      }
      if (/district|dist|place|ജില്ല/i.test(lower)) {
        newMappings.district = index;
      }
      if (/assembly|constituency|constituencycode|block|മണ്ഡലം|നിയമസഭ/i.test(lower)) {
        newMappings.assembly = index;
      }
      if (/membershipno|membershipid|memberid|oldid|പഴയ/i.test(lower)) {
        newMappings.membershipId = index;
      }
      if (/registered|date|join|joindate|created|തീയതി/i.test(lower)) {
        newMappings.registrationDate = index;
      }
      if (/category|type|membership_type|membershipclass|വിഭാഗം/i.test(lower)) {
        newMappings.membership_type = index;
      }
      if (/status|active|അംഗത്വം/i.test(lower)) {
        newMappings.status = index;
      }
      if (/photo|image|pic|face|പ്രൊഫൈൽ/i.test(lower)) {
        newMappings.photo = index;
      }
    });
    
    setMappings(newMappings);
  };

  const processRawMatrix = (matrix: any[][]) => {
    const rawHeaders = matrix[0].map(h => (h || '').toString().trim());
    setHeaders(rawHeaders);
    setRawRows(matrix.slice(1));
    guessMappings(rawHeaders);
    setStep(2);
  };

  // Run auto district mapping, constituency validations and double check duplicates in existing state database
  const runQualityValidateAndFilter = () => {
    if (mappings.mobile === -1) {
      toast.error("Please match the Mobile Number column to perform security validation.");
      return;
    }
    if (mappings.name === -1) {
      toast.warning("Full Name column is unmapped. We recommend mapping it first.");
    }

    // Existing Database cache lookup maps
    const existingMobiles = new Set<string>();
    const existingIds = new Set<string>();
    const membersByMobile = new Map<string, UserProfile>();

    members.forEach(m => {
      if (m.mobile) {
        const cleanMob = m.mobile.toString().replace(/\D/g, '').trim().slice(-10);
        existingMobiles.add(cleanMob);
        membersByMobile.set(cleanMob, m);
      }
      if (m.membershipId) {
        existingIds.add(m.membershipId.trim().toUpperCase());
      }
    });

    const ready: any[] = [];
    const dups: any[] = [];
    const inv: any[] = [];
    const mismatches: any[] = [];

    rawRows.forEach((row, rowIndex) => {
      const rawName = mappings.name !== -1 ? row[mappings.name] : '';
      const rawMobile = mappings.mobile !== -1 ? row[mappings.mobile] : '';
      const rawDist = mappings.district !== -1 ? row[mappings.district] : '';
      const rawAssembly = mappings.assembly !== -1 ? row[mappings.assembly] : '';
      const rawOldId = mappings.membershipId !== -1 ? row[mappings.membershipId] : '';
      const rawJoinDate = mappings.registrationDate !== -1 ? row[mappings.registrationDate] : '';
      const rawPhotoVal = mappings.photo !== -1 ? row[mappings.photo] : '';
      const rawType = mappings.membership_type !== -1 ? row[mappings.membership_type] : '';
      const rawStatus = mappings.status !== -1 ? row[mappings.status] : '';

      const name = (rawName || 'Imported Member').toString().trim();
      const mobileClean = (rawMobile || '').toString().replace(/\D/g, '').trim().slice(-10);

      // Validation 1: Required Full Name and 10 Digits Phone Check
      if (!name || mobileClean.length < 10) {
        inv.push({
          row: rowIndex + 1,
          name,
          mobile: rawMobile || 'None',
          reason: 'Incomplete / Invalid Phone or missing full name'
        });
        return;
      }

      // Validation 2: Auto District & Constituency Assignment and Mismatch Identification
      let resolvedDistrict = '';
      let resolvedConstituency = '';
      let districtMismatch = false;
      let mismatchMsg = '';

      const searchDistCode = getDistrictCode(rawDist?.toString() || '');
      const cleanAssemblyInput = rawAssembly?.toString().trim() || '';

      if (searchDistCode === 'OTH' || !DISTRICTS.some(d => d.code === searchDistCode)) {
        // District code represents mismatch or is blank
        // Let's lookup assembly in the whole list of constituencies
        const foundDist = Object.keys(CONSTITUENCIES).find(code => 
          CONSTITUENCIES[code].some(c => c.toLowerCase().replace(/\s/g, '') === cleanAssemblyInput.toLowerCase().replace(/\s/g, ''))
        );
        if (foundDist) {
          resolvedDistrict = foundDist;
          resolvedConstituency = CONSTITUENCIES[foundDist].find(c => c.toLowerCase().replace(/\s/g, '') === cleanAssemblyInput.toLowerCase().replace(/\s/g, '')) || cleanAssemblyInput;
          districtMismatch = true;
          mismatchMsg = `Auto-assigned District to ${DISTRICTS.find(d => d.code === foundDist)?.name} for Constituency "${cleanAssemblyInput}"`;
        } else {
          resolvedDistrict = 'MLP'; // default fallback
          resolvedConstituency = cleanAssemblyInput || 'Malappuram';
          districtMismatch = true;
          mismatchMsg = `Unrecognized Place. Defaulted to Malappuram.`;
        }
      } else {
        // District code resolved cleanly
        resolvedDistrict = searchDistCode;
        const validAssemblies = CONSTITUENCIES[searchDistCode] || [];
        const foundAssembly = validAssemblies.find(c => c.toLowerCase().replace(/\s/g, '') === cleanAssemblyInput.toLowerCase().replace(/\s/g, ''));
        
        if (foundAssembly) {
          resolvedConstituency = foundAssembly;
        } else {
          // Check if constituency belongs to another district
          const properDist = Object.keys(CONSTITUENCIES).find(code => 
            CONSTITUENCIES[code].some(c => c.toLowerCase().replace(/\s/g, '') === cleanAssemblyInput.toLowerCase().replace(/\s/g, ''))
          );
          if (properDist) {
            resolvedDistrict = properDist; // Auto Align Constituency
            resolvedConstituency = CONSTITUENCIES[properDist].find(c => c.toLowerCase().replace(/\s/g, '') === cleanAssemblyInput.toLowerCase().replace(/\s/g, '')) || cleanAssemblyInput;
            districtMismatch = true;
            mismatchMsg = `Constituency "${cleanAssemblyInput}" reassigned to correct District: ${DISTRICTS.find(d => d.code === properDist)?.name}`;
          } else {
            resolvedConstituency = cleanAssemblyInput || 'Malappuram';
            districtMismatch = true;
            mismatchMsg = `Assembly constituency name unrecognized. Flagged warning.`;
          }
        }
      }

      // Validation 3: Member Photo Matching within extracted ZIP mapping
      let finalPhotoUrl = '';
      if (rawPhotoVal) {
        const pKey = rawPhotoVal.toString().toLowerCase().trim();
        if (zipPhotos.has(pKey)) {
          finalPhotoUrl = zipPhotos.get(pKey) || '';
        }
      }
      
      // Secondary fallback photo lookup by clean phone or name in zipPhotos
      if (!finalPhotoUrl && zipPhotos.size > 0) {
        const extList = ['.jpg', '.jpeg', '.png', '.webp'];
        for (const ext of extList) {
          const keyByMob = `${mobileClean}${ext}`;
          if (zipPhotos.has(keyByMob)) {
            finalPhotoUrl = zipPhotos.get(keyByMob) || '';
            break;
          }
          const keyByName = `${name.toLowerCase().replace(/\s/g, '_')}${ext}`;
          if (zipPhotos.has(keyByName)) {
            finalPhotoUrl = zipPhotos.get(keyByName) || '';
            break;
          }
        }
      }

      // Format Joining Dates intelligently
      let registrationDate = new Date();
      if (rawJoinDate) {
        try {
          if (typeof rawJoinDate === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            registrationDate = new Date(excelEpoch.getTime() + rawJoinDate * 24 * 60 * 60 * 1000);
          } else {
            const parsed = new Date(rawJoinDate);
            if (!isNaN(parsed.getTime())) registrationDate = parsed;
          }
        } catch (e) {
          // Keep current date as safe fallback
        }
      }

      // Determine existing duplicate matching state
      const isMobileDup = existingMobiles.has(mobileClean);
      const isIdDup = rawOldId && existingIds.has(rawOldId.toString().trim().toUpperCase());
      const isDuplicate = isMobileDup || isIdDup;

      const record = {
        rowNum: rowIndex + 1,
        name,
        mobile: mobileClean,
        originalMobile: rawMobile,
        address: row[mappings.address]?.toString() || '',
        pincode: row[mappings.pincode]?.toString() || '',
        postOffice: row[mappings.post]?.toString() || '',
        highrichId: row[mappings.highrichId]?.toString() || '',
        district: resolvedDistrict,
        assemblyConstituency: resolvedConstituency,
        membershipId: rawOldId ? rawOldId.toString().toUpperCase().trim() : '',
        registrationDate,
        photoUrl: finalPhotoUrl,
        membership_type: 'ADHOC_MEMBER', // Forced to ADHOC_MEMBER to satisfy security rules
        status: 'active',
        mismatched: districtMismatch,
        mismatchMsg
      };

      if (isDuplicate) {
        dups.push({
          ...record,
          duplicateReason: isMobileDup ? 'Mobile Number duplicate' : 'Membership ID duplicate',
          existingProfile: isMobileDup ? membersByMobile.get(mobileClean) : null
        });
      } else {
        ready.push(record);
      }

      if (districtMismatch) {
        mismatches.push(record);
      }
    });

    setValidatedRecords(ready);
    setDuplicateRecords(dups);
    setInvalidRecords(inv);
    setMismatchedRecords(mismatches);
    setStep(3);
  };

  // Perform bulk transactional seed mapping to firebase firestore
  const beginBulkDataMigration = async () => {
    const listToProcess = [...validatedRecords];
    if (duplicateMode === 'update') {
      listToProcess.push(...duplicateRecords);
    }

    if (listToProcess.length === 0) {
      toast.error("No valid records prepared to seed.");
      return;
    }

    setIsImporting(true);
    setIsPaused(false);
    setCurrentProgressIndex(0);
    setImportLog([]);

    const batchSize = 100; // Chunk size to bypass Firestore and network overhead rates
    let successCount = 0;
    let upCount = 0;
    let skippedCount = 0;
    let failCount = 0;
    const importedUids: string[] = [];
    const updatedBackup: Record<string, any> = {};

    const activeLogs: typeof importLog = [];
    activeLogs.unshift({ type: 'success', message: `Initializing background queue transaction batch commit (Chunk: ${batchSize} docs)...` });
    setImportLog([...activeLogs]);

    // Read the current total member registration serial
    let currentSerial = 1000 + members.length;
    try {
      const metaSnap = await getDoc(doc(db, 'system', 'totals'));
      if (metaSnap.exists()) {
        currentSerial = metaSnap.data().count || currentSerial;
      }
    } catch (e) {
      console.warn("Could not read remote count totals. Defaulting serial sequence offset.");
    }

    for (let i = 0; i < listToProcess.length; i++) {
      if (isPaused) {
        toast.warning("Migration paused by Administrator.");
        setIsImporting(false);
        break;
      }

      setCurrentProgressIndex(i);
      const row = listToProcess[i];
      const docUid = `hcrs_imp_${row.mobile}`;
      const userRef = doc(db, 'users', docUid);

      try {
        let isUpdateAction = false;
        let backupData: any = null;

        // Check if matching document exists (Backup current document prior to overwrite rollback)
        const checkSnap = await getDoc(userRef);
        if (checkSnap.exists()) {
          isUpdateAction = true;
          backupData = checkSnap.data();
        }

        let serial = row.rowNum + currentSerial;
        let finalMembershipId = row.membershipId;

        if (isUpdateAction && backupData) {
          finalMembershipId = backupData.membershipId || row.membershipId;
          serial = backupData.serialNo || serial;
        }

        if (!finalMembershipId) {
          finalMembershipId = generateNewMembershipId(row.district, row.assemblyConstituency, serial);
        }

        const expiryDate = new Date(row.registrationDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const memberProfile: UserProfile = {
          uid: docUid,
          name: row.name,
          mobile: row.mobile,
          email: `${row.mobile}@hcrs.society`,
          address: row.address || backupData?.address || '',
          pincode: row.pincode || backupData?.pincode || '',
          postOffice: row.postOffice || backupData?.postOffice || '',
          highrichId: row.highrichId || backupData?.highrichId || '',
          assemblyConstituency: row.assemblyConstituency,
          constituencyCode: row.constituencyCode || getAssemblyCode(row.assemblyConstituency),
          district: row.district,
          state: 'Kerala',
          bloodGroup: backupData?.bloodGroup || 'A+',
          registrationDate: row.registrationDate,
          expiryDate: expiryDate,
          issueDate: row.registrationDate,
          username: `hcrs_${row.mobile}`,
          pin: backupData?.pin || '123456', // default fallback pin
          status: 'active',
          isPaid: true,
          isApproved: true,
          role: 'member',
          isAdmin: false,
          serialNo: serial,
          membershipId: finalMembershipId,
          waStatus: backupData?.waStatus || 'Pending',
          photoUrl: row.photoUrl || backupData?.photoUrl || '',
          membership_type: 'ADHOC_MEMBER' // Security restriction: all imported members created as ADHOC_MEMBER
        };

        // Increment or decrement the district registration quotas accordingly
        const quotaRef = doc(db, 'districtQuotas', row.district);
        const quotaSnap = await getDoc(quotaRef);
        if (!quotaSnap.exists()) {
          await setDoc(quotaRef, {
            id: row.district,
            districtName: DISTRICTS.find(d => d.code === row.district)?.name || row.district,
            total: 2000,
            used: 1
          });
        } else {
          // Increment used quota if newly created
          if (!isUpdateAction) {
            await setDoc(quotaRef, { used: increment(1) }, { merge: true });
          }
        }

        // Commit to Firestore
        await setDoc(userRef, memberProfile);

        importedUids.push(docUid);
        if (isUpdateAction) {
          updatedBackup[docUid] = backupData;
          upCount++;
          activeLogs.unshift({ type: 'update', message: `[UPDATED] User ${row.name} (${row.mobile}) modified and merged under Membership ID: ${finalMembershipId}` });
        } else {
          updatedBackup[docUid] = null; // Stored null represents document was completely greenfield
          successCount++;
          activeLogs.unshift({ type: 'success', message: `[IMPORTED] Member ${row.name} (${row.mobile}) created with ID: ${finalMembershipId}` });
        }

      } catch (err: any) {
        failCount++;
        activeLogs.unshift({ type: 'error', message: `[FAILED] Row #${row.rowNum} Map error: ${err.message}` });
      }

      setImportLog([...activeLogs]);
    }

    // Update global dashboard/system counts
    const metaRef = doc(db, 'system', 'totals');
    const finalIncrement = successCount;
    if (finalIncrement > 0) {
      await setDoc(metaRef, { count: increment(finalIncrement) }, { merge: true });
    }

    // Save migration metrics and auditing history logs for rolling back
    const logId = `history_${Date.now()}`;
    const logData = {
      id: logId,
      timestamp: new Date().toISOString(),
      adminEmail: adminUser?.email || 'N/A',
      fileName: fileName,
      importedCount: successCount,
      updatedCount: upCount,
      skippedCount: duplicateMode === 'skip' ? duplicateRecords.length : 0,
      totalRecords: successCount + upCount + failCount,
      importedUids: importedUids,
      updatedBackup: updatedBackup,
      rolled_back: false
    };

    await setDoc(doc(db, 'migration_logs', logId), logData);

    setImportStats({
      totalRows: listToProcess.length,
      imported: successCount,
      updated: upCount,
      skipped: duplicateMode === 'skip' ? duplicateRecords.length : 0,
      failed: failCount,
      timestamp: new Date()
    });

    setIsImporting(false);
    onRefresh();
    setStep(5);
    toast.success(`Migration completed. ${successCount} Created, ${upCount} Refreshed, ${failCount} Failed.`);
  };

  // Rollback/Undo operation to restore preceding database state
  const handleRollbackAction = async (log: any) => {
    if (log.rolled_back) {
      toast.error("This import migration has already been rolled back.");
      return;
    }

    const confirmRollback = window.confirm(
      `CRITICAL UNDO WARNING:\nAre you sure you want to rollback the migration from "${log.fileName}"?\n\nThis will REMOVE ${log.importedCount} newly created members, and RESTORE ${log.updatedCount} updated records back to their preceding states. This operation is permanent.`
    );
    if (!confirmRollback) return;

    toast.loading("Reverting Firestore records...", { id: 'rollback-load' });
    let deleteCounter = 0;
    let restoreCounter = 0;

    try {
      const uidsList: string[] = log.importedUids || [];
      const backupMap: Record<string, any> = log.updatedBackup || {};

      for (const uid of uidsList) {
        const userRef = doc(db, 'users', uid);
        const previousData = backupMap[uid];

        if (previousData === null) {
          // Greenfield member. Delete completely
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Decrement quotas
            if (data.district) {
              const quotaRef = doc(db, 'districtQuotas', data.district);
              await setDoc(quotaRef, { used: increment(-1) }, { merge: true });
            }
          }
          await deleteDoc(userRef);
          deleteCounter++;
        } else if (previousData) {
          // Member existed. Overwrite back to old state
          await setDoc(userRef, previousData);
          
          // Re-adjust district quotas if changed
          const currentSnap = await getDoc(userRef);
          const currentData = currentSnap.exists() ? currentSnap.data() : null;
          if (currentData && currentData.district !== previousData.district) {
            // Decrement from new, increment to old
            await setDoc(doc(db, 'districtQuotas', currentData.district), { used: increment(-1) }, { merge: true });
            await setDoc(doc(db, 'districtQuotas', previousData.district), { used: increment(1) }, { merge: true });
          }
          restoreCounter++;
        }
      }

      // Decrement the serial counter metadata in totals
      if (deleteCounter > 0) {
        const metaRef = doc(db, 'system', 'totals');
        await setDoc(metaRef, { count: increment(-deleteCounter) }, { merge: true });
      }

      // Flag migration log document as rolled back
      await setDoc(doc(db, 'migration_logs', log.id), { rolled_back: true }, { merge: true });

      toast.success(`Rollback Complete: ${deleteCounter} Deleted, ${restoreCounter} Restored.`);
      fetchMigrationLogs();
      onRefresh();
    } catch (err: any) {
      console.error("Rollback execution error:", err);
      toast.error("Rollback failed halfway: " + err.message);
    } finally {
      toast.dismiss('rollback-load');
    }
  };

  const exportMigrationSummaryToExcel = () => {
    const wsData = [
      ["HCRS SOCIETY MIGRATION REPORT"],
      ["Date", importStats.timestamp.toLocaleString()],
      ["Source File Name", fileName],
      ["Total Rows Checked", importStats.totalRows],
      ["Newly Created / Imported", importStats.imported],
      ["Updated & Merged", importStats.updated],
      ["Skipped Duplicates", importStats.skipped],
      ["Failed Rows", importStats.failed],
      [],
      ["LINE", "MEMBER NAME", "MOBILE", "DISTRICT", "CONSTITUENCY", "ID", "STATUS"]
    ];

    const records = [...validatedRecords];
    if (duplicateMode === 'update') {
      records.push(...duplicateRecords);
    }

    records.forEach((r, idx) => {
      wsData.push([
        idx + 1,
        r.name,
        r.mobile,
        r.district,
        r.assemblyConstituency,
        r.membershipId || 'AUTOGEN',
        r.status
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Migration Summary");
    XLSX.writeFile(wb, `HCRS_Migration_Summary_${Date.now()}.xlsx`);
    toast.success("Summary Sheet exported successfully!");
  };

  const handleReset = () => {
    setStep(1);
    setFileName('');
    setInputText('');
    setRawRows([]);
    setHeaders([]);
    setValidatedRecords([]);
    setDuplicateRecords([]);
    setInvalidRecords([]);
    setMismatchedRecords([]);
    setImportLog([]);
    setAvailableSpreadsheets([]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Sub tabs: Importer Panel vs Migration logs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setPanelTab('import')}
          className={`pb-3.5 px-6 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            panelTab === 'import' 
              ? 'border-brand-blue text-brand-blue font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Master Member Importer
        </button>
        <button
          onClick={() => setPanelTab('history')}
          className={`pb-3.5 px-6 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            panelTab === 'history' 
              ? 'border-brand-blue text-brand-blue font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Migration History & Rollback Logs
        </button>
      </div>

      {panelTab === 'import' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Stepper Wizard Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-blue/10 p-2.5 rounded-xl text-brand-blue">
                <Database className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-tight">Master Members Migration wizard</h2>
                <p className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">ബൾക്ക് മെമ്പർ കുടിയേറ്റ സംവിധാനം</p>
              </div>
            </div>

            {/* Stepper visual progress icons */}
            <div className="flex items-center gap-2 text-xs">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black transition-all ${
                    step === s 
                      ? 'bg-brand-blue text-white ring-4 ring-brand-blue/15 scale-105'
                      : step > s 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {step > s ? '✓' : s}
                  </div>
                  {s < 5 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                </div>
              ))}
            </div>
          </div>

          {step === 1 && (
            <Card className="p-8 border border-slate-200 bg-white rounded-3xl space-y-6 text-left animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 1: Upload old members dataset</h3>
                <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
                  പഴയ വൈബ്സൈറ്റിൽ നിന്നും കയറ്റുമതി ചെയ്ത എക്സൽ, CSV, അല്ലെങ്കിൽ ചിത്രങ്ങൾ ഉൾപ്പെടുന്ന ZIP ഫയൽ ഇവിടെ സുരക്ഷിതമായി സമർപ്പിക്കുക. ചിത്ര ഫയലുകളെ ഓട്ടോമാറ്റിക് ലുക്ക്അപ്പ് വഴി ബന്ധിപ്പിക്കുന്നതായിരിക്കും.
                </p>
              </div>

              {availableSpreadsheets.length > 0 && (
                <div className="p-5 border border-amber-200 bg-amber-50/20 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600" />
                    Multiple Spreadsheet Sheets detected inside the ZIP:
                  </p>
                  <div className="divide-y divide-amber-100 bg-white border border-amber-100 rounded-xl overflow-hidden shadow-xs">
                    {availableSpreadsheets.map((item, id) => (
                      <div key={id} className="flex justify-between items-center p-3.5 hover:bg-slate-50">
                        <span className="text-xs font-mono font-bold text-slate-700">{item.filename}</span>
                        <Button 
                          onClick={() => selectZipSpreadsheet(item)}
                          size="sm"
                          className="bg-brand-blue text-white font-bold uppercase tracking-wider text-[10px]"
                        >
                          Select & Map
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Visual drag & drop area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-brand-blue/35 bg-slate-50/50 hover:bg-brand-blue/5 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all. duration-200"
                >
                  <div className="h-14 w-14 rounded-2xl bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center text-brand-blue">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Upload XLSX, CSV, or ZIP file</p>
                    <p className="text-[10px] text-slate-400 font-medium">Auto parses structure, images and matches columns natively</p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx,.xls,.csv,.zip" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  {fileName && (
                    <div className="mt-2 bg-brand-blue text-white rounded-xl py-2 px-4 flex items-center gap-2 shadow-sm animate-in zoom-in-95">
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-mono font-extrabold max-w-[200px] truncate">{fileName}</span>
                      <button onClick={(e) => { e.stopPropagation(); setFileName(''); }} className="text-white bg-black/20 hover:bg-black/30 rounded-full h-4 w-4 flex items-center justify-center font-bold text-[8px] ml-1">✕</button>
                    </div>
                  )}
                  {zipPhotos.size > 0 && (
                    <p className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-150">✓ Extracted {zipPhotos.size} member photos from ZIP</p>
                  )}
                </div>

                {/* Direct paste fallback text matrix */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block leading-none">Or Paste plain CSV values directly</label>
                  <textarea 
                    className="flex-1 w-full min-h-[150px] bg-slate-50/50 border border-slate-200 rounded-2xl p-3 text-xs font-medium font-mono focus:border-brand-blue/30 focus:outline-none focus:ring-4 focus:ring-brand-blue/5"
                    placeholder="Full Name,Mobile Number,District,Constituency,Old ID&#10;KUNHAMMED JAMSHEER K,9947573657,MLP,Wandoor,HCRS-KL-MLP-WDR-0034&#10;SADANANDAN,9497697956,KNR,Kannur,HCRS-KL-KNR-KNR-0451"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <Button 
                    onClick={handleProcessPastedText}
                    className="bg-brand-blue text-white h-11 w-full rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <ClipboardCheck className="w-4 h-4" /> Format Plain Columns
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-6 border border-slate-200 bg-white rounded-3xl space-y-6 text-left animate-in slide-in-from-right duration-350">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 2: Smart Column Field Mappings</h3>
                <p className="text-xs text-slate-500 mt-1">
                  സിസ്റ്റം കണ്ടെത്തിയ എക്സൽ കോള ഹെഡ്ഡറുകളെ മെമ്പർ ഫീൽഡുകളിലേക്ക് ജോടിയാക്കുക. ഇതിനായി കോളം നിർദ്ദേശങ്ങൾ ഓട്ടോമാറ്റിക് ആയി തിരഞ്ഞെടുത്തിട്ടുണ്ട്.
                </p>
              </div>

              {/* Dynamic Mapping Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                {Object.keys(mappings).map((key) => {
                  const schemaLabel: Record<string, string> = {
                    name: 'Full Name (മുഴുവൻ പേര്)*',
                    mobile: 'Mobile Number (ഫോൺ നമ്പർ)*',
                    district: 'District (ജില്ല)',
                    assembly: 'Assembly Constituency (മണ്ഡലം)',
                    membershipId: 'Old Membership ID (പഴയ ഐഡി)',
                    registrationDate: 'Date of Joining (ചേർന്ന തീയതി)',
                    membership_type: 'Membership Category',
                    status: 'Membership Status',
                    photo: 'Photo File Name / Column'
                  };

                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-tight leading-none">{schemaLabel[key]}</span>
                      <div className="relative">
                        <select 
                          className="bg-white border border-slate-250 w-full h-11 px-3.5 pr-9 rounded-xl text-xs font-semibold focus:border-brand-blue/30 focus:outline-none appearance-none"
                          value={mappings[key]}
                          onChange={(e) => setMappings({ ...mappings, [key]: parseInt(e.target.value) })}
                        >
                          <option value="-1">-- Leave Empty / Autogen --</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>{h}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-3.5 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* First few rows preview for visual cross checking */}
              <div className="space-y-3">
                <h4 className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block leading-none">Matrix Cross-Check Preview</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-slate-50/50 shadow-inner">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/70 text-slate-550 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 border-r border-slate-200 text-[10px] font-black uppercase tracking-wider">Line</th>
                        {headers.map((h, i) => (
                          <th key={i} className="py-3 px-4 border-r border-slate-205 text-[10px] font-black uppercase max-w-[170px] truncate tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {rawRows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 border-r border-slate-200 font-bold font-mono text-[10px] text-slate-400">{rIdx + 1}</td>
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-4 border-r border-slate-200 font-semibold text-slate-700 max-w-[170px] truncate">{val?.toString() || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={handleReset} className="h-11 px-5 rounded-xl text-slate-500 font-bold uppercase tracking-wider text-xs">Reset Dataset</Button>
                <Button 
                  onClick={runQualityValidateAndFilter}
                  className="bg-brand-blue text-white hover:bg-brand-blue/95 h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm"
                >
                  Analyze & Validate <ChevronRight className="w-4 h-4 ml-1.5 animate-bounce" />
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-6 border border-slate-200 bg-white rounded-3xl space-y-6 text-left animate-in slide-in-from-right duration-350">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 3: Quality Check & Double-Entry Scan</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  സിസ്റ്റം തനിപ്പകർപ്പുകളെയും (Duplicates) തെറ്റായ ജില്ലകളെയോ മണ്ഡലങ്ങളെയോ പരിശോധിച്ച് പ്രീ-ഇംപോർട്ട് ഫിൽറ്റർ പൂർത്തിയാക്കി.
                </p>
              </div>

              {/* Stat Boxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block leading-none">Total Rows</span>
                  <span className="text-2xl font-black text-slate-800 leading-tight block mt-2">{validatedRecords.length + duplicateRecords.length + invalidRecords.length}</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-1.5 uppercase">ആകെ വരികൾ</span>
                </div>
                
                <div className="bg-green-50/50 p-4.5 rounded-2xl border border-green-200 text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-600 block leading-none">No Collisions</span>
                  <span className="text-2xl font-black text-green-600 leading-tight block mt-2">{validatedRecords.length}</span>
                  <span className="text-[8px] font-bold text-green-400 block mt-1.5 uppercase">പുതിയ വിവരങ്ങൾ</span>
                </div>

                <div className="bg-rose-50/50 p-4.5 rounded-2xl border border-rose-200 text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 block leading-none">Collides Existing</span>
                  <span className="text-2xl font-black text-rose-600 leading-tight block mt-2">{duplicateRecords.length}</span>
                  <span className="text-[8px] font-bold text-rose-400 block mt-1.5 uppercase">ഡ്യൂപ്ലിക്കേറ്റുകൾ</span>
                </div>

                <div className="bg-amber-50/50 p-4.5 rounded-2xl border border-amber-200 text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block leading-none">Rejected / Invalid</span>
                  <span className="text-2xl font-black text-amber-600 leading-tight block mt-2">{invalidRecords.length}</span>
                  <span className="text-[8px] font-bold text-amber-500 block mt-1.5 uppercase font-mono">ഫോൺ നമ്പർ ഇല്ലാത്തവ</span>
                </div>
              </div>

              {/* Auto district mismatch re-alignment list */}
              {mismatchedRecords.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/20 p-5 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Auto-Correction Alert: Detected {mismatchedRecords.length} District/Assembly alignment mismatches.
                  </p>
                  <p className="text-[11px] text-slate-600">
                    മുകളിൽ ലിസ്റ്റ് ചെയ്ത വരികളിലെ അസംബ്ലി മണ്ഡലം മറ്റൊരു കേരള സംസ്ഥാന നിയമസഭാ ജില്ലയിലുള്ളതാണ്. മെമ്പർ ഡാറ്റാബേസിന്റെ ഭദ്രതക്കായി സിസ്റ്റം അവയെ ശരിയായ അസംബ്ലി പോർട്ടിലേക്ക് സ്വയം മാറ്റി ക്രമീകരിക്കുന്നതായിരിക്കും.
                  </p>
                  
                  <div className="max-h-[160px] overflow-y-auto border border-amber-100 rounded-xl bg-white text-[10.5px]">
                    <table className="w-full text-left">
                      <thead className="bg-amber-50/40 text-amber-900 border-b border-amber-100 font-bold">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">Member</th>
                          <th className="p-2">Assembly</th>
                          <th className="p-2">Resolution Path</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50 font-medium text-amber-955">
                        {mismatchedRecords.map((m, id) => (
                          <tr key={id}>
                            <td className="p-2 font-mono font-bold text-slate-400">{m.rowNum}</td>
                            <td className="p-2">{m.name}</td>
                            <td className="p-2">{m.assemblyConstituency}</td>
                            <td className="p-2 italic text-green-700">{m.mismatchMsg}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Duplicate conflict audit list */}
              {duplicateRecords.length > 0 && (
                <div className="border border-rose-200 bg-rose-50/10 p-5 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Duplicate Records Alert (തനിപ്പകർപ്പുകൾ): Detected {duplicateRecords.length} profiles that already exist in the system database.
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium">
                    താഴെ കാണിക്കുന്ന റെക്കോർഡുകൾ നിലവിലെ യൂസർ ഡാറ്റാബേസിലുള്ള വിവരങ്ങളുമായി മാച്ച് ചെയ്യുന്നതിനാൽ അവ ഓട്ടോമാറ്റിക്കായി ഒഴിവാക്കപ്പെട്ടവയാണ് (Skipped). ഇവർ ഏതൊക്കെയാണെന്ന് കാണുക:
                  </p>
                  
                  <div className="max-h-[220px] overflow-y-auto border border-rose-100 rounded-xl bg-white text-[10.5px]">
                    <table className="w-full text-left table-auto">
                      <thead className="bg-rose-50/40 text-rose-900 border-b border-rose-100 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 w-14">Row</th>
                          <th className="p-2">Name (പേര്)</th>
                          <th className="p-2">Mobile (ഫോൺ)</th>
                          <th className="p-2">Reason (ഒഴിവാക്കപ്പെടാനുള്ള കാരണം)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50 font-semibold text-rose-950">
                        {duplicateRecords.map((dup, id) => (
                          <tr key={id} className="hover:bg-rose-50/20">
                            <td className="p-2 font-mono text-slate-400">{dup.rowNum}</td>
                            <td className="p-2 text-slate-900 font-bold">{dup.name}</td>
                            <td className="p-2">{dup.mobile || 'N/A'}</td>
                            <td className="p-2">
                              <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                                {dup.duplicateReason === 'Mobile Number duplicate' ? 'ഫോൺ നമ്പർ ദ ഡ്യൂപ്ലിക്കേറ്റ്' : 'മെമ്പർഷിപ്പ് ഐഡി ഡ്യൂപ്ലിക്കേറ്റ്'} 
                                <span className="font-mono font-normal">({dup.duplicateReason})</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Duplicate conflict options configuration */}
              <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Configure Duplicate Collisions Treatment:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setDuplicateMode('skip')}
                    className={`p-4 rounded-xl border-2 cursor-pointer text-left transition-all ${
                      duplicateMode === 'skip' 
                        ? 'border-brand-blue bg-white shadow-sm' 
                        : 'border-slate-200 bg-slate-100/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-slate-800 uppercase">Skip Duplicates & Import New Only</span>
                      {duplicateMode === 'skip' && <div className="h-4 w-4 rounded-full bg-brand-blue flex items-center justify-center text-white text-[9px]">✓</div>}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                      ഫോൺ നമ്പറോ വാലിഡ് ഐഡിയോ സിസ്റ്റത്തിൽ ഇതിനകം തന്നെ നിലവിലുള്ള റെക്കോർഡുകളെ ഒഴിവാക്കും. ആകെ {validatedRecords.length} മെമ്പർമാർ പുതുതായി ക്രിയേറ്റ് ആകും.
                    </p>
                  </div>

                  <div 
                    onClick={() => setDuplicateMode('update')}
                    className={`p-4 rounded-xl border-2 cursor-pointer text-left transition-all ${
                      duplicateMode === 'update' 
                        ? 'border-brand-blue bg-white shadow-sm' 
                        : 'border-slate-200 bg-slate-100/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-slate-800 uppercase">Update & Merge Existing Records</span>
                      {duplicateMode === 'update' && <div className="h-4 w-4 rounded-full bg-brand-blue flex items-center justify-center text-white text-[9px]">✓</div>}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                      തുല്യ ഫോൺ നമ്പർ ഉള്ള നിലവിലെ മെമ്പേഴ്സ് ഫോർമാറ്റിലേക്ക് ഈ എക്സൽ ഷീറ്റിലെ വിവരങ്ങൾ ഓവർറൈറ്റ് ചെയ്ത് മാപ്പ് ചെയ്യും. ആകെ {validatedRecords.length + duplicateRecords.length} റെക്കോർഡുകൾ അപ്ഡേറ്റ് ആകും.
                    </p>
                  </div>
                </div>
              </div>

              {/* ADHOC Category Security Notice */}
              <div className="bg-brand-blue/5 border border-brand-blue/15 p-4 rounded-xl flex gap-3 text-slate-700">
                <Sparkles className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-extrabold text-slate-800">Security Rule Enforcement notice:</p>
                  <p className="font-medium text-slate-600">
                    HCRS സെക്യൂരിറ്റി നിയമങ്ങൾക്ക് കീഴിൽ, ബൾക്ക് സിസ്റ്റത്തിൽ ഇറക്കുമതി ചെയ്യുന്ന മുഴുവൻ വരിക്കാരും പൂർണ്ണമായി <strong>Annual membership type</strong> ഒപ്പം <strong>ADHOC_MEMBER</strong> കോളം മാത്രമായിട്ടായിരിക്കും രജിസ്റ്റർ ചെയ്യപ്പെടുക. ലൈഫ് മെമ്പർഷിപ്പ് അനുവദിക്കുന്നത് മാസ്റ്റർ അഡ്മിൻ നേരിട്ടുള്ള മാനുവൽ അപ്രൂവലുകൾക്ക് മാത്രമായി പരിമിതപ്പെടുത്തിയിരിക്കുന്നു.
                  </p>
                </div>
              </div>

              {/* Submit Buttons bar */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 uppercase">
                    Ready to Seed {duplicateMode === 'skip' ? validatedRecords.length : validatedRecords.length + duplicateRecords.length} Member Profiles
                  </p>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">Incremental Transaction commits will start</p>
                </div>
                <div className="flex gap-2.5">
                  <Button variant="outline" onClick={() => setStep(2)} className="h-10 text-xs font-bold uppercase tracking-wider ml-1">Back</Button>
                  <Button 
                    onClick={beginBulkDataMigration}
                    className="bg-green-600 hover:bg-green-700 text-white h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md"
                  >
                    Confirm & Start Import <UserCheck className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card className="p-8 border border-slate-200 bg-white rounded-3xl text-center max-w-xl mx-auto space-y-6">
              <RefreshCw className="w-10 h-10 text-brand-blue mx-auto animate-spin" />
              <div className="space-y-1.5">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Writing dataset to secure storage...</h4>
                <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                  ബഗ്ഗുകൾ വരാതിരിക്കാൻ ബാച്ച് ബിൽഡറുകൾ ഉപയോഗിച്ച് തനിപ്പകർപ്പ് തടഞ്ഞ് പതുക്കെ പ്രോഗ്രസ് ചെയ്യുന്നു. ഫയലുകൾ പ്രോസസ് ചെയ്യുന്നത് വരെ ബ്രൗസർ വിൻഡോ ക്ലോസ്സ് ചെയ്യരുത്.
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                  <span>Processed {currentProgressIndex + 1} / {validatedRecords.length + (duplicateMode === 'update' ? duplicateRecords.length : 0)}</span>
                  <span>{Math.round(((currentProgressIndex + 1) / (validatedRecords.length + (duplicateMode === 'update' ? duplicateRecords.length : 0))) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-150">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-blue to-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${((currentProgressIndex + 1) / (validatedRecords.length + (duplicateMode === 'update' ? duplicateRecords.length : 0))) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button 
                  onClick={() => setIsPaused(!isPaused)} 
                  variant="outline"
                  className="h-9 px-4 text-[10px] font-bold uppercase tracking-wide rounded-lg"
                >
                  {isPaused ? 'Resume Import Queue' : 'Pause Seeder queue'}
                </Button>
              </div>

              {/* Real time logging stdout */}
              <div className="bg-slate-900 border border-slate-800 text-[10px] text-green-400 font-mono p-4 rounded-xl max-h-[180px] overflow-y-auto space-y-1 text-left shadow-lg select-all scrollbar-thin">
                {importLog.slice(0, 15).map((log, index) => (
                  <div 
                    key={index}
                    className={
                      log.type === 'error' ? 'text-red-400 font-bold border-l-2 border-red-500 pl-2' : 
                      log.type === 'update' ? 'text-blue-400 border-l-2 border-blue-500 pl-2' : 'text-green-400 pl-2 border-l-2 border-green-500'
                    }
                  >
                    {log.message}
                  </div>
                ))}
                {importLog.length === 0 && <span className="text-slate-500 italic block">Warming background writers...</span>}
              </div>
            </Card>
          )}

          {step === 5 && (
            <Card className="p-8 border border-slate-200 bg-white rounded-3xl space-y-8 animate-in zoom-in-95 duration-200 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">HCRS Migration Process Report</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 font-bold">
                    <FileText className="w-4 h-4 text-brand-blue" />
                    Source File: <span className="font-mono font-black text-slate-700">{fileName}</span>
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => window.print()}
                    variant="outline"
                    className="h-10 text-[10px] px-4 rounded-xl border-slate-200 font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Summary
                  </Button>
                  <Button 
                    onClick={exportMigrationSummaryToExcel}
                    className="bg-brand-blue text-white h-10 px-5 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export To Excel
                  </Button>
                </div>
              </div>

              {/* Metric boxes grids */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Rows processed</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">{importStats.totalRows}</span>
                </div>

                <div className="bg-green-50/40 p-5 rounded-2xl border border-green-105">
                  <span className="text-[10px] font-black uppercase text-green-600 block tracking-wider">New Created</span>
                  <span className="text-3xl font-black text-green-600 mt-1 block">{importStats.imported}</span>
                </div>

                <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-105">
                  <span className="text-[10px] font-black uppercase text-blue-600 block tracking-wider">Merged/Updated</span>
                  <span className="text-3xl font-black text-blue-600 mt-1 block">{importStats.updated}</span>
                </div>

                <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-105">
                  <span className="text-[10px] font-black uppercase text-rose-500 block tracking-wider">Failures</span>
                  <span className="text-3xl font-black text-rose-600 mt-1 block">{importStats.failed}</span>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/15 p-5 rounded-2xl flex gap-3 text-slate-800">
                <div className="h-6 w-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-green-900 leading-none">Database syncing successful!</p>
                  <p className="font-semibold text-slate-600 mt-1">
                    നിങ്ങൾ അപ്‌ലോഡ് ചെയ്ത വരിക്കാരുടെ വിവരങ്ങൾ മൊബൈൽ നമ്പറുകൾ തനിപ്പകർപ്പ് വരാതെയും, വാട്സാപ്പ് സെറ്റിങ്സ് ക്രോഡീകരിച്ചും, മുൻഗണന അനുസരിച്ചും കേരളാ ഡിവിഷൻ സിസ്റ്റത്തിലേക്ക് വിജയകരമായി ഇന്റഗ്രേറ്റ് ചെയ്തു കഴിഞ്ഞിരിക്കുന്നു.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button onClick={handleReset} className="bg-slate-100 hover:bg-slate-200 text-slate-700 h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-xs">Import alternative sheet</Button>
              </div>
            </Card>
          )}

        </div>
      ) : (
        /* History logs and transactional recovery dashboard rollbacks */
        <Card className="p-6 border border-slate-205 bg-white rounded-3xl text-left space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Migrations & rollback control cockpit</h3>
            <p className="text-xs text-slate-500 mt-1">
              HCRS മാസ്റ്റർ അഡ്മിൻ കുടിയേറ്റ പ്രവർത്തനങ്ങളുടെ ചരിത്രം ഇവിടെ സൂക്ഷിക്കുന്നു. ഏതെങ്കിലും കാരണത്താൽ അപ്‌ലോഡ് തെറ്റിപ്പോയാൽ റോൾ ബാക്ക് വഴി മുൻപുള്ള കൃത്യമായ അവസ്ഥ പുനഃസ്ഥാപിക്കാം.
            </p>
          </div>

          {isLoadingLogs ? (
            <div className="py-12 text-center text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
              Loading database history audit files...
            </div>
          ) : migrationLogs.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl text-center text-xs font-bold text-slate-400">
              No previous spreadsheet migrations found in database.
            </div>
          ) : (
            <div className="divide-y divide-slate-150 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              {migrationLogs.map((log) => (
                <div key={log.id} className="p-5 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-800">{log.fileName}</span>
                      {log.rolled_back ? (
                        <span className="text-[8px] bg-red-100 text-red-600 font-extrabold uppercase px-1.5 py-0.5 rounded-md">Rolled Back</span>
                      ) : (
                        <span className="text-[8px] bg-green-100 text-green-600 font-extrabold uppercase px-1.5 py-0.5 rounded-md">Live Seeding</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none">
                      Processed at <span className="font-mono">{new Date(log.timestamp).toLocaleString()}</span> by <span className="font-bold text-slate-600">{log.adminEmail}</span>
                    </p>
                    <div className="flex gap-4 text-[10.5px] font-bold text-slate-500">
                      <span>Records: <strong className="text-slate-700">{log.totalRecords}</strong></span>
                      <span>Created: <strong className="text-green-600">+{log.importedCount}</strong></span>
                      <span>Updated: <strong className="text-blue-600">+{log.updatedCount || 0}</strong></span>
                    </div>
                  </div>

                  <div>
                    {!log.rolled_back ? (
                      <Button
                        onClick={() => handleRollbackAction(log)}
                        className="bg-red-55/10 border border-red-200 text-red-600 hover:bg-red-500 hover:text-white h-10 px-4 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all select-none cursor-pointer"
                      >
                        <Undo2 className="w-4 h-4" /> Undo Last Import (Rollback)
                      </Button>
                    ) : (
                      <span className="text-[10px] text-red-400 font-black uppercase tracking-wider flex items-center gap-1 bg-red-50/50 px-3.5 py-2.5 rounded-xl border border-red-100">
                        ✓ Database successfully recovered
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
