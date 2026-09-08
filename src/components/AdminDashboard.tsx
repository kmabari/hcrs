import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { getWAMessage, sendWAMessage, getWARenewalMessage, sendWARenewalMessage } from '@/src/lib/whatsapp';
import { subscribeToOrgSettings, saveOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';
import BrandingManager from './BrandingManager';
import LanguageManager from './LanguageManager';
import AdminReceiptsModal from './AdminReceiptsModal';
import GalleryManagement from './GalleryManagement';
import DistrictQuotaManager from './DistrictQuotaManager';
import BulkImportManager from './BulkImportManager';
import CommitteeManagement from './CommitteeManagement';
import BackupRestoreManager from './BackupRestoreManager';
import CampaignTemplateManager from './CampaignTemplateManager';
import AdminReportsTab from './AdminReportsTab';
import PaymentOperationsManager from './PaymentOperationsManager';
import { 
  printCourtClaimReport, 
  printCourtComboReport, 
  printFullAdminClaimReport, 
  printFullAdminComboReport,
  printMemberComboReport,
  downloadCourtClaimPdf,
  downloadCourtComboPdf,
  downloadFullAdminClaimPdf,
  downloadFullAdminComboPdf,
  getHardshipList,
  getHardshipDetail,
  getFuturePreferenceDetail
} from '../lib/claimPrint';
import { 
  Crown,
  Users, 
  Search, 
  Filter, 
  Download, 
  Upload,
  UserPlus, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin,
  Mail,
  Smartphone,
  Eye,
  Camera,
  Database,
  FileSpreadsheet,
  Receipt,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Lock,
  KeyRound,
  MessageCircle,
  LogOut,
  RefreshCw,
  Settings,
  IndianRupee,
  ShieldAlert,
  LayoutDashboard,
  Globe,
  ImageIcon,
  X,
  Bell,
  ChevronRight,
  Headphones,
  Loader2,
  Copy,
  AlertTriangle,
  Layers,
  Printer,
  FileText,
  Wallet,
  Sliders
} from 'lucide-react';
import { DISTRICTS, BLOOD_GROUPS, CONSTITUENCIES, FALLBACK_LOGO_URL, SHARED_URL, getAssemblyCode } from '@/src/constants';
import { UserProfile } from '@/src/types';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import MembershipCard from './MembershipCard';
import FastMemberEntry from './FastMemberEntry';
import LifeMembersPanel from './LifeMembersPanel';
import DistrictWhatsAppManager from './DistrictWhatsAppManager';
import Logo from '../Logo';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { onSnapshot, collection, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '@/src/lib/imageUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { normalizeDistrictCode, isDistrictMatch } from '../lib/districtUtils';

interface AdminDashboardProps {
  user?: UserProfile | null;
  members: UserProfile[];
  onApprove: (id: string) => void;
  onAddOffline: (data: any) => void;
  onUpdate: (id: string, data: Partial<UserProfile>) => void;
  onDelete: (id: string) => void;
  onResetPin?: (id: string) => void;
  onBulkResetAllPins?: () => void;
  onUpdatePhoto?: (file: File, uid: string) => void;
  onUpdateDistrictQuota?: (districtCode: string, total: number) => void;
  onSyncQuotas?: () => void;
  districtQuotas?: Record<string, number>;
  districtQuotasUsed?: Record<string, number>;
  handleLogout: () => void;
  onViewCard?: () => void;
  onRefreshMembers?: () => void;
  isSyncingMembers?: boolean;
}

const MAIN_ADMINS = [
  'kmabarikiyafoods@gmail.com',
  'hcrsindia@gmail.com',
  'admin@hcrs.society',
  '9645934571@hcrs.society',
  'mabarikiyafoods@gmail.com',
  'hcrskerala@gmail.com'
];

const SECOND_ADMINS = [
  'hcrskasaragod@hcrs.society',
  'hcrsksd@hcrs.society',
  'hcrskannur@hcrs.society',
  'hcrsknr@hcrs.society',
  'hcrswayanad@hcrs.society',
  'hcrswyd@hcrs.society',
  'hcrskozhikode@hcrs.society',
  'hcrskoz@hcrs.society',
  'hcrsmalappuram@hcrs.society',
  'hcrsmlp@hcrs.society',
  'hcrsmpm@hcrs.society',
  'hcrspalakkad@hcrs.society',
  'hcrspkd@hcrs.society',
  'hcrsthrissur@hcrs.society',
  'hcrstcr@hcrs.society',
  'hcrsernakulam@hcrs.society',
  'hcrsekm@hcrs.society',
  'hcrsidukki@hcrs.society',
  'hcrsidk@hcrs.society',
  'hcrskottayam@hcrs.society',
  'hcrsktm@hcrs.society',
  'hcrsalappuzha@hcrs.society',
  'hcrsalp@hcrs.society',
  'hcrspathanamthitta@hcrs.society',
  'hcrspta@hcrs.society',
  'hcrskollam@hcrs.society',
  'hcrsklm@hcrs.society',
  'hcrsthiruvananthapuram@hcrs.society',
  'hcrstvm@hcrs.society'
];

const hasValidity = (u: any) => {
  if (u.status === 'deleted') return false;
  
  const isLife = String(u.membership_type || u.membershipType || '').toUpperCase().includes('LIFE');
  if (isLife) return true;

  if (u.status !== 'active') return false;
  
  if (!u.expiryDate) return false;
  
  let expDate: Date;
  if (u.expiryDate.seconds !== undefined) {
    expDate = new Date(u.expiryDate.seconds * 1000);
  } else if (u.expiryDate.toDate && typeof u.expiryDate.toDate === 'function') {
    expDate = u.expiryDate.toDate();
  } else {
    expDate = new Date(u.expiryDate);
  }
  
  return expDate.getTime() > Date.now();
};

const getCategoryLabel = (catId: string) => {
  const mapping: Record<string, string> = {
    'digital': 'Digital Redeem Coupon (ഡിജിറ്റൽ റെഡീം കൂപ്പൺ)',
    'consignment': 'Consignment Advance (കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    'ott': 'OTT Consignment Advance (OTT കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    'grocery': 'Grocery Consignment Advance (ഗ്രോസറി കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    'goodwill': 'Goodwill Consignment Advance (ഗുഡ്‌വിൽ കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    'other': 'Other Consignment Advance (മറ്റു കോൺസൈമെന്റ് അഡ്വാൻസ്)'
  };
  return mapping[catId] || catId;
};


export default function AdminDashboard({ 
  user,
  members, 
  onApprove, 
  onAddOffline, 
  onUpdate, 
  onDelete, 
  onResetPin, 
  onBulkResetAllPins,
  onUpdatePhoto,
  onUpdateDistrictQuota,
  onSyncQuotas,
  districtQuotas = {},
  districtQuotasUsed = {},
  handleLogout,
  onViewCard,
  onRefreshMembers,
  isSyncingMembers = false
}: AdminDashboardProps) {
  const getDistrictCode = (nameOrCode: string) => {
    if (!nameOrCode) return '';
    const normalized = nameOrCode.trim().toUpperCase();
    
    // 1. Exact code match
    const byCode = DISTRICTS.find(d => d.code === normalized);
    if (byCode) return byCode.code;
    
    // 2. Name match (partial or malayalam name)
    const byName = DISTRICTS.find(dist => {
      const nameUpper = dist.name.toUpperCase();
      const plainLocalName = dist.name.split(' ')[0].toUpperCase();
      return nameUpper.includes(normalized) || normalized.includes(plainLocalName);
    });
    
    return byName ? byName.code : normalized;
  };

  const compareMobiles = (m1: any, m2: any): boolean => {
    if (!m1 || !m2) return false;
    const clean1 = String(m1).replace(/\D/g, '');
    const clean2 = String(m2).replace(/\D/g, '');
    if (clean1 === clean2) return true;
    
    // Fallback to last 10 digits
    const last10_1 = clean1.slice(-10);
    const last10_2 = clean2.slice(-10);
    return last10_1.length === 10 && last10_2.length === 10 && last10_1 === last10_2;
  };

  const getComboClaimsForClaim = (claim: any, allClaims: any[]): any[] => {
    if (!claim) return [];
    return allClaims.filter(c => {
      if (c.id && claim.id && c.id === claim.id) return true;
      const sameMob = compareMobiles(c.userMobile, claim.userMobile);
      const sameMem = c.membershipId && claim.membershipId && c.membershipId !== 'N/A' && c.membershipId !== 'PENDING' && c.membershipId.toLowerCase() === claim.membershipId.toLowerCase();
      const sameUid = c.uid && claim.uid && c.uid === claim.uid && !c.uid.startsWith('offline_claim_') && c.uid !== 'offline_admin';
      return sameMob || sameMem || sameUid;
    });
  };

  const isComboClaim = (claim: any, allClaims: any[]): boolean => {
    if (!claim) return false;
    if (claim.isCombo === true) return true;
    if (claim.relation && !['Self', 'self', 'സ്വന്തം', 'സ്വന്തം (Self)'].includes(claim.relation.trim())) return true;
    const matching = getComboClaimsForClaim(claim, allClaims);
    return matching.length > 1;
  };

  const formatClaimDate = (createdAt: any): string => {
    if (!createdAt) return 'N/A';
    
    if (typeof createdAt.toDate === 'function') {
      try {
        return createdAt.toDate().toLocaleDateString('en-IN');
      } catch (e) {
        console.warn("toDate failed:", e);
      }
    }
    
    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN');
      }
    }
    
    const secs = createdAt.seconds ?? createdAt._seconds;
    if (typeof secs === 'number') {
      const d = new Date(secs * 1000);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN');
      }
    }

    const fallbackDate = new Date(createdAt);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toLocaleDateString('en-IN');
    }

    return 'N/A';
  };

  const formatClaimDateTime = (createdAt: any): string => {
    if (!createdAt) return 'N/A';
    
    if (typeof createdAt.toDate === 'function') {
      try {
        return createdAt.toDate().toLocaleString('en-IN');
      } catch (e) {
        console.warn("toDate failed:", e);
      }
    }
    
    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-IN');
      }
    }
    
    const secs = createdAt.seconds ?? createdAt._seconds;
    if (typeof secs === 'number') {
      const d = new Date(secs * 1000);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-IN');
      }
    }

    const fallbackDate = new Date(createdAt);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toLocaleString('en-IN');
    }

    return 'N/A';
  };

  const formatClaimCategories = (categories: any): string => {
    if (!categories) return '';
    if (Array.isArray(categories)) {
      return categories.map(cat => getCategoryLabel(cat)).join(', ');
    }
    if (typeof categories === 'string') {
      try {
        if (categories.startsWith('[') && categories.endsWith(']')) {
          const parsed = JSON.parse(categories);
          if (Array.isArray(parsed)) {
            return parsed.map(cat => getCategoryLabel(cat)).join(', ');
          }
        }
      } catch (e) {}
      return categories.split(',').map(s => getCategoryLabel(s.trim())).join(', ');
    }
    return String(categories);
  };

  const getAssemblyCode = (name: string) => {
    if (!name) return 'OTH';
    const clean = name.trim().toUpperCase().replace(/\s/g, '');
    
    if (clean === 'NA' || clean === 'N/A') return 'NA';
    
    if (clean === 'THALASSERY') return 'TSY';
    if (clean === 'KANNUR') return 'KNR';
    if (clean === 'TALIPARAMBA') return 'TBA';
    if (clean === 'IRITTY') return 'IRY';
    if (clean === 'PAYYANUR') return 'PNR';
    
    if (clean === 'KOTTAKKAL') return 'KTK';
    if (clean === 'MALAPPURAM') return 'MPM';
    if (clean === 'PERINTHALMANNA') return 'PMN';
    if (clean === 'NILAMBUR') return 'NBR';
    
    if (clean === 'KOCHI') return 'KOC';
    if (clean === 'ALUVA') return 'ALV';
    if (clean === 'MUVATTUPUZHA') return 'MVP';
    if (clean === 'ANGAMALY') return 'AMY';
    
    return clean.substring(0, 3);
  };

  const isSuperAdmin = useMemo(() => {
    const email = (user?.email || '').toLowerCase().trim();
    return MAIN_ADMINS.some(e => e.toLowerCase() === email) || user?.role === 'admin' || user?.isAdmin === true;
  }, [user]);
  
  const countOf2026Members = useMemo(() => {
    return members.filter(m => {
      if (m.role === 'admin' || m.role === 'operator') return false;
      const regDate = m.registrationDate;
      if (!regDate) return true; // If missing, count it
      const d = regDate.toDate ? regDate.toDate() : (regDate.seconds ? new Date(regDate.seconds * 1000) : new Date(regDate));
      return d.getFullYear() >= 2026;
    }).length;
  }, [members]);
  
  const isSecondary = !isSuperAdmin && (user?.role === 'admin' || user?.role === 'operator');
  const autoApprovedRun = useRef(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoSearchTerm, setPromoSearchTerm] = useState('');

  useEffect(() => {
    const unsub = subscribeToOrgSettings((data) => {
      setOrgSettings(data);
    });
    return () => unsub();
  }, []);

  const promotionCandidates = useMemo(() => {
    if (!promoSearchTerm.trim()) return [];
    return members.filter(m => 
      ((m.name && m.name.toLowerCase().includes(promoSearchTerm.toLowerCase())) || 
      (m.mobile && String(m.mobile).includes(promoSearchTerm)) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(promoSearchTerm.toLowerCase()))) &&
      m.role !== 'admin' && !MAIN_ADMINS.includes(m.email)
    ).slice(0, 5);
  }, [members, promoSearchTerm]);
  
  // Custom submit for secondary admins to clarify expectations
  const handleSecondarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = (manualFormData.mobile || '').trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error('മൊബൈൽ നമ്പർ കൃത്യം 10 അക്കങ്ങൾ ആയിരിക്കണം. ദയവായി പരിശോധിക്കുക. (Mobile number must be exactly 10 digits. Please check.)');
      return;
    }
    
    // Final check for quota
    const used = districtQuotasUsed[manualFormData.district] || 0;
    const total = districtQuotas[manualFormData.district] || 0;
    if (total > 0 && used >= total) {
      toast.error("മുന്നറിയിപ്പ്: ഈ ജില്ലക്ക് അനുവദിച്ച എൻട്രികളുടെ എണ്ണം കഴിഞ്ഞിരിക്കുന്നു. (District quota exhausted)");
      return;
    }

    setIsSubmitting(true);
    try {
      const emailSuffix = Math.floor(1000 + Math.random() * 9000);
      const finalEmail = manualFormData.email || `${cleanMobile}@hcrs.society`;
      const finalData = { ...manualFormData, mobile: cleanMobile, email: finalEmail };

      const resultUid = await (onAddOffline(finalData) as unknown as Promise<string | null>);
      
      if (resultUid) {
        // Automatically trigger WhatsApp for secondary admin entries
        if (orgSettings?.registrationMode !== 'bulk') {
          sendWAMessage({
            name: manualFormData.name,
            mobile: cleanMobile,
            uid: resultUid,
            pin: manualFormData.pin
          });
        }

        setSuccessData({
          id: resultUid,
          email: finalEmail,
          pin: manualFormData.pin,
          mobile: cleanMobile
        });
        setShowSuccessModal(true);
        
        // CRITICAL: Reset EVERYTHING to fresh state. No more sticky fields (fixing Pisharady name issue)
        setManualFormData({
          name: '', 
          mobile: '', 
          email: '',
          address: '',
          postOffice: '',
          pincode: '',
          district: user?.district ? getDistrictCode(user.district) : manualFormData.district, 
          assemblyConstituency: user?.district ? (CONSTITUENCIES[getDistrictCode(user.district)]?.[0] || '') : manualFormData.assemblyConstituency, 
          bloodGroup: BLOOD_GROUPS[0], 
          pin: '123456',
          role: 'member',
          transactionId: 'MANUAL_OFFLINE',
          paymentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quota: 0,
          certAdminName: user?.name || '',
          certAdminEmail: user?.email || '',
          certAdminPassword: ''
        });
        localStorage.removeItem('hcrs_manual_entry_draft');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Auto-sync members from database if table is empty on mount
  useEffect(() => {
    if (members.length === 0 && onRefreshMembers && !isSyncingMembers) {
      onRefreshMembers();
    }
  }, [members.length, onRefreshMembers, isSyncingMembers]);

  const searchDigits = useMemo(() => {
    return searchTerm.replace(/\D/g, '');
  }, [searchTerm]);

  const otherDistrictMatch = useMemo(() => {
    if (!searchDigits || searchDigits.length < 3) return null;
    if (!isSecondary || !user?.district) return null;
    return members.find(m => 
      m.status !== 'deleted' && 
      (m.mobile || '').replace(/\D/g, '').includes(searchDigits) && 
      !isDistrictMatch(m.district, user.district)
    );
  }, [members, searchDigits, isSecondary, user?.district]);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  
  // Custom domain key variables
  const [isDomainKeyModalOpen, setIsDomainKeyModalOpen] = useState(false);
  const [newDomainKey, setNewDomainKey] = useState('');
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);

  const handleUpdateDomainKey = async () => {
    if (!newDomainKey || newDomainKey.trim().length < 4) {
      toast.error('PIN/Password must be at least 4 characters long.');
      return;
    }
    setIsUpdatingKey(true);
    const loadingToast = toast.loading('Setting secure domain PIN...');
    try {
      const { updatePassword: authUpdatePassword } = await import('firebase/auth');
      const { auth: firebaseAuth, db: firestoreDb } = await import('../lib/firebase');
      const { doc: fireDoc, updateDoc: fireUpdateDoc } = await import('firebase/firestore');

      if (!firebaseAuth.currentUser) {
        throw new Error('No user is currently authenticated.');
      }

      // Update in Firebase Auth
      await authUpdatePassword(firebaseAuth.currentUser, newDomainKey.trim());

      // Update in Firestore
      const userRef = fireDoc(firestoreDb, 'users', firebaseAuth.currentUser.uid);
      await fireUpdateDoc(userRef, {
        pin: newDomainKey.trim()
      });

      toast.success('Secure Domain PIN configured! You can now use your Email and PIN to log in on www.hcrs.in.', { id: loadingToast, duration: 6000 });
      setIsDomainKeyModalOpen(false);
      setNewDomainKey('');
    } catch (error: any) {
      console.error('Error updating domain key:', error);
      let errMsg = 'Failed to set password. PIN/Password could not be configured.';
      if (error?.code === 'auth/requires-recent-login' || error?.message?.includes('recent-login')) {
         errMsg = 'Security rule: Please log out and log in again via Vercel, then retry resetting PIN immediately.';
      } else if (error?.message) {
         errMsg = error.message;
      }
      toast.error(errMsg, { id: loadingToast, duration: 8000 });
    } finally {
      setIsUpdatingKey(false);
    }
  };
  
  // Custom sidebar active tab and pagination states
  const [activeTab, setActiveTab2] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [validActivePage, setValidActivePage] = useState(1);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Automatically reset to page 1 on search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setValidActivePage(1);
  }, [searchTerm, districtFilter, statusFilter, sourceFilter]);

  const [viewingMember, setViewingMember] = useState<UserProfile | null>(null);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [selectedReceiptsMember, setSelectedReceiptsMember] = useState<UserProfile | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);
  const [claimsViewMode, setClaimsViewMode] = useState<'individual' | 'combo'>('individual');
  const [comboSubView, setComboSubView] = useState<'groups' | 'all_persons'>('groups');

  // Claims Bulk Import States
  const [isClaimsImportOpen, setIsClaimsImportOpen] = useState(false);
  const [claimsImportFile, setClaimsImportFile] = useState<File | null>(null);
  const [claimsImportRows, setClaimsImportRows] = useState<any[]>([]);
  const [isClaimsImporting, setIsClaimsImporting] = useState(false);
  const [claimsImportProgress, setClaimsImportProgress] = useState(0);
  const [claimsImportLogs, setClaimsImportLogs] = useState<string[]>([]);
  const [claimsImportColumns, setClaimsImportColumns] = useState<string[]>([]);
  const [claimsColumnMapping, setClaimsColumnMapping] = useState<Record<string, string>>({});

  // States for Editing Claim Dialog
  const [editClaimHighrichId, setEditClaimHighrichId] = useState('');
  const [editClaimSponsorName, setEditClaimSponsorName] = useState('');
  const [editClaimSponsorMobile, setEditClaimSponsorMobile] = useState('');
  const [editClaimNoBreakup, setEditClaimNoBreakup] = useState(false);
  const [editClaimTotalPaid, setEditClaimTotalPaid] = useState(0);
  const [editClaimTotalReceived, setEditClaimTotalReceived] = useState(0);
  const [editClaimNotes, setEditClaimNotes] = useState('');
  
  // Category-wise editing states
  const [editClaimCategoryPaid, setEditClaimCategoryPaid] = useState<Record<string, number>>({});
  const [editClaimCategoryReceived, setEditClaimCategoryReceived] = useState<Record<string, number>>({});
  
  const [editClaimFuturePreference, setEditClaimFuturePreference] = useState('');
  const [editClaimHardshipStatus, setEditClaimHardshipStatus] = useState<string[]>([]);
  const [savingClaim, setSavingClaim] = useState(false);

  // Approval Loading States
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [approvingRenewalUid, setApprovingRenewalUid] = useState<string | null>(null);
  const [approvedRenewalUids, setApprovedRenewalUids] = useState<string[]>([]);

  // Populate claims states when editingClaim changes
  useEffect(() => {
    if (editingClaim) {
      setEditClaimHighrichId(editingClaim.highrichId || '');
      setEditClaimSponsorName(editingClaim.sponsorName || '');
      setEditClaimSponsorMobile(editingClaim.sponsorMobile || '');
      setEditClaimNoBreakup(!!editingClaim.noBreakup);
      setEditClaimTotalPaid(editingClaim.totalPaid || 0);
      setEditClaimTotalReceived(editingClaim.totalReceived || 0);
      setEditClaimNotes(editingClaim.notes || '');
      setEditClaimFuturePreference(editingClaim.futurePreference || '');
      setEditClaimHardshipStatus(editingClaim.hardshipStatus || []);
      
      const paidMap: Record<string, number> = {};
      const receivedMap: Record<string, number> = {};
      
      const CATEGORY_IDS = ['digital', 'ott', 'grocery', 'goodwill', 'other'];
      CATEGORY_IDS.forEach(id => {
        paidMap[id] = editingClaim.categoryDetails?.[id]?.paid || 0;
        receivedMap[id] = editingClaim.categoryDetails?.[id]?.received || 0;
      });
      
      setEditClaimCategoryPaid(paidMap);
      setEditClaimCategoryReceived(receivedMap);
    }
  }, [editingClaim]);

  // Claims File Upload Change Parser
  const handleClaimsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setClaimsImportFile(f);
    setClaimsImportLogs([`ഫയൽ ലോഡ് ചെയ്തു: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          toast.error("ശൂന്യമായ ഫയൽ ആണ് നിങ്ങൾ തിരഞ്ഞെടുത്തത്. (Empty file uploaded)");
          return;
        }

        setClaimsImportRows(data);
        const headers = Object.keys(data[0] || {});
        setClaimsImportColumns(headers);

        const autoMap: Record<string, string> = {};
        const fieldKeywords: Record<string, string[]> = {
          userName: ['name', 'username', 'user name', 'അംഗത്തിന്റെ പേര്', 'പേര്', 'userName'],
          userMobile: ['mobile', 'phone', 'contact', 'മൊബൈൽ', 'ഫോൺ', 'userMobile', 'telephone'],
          userDistrict: ['district', 'dist', 'ജില്ല', 'userDistrict'],
          highrichId: ['highrich id', 'hr id', 'id', 'ഹൈറിച്ച് ഐഡി', 'highrichId', 'hr_id'],
          totalPaid: ['total paid', 'invested', 'paid amount', 'അടച്ച തുക', 'തുക', 'totalPaid', 'paid'],
          totalReceived: ['total received', 'received', 'തിരികെ ലഭിച്ച തുക', 'received amount', 'totalReceived', 'withdrawn'],
          totalPending: ['total pending', 'pending', 'balance pending', 'ബാക്കി തുക', 'pending amount', 'totalPending', 'balance'],
          relation: ['relation', 'ബന്ധം', 'relationLabel'],
          futurePreference: ['preference', 'future preference', 'മുൻഗണന', 'futurePreference'],
          priorityStatus: ['priority', 'priority status', 'സ്റ്റാറ്റസ്', 'priorityStatus', 'urgency'],
          date: ['date', 'time', 'created at', 'തീയതി', 'tdate', 'dateSubmitted']
        };

        headers.forEach(h => {
          const lowerH = h.toLowerCase().trim();
          for (const [field, keywords] of Object.entries(fieldKeywords)) {
            if (keywords.some(k => lowerH.includes(k) || k.toLowerCase() === lowerH)) {
              if (!autoMap[field]) {
                autoMap[field] = h;
              }
            }
          }
        });

        setClaimsColumnMapping(autoMap);
        setClaimsImportLogs(prev => [
          ...prev, 
          `ആകെ ${data.length} വരികൾ കണ്ടെത്തി.`,
          `കണ്ടെത്തിയ കോളം വിവരങ്ങൾ: ${headers.join(', ')}`,
          `ആപ്പ് സ്വയം കോളം മാപ്പ് ചെയ്തിട്ടുണ്ട്. ബാക്കി കളങ്ങൾ ആവശ്യമെങ്കിൽ ക്രമീകരിക്കുക.`
        ]);
      } catch (err: any) {
        console.error(err);
        setClaimsImportLogs(prev => [...prev, `⚠️ പിശക്: ഫയൽ വായിക്കാൻ പറ്റിയില്ല: ${err.message}`]);
        toast.error("ഫയൽ വായിക്കുന്നതിൽ പിശക്!");
      }
    };
    reader.readAsBinaryString(f);
  };

  // Claims Database Bulk Settle & Write Action
  const handleClaimsBulkImportSave = async () => {
    const nameMap = claimsColumnMapping['userName'];
    const mobileMap = claimsColumnMapping['userMobile'];
    if (!nameMap || !mobileMap) {
      toast.error("അംഗത്തിന്റെ പേരും മൊബൈൽ നമ്പറും മാപ്പ് ചെയ്യേണ്ടത് നിർബന്ധമാണ്. (Name and Mobile columns must be mapped)");
      return;
    }

    setIsClaimsImporting(true);
    setClaimsImportProgress(0);
    const logs = ["ക്ലെയിം പെറ്റീഷൻ മൈഗ്രേഷൻ പ്രക്രിയ ആരംഭിക്കുന്നു...", `ആകെ റെക്കോർഡുകൾ: ${claimsImportRows.length}`];
    setClaimsImportLogs(logs);

    let importedCount = 0;
    let duplicateSkipped = 0;
    
    const { writeBatch, doc: fireDoc, collection: fireCollection, getDocs: fireGetDocs } = await import('firebase/firestore');

    const addLog = (msg: string) => {
      setClaimsImportLogs(prev => [...prev, msg]);
    };

    try {
      addLog("നിലവിലുള്ള ക്ലെയിമുകളുടെ സ്റ്റാറ്റസ് വിലയിരുത്തുന്നു...");
      const existingClaimsSnap = await fireGetDocs(fireCollection(db, 'claims'));
      const existingRefs = new Set<string>();
      existingClaimsSnap.forEach(d => {
        const data = d.data();
        const normName = String(data.userName || '').toLowerCase().trim();
        const normMob = String(data.userMobile || '').replace(/\D/g, '');
        const normHr = String(data.highrichId || '').toLowerCase().trim();
        if (normMob) existingRefs.add(`${normMob}_${normName}`);
        if (normHr && normHr !== 'n/a') existingRefs.add(`hr_${normHr}`);
      });

      let batch = writeBatch(db);
      let batchCount = 0;

      for (let i = 0; i < claimsImportRows.length; i++) {
        const row = claimsImportRows[i];
        
        const rawName = String(row[claimsColumnMapping['userName']] || '').trim();
        const rawMobile = String(row[claimsColumnMapping['userMobile']] || '').trim().replace(/\D/g, '');
        const rawDistrict = String(row[claimsColumnMapping['userDistrict']] || 'KSD').trim();
        const rawHighrichId = String(row[claimsColumnMapping['highrichId']] || '').trim();
        const rawTotalPaid = parseFloat(row[claimsColumnMapping['totalPaid']] || '0') || 0;
        const rawTotalReceived = parseFloat(row[claimsColumnMapping['totalReceived']] || '0') || 0;
        const rawTotalPending = parseFloat(row[claimsColumnMapping['totalPending']] || '0') || (rawTotalPaid - rawTotalReceived);
        const rawRelation = String(row[claimsColumnMapping['relation']] || 'Self').trim();
        const rawPreference = String(row[claimsColumnMapping['futurePreference']] || 'settlement').trim().toLowerCase();
        const rawPriority = String(row[claimsColumnMapping['priorityStatus']] || 'ORANGE').trim().toUpperCase();
        const rawDate = row[claimsColumnMapping['date']] || new Date().toISOString();

        if (!rawName || !rawMobile) {
          continue;
        }

        const lookupKeyName = `${rawMobile}_${rawName.toLowerCase()}`;
        const lookupKeyHr = rawHighrichId && rawHighrichId.toLowerCase() !== 'n/a' ? `hr_${rawHighrichId.toLowerCase()}` : '';
        if (existingRefs.has(lookupKeyName) || (lookupKeyHr && existingRefs.has(lookupKeyHr))) {
          duplicateSkipped++;
          continue;
        }

        const matchedMember = members.find(m => compareMobiles(m.mobile, rawMobile));
        const finalUid = matchedMember?.uid || `offline_claim_${rawMobile}_${Math.floor(Math.random() * 1000)}`;
        const finalMembershipId = matchedMember?.membershipId || 'N/A';

        let normalizedRelation = 'Self';
        if (rawRelation.includes('അമ്മ') || rawRelation.toLowerCase() === 'mother') normalizedRelation = 'Mother';
        else if (rawRelation.includes('അച്ഛൻ') || rawRelation.toLowerCase() === 'father') normalizedRelation = 'Father';
        else if (rawRelation.includes('മകൻ') || rawRelation.toLowerCase() === 'son') normalizedRelation = 'Son';
        else if (rawRelation.includes('മകൾ') || rawRelation.toLowerCase() === 'daughter') normalizedRelation = 'Daughter';
        else if (rawRelation.includes('ഭാര്യ') || rawRelation.toLowerCase() === 'wife') normalizedRelation = 'Wife';
        else if (rawRelation.includes('ഭർത്താവ്') || rawRelation.toLowerCase() === 'husband') normalizedRelation = 'Husband';

        let finalPreference = 'settlement';
        if (rawPreference.includes('wait') || rawPreference.includes('കാത്തിരിക്കാൻ')) finalPreference = 'wait';
        else if (rawPreference.includes('continue') || rawPreference.includes('തുടരാൻ')) finalPreference = 'continue';

        let finalPriority = 'ORANGE';
        if (['RED', 'EMERGENCY RED', 'GREEN', 'ORANGE'].includes(rawPriority)) {
          finalPriority = rawPriority;
        } else if (rawPriority.includes('ചുവപ്പ്') || rawPriority.includes('അടിയന്തിരം') || rawPriority.includes('RED')) {
          finalPriority = 'RED';
        } else if (rawPriority.includes('പച്ച') || rawPriority.includes('GREEN')) {
          finalPriority = 'GREEN';
        }

        const claimDocId = `claim_${rawMobile}_${rawHighrichId.replace(/[^a-zA-Z0-9]/g, '') || Math.floor(Math.random() * 10000)}`;

        const claimDoc = {
          uid: finalUid,
          membershipId: finalMembershipId,
          userName: rawName,
          userMobile: rawMobile,
          userDistrict: getDistrictCode(rawDistrict),
          highrichId: rawHighrichId || 'N/A',
          categories: ['other'],
          otherCategory: 'Old Site Imported Claim (പഴയ വെബ്സൈറ്റിൽ നിന്നുള്ളത്)',
          noBreakup: true,
          totalPaid: rawTotalPaid,
          totalReceived: rawTotalReceived,
          totalPending: rawTotalPending,
          futurePreference: finalPreference,
          hardshipStatus: [],
          isEmergency: finalPriority === 'EMERGENCY RED',
          priorityStatus: finalPriority,
          tokenNo: Math.floor(100000 + Math.random() * 900000),
          createdAt: typeof rawDate === 'string' && !isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const claimRef = fireDoc(db, 'claims', claimDocId);
        batch.set(claimRef, claimDoc);
        batchCount++;

        existingRefs.add(lookupKeyName);
        if (lookupKeyHr) existingRefs.add(lookupKeyHr);

        importedCount++;

        if (batchCount >= 100) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
          const progress = Math.round((i / claimsImportRows.length) * 100);
          setClaimsImportProgress(progress);
          addLog(`പ്രോസസ്സ് വിജയകരമായി ബാച്ചുകളായി എഴുതുന്നു... (${i + 1} പൂർത്തിയായി)`);
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      setClaimsImportProgress(100);
      addLog(`👉 മൈഗ്രേഷൻ പ്രക്രിയ പൂർത്തിയായി!`);
      addLog(`🎉 ആകെ റീകൺസൈൽ ചെയ്ത പഴയ അപേക്ഷകൾ: ${importedCount}`);
      if (duplicateSkipped > 0) {
        addLog(`സ്മാർട്ട് സ്കിപ്പ്: ഇതിനകം പുതിയ സൈറ്റിൽ നേരിട്ട് സമർപ്പിച്ച ${duplicateSkipped} എണ്ണം വിജയകരമായി ഒഴിവാക്കി.`);
      }

      toast.success(`വിജയകരമായി ${importedCount} പുതിയ ക്ലെയിമുകൾ റെക്കോർഡിലേക്ക് ചേർത്തു!`);
    } catch (err: any) {
      console.error(err);
      addLog(`⚠️ പിശക്: എഴുതാൻ താൽക്കാലിക തടസ്സം: ${err.message}`);
      toast.error('ചില റെക്കോർഡുകൾ ചേർക്കാൻ പറ്റിയിട്ടില്ല: ' + err.message);
    } finally {
      setIsClaimsImporting(false);
    }
  };

  const claimUser = useMemo(() => {
    if (!selectedClaim) return null;
    const found = members?.find((m: any) => m.uid === selectedClaim.uid);
    return found || {
      name: selectedClaim.userName,
      mobile: selectedClaim.userMobile,
      address: selectedClaim.userAddress || 'Address not stored in claim',
      district: selectedClaim.userDistrict || '',
      constituency: selectedClaim.userConstituency || '',
      bloodGroup: selectedClaim.userBloodGroup || '',
      email: selectedClaim.userEmail || '',
      membershipId: selectedClaim.membershipId || ''
    };
  }, [selectedClaim, members]);

  const handleSyncClaimsCounter = async () => {
    const tId = toast.loading('ക്ലെയിം സീരിയൽ കൗണ്ടർ പരിശോധിക്കുന്നു...');
    try {
      // 1. Check local Firestore snapshot
      const claimsSnap = await getDocs(collection(db, 'claims'));
      let maxSerial = 0;
      let maxRed = 0;
      let maxOrange = 0;
      let maxGreen = 0;

      claimsSnap.docs.forEach(d => {
        const data = d.data();
        const num = typeof data.serialNo === 'number' ? data.serialNo : parseInt(String(data.serialNo || data.tokenNo || '').replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxSerial) maxSerial = num;
        const tok = String(data.tokenNo || data.serialNo || '');
        if (tok.startsWith('R-')) {
          const rNum = parseInt(tok.replace('R-', ''), 10);
          if (!isNaN(rNum) && rNum > maxRed) maxRed = rNum;
        } else if (tok.startsWith('O-')) {
          const oNum = parseInt(tok.replace('O-', ''), 10);
          if (!isNaN(oNum) && oNum > maxOrange) maxOrange = oNum;
        } else if (tok.startsWith('G-')) {
          const gNum = parseInt(tok.replace('G-', ''), 10);
          if (!isNaN(gNum) && gNum > maxGreen) maxGreen = gNum;
        }
      });

      const systemTotalsRef = doc(db, 'system', 'totals');
      if (claimsSnap.empty) {
        await setDoc(systemTotalsRef, {
          claimsCounter: 0,
          redClaimsCounter: 0,
          orangeClaimsCounter: 0,
          greenClaimsCounter: 0
        }, { merge: true });
        
        // Also call server API endpoint to sync
        fetch('/api/admin/reset-claims-counter', { method: 'POST' }).catch(() => {});

        toast.success('ക്ലെയിം കൗണ്ടർ വിജയകരമായി 0-ലേക്ക് റീസെറ്റ് ചെയ്തു! ഇനി വരുന്ന ക്ലെയിമുകൾ 1 മുതൽ ആരംഭിക്കും.', { id: tId });
      } else {
        await setDoc(systemTotalsRef, {
          claimsCounter: Math.max(claimsSnap.size, maxSerial),
          redClaimsCounter: maxRed,
          orangeClaimsCounter: maxOrange,
          greenClaimsCounter: maxGreen
        }, { merge: true });

        // Also call server API endpoint to sync
        fetch('/api/admin/reset-claims-counter', { method: 'POST' }).catch(() => {});

        toast.success(`കൗണ്ടർ സിങ്ക് ചെയ്തു (ആകെ ക്ലെയിമുകൾ: ${claimsSnap.size}, അവസാന നമ്പർ: ${maxSerial}). അടുത്ത ക്ലെയിം ${maxSerial + 1} ആയിരിക്കും.`, { id: tId });
      }
    } catch (err: any) {
      console.error("Error syncing claims counter:", err);
      // Fallback via server API
      try {
        const sRes = await fetch('/api/admin/reset-claims-counter', { method: 'POST' });
        const sData = await sRes.json();
        if (sData?.success) {
          toast.success(`കൗണ്ടർ വിജയകരമായി സിങ്ക് ചെയ്തു! (Next starting: ${sData.nextStartingNumber})`, { id: tId });
          return;
        }
      } catch (sErr) {}
      toast.error('കൗണ്ടർ സിങ്ക് ചെയ്യുന്നതിൽ പരാജയം: ' + err.message, { id: tId });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingMemberId(id);
  };

  const confirmDelete = () => {
    if (deletingMemberId) {
      onDelete(deletingMemberId);
      setDeletingMemberId(null);
    }
  };

  const [manualFormData, setManualFormData] = useState(() => {
    // Try to load draft from localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem('hcrs_manual_entry_draft') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Basic validation - ensure it matches expected structure
        if (parsed && typeof parsed === 'object' && parsed.name !== undefined) {
          // Force member role for new session even if draft was admin, to prevent accidental admin additions
          return { ...parsed, role: 'member' as 'member' | 'operator' | 'admin' };
        }
      } catch (e) {
        console.error("Failed to parse manual entry draft", e);
      }
    }

    const normalizedDist = user?.district ? getDistrictCode(user.district) : DISTRICTS[0].code;
    return {
      name: '', 
      mobile: '', 
      email: '',
      address: '',
      postOffice: '',
      pincode: '',
      district: normalizedDist, 
      assemblyConstituency: CONSTITUENCIES[normalizedDist]?.[0] || '', 
      bloodGroup: BLOOD_GROUPS[0], 
      sponsorName: '',
      sponsorMobile: '',
      pin: '123456',
      role: 'member' as 'member' | 'operator' | 'admin',
      quota: 100,
      certAdminName: user?.name || '',
      certAdminEmail: user?.email || '',
      certAdminPassword: ''
    };
  });

  useEffect(() => {
    if (manualFormData) {
      localStorage.setItem('hcrs_manual_entry_draft', JSON.stringify(manualFormData));
    }
  }, [manualFormData]);

  // CRITICAL: Update identity whenever the logged-in user changes. 
  // This prevents "Pisharady" name from appearing when a different admin logs in.
  useEffect(() => {
    if (user) {
      setManualFormData(prev => ({ 
        ...prev, 
        certAdminEmail: user.email || '',
        certAdminName: user.name || '',
        // If the user's district is different from the draft, update the draft's district
        district: (prev.name === '' && user.district) ? getDistrictCode(user.district) : prev.district
      }));
    }
  }, [user?.uid]); // Specifically trigger on user ID change

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string, email: string, pin: string, mobile: string } | null>(null);

  const [claims, setClaims] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('hcrs_cached_claims');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [claimsLoading, setClaimsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('hcrs_cached_claims');
      if (cached && JSON.parse(cached).length > 0) return false;
    } catch (e) {}
    return true;
  });
  const [claimSearchTerm, setClaimSearchTerm] = useState('');
  const [claimDistrictFilter, setClaimDistrictFilter] = useState('all');
  const [claimPriorityFilter, setClaimPriorityFilter] = useState('all');
  const [claimCategoryFilter, setClaimCategoryFilter] = useState('all');
  const [claimTypeFilter, setClaimTypeFilter] = useState<'all' | 'combo' | 'single'>('all');

  const [supportTickets, setSupportTickets] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('hcrs_cached_support_tickets');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('hcrs_cached_support_tickets');
      if (cached && JSON.parse(cached).length > 0) return false;
    } catch (e) {}
    return true;
  });
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [supportTicketsError, setSupportTicketsError] = useState<string | null>(null);

   useEffect(() => {
    if (!user) return;
    setSupportTicketsError(null);
    if (user.uid === 'offline_admin') {
      try {
        const cached = localStorage.getItem('hcrs_cached_support_tickets');
        if (cached) {
          setSupportTickets(JSON.parse(cached));
        } else {
          setSupportTickets([]);
        }
      } catch (e) {
        setSupportTickets([]);
      }
      setSupportTicketsLoading(false);
      return;
    }
    const q = query(collection(db, 'support_tickets'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      try {
        localStorage.setItem('hcrs_cached_support_tickets', JSON.stringify(data));
      } catch (e) {
        console.warn("localStorage set tickets failed:", e);
      }
      setSupportTickets(data);
      setSupportTicketsLoading(false);
    }, (err: any) => {
      console.error("Support tickets fetch error:", err);
      setSupportTicketsError(err.code || err.message || "permission-denied");
      try {
        const cached = localStorage.getItem('hcrs_cached_support_tickets');
        if (cached) {
          setSupportTickets(JSON.parse(cached));
          setSupportTicketsLoading(false);
          return;
        }
      } catch (e) {
        console.warn("localStorage read tickets failed:", e);
      }
      setSupportTicketsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleResolveSupportTicket = async (ticketId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    const msg = nextStatus === 'resolved' ? 'ടിക്കറ്റ് പരിഹരിച്ചതായി രേഖപ്പെടുത്തി!' : 'ടിക്കറ്റ് വീണ്ടും പെൻഡിങ് ആക്കി!';
    const loadingToast = toast.loading('സ്റ്റാറ്റസ് മാറ്റുന്നു...');
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status: nextStatus });
      toast.success(msg, { id: loadingToast });
    } catch (err: any) {
      console.error(err);
      toast.error('സ്റ്റാറ്റസ് റീസെറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.', { id: loadingToast });
    }
  };

  const handleDeleteSupportTicket = async (ticketId: string) => {
    if (!window.confirm('ഈ സപ്പോർട്ട് ഇൻക്വയറി ടിക്കറ്റ് ഡിലീറ്റ് ചെയ്യണമെന്നുറപ്പാണോ?')) return;
    const loadingToast = toast.loading('ഡിലീറ്റ് ചെയ്യുന്നു...');
    try {
      await deleteDoc(doc(db, 'support_tickets', ticketId));
      toast.success('ടിക്കറ്റ് വിജയകരമായി ഡിലീറ്റ് ചെയ്തു.', { id: loadingToast });
    } catch (err: any) {
      console.error(err);
      toast.error('ഡിലീറ്റ് പരാജയപ്പെട്ടു.', { id: loadingToast });
    }
  };

  const [isSyncingClaims, setIsSyncingClaims] = useState(false);

  const refreshClaimsList = useCallback(async (isManual = false) => {
    setIsSyncingClaims(true);
    const toastId = isManual ? toast.loading('ഡാറ്റാബേസിൽ നിന്ന് ക്ലെയിമുകൾ സിങ്ക് ചെയ്യുന്നു...') : undefined;
    try {
      const res = await fetch(`/api/database/claims?fresh=true&t=${Date.now()}`);
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && Array.isArray(resData.data)) {
          const sorted = [...resData.data].sort((a: any, b: any) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          });
          setClaims(sorted);
          try {
            localStorage.setItem('hcrs_cached_claims', JSON.stringify(sorted));
          } catch (e) {}
          setClaimsError(null);
          setClaimsLoading(false);
          if (isManual) {
            toast.success(`ഡാറ്റാബേസിൽ നിന്ന് ${sorted.length} ക്ലെയിമുകൾ വിജയകരമായി സിങ്ക് ചെയ്തു.`, { id: toastId });
          }
          return sorted;
        }
      }
      
      const snap = await getDocs(collection(db, 'claims'));
      const data = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
      setClaims(data);
      try {
        localStorage.setItem('hcrs_cached_claims', JSON.stringify(data));
      } catch (e) {}
      setClaimsError(null);
      setClaimsLoading(false);
      if (isManual) {
        toast.success(`ഡാറ്റാബേസിൽ നിന്ന് ${data.length} ക്ലെയിമുകൾ വിജയകരമായി സിങ്ക് ചെയ്തു.`, { id: toastId });
      }
      return data;
    } catch (err: any) {
      console.error("Claims sync error:", err);
      if (isManual) {
        toast.error('ക്ലെയിം സിങ്ക് പരാജയപ്പെട്ടു: ' + (err.message || 'Error'), { id: toastId });
      }
    } finally {
      setIsSyncingClaims(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setClaimsError(null);
    
    // Always trigger immediate fetch from server database claims API
    refreshClaimsList(false);

    // Set up real-time listener when available
    if (user.uid !== 'offline_admin') {
      const q = query(collection(db, 'claims'));
      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        data.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
        try {
          localStorage.setItem('hcrs_cached_claims', JSON.stringify(data));
        } catch (e) {
          console.warn("localStorage set claims failed:", e);
        }
        setClaims(data);
        setClaimsError(null);
        setClaimsLoading(false);
      }, (err: any) => {
        console.warn("Claims real-time listener notice:", err);
      });
      return () => unsubscribe();
    }
  }, [user, refreshClaimsList]);

  const handleSaveClaim = async () => {
    if (!editingClaim) return;
    setSavingClaim(true);
    const loadingToast = toast.loading('ക്ലെയിം വിവരങ്ങൾ സേവ് ചെയ്യുന്നു...');
    try {
      let totalPaid = 0;
      let totalReceived = 0;
      const categoryDetails: Record<string, any> = {};
      const selectedCats: string[] = [];
      
      const CATEGORY_IDS = ['digital', 'ott', 'grocery', 'goodwill', 'other'];
      
      if (editClaimNoBreakup) {
        totalPaid = Number(editClaimTotalPaid) || 0;
        totalReceived = Number(editClaimTotalReceived) || 0;
      } else {
        CATEGORY_IDS.forEach(id => {
          const paid = Number(editClaimCategoryPaid[id]) || 0;
          const received = Number(editClaimCategoryReceived[id]) || 0;
          const pending = paid - received;
          
          if (paid > 0 || received > 0) {
            selectedCats.push(id);
            categoryDetails[id] = { paid, received, pending };
            totalPaid += paid;
            totalReceived += received;
          }
        });
      }
      
      const totalPending = totalPaid - totalReceived;
      const isEmergency = editClaimHardshipStatus.some(h => ['bank', 'crisis', 'medical'].includes(h));
      
      let priorityStatus = 'PENDING';
      if (isEmergency) priorityStatus = 'EMERGENCY RED';
      else if (editClaimFuturePreference === 'urgent') priorityStatus = 'EMERGENCY RED';
      else if (editClaimFuturePreference === 'settlement') priorityStatus = 'RED';
      else if (editClaimFuturePreference === 'wait') priorityStatus = 'ORANGE';
      else if (editClaimFuturePreference === 'continue') priorityStatus = 'GREEN';

      const updateData = {
        highrichId: editClaimHighrichId,
        sponsorName: editClaimSponsorName.trim(),
        sponsorMobile: editClaimSponsorMobile.trim(),
        noBreakup: editClaimNoBreakup,
        totalPaid,
        totalReceived,
        totalPending,
        categories: editClaimNoBreakup ? (editingClaim.categories || []) : selectedCats,
        categoryDetails: editClaimNoBreakup ? {} : categoryDetails,
        futurePreference: editClaimFuturePreference,
        hardshipStatus: editClaimHardshipStatus,
        isEmergency,
        notes: editClaimNotes,
        priorityStatus,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'claims', editingClaim.id), updateData);
      toast.success('ക്ലെയിം വിവരങ്ങൾ വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു!', { id: loadingToast });
      setEditingClaim(null);
    } catch (err) {
      console.error("Error updating claim:", err);
      toast.error('ക്ലെയിം അപ്ഡേറ്റ് ചെയ്യാൻ സാധിച്ചില്ല.', { id: loadingToast });
    } finally {
      setSavingClaim(false);
    }
  };

  // Handle district management labels update
  const getAdminLabel = (email: string) => {
    if (MAIN_ADMINS.includes(email)) return 'Main Admin';
    return 'Second Admin (സെക്കൻഡ് അഡ്മിൻ)';
  };

  const [isAligningDates, setIsAligningDates] = useState(false);

  const handleAlignAllDatesTo2025 = async () => {
    const targets = members.filter(m => {
      if (m.role === 'admin' || m.role === 'operator') return false;
      const regDate = m.registrationDate;
      if (!regDate) return true; // Align if date is missing
      const d = regDate.toDate ? regDate.toDate() : (regDate.seconds ? new Date(regDate.seconds * 1000) : new Date(regDate));
      return d.getFullYear() >= 2026; // Match anyone who has joining date in 2026 or later
    });

    if (targets.length === 0) {
      toast.info("എല്ലാ മെമ്പർമാരുടെയും ജോയിനിംഗ് തീയതികൾ നിലവിൽ 2025-ലേക്ക് മാറ്റിയിട്ടുണ്ട്.");
      return;
    }

    const confirmAction = window.confirm(`${targets.length} മെമ്പർമാരുടെ ജോയിനിംഗ് തീയതി 2025-ലേക്ക് മാറ്റാനും അവരെ റിന്യൂവൽ ചെയ്യേണ്ടവരായി (Expired/Renewal Required) കാണിക്കാനും നിങ്ങൾ ആഗ്രഹിക്കുന്നുണ്ടോ?`);
    if (!confirmAction) return;

    setIsAligningDates(true);
    const loadingToast = toast.loading(`ആകെ ${targets.length} മെമ്പർമാരുടെ വിവരങ്ങൾ പുതുക്കുന്നു...`);

    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const regDate2025 = new Date('2025-06-01T12:00:00Z');
      const expDate2026 = new Date('2026-06-01T12:00:00Z');

      let count = 0;
      for (const m of targets) {
        const memberRef = doc(db, 'users', m.uid);
        batch.update(memberRef, {
          registrationDate: regDate2025,
          issueDate: regDate2025,
          expiryDate: expDate2026,
          renewalPending: false
        });
        count++;
      }

      await batch.commit();
      toast.success(`വിജയകരമായി ${count} മെമ്പർമാരുടെ ജോയിനിംഗ് തീയതി 2025 ജൂൺ 1 ലേക്ക് മാറ്റിയിരിക്കുന്നു! കാർഡ് കാലാവധി കഴിഞ്ഞതിനാൽ അവർക്ക് ലോഗിൻ ചെയ്യുമ്പോൾ തന്നെ അതാത് ദിവസം ₹100 റിന്യൂവൽ ചെയ്യാൻ ആവശ്യപ്പെടും.`, { id: loadingToast });
    } catch (error) {
      console.error("Batch update error:", error);
      toast.error("തീയതികൾ മാറ്റുന്നതിൽ പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.", { id: loadingToast });
    } finally {
      setIsAligningDates(false);
    }
  };

  const handleApproveRenewal = async (member: UserProfile) => {
    if (approvingRenewalUid === member.uid || member.renewalPending === false) return;
    const cleanMob = member.mobile ? String(member.mobile).replace(/\D/g, '') : '';

    setApprovingRenewalUid(member.uid);
    const loadingToast = toast.loading(`റിന്യൂവൽ അപ്രൂവ് ചെയ്യുന്നു... (${member.name})`);
    
    const now = new Date();
    const expiry = new Date();
    expiry.setFullYear(now.getFullYear() + 1);
    const expiryStr = expiry.toLocaleDateString('en-IN');

    // Safe ISO string helper
    const getSafeIsoTime = (val: any) => {
      try {
        if (!val) return new Date().toISOString();
        if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch (e) {}
      return new Date().toISOString();
    };

    try {
      try {
        const srvRes = await fetch('/api/admin/approve-renewal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: member.uid, mobile: cleanMob })
        });
        if (srvRes.ok) {
          console.log("[Renewal Approval API success for]:", member.uid);
        }
      } catch (srvErr) {
        console.warn("[Renewal Approval API note]:", srvErr);
      }

      const safeRegDate = member.registrationDate || now;
      const safePaymentTime = getSafeIsoTime(member.renewalDate || (member as any).renewalPaymentDate || now);

      await onUpdate(member.uid, {
        status: 'active',
        isApproved: true,
        renewalPending: false,
        issueDate: now, // Update issue date on renewal approval
        registrationDate: safeRegDate, // Preserve permanent original Joining Date, fallback if none
        renewalDate: now, // Store renewal date permanently
        expiryDate: expiry,
        paymentTime: safePaymentTime
      });

      setApprovedRenewalUids(prev => {
        const newUids = new Set(prev);
        newUids.add(member.uid);
        return Array.from(newUids);
      });

      // Synchronize viewingMember if open
      if (viewingMember && viewingMember.uid === member.uid) {
        setViewingMember(prev => prev ? ({
          ...prev,
          status: 'active',
          isApproved: true,
          renewalPending: false,
          issueDate: now,
          renewalDate: now,
          expiryDate: expiry
        }) : null);
      }

      // Automatically send WhatsApp renewal confirmation message
      try {
        if (orgSettings?.whatsappEnabled !== false && orgSettings?.whatsappRenewalEnabled !== false && orgSettings?.registrationMode !== 'bulk') {
          setTimeout(() => {
            try {
              sendWARenewalMessage({
                name: member.name,
                mobile: member.mobile,
                uid: member.uid,
                membershipId: member.membershipId,
                transactionId: (member as any).renewalTransactionId || (member as any).transactionId || '',
                amount: 100,
                expiryDate: expiryStr
              });
            } catch (innerWa) {
              console.warn("sendWARenewalMessage call failed:", innerWa);
            }
          }, 350);
        }
      } catch (waErr) {
        console.warn("WhatsApp renewal trigger error:", waErr);
      }
      
      toast.success(`റിന്യൂവൽ വിജയകരമായി അപ്രൂവ് ചെയ്തു! (${member.name})`, { id: loadingToast });
    } catch (error: any) {
      console.error("Renewal approval catch:", error);
      setApprovedRenewalUids(prev => prev.filter(id => id !== member.uid));
      toast.error(error?.message ? `Renewal approval note: ${error.message}` : 'Renewal approval failed. Please try again.', { id: loadingToast });
    } finally {
      setApprovingRenewalUid(null);
    }
  };

  const STABLE_URL = SHARED_URL;
  const baseUrl = typeof window !== 'undefined' && !window.location.origin.includes('ais-dev') && !window.location.origin.includes('google.com')
    ? window.location.origin 
    : STABLE_URL;
  const magicLinkBase = baseUrl;

  const handleApproveWithWhatsApp = async (member: UserProfile) => {
    if (approvingUid) return;
    setApprovingUid(member.uid);
    try {
      await onApprove(member.uid);
    } catch (error) {
      console.error("Approval error:", error);
    } finally {
      setApprovingUid(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanMobile = (manualFormData.mobile || '').trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error('മൊബൈൽ നമ്പർ കൃത്യം 10 അക്കങ്ങൾ ആയിരിക്കണം. ദയവായി പരിശോധിക്കുക. (Mobile number must be exactly 10 digits. Please check.)');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const finalEmail = (manualFormData as any).uid ? manualFormData.email : (manualFormData.email || `${cleanMobile}@hcrs.society`);
      const payloadData = { ...manualFormData, mobile: cleanMobile, email: finalEmail };

      if ((payloadData as any).uid) {
        // Update existing member case
        await onUpdate((payloadData as any).uid, {
            ...payloadData,
            isAdmin: payloadData.role === 'admin' || payloadData.role === 'operator',
            status: 'active'
        });
        toast.success(`Updated ${payloadData.name} permissions`);
        setIsManualEntryOpen(false);
      } else {
        // New member case
        const resultUid = await (onAddOffline(payloadData) as unknown as Promise<string | null>);
        if (resultUid) {
            if (orgSettings?.registrationMode !== 'bulk') {
              sendWAMessage({
                name: payloadData.name,
                mobile: cleanMobile,
                uid: resultUid,
                pin: payloadData.pin
              });
            }

            setIsManualEntryOpen(false);
            toast.success('Successfully added member');
        }
      }

      // Shared cleanup
      setManualFormData({ 
        name: '', 
        mobile: '', 
        email: '',
        address: '',
        postOffice: '',
        pincode: '',
        district: manualFormData.district, 
        assemblyConstituency: (CONSTITUENCIES[manualFormData.district] || [])[0] || '', 
        bloodGroup: BLOOD_GROUPS[0], 
        sponsorName: '',
        sponsorMobile: '',
        pin: '123456',
        role: 'member',
        certAdminName: user?.name || '',
        certAdminEmail: user?.email || '',
        certAdminPassword: ''
      });
      localStorage.removeItem('hcrs_manual_entry_draft');
    } catch (err) {
      console.error(err);
      toast.error('Operation failed. Please check your permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const cleanMobile = (editingMember.mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error('മൊബൈൽ നമ്പർ കൃത്യം 10 അക്കങ്ങൾ ആയിരിക്കണം. ദയവായി പരിശോധിക്കുക. (Mobile number must be exactly 10 digits.)');
      return;
    }
    const cleanPin = (editingMember.pin || '123456').trim();
    const isDefaultPin = cleanPin === '123456';
    const updatedMember = { 
      ...editingMember, 
      mobile: cleanMobile,
      pin: cleanPin,
      mustChangePassword: isDefaultPin,
      pinResetRequested: isDefaultPin,
      mustCompleteProfile: false
    };
    onUpdate(updatedMember.uid, updatedMember);
    setEditingMember(null);
  };

  const actualMembers = useMemo(() => {
    return members.filter(m => {
      const isAnyAdmin = [...MAIN_ADMINS, ...SECOND_ADMINS].some(adminEmail => m.email?.toLowerCase() === adminEmail.toLowerCase());
      return !isAnyAdmin && m.status !== 'deleted';
    });
  }, [members]);

  const stats = useMemo(() => {
    let total = 0;
    let active = 0;
    let pending = 0;
    let renewals = 0;
    const approvedSet = new Set(approvedRenewalUids);
    
    for (const m of actualMembers) {
      const matchesDistrict = districtFilter === 'all' || isDistrictMatch(m.district, districtFilter);
      if (!matchesDistrict) continue;

      const isApprovedRenewal = approvedSet.has(m.uid);
      const isRenewalPending = !!m.renewalPending && !isApprovedRenewal;

      total++;
      if (m.status === 'pending' && !isRenewalPending) {
        pending++;
      } else if (m.status === 'active' || isRenewalPending || isApprovedRenewal) {
        active++;
      }
      
      if (isRenewalPending) renewals++;
    }

    return { total, active, pending, renewals };
  }, [actualMembers, districtFilter, approvedRenewalUids]);

  const filteredMembers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    // Cache district map for faster lookup
    const districtMap = new Map(DISTRICTS.map(d => [d.code, d.name.toLowerCase()]));

    const filtered = members.filter(m => {
      // Hide Admins (both Main and District) from members list to avoid confusion
      const isAnyAdmin = [...MAIN_ADMINS, ...SECOND_ADMINS].some(adminEmail => m.email?.toLowerCase() === adminEmail.toLowerCase());
      if (isAnyAdmin) return false;

      const normMDist = normalizeDistrictCode(m.district);
      const matchesSearch = !term || 
                           (m.name && m.name.toLowerCase().includes(term)) || 
                           (m.mobile && String(m.mobile).includes(term)) ||
                           (m.membershipId && m.membershipId.toLowerCase().includes(term)) ||
                           (m.email && m.email.toLowerCase().includes(term)) ||
                           (m.constituencyCode && m.constituencyCode.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && m.assemblyConstituency.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && getAssemblyCode(m.assemblyConstituency).toLowerCase().includes(term)) ||
                           (normMDist && districtMap.get(normMDist)?.includes(term)) ||
                           (m.district && m.district.toLowerCase().includes(term));
      const matchesDistrict = districtFilter === 'all' || isDistrictMatch(m.district, districtFilter);
      const matchesStatus = statusFilter === 'all' ? (m.status !== 'deleted') : m.status === statusFilter;
      
      let matchesSource = true;
      if (sourceFilter === 'online') {
        matchesSource = !m.registeredBy;
      } else if (sourceFilter === 'manual') {
        matchesSource = !!m.registeredBy;
      }

      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        const typeStr = String(m.membership_type || m.membershipType || '').toUpperCase();
        const memId = String(m.membershipId || '').toUpperCase();
        const isLife = typeStr.includes('LIFE') || memId.includes('-LIFE-') || memId.startsWith('HCRS-LIFE') || memId.includes('-LM-') || !!(m as any).isLifeMember;
        if (categoryFilter === 'LIFE_MEMBER') {
          matchesCategory = isLife;
        } else if (categoryFilter === 'ADHOC_MEMBER') {
          matchesCategory = !isLife;
        }
      }
      
      return matchesSearch && matchesDistrict && matchesStatus && matchesSource && matchesCategory;
    });

    // De-duplicate members by mobile number to hide older historical duplicates
    const groups = new Map<string, UserProfile[]>();
    for (const m of filtered) {
      const mob = (m.mobile || '').trim().replace(/\D/g, '');
      if (!mob) continue;
      if (!groups.has(mob)) {
        groups.set(mob, []);
      }
      groups.get(mob)!.push(m);
    }

    const result: UserProfile[] = [];
    const processedMobs = new Set<string>();

    for (const m of filtered) {
      const mob = (m.mobile || '').trim().replace(/\D/g, '');
      if (!mob) {
        result.push(m);
        continue;
      }
      if (processedMobs.has(mob)) continue;
      processedMobs.add(mob);

      const group = groups.get(mob)!;
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        const best = group.sort((a, b) => {
          const statusA = a.status || '';
          const statusB = b.status || '';
          if (statusA === 'active' && statusB !== 'active') return -1;
          if (statusB === 'active' && statusA !== 'active') return 1;

          if (statusA === 'pending' && statusB !== 'pending') return -1;
          if (statusB === 'pending' && statusA !== 'pending') return 1;

          const expA = a.expiryDate ? (a.expiryDate.toDate ? a.expiryDate.toDate().getTime() : new Date(a.expiryDate).getTime()) : 0;
          const expB = b.expiryDate ? (b.expiryDate.toDate ? b.expiryDate.toDate().getTime() : new Date(b.expiryDate).getTime()) : 0;
          if (expA !== expB) return expB - expA;

          const regA = a.registrationDate ? (a.registrationDate.toDate ? a.registrationDate.toDate().getTime() : new Date(a.registrationDate).getTime()) : 0;
          const regB = b.registrationDate ? (b.registrationDate.toDate ? b.registrationDate.toDate().getTime() : new Date(b.registrationDate).getTime()) : 0;
          return regB - regA;
        })[0];
        result.push(best);
      }
    }

    return result;
  }, [members, searchTerm, districtFilter, statusFilter, sourceFilter, categoryFilter]);

  const itemsPerPage = 10;
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const validActiveCount = useMemo(() => {
    const filtered = members.filter(m => {
      const isAnyAdmin = [...MAIN_ADMINS, ...SECOND_ADMINS].some(adminEmail => m.email?.toLowerCase() === adminEmail.toLowerCase());
      if (isAnyAdmin) return false;
      const matchesDistrict = districtFilter === 'all' || isDistrictMatch(m.district, districtFilter);
      if (!matchesDistrict) return false;

      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        const typeStr = String(m.membership_type || m.membershipType || '').toUpperCase();
        const memId = String(m.membershipId || '').toUpperCase();
        const isLife = typeStr.includes('LIFE') || memId.includes('-LIFE-') || memId.startsWith('HCRS-LIFE') || memId.includes('-LM-') || !!(m as any).isLifeMember;
        if (categoryFilter === 'LIFE_MEMBER') {
          matchesCategory = isLife;
        } else if (categoryFilter === 'ADHOC_MEMBER') {
          matchesCategory = !isLife;
        }
      }
      return matchesCategory && hasValidity(m);
    });

    const uniqueMobs = new Set<string>();
    let count = 0;
    for (const m of filtered) {
      const mob = (m.mobile || '').trim().replace(/\D/g, '');
      if (!mob) {
        count++;
        continue;
      }
      if (!uniqueMobs.has(mob)) {
        uniqueMobs.add(mob);
        count++;
      }
    }
    return count;
  }, [members, districtFilter, categoryFilter]);

  const filteredValidActiveMembers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const districtMap = new Map(DISTRICTS.map(d => [d.code, d.name.toLowerCase()]));

    const filtered = members.filter(m => {
      const isAnyAdmin = [...MAIN_ADMINS, ...SECOND_ADMINS].some(adminEmail => m.email?.toLowerCase() === adminEmail.toLowerCase());
      if (isAnyAdmin) return false;

      const matchesSearch = !term || 
                           (m.name && m.name.toLowerCase().includes(term)) || 
                           (m.mobile && String(m.mobile).includes(term)) ||
                           (m.membershipId && m.membershipId.toLowerCase().includes(term)) ||
                           (m.email && m.email.toLowerCase().includes(term)) ||
                           (m.constituencyCode && m.constituencyCode.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && m.assemblyConstituency.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && getAssemblyCode(m.assemblyConstituency).toLowerCase().includes(term)) ||
                           (m.district && districtMap.get(m.district)?.includes(term));
      const matchesDistrict = districtFilter === 'all' || m.district === districtFilter;
      
      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        const typeStr = String(m.membership_type || m.membershipType || '').toUpperCase();
        const memId = String(m.membershipId || '').toUpperCase();
        const isLife = typeStr.includes('LIFE') || memId.includes('-LIFE-') || memId.startsWith('HCRS-LIFE') || memId.includes('-LM-') || !!(m as any).isLifeMember;
        if (categoryFilter === 'LIFE_MEMBER') {
          matchesCategory = isLife;
        } else if (categoryFilter === 'ADHOC_MEMBER') {
          matchesCategory = !isLife;
        }
      }
      
      return matchesSearch && matchesDistrict && matchesCategory && hasValidity(m);
    });

    // De-duplicate by mobile number to show only the live/newest one
    const groups = new Map<string, UserProfile[]>();
    for (const m of filtered) {
      const mob = (m.mobile || '').trim().replace(/\D/g, '');
      if (!mob) continue;
      if (!groups.has(mob)) {
        groups.set(mob, []);
      }
      groups.get(mob)!.push(m);
    }

    const result: UserProfile[] = [];
    const processedMobs = new Set<string>();

    for (const m of filtered) {
      const mob = (m.mobile || '').trim().replace(/\D/g, '');
      if (!mob) {
        result.push(m);
        continue;
      }
      if (processedMobs.has(mob)) continue;
      processedMobs.add(mob);

      const group = groups.get(mob)!;
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        const best = group.sort((a, b) => {
          const statusA = a.status || '';
          const statusB = b.status || '';
          if (statusA === 'active' && statusB !== 'active') return -1;
          if (statusB === 'active' && statusA !== 'active') return 1;

          const expA = a.expiryDate ? (a.expiryDate.toDate ? a.expiryDate.toDate().getTime() : new Date(a.expiryDate).getTime()) : 0;
          const expB = b.expiryDate ? (b.expiryDate.toDate ? b.expiryDate.toDate().getTime() : new Date(b.expiryDate).getTime()) : 0;
          if (expA !== expB) return expB - expA;

          const regA = a.registrationDate ? (a.registrationDate.toDate ? a.registrationDate.toDate().getTime() : new Date(a.registrationDate).getTime()) : 0;
          const regB = b.registrationDate ? (b.registrationDate.toDate ? b.registrationDate.toDate().getTime() : new Date(b.registrationDate).getTime()) : 0;
          return regB - regA;
        })[0];
        result.push(best);
      }
    }

    return result;
  }, [members, searchTerm, districtFilter, categoryFilter]);

  const paginatedValidActiveMembers = useMemo(() => {
    const startIndex = (validActivePage - 1) * itemsPerPage;
    return filteredValidActiveMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredValidActiveMembers, validActivePage, itemsPerPage]);


  const pendingRequests = useMemo(() => {
    return members.filter(m => {
      if (m.status !== 'pending' || m.renewalPending) return false;
      
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
                           (m.name && m.name.toLowerCase().includes(term)) || 
                           (m.mobile && String(m.mobile).includes(term)) ||
                           (m.membershipId && m.membershipId.toLowerCase().includes(term)) ||
                           (m.email && m.email.toLowerCase().includes(term)) ||
                           (m.constituencyCode && m.constituencyCode.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && m.assemblyConstituency.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && getAssemblyCode(m.assemblyConstituency).toLowerCase().includes(term)) ||
                           (m.district && DISTRICTS.find(d => d.code === m.district)?.name.toLowerCase().includes(term));
      const matchesDistrict = districtFilter === 'all' || m.district === districtFilter;
      
      let matchesSource = true;
      if (sourceFilter === 'online') {
        matchesSource = !m.registeredBy;
      } else if (sourceFilter === 'manual') {
        matchesSource = !!m.registeredBy;
      }
      
      return matchesSearch && matchesDistrict && matchesSource;
    });
  }, [members, searchTerm, districtFilter, sourceFilter]);

   const filteredClaims = useMemo(() => {
    const term = claimSearchTerm.toLowerCase().trim();
    return claims.filter(c => {
      const matchesSearch = !term || 
                           (c.userName && c.userName.toLowerCase().includes(term)) || 
                           (c.userMobile && String(c.userMobile).includes(term)) ||
                           (c.membershipId && c.membershipId.toLowerCase().includes(term)) ||
                           (c.highrichId && c.highrichId.toLowerCase().includes(term)) ||
                           (c.tokenNo && String(c.tokenNo).toLowerCase().includes(term)) ||
                           (c.serialNo && String(c.serialNo).toLowerCase().includes(term));
      
      const cDist = c.userDistrict || c.district || '';
      const matchesDistrict = claimDistrictFilter === 'all' || getDistrictCode(cDist) === claimDistrictFilter;
      const matchesPriority = claimPriorityFilter === 'all' || c.priorityStatus === claimPriorityFilter;
      const matchesCategory = claimCategoryFilter === 'all' || 
                              (claimCategoryFilter === 'consignment' 
                                ? (c.categories?.includes('consignment') || c.categories?.includes('ott') || c.categories?.includes('grocery'))
                                : c.categories?.includes(claimCategoryFilter));

      let matchesType = true;
      if (claimTypeFilter === 'combo') {
        matchesType = isComboClaim(c, claims);
      } else if (claimTypeFilter === 'single') {
        matchesType = !isComboClaim(c, claims);
      }

      return matchesSearch && matchesDistrict && matchesPriority && matchesCategory && matchesType;
    });
  }, [claims, claimSearchTerm, claimDistrictFilter, claimPriorityFilter, claimCategoryFilter, claimTypeFilter]);

  const comboGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      mobile: string;
      primaryName: string;
      memberObj?: UserProfile;
      claims: any[];
      totalPaid: number;
      totalReceived: number;
      totalPending: number;
      isEmergency: boolean;
      highestPriority: string;
      district: string;
      membershipId: string;
    }> = [];

    // Group filtered claims
    for (const c of filteredClaims) {
      // Find matching group by mobile, membershipId, or distinct valid uid
      let grp = groups.find(g => {
        const sameMob = compareMobiles(g.mobile, c.userMobile) || 
                        (g.memberObj?.mobile && compareMobiles(g.memberObj.mobile, c.userMobile)) || 
                        g.claims.some(existing => compareMobiles(existing.userMobile, c.userMobile));
        const sameMem = g.membershipId && c.membershipId && g.membershipId !== 'N/A' && g.membershipId !== 'PENDING' && g.membershipId.toLowerCase() === c.membershipId.toLowerCase();
        const sameUid = c.uid && !c.uid.startsWith('offline_claim_') && c.uid !== 'offline_admin' && 
                        (g.claims.some(existing => existing.uid === c.uid) || g.memberObj?.uid === c.uid);
        return sameMob || sameMem || sameUid;
      });

      if (!grp) {
        const memberObj = members.find(m => 
          (c.uid && m.uid === c.uid && !m.uid.startsWith('offline_claim_') && m.uid !== 'offline_admin') || 
          compareMobiles(m.mobile, c.userMobile) || 
          (c.membershipId && c.membershipId !== 'N/A' && m.membershipId && m.membershipId.toLowerCase() === c.membershipId.toLowerCase())
        );
        grp = {
          key: c.userMobile || c.membershipId || c.uid || c.id || String(Math.random()),
          mobile: c.userMobile || memberObj?.mobile || '',
          primaryName: memberObj?.name || c.userName || 'N/A',
          memberObj,
          claims: [],
          totalPaid: 0,
          totalReceived: 0,
          totalPending: 0,
          isEmergency: false,
          highestPriority: 'GREEN',
          district: c.userDistrict || memberObj?.district || 'KSD',
          membershipId: c.membershipId || memberObj?.membershipId || 'N/A'
        };
        groups.push(grp);
      }

      // If memberObj was not found before but we can match now
      if (!grp.memberObj) {
        grp.memberObj = members.find(m => 
          (c.uid && m.uid === c.uid && !m.uid.startsWith('offline_claim_') && m.uid !== 'offline_admin') || 
          compareMobiles(m.mobile, c.userMobile) || 
          compareMobiles(m.mobile, grp!.mobile) ||
          (grp!.membershipId && grp!.membershipId !== 'N/A' && m.membershipId && m.membershipId.toLowerCase() === grp!.membershipId.toLowerCase())
        );
        if (grp.memberObj && (!grp.primaryName || grp.primaryName === 'N/A')) {
          grp.primaryName = grp.memberObj.name;
        }
      }

      // Prevent duplicate claims in the same combo group
      if (!grp.claims.some(existing => existing.id === c.id)) {
        grp.claims.push(c);
        grp.totalPaid += (c.totalPaid || 0);
        grp.totalReceived += (c.totalReceived || 0);
        grp.totalPending += (c.totalPending || 0);
        if (c.isEmergency) grp.isEmergency = true;
        if (c.priorityStatus === 'EMERGENCY RED') grp.highestPriority = 'EMERGENCY RED';
        else if (c.priorityStatus === 'RED' && grp.highestPriority !== 'EMERGENCY RED') grp.highestPriority = 'RED';
        else if (c.priorityStatus === 'ORANGE' && !['EMERGENCY RED', 'RED'].includes(grp.highestPriority)) grp.highestPriority = 'ORANGE';
      }
    }

    // Include groups with more than 1 claim OR any group containing a claim with non-Self relation / isCombo
    return groups
      .filter(grp => grp.claims.length > 1 || grp.claims.some(c => isComboClaim(c, claims)))
      .sort((a, b) => b.totalPending - a.totalPending);
  }, [filteredClaims, members, claims]);

  const allComboIndividualClaims = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();
    for (const grp of comboGroups) {
      for (const c of grp.claims) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          list.push(c);
        }
      }
    }
    return list;
  }, [comboGroups]);

  const claimStats = useMemo(() => {
    let totalPending = 0;
    let emergencyCount = 0;
    const projectCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};

    claims.forEach(c => {
      totalPending += c.totalPending || 0;
      if (c.isEmergency) emergencyCount++;
      
      if (c.categories) {
        c.categories.forEach((cat: string) => {
          projectCounts[cat] = (projectCounts[cat] || 0) + 1;
        });
      }

      const pStatus = c.priorityStatus || 'UNKNOWN';
      priorityCounts[pStatus] = (priorityCounts[pStatus] || 0) + 1;
    });

    return { totalPending, emergencyCount, projectCounts, priorityCounts };
  }, [claims]);

  const pendingRenewals = useMemo(() => {
    return members.filter(m => {
      if (approvedRenewalUids.includes(m.uid)) return false;
      if (!(m as any).renewalPending) return false;
      
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
                           (m.name && m.name.toLowerCase().includes(term)) || 
                           (m.mobile && String(m.mobile).includes(term)) ||
                           (m.membershipId && m.membershipId.toLowerCase().includes(term)) ||
                           (m.email && m.email.toLowerCase().includes(term)) ||
                           (m.constituencyCode && m.constituencyCode.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && m.assemblyConstituency.toLowerCase().includes(term)) ||
                           (m.assemblyConstituency && getAssemblyCode(m.assemblyConstituency).toLowerCase().includes(term)) ||
                           (m.district && DISTRICTS.find(d => d.code === m.district)?.name.toLowerCase().includes(term));
      const matchesDistrict = districtFilter === 'all' || m.district === districtFilter;
      
      let matchesSource = true;
      if (sourceFilter === 'online') {
        matchesSource = !m.registeredBy;
      } else if (sourceFilter === 'manual') {
        matchesSource = !!m.registeredBy;
      }
      
      return matchesSearch && matchesDistrict && matchesSource;
    });
  }, [members, searchTerm, districtFilter, sourceFilter, approvedRenewalUids]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredMembers.map(m => ({
      membershipId: m.membershipId,
      'Name': m.name,
      'Mobile': m.mobile,
      'Email': m.email,
      'Highrich ID': m.highrichId,
      'District': m.district,
      'Assembly': m.assemblyConstituency,
      'Blood Group': m.bloodGroup,
      'Status': m.status,
      'Is Paid': m.isPaid ? 'Yes' : 'No',
      'Registration Date': m.registrationDate?.toDate ? m.registrationDate.toDate().toLocaleDateString() : new Date(m.registrationDate).toLocaleDateString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, `HCRS_Members_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-blue/10 w-full max-w-full overflow-x-hidden">
      {/* LEFT SIDEBAR (Desktop) - Stripe/Notion Minimalist Glassmorphism */}
      <aside className="hidden lg:flex flex-col w-72 bg-white/70 backdrop-blur-xl border-r border-slate-200/50 h-screen sticky top-0 shrink-0 select-none z-30 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3.5">
          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 shrink-0">
            <Logo size="sm" className="h-8 w-auto" />
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-800 tracking-tight uppercase">HCRS Society</h1>
            <p className="text-[8px] font-bold text-brand-magenta tracking-widest uppercase mt-0.5">Kerala Division</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <p className="px-3.5 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Core Operations</p>
          
          <button
            onClick={() => setActiveTab2('list')}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'list' 
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <Users className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'list' ? 'text-white' : 'text-brand-blue')} />
              <span>Member Directory</span>
            </div>
            {stats.active > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'list' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              )}>
                {stats.active}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab2('requests')}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'requests' 
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <UserPlus className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'requests' ? 'text-white' : 'text-orange-500')} />
              <span>New Requests</span>
            </div>
            {stats.pending > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'requests' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700'
              )}>
                {stats.pending}
              </span>
            )}
          </button>

          {/* Pending Renewals */}
          <button
            onClick={() => setActiveTab2('requests')}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'requests' && pendingRenewals.length > 0
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/15" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <RefreshCw className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'requests' && pendingRenewals.length > 0 ? 'text-white animate-spin-slow' : 'text-amber-500')} />
              <span>Pending Renewals (റിന്യൂവൽ)</span>
            </div>
            {pendingRenewals.length > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'requests' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
              )}>
                {pendingRenewals.length}
              </span>
            )}
          </button>

          {/* Individual Claims */}
          <button
            onClick={() => {
              setActiveTab2('claims');
              setClaimsViewMode('individual');
            }}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'claims' && claimsViewMode === 'individual'
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <FileText className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'claims' && claimsViewMode === 'individual' ? 'text-white' : 'text-blue-600')} />
              <span>Individual Claims (ഇൻഡിവിജ്വൽ)</span>
            </div>
            {claims.length > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'claims' && claimsViewMode === 'individual' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-800'
              )}>
                {claims.length}
              </span>
            )}
          </button>

          {/* Common / Combo Claims */}
          <button
            onClick={() => {
              setActiveTab2('claims');
              setClaimsViewMode('combo');
            }}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'claims' && claimsViewMode === 'combo'
                ? "bg-brand-magenta text-white shadow-md shadow-brand-magenta/15" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <Users className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'claims' && claimsViewMode === 'combo' ? 'text-white' : 'text-brand-magenta')} />
              <span>Common Claims (കോമൺ / കോംബോ)</span>
            </div>
            {comboGroups.length > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'claims' && claimsViewMode === 'combo' ? 'bg-white/25 text-white' : 'bg-pink-100 text-brand-magenta'
              )}>
                {comboGroups.length}
              </span>
            )}
          </button>

          {/* Life Members */}
          <button
            onClick={() => setActiveTab2('life_members')}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'life_members' 
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/10" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <Crown className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'life_members' ? 'text-white' : 'text-amber-500')} />
              <span>Life Members (ലൈഫ്)</span>
            </div>
          </button>

          {/* Fast Entry */}
          <button
            onClick={() => setActiveTab2('fast_entry')}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'fast_entry' 
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <Plus className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'fast_entry' ? 'text-white' : 'text-emerald-600')} />
              <span>Fast Member Entry</span>
            </div>
          </button>

          <div className="pt-3 border-t border-slate-100 mt-3 space-y-1.5">
            <p className="px-3.5 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Management & Finance</p>
            
            <button
              onClick={() => setActiveTab2('payment_ops')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'payment_ops' 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Wallet className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'payment_ops' ? 'text-white' : 'text-emerald-500')} />
                <span className="font-extrabold">Payment Operations</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-800">
                Ops
              </span>
            </button>

            <button
              onClick={() => setActiveTab2('reports')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'reports' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'reports' ? 'text-white' : 'text-indigo-500')} />
                <span>Reports & Analytics</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('committee_mgmt')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'committee_mgmt' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Users className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'committee_mgmt' ? 'text-white' : 'text-slate-500')} />
                <span>Committee Members</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('campaign_templates')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'campaign_templates' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Mail className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'campaign_templates' ? 'text-white' : 'text-purple-500')} />
                <span>📧 Operation Janamail</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('district_wa')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'district_wa' 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'district_wa' ? 'text-white' : 'text-emerald-500')} />
                <span>WhatsApp Groups</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('district_quota')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'district_quota' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Sliders className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'district_quota' ? 'text-white' : 'text-amber-500')} />
                <span>District Quotas & URLs</span>
              </div>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 space-y-1.5">
            <p className="px-3.5 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Data & System Tools</p>
            
            <button
              onClick={() => setActiveTab2('bulk_import')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'bulk_import' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Database className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'bulk_import' ? 'text-white' : 'text-slate-500')} />
                <span>Import Old Members</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('gallery')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'gallery' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Camera className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'gallery' ? 'text-white' : 'text-slate-500')} />
                <span>Photo Gallery</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('backup_restore')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'backup_restore' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'backup_restore' ? 'text-white' : 'text-slate-500')} />
                <span>Backup & Restore</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('branding')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'branding' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'branding' ? 'text-white' : 'text-slate-500')} />
                <span>Branding Settings</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab2('language')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
                activeTab === 'language' 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'language' ? 'text-white' : 'text-slate-500')} />
                <span>Language Settings</span>
              </div>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          {onViewCard && (
            <Button 
              onClick={onViewCard} 
              variant="outline" 
              className="w-full h-10 text-[9px] font-black rounded-lg tracking-wider uppercase border-brand-magenta/30 bg-brand-magenta/5 text-brand-magenta hover:bg-brand-magenta/10 hover:text-brand-magenta transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              എന്റെ ഐഡി കാർഡ് (My Card)
            </Button>
          )}
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full h-10 text-[9px] font-black rounded-lg tracking-wider uppercase text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            Logout Session
          </Button>
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-200">
          <div className="w-72 bg-white h-screen flex flex-col shadow-2xl relative animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Logo size="sm" className="h-7 w-auto" />
                <span className="text-[10px] font-black text-slate-800 uppercase">HCRS Admin</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileSidebarOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-150 text-slate-450"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
              <button 
                onClick={() => { setActiveTab2('list'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'list' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-brand-blue" />
                  <span>Member Directory</span>
                </div>
                {stats.active > 0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-slate-100 text-slate-600">{stats.active}</span>}
              </button>
              
              <button 
                onClick={() => { setActiveTab2('requests'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'requests' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-4 h-4 text-orange-500" />
                  <span>New Requests</span>
                </div>
                {stats.pending > 0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-100 text-orange-700">{stats.pending}</span>}
              </button>

              <button 
                onClick={() => { setActiveTab2('requests'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'requests' && pendingRenewals.length > 0 ? 'bg-amber-100 text-amber-900 font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-amber-500" />
                  <span>Pending Renewals (റിന്യൂവൽ)</span>
                </div>
                {pendingRenewals.length > 0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white">{pendingRenewals.length}</span>}
              </button>

              <button 
                onClick={() => { setActiveTab2('claims'); setClaimsViewMode('individual'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'claims' && claimsViewMode === 'individual' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Individual Claims (ഇൻഡിവിജ്വൽ)</span>
                </div>
                {claims.length > 0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-100 text-blue-800">{claims.length}</span>}
              </button>

              <button 
                onClick={() => { setActiveTab2('claims'); setClaimsViewMode('combo'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'claims' && claimsViewMode === 'combo' ? 'bg-brand-magenta/10 text-brand-magenta font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-brand-magenta" />
                  <span>Common Claims (കോമൺ / കോംബോ)</span>
                </div>
                {comboGroups.length > 0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-pink-100 text-brand-magenta">{comboGroups.length}</span>}
              </button>

              <button 
                onClick={() => { setActiveTab2('life_members'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'life_members' ? 'bg-amber-100 text-amber-900 font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Life Members (ലൈഫ്)</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('fast_entry'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'fast_entry' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Fast Member Entry</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('payment_ops'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'payment_ops' ? 'bg-emerald-600 text-white font-black' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                )}
              >
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="font-extrabold">💳 Payment Operations</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('reports'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'reports' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                <span>Reports & Analytics</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('committee_mgmt'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'committee_mgmt' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span>Committee Members</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('campaign_templates'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'campaign_templates' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Mail className="w-4 h-4 text-purple-500" />
                <span>📧 Operation Janamail</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('district_wa'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'district_wa' ? 'bg-emerald-100 text-emerald-900 font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <span>WhatsApp Groups</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('district_quota'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'district_quota' ? 'bg-amber-100 text-amber-900 font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>District Quotas & URLs</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('gallery'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'gallery' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Camera className="w-4 h-4 text-slate-500" />
                <span>Photo Gallery</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('branding'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'branding' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Branding Settings</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('language'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'language' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Globe className="w-4 h-4 text-slate-500" />
                <span>Language Settings</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('bulk_import'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'bulk_import' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Database className="w-4 h-4 text-slate-500" />
                <span>Import Old Members</span>
              </button>

              <button 
                onClick={() => { setActiveTab2('backup_restore'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'backup_restore' ? 'bg-brand-blue/10 text-brand-blue font-black' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Backup & Restore</span>
              </button>
            </nav>
            <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
               {onViewCard && (
                 <Button 
                   onClick={() => { setMobileSidebarOpen(false); onViewCard(); }} 
                   variant="outline" 
                   className="w-full h-10 text-[9px] font-black rounded-xl tracking-wider uppercase border-brand-magenta/30 bg-brand-magenta/5 text-brand-magenta hover:bg-brand-magenta/10 hover:text-brand-magenta transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                 >
                   <Smartphone className="w-3.5 h-3.5" />
                   എന്റെ ഐഡി കാർഡ് (My Card)
                 </Button>
               )}
               <button 
                 onClick={handleLogout}
                 className="w-full h-10 text-[9px] font-black text-red-550 uppercase tracking-widest text-center cursor-pointer"
               >
                 Sign Out
               </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT SIDE WORKSPACE */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto overflow-x-hidden bg-slate-50 w-full max-w-full">
        {/* MOBILE HEADER */}
        <header className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200/50 px-4 sm:px-5 h-14 sticky top-0 z-40 shadow-sm w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)} className="text-slate-700 h-9 w-9 rounded-full shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <Logo size="sm" className="h-[20px] w-auto shrink-0" />
            <span className="font-black text-[9px] uppercase tracking-widest text-slate-400 truncate">Admin Console</span>
          </div>
        </header>

        {/* CENTRAL CONTAINER */}
        <div className="p-3 sm:p-4 md:p-8 space-y-6 max-w-[1500px] w-full mx-auto pb-24 min-w-0 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6 w-full min-w-0">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200/50 pb-8 w-full min-w-0">
          <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0 w-full md:w-auto">
             <div className="bg-white p-1.5 rounded-xl shadow-xs border border-slate-100 shrink-0">
               <Logo size="sm" className="h-8 w-auto" />
             </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight leading-none break-words">
                    {isSecondary ? 'District Executive' : 'Admin Console'}
                  </h1>
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingMember(user)}
                      className="rounded-lg h-7 px-2.5 border-slate-200 text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xs shrink-0"
                    >
                      <Eye className="w-3 h-3 mr-1 text-brand-blue" />
                      View Card
                    </Button>
                  )}
                </div>
                {isSecondary ? (
                  <p className="text-brand-magenta mt-1.5 text-[9px] font-bold tracking-widest uppercase flex items-center gap-1.5 leading-none break-words">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                    Operator: {manualFormData.certAdminName || user?.name || 'Administrator'}
                  </p>
                ) : (
                  <p className="text-slate-400 mt-1.5 text-[9px] font-bold tracking-widest uppercase leading-none break-words">
                    Highrich Community Revival Society Kerala
                  </p>
                )}
              </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto min-w-0">
            <div className="hidden lg:flex flex-col items-end gap-0.5 px-4 border-r border-slate-250">
               <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Public registration address</p>
               <p className="text-[9px] font-black text-brand-blue truncate max-w-[200px] font-mono select-all">
                 {STABLE_URL.replace('https://', '')}
               </p>
            </div>
            <Button 
                onClick={() => {
                    navigator.clipboard.writeText(STABLE_URL);
                    toast.success('Public Registration Address copied!');
                }}
                variant="outline" 
                className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-4 border border-slate-200 bg-white shadow-xs font-black rounded-xl hover:bg-slate-50 text-[9px] uppercase tracking-wider text-center whitespace-normal break-words max-w-full"
            >
              Copy link
            </Button>
            {!isSecondary && (
              <Button onClick={exportToExcel} variant="outline" className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-4 border border-slate-200 bg-white shadow-xs font-black rounded-xl hover:bg-slate-50 text-[9px] uppercase tracking-wider text-center whitespace-normal break-words max-w-full">
                <Download className="w-4 h-4 mr-1 text-slate-500 shrink-0 inline" />
                Export
              </Button>
            )}
            {!isSecondary && (
              <Button 
                onClick={() => setIsManualEntryOpen(true)}
                className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-5 font-bold rounded-xl shadow-sm transition-all text-[9px] uppercase tracking-wider bg-brand-magenta text-white hover:bg-brand-magenta/95 text-center whitespace-normal break-words max-w-full"
              >
                <UserPlus className="w-4 h-4 mr-1 shrink-0 inline" />
                Add Member
              </Button>
            )}
            {!isSecondary && (
              <Button 
                onClick={() => setIsDomainKeyModalOpen(true)}
                variant="outline"
                className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-4 border-brand-blue/35 text-brand-blue hover:bg-brand-blue/5 font-black rounded-xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 text-center whitespace-normal break-words max-w-full"
              >
                <KeyRound className="w-4 h-4 text-brand-blue shrink-0 inline" />
                <span>Set Domain PIN (പാസ്‌വേഡ്)</span>
              </Button>
            )}
            {!isSecondary && (
              <Button 
                onClick={() => setActiveTab2('campaign_templates')}
                variant="outline"
                className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-4 border-brand-blue/35 text-brand-blue hover:bg-brand-blue/5 font-black rounded-xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer animate-pulse text-center whitespace-normal break-words max-w-full"
              >
                <span>📧 Operation Janamail</span>
              </Button>
            )}
            {onViewCard && (
              <Button 
                onClick={onViewCard} 
                variant="outline" 
                className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-4 border border-brand-magenta/30 bg-brand-magenta/5 text-brand-magenta font-black rounded-xl hover:bg-brand-magenta/10 text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer animate-pulse text-center whitespace-normal break-words max-w-full"
              >
                <Smartphone className="w-4 h-4 text-brand-magenta shrink-0 inline" />
                <span>എന്റെ ഐഡി കാർഡ് (My Card)</span>
              </Button>
            )}
            {onRefreshMembers && (
              <Button 
                onClick={async () => {
                  onRefreshMembers();
                  await refreshClaimsList(false);
                }} 
                disabled={isSyncingMembers || isSyncingClaims}
                variant="outline" 
                className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-4 border-emerald-500/40 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 font-bold rounded-xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 text-center whitespace-normal break-words max-w-full"
                title="ഡാറ്റാബേസിൽ നിന്ന് എല്ലാ അംഗങ്ങളുടെയും ക്ലെയിമുകളുടെയും വിവരങ്ങൾ പുതുക്കുക"
              >
                <RefreshCw className={cn("w-4 h-4 text-emerald-600 shrink-0 inline", (isSyncingMembers || isSyncingClaims) && "animate-spin")} />
                <span>{(isSyncingMembers || isSyncingClaims) ? 'സിങ്ക് ചെയ്യുന്നു...' : 'ഡാറ്റാബേസ് സിങ്ക് (Sync DB)'}</span>
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto flex-1 sm:flex-none min-h-10 h-auto py-2 px-3 md:h-10 md:py-0 md:px-4 border-red-100 hover:bg-red-50/50 text-red-500 font-bold rounded-xl text-[9px] uppercase tracking-wider text-center whitespace-normal break-words max-w-full">
              <LogOut className="w-4 h-4 mr-1 text-red-400 shrink-0 inline" />
              Logout
            </Button>
          </div>
        </header>

        {/* TOP QUICK NAVIGATION TABS BAR - Always accessible on all screen sizes */}
        <div className="w-full min-w-0 max-w-full overflow-x-auto py-2.5 px-1 scrollbar-thin border-b border-slate-200/70 bg-white/60 backdrop-blur-md rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 w-max min-w-full">
            <button
              onClick={() => setActiveTab2('list')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'list'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member Directory</span>
            {stats.active > 0 && (
              <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeTab === 'list' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700')}>
                {stats.active}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab2('requests')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'requests'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <UserPlus className="w-3.5 h-3.5 text-orange-500" />
            <span>New Requests</span>
            {stats.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-orange-100 text-orange-800 animate-pulse">
                {stats.pending}
              </span>
            )}
          </button>

          {pendingRenewals.length > 0 && (
            <button
              onClick={() => setActiveTab2('requests')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                activeTab === 'requests'
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70"
              )}
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
              <span>🔄 Pending Renewals (റിന്യൂവൽ)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                {pendingRenewals.length}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab2('claims');
              setClaimsViewMode('individual');
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'claims' && claimsViewMode === 'individual'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-blue-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/50"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📄 Individual Claims (ഇൻഡിവിജ്വൽ)</span>
            {claims.length > 0 && (
              <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeTab === 'claims' && claimsViewMode === 'individual' ? 'bg-white/25 text-white' : 'bg-blue-200 text-blue-900')}>
                {claims.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab2('claims');
              setClaimsViewMode('combo');
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'claims' && claimsViewMode === 'combo'
                ? "bg-brand-magenta text-white shadow-sm"
                : "text-pink-700 bg-pink-50/70 hover:bg-pink-100 hover:text-pink-900 border border-pink-200/50"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 Common Claims (കോമൺ / കോംബോ)</span>
            {comboGroups.length > 0 && (
              <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeTab === 'claims' && claimsViewMode === 'combo' ? 'bg-white/25 text-white' : 'bg-pink-200 text-pink-900')}>
                {comboGroups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab2('payment_ops')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'payment_ops'
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50"
            )}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>💳 Payment Operations</span>
          </button>

          <button
            onClick={() => setActiveTab2('life_members')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'life_members'
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Life Members</span>
          </button>

          <button
            onClick={() => setActiveTab2('reports')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'reports'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => setActiveTab2('fast_entry')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'fast_entry'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fast Entry</span>
          </button>

          <button
            onClick={() => setActiveTab2('bulk_import')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'bulk_import'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>

          <button
            onClick={() => setActiveTab2('committee_mgmt')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'committee_mgmt'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Committee</span>
          </button>

          <button
            onClick={() => setActiveTab2('campaign_templates')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'campaign_templates'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Mail className="w-3.5 h-3.5 text-purple-500" />
            <span>Janamail</span>
          </button>

          <button
            onClick={() => setActiveTab2('district_wa')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'district_wa'
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab2('district_quota')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'district_quota'
                ? "bg-amber-500 text-white shadow-sm font-black"
                : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60"
            )}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>District Quotas & URLs</span>
          </button>

          <button
            onClick={() => setActiveTab2('gallery')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'gallery'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span>Photo Gallery</span>
          </button>

          <button
            onClick={() => setActiveTab2('branding')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'branding'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Branding Settings</span>
          </button>

          <button
            onClick={() => setActiveTab2('backup_restore')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === 'backup_restore'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
          </div>
        </div>

        {/* MAIN ADMIN WORKSPACE TABS */}
        <div className="space-y-6">
            {/* 1. MEMBER DIRECTORY TAB */}
            {activeTab === 'list' && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard title="Total Members" value={stats.total} icon={<Users />} color="brand-blue" />
                  <StatsCard title="Active & Valid" value={stats.active} icon={<CheckCircle2 />} color="green" />
                  <StatsCard title="Pending Requests" value={stats.pending} icon={<Clock />} color="orange" />
                  <StatsCard title="Total Paid" value={stats.paid} icon={<IndianRupee />} color="brand-magenta" />
                </div>

                {/* Filter and Search Bar */}
                <Card className="border border-slate-200/60 bg-white rounded-2xl shadow-xs p-4 w-full min-w-0 max-w-full">
                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between w-full min-w-0">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        type="text"
                        placeholder="Search name, mobile, ID, assembly..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 rounded-xl text-xs font-bold w-full"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto min-w-0">
                      <Select value={districtFilter} onValueChange={setDistrictFilter}>
                        <SelectTrigger className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto sm:min-w-[130px] bg-slate-50 flex-1 sm:flex-none">
                          <SelectValue placeholder="All Districts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Districts (എല്ലാ ജില്ലകളും)</SelectItem>
                          {DISTRICTS.map(d => (
                            <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto sm:min-w-[110px] bg-slate-50 flex-1 sm:flex-none">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto sm:min-w-[110px] bg-slate-50 flex-1 sm:flex-none">
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="online">Public Online</SelectItem>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button onClick={exportToExcel} variant="outline" size="sm" className="h-10 rounded-xl font-bold text-xs w-full sm:w-auto flex-1 sm:flex-none">
                        <Download className="w-4 h-4 mr-1 text-slate-500" />
                        Excel Export
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Member Table */}
                <Card className="border border-slate-200/60 bg-white rounded-2xl shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                  <div className="overflow-x-auto w-full min-w-0 max-w-full">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="w-12 text-[10px] font-black uppercase text-slate-400">#</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400">Member Info</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400">District & Assembly</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400">Contact</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400">Status</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase text-slate-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isSyncingMembers && members.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                              <div className="flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                                <p className="font-bold text-slate-800 text-sm">ഡാറ്റാബേസിൽ നിന്ന് അംഗങ്ങളുടെ വിവരങ്ങൾ ശേഖരിക്കുന്നു...</p>
                                <p className="text-slate-400 text-xs">Loading database records (~8,000 members). Please wait...</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : members.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                              <div className="flex flex-col items-center justify-center gap-3">
                                <Users className="w-10 h-10 text-slate-300" />
                                <p className="font-bold text-slate-800 text-sm">ഡാറ്റാബേസ് എൻട്രികൾ ലോഡ് ചെയ്തിട്ടില്ല</p>
                                <p className="text-slate-400 text-xs">താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്ത് ഡാറ്റാബേസ് വിവരങ്ങൾ വീണ്ടും ലോഡ് ചെയ്യുക.</p>
                                {onRefreshMembers && (
                                  <Button 
                                    size="sm" 
                                    onClick={onRefreshMembers}
                                    className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-xl text-xs mt-1 max-w-full whitespace-normal break-words h-auto py-2 px-3 text-center"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 shrink-0 inline" />
                                    <span>ഡാറ്റാബേസ് ലോഡ് ചെയ്യുക (Load Database)</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedMembers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-medium text-xs">
                              <p className="font-bold text-slate-700 text-sm mb-1">തിരഞ്ഞെടുത്ത ഫിൽട്ടറുകൾ പ്രകാരം അംഗങ്ങളെ കണ്ടെത്തിയില്ല</p>
                              <p className="text-slate-400 text-xs mb-3">ആകെ {members.length} അംഗങ്ങൾ ഡാറ്റാബേസിലുണ്ട്. ഫിൽട്ടറുകൾ മാറ്റുകയോ റീസെറ്റ് ചെയ്യുകയോ ചെയ്യുക.</p>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => { setSearchTerm(''); setDistrictFilter('all'); setStatusFilter('all'); setCategoryFilter('all'); setSourceFilter('all'); }} 
                                className="text-xs font-bold text-brand-blue border-brand-blue/30 rounded-xl max-w-full whitespace-normal break-words h-auto py-2 px-3 text-center"
                              >
                                ഫിൽട്ടറുകൾ റീസെറ്റ് ചെയ്യുക (Reset Filters)
                              </Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedMembers.map((m, idx) => (
                            <TableRow key={m.uid} className="hover:bg-slate-50/50">
                              <TableCell className="font-mono text-xs text-slate-400">
                                {(currentPage - 1) * 10 + idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 rounded-xl border border-slate-100">
                                    <AvatarImage src={m.photoUrl} alt={m.name} />
                                    <AvatarFallback className="text-[10px] font-black bg-brand-blue/10 text-brand-blue">
                                      {m.name?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                                      {m.name}
                                      {m.membershipId && (
                                        <Badge variant="outline" className="text-[8px] font-mono font-black py-0 h-4 bg-slate-50">
                                          {m.membershipId}
                                        </Badge>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">HR: {m.highrichId || 'N/A'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-xs font-bold text-slate-700">
                                  {DISTRICTS.find(d => d.code === m.district)?.name || m.district}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {m.assemblyConstituency || 'N/A'}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="font-mono text-xs font-bold text-slate-800">{m.mobile}</p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{m.email}</p>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 items-start">
                                  <Badge 
                                    className={cn(
                                      "text-[9px] font-black uppercase px-2 py-0.5",
                                      m.status === 'active' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                                      m.status === 'pending' ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                                      "bg-red-500/10 text-red-600 border border-red-500/20"
                                    )}
                                  >
                                    {m.status}
                                  </Badge>
                                  {m.isPaid && (
                                    <span className="text-[8px] font-black text-emerald-600">✓ Paid</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewingMember(m)}
                                    className="h-8 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-brand-blue border-brand-blue/20 hover:bg-brand-blue/5"
                                    title="View ID Card"
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    Card
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger 
                                      className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                      title="More actions"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                                      <DropdownMenuItem onClick={() => setEditingMember(m)} className="text-xs font-bold">
                                        <Pencil className="w-3.5 h-3.5 mr-2 text-slate-500" /> Edit Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setSelectedReceiptsMember(m)} className="text-xs font-bold">
                                        <Receipt className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Payment Receipts
                                      </DropdownMenuItem>
                                      {onResetPin && (
                                        <DropdownMenuItem onClick={() => onResetPin(m.uid)} className="text-xs font-bold">
                                          <KeyRound className="w-3.5 h-3.5 mr-2 text-amber-600" /> Reset PIN (123456)
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem 
                                        onClick={() => handleApproveWithWhatsApp(m)} 
                                        className="text-xs font-bold text-emerald-600"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 mr-2" /> Send WhatsApp Card
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDeleteClick(m.uid)} className="text-xs font-bold text-red-600">
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Member
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {filteredMembers.length > 10 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">
                        Showing {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, filteredMembers.length)} of {filteredMembers.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="h-8 rounded-lg text-xs font-bold"
                        >
                          Previous
                        </Button>
                        <span className="text-xs font-mono font-black text-slate-700 px-2">
                          Page {currentPage} of {Math.ceil(filteredMembers.length / 10)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= Math.ceil(filteredMembers.length / 10)}
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredMembers.length / 10), prev + 1))}
                          className="h-8 rounded-lg text-xs font-bold"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* 2. PENDING REQUESTS TAB */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <Card className="border border-slate-200/60 bg-white rounded-2xl shadow-xs p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 uppercase">Pending Registrations</h3>
                      <p className="text-xs text-slate-400 font-bold">പുതിയ അംഗത്വ അപേക്ഷകൾ പരിശോധിച്ച് അംഗീകരിക്കുക</p>
                    </div>
                    <Badge variant="outline" className="text-xs font-black font-mono">
                      {pendingRequests.length} Pending
                    </Badge>
                  </div>

                  {pendingRequests.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-bold text-xs">
                      പുതിയ അംഗത്വ അപേക്ഷകൾ നിലവിലില്ല (No pending registration requests)
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map(m => (
                        <div key={m.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-xl">
                              <AvatarImage src={m.photoUrl} alt={m.name} />
                              <AvatarFallback className="bg-brand-blue/10 text-brand-blue font-bold text-xs">
                                {m.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-extrabold text-sm text-slate-800">{m.name}</p>
                              <p className="text-xs font-mono text-slate-500 font-bold">{m.mobile} • {DISTRICTS.find(d => d.code === m.district)?.name || m.district}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <Button variant="outline" size="sm" onClick={() => setViewingMember(m)} className="rounded-xl text-xs font-bold">
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => onApprove(m.uid)} 
                              className="rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeleteClick(m.uid)} 
                              className="rounded-xl text-xs font-bold"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Pending Renewals */}
                {pendingRenewals.length > 0 && (
                  <Card className="border border-slate-200/60 bg-white rounded-2xl shadow-xs p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase">Pending Renewals</h3>
                        <p className="text-xs text-slate-400 font-bold">അംഗത്വം പുതുക്കാനുള്ള അപേക്ഷകൾ</p>
                      </div>
                      <Badge variant="outline" className="text-xs font-black font-mono">
                        {pendingRenewals.length} Renewals
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {pendingRenewals.map(m => (
                        <div key={m.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-amber-50/40 rounded-2xl border border-amber-100 gap-3 w-full min-w-0">
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-slate-800 break-words">{m.name} ({m.membershipId})</p>
                            <p className="text-xs text-slate-500 font-bold break-words">{m.mobile} • {m.district}</p>
                          </div>
                          <Button 
                            size="sm" 
                            disabled={approvingRenewalUid === m.uid}
                            onClick={() => handleApproveRenewal(m)} 
                            className="w-full sm:w-auto min-h-9 h-auto py-1.5 px-3 rounded-xl text-xs font-black uppercase bg-brand-blue hover:bg-brand-blue/90 text-white shadow-sm shrink-0 whitespace-normal break-words max-w-full text-center"
                          >
                            {approvingRenewalUid === m.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 shrink-0 inline" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0 inline" />}
                            <span>Approve Renewal</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* 3. CLAIMS & COMBO CLAIMS TAB */}
            {activeTab === 'claims' && (
              <div className="space-y-6">
                {/* Claims View Switcher & Top Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs w-full min-w-0 max-w-full">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto min-w-0">
                    <Button
                      variant={claimsViewMode === 'individual' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setClaimsViewMode('individual')}
                      className={cn(
                        "rounded-lg text-xs font-black uppercase text-center whitespace-normal break-words max-w-full min-h-9 h-auto py-1.5 px-3 w-full sm:w-auto",
                        claimsViewMode === 'individual' && "bg-brand-blue text-white shadow-xs"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5 shrink-0 inline" />
                      <span>Individual Claims (ഇൻഡിവിജ്വൽ) ({claims.length})</span>
                    </Button>
                    <Button
                      variant={claimsViewMode === 'combo' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setClaimsViewMode('combo')}
                      className={cn(
                        "rounded-lg text-xs font-black uppercase text-center whitespace-normal break-words max-w-full min-h-9 h-auto py-1.5 px-3 w-full sm:w-auto",
                        claimsViewMode === 'combo' && "bg-brand-magenta text-white shadow-xs"
                      )}
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5 shrink-0 inline" />
                      <span>Common Claims (കോമൺ / കോംബോ) ({comboGroups.length} Groups)</span>
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto min-w-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshClaimsList(true)}
                      disabled={isSyncingClaims}
                      className="w-full sm:w-auto min-h-9 h-auto py-1.5 px-3 md:h-9 md:py-0 rounded-xl font-black text-xs uppercase border-emerald-600/30 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/70 text-center whitespace-normal break-words max-w-full"
                      title="ഡാറ്റാബേസിൽ നിന്ന് ക്ലെയിം പെറ്റീഷനുകൾ നേരിട്ട് സിങ്ക് ചെയ്യുക"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0 inline", isSyncingClaims && "animate-spin")} />
                      <span>{isSyncingClaims ? 'സിങ്ക് ചെയ്യുന്നു...' : 'Sync Claims from DB'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsClaimsImportOpen(true)}
                      className="w-full sm:w-auto min-h-9 h-auto py-1.5 px-3 md:h-9 md:py-0 rounded-xl font-black text-xs uppercase border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5 text-center whitespace-normal break-words max-w-full"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-brand-blue shrink-0 inline" />
                      <span>Import Old Site Claims</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncClaimsCounter}
                      className="w-full sm:w-auto min-h-9 h-auto py-1.5 px-3 md:h-9 md:py-0 rounded-xl font-bold text-xs text-slate-600 text-center whitespace-normal break-words max-w-full"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1 shrink-0 inline" />
                      <span>Sync Counters</span>
                    </Button>
                  </div>
                </div>

                {/* Stat Summaries */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard title="Total Claims" value={claims.length} icon={<FileText />} color="brand-blue" />
                  <StatsCard title="Total Pending" value={claimStats.totalPending} icon={<IndianRupee />} color="brand-magenta" />
                  <StatsCard title="Emergency Cases" value={claimStats.emergencyCount} icon={<AlertCircle />} color="red" />
                  <StatsCard title="Combo Groups" value={comboGroups.length} icon={<Users />} color="green" />
                </div>

                {/* INDIVIDUAL CLAIMS VIEW */}
                {claimsViewMode === 'individual' && (
                  <div className="space-y-4">
                    {/* Search & Filters */}
                    <Card className="p-4 border border-slate-200/60 bg-white rounded-2xl shadow-xs w-full min-w-0 max-w-full">
                      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between w-full min-w-0">
                        <div className="relative w-full md:w-80">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            type="text"
                            placeholder="Search name, mobile, Highrich ID..."
                            value={claimSearchTerm}
                            onChange={(e) => setClaimSearchTerm(e.target.value)}
                            className="pl-9 h-10 rounded-xl text-xs font-bold w-full"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto min-w-0">
                          <Select value={claimDistrictFilter} onValueChange={setClaimDistrictFilter}>
                            <SelectTrigger className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto sm:min-w-[130px] bg-slate-50 flex-1 sm:flex-none">
                              <SelectValue placeholder="All Districts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Districts</SelectItem>
                              {DISTRICTS.map(d => (
                                <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={claimCategoryFilter} onValueChange={setClaimCategoryFilter}>
                            <SelectTrigger className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto sm:min-w-[130px] bg-slate-50 flex-1 sm:flex-none">
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              <SelectItem value="digital">Digital Coupon</SelectItem>
                              <SelectItem value="ott">OTT Advance</SelectItem>
                              <SelectItem value="grocery">Grocery Advance</SelectItem>
                              <SelectItem value="goodwill">Goodwill Advance</SelectItem>
                              <SelectItem value="other">Other Advance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>

                    {/* Claims Table */}
                    <Card className="border border-slate-200/60 bg-white rounded-2xl shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                      <div className="overflow-x-auto w-full min-w-0 max-w-full">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-12 text-[10px] font-black uppercase text-slate-400">#</TableHead>
                              <TableHead className="text-[10px] font-black uppercase text-slate-400">Claimant Details</TableHead>
                              <TableHead className="text-[10px] font-black uppercase text-slate-400">Highrich ID</TableHead>
                              <TableHead className="text-[10px] font-black uppercase text-slate-400">Paid / Received / Pending</TableHead>
                              <TableHead className="text-[10px] font-black uppercase text-slate-400">Status</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase text-slate-400">Reports & Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredClaims.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-bold text-xs">
                                  ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല (No claims found matching filters)
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredClaims.map((c, idx) => {
                                const memberObj = members.find(m => m.uid === c.uid || compareMobiles(m.mobile, c.userMobile));
                                return (
                                  <TableRow key={c.id || idx} className="hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs text-slate-400">{idx + 1}</TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <p className="font-extrabold text-xs text-slate-800">{c.userName || 'N/A'}</p>
                                          {c.relationLabel && c.relation !== 'Self' && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200/60">
                                              {c.relationLabel}
                                            </span>
                                          )}
                                          {(c.membershipId?.toUpperCase().includes('-LIFE-') || c.membershipId?.toUpperCase().includes('-LM-') || memberObj?.membership_type === 'LIFE_MEMBER' || (memberObj as any)?.isLifeMember) && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-700 rounded border border-amber-500/30 flex items-center gap-0.5">
                                              <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-400" /> Life Member
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-500 font-bold mt-0.5">
                                          {c.tokenNo ? <span className="text-brand-magenta font-black mr-1">[{c.tokenNo}]</span> : null}
                                          {c.membershipId ? <span className="text-slate-600 mr-1">{c.membershipId}</span> : null}
                                          {c.userMobile} • {c.userDistrict || 'N/A'}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                        {c.highrichId || 'N/A'}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-xs">
                                        <span className="font-mono font-bold text-slate-600">₹{(c.totalPaid || 0).toLocaleString('en-IN')}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span className="font-mono font-bold text-emerald-600">₹{(c.totalReceived || 0).toLocaleString('en-IN')}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span className="font-mono font-black text-brand-magenta">₹{(c.totalPending || 0).toLocaleString('en-IN')}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {c.isEmergency ? (
                                        <Badge variant="destructive" className="text-[8px] font-black uppercase">Emergency</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[8px] font-bold">Standard</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                        {/* Court Print */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => printCourtClaimReport(c, memberObj)}
                                          className="h-7 px-2 text-[8.5px] font-black uppercase text-emerald-700 border-emerald-600/30 hover:bg-emerald-50 rounded-lg"
                                          title="Print Court / Legal Statement (1 Page A4)"
                                        >
                                          <Printer className="w-3 h-3 mr-1" /> Court Print
                                        </Button>
                                        {/* Court PDF Download */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadCourtClaimPdf(c, memberObj)}
                                          className="h-7 px-2 text-[8.5px] font-black uppercase text-emerald-700 border-emerald-600/30 hover:bg-emerald-50 rounded-lg"
                                          title="Download Court / Legal Statement PDF"
                                        >
                                          <Download className="w-3 h-3 mr-1" /> Court PDF
                                        </Button>
                                        {/* Admin Print */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => printFullAdminClaimReport(c, memberObj)}
                                          className="h-7 px-2 text-[8.5px] font-black uppercase text-brand-magenta border-brand-magenta/30 hover:bg-brand-magenta/5 rounded-lg"
                                          title="Print Full Admin Record"
                                        >
                                          <FileSpreadsheet className="w-3 h-3 mr-1" /> Admin Print
                                        </Button>
                                        {/* Admin PDF Download */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadFullAdminClaimPdf(c, memberObj)}
                                          className="h-7 px-2 text-[8.5px] font-black uppercase text-brand-magenta border-brand-magenta/30 hover:bg-brand-magenta/5 rounded-lg"
                                          title="Download Full Admin Record PDF"
                                        >
                                          <Download className="w-3 h-3 mr-1" /> Admin PDF
                                        </Button>
                                        {/* View Details */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedClaim(c)}
                                          className="h-7 px-2 text-[8.5px] font-bold uppercase rounded-lg"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </Button>
                                        {/* Edit */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingClaim(c)}
                                          className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        {/* Delete */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setDeletingClaimId(c.id)}
                                          className="h-7 w-7 p-0 rounded-lg text-red-400 hover:text-red-600"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>
                )}

                {/* COMBO CLAIMS VIEW */}
                {claimsViewMode === 'combo' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 w-full min-w-0 max-w-full">
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-800 uppercase break-words">Consolidated Family / ID Groups</h4>
                        <p className="text-[11px] text-slate-400 font-bold break-words">ഒന്നിൽ കൂടുതൽ ഐഡികൾ ഉള്ള അംഗങ്ങളുടെ സംയുക്ത റിപ്പോർട്ട്</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant={comboSubView === 'groups' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setComboSubView('groups')}
                          className="flex-1 sm:flex-none rounded-xl text-xs font-bold whitespace-normal break-words max-w-full min-h-8 h-auto py-1 px-3 text-center"
                        >
                          Groups ({comboGroups.length})
                        </Button>
                        <Button
                          variant={comboSubView === 'all_persons' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setComboSubView('all_persons')}
                          className="flex-1 sm:flex-none rounded-xl text-xs font-bold whitespace-normal break-words max-w-full min-h-8 h-auto py-1 px-3 text-center"
                        >
                          All Person Records ({allComboIndividualClaims.length})
                        </Button>
                      </div>
                    </div>

                    {comboSubView === 'groups' ? (
                      <div className="space-y-4">
                        {comboGroups.length === 0 ? (
                          <Card className="p-12 text-center text-slate-400 font-bold text-xs bg-white rounded-2xl">
                            കോംബോ ക്ലെയിമുകൾ കണ്ടെത്തിയില്ല (No multi-ID combo groups detected)
                          </Card>
                        ) : (
                          comboGroups.map((grp, gidx) => (
                            <Card key={grp.primaryMobile || gidx} className="border border-slate-200/80 bg-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 w-full min-w-0 max-w-full">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3 w-full min-w-0">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-black text-slate-900 break-words">{grp.primaryName || 'Unknown Member'}</h4>
                                    <Badge className="bg-brand-magenta/10 text-brand-magenta border-brand-magenta/20 text-[9px] font-black shrink-0">
                                      {grp.claimsCount} Claims
                                    </Badge>
                                  </div>
                                  <p className="text-xs font-mono text-slate-500 font-bold mt-0.5 break-words">
                                    Mobile: {grp.primaryMobile} • District: {grp.district || 'N/A'}
                                  </p>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto min-w-0">
                                  <div className="text-left sm:text-right font-mono">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Group Total Pending</p>
                                    <p className="text-base font-black text-brand-magenta">₹{(grp.totalPending || 0).toLocaleString('en-IN')}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                                    {/* Court Combo Print */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => printCourtComboReport(grp.claims, grp.memberObj)}
                                      className="min-h-8 h-auto py-1 px-2.5 text-[9px] font-black uppercase text-emerald-700 border-emerald-600/30 hover:bg-emerald-50 rounded-xl whitespace-normal break-words max-w-full flex-1 sm:flex-none text-center"
                                      title="Print Court / Legal Statement (1 Page A4)"
                                    >
                                      <Printer className="w-3.5 h-3.5 mr-1 shrink-0 inline" /> Court Combo Print
                                    </Button>
                                    {/* Court Combo PDF Download */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadCourtComboPdf(grp.memberObj, grp.claims)}
                                      className="min-h-8 h-auto py-1 px-2.5 text-[9px] font-black uppercase text-emerald-700 border-emerald-600/30 hover:bg-emerald-50 rounded-xl whitespace-normal break-words max-w-full flex-1 sm:flex-none text-center"
                                      title="Download Court / Legal Statement PDF"
                                    >
                                      <Download className="w-3.5 h-3.5 mr-1 shrink-0 inline" /> Court Combo PDF
                                    </Button>
                                    {/* Admin Combo Print */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => printFullAdminComboReport(grp.memberObj, grp.claims)}
                                      className="min-h-8 h-auto py-1 px-2.5 text-[9px] font-black uppercase text-brand-magenta border-brand-magenta/30 hover:bg-brand-magenta/5 rounded-xl whitespace-normal break-words max-w-full flex-1 sm:flex-none text-center"
                                      title="Print Full Admin Record"
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5 mr-1 shrink-0 inline" /> Admin Combo Print
                                    </Button>
                                    {/* Admin Combo PDF Download */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadFullAdminComboPdf(grp.memberObj, grp.claims)}
                                      className="min-h-8 h-auto py-1 px-2.5 text-[9px] font-black uppercase text-brand-magenta border-brand-magenta/30 hover:bg-brand-magenta/5 rounded-xl whitespace-normal break-words max-w-full flex-1 sm:flex-none text-center"
                                      title="Download Full Admin Record PDF"
                                    >
                                      <Download className="w-3.5 h-3.5 mr-1 shrink-0 inline" /> Admin Combo PDF
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Nested Claims Rows */}
                              <div className="bg-slate-50 rounded-xl p-3 space-y-2 w-full min-w-0 max-w-full">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Individual Accounts in this Group:</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {grp.claims.map((clm: any, cidx: number) => (
                                    <div key={clm.id || cidx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100 text-xs gap-2 min-w-0">
                                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                                        <span className="font-mono text-slate-400 shrink-0">#{cidx + 1}</span>
                                        <span className="font-extrabold text-slate-800 break-words">{clm.userName}</span>
                                        <span className="font-mono text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">{clm.highrichId || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center justify-between sm:justify-end gap-3 font-mono font-bold">
                                        <span className="text-slate-600">₹{(clm.totalPaid || 0).toLocaleString('en-IN')}</span>
                                        <span className="text-brand-magenta">₹{(clm.totalPending || 0).toLocaleString('en-IN')}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Button variant="ghost" size="sm" onClick={() => setSelectedClaim(clm)} className="h-6 w-6 p-0">
                                            <Eye className="w-3 h-3 text-slate-500" />
                                          </Button>
                                          <Button variant="ghost" size="sm" onClick={() => setEditingClaim(clm)} className="h-6 w-6 p-0">
                                            <Pencil className="w-3 h-3 text-slate-500" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    ) : (
                      /* ALL PERSONS VIEW */
                      <Card className="border border-slate-200/60 bg-white rounded-2xl shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                        <div className="overflow-x-auto w-full min-w-0 max-w-full">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400">Person Name</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400">Mobile</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400">Highrich ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400">Pending</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase text-slate-400">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allComboIndividualClaims.map((ac, idx) => (
                                <TableRow key={ac.id || idx}>
                                  <TableCell className="font-extrabold text-xs text-slate-800">{ac.userName}</TableCell>
                                  <TableCell className="font-mono text-xs text-slate-600 font-bold">{ac.userMobile}</TableCell>
                                  <TableCell className="font-mono text-xs text-slate-700">{ac.highrichId || 'N/A'}</TableCell>
                                  <TableCell className="font-mono text-xs font-black text-brand-magenta">₹{(ac.totalPending || 0).toLocaleString('en-IN')}</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedClaim(ac)} className="h-7 text-xs font-bold">
                                      <Eye className="w-3 h-3 mr-1" /> View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. OTHER SUB-MANAGERS & TABS */}
            {activeTab === 'bulk_import' && (
              <BulkImportManager members={members} adminUser={user} onRefresh={onRefreshMembers} />
            )}

            {activeTab === 'committee_mgmt' && (
              <CommitteeManagement user={user} />
            )}

            {activeTab === 'campaign_templates' && (
              <CampaignTemplateManager members={members} />
            )}

            {activeTab === 'payment_ops' && (
              <PaymentOperationsManager user={user || null} />
            )}

            {activeTab === 'reports' && (
              <AdminReportsTab 
                members={members} 
                onApprove={onApprove} 
                onViewDetails={(m) => setViewingMember(m)} 
                DISTRICTS={DISTRICTS} 
                isSuperAdmin={isSuperAdmin} 
              />
            )}

            {activeTab === 'life_members' && (
              <LifeMembersPanel members={members} adminUser={user} />
            )}

            {activeTab === 'fast_entry' && (
              <div className="space-y-6 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {user && user.quota !== undefined && (
                    <Card className={cn(
                      "border-2 bg-white rounded-3xl shadow-sm",
                      (user.quotaUsed || 0) >= user.quota ? "border-red-500/20" : "border-brand-magenta/20"
                    )}>
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Private Entry Quota</p>
                          <h3 className={cn(
                            "text-2xl font-black mt-1",
                            (user.quotaUsed || 0) >= user.quota ? "text-red-500" : "text-brand-magenta"
                          )}>
                            Remains: {Math.max(0, user.quota - (user.quotaUsed || 0))} / {user.quota}
                          </h3>
                        </div>
                        <div className={cn(
                          "p-3 rounded-2xl",
                          (user.quotaUsed || 0) >= user.quota ? "bg-red-500/10" : "bg-brand-magenta/10"
                        )}>
                          <ShieldCheck className={cn(
                            "w-6 h-6",
                            (user.quotaUsed || 0) >= user.quota ? "text-red-500" : "text-brand-magenta"
                          )} />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-2 border-brand-blue/20 bg-white rounded-3xl shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-blue" />
                        {DISTRICTS.find(d => d.code === manualFormData.district)?.name || manualFormData.district} District Balance
                      </p>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total (ആകെ)</p>
                          <p className="text-lg font-black text-slate-700">{districtQuotas[manualFormData.district] || 0}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-center">
                          <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Used (ചേർത്തവ)</p>
                          <p className="text-lg font-black text-emerald-600">{districtQuotasUsed[manualFormData.district] || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border border-slate-200/60 shadow-xs rounded-2xl bg-white p-5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">District Summary</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {DISTRICTS.slice(0, 14).map(d => {
                        const used = districtQuotasUsed[d.code] || 0;
                        const total = districtQuotas[d.code] || 0;
                        if (total === 0 && used === 0) return null;
                        return (
                          <div key={d.code} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                            <span className="font-bold text-slate-700">{d.name}</span>
                            <span className="font-black text-slate-900">{used} / {total}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <div className="lg:col-span-2">
                    <FastMemberEntry 
                      adminUser={user || null} 
                      districtQuotas={districtQuotas} 
                      districtQuotasUsed={districtQuotasUsed} 
                      onMemberAdded={onRefreshMembers} 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'district_wa' && (
              <DistrictWhatsAppManager />
            )}

            {activeTab === 'district_quota' && (
              <DistrictQuotaManager
                districtQuotas={districtQuotas}
                districtQuotasUsed={districtQuotasUsed}
                onUpdateDistrictQuota={onUpdateDistrictQuota}
                onSyncQuotas={onSyncQuotas}
                adminUser={user}
              />
            )}

            {activeTab === 'gallery' && (
              <GalleryManagement user={user} />
            )}

            {activeTab === 'backup_restore' && (
              <BackupRestoreManager adminUser={user} onRefresh={onRefreshMembers} />
            )}

            {activeTab === 'branding' && (
              <BrandingManager />
            )}

            {activeTab === 'language' && (
              <LanguageManager />
            )}
          </div>

        {/* ======================= DIALOGS ======================= */}

        {/* Member ID Card View Dialog */}
        <Dialog open={!!viewingMember} onOpenChange={(open) => !open && setViewingMember(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-brand-blue uppercase flex items-center justify-between">
                <span>Member ID Card</span>
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400">
                HCRS Kerala Digital Identity
              </DialogDescription>
            </DialogHeader>
            {viewingMember && (
              <div className="space-y-4 py-2">
                <MembershipCard member={viewingMember} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setViewingMember(null)} className="rounded-xl font-bold">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Member Edit Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-brand-blue uppercase flex items-center gap-2">
                <Pencil className="w-5 h-5 text-brand-magenta" /> Edit Member Details
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400">
                അംഗത്തിന്റെ വിവരങ്ങൾ തിരുത്തുക
              </DialogDescription>
            </DialogHeader>
            {editingMember && (
              <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Full Name (പേര്)</Label>
                  <Input 
                    name="name" 
                    defaultValue={editingMember.name} 
                    className="h-10 rounded-xl text-xs font-bold" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Mobile Number</Label>
                    <Input 
                      name="mobile" 
                      defaultValue={editingMember.mobile} 
                      className="h-10 rounded-xl text-xs font-bold font-mono" 
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Highrich ID</Label>
                    <Input 
                      name="highrichId" 
                      defaultValue={editingMember.highrichId} 
                      className="h-10 rounded-xl text-xs font-bold font-mono" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">District (ജില്ല)</Label>
                    <select
                      name="district"
                      defaultValue={editingMember.district}
                      className="w-full h-10 px-3 rounded-xl text-xs font-bold border border-slate-200 bg-white"
                    >
                      {DISTRICTS.map(d => (
                        <option key={d.code} value={d.code}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Blood Group</Label>
                    <select
                      name="bloodGroup"
                      defaultValue={editingMember.bloodGroup || ''}
                      className="w-full h-10 px-3 rounded-xl text-xs font-bold border border-slate-200 bg-white"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Assembly Constituency (നിയമസഭാ മണ്ഡലം)</Label>
                  <Input 
                    name="assemblyConstituency" 
                    defaultValue={editingMember.assemblyConstituency} 
                    className="h-10 rounded-xl text-xs font-bold" 
                  />
                </div>
                <DialogFooter className="gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setEditingMember(null)} className="rounded-xl font-bold">
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl font-black uppercase bg-brand-blue text-white">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Member Confirmation Dialog */}
        <Dialog open={!!deletingMemberId} onOpenChange={(open) => !open && setDeletingMemberId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-red-600 uppercase flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" /> Confirm Member Deletion
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500 mt-2 leading-relaxed">
                ഈ അംഗത്തെ പൂർണ്ണമായും ഒഴിവാക്കണോ? ഈ പ്രവർത്തനം റദ്ദാക്കാൻ കഴിയില്ല.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-4 sm:justify-end">
              <Button variant="outline" onClick={() => setDeletingMemberId(null)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} className="rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white">
                Yes, Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Selected Claim Detail Dialog */}
        <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            {selectedClaim && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-brand-blue uppercase flex items-center justify-between">
                    <span>Claim & Legal Summary</span>
                    <Badge variant={selectedClaim.isEmergency ? "destructive" : "outline"} className="text-xs">
                      {selectedClaim.isEmergency ? 'EMERGENCY / അത്യാഹിതം' : 'Normal / സാധാരണ'}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-slate-400">
                    Highrich ID: {selectedClaim.highrichId || 'N/A'} • Submitted: {formatClaimDate(selectedClaim.createdAt)}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DetailItem label="Member Name" value={selectedClaim.userName || 'N/A'} />
                  <DetailItem label="Mobile Number" value={selectedClaim.userMobile || 'N/A'} />
                  <DetailItem label="District" value={selectedClaim.userDistrict || 'N/A'} />
                  <DetailItem label="Total Paid" value={`₹${(selectedClaim.totalPaid || 0).toLocaleString('en-IN')}`} />
                  <DetailItem label="Total Received" value={`₹${(selectedClaim.totalReceived || 0).toLocaleString('en-IN')}`} />
                  <DetailItem label="Balance Pending" value={`₹${(selectedClaim.totalPending || 0).toLocaleString('en-IN')}`} />
                </div>

                {selectedClaim.sponsorName && (
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="Sponsor Name" value={selectedClaim.sponsorName} />
                    <DetailItem label="Sponsor Mobile" value={selectedClaim.sponsorMobile || 'N/A'} />
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Future Preference (ഭാവിയിലെ തീരുമാനം)</p>
                  {selectedClaim.futurePreference ? (
                    <>
                      <p className="text-xs font-bold text-slate-700">{getFuturePreferenceDetail(selectedClaim.futurePreference).ml}</p>
                      <p className="text-[10px] text-slate-500">{getFuturePreferenceDetail(selectedClaim.futurePreference).en}</p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400 italic">Not provided by customer (കസ്റ്റമർ രേഖപ്പെടുത്തിയിട്ടില്ല)</p>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hardship Declarations (പ്രതിസന്ധികൾ)</p>
                  {Array.isArray(selectedClaim.hardshipStatus) && selectedClaim.hardshipStatus.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {getHardshipList(selectedClaim.hardshipStatus).map((h, i) => (
                        <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${h.isEmergency ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-200 text-slate-700'}`}>
                          <span>{h.icon}</span>
                          <span>{h.titleMl} ({h.titleEn})</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400 italic">Not provided by customer (കസ്റ്റമർ രേഖപ്പെടുത്തിയിട്ടില്ല)</p>
                  )}
                </div>

                {selectedClaim.notes && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes / Remarks</p>
                    <p className="text-xs font-bold text-slate-700">{selectedClaim.notes}</p>
                  </div>
                )}

                <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const memberObj = claimUser || members.find(m => m.uid === selectedClaim.uid || compareMobiles(m.mobile, selectedClaim.userMobile));
                        printCourtClaimReport(selectedClaim, memberObj);
                      }}
                      className="rounded-xl font-black uppercase text-xs px-2.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 shadow-2xs"
                      title="Print Court / Legal Statement (1 Page A4)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Court Print</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const memberObj = claimUser || members.find(m => m.uid === selectedClaim.uid || compareMobiles(m.mobile, selectedClaim.userMobile));
                        downloadCourtClaimPdf(selectedClaim, memberObj);
                      }}
                      className="rounded-xl font-black uppercase text-xs px-2.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 shadow-2xs"
                      title="Download Court / Legal Statement PDF (1 Page A4)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Court PDF</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const memberObj = claimUser || members.find(m => m.uid === selectedClaim.uid || compareMobiles(m.mobile, selectedClaim.userMobile));
                        printFullAdminClaimReport(selectedClaim, memberObj);
                      }}
                      className="rounded-xl font-black uppercase text-xs px-2.5 border-brand-magenta/30 text-brand-magenta hover:bg-brand-magenta/5 flex items-center gap-1.5 shadow-2xs"
                      title="Print Full Admin Record (1 Page A4)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Admin Print</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const memberObj = claimUser || members.find(m => m.uid === selectedClaim.uid || compareMobiles(m.mobile, selectedClaim.userMobile));
                        downloadFullAdminClaimPdf(selectedClaim, memberObj);
                      }}
                      className="rounded-xl font-black uppercase text-xs px-2.5 border-brand-magenta/30 text-brand-magenta hover:bg-brand-magenta/5 flex items-center gap-1.5 shadow-2xs"
                      title="Download Full Admin Record PDF (1 Page A4)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Admin PDF</span>
                    </Button>
                  </div>
                  <Button onClick={() => setSelectedClaim(null)} className="rounded-xl font-black uppercase text-xs px-6">Close</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Support Claim Confirmation Dialog */}
        <Dialog open={!!deletingClaimId} onOpenChange={(open) => !open && setDeletingClaimId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-red-600 uppercase flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" /> Warning: Delete Support Claim
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500 mt-2 leading-relaxed">
                നിങ്ങൾക്ക് തീർച്ചയായും ഈ ക്ലെയിം റിമൂവ് ചെയ്യണോ? ഈ പ്രവർത്തനം റദ്ദാക്കാൻ കഴിയില്ല. ഇതോടെ ഈ ഉപയോക്താവിന്റെ ക്ലെയിം വിവരങ്ങൾ അഡ്മിൻ പാനലിൽ നിന്നും ഡാറ്റാബേസിൽ നിന്നും പൂർണ്ണമായും ഒഴിവാക്കപ്പെടും.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-4 sm:justify-end">
              <Button variant="outline" onClick={() => setDeletingClaimId(null)} className="rounded-xl font-bold">
                Cancel / വേണ്ട
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  if (!deletingClaimId) return;
                  const loadingToast = toast.loading('ക്ലെയിം റിമൂവ് ചെയ്യുന്നു...');
                  try {
                    await deleteDoc(doc(db, 'claims', deletingClaimId));
                    toast.success('ക്ലെയിം വിജയകരമായി റിമൂവ് ചെയ്തു!', { id: loadingToast });
                    setDeletingClaimId(null);
                  } catch (err) {
                    console.error("Error deleting claim:", err);
                    toast.error('ക്ലെയിം റിമൂവ് ചെയ്യാൻ സാധിച്ചില്ല.', { id: loadingToast });
                  }
                }} 
                className="rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete / എടുത്തു കളയുക
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Support Claim Dialog */}
        <Dialog open={!!editingClaim} onOpenChange={(open) => !open && !savingClaim && setEditingClaim(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-brand-blue uppercase flex items-center gap-2">
                <Pencil className="w-5 h-5 text-brand-magenta" /> Edit Support Claim Details
              </DialogTitle>
              <DialogDescription className="text-[11px] font-bold text-slate-400">
                ക്ലെയിം വിവരങ്ങൾ എഡിറ്റ് ചെയ്യുക (User: {editingClaim?.userName || 'N/A'})
              </DialogDescription>
            </DialogHeader>
            
            {editingClaim && (
              <div className="space-y-6 py-4">
                {/* Highrich Id */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">Highrich ID (ഹൈറിച്ച് ഐഡി)</Label>
                    <Input 
                      type="text" 
                      value={editClaimHighrichId} 
                      onChange={(e) => setEditClaimHighrichId(e.target.value)} 
                      placeholder="E.g., HR12345"
                      className="h-11 rounded-xl font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">സ്പോൺസർ / ലീഡർ പേര്</Label>
                    <Input 
                      type="text" 
                      value={editClaimSponsorName} 
                      onChange={(e) => setEditClaimSponsorName(e.target.value)} 
                      placeholder="Sponsor Name"
                      className="h-11 rounded-xl font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">സ്പോൺസർ മൊബൈൽ നമ്പർ</Label>
                    <Input 
                      type="tel" 
                      value={editClaimSponsorMobile} 
                      onChange={(e) => setEditClaimSponsorMobile(e.target.value)} 
                      placeholder="Sponsor Mobile"
                      maxLength={10}
                      className="h-11 rounded-xl font-medium"
                    />
                  </div>
                </div>

                {/* No Breakup Option */}
                <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <Checkbox 
                    id="edit-no-breakup" 
                    checked={editClaimNoBreakup} 
                    onCheckedChange={(checked) => setEditClaimNoBreakup(!!checked)}
                  />
                  <Label htmlFor="edit-no-breakup" className="text-xs font-black text-slate-700 cursor-pointer select-none">
                    No category-wise break-up (വിശദമായ തുക വിവരങ്ങൾ ആവശ്യമില്ല)
                  </Label>
                </div>

                {/* Amounts Form */}
                {editClaimNoBreakup ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Total Paid (ആകെ നൽകിയ തുക)</Label>
                      <Input 
                        type="number" 
                        value={editClaimTotalPaid || ''} 
                        onChange={(e) => setEditClaimTotalPaid(Number(e.target.value))} 
                        placeholder="₹ Paid"
                        className="h-11 rounded-xl font-bold font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Total Received (ആകെ തിരിച്ചു കിട്ടിയ തുക)</Label>
                      <Input 
                        type="number" 
                        value={editClaimTotalReceived || ''} 
                        onChange={(e) => setEditClaimTotalReceived(Number(e.target.value))} 
                        placeholder="₹ Received"
                        className="h-11 rounded-xl font-bold font-mono text-green-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                     <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Category-wise Breakdown (കാറ്റഗറി തിരിച്ചുള്ള ബ്രേക്കപ്പ്):</Label>
                     <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                       {['digital', 'ott', 'grocery', 'goodwill', 'other'].map(catId => (
                         <div key={catId} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                            <span className="font-black text-xs text-brand-blue uppercase">{getCategoryLabel(catId)}</span>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400">Paid amount</span>
                              <Input 
                                type="number" 
                                value={editClaimCategoryPaid[catId] || ''} 
                                onChange={(e) => setEditClaimCategoryPaid(prev => ({ ...prev, [catId]: Number(e.target.value) }))}
                                placeholder="₹ Paid"
                                className="h-9 rounded-lg font-bold font-mono text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400">Received amount</span>
                              <Input 
                                type="number" 
                                value={editClaimCategoryReceived[catId] || ''} 
                                onChange={(e) => setEditClaimCategoryReceived(prev => ({ ...prev, [catId]: Number(e.target.value) }))}
                                placeholder="₹ Received"
                                className="h-9 rounded-lg font-bold font-mono text-xs bg-white text-green-600"
                              />
                            </div>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* AREA 3 — ADMIN INTERNAL FOLLOW-UP FORM */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border-2 border-amber-300 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2.5 border-amber-200 gap-2 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-800 text-white text-[10px] font-black uppercase tracking-wider">
                        🛡️ <span>AREA 3: ADMIN INTERNAL FOLLOW-UP FORM</span>
                      </div>
                      <p className="text-[10px] font-bold text-amber-900">
                        അഡ്മിൻ ഇന്റേണൽ ഫോളോ-അപ്പ് • Internal Admin Use Only • Excluded from Advocate Print/PDF
                      </p>
                    </div>
                    <Badge className="bg-amber-200 text-amber-950 font-black text-[9px] uppercase">
                      🔒 Admin Exclusive
                    </Badge>
                  </div>

                  {/* Future Preference */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-700 uppercase">ഭാവിയിലെ തീരുമാനങ്ങൾ (Future Preference)</Label>
                    <Select value={editClaimFuturePreference} onValueChange={setEditClaimFuturePreference}>
                       <SelectTrigger className="w-full min-h-[44px] h-auto py-2 border bg-white rounded-xl text-xs font-bold text-slate-700 text-left">
                          <SelectValue placeholder="മുൻഗണന തിരഞ്ഞെടുക്കുക / Select preference" />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="settlement" className="text-xs py-2">
                            <span className="font-bold text-slate-800">ബാലൻസ് തുക ലഭിച്ചാൽ settlement ചെയ്ത് account closure ചെയ്യാൻ താൽപര്യപ്പെടുന്നു</span>
                            <span className="block text-[10px] text-slate-500 font-normal">(Settlement and closure after receiving pending balance)</span>
                          </SelectItem>
                          <SelectItem value="wait" className="text-xs py-2">
                            <span className="font-bold text-slate-800">ബാലൻസ് തുകയിൽ നിന്ന് ഒരു ഭാഗം / 1/4 amount ലഭിച്ചാൽ ബാക്കി തുകയ്ക്കായി കാത്തിരിക്കാം</span>
                            <span className="block text-[10px] text-slate-500 font-normal">(Willing to wait if part payment / 1/4th amount is received)</span>
                          </SelectItem>
                          <SelectItem value="continue" className="text-xs py-2">
                            <span className="font-bold text-slate-800">കമ്പനി പ്രവർത്തനം പുനരാരംഭിച്ചാൽ കമ്പനിക്കൊപ്പം തുടർന്നു പോകാൻ തയ്യാറാണ്</span>
                            <span className="block text-[10px] text-slate-500 font-normal">(Ready to continue with the company if business operations restart)</span>
                          </SelectItem>
                          <SelectItem value="urgent" className="text-xs py-2">
                            <span className="font-bold text-slate-800">നിലവിലെ സാഹചര്യത്തിൽ എത്രയും വേഗം payment ലഭിക്കണം</span>
                            <span className="block text-[10px] text-slate-500 font-normal">(Need urgent payment due to personal/financial situation)</span>
                          </SelectItem>
                       </SelectContent>
                    </Select>
                  </div>

                  {/* Remarks/Notes Input */}
                  <div className="space-y-1.5 font-sans">
                    <Label className="text-[10px] font-black text-slate-700 uppercase">Remarks / Notes (അഡ്മിൻ നോട്ട് / നിരീക്ഷണങ്ങൾ)</Label>
                    <textarea 
                      value={editClaimNotes} 
                      onChange={(e) => setEditClaimNotes(e.target.value)} 
                      placeholder="Enter internal follow-up notes, investigator remarks, or explanation..."
                      className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:border-amber-600 focus:ring-0 focus:outline-none min-h-20 bg-white"
                    />
                  </div>

                  {/* Hardship declaration */}
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black text-slate-700 uppercase">ആളുടെ ഇപ്പോഴത്തെ അവസ്ഥ (Hardship Declarations)</Label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                        {[
                          { id: 'bank', ml: 'ബാങ്ക് ജപ്തി / loan recovery pressure നേരിടുന്നു', en: 'Bank recovery / seizure pressure' },
                          { id: 'crisis', ml: 'ഗുരുതരമായ സാമ്പത്തിക പ്രതിസന്ധി നേരിടുന്നു', en: 'Serious financial crisis' },
                          { id: 'medical', ml: 'ചികിത്സാ ആവശ്യങ്ങൾ / medical emergency ഉണ്ട്', en: 'Medical emergency / treatment need' },
                          { id: 'none', ml: 'അടിയന്തിര പ്രാധാന്യമില്ല', en: 'No urgent emergency' }
                        ].map(h => (
                          <div key={h.id} className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-amber-200 hover:bg-amber-50/50 transition-colors">
                            <Checkbox 
                              id={`admin-edit-claim-hardship-${h.id}`}
                              checked={editClaimHardshipStatus.includes(h.id)} 
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  if (h.id === 'none') {
                                    setEditClaimHardshipStatus(['none']);
                                  } else {
                                    setEditClaimHardshipStatus(prev => [...prev.filter(x => x !== 'none'), h.id]);
                                  }
                                } else {
                                  setEditClaimHardshipStatus(prev => prev.filter(x => x !== h.id));
                                }
                              }} 
                              className="mt-0.5"
                            />
                            <Label htmlFor={`admin-edit-claim-hardship-${h.id}`} className="text-xs font-bold text-slate-700 cursor-pointer select-none leading-snug">
                              <span className="block">{h.ml}</span>
                              <span className="text-[10px] font-medium text-slate-400">({h.en})</span>
                            </Label>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-4 border-t">
                  <Button variant="outline" disabled={savingClaim} onClick={() => setEditingClaim(null)} className="rounded-xl font-bold">
                    Cancel / റദ്ദാക്കുക
                  </Button>
                  <Button disabled={savingClaim} onClick={handleSaveClaim} className="rounded-xl font-black uppercase bg-brand-blue text-white animate-pulse-short">
                    {savingClaim ? 'Saving...' : 'Save Changes / സേവ് ചെയ്യുക'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Claims Bulk Importer Dialog */}
        <Dialog open={isClaimsImportOpen} onOpenChange={(open) => !open && !isClaimsImporting && setIsClaimsImportOpen(false)}>
          <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-[32px] p-6 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-brand-blue uppercase flex items-center gap-2 tracking-tight">
                <Upload className="w-5 h-5 text-brand-magenta animate-bounce" /> Import Old Site Claims (ക്ലെയിമുകൾ കയറ്റുക)
              </DialogTitle>
              <DialogDescription className="text-[11px] font-bold text-slate-400 mt-1 uppercase">
                പഴയ വെബ്സൈറ്റിലെ ക്ലെയിം പെറ്റീഷൻ ഫയലുകൾ (Excel/CSV) അപ്‌ലോഡ് ചെയ്ത് നിലവിലുള്ള സിസ്റ്റത്തിലേക്ക് ലോഗ് ചെയ്യുക
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-4">
              {/* File Select */}
              <div 
                onClick={() => !isClaimsImporting && document.getElementById('claims-import-input')?.click()}
                className={cn(
                  "border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-brand-blue/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200",
                  isClaimsImporting && "opacity-50 pointer-events-none"
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center text-brand-blue shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-brand-blue" />
                </div>
                <div className="text-center space-y-1 select-none">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Select Claims Excel / CSV File</p>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase">ആകെ തുക, അടച്ച തുക, ഫോൺ നമ്പർ എന്നിവയുള്ള ഷീറ്റ് തിരഞ്ഞെടുക്കുക</p>
                </div>
                <input 
                  id="claims-import-input"
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  onChange={handleClaimsFileChange}
                />
              </div>

              {/* Column Mapping Section if Columns loaded */}
              {claimsImportColumns.length > 0 && (
                <Card className="p-4 border border-slate-150 rounded-2xl bg-slate-50/30">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-brand-magenta" /> Column Match Configuration (കോളം ക്രമീകരണം)
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                    {[
                      { field: 'userName', label: 'Member Name (പേര്)*' },
                      { field: 'userMobile', label: 'Mobile Number (മൊബൈൽ)*' },
                      { field: 'highrichId', label: 'Highrich ID (ഹൈക്കുറിച്ച് ഐഡി)' },
                      { field: 'totalPaid', label: 'Total Paid (അടച്ച തുക)' },
                      { field: 'totalReceived', label: 'Total Received (തിരികെ ലഭിച്ച തുക)' },
                      { field: 'totalPending', label: 'Balance Pending (ബാക്കി തുക)' },
                      { field: 'userDistrict', label: 'District (ജില്ല)' },
                      { field: 'relation', label: 'Relation (ബന്ധം)' },
                      { field: 'futurePreference', label: 'Preference (முൻഗണന)' },
                      { field: 'priorityStatus', label: 'Priority Status (സ്റ്റാറ്റസ്)' },
                      { field: 'date', label: 'Submission Date (തീയതി)' }
                    ].map(fieldObj => (
                      <div key={fieldObj.field} className="flex flex-col gap-1 text-left bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                        <span className="text-[9.5px] font-black text-slate-650">{fieldObj.label}</span>
                        <select
                          className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                          value={claimsColumnMapping[fieldObj.field] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClaimsColumnMapping(prev => ({ ...prev, [fieldObj.field]: val }));
                          }}
                        >
                          <option value="">-- Skip/വാതകമല്ല --</option>
                          {claimsImportColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* First 3 Rows Preview */}
              {claimsImportRows.length > 0 && !isClaimsImporting && (
                <div className="space-y-1 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Preview (ആദ്യ 3 വരികളുടെ പ്രിവ്യൂ):</p>
                  <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-3xs">
                    <Table>
                      <TableHeader className="bg-slate-50 font-bold text-[9px] uppercase tracking-wider text-slate-400">
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>District</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-[10.5px] font-extrabold text-slate-700">
                        {claimsImportRows.slice(0, 3).map((row, idx) => {
                          const nameVal = row[claimsColumnMapping['userName']] || 'N/A';
                          const mobVal = row[claimsColumnMapping['userMobile']] || 'N/A';
                          const pendingVal = row[claimsColumnMapping['totalPending']] || row[claimsColumnMapping['totalPaid']] || '0';
                          const distVal = row[claimsColumnMapping['userDistrict']] || 'KSD';
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-[9px] text-slate-400 font-normal">#{idx+1}</TableCell>
                              <TableCell className="font-sans truncate max-w-[120px]">{String(nameVal)}</TableCell>
                              <TableCell className="font-mono text-xs">{String(mobVal)}</TableCell>
                              <TableCell className="font-mono text-xs text-brand-magenta">₹{parseFloat(pendingVal as string || '0').toLocaleString('en-IN')}</TableCell>
                              <TableCell className="font-sans text-[10px] uppercase text-slate-500 font-bold">{String(distVal)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Progress and Logs Console */}
              {claimsImportLogs.length > 0 && (
                <div className="space-y-2 text-left font-sans font-bold">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Active Consolidation Progress</span>
                    <span className="font-mono text-brand-magenta">{claimsImportProgress}%</span>
                  </div>
                  {isClaimsImporting && (
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-250">
                      <div 
                        className="bg-brand-blue h-full transition-all duration-300"
                        style={{ width: `${claimsImportProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-3.5 h-32 overflow-y-auto font-mono text-[9.5px] leading-relaxed text-emerald-400 text-left whitespace-pre-wrap shadow-inner animate-pulse-short">
                    {claimsImportLogs.map((log, lidx) => (
                      <div key={lidx} className="flex gap-1.5 items-start">
                        <span className="text-slate-500 shrink-0 select-none">&gt;</span>
                        <span className="text-emerald-400">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons panel */}
              <DialogFooter className="gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  disabled={isClaimsImporting} 
                  onClick={() => setIsClaimsImportOpen(false)} 
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel / വേണ്ട
                </Button>
                {claimsImportRows.length > 0 && (
                  <Button 
                    disabled={isClaimsImporting} 
                    onClick={handleClaimsBulkImportSave} 
                    className="rounded-xl font-black uppercase text-xs bg-brand-magenta text-white"
                  >
                    {isClaimsImporting ? 'Processing Migration...' : 'Confirm & Settle Claims Migration'}
                  </Button>
                )}
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>
        {selectedReceiptsMember && (
          <AdminReceiptsModal 
            member={selectedReceiptsMember} 
            onClose={() => setSelectedReceiptsMember(null)} 
          />
        )}
    </div>
  );
}

function StatsCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: 'brand-blue' | 'orange' | 'brand-magenta' | 'green' | 'red' }) {
  const bgColors = {
    'brand-blue': 'bg-brand-blue/[0.06] text-brand-blue border-brand-blue/15',
    'brand-magenta': 'bg-brand-magenta/[0.06] text-brand-magenta border-brand-magenta/15',
    orange: 'bg-orange-500/[0.06] text-orange-600 border-orange-500/15',
    green: 'bg-emerald-500/[0.06] text-emerald-600 border-emerald-500/15',
    red: 'bg-rose-500/[0.06] text-rose-600 border-rose-500/15'
  };

  return (
    <Card className="border border-slate-200/40 bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.025)] transition-all duration-300 min-w-0 w-full max-w-full">
      <CardContent className="p-3.5 sm:p-6">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{title}</p>
            <h3 className="text-xl sm:text-3xl font-black text-slate-800 leading-none tracking-tight font-mono truncate">{value}</h3>
          </div>
          <div className={cn("p-2 sm:p-3 rounded-xl border flex items-center justify-center shrink-0", bgColors[color])}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 sm:w-6 sm:h-6' })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value, icon }: { label: string, value?: string | React.ReactNode, icon?: React.ReactNode }) {
  const handleCopy = () => {
    if (!value || value === '---' || value === 'N/A') return;
    if (typeof value === 'string') {
      navigator.clipboard.writeText(value);
      toast.success(`${label} കോപ്പി ചെയ്തു!`);
    }
  };

  const isCopyable = typeof value === 'string' && value !== '---' && value !== 'N/A';

  return (
    <div 
      onClick={isCopyable ? handleCopy : undefined}
      className={cn(
        "space-y-1 bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group transition-all",
        isCopyable ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/70 active:scale-[0.98]" : ""
      )}
    >
      <div className="flex justify-between items-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
          {icon && React.cloneElement(icon as React.ReactElement, { className: 'w-3 h-3 text-slate-400' })}
          {label}
        </p>
        {isCopyable && (
          <Copy className="w-3 h-3 text-slate-300 opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-1 shrink-0" />
        )}
      </div>
      <div className="text-sm font-black text-slate-800 leading-tight break-all selection:bg-blue-100">
        {value || '---'}
      </div>
    </div>
  );
}
