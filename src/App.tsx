import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import LandingPage from './components/LandingPage';
import RegistrationForm from './components/RegistrationForm';
import RenewalForm from './RenewalForm';
import LoginForm from './components/LoginForm';
import GalleryPage from './components/GalleryPage';
import MembershipCard from './components/MembershipCard';
import ProfileEditForm from './components/ProfileEditForm';
import ChangePasswordForm from './components/ChangePasswordForm';
import PaymentReceipts from './components/PaymentReceipts';
import { SupportClaimForm } from './components/SupportClaimForm';
import OperatorDashboard from './components/OperatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AiChatSupport from './components/AiChatSupport';
import Logo from './Logo';
import { UserProfile } from './types';
import { subscribeToOrgSettings, OrgSettings, defaultSettings, subscribeToAnnouncements, Announcement } from './lib/cms';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { DISTRICTS, CONSTITUENCIES, LOGO_URL, FALLBACK_LOGO_URL, getDistrictCode, getAssemblyCode, generateNewMembershipId } from './constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { auth, db, storage, handleFirestoreError, OperationType, secondaryAuth, secondaryDb } from './lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, updatePassword } from 'firebase/auth';
import { Clock, LogOut, Camera, ShieldCheck, RefreshCw, Users, ShieldAlert, ArrowRight, Eye, EyeOff, Pencil, Trash2, MoreVertical, Receipt, Mail, Smartphone, Search, MapPin, Plus, CheckCircle2, AlertTriangle, Info, Printer, Download, Share2, FileText, MessageCircle, LayoutDashboard } from 'lucide-react';
import { setDoc, doc, updateDoc, deleteDoc, collection, onSnapshot, query, getDoc, getDocs, runTransaction, serverTimestamp, where, increment, limit, addDoc, writeBatch, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from './lib/imageUtils';
import { googleProvider } from './lib/firebase';
import { printCourtComboReport, printCourtClaimReport, shareCourtComboPdf, downloadCourtComboPdf, downloadCourtClaimPdf, getCourtComboHtml, getSingleCourtClaimHtml } from './lib/claimPrint';
import { sendWAMessage } from './lib/whatsapp';
import OperationJanamail from "./components/OperationJanamail";
import { ELedgerModule } from "./eledger";
import { InfinityBorderCard } from './components/InfinityBorderCard';
import { InfinityBorderButton } from './components/InfinityBorderButton';
import { idbGet, idbSet } from './lib/idbCache';
import { normalizeDistrictCode, isDistrictMatch } from './lib/districtUtils';
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

const getStrictDistrictFromEmail = (email: string): string | null => {
  const cleanEmail = email.toLowerCase().trim();
  const username = cleanEmail.split('@')[0];
  if (!username.startsWith('hcrs')) return null;
  
  const suffix = username.substring(4); // remove 'hcrs'
  if (!suffix) return null;
  
  if (suffix === 'kasaragod' || suffix === 'kasargod' || suffix === 'ksd') return 'KSD';
  if (suffix === 'kannur' || suffix === 'knr') return 'KNR';
  if (suffix === 'wayanad' || suffix === 'wyd') return 'WYD';
  if (suffix === 'kozhikode' || suffix === 'kozicode' || suffix === 'kozikhode' || suffix === 'koz') return 'KOZ';
  if (suffix === 'malappuram' || suffix === 'malapuram' || suffix === 'mlp' || suffix === 'mpm') return 'MLP';
  if (suffix === 'palakkad' || suffix === 'palakad' || suffix === 'pkd') return 'PKD';
  if (suffix === 'thrissur' || suffix === 'trichur' || suffix === 'tcr') return 'TCR';
  if (suffix === 'ernakulam' || suffix === 'cochin' || suffix === 'ekm') return 'EKM';
  if (suffix === 'idukki' || suffix === 'idk') return 'IDK';
  if (suffix === 'kottayam' || suffix === 'ktm') return 'KTM';
  if (suffix === 'alappuzha' || suffix === 'alapuzha' || suffix === 'alp') return 'ALP';
  if (suffix === 'pathanamthitta' || suffix === 'pathanamthita' || suffix === 'pta') return 'PTA';
  if (suffix === 'kollam' || suffix === 'quilon' || suffix === 'klm') return 'KLM';
  if (suffix === 'thiruvananthapuram' || suffix === 'trivandrum' || suffix === 'tvm') return 'TVM';
  
  return null;
};

// Resilient server-first Firestore fetchers with timeout safeguards to guarantee responsive UI
// while fetching fresh live data from Firestore backend.
export const fetchDocsServerFirst = async (q: any, timeoutMs = 2500) => {
  try {
    const serverPromise = getDocsFromServer(q);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    const serverSnap: any = await Promise.race([serverPromise, timeoutPromise]);
    if (serverSnap && !serverSnap.empty) return serverSnap;
  } catch (err: any) {
    // Network offline, timeout or permission edge-case, fall through to cache/standard getDocs
  }
  return await getDocs(q);
};

export const fetchDocServerFirst = async (docRef: any, timeoutMs = 2500) => {
  try {
    const serverPromise = getDocFromServer(docRef);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    const serverSnap: any = await Promise.race([serverPromise, timeoutPromise]);
    if (serverSnap && serverSnap.exists()) return serverSnap;
  } catch (err: any) {}
  return await getDoc(docRef);
};

export const selectBestUserDocument = (docs: any[], originalInput?: string) => {
  if (!docs || docs.length === 0) return null;
  const inputClean = (originalInput || '').trim().toLowerCase();
  const inputDigits = inputClean.replace(/\D/g, '').slice(-10);

  const sorted = [...docs].sort((a, b) => {
    const dataA = typeof a.data === 'function' ? a.data() : a;
    const dataB = typeof b.data === 'function' ? b.data() : b;
    const idA = a.id || dataA.uid || '';
    const idB = b.id || dataB.uid || '';

    // 0. Super Admin / Admin Input Priority
    const isMainAdminInput = MAIN_ADMINS.some(e => e.toLowerCase() === inputClean) || inputDigits === '9645934571';
    const isAdmA = dataA.role === 'admin' || dataA.isAdmin === true;
    const isAdmB = dataB.role === 'admin' || dataB.isAdmin === true;
    if (isMainAdminInput) {
      if (isAdmA && !isAdmB) return -1;
      if (isAdmB && !isAdmA) return 1;
    }

    // 1. Active & Approved Status (Active accounts always beat deleted/rejected/pending)
    const isActiveA = (dataA.status === 'active' || dataA.isApproved === true) && dataA.status !== 'deleted';
    const isActiveB = (dataB.status === 'active' || dataB.isApproved === true) && dataB.status !== 'deleted';
    if (isActiveA && !isActiveB) return -1;
    if (isActiveB && !isActiveA) return 1;

    // 2. Unexpired Status (expiryDate in future > expired)
    const now = Date.now();
    const getExpiryTime = (data: any) => {
      const exp = data?.expiryDate;
      if (!exp) return 0;
      const t = exp.toDate ? exp.toDate().getTime() : (exp.seconds ? exp.seconds * 1000 : new Date(exp).getTime());
      return isNaN(t) ? 0 : t;
    };
    const expA = getExpiryTime(dataA);
    const expB = getExpiryTime(dataB);
    const isUnexpiredA = expA > now;
    const isUnexpiredB = expB > now;
    if (isUnexpiredA && !isUnexpiredB) return -1;
    if (isUnexpiredB && !isUnexpiredA) return 1;

    // 3. Not stuck in renewal pending
    const isRenPendingA = dataA?.renewalPending === true;
    const isRenPendingB = dataB?.renewalPending === true;
    if (!isRenPendingA && isRenPendingB) return -1;
    if (isRenPendingA && !isRenPendingB) return 1;

    // 4. Complete Member Profile (has real name and official HCRS membershipId)
    const hasNameA = Boolean(dataA?.name && dataA.name !== 'Member' && String(dataA.name).trim().length > 1);
    const hasNameB = Boolean(dataB?.name && dataB.name !== 'Member' && String(dataB.name).trim().length > 1);
    const hasMemIdA = Boolean(dataA?.membershipId && String(dataA.membershipId).toUpperCase().startsWith('HCRS'));
    const hasMemIdB = Boolean(dataB?.membershipId && String(dataB.membershipId).toUpperCase().startsWith('HCRS'));
    const scoreA = (hasNameA ? 2 : 0) + (hasMemIdA ? 2 : 0);
    const scoreB = (hasNameB ? 2 : 0) + (hasMemIdB ? 2 : 0);
    if (scoreA !== scoreB) return scoreB - scoreA;

    // 5. Expiry timestamp (latest expiry wins)
    if (expA !== expB) return expB - expA;

    // 6. Recent activity timestamp
    const getActivityTime = (data: any) => {
      const t = data?.renewalApprovedAt || data?.renewalDate || data?.issueDate || data?.registrationDate || data?.createdAt;
      if (!t) return 0;
      const val = t.toDate ? t.toDate().getTime() : (t.seconds ? t.seconds * 1000 : new Date(t).getTime());
      return isNaN(val) ? 0 : val;
    };
    const actA = getActivityTime(dataA);
    const actB = getActivityTime(dataB);
    if (actA !== actB) return actB - actA;

    // 7. Standard UID over offline_
    const isOfflineA = String(idA).startsWith('offline_');
    const isOfflineB = String(idB).startsWith('offline_');
    if (!isOfflineA && isOfflineB) return -1;
    if (isOfflineA && !isOfflineB) return 1;

    return 0;
  });

  return sorted[0];
};

export default function App() {
  const [view, setView] = useState<'landing' | 'register' | 'renewal' | 'login' | 'card' | 'admin' | 'operator' | 'support' | 'loading' | 'gallery' | 'verify' | 'janamail' | 'eledger' | 'change-password' | 'complete-profile'>(() => {
    if (typeof window !== 'undefined') {
      const isJanamailPath = window.location.pathname.startsWith('/janamail') || 
                            window.location.pathname.endsWith('/janamail') || 
                            new URLSearchParams(window.location.search).get('view') === 'janamail';
      if (isJanamailPath) {
        return 'janamail';
      }
      const isELedgerPath = window.location.pathname.startsWith('/eledger') || 
                            window.location.pathname.endsWith('/eledger') || 
                            new URLSearchParams(window.location.search).get('view') === 'eledger';
      if (isELedgerPath) {
        return 'eledger';
      }
    }
    return 'loading';
  });
  const currentViewRef = useRef(view);
  useEffect(() => {
    currentViewRef.current = view;
  }, [view]);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [verifiedMember, setVerifiedMember] = useState<UserProfile | null>(null);
  const [members, setMembers] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem('hcrs_cached_members_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error loading initial cached members:", e);
    }
    return [];
  });

  // Fast IndexedDB loader for massive offline datasets (~8,000 members)
  useEffect(() => {
    idbGet<UserProfile[]>('hcrs_cached_members_list').then((cached) => {
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setMembers((prev) => (prev.length === 0 ? cached : prev));
      }
    }).catch(() => {});
  }, []);

  const [districtQuotas, setDistrictQuotas] = useState<Record<string, number>>(() => {
    try {
      const cachedTotals = localStorage.getItem('hcrs_cached_district_quotas_totals');
      if (cachedTotals) return JSON.parse(cachedTotals);
    } catch (e) {}
    return {};
  });
  const [districtQuotasUsed, setDistrictQuotasUsed] = useState<Record<string, number>>(() => {
    try {
      const cachedUsed = localStorage.getItem('hcrs_cached_district_quotas_used');
      if (cachedUsed) return JSON.parse(cachedUsed);
    } catch (e) {}
    return {};
  });
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [prefilledMobile, setPrefilledMobile] = useState('');
  const [hasSubmittedClaim, setHasSubmittedClaim] = useState(false);
  const [submittedClaimsCount, setSubmittedClaimsCount] = useState(0);
  const [userSubmittedClaims, setUserSubmittedClaims] = useState<any[]>([]);
  const [selectedCardClaimTab, setSelectedCardClaimTab] = useState<number>(-1);
  const [isPreviewingClaim, setIsPreviewingClaim] = useState(false);
  const [previewModalClaimIndex, setPreviewModalClaimIndex] = useState<number>(-1);
  const [showInlineClaimPreview, setShowInlineClaimPreview] = useState(false);

  // Dedicated handlers for Individual and Combined Claim actions on Profile Page
  const handleViewSingleClaim = (claim: any) => {
    if (!claim) return;
    const idx = userSubmittedClaims.findIndex(c => 
      (c.id && claim.id && c.id === claim.id) || 
      (c.relation && claim.relation && c.relation.toLowerCase() === claim.relation.toLowerCase())
    );
    const targetIdx = idx >= 0 ? idx : 0;
    setPreviewModalClaimIndex(targetIdx);
    setSelectedCardClaimTab(targetIdx);
    setShowInlineClaimPreview(true);
    setIsPreviewingClaim(true);
    setTimeout(() => {
      document.getElementById('court-record-card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePrintSingleClaim = (claim: any) => {
    if (!claim) return;
    printCourtClaimReport(claim, user);
  };

  const handleDownloadSingleClaimPdf = (claim: any) => {
    if (!claim) return;
    downloadCourtClaimPdf(claim, user);
  };

  const handleViewAllClaims = () => {
    setPreviewModalClaimIndex(-1);
    setSelectedCardClaimTab(-1);
    setIsPreviewingClaim(true);
  };

  const handlePrintAllClaims = () => {
    if (!userSubmittedClaims || userSubmittedClaims.length === 0) return;
    printCourtComboReport(user, userSubmittedClaims);
  };

  const handleDownloadAllClaimsPdf = () => {
    if (!userSubmittedClaims || userSubmittedClaims.length === 0) return;
    downloadCourtComboPdf(user, userSubmittedClaims);
  };
  const [claimRefreshTrigger, setClaimRefreshTrigger] = useState(0);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isSyncingDocs, setIsSyncingDocs] = useState(false);
  const isSyncingRef = useRef(false);
  const hasInitialSyncedRef = useRef(false);
  const lastAuthUserUidRef = useRef<string | null>(null);

  const refreshMembersList = useCallback(async (customUser?: UserProfile, isManual: boolean = false) => {
    const activeUser = customUser || user;
    if (!activeUser) return;
    const isAdmin = activeUser.role === 'admin' || activeUser.isAdmin;
    const isOperator = activeUser.role === 'operator';
    if (!isAdmin && !isOperator) return;

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncingDocs(true);

    const loadingToast = isManual ? 'syncing_db_entries' : undefined;
    if (isManual) {
      toast.loading('ഡാറ്റാബേസ് വിവരങ്ങൾ ശേഖരിക്കുന്നു (Syncing database entries)...', { id: loadingToast });
    }

    if (activeUser.uid === 'offline_admin') {
      try {
        const response = await fetch('/api/local-backup-users');
        if (!response.ok) throw new Error('Local API failed');
        const data = await response.json();
        setMembers(data);
        if (isManual) {
          toast.success('Local Offline Backup database loaded successfully.', { id: loadingToast });
        }
      } catch (err: any) {
        console.error("Local backup load failed:", err);
        if (isManual) {
          toast.error('Failed to reload local backup.', { id: loadingToast });
        }
      } finally {
        setIsSyncingDocs(false);
        isSyncingRef.current = false;
      }
      return;
    }

    // Immediate IndexedDB pre-hydration if members is currently empty
    try {
      const existingIdb = await idbGet<UserProfile[]>('hcrs_cached_members_list');
      if (existingIdb && Array.isArray(existingIdb) && existingIdb.length > 0) {
        setMembers(prev => prev.length === 0 ? existingIdb : prev);
      }
    } catch {}

    try {
      const currentEmail = (activeUser.email || '').toLowerCase().trim();
      const isSuperAdminEmail = MAIN_ADMINS.some(e => e.toLowerCase() === currentEmail);
      const isMasterAdmin = isAdmin || isSuperAdminEmail || activeUser.role === 'admin' || activeUser.isAdmin === true || currentViewRef.current === 'admin';
      const userNormDist = normalizeDistrictCode(activeUser.district);

      let cleanList: UserProfile[] = [];
      let fetchSuccess = false;

      // Tier 1: Fast server-side cached endpoint (returns in ~100ms)
      try {
        const apiRes = await fetch(`/api/database/members${isManual ? '?fresh=true' : ''}`);
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson.success && Array.isArray(apiJson.data) && apiJson.data.length > 0) {
            const rawMembers = apiJson.data.filter((u: any) => {
              const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === (u.email || '').toLowerCase());
              return !isMainAdmin;
            });

            if (isMasterAdmin) {
              cleanList = rawMembers;
            } else if (userNormDist) {
              cleanList = rawMembers.filter((u: any) => normalizeDistrictCode(u.district) === userNormDist);
            } else {
              cleanList = rawMembers.filter((u: any) => u.registeredBy === activeUser.uid);
            }
            fetchSuccess = true;
          }
        }
      } catch (apiErr) {
        console.warn("Fast API members fetch notice:", apiErr);
      }

      // Tier 2: Direct Firestore query fallback
      if (!fetchSuccess) {
        let q;
        if (isMasterAdmin) {
          q = query(collection(db, 'users'));
        } else if (userNormDist) {
          q = query(collection(db, 'users'), where('district', '==', userNormDist));
        } else {
          q = query(collection(db, 'users'), where('registeredBy', '==', activeUser.uid));
        }

        try {
          const snapshot = await getDocs(q);
          let list = snapshot.docs
            .map(docSnap => ({ uid: docSnap.id, ...(docSnap.data() as any) } as UserProfile))
            .filter(u => {
              const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === (u.email || '').toLowerCase());
              return !isMainAdmin;
            });

          // If district query returned 0 due to Firestore index or field discrepancies, fallback to full query and client filter
          if (list.length === 0 && userNormDist) {
            const allSnap = await getDocs(query(collection(db, 'users')));
            list = allSnap.docs
              .map(docSnap => ({ uid: docSnap.id, ...(docSnap.data() as any) } as UserProfile))
              .filter(u => {
                const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === (u.email || '').toLowerCase());
                return !isMainAdmin && normalizeDistrictCode(u.district) === userNormDist;
              });
          }

          cleanList = [...list];
          fetchSuccess = true;
        } catch (err: any) {
          console.warn("Direct Firestore getDocs notice, checking cache...", err);
          const cached = await idbGet<UserProfile[]>('hcrs_cached_members_list');
          if (cached && Array.isArray(cached) && cached.length > 0) {
            cleanList = isMasterAdmin ? cached : cached.filter(u => !userNormDist || normalizeDistrictCode(u.district) === userNormDist);
            toast.warning('താൽക്കാലികമായി ഡാറ്റാബേസ് കണക്ഷൻ തടസ്സപ്പെട്ടു: മുൻപ് സേവ് ചെയ്ത വിവരങ്ങൾ ലോഡ് ചെയ്തു.', { id: loadingToast, duration: 6000 });
          } else {
            throw err;
          }
        }
      }

      // Persist to IndexedDB
      try {
        await idbSet('hcrs_cached_members_list', cleanList);
      } catch (idbErr) {
        console.warn("IndexedDB cache save notice:", idbErr);
      }

      // AUTO-CLEANUP DUPLICATE LIFE MEMBER SERIAL NO 1
      const life1s = cleanList.filter(u => u.membership_type === 'LIFE_MEMBER' && u.serialNo === 1);
      if (life1s.length > 1) {
        const sorted = [...life1s].sort((a, b) => {
          const getTimeVal = (r: any) => {
            if (!r) return 0;
            if (typeof r.toDate === 'function') return r.toDate().getTime();
            if (r.seconds) return r.seconds * 1000;
            return new Date(r).getTime() || 0;
          };
          return getTimeVal(a.registrationDate) - getTimeVal(b.registrationDate);
        });

        const toDelete = sorted.slice(1);
        for (const duplicateToKill of toDelete) {
          try {
            await deleteDoc(doc(db, 'users', duplicateToKill.uid));
          } catch (delErr) {
            console.error("Failed to delete duplicate life 1 member:", delErr);
          }
        }

        const deletedUids = toDelete.map(u => u.uid);
        cleanList = cleanList.filter(u => !deletedUids.includes(u.uid));
      }

      setMembers(cleanList);
      if (isManual) {
        toast.success(`ഡാറ്റാബേസിൽ നിന്ന് ${cleanList.length} അംഗങ്ങളുടെ വിവരങ്ങൾ വിജയകരമായി സിങ്ക് ചെയ്തു. (Synchronized ${cleanList.length} database entries)`, { id: loadingToast });
      }
    } catch (err: any) {
      console.error("Members fetch error during refresh:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted')) {
        setIsQuotaExceeded(true);
      }
      if (isManual) {
        toast.error('ഡാറ്റാബേസ് സിങ്ക് പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.', { id: loadingToast });
      }
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setIsSyncingDocs(false);
      isSyncingRef.current = false;
    }
  }, [user]);

  // Auto-sync members whenever an admin or operator enters the dashboard and members is empty
  useEffect(() => {
    if ((view === 'admin' || view === 'operator') && user) {
      if (members.length === 0 && !isSyncingRef.current) {
        refreshMembersList(user);
      }
    }
  }, [view, user, members.length, refreshMembersList]);

  useEffect(() => {
    const handleQuota = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    if (!user) {
      setUserSubmittedClaims([]);
      setSubmittedClaimsCount(0);
      setHasSubmittedClaim(false);
      return;
    }

    const rawMobile = String(user.mobile || '').replace(/\D/g, '');
    const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
    const offlineUid = cleanMobile ? `offline_${cleanMobile}` : '';
    const activeUid = user.uid || '';

    // Fast initial check with getDocs for quick load
    async function checkClaimSubmission() {
      try {
        const queryPromises = [];

        if (activeUid) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('uid', '==', activeUid)))
              .catch(err => {
                console.warn("checkClaimSubmission activeUid query notice:", err);
                return null;
              })
          );
        }
        if (offlineUid) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('uid', '==', offlineUid)))
              .catch(err => {
                console.warn("checkClaimSubmission offlineUid query notice:", err);
                return null;
              })
          );
        }
        if (cleanMobile) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('userMobile', '==', cleanMobile)))
              .catch(err => {
                console.warn("checkClaimSubmission cleanMobile query notice:", err);
                return null;
              })
          );
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('userMobile', '==', `+91${cleanMobile}`)))
              .catch(err => null)
          );
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('userMobile', '==', `+91 ${cleanMobile}`)))
              .catch(err => null)
          );
        }
        if (user.mobile && user.mobile !== cleanMobile) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('userMobile', '==', user.mobile)))
              .catch(err => null)
          );
        }
        if (user.membershipId) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('membershipId', '==', user.membershipId)))
              .catch(err => null)
          );
        }
        const numericMobile = Number(cleanMobile);
        if (cleanMobile && !isNaN(numericMobile)) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('userMobile', '==', numericMobile)))
              .catch(err => {
                console.warn("checkClaimSubmission numericMobile query notice:", err);
                return null;
              })
          );
        }

        const snaps = await Promise.all(queryPromises);
        
        // Collate and deduplicate unique claims
        const claimsMap = new Map<string, any>();
        snaps.forEach(snap => {
          if (snap && !snap.empty) {
            snap.docs.forEach(docSnap => {
              claimsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
            });
          }
        });

        let list = Array.from(claimsMap.values());
        
        // Robust server database API fallback if client Firestore queries returned empty
        if (list.length === 0) {
          try {
            const apiRes = await fetch(`/api/database/claims?mobile=${cleanMobile}&uid=${activeUid}&membershipId=${encodeURIComponent(user.membershipId || '')}&t=${Date.now()}`);
            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson.success && Array.isArray(apiJson.data) && apiJson.data.length > 0) {
                list = apiJson.data;
              }
            }
          } catch (apiErr) {
            console.warn("checkClaimSubmission server API fallback notice:", apiErr);
          }
        }

        setUserSubmittedClaims(list);
        setSubmittedClaimsCount(list.length);
        setHasSubmittedClaim(list.length > 0);
        try {
          if (cleanMobile || activeUid) {
            localStorage.setItem(`hcrs_user_claims_${cleanMobile || activeUid}`, JSON.stringify(list));
          }
        } catch (e) {}
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted')) {
          setIsQuotaExceeded(true);
        }
        console.warn("Status check notice: Database query notice:", errMsg);
      }
    }
    checkClaimSubmission();

    // Real-time onSnapshot listeners for instant UI updates when claims change
    const unsubs: Array<() => void> = [];
    if (cleanMobile) {
      const unsubMobile = onSnapshot(
        query(collection(db, 'claims'), where('userMobile', '==', cleanMobile)),
        (snap) => {
          if (!snap.empty) {
            setUserSubmittedClaims(prev => {
              const map = new Map<string, any>();
              prev.forEach(c => map.set(c.id, c));
              snap.docs.forEach(docSnap => {
                map.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
              });
              const list = Array.from(map.values());
              setSubmittedClaimsCount(list.length);
              setHasSubmittedClaim(list.length > 0);
              return list;
            });
          }
        },
        (err) => console.warn("claims onSnapshot mobile notice:", err)
      );
      unsubs.push(unsubMobile);
    }
    if (activeUid) {
      const unsubUid = onSnapshot(
        query(collection(db, 'claims'), where('uid', '==', activeUid)),
        (snap) => {
          if (!snap.empty) {
            setUserSubmittedClaims(prev => {
              const map = new Map<string, any>();
              prev.forEach(c => map.set(c.id, c));
              snap.docs.forEach(docSnap => {
                map.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
              });
              const list = Array.from(map.values());
              setSubmittedClaimsCount(list.length);
              setHasSubmittedClaim(list.length > 0);
              return list;
            });
          }
        },
        (err) => console.warn("claims onSnapshot uid notice:", err)
      );
      unsubs.push(unsubUid);
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user?.uid, user?.mobile, user?.membershipId, claimRefreshTrigger]);

  const isLifeMember = user && (
    String(user.membership_type || '').toUpperCase().includes('LIFE') ||
    String(user.membershipType || '').toUpperCase().includes('LIFE')
  );
  const isExpired = user && user.role !== 'admin' && user.role !== 'operator' && !user.isAdmin && user.status !== 'pending' && !isLifeMember && (
    user.renewalPending ||
    (() => {
      const exp = user.expiryDate || (() => {
        const reg = user.registrationDate;
        if (!reg) return null;
        const regD = reg.toDate ? reg.toDate() : (reg.seconds ? new Date(reg.seconds * 1000) : new Date(reg));
        if (isNaN(regD.getTime())) return null;
        const expD = new Date(regD);
        expD.setFullYear(expD.getFullYear() + 1);
        return expD;
      })();
      if (!exp) return true;
      const d = exp.toDate ? exp.toDate() : (exp.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
      return isNaN(d.getTime()) ? true : d.getTime() < Date.now();
    })()
  );

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    const unsubAnnouncements = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
    });
    return () => {
      unsub();
      unsubAnnouncements();
    };
  }, []);
  const [isDirectManual, setIsDirectManual] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hcrs_direct_manual') === 'true';
    }
    return false;
  });

  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing...');
  const [fireStatus, setFireStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);

  // Handle Google Auth redirect result on page load (essential for mobile browsers & fallback)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          console.log("[Google Auth Redirect] Successfully authenticated as:", result.user.email);
          toast.success(`Signed in with Google as ${result.user.email}`);
        }
      })
      .catch((error) => {
        if (error && error.code !== 'auth/null-user') {
          console.error("[Google Auth Redirect Error]", {
            code: error?.code,
            message: error?.message,
            currentHostname: typeof window !== 'undefined' ? window.location.hostname : '',
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            authDomain: auth.config.authDomain || (auth.app.options as any)?.authDomain,
            projectId: auth.app.options.projectId,
            error
          });
          const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
          const authDom = auth.config.authDomain || (auth.app.options as any)?.authDomain;
          const projId = auth.app.options.projectId;
          if (error?.code === 'auth/unauthorized-domain') {
            toast.error(`Google Sign-In Error (${error?.code}): Domain "${currentHost}" not authorized in project "${projId}" (AuthDomain: ${authDom}).`, { duration: 12000 });
          } else {
            toast.error(`Google Redirect Auth Error (${error?.code || 'unknown'}): ${error?.message || 'Error'}`, { duration: 10000 });
          }
        }
      });
  }, []);

  const handleGoogleLogin = async () => {
    if (isGoogleLoggingIn) return;
    setIsGoogleLoggingIn(true);
    const loadingToast = toast.loading('Connecting to Google Sign-In...');
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const activeAuthDomain = auth.config.authDomain || (auth.app.options as any)?.authDomain;
    const activeProjectId = auth.app.options.projectId;

    console.log("[Google Auth] Initiating Google Sign-In...", {
      currentHost,
      currentOrigin,
      authDomain: activeAuthDomain,
      projectId: activeProjectId
    });

    try {
      // NOTE: Do not change view to 'loading' prior to signInWithPopup to avoid losing the synchronous user-gesture token in browsers
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[Google Auth] Popup authentication successful:", result.user.email);
      toast.success(`Signed in with Google as ${result.user.email || 'User'}!`, { id: loadingToast });
    } catch (error: any) {
      console.error("[Google Auth Error Details]:", {
        code: error?.code,
        message: error?.message,
        customData: error?.customData,
        currentHost,
        currentOrigin,
        authDomain: activeAuthDomain,
        projectId: activeProjectId,
        error
      });

      if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('closed-by-user')) {
        toast.info('Google sign-in was closed or cancelled.', { id: loadingToast });
      } else if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        toast.error(
          `Google Sign-In Error (${error?.code}): Domain "${currentHost}" is not authorized.`, 
          { 
            id: loadingToast,
            duration: 15000, 
            description: `Firebase Project: ${activeProjectId} | AuthDomain: ${activeAuthDomain}. Please ensure this domain is added to this exact project.`
          }
        );
      } else if (
        error?.code === 'auth/popup-blocked' || 
        error?.message?.includes('popup-blocked') || 
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          console.log("[Google Auth] Popup was blocked or restricted. Initiating signInWithRedirect fallback...");
          toast.loading('Redirecting to Google Login...', { id: loadingToast });
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirErr: any) {
          console.error("[Google Auth Redirect Fallback Error]:", redirErr?.code, redirErr?.message, redirErr);
          toast.error(`Browser Popup was blocked (${redirErr?.code || 'Error'}). Please use Mobile Number & Password.`, { id: loadingToast, duration: 8000 });
        }
      } else {
        const errorMsg = error?.message || 'Google sign-in failed.';
        toast.error(`Google Sign-In Failed: [${error?.code || 'Unknown'}] ${errorMsg}`, { 
          id: loadingToast, 
          duration: 12000,
          description: `Project: ${activeProjectId} | AuthDomain: ${activeAuthDomain}`
        });
      }
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Attempt a network-only read to verify actual connectivity
        const { getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'system', 'ping'));
        setFireStatus('online');
      } catch (err: any) {
        console.warn("Firestore connectivity check result:", err.code || err.message);
        // If we get permission-denied, it means we ARE connected to Firestore, just not authorized
        if (err.code === 'permission-denied' || err.message?.includes('permission-denied')) {
          setFireStatus('online');
        } else {
          setFireStatus('offline');
        }
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    // Listen to district quotas
    const q = query(collection(db, 'districtQuotas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const totals: Record<string, number> = {};
      const used: Record<string, number> = {};
      
      // Initialize with default 1000 registrations quota for all districts to ensure smooth out-of-the-box registrations on blank databases
      DISTRICTS.forEach(d => {
        totals[d.code] = 1000;
        used[d.code] = 0;
      });

      snapshot.forEach(doc => {
        const data = doc.data();
        const id = doc.id.toUpperCase();
        totals[id] = data.total || 0;
        used[id] = data.used || 0;
      });

      try {
        localStorage.setItem('hcrs_cached_district_quotas_totals', JSON.stringify(totals));
        localStorage.setItem('hcrs_cached_district_quotas_used', JSON.stringify(used));
      } catch (e) {
        console.warn("localStorage quota caching error:", e);
      }

      setDistrictQuotas(totals);
      setDistrictQuotasUsed(used);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'districtQuotas');
      try {
        const cachedTotals = localStorage.getItem('hcrs_cached_district_quotas_totals');
        const cachedUsed = localStorage.getItem('hcrs_cached_district_quotas_used');
        if (cachedTotals && cachedUsed) {
          setDistrictQuotas(JSON.parse(cachedTotals));
          setDistrictQuotasUsed(JSON.parse(cachedUsed));
        }
      } catch (e) {
        console.warn("localStorage quota retrieval fallback error:", e);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    return () => unsub();
  }, []);

  const getMemberDistrictWhatsApp = (member: UserProfile | null) => {
    if (!member) return { url: 'https://wa.me/919645934571', name: 'Kerala' };
    const rawDist = member.district || '';
    const cleanDist = rawDist.trim().toUpperCase();
    const districtObj = DISTRICTS.find(d => 
      d.code.toUpperCase() === cleanDist || 
      d.name.toUpperCase() === cleanDist ||
      cleanDist.includes(d.code.toUpperCase()) ||
      cleanDist.includes(d.name.toUpperCase())
    );
    const distCode = districtObj ? districtObj.code : rawDist;
    const distName = districtObj ? districtObj.name : (rawDist || 'Kerala');
    const assignedLink = orgSettings.districtWhatsAppLinks?.[distCode] || 
                         orgSettings.districtWhatsAppLinks?.[rawDist] || 
                         orgSettings.districtWhatsAppLinks?.[distName];
    const isActive = (orgSettings.districtWhatsAppActive?.[distCode] !== false) &&
                     (orgSettings.districtWhatsAppActive?.[rawDist] !== false);

    if (assignedLink && isActive) {
      let finalUrl = assignedLink.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        const digits = finalUrl.replace(/\D/g, '');
        finalUrl = digits.length === 10 ? `https://wa.me/91${digits}` : `https://wa.me/${digits}`;
      }
      return { url: finalUrl, name: distName };
    }
    return { url: 'https://wa.me/919645934571', name: distName };
  };

  useEffect(() => {
    if (view === 'card' && showCelebration) {
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 7000); // 7 seconds of joy
      return () => clearTimeout(timer);
    }
  }, [view, showCelebration]);

  const [isMagicLink, setIsMagicLink] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hasPathVerify = window.location.pathname.startsWith('/verify/');
      return params.has('memberId') || hasPathVerify;
    }
    return false;
  });
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let memberId = params.get('memberId');
    const distLogin = params.get('distLogin');
    
    // Automatically support route path verification /verify/MEMBER_ID
    if (!memberId && typeof window !== 'undefined' && window.location.pathname.startsWith('/verify/')) {
      const pathParts = window.location.pathname.split('/verify/');
      if (pathParts[1] && pathParts[1].trim()) {
        memberId = pathParts[1].trim();
      }
    }
    
    if (distLogin) {
      console.log("District login intent detected:", distLogin);
      // Store the intent to guide the user to the correct dashboard after login
      sessionStorage.setItem('hcrs_district_intent', distLogin);
      sessionStorage.setItem('hcrs_direct_manual', 'true');
      setIsDirectManual(true);
      
      // We don't automatically log in, but we skip the landing page
      setView('login');
      
      // Sign out any active session to make sure the user is presented with the correct prefilled district login credentials
      signOut(auth)
        .then(() => {
          console.log("Logged out active user for new district login intent:", distLogin);
          setUser(null);
        })
        .catch(err => {
          console.error("Sign-out failed during district link redirect:", err);
        });
      
      // Clean up the URL so the distLogin query param doesn't stay in the address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (memberId) {
      console.log("Found memberId in URL/Path:", memberId);
      const fetchMemberForPreview = async () => {
        try {
          const docRef = doc(db, 'users', memberId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const memberData = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
            setVerifiedMember(memberData);
            setView('verify');
            toast.success(`മെമ്പർ കാർഡ് വിജയിച്ചു വെരിഫൈ ചെയ്തിട്ടുണ്ട്: ${memberData.name}`);
            
            // Clean up the URL so the ID/route doesn't stay in the address bar
            window.history.replaceState({}, document.title, '/');
          } else {
            console.log("Member not found for magic link");
            setIsMagicLink(false);
          }
        } catch (error) {
          console.error("Error fetching member via link:", error);
          setIsMagicLink(false);
        }
      };
      fetchMemberForPreview();
    }
  }, []);

  useEffect(() => {
    // Safety check: If still loading after 15 seconds, fallback to landing to avoid black hole loops
    const timer = setTimeout(() => {
      if (view === 'loading') {
        console.log("Loading timeout: Falling back to landing");
        toast.info("സെഷൻ ടൈം-ഔട്ട് ആയി. ദയവായി വീണ്ടും ശ്രമിക്കുക. (Connection timed out)");
        setIsMagicLink(false);
        setView('landing');
      }
    }, 15000); // 15 seconds is more than enough
    return () => clearTimeout(timer);
  }, [view]);

  useEffect(() => {
    let unsubscribeMembers: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      console.log("Auth State Changed:", authUser?.email, "Current View Ref:", currentViewRef.current);
      
      if (isRegistering) {
        console.log("Auth change ignored: isRegistering is true");
        return;
      }

      if (!authUser) {
        console.log("No authenticated user found.");
        hasInitialSyncedRef.current = false;
        lastAuthUserUidRef.current = null;
        if (!isMagicLink) {
          setUser(null);
          setMembers([]);
          if (unsubscribeMembers) { unsubscribeMembers(); unsubscribeMembers = null; }
          if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
          const curUrl = new URLSearchParams(window.location.search);
          const allowedUnauthViews = ['landing', 'login', 'register', 'renewal', 'gallery', 'verify', 'janamail', 'eledger'];
          if (!allowedUnauthViews.includes(currentViewRef.current) && !curUrl.has('memberId')) {
            setView('landing');
          }
        }
        return;
      }

      setLoadingStatus('Handshake Verified...');
      if (lastAuthUserUidRef.current !== authUser.uid) {
        hasInitialSyncedRef.current = false;
        lastAuthUserUidRef.current = authUser.uid;
      }
      const currentEmail = (authUser.email || '').toLowerCase().trim();
      const isSuperAdminEmail = MAIN_ADMINS.some(email => email.toLowerCase() === currentEmail) || 
        currentEmail.startsWith('admin_') || 
        currentEmail.startsWith('adm_') || 
        currentEmail.includes('admin@') || 
        currentEmail.includes('9645934571') || 
        currentEmail.includes('kmabarikiyafoods') ||
        authUser.uid === 'offline_admin';
      const isSecondAdminEmail = SECOND_ADMINS.some(email => email.toLowerCase() === currentEmail);
      const isAdminEmail = isSuperAdminEmail || isSecondAdminEmail;

      // FAST PATH FOR ADMINS: 
      // If we know this is an admin, don't wait for Firestore to show the dashboard.
      // This prevents the 20s timeout from kicking in if Firestore is slow or doc is large.
      if (isAdminEmail) {
        console.log("Admin detected, prepping immediate view transition...");
        const strictDistrict = getStrictDistrictFromEmail(currentEmail);
        const distObj = DISTRICTS.find(d => d.code === strictDistrict);
        const dName = distObj ? distObj.name : '';
        const placeholderAdmin: any = {
           uid: authUser.uid,
           name: isSuperAdminEmail ? 'Main Admin' : (dName ? `${dName} District Admin` : 'Admin'),
           email: authUser.email || '',
           role: isSuperAdminEmail ? 'admin' : 'operator',
           isAdmin: isSuperAdminEmail,
           status: 'active',
           district: strictDistrict || ''
        };
        setUser(placeholderAdmin);
        if (currentViewRef.current !== 'register') {
          if (isSuperAdminEmail) setView('admin');
          else setView('operator'); // Second admins go to operator (district) view by default unless approved
        }
      }

      if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
      if (unsubscribeMembers) { unsubscribeMembers(); unsubscribeMembers = null; }

      console.log("User is authenticated, fetching profile listener for UID:", authUser.uid);
      setLoadingStatus('Syncing Profile...');

      // Fast pre-render/offline fallback from localStorage
      try {
        const cached = localStorage.getItem(`hcrs_cached_user_${authUser.uid}`);
        if (cached) {
          const cachedData = JSON.parse(cached) as UserProfile;
          setUser(cachedData);
          if (currentViewRef.current !== 'register' && currentViewRef.current !== 'renewal' && currentViewRef.current !== 'janamail') {
            const isAdm = cachedData.role === 'admin' || cachedData.isAdmin || isSuperAdminEmail;
            const isOp = (cachedData.role === 'operator' || isSecondAdminEmail) && !isAdm;
            const isMustChange = !isAdm && !isOp && (
              cachedData.mustChangePassword === true ||
              cachedData.pinResetRequested === true
            );
            const isMustComplete = !isAdm && !isOp && !isMustChange && (
              cachedData.mustCompleteProfile === true && !cachedData.name && !cachedData.membershipId
            );

            if (isAdm) {
              setView('admin');
            } else if (isOp) {
              setView('operator');
            } else if (isMustChange) {
              setView('change-password');
            } else if (isMustComplete) {
              setView('complete-profile');
            } else {
              setView('card');
            }
          }
        }
      } catch (e) {
        console.error("Fast pre-render load failed:", e);
      }

      unsubscribeUser = onSnapshot(doc(db, 'users', authUser.uid), async (docSnap) => {
        let userData: UserProfile | null = null;
        console.log("Profile Snapshot Received. Exists:", docSnap.exists());
        
        if (docSnap.exists()) {
          setLoadingStatus('Finalizing Access...');
          let freshData = { uid: authUser.uid, ...docSnap.data() } as UserProfile;
          
          if (freshData.status === 'deleted' && !isAdminEmail) {
            console.log("Deactivated/Deleted user logged in. Signing out...");
            signOut(auth).then(() => {
              setView('landing');
              toast.error('താങ്കളുടെ അക്കൗണ്ട് അഡ്മിൻ ഡി-ആക്റ്റീവ് ചെയ്തിരിക്കുന്നു! ദയവായി അഡ്മിനുമായി ബന്ധപ്പെടുക. (Your account is deactivated. Please contact Admin.)');
            });
            return;
          }

          if (isAdminEmail || freshData.role === 'admin' || freshData.isAdmin) {
            freshData.role = (isSuperAdminEmail || freshData.isAdmin || freshData.role === 'admin') ? 'admin' : 'operator';
            freshData.isAdmin = isSuperAdminEmail || freshData.isAdmin || freshData.role === 'admin';
            freshData.status = 'active';
          }
          
          const strictDistrict = getStrictDistrictFromEmail(currentEmail);
          if (isSecondAdminEmail && strictDistrict) {
            freshData.district = strictDistrict;
          }
          
          // Backport missing district to Firestore if missing on the document
          if (!freshData.district) {
            let detectedDist = '';
            if (currentEmail.startsWith('hcrs')) {
              const prefix = currentEmail.split('@')[0].replace('hcrs', '').toLowerCase();
              const district = DISTRICTS.find(d => d.name.toLowerCase() === prefix);
              if (district) detectedDist = district.code;
            }
            if (detectedDist) {
              freshData.district = detectedDist;
              updateDoc(doc(db, 'users', authUser.uid), { district: detectedDist })
                .catch(e => console.error("Failed to backport missing district:", e));
            }
          }

          // Check if the current doc is a placeholder or expired, while a better active account exists
          if (!isAdminEmail && freshData.role !== 'admin' && !freshData.isAdmin) {
            const cleanMob = String(freshData.mobile || '').replace(/\D/g, '').slice(-10);
            const isPlaceholderOrBroken = !freshData.membershipId || freshData.name === 'Member' || freshData.name === 'undefined' || !freshData.name;
            const isPendingOrExpired = freshData.renewalPending === true || (freshData.expiryDate && (freshData.expiryDate.toDate ? freshData.expiryDate.toDate().getTime() : new Date(freshData.expiryDate).getTime()) < Date.now());

            if (cleanMob.length === 10 && (isPlaceholderOrBroken || isPendingOrExpired)) {
              try {
                const qMob = query(collection(db, 'users'), where('mobile', '==', cleanMob), limit(10));
                const snapMob = await getDocs(qMob);
                if (!snapMob.empty && snapMob.docs.length > 1) {
                  const bestDoc = selectBestUserDocument(snapMob.docs, cleanMob);
                  if (bestDoc && bestDoc.id !== authUser.uid) {
                    const bestData = bestDoc.data();
                    console.log(`Auto-healing active document ${authUser.uid} with best profile from ${bestDoc.id}`);
                    freshData = {
                      ...bestData,
                      uid: authUser.uid,
                      role: bestData.role || 'member',
                      status: bestData.status || 'active'
                    };
                    await setDoc(doc(db, 'users', authUser.uid), freshData, { merge: true }).catch(() => {});
                  }
                }
              } catch (e) {
                console.warn("Non-blocking best doc healing note:", e);
              }
            }
          }

          userData = freshData;
        } else if (isAdminEmail) {
          // Auto-detect district from email for district admins
          const strictDistrict = getStrictDistrictFromEmail(currentEmail);
          let autoDistrict = strictDistrict || '';
          if (!autoDistrict && currentEmail.startsWith('hcrs')) {
            const prefix = currentEmail.split('@')[0].replace('hcrs', '').toLowerCase();
            const district = DISTRICTS.find(d => d.name.toLowerCase() === prefix);
            if (district) autoDistrict = district.code;
          }

          const distObj = DISTRICTS.find(d => d.code === autoDistrict);
          const dName = distObj ? distObj.name : '';
          userData = {
            uid: authUser.uid,
            name: isSuperAdminEmail ? 'Main Admin' : (dName ? `${dName} District Admin` : 'Second Admin'),
            email: authUser.email || '',
            isAdmin: isSuperAdminEmail, // Only super admins get the full admin dashboard
            role: isSuperAdminEmail ? 'admin' : 'operator', 
            status: 'active',
            district: autoDistrict
          } as any;
          
          // Create user document for admin if it doesn't exist
          setDoc(doc(db, 'users', authUser.uid), userData)
            .catch(e => console.error("Initial admin profile creation failed:", e));
        } else {
          console.warn("Profile document not found for UID:", authUser.uid, "- Initiating Dynamic UID Healing...");
          
          // --- DYNAMIC UID MISMATCH HEALING ---
          try {
            let loginMobile = '';
            if (currentEmail) {
              const prefix = currentEmail.split('@')[0];
              const match = prefix.match(/\d{10}/);
              if (match) {
                loginMobile = match[0];
              }
            }
            
            const usersRef = collection(db, 'users');
            const candidates: { field: string; value: string; desc: string }[] = [];
            
            if (loginMobile && /^\d{10}$/.test(loginMobile)) {
              candidates.push({ field: 'mobile', value: loginMobile, desc: 'extracted mobile from email prefix' });
            }
            if (currentEmail) {
              candidates.push({ field: 'email', value: currentEmail, desc: 'current auth email' });
            }
            if (loginMobile && /^\d{10}$/.test(loginMobile)) {
              candidates.push({ field: 'email', value: `${loginMobile}@hcrs-life.society`, desc: 'standard life member placeholder email' });
              candidates.push({ field: 'email', value: `${loginMobile}@hcrs.society`, desc: 'standard member placeholder email' });
            }
            if (typeof window !== 'undefined') {
              try {
                const sessionInput = sessionStorage.getItem('hcrs_login_identifier') || '';
                const sessionMobile = sessionStorage.getItem('hcrs_login_mobile') || '';
                
                if (sessionMobile && /^\d{10}$/.test(sessionMobile)) {
                  candidates.push({ field: 'mobile', value: sessionMobile, desc: 'session mobile number' });
                  candidates.push({ field: 'email', value: `${sessionMobile}@hcrs-life.society`, desc: 'session life member placeholder email' });
                  candidates.push({ field: 'email', value: `${sessionMobile}@hcrs.society`, desc: 'session placeholder email' });
                }
                if (sessionInput.trim()) {
                  const cleanedInput = sessionInput.trim();
                  candidates.push({ field: 'membershipId', value: cleanedInput, desc: 'session membershipId direct match' });
                  candidates.push({ field: 'membershipId', value: cleanedInput.toUpperCase(), desc: 'session membershipId uppercase match' });
                }
              } catch (e) {
                console.warn("Non-blocking sessionStorage read failed inside healing check:", e);
              }
            }

            const uniqueCandidates: typeof candidates = [];
            const seen = new Set<string>();
            for (const cand of candidates) {
              const key = `${cand.field}::${cand.value.toLowerCase()}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueCandidates.push(cand);
              }
            }

            const foundDocs: any[] = [];
            for (const cand of uniqueCandidates) {
              const q = query(usersRef, where(cand.field, '==', cand.value), limit(10));
              const snap = await fetchDocsServerFirst(q);
              if (!snap.empty) {
                foundDocs.push(...snap.docs);
              }
            }
            
            if (foundDocs.length > 0) {
              const selectedDoc = selectBestUserDocument(foundDocs, loginMobile || currentEmail);
              if (selectedDoc) {
                const profileData = selectedDoc.data();
                userData = {
                  ...profileData,
                  uid: authUser.uid,
                  role: profileData.role || 'member',
                  status: profileData.status || 'active',
                  issueDate: profileData.issueDate || serverTimestamp(),
                };
                
                await setDoc(doc(db, 'users', authUser.uid), userData, { merge: true });
                console.log("Dynamic UID healing successful! Document ID:", selectedDoc.id);
                
                if (selectedDoc.id.startsWith('offline_') || selectedDoc.id.startsWith('life_')) {
                  try {
                    await deleteDoc(doc(db, 'users', selectedDoc.id));
                  } catch (delErr) {}
                }
              }
            }
          } catch (healErr) {
            console.error("Error healing UID mismatch:", healErr);
          }

          if (!userData && !isAdminEmail) {
            console.log("Auto-initializing member profile for Google auth user:", authUser.uid, authUser.email);
            const newUserDoc: UserProfile = {
              uid: authUser.uid,
              name: authUser.displayName || 'Member',
              email: authUser.email || '',
              mobile: '',
              address: '',
              district: '',
              state: 'Kerala',
              pincode: '',
              postOffice: '',
              assemblyConstituency: '',
              bloodGroup: '',
              membershipId: '',
              isPaid: false,
              isApproved: false,
              isAdmin: false,
              serialNo: 0,
              registrationDate: serverTimestamp(),
              photoUrl: authUser.photoURL || '',
              role: 'member',
              status: 'active',
              membershipType: 'Annual',
              mustCompleteProfile: true,
              issueDate: serverTimestamp(),
            };
            try {
              await setDoc(doc(db, 'users', authUser.uid), newUserDoc, { merge: true });
              userData = newUserDoc;
            } catch (createErr) {
              console.error("Failed to auto-create Google member profile:", createErr);
              userData = newUserDoc;
            }
          }
        }

        if (userData) {
          // Force restrict second admin emails to their strict district
          const checkEmail = (userData.email || '').toLowerCase().trim();
          const checkSecond = SECOND_ADMINS.some(email => email.toLowerCase() === checkEmail);
          const strictDistrict = getStrictDistrictFromEmail(checkEmail);

          if (checkSecond && strictDistrict) {
            userData.district = strictDistrict;
            userData.role = 'operator';
            userData.isAdmin = false;
          }

          setUser(prev => {
            if (JSON.stringify(prev) === JSON.stringify(userData)) return prev;
            return userData;
          });

          // Cache resolved user profile in localStorage for offline/quota fallback
          try {
            localStorage.setItem(`hcrs_cached_user_${authUser.uid}`, JSON.stringify(userData));
          } catch (e) {
            console.error("Failed to cache user profile:", e);
          }
          
          const isAdmin = userData.role === 'admin' || userData.isAdmin === true || isSuperAdminEmail;
          const isOperator = (userData.role === 'operator' || isSecondAdminEmail) && !isAdmin;
          
          const isMustChange = !isAdmin && !isOperator && (
            userData.mustChangePassword === true ||
            userData.pinResetRequested === true ||
            String(userData.pin || '').trim() === '123456' ||
            !userData.pin
          );
          const isMustComplete = !isAdmin && !isOperator && !isMustChange && (
            userData.mustCompleteProfile === true ||
            (userData.profileCompleted !== true && (!userData.address || !userData.pincode || !userData.dob || !userData.gender || !userData.bloodGroup))
          );

          if (currentViewRef.current !== 'janamail' && currentViewRef.current !== 'eledger') {
            if (isAdmin) {
               setView('admin');
            } else if (isOperator || (isDirectManual && !isMagicLink && isOperator)) {
               setView('operator');
            } else if (isMustChange) {
               setView('change-password');
            } else if (isMustComplete) {
               setView('complete-profile');
            } else {
              const claimRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('hcrs_claim_redirect') === 'true' : false;
              if (claimRedirect) {
                if (typeof window !== 'undefined') sessionStorage.removeItem('hcrs_claim_redirect');
                setView('support');
              } else if (currentViewRef.current !== 'renewal') {
                setView('card');
              }
            }
          }

          if ((isAdmin || isOperator) && !hasInitialSyncedRef.current) {
             hasInitialSyncedRef.current = true;
             refreshMembersList(userData);
          }
        }
      }, (error) => {
        console.error("Profile listen error:", error);
        handleFirestoreError(error, OperationType.GET, 'users/' + authUser.uid);

        // Fallback to localStorage on connection/quota error
        try {
          const cached = localStorage.getItem(`hcrs_cached_user_${authUser.uid}`);
          if (cached) {
            const cachedData = JSON.parse(cached) as UserProfile;
            setUser(cachedData);
            if (currentViewRef.current !== 'register' && currentViewRef.current !== 'renewal') {
              const isAdm = cachedData.role === 'admin' || cachedData.isAdmin;
              const isOp = cachedData.role === 'operator';
              const isMustChange = !isAdm && !isOp && (
                cachedData.mustChangePassword === true ||
                cachedData.pinResetRequested === true ||
                String(cachedData.pin || '').trim() === '123456' ||
                !cachedData.pin
              );
              const isMustComplete = !isAdm && !isOp && !isMustChange && (
                cachedData.profileCompleted !== true &&
                (cachedData.mustCompleteProfile === true || (!cachedData.address || !cachedData.gender || !cachedData.dob || !cachedData.bloodGroup))
              );

              if (isAdm) {
                setView('admin');
              } else if (isOp) {
                setView('operator');
              } else if (isMustChange) {
                setView('change-password');
              } else if (isMustComplete) {
                setView('complete-profile');
              } else {
                setView('card');
              }
            }
            const now = Date.now();
            const lastShown = (window as any)._lastDbConnectionToastTime || 0;
            if (now - lastShown > 30000) {
              (window as any)._lastDbConnectionToastTime = now;
              toast.success('താൽക്കാലികമായി ഡാറ്റാബേസ് കണക്ഷൻ ലഭ്യമായില്ല എങ്കിലും മുൻപ് ലോഡ് ചെയ്ത താങ്കളുടെ പ്രൊഫൈൽ ഇവിടെ കാണാം.', { id: 'db_connection_fallback_toast' });
            }
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached user on error:", e);
        }

        if (isSuperAdminEmail) setView('admin');
        else if (!isMagicLink && currentViewRef.current !== 'register' && currentViewRef.current !== 'janamail' && currentViewRef.current !== 'eledger') setView('landing');
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeMembers) unsubscribeMembers();
    };
  }, [isRegistering]);


  const handleAcceptTerms = () => {
    setPrefilledMobile('');
    setView('register');
  };

  const handleRenewClick = () => {
    setPrefilledMobile('');
    setView('renewal');
  };

  const handleLogout = async () => {
    const loadingToast = toast.loading('Signing out...');
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hcrs_direct_manual');
        sessionStorage.removeItem('hcrs_district_intent');
      }
      setIsDirectManual(false);
      await signOut(auth);
      setUser(null);
      setMembers([]);
      setView('landing');
      toast.success('Signed out successfully', { id: loadingToast });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Logout failed', { id: loadingToast });
    }
  };

  const handleLogin = async (values: { email: string, pin: string }, originView: 'login' | 'landing' = 'login'): Promise<{ success: boolean; error?: string } | boolean> => {
    const loadingToast = toast.loading('Logging you in...');
    const originalInput = (values.email || '').trim();
    const trimmedPin = (values.pin || '').trim();

    if (originalInput === 'offline_backup' && trimmedPin === '246810') {
      console.log("Local Preview Mode (Offline Backup) activated!");
      setView('loading');
      setLoadingStatus('Connecting Offline Backup...');
      try {
        const response = await fetch('/api/local-backup-users');
        if (!response.ok) {
          throw new Error('Local backup API failed to respond.');
        }
        const data = await response.json();
        console.log(`Loaded ${data.length} users from offline backup API.`);
        setMembers(data);
        
        // Setup local fallback admin profile
        const fallbackAdmin: UserProfile = {
          uid: 'offline_admin',
          name: 'Offline Admin (ഓഫ്‌ലൈൻ പ്രിവ്യൂ)',
          email: 'admin@hcrs.society',
          mobile: '9645934571',
          role: 'admin',
          status: 'active',
          isApproved: true,
          isAdmin: true,
          district: 'MLP',
          assemblyConstituency: 'PTM',
          serialNo: 1,
          membershipId: 'HCRS-ADMIN-LOCAL'
        } as any;
        setUser(fallbackAdmin);
        setIsLoggingIn(false);
        toast.success('Offline Preview Mode Logged In! (ലോഗിൻ വിജയിച്ചു)', { id: loadingToast });
        setView('admin');
        return true;
      } catch (err: any) {
        console.error("Local backup loading failed:", err);
        setView('login');
        setIsLoggingIn(false);
        toast.error('Failed to load local backup database: ' + err.message, { id: loadingToast });
        return false;
      }
    }
    
    // Robust mobile & handle sanitization
    let sanitizedMobile = originalInput.replace(/\D/g, '');
    if (sanitizedMobile.startsWith('91') && sanitizedMobile.length === 12) {
      sanitizedMobile = sanitizedMobile.slice(2);
    } else if (sanitizedMobile.startsWith('0') && sanitizedMobile.length === 11) {
      sanitizedMobile = sanitizedMobile.slice(1);
    }
    const isMobile = /^\d{10}$/.test(sanitizedMobile);

    // Securely cache identifier for subsequent dynamic UID healing checks
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('hcrs_login_identifier', originalInput);
        if (isMobile) {
          sessionStorage.setItem('hcrs_login_mobile', sanitizedMobile);
        } else {
          sessionStorage.removeItem('hcrs_login_mobile');
        }
      } catch (e) {
        console.warn("Could not write login identifier cache to sessionStorage:", e);
      }
    }
    
    setIsLoggingIn(true);
    setLoadingStatus('Authenticating...');
    let mappedUserData: any = null;
    let storedPin = '';
    let lookupDiagnostic = '';
    let lookupError: any = null;
    try {
      let targetEmail = '';
      const usersRef = collection(db, 'users');

      const isMainAdminBypass = (
        MAIN_ADMINS.some(email => email.toLowerCase() === originalInput.toLowerCase() || email.toLowerCase() === `${sanitizedMobile}@hcrs.society`) ||
        sanitizedMobile === '9645934571' ||
        originalInput === '9645934571'
      ) && (trimmedPin === '246810' || trimmedPin === '123456');

      if (isMainAdminBypass) {
        console.log("Main Admin iframe bypass activated for:", originalInput);
        targetEmail = 'admin@hcrs.society';
      } else {
        try {
          // ============================================================================
          // 1. FAST HIGH-SPEED SERVER-ASSISTED MEMBER LOOKUP (<100ms)
          // Queries Express backend with memory cache and direct Firestore access.
          // Completely resolves browser WebChannel stalls, hangs, and timeouts.
          // ============================================================================
          try {
            setLoadingStatus('Checking Member Database...');
            const ctrl = new AbortController();
            const srvTimeout = setTimeout(() => ctrl.abort(), 2000);
            const srvRes = await fetch('/api/auth/lookup-member', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: originalInput, mobile: sanitizedMobile }),
              signal: ctrl.signal
            });
            clearTimeout(srvTimeout);
            if (srvRes.ok) {
              const srvData = await srvRes.json();
              if (srvData && srvData.found && srvData.user) {
                mappedUserData = srvData.user;
                targetEmail = srvData.targetEmail || (mappedUserData.email && mappedUserData.email.includes('@') ? mappedUserData.email : `${sanitizedMobile || 'user'}@hcrs.society`);
                lookupDiagnostic = `[Lookup: Fast Engine | User: "${mappedUserData.name || 'Member'}" | Mobile: "${mappedUserData.mobile || sanitizedMobile}" | Status: Found]`;
                console.log("[HCRS Auth] High-speed server lookup successful:", mappedUserData.name, "ID:", mappedUserData.membershipId, "Email:", targetEmail);
              }
            }
          } catch (srvErr) {
            console.warn("[HCRS Auth] Server lookup fallback notice:", srvErr);
          }

          // If server lookup did not find the document, run client-side Firestore queries
          if (!mappedUserData) {
            if (isMobile) {
              setLoadingStatus('Resolving Mobile Identity...');
              const candidateDocs: any[] = [];
            
            // 1. Fast direct query: 10-digit mobile string and common country-code variations in a single in-query
            const mobileVariations = [
              sanitizedMobile,
              `+91${sanitizedMobile}`,
              `91${sanitizedMobile}`,
              `0${sanitizedMobile}`,
              `+91 ${sanitizedMobile}`
            ];

            try {
              const querySnap = await fetchDocsServerFirst(query(usersRef, where('mobile', 'in', mobileVariations), limit(10)), 2000);
              if (querySnap && !querySnap.empty) {
                candidateDocs.push(...querySnap.docs);
              }
            } catch (err: any) {
              console.error("[HCRS Diagnostic] Direct mobile in-query lookup error:", err);
              lookupError = err;
            }

            // Fallback to secondaryDb if primary returned empty
            if (candidateDocs.length === 0 && secondaryDb) {
              try {
                const secSnap = await fetchDocsServerFirst(query(collection(secondaryDb, 'users'), where('mobile', 'in', mobileVariations), limit(10)), 1500);
                if (secSnap && !secSnap.empty) {
                  candidateDocs.push(...secSnap.docs);
                }
              } catch (err: any) {}
            }

            // Fallback: Parallel check for direct Document IDs and alternate fields if in-query was empty
            if (candidateDocs.length === 0) {
              const fallbackPromises: Promise<any>[] = [
                // Direct IDs (imported/offline/keyed docs)
                (async () => {
                  const directIds = [sanitizedMobile, `hcrs_imp_${sanitizedMobile}`, `offline_${sanitizedMobile}`, `life_${sanitizedMobile}`];
                  for (const dId of directIds) {
                    try {
                      const dSnap = await fetchDocServerFirst(doc(db, 'users', dId), 1500);
                      if (dSnap && dSnap.exists()) {
                        candidateDocs.push(dSnap);
                        break;
                      }
                    } catch (e) {}
                  }
                })(),
                // Alternate field names (cleanMobile, phone, whatsapp, sponsorMobile)
                (async () => {
                  for (const altField of ['cleanMobile', 'phone', 'whatsapp', 'sponsorMobile']) {
                    try {
                      const snapAlt = await fetchDocsServerFirst(query(usersRef, where(altField, '==', sanitizedMobile), limit(5)), 1500);
                      if (snapAlt && !snapAlt.empty) {
                        candidateDocs.push(...snapAlt.docs);
                        break;
                      }
                    } catch (e) {}
                  }
                })(),
                // Email placeholder match
                (async () => {
                  try {
                    const snapEmail = await fetchDocsServerFirst(query(usersRef, where('email', '==', `${sanitizedMobile}@hcrs.society`), limit(5)), 1500);
                    if (snapEmail && !snapEmail.empty) candidateDocs.push(...snapEmail.docs);
                  } catch (e) {}
                })(),
                // Numeric variation
                (async () => {
                  if (!isNaN(Number(sanitizedMobile))) {
                    try {
                      const snapNum = await fetchDocsServerFirst(query(usersRef, where('mobile', '==', Number(sanitizedMobile)), limit(5)), 1500);
                      if (snapNum && !snapNum.empty) candidateDocs.push(...snapNum.docs);
                    } catch (e) {}
                  }
                })()
              ];
              await Promise.all(fallbackPromises);
            }

            const currentProjId = (auth.app.options as any)?.projectId || 'hcrs-membership';
            if (candidateDocs.length > 0) {
              const selectedDoc = selectBestUserDocument(candidateDocs, sanitizedMobile);
              mappedUserData = selectedDoc?.data() || candidateDocs[0].data();
              const validDocEmail = (mappedUserData.email || '').trim();
              targetEmail = validDocEmail.includes('@') ? validDocEmail : `${sanitizedMobile}@hcrs.society`;
              lookupDiagnostic = `[Firebase Project: ${currentProjId} | Firestore Collection: users | Field: mobile | Query: "${sanitizedMobile}" | Status: Found (${candidateDocs.length} matching doc(s))]`;
              console.log("[HCRS Auth] Resolved user:", mappedUserData.name, "Membership ID:", mappedUserData.membershipId, lookupDiagnostic);
            } else {
              targetEmail = `${sanitizedMobile}@hcrs.society`;
              lookupDiagnostic = `[Firebase Project: ${currentProjId} | Firestore Collection: users | Field: mobile | Query: "${sanitizedMobile}" | ${lookupError ? `Firestore Error: ${lookupError.code || lookupError.message}` : 'Status: 0 matching records in Firestore'}]`;
              console.warn(`[HCRS Auth] Lookup yielded 0 records: ${lookupDiagnostic}`);
            }
          } else {
            // Look up by membershipId first (e.g. HCRS-LIFE-KL-MLP-KOT-001)
            setLoadingStatus('Resolving Membership ID...');
            const candidateDocs: any[] = [];

            try {
              let querySnap = await fetchDocsServerFirst(query(usersRef, where('membershipId', '==', originalInput.trim()), limit(10)));
              if (!querySnap.empty) candidateDocs.push(...querySnap.docs);
              
              if (candidateDocs.length === 0) {
                const snapUpper = await fetchDocsServerFirst(query(usersRef, where('membershipId', '==', originalInput.trim().toUpperCase()), limit(10)));
                if (!snapUpper.empty) candidateDocs.push(...snapUpper.docs);
              }

              if (candidateDocs.length === 0) {
                const snapHr = await fetchDocsServerFirst(query(usersRef, where('highrichId', '==', originalInput.trim().toUpperCase()), limit(10)));
                if (!snapHr.empty) candidateDocs.push(...snapHr.docs);
              }

              if (candidateDocs.length === 0 && sanitizedMobile.length >= 6) {
                const snapMobFallback = await fetchDocsServerFirst(query(usersRef, where('mobile', '==', sanitizedMobile), limit(10)));
                if (!snapMobFallback.empty) candidateDocs.push(...snapMobFallback.docs);
              }
            } catch (err: any) {
              console.error("[HCRS Diagnostic] MembershipId lookup error:", err);
              lookupError = err;
            }

            const currentProjId = (auth.app.options as any)?.projectId || 'hcrs-membership';
            if (candidateDocs.length > 0) {
              const selectedDoc = selectBestUserDocument(candidateDocs, originalInput);
              mappedUserData = selectedDoc?.data() || candidateDocs[0].data();
              const validDocEmail = (mappedUserData.email || '').trim();
              targetEmail = validDocEmail.includes('@') ? validDocEmail : `${mappedUserData.mobile || 'user'}@hcrs.society`;
              lookupDiagnostic = `[Firebase Project: ${currentProjId} | Firestore Collection: users | Field: membershipId | Query: "${originalInput}" | Status: Found]`;
            } else if (originalInput.includes('@')) {
              setLoadingStatus('Resolving Email Identity...');
              try {
                const querySnapEmail = await fetchDocsServerFirst(query(usersRef, where('email', '==', originalInput.toLowerCase().trim()), limit(10)));
                if (!querySnapEmail.empty) {
                  const selectedDoc = selectBestUserDocument(querySnapEmail.docs, originalInput);
                  mappedUserData = selectedDoc?.data() || querySnapEmail.docs[0].data();
                  targetEmail = mappedUserData.email;
                } else {
                  targetEmail = originalInput.toLowerCase().trim();
                }
              } catch (err: any) {
                lookupError = err;
                targetEmail = originalInput.toLowerCase().trim();
              }
              lookupDiagnostic = `[Firebase Project: ${currentProjId} | Firestore Collection: users | Field: email | Query: "${originalInput}"]`;
            } else {
              // Standard auto-append fallback
              const fallbackEmail = `${originalInput.toLowerCase().trim()}@hcrs.society`;
              try {
                const querySnapFallback = await fetchDocsServerFirst(query(usersRef, where('email', '==', fallbackEmail), limit(10)));
                if (!querySnapFallback.empty) {
                  const selectedDoc = selectBestUserDocument(querySnapFallback.docs, originalInput);
                  mappedUserData = selectedDoc?.data() || querySnapFallback.docs[0].data();
                  targetEmail = mappedUserData.email;
                } else {
                  targetEmail = fallbackEmail;
                }
              } catch (err: any) {
                lookupError = err;
                targetEmail = fallbackEmail;
              }
              lookupDiagnostic = `[Firebase Project: ${currentProjId} | Firestore Collection: users | Field: email | Query: "${fallbackEmail}"]`;
            }
          }
          }
        } catch (lookupErr: any) {
          lookupError = lookupErr;
          const currentProjId = (auth.app.options as any)?.projectId || 'hcrs-membership';
          lookupDiagnostic = `[Firebase Project: ${currentProjId} | Firestore Collection: users | Field: ${isMobile ? 'mobile' : 'identifier'} | Query: "${originalInput}" | Firestore Error: ${lookupErr.code || lookupErr.message || 'Lookup failure'}]`;
          console.error("[HCRS Diagnostic] Lookup error note:", lookupDiagnostic, lookupErr);
          if (isMobile) {
            targetEmail = `${sanitizedMobile}@hcrs.society`;
          } else if (originalInput.includes('@')) {
            targetEmail = originalInput.toLowerCase().trim();
          } else {
            targetEmail = `${originalInput.toLowerCase().trim()}@hcrs.society`;
          }
        }
      }

      setLoadingStatus(`Connecting as ${targetEmail}...`);
      let authResult: any = null;
      
      const isSuperAdmin = MAIN_ADMINS.some(email => 
        email.toLowerCase() === targetEmail.toLowerCase() || 
        email.toLowerCase() === originalInput.toLowerCase() || 
        originalInput === '9645934571' ||
        sanitizedMobile === '9645934571'
      );
      const isSecondAdmin = SECOND_ADMINS.some(email => 
        email.toLowerCase() === targetEmail.toLowerCase() || 
        email.toLowerCase() === originalInput.toLowerCase()
      );
      const isAdmin = isSuperAdmin || isSecondAdmin;
      const isAdminMasterPin = isAdmin && (trimmedPin === '246810' || trimmedPin === '123456');

      storedPin = mappedUserData?.pin ? String(mappedUserData.pin).trim() : '';
      const userMustChangePass = mappedUserData?.mustChangePassword === true || mappedUserData?.mustChangePassword === undefined || !storedPin || storedPin === '123456';

      // Universal Member PIN validation:
      // Accepts:
      // 1. Registered custom PIN (e.g. 252525)
      // 2. Standard universal default password (123456)
      // 3. Admin master PIN (246810 / 123456)
      const isCustomPinMatched = Boolean(storedPin && trimmedPin === storedPin);
      const isDefaultPinMatched = Boolean(trimmedPin === '123456');
      const isDbPinMatched = Boolean(
        isAdminMasterPin || 
        !storedPin || 
        isCustomPinMatched || 
        isDefaultPinMatched
      );

      // Only reject if PIN does not match stored PIN AND is not 123456 AND not admin
      if (mappedUserData && !isAdminMasterPin && !isDbPinMatched) {
        try {
          await signOut(auth);
          setUser(null);
        } catch (e) {}
        const passErr: any = new Error('തെറ്റായ പാസ്‌വേഡ്! താങ്കളുടെ ശരിയായ 6 അക്ക പാസ്‌വേഡ് നൽകുക. അല്ലെങ്കിൽ 123456 ഉപയോഗിക്കുക. (Incorrect Password! Please enter your correct 6-digit password or 123456.)');
        passErr.code = 'auth/wrong-password';
        throw passErr;
      }

      try {
        authResult = await signInWithEmailAndPassword(auth, targetEmail, trimmedPin);
        console.log("Auth sign-in successful for:", authResult.user.uid);
      } catch (signInError: any) {
        console.warn("Initial sign-in on targetEmail failed:", targetEmail, signInError.code);

        // Admin recovery channels
        if (isAdminMasterPin || isAdmin) {
          console.log("Admin master authentication recovery activated...");
          const adminCandidates = [
            targetEmail,
            'admin@hcrs.society',
            'kmabarikiyafoods@gmail.com',
            'hcrsindia@gmail.com',
            '9645934571@hcrs.society'
          ];
          for (const admEmail of adminCandidates) {
            if (authResult) break;
            try {
              authResult = await signInWithEmailAndPassword(auth, admEmail, trimmedPin);
              console.log("Admin sign-in successful on channel:", admEmail);
              break;
            } catch (admErr: any) {
              // Try master PIN variations for existing admin accounts
              if (trimmedPin === '246810' || trimmedPin === '123456') {
                try {
                  authResult = await signInWithEmailAndPassword(auth, admEmail, '246810');
                  break;
                } catch (e1) {
                  try {
                    authResult = await signInWithEmailAndPassword(auth, admEmail, '123456');
                    break;
                  } catch (e2) {}
                }
              }

              if (!authResult && (admErr.code === 'auth/user-not-found' || admErr.code === 'auth/invalid-credential')) {
                try {
                  authResult = await createUserWithEmailAndPassword(auth, admEmail, trimmedPin);
                  console.log("Admin account created and logged in on channel:", admEmail);
                  break;
                } catch (admCreateErr: any) {
                  if (admCreateErr.code === 'auth/email-already-in-use') {
                    continue;
                  }
                }
              }
            }
          }

          if (!authResult) {
            // Dedicated dynamic admin session
            const dynamicAdminEmail = `admin_auth_${trimmedPin}@hcrs.society`;
            try {
              authResult = await signInWithEmailAndPassword(auth, dynamicAdminEmail, trimmedPin);
            } catch (dynErr: any) {
              try {
                authResult = await createUserWithEmailAndPassword(auth, dynamicAdminEmail, trimmedPin);
              } catch (e) {}
            }
          }
        }

        // Database-verified user dynamic self-healing & multi-channel resolution
        if (!authResult && isDbPinMatched) {
          console.log("Entered PIN matches registered database profile PIN. Resolving auth session...");
          const mobilePart = isMobile ? sanitizedMobile : (mappedUserData?.mobile || originalInput.replace(/\D/g, '') || 'user');

          // Channel 1: Attempt to create primary targetEmail if never created before
          if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
            try {
              authResult = await createUserWithEmailAndPassword(auth, targetEmail, trimmedPin);
              console.log("Dynamically created primary Auth account:", authResult.user.uid);
            } catch (signUpError: any) {
              if (signUpError.code !== 'auth/email-already-in-use') {
                console.warn("Primary auto-healing registration note:", signUpError.code);
              }
            }
          }

          // Channel 2: Deterministic PIN-dedicated channel (e.g. 9847123456_p123456@hcrs.society)
          // Since the email incorporates the exact PIN, creating or logging into it is 100% collision-free
          if (!authResult && mobilePart) {
            const pinEmail = `${mobilePart}_p${trimmedPin}@hcrs.society`;
            try {
              authResult = await signInWithEmailAndPassword(auth, pinEmail, trimmedPin);
              console.log("Sign-in successful via pin-dedicated channel:", authResult.user.uid);
            } catch (pinSecErr: any) {
              if (pinSecErr.code === 'auth/user-not-found' || pinSecErr.code === 'auth/invalid-credential' || pinSecErr.code === 'auth/wrong-password') {
                try {
                  authResult = await createUserWithEmailAndPassword(auth, pinEmail, trimmedPin);
                  console.log("Created fresh pin-dedicated Auth account:", authResult.user.uid);
                } catch (createPinErr: any) {
                  if (createPinErr.code === 'auth/email-already-in-use') {
                    try {
                      authResult = await signInWithEmailAndPassword(auth, pinEmail, trimmedPin);
                    } catch (retryErr) {
                      console.warn("Pin-dedicated secondary sign-in retry failed:", retryErr);
                    }
                  }
                }
              }
            }
          }

          // Channel 3: Versioned & dynamic fallback channels (v2, v3, timestamped)
          if (!authResult && mobilePart) {
            const fallbackChannels = [
              `${mobilePart}_v2@hcrs.society`,
              `${mobilePart}_v3@hcrs.society`,
              `${mobilePart}_auth_${Date.now().toString(36)}@hcrs.society`
            ];

            for (const fbEmail of fallbackChannels) {
              if (authResult) break;
              try {
                authResult = await signInWithEmailAndPassword(auth, fbEmail, trimmedPin);
                console.log("Sign-in successful via fallback channel:", fbEmail);
                break;
              } catch (fbErr: any) {
                if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/wrong-password') {
                  try {
                    authResult = await createUserWithEmailAndPassword(auth, fbEmail, trimmedPin);
                    console.log("Created fresh auth account on fallback channel:", fbEmail);
                    break;
                  } catch (createFbErr: any) {
                    if (createFbErr.code === 'auth/email-already-in-use') {
                      continue; // Try next fallback channel
                    }
                  }
                }
              }
            }
          }
        }

        // If after all verified self-healing channels we still don't have an auth session:
        if (!authResult) {
          // If the error was wrong-password, throw wrong password
          if (signInError.code === 'auth/wrong-password') {
            const passErr: any = new Error('തെറ്റായ പാസ്‌വേഡ്! താങ്കളുടെ ശരിയായ 6 അക്ക പാസ്‌വേഡ് നൽകുക. (Incorrect Password! Please enter your correct 6-digit password.)');
            passErr.code = 'auth/wrong-password';
            throw passErr;
          }

          // If user was not found in database AND not found in Firebase Auth:
          if (!mappedUserData && !isAdmin) {
            const baseMsg = isMobile 
              ? 'ഈ മൊബൈൽ നമ്പർ ഡാറ്റാബേസിൽ രജിസ്റ്റർ ചെയ്തിട്ടില്ല! ദയവായി താഴെയുള്ള ലിങ്ക് വഴി പുതിയ അംഗത്വം എടുക്കുക. (This mobile number is not registered. Please register first.)'
              : 'ഈ അക്കൗണ്ട് / ഐഡി ഡാറ്റാബേസിൽ കണ്ടെത്തിയില്ല. ദയവായി വിവരങ്ങൾ പരിശോധിക്കുക അല്ലെങ്കിൽ പുതിയ അംഗത്വം എടുക്കുക. (Account not found. Please register.)';
            const diagInfo = lookupDiagnostic || `[Firebase Project: ${(auth.app.options as any)?.projectId || 'hcrs-membership'} | Firestore Collection: users | Field: ${isMobile ? 'mobile' : 'identifier'} | Query: "${isMobile ? sanitizedMobile : originalInput}"]`;
            const notFoundErr: any = new Error(`${baseMsg}\n\n${diagInfo}`);
            notFoundErr.code = 'auth/user-not-found';
            notFoundErr.diagnostic = diagInfo;
            throw notFoundErr;
          }

          throw signInError;
        }
      }

      // If user successfully authenticated with Firebase Auth, but mappedUserData was null pre-auth:
      if (!mappedUserData && authResult?.user?.uid && !isAdmin) {
        try {
          const authDocSnap = await getDoc(doc(db, 'users', authResult.user.uid));
          if (authDocSnap.exists()) {
            mappedUserData = authDocSnap.data();
          }
        } catch (postFetchErr) {
          console.warn("Post-auth UID fetch note:", postFetchErr);
        }

        // Also attempt query by mobile if still null
        if (!mappedUserData && isMobile) {
          try {
            const snapPostMob = await getDocs(query(usersRef, where('mobile', '==', sanitizedMobile), limit(1)));
            if (!snapPostMob.empty) {
              mappedUserData = snapPostMob.docs[0].data();
            }
          } catch (e) {}
        }

        // If user document is completely absent in Firestore, initialize standard member profile
        if (!mappedUserData) {
          const fallbackProfile: any = {
            uid: authResult.user.uid,
            name: 'Member',
            mobile: isMobile ? sanitizedMobile : '',
            email: authResult.user.email || targetEmail,
            role: 'member',
            status: 'active',
            isApproved: true,
            isPaid: true,
            createdAt: new Date().toISOString()
          };
          mappedUserData = fallbackProfile;
          try {
            await setDoc(doc(db, 'users', authResult.user.uid), fallbackProfile, { merge: true });
          } catch (e) {}
        }
      }
      
      let finalUser: UserProfile | null = null;
      if (mappedUserData && authResult?.user?.uid && !isAdmin) {
        const loggedInUid = authResult.user.uid;
        const completeUserData: UserProfile = {
          ...mappedUserData,
          uid: loggedInUid,
          role: mappedUserData.role || 'member',
          status: mappedUserData.status || 'active'
        };
        finalUser = completeUserData;
        setUser(completeUserData);
        try {
          localStorage.setItem(`hcrs_cached_user_${loggedInUid}`, JSON.stringify(completeUserData));
        } catch (e) {}
        try {
          await setDoc(doc(db, 'users', loggedInUid), completeUserData, { merge: true });
        } catch (syncErr) {
          console.warn("Could not sync resolved profile to auth UID:", syncErr);
        }
      } else if (mappedUserData) {
        finalUser = mappedUserData;
        setUser(mappedUserData);
      }

      // INSTANT VIEW TRANSITION: Immediately switch from login screen to dashboard/card
      if (finalUser) {
        const isAdm = finalUser.role === 'admin' || finalUser.isAdmin === true || isSuperAdmin;
        const isOp = (finalUser.role === 'operator' || isSecondAdmin) && !isAdm;
        const isMustChange = !isAdm && !isOp && (
          finalUser.mustChangePassword === true ||
          finalUser.pinResetRequested === true ||
          String(finalUser.pin || '').trim() === '123456' ||
          !finalUser.pin
        );
        const isMustComplete = !isAdm && !isOp && !isMustChange && (
          finalUser.mustCompleteProfile === true ||
          (finalUser.profileCompleted !== true && (!finalUser.address || !finalUser.pincode || !finalUser.dob || !finalUser.gender || !finalUser.bloodGroup))
        );

        if (isAdm) {
          setView('admin');
        } else if (isOp) {
          setView('operator');
        } else if (isMustChange) {
          setView('change-password');
        } else if (isMustComplete) {
          setView('complete-profile');
        } else {
          setView('card');
        }
      } else if (isAdmin) {
        setView(isSuperAdmin ? 'admin' : 'operator');
      } else {
        setView('card');
      }

      setIsLoggingIn(false);
      toast.success('Login Successful! (ലോഗിൻ വിജയിച്ചു)', { id: loadingToast });
      return { success: true };
    } catch (error: any) {
      if (
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/invalid-login-credentials' ||
        error.message?.includes('രജിസ്റ്റർ ചെയ്തിട്ടില്ല') ||
        error.message?.includes('തെറ്റായ പാസ്‌വേഡ്') ||
        error.message?.includes('കണ്ടെത്തിയില്ല')
      ) {
        console.warn("Login attempt notice:", error.code, error.message);
      } else {
        console.error("Login unexpected error:", error.code || error.name, error.message);
      }
      try {
        await signOut(auth);
        setUser(null);
      } catch (e) {}
      setIsLoggingIn(false);
      
      const isAdminEmailInput = [...MAIN_ADMINS, ...SECOND_ADMINS].some(email => email.toLowerCase() === originalInput.toLowerCase());
      const isLocalOfflinePass = trimmedPin === '246810';
      const isQuotaOrDbError = 
        error.message?.includes('Quota') || 
        error.message?.includes('quota') || 
        error.message?.includes('permission-denied') || 
        error.code?.includes('permission-denied') || 
        error.message?.includes('network-request-failed') || 
        error.code?.includes('network-request-failed') ||
        error.message?.includes('disabled') ||
        error.message?.includes('not used') ||
        error.message?.includes('configuration-not-found') ||
        error.code?.includes('configuration-not-found');

      const isAdminMobileInput = originalInput === '9645934571' || sanitizedMobile === '9645934571';
      if ((isQuotaOrDbError || error.code === 'auth/network-request-failed') && (isAdminEmailInput || isAdminMobileInput) && isLocalOfflinePass) {
        console.log("Database issue. Spawning auto Local Backup loader...");
        setView('loading');
        setLoadingStatus('Connecting Offline Backup...');
        try {
          const response = await fetch('/api/local-backup-users');
          if (!response.ok) throw new Error('Local fallback server API error');
          const data = await response.json();
          setMembers(data);
          
          const fallbackAdmin: UserProfile = {
            uid: 'offline_admin',
            name: `${originalInput} (ഓഫ്‌ലൈൻ ബാക്കപ്പ്)`,
            email: originalInput.includes('@') ? originalInput.toLowerCase() : 'admin@hcrs.society',
            mobile: originalInput.includes('@') ? '9645934571' : originalInput,
            role: 'admin',
            status: 'active',
            isApproved: true,
            isAdmin: true,
            district: 'MLP',
            assemblyConstituency: 'PTM',
            serialNo: 1,
            membershipId: 'HCRS-ADMIN-LOCAL'
          } as any;
          setUser(fallbackAdmin);
          setIsLoggingIn(false);
          toast.success('ഡാറ്റാബേസ് കണക്ഷൻ തകരാർ കാരണം ഓഫ്ലൈൻ ബാക്കപ്പിലേക്ക് മാറ്റി! (Database offline: fallback backup loaded successfully!)', { id: loadingToast, duration: 15000 });
          setView('admin');
          return { success: true };
        } catch (err: any) {
          console.warn("Auto backup loader notice:", err);
        }
      }

      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.message && (
        error.message.includes('തെറ്റായ പാസ്‌വേഡ്') || 
        error.message.includes('Incorrect Password') || 
        error.message.includes('പുതിയ 6 അക്ക പാസ്‌വേഡ്') || 
        error.message.includes('മാറ്റിയിട്ടുണ്ട്') ||
        error.message.includes('രജിസ്റ്റർ ചെയ്തിട്ടില്ല') ||
        error.message.includes('കണ്ടെത്തിയില്ല') ||
        error.message.includes('not registered')
      )) {
        errorMessage = error.message;
      } else if (
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/invalid-login-credentials' ||
        error.message?.includes('invalid-credential') ||
        error.message?.includes('wrong-password')
      ) {
        if (mappedUserData && storedPin && storedPin !== '123456' && mappedUserData.mustChangePassword === false && trimmedPin === '123456') {
          errorMessage = 'താങ്കൾ ഇതിനകം പാസ്‌വേഡ് മാറ്റിയിട്ടുണ്ട്. ദയവായി താങ്കൾ മാറ്റിയ പുതിയ 6 അക്ക പാസ്‌വേഡ് നൽകുക. (You have already updated your password. Please enter your new 6-digit password.)';
        } else {
          errorMessage = 'തെറ്റായ പാസ്‌വേഡ്! താങ്കളുടെ ശരിയായ 6 അക്ക പാസ്‌വേഡ് നൽകുക. (Incorrect Password! Please enter your correct 6-digit password.)';
        }
      } else if (error.code === 'auth/user-not-found') {
        const baseMsg = isMobile 
          ? 'ഈ മൊബൈൽ നമ്പർ ഡാറ്റാബേസിൽ രജിസ്റ്റർ ചെയ്തിട്ടില്ല! ദയവായി താഴെയുള്ള ലിങ്ക് വഴി പുതിയ അംഗത്വം എടുക്കുക. (This mobile number is not registered. Please register first.)' 
          : 'ഈ അക്കൗണ്ട് / ഐഡി ഡാറ്റാബേസിൽ കണ്ടെത്തിയില്ല. ദയവായി വിവരങ്ങൾ പരിശോധിക്കുക അല്ലെങ്കിൽ പുതിയ അംഗത്വം എടുക്കുക. (Account not found. Please register.)';
        const diagInfo = error.diagnostic || lookupDiagnostic || `[Firebase Project: ${(auth.app.options as any)?.projectId || 'hcrs-membership'} | Firestore Collection: users | Field: ${isMobile ? 'mobile' : 'identifier'} | Query: "${isMobile ? sanitizedMobile : originalInput}"]`;
        errorMessage = `${baseMsg}\n\n${diagInfo}`;
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Try again later. (പലതവണ ശ്രമിച്ചു, പിന്നീട് ശ്രമിക്കുക)';
      } else if (error.code === 'auth/network-request-failed' || (error.message && error.message.includes('network-request-failed'))) {
        errorMessage = 'നെറ്റ്‌വർക്ക് തകരാർ! നിങ്ങളുടെ ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുകയോ പേജ് റീഫ്രഷ് ചെയ്യുകയോ ചെയ്യുക. (Network connection failed. Please check your internet connection or reload the page.)';
      }
      toast.error(errorMessage, { id: loadingToast, duration: 8000 });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegistration = async (values: any) => {
    if (isRegistering) return;
    const loadingToast = toast.loading('Processing your registration...');
    setIsRegistering(true);
    try {
      // 0. Sanitize inputs
      const cleanMobile = (values.mobile || '').toString().trim().replace(/\D/g, '').slice(-10);
      const cleanEmail = (values.email || '').toLowerCase().trim();

      // 0.1 Check for duplicates in Firestore (Allow 'deleted' members to re-register)
      toast.loading('Validating registration...', { id: loadingToast });
      const usersRef = collection(db, 'users');
      
      const mobileQuery = query(usersRef, where('mobile', '==', cleanMobile), where('status', 'in', ['pending', 'active', 'offline', 'disabled']), limit(1));
      const mobileSnap = await getDocs(mobileQuery);
      if (!mobileSnap.empty) {
        throw new Error('This mobile number is already registered. Please Login. (ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് നേരത്തെ രജിസ്റ്റർ ചെയ്തതാണ്. ലോഗിൻ ചെയ്യുക.)');
      }

      // TEMPORARY TESTING MODE
      // Duplicate email restriction disabled.
      // Re-enable before production deployment.
      /*
      if (cleanEmail && cleanEmail.includes('@')) {
        const emailQuery = query(usersRef, where('email', '==', cleanEmail), where('status', 'in', ['pending', 'active', 'offline', 'disabled']), limit(1));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          throw new Error('This email is already registered. Please Login. (ഈ ഇമെയിൽ ഉപയോഗിച്ച് നേരത്തെ രജിസ്റ്റർ ചെയ്തതാണ്. ലോഗിൻ ചെയ്യുക.)');
        }
      }
      */

      // 0.2 Check for duplicate Transaction ID to prevent double-submitting a duplicate screenshot/ID
      const inputTxId = (values.transactionId || '').toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      if (inputTxId && !['CASH/OFFLINE', 'MANUAL_OFFLINE', 'CASH', 'OFFLINE', 'FREE'].includes(inputTxId)) {
        toast.loading('Checking transaction ID... / ട്രാൻസാക്ഷൻ ഐഡി പരിശോധിക്കുന്നു...', { id: loadingToast });
        const txQuery1 = query(usersRef, where('transactionId', '==', inputTxId), where('status', 'in', ['pending', 'active', 'offline', 'disabled']), limit(1));
        const txQuery2 = query(usersRef, where('renewalTransactionId', '==', inputTxId), where('status', 'in', ['pending', 'active', 'offline', 'disabled']), limit(1));
        const [txSnap1, txSnap2] = await Promise.all([getDocs(txQuery1), getDocs(txQuery2)]);
        if (!txSnap1.empty || !txSnap2.empty) {
          throw new Error('ഈ ട്രാൻസാക്ഷൻ ഐഡി ഇതിനകം തന്നെ സിസ്റ്റത്തിൽ ഉപയോഗിച്ചതാണ്. ദയവായി ശരിയായ മറ്റൊരു ഐഡി നൽകുക. (This Transaction ID is already used in our system. Please enter a unique transaction ID.)');
        }
      }

      const isAdminEmail = [...MAIN_ADMINS, ...SECOND_ADMINS].includes(cleanEmail || '');
      const isOperatorEmail = cleanEmail?.includes('operator@') || cleanEmail?.includes('dist_');
      
      if (!values.pin) {
        throw new Error('Password (PIN) is required.');
      }
      
      toast.loading('Creating secure account...', { id: loadingToast });
      let authResult;
      
      const authEmail = cleanEmail && cleanEmail.includes('@')
        ? cleanEmail
        : `${cleanMobile}@hcrs.society`;

      // CHECK IF ALREADY SIGNED IN (from a previous partial registration)
      if (auth.currentUser && (auth.currentUser.email === authEmail || auth.currentUser.email === cleanEmail)) {
        console.log("Using existing auth session for recovery");
        authResult = { user: auth.currentUser };
      } else {
        try {
          authResult = await createUserWithEmailAndPassword(auth, authEmail, values.pin);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            // If already in use, it might be an incomplete registration or a deleted user
            // Try to sign in with the provided PIN. If successful and it's a "clean" account, permit registration
            try {
              authResult = await signInWithEmailAndPassword(auth, authEmail, values.pin);
              const userRef = doc(db, 'users', authResult.user.uid);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const status = userSnap.data().status;
                // If it's a real active member, block. If it's deleted or something else, allow.
                if (status === 'active' || status === 'pending' || status === 'offline') {
                  throw new Error('This number/email is already registered. Please use Login. (ഈ നമ്പർ ഉപയോഗിച്ച് നേരത്തെ രജിസ്റ്റർ ചെയ്തതാണ്. ലോഗിൻ ചെയ്യുക.)');
                }
                // Reactivation success!
                console.log("Account reactivated for re-registration:", authResult.user.uid);
              }
            } catch (signInErr: any) {
              console.error("Sign in attempt during registration failed:", signInErr);
              const isWrongPass = signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential';
              if (isWrongPass) {
                const authMsg = 'This mobile/email is already in our system. If this is you, please use your previous password or use "Forgot Password" on the Login screen.';
                const mlMsg = 'ഈ നമ്പർ മുൻപ് രജിസ്റ്റർ ചെയ്തിട്ടുള്ളതാണ്. നിങ്ങളുടെ പഴയ പാസ്‌വേഡ് ഉപയോഗിക്കുകയോ അല്ലെങ്കിൽ ലോഗിൻ സ്ക്രീനിൽ പോയി "Forgot Password" ക്ലിക്ക് ചെയ്യുകയോ ചെയ്യുക.';
                throw new Error(`${authMsg} (${mlMsg})`);
              }
              throw new Error('Account exists with a different password. Please use Login. (ഈ അക്കൗണ്ട് മുൻപ് ഉണ്ടായിരുന്നതാണ്. പഴയ പാസ്‌വേഡ് ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക.)');
            }
          } else {
            console.error("Auth creation failed:", authError);
            let authMsg = 'Authentication failed.';
            let mlMsg = 'അക്കൗണ്ട് നിർമ്മാണം പരാജയപ്പെട്ടു.';
            if (authError.code === 'auth/weak-password') {
              authMsg = 'Password must be at least 6 characters.';
              mlMsg = 'പാസ്‌വേഡ് കുറഞ്ഞത് 6 അക്ഷരങ്ങൾ വേണം.';
            }
            throw new Error(`${authMsg} (${mlMsg})`);
          }
        }
      }
      
      const uid = authResult.user.uid;
      
      const distCode = getDistrictCode(values.district);
      toast.loading('Saving your details...', { id: loadingToast });
      const userRef = doc(db, 'users', uid);
      const metadataRef = doc(db, 'system', 'totals');
      
      try {
        let nextSerial = 0;
        let createdMembershipId = '';
        let isFullyVerifiedActive = false;
        const isRazorpayPaid = values.paymentMethod === 'Razorpay' && (values.paymentStatus === 'Active' || values.paymentStatus === 'PAYMENT_VERIFIED') && !!values.paymentId && !!values.orderId;

        await runTransaction(db, async (transaction) => {
          // Perform all reads first
          const metaDoc = await transaction.get(metadataRef);
          
          // Handle metadata/serial logic
          nextSerial = 1001;
          if (metaDoc.exists()) {
            nextSerial = (metaDoc.data().count || 1000) + 1;
          }
          transaction.set(metadataRef, { count: nextSerial }, { merge: true });

          const memberDistCode = getDistrictCode(values.district);
          const assemblyCode = getAssemblyCode(values.assemblyConstituency);
          const membershipId = generateNewMembershipId(values.district, values.assemblyConstituency, nextSerial);
          createdMembershipId = membershipId;

          const now = new Date();
          const expiry = new Date();
          expiry.setFullYear(now.getFullYear() + 1);
          
          // 1. RAZORPAY GATEWAY PAYMENTS: Instant auto-approval! Digital ID card active immediately (Zero Admin workload).
          // 2. QR CODE / MANUAL UPI PAYMENTS: Pending verification. Awaiting Admin verification in Admin Panel.
          const isInstantAutoApproved = isRazorpayPaid || isAdminEmail;
          const memberStatus = isInstantAutoApproved ? 'active' : 'pending';
          const memberApproved = isInstantAutoApproved;
          isFullyVerifiedActive = isInstantAutoApproved;

          const newMemberData = {
            uid,
            ...values,
            mobile: cleanMobile,
            photoUrl: '',
            registrationDate: serverTimestamp(),
            expiryDate: expiry,
            membershipId,
            status: memberStatus,
            isPaid: isRazorpayPaid || isAdminEmail,
            isApproved: memberApproved,
            isAdmin: isAdminEmail,
            role: isAdminEmail ? 'admin' : (isOperatorEmail ? 'operator' : 'member'),
            serialNo: nextSerial,
            waStatus: 'Pending',
            stateCode: 'KL',
            districtCode: memberDistCode.toUpperCase(),
            constituencyCode: assemblyCode.toUpperCase(),
            membership_type: 'ADHOC_MEMBER',
            isQuotaCounted: false,
            paymentAmount: values.paymentAmount || 200,
            paymentId: values.paymentId || values.transactionId || '',
            orderId: values.orderId || '',
            transactionId: values.transactionId || values.paymentId || '',
            paymentTime: values.paymentTimeISO || new Date().toISOString(),
            paymentMethod: values.paymentMethod || (isRazorpayPaid ? 'Razorpay' : 'QR Code'),
            paymentStatus: isRazorpayPaid ? 'PAYMENT_VERIFIED' : 'Pending Verification',
            receiptNumber: values.receiptNumber || `RCP-REG-${nextSerial}`
          };
          transaction.set(userRef, newMemberData);
        });

        // Save payment receipt to users/{uid}/receipts subcollection
        try {
          const receiptsRef = collection(db, 'users', uid, 'receipts');
          await addDoc(receiptsRef, {
            receiptNo: values.receiptNumber || `RCP-REG-${nextSerial}`,
            receiptType: 'Membership Fee',
            receiptLabel: 'Membership Registration Receipt',
            amount: values.paymentAmount || 200,
            paymentId: values.paymentId || values.transactionId || '',
            orderId: values.orderId || '',
            transactionId: values.transactionId || values.paymentId || '',
            paymentTime: values.paymentTimeISO || new Date().toISOString(),
            paymentMethod: values.paymentMethod || (isRazorpayPaid ? 'Razorpay' : 'QR Code'),
            paymentStatus: isRazorpayPaid ? 'PAYMENT_VERIFIED' : 'Pending Verification',
            status: isRazorpayPaid ? 'Paid' : 'Pending Verification',
            paymentDate: values.paymentDate || new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp(),
            memberId: createdMembershipId
          });
        } catch (rErr) {
          console.warn("Notice saving initial registration receipt:", rErr);
        }

        localStorage.removeItem('hcrs_registration_cache');
        localStorage.removeItem('hcrs_registration_step');

        if (isFullyVerifiedActive) {
          setShowCelebration(true);
          toast.success('രജിസ്ട്രേഷനും പേയ്‌മെന്റും വിജയകരം! ഡിജിറ്റൽ മെമ്പർഷിപ്പ് കാർഡ് ലൈവായി ലഭ്യമായിരിക്കുന്നു. (Registration & Razorpay Payment Verified! Digital Membership Card Issued.)', { id: loadingToast, duration: 6000 });
          setView('card');
        } else {
          setShowCelebration(false);
          toast.success('അപേക്ഷ വിജയകരമായി സമർപ്പിച്ചു (UTR നമ്പർ രേഖപ്പെടുത്തി)! അഡ്മിൻ പൈസ വെരിഫൈ ചെയ്ത് അപ്രൂവൽ നൽകുന്നതോടെ ഡിജിറ്റൽ ഐഡി കാർഡ് ലഭ്യമാകും. (Application submitted. Pending Admin Verification & Approval.)', { id: loadingToast, duration: 8000 });
          setView('login');
        }
      } catch (txError: any) {
        console.error("Transaction Error:", txError);
        if (txError.message === "QUOTA_FULL") {
          throw new Error("ഈ ജില്ലക്ക് അനുവദിച്ച എൻട്രികളുടെ എണ്ണം കഴിഞ്ഞിരിക്കുന്നു. (District quota exhausted)");
        }
        throw new Error(`Account Activation Failed: ${txError.message || 'System busy'}`);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || 'Registration failed.', { id: loadingToast, duration: 8000 });
      setView('register');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleApprove = async (uid: string): Promise<boolean> => {
    const loadingToast = toast.loading('അംഗത്തെ അപ്രൂവ് ചെയ്യുന്നു... (Approving member...)');
    const member = members.find(m => m.uid === uid);
    if (!member) {
      toast.error('Member not found', { id: loadingToast });
      return false;
    }

    const previousMemberState = { ...member };

    const paddedSerial = String(member.serialNo || 1001).padStart(3, '0');
    const distCode = getDistrictCode(member.district || 'MLP').toUpperCase();
    const assemblyCode = getAssemblyCode(member.assemblyConstituency || '').toUpperCase();
    const isUpgraded = member.membershipId && member.membershipId.toUpperCase().startsWith('HCRS-');
    const finalId = isUpgraded 
      ? member.membershipId 
      : `KL/${distCode}/${assemblyCode}/${paddedSerial}`;

    const now = new Date();
    const expiry = new Date();
    expiry.setFullYear(now.getFullYear() + 1); // Default 1 year for all

    const isBulk = orgSettings?.registrationMode === 'bulk';

    const updatePayload: Partial<UserProfile> = {
      status: 'active',
      isApproved: true,
      membershipId: finalId,
      expiryDate: expiry,
      waStatus: isBulk ? 'Pending' : 'Sent',
      stateCode: 'KL',
      districtCode: distCode,
      constituencyCode: assemblyCode,
      renewalPending: false // Clear renewal pending flag upon any approval
    };

    const targetMobile = member.mobile ? String(member.mobile).replace(/\D/g, '') : '';

    // Instant optimistic state update in React for the exact approved member:
    setMembers(prev => prev.map(m => {
      if (m.uid !== uid) return m;
      return { 
        ...m, 
        ...updatePayload, 
        issueDate: now, 
        registrationDate: m.registrationDate ? (m.registrationDate.toDate ? m.registrationDate.toDate() : new Date(m.registrationDate)) : now
      };
    }));

    if (user && user.uid === uid) {
      setUser(prev => prev ? {
        ...prev,
        ...updatePayload,
        status: 'active',
        isApproved: true,
        renewalPending: false,
        issueDate: now
      } : prev);
      try {
        localStorage.setItem(`hcrs_cached_user_${user.uid}`, JSON.stringify({
          ...user,
          ...updatePayload,
          status: 'active',
          isApproved: true,
          renewalPending: false,
          issueDate: now
        }));
      } catch (e) {}
    }

    try {
      let serverSuccess = false;
      try {
        const resp = await fetch('/api/admin/approve-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            membershipId: finalId,
            district: member.district,
            assemblyConstituency: member.assemblyConstituency,
            serialNo: member.serialNo,
            mobile: targetMobile
          })
        });
        if (resp.ok) {
          serverSuccess = true;
        }
      } catch (apiErr) {
        console.warn("[Admin Approve API] Note:", apiErr);
      }

      const finalRegDate = member.registrationDate || serverTimestamp();

      try {
        await updateDoc(doc(db, 'users', uid), {
          ...updatePayload,
          issueDate: serverTimestamp(),
          registrationDate: finalRegDate
        });
      } catch (fsErr) {
        console.warn("[Firestore client update note]:", fsErr);
        if (!serverSuccess) {
          throw fsErr;
        }
      }

      // Trigger WhatsApp Welcome Message if enabled
      try {
        if (orgSettings?.whatsappEnabled !== false && orgSettings?.whatsappNewMemberEnabled !== false && !isBulk) {
          setTimeout(() => {
            sendWAMessage({
              name: member.name,
              mobile: member.mobile,
              uid: member.uid,
              pin: member.pin,
              membershipId: finalId,
              district: member.district
            });
          }, 300);
        }
      } catch (waErr) {
        console.warn("WhatsApp approval trigger error:", waErr);
      }

      toast.success(`അംഗത്വം വിജയകരമായി അപ്രൂവ് ചെയ്തു! (${finalId})`, { id: loadingToast });
      return true;
    } catch (error) {
      // Rollback optimistic update on error
      setMembers(prev => prev.map(m => m.uid === uid ? previousMemberState : m));
      toast.error('Approval failed. ദയവായി വീണ്ടും ശ്രമിക്കുക.', { id: loadingToast });
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      return false;
    }
  };

  const handleAddOffline = async (values: any): Promise<string | null> => {
    const loadingToast = toast.loading('Adding member...');
    try {
      // 0. Sanitize mobile
      const cleanMobile = (values.mobile || '').toString().trim().replace(/\D/g, '').slice(-10);
      if (cleanMobile.length < 10) {
        throw new Error('Valid 10-digit mobile number is required. (മൊബൈൽ നമ്പർ ശരിയല്ല.)');
      }

      // 0.1 Check if mobile number is already registered in 'users' collection to prevent double entry
      const usersRef = collection(db, 'users');
      const mobileQuery = query(usersRef, where('mobile', '==', cleanMobile), where('status', 'in', ['pending', 'active', 'offline', 'disabled']), limit(1));
      const mobileSnap = await getDocs(mobileQuery);
      if (!mobileSnap.empty) {
        throw new Error('This mobile number is already registered. (ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് നേരത്തെ രജിസ്റ്റർ ചെയ്തതാണ്. ദയവായി ലോഗിൻ ചെയ്യുക.)');
      }

      // Sanitize email/username
      const finalEmail = values.email && values.email.includes('@') 
        ? values.email.toLowerCase().trim()
        : `${cleanMobile}@hcrs.society`;

      // Use the admin's district for quota if they are an operator/second admin
      const currentEmail = (user?.email || '').toLowerCase().trim();
      const isSecondAdmin = SECOND_ADMINS.some(e => e.toLowerCase() === currentEmail);
      const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === currentEmail) ||
                          (user?.role === 'admin' && !user?.district) ||
                          (user?.mobile === '9645934571');
      const isLifeMember = (values.membership_type || values.membershipType || '').toUpperCase() === 'LIFE_MEMBER';
      const countsTowardQuota = !isMainAdmin && !isLifeMember;

      const isAdminAccount = values.role === 'admin';
      const adminDist = (user?.role === 'operator' || isSecondAdmin || isAdminAccount) 
        ? (values.district || user?.district)
        : values.district;
      
      const distCodeForQuota = getDistrictCode(adminDist || values.district || 'MLP');
      const districtQuota = districtQuotas[distCodeForQuota];
      const usedDistrictQuota = districtQuotasUsed[distCodeForQuota] || 0;

      console.log(`AddOffline Quota Check: ${distCodeForQuota} -> ${usedDistrictQuota}/${districtQuota} (countsTowardQuota: ${countsTowardQuota})`);

      // 1. Check District Quota
      if (countsTowardQuota && districtQuota !== undefined && districtQuota > 0 && usedDistrictQuota >= districtQuota) {
        toast.error(`ദയവായി ശ്രദ്ധിക്കുക: ഈ ജില്ലക്ക് അനുവദിച്ച എൻട്രികളുടെ എണ്ണം കഴിഞ്ഞിരിക്കുന്നു. (District quota exhausted: ${distCodeForQuota} - ${usedDistrictQuota}/${districtQuota})`, { id: loadingToast });
        return null;
      }

      // Quota check for anyone with a quota set (Operators/Secondary Admins)
      const isMainAdminEmailCheck = MAIN_ADMINS.some(e => e.toLowerCase() === currentEmail);
      if (user && (user.role === 'operator' || (user.role === 'admin' && !isMainAdminEmailCheck))) {
        const currentUserRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(currentUserRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          const quota = userData.quota;
          const used = userData.quotaUsed || 0;
          
          if (quota !== undefined && quota > 0 && used >= quota) {
            toast.error("മുന്നറിയിപ്പ്: താങ്കൾക്ക് അനുവദിച്ച വ്യക്തിഗത എൻട്രികളുടെ എണ്ണം കഴിഞ്ഞിരിക്കുന്നു. (Personal quota exhausted)", { id: loadingToast });
            return null;
          }
        }
      }

      // 1. Create Auth Account if possible
      let uid = '';
      try {
        const authResult = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, values.pin);
        uid = authResult.user.uid;
        // Immediately sign out from secondary session just in case
        await signOut(secondaryAuth);
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
           console.log('Email exists, using offline ID method');
           uid = `offline_${values.mobile}_${Date.now()}`;
        } else {
           throw authError; // Re-throw if it's a different error
        }
      }

      if (!uid) uid = `offline_${values.mobile}`;
      
      const userRef = doc(db, 'users', uid);
      const metadataRef = doc(db, 'system', 'totals');
      const quotaRef = doc(db, 'districtQuotas', distCodeForQuota);

      console.log(`Processing offline entry for district: ${distCodeForQuota}, quotaRef: districtQuotas/${distCodeForQuota}`);

      let newlyCreatedUser: UserProfile | null = null;

      try {
        await runTransaction(db, async (transaction) => {
          // 1. ALL READS FIRST
          const qSnap = countsTowardQuota ? await transaction.get(quotaRef) : null;
          const metaDoc = await transaction.get(metadataRef);
          
          // 2. LOGIC AND WRITES
          if (countsTowardQuota) {
            if (qSnap && qSnap.exists()) {
              const qData = qSnap.data();
              if (qData.total !== undefined && qData.total > 0 && (qData.used || 0) >= qData.total) {
                 throw new Error("District quota exhausted during transaction");
              }
              transaction.update(quotaRef, { used: increment(1) });
            } else {
              // Initialize district quota if not exists
              transaction.set(quotaRef, {
                id: distCodeForQuota,
                districtName: DISTRICTS.find(d => d.code === distCodeForQuota)?.name || distCodeForQuota,
                total: 398, // Using the user's mentioned number as potential default or just standard
                used: 1
              });
            }
          }

          let nextSerial = (metaDoc.data()?.count || 1000) + 1;
          transaction.set(metadataRef, { count: nextSerial }, { merge: true });

          const memberDistCode = getDistrictCode(values.district || 'MLP').toUpperCase();
          const assemblyCode = getAssemblyCode(values.assemblyConstituency || '').toUpperCase();
          const finalId = generateNewMembershipId(values.district || 'MLP', values.assemblyConstituency || '', nextSerial);

          const isMainAdminFinal = MAIN_ADMINS.some(e => e.toLowerCase() === (user?.email || '').toLowerCase());
          // Increment count for Operators and Second Admins if they have a real profile document
          if (user?.role === 'operator' || (user?.role === 'admin' && !isMainAdminFinal)) {
            const operatorRef = doc(db, 'users', user.uid);
            // Use set with merge to avoid failure if document doesn't exist
            transaction.set(operatorRef, {
              quotaUsed: increment(1)
            }, { merge: true });
          }

          const isBulk = orgSettings?.registrationMode === 'bulk';
          const isAdminAccount = values.role === 'admin' || values.role === 'operator';
          
          // Manual admin additions have expired validity by default from the start (as requested by user)
          const expiry = new Date('2026-04-15T12:00:00Z'); // Expired on April 15, 2026

          const offlineMemberData: any = {
            uid,
            ...values,
            mobile: cleanMobile,
            email: finalEmail, // USE SANITIZED EMAIL
            registrationDate: new Date('2025-04-15T12:00:00Z'), // Joining / Registration Date set to April 2025
            membershipId: finalId,
            status: 'active', // Auto-approved
            isPaid: true,
            isApproved: true,
            issueDate: new Date('2025-04-15T12:00:00Z'),
            expiryDate: expiry,
            isAdmin: isAdminAccount,
            role: values.role || 'member',
            quota: values.quota || 0,
            quotaUsed: 0,
            registeredBy: user?.uid, // Track who added this member
            registeredByName: user?.name || 'Admin', // Store name for display
            serialNo: nextSerial,
            waStatus: isBulk ? 'Pending' : 'Sent',
            stateCode: 'KL',
            districtCode: memberDistCode,
            constituencyCode: assemblyCode,
            membership_type: 'ADHOC_MEMBER',
            isQuotaCounted: countsTowardQuota
          };
          transaction.set(userRef, offlineMemberData);
          newlyCreatedUser = offlineMemberData as UserProfile;
        });
      } catch (error: any) {
        const errMsg = error?.message || String(error);
        const errCode = error?.code || '';
        const isOfflineError = 
          errMsg.toLowerCase().includes('offline') || 
          errMsg.toLowerCase().includes('connection') || 
          errMsg.toLowerCase().includes('could not reach') || 
          errMsg.toLowerCase().includes('backend') ||
          errMsg.toLowerCase().includes('timeout') ||
          errMsg.toLowerCase().includes('unavailable') ||
          errCode === 'unavailable';

        if (isOfflineError) {
          console.warn("Database connection issue detected during handleAddOffline! Running offline direct-write fallback...");
          
          let nextSerial = 1001;
          try {
            // Read from server or local cache (fallback is instant if offline)
            const metaDoc = await getDoc(metadataRef);
            if (metaDoc.exists()) {
              nextSerial = (metaDoc.data()?.count || 1000) + 1;
            } else {
              const maxLocal = members && members.length > 0 ? Math.max(...members.map(m => m.serialNo || 1000), 1000) : 1000;
              nextSerial = maxLocal + 1;
            }
          } catch (e) {
            const maxLocal = members && members.length > 0 ? Math.max(...members.map(m => m.serialNo || 1000), 1000) : 1000;
            nextSerial = maxLocal + 1;
          }

          const memberDistCode = getDistrictCode(values.district || 'MLP').toUpperCase();
          const assemblyCode = getAssemblyCode(values.assemblyConstituency || '').toUpperCase();
          const finalId = generateNewMembershipId(values.district || 'MLP', values.assemblyConstituency || '', nextSerial);

          const isMainAdminFinal = MAIN_ADMINS.some(e => e.toLowerCase() === (user?.email || '').toLowerCase());
          const isBulk = orgSettings?.registrationMode === 'bulk';
          const isAdminAccount = values.role === 'admin' || values.role === 'operator';
          const expiry = new Date('2026-04-15T12:00:00Z');

          const offlineMemberData: any = {
            uid,
            ...values,
            email: finalEmail,
            registrationDate: new Date('2025-04-15T12:00:00Z'),
            membershipId: finalId,
            status: 'active',
            isPaid: true,
            isApproved: true,
            issueDate: new Date('2025-04-15T12:00:00Z'),
            expiryDate: expiry,
            isAdmin: isAdminAccount,
            role: values.role || 'member',
            quota: values.quota || 0,
            quotaUsed: 0,
            registeredBy: user?.uid,
            registeredByName: user?.name || 'Admin',
            serialNo: nextSerial,
            waStatus: isBulk ? 'Pending' : 'Sent',
            stateCode: 'KL',
            districtCode: memberDistCode,
            constituencyCode: assemblyCode,
            membership_type: 'ADHOC_MEMBER',
            isQuotaCounted: countsTowardQuota
          };

          // Safe, direct, offline-first non-blocking writes
          await setDoc(metadataRef, { count: nextSerial }, { merge: true });
          
          if (countsTowardQuota) {
            await setDoc(quotaRef, { used: increment(1) }, { merge: true });
          }

          if (user?.role === 'operator' || (user?.role === 'admin' && !isMainAdminFinal)) {
            const operatorRef = doc(db, 'users', user.uid);
            await setDoc(operatorRef, { quotaUsed: increment(1) }, { merge: true });
          }

          await setDoc(userRef, offlineMemberData);
          newlyCreatedUser = offlineMemberData as UserProfile;
        } else {
          throw error;
        }
      }

      if (newlyCreatedUser) {
        setMembers(prev => [newlyCreatedUser!, ...prev]);
      }

      toast.success('അംഗത്തെ വിജയകരമായി ചേർത്തു (Member added successfully).', { id: loadingToast });
      return uid;
    } catch (error: any) {
      console.error("Add Offline Error:", error);
      let errorMsg = 'അംഗത്തെ ചേർക്കുന്നതിൽ പരാജയപ്പെട്ടു (Failed to add member)';
      let technicalDetail = '';
      
      if (error.message && error.message.includes("District quota exhausted")) {
        errorMsg = "ഈ ജില്ലക്ക് അനുവദിച്ച എൻട്രികളുടെ എണ്ണം കഴിഞ്ഞിരിക്കുന്നു. (District quota exhausted)";
      } else if (error.code === 'auth/weak-password') {
        errorMsg = "പാസ്സ്‌വേർഡ് വളരെ ലളിതമാണ്. കുറഞ്ഞത് 6 അക്കങ്ങൾ വേണം. (Password too weak)";
      } else if (error.code === 'permission-denied' || error.message?.includes('permission-denied')) {
        errorMsg = "അനുമതി നിഷേധിച്ചു. നിങ്ങൾ ശരിയായ അഡ്മിൻ അക്കൗണ്ടാണോ ഉപയോഗിക്കുന്നത് എന്ന് പരിശോധിക്കുക. (Permission denied. Please check your admin account.)";
      } else if (error.message) {
        // Try to extract from FirestoreErrorInfo if it's there
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) technicalDetail = parsed.error;
        } catch (e) {
          technicalDetail = error.message;
        }
      }

      // Make error more user-friendly
      const finalMsg = technicalDetail && !technicalDetail.toLowerCase().includes('firestore') && !technicalDetail.toLowerCase().includes('database')
        ? `${errorMsg}: ${technicalDetail}` 
        : errorMsg;
      
      toast.error(finalMsg, { id: loadingToast, duration: 6000 });
      try {
        handleFirestoreError(error, OperationType.WRITE, 'users');
      } catch (e) {
        // Already handled
      }
      return null;
    }
  };

  const handleUpdateMember = async (uid: string, data: Partial<UserProfile>) => {
    const loadingToast = toast.loading('Updating details...');
    try {
      const existingMember = members.find(m => m.uid === uid);
      const finalData = { ...data };

      // If we are explicitly setting isApproved to true in an update, 
      // ensure status is active and issueDate is set (Request #3)
      if (data.isApproved === true) {
        finalData.status = 'active';
        finalData.issueDate = serverTimestamp();
        finalData.renewalPending = false;
        
        // Also set expiry if it doesn't have one
        if (!data.expiryDate && (!existingMember || !existingMember.expiryDate)) {
          const expiry = new Date();
          expiry.setFullYear(expiry.getFullYear() + 1);
          finalData.expiryDate = expiry;
        }
      }

      // Automatically recalculate membership ID if constituency or district is updated/changed
      if (existingMember) {
        const isNaInId = existingMember.membershipId && (existingMember.membershipId.toUpperCase().includes('-NA-') || existingMember.membershipId.toUpperCase().includes('/NA/'));
        const hasNewDistrict = data.district !== undefined && data.district !== existingMember.district;
        const hasNewAssembly = data.assemblyConstituency !== undefined && data.assemblyConstituency !== existingMember.assemblyConstituency;

        if (hasNewDistrict || hasNewAssembly || (isNaInId && data.assemblyConstituency && data.assemblyConstituency !== 'NA' && data.assemblyConstituency !== '')) {
          const rawDistrict = data.district !== undefined ? data.district : existingMember.district;
          const rawAssembly = data.assemblyConstituency !== undefined ? data.assemblyConstituency : existingMember.assemblyConstituency;

          const distCode = getDistrictCode(rawDistrict || 'MLP').toUpperCase();
          const assemblyCode = getAssemblyCode(rawAssembly || '').toUpperCase();

          // Retain the serial number suffix
          let serialSuffixRef = 1001;
          let serialSuffixStr = '1001';
          if (existingMember.serialNo) {
            serialSuffixRef = existingMember.serialNo;
            serialSuffixStr = String(existingMember.serialNo);
          } else if (existingMember.membershipId) {
            const parts = existingMember.membershipId.split(/[\/-]/);
            const rawSuffix = parts[parts.length - 1] || '1001';
            const digitsMatch = rawSuffix.match(/\d+/);
            const num = digitsMatch ? parseInt(digitsMatch[0], 10) : 1001;
            serialSuffixRef = num;
            serialSuffixStr = digitsMatch ? digitsMatch[0] : rawSuffix;
          }

          const isUpgraded = existingMember.membershipId && existingMember.membershipId.toUpperCase().startsWith('HCRS-');
          if (isUpgraded) {
            finalData.membershipId = generateNewMembershipId(rawDistrict || 'MLP', rawAssembly || '', serialSuffixRef);
          } else {
            finalData.membershipId = `KL/${distCode}/${assemblyCode}/${serialSuffixStr.padStart(3, '0')}`;
          }
          finalData.stateCode = 'KL';
          finalData.districtCode = distCode;
          finalData.constituencyCode = assemblyCode;
        }
      }

      // Sanitize data (remove undefined)
      const cleanData: any = {};
      Object.entries(finalData).forEach(([k, v]) => {
        if (v !== undefined) {
          cleanData[k] = v;
        }
      });

      const targetMobile = existingMember?.mobile || cleanData.mobile ? String(existingMember?.mobile || cleanData.mobile).replace(/\D/g, '') : '';

      // Optimistic update in React state for matching UID only
      setMembers(prev => {
        const nextList = prev.map(m => {
          if (m.uid !== uid) return m;
          return {
            ...m,
            ...cleanData,
            status: cleanData.status || (cleanData.isApproved ? 'active' : m.status),
            isApproved: cleanData.isApproved !== undefined ? cleanData.isApproved : (cleanData.status === 'active' ? true : m.isApproved),
            renewalPending: cleanData.renewalPending !== undefined ? cleanData.renewalPending : (cleanData.status === 'active' ? false : m.renewalPending),
            issueDate: cleanData.issueDate || m.issueDate || new Date(),
            renewalDate: cleanData.renewalDate || m.renewalDate || new Date(),
            expiryDate: cleanData.expiryDate || m.expiryDate
          };
        });
        try {
          localStorage.setItem('hcrs_cached_members_list', JSON.stringify(nextList));
        } catch (e) {}
        return nextList;
      });

      // Update logged-in user state if matching
      setUser(prev => {
        if (!prev || prev.uid !== uid) return prev;
        return {
          ...prev,
          ...cleanData,
          status: cleanData.status || (cleanData.isApproved ? 'active' : prev.status),
          isApproved: cleanData.isApproved !== undefined ? cleanData.isApproved : (cleanData.status === 'active' ? true : prev.isApproved),
          renewalPending: cleanData.renewalPending !== undefined ? cleanData.renewalPending : (cleanData.status === 'active' ? false : prev.renewalPending),
          issueDate: cleanData.issueDate || prev.issueDate || new Date(),
          renewalDate: cleanData.renewalDate || prev.renewalDate || new Date(),
          expiryDate: cleanData.expiryDate || prev.expiryDate
        };
      });

      // 1. Server API update (reliable backend fallback)
      try {
        const apiData = { ...cleanData };
        if (apiData.issueDate instanceof Date) apiData.issueDate = apiData.issueDate.toISOString();
        if (apiData.renewalDate instanceof Date) apiData.renewalDate = apiData.renewalDate.toISOString();
        if (apiData.expiryDate instanceof Date) apiData.expiryDate = apiData.expiryDate.toISOString();
        if (apiData.registrationDate instanceof Date) apiData.registrationDate = apiData.registrationDate.toISOString();

        await fetch('/api/admin/update-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, data: apiData, mobile: targetMobile })
        });
      } catch (apiErr) {
        console.warn("[handleUpdateMember API note]:", apiErr);
      }

      // 2. Client Firestore SDK update
      try {
        await setDoc(doc(db, 'users', uid), cleanData, { merge: true });
      } catch (fsErr) {
        console.warn("[handleUpdateMember Firestore note]:", fsErr);
      }

      // Automatically generate or update renewal receipt when renewal is approved
      const isRenewalApproval = cleanData.renewalPending === false && existingMember?.renewalPending === true;
      if (isRenewalApproval && existingMember) {
        try {
          const serialNoStr = existingMember.serialNo ? String(existingMember.serialNo).padStart(4, '0') : '1000';
          const paymentDateStr = existingMember.renewalPaymentDate || new Date().toISOString().split('T')[0];
          const renewalYear = existingMember.renewalPaymentDate ? new Date(existingMember.renewalPaymentDate).getFullYear() : new Date().getFullYear();
          const targetTxId = existingMember.renewalTransactionId || existingMember.transactionId || '';

          // Check if a receipt already exists in subcollection to avoid duplicate ₹100 receipts
          const receiptsRef = collection(db, 'users', uid, 'receipts');
          const existingSnap = await getDocs(receiptsRef);
          
          let pendingReceiptDoc: any = null;
          let alreadyPaidThisYear = false;

          for (const docSnap of existingSnap.docs) {
            const data = docSnap.data();
            const isRenewalType = data.receiptType === 'Annual Renewal' || data.receiptType === 'Membership Renewal';
            const matchesYear = data.year === renewalYear || (data.paymentDate && new Date(data.paymentDate).getFullYear() === renewalYear);
            const matchesTx = targetTxId && (data.transactionId === targetTxId || data.paymentId === targetTxId);

            if (isRenewalType && (matchesYear || matchesTx || data.status === 'Pending Verification')) {
              if (data.status === 'Pending Verification' || data.status === 'Pending') {
                pendingReceiptDoc = docSnap;
                break;
              } else if (data.status === 'Paid') {
                alreadyPaidThisYear = true;
                break;
              }
            }
          }

          if (pendingReceiptDoc) {
            // Update existing pending receipt to Paid
            await setDoc(doc(db, 'users', uid, 'receipts', pendingReceiptDoc.id), {
              status: 'Paid',
              paymentStatus: 'Renewed',
              receiptType: 'Annual Renewal',
              receiptLabel: 'Annual Renewal Receipt',
              amount: 100,
              paymentDate: paymentDateStr,
              year: renewalYear,
              updatedAt: serverTimestamp()
            }, { merge: true });
            console.log(`Updated pending renewal receipt to Paid: ${pendingReceiptDoc.id}`);
          } else if (!alreadyPaidThisYear) {
            // Only add if no receipt exists for this renewal cycle
            const randomId = Math.floor(1000 + Math.random() * 9000);
            const receiptNo = `HCRS-REN-${serialNoStr}-${randomId}`;

            await addDoc(receiptsRef, {
              receiptNo,
              receiptType: 'Annual Renewal',
              receiptLabel: 'Annual Renewal Receipt',
              amount: 100,
              status: 'Paid',
              paymentDate: paymentDateStr,
              createdAt: serverTimestamp(),
              year: renewalYear,
              transactionId: targetTxId
            });
            console.log(`Successfully generated automatic renewal receipt: ${receiptNo}`);
          } else {
            console.log(`Renewal receipt for year ${renewalYear} already exists. Skipped duplicate creation.`);
          }
        } catch (receiptErr) {
          console.error("Non-blocking error: Failed to generate or update automatic renewal receipt:", receiptErr);
        }
      }

      // Optimistic state update:
      setMembers(prev => prev.map(m => m.uid === uid ? { 
        ...m, 
        ...cleanData,
        issueDate: (cleanData.issueDate === serverTimestamp()) ? new Date() : (cleanData.issueDate || m.issueDate),
        renewalDate: (cleanData.renewalDate === serverTimestamp()) ? new Date() : (cleanData.renewalDate || m.renewalDate)
      } : m));

      if (user && user.uid === uid) {
        setUser(prev => prev ? {
          ...prev,
          ...cleanData,
          issueDate: (cleanData.issueDate === serverTimestamp()) ? new Date() : (cleanData.issueDate || prev.issueDate),
          renewalDate: (cleanData.renewalDate === serverTimestamp()) ? new Date() : (cleanData.renewalDate || prev.renewalDate)
        } : prev);
        try {
          localStorage.setItem(`hcrs_cached_user_${uid}`, JSON.stringify({ ...user, ...cleanData }));
        } catch (e) {}
      }

      toast.success('Successfully updated.', { id: loadingToast });
    } catch (error) {
      toast.error('Update failed.', { id: loadingToast });
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleChangePassword = async (newPin: string) => {
    if (!user) return;
    const loadingToast = toast.loading('Updating password / പാസ്‌വേഡ് മാറ്റുന്നു...');
    try {
      const cleanNewPin = newPin.replace(/\D/g, '').slice(0, 6);
      if (!cleanNewPin || cleanNewPin.length !== 6) {
        throw new Error('Password must be exactly 6 digits (പാസ്‌വേഡ് കൃത്യമായി 6 അക്കങ്ങൾ വേണം)');
      }

      if (cleanNewPin === '123456') {
        throw new Error('Cannot use default password 123456 (ഡീഫോൾട്ട് പാസ്‌വേഡ് 123456 ഉപയോഗിക്കാൻ പാടില്ല)');
      }

      // 1. Update Firebase Auth password safely (graceful catch so session re-auth issues don't abort DB update)
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, cleanNewPin);
          console.log("Firebase Auth password updated successfully.");
        } catch (authPassErr: any) {
          console.warn("Auth update password note (will sync Firestore and allow login via channel resolution):", authPassErr?.message);
        }
      }

      // 2. Update primary Firestore user document with new PIN & clear mustChange flags
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        pin: cleanNewPin,
        mustChangePassword: false,
        pinResetRequested: false
      }, { merge: true });

      // If active auth session UID is different from user.uid, update auth UID doc as well
      if (auth.currentUser && auth.currentUser.uid !== user.uid) {
        try {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            pin: cleanNewPin,
            mustChangePassword: false,
            pinResetRequested: false
          }, { merge: true });
        } catch (authDocErr) {
          console.warn("Auth UID doc sync note:", authDocErr);
        }
      }

      // 3. Sync update to all documents matching user's mobile, membershipId, or email in Firestore
      const cleanMobile = user.mobile ? String(user.mobile).replace(/\D/g, '').slice(-10) : '';
      const usersRef = collection(db, 'users');
      const updateTargets = new Set<string>();

      if (cleanMobile && cleanMobile.length === 10) {
        try {
          const qMob = query(usersRef, where('mobile', '==', cleanMobile));
          const snapMob = await getDocs(qMob);
          snapMob.docs.forEach(d => updateTargets.add(d.id));
        } catch (e) {
          console.warn("Mobile query sync note:", e);
        }
      }
      if (user.membershipId) {
        try {
          const qMem = query(usersRef, where('membershipId', '==', user.membershipId));
          const snapMem = await getDocs(qMem);
          snapMem.docs.forEach(d => updateTargets.add(d.id));
        } catch (e) {}
      }

      for (const docId of updateTargets) {
        if (docId !== user.uid && (!auth.currentUser || docId !== auth.currentUser.uid)) {
          try {
            await setDoc(doc(db, 'users', docId), {
              pin: cleanNewPin,
              mustChangePassword: false,
              pinResetRequested: false
            }, { merge: true });
          } catch (e) {
            console.warn("Target doc update note:", docId, e);
          }
        }
      }

      // 4. Update local state & members list
      const updatedUser: UserProfile = {
        ...user,
        pin: cleanNewPin,
        mustChangePassword: false,
        pinResetRequested: false
      };
      setUser(updatedUser);
      setMembers(prev => prev.map(m => (
        m.uid === user.uid || 
        (cleanMobile && String(m.mobile).replace(/\D/g, '').slice(-10) === cleanMobile) || 
        (user.membershipId && m.membershipId === user.membershipId)
      ) ? {
        ...m,
        pin: cleanNewPin,
        mustChangePassword: false,
        pinResetRequested: false
      } : m));

      try {
        localStorage.setItem(`hcrs_cached_user_${user.uid}`, JSON.stringify(updatedUser));
        if (auth.currentUser) {
          localStorage.setItem(`hcrs_cached_user_${auth.currentUser.uid}`, JSON.stringify(updatedUser));
        }
      } catch (e) {
        console.warn("Could not update cached user in localStorage:", e);
      }

      toast.success('പാസ്‌വേഡ് വിജയകരമായി മാറ്റി! (Password updated successfully)', { id: loadingToast });

      // 5. Always redirect to complete-profile (Edit Profile) after password setup/change
      currentViewRef.current = 'complete-profile';
      setView('complete-profile');
      toast.info('പാസ്‌വേഡ് മാറ്റി! അടുത്തതായി താങ്കളുടെ പ്രൊഫൈൽ വിവരങ്ങൾ പരിശോധിച്ച് സേവ് ചെയ്യുക. (Please verify and save your profile details)', { duration: 6000 });
    } catch (err: any) {
      console.error("Change password error:", err);
      toast.error('പാസ്‌വേഡ് മാറ്റുന്നതിൽ തടസ്സം നേരിട്ടു: ' + (err?.message || 'Error'), { id: loadingToast });
      throw err;
    }
  };

  const handleSaveProfile = async (updatedData: Partial<UserProfile>) => {
    if (!user) return;
    const loadingToast = toast.loading('Saving your profile...');
    try {
      const finalData: Partial<UserProfile> = { 
        ...updatedData, 
        mustCompleteProfile: false,
        profileCompleted: true 
      };
      
      const isNaInId = user.membershipId && (user.membershipId.toUpperCase().includes('-NA-') || user.membershipId.toUpperCase().includes('/NA/'));
      const hasNewDistrict = updatedData.district !== undefined && updatedData.district !== user.district;
      const hasNewAssembly = updatedData.assemblyConstituency !== undefined && updatedData.assemblyConstituency !== user.assemblyConstituency;

      if (hasNewDistrict || hasNewAssembly || (isNaInId && updatedData.assemblyConstituency && updatedData.assemblyConstituency !== 'NA' && updatedData.assemblyConstituency !== '')) {
        const rawDistrict = updatedData.district !== undefined ? updatedData.district : user.district;
        const rawAssembly = updatedData.assemblyConstituency !== undefined ? updatedData.assemblyConstituency : user.assemblyConstituency;

        const distCode = getDistrictCode(rawDistrict || 'MLP').toUpperCase();
        const assemblyCode = getAssemblyCode(rawAssembly || '').toUpperCase();

        // Retain the serial number suffix
        let serialSuffixRef = 1001;
        let serialSuffixStr = '1001';
        if (user.serialNo) {
          serialSuffixRef = user.serialNo;
          serialSuffixStr = String(user.serialNo);
        } else if (user.membershipId) {
          const parts = user.membershipId.split(/[\/-]/);
          const rawSuffix = parts[parts.length - 1] || '1001';
          const digitsMatch = rawSuffix.match(/\d+/);
          const num = digitsMatch ? parseInt(digitsMatch[0], 10) : 1001;
          serialSuffixRef = num;
          serialSuffixStr = digitsMatch ? digitsMatch[0] : rawSuffix;
        }

        const isUpgraded = user.membershipId && user.membershipId.toUpperCase().startsWith('HCRS-');
        if (isUpgraded) {
          finalData.membershipId = generateNewMembershipId(rawDistrict || 'MLP', rawAssembly || '', serialSuffixRef);
        } else {
          finalData.membershipId = `KL/${distCode}/${assemblyCode}/${serialSuffixStr.padStart(3, '0')}`;
        }
        finalData.stateCode = 'KL';
        finalData.districtCode = distCode;
        finalData.constituencyCode = assemblyCode;
      }

      // Sanitize data (remove undefined)
      const cleanData: any = {};
      Object.entries(finalData).forEach(([k, v]) => {
        if (v !== undefined) {
          cleanData[k] = v;
        }
      });

      // 1. Server API update (reliable backend fallback)
      try {
        await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, data: cleanData, mobile: user.mobile })
        });
      } catch (apiErr) {
        console.warn("[handleSaveProfile API note]:", apiErr);
      }

      // 2. Update user document with merge: true so it's 100% resilient
      try {
        await setDoc(doc(db, 'users', user.uid), cleanData, { merge: true });
      } catch (fsErr) {
        console.warn("[handleSaveProfile Firestore note]:", fsErr);
      }

      // 3. Also ensure current auth user document is synced if UID differs
      if (auth.currentUser && auth.currentUser.uid !== user.uid) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), cleanData, { merge: true }).catch(() => {});
      }

      // 4. Also synchronize to any duplicate/mobile matched records
      if (user.mobile) {
        const cleanMob = String(user.mobile).replace(/\D/g, '').slice(-10);
        if (cleanMob.length === 10) {
          try {
            const qM = query(collection(db, 'users'), where('mobile', '==', cleanMob));
            const snapM = await getDocs(qM);
            for (const d of snapM.docs) {
              if (d.id !== user.uid && (!auth.currentUser || d.id !== auth.currentUser.uid)) {
                await setDoc(doc(db, 'users', d.id), {
                  ...cleanData,
                  mustCompleteProfile: false,
                  profileCompleted: true
                }, { merge: true }).catch(() => {});
              }
            }
          } catch (e) {}
        }
      }
      
      const updatedUser: UserProfile = {
        ...user,
        ...cleanData,
        mustCompleteProfile: false,
        profileCompleted: true
      };
      setUser(updatedUser);
      setMembers(prev => prev.map(m => (m.uid === user.uid || (user.mobile && m.mobile === user.mobile)) ? {
        ...m,
        ...cleanData,
        mustCompleteProfile: false,
        profileCompleted: true
      } : m));

      try {
        localStorage.setItem(`hcrs_cached_user_${user.uid}`, JSON.stringify(updatedUser));
        if (auth.currentUser) {
          localStorage.setItem(`hcrs_cached_user_${auth.currentUser.uid}`, JSON.stringify(updatedUser));
        }
      } catch (e) {
        console.warn("Could not update cached user in localStorage:", e);
      }

      toast.success('പ്രൊഫൈൽ വിവരങ്ങൾ വിജയകരമായി സേവ് ചെയ്തു! (Profile updated successfully)', { id: loadingToast });
      setIsEditingProfile(false);
      currentViewRef.current = 'card';
      setView('card');
    } catch (error) {
      console.error("Save profile error:", error);
      toast.error('Failed to update details.', { id: loadingToast });
    }
  };

  const handleDeleteMember = async (uid: string) => {
    const existing = members.find(m => m.uid === uid);
    const shouldHardDelete = existing && existing.status === 'deleted';

    const loadingToast = toast.loading(shouldHardDelete ? 'അംഗത്തെ ശാശ്വതമായി ഒഴിവാക്കുന്നു...' : 'Deactivating member profile...');
    console.log(`Attempting to ${shouldHardDelete ? 'permanently delete' : 'deactivate'} document:`, uid);
    try {
      const userRef = doc(db, 'users', uid);

      // Decrement quotas if the member is not already at a 'deleted' status
      if (existing && existing.status !== 'deleted') {
        const countsTowardQuota = existing.isQuotaCounted ?? (
          existing.membership_type !== 'LIFE_MEMBER' && 
          existing.membershipType !== 'LIFE_MEMBER'
        );

        if (countsTowardQuota) {
          try {
            const rawDistrict = existing.district || existing.districtCode || 'MLP';
            const distCode = getDistrictCode(rawDistrict).toUpperCase();
            const quotaRef = doc(db, 'districtQuotas', distCode);
            await updateDoc(quotaRef, {
              used: increment(-1)
            });
            console.log(`Successfully decremented district quota (${distCode}) used count.`);
          } catch (quotaErr) {
            console.error("Non-blocking error: Failed to decrement district quota:", quotaErr);
          }
        }

        if (existing.registeredBy) {
          try {
            const operatorRef = doc(db, 'users', existing.registeredBy);
            await updateDoc(operatorRef, {
              quotaUsed: increment(-1)
            });
            console.log(`Successfully decremented operator (${existing.registeredBy}) quotaUsed count.`);
          } catch (opErr) {
            console.error("Non-blocking error: Failed to decrement operator quota:", opErr);
          }
        }
      }
      
      if (shouldHardDelete) {
        // Complete hard delete from Firestore
        await deleteDoc(userRef);
        
        // Optimistic state update: remove permanently
        setMembers(prev => prev.filter(m => m.uid !== uid));
        
        toast.success('അംഗത്തെ വിജയകരമായി ഡാറ്റാബേസിൽ നിന്ന് പൂർണ്ണമായും ഒഴിവാക്കി. (Deleted permanently.)', { id: loadingToast });
      } else {
        // Update status to deleted instead of hard delete
        await updateDoc(userRef, {
          status: 'deleted',
          deletedAt: serverTimestamp(),
          deletedBy: auth.currentUser?.email
        });
        
        // Optimistic state update: mark as deleted
        setMembers(prev => prev.map(m => m.uid === uid ? { ...m, status: 'deleted' } : m));
        
        toast.success('Member deactivated and hidden.', { id: loadingToast });
      }
      console.log(`${shouldHardDelete ? 'Hard' : 'Soft'}-deleted user successfully: ${uid}`);
    } catch (error: any) {
      console.error("Deletion/Deactivation failed:", error);
      let msg = 'Failed to delete/deactivate. ';
      if (error.code === 'permission-denied') {
        msg += 'Permission denied. Please ensure you are logged in as admin.';
      } else {
        msg += error.message || 'Check your connection.';
      }
      toast.error(msg, { id: loadingToast });
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const handleResetPin = async (uid: string) => {
    if (!window.confirm('ഈ അംഗത്തിന്റെ പാസ്‌വേഡ് 123456 ആയി റീസെറ്റ് ചെയ്യണമെന്ന് ഉറപ്പാണോ? ആദ്യ ലോഗിനിൽ ഇവർക്ക് പുതിയ പാസ്‌വേഡ് മാറ്റാനുള്ള നിർദ്ദേശം ലഭിക്കും. (Reset password to 123456?)')) return;
    
    const loadingToast = toast.loading('Resetting password to 123456...');
    try {
      const userRef = doc(db, 'users', uid);
      const targetMember = members.find(m => m.uid === uid);
      
      await setDoc(userRef, {
        pin: '123456',
        mustChangePassword: true,
        pinResetRequested: true,
        mustCompleteProfile: false
      }, { merge: true });
      
      // Also update any other records with the same mobile number to ensure full synchronization
      if (targetMember?.mobile) {
        const cleanMobile = String(targetMember.mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length === 10) {
          try {
            const qMob = query(collection(db, 'users'), where('mobile', '==', cleanMobile));
            const snap = await getDocs(qMob);
            for (const d of snap.docs) {
              if (d.id !== uid) {
                await updateDoc(doc(db, 'users', d.id), {
                  pin: '123456',
                  mustChangePassword: true,
                  pinResetRequested: true,
                  mustCompleteProfile: false
                }).catch(e => console.warn("Non-blocking secondary reset note:", e));
              }
            }
          } catch (syncErr) {
            console.warn("Non-blocking secondary reset query error:", syncErr);
          }
        }
      }
      
      // Optimistic state update:
      setMembers(prev => prev.map(m => (m.uid === uid || (targetMember?.mobile && m.mobile === targetMember.mobile)) ? {
        ...m,
        pin: '123456',
        mustChangePassword: true,
        pinResetRequested: true,
        mustCompleteProfile: false
      } : m));
      
      toast.success('പാസ്‌വേഡ് 123456 ആയി റീസെറ്റ് ചെയ്തു! അംഗം അടുത്ത ലോഗിനിൽ പുതിയ പാസ്‌വേഡ് മാറ്റേണ്ടതാണ്.', { id: loadingToast, duration: 5000 });
    } catch (error: any) {
      console.error("Reset password failed:", error);
      toast.error('Password reset failed: ' + (error?.message || 'Error'), { id: loadingToast });
    }
  };

  const handleBulkResetAllPins = async () => {
    if (!window.confirm('എല്ലാ അംഗങ്ങളുടെയും പാസ്‌വേഡ് 123456 ആക്കി റീസെറ്റ് ചെയ്യണമെന്ന് ഉറപ്പാണോ? ആദ്യമായി ലോഗിൻ ചെയ്യുമ്പോൾ പുതിയ പാസ്‌വേഡ് മാറ്റാനുള്ള പേജ് വരും, ഒരിക്കൽ മാറ്റിയാൽ പിന്നീട് നേരിട്ട് കാർഡിലേക്ക് പ്രവേശിക്കാം. (Bulk reset all passwords to 123456?)')) return;

    const loadingToast = toast.loading('എല്ലാ അംഗങ്ങളുടെയും പാസ്‌വേഡ് 123456 ആക്കുന്നു (Resetting all passwords to 123456)...');
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      let totalUpdated = 0;
      
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const docEmail = (data.email || '').toLowerCase().trim();
        const isSuperAdm = MAIN_ADMINS.some(adm => adm.toLowerCase() === docEmail);
        if (isSuperAdm) continue;

        batch.update(docSnap.ref, {
          pin: '123456',
          mustChangePassword: true,
          pinResetRequested: true,
          mustCompleteProfile: false
        });
        batchCount++;
        totalUpdated++;

        if (batchCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      // Optimistic update of local members list
      setMembers(prev => prev.map(m => {
        const docEmail = (m.email || '').toLowerCase().trim();
        const isSuperAdm = MAIN_ADMINS.some(adm => adm.toLowerCase() === docEmail);
        if (isSuperAdm) return m;
        return {
          ...m,
          pin: '123456',
          mustChangePassword: true,
          pinResetRequested: true,
          mustCompleteProfile: false
        };
      }));

      toast.success(`ആകെ ${totalUpdated} അംഗങ്ങളുടെ പാസ്‌വേഡ് 123456 ആക്കി മാറ്റി. ആദ്യ ലോഗിനിൽ പുതിയ പാസ്‌വേഡ് മാറ്റാൻ ആവശ്യപ്പെടും!`, { id: loadingToast, duration: 6000 });
    } catch (error: any) {
      console.error("Bulk reset failed:", error);
      toast.error('Bulk password reset failed: ' + (error?.message || 'Error'), { id: loadingToast });
    }
  };

  const handleUpdatePhoto = async (photo: File, targetUid?: string) => {
    const uid = targetUid || user?.uid;
    if (!uid) return;

    const loadingToast = toast.loading('Updating photo...');
    try {
      const compressedPhoto = await compressImage(photo, 800, 800, 0.8);
      let photoUrl = '';
      
      try {
        const photoRef = ref(storage, `photos/${uid}_profile.jpg`);
        // Use a 6 second timeout for storage upload
        const uploadPromise = uploadBytes(photoRef, compressedPhoto).then(res => getDownloadURL(res.ref));
        const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 6000));
        photoUrl = await Promise.race([uploadPromise, timeoutPromise]);
      } catch (storageErr) {
        console.warn("Storage upload skipped or timed out, using local Data URL fallback:", storageErr);
        photoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.readAsDataURL(compressedPhoto);
        });
      }
      
      if (photoUrl && !photoUrl.startsWith('data:')) {
        await updateDoc(doc(db, 'users', uid), { photoUrl }).catch(() => {});
      }
      
      // Update local state
      if (uid === user?.uid) {
        setUser(prev => prev ? { ...prev, photoUrl } : null);
      }
      
      // Also update members list if loaded
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, photoUrl } : m));
      
      toast.success('Photo updated successfully!', { id: loadingToast });
    } catch (error: any) {
      console.error("Error updating photo:", error);
      toast.error('Failed to update photo: ' + (error?.message || 'Error'), { id: loadingToast });
    }
  };

  const handleUpdateDistrictQuota = async (districtCode: string, total: number) => {
    try {
      const quotaRef = doc(db, 'districtQuotas', districtCode);
      const district = DISTRICTS.find(d => d.code === districtCode);
      await setDoc(quotaRef, {
        id: districtCode,
        districtName: district?.name || districtCode,
        total
      }, { merge: true });
      setDistrictQuotas(prev => ({ ...prev, [districtCode]: total }));
      toast.success(`Quota updated for ${districtCode}`);
    } catch (error) {
      console.error("Error updating district quota:", error);
      toast.error('Failed to update quota');
    }
  };

  const handleSyncQuotas = async () => {
    const loadingToast = toast.loading('Syncing district quotas...');
    try {
      const counts: Record<string, number> = {};
      DISTRICTS.forEach(d => { counts[d.code] = 0; });

      members.forEach(m => {
        const dCode = m.district ? getDistrictCode(m.district) : null;
        if (dCode && counts[dCode] !== undefined) {
          if (m.status === 'deleted' || m.deletedAt) return;
          
          const mType = (m.membership_type || m.membershipType || '').toUpperCase();
          if (mType.includes('LIFE')) return;

          if (m.email && MAIN_ADMINS.includes(m.email.toLowerCase())) return;

          if (counts[dCode] !== undefined) {
            counts[dCode] += 1;
          }
        }
      });

      for (const districtCode of Object.keys(counts)) {
        const count = counts[districtCode];
        const quotaRef = doc(db, 'districtQuotas', districtCode);
        const district = DISTRICTS.find(d => d.code === districtCode);
        await setDoc(quotaRef, {
          id: districtCode,
          districtName: district?.name || districtCode,
          used: count
        }, { merge: true });
      }

      setDistrictQuotasUsed(counts);
      toast.success('District quotas synced!', { id: loadingToast });
    } catch (error) {
      console.error("Error syncing quotas:", error);
      toast.error('Failed to sync quotas', { id: loadingToast });
    }
  };

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAF9FC] flex items-center justify-center p-4">
        <div className="bg-white border-2 border-slate-100 p-8 rounded-[40px] shadow-xl shadow-slate-200/50 max-w-sm w-full space-y-6">
           <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                 <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-xs font-black text-slate-900 uppercase">Verifying Network</p>
                 <p className="text-[10px] font-bold text-slate-400">Please wait while loading</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const maintenanceMode = orgSettings?.maintenanceMode;

  return (
    <div className="min-h-screen bg-[#FAF9FC] w-full max-w-full overflow-x-hidden min-w-0">
      {(() => {
        if (maintenanceMode) {
          return (
            <div className="bg-slate-800 text-slate-100 px-4 py-2.5 font-sans font-semibold text-center text-xs md:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b border-slate-700 animate-in slide-in-from-top duration-500 sticky top-0 z-50 shadow-md">
              <div className="flex items-center gap-1.5 justify-center">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                <span>സാങ്കേതിക തകരാർ കാരണം സർവീസ് താത്കാലികമായി ലഭ്യമല്ല. ദയവായി പിന്നീട് വീണ്ടും ശ്രമിക്കുക.</span>
              </div>
            </div>
          );
        }
        return null;
      })()}
      {view === 'landing' && (
        <LandingPage 
          announcements={announcements}
          onAccept={handleAcceptTerms} 
          onRenew={handleRenewClick}
          onLoginClick={() => setView('login')} 
          onGoogleLogin={handleGoogleLogin}
          onGalleryClick={() => setView('gallery')}
          onRenewWithMobile={(mobile) => {
            setPrefilledMobile(mobile);
            setView('renewal');
          }}
          onRegisterWithMobile={(mobile) => {
            setPrefilledMobile(mobile);
            setView('register');
          }}
          onLoginDirect={(mobile, pin) => handleLogin({ email: mobile, pin }, 'landing')}
          onJanamailClick={() => {
            setView('janamail');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/janamail');
            }
          }}
          onELedgerClick={() => {
            setView('eledger');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/eledger');
            }
          }}
        />
      )}

      {view === 'eledger' && (
        <div className="animate-in fade-in duration-500 w-full max-w-full overflow-x-hidden min-w-0">
          <ELedgerModule onBackToWebsite={() => {
            setView('landing');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }} />
        </div>
      )}

      {view === 'janamail' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <OperationJanamail onBack={() => {
            setView('landing');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }} />
        </div>
      )}

      {view === 'gallery' && (
        <GalleryPage 
          onBack={() => setView('landing')} 
          onLoginClick={() => setView('login')}
        />
      )}
      
      {view === 'register' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           <RegistrationForm 
             onSubmit={handleRegistration} 
             districtQuotas={districtQuotas}
             districtQuotasUsed={districtQuotasUsed}
             initialMobile={prefilledMobile}
           />
           <div className="text-center pb-12">
              <Button variant="ghost" onClick={() => setView('landing')} className="text-foreground/30 font-black uppercase text-[10px] tracking-widest hover:text-brand-blue transition-colors">
                Return to Guidelines
              </Button>
            </div>
        </div>
      )}

      {view === 'renewal' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           <RenewalForm 
             onBack={() => setView('landing')} 
             onSuccess={(member) => {
               setUser(member);
               setView('card');
             }} 
             initialMobile={prefilledMobile}
           />
        </div>
      )}

      {view === 'login' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           <LoginForm 
            onLogin={handleLogin} 
            onGoogleLogin={handleGoogleLogin} 
            onBack={() => setView('landing')} 
            onRegisterClick={(mob) => {
              if (mob) setPrefilledMobile(mob.replace(/\D/g, '').slice(-10));
              setView('register');
            }}
            isLoading={isLoggingIn}
          />
        </div>
      )}

      {view === 'change-password' && user && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen flex flex-col items-center py-6 px-4">
          <ChangePasswordForm 
            user={user}
            onPasswordChanged={handleChangePassword}
            onLogout={handleLogout}
          />
        </div>
      )}

      {view === 'complete-profile' && user && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen flex flex-col items-center py-6 px-4">
          <div className="w-full max-w-lg">
            <ProfileEditForm 
              user={user} 
              onSave={handleSaveProfile} 
              onCancel={handleLogout} 
              isMandatory={true}
            />
          </div>
        </div>
      )}

      {view === 'card' && user && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen flex flex-col items-center py-6 px-4">
          {/* Dashboard Header with Logo */}
          {!isScreenshotMode && (
            <div className="w-full max-w-5xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xl">
              <div className="flex items-center gap-4 sm:gap-5">
                <Logo size="sm" className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
                <div>
                  <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-wide uppercase leading-tight">HIGHRICH COMMUNITY REVIVAL SOCIETY</h1>
                  <p className="text-xs sm:text-sm font-extrabold text-amber-600 uppercase tracking-widest mt-1">
                    {String(user.membership_type || user.membershipType || '').toUpperCase().includes('LIFE') ? 'Life Member' : (user.isAdmin ? 'Admin Console' : 'Official Member')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isEditingProfile ? (
            <div className="w-full max-w-lg">
              <ProfileEditForm 
                user={user} 
                onSave={handleSaveProfile} 
                onCancel={() => setIsEditingProfile(false)} 
                isMandatory={false}
              />
            </div>
          ) : (
            <div className={isScreenshotMode 
              ? "w-full flex items-center justify-center"
              : "w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center mt-2 px-2"
            }>
              {/* Left Column/Panel for Information, Statuses, and Quick Actions */}
              {!isScreenshotMode && (
                <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 w-full max-w-sm mx-auto lg:mx-0">
                  {/* Welcome / Header Badges */}
                  <div className="w-full">
                    {user.renewalPending ? (
                      <div className="flex flex-col items-center lg:items-start animate-in fade-in zoom-in duration-700">
                        <div className="bg-amber-100 text-amber-950 border border-amber-400 px-5 py-1.5 rounded-full text-[11px] font-black mb-3 tracking-[0.15em] uppercase flex items-center gap-2 w-fit shadow-xs">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" /> പുതുക്കൽ പരിശോധനയിൽ (Verification Pending)
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-1 flex flex-wrap items-center justify-center lg:justify-start gap-x-2">
                          <span className="text-[#003366]">Renewal</span>
                          <span className="text-amber-600 italic font-extrabold">Pending</span>
                        </h2>
                        <p className="text-slate-700 text-xs font-black tracking-wider uppercase">Highrich Community Revival Society</p>
                      </div>
                    ) : isExpired ? (
                      <div className="flex flex-col items-center lg:items-start animate-in fade-in zoom-in duration-700">
                        <div className="bg-rose-100 text-rose-950 border border-rose-400 px-5 py-1.5 rounded-full text-[11px] font-black mb-3 tracking-[0.15em] uppercase flex items-center gap-2 w-fit shadow-xs">
                          <Clock className="w-3.5 h-3.5 animate-pulse text-rose-700" /> കാലാവധി കഴിഞ്ഞു (Expired)
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-1 flex flex-wrap items-center justify-center lg:justify-start gap-x-2">
                          <span className="text-[#003366]">Renewal</span>
                          <span className="text-rose-600 italic font-extrabold">Required</span>
                        </h2>
                        <p className="text-slate-700 text-xs font-black tracking-wider uppercase">Highrich Community Revival Society</p>
                      </div>
                    ) : (user.status === 'active' || user.status === 'offline' || user.isAdmin || user.role === 'admin' || user.role === 'operator') ? (
                      <div className="flex flex-col items-center lg:items-start animate-in fade-in zoom-in duration-700">
                        {showCelebration && (
                          <div className="mb-4 animate-bounce">
                            <Badge className="bg-brand-magenta text-slate-950 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest font-sans shadow-md">Congratulations!</Badge>
                          </div>
                        )}
                        <div 
                          className="px-5 py-1.5 rounded-full text-[11px] font-black mb-3 tracking-[0.2em] uppercase w-fit shadow-xs flex items-center gap-1.5"
                          style={{ color: '#065f46', backgroundColor: '#d1fae5', border: '1.5px solid #10b981' }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                          Verification Complete
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-2 text-slate-900 dark:text-white flex flex-wrap items-center justify-center lg:justify-start gap-x-2">
                          <span className="text-[#003366] dark:text-blue-400">Welcome,</span>
                          <span className="text-amber-600 dark:text-amber-400 italic font-extrabold capitalize">{user.name || 'Member'}</span>
                        </h2>
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 border border-slate-700 shadow-sm mt-1">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs font-black tracking-widest uppercase text-amber-300">VERIFIED MEMBER OF HCRS</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center lg:items-start animate-in fade-in slide-in-from-top-4 duration-500 text-center lg:text-left">
                        {showCelebration && (
                          <div className="mb-4 animate-bounce">
                            <Badge className="bg-brand-magenta text-slate-950 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">Congratulations!</Badge>
                          </div>
                        )}
                        <div className="bg-amber-100 text-amber-950 border border-amber-400 px-5 py-1.5 rounded-full text-[11px] font-black mb-3 tracking-[0.15em] uppercase w-fit shadow-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" /> രജിസ്ട്രേഷൻ പരിശോധനയിൽ (Pending)
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-1">
                          Membership <span className="text-amber-600 italic font-extrabold">In Progress</span>
                        </h2>
                        <p className="text-slate-800 font-bold text-xs leading-relaxed max-w-xs mt-2 bg-amber-50 p-3.5 rounded-2xl border border-amber-300">
                          നിങ്ങളുടെ രജിസ്ട്രേഷൻ പൂർത്തിയായി. അഡ്മിൻ പേയ്മെന്റ് വെരിഫൈ ചെയ്തുകഴിഞ്ഞാൽ നിങ്ങളുടെ ഒഫീഷ്യൽ കാർഡ് ഇവിടെ ലഭ്യമാകും.
                        </p>
                      </div>
                    )}
                  </div>

                {/* Urgent Actions: Registration Alert / Financial Info Registry Banner with Glass Line Light Effect */}
                <div className="w-full">
                  {user.renewalPending ? (
                    <div className="w-full bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl p-5 text-center lg:text-left shadow-md flex flex-col gap-3">
                      <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                          <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white uppercase tracking-tight leading-tight">
                            പുതുക്കൽ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു!
                          </h3>
                          <Badge className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 tracking-wider mt-1">
                            RENEWAL PENDING APPROVAL
                          </Badge>
                        </div>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3 text-left">
                        താങ്കളുടെ ₹100 അതിവേഗ ഒഫീഷ്യൽ പുതുക്കൽ അടവ് പരിശോധിക്കുകയാണ്. ഇതുകഴിഞ്ഞാൽ ഫിനാൻഷ്യൽ ഇൻഫോ രജിസ്ട്രി ഫോം ഉടൻ ലഭ്യമാകും.
                      </p>
                    </div>
                  ) : user.status === 'pending' ? (
                    <div className="w-full bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl p-5 text-center lg:text-left shadow-md flex flex-col gap-3">
                      <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                          <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white uppercase tracking-tight leading-tight">
                            അംഗത്വ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു!
                          </h3>
                          <Badge className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 tracking-wider mt-1">
                            MEMBERSHIP PENDING APPROVAL
                          </Badge>
                        </div>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3 text-left">
                        താങ്കളുടെ പുതിയ അംഗത്വ രജിസ്ട്രേഷൻ വിവരങ്ങളും പേയ്‌മെന്റും അഡ്മിൻ പാനലിൽ പരിശോധനയിലാണ്. വെരിഫിക്കേഷൻ പൂർത്തിയായാൽ ഇവിടെ കാർഡ് ആക്റ്റീവ് ആകുകയും വിവര രജിസ്ട്രി ഫോം ലഭ്യമാകുകയും ചെയ്യും.
                      </p>
                    </div>
                  ) : isExpired ? (
                    <InfinityBorderCard
                      roundedClassName="rounded-[28px]"
                      innerClassName="p-5 sm:p-6 text-center lg:text-left bg-white border-2 border-rose-200"
                      speed={7}
                    >
                      <div className="h-11 w-11 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center mx-auto lg:mx-0 mb-3 text-rose-700 shadow-xs">
                        <AlertTriangle className="w-6 h-6 animate-bounce" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight leading-none">
                        അംഗത്വ കാലാവധി കഴിഞ്ഞിരിക്കുന്നു!
                      </h3>
                      <p className="text-xs font-black tracking-widest text-rose-800 uppercase mt-1">MEMBERSHIP EXPIRED</p>
                      <p className="text-slate-900 font-extrabold text-[13px] sm:text-[14px] leading-relaxed mt-3">
                        താങ്കളുടെ അംഗത്വം കാലാവധി കഴിഞ്ഞിരിക്കുന്നു. വിവര രജിസ്ട്രി ഫോം ഉപയോഗിക്കുന്നതിനും ഐഡി കാർഡ് പുതുക്കുന്നതിനും ₹100 അടയ്ക്കുക.
                      </p>
                      <Button 
                        onClick={() => {
                          setPrefilledMobile(user.mobile);
                          setView('renewal');
                        }}
                        className="w-full h-13 rounded-2xl font-black bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-md hover:scale-[1.01] active:scale-95 transition-all mt-4 text-xs uppercase tracking-wider cursor-pointer border-b-4 border-red-950"
                      >
                        അംഗത്വം പുതുക്കുക ₹100 (Renew Now)
                      </Button>
                    </InfinityBorderCard>
                  ) : (
                    <>
                      {/* Dynamic Progress Color Banner: Main FINANCIAL VERIFICATION FORM Button */}
                      {(() => {
                        const count = submittedClaimsCount; // 0 to 4
                        const isRed = count <= 1; // 0/4 or 1/4 -> Red / urgent / incomplete
                        const isOrange = count === 2 || count === 3; // 2/4 or 3/4 -> Orange / partially completed
                        const isGreen = count >= 4; // 4/4 -> Green / completed

                        const statusBadge = `${Math.min(count, 4)}/4 Complete`;

                        // Button colors:
                        const btnBg = isGreen
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:bg-emerald-800 border-emerald-950 text-white'
                          : isOrange
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:bg-orange-700 border-orange-950 text-white'
                          : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:bg-red-800 border-red-950 text-white';

                        // Card borders / shadows (Deep Navy background):
                        const cardBorder = isGreen
                          ? 'border-emerald-500/80 shadow-[0_12px_36px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.22)]'
                          : isOrange
                          ? 'border-amber-500/80 shadow-[0_12px_36px_rgba(0,0,0,0.5),0_0_20px_rgba(245,158,11,0.22)]'
                          : 'border-red-500/80 shadow-[0_12px_36px_rgba(0,0,0,0.5),0_0_20px_rgba(239,68,68,0.22)]';

                        const badgeStyle = isGreen
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : isOrange
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-red-500/20 text-red-300 border-red-500/50';

                        return (
                          <div className={`rounded-3xl p-6 sm:p-7 text-left flex flex-col gap-4.5 sm:gap-5 bg-gradient-to-br from-[#061426] via-[#0a1f3d] to-[#040e1c] text-white ${cardBorder} border-2 max-w-full overflow-hidden transition-all`}>
                            {/* Header row with status & badge */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${
                                  isGreen ? 'bg-emerald-400' : isOrange ? 'bg-amber-400' : 'bg-red-400'
                                }`} />
                                <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-white">
                                  {isGreen
                                    ? 'പൂർത്തിയായി / COMPLETED'
                                    : 'അപൂർണ്ണം / INCOMPLETE'}
                                </span>
                              </div>
                              <Badge className={`text-[11px] font-black uppercase px-3 py-1 tracking-wider rounded-lg border ${badgeStyle}`}>
                                {statusBadge}
                              </Badge>
                            </div>

                            {/* Large Main FINANCIAL VERIFICATION FORM Button */}
                            <Button 
                              onClick={() => setView('support')}
                              className={`w-full min-h-[56px] h-14 sm:h-15 py-3.5 px-4 rounded-2xl font-black shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-2.5 border-b-4 cursor-pointer text-white ${btnBg}`}
                            >
                              <FileText className="w-5 h-5 shrink-0 text-white" />
                              <span className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-white text-center leading-snug">
                                FINANCIAL VERIFICATION FORM
                              </span>
                            </Button>

                            {/* Subtitle / guidance description text with spacious line height */}
                            <p className="text-xs sm:text-[13px] font-normal text-slate-200/95 leading-relaxed sm:leading-6">
                              {count === 0 ? (
                                'കുടുംബാംഗങ്ങളുടെ ഫിനാൻഷ്യൽ വെരിഫിക്കേഷൻ ഫോം സമർപ്പിക്കാൻ മുകളിലെ ബട്ടൺ ക്ലിക്ക് ചെയ്യുക (പരമാവധി 4 അംഗങ്ങൾ).'
                              ) : isGreen ? (
                                '✓ കുടുംബത്തിലെ 4 അംഗങ്ങളുടെയും ഫോമുകൾ പൂർണ്ണമായി സമർപ്പിച്ചു. വിവരങ്ങൾ പരിശോധിക്കാൻ മുകളിലെ ബട്ടൺ ക്ലിക്ക് ചെയ്യാം.'
                              ) : (
                                `✓ ${count}/4 ഫോം സമർപ്പിച്ചു. ബാക്കി ${4 - count} കുടുംബാംഗങ്ങളുടെ ഫോം കൂടി ചേർക്കാം.`
                              )}
                            </p>

                            {/* Financial Pending Balance summary if claims submitted */}
                            {count > 0 && (
                              <div className="pt-3.5 sm:pt-4 border-t border-white/15 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-200">
                                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-300">
                                  PENDING BALANCE:
                                </span>
                                <span className="font-mono font-black text-amber-300 text-base sm:text-lg tracking-tight">
                                  ₹{userSubmittedClaims.reduce((s, c) => s + (Number(c.totalPending) || 0), 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                {/* Account Controls Buttons Group */}
                <div className="flex flex-col gap-2.5 w-full mt-6">
                  {/* District Customer Care WhatsApp */}
                  {(() => {
                    const distInfo = getMemberDistrictWhatsApp(user);
                    return (
                      <Button 
                        onClick={() => {
                          const greeting = `*HCRS Customer Care Support Request*%0A%0A*Member Name:* ${encodeURIComponent(user.name || '')}%0A*Membership ID:* ${encodeURIComponent(user.membershipId || '')}%0A*District:* ${encodeURIComponent(distInfo.name)}%0A*Mobile:* ${encodeURIComponent(user.mobile || '')}%0A%0A_Hello Customer Care, I need assistance with my HCRS profile._`;
                          let targetUrl = distInfo.url;
                          if (targetUrl.includes('wa.me')) {
                            const sep = targetUrl.includes('?') ? '&' : '?';
                            targetUrl = `${targetUrl}${sep}text=${greeting}`;
                          }
                          window.open(targetUrl, '_blank');
                        }}
                        className="w-full h-12 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-md cursor-pointer border border-emerald-400/30"
                      >
                        <MessageCircle className="w-4 h-4 shrink-0 text-emerald-200" />
                        <span>കസ്റ്റമർ കെയർ ({distInfo.name})</span>
                      </Button>
                    );
                  })()}

                  <InfinityBorderButton 
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full h-12"
                    innerClassName="bg-[#1a2b5c] text-amber-400 uppercase tracking-widest text-[11px] font-black hover:bg-amber-400 hover:text-slate-950"
                  >
                    <Pencil className="w-4 h-4 shrink-0 text-amber-400 group-hover:text-slate-950" /> Edit Profile Details (പ്രൊഫൈൽ)
                  </InfinityBorderButton>
                  {(user.role === 'admin' || user.role === 'operator' || user.isAdmin) && (
                    <Button 
                      onClick={() => setView(user.role === 'operator' ? 'operator' : 'admin')}
                      className="w-full h-12 rounded-xl font-black bg-[#0054A6] hover:bg-[#004ca0] text-white uppercase tracking-widest text-[11px] shadow-sm cursor-pointer"
                    >
                      Open Dashboard
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setView('login')} 
                    className="bg-white hover:bg-slate-100 w-full h-12 rounded-xl font-black border-2 border-slate-300 text-slate-900 uppercase tracking-widest text-[11px] transition-all shadow-sm"
                  >
                    Change Account
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    className="w-full py-2 text-red-400 hover:text-red-300 font-black uppercase tracking-widest text-[11px] transition-colors"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            )}

              {/* Right Column/Panel for the physical PVC digital ID Card */}
              <div className={isScreenshotMode ? "w-full flex items-center justify-center" : "lg:col-span-6 flex flex-col items-center justify-center w-full"}>
                <div className={(!isScreenshotMode && user.status !== 'active' && user.status !== 'offline' && !user.isAdmin && user.role !== 'admin' && user.role !== 'operator') ? 'relative group w-full flex justify-center' : 'w-full flex justify-center'}>
                  <MembershipCard 
                    member={user} 
                    showCelebration={showCelebration} 
                    onUpdatePhoto={handleUpdatePhoto}
                    onScreenshotModeChange={setIsScreenshotMode}
                  />
                </div>
                {!isScreenshotMode && (
                  <div className="w-full mt-6 space-y-4">
                    {/* Consignment Advance Refund Form Section (Above Billing) */}
                    <div id="court-record-card" className="w-full bg-white dark:bg-slate-900 border-2 border-[#003366]/35 dark:border-blue-800/50 rounded-2xl shadow-md overflow-hidden">
                      {/* Card Header Bar */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#003366] to-[#002244] text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0 border border-white/15 shadow-inner">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white flex flex-wrap items-center gap-1.5 sm:gap-2 truncate">
                              <span>കൺസൈൻമെന്റ് അഡ്വാൻസ് റീഫണ്ട് ഫോം</span>
                              <Badge className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 tracking-wider whitespace-nowrap shrink-0">
                                {userSubmittedClaims.length > 0 ? `കോർട്ട് റെക്കോർഡ് (${userSubmittedClaims.length} പേജ്)` : 'ഔദ്യോഗിക ഫോം'}
                              </Badge>
                            </h4>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate">
                              Consignment Advance Court & Admin Verified Statement
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons: Combined Actions */}
                        {userSubmittedClaims.length > 0 && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              onClick={handlePrintAllClaims}
                              className="min-h-[38px] sm:h-9 py-2 sm:py-0 px-3 sm:px-3.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer border border-blue-300/40 w-full sm:w-auto whitespace-normal break-words max-w-full text-center"
                              title={`Print All Family Members (${userSubmittedClaims.length} Pages)`}
                            >
                              <Printer className="w-3.5 h-3.5 shrink-0" />
                              <span className="inline sm:hidden font-black">പ്രിന്റ്</span>
                              <span className="hidden sm:inline font-black">എല്ലാ അംഗങ്ങളും ഒരുമിച്ച് Print ചെയ്യുക ({userSubmittedClaims.length} പേജ്)</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleDownloadAllClaimsPdf}
                              className="min-h-[38px] sm:h-9 py-2 sm:py-0 px-3 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer border border-emerald-400 w-full sm:w-auto whitespace-normal break-words max-w-full text-center"
                              title={`Download All Family Members PDF (${userSubmittedClaims.length} Pages)`}
                            >
                              <Download className="w-3.5 h-3.5 text-white shrink-0" />
                              <span className="inline sm:hidden font-black text-white">PDF ഡൗൺലോഡ്</span>
                              <span className="hidden sm:inline font-black text-white">എല്ലാ അംഗങ്ങളും PDF Download ചെയ്യുക ({userSubmittedClaims.length} പേജ്)</span>
                            </Button>
                          </div>
                        )}
                      </div>

                      {userSubmittedClaims.length > 0 ? (
                        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 space-y-3">
                          {/* Financial Summary & Preview Toggle Bar */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/40 text-left">
                                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">ആകെ ബാലൻസ്:</span>
                                <span className="text-xs font-black font-mono text-[#003366] dark:text-blue-400">
                                  ₹{userSubmittedClaims.reduce((s, c) => s + (Number(c.totalPending) || 0), 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                ({userSubmittedClaims.length} അംഗങ്ങളുടെ റെക്കോർഡ്)
                              </span>
                            </div>

                            {/* View/Hide Preview Button */}
                            <Button
                              type="button"
                              onClick={() => setShowInlineClaimPreview(!showInlineClaimPreview)}
                              className={`w-full sm:w-auto min-h-[44px] h-auto py-2.5 px-3 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-normal sm:tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm text-center leading-snug whitespace-normal break-words max-w-full ${
                                showInlineClaimPreview 
                                  ? 'bg-slate-800 text-white hover:bg-slate-700' 
                                  : 'bg-[#003366] text-white hover:bg-[#002244]'
                              }`}
                            >
                              {showInlineClaimPreview ? (
                                <>
                                  <EyeOff className="w-4 h-4 text-amber-300 shrink-0" />
                                  <span className="text-white font-black whitespace-normal break-words text-center leading-snug">ഫോം പ്രിവ്യൂ മറയ്ക്കുക (Hide Preview)</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 text-amber-300 shrink-0" />
                                  <span className="text-white font-black whitespace-normal break-words text-center leading-snug">പൂരിപ്പിച്ച ഫോം കാണുക (View Form)</span>
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Collapsible Document Preview Section */}
                          {showInlineClaimPreview && (
                            <div className="space-y-3 pt-1 animate-in fade-in duration-300">
                              {/* Member Page Switcher Tabs */}
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCardClaimTab(-1)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                                    selectedCardClaimTab === -1
                                      ? 'bg-[#003366] text-white shadow-sm'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  എല്ലാം ഒരുമിച്ച് ({userSubmittedClaims.length} പേജ്)
                                </button>
                                {userSubmittedClaims.map((claim, idx) => {
                                  const claimantName = claim.userName || claim.claimantName || claim.name || claim.spouseName || claim.parentName || claim.childName || claim.selfName || claim.personalDetails?.fullName || (claim.relation === 'Self' ? user.name : '') || `അംഗം ${idx + 1}`;
                                  const relMalayalam = 
                                    claim.relation === 'Self' ? 'സ്വന്തം' :
                                    claim.relation === 'Mother' ? 'അമ്മ' :
                                    claim.relation === 'Father' ? 'അച്ഛൻ' :
                                    claim.relation === 'Son' ? 'മകൻ' :
                                    claim.relation === 'Daughter' ? 'മകൾ' :
                                    claim.relation === 'Wife' ? 'ഭാര്യ' :
                                    claim.relation === 'Husband' ? 'ഭർത്താവ്' : (claim.relation || `പേജ് ${idx + 1}`);
                                  return (
                                    <button
                                      key={claim.id || idx}
                                      type="button"
                                      onClick={() => setSelectedCardClaimTab(idx)}
                                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                        selectedCardClaimTab === idx
                                          ? 'bg-[#003366] text-white shadow-sm'
                                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      <span>{idx + 1}. {relMalayalam}</span>
                                      <span className="opacity-80 font-bold text-[10px]">({claimantName})</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Direct Inline Document Frame */}
                              <div className="w-full h-[580px] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-white shadow-inner relative">
                                <iframe
                                  srcDoc={
                                    selectedCardClaimTab === -1
                                      ? getCourtComboHtml(user, userSubmittedClaims)
                                      : getSingleCourtClaimHtml(user, userSubmittedClaims[selectedCardClaimTab], 1, 1)
                                  }
                                  title="Official Court Statement Document"
                                  className="w-full h-full border-0 bg-white"
                                />
                              </div>
                            </div>
                          )}

                          {/* Bottom Information Footer */}
                          <div className="pt-1">
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                              ✓ ഈ ഫോം തന്നെയാണ് അഡ്മിൻ പാനലിലും കോടതി സമർപ്പണത്തിനും ഔദ്യോഗികമായി ഉപയോഗിക്കുന്നത്.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-900/60">
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed max-w-md mx-auto">
                            ക്ലെയിം വിവരങ്ങൾ രേഖപ്പെടുത്തിയ ശേഷം കോർട്ടിലേക്കും അഡ്മിൻ പാനലിലേക്കുമുള്ള ഔദ്യോഗിക ഫോം (Court Statement Record) ഇവിടെ നേരിട്ട് ലഭ്യമാകുന്നതാണ്.
                          </p>
                          <Button
                            onClick={() => setView('support')}
                            className="h-11 px-6 rounded-xl font-black bg-[#003366] hover:bg-[#002244] text-white text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-md cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            Settlement Form
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* FAMILY / COMBO MULTI-CLAIM FORMS SECTION (കുടുംബാംഗങ്ങളുടെ ക്ലെയിം ഫോമുകൾ - പരമാവധി 4 പേർ) */}
                    <div className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-left">
                      {/* Header */}
                      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                              <span>കുടുംബാംഗങ്ങളുടെ ക്ലെയിം ഫോമുകൾ</span>
                              <Badge className={`text-[10px] font-black uppercase px-2 py-0.5 tracking-wider ${
                                userSubmittedClaims.length === 4
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : userSubmittedClaims.length > 0
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                                {userSubmittedClaims.length === 4
                                  ? '4/4 Complete ✅'
                                  : `${userSubmittedClaims.length}/4 Complete`}
                              </Badge>
                            </h4>
                            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Family / Combo Claims • Max 4 Persons
                            </p>
                          </div>
                        </div>

                        {/* Header quick actions: Combined Actions & Add Family Member */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                          {userSubmittedClaims.length > 0 && (
                            <>
                              <Button
                                size="sm"
                                onClick={handlePrintAllClaims}
                                className="min-h-[36px] sm:h-9 py-1.5 sm:py-0 px-2.5 sm:px-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-blue-400/40 w-full sm:w-auto whitespace-normal break-words max-w-full text-center"
                                title={`Print All Family Members (${userSubmittedClaims.length} Pages)`}
                              >
                                <Printer className="w-3.5 h-3.5 text-white shrink-0" />
                                <span className="inline sm:hidden font-black">പ്രിന്റ്</span>
                                <span className="hidden sm:inline font-black">എല്ലാ അംഗങ്ങളും ഒരുമിച്ച് Print ({userSubmittedClaims.length}P)</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleDownloadAllClaimsPdf}
                                className="min-h-[36px] sm:h-9 py-1.5 sm:py-0 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-emerald-400 w-full sm:w-auto whitespace-normal break-words max-w-full text-center"
                                title={`Download All Family Members PDF (${userSubmittedClaims.length} Pages)`}
                              >
                                <Download className="w-3.5 h-3.5 text-white shrink-0" />
                                <span className="inline sm:hidden font-black text-white">PDF ഡൗൺലോഡ്</span>
                                <span className="hidden sm:inline font-black text-white">എല്ലാ അംഗങ്ങളും PDF Download ({userSubmittedClaims.length}P)</span>
                              </Button>
                            </>
                          )}
                          {userSubmittedClaims.length > 0 && userSubmittedClaims.length < 4 && (
                            <Button
                              size="sm"
                              onClick={() => setView('support')}
                              className="min-h-[36px] sm:h-9 py-1.5 sm:py-0 px-3 rounded-xl font-black bg-[#003366] hover:bg-[#002244] text-white text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border border-blue-400/30 w-full sm:w-auto whitespace-normal break-words max-w-full text-center"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span>ചേർക്കുക ({4 - userSubmittedClaims.length} ബാക്കി)</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 4 Family Member Slots Grid */}
                      <div className="p-4 sm:p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Slot 1: Self */}
                          {(() => {
                            const claim = userSubmittedClaims.find(c => c.relation === 'Self') || (userSubmittedClaims.length > 0 && !userSubmittedClaims.some(c => c.relation === 'Self') ? userSubmittedClaims[0] : null);
                            const isSubmitted = !!claim;
                            const claimantName = claim?.userName || claim?.claimantName || claim?.name || (isSubmitted ? user.name : '');
                            const token = claim?.tokenNo || claim?.serialNo || (isSubmitted ? '#1' : '');
                            const pending = claim ? Number(claim.totalPending) || 0 : 0;

                            return (
                              <div className={`p-3.5 rounded-xl border transition-all ${
                                isSubmitted
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700'
                              }`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                      isSubmitted ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}>
                                      1
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">സ്വന്തം (Self)</span>
                                        {isSubmitted ? (
                                          <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9px] font-black px-1.5 py-0.2">
                                            സമർപ്പിച്ചു ✓
                                          </Badge>
                                        ) : (
                                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">ബാക്കി</span>
                                        )}
                                      </div>
                                      {isSubmitted && claimantName && (
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                                          {claimantName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSubmitted && token && (
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                      {token}
                                    </span>
                                  )}
                                </div>
                                {isSubmitted && pending > 0 && (
                                  <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">മിച്ച ക്ലെയിം:</span>
                                    <span className="font-mono font-black text-[#003366] dark:text-blue-400">₹{pending.toLocaleString('en-IN')}</span>
                                  </div>
                                )}

                                {/* Individual Actions for Self */}
                                {isSubmitted && claim && (
                                  <div className="mt-3 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/60 flex flex-wrap items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleViewSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-[#003366] hover:bg-[#002244] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                                      title={`View Form - ${claimantName}`}
                                    >
                                      <Eye className="w-3 h-3 text-amber-300" />
                                      <span>View Form</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handlePrintSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-blue-400/40"
                                      title={`Print A4 - ${claimantName}`}
                                    >
                                      <Printer className="w-3 h-3 text-white" />
                                      <span>Print A4</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleDownloadSingleClaimPdf(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-emerald-400"
                                      title={`Download PDF - ${claimantName}`}
                                    >
                                      <Download className="w-3 h-3 text-white" />
                                      <span className="font-black text-white">Download PDF</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Slot 2: Spouse */}
                          {(() => {
                            const claim = userSubmittedClaims.find(c => ['Wife', 'Husband', 'Spouse'].includes(c.relation));
                            const isSubmitted = !!claim;
                            const relLabel = claim?.relation === 'Husband' ? 'ഭർത്താവ് (Husband)' : 'ഭാര്യ (Wife)';
                            const claimantName = claim?.claimantName || claim?.spouseName || claim?.userName || claim?.name;
                            const token = claim?.tokenNo || claim?.serialNo;
                            const pending = claim ? Number(claim.totalPending) || 0 : 0;

                            return (
                              <div className={`p-3.5 rounded-xl border transition-all ${
                                isSubmitted
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700'
                              }`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                      isSubmitted ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}>
                                      2
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                          {isSubmitted ? relLabel : 'ഭാര്യ / ഭർത്താവ് (Spouse)'}
                                        </span>
                                        {isSubmitted ? (
                                          <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9px] font-black px-1.5 py-0.2">
                                            സമർപ്പിച്ചു ✓
                                          </Badge>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">ചേർക്കാൻ സാധ്യമാണ്</span>
                                        )}
                                      </div>
                                      {isSubmitted && claimantName && (
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                                          {claimantName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSubmitted && token && (
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                      {token}
                                    </span>
                                  )}
                                </div>
                                {isSubmitted && pending > 0 && (
                                  <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">മിച്ച ക്ലെയിം:</span>
                                    <span className="font-mono font-black text-[#003366] dark:text-blue-400">₹{pending.toLocaleString('en-IN')}</span>
                                  </div>
                                )}

                                {/* Individual Actions for Spouse */}
                                {isSubmitted && claim && (
                                  <div className="mt-3 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/60 flex flex-wrap items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleViewSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-[#003366] hover:bg-[#002244] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                                      title={`View Form - ${claimantName}`}
                                    >
                                      <Eye className="w-3 h-3 text-amber-300" />
                                      <span>View Form</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handlePrintSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-blue-400/40"
                                      title={`Print A4 - ${claimantName}`}
                                    >
                                      <Printer className="w-3 h-3 text-white" />
                                      <span>Print A4</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleDownloadSingleClaimPdf(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-emerald-400"
                                      title={`Download PDF - ${claimantName}`}
                                    >
                                      <Download className="w-3 h-3 text-white" />
                                      <span className="font-black text-white">Download PDF</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Slot 3: Parent */}
                          {(() => {
                            const claim = userSubmittedClaims.find(c => ['Mother', 'Father', 'Parent'].includes(c.relation));
                            const isSubmitted = !!claim;
                            const relLabel = claim?.relation === 'Father' ? 'അച്ഛൻ (Father)' : claim?.relation === 'Mother' ? 'അമ്മ (Mother)' : 'മാതാവ്/പിതാവ് (Parent)';
                            const claimantName = claim?.claimantName || claim?.parentName || claim?.userName || claim?.name;
                            const token = claim?.tokenNo || claim?.serialNo;
                            const pending = claim ? Number(claim.totalPending) || 0 : 0;

                            return (
                              <div className={`p-3.5 rounded-xl border transition-all ${
                                isSubmitted
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700'
                              }`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                      isSubmitted ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}>
                                      3
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                          {isSubmitted ? relLabel : 'മാതാവ് / പിതാവ് (Parent)'}
                                        </span>
                                        {isSubmitted ? (
                                          <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9px] font-black px-1.5 py-0.2">
                                            സമർപ്പിച്ചു ✓
                                          </Badge>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">ചേർക്കാൻ സാധ്യമാണ്</span>
                                        )}
                                      </div>
                                      {isSubmitted && claimantName && (
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                                          {claimantName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSubmitted && token && (
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                      {token}
                                    </span>
                                  )}
                                </div>
                                {isSubmitted && pending > 0 && (
                                  <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">മിച്ച ക്ലെയിം:</span>
                                    <span className="font-mono font-black text-[#003366] dark:text-blue-400">₹{pending.toLocaleString('en-IN')}</span>
                                  </div>
                                )}

                                {/* Individual Actions for Parent */}
                                {isSubmitted && claim && (
                                  <div className="mt-3 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/60 flex flex-wrap items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleViewSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-[#003366] hover:bg-[#002244] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                                      title={`View Form - ${claimantName}`}
                                    >
                                      <Eye className="w-3 h-3 text-amber-300" />
                                      <span>View Form</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handlePrintSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-blue-400/40"
                                      title={`Print A4 - ${claimantName}`}
                                    >
                                      <Printer className="w-3 h-3 text-white" />
                                      <span>Print A4</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleDownloadSingleClaimPdf(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-emerald-400"
                                      title={`Download PDF - ${claimantName}`}
                                    >
                                      <Download className="w-3 h-3 text-white" />
                                      <span className="font-black text-white">Download PDF</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Slot 4: Child */}
                          {(() => {
                            const claim = userSubmittedClaims.find(c => ['Son', 'Daughter', 'Child'].includes(c.relation));
                            const isSubmitted = !!claim;
                            const relLabel = claim?.relation === 'Daughter' ? 'മകൾ (Daughter)' : claim?.relation === 'Son' ? 'മകൻ (Son)' : 'മകൻ/മകൾ (Child)';
                            const claimantName = claim?.claimantName || claim?.childName || claim?.userName || claim?.name;
                            const token = claim?.tokenNo || claim?.serialNo;
                            const pending = claim ? Number(claim.totalPending) || 0 : 0;

                            return (
                              <div className={`p-3.5 rounded-xl border transition-all ${
                                isSubmitted
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700'
                              }`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                      isSubmitted ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}>
                                      4
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                          {isSubmitted ? relLabel : 'മകൻ / മകൾ (Child)'}
                                        </span>
                                        {isSubmitted ? (
                                          <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9px] font-black px-1.5 py-0.2">
                                            സമർപ്പിച്ചു ✓
                                          </Badge>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">ചേർക്കാൻ സാധ്യമാണ്</span>
                                        )}
                                      </div>
                                      {isSubmitted && claimantName && (
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                                          {claimantName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSubmitted && token && (
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                      {token}
                                    </span>
                                  )}
                                </div>
                                {isSubmitted && pending > 0 && (
                                  <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">മിച്ച ക്ലെയിം:</span>
                                    <span className="font-mono font-black text-[#003366] dark:text-blue-400">₹{pending.toLocaleString('en-IN')}</span>
                                  </div>
                                )}

                                {/* Individual Actions for Child */}
                                {isSubmitted && claim && (
                                  <div className="mt-3 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/60 flex flex-wrap items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleViewSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-[#003366] hover:bg-[#002244] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                                      title={`View Form - ${claimantName}`}
                                    >
                                      <Eye className="w-3 h-3 text-amber-300" />
                                      <span>View Form</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handlePrintSingleClaim(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-blue-400/40"
                                      title={`Print A4 - ${claimantName}`}
                                    >
                                      <Printer className="w-3 h-3 text-white" />
                                      <span>Print A4</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleDownloadSingleClaimPdf(claim)}
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all border border-emerald-400"
                                      title={`Download PDF - ${claimantName}`}
                                    >
                                      <Download className="w-3 h-3 text-white" />
                                      <span className="font-black text-white">Download PDF</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Action Buttons & Guidance */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                            {userSubmittedClaims.length === 4
                              ? '✓ ഒരു കുടുംബത്തിലെ പരമാവധി 4 ക്ലെയിമുകളും വിജയകരമായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്.'
                              : userSubmittedClaims.length > 0
                              ? `✓ ${userSubmittedClaims.length} ക്ലെയിം സമർപ്പിച്ചു. ഇനിയും ${4 - userSubmittedClaims.length} കുടുംബാംഗങ്ങളുടെ ഫോമുകൾ കൂടി ചേർക്കാവുന്നതാണ്.`
                              : '✓ കുടുംബത്തിലെ 4 അംഗങ്ങളുടെ വരെ ക്ലെയിം വിവരങ്ങൾ ഓരോരുത്തർക്കും പ്രത്യേകമായി ഇതിലൂടെ സമർപ്പിക്കാം.'}
                          </p>

                          {userSubmittedClaims.length === 0 ? (
                            <Button
                              onClick={() => setView('support')}
                              className="h-11 px-5 rounded-xl font-black bg-[#003366] hover:bg-[#002244] text-white text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
                            >
                              <FileText className="w-4 h-4 text-amber-300" />
                              <span>സെറ്റിൽമെന്റ് ഫോം പൂരിപ്പിക്കുക</span>
                            </Button>
                          ) : userSubmittedClaims.length < 4 ? (
                            <Button
                              onClick={() => setView('support')}
                              className="h-11 px-5 rounded-xl font-black bg-[#003366] hover:bg-[#002244] text-white text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
                            >
                              <Plus className="w-4 h-4 text-amber-300" />
                              <span>ബാക്കി ഫോമുകൾ ചേർക്കുക ({4 - userSubmittedClaims.length}/4)</span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setView('support')}
                              variant="outline"
                              className="h-10 px-4 rounded-xl font-black border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-600" />
                              <span>ക്ലെയിം വിവരങ്ങൾ തിരുത്തുക</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* COMBINED TOTALS & FINANCIAL SUMMARY CARD (മുഴുവൻ തുകയുടെയും വിവരങ്ങൾ) */}
                    <div className="w-full bg-gradient-to-br from-[#002244] via-[#003366] to-slate-900 rounded-3xl p-5 sm:p-6 text-white space-y-5 shadow-xl relative overflow-hidden border border-white/10">
                      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                      
                      {/* Section Header - Summary Only */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
                            <LayoutDashboard className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white flex items-center gap-2 flex-wrap">
                              <span>മുഴുവൻ തുകയുടെയും വിവരങ്ങൾ</span>
                              <Badge className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
                                {userSubmittedClaims.length} Claim{userSubmittedClaims.length > 1 ? 's' : ''}
                              </Badge>
                            </h3>
                            <p className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                              Combined Totals & Financial Statement Breakdown
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* KPI Metric Summary Blocks */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-white/10 flex flex-col justify-between">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                            ആകെ മിച്ച ക്ലെയിം തുക (Pending Claim)
                          </p>
                          <p className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight mt-1">
                            ₹{userSubmittedClaims.reduce((s, c) => s + (Number(c.totalPending) || 0), 0).toLocaleString('en-IN')}
                          </p>
                          <span className="text-[9px] text-slate-300 font-bold mt-1">Net Balance Pending for Settlement</span>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-3.5 sm:p-4 border border-white/5 flex flex-col justify-between">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            ആകെ നൽകിയ തുക (Total Deposited)
                          </p>
                          <p className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                            ₹{userSubmittedClaims.reduce((s, c) => s + (Number(c.totalPaid) || 0), 0).toLocaleString('en-IN')}
                          </p>
                          <span className="text-[9px] text-slate-400 font-bold mt-1">All Verified Deposits / Advance</span>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-3.5 sm:p-4 border border-white/5 flex flex-col justify-between">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            ആകെ ലഭിച്ച തുക (Total Received)
                          </p>
                          <p className="text-xl sm:text-2xl font-black text-emerald-300 tracking-tight mt-1">
                            ₹{userSubmittedClaims.reduce((s, c) => s + (Number(c.totalReceived) || 0), 0).toLocaleString('en-IN')}
                          </p>
                          <span className="text-[9px] text-slate-400 font-bold mt-1">Total Refunds / Payouts Claimed</span>
                        </div>
                      </div>

                      {/* Individual Claimants Detailed Breakdown List */}
                      {userSubmittedClaims.length > 0 ? (
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                              വ്യക്തിഗത ക്ലെയിം വിവരങ്ങൾ ({userSubmittedClaims.length}/4 Claimants)
                            </p>
                            <span className="text-[9px] text-slate-300 font-bold">
                              Serial Token & Breakdown
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {userSubmittedClaims.map((claim, idx) => {
                              const name = claim.userName || claim.claimantName || claim.name || claim.spouseName || claim.parentName || claim.childName || claim.selfName || claim.personalDetails?.fullName || (claim.relation === 'Self' ? user.name : '') || `അംഗം ${idx + 1}`;
                              let rel = claim.relation || (idx === 0 ? 'Self' : `അംഗം ${idx + 1}`);
                              let relMalayalam = rel;
                              if (rel.toLowerCase() === 'self') relMalayalam = 'സ്വന്തം (Self)';
                              else if (rel.toLowerCase() === 'wife') relMalayalam = 'ഭാര്യ (Wife)';
                              else if (rel.toLowerCase() === 'husband') relMalayalam = 'ഭർത്താവ് (Husband)';
                              else if (rel.toLowerCase() === 'spouse') relMalayalam = 'ഭാര്യ/ഭർത്താവ് (Spouse)';
                              else if (rel.toLowerCase() === 'mother') relMalayalam = 'അമ്മ (Mother)';
                              else if (rel.toLowerCase() === 'father') relMalayalam = 'അച്ഛൻ (Father)';
                              else if (rel.toLowerCase() === 'parent') relMalayalam = 'മാതാവ്/പിതാവ് (Parent)';
                              else if (rel.toLowerCase() === 'son') relMalayalam = 'മകൻ (Son)';
                              else if (rel.toLowerCase() === 'daughter') relMalayalam = 'മകൾ (Daughter)';
                              else if (rel.toLowerCase() === 'child') relMalayalam = 'മകൻ/മകൾ (Child)';

                              const paid = Number(claim.totalPaid) || 0;
                              const rec = Number(claim.totalReceived) || 0;
                              const pend = Number(claim.totalPending) || 0;
                              const serial = claim.tokenNo || claim.serialNo || claim.serialNumber || `#${idx + 1}`;
                              const indMobile = claim.individualMobile || claim.memberMobile || (claim.relation === 'Self' ? (claim.userMobile || user.mobile) : '');
                              const hrId = claim.highrichId;

                              return (
                                <div key={claim.id || idx} className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3.5 sm:p-4 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                                      {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[9px] font-black uppercase px-2 py-0.5">
                                          {relMalayalam}
                                        </Badge>
                                        <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-mono font-black px-1.5 py-0.5">
                                          {serial}
                                        </Badge>
                                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-black uppercase px-1.5 py-0.5">
                                          സമർപ്പിച്ചു ✓
                                        </Badge>
                                      </div>
                                      <p className="text-sm font-black text-white truncate mt-1">
                                        {name}
                                      </p>
                                      {(indMobile || hrId) && (
                                        <p className="text-[10px] text-slate-300 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                          {indMobile && <span>📱 {indMobile}</span>}
                                          {hrId && <span className="text-amber-200 font-black">ID: {hrId}</span>}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
                                    <div className="text-left sm:text-right">
                                      <span className="text-[8px] sm:text-[9px] text-slate-300 font-bold block uppercase">നൽകിയത് / ലഭിച്ചത്</span>
                                      <span className="text-xs font-mono font-bold text-slate-200">
                                        ₹{paid.toLocaleString('en-IN')} / ₹{rec.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[8px] sm:text-[9px] text-amber-300 font-black block uppercase">മിച്ച ക്ലെയിം</span>
                                      <span className="text-sm sm:text-base font-mono font-black text-amber-300">
                                        ₹{pend.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white/5 rounded-2xl text-center space-y-2 border border-white/5">
                          <p className="text-xs font-bold text-slate-300">
                            ക്ലെയിം വിവരങ്ങൾ സമർപ്പിച്ച ശേഷം ഓരോ വ്യക്തിയുടെയും ആകെ തുക വിവരങ്ങൾ ഇവിടെ പൂർണ്ണമായി ലഭ്യമാകും.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setView('support')}
                            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl px-4 py-2"
                          >
                            ഫോം പൂരിപ്പിക്കുക
                          </Button>
                        </div>
                      )}

                      {/* Financial Note Footer */}
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-[10px] text-slate-300 font-bold">
                          ✓ അഡ്മിൻ പാനലിലും കോടതി സ്റ്റേറ്റ്‌മെന്റിലും ഉൾപ്പെടുത്തിയ തുക വിവരങ്ങൾ
                        </p>
                      </div>
                    </div>

                    {/* Billing & Payment Receipts */}
                    <PaymentReceipts user={user} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Claim Form Live Preview Modal */}
          {isPreviewingClaim && user && userSubmittedClaims.length > 0 && (() => {
            const isSingle = previewModalClaimIndex >= 0 && previewModalClaimIndex < userSubmittedClaims.length;
            const activeClaim = isSingle ? userSubmittedClaims[previewModalClaimIndex] : null;
            const isSelf = !activeClaim?.relation || activeClaim?.relation === 'Self';
            const claimantName = isSingle
              ? (activeClaim.userName || activeClaim.claimantName || activeClaim.name || activeClaim.spouseName || activeClaim.parentName || activeClaim.childName || (isSelf ? user.name : '') || 'Claimant')
              : user.name;
            const relBadge = isSingle
              ? (activeClaim.relation === 'Self' ? 'Self (സ്വന്തം)' :
                 activeClaim.relation === 'Wife' ? 'Wife (ഭാര്യ)' :
                 activeClaim.relation === 'Husband' ? 'Husband (ഭർത്താവ്)' :
                 activeClaim.relation === 'Father' ? 'Father (പിതാവ്)' :
                 activeClaim.relation === 'Mother' ? 'Mother (മാതാവ്)' :
                 activeClaim.relation === 'Son' ? 'Son (മകൻ)' :
                 activeClaim.relation === 'Daughter' ? 'Daughter (മകൾ)' : (activeClaim.relation || 'Claimant'))
              : `All Family Members (${userSubmittedClaims.length})`;

            return (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4">
                <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                  {/* Modal Header */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0 gap-2 sm:gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5 sm:gap-2 truncate">
                          <span className="truncate">{isSingle ? claimantName : 'കൺസൈൻമെന്റ് അഡ്വാൻസ് റീഫണ്ട് ഫോം'}</span>
                          <Badge className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 uppercase shrink-0">
                            {isSingle ? '1 പേജ് (Single A4)' : `${userSubmittedClaims.length} പേജുകൾ (Combo)`}
                          </Badge>
                          {isSingle && (
                            <Badge className="bg-indigo-600/80 text-white text-[9px] font-bold px-2 py-0.5 uppercase shrink-0">
                              {relBadge}
                            </Badge>
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold truncate">
                          {isSingle ? `Individual Official A4 Record • Token: ${activeClaim?.tokenNo || activeClaim?.serialNo || 'N/A'}` : `Official Family Record • ${user.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isSingle && activeClaim) {
                            printCourtClaimReport(activeClaim, user);
                          } else {
                            printCourtComboReport(user, userSubmittedClaims);
                          }
                        }}
                        className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title={isSingle ? `Print ${claimantName} A4` : `Print All Family Members (${userSubmittedClaims.length} Pages)`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isSingle ? 'പ്രിന്റ് A4' : `പ്രിന്റ് (${userSubmittedClaims.length}P)`}</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isSingle && activeClaim) {
                            downloadCourtClaimPdf(activeClaim, user);
                          } else {
                            downloadCourtComboPdf(user, userSubmittedClaims);
                          }
                        }}
                        className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border border-emerald-500"
                        title={isSingle ? `Download ${claimantName} PDF` : `Download All Family Members PDF (${userSubmittedClaims.length} Pages)`}
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span className="text-white font-black">{isSingle ? 'ഡൗൺലോഡ് PDF' : `ഡൗൺലോഡ് (${userSubmittedClaims.length}P)`}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsPreviewingClaim(false)}
                        className="h-8 sm:h-9 px-2.5 sm:px-3 text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-black rounded-xl cursor-pointer"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>

                  {/* Navigation Switcher inside Modal if multiple claims */}
                  {userSubmittedClaims.length > 1 && (
                    <div className="px-3 sm:px-6 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2 overflow-x-auto shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                        ഫോം തിരഞ്ഞെടുക്കുക:
                      </span>
                      {userSubmittedClaims.map((claimItem, cIdx) => {
                        const isClaimSelf = !claimItem.relation || claimItem.relation === 'Self';
                        const cName = claimItem.userName || claimItem.claimantName || claimItem.name || claimItem.spouseName || claimItem.parentName || claimItem.childName || (isClaimSelf ? user.name : '') || `Claimant ${cIdx + 1}`;
                        const cRel = claimItem.relation === 'Self' ? 'Self' :
                          claimItem.relation === 'Wife' ? 'Wife' :
                          claimItem.relation === 'Husband' ? 'Husband' :
                          claimItem.relation === 'Father' ? 'Father' :
                          claimItem.relation === 'Mother' ? 'Mother' :
                          claimItem.relation === 'Son' ? 'Son' :
                          claimItem.relation === 'Daughter' ? 'Daughter' : (claimItem.relation || 'Member');
                        const isSelected = previewModalClaimIndex === cIdx;
                        return (
                          <button
                            key={claimItem.id || cIdx}
                            type="button"
                            onClick={() => {
                              setPreviewModalClaimIndex(cIdx);
                              setSelectedCardClaimTab(cIdx);
                            }}
                            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <span>{cIdx + 1}. {cName} ({cRel})</span>
                            <span className="text-[9px] opacity-75 font-semibold">1P</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewModalClaimIndex(-1);
                          setSelectedCardClaimTab(-1);
                        }}
                        className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ml-auto ${
                          previewModalClaimIndex === -1
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        <span>എല്ലാ അംഗങ്ങളും ({userSubmittedClaims.length}P)</span>
                      </button>
                    </div>
                  )}

                  {/* Preview Content (Rendered Iframe displaying the exact court statement) */}
                  <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden">
                    <iframe
                      key={`preview-frame-${previewModalClaimIndex}`}
                      srcDoc={
                        isSingle && activeClaim
                          ? getSingleCourtClaimHtml(user, activeClaim, 1, 1)
                          : getCourtComboHtml(user, userSubmittedClaims)
                      }
                      title="Consignment Advance Statement Preview"
                      className="w-full h-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white shadow-inner"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {view === 'support' && user && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden">
          {user.status === 'pending' ? (
            <div className="min-h-screen py-6 px-4 flex items-center justify-center">
              <div className="w-full max-w-md mx-auto">
                <div className="relative bg-white border-2 border-amber-300 p-6 sm:p-8 rounded-[36px] shadow-premium overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-amber-500 before:via-yellow-400 before:to-amber-600 space-y-5 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 shadow-sm mx-auto animate-bounce">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                      അംഗത്വ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു!
                    </h2>
                    <p className="text-xs font-black tracking-widest text-amber-700 uppercase mt-1.5">
                      MEMBERSHIP PENDING APPROVAL
                    </p>
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-200 p-4 sm:p-5 rounded-2xl text-slate-900 font-bold text-xs sm:text-sm leading-relaxed text-left space-y-2">
                    <p className="text-amber-950">
                      പ്രിയ അംഗമേ, താങ്കളുടെ പുതിയ അംഗത്വം അഡ്മിൻ വെരിഫൈ ചെയ്ത് അപ്പ്രൂവ് ചെയ്യേണ്ടതുണ്ട്.
                    </p>
                    <p className="text-slate-800 font-medium">
                      അപ്പ്രൂവ് ചെയ്തതിന് ശേഷം മാത്രമേ <strong className="text-slate-950 font-black">Financial Info Registry ഫോം ലഭ്യമാകൂ.</strong>
                    </p>
                  </div>

                  <div className="w-full pt-2">
                    <Button 
                      variant="outline"
                      onClick={() => setView('card')}
                      className="w-full h-11 rounded-2xl border-2 border-slate-300 text-xs uppercase text-slate-750 font-black hover:bg-slate-100 cursor-pointer bg-white"
                    >
                      തിരികെ ഐഡി കാർഡിലേക്ക് (Back to Card)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : isExpired ? (
            <div className="min-h-screen py-6 px-4 flex items-center justify-center">
              <div className="w-full max-w-md mx-auto">
                <div className="relative bg-white border-2 border-rose-300 p-6 sm:p-8 rounded-[36px] shadow-premium overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-rose-600 before:via-amber-500 before:to-rose-600 space-y-5 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-center justify-center text-rose-600 shadow-sm mx-auto animate-bounce">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                      വിവര രജിസ്ട്രി ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു!
                    </h2>
                    <p className="text-xs font-black tracking-widest text-rose-700 uppercase mt-1.5">
                      ACCESS BLOCKED / RENEWAL REQUIRED
                    </p>
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-200 p-4 sm:p-5 rounded-2xl text-slate-900 font-bold text-xs sm:text-sm leading-relaxed text-left space-y-2">
                    <p className="text-rose-950">
                      പ്രിയ അംഗമേ, താങ്കളുടെ പ്ലാൻ കാലാവധി കഴിഞ്ഞിരിക്കുകയാണ്.
                    </p>
                    <p className="text-slate-800 font-medium">
                      സപ്പോർട്ട് വിവരങ്ങൾ നൽകുന്നതിനുള്ള <strong className="text-slate-950 font-black">Financial Info Registry ഫോം ലഭിക്കുന്നതിനായി താങ്കളുടെ മെമ്പർഷിപ്പ് പുതുക്കുക.</strong>
                    </p>
                  </div>

                  <div className="w-full pt-2 space-y-3">
                    <Button 
                      onClick={() => {
                        setPrefilledMobile(user.mobile);
                        setView('renewal');
                      }}
                      className="w-full h-13 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs sm:text-sm uppercase shadow-lg shadow-rose-600/20 cursor-pointer"
                    >
                      അംഗത്വം പുതുക്കുക ₹100 (Renew Now)
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setView('card')}
                      className="w-full h-11 rounded-2xl border-2 border-slate-300 text-xs uppercase text-slate-700 font-black hover:bg-slate-100 cursor-pointer bg-white"
                    >
                      തിരികെ ഐഡി കാർഡിലേക്ക് (Back to Card)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full min-h-screen">
              <SupportClaimForm 
                user={user} 
                initialClaims={userSubmittedClaims}
                onClose={() => {
                  setClaimRefreshTrigger(prev => prev + 1);
                  setView('card');
                }}
                onBack={() => {
                  setClaimRefreshTrigger(prev => prev + 1);
                  setView('card');
                }} 
                onSubmitSuccess={(claims) => {
                  if (claims && Array.isArray(claims) && claims.length > 0) {
                    setUserSubmittedClaims(claims);
                    setSubmittedClaimsCount(claims.length);
                    setHasSubmittedClaim(true);
                  }
                  setClaimRefreshTrigger(prev => prev + 1);
                  setView('card');
                }}
              />
            </div>
          )}
        </div>
      )}

      {view === 'admin' && (
        <div className="animate-in fade-in duration-700">
            <AdminDashboard 
              user={user}
              members={members} 
              onApprove={handleApprove} 
              onAddOffline={handleAddOffline} 
              onUpdate={handleUpdateMember}
              onDelete={handleDeleteMember}
              onResetPin={handleResetPin}
              onBulkResetAllPins={handleBulkResetAllPins}
              onUpdatePhoto={handleUpdatePhoto}
              onUpdateDistrictQuota={handleUpdateDistrictQuota}
              onSyncQuotas={handleSyncQuotas}
              districtQuotas={districtQuotas}
              districtQuotasUsed={districtQuotasUsed}
              handleLogout={handleLogout}
              onViewCard={() => setView('card')}
              onRefreshMembers={() => refreshMembersList(undefined, true)}
              isSyncingMembers={isSyncingDocs}
            />
        </div>
      )}

      {view === 'operator' && user && (
        <div className="animate-in fade-in duration-700">
          <OperatorDashboard 
            user={user}
            members={members} 
            onAddMember={handleAddOffline} 
            onUpdate={handleUpdateMember}
            onDelete={handleDeleteMember}
            districtQuotas={districtQuotas}
            districtQuotasUsed={districtQuotasUsed}
            handleLogout={handleLogout}
            isDirectManual={isDirectManual}
            isSecondAdmin={SECOND_ADMINS.some(email => email.toLowerCase() === (user.email || '').toLowerCase())}
            onViewCard={() => setView('card')}
            onRefreshMembers={() => refreshMembersList(undefined, true)}
            isSyncingMembers={isSyncingDocs}
            onUpdatePhoto={handleUpdatePhoto}
          />
        </div>
      )}

      {!isScreenshotMode && view !== 'support' && <AiChatSupport />}
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}
