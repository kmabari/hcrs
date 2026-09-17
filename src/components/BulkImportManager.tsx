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
  Download,
  Clock,
  ShieldCheck,
  HelpCircle
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

  // Step state: 1: Upload, 2: Map columns, 3: Validate & Pre-import stats, 4: Live progress, 5: Summary Report
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fileName, setFileName] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  
  // Confirmation modal state before import
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

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

  // Categorized records after comparison with Firestore members
  const [validatedRecords, setValidatedRecords] = useState<any[]>([]);      // Old Members to Import (Non-conflicting)
  const [duplicateRecords, setDuplicateRecords] = useState<any[]>([]);      // Mobile + Name already exist -> Skip
  const [manualReviewRecords, setManualReviewRecords] = useState<any[]>([]);// Phone matches but Name differs OR Name matches but Phone differs
  const [invalidRecords, setInvalidRecords] = useState<any[]>([]);         // Missing name or phone < 10 digits
  const [mismatchedRecords, setMismatchedRecords] = useState<any[]>([]);    // District/Constituency Mismatches

  // Active view tab inside Step 3 pre-import analysis
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'to_import' | 'duplicates' | 'manual_review' | 'invalid'>('to_import');

  // Analyze Only Mode Flag
  const [isAnalyzeOnlyMode, setIsAnalyzeOnlyMode] = useState<boolean>(false);

  // Execution engine state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [currentProgressIndex, setCurrentProgressIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [importLog, setImportLog] = useState<{ type: 'success' | 'update' | 'skip' | 'error'; message: string }[]>([]);

  // Generated statistics for the active operation
  const [importStats, setImportStats] = useState({
    totalUploaded: 0,
    existingMembers: 0,
    imported: 0,
    skipped: 0,
    manualReview: 0,
    failed: 0,
    timeTakenSeconds: '0.0',
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
      console.error("Error loading migration logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (panelTab === 'history') {
      fetchMigrationLogs();
    }
  }, [panelTab]);

  // Main Admin check
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
        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Access Restricted System</h3>
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

  // Helper to parse searchable PDF buffer and extract tabular text data
  const parsePdfBuffer = (buffer: ArrayBuffer, name: string) => {
    try {
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder('latin1').decode(bytes);

      const rawLines: string[] = [];
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let streamMatch;
      while ((streamMatch = streamRegex.exec(text)) !== null) {
        const streamContent = streamMatch[1];
        const textRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|TJ|\/)/g;
        let textMatch;
        let currentParts: string[] = [];
        while ((textMatch = textRegex.exec(streamContent)) !== null) {
          const strVal = textMatch[1]
            .replace(/\\([()\\])/g, '$1')
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .trim();
          if (strVal) {
            currentParts.push(strVal);
          }
        }
        if (currentParts.length > 0) {
          rawLines.push(currentParts.join(' '));
        }
      }

      if (rawLines.length === 0) {
        const globalTextRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
        let m;
        let currentLineParts: string[] = [];
        while ((m = globalTextRegex.exec(text)) !== null) {
          const val = m[1].replace(/\\([()\\])/g, '$1').trim();
          if (val) currentLineParts.push(val);
          if (currentLineParts.length >= 5) {
            rawLines.push(currentLineParts.join(','));
            currentLineParts = [];
          }
        }
        if (currentLineParts.length > 0) {
          rawLines.push(currentLineParts.join(','));
        }
      }

      const parsedMatrix: string[][] = [];
      for (const line of rawLines) {
        const columns = line.split(/,|\t|\||\s{2,}/).map(c => c.trim()).filter(Boolean);
        if (columns.length >= 2) {
          parsedMatrix.push(columns);
        }
      }

      if (parsedMatrix.length > 1) {
        setFileName(name);
        setZipPhotos(new Map());
        processRawMatrix(parsedMatrix);
        toast.success(`Searchable PDF parsed: Extracted ${parsedMatrix.length - 1} records.`);
      } else {
        toast.error("Could not extract tabular text data from this PDF file. The PDF may be scanned/image-based or unformatted. Please convert it to Excel (.xlsx) or CSV format.");
      }
    } catch (err: any) {
      console.error("PDF parse error:", err);
      toast.error("Could not extract tabular text data from this PDF file. The PDF may be scanned/image-based or unformatted. Please convert it to Excel (.xlsx) or CSV format.");
    }
  };

  // Process selected file (excel/csv/json/zip/pdf)
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
    } else if (lowerName.endsWith('.pdf')) {
      setFileName(file.name);
      setZipPhotos(new Map());
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        parsePdfBuffer(buffer, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else if (lowerName.endsWith('.json')) {
      setFileName(file.name);
      setZipPhotos(new Map());
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsedData = JSON.parse(text);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            if (typeof parsedData[0] === 'object' && !Array.isArray(parsedData[0])) {
              const keys = Array.from(new Set(parsedData.flatMap(obj => Object.keys(obj))));
              const matrix = [
                keys,
                ...parsedData.map(obj => keys.map(k => obj[k] !== undefined && obj[k] !== null ? String(obj[k]) : ''))
              ];
              processRawMatrix(matrix);
            } else if (Array.isArray(parsedData[0])) {
              processRawMatrix(parsedData);
            } else {
              toast.error("Invalid JSON structure. Expected array of objects or 2D array.");
            }
          } else {
            toast.error("JSON file is empty or not an array.");
          }
        } catch (err: any) {
          toast.error("Failed to parse JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("Unsupported file format. Please upload .xlsx, .xls, .csv, .json, .pdf or .zip file.");
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
    } else if (item.filename.toLowerCase().endsWith('.json')) {
      const text = await item.file.async('string');
      const parsedData = JSON.parse(text);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        if (typeof parsedData[0] === 'object' && !Array.isArray(parsedData[0])) {
          const keys = Array.from(new Set(parsedData.flatMap(obj => Object.keys(obj))));
          const matrix = [
            keys,
            ...parsedData.map(obj => keys.map(k => obj[k] !== undefined && obj[k] !== null ? String(obj[k]) : ''))
          ];
          processRawMatrix(matrix);
        } else {
          processRawMatrix(parsedData);
        }
      }
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
        
        if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || lowerName.endsWith('.json')) {
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
          } else if (mainSheet.filename.toLowerCase().endsWith('.json')) {
            const text = await mainSheet.file.async('string');
            const parsedData = JSON.parse(text);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              if (typeof parsedData[0] === 'object' && !Array.isArray(parsedData[0])) {
                const keys = Array.from(new Set(parsedData.flatMap(obj => Object.keys(obj))));
                const matrix = [
                  keys,
                  ...parsedData.map(obj => keys.map(k => obj[k] !== undefined && obj[k] !== null ? String(obj[k]) : ''))
                ];
                processRawMatrix(matrix);
              } else {
                processRawMatrix(parsedData);
              }
            }
          } else {
            const buffer = await mainSheet.file.async('arraybuffer');
            parseSpreadsheetBuffer(buffer, mainSheet.filename);
          }
        } else {
          setAvailableSpreadsheets(spreadsheetFiles);
          toast.success(`Successfully decompressed zip. Detected ${spreadsheetFiles.length} files. Please select one.`);
        }
      } else {
        toast.error("No valid dataset (.xlsx, .xls, .csv, .json) detected inside ZIP.");
      }
    } catch (err: any) {
      console.error("ZIP extract issue:", err);
      toast.error("Unpacking ZIP failed: " + err.message);
    }
  };

  // Convert pasted text to rows
  const handleProcessPastedText = () => {
    if (!inputText.trim()) {
      toast.error('Please paste CSV or JSON formatted text first');
      return;
    }
    const trimmed = inputText.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsedData = JSON.parse(trimmed);
        const arr = Array.isArray(parsedData) ? parsedData : [parsedData];
        if (arr.length > 0 && typeof arr[0] === 'object') {
          const keys = Array.from(new Set(arr.flatMap(obj => Object.keys(obj))));
          const matrix = [
            keys,
            ...arr.map(obj => keys.map(k => obj[k] !== undefined && obj[k] !== null ? String(obj[k]) : ''))
          ];
          setFileName("Pasted JSON Dataset");
          setZipPhotos(new Map());
          processRawMatrix(matrix);
          toast.success(`Parsed ${arr.length} JSON objects`);
          return;
        }
      } catch (e) {
        // Fallback to CSV parsing below
      }
    }
    const lines = parseRawCSV(inputText);
    if (lines.length > 0) {
      setFileName("Direct Plain Text Import");
      setZipPhotos(new Map());
      processRawMatrix(lines);
      toast.success(`Successfully formatted ${lines.length} lines`);
    } else {
      toast.error('Plain values could not be parsed into valid table columns');
    }
  };

  // Guess mappings based on clean regex & explicit case-insensitive header matching
  const guessMappings = (headersList: string[]) => {
    const newMappings = {
      name: -1,
      mobile: -1,
      district: -1,
      assembly: -1,
      pincode: -1,
      post: -1,
      highrichId: -1,
      membershipId: -1,
      registrationDate: -1,
      membership_type: -1,
      status: -1,
      photo: -1
    };

    // Lists specified in HCRS Master Rules (case-insensitive trimmed comparison)
    const constituencyHeaders = ['mandhalam', 'മണ്ഡലം', 'constituency', 'assembly constituency', 'assembly', 'constituency name'];
    const districtHeaders = ['district', 'ജില്ല', 'district name'];
    const nameHeaders = ['member name', 'name', 'full name', 'applicant name'];
    const mobileHeaders = ['mobile', 'mobile number', 'phone', 'contact number'];
    const categoryHeaders = ['assigned category', 'category', 'member category'];

    headersList.forEach((h, index) => {
      const trimmed = (h || '').toString().trim();
      const lower = trimmed.toLowerCase();
      const lowerClean = lower.replace(/[\s_\-:]/g, '');

      // 1. Member Name (Member Name, Name, Full Name, Applicant Name)
      if (nameHeaders.includes(lower) || /full|name|display|membername|applicantname|പേര്|അംഗത്തിന്റെപേര്|അംഗം/i.test(lowerClean)) {
        if (newMappings.name === -1 || nameHeaders.includes(lower)) {
          newMappings.name = index;
        }
      }

      // 2. Mobile (Mobile, Mobile Number, Phone, Contact Number)
      if (mobileHeaders.includes(lower) || /mobile|mob|phone|phone_number|phonenumber|highrichmob|contact|contactnumber|mobilenumber|മൊബൈൽ|ഫോൺ/i.test(lowerClean)) {
        if (newMappings.mobile === -1 || mobileHeaders.includes(lower)) {
          newMappings.mobile = index;
        }
      }

      // 3. District (District, ജില്ല, District Name)
      if (districtHeaders.includes(lower) || /district|dist|place|districtname|ജില്ല|സ്ഥലം/i.test(lowerClean)) {
        if (newMappings.district === -1 || districtHeaders.includes(lower)) {
          newMappings.district = index;
        }
      }

      // 4. Constituency / Mandhalam (Mandhalam, മണ്ഡലം, Constituency, Assembly Constituency, Assembly, Constituency Name)
      if (constituencyHeaders.includes(lower) || /mandhalam|assembly|constituency|constituencyname|assemblyconstituency|constituencycode|block|മണ്ഡലം|നിയമസഭ/i.test(lowerClean)) {
        if (newMappings.assembly === -1 || constituencyHeaders.includes(lower)) {
          newMappings.assembly = index;
        }
      }

      // 5. Category (Assigned Category, Category, Member Category)
      if (categoryHeaders.includes(lower) || /assignedcategory|category|membercategory|type|membership_type|membershipclass|വിഭാഗം|കാറ്റഗറി/i.test(lowerClean)) {
        if (newMappings.membership_type === -1 || categoryHeaders.includes(lower)) {
          newMappings.membership_type = index;
        }
      }

      // Additional standard fields
      if (/membershipno|membershipid|memberid|oldid|പഴയ/i.test(lowerClean)) {
        if (newMappings.membershipId === -1) newMappings.membershipId = index;
      }
      if (/registered|date|join|joindate|created|തീയതി|ചേർന്നതീയതി/i.test(lowerClean)) {
        if (newMappings.registrationDate === -1) newMappings.registrationDate = index;
      }
      if (/status|active|അംഗത്വം|സ്റ്റാറ്റസ്/i.test(lowerClean)) {
        if (newMappings.status === -1) newMappings.status = index;
      }
      if (/photo|image|pic|face|പ്രൊഫൈൽ|ഫോട്ടോ/i.test(lowerClean)) {
        if (newMappings.photo === -1) newMappings.photo = index;
      }
    });

    setMappings(newMappings);
  };

  const processRawMatrix = (matrix: any[][]) => {
    if (matrix.length === 0) return;
    const rawHeaders = matrix[0].map(h => (h || '').toString().trim());
    setHeaders(rawHeaders);
    setRawRows(matrix.slice(1));
    guessMappings(rawHeaders);
    setStep(2);
  };

  // Run duplicate analysis according to HCRS Duplicate Rules
  const runQualityValidateAndFilter = (analyzeOnly: boolean = false) => {
    setIsAnalyzeOnlyMode(analyzeOnly);

    if (mappings.mobile === -1) {
      toast.error("Please match the Mobile Number column to perform comparison.");
      return;
    }
    if (mappings.name === -1) {
      toast.warning("Full Name column is unmapped. Please map it to ensure accurate duplicate checking.");
      return;
    }

    // Build comparison maps from existing Firestore members
    const existingMobileToNamesMap = new Map<string, Set<string>>();
    const existingNameToMobilesMap = new Map<string, Set<string>>();
    const existingMobilesSet = new Set<string>();
    const existingNamesSet = new Set<string>();

    members.forEach(m => {
      if (m.mobile) {
        const mob = m.mobile.toString().replace(/\D/g, '').trim().slice(-10);
        if (mob.length === 10) {
          existingMobilesSet.add(mob);
          if (!existingMobileToNamesMap.has(mob)) {
            existingMobileToNamesMap.set(mob, new Set());
          }
          if (m.name) {
            const cleanName = m.name.toString().toLowerCase().trim().replace(/\s+/g, ' ');
            existingMobileToNamesMap.get(mob)!.add(cleanName);
          }
        }
      }
      if (m.name) {
        const cleanName = m.name.toString().toLowerCase().trim().replace(/\s+/g, ' ');
        if (cleanName) {
          existingNamesSet.add(cleanName);
          if (!existingNameToMobilesMap.has(cleanName)) {
            existingNameToMobilesMap.set(cleanName, new Set());
          }
          if (m.mobile) {
            const mob = m.mobile.toString().replace(/\D/g, '').trim().slice(-10);
            if (mob.length === 10) {
              existingNameToMobilesMap.get(cleanName)!.add(mob);
            }
          }
        }
      }
    });

    const batchMobilesSet = new Set<string>();
    const batchNamesSet = new Set<string>();

    const ready: any[] = [];
    const dups: any[] = [];
    const manualReviews: any[] = [];
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
      const rawCategoryVal = mappings.membership_type !== -1 ? row[mappings.membership_type] : '';

      const name = (rawName || '').toString().trim();
      const cleanName = name.toLowerCase().replace(/\s+/g, ' ');
      const mobileClean = (rawMobile || '').toString().replace(/\D/g, '').trim().slice(-10);

      // Raw uploaded strings preserved explicitly without altering or defaulting
      const uploadedDistrict = (rawDist || '').toString().trim();
      const uploadedConstituency = (rawAssembly || '').toString().trim();
      const uploadedCategory = (rawCategoryVal || '').toString().trim();

      // Validation 1: Required Name and 10 Digits Mobile Check
      if (!name || mobileClean.length < 10) {
        inv.push({
          row: rowIndex + 1,
          name: name || 'Missing Name',
          mobile: rawMobile || 'Invalid Phone',
          uploadedDistrict,
          uploadedConstituency,
          reason: 'Missing name or phone number is less than 10 digits'
        });
        return;
      }

      // Validation 2: Exact Location Matching against HCRS Master List
      // NEVER automatically change, guess, auto-correct or assign default values
      let mappedDistrict = 'UNMATCHED';
      let mappedDistrictCode = 'OTH';
      let mappedConstituency = 'UNMATCHED';
      let isDistrictValid = false;
      let isConstituencyValid = false;

      if (uploadedDistrict) {
        const foundDist = DISTRICTS.find(d => 
          d.code.toLowerCase() === uploadedDistrict.toLowerCase() ||
          d.name.toLowerCase().replace(/\s/g, '') === uploadedDistrict.toLowerCase().replace(/\s/g, '')
        );
        if (foundDist) {
          mappedDistrict = foundDist.name;
          mappedDistrictCode = foundDist.code;
          isDistrictValid = true;

          if (uploadedConstituency) {
            const validAssemblies = CONSTITUENCIES[foundDist.code] || [];
            const foundCons = validAssemblies.find(c => 
              c.toLowerCase().replace(/\s/g, '') === uploadedConstituency.toLowerCase().replace(/\s/g, '')
            );
            if (foundCons) {
              mappedConstituency = foundCons;
              isConstituencyValid = true;
            }
          }
        }
      }

      const hasLocationMismatch = !isDistrictValid || !isConstituencyValid;
      let locationMismatchReason = '';
      if (!isDistrictValid && !isConstituencyValid) {
        locationMismatchReason = `District '${uploadedDistrict || 'Missing'}' & Constituency '${uploadedConstituency || 'Missing'}' do not match HCRS Master List`;
      } else if (!isDistrictValid) {
        locationMismatchReason = `District '${uploadedDistrict}' is missing or invalid in HCRS Master List`;
      } else if (!isConstituencyValid) {
        locationMismatchReason = `Constituency '${uploadedConstituency || 'Missing'}' does not exist under District '${mappedDistrict}' in HCRS Master List`;
      }

      // Member Photo Matching
      let finalPhotoUrl = '';
      if (rawPhotoVal) {
        const pKey = rawPhotoVal.toString().toLowerCase().trim();
        if (zipPhotos.has(pKey)) {
          finalPhotoUrl = zipPhotos.get(pKey) || '';
        }
      }
      
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

      // Format Joining Dates
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
          // Default to current date
        }
      }

      // DUPLICATE RULES EVALUATION:
      const mobileExistsInDB = existingMobilesSet.has(mobileClean);
      const nameExistsInDB = existingNamesSet.has(cleanName);

      const dbNamesForMobile = existingMobileToNamesMap.get(mobileClean);
      const dbMobilesForName = existingNameToMobilesMap.get(cleanName);

      const exactMobileAndNameMatch = (
        (dbNamesForMobile && dbNamesForMobile.has(cleanName)) ||
        (dbMobilesForName && dbMobilesForName.has(mobileClean))
      );

      const isBatchDup = batchMobilesSet.has(mobileClean) && batchNamesSet.has(cleanName);

      const record = {
        rowNum: rowIndex + 1,
        name,
        cleanName,
        mobile: mobileClean,
        originalMobile: rawMobile,
        address: row[mappings.address]?.toString() || '',
        pincode: row[mappings.pincode]?.toString() || '',
        postOffice: row[mappings.post]?.toString() || '',
        highrichId: row[mappings.highrichId]?.toString() || '',
        uploadedDistrict,
        uploadedConstituency,
        uploadedCategory,
        mappedDistrict,
        mappedConstituency,
        district: isDistrictValid ? mappedDistrictCode : 'OTH',
        assemblyConstituency: isConstituencyValid ? mappedConstituency : uploadedConstituency,
        membershipId: rawOldId ? rawOldId.toString().toUpperCase().trim() : '',
        registrationDate,
        photoUrl: finalPhotoUrl,
        membership_type: 'OLD_MEMBER',
        membershipType: 'OLD_MEMBER',
        status: 'active',
        hasLocationMismatch,
        mismatched: hasLocationMismatch,
        mismatchMsg: locationMismatchReason
      };

      if (exactMobileAndNameMatch || isBatchDup) {
        // Rule 1: Mobile Number + Name already exist -> Skip
        dups.push({
          ...record,
          duplicateReason: 'Mobile Number + Name already exist in database (Skipped)'
        });
      } else if (mobileExistsInDB && !exactMobileAndNameMatch) {
        // Rule 2: Phone matches but Name differs -> Manual Review
        manualReviews.push({
          ...record,
          reviewReason: 'Phone number matches an existing member, but Name is different',
          conflictType: 'Phone Matches, Name Differs'
        });
      } else if (nameExistsInDB && !exactMobileAndNameMatch) {
        // Rule 3: Name matches but Phone differs -> Manual Review
        manualReviews.push({
          ...record,
          reviewReason: 'Name matches an existing member, but Phone number is different',
          conflictType: 'Name Matches, Phone Differs'
        });
      } else if (hasLocationMismatch) {
        // Location / Master Data Mismatch -> Send to Manual Review
        manualReviews.push({
          ...record,
          reviewReason: locationMismatchReason,
          conflictType: 'Location / Master Data Mismatch'
        });
      } else {
        // Passed ALL checks (Valid Name/Mobile, No duplicate conflicts, Valid Location in HCRS Master List)
        ready.push(record);
        batchMobilesSet.add(mobileClean);
        batchNamesSet.add(cleanName);
      }

      if (hasLocationMismatch) {
        mismatches.push(record);
      }
    });

    setValidatedRecords(ready);
    setDuplicateRecords(dups);
    setManualReviewRecords(manualReviews);
    setInvalidRecords(inv);
    setMismatchedRecords(mismatches);
    setStep(3);
  };

  // Perform bulk transactional seed mapping to firebase firestore as OLD_MEMBER only
  const beginBulkDataMigration = async () => {
    setShowConfirmModal(false);

    // Import ONLY validated non-conflicting records as OLD_MEMBER
    const listToProcess = [...validatedRecords];

    if (listToProcess.length === 0) {
      toast.error("No non-conflicting records available to import.");
      return;
    }

    setIsImporting(true);
    setIsPaused(false);
    setCurrentProgressIndex(0);
    setImportLog([]);

    const startTime = Date.now();
    const batchSize = 100;
    let successCount = 0;
    let failCount = 0;
    const importedUids: string[] = [];

    const activeLogs: typeof importLog = [];
    activeLogs.unshift({ type: 'success', message: `Initializing background import queue as OLD_MEMBER (${listToProcess.length} records)...` });
    setImportLog([...activeLogs]);

    // Read current total serial offset
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
        let serial = row.rowNum + currentSerial;
        let finalMembershipId = row.membershipId;

        if (!finalMembershipId) {
          finalMembershipId = generateNewMembershipId(row.district, row.assemblyConstituency, serial);
        }

        const expiryDate = new Date(row.registrationDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        // ALWAYS created as OLD_MEMBER (never NEW_MEMBER)
        const memberProfile: any = {
          uid: docUid,
          name: row.name,
          mobile: row.mobile,
          email: `${row.mobile}@hcrs.society`,
          address: row.address || '',
          pincode: row.pincode || '',
          postOffice: row.postOffice || '',
          highrichId: row.highrichId || '',
          assemblyConstituency: row.assemblyConstituency,
          constituencyCode: row.constituencyCode || getAssemblyCode(row.assemblyConstituency),
          district: row.district,
          state: 'Kerala',
          bloodGroup: 'A+',
          registrationDate: row.registrationDate,
          expiryDate: expiryDate,
          issueDate: row.registrationDate,
          username: `hcrs_${row.mobile}`,
          pin: '123456',
          status: 'active',
          isPaid: true,
          isApproved: true,
          role: 'member',
          isAdmin: false,
          serialNo: serial,
          membershipId: finalMembershipId,
          waStatus: 'Pending',
          photoUrl: row.photoUrl || '',
          membership_type: 'OLD_MEMBER' as any,
          membershipType: 'OLD_MEMBER' as any,
          isOldMember: true
        };

        // Increment district quota
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
          await setDoc(quotaRef, { used: increment(1) }, { merge: true });
        }

        // Commit profile to Firestore
        await setDoc(userRef, memberProfile);

        importedUids.push(docUid);
        successCount++;
        activeLogs.unshift({ type: 'success', message: `[IMPORTED OLD_MEMBER] ${row.name} (${row.mobile}) created with ID: ${finalMembershipId}` });

      } catch (err: any) {
        failCount++;
        activeLogs.unshift({ type: 'error', message: `[FAILED] Row #${row.rowNum} error: ${err.message}` });
      }

      setImportLog([...activeLogs]);
    }

    const endTime = Date.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(1);

    // Update global dashboard/system counts
    if (successCount > 0) {
      const metaRef = doc(db, 'system', 'totals');
      await setDoc(metaRef, { count: increment(successCount) }, { merge: true });
    }

    // Automatically create Import Log in Firestore
    const logId = `import_log_${Date.now()}`;
    const logData = {
      id: logId,
      timestamp: new Date().toISOString(),
      adminEmail: adminUser?.email || 'N/A',
      fileName: fileName,
      totalUploaded: rawRows.length,
      existingMembersCount: members.length,
      importedCount: successCount,
      skippedCount: duplicateRecords.length,
      manualReviewCount: manualReviewRecords.length,
      timeTakenSeconds: parseFloat(timeTaken),
      importedUids: importedUids,
      type: 'OLD_MEMBER_IMPORT',
      rolled_back: false
    };

    await setDoc(doc(db, 'migration_logs', logId), logData);

    setImportStats({
      totalUploaded: rawRows.length,
      existingMembers: members.length,
      imported: successCount,
      skipped: duplicateRecords.length,
      manualReview: manualReviewRecords.length,
      failed: failCount,
      timeTakenSeconds: timeTaken,
      timestamp: new Date()
    });

    setIsImporting(false);
    onRefresh();
    setStep(5);
    toast.success(`Import completed in ${timeTaken}s. ${successCount} Imported as OLD_MEMBER, ${duplicateRecords.length} Skipped, ${manualReviewRecords.length} Flagged for Review.`);
  };

  // Rollback operation
  const handleRollbackAction = async (log: any) => {
    toast.error("Imported member records are preserved. Rollback deletion requires a separately approved migration plan.");
    return;

    if (log.rolled_back) {
      toast.error("This import migration has already been rolled back.");
      return;
    }

    const confirmRollback = window.confirm(
      `CRITICAL UNDO WARNING:\nAre you sure you want to rollback the import from "${log.fileName}"?\n\nThis will REMOVE ${log.importedCount} imported OLD_MEMBER records from the system. This operation cannot be undone.`
    );
    if (!confirmRollback) return;

    toast.loading("Reverting Firestore records...", { id: 'rollback-load' });
    let deleteCounter = 0;

    try {
      const uidsList: string[] = log.importedUids || [];

      for (const uid of uidsList) {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.district) {
            const quotaRef = doc(db, 'districtQuotas', data.district);
            await setDoc(quotaRef, { used: increment(-1) }, { merge: true });
          }
          await deleteDoc(userRef);
          deleteCounter++;
        }
      }

      if (deleteCounter > 0) {
        const metaRef = doc(db, 'system', 'totals');
        await setDoc(metaRef, { count: increment(-deleteCounter) }, { merge: true });
      }

      await setDoc(doc(db, 'migration_logs', log.id), { rolled_back: true }, { merge: true });

      toast.success(`Rollback Complete: ${deleteCounter} imported members removed.`);
      fetchMigrationLogs();
      onRefresh();
    } catch (err: any) {
      console.error("Rollback execution error:", err);
      toast.error("Rollback failed: " + err.message);
    } finally {
      toast.dismiss('rollback-load');
    }
  };

  const exportMigrationSummaryToExcel = () => {
    const wsData = [
      ["HCRS SOCIETY OLD MEMBER IMPORT REPORT"],
      ["Date", importStats.timestamp.toLocaleString()],
      ["Source File Name", fileName],
      ["Total Rows Uploaded", importStats.totalUploaded],
      ["Existing Members in DB", importStats.existingMembers],
      ["Imported as OLD_MEMBER", importStats.imported],
      ["Skipped Duplicates", importStats.skipped],
      ["Manual Review Flagged", importStats.manualReview],
      ["Time Taken (Seconds)", importStats.timeTakenSeconds],
      [],
      ["LINE", "MEMBER NAME", "MOBILE", "DISTRICT", "CONSTITUENCY", "MEMBERSHIP ID", "CATEGORY"]
    ];

    validatedRecords.forEach((r, idx) => {
      wsData.push([
        idx + 1,
        r.name,
        r.mobile,
        r.district,
        r.assemblyConstituency,
        r.membershipId || 'AUTOGEN',
        'OLD_MEMBER'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import Summary");
    XLSX.writeFile(wb, `HCRS_Old_Member_Import_${Date.now()}.xlsx`);
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
    setManualReviewRecords([]);
    setInvalidRecords([]);
    setMismatchedRecords([]);
    setImportLog([]);
    setAvailableSpreadsheets([]);
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Sub tabs: Importer Panel vs Migration logs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setPanelTab('import')}
          className={`pb-3.5 px-6 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            panelTab === 'import' 
              ? 'border-brand-blue text-brand-blue font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Import Bulk Data (Old Members)
        </button>
        <button
          onClick={() => setPanelTab('history')}
          className={`pb-3.5 px-6 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            panelTab === 'history' 
              ? 'border-brand-blue text-brand-blue font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Import History & Logs
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
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-tight">Bulk Import Old Members</h2>
                <p className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">പഴയ അംഗങ്ങളുടെ ബൾക്ക് ഇമ്പോർട്ട് സിസ്റ്റം (OLD_MEMBER)</p>
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
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 1: Upload Old Members File</h3>
                <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
                  Excel (.xlsx, .xls), CSV, JSON അല്ലെങ്കിൽ ZIP ഫയൽ അപ്‌ലോഡ് ചെയ്യുക. ഇമ്പോർട്ട് ചെയ്യുന്ന എല്ലാ മെമ്പർമാരും ഓട്ടോമാറ്റിക് ആയി <strong>OLD_MEMBER</strong> ആയി മാത്രമേ രജിസ്റ്റർ ചെയ്യപ്പെടുകയുള്ളൂ.
                </p>
              </div>

              {availableSpreadsheets.length > 0 && (
                <div className="p-5 border border-amber-200 bg-amber-50/20 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600" />
                    Multiple dataset files detected inside the ZIP:
                  </p>
                  <div className="divide-y divide-amber-100 bg-white border border-amber-100 rounded-xl overflow-hidden shadow-xs">
                    {availableSpreadsheets.map((item, id) => (
                      <div key={id} className="flex justify-between items-center p-3.5 hover:bg-slate-50">
                        <span className="text-xs font-mono font-bold text-slate-700">{item.filename}</span>
                        <Button 
                          onClick={() => selectZipSpreadsheet(item)}
                          size="sm"
                          className="bg-brand-blue text-white font-bold uppercase tracking-wider text-[10px] cursor-pointer"
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
                  className="border-2 border-dashed border-slate-200 hover:border-brand-blue/35 bg-slate-50/50 hover:bg-brand-blue/5 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200"
                >
                  <div className="h-14 w-14 rounded-2xl bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center text-brand-blue">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Upload XLSX, CSV, JSON, PDF, or ZIP</p>
                    <p className="text-[10px] text-slate-400 font-medium">Supports Excel, CSV, JSON, searchable PDF tables & photo archives</p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx,.xls,.csv,.json,.zip,.pdf" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  {fileName && (
                    <div className="mt-2 bg-brand-blue text-white rounded-xl py-2 px-4 flex items-center gap-2 shadow-sm animate-in zoom-in-95">
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-mono font-extrabold max-w-[200px] truncate">{fileName}</span>
                      <button onClick={(e) => { e.stopPropagation(); setFileName(''); }} className="text-white bg-black/20 hover:bg-black/30 rounded-full h-4 w-4 flex items-center justify-center font-bold text-[8px] ml-1 cursor-pointer">✕</button>
                    </div>
                  )}
                  {zipPhotos.size > 0 && (
                    <p className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-150">✓ Extracted {zipPhotos.size} member photos from ZIP</p>
                  )}
                </div>

                {/* Direct paste fallback text matrix */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block leading-none">Or Paste CSV / JSON values directly</label>
                  <textarea 
                    className="flex-1 w-full min-h-[150px] bg-slate-50/50 border border-slate-200 rounded-2xl p-3 text-xs font-medium font-mono focus:border-brand-blue/30 focus:outline-none focus:ring-4 focus:ring-brand-blue/5"
                    placeholder={`Full Name,Mobile Number,District,Constituency,Old ID\nKUNHAMMED JAMSHEER K,9947573657,MLP,Wandoor,HCRS-KL-MLP-WDR-0034\nSADANANDAN,9497697956,KNR,Kannur,HCRS-KL-KNR-KNR-0451`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <Button 
                    onClick={handleProcessPastedText}
                    className="bg-brand-blue text-white h-11 w-full rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" /> Parse Text Data
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-6 border border-slate-200 bg-white rounded-3xl space-y-6 text-left animate-in slide-in-from-right duration-350">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 2: Map File Columns</h3>
                <p className="text-xs text-slate-500 mt-1">
                  നിങ്ങൾ അപ്‌ലോഡ് ചെയ്ത ഫയലിലെ കോളങ്ങൾ മെമ്പർ ഫീൽഡുകളിലേക്ക് മാപ്പ് ചെയ്യുക.
                </p>
              </div>

              {/* Dynamic Mapping Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                {Object.keys(mappings).map((key) => {
                  const schemaLabel: Record<string, string> = {
                    name: 'Full Name (പേര്)*',
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
                          className="bg-white border border-slate-250 w-full h-11 px-3.5 pr-9 rounded-xl text-xs font-semibold focus:border-brand-blue/30 focus:outline-none appearance-none cursor-pointer"
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

              {/* Matrix Preview */}
              <div className="space-y-3">
                <h4 className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block leading-none">File Data Preview (First 5 Rows)</h4>
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

              <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={handleReset} className="h-11 px-5 rounded-xl text-slate-500 font-bold uppercase tracking-wider text-xs cursor-pointer">Reset File</Button>
                <div className="flex flex-wrap gap-2.5">
                  <Button 
                    variant="outline"
                    onClick={() => runQualityValidateAndFilter(true)}
                    className="border-brand-blue text-brand-blue hover:bg-brand-blue/5 h-11 px-5 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-4 h-4" /> Analyze Only (No Import)
                  </Button>
                  <Button 
                    onClick={() => runQualityValidateAndFilter(false)}
                    className="bg-brand-blue text-white hover:bg-brand-blue/95 h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    Analyze & Compare Database <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-6 border border-slate-200 bg-white rounded-3xl space-y-6 text-left animate-in slide-in-from-right duration-350">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Step 3: Pre-Import Verification & Database Comparison</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  അപ്‌ലോഡ് ചെയ്ത ഫയലിലെ ഡാറ്റ സിസ്റ്റത്തിലെ നിലവിലെ Firestore ഡാറ്റാബേസുമായി ഒത്തുനോക്കി ഡ്യൂപ്ലിക്കേറ്റുകളും മാന്യുവൽ റിവ്യൂ ചെയ്യേണ്ടവയും തരംതിരിച്ചിരിക്കുന്നു.
                </p>
              </div>

              {isAnalyzeOnlyMode && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-900">
                  <div className="flex items-center gap-2.5">
                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase">ANALYZE ONLY MODE ACTIVE</p>
                      <p className="text-[11px] font-medium text-amber-800">
                        Detailed database comparison completed. No records have been written or modified in Firestore.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setIsAnalyzeOnlyMode(false)}
                    className="bg-green-600 text-white font-bold text-[10px] uppercase tracking-wider h-8 px-3.5 rounded-lg shrink-0 cursor-pointer"
                  >
                    Switch to Import Mode
                  </Button>
                </div>
              )}

              {/* REQUIRED STATS CARDS BEFORE IMPORT (6 METRICS) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 text-center">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-blue-600 block leading-none">Current DB Total</span>
                  <span className="text-xl font-black text-blue-700 leading-tight block mt-1.5">{members.length}</span>
                  <span className="text-[8px] font-bold text-blue-500 block mt-1 uppercase">നിലവിലെ ഡാറ്റാബേസ്</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-500 block leading-none">Uploaded Records</span>
                  <span className="text-xl font-black text-slate-800 leading-tight block mt-1.5">{rawRows.length}</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-1 uppercase">ആകെ അപ്‌ലോഡ് ചെയ്തവ</span>
                </div>

                <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 text-center">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-rose-600 block leading-none">Duplicate Records</span>
                  <span className="text-xl font-black text-rose-600 leading-tight block mt-1.5">{duplicateRecords.length}</span>
                  <span className="text-[8px] font-bold text-rose-400 block mt-1 uppercase">തനിപ്പകർപ്പുകൾ (Skipped)</span>
                </div>

                <div className="bg-green-50/60 p-3.5 rounded-2xl border border-green-200 text-center">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-green-700 block leading-none">Ready to Import</span>
                  <span className="text-xl font-black text-green-600 leading-tight block mt-1.5">{validatedRecords.length}</span>
                  <span className="text-[8px] font-bold text-green-500 block mt-1 uppercase">ഇമ്പോർട്ട് ചെയ്യുന്നത്</span>
                </div>

                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 text-center">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-700 block leading-none">Manual Review</span>
                  <span className="text-xl font-black text-amber-600 leading-tight block mt-1.5">{manualReviewRecords.length}</span>
                  <span className="text-[8px] font-bold text-amber-500 block mt-1 uppercase">മാനുവൽ റിവ്യൂ വേണം</span>
                </div>

                <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200 text-center">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-purple-700 block leading-none">Est. Total After</span>
                  <span className="text-xl font-black text-purple-700 leading-tight block mt-1.5">{members.length + validatedRecords.length}</span>
                  <span className="text-[8px] font-bold text-purple-500 block mt-1 uppercase">ഇമ്പോർട്ടിന് ശേഷം</span>
                </div>
              </div>

              {/* Navigation Tabs for detailed breakdown tables */}
              <div className="flex border-b border-slate-200 text-xs">
                <button
                  onClick={() => setActiveAnalysisTab('to_import')}
                  className={`pb-2.5 px-4 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeAnalysisTab === 'to_import' 
                      ? 'border-green-600 text-green-700 font-black' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-green-600" />
                  Old Members to Import ({validatedRecords.length})
                </button>
                <button
                  onClick={() => setActiveAnalysisTab('duplicates')}
                  className={`pb-2.5 px-4 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeAnalysisTab === 'duplicates' 
                      ? 'border-rose-600 text-rose-700 font-black' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Duplicates to Skip ({duplicateRecords.length})
                </button>
                <button
                  onClick={() => setActiveAnalysisTab('manual_review')}
                  className={`pb-2.5 px-4 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeAnalysisTab === 'manual_review' 
                      ? 'border-amber-600 text-amber-700 font-black' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  Manual Review ({manualReviewRecords.length})
                </button>
                {invalidRecords.length > 0 && (
                  <button
                    onClick={() => setActiveAnalysisTab('invalid')}
                    className={`pb-2.5 px-4 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                      activeAnalysisTab === 'invalid' 
                        ? 'border-slate-600 text-slate-800 font-black' 
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    Invalid Rows ({invalidRecords.length})
                  </button>
                )}
              </div>

              {/* TAB 1: Old Members to Import */}
              {activeAnalysisTab === 'to_import' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-600 font-medium">
                    താഴെ കാണിക്കുന്ന {validatedRecords.length} മെമ്പർമാർ മുൻപ് സിസ്റ്റത്തിൽ ഇല്ലാത്തവരായതിനാലും ലൊക്കേഷൻ മാസ്റ്റർ ഡാറ്റ കൃത്യമായി മാച്ച് ആയതിനാലും ഇവരെ <strong>OLD_MEMBER</strong> ആയി ഡാറ്റാബേസിലേക്ക് ചേർക്കും:
                  </p>
                  <div className="max-h-[280px] overflow-x-auto overflow-y-auto border border-green-200 rounded-2xl bg-white text-xs">
                    <table className="w-full text-left min-w-[700px]">
                      <thead className="bg-green-50/60 text-green-900 border-b border-green-200 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 w-10">#</th>
                          <th className="p-2.5">Member Name</th>
                          <th className="p-2.5">Mobile</th>
                          <th className="p-2.5">Uploaded District</th>
                          <th className="p-2.5">Uploaded Constituency</th>
                          <th className="p-2.5">Mapped District</th>
                          <th className="p-2.5">Mapped Constituency</th>
                          <th className="p-2.5">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {validatedRecords.slice(0, 100).map((r, id) => (
                          <tr key={id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-slate-400">{r.rowNum}</td>
                            <td className="p-2.5 font-bold text-slate-800">{r.name}</td>
                            <td className="p-2.5 font-mono">{r.mobile}</td>
                            <td className="p-2.5">{r.uploadedDistrict || <span className="text-slate-400 italic">None</span>}</td>
                            <td className="p-2.5">{r.uploadedConstituency || <span className="text-slate-400 italic">None</span>}</td>
                            <td className="p-2.5 text-green-700 font-bold">{r.mappedDistrict}</td>
                            <td className="p-2.5 text-green-700 font-bold">{r.mappedConstituency}</td>
                            <td className="p-2.5">
                              <span className="bg-green-100 text-green-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                OLD_MEMBER
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validatedRecords.length > 100 && (
                      <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-500 font-bold">
                        + {validatedRecords.length - 100} more records ready to import
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Duplicates to Skip */}
              {activeAnalysisTab === 'duplicates' && (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                    <strong>Duplicate Rule (Mobile Number + Name already exist):</strong> The following {duplicateRecords.length} records match an existing member in Firestore and will be automatically <strong>SKIPPED</strong> to protect database integrity.
                  </div>
                  <div className="max-h-[280px] overflow-x-auto overflow-y-auto border border-rose-200 rounded-2xl bg-white text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-rose-50/60 text-rose-900 border-b border-rose-200 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 w-10">#</th>
                          <th className="p-2.5">Name in Upload</th>
                          <th className="p-2.5">Mobile Number</th>
                          <th className="p-2.5">Action Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50 font-medium">
                        {duplicateRecords.map((r, id) => (
                          <tr key={id} className="hover:bg-rose-50/20">
                            <td className="p-2.5 font-mono text-slate-400">{r.rowNum}</td>
                            <td className="p-2.5 font-bold text-slate-800">{r.name}</td>
                            <td className="p-2.5 font-mono">{r.mobile}</td>
                            <td className="p-2.5">
                              <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                SKIPPED (DUPLICATE)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {duplicateRecords.length === 0 && (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">No duplicate records found</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Manual Review */}
              {activeAnalysisTab === 'manual_review' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold space-y-1">
                    <p className="font-extrabold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Manual Review Requirements:
                    </p>
                    <p>• Phone matches existing member but Name differs OR Name matches but Phone differs.</p>
                    <p>• Location (District / Constituency) missing, invalid, or does not match HCRS Master List (highlighted in <span className="text-rose-600 font-bold">RED</span> below).</p>
                    <p>• These {manualReviewRecords.length} records will NOT be imported automatically until Main Admin resolves them.</p>
                  </div>
                  <div className="max-h-[280px] overflow-x-auto overflow-y-auto border border-amber-200 rounded-2xl bg-white text-xs">
                    <table className="w-full text-left min-w-[850px]">
                      <thead className="bg-amber-50/60 text-amber-900 border-b border-amber-200 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 w-10">#</th>
                          <th className="p-2.5">Uploaded Name</th>
                          <th className="p-2.5">Uploaded Phone</th>
                          <th className="p-2.5">Uploaded District</th>
                          <th className="p-2.5">Uploaded Constituency</th>
                          <th className="p-2.5">Mapped District</th>
                          <th className="p-2.5">Mapped Constituency</th>
                          <th className="p-2.5">Conflict Type</th>
                          <th className="p-2.5">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50 font-medium">
                        {manualReviewRecords.map((r, id) => {
                          const distMismatch = !r.uploadedDistrict || r.mappedDistrict === 'UNMATCHED';
                          const consMismatch = !r.uploadedConstituency || r.mappedConstituency === 'UNMATCHED';
                          return (
                            <tr key={id} className="hover:bg-amber-50/20">
                              <td className="p-2.5 font-mono text-slate-400">{r.rowNum}</td>
                              <td className="p-2.5 font-bold text-slate-800">{r.name}</td>
                              <td className="p-2.5 font-mono">{r.mobile}</td>
                              <td className="p-2.5">
                                {distMismatch ? (
                                  <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-300">
                                    {r.uploadedDistrict || 'Missing'}
                                  </span>
                                ) : (
                                  <span className="text-slate-700">{r.uploadedDistrict}</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {consMismatch ? (
                                  <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-300">
                                    {r.uploadedConstituency || 'Missing'}
                                  </span>
                                ) : (
                                  <span className="text-slate-700">{r.uploadedConstituency}</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {r.mappedDistrict === 'UNMATCHED' ? (
                                  <span className="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase">
                                    UNMATCHED
                                  </span>
                                ) : (
                                  <span className="text-slate-800 font-bold">{r.mappedDistrict}</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {r.mappedConstituency === 'UNMATCHED' ? (
                                  <span className="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase">
                                    UNMATCHED
                                  </span>
                                ) : (
                                  <span className="text-slate-800 font-bold">{r.mappedConstituency}</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                  r.conflictType?.includes('Location') 
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {r.conflictType}
                                </span>
                              </td>
                              <td className="p-2.5 text-amber-800 font-semibold text-[11px]">{r.reviewReason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {manualReviewRecords.length === 0 && (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">No records requiring manual review</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Invalid Rows */}
              {activeAnalysisTab === 'invalid' && (
                <div className="space-y-3">
                  <div className="max-h-[260px] overflow-y-auto border border-slate-200 rounded-2xl bg-white text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5 w-12">#</th>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {invalidRecords.map((r, id) => (
                          <tr key={id}>
                            <td className="p-2.5 font-mono text-slate-400">{r.row}</td>
                            <td className="p-2.5 font-bold text-slate-800">{r.name}</td>
                            <td className="p-2.5 font-mono">{r.mobile}</td>
                            <td className="p-2.5 text-red-600">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rules Notice */}
              <div className="bg-brand-blue/5 border border-brand-blue/15 p-4 rounded-xl flex gap-3 text-slate-700">
                <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-extrabold text-slate-800">HCRS Security & Import Rules Active:</p>
                  <p className="font-medium text-slate-600 mt-0.5">
                    1. Never replace database. 2. Never delete existing members. 3. Never create NEW_MEMBER from import. 4. Import only as <strong>OLD_MEMBER</strong>.
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 uppercase">
                    {isAnalyzeOnlyMode ? 'Analysis Complete (No DB Changes)' : `Ready to Import ${validatedRecords.length} Old Members`}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    {duplicateRecords.length} duplicates skipped | {manualReviewRecords.length} manual review flagged | Est. Database Total: {members.length + validatedRecords.length}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="outline" onClick={() => setStep(2)} className="h-10 text-xs font-bold uppercase tracking-wider cursor-pointer">Back</Button>
                  {isAnalyzeOnlyMode ? (
                    <Button 
                      onClick={() => setIsAnalyzeOnlyMode(false)}
                      className="bg-brand-blue text-white hover:bg-brand-blue/95 h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      Switch to Import Mode <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setShowConfirmModal(true)}
                      disabled={validatedRecords.length === 0}
                      className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md cursor-pointer disabled:opacity-50"
                    >
                      Confirm & Start Import <UserCheck className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* REQUIRED CONFIRMATION MODAL BEFORE IMPORT */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="bg-green-100 p-2.5 rounded-2xl text-green-700 shrink-0">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">Confirm Bulk Import</h3>
                    <p className="text-xs text-slate-500 font-semibold">Verify the import configuration before proceeding</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="font-bold text-slate-600">Total Uploaded Records:</span>
                    <span className="font-mono font-black text-slate-900">{rawRows.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="font-bold text-slate-600">Existing Members in Database:</span>
                    <span className="font-mono font-black text-slate-900">{members.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="font-bold text-green-700">Records to Import as OLD_MEMBER:</span>
                    <span className="font-mono font-black text-green-700 text-sm">+{validatedRecords.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="font-bold text-rose-600">Duplicate Records to Skip:</span>
                    <span className="font-mono font-black text-rose-600">{duplicateRecords.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-amber-600">Manual Review Flagged Records:</span>
                    <span className="font-mono font-black text-amber-600">{manualReviewRecords.length}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium leading-relaxed">
                  <strong>Important Notice:</strong> Imported members will be saved strictly as <strong>OLD_MEMBER</strong>. No existing database profiles will be replaced or deleted.
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowConfirmModal(false)}
                    className="h-11 px-5 rounded-xl font-bold uppercase text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      setStep(4);
                      beginBulkDataMigration();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white h-11 px-6 rounded-xl font-black uppercase text-xs shadow-md cursor-pointer"
                  >
                    Proceed with Import
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <Card className="p-8 border border-slate-200 bg-white rounded-3xl text-center max-w-xl mx-auto space-y-6">
              <RefreshCw className="w-10 h-10 text-brand-blue mx-auto animate-spin" />
              <div className="space-y-1.5">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Importing Old Members to Database...</h4>
                <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                  OLD_MEMBER വിവരങ്ങൾ ഫയർസ്റ്റോർ ഡാറ്റാബേസിലേക്ക് റൈറ്റ് ചെയ്യുന്നു. പ്രോസസിംഗ് കഴിയുന്നത് വരെ വിൻഡോ അടക്കരുത്.
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                  <span>Processed {currentProgressIndex + 1} / {validatedRecords.length}</span>
                  <span>{validatedRecords.length > 0 ? Math.round(((currentProgressIndex + 1) / validatedRecords.length) * 100) : 0}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-150">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-blue to-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${validatedRecords.length > 0 ? ((currentProgressIndex + 1) / validatedRecords.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button 
                  onClick={() => setIsPaused(!isPaused)} 
                  variant="outline"
                  className="h-9 px-4 text-[10px] font-bold uppercase tracking-wide rounded-lg cursor-pointer"
                >
                  {isPaused ? 'Resume Import Queue' : 'Pause Seeder Queue'}
                </Button>
              </div>

              {/* Real time logging stdout */}
              <div className="bg-slate-900 border border-slate-800 text-[10px] text-green-400 font-mono p-4 rounded-xl max-h-[180px] overflow-y-auto space-y-1 text-left shadow-lg select-all">
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

          {/* REQUIRED POST-IMPORT REPORT PAGE */}
          {step === 5 && (
            <Card className="p-8 border border-slate-200 bg-white rounded-3xl space-y-8 animate-in zoom-in-95 duration-200 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Bulk Import Completion Summary</h3>
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

              {/* REQUIRED POST-IMPORT STATS BOXES */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50/60 p-5 rounded-2xl border border-green-200 text-center">
                  <span className="text-[10px] font-black uppercase text-green-700 block tracking-wider">Imported</span>
                  <span className="text-3xl font-black text-green-600 mt-1 block">{importStats.imported}</span>
                  <span className="text-[9px] font-bold text-green-600 block mt-1 uppercase">OLD_MEMBER Created</span>
                </div>

                <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200 text-center">
                  <span className="text-[10px] font-black uppercase text-rose-600 block tracking-wider">Skipped</span>
                  <span className="text-3xl font-black text-rose-600 mt-1 block">{importStats.skipped}</span>
                  <span className="text-[9px] font-bold text-rose-500 block mt-1 uppercase">Duplicates Skipped</span>
                </div>

                <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 text-center">
                  <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider">Manual Review</span>
                  <span className="text-3xl font-black text-amber-600 mt-1 block">{importStats.manualReview}</span>
                  <span className="text-[9px] font-bold text-amber-500 block mt-1 uppercase">Flagged Records</span>
                </div>

                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 text-center">
                  <span className="text-[10px] font-black uppercase text-blue-700 block tracking-wider">Time Taken</span>
                  <span className="text-3xl font-black text-blue-600 mt-1 block font-mono">{importStats.timeTakenSeconds}s</span>
                  <span className="text-[9px] font-bold text-blue-500 block mt-1 uppercase">Seconds Elapsed</span>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/15 p-5 rounded-2xl flex gap-3 text-slate-800">
                <div className="h-6 w-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-green-900 leading-none">Import Log Saved Successfully!</p>
                  <p className="font-semibold text-slate-600 mt-1">
                    ഇമ്പോർട്ട് ലോഗ് <strong>migration_logs</strong> ഫയർസ്റ്റോർ കളക്ഷനിൽ സേവ് ചെയ്തിട്ടുണ്ട്. ഈ ഹിസ്റ്ററി പേജിൽ നിന്നും വിവരങ്ങൾ പരിശോധിക്കാവുന്നതാണ്.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button onClick={handleReset} className="bg-slate-800 hover:bg-slate-900 text-white h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer">Import Another File</Button>
              </div>
            </Card>
          )}

        </div>
      ) : (
        /* History logs and transactional recovery dashboard rollbacks */
        <Card className="p-6 border border-slate-205 bg-white rounded-3xl text-left space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Bulk Import Logs & Rollback Control</h3>
            <p className="text-xs text-slate-500 mt-1">
              ഓരോ ഇമ്പോർട്ടിന്റെയും സ്വയം സൃഷ്‌ടിച്ച ലോഗുകൾ ഇവിടെ സൂക്ഷിച്ചിരിക്കുന്നു. ആവശ്യമെങ്കിൽ അനായാസം അൺഡൂ ചെയ്യാവുന്നതാണ്.
            </p>
          </div>

          {isLoadingLogs ? (
            <div className="py-12 text-center text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
              Loading migration logs...
            </div>
          ) : migrationLogs.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl text-center text-xs font-bold text-slate-400">
              No previous import logs found in database.
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
                        <span className="text-[8px] bg-green-100 text-green-600 font-extrabold uppercase px-1.5 py-0.5 rounded-md">OLD_MEMBER Import</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none">
                      Imported at <span className="font-mono">{new Date(log.timestamp).toLocaleString()}</span> by <span className="font-bold text-slate-600">{log.adminEmail}</span>
                    </p>
                    <div className="flex gap-4 text-[10.5px] font-bold text-slate-500">
                      <span>Uploaded: <strong className="text-slate-700">{log.totalUploaded || log.totalRecords}</strong></span>
                      <span>Imported: <strong className="text-green-600">+{log.importedCount}</strong></span>
                      <span>Skipped: <strong className="text-rose-600">{log.skippedCount || 0}</strong></span>
                      <span>Manual Review: <strong className="text-amber-600">{log.manualReviewCount || 0}</strong></span>
                      <span>Time: <strong className="text-blue-600">{log.timeTakenSeconds ? `${log.timeTakenSeconds}s` : 'N/A'}</strong></span>
                    </div>
                  </div>

                  <div>
                    {!log.rolled_back ? (
                      <Button
                        onClick={() => handleRollbackAction(log)}
                        className="bg-red-55/10 border border-red-200 text-red-600 hover:bg-red-500 hover:text-white h-10 px-4 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all select-none cursor-pointer"
                      >
                        <Undo2 className="w-4 h-4" /> Undo Import (Rollback)
                      </Button>
                    ) : (
                      <span className="text-[10px] text-red-400 font-black uppercase tracking-wider flex items-center gap-1 bg-red-50/50 px-3.5 py-2.5 rounded-xl border border-red-100">
                        ✓ Rollback completed
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
