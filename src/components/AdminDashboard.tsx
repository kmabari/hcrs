import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { getWAMessage, sendWAMessage } from '@/src/lib/whatsapp';
import { subscribeToOrgSettings, saveOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';
import BrandingManager from './BrandingManager';
import GalleryManagement from './GalleryManagement';
import BulkImportManager from './BulkImportManager';
import { 
  Crown,
  Users, 
  Search, 
  Filter, 
  Download, 
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
  Loader2
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
import { onSnapshot, collection, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
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

interface AdminDashboardProps {
  user?: UserProfile | null;
  members: UserProfile[];
  onApprove: (id: string) => void;
  onAddOffline: (data: any) => void;
  onUpdate: (id: string, data: Partial<UserProfile>) => void;
  onDelete: (id: string) => void;
  onResetPin?: (id: string) => void;
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
  'mabarikiyafoods@gmail.com'
];

const SECOND_ADMINS = [
  'hcrskerala@gmail.com',
  'hcrskasaragod@hcrs.society',
  'hcrskannur@hcrs.society',
  'hcrswayanad@hcrs.society',
  'hcrskozhikode@hcrs.society',
  'hcrsmalappuram@hcrs.society',
  'hcrspalakkad@hcrs.society',
  'hcrsthrissur@hcrs.society',
  'hcrsernakulam@hcrs.society',
  'hcrsidukki@hcrs.society',
  'hcrskottayam@hcrs.society',
  'hcrsalappuzha@hcrs.society',
  'hcrspathanamthitta@hcrs.society',
  'hcrskollam@hcrs.society',
  'hcrsthiruvananthapuram@hcrs.society'
];

const hasValidity = (u: any) => {
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
    if (!nameOrCode) return DISTRICTS[0].code;
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

  const isSuperAdmin = MAIN_ADMINS.includes(user?.email || '');
  
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
  const [districtFilter, setDistrictFilter] = useState(() => {
    if (user?.district && !isSuperAdmin) {
      return user.district;
    }
    return 'all';
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
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
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);

  // States for Editing Claim Dialog
  const [editClaimHighrichId, setEditClaimHighrichId] = useState('');
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

  // Populate claims states when editingClaim changes
  useEffect(() => {
    if (editingClaim) {
      setEditClaimHighrichId(editingClaim.highrichId || '');
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

  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimSearchTerm, setClaimSearchTerm] = useState('');
  const [claimDistrictFilter, setClaimDistrictFilter] = useState('all');
  const [claimPriorityFilter, setClaimPriorityFilter] = useState('all');
  const [claimCategoryFilter, setClaimCategoryFilter] = useState('all');

  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSupportTicketsLoading(true);
    const q = query(collection(db, 'support_tickets'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setSupportTickets(data);
      setSupportTicketsLoading(false);
    }, (err: any) => {
      console.error("Support tickets fetch error:", err);
      // Suppress or handle empty collection
      setSupportTickets([]);
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

  useEffect(() => {
    if (!user) return;
    setClaimsLoading(true);
    
    const q = query(collection(db, 'claims'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setClaims(data);
      setClaimsLoading(false);
    }, (err: any) => {
      console.error("Claims fetch error:", err);
      setClaimsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

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
      else if (editClaimFuturePreference === 'settlement') priorityStatus = 'RED';
      else if (editClaimFuturePreference === 'wait') priorityStatus = 'ORANGE';
      else if (editClaimFuturePreference === 'continue') priorityStatus = 'GREEN';

      const updateData = {
        highrichId: editClaimHighrichId,
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
    const loadingToast = toast.loading('Approving renewal...');
    try {
      const now = new Date();
      const expiry = new Date();
      expiry.setFullYear(now.getFullYear() + 1);

      await onUpdate(member.uid, {
        status: 'active',
        isApproved: true,
        renewalPending: false,
        issueDate: serverTimestamp(), // Update issue date on renewal approval
        registrationDate: member.registrationDate || serverTimestamp(), // Preserve permanent original Joining Date, fallback if none
        renewalDate: serverTimestamp(), // Store renewal date permanently
        expiryDate: expiry,
        paymentTime: member.renewalDate ? (member.renewalDate.toDate ? member.renewalDate.toDate().toISOString() : new Date(member.renewalDate).toISOString()) : new Date().toISOString()
      });
      
      const message = `അഭിനന്ദനങ്ങൾ! താങ്കളുടെ HCRS മെമ്പർഷിപ്പ് റിന്യൂവൽ അപ്പ്രൂവ് ചെയ്തിരിക്കുന്നു. സർവീസ് കാലാവധി ഒരു വർഷത്തേക്ക് കൂടി പുതുക്കിയിട്ടുണ്ട്.`;
      
      setTimeout(() => {
        window.open(`https://api.whatsapp.com/send?phone=91${member.mobile}&text=${encodeURIComponent(message)}`, '_blank');
      }, 500);

      toast.success('Renewal approved successfully', { id: loadingToast });
    } catch (error) {
      toast.error('Renewal approval failed', { id: loadingToast });
    }
  };

  const STABLE_URL = SHARED_URL;
  const baseUrl = typeof window !== 'undefined' && !window.location.origin.includes('ais-dev') && !window.location.origin.includes('google.com')
    ? window.location.origin 
    : STABLE_URL;
  const magicLinkBase = baseUrl;

  const handleApproveWithWhatsApp = (member: UserProfile) => {
    onApprove(member.uid);
    // Use utility for consistent messaging
    if (orgSettings?.registrationMode !== 'bulk') {
      setTimeout(() => {
        sendWAMessage({
          name: member.name,
          mobile: member.mobile,
          uid: member.uid,
          pin: member.pin,
          membershipId: member.membershipId
        });
      }, 500);
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
    const updatedMember = { ...editingMember, mobile: cleanMobile };
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
    
    for (const m of actualMembers) {
      const matchesDistrict = districtFilter === 'all' || m.district === districtFilter;
      if (!matchesDistrict) continue;

      if (m.status === 'pending' && !m.renewalPending) {
        pending++;
      } else if (m.status === 'active' || m.renewalPending) {
        active++;
        total++; // Verified active/renewal members only
      }
      
      if (m.renewalPending) renewals++;
    }

    return { total, active, pending, renewals };
  }, [actualMembers, districtFilter]);

  const filteredMembers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    // Cache district map for faster lookup
    const districtMap = new Map(DISTRICTS.map(d => [d.code, d.name.toLowerCase()]));

    return members.filter(m => {
      // Hide Admins (both Main and District) from members list to avoid confusion
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
      const matchesStatus = statusFilter === 'all' ? (m.status !== 'deleted' && m.status !== 'pending') : m.status === statusFilter;
      
      let matchesSource = true;
      if (sourceFilter === 'online') {
        matchesSource = !m.registeredBy;
      } else if (sourceFilter === 'manual') {
        matchesSource = !!m.registeredBy;
      }

      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        matchesCategory = (m.membership_type || 'ADHOC_MEMBER') === categoryFilter;
      }
      
      return matchesSearch && matchesDistrict && matchesStatus && matchesSource && matchesCategory;
    });
  }, [members, searchTerm, districtFilter, statusFilter, sourceFilter, categoryFilter]);

  const itemsPerPage = 10;
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const validActiveCount = useMemo(() => {
    return members.filter(m => {
      const isAnyAdmin = [...MAIN_ADMINS, ...SECOND_ADMINS].some(adminEmail => m.email?.toLowerCase() === adminEmail.toLowerCase());
      if (isAnyAdmin) return false;
      const matchesDistrict = districtFilter === 'all' || m.district === districtFilter;
      if (!matchesDistrict) return false;

      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        matchesCategory = (m.membership_type || 'ADHOC_MEMBER') === categoryFilter;
      }
      return matchesCategory && hasValidity(m);
    }).length;
  }, [members, districtFilter, categoryFilter]);

  const filteredValidActiveMembers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const districtMap = new Map(DISTRICTS.map(d => [d.code, d.name.toLowerCase()]));

    return members.filter(m => {
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
        matchesCategory = (m.membership_type || 'ADHOC_MEMBER') === categoryFilter;
      }
      
      return matchesSearch && matchesDistrict && matchesCategory && hasValidity(m);
    });
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
                           (c.highrichId && c.highrichId.toLowerCase().includes(term));
      
      const matchesDistrict = claimDistrictFilter === 'all' || getDistrictCode(c.userDistrict) === claimDistrictFilter;
      const matchesPriority = claimPriorityFilter === 'all' || c.priorityStatus === claimPriorityFilter;
      const matchesCategory = claimCategoryFilter === 'all' || 
                              (claimCategoryFilter === 'consignment' 
                                ? (c.categories?.includes('consignment') || c.categories?.includes('ott') || c.categories?.includes('grocery'))
                                : c.categories?.includes(claimCategoryFilter));

      return matchesSearch && matchesDistrict && matchesPriority && matchesCategory;
    });
  }, [claims, claimSearchTerm, claimDistrictFilter, claimPriorityFilter, claimCategoryFilter]);

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
  }, [members, searchTerm, districtFilter, sourceFilter]);

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
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-blue/10">
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
          <p className="px-3.5 py-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">Management Console</p>
          <button
            onClick={() => setActiveTab2('list')}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'list' 
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                : "text-slate-500 hover:bg-slate-100/65 hover:text-slate-800"
            )}
          >
            <div className="flex items-center gap-3">
              <Users className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'list' ? 'text-white' : 'text-slate-400')} />
              <span>Member Directory</span>
            </div>
            {stats.active > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'list' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
                : "text-slate-500 hover:bg-slate-100/65 hover:text-slate-800"
            )}
          >
            <div className="flex items-center gap-3">
              <UserPlus className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'requests' ? 'text-white' : 'text-slate-400')} />
              <span>New Requests</span>
            </div>
            {stats.pending > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'requests' ? 'bg-white/25 text-white' : 'bg-brand-magenta/5 text-brand-magenta'
              )}>
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab2('claims')}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all group tracking-tight",
              activeTab === 'claims' 
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                : "text-slate-500 hover:bg-slate-100/65 hover:text-slate-800"
            )}
          >
            <div className="flex items-center gap-3">
              <MessageCircle className={cn("w-4 h-4 transition-transform group-hover:scale-105", activeTab === 'claims' ? 'text-white' : 'text-slate-400')} />
              <span>Claims Support</span>
            </div>
            {claims.length > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black min-w-5",
                activeTab === 'claims' ? 'bg-white/25 text-white' : 'bg-red-50 text-red-500'
              )}>
                {claims.length}
              </span>
            )}
          </button>
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

      {/* MOBILE DRAWER SIDEBAR - Completely Android Mobile First! */}
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
                  "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'list' ? 'bg-brand-blue/5 text-brand-blue' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Member directory</span>
              </button>
              <button 
                onClick={() => { setActiveTab2('requests'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'requests' ? 'bg-brand-blue/5 text-brand-blue' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <UserPlus className="w-4 h-4 text-slate-400" />
                <span>New Requests</span>
              </button>
              <button 
                onClick={() => { setActiveTab2('claims'); setMobileSidebarOpen(false); }} 
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors",
                  activeTab === 'claims' ? 'bg-brand-blue/5 text-brand-blue' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span>Claims Support</span>
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
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto bg-slate-50">
        {/* MOBILE HEADER */}
        <header className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200/50 px-5 h-14 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)} className="text-slate-700 h-9 w-9 rounded-full">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <Logo size="sm" className="h-[20px] w-auto" />
            <span className="font-black text-[9px] uppercase tracking-widest text-slate-400">Admin Console</span>
          </div>
        </header>

        {/* CENTRAL CONTAINER */}
        <div className="p-4 md:p-8 space-y-6 max-w-[1500px] w-full mx-auto pb-24">
          <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200/50 pb-8">
          <div className="flex items-center gap-4.5">
             <div className="bg-white p-1.5 rounded-xl shadow-xs border border-slate-100 shrink-0">
               <Logo size="sm" className="h-8 w-auto" />
             </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">
                    {isSecondary ? 'District Executive' : 'Admin Console'}
                  </h1>
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingMember(user)}
                      className="rounded-lg h-7 px-2.5 border-slate-200 text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xs"
                    >
                      <Eye className="w-3 h-3 mr-1 text-brand-blue" />
                      View Card
                    </Button>
                  )}
                </div>
                {isSecondary ? (
                  <p className="text-brand-magenta mt-1.5 text-[9px] font-bold tracking-widest uppercase flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Operator: {manualFormData.certAdminName || user?.name || 'Administrator'}
                  </p>
                ) : (
                  <p className="text-slate-400 mt-1.5 text-[9px] font-bold tracking-widest uppercase leading-none">
                    Highrich Community Revival Society Kerala
                  </p>
                )}
              </div>
          </div>
          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
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
                className="flex-1 md:flex-none h-10 border border-slate-200 bg-white shadow-xs font-black rounded-xl px-4 hover:bg-slate-50 text-[9px] uppercase tracking-wider"
            >
              Copy link
            </Button>
            {!isSecondary && (
              <Button onClick={exportToExcel} variant="outline" className="flex-1 md:flex-none h-10 border border-slate-200 bg-white shadow-xs font-black rounded-xl px-4 hover:bg-slate-50 text-[9px] uppercase tracking-wider">
                <Download className="w-4 h-4 mr-1 text-slate-500" />
                Export
              </Button>
            )}
            {!isSecondary && (
              <Button 
                onClick={() => setIsManualEntryOpen(true)}
                className="flex-1 md:flex-none h-10 font-bold rounded-xl px-5 shadow-sm transition-all text-[9px] uppercase tracking-wider bg-brand-magenta text-white hover:bg-brand-magenta/95"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add Member
              </Button>
            )}
            {!isSecondary && (
              <Button 
                onClick={() => setIsDomainKeyModalOpen(true)}
                variant="outline"
                className="flex-1 md:flex-none h-10 border-brand-blue/35 text-brand-blue hover:bg-brand-blue/5 font-black rounded-xl px-4 text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-4 h-4 text-brand-blue" />
                Set Domain PIN (പാസ്‌വേഡ്)
              </Button>
            )}
            {onViewCard && (
              <Button 
                onClick={onViewCard} 
                variant="outline" 
                className="flex-1 md:flex-none h-10 border border-brand-magenta/30 bg-brand-magenta/5 text-brand-magenta font-black rounded-xl px-4 hover:bg-brand-magenta/10 text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Smartphone className="w-4 h-4 text-brand-magenta" />
                എന്റെ ഐഡി കാർഡ് (My Card)
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline" className="flex-1 md:flex-none h-10 border-red-100 hover:bg-red-50/50 text-red-500 font-bold rounded-xl px-4 text-[9px] uppercase tracking-wider">
              <LogOut className="w-4 h-4 mr-1 text-red-400" />
              Logout
            </Button>
          </div>
        </header>

        {isSecondary ? (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {user && (user.quota !== undefined) && (
                <Card className={cn(
                  "border-2 bg-white rounded-[32px] shadow-sm",
                  (user.quotaUsed || 0) >= user.quota ? "border-red-500/20" : "border-brand-magenta/20"
                )}>
                  <CardContent className="p-8 flex items-center justify-between">
                      <div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Your Private Entry Quota</p>
                          <h3 className={cn(
                              "text-3xl font-black mt-2",
                              (user.quotaUsed || 0) >= user.quota ? "text-red-500" : "text-brand-magenta"
                          )}>
                              Remains: {Math.max(0, user.quota - (user.quotaUsed || 0))} / {user.quota}
                          </h3>
                      </div>
                      <div className={cn(
                          "p-4 rounded-[20px]",
                          (user.quotaUsed || 0) >= user.quota ? "bg-red-500/10" : "bg-brand-magenta/10"
                      )}>
                          <ShieldCheck className={cn(
                              "w-8 h-8",
                              (user.quotaUsed || 0) >= user.quota ? "text-red-500" : "text-brand-magenta"
                          )} />
                      </div>
                  </CardContent>
                </Card>
              )}

              {/* District Quota Tool for Second Admin - Shows balance for currently selected district */}
              <Card className="border-2 border-brand-blue/20 bg-white rounded-[32px] shadow-sm overflow-hidden">
                <CardContent className="p-8 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-brand-blue" />
                      {DISTRICTS.find(d => d.code === manualFormData.district)?.name || manualFormData.district} District Balance
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                       <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total (ആകെ)</p>
                          <p className="text-xl font-black text-slate-700">{districtQuotas[manualFormData.district] || 0}</p>
                       </div>
                       <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-center">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Used (ചേർത്തവ)</p>
                          <p className="text-xl font-black text-emerald-600">{districtQuotasUsed[manualFormData.district] || 0}</p>
                       </div>
                    </div>

                    <div className="mt-4 bg-brand-magenta/5 border border-brand-magenta/10 p-5 rounded-3xl">
                       <p className="text-[10px] font-black text-brand-magenta uppercase tracking-[0.2em] mb-2 opacity-60 text-center">Balance Available (ബാക്കി)</p>
                       <div className="flex items-baseline justify-center gap-2">
                         <h3 className="text-5xl font-black text-brand-magenta tracking-tighter">
                           {Math.max(0, (districtQuotas[manualFormData.district] || 0) - (districtQuotasUsed[manualFormData.district] || 0))}
                         </h3>
                         <span className="text-xs font-black text-brand-magenta/40 uppercase tracking-widest italic">Left</span>
                       </div>
                    </div>
                    {districtQuotas[manualFormData.district] === undefined && (
                      <div className="mt-2 bg-red-50 border border-red-100 p-2 rounded-xl">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-tight text-center">
                          Warning: Quota not configured for this district.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-2">
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-magenta transition-all"
                            style={{ width: `${Math.min(100, ((districtQuotasUsed[manualFormData.district] || 0) / (districtQuotas[manualFormData.district] || 1)) * 100)}%` }}
                           />
                       </div>
                       <span className="text-[10px] font-black text-slate-400">{Math.round(((districtQuotasUsed[manualFormData.district] || 0) / (districtQuotas[manualFormData.district] || 1)) * 100)}% Used</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registration Summary</h4>
                  <div className="space-y-4">
                     {DISTRICTS.slice(0, 14).map(d => {
                        const used = districtQuotasUsed[d.code] || 0;
                        const total = districtQuotas[d.code] || 0;
                        if (total === 0 && used === 0) return null;
                        
                        return (
                          <div key={d.code} className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <MapPin className={cn("w-3 h-3", d.code === user?.district ? "text-brand-blue" : "text-slate-300")} />
                                <span className={cn("text-xs font-bold", d.code === user?.district ? "text-brand-blue" : "text-slate-600")}>{d.name}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[9px] h-5 border-slate-100 text-slate-500">{used}/{total}</Badge>
                             </div>
                          </div>
                        );
                     })}
                  </div>
               </Card>

               <div className="md:col-span-2">
                  <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden sticky top-8">
              <CardHeader className="bg-brand-magenta text-white p-8">
                <div className="flex items-center gap-4 mb-2">
                  <UserPlus className="w-8 h-8" />
                  <CardTitle className="text-2xl font-black uppercase tracking-tight">New Registration</CardTitle>
                </div>
                <CardDescription className="text-white/70 font-medium">
                  പുതിയ മെമ്പറെ ചേർക്കുന്നതിനായി താഴെ പറയുന്ന വിവരങ്ങൾ പൂരിപ്പിക്കുക.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSecondarySubmit} className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl mb-8">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Second Admin Profile (സെക്കൻഡ് അഡ്മിൻ വിവരങ്ങൾ)</p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                           <Label className="font-bold text-slate-700 text-[10px]">Your Name (പേര്)</Label>
                           <Input 
                             required 
                             placeholder="Your Name" 
                             className="bg-white border-slate-200 h-11 rounded-xl font-bold text-xs" 
                             value={manualFormData.certAdminName}
                             onChange={e => setManualFormData({...manualFormData, certAdminName: e.target.value})}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="font-bold text-slate-700 text-[10px]">Your Email ID (മെയിൽ ഐഡി)</Label>
                           <Input 
                             required 
                             placeholder="Your Email" 
                             className="bg-white border-slate-200 h-11 rounded-xl font-bold text-xs" 
                             value={manualFormData.certAdminEmail}
                             onChange={e => setManualFormData({...manualFormData, certAdminEmail: e.target.value})}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="font-bold text-slate-700 text-[10px]">Verification Password (പാസ്സ്‌വേർഡ്)</Label>
                           <Input 
                             required 
                             type="password"
                             placeholder="Admin Password" 
                             className="bg-white border-slate-200 h-11 rounded-xl font-bold text-xs" 
                             value={manualFormData.certAdminPassword}
                             onChange={e => setManualFormData({...manualFormData, certAdminPassword: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="s-name" className="font-bold text-slate-700">Full Name (പൂർണ്ണരൂപം)</Label>
                      <Input 
                        id="s-name" 
                        required 
                        className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20"
                        placeholder="Enter name" 
                        value={manualFormData.name} 
                        onChange={e => setManualFormData({...manualFormData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-mobile" className="font-bold text-slate-700">Mobile Number (മൊബൈൽ)</Label>
                      <Input 
                        id="s-mobile" 
                        required 
                        maxLength={10}
                        className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20"
                        placeholder="**********" 
                        value={manualFormData.mobile} 
                        onChange={e => setManualFormData({...manualFormData, mobile: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor="s-email" className="font-bold text-slate-700">Username / Email (യൂസർ ഐഡി / ഇമെയിൽ)</Label>
                      <Input 
                        id="s-email" 
                        type="email"
                        required 
                        className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20"
                        placeholder="example@mail.com" 
                        value={manualFormData.email} 
                        onChange={e => setManualFormData({...manualFormData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-member-pin" className="font-bold text-slate-700">Member Password (പാസ്സ്‌വേർഡ്)</Label>
                      <Input 
                        id="s-member-pin" 
                        type="text"
                        required 
                        className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20"
                        placeholder="Set member password" 
                        value={manualFormData.pin} 
                        onChange={e => setManualFormData({...manualFormData, pin: e.target.value})}
                      />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-address" className="font-bold text-slate-700">Full Address (മേൽവിലാസം)</Label>
                    <Input 
                      id="s-address" 
                      required 
                      className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20"
                      placeholder="House Name, Street, etc." 
                      value={manualFormData.address} 
                      onChange={e => setManualFormData({...manualFormData, address: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="s-post" className="font-bold text-slate-700">Post Office (പോസ്റ്റ് ഓഫീസ്)</Label>
                      <Input 
                        id="s-post" 
                        required 
                        className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20"
                        placeholder="Post Office" 
                        value={manualFormData.postOffice} 
                        onChange={e => setManualFormData({...manualFormData, postOffice: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-pin" className="font-bold text-slate-700">Pincode (പിൻകോഡ്)</Label>
                      <Input 
                        id="s-pin" 
                        required 
                        maxLength={6}
                        className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20"
                        placeholder="6-digit PIN" 
                        value={manualFormData.pincode} 
                        onChange={e => setManualFormData({...manualFormData, pincode: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">District (ജില്ല)</Label>
                      <Select 
                        value={manualFormData.district} 
                        onValueChange={v => setManualFormData({
                          ...manualFormData, 
                          district: v, 
                          assemblyConstituency: CONSTITUENCIES[v]?.[0] || ''
                        })}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISTRICTS.map(d => (
                            <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Constituency (മണ്ഡലം)</Label>
                      <Select 
                        value={manualFormData.assemblyConstituency} 
                        onValueChange={v => setManualFormData({...manualFormData, assemblyConstituency: v})}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20">
                          <SelectValue placeholder="Select Constituency" />
                        </SelectTrigger>
                        <SelectContent>
                          {(CONSTITUENCIES[manualFormData.district] || []).map(ac => (
                            <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Account Type (റോൾ)</Label>
                      <Select 
                        value={manualFormData.role} 
                        onValueChange={(v: any) => setManualFormData({...manualFormData, role: v})}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Standard Member</SelectItem>
                          <SelectItem value="operator">Operator (Data Entry)</SelectItem>
                          <SelectItem value="admin">Second Admin (സെക്കൻഡ് അഡ്മിൻ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Blood Group</Label>
                    <Select 
                      value={manualFormData.bloodGroup} 
                      onValueChange={v => setManualFormData({...manualFormData, bloodGroup: v})}
                    >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-brand-blue/20">
                          <SelectValue placeholder="Blood Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOOD_GROUPS.map(bg => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                    type="submit" 
                    disabled={(user?.quota !== undefined && (user?.quotaUsed || 0) >= user.quota) || isSubmitting}
                    className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-brand-magenta/20 bg-brand-magenta text-white hover:bg-brand-magenta/90 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      (user?.quota !== undefined && (user?.quotaUsed || 0) >= user.quota) ? 'Quota Exhausted' : 'Submit Entry'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
        ) : (
          <>
            <div className="space-y-6">
              {/* Membership Statistics Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                  Membership Statistics (അംഗത്വ വിവരങ്ങൾ)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard title="Total Members (ആകെ അംഗങ്ങൾ)" value={stats.total} icon={<Users className="w-8 h-8"/>} color="brand-blue" />
                  <StatsCard title="Pending Review (പുതിയ അപേക്ഷകൾ)" value={stats.pending} icon={<Clock className="w-8 h-8"/>} color="orange" />
                  <StatsCard title="Verified Members (വെരിഫൈഡ് അംഗങ്ങൾ)" value={stats.active} icon={<CheckCircle2 className="w-8 h-8"/>} color="green" />
                  <StatsCard title="Renewals (റിന്യൂവൽ പെൻഡിങ്)" value={stats.renewals} icon={<Plus className="w-8 h-8"/>} color="brand-magenta" />
                </div>
              </div>

              {/* Support Claims & Emergency Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                  Support Claims & Alerts (സഹായ ധന അപേക്ഷകൾ)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatsCard title="Red Claims (റെഡ് അലേർട്ട്)" value={(claimStats.priorityCounts['EMERGENCY RED'] || 0) + (claimStats.priorityCounts['RED'] || 0)} icon={<ShieldAlert className="w-8 h-8"/>} color="red" />
                  <StatsCard title="Orange Claims (ഓറഞ്ച് അലേർട്ട്)" value={claimStats.priorityCounts['ORANGE'] || 0} icon={<ShieldAlert className="w-8 h-8"/>} color="orange" />
                  <StatsCard title="Green Claims (ഗ്രീൻ അലേർട്ട്)" value={claimStats.priorityCounts['GREEN'] || 0} icon={<CheckCircle2 className="w-8 h-8"/>} color="green" />
                </div>
              </div>
            </div>

            {false && isSuperAdmin && countOf2026Members > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-brand-magenta/20 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-brand-magenta animate-pulse" />
                      <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                        അംഗങ്ങളുടെ ജോയിനിംഗ് തീയതി ക്രമീകരണ അസിസ്റ്റന്റ് (Super Admin Mode)
                      </h4>
                    </div>
                    <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                      ലിസ്റ്റിൽ രജിസ്റ്റർ ചെയ്തവരും മൈഗ്രേറ്റ് ചെയ്തതുമായ <span className="font-black text-brand-magenta text-sm underline">{countOf2026Members}</span> മെമ്പർമാരുടെ ജോയിനിംഗ് തീയതി ഇപ്പോഴും 2026 ലാണ് കിടക്കുന്നത്. ഇവരെ എത്രയും വേഗം 2025 ലേക്ക് മാറ്റുകയും കാർഡ് കാലാവധി കഴിഞ്ഞ് പുതുക്കേണ്ട സമയം കഴിഞ്ഞതായി (Renewal Required) രേഖപ്പെടുത്തുകയും വേണം. അംഗങ്ങൾക്ക് ലോഗിൻ ചെയ്യുമ്പോൾ റിന്യൂവൽ പേജ് വരാൻ ഇത് സഹായിക്കും.
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-normal">
                      Align {countOf2026Members} members to joining year 2025. This makes their cards expired (due for ₹100 renewal) and prompts them to renew when they access their account.
                    </p>
                  </div>
                  <Button
                    onClick={handleAlignAllDatesTo2025}
                    disabled={isAligningDates}
                    className="bg-brand-magenta hover:bg-brand-magenta/95 text-white font-black text-xs uppercase tracking-widest px-6 py-6 h-auto shrink-0 shadow-lg shadow-brand-magenta/15 hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl cursor-pointer"
                  >
                    {isAligningDates ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        പെൻഡിങ് വിവരങ്ങൾ പുതുക്കുന്നു...
                      </span>
                    ) : (
                      "എല്ലാവരെയും 2025 ആക്കുക (Align to 2025)"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(val) => setActiveTab2(val)} className="space-y-6">
              {/* Row 1: Nav Tabs */}
              <div className="w-full">
                <TabsList className="bg-slate-100/80 backdrop-blur-md border border-slate-200/40 p-1.5 !h-auto flex flex-wrap justify-start items-center rounded-2xl w-full gap-1">
                  <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex-1 md:flex-none py-2 px-3 transition-all">
                    Directory <Badge className="ml-1.5 bg-slate-100 text-slate-500 border-none text-[8px] px-1.5 py-0">{stats.active}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex-1 md:flex-none py-2 px-3 transition-all">
                    Requests <Badge className="ml-1.5 bg-brand-blue/10 text-brand-blue border-none text-[8px] px-1.5 py-0">{stats.pending}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="deleted" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex-1 md:flex-none py-2 px-3 transition-all">
                    Deactivated <Badge className="ml-1.5 bg-red-550/10 text-red-500 border-none text-[8px] px-1.5 py-0">{members.filter(m => m.status === 'deleted').length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="renewals" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex-1 md:flex-none py-2 px-3 transition-all">
                    Renewals <Badge className="ml-1.5 bg-orange-100 text-orange-600 border-none text-[8px] px-1.5 py-0">{stats.renewals}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="valid_active" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex-1 md:flex-none py-2 px-3 transition-all">
                    Active & Valid (വാലിഡിറ്റിയുള്ളവർ) <Badge className="ml-1.5 bg-green-100 text-green-600 border-none text-[8px] px-1.5 py-0">{validActiveCount}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="quotas" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                    <Settings className="w-3 h-3 text-slate-400" />
                    Settings & Quotas (വാട്സപ്പ് സെറ്റിങ്സ്/കോട്ട)
                  </TabsTrigger>
                  <TabsTrigger value="districts" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                    <Lock className="w-3 h-3 text-slate-400" />
                    District URLs
                  </TabsTrigger>
                  <TabsTrigger value="claims" className="data-[state=active]:bg-white data-[state=active]:text-brand-magenta data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                    <MessageCircle className="w-3 h-3 text-brand-magenta" />
                    Claims <Badge className="ml-1.5 bg-brand-magenta text-white border-none text-[8px] px-1.5 py-0">{claims.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="fast_entry" className="data-[state=active]:bg-white data-[state=active]:text-brand-magenta data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                    <UserPlus className="w-3 h-3 text-brand-magenta" />
                    Fast Entry
                  </TabsTrigger>
                  <TabsTrigger value="tickets" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                    <Headphones className="w-3 h-3 text-emerald-500" />
                    AI Support Inquiries <Badge className="ml-1.5 bg-emerald-500 text-white border-none text-[8px] px-1.5 py-0">{supportTickets.filter(t => t.status === 'pending').length}</Badge>
                  </TabsTrigger>
                  {isSuperAdmin && (
                    <TabsTrigger value="life_members" className="data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Life Members
                    </TabsTrigger>
                  )}
                  {(isSuperAdmin || user?.role === 'admin') && (
                    <TabsTrigger value="bulk_import" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                      <Download className="w-3 h-3 text-slate-400" />
                      Bulk Import
                    </TabsTrigger>
                  )}
                  {!isSecondary && (
                    <TabsTrigger value="branding" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                      <Globe className="w-3 h-3 text-slate-400" />
                      Branding & CMS
                    </TabsTrigger>
                  )}
                  {(isSuperAdmin || user?.role === 'admin') && (
                    <TabsTrigger value="gallery_mgmt" className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm font-bold text-[10px] uppercase text-slate-500 rounded-lg flex items-center gap-1.5 flex-1 md:flex-none py-2 px-3 transition-all">
                      <ImageIcon className="w-3 h-3 text-slate-400" />
                      Gallery Management
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* Row 2: Search & Filter controls */}
              {['list', 'deleted', 'requests', 'renewals', 'valid_active', 'quotas', 'districts', 'claims'].includes(activeTab) && (
                <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/80 dark:border-slate-800/60 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Search Bar */}
                  <div className="flex-1 min-w-[280px]">
                    <div className="relative w-full">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Search member by name, phone or ID... (അംഗങ്ങളെ പേര്, ഫോൺ അല്ലെങ്കിൽ ID വഴി തിരയുക)" 
                        className="pl-10 pr-4 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 h-11 rounded-xl text-xs font-bold w-full focus:border-brand-blue/30 focus:ring-1 focus:ring-brand-blue/10 transition-all placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {onRefreshMembers && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSyncingMembers}
                        onClick={onRefreshMembers}
                        className="h-11 px-4 gap-2 font-bold border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-blue bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs cursor-pointer select-none active:scale-[0.98] transition-all"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400", isSyncingMembers && "animate-spin")} />
                        {isSyncingMembers ? 'Syncing...' : 'Refresh'}
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Select disabled={!isSuperAdmin && !!user?.district} value={districtFilter} onValueChange={setDistrictFilter}>
                        <SelectTrigger className="flex-1 sm:w-[130px] h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 rounded-xl text-xs font-bold disabled:opacity-75 focus:outline-none">
                          <SelectValue placeholder="District" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          <SelectItem value="all">All districts</SelectItem>
                          {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="flex-1 sm:w-[130px] h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 rounded-xl text-xs font-bold focus:outline-none">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Total Entry</SelectItem>
                          <SelectItem value="online">Online Direct</SelectItem>
                          <SelectItem value="manual">Operator/Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="flex-1 sm:w-[130px] h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 rounded-xl text-xs font-bold focus:outline-none">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Category</SelectItem>
                          <SelectItem value="LIFE_MEMBER">Life Members</SelectItem>
                          <SelectItem value="ADHOC_MEMBER">Adhoc Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <TabsContent value="life_members">
                <LifeMembersPanel 
                  members={members} 
                  adminUser={user} 
                />
              </TabsContent>

              <TabsContent value="fast_entry">
                <FastMemberEntry 
                  adminUser={user} 
                  districtQuotas={districtQuotas} 
                  districtQuotasUsed={districtQuotasUsed} 
                />
              </TabsContent>

              <TabsContent value="bulk_import">
                <BulkImportManager 
                  members={members} 
                  adminUser={user} 
                  onRefresh={() => {}} 
                />
              </TabsContent>

              <TabsContent value="gallery_mgmt">
                <GalleryManagement user={user} />
              </TabsContent>

              <TabsContent value="branding">
                <BrandingManager />
              </TabsContent>

              <TabsContent value="renewals">
             <Card className="border-none shadow-sm overflow-hidden p-6 bg-white min-h-[400px]">
                <div className="flex items-center gap-3 mb-6">
                   <div className="bg-brand-magenta/10 p-2 rounded-xl">
                      <RefreshCw className="w-5 h-5 text-brand-magenta" />
                   </div>
                   <div>
                      <h3 className="font-black text-slate-900 tracking-tight">Pending Renewals</h3>
                      <p className="text-xs text-slate-500 font-bold">Review and approve annual membership renewals.</p>
                   </div>
                </div>

                <div className="space-y-4">
                  {pendingRenewals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                       <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
                       <p className="font-black uppercase tracking-widest text-[10px]">
                         {searchTerm || districtFilter !== 'all' ? 'No matching renewals' : 'No pending renewals'}
                       </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pendingRenewals.map((member) => (
                        <div key={member.uid} className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[28px] space-y-4 hover:border-brand-blue/20 transition-all group">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar 
                                className="h-12 w-12 rounded-2xl border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setViewingMember(member)}
                              >
                                <AvatarImage src={member.photoUrl} className="object-cover" />
                                <AvatarFallback className="bg-brand-blue/20 text-brand-blue font-black">{(member.name || '?').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-black text-slate-900 leading-none truncate max-w-[140px] uppercase">{member.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">{member.membershipId}</p>
                              </div>
                            </div>
                            <div className="bg-brand-magenta/10 p-2 rounded-xl text-brand-magenta">
                               <Plus className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-200">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                               <Receipt className="w-3.5 h-3.5 text-brand-magenta" />
                               Renewal Payment Detail
                             </p>
                             <div className="flex justify-between items-end">
                                <div>
                                   <p className="text-[11px] font-black text-slate-700">Ref: {(member as any).renewalTransactionId || 'N/A'}</p>
                                   <p className="text-[9px] font-bold text-slate-400">Submitted: {member.renewalDate ? (member.renewalDate.toDate ? member.renewalDate.toDate().toLocaleDateString() : new Date(member.renewalDate).toLocaleDateString()) : 'Today'}</p>
                                   {((member as any).renewalPaymentDate || (member as any).renewalPaymentTime) && (
                                     <p className="text-[9px] font-extrabold text-[#0066FF] mt-0.5">
                                       Transferred: {(member as any).renewalPaymentDate || ''} {(member as any).renewalPaymentTime || ''}
                                     </p>
                                   )}
                                </div>
                                <div className="text-right">
                                   <p className="text-xl font-black text-brand-magenta leading-none">₹100</p>
                                   <p className="text-[9px] font-black text-brand-magenta/40 uppercase tracking-tighter">Annual Fee</p>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                             <Button 
                               onClick={() => handleApproveRenewal(member)}
                               className="flex-1 bg-green-600 hover:bg-green-700 font-black rounded-xl h-11 text-[11px] uppercase tracking-wide"
                             >
                                Approve
                             </Button>
                             <Button 
                               variant="outline"
                               onClick={() => setViewingMember(member)}
                               className="px-4 border-slate-200 font-black rounded-xl h-11 text-[11px] uppercase hover:bg-brand-blue/5 hover:text-brand-blue transition-all"
                             >
                                View
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             </Card>
          </TabsContent>
          <TabsContent value="list">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-200">
                    <TableHead className="w-[80px]">Photo</TableHead>
                    <TableHead>Member Info</TableHead>
                    <TableHead className="hidden lg:table-cell">District/Assly</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead className="hidden md:table-cell">ID Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {paginatedMembers.map((member) => (
                    <TableRow key={member.uid} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                      <TableCell>
                        <div className="relative group cursor-pointer" onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file && onUpdatePhoto) {
                              onUpdatePhoto(file, member.uid);
                            }
                          };
                          input.click();
                        }}>
                          <Avatar className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 group-hover:opacity-70 transition-all">
                            <AvatarImage src={member.photoUrl} alt={member.name} className="object-cover" />
                            <AvatarFallback className="bg-brand-blue/20 text-brand-blue rounded-lg font-bold">
                              {(member.name || '?').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <Camera className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="font-semibold text-slate-900 cursor-pointer hover:text-brand-blue decoration-dotted hover:underline transition-colors flex items-center gap-1.5 flex-wrap"
                          onClick={() => setViewingMember(member)}
                        >
                          <span>{member.name}</span>
                          {(member.membership_type || 'ADHOC_MEMBER') === 'LIFE_MEMBER' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-550 border border-amber-200 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                              ⭐ LIFE MEMBER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              ADHOC MEMBER
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            {member.mobile}
                          </div>
                          <div className="text-[10px] text-brand-blue font-bold flex items-center gap-1 bg-brand-blue/10 px-1.5 py-0.5 rounded w-fit">
                            <Lock className="w-2.5 h-2.5" /> Password: {member.pin || '123456'}
                          </div>
                          
                          {/* Family claims indicator on Member row */}
                          {(() => {
                            const mClaims = claims.filter(c => c.uid === member.uid || (member.mobile && c.userMobile === member.mobile));
                            if (mClaims.length === 0) return null;
                            return (
                              <div className="mt-2 space-y-1 bg-brand-magenta/[0.03] border border-brand-magenta/15 rounded-xl p-2 max-w-[240px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black uppercase text-brand-magenta tracking-widest flex items-center gap-1">
                                    {mClaims.length > 1 ? (
                                      <>👥 Combo <span className="text-[7px] text-[#FF1493] bg-[#FF1493]/10 px-1 py-0.2 rounded font-black font-mono">({mClaims.length})</span></>
                                    ) : '📋 Claim'}
                                  </span>
                                  <span className="text-[9px] font-black text-brand-magenta font-mono">
                                    ₹{mClaims.reduce((acc, c) => acc + (c.totalPending || 0), 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5 mt-1 border-t border-brand-magenta/10 pt-1">
                                  {mClaims.slice(0, 3).map((cl, cidx) => (
                                    <div key={cl.id || cidx} className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                                      <span className="truncate max-w-[130px] font-extrabold">{cl.userName}</span>
                                      <span className="text-brand-magenta font-black">₹{cl.totalPending?.toLocaleString('en-IN')}</span>
                                    </div>
                                  ))}
                                  {mClaims.length > 3 && (
                                    <div className="text-[8px] font-bold text-slate-400 text-right mt-0.5">
                                      +{mClaims.length - 3} more...
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm font-medium text-slate-700">
                          {DISTRICTS.find(d => d.code === member.district)?.name || member.district}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {member.assemblyConstituency}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.registeredBy ? (
                          <div className="flex flex-col gap-1">
                             <Badge variant="outline" className="w-fit text-[9px] font-black uppercase text-brand-magenta border-brand-magenta/20 bg-brand-magenta/5">Manual</Badge>
                             <div className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]" title={member.registeredByName}>
                               By: {member.registeredByName || '---'}
                             </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="w-fit text-[9px] font-black uppercase text-brand-blue border-brand-blue/20 bg-brand-blue/5">Online</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs font-mono font-bold text-brand-blue bg-brand-blue/10 px-2 py-1 rounded inline-block">
                          {member.membershipId}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                          SN: {member.serialNo}
                        </div>
                        <div className="mt-2 space-y-1 text-[10px] border-t border-slate-100 pt-1.5 font-sans">
                          <div className="flex items-center gap-1 text-slate-500 font-semibold" title="Joining Date">
                            <span className="font-extrabold text-slate-400">Join:</span> 
                            {member.registrationDate?.toDate ? member.registrationDate.toDate().toLocaleDateString('en-IN') : (member.registrationDate ? new Date(member.registrationDate).toLocaleDateString('en-IN') : 'N/A')}
                          </div>
                          
                          {member.renewalDate && (
                            <div className="flex items-center gap-1 text-[#FF1493] font-bold" title="Last Renewed Date">
                              <span className="font-extrabold text-pink-400">Renewal:</span> 
                              {member.renewalDate?.toDate ? member.renewalDate.toDate().toLocaleDateString('en-IN') : new Date(member.renewalDate).toLocaleDateString('en-IN')}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-slate-500 font-semibold" title="Expiry/Validity Date">
                            <span className="font-extrabold text-slate-400">Expiry:</span> 
                            {member.expiryDate?.toDate ? member.expiryDate.toDate().toLocaleDateString('en-IN') : (member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('en-IN') : 'N/A')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="space-y-2">
                            {member.waStatus === 'Pending' && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-[8px] font-black uppercase text-brand-magenta border-brand-magenta/30 bg-brand-magenta/5 leading-none py-0.5 px-2">
                                  WA: Pending
                                </Badge>
                              </div>
                            )}
                            {member.waStatus === 'Sent' && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 border-green-200 bg-green-50 leading-none py-0.5 px-2">
                                  WA: Sent
                                </Badge>
                              </div>
                            )}
                            {member.status === 'active' ? (
                             <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2.5 py-0.5 rounded-full font-bold">Active</Badge>
                           ) : member.status === 'pending' ? (
                             <div className="flex flex-col gap-1">
                               <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-2.5 py-0.5 rounded-full font-bold">Pending Approval</Badge>
                             </div>
                           ) : (
                             <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-2.5 py-0.5 rounded-full font-bold">Offline</Badge>
                           )}

                           {(member.registeredByName || member.certAdminName) && (
                             <div className="p-2 bg-brand-blue/5 border border-brand-blue/10 rounded-xl w-fit">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] leading-none mb-1">Entry Identity (എന്റർ ചെയ്ത ആൾ):</p>
                               <p className="text-[10px] font-black text-brand-blue uppercase leading-none truncate max-w-[120px]" title={member.certAdminName || member.registeredByName}>
                                 {member.certAdminName || member.registeredByName}
                               </p>
                               <p className="text-[8px] font-bold text-slate-400 mt-1 truncate max-w-[120px]" title={member.certAdminEmail || 'No Email'}>
                                 {member.certAdminEmail || 'No Email'}
                               </p>
                             </div>
                           )}
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {member.status === 'pending' && (
                             <Button 
                              size="sm" 
                              onClick={() => handleApproveWithWhatsApp(member)}
                              className="bg-green-600 hover:bg-green-700 h-8 font-bold text-xs"
                            >
                               Approve
                            </Button>
                          )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                sendWAMessage({
                                  name: member.name,
                                  mobile: member.mobile,
                                  uid: member.uid,
                                  pin: member.pin,
                                  membershipId: member.membershipId
                                });
                              }}
                              className="h-8 w-8 text-green-600 hover:bg-green-50"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingMember(member)}
                            className="h-8 w-8 text-brand-blue hover:bg-brand-blue/10"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMember(member)}
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(member.uid)}
                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                              title="Delete Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 p-0 hover:bg-slate-100")}>
                              <MoreVertical className="h-4 w-4 text-slate-500" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-1 bg-white border border-slate-200 shadow-xl z-[100]">
                              <DropdownMenuLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 py-1.5">More Options</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => {
                                  onUpdate(member.uid, { role: 'admin', isAdmin: true });
                                  toast.success(`${member.name} made District Admin`);
                                }}
                                className="rounded-md font-medium text-brand-blue"
                              >
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Make District Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  onUpdate(member.uid, { role: 'operator', quota: 50 });
                                  toast.success(`${member.name} made Operator with 50 entries limit`);
                                }}
                                className="rounded-md font-medium text-brand-blue"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Make Operator
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem 
                                onClick={() => onResetPin?.(member.uid)}
                                className="rounded-md text-orange-600 font-medium"
                              >
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(member.uid)}
                                className="text-red-500 rounded-md font-bold"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredMembers.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-slate-100 bg-white">
                  <p className="text-xs font-bold text-slate-500">
                    Showing {Math.min(filteredMembers.length, (currentPage - 1) * itemsPerPage + 1)}–{Math.min(filteredMembers.length, currentPage * itemsPerPage)} of {filteredMembers.length} results
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl h-9 px-3 text-xs font-black border-slate-200"
                    >
                      PREV
                    </Button>
                    {Array.from({ length: Math.ceil(filteredMembers.length / itemsPerPage) }).map((_, idx) => {
                      const pNum = idx + 1;
                      if (pNum === 1 || pNum === Math.ceil(filteredMembers.length / itemsPerPage) || Math.abs(currentPage - pNum) <= 1) {
                        return (
                          <Button
                            key={pNum}
                            variant={currentPage === pNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pNum)}
                            className={cn(
                              "rounded-xl h-9 w-9 p-0 text-xs font-black",
                              currentPage === pNum ? "bg-brand-magenta text-white hover:bg-brand-magenta/90" : "border-slate-200"
                            )}
                          >
                            {pNum}
                          </Button>
                        );
                      }
                      if (pNum === 2 || pNum === Math.ceil(filteredMembers.length / itemsPerPage) - 1) {
                        return <span className="text-slate-400 text-xs px-1" key={`ellipsis-${pNum}`}>...</span>;
                      }
                      return null;
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredMembers.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredMembers.length / itemsPerPage)}
                      className="rounded-xl h-9 px-3 text-xs font-black border-slate-200"
                    >
                      NEXT
                    </Button>
                  </div>
                </div>
              )}
              {filteredMembers.length === 0 && (
                <div className="py-20 text-center bg-white">
                   <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="text-slate-300 w-8 h-8" />
                   </div>
                   <p className="text-slate-500 font-medium tracking-tight">No members found matching your search.</p>
                   <p className="text-slate-400 text-sm mt-1">Waiting for new membership applications.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="valid_active">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-200">
                    <TableHead className="w-[80px]">Photo</TableHead>
                    <TableHead>Member Info</TableHead>
                    <TableHead className="hidden lg:table-cell">District/Assly</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead className="hidden md:table-cell">ID Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {paginatedValidActiveMembers.map((member) => (
                    <TableRow key={member.uid} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                      <TableCell>
                        <div className="relative group cursor-pointer" onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file && onUpdatePhoto) {
                              onUpdatePhoto(file, member.uid);
                            }
                          };
                          input.click();
                        }}>
                          <Avatar className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 group-hover:opacity-70 transition-all">
                            <AvatarImage src={member.photoUrl} alt={member.name} className="object-cover" />
                            <AvatarFallback className="bg-brand-blue/20 text-brand-blue rounded-lg font-bold">
                              {(member.name || '?').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <Camera className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="font-semibold text-slate-900 cursor-pointer hover:text-brand-blue decoration-dotted hover:underline transition-colors flex items-center gap-1.5 flex-wrap"
                          onClick={() => setViewingMember(member)}
                        >
                          <span>{member.name}</span>
                          {(member.membership_type || 'ADHOC_MEMBER') === 'LIFE_MEMBER' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-550 border border-amber-200 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                              ⭐ LIFE MEMBER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              ADHOC MEMBER
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            {member.mobile}
                          </div>
                          <div className="text-[10px] text-brand-blue font-bold flex items-center gap-1 bg-brand-blue/10 px-1.5 py-0.5 rounded w-fit">
                            <Lock className="w-2.5 h-2.5" /> Password: {member.pin || '123456'}
                          </div>
                          
                          {/* Family claims indicator on Member row */}
                          {(() => {
                            const mClaims = claims.filter(c => c.uid === member.uid || (member.mobile && c.userMobile === member.mobile));
                            if (mClaims.length === 0) return null;
                            return (
                              <div className="mt-2 space-y-1 bg-brand-magenta/[0.03] border border-brand-magenta/15 rounded-xl p-2 max-w-[240px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black uppercase text-brand-magenta tracking-widest flex items-center gap-1">
                                    {mClaims.length > 1 ? (
                                      <>👥 Combo <span className="text-[7px] text-[#FF1493] bg-[#FF1493]/10 px-1 py-0.2 rounded font-black font-mono">({mClaims.length})</span></>
                                    ) : '📋 Claim'}
                                  </span>
                                  <span className="text-[9px] font-black text-brand-magenta font-mono">
                                    ₹{mClaims.reduce((acc, c) => acc + (c.totalPending || 0), 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5 mt-1 border-t border-brand-magenta/10 pt-1">
                                  {mClaims.slice(0, 3).map((cl, cidx) => (
                                    <div key={cl.id || cidx} className="flex justify-between items-center text-[9px] font-bold text-slate-650">
                                      <span className="truncate max-w-[130px] font-extrabold">{cl.userName}</span>
                                      <span className="text-brand-magenta font-black">₹{cl.totalPending?.toLocaleString('en-IN')}</span>
                                    </div>
                                  ))}
                                  {mClaims.length > 3 && (
                                    <div className="text-[8px] font-bold text-slate-400 text-right mt-0.5">
                                      +{mClaims.length - 3} more...
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm font-medium text-slate-700">
                          {DISTRICTS.find(d => d.code === member.district)?.name || member.district}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {member.assemblyConstituency}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.registeredBy ? (
                          <div className="flex flex-col gap-1">
                             <Badge variant="outline" className="w-fit text-[9px] font-black uppercase text-brand-magenta border-brand-magenta/20 bg-brand-magenta/5">Manual</Badge>
                             <div className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]" title={member.registeredByName}>
                               By: {member.registeredByName || '---'}
                             </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="w-fit text-[9px] font-black uppercase text-brand-blue border-brand-blue/20 bg-brand-blue/5">Online</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs font-mono font-bold text-brand-blue bg-brand-blue/10 px-2 py-1 rounded inline-block">
                          {member.membershipId}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                          SN: {member.serialNo}
                        </div>
                        <div className="mt-2 space-y-1 text-[10px] border-t border-slate-100 pt-1.5 font-sans">
                          <div className="flex items-center gap-1 text-slate-500 font-semibold" title="Joining Date">
                            <span className="font-extrabold text-slate-400">Join:</span> 
                            {member.registrationDate?.toDate ? member.registrationDate.toDate().toLocaleDateString('en-IN') : (member.registrationDate ? new Date(member.registrationDate).toLocaleDateString('en-IN') : 'N/A')}
                          </div>
                          
                          {member.renewalDate && (
                            <div className="flex items-center gap-1 text-[#FF1493] font-bold" title="Last Renewed Date">
                              <span className="font-extrabold text-pink-400">Renewal:</span> 
                              {member.renewalDate?.toDate ? member.renewalDate.toDate().toLocaleDateString('en-IN') : new Date(member.renewalDate).toLocaleDateString('en-IN')}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-slate-500 font-semibold" title="Expiry/Validity Date">
                            <span className="font-extrabold text-slate-400">Expiry:</span> 
                            {member.expiryDate?.toDate ? member.expiryDate.toDate().toLocaleDateString('en-IN') : (member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('en-IN') : 'N/A')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="space-y-2">
                             <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2.5 py-0.5 rounded-full font-bold">Active & Valid</Badge>
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                sendWAMessage({
                                  name: member.name,
                                  mobile: member.mobile,
                                  uid: member.uid,
                                  pin: member.pin,
                                  membershipId: member.membershipId
                                });
                              }}
                              className="h-8 w-8 text-green-600 hover:bg-green-50"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingMember(member)}
                            className="h-8 w-8 text-brand-blue hover:bg-brand-blue/10"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMember(member)}
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(member.uid)}
                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                              title="Delete Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredValidActiveMembers.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-slate-100 bg-white">
                  <p className="text-xs font-bold text-slate-500">
                    Showing {Math.min(filteredValidActiveMembers.length, (validActivePage - 1) * itemsPerPage + 1)}–{Math.min(filteredValidActiveMembers.length, validActivePage * itemsPerPage)} of {filteredValidActiveMembers.length} results
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setValidActivePage(prev => Math.max(1, prev - 1))}
                      disabled={validActivePage === 1}
                      className="rounded-xl h-9 px-3 text-xs font-black border-slate-200"
                    >
                      PREV
                    </Button>
                    {Array.from({ length: Math.ceil(filteredValidActiveMembers.length / itemsPerPage) }).map((_, idx) => {
                      const pNum = idx + 1;
                      if (pNum === 1 || pNum === Math.ceil(filteredValidActiveMembers.length / itemsPerPage) || Math.abs(validActivePage - pNum) <= 1) {
                        return (
                          <Button
                            key={`page-${pNum}`}
                            onClick={() => setValidActivePage(pNum)}
                            variant={validActivePage === pNum ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                              "w-9 h-9 p-0 font-black rounded-xl text-xs",
                              validActivePage === pNum ? "bg-brand-magenta text-white hover:bg-brand-magenta/90" : "border-slate-200"
                            )}
                          >
                            {pNum}
                          </Button>
                        );
                      }
                      if (pNum === 2 || pNum === Math.ceil(filteredValidActiveMembers.length / itemsPerPage) - 1) {
                        return <span className="text-slate-400 text-xs px-1" key={`ellipsis-${pNum}`}>...</span>;
                      }
                      return null;
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setValidActivePage(prev => Math.min(Math.ceil(filteredValidActiveMembers.length / itemsPerPage), prev + 1))}
                      disabled={validActivePage === Math.ceil(filteredValidActiveMembers.length / itemsPerPage)}
                      className="rounded-xl h-9 px-3 text-xs font-black border-slate-200"
                    >
                      NEXT
                    </Button>
                  </div>
                </div>
              )}
              {filteredValidActiveMembers.length === 0 && (
                <div className="py-20 text-center bg-white">
                   <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="text-slate-300 w-8 h-8" />
                   </div>
                   <p className="text-slate-500 font-medium tracking-tight">No active & valid members found matching your search.</p>
                   <p className="text-slate-400 text-sm mt-1">Make sure you have approved renewals.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="requests">
             <Card className="border-none shadow-sm overflow-hidden">
                <div className="bg-white">
                  {pendingRequests.length > 0 && (
                    <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-left">
                        <h4 className="font-extrabold text-slate-800 text-sm">Pending Membership Approval (അപ്പ്രൂവൽ ചെയ്യാൻ ബാക്കിയുള്ളവർ)</h4>
                        <p className="text-xs text-slate-500">{pendingRequests.length} members are currently waiting for approval.</p>
                      </div>
                      <Button 
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to approve all ${pendingRequests.length} pending members now? (തീർച്ചയായും ഈ ${pendingRequests.length} അംഗങ്ങളെയും അപ്പ്രൂവ് ചെയ്യണമെന്നുണ്ടോ?)`)) {
                            const loadToast = toast.loading('Approving all pending members...');
                            try {
                              let count = 0;
                              for (const m of pendingRequests) {
                                const paddedSerial = String(m.serialNo || 1000).padStart(3, '0');
                                const distCode = getDistrictCode(m.district || 'MLP').toUpperCase();
                                const assemblyCode = getAssemblyCode(m.assemblyConstituency || '').toUpperCase();
                                const isUpgraded = m.membershipId && m.membershipId.toUpperCase().startsWith('HCRS-');
                                const finalId = isUpgraded 
                                  ? m.membershipId 
                                  : `KL/${distCode}/${assemblyCode}/${paddedSerial}`;
                                
                                const expiry = new Date();
                                expiry.setFullYear(expiry.getFullYear() + 1);

                                await updateDoc(doc(db, 'users', m.uid), {
                                  status: 'active',
                                  isApproved: true,
                                  membershipId: finalId,
                                  issueDate: serverTimestamp(),
                                  registrationDate: serverTimestamp(), // Join Date is given as the exact day of approval
                                  expiryDate: expiry,
                                  waStatus: orgSettings?.registrationMode === 'bulk' ? 'Pending' : 'Sent',
                                  stateCode: 'KL',
                                  districtCode: distCode,
                                  constituencyCode: assemblyCode
                                });
                                count++;
                              }
                              toast.success(`Successfully approved ${count} pending members!`, { id: loadToast });
                            } catch (error) {
                              console.error("Bulk approval error:", error);
                              toast.error("Bulk approval failed.", { id: loadToast });
                            }
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 font-bold px-5 h-10 rounded-xl text-white text-xs uppercase tracking-wider shrink-0 flex items-center gap-2 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve All Pending / പെന്റിങ് എല്ലാം അപ്രൂവ് ചെയ്യുക
                      </Button>
                    </div>
                  )}
                  {pendingRequests.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-green-300 w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-medium tracking-tight">
                        {searchTerm || districtFilter !== 'all' ? 'No matching requests' : 'All caught up!'}
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        {searchTerm || districtFilter !== 'all' ? 'Try adjusting your filters.' : 'No pending membership requests at the moment.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {pendingRequests.map((member) => (
                        <div key={member.uid} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex gap-4">
                            <Avatar 
                              className="h-16 w-16 rounded-2xl border-2 border-white shadow-sm bg-slate-50 cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setViewingMember(member)}
                            >
                              <AvatarImage src={member.photoUrl} className="object-cover" />
                              <AvatarFallback className="text-xl font-bold rounded-2xl bg-brand-blue/20 text-brand-blue">
                                {(member.name || '?').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <h3 className="text-xl font-bold text-slate-900">{member.name}</h3>
                              {member.mobile && (
                                <p className="text-slate-700 flex items-center gap-1.5 font-extrabold text-sm bg-slate-100 hover:bg-slate-200/70 transition-colors w-fit px-3 py-1 rounded-lg">
                                  <Smartphone className="w-4 h-4 text-brand-blue" />
                                  <a href={`tel:${member.mobile}`} className="hover:underline">{member.mobile}</a>
                                </p>
                              )}
                              <p className="text-slate-500 flex items-center gap-1 font-medium italic">
                                <Mail className="w-3.5 h-3.5" /> {member.email}
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-bold">
                                  {DISTRICTS.find(d => d.code === member.district)?.name || member.district} District
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end justify-between gap-4">
                            <div className="bg-brand-magenta/5 border border-brand-magenta/10 p-4 rounded-2xl min-w-[200px]">
                              <div className="flex items-center gap-2 text-brand-magenta font-bold mb-2">
                                <Receipt className="w-4 h-4" />
                                Payment Details
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-sm text-brand-magenta font-bold flex justify-between">
                                  <span className="opacity-60 font-medium text-slate-500">Txn ID:</span>
                                  {member.transactionId || 'Not provided'}
                                </p>
                                {member.paymentDate && (
                                  <p className="text-sm text-brand-magenta font-bold flex justify-between">
                                    <span className="opacity-60 font-medium text-slate-500">Date:</span>
                                    {member.paymentDate}
                                  </p>
                                )}
                                <p className="text-sm text-brand-magenta font-bold flex justify-between">
                                  <span className="opacity-60 font-medium text-slate-500">Time:</span>
                                  {member.paymentTime || 'Not provided'}
                                </p>
                                <p className="text-xs text-slate-400 mt-2 font-medium">
                                  Registered on: {member.registrationDate?.toDate ? member.registrationDate.toDate().toLocaleDateString() : new Date(member.registrationDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                size="lg"
                                onClick={() => handleDeleteClick(member.uid)}
                                className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl h-12"
                              >
                                Reject
                              </Button>
                              <Button 
                                size="lg"
                                onClick={() => handleApproveWithWhatsApp(member)}
                                className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 font-bold rounded-xl px-8 shadow-lg shadow-green-100 h-12"
                              >
                                Approve Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="deleted">
             <Card className="border-none shadow-sm overflow-hidden p-6 bg-white min-h-[400px]">
                <div className="flex items-center gap-3 mb-6">
                   <div className="bg-red-50 p-2 rounded-xl">
                      <Trash2 className="w-5 h-5 text-red-500" />
                   </div>
                   <div>
                      <h3 className="font-black text-slate-900 tracking-tight text-red-600 uppercase">Deactivated Members</h3>
                      <p className="text-xs text-slate-500 font-bold">These members are hidden from the active list but can be restored.</p>
                   </div>
                </div>

                <div className="space-y-4">
                  {members.filter(m => m.status === 'deleted').length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                       <CheckCircle2 className="w-16 h-16 mb-4 opacity-20" />
                       <p className="font-black uppercase tracking-widest text-[10px]">No deactivated members found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {members.filter(m => m.status === 'deleted').map((member) => (
                        <div key={member.uid} className="bg-red-50/30 border-2 border-red-50 p-6 rounded-[28px] space-y-4 group">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-2xl border-2 border-white shadow-sm">
                              <AvatarImage src={member.photoUrl} className="object-cover" />
                              <AvatarFallback className="bg-red-100 text-red-400 font-black">{(member.name || '?').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-black text-slate-900 leading-none truncate max-w-[140px] uppercase">{member.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">{member.mobile}</p>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-white rounded-xl border border-red-100 text-[10px] font-bold text-slate-500">
                             <div className="flex justify-between">
                               <span>Deactivated On:</span>
                               <span className="text-red-500">{(member as any).deletedAt ? ((member as any).deletedAt.toDate ? (member as any).deletedAt.toDate().toLocaleDateString() : new Date((member as any).deletedAt).toLocaleDateString()) : '---'}</span>
                             </div>
                             <div className="flex justify-between mt-1">
                               <span>ID:</span>
                               <span>{member.membershipId}</span>
                             </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                             <Button 
                               onClick={() => {
                                 onUpdate(member.uid, { status: 'active', isApproved: true });
                                 toast.success(`${member.name} restored successfully.`);
                               }}
                               className="flex-1 bg-brand-blue hover:bg-brand-blue/90 font-black rounded-xl h-11 text-[10px] uppercase tracking-wide"
                             >
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                Restore
                             </Button>
                             <Button 
                                variant="outline"
                                onClick={() => setViewingMember(member)}
                                className="border-slate-200 font-bold rounded-xl h-11 text-[10px] uppercase px-3"
                             >
                                Details
                             </Button>
                             <Button 
                                type="button"
                                variant="ghost"
                                onClick={() => handleDeleteClick(member.uid)}
                                className="h-11 w-11 text-red-500 hover:bg-red-550 border border-red-50 hover:text-white hover:bg-red-650 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                title="Delete Permanently / ശാശ്വതമായി ഒഴിവാക്കുക"
                             >
                                <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             </Card>
          </TabsContent>
          
          <TabsContent value="quotas">
            <div className="space-y-8 pb-20">
              {!isSecondary && (
                <>
                  {/* WhatsApp Automation & Registration Mode Setting */}
                  <Card className="border border-slate-200 bg-white/75 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.01)] overflow-hidden mb-6">
                    <CardHeader className="p-6 pb-4">
                       <div className="flex items-center gap-3">
                          <div className="bg-brand-blue/10 p-2 rounded-xl text-brand-blue">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-black text-slate-800 uppercase tracking-tight">Registration Mode</CardTitle>
                            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-0.5">
                              Toggle automatic WhatsApp credentials delivery to prevent admin number blocks during high-volume entries
                            </CardDescription>
                          </div>
                       </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0 space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div 
                           onClick={async () => {
                             try {
                               await saveOrgSettings({ ...orgSettings, registrationMode: 'normal' });
                               toast.success('System switched to Normal Auto Mode');
                             } catch (err) {
                               toast.error('Failed to update registration mode');
                             }
                           }}
                           className={cn(
                             "p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all duration-200 hover:bg-slate-50/50",
                             orgSettings.registrationMode === 'normal' || !orgSettings.registrationMode
                               ? "border-brand-blue bg-brand-blue/[0.02] shadow-xs" 
                               : "border-slate-200 bg-white"
                           )}
                         >
                           <div className={cn(
                             "h-4 w-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                             orgSettings.registrationMode === 'normal' || !orgSettings.registrationMode
                               ? "border-brand-blue text-brand-blue" 
                               : "border-slate-350"
                           )}>
                             {(orgSettings.registrationMode === 'normal' || !orgSettings.registrationMode) && (
                               <div className="h-2 w-2 rounded-full bg-brand-blue" />
                             )}
                           </div>
                           <div>
                             <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Normal Auto Mode</p>
                             <span className="text-[10px] text-slate-500 leading-relaxed font-semibold mt-0.5 block">
                               Automatically triggers credentials message via WhatsApp upon entering new members or approving pending registrations.
                             </span>
                           </div>
                         </div>

                         <div 
                           onClick={async () => {
                             try {
                               await saveOrgSettings({ ...orgSettings, registrationMode: 'bulk' });
                               toast.success('System switched to Bulk Entry Mode (WhatsApp Auto-Send Paused)');
                             } catch (err) {
                               toast.error('Failed to update registration mode');
                             }
                           }}
                           className={cn(
                             "p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all duration-200 hover:bg-slate-50/50",
                             orgSettings.registrationMode === 'bulk'
                               ? "border-brand-magenta bg-brand-magenta/[0.02] shadow-xs" 
                               : "border-slate-200 bg-white"
                           )}
                         >
                           <div className={cn(
                             "h-4 w-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                             orgSettings.registrationMode === 'bulk'
                               ? "border-brand-magenta text-brand-magenta" 
                               : "border-slate-350"
                           )}>
                             {orgSettings.registrationMode === 'bulk' && (
                               <div className="h-2 w-2 rounded-full bg-brand-magenta" />
                             )}
                           </div>
                           <div>
                             <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Bulk Entry Mode</p>
                             <span className="text-[10px] text-slate-500 leading-relaxed font-semibold mt-0.5 block">
                               Disables ONLY automatic WhatsApp credentials sending. All user logins, membership IDs, and cards are created normally. WhatsApp status is saved as <strong className="text-brand-magenta">Pending</strong>.
                             </span>
                           </div>
                         </div>
                       </div>
                    </CardContent>
                  </Card>

                  {/* Promotion Panel */}
                  <Card className="border-2 border-brand-blue/20 bg-brand-blue/5 rounded-[32px] overflow-hidden mb-6">
                    <CardHeader className="p-8">
                       <div className="flex items-center gap-3">
                          <div className="bg-brand-blue p-2 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-black text-brand-dark-purple uppercase">Promote Existing Member to Admin</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1">
                              Search by Mobile or ID to assign administrative roles without creating new profiles.
                            </CardDescription>
                          </div>
                       </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            placeholder="Find member to promote (Name, Mobile, ID)..." 
                            className="pl-10 h-12 rounded-xl bg-white border-brand-blue/10"
                            value={promoSearchTerm}
                            onChange={(e) => setPromoSearchTerm(e.target.value)}
                          />
                       </div>
                       
                       {promotionCandidates.length > 0 && (
                         <div className="mt-4 bg-white rounded-2xl border border-brand-blue/10 overflow-hidden divide-y">
                            {promotionCandidates.map(candidate => (
                              <div key={candidate.uid} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                 <div className="flex items-center gap-3">
                                   <Avatar className="h-10 w-10 border border-slate-200">
                                      <AvatarImage src={candidate.photoUrl} />
                                      <AvatarFallback className="bg-slate-100 italic text-[10px]">{(candidate.name || '?').charAt(0)}</AvatarFallback>
                                   </Avatar>
                                   <div className="flex flex-col">
                                      <span className="font-black text-xs uppercase text-slate-800">{candidate.name}</span>
                                      <span className="text-[10px] font-bold text-slate-400">
                                         {candidate.mobile} | {candidate.membershipId} | {DISTRICTS.find(d => d.code === candidate.district)?.name || candidate.district}
                                      </span>
                                   </div>
                                 </div>
                                 <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      className="h-8 rounded-lg bg-brand-magenta text-white font-black text-[9px] uppercase"
                                      onClick={() => {
                                        if (confirm(`Promote ${candidate.name} to Second Admin for ${DISTRICTS.find(d => d.code === candidate.district)?.name || 'their district'}?`)) {
                                          onUpdate(candidate.uid, { role: 'admin', isAdmin: true, quota: 100 });
                                          setPromoSearchTerm('');
                                          setViewingMember({ ...candidate, role: 'admin', isAdmin: true });
                                          toast.success(`${candidate.name} is now a Second Admin!`);
                                        }
                                      }}
                                    >
                                      Promote as Admin
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="h-8 rounded-lg text-brand-blue font-black text-[9px] uppercase hover:bg-brand-blue/10"
                                      onClick={() => {
                                        if (confirm(`Promote ${candidate.name} to District Operator?`)) {
                                          onUpdate(candidate.uid, { role: 'operator', isAdmin: false, quota: 50 });
                                          setPromoSearchTerm('');
                                          toast.success(`${candidate.name} is now an Operator!`);
                                        }
                                      }}
                                    >
                                      Promotion as Operator
                                    </Button>
                                 </div>
                              </div>
                            ))}
                         </div>
                       )}
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-brand-magenta/20 bg-white rounded-[32px] overflow-hidden shadow-sm">
                    <CardHeader className="bg-brand-magenta/5 border-b border-brand-magenta/10 p-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-brand-magenta p-2 rounded-xl">
                          <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black text-brand-dark-purple tracking-tight uppercase">District Second Admins</CardTitle>
                          <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 flex flex-col gap-1">
                            <span>Manage dedicated administrators for each district and track their performance</span>
                            <span className="text-brand-magenta/60 italic lowercase font-medium">* ഇതിനകം മെമ്പർ ആയിട്ടുള്ള ഒരാളെയാണ് സെക്കൻഡ് അഡ്മിൻ ആക്കേണ്ടതെങ്കിൽ 'Member List'-ൽ പോയി തിരഞ്ഞെടുത്താൽ മതിയാകും.</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-200">
                              <TableHead>District</TableHead>
                              <TableHead>Assigned Second Admin</TableHead>
                              <TableHead>Entries Processed</TableHead>
                              <TableHead className="text-right">Admin Control</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {DISTRICTS.map((dist) => {
                              const admin = members.find(m => m.role === 'admin' && m.district === dist.code && !MAIN_ADMINS.includes(m.email));
                              
                              return (
                                  <TableRow key={dist.code} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                                          <MapPin className="w-4 h-4 text-brand-blue" />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-black text-slate-800 uppercase text-xs">{dist.name}</span>
                                          <span className="text-[9px] font-bold text-slate-400">District HQ</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {admin ? (
                                        <div className="space-y-4">
                                          <div className="flex flex-col p-3 bg-brand-magenta/5 border border-brand-magenta/10 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-2">
                                              <ShieldCheck className="w-3 h-3 text-brand-magenta" />
                                              <span className="text-[10px] font-black text-brand-magenta uppercase tracking-wider">
                                                {getAdminLabel(admin.email)}
                                              </span>
                                            </div>
                                            <span className="font-black text-brand-dark-purple text-xs uppercase">{admin.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{admin.email}</span>
                                            <div className="flex items-center gap-1.5 mt-2">
                                              <div className="px-2 py-0.5 bg-white border border-brand-magenta/20 rounded uppercase text-[8px] font-black text-brand-magenta">
                                                ID: {admin.membershipId}
                                              </div>
                                              <div className="px-2 py-0.5 bg-white border border-slate-200 rounded uppercase text-[8px] font-black text-slate-500">
                                                PW: {admin.pin || 'HCRS@123'}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Identity Breakdown */}
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Users className="w-3 h-3 text-brand-blue" />
                                              <span className="text-[9px] font-black text-brand-blue uppercase tracking-wider">Active Identities</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {Array.from(new Set(members
                                                .filter(m => m.district === dist.code && m.registeredBy === admin.uid)
                                                .map(m => m.certAdminName || m.registeredByName)
                                                .filter(Boolean)
                                              )).slice(0, 3).map((name, i) => (
                                                <div key={i} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                                  <p className="text-[9px] font-black text-slate-600 uppercase leading-none">{name}</p>
                                                </div>
                                              ))}
                                              {Array.from(new Set(members
                                                .filter(m => m.district === dist.code && m.registeredBy === admin.uid)
                                                .map(m => m.certAdminName || m.registeredByName)
                                                .filter(Boolean)
                                              )).length > 3 && (
                                                <Badge variant="outline" className="text-[8px] h-5 border-slate-200 font-bold">
                                                  +{Array.from(new Set(members
                                                    .filter(m => m.district === dist.code && m.registeredBy === admin.uid)
                                                    .map(m => m.certAdminName || m.registeredByName)
                                                    .filter(Boolean)
                                                  )).length - 3} more
                                                </Badge>
                                              )}
                                              {Array.from(new Set(members
                                                .filter(m => m.district === dist.code && m.registeredBy === admin.uid)
                                                .map(m => m.certAdminName || m.registeredByName)
                                                .filter(Boolean)
                                              )).length === 0 && (
                                                <span className="text-[9px] font-bold text-slate-300 italic">No entries yet</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                          <AlertCircle className="w-4 h-4 text-slate-300" />
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Admin Assigned</span>
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-3">
                                        <div className="flex flex-col gap-1.5">
                                          <div className="flex justify-between items-end mb-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Usage Progress</span>
                                            <span className="text-[11px] font-black text-emerald-600">
                                              {Math.round(((admin?.quotaUsed || 0) / (admin?.quota || 1)) * 100)}%
                                            </span>
                                          </div>
                                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                              style={{ width: `${Math.min(100, ((admin?.quotaUsed || 0) / (admin?.quota || 1)) * 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="px-2 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                                            <p className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">Used</p>
                                            <p className="text-sm font-black text-emerald-600 leading-none">{admin?.quotaUsed || 0}</p>
                                          </div>
                                          <div className="px-2 py-1.5 bg-brand-blue/5 border border-brand-blue/10 rounded-xl">
                                            <p className="text-[8px] font-black text-brand-blue/40 uppercase leading-none mb-1">Limit</p>
                                            <p className="text-sm font-black text-brand-blue leading-none">{admin?.quota || 0}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="h-8 text-[9px] font-black uppercase border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5"
                                          onClick={() => {
                                            if (admin) {
                                              setManualFormData({
                                                ...manualFormData,
                                                role: 'admin',
                                                district: dist.code,
                                                name: admin.name || '',
                                                email: admin.email || '',
                                                mobile: admin.mobile || '',
                                                pin: admin.pin || '240678',
                                                quota: admin.quota || 100
                                              });
                                            } else {
                                              setManualFormData({
                                                ...manualFormData,
                                                role: 'admin',
                                                district: dist.code,
                                                name: '',
                                                email: '',
                                                mobile: '',
                                                pin: '240678',
                                                quota: 100
                                              });
                                            }
                                            setIsManualEntryOpen(true);
                                          }}
                                        >
                                          {admin ? 'Update' : 'Assign'}
                                        </Button>
                                        {admin && (
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-8 text-[9px] font-black uppercase text-red-400 hover:text-red-600"
                                          onClick={() => {
                                            if (confirm(`Are you sure you want to remove ${admin.name} as Second Admin for ${dist.name}?`)) {
                                              onUpdate(admin.uid, { role: 'member', isAdmin: false });
                                              toast.info(`Admin permissions removed from ${admin.name}`);
                                            }
                                          }}
                                        >
                                          Remove
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-brand-magenta/20 bg-white rounded-[32px] overflow-hidden shadow-sm">
                    <CardHeader className="bg-brand-magenta/5 border-b border-brand-magenta/10 p-8 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-brand-magenta p-2 rounded-xl">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black text-brand-dark-purple tracking-tight uppercase">District-Wise Shared Quotas</CardTitle>
                          <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">
                            Global entry limits for entire districts (Applies to all members/operators)
                          </CardDescription>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={onSyncQuotas}
                          className="bg-white border-brand-magenta/20 text-brand-magenta font-black text-[10px] uppercase tracking-widest hover:bg-brand-magenta hover:text-white transition-all shadow-sm h-10 px-6 rounded-xl"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-2" />
                          Sync Used Counts
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-200">
                              <TableHead className="w-[180px]">District (ജില്ല)</TableHead>
                              <TableHead>Quota Configuration & Real-Time Count (ക്വാട്ടയും തദ്സമയ വിവരങ്ങളും)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {DISTRICTS.map((dist) => {
                              const total = districtQuotas[dist.code] || 0;
                              const used = districtQuotasUsed[dist.code] || 0;
                              const percent = total > 0 ? Math.round((used / total) * 100) : 0;
                              
                              return (
                                <TableRow key={dist.code} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                                  <TableCell className="align-middle">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-brand-blue" />
                                      </div>
                                      <span className="font-black text-slate-800 uppercase text-xs">{dist.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
                                      {/* Simplified Count Indicator */}
                                      <div className="flex items-center gap-2 shrink-0 bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl">
                                        <span className="text-[10px] font-black uppercase text-slate-500">ചെയ്തത് (Used):</span>
                                        <span className="text-sm font-black text-emerald-600 font-mono">{used}</span>
                                        <span className="text-slate-350 font-bold">/</span>
                                        <span className="text-sm font-black text-slate-705 text-slate-700 font-mono">{total > 0 ? total : '∞'}</span>
                                        {total > 0 && (
                                          <span className="text-[9px] font-black text-brand-magenta uppercase bg-brand-magenta/5 border border-brand-magenta/10 px-2 py-0.5 rounded-md ml-1.5">
                                            {total - used} ബാക്കി (Left)
                                          </span>
                                        )}
                                      </div>

                                      {/* Quota Limit Input and Button right inside area */}
                                      <div className="flex items-center gap-2 shrink-0">
                                        <div className="relative">
                                          <Label className="sr-only">Edit Quota</Label>
                                          <Input 
                                            type="number" 
                                            id={`dist-quota-input-${dist.code}`}
                                            className="w-24 h-10 rounded-xl font-black text-center pr-8 border-slate-200 focus:border-brand-magenta/40 bg-slate-50/50"
                                            placeholder="0"
                                            defaultValue={total || ''}
                                          />
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">LIMIT</div>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          className="h-10 px-4 bg-brand-magenta text-white hover:bg-brand-magenta/90 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-brand-magenta/10 active:scale-95 transition-all"
                                          onClick={() => {
                                            const input = document.getElementById(`dist-quota-input-${dist.code}`) as HTMLInputElement;
                                            const val = parseInt(input.value) || 0;
                                            onUpdateDistrictQuota?.(dist.code, val);
                                            toast.success(`${dist.name} limit updated to ${val || 'Unlimited'}`);
                                          }}
                                        >
                                          മാറ്റുക (Set)
                                        </Button>
                                      </div>

                                      {/* Progress display */}
                                      {total > 0 && (
                                        <div className="flex items-center gap-2 w-28 shrink-0">
                                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden font-sans">
                                            <div 
                                              className={cn(
                                                "h-full transition-all duration-1000",
                                                percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-orange-500' : 'bg-brand-magenta'
                                              )}
                                              style={{ width: `${Math.min(100, percent)}%` }}
                                            />
                                          </div>
                                          <span className={cn(
                                            "text-[9px] font-black uppercase text-right w-10 font-mono",
                                            percent >= 100 ? 'text-red-650 text-red-600' : 'text-slate-550'
                                          )}>{percent}%</span>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card className="border-2 border-slate-200 bg-white rounded-[32px] overflow-hidden shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <CardTitle className="text-2xl font-black text-brand-blue flex items-center gap-3">
                      <Lock className="w-8 h-8" />
                      Individual Operator Quotas
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 flex flex-col gap-1">
                       <span>Personalized overrides/limits for specific admin accounts</span>
                       <span className="text-brand-blue/60 italic font-medium lowercase">സബ്-അഡ്മിൻമാർക്കും ഓപ്പറേറ്റർമാർക്കും നൽകിയിട്ടുള്ള എൻട്രി ലിമിറ്റുകൾ ഇവിടെ കാണാം. (Daily/Total entry limits for each sub-admin/operator)</span>
                    </CardDescription>
                  </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                   <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Search name, mobile or district..." 
                        className="pl-10 h-11 w-full md:w-64 rounded-xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-brand-blue/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                   <Button 
                     className="bg-brand-blue h-11 px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-blue/20 active:scale-95 transition-all"
                     onClick={() => setSearchTerm(searchTerm)}
                   >
                     SEARCH
                   </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-200">
                        <TableHead>Operator Name</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Quota Assigned</TableHead>
                        <TableHead>Quota Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const quotaBaseList = searchTerm.trim() 
                          ? members.filter(m => 
                              (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                              (m.mobile && String(m.mobile).includes(searchTerm)) ||
                              (m.district && DISTRICTS.find(d => d.code === m.district)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            ).filter(m => districtFilter === 'all' || m.district === districtFilter)
                          : members.filter(m => 
                              // Only show people with administrative roles OR people explicitly given a positive quota
                              m.role === 'operator' || 
                              (m.role === 'admin' && !MAIN_ADMINS.includes(m.email)) || 
                              (m.quota !== undefined && m.quota > 0)
                            );
                        
                        // Ensure uniqueness by UID
                        const uniqueQuotaList = Array.from(new Map(quotaBaseList.map(m => [m.uid, m])).values());

                        if (uniqueQuotaList.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-bold">
                                {searchTerm ? "No members found matching your search." : "No operators or district managers found. Use search to find a member."}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return uniqueQuotaList.map((op) => (
                          <TableRow key={op.uid} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar 
                                  className="h-10 w-10 border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => setViewingMember(op)}
                                >
                                  <AvatarImage src={op.photoUrl} />
                                  <AvatarFallback className="bg-brand-blue/10 text-brand-blue font-black">{(op.name || '?').charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-black text-slate-800 leading-none">{op.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={cn(
                                      "text-[8px] h-4 font-bold border-brand-blue/20 text-brand-blue uppercase bg-brand-blue/5",
                                      (op.role === 'admin' || op.isAdmin) && "border-brand-magenta/20 text-brand-magenta bg-brand-magenta/5"
                                    )}>{op.role || (op.isAdmin ? 'admin' : 'member')}</Badge>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate max-w-[120px]">{op.email}</p>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-black text-[9px] uppercase tracking-wide border-slate-200">
                                {DISTRICTS.find(d => d.code === op.district)?.name || op.district}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    id={`quota-input-${op.uid}`}
                                    className="w-24 h-10 rounded-xl font-black text-center focus:ring-2 focus:ring-brand-blue/20 pr-8"
                                    placeholder="0"
                                    defaultValue={op.quota ?? ''}
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">QTY</div>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="h-10 px-4 bg-brand-blue text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-brand-blue/10 active:scale-95 transition-all"
                                  onClick={() => {
                                    const input = document.getElementById(`quota-input-${op.uid}`) as HTMLInputElement;
                                    const val = input.value === '' ? 0 : parseInt(input.value);
                                    if (!isNaN(val)) {
                                      // If it was just a member, we might want to ensure they become an operator or at least have the quota field
                                      onUpdate(op.uid, { quota: val, role: op.role === 'member' ? 'operator' : op.role });
                                      toast.success(`Limit of ${val} set for ${op.name}`);
                                    }
                                  }}
                                >
                                  SAVE
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                  <span className="text-slate-400">Used: {op.quotaUsed || 0}</span>
                                  <span className={(op.quota !== undefined && (op.quotaUsed || 0) >= op.quota) ? 'text-red-500' : 'text-brand-blue'}>
                                    {op.quota ? Math.round(((op.quotaUsed || 0) / op.quota) * 100) : 0}%
                                  </span>
                                </div>
                                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-1000",
                                      (op.quota !== undefined && (op.quotaUsed || 0) >= op.quota) ? 'bg-red-500' : 'bg-brand-blue'
                                    )}
                                    style={{ width: `${Math.min(100, op.quota ? ((op.quotaUsed || 0) / op.quota) * 100 : 0)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={cn(
                                  "font-black text-[9px] uppercase tracking-widest",
                                  (op.quota !== undefined && (op.quotaUsed || 0) >= op.quota) 
                                    ? "bg-red-100 text-red-600" 
                                    : "bg-green-100 text-green-600"
                                )}
                              >
                                {(op.quota !== undefined && (op.quotaUsed || 0) >= op.quota) ? "Exhausted" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                               <Button 
                                variant="outline" 
                                size="sm" 
                                className="font-bold text-[10px] uppercase h-8 hover:bg-brand-blue hover:text-white border-brand-blue/20 text-brand-blue"
                                onClick={() => setEditingMember(op)}
                               >
                                 Edit Full Access
                               </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="districts">
            <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden mt-6">
               <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center">
                        <Lock className="w-6 h-6 text-brand-blue" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black text-slate-800">District Admin Control</CardTitle>
                        <CardDescription className="font-bold text-slate-500 uppercase tracking-widest text-[10px] flex flex-col gap-1 mt-1">
                          <span>Manage and share district-specific login credentials</span>
                          <span className="text-red-500 italic">ശ്രദ്ധിക്കുക: ലിങ്ക് ഷെയർ ചെയ്യുമ്പോൾ ഈ പേജിന്റെ മുകളിൽ 'COPY PUBLIC LINK' എന്നത് ഉപയോഗിക്കുക അല്ലെങ്കിൽ ഈ ലിങ്കുകൾ മാത്രം ഷെയർ ചെയ്യുക. (Important: Only share these links using the Shared URL domain)</span>
                        </CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {DISTRICTS.map((d) => {
                        const email = `hcrs${d.name.toLowerCase()}@hcrs.society`;
                        const pwd = "246810";
                        // More robust URL detection
                        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                        
                        // We prefer the current origin unless it's obviously a dev setup AND we have a stable fallback
                        // However, on AI Studio, origin changes frequently, so using window.location.origin is usually SAFEST
                        const effectiveBase = currentOrigin || SHARED_URL;

                        // Remove trailing slash if exists to avoid double slash
                        const cleanBase = effectiveBase.endsWith('/') ? effectiveBase.slice(0, -1) : effectiveBase;
                        const directLoginUrl = `${cleanBase}/?distLogin=${d.name.toLowerCase()}`;
                        
                        const shareText = `*HCRS Kerala District Admin Login*%0A%0Aജില്ല: ${d.name}%0A%0Aതാഴെ കാണുന്ന ലിങ്കിൽ ക്ലിക്ക് ചെയ്താൽ നേരിട്ട് ലോഗിൻ ചെയ്യാം:%0A${directLoginUrl}%0A%0AUser ID: ${email}%0APassword: ${pwd}%0A%0A_ശ്രദ്ധിക്കുക: ലിങ്ക് ഓപ്പൺ ചെയ്ത ശേഷം 'BACK TO ENTRY' ബട്ടൺ ഉപയോഗിച്ച് ലിസ്റ്റ് കാണാവുന്നതാണ്._`;
                        
                        return (
                           <div key={d.code} className="bg-white border-2 border-slate-100 rounded-[32px] p-6 hover:border-brand-blue/20 transition-all group">
                              <div className="flex items-center justify-between mb-4">
                                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{d.name}</h3>
                                 <Badge variant="outline" className="text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border-brand-blue/20 text-brand-blue">Direct Link</Badge>
                              </div>
                              <div className="space-y-3 mb-6">
                                 <div className="bg-slate-50 p-3 rounded-2xl relative overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Login URL</p>
                                    <p className="text-[10px] font-bold text-brand-blue truncate pr-8 select-all">{directLoginUrl}</p>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="absolute right-1 top-6 h-6 w-6 text-slate-300 hover:text-brand-blue"
                                      onClick={() => {
                                        navigator.clipboard.writeText(directLoginUrl);
                                        toast.success(`${d.name} link copied!`);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 rotate-45" />
                                    </Button>
                                 </div>
                                 <div className="bg-slate-50 p-3 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">District User ID & Password</p>
                                    <p className="text-xs font-bold text-slate-700">{email}</p>
                                    <p className="text-xs font-black text-brand-magenta mt-1 uppercase tracking-widest">PWD: {pwd}</p>
                                 </div>
                              </div>
                              <Button 
                                 className="w-full h-12 rounded-2xl font-black uppercase text-[10px] bg-brand-blue text-white shadow-lg shadow-brand-blue/10 hover:bg-brand-blue/90"
                                 onClick={() => window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank')}
                              >
                                 <MessageCircle className="w-4 h-4 mr-2" />
                                 SHARE VIA WHATSAPP
                              </Button>
                           </div>
                        );
                     })}
                  </div>
               </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="claims">
            <div className="space-y-6">
               {/* Claims Analytics */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <Card className="border-2 border-slate-100 bg-white rounded-3xl p-6 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pending Amount</p>
                   <h3 className="text-3xl font-black text-slate-800">₹{claimStats.totalPending.toLocaleString('en-IN')}</h3>
                   <div className="mt-4 flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                       <IndianRupee className="w-4 h-4" />
                     </div>
                     <p className="text-[9px] font-bold text-slate-400 uppercase">Total amount across all claims</p>
                   </div>
                 </Card>

                 <Card className="border-2 border-red-100 bg-white rounded-3xl p-6 shadow-sm">
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Emergency Cases</p>
                   <h3 className="text-3xl font-black text-red-600">{claimStats.emergencyCount}</h3>
                   <div className="mt-4 flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                       <ShieldAlert className="w-4 h-4" />
                     </div>
                     <p className="text-[9px] font-black text-red-400 uppercase">Requires immediate attention</p>
                   </div>
                 </Card>

                 <Card className="border-2 border-brand-blue/10 bg-white rounded-3xl p-6 shadow-sm md:col-span-2 overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Distribution</p>
                       <Badge variant="outline" className="text-[9px] uppercase font-black">{claims.length} Claims</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {Object.entries(claimStats.projectCounts).map(([cat, count]) => (
                         <div key={cat} className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-600 uppercase">{cat}</span>
                           <Badge className="bg-brand-blue text-white text-[9px] h-4 min-w-[20px] px-1 flex justify-center">{count as number}</Badge>
                         </div>
                       ))}
                    </div>
                 </Card>
               </div>

               {/* Filters Bar Specific for Claims */}
               <Card className="border-none shadow-sm rounded-3xl bg-white p-4">
                 <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Search by Name, Mobile, Membership ID or HR ID..." 
                        className="pl-10 h-11 bg-slate-50 border-none rounded-xl text-xs font-bold"
                        value={claimSearchTerm}
                        onChange={(e) => setClaimSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      <Select value={claimDistrictFilter} onValueChange={setClaimDistrictFilter}>
                        <SelectTrigger className="w-[120px] h-11 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase">
                          <SelectValue placeholder="District" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Districts</SelectItem>
                          {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={claimCategoryFilter} onValueChange={setClaimCategoryFilter}>
                        <SelectTrigger className="w-[120px] h-11 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          <SelectItem value="digital">Digital Redeem Coupon (ഡിജിറ്റൽ റെഡീം കൂപ്പൺ)</SelectItem>
                          <SelectItem value="ott">OTT Consignment Advance (OTT കോൺസൈമെന്റ് അഡ്വാൻസ്)</SelectItem>
                          <SelectItem value="grocery">Grocery Consignment Advance (ഗ്രോസറി കോൺസൈമെന്റ് അഡ്വാൻസ്)</SelectItem>
                          <SelectItem value="goodwill">Goodwill Consignment Advance (ഗുഡ്‌വിൽ കോൺസൈമെന്റ് അഡ്വാൻസ്)</SelectItem>
                          <SelectItem value="other">Other Consignment Advance (മറ്റു കോൺസൈമെന്റ് അഡ്വാൻസ്)</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={claimPriorityFilter} onValueChange={setClaimPriorityFilter}>
                        <SelectTrigger className="w-[120px] h-11 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Priority</SelectItem>
                          <SelectItem value="EMERGENCY RED">Emergency Red</SelectItem>
                          <SelectItem value="RED">Red</SelectItem>
                          <SelectItem value="ORANGE">Orange</SelectItem>
                          <SelectItem value="GREEN">Green</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button 
                        onClick={() => {
                          const ws = XLSX.utils.json_to_sheet(filteredClaims.map(c => ({
                            'Name': c.userName,
                            'Relation': c.relation === 'Self' ? 'സ്വന്തം (Self)' :
                                       c.relation === 'Mother' ? 'അമ്മ (Mother)' :
                                       c.relation === 'Father' ? 'അച്ഛൻ (Father)' :
                                       c.relation === 'Son' ? 'മകൻ (Son)' :
                                       c.relation === 'Daughter' ? 'മകൾ (Daughter)' : 
                                       c.relation === 'Wife' ? 'ഭാര്യ (Wife)' :
                                       c.relation === 'Husband' ? 'ഭർത്താവ് (Husband)' : (c.relationLabel || c.relation || 'Self'),
                            'Mobile': c.userMobile,
                            'District': c.userDistrict,
                            'HR ID': c.highrichId,
                            'Categories': c.categories?.join(', '),
                            'Total Paid': c.totalPaid,
                            'Total Received': c.totalReceived,
                            'Balance Pending': c.totalPending,
                            'Preference': c.futurePreference,
                            'Priority': c.priorityStatus,
                            'Date': c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()
                          })));
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Support Claims");
                          XLSX.writeFile(wb, `HCRS_Support_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);
                        }}
                        className="h-11 px-6 rounded-xl bg-brand-magenta text-white font-black text-[10px] uppercase shadow-lg shadow-brand-magenta/20"
                      >
                         <Download className="w-4 h-4 mr-2" /> Export Excel
                      </Button>
                    </div>
                 </div>
               </Card>

               {/* Claims Table */}
               <Card className="border-none shadow-sm overflow-hidden rounded-3xl bg-white">
                  {claimsLoading ? (
                    <div className="py-20 text-center space-y-4">
                       <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-blue" />
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading support claims...</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 w-[100px]">Token No</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Member Info</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Relation</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount Details</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Categories</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Priority Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClaims.map(claim => (
                          <TableRow key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-6 py-4 font-black text-brand-magenta text-sm font-mono">
                              <span className="bg-[#FF1493]/5 border border-[#FF1493]/15 py-1 px-2.5 rounded-lg text-[#FF1493]">
                                #{claim.tokenNo ?? 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="space-y-1">
                                <p className="font-black text-slate-800 text-sm">{claim.userName}</p>
                                <p className="text-xs font-bold text-slate-500">{claim.userMobile}</p>
                                {(() => {
                                  const comboCount = claims.filter(c => c.userMobile === claim.userMobile).length;
                                  if (comboCount > 1) {
                                    return (
                                      <div className="mt-1">
                                        <Badge variant="outline" className="text-[8px] h-4.5 font-bold uppercase text-[#FF1493] bg-[#FF1493]/5 border-[#FF1493]/20 py-0.5">
                                          👥 Combo (കോംബോ - {comboCount} Claims)
                                        </Badge>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                <p className="text-[9px] font-black text-brand-blue uppercase">{claim.membershipId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {claim.relation && (
                                <Badge variant="outline" className="text-[9px] h-6 py-1 px-2.5 font-bold uppercase text-brand-magenta border-brand-magenta/30 bg-brand-magenta/[0.03] rounded-lg">
                                  {claim.relation === 'Self' ? 'സ്വന്തം (Self)' :
                                   claim.relation === 'Mother' ? 'അമ്മ (Mother)' :
                                   claim.relation === 'Father' ? 'അച്ഛൻ (Father)' :
                                   claim.relation === 'Son' ? 'മകൻ (Son)' :
                                   claim.relation === 'Daughter' ? 'മകൾ (Daughter)' : 
                                   claim.relation === 'Wife' ? 'ഭാര്യ (Wife)' :
                                   claim.relation === 'Husband' ? 'ഭർത്താവ് (Husband)' : claim.relation}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                               <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 font-black text-slate-700 text-sm">
                                    <span className="text-[10px] opacity-40">₹</span> {claim.totalPending?.toLocaleString('en-IN')}
                                    <Badge variant="outline" className="text-[8px] h-4 py-0 font-bold border-slate-200">Pending</Badge>
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-400">Paid: ₹{claim.totalPaid?.toLocaleString('en-IN')}</p>
                                  {claim.highrichId && (
                                    <p className="text-[9px] font-black text-brand-magenta uppercase bg-brand-magenta/5 px-2 py-0.5 rounded w-fit mt-1">HR ID: {claim.highrichId}</p>
                                  )}
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {claim.categories?.slice(0, 3).map((cat: string, idx: number) => (
                                    <Badge key={`${cat}-${idx}`} variant="secondary" className="text-[8px] bg-slate-100 font-bold uppercase">{getCategoryLabel(cat)}</Badge>
                                  ))}
                                  {claim.categories?.length > 3 && <span className="text-[8px] font-black text-slate-300">+{claim.categories.length - 3}</span>}
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex flex-col gap-1.5">
                                  <Badge className={cn(
                                    "w-fit font-black text-[9px] px-3 py-1 text-white border-0",
                                    claim.priorityStatus === 'EMERGENCY RED' ? 'bg-red-600' :
                                    claim.priorityStatus === 'RED' ? 'bg-red-500' :
                                    claim.priorityStatus === 'ORANGE' ? 'bg-orange-500' : 'bg-green-500'
                                  )}>
                                     {claim.priorityStatus}
                                  </Badge>
                                  {claim.isEmergency && <span className="text-[8px] font-black text-red-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> EMERGENCY</span>}
                               </div>
                            </TableCell>
                            <TableCell className="text-right px-6">
                               <div className="flex items-center justify-end gap-1">
                                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-brand-blue" onClick={() => {
                                   setSelectedClaim(claim);
                                 }} title="വിശദവിവരങ്ങൾ കാണുക">
                                    <Eye className="w-4 h-4" />
                                 </Button>
                                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-amber-500" onClick={() => {
                                   setEditingClaim(claim);
                                 }} title="എഡിറ്റ് ചെയ്യുക">
                                    <Pencil className="w-4 h-4" />
                                 </Button>
                                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-red-500" onClick={() => {
                                   setDeletingClaimId(claim.id);
                                 }} title="റിമൂവ് ചെയ്യുക">
                                    <Trash2 className="w-4 h-4" />
                                 </Button>
                               </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {!claimsLoading && filteredClaims.length === 0 && (
                    <div className="py-20 text-center bg-white">
                       <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No matching support claims found</p>
                    </div>
                  )}
               </Card>
            </div>
          </TabsContent>
          <TabsContent value="tickets">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-2 border-slate-100 bg-white rounded-3xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Support Inquiries</p>
                  <h3 className="text-3xl font-black text-slate-800">{supportTickets.length}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Logged automatically by AI chatbot</p>
                </Card>
                <Card className="border-2 border-slate-100 bg-white rounded-3xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Admin Action</p>
                  <h3 className="text-3xl font-black text-amber-500">{supportTickets.filter(t => t.status === 'pending').length}</h3>
                  <p className="text-[9px] font-bold text-amber-400 uppercase mt-2">Requires manual correction or review</p>
                </Card>
                <Card className="border-2 border-slate-100 bg-white rounded-3xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Resolved Cases</p>
                  <h3 className="text-3xl font-black text-emerald-600">{supportTickets.filter(t => t.status === 'resolved').length}</h3>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase mt-2">Resolved and closed requests</p>
                </Card>
              </div>

              {/* Tickets Table Card */}
              <Card className="border-2 border-slate-100 bg-white rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">AI വഴികാട്ടി സപ്പോർട്ട് അപേക്ഷകൾ</CardTitle>
                    <CardDescription className="text-xs text-slate-400 font-semibold mt-1">
                      പേര് തെറ്റുകൾ, ഫോട്ടോ മാറ്റങ്ങൾ, അല്ലെങ്കിൽ റസീപ്റ്റ് പ്രോബ്ലം കസ്റ്റമർ ചാറ്റിൽ നിന്ന് നേരിട്ട് റിപ്പോർട്ട് ചെയ്തവ.
                    </CardDescription>
                  </div>
                </CardHeader>
                
                {supportTicketsLoading ? (
                  <div className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">സപ്പോർട്ട് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു...</p>
                  </div>
                ) : supportTickets.length === 0 ? (
                  <div className="py-20 text-center">
                    <Headphones className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ഇതുവരെ അപേക്ഷകൾ ഒന്നും വന്നിട്ടില്ല</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-100">
                        <TableRow>
                          <TableHead className="text-[9px] font-extrabold uppercase text-slate-500 p-4">Member / Name</TableHead>
                          <TableHead className="text-[9px] font-extrabold uppercase text-slate-500 p-4">Mobile Number / WhatsApp</TableHead>
                          <TableHead className="text-[9px] font-extrabold uppercase text-slate-500 p-4">Issue / വിഷയം</TableHead>
                          <TableHead className="text-[9px] font-extrabold uppercase text-slate-500 p-4">AI Chat Logs / Summary</TableHead>
                          <TableHead className="text-[9px] font-extrabold uppercase text-slate-500 p-4">Submitted Date</TableHead>
                          <TableHead className="text-[9px] font-extrabold uppercase text-slate-500 p-4">Status & Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supportTickets.map((ticket) => (
                          <TableRow key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="p-4">
                              <p className="font-extrabold text-xs text-slate-800 uppercase">{ticket.memberName}</p>
                              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{ticket.memberId || 'N/A'}</span>
                            </TableCell>
                            <TableCell className="p-4 font-mono text-xs font-semibold text-slate-600">
                              <a href={`tel:${ticket.phone}`} className="hover:underline">{ticket.phone}</a>
                            </TableCell>
                            <TableCell className="p-4">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                ticket.issue === 'Spelling Correction' ? 'bg-amber-100 text-amber-800' :
                                ticket.issue === 'Photo Re-upload' ? 'bg-indigo-100 text-indigo-800' :
                                ticket.issue === 'Receipt Verification Error' ? 'bg-teal-100 text-teal-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {ticket.issue}
                              </span>
                            </TableCell>
                            <TableCell className="p-4 max-w-xs">
                              <p className="text-xs font-semibold text-slate-600 leading-normal line-clamp-3" title={ticket.aiSummary}>
                                {ticket.aiSummary}
                              </p>
                            </TableCell>
                            <TableCell className="p-4 text-xs font-semibold text-slate-500">
                              {ticket.timestamp ? new Date(ticket.timestamp).toLocaleString() : 'N/A'}
                            </TableCell>
                            <TableCell className="p-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={ticket.status === 'resolved' ? 'outline' : 'default'}
                                  size="sm"
                                  onClick={() => handleResolveSupportTicket(ticket.id, ticket.status)}
                                  className={`h-8 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border-2 ${
                                    ticket.status === 'resolved'
                                      ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                                      : 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
                                  }`}
                                >
                                  {ticket.status === 'resolved' ? 'RESOLVED ✅' : 'PENDING ⏳'}
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const encodedText = encodeURIComponent(`ഹലോ ${ticket.memberName}, താങ്കൾ സപ്പോർട്ട് ചാറ്റ് വഴി സമർപ്പിച്ച "${ticket.issue}" എന്ന സഹായ അപേക്ഷ ഇപ്പോൾ ഞങ്ങൾ പരിശോധിക്കുകയാണ്...`);
                                    window.open(`https://wa.me/91${ticket.phone}?text=${encodedText}`, '_blank');
                                  }}
                                  className="h-8 border-slate-200 text-slate-600 hover:text-green-600 px-2.5 rounded-lg text-[10px]"
                                >
                                  WhatsApp
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSupportTicket(ticket.id)}
                                  className="h-8 text-slate-400 hover:text-red-500 hover:bg-slate-100/50 p-2 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </>
    )}

        {/* View Member Dialog */}
        <Dialog open={!!viewingMember} onOpenChange={(open) => !open && setViewingMember(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-brand-blue" />
                Member Details
              </DialogTitle>
            </DialogHeader>
            {viewingMember && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full overflow-hidden flex justify-center bg-slate-50 border rounded-2xl p-4">
                      <div className="scale-[0.8] origin-top mb-[-100px]">
                          <MembershipCard 
                            member={viewingMember} 
                            showCelebration={false} 
                            isAdmin={true}
                            onUpdatePhoto={onUpdatePhoto ? (file) => onUpdatePhoto(file, viewingMember.uid) : undefined}
                          />
                      </div>
                    </div>
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-col gap-1.5 justify-start">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-2xl font-black text-slate-900">{viewingMember.name}</h3>
                        <Badge className={viewingMember.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                          {viewingMember.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(viewingMember.membership_type || 'ADHOC_MEMBER') === 'LIFE_MEMBER' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-550 border border-amber-200 text-amber-700 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            ⭐ LIFE MEMBER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            ADHOC MEMBER
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 pt-2">
                       <DetailItem label="Mobile" value={viewingMember.mobile} icon={<Smartphone className="w-4 h-4" />} />
                       <DetailItem label="Email" value={viewingMember.email} icon={<Mail className="w-4 h-4" />} />
                       <DetailItem label="Blood Group" value={viewingMember.bloodGroup || 'N/A'} />
                       <DetailItem label="Login Password" value={viewingMember.pin || '123456'} icon={<ShieldCheck className="w-4 h-4" />} />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-slate-400 uppercase tracking-widest">Membership Info</h4>
                    <div className="space-y-3">
                      <DetailItem label="Member ID" value={viewingMember.membershipId} />
                      <DetailItem label="Serial No" value={viewingMember.serialNo?.toString()} />
                      <DetailItem label="Joining Date" value={viewingMember.registrationDate?.toDate ? viewingMember.registrationDate.toDate().toLocaleDateString('en-IN') : (viewingMember.registrationDate ? new Date(viewingMember.registrationDate).toLocaleDateString('en-IN') : 'N/A')} />
                      
                      {viewingMember.renewalDate && (
                        <DetailItem 
                          label="Renewal Date" 
                          value={viewingMember.renewalDate?.toDate ? viewingMember.renewalDate.toDate().toLocaleDateString('en-IN') : new Date(viewingMember.renewalDate).toLocaleDateString('en-IN')} 
                        />
                      )}
                      
                      <DetailItem label="Expiry Date" value={viewingMember.expiryDate?.toDate ? viewingMember.expiryDate.toDate().toLocaleDateString('en-IN') : (viewingMember.expiryDate ? new Date(viewingMember.expiryDate).toLocaleDateString('en-IN') : 'N/A')} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-slate-400 uppercase tracking-widest">Location Details</h4>
                    <div className="space-y-3">
                      <DetailItem label="District" value={DISTRICTS.find(d => d.code === viewingMember.district)?.name || viewingMember.district} />
                      <DetailItem label="Assembly" value={`${viewingMember.assemblyConstituency} (${viewingMember.constituencyCode || getAssemblyCode(viewingMember.assemblyConstituency)})`} />
                      <DetailItem label="State" value={viewingMember.state || 'Kerala'} />
                      <DetailItem label="Address" value={viewingMember.address || 'N/A'} />
                      <DetailItem label="Post Office" value={viewingMember.postOffice || 'N/A'} />
                      <DetailItem label="Pincode" value={viewingMember.pincode || 'N/A'} />
                      <DetailItem 
                        label="Reg. Source" 
                        value={viewingMember.registeredBy ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-700">Manual Entry</span>
                            <div className="text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-xl mt-1">
                              <p className="text-slate-400 uppercase tracking-tighter mb-1">Identity Provided:</p>
                              <p className="text-brand-blue font-black leading-tight">{viewingMember.certAdminName || viewingMember.registeredByName || 'Admin'}</p>
                              <p className="text-slate-400 font-medium">{viewingMember.certAdminEmail || 'No Email'}</p>
                            </div>
                          </div>
                        ) : 'Direct Online Registration'} 
                      />
                    </div>
                  </div>
                </div>

                {viewingMember.status === 'pending' && viewingMember.transactionId && (
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                    <h4 className="font-bold text-sm text-orange-800 mb-2">Payment Proof</h4>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 space-y-1 text-sm text-orange-700">
                        <p><strong>Transaction ID:</strong> {viewingMember.transactionId}</p>
                        {viewingMember.paymentDate && <p><strong>Payment Date:</strong> {viewingMember.paymentDate}</p>}
                        <p><strong>Payment Time:</strong> {viewingMember.paymentTime || 'N/A'}</p>
                      </div>
                      {viewingMember.paymentProofUrl && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedProof(viewingMember.paymentProofUrl || '')}
                          className="bg-white border-orange-200 text-orange-700 font-bold"
                        >
                          View Screenshot
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Related Support Claims Section */}
                {(() => {
                  const mClaims = claims.filter(c => c.uid === viewingMember.uid || (viewingMember.mobile && c.userMobile === viewingMember.mobile));
                  if (mClaims.length === 0) return null;
                  return (
                    <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-[24px] space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-brand-magenta" />
                          Support Claims submitted ({mClaims.length} Claims) - ക്ലെയിം വിവരങ്ങൾ
                        </h4>
                        {mClaims.length > 1 && (
                          <Badge className="bg-brand-magenta text-white text-[9px] font-black uppercase rounded-lg px-2.5 py-1 border-none">
                            Combo (കോംബോ കൂട്ടായ്മ)
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-3.5">
                        {mClaims.map((claim, idx) => (
                          <div key={claim.id || idx} className="bg-white border border-slate-150 p-4 rounded-2xl shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                                  {claim.userName}
                                  <Badge variant="outline" className="text-[8px] h-4.5 py-0 font-extrabold bg-brand-magenta/5 text-brand-magenta border-brand-magenta/20 uppercase rounded">
                                    {claim.relation === 'Self' ? 'സ്വന്തം (Self)' :
                                     claim.relation === 'Mother' ? 'അമ്മ (Mother)' :
                                     claim.relation === 'Father' ? 'അച്ഛൻ (Father)' :
                                     claim.relation === 'Son' ? 'മകൻ (Son)' :
                                     claim.relation === 'Daughter' ? 'മകൾ (Daughter)' : 
                                     claim.relation === 'Wife' ? 'ഭാര്യ (Wife)' :
                                     claim.relation === 'Husband' ? 'ഭർത്താവ് (Husband)' : claim.relationLabel || claim.relation || 'Self'}
                                  </Badge>
                                </p>
                                {claim.highrichId && (
                                  <span className="text-[10px] font-mono text-brand-blue bg-blue-50/50 font-black px-1.5 py-0.5 rounded mt-1 inline-block">HR ID: {claim.highrichId}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={cn(
                                  "text-[9px] font-extrabold px-2 py-0.5 rounded-md text-white tracking-wider uppercase font-sans border-none inline-block",
                                  claim.priorityStatus === 'EMERGENCY RED' ? 'bg-red-600' :
                                  claim.priorityStatus === 'RED' ? 'bg-red-500' :
                                  claim.priorityStatus === 'ORANGE' ? 'bg-orange-500' : 'bg-green-500'
                                )}>
                                  {claim.priorityStatus || 'GREEN'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px] font-bold">
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest font-extrabold block">Paid (പണമടച്ചത്)</span>
                                <span className="text-slate-700 font-black">₹{claim.totalPaid?.toLocaleString('en-IN')}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest font-extrabold block">Received (ലഭിച്ചത്)</span>
                                <span className="text-green-600 font-black">₹{claim.totalReceived?.toLocaleString('en-IN')}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest font-extrabold block">Pending (ബാക്കി)</span>
                                <span className="text-brand-magenta font-black">₹{claim.totalPending?.toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            {claim.notes && (
                              <div className="text-[10px] font-medium text-slate-500 bg-slate-50 p-2 rounded-xl mt-1.5 border border-slate-100">
                                <span className="font-extrabold text-[8px] text-slate-400 uppercase block tracking-wider mb-0.5">Admin Note (കുറിപ്പ്)</span>
                                {claim.notes}
                              </div>
                            )}

                            {claim.categories && claim.categories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-dashed border-slate-100">
                                {claim.categories.map((cat: string, cIdx: number) => (
                                  <Badge key={`${cat}-${cIdx}`} variant="outline" className="text-[8px] bg-slate-50 font-semibold border-slate-150 text-slate-650 h-4.5">
                                    {getCategoryLabel(cat)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <DialogFooter className="gap-3">
                  <Button variant="outline" onClick={() => setViewingMember(null)} className="font-bold flex-1 md:flex-none">Close</Button>
                  <Button variant="outline" onClick={() => { setViewingMember(null); setEditingMember(viewingMember); }} className="font-bold flex-1 md:flex-none">Edit Instead</Button>
                  {viewingMember.status === 'pending' && (
                    <Button onClick={() => { setViewingMember(null); handleApproveWithWhatsApp(viewingMember); }} className="bg-green-600 hover:bg-green-700 font-bold flex-1 md:flex-none">Approve Member</Button>
                  )}
                  <Button variant="destructive" onClick={() => { setViewingMember(null); handleDeleteClick(viewingMember.uid); }} className="font-bold flex-1 md:flex-none">Delete Member</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Verification Dialog */}
        <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Payment Verification</DialogTitle>
              <DialogDescription>
                Review the screenshot uploaded by the user.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 border rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center p-2">
              <img src={selectedProof || ''} alt="Payment Proof" className="max-h-[60vh] object-contain shadow-lg" />
            </div>
            <DialogFooter className="mt-6">
              <Button onClick={() => setSelectedProof(null)} variant="outline" className="w-full font-bold">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingMemberId} onOpenChange={(open) => !open && setDeletingMemberId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4">
                  <p>
                  നിങ്ങൾ ഈ മെമ്പറെ ഒഴിവാക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ? ഈ മാറ്റം തിരിച്ചു കൊണ്ടുവരാൻ കഴിയില്ല.
                  (Are you sure you want to delete this member? This action cannot be undone.)
                  </p>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-[10px] font-bold text-amber-800 leading-relaxed uppercase">
                    Important: To reuse the same email ID for a new registration, you must also delete this user from the "Authentication" section in Firebase Console.
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setDeletingMemberId(null)} className="font-bold">Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} className="font-bold">Delete Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent 
            className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl"
          >
            <div className="bg-brand-blue p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Registration Success!</h2>
              <p className="text-white/70 text-xs font-bold uppercase mt-1">അംഗത്തെ വിജയകരമായി ചേർത്തു</p>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Member Credentials</p>
                     <div className="space-y-1">
                        <div className="flex justify-between text-sm uppercase">
                           <span className="font-bold text-slate-500">ID:</span>
                           <span className="font-black text-brand-dark-purple">{successData?.email}</span>
                        </div>
                        <div className="flex justify-between text-sm uppercase">
                           <span className="font-bold text-slate-500">PIN:</span>
                           <span className="font-black text-brand-dark-purple">{successData?.pin}</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center italic">Remaining District Quota</p>
                     <div className="flex items-center justify-center gap-3">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span className="text-xl font-black text-emerald-700">
                           {Math.max(0, (districtQuotas[manualFormData.district] || 0) - (districtQuotasUsed[manualFormData.district] || 0))} Available
                        </span>
                     </div>
                  </div>

                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Share Membership Link (@WhatsApp)</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <Button 
                        variant="secondary"
                        className="h-12 rounded-xl font-bold uppercase text-xs"
                        onClick={() => {
                          const protocol = window.location.protocol;
                          const host = window.location.host;
                          const path = window.location.pathname;
                          const baseUrl = `${protocol}//${host}${path}`;
                          const magicLink = baseUrl.includes('?') ? `${baseUrl}&memberId=${successData?.id}` : `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}?memberId=${successData?.id}`;
                          navigator.clipboard.writeText(magicLink);
                          toast.success('Link copied to clipboard!');
                        }}
                     >
                        <Trash2 className="w-4 h-4 mr-2" /> {/* Using Trash2 as copy placeholder or a real icon if available */}
                        Copy Link
                     </Button>
                     <Button 
                        className="h-12 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold uppercase text-xs"
                        onClick={() => {
                           if (!successData) return;
                           sendWAMessage({
                             name: successData.name,
                             mobile: successData.mobile,
                             uid: successData.id,
                             pin: successData.pin
                           });
                        }}
                     >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Send WA
                     </Button>
                  </div>
               </div>
               
               <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl font-bold uppercase border-slate-200"
                  onClick={() => setShowSuccessModal(false)}
               >
                  Close & Add Another
               </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDomainKeyModalOpen} onOpenChange={setIsDomainKeyModalOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
            <DialogHeader className="p-8 bg-slate-50 border-b">
              <DialogTitle className="flex items-center gap-2 font-black text-2xl tracking-tight text-slate-900 uppercase">
                <KeyRound className="w-6 h-6 text-brand-blue" />
                SET DOMAIN LOGIN PIN
              </DialogTitle>
              <DialogDescription asChild>
                <div className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                  Set a custom password/PIN to log in on www.hcrs.in directly with your email.
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="domain-pin" className="font-black text-slate-700 uppercase mb-2">Secure Code (PIN / Password)</Label>
                <Input 
                  id="domain-pin" 
                  type="password"
                  required 
                  maxLength={12}
                  className="h-12 rounded-xl focus:ring-brand-blue font-bold text-slate-800 text-base"
                  placeholder="Min 4 characters (e.g. 123456)" 
                  value={newDomainKey} 
                  onChange={e => setNewDomainKey(e.target.value)}
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-normal">
                  നിങ്ങളുടെ ഗൂഗിൾ അക്കൗണ്ട് ലോഗിൻ ചെയ്ത ശേഷം ഈ പിൻ നിർബന്ധമായും ക്രമീകരിക്കുക. ഇതിലൂടെ www.hcrs.in എന്ന വെബ്സൈറ്റിൽ നേരിട്ട് ലോഗിൻ ചെയ്യാൻ കഴിയും.
                </p>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsDomainKeyModalOpen(false)}
                  className="flex-1 h-12 font-black rounded-xl uppercase tracking-wider text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  disabled={isUpdatingKey}
                  onClick={handleUpdateDomainKey}
                  className="flex-1 h-12 font-black rounded-xl uppercase tracking-wider text-xs bg-brand-blue text-white hover:bg-brand-blue/90"
                >
                  {isUpdatingKey ? 'Updating PIN...' : 'Save PIN (പാസ്‌വേഡ്)'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
          <DialogContent 
            className="sm:max-w-lg p-0 overflow-hidden rounded-[32px] border-none shadow-2xl"
          >
            <DialogHeader className="p-8 bg-slate-50 border-b">
              <DialogTitle className="flex items-center gap-2 font-black text-2xl tracking-tight text-slate-900">
                <UserPlus className="w-6 h-6 text-primary" />
                DIRECT REGISTRATION
              </DialogTitle>
              <DialogDescription asChild>
                <div className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                  Add members who paid offline. They will be activated immediately.
                </div>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualSubmit} className="flex flex-col max-h-[80vh]">
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-black text-slate-700 uppercase mb-2">Full Name</Label>
                    <Input 
                      id="name" 
                      required 
                      className="h-12 rounded-xl focus:ring-brand-blue"
                      placeholder="Enter name" 
                      value={manualFormData.name} 
                      onChange={e => setManualFormData({...manualFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="font-black text-slate-700 uppercase mb-2">Mobile Number</Label>
                    <Input 
                      id="mobile" 
                      required 
                      maxLength={10} 
                      className="h-12 rounded-xl focus:ring-brand-blue"
                      placeholder="**********" 
                      value={manualFormData.mobile} 
                      onChange={e => setManualFormData({...manualFormData, mobile: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-slate-700 uppercase mb-2">District</Label>
                    <Select 
                      value={manualFormData.district || DISTRICTS[0].code} 
                      onValueChange={val => setManualFormData({...manualFormData, district: val, assemblyConstituency: CONSTITUENCIES[val]?.[0] || ''})}
                    >
                      <SelectTrigger className="h-12 rounded-xl focus:ring-brand-blue font-bold">
                        <SelectValue placeholder="District" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-slate-700 uppercase mb-2">Assembly Constituency (മണ്ഡലം)</Label>
                    <Select 
                      value={manualFormData.assemblyConstituency || ""} 
                      onValueChange={val => setManualFormData({...manualFormData, assemblyConstituency: val})}
                    >
                      <SelectTrigger className="h-12 rounded-xl focus:ring-brand-blue font-bold">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {(CONSTITUENCIES[manualFormData.district] || []).map(ac => (
                          <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="s-role" className="font-black text-slate-700 uppercase mb-2">Account Role</Label>
                  <Select 
                    value={manualFormData.role || 'member'} 
                    onValueChange={val => setManualFormData({...manualFormData, role: val as any})}
                  >
                    <SelectTrigger className="h-12 rounded-xl focus:ring-brand-blue font-bold">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member (അംഗം)</SelectItem>
                      <SelectItem value="operator">Operator (ജില്ലാ അഡ്മിൻ)</SelectItem>
                      <SelectItem value="admin">Second Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {manualFormData.role !== 'member' && (
                  <>
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <Label htmlFor="m-email" className="font-black text-slate-700 uppercase mb-2">Email ID</Label>
                      <Input 
                        id="m-email" 
                        type="email"
                        required 
                        className="h-12 rounded-xl focus:ring-brand-blue"
                        placeholder="example@mail.com" 
                        value={manualFormData.email} 
                        onChange={e => setManualFormData({...manualFormData, email: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2 animate-in fade-in duration-300">
                      <Label htmlFor="m-address" className="font-black text-slate-700 uppercase mb-2">Full Address</Label>
                      <Input 
                        id="m-address" 
                        required 
                        className="h-12 rounded-xl focus:ring-brand-blue"
                        placeholder="House Name, Street, etc." 
                        value={manualFormData.address} 
                        onChange={e => setManualFormData({...manualFormData, address: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <Label htmlFor="m-post" className="font-black text-slate-700 uppercase mb-2">Post Office</Label>
                        <Input 
                          id="m-post" 
                          required 
                          className="h-12 rounded-xl focus:ring-brand-blue"
                          placeholder="Post Office" 
                          value={manualFormData.postOffice} 
                          onChange={e => setManualFormData({...manualFormData, postOffice: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="m-pincode" className="font-black text-slate-700 uppercase mb-2">Pincode</Label>
                        <Input 
                          id="m-pincode" 
                          required 
                          maxLength={6}
                          className="h-12 rounded-xl focus:ring-brand-blue"
                          placeholder="6-digit PIN" 
                          value={manualFormData.pincode} 
                          onChange={e => setManualFormData({...manualFormData, pincode: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <Label htmlFor="m-pin" className="font-black text-slate-700 uppercase mb-2">Login Password</Label>
                        <Input 
                          id="m-pin" 
                          className="h-12 rounded-xl focus:ring-brand-blue font-mono"
                          value={manualFormData.pin} 
                          onChange={e => setManualFormData({...manualFormData, pin: e.target.value})}
                          maxLength={12}
                        />
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Default is 123456</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="m-quota" className="font-black text-slate-700 uppercase mb-2">Entry Quota</Label>
                        <Input 
                          id="m-quota" 
                          type="number"
                          className="h-12 rounded-xl focus:ring-brand-blue"
                          value={manualFormData.quota} 
                          onChange={e => setManualFormData({...manualFormData, quota: parseInt(e.target.value) || 0})}
                        />
                        <p className="text-[10px] text-indigo-500 font-bold uppercase">Allowed entries</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t flex gap-4">
                <Button type="button" variant="ghost" onClick={() => setIsManualEntryOpen(false)} className="flex-1 h-14 font-black rounded-2xl uppercase tracking-widest text-xs">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 h-14 font-black rounded-2xl bg-brand-blue hover:bg-brand-blue/90 text-white uppercase tracking-widest text-xs shadow-lg shadow-brand-blue/20">
                  {isSubmitting ? 'Processing...' : 'ADD & ACTIVATE'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-bold">Edit Member Details</DialogTitle>
              <DialogDescription className="font-medium">
                Update details for {editingMember?.name}.
              </DialogDescription>
            </DialogHeader>
            {editingMember && (
              <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input 
                      id="edit-name" 
                      value={editingMember.name || ""} 
                      onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mobile">Mobile Number</Label>
                    <Input 
                      id="edit-mobile" 
                      value={editingMember.mobile || ""} 
                      onChange={e => setEditingMember({...editingMember, mobile: e.target.value.replace(/\D/g, '')})}
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email ID</Label>
                  <Input 
                    id="edit-email" 
                    value={editingMember.email || ""} 
                    onChange={e => setEditingMember({...editingMember, email: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label>District</Label>
                    <Select 
                      value={editingMember.district || ""} 
                      onValueChange={val => setEditingMember({...editingMember, district: val, assemblyConstituency: CONSTITUENCIES[val]?.[0] || ''})}
                    >
                      <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assembly Constituency</Label>
                    <Select 
                      value={editingMember.assemblyConstituency || ""} 
                      onValueChange={val => setEditingMember({...editingMember, assemblyConstituency: val})}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {(CONSTITUENCIES[editingMember.district] || []).map(ac => (
                          <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address">Full Address</Label>
                  <Input 
                    id="edit-address" 
                    value={editingMember.address || ''} 
                    onChange={e => setEditingMember({...editingMember, address: e.target.value})}
                    placeholder="House name, Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-post">Post Office</Label>
                    <Input 
                      id="edit-post" 
                      value={editingMember.postOffice || ''} 
                      onChange={e => setEditingMember({...editingMember, postOffice: e.target.value})}
                      placeholder="Post Office"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pincode">Pincode</Label>
                    <Input 
                      id="edit-pincode" 
                      value={editingMember.pincode || ''} 
                      onChange={e => setEditingMember({...editingMember, pincode: e.target.value})}
                      placeholder="PIN"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Blood Group</Label>
                    <Select 
                      value={editingMember.bloodGroup || ""} 
                      onValueChange={val => setEditingMember({...editingMember, bloodGroup: val})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-pin">Login Password</Label>
                    <Input 
                      id="edit-pin" 
                      value={editingMember.pin || '123456'} 
                      onChange={e => setEditingMember({...editingMember, pin: e.target.value})}
                      maxLength={6}
                    />
                  </div>

                  {isSuperAdmin && (
                    <div className="space-y-2 p-3 bg-red-50/20 border border-brand-magenta/25 rounded-2xl">
                      <Label htmlFor="edit-join-date" className="text-brand-magenta font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Joining Date (ജോയിനിംഗ് തീയതി)
                      </Label>
                      <Input 
                        id="edit-join-date" 
                        type="date"
                        value={(() => {
                          const dateVal = editingMember.registrationDate;
                          if (!dateVal) return '';
                          const d = dateVal.toDate ? dateVal.toDate() : (dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal));
                          if (isNaN(d.getTime())) return '';
                          return d.toISOString().split('T')[0];
                        })()} 
                        onChange={e => {
                          const selectedDateVal = e.target.value;
                          if (selectedDateVal) {
                            const newRegDate = new Date(selectedDateVal);
                            const newExpiryDate = new Date(newRegDate);
                            newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                            
                            setEditingMember({
                              ...editingMember,
                              registrationDate: newRegDate,
                              expiryDate: newExpiryDate,
                              renewalPending: false
                            });
                          }
                        }}
                        className="bg-white border-brand-magenta/30 focus-visible:ring-brand-magenta"
                      />
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                        * സൂപ്പർ അഡ്മിന് മാത്രം: ജോയിനിംഗ് തീയതി മാറ്റുമ്പോൾ തനിയെ ഒരു വർഷത്തെ കാലാവധി (Validity Period) കണക്കാക്കുകയും, കാർഡ് ആക്റ്റീവ് ആവുകയും ചെയ്യും.
                      </p>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <div className="space-y-2 p-3 bg-blue-50/10 border border-brand-blue/20 rounded-2xl">
                      <Label htmlFor="edit-expiry-date" className="text-brand-blue font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Expiry Date (കാലാവധി തീയതി)
                      </Label>
                      <Input 
                        id="edit-expiry-date" 
                        type="date"
                        value={(() => {
                          const dateVal = editingMember.expiryDate;
                          if (!dateVal) return '';
                          const d = dateVal.toDate ? dateVal.toDate() : (dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal));
                          if (isNaN(d.getTime())) return '';
                          return d.toISOString().split('T')[0];
                        })()} 
                        onChange={e => {
                          const selectedDateVal = e.target.value;
                          if (selectedDateVal) {
                            const newExpiryDate = new Date(selectedDateVal);
                            setEditingMember({
                              ...editingMember,
                              expiryDate: newExpiryDate,
                              renewalPending: false
                            });
                          }
                        }}
                        className="bg-white border-brand-blue/30 focus-visible:ring-brand-blue"
                      />
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-2">
                        അംഗത്തിന്റെ আইഡി കാർഡിന്റെ കാലാവധി ഈ തീയതിയോടെ അവസാനിക്കും. താഴെ പറയുന്ന ബട്ടണുകൾ ഉപയോഗിച്ച് വേഗത്തിൽ ക്രമീകരിക്കാം:
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          className="text-[10px] text-green-600 border-green-200 hover:bg-green-50 font-bold flex-1"
                          onClick={() => {
                            const oneYearFromNow = new Date();
                            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                            setEditingMember({
                              ...editingMember,
                              expiryDate: oneYearFromNow,
                              renewalPending: false
                            });
                          }}
                        >
                          +1 Year (വാലിഡിറ്റി നൽകുക)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          className="text-[10px] text-red-600 border-red-200 hover:bg-red-50 font-bold flex-1"
                          onClick={() => {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            setEditingMember({
                              ...editingMember,
                              expiryDate: yesterday,
                              renewalPending: false
                            });
                          }}
                        >
                          Expire (വാലിഡിറ്റി കളയുക)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editingMember.status || ""} 
                      onValueChange={val => setEditingMember({...editingMember, status: val as 'active' | 'pending' | 'offline'})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>System Role</Label>
                    <Select 
                      value={editingMember.role || "member"} 
                      onValueChange={val => setEditingMember({...editingMember, role: val as 'admin' | 'operator' | 'member'})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">General Member</SelectItem>
                        <SelectItem value="operator">District Operator</SelectItem>
                        <SelectItem value="admin">District Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(editingMember.role === 'operator' || editingMember.role === 'admin') && (
                  <div className="p-4 bg-brand-blue/5 rounded-2xl space-y-4 border border-brand-blue/10">
                    <div className="flex items-center gap-2 text-brand-blue font-black text-xs uppercase tracking-widest">
                      <Lock className="w-3.5 h-3.5" /> Quota Settings
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-quota">Registry Limit (Total)</Label>
                        <Input 
                          id="edit-quota" 
                          type="number"
                          placeholder="No limit"
                          value={editingMember.quota ?? ''} 
                          onChange={e => setEditingMember({...editingMember, quota: e.target.value === '' ? undefined : parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-quota-used">Used Count (Manual Reset)</Label>
                        <Input 
                          id="edit-quota-used" 
                          type="number"
                          value={editingMember.quotaUsed || 0} 
                          onChange={e => setEditingMember({...editingMember, quotaUsed: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-4 flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setEditingMember(null)} className="flex-1 font-bold">Cancel</Button>
                  <Button type="submit" className="flex-1 font-black rounded-xl">Save Changes</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Claim Details Dialog */}
        <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase tracking-tight text-brand-blue">
                <ShieldAlert className={cn(
                   "w-6 h-6",
                   selectedClaim?.priorityStatus === 'EMERGENCY RED' ? 'text-red-600' : 'text-brand-blue'
                )} />
                Support Claim Details
              </DialogTitle>
            </DialogHeader>
            {selectedClaim && (
              <div className="space-y-8 py-6">
                 {/* Member Profile Details Card */}
                 <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-[24px] space-y-4">
                    <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
                       <Users className="w-4 h-4 text-brand-magenta" />
                       Member Profile Details (മെമ്പർ വിവരങ്ങൾ)
                    </h4>
                    {claimUser && (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-black">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Holder / Claimant (മെമ്പർ / ക്ലെയിം വ്യക്തി)</p>
                             <p className="font-bold text-slate-850 text-sm flex items-center gap-1.5 flex-wrap">
                                {claimUser.name}
                                {selectedClaim?.userName && selectedClaim.userName !== claimUser.name && (
                                   <span className="text-slate-500 font-bold">({selectedClaim.userName})</span>
                                )}
                                {selectedClaim?.relation && (
                                   <Badge variant="outline" className="text-[8px] h-4 py-0 font-black uppercase text-brand-magenta border-brand-magenta/30 bg-brand-magenta/[0.03]">
                                      {selectedClaim.relation === 'Self' ? 'സ്വന്തം (Self)' :
                                       selectedClaim.relation === 'Mother' ? 'അമ്മ (Mother)' :
                                        selectedClaim.relation === 'Father' ? 'അച്ഛൻ (Father)' :
                                        selectedClaim.relation === 'Son' ? 'മകൻ (Son)' :
                                        selectedClaim.relation === 'Daughter' ? 'മകൾ (Daughter)' : 
                                        selectedClaim.relation === 'Wife' ? 'ഭാര്യ (Wife)' :
                                        selectedClaim.relation === 'Husband' ? 'ഭർത്താവ് (Husband)' : selectedClaim.relation}
                                   </Badge>
                                )}
                             </p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member ID (മെമ്പർ ഐഡി നമ്പർ)</p>
                             <p className="font-bold text-brand-magenta text-sm font-mono">{claimUser.membershipId || selectedClaim.membershipId || 'PENDING'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Token Number (ടോക്കൺ നമ്പർ)</p>
                              <p className="font-extrabold text-[#FF1493] text-sm font-mono bg-[#FF1493]/5 border border-[#FF1493]/15 px-2 py-0.5 rounded w-fit">#{selectedClaim.tokenNo ?? 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                             <p className="font-bold text-slate-800">{claimUser.mobile}</p>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address (മേൽവിലാസം)</p>
                             <p className="font-medium text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">{claimUser.address}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">District</p>
                             <p className="font-bold text-slate-850">
                                {DISTRICTS.find(d => d.code === claimUser.district)?.name || claimUser.district || 'N/A'}
                             </p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Constituency (നിയമസഭ മണ്ഡലം)</p>
                             <p className="font-bold text-slate-700">{claimUser.constituency || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-auto">Blood Group</p>
                             <span className="bg-red-50 text-red-600 border border-red-100 hover:bg-neutral-100 font-extrabold px-2 py-0.5 rounded text-[10px] w-fit block">{claimUser.bloodGroup || 'N/A'}</span>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (ഇമെയിൽ)</p>
                             <p className="font-medium text-slate-650 truncate">{claimUser.email || 'N/A'}</p>
                          </div>
                       </div>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority Status</p>
                       <Badge className={cn(
                          "font-black text-[10px] px-3 py-1 text-white border-0",
                          selectedClaim.priorityStatus === 'EMERGENCY RED' ? 'bg-red-600' :
                          selectedClaim.priorityStatus === 'RED' ? 'bg-red-500' :
                          selectedClaim.priorityStatus === 'ORANGE' ? 'bg-orange-500' : 'bg-green-500'
                       )}>
                          {selectedClaim.priorityStatus}
                       </Badge>
                       {selectedClaim.isEmergency && (
                         <p className="text-[9px] font-black text-red-600 mt-2 flex items-center gap-1 uppercase tracking-tight">
                            <ShieldAlert className="w-3 h-3" /> Emergency Verified
                         </p>
                       )}
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Highrich ID</p>
                       <p className="text-sm font-black text-brand-blue uppercase">{selectedClaim.highrichId || 'NOT PROVIDED'}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <LayoutDashboard className="w-4 h-4 text-brand-magenta" />
                       Amount Breakdown (ക്ലെയിം വിവരങ്ങൾ)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-brand-blue/5 border border-brand-blue/10 p-4 rounded-2xl text-center">
                          <p className="text-[9px] font-black text-brand-blue uppercase mb-1">Total Paid</p>
                          <p className="text-xl font-black text-brand-blue tracking-tight">₹{selectedClaim.totalPaid?.toLocaleString('en-IN')}</p>
                       </div>
                       <div className="bg-green-50 border border-green-100 p-4 rounded-2xl text-center">
                          <p className="text-[9px] font-black text-green-600 uppercase mb-1">Total Received</p>
                          <p className="text-xl font-black text-green-600 tracking-tight">₹{selectedClaim.totalReceived?.toLocaleString('en-IN')}</p>
                       </div>
                       <div className="bg-brand-magenta/5 border border-brand-magenta/10 p-4 rounded-2xl text-center">
                          <p className="text-[9px] font-black text-brand-magenta uppercase mb-1">Pending</p>
                          <p className="text-xl font-black text-brand-magenta tracking-tight">₹{selectedClaim.totalPending?.toLocaleString('en-IN')}</p>
                       </div>
                    </div>

                    {!selectedClaim.noBreakup && selectedClaim.categoryDetails && (
                       <div className="bg-white border rounded-2xl overflow-hidden mt-4">
                          <Table>
                             <TableHeader className="bg-slate-50">
                                <TableRow>
                                   <TableHead className="text-[9px] font-black uppercase">Category</TableHead>
                                   <TableHead className="text-[9px] font-black uppercase">Paid</TableHead>
                                   <TableHead className="text-[9px] font-black uppercase">Received</TableHead>
                                   <TableHead className="text-[9px] font-black uppercase text-right">Pending</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {Object.entries(selectedClaim.categoryDetails).map(([catId, detail]: [string, any]) => (
                                   <TableRow key={catId} className="text-xs">
                                      <TableCell className="font-bold uppercase text-[10px]">{getCategoryLabel(catId)}</TableCell>
                                      <TableCell className="font-medium">₹{detail.paid?.toLocaleString('en-IN')}</TableCell>
                                      <TableCell className="font-medium text-green-600">₹{detail.received?.toLocaleString('en-IN')}</TableCell>
                                      <TableCell className="text-right font-black text-brand-magenta">₹{detail.pending?.toLocaleString('en-IN')}</TableCell>
                                   </TableRow>
                                ))}
                             </TableBody>
                          </Table>
                       </div>
                    )}
                 </div>

                  {selectedClaim.notes && (
                     <div className="space-y-2 bg-yellow-50/40 border border-yellow-100 p-4 rounded-2xl mb-6">
                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                           Remarks / Notes (അധിക വിവരങ്ങൾ / നോട്ട്)
                        </h4>
                        <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                           {selectedClaim.notes}
                        </p>
                     </div>
                  )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Future Preference</h4>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-xs font-bold text-slate-700">
                          "{selectedClaim.futurePreference === 'settlement' ? 'Prefer settlement and closure after receiving balance' : 
                            selectedClaim.futurePreference === 'wait' ? 'Willing to wait if company continues and grows' : 
                            'Ready to continue with company based on future plans'}"
                       </div>
                    </div>
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Hardship Declaration</h4>
                       <div className="flex flex-wrap gap-2 text-xs">
                          {selectedClaim.hardshipStatus?.map((h: string) => (
                             <Badge key={h} className="bg-red-100 text-red-700 border-red-200 font-black text-[9px] px-3 py-1 rounded-lg">
                                {h === 'bank' ? 'BANK SEIZURE' : h === 'crisis' ? 'FINANCIAL CRISIS' : h === 'medical' ? 'MEDICAL EMERGENCY' : 'NONE'}
                             </Badge>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="pt-6 border-t flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-400">
                       SUBMITTED ON: {selectedClaim.createdAt?.toDate ? selectedClaim.createdAt.toDate().toLocaleString() : 'N/A'}
                    </div>
                    <Button onClick={() => setSelectedClaim(null)} className="rounded-xl font-black uppercase text-xs px-8">Close</Button>
                 </div>
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

                {/* Future Preference */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-500 uppercase">Future Preference (തുടർവിഷയം മുൻഗണന)</Label>
                  <Select value={editClaimFuturePreference} onValueChange={setEditClaimFuturePreference}>
                     <SelectTrigger className="w-full h-11 border bg-white rounded-xl text-xs font-bold text-slate-700">
                        <SelectValue placeholder="Select preference" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="settlement" className="text-xs">Prefer settlement and closure after receiving balance</SelectItem>
                        <SelectItem value="wait" className="text-xs">Willing to wait if company continues and grows</SelectItem>
                        <SelectItem value="continue" className="text-xs">Ready to continue with company based on future plans</SelectItem>
                     </SelectContent>
                  </Select>
                </div>

                {/* Remarks/Notes Input */}
                <div className="space-y-1.5 font-sans">
                  <Label className="text-[10px] font-black text-slate-500 uppercase">Remarks / Notes (അധിക വിവരങ്ങൾ / നോട്ട്)</Label>
                  <textarea 
                    value={editClaimNotes} 
                    onChange={(e) => setEditClaimNotes(e.target.value)} 
                    placeholder="Enter notes or explanation..."
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:border-brand-magenta/85 focus:ring-0 focus:outline-none min-h-20 bg-slate-50/20"
                  />
                </div>

                {/* Hardship declaration */}
                <div className="space-y-2">
                   <Label className="text-[10px] font-black text-slate-500 uppercase">Hardship Declarations (അടിയന്തര പ്രതിസന്ധികൾ)</Label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                      {[
                        { id: 'bank', label: 'Bank seizure pressure' },
                        { id: 'crisis', label: 'Financial crisis' },
                        { id: 'medical', label: 'Medical emergency' },
                        { id: 'none', label: 'No emergency' }
                      ].map(h => (
                        <div key={h.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
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
                          />
                          <Label htmlFor={`admin-edit-claim-hardship-${h.id}`} className="text-xs font-bold text-slate-650 truncate cursor-pointer select-none">
                            {h.label}
                          </Label>
                        </div>
                      ))}
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
          </div>
        </div>
      </div>
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
    <Card className="border border-slate-200/40 bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.025)] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-black text-slate-800 leading-none tracking-tight font-mono">{value}</h3>
          </div>
          <div className={cn("p-3 rounded-xl border flex items-center justify-center shrink-0", bgColors[color])}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value, icon }: { label: string, value?: string, icon?: React.ReactNode }) {
  return (
    <div className="space-y-1 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
        {icon && React.cloneElement(icon as React.ReactElement, { className: 'w-3 h-3 text-slate-405' })}
        {label}
      </p>
      <p className="text-sm font-black text-slate-800 leading-tight break-all truncate">
        {value || '---'}
      </p>
    </div>
  );
}
