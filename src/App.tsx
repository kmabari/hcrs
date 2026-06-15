import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import LandingPage from './components/LandingPage';
import RegistrationForm from './components/RegistrationForm';
import RenewalForm from './RenewalForm';
import LoginForm from './components/LoginForm';
import GalleryPage from './components/GalleryPage';
import MembershipCard from './components/MembershipCard';
import ProfileEditForm from './components/ProfileEditForm';
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
import { auth, db, storage, handleFirestoreError, OperationType, secondaryAuth } from './lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { Clock, LogOut, Camera, ShieldCheck, RefreshCw, Users, ShieldAlert, ArrowRight, Eye, Pencil, Trash2, MoreVertical, Receipt, Mail, Smartphone, Search, MapPin, Plus, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { setDoc, doc, updateDoc, deleteDoc, collection, onSnapshot, query, getDoc, getDocs, runTransaction, serverTimestamp, where, increment, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from './lib/imageUtils';
import { googleProvider } from './lib/firebase';

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

export default function App() {
  const [view, setView] = useState<'landing' | 'register' | 'renewal' | 'login' | 'card' | 'admin' | 'operator' | 'support' | 'loading' | 'gallery' | 'verify'>('loading');
  const currentViewRef = useRef(view);
  useEffect(() => {
    currentViewRef.current = view;
  }, [view]);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [verifiedMember, setVerifiedMember] = useState<UserProfile | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [districtQuotas, setDistrictQuotas] = useState<Record<string, number>>({});
  const [districtQuotasUsed, setDistrictQuotasUsed] = useState<Record<string, number>>({});
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [prefilledMobile, setPrefilledMobile] = useState('');
  const [hasSubmittedClaim, setHasSubmittedClaim] = useState(false);
  const [submittedClaimsCount, setSubmittedClaimsCount] = useState(0);
  const [claimRefreshTrigger, setClaimRefreshTrigger] = useState(0);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isSyncingDocs, setIsSyncingDocs] = useState(false);
  const isSyncingRef = useRef(false);
  const hasInitialSyncedRef = useRef(false);
  const lastAuthUserUidRef = useRef<string | null>(null);

  const refreshMembersList = useCallback(async (customUser?: UserProfile) => {
    const activeUser = customUser || user;
    if (!activeUser) return;
    const isAdmin = activeUser.role === 'admin' || activeUser.isAdmin;
    const isOperator = activeUser.role === 'operator';
    if (!isAdmin && !isOperator) return;

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncingDocs(true);

    console.log("refreshMembersList: Querying 'users'. activeUser:", {
      uid: activeUser?.uid,
      email: activeUser?.email,
      role: activeUser?.role,
      isAdmin: activeUser?.isAdmin,
      district: activeUser?.district
    }, "auth.currentUser:", auth.currentUser ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email
    } : "null");

    const loadingToast = 'syncing_db_entries';
    toast.loading('Syncing database entries...', { id: loadingToast });

    try {
      let q;
      const currentEmail = (activeUser.email || '').toLowerCase().trim();
      if (isAdmin) {
         const isSuper = MAIN_ADMINS.some(e => e.toLowerCase() === currentEmail) || !activeUser.district;
         q = isSuper 
           ? query(collection(db, 'users')) 
           : query(collection(db, 'users'), where('district', '==', activeUser.district));
      } else {
         q = activeUser.district 
           ? query(collection(db, 'users'), where('district', '==', activeUser.district))
           : query(collection(db, 'users'), where('registeredBy', '==', activeUser.uid));
      }

      const snapshot = await getDocs(q);
      const list = snapshot.docs
         .map(doc => ({ uid: doc.id, ...(doc.data() as any) } as UserProfile))
         .filter(u => {
           const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === (u.email || '').toLowerCase());
           return !isMainAdmin;
         });

      let cleanList = [...list];
      
      // AUTO-CLEANUP DUPLICATE LIFE MEMBER SERIAL NO 1
      const life1s = cleanList.filter(u => u.membership_type === 'LIFE_MEMBER' && u.serialNo === 1);
      if (life1s.length > 1) {
        console.log("Database Maintenance: Found duplicate Life Members with serialNo = 1:", life1s.map(l => l.uid));
        
        // Sort to keep the earliest/original profile, delete later duplicates
        const sorted = [...life1s].sort((a, b) => {
          const t1 = a.registrationDate 
            ? (typeof a.registrationDate.toDate === 'function' 
                ? a.registrationDate.toDate().getTime() 
                : new Date(a.registrationDate).getTime()) 
            : 0;
          const t2 = b.registrationDate 
            ? (typeof b.registrationDate.toDate === 'function' 
                ? b.registrationDate.toDate().getTime() 
                : new Date(b.registrationDate).getTime()) 
            : 0;
          return t1 - t2;
        });

        // Keep sorted[0] (earliest), delete subsequent duplicates
        const toDelete = sorted.slice(1);
        for (const duplicateToKill of toDelete) {
          console.log(`Auto-deleting duplicate Life Member with serialNo=1, UID: ${duplicateToKill.uid}`);
          try {
            await deleteDoc(doc(db, 'users', duplicateToKill.uid));
            toast.success(`ഡ്യൂപ്ലിക്കേറ്റ് ലൈഫ് മെമ്പർ (സീരിയൽ 1, UID: ${duplicateToKill.uid}) ഡാറ്റാബേസിൽ നിന്ന് വിജയകരമായി നീക്കം ചെയ്തു.`);
          } catch (delErr) {
            console.error("Failed to delete duplicate life 1 member:", delErr);
          }
        }

        // Exclude deleted profiles from local state
        const deletedUids = toDelete.map(u => u.uid);
        cleanList = cleanList.filter(u => !deletedUids.includes(u.uid));
      }

      setMembers(cleanList);
      toast.success('Database entries synchronized successfully.', { id: loadingToast });
    } catch (err: any) {
      console.error("Members fetch error during refresh:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted')) {
        setIsQuotaExceeded(true);
      }
      toast.error('Sync failed. Please try again.', { id: loadingToast });
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setIsSyncingDocs(false);
      isSyncingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const handleQuota = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    async function checkClaimSubmission() {
      if (!user) {
        setHasSubmittedClaim(false);
        setSubmittedClaimsCount(0);
        return;
      }
      try {
        const rawMobile = String(user.mobile || '').replace(/\D/g, '');
        const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
        const offlineUid = cleanMobile ? `offline_${cleanMobile}` : '';
        const activeUid = user.uid || '';

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
        
        // Count unique claim ID keys
        const claimIds = new Set<string>();
        snaps.forEach(snap => {
          if (snap && !snap.empty) {
            snap.docs.forEach(docSnap => {
              claimIds.add(docSnap.id);
            });
          }
        });

        const count = claimIds.size;
        setSubmittedClaimsCount(count);
        setHasSubmittedClaim(count > 0);
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted')) {
          setIsQuotaExceeded(true);
        }
        console.warn("Status check notice: Database query notice:", errMsg);
      }
    }
    checkClaimSubmission();
  }, [user, claimRefreshTrigger]);

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

  const handleGoogleLogin = async () => {
    const loadingToast = toast.loading('Signing in with Google...');
    setView('loading');
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in with Google!', { id: loadingToast });
    } catch (error: any) {
      console.error("Google login error:", error);
      setView('login');
      const isCustomDomain = typeof window !== 'undefined' && 
        !window.location.origin.includes('vercel.app') && 
        !window.location.origin.includes('localhost') && 
        !window.location.origin.includes('127.0.0.1') && 
        !window.location.origin.includes('ais-');

      if (error?.code === 'auth/unauthorized-domain' || isCustomDomain) {
        toast.error(
          'ഗൂഗിൾ വൈരിഫൈഡ് ലോഗിൻ നേരിട്ട് പ്രവർത്തിക്കില്ല! കസ്റ്റം ഡൊമൈൻ ആയതു കൊണ്ട് ഗൂഗിൾ സുരക്ഷാ നിയമങ്ങൾ ഇതിനെ തടയുന്നു.', 
          { 
            id: loadingToast,
            duration: 15000, 
            description: 'പരിഹാരം: ദയവായി https://hcrs-kappa.vercel.app ഓപ്പൺ ചെയ്ത് ഗൂഗിൾ ലോഗിൻ വഴി കയറി മുകളിൽ കാണുന്ന "Set Domain PIN" വഴി നിങ്ങളുടെ പാസ്‌വേഡ് സെറ്റ് ചെയ്യുക. ശേഷം നിങ്ങളുടെ ഇമെയിലും ആ പാസ്‌വേഡും ഉപയോഗിച്ച് നേരിട്ട് www.hcrs.in ലോഗിൻ ചെയ്യുക!',
            action: {
              label: 'Vercel fallback വഴി തുറക്കുക',
              onClick: () => window.open('https://hcrs-kappa.vercel.app', '_blank')
            }
          }
        );
      } else {
        toast.error('Google sign-in failed. Please try again.', { id: loadingToast });
      }
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
      
      // Initialize with 0s for all districts to ensure consistent display
      DISTRICTS.forEach(d => {
        totals[d.code] = 0;
        used[d.code] = 0;
      });

      snapshot.forEach(doc => {
        const data = doc.data();
        const id = doc.id.toUpperCase();
        totals[id] = data.total || 0;
        used[id] = data.used || 0;
      });
      setDistrictQuotas(totals);
      setDistrictQuotasUsed(used);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'districtQuotas');
    });
    return () => unsubscribe();
  }, []);

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
      // We don't automatically log in, but we skip the landing page
      setView('login');
      // Store the intent to guide the user to the correct dashboard after login
      sessionStorage.setItem('hcrs_district_intent', distLogin);
      sessionStorage.setItem('hcrs_direct_manual', 'true');
      setIsDirectManual(true);
      
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
          const allowedUnauthViews = ['landing', 'login', 'register', 'renewal', 'gallery', 'verify'];
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
      const isSuperAdminEmail = MAIN_ADMINS.some(email => email.toLowerCase() === currentEmail);
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
          if (currentViewRef.current !== 'register' && currentViewRef.current !== 'renewal') {
            const isAdm = cachedData.role === 'admin' || cachedData.isAdmin;
            const isOp = cachedData.role === 'operator';
            if (isAdm) setView('admin');
            else if (isOp) setView('operator');
            else setView('card');
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
          const freshData = { uid: authUser.uid, ...docSnap.data() } as UserProfile;
          
          if (freshData.status === 'deleted' && !isAdminEmail) {
            console.log("Deactivated/Deleted user logged in. Signing out...");
            signOut(auth).then(() => {
              setView('landing');
              toast.error('താങ്കളുടെ അക്കൗണ്ട് അഡ്മിൻ ഡി-ആക്റ്റീവ് ചെയ്തിരിക്കുന്നു! ദയവായി അഡ്മിനുമായി ബന്ധപ്പെടുക. (Your account is deactivated. Please contact Admin.)');
            });
            return;
          }

          if (isAdminEmail) {
            freshData.role = isSuperAdminEmail ? 'admin' : 'operator';
            freshData.isAdmin = isSuperAdminEmail;
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
            if (!detectedDist) {
              const storedIntent = typeof window !== 'undefined' ? sessionStorage.getItem('hcrs_district_intent') : null;
              if (storedIntent) {
                const resolvedCode = getDistrictCode(storedIntent);
                if (resolvedCode && resolvedCode !== 'OTH') detectedDist = resolvedCode;
              }
            }
            if (detectedDist) {
              freshData.district = detectedDist;
              updateDoc(doc(db, 'users', authUser.uid), { district: detectedDist })
                .catch(e => console.error("Failed to backport missing district:", e));
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
          if (!autoDistrict) {
            const storedIntent = typeof window !== 'undefined' ? sessionStorage.getItem('hcrs_district_intent') : null;
            if (storedIntent) {
              const resolvedCode = getDistrictCode(storedIntent);
              if (resolvedCode && resolvedCode !== 'OTH') autoDistrict = resolvedCode;
            }
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
        }

        if (userData) {
          // Force restrict second admin emails to their strict district and block session overrides
          const checkEmail = (userData.email || '').toLowerCase().trim();
          const checkSecond = SECOND_ADMINS.some(email => email.toLowerCase() === checkEmail);
          const strictDistrict = getStrictDistrictFromEmail(checkEmail);

          if (checkSecond && strictDistrict) {
            userData.district = strictDistrict;
            userData.role = 'operator';
            userData.isAdmin = false;
          } else {
            // Resolve stored district intent ONLY for non-second-admin users to fix district dashboard access
            const storedIntent = typeof window !== 'undefined' ? sessionStorage.getItem('hcrs_district_intent') : null;
            if (storedIntent) {
              const resolvedCode = getDistrictCode(storedIntent);
              if (resolvedCode && resolvedCode !== 'OTH') {
                userData.district = resolvedCode;
              }
            }
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
          
          const isAdmin = userData.role === 'admin' || userData.isAdmin;
          const isOperator = userData.role === 'operator';
          
          if (isAdmin) {
             setView('admin');
          } else if (isOperator || (isDirectManual && !isMagicLink && isOperator)) {
             setView('operator');
          } else {
            const claimRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('hcrs_claim_redirect') === 'true' : false;
            if (claimRedirect) {
              if (typeof window !== 'undefined') sessionStorage.removeItem('hcrs_claim_redirect');
              setView('support');
            } else if (currentViewRef.current !== 'renewal') {
              setView('card');
            }
          }

          if ((isAdmin || isOperator) && !hasInitialSyncedRef.current) {
             hasInitialSyncedRef.current = true;
             refreshMembersList(userData);
          }
        } else {
          console.warn("Profile document not found for UID:", authUser.uid);
          
          // --- DYNAMIC UID MISMATCH HEALING ---
          let healed = false;
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
            let querySnap = null;

            // Collect all possible query candidates to leave absolutely no chance of failure
            const candidates: { field: string; value: string; desc: string }[] = [];
            
            // Candidate 1: extracted loginMobile from email (most common)
            if (loginMobile && /^\d{10}$/.test(loginMobile)) {
              candidates.push({ field: 'mobile', value: loginMobile, desc: 'extracted mobile from email prefix' });
            }
            
            // Candidate 2: current authenticating email
            if (currentEmail) {
              candidates.push({ field: 'email', value: currentEmail, desc: 'current auth email' });
            }
            
            // Candidate 3: potential default emails using the mobile number
            if (loginMobile && /^\d{10}$/.test(loginMobile)) {
              candidates.push({ field: 'email', value: `${loginMobile}@hcrs-life.society`, desc: 'standard life member placeholder email' });
              candidates.push({ field: 'email', value: `${loginMobile}@hcrs.society`, desc: 'standard member placeholder email' });
            }
            
            // Candidate 4: sessionStorage lookup for typed mobile or card ID
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

            // Deduplicate candidates (by field + value)
            const uniqueCandidates: typeof candidates = [];
            const seen = new Set<string>();
            for (const cand of candidates) {
              const key = `${cand.field}::${cand.value.toLowerCase()}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueCandidates.push(cand);
              }
            }

            // Execute queries in fallback order until we find a match
            for (const cand of uniqueCandidates) {
              console.log(`Healing check: querying where('${cand.field}', '==', '${cand.value}') (${cand.desc})...`);
              const q = query(usersRef, where(cand.field, '==', cand.value), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                querySnap = snap;
                console.log(`Healing matched candidate via where('${cand.field}', '==', '${cand.value}') (${cand.desc})! Document ID:`, snap.docs[0].id);
                break;
              }
            }
            
            if (querySnap && !querySnap.empty) {
              const oldDoc = querySnap.docs[0];
              const oldDocId = oldDoc.id;
              
              if (oldDocId !== authUser.uid) {
                console.log(`Found mismatched profile at ${oldDocId}. Auto-copying to current logged-in UID ${authUser.uid}...`);
                const profileData = oldDoc.data();
                const healedProfile = {
                  ...profileData,
                  uid: authUser.uid,
                  role: profileData.role || 'member',
                  status: profileData.status || 'active',
                  issueDate: profileData.issueDate || serverTimestamp(),
                };
                
                await setDoc(doc(db, 'users', authUser.uid), healedProfile);
                console.log("Dynamic UID healing successful!");
                
                // Cleanup old offline/temporary document from Firestore to avoid duplicate counts/listing
                if (oldDocId.startsWith('offline_') || oldDocId.startsWith('life_')) {
                  console.log(`Deleting old offline/life document ${oldDocId} since it has been synced to ${authUser.uid}`);
                  try {
                    await deleteDoc(doc(db, 'users', oldDocId));
                  } catch (delErr) {
                    console.warn("Non-blocking deleteDoc of old profile failed:", delErr);
                  }
                }
                
                healed = true;
              }
            }
          } catch (healErr) {
            console.error("Error healing UID mismatch:", healErr);
          }

          if (!healed && currentViewRef.current === 'loading' && !isAdminEmail) {
            // If they just logged in but have no doc, maybe they're new or deleted
            setView('register');
            toast.info('പൂർണ്ണരൂപം ലഭ്യമല്ല. ദയവായി രജിസ്റ്റർ ചെയ്യുക. (Profile not found, please register)', { id: 'profile_not_found_toast' });
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
              if (isAdm) setView('admin');
              else if (isOp) setView('operator');
              else setView('card');
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
        else if (!isMagicLink && currentViewRef.current !== 'register') setView('landing');
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

  const handleLogin = async (values: { email: string, pin: string }, originView: 'login' | 'landing' = 'login'): Promise<boolean> => {
    const loadingToast = toast.loading('Logging you in...');
    const originalInput = (values.email || '').trim();
    const trimmedPin = (values.pin || '').trim();
    
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
    try {
      setView('loading');
      let mappedUserData: any = null;
      let targetEmail = '';

      const usersRef = collection(db, 'users');

      if (isMobile) {
        setLoadingStatus('Resolving Mobile Identity...');
        let querySnap = await getDocs(query(usersRef, where('mobile', '==', sanitizedMobile), limit(5)));
        if (querySnap.empty && sanitizedMobile.length === 10) {
          const variations = [
            `+91${sanitizedMobile}`,
            `91${sanitizedMobile}`,
            `0${sanitizedMobile}`
          ];
          for (const variant of variations) {
            const qVariant = query(usersRef, where('mobile', '==', variant), limit(5));
            const snapVariant = await getDocs(qVariant);
            if (!snapVariant.empty) {
              querySnap = snapVariant;
              break;
            }
          }
        }

        if (!querySnap.empty) {
          // Prefer healed profile: ID is not starting with 'life_' or 'offline_'
          const healedDoc = querySnap.docs.find(d => !d.id.startsWith('life_') && !d.id.startsWith('offline_'));
          const selectedDoc = healedDoc || querySnap.docs[0];
          mappedUserData = selectedDoc.data();
          targetEmail = mappedUserData.email || `${sanitizedMobile}@hcrs.society`;
        } else {
          targetEmail = `${sanitizedMobile}@hcrs.society`;
        }
      } else {
        // Look up by membershipId first (e.g. HCRS-LIFE-KL-MLP-KOT-001)
        setLoadingStatus('Resolving Membership ID...');
        let q = query(usersRef, where('membershipId', '==', originalInput), limit(5));
        let querySnap = await getDocs(q);
        
        if (querySnap.empty) {
          q = query(usersRef, where('membershipId', '==', originalInput.toUpperCase()), limit(5));
          querySnap = await getDocs(q);
        }

        if (!querySnap.empty) {
          const healedDoc = querySnap.docs.find(d => !d.id.startsWith('life_') && !d.id.startsWith('offline_'));
          const selectedDoc = healedDoc || querySnap.docs[0];
          mappedUserData = selectedDoc.data();
          targetEmail = mappedUserData.email || `${mappedUserData.mobile || 'user'}@hcrs.society`;
        } else if (originalInput.includes('@')) {
          setLoadingStatus('Resolving Email Identity...');
          const qEmail = query(usersRef, where('email', '==', originalInput.toLowerCase()), limit(5));
          const querySnapEmail = await getDocs(qEmail);
          if (!querySnapEmail.empty) {
            const healedDoc = querySnapEmail.docs.find(d => !d.id.startsWith('life_') && !d.id.startsWith('offline_'));
            const selectedDoc = healedDoc || querySnapEmail.docs[0];
            mappedUserData = selectedDoc.data();
            targetEmail = mappedUserData.email;
          } else {
            targetEmail = originalInput.toLowerCase();
          }
        } else {
          // Standard auto-append fallback
          const fallbackEmail = `${originalInput.toLowerCase()}@hcrs.society`;
          const qFallback = query(usersRef, where('email', '==', fallbackEmail), limit(5));
          const querySnapFallback = await getDocs(qFallback);
          if (!querySnapFallback.empty) {
            const healedDoc = querySnapFallback.docs.find(d => !d.id.startsWith('life_') && !d.id.startsWith('offline_'));
            const selectedDoc = healedDoc || querySnapFallback.docs[0];
            mappedUserData = selectedDoc.data();
            targetEmail = mappedUserData.email;
          } else {
            targetEmail = fallbackEmail;
          }
        }
      }

      setLoadingStatus(`Connecting as ${targetEmail}...`);
      let authResult;
      try {
        authResult = await signInWithEmailAndPassword(auth, targetEmail, trimmedPin);
        console.log("Auth sign-in successful for:", authResult.user.uid);
      } catch (signInError: any) {
        const isSuperAdmin = MAIN_ADMINS.some(email => email.toLowerCase() === targetEmail.toLowerCase());
        const isSecondAdmin = SECOND_ADMINS.some(email => email.toLowerCase() === targetEmail.toLowerCase());
        const isAdmin = isSuperAdmin || isSecondAdmin;

        if (isAdmin && trimmedPin === '246810' && 
            (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential')) {
          console.log("Admin user not found in Auth. Attempting auto-registration...");
          try {
            authResult = await createUserWithEmailAndPassword(auth, targetEmail, trimmedPin);
            console.log("Auto-registration/login successful for admin:", authResult.user.uid);
          } catch (signUpError: any) {
            console.error("Auto-registration failed:", signUpError);
            throw signInError; // propagate original signInError
          }
        } else if ((signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') && 
                   mappedUserData && trimmedPin === String(mappedUserData.pin ?? '123456').trim()) {
          // Dynamic Auth auto-creation/healing for valid offline profiles
          console.log("Entered PIN matches registered database profile PIN. Healing Auth registration...");
          try {
            authResult = await createUserWithEmailAndPassword(auth, targetEmail, trimmedPin);
            console.log("Dynamically created / healed Auth account for user:", authResult.user.uid);
          } catch (signUpError: any) {
            if (signUpError.code === 'auth/email-already-in-use') {
              console.log("Primary email is already in Auth but login mismatch exists. Trying secondary v2 channel fall-through...");
              const mobilePart = isMobile ? sanitizedMobile : (mappedUserData.mobile || '');
              const secondaryEmail = `${mobilePart}_v2@hcrs.society`;
              try {
                authResult = await signInWithEmailAndPassword(auth, secondaryEmail, trimmedPin);
                console.log("Sign-in successful via fallback v2 channel:", authResult.user.uid);
              } catch (secError: any) {
                if (secError.code === 'auth/user-not-found' || secError.code === 'auth/invalid-credential') {
                  console.log("Secondary auth account doesn't exist. Creating fresh fallback v2 channel...");
                  try {
                    authResult = await createUserWithEmailAndPassword(auth, secondaryEmail, trimmedPin);
                    console.log("Created fresh fallback v2 auth account:", authResult.user.uid);
                  } catch (createSecError) {
                    console.error("Failed to create secondary auth account:", createSecError);
                    throw signInError;
                  }
                } else {
                  throw signInError;
                }
              }
            } else {
              console.error("Auto-healing registration failed:", signUpError);
              throw signInError; // propagate original signInError
            }
          }
        } else if (mappedUserData && trimmedPin === String(mappedUserData.pin ?? '123456').trim()) {
          // The database PIN is correct, but login failed (e.g., wrong-password because of old out-of-sync auth record)
          console.log("PIN is correct in Firestore, but standard Auth login failed. Attempting secondary/v2 auth channel...");
          const mobilePart = isMobile ? sanitizedMobile : (mappedUserData.mobile || '');
          const secondaryEmail = `${mobilePart}_v2@hcrs.society`;
          try {
            authResult = await signInWithEmailAndPassword(auth, secondaryEmail, trimmedPin);
            console.log("Sign-in successful via v2 channel:", authResult.user.uid);
          } catch (secError: any) {
            if (secError.code === 'auth/user-not-found' || secError.code === 'auth/invalid-credential') {
              console.log("Secondary auth account doesn't exist. Creating fresh v2 channel...");
              try {
                authResult = await createUserWithEmailAndPassword(auth, secondaryEmail, trimmedPin);
                console.log("Created fresh v2 auth account:", authResult.user.uid);
              } catch (createSecError) {
                console.error("Failed to create secondary auth account:", createSecError);
                throw signInError;
              }
            } else {
              throw signInError;
            }
          }
        } else {
          throw signInError;
        }
      }
      
      toast.success('Login Successful! (ലോഗിൻ വിജയിച്ചു)', { id: loadingToast });
      return true;
    } catch (error: any) {
      console.error("Login error details:", error.code, error.message);
      setIsLoggingIn(false);
      setView(originView); 
      
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = isMobile 
          ? 'Invalid Mobile or Password. (മൊബൈൽ അല്ലെങ്കിൽ പാസ്‌വേഡ് തെറ്റാണ്)' 
          : 'Invalid email or Password. (ഇമെയിൽ അല്ലെങ്കിൽ പാസ്‌വേഡ് തെറ്റാണ്)';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Try again later. (പലതവണ ശ്രമിച്ചു, പിന്നീട് ശ്രമിക്കുക)';
      } else if (error.code === 'auth/network-request-failed' || (error.message && error.message.includes('network-request-failed'))) {
        errorMessage = 'നെറ്റ്‌വർക്ക് തകരാർ! നിങ്ങളുടെ ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുകയോ പേജ് റീഫ്രഷ് ചെയ്യുകയോ ചെയ്യുക. (Network connection failed. Please check your internet connection or reload the page.)';
      }
      toast.error(errorMessage, { id: loadingToast });
      return false;
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
      const cleanMobile = (values.mobile || '').toString().trim().replace(/\D/g, '');
      const cleanEmail = (values.email || '').toLowerCase().trim();

      // 0.1 Check for duplicates in Firestore (Allow 'deleted' members to re-register)
      toast.loading('Validating registration...', { id: loadingToast });
      const usersRef = collection(db, 'users');
      
      const mobileQuery = query(usersRef, where('mobile', '==', cleanMobile), where('status', 'in', ['pending', 'active', 'offline', 'disabled']), limit(1));
      const mobileSnap = await getDocs(mobileQuery);
      if (!mobileSnap.empty) {
        throw new Error('This mobile number is already registered. Please Login. (ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് നേരത്തെ രജിസ്റ്റർ ചെയ്തതാണ്. ലോഗിൻ ചെയ്യുക.)');
      }

      if (cleanEmail && cleanEmail.includes('@')) {
        const emailQuery = query(usersRef, where('email', '==', cleanEmail), where('status', 'in', ['pending', 'active', 'offline', 'disabled']), limit(1));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          throw new Error('This email is already registered. Please Login. (ഈ ഇമെയിൽ ഉപയോഗിച്ച് നേരത്തെ രജിസ്റ്റർ ചെയ്തതാണ്. ലോഗിൻ ചെയ്യുക.)');
        }
      }

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

          const now = new Date();
          const expiry = new Date();
          expiry.setFullYear(now.getFullYear() + 1);

          const newMemberData = {
            uid,
            ...values,
            photoUrl: '',
            registrationDate: serverTimestamp(),
            expiryDate: expiry,
            membershipId,
            status: 'pending',
            isPaid: true,
            isApproved: false,
            isAdmin: isAdminEmail,
            role: isAdminEmail ? 'admin' : (isOperatorEmail ? 'operator' : 'member'),
            serialNo: nextSerial,
            waStatus: 'Pending',
            stateCode: 'KL',
            districtCode: memberDistCode.toUpperCase(),
            constituencyCode: assemblyCode.toUpperCase(),
            membership_type: 'ADHOC_MEMBER',
            isQuotaCounted: false
          };
          transaction.set(userRef, newMemberData);
        });

        localStorage.removeItem('hcrs_registration_cache');
        localStorage.removeItem('hcrs_registration_step');
        setShowCelebration(true);
        toast.success('Registration Successful! (രജിസ്ട്രേഷൻ വിജയിച്ചു)', { id: loadingToast, duration: 6000 });
        setView('card');
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

  const handleApprove = async (uid: string) => {
    const loadingToast = toast.loading('Approving member...');
    try {
      const member = members.find(m => m.uid === uid);
      if (!member) throw new Error("Member not found");

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
        constituencyCode: assemblyCode
      };

      await updateDoc(doc(db, 'users', uid), {
        ...updatePayload,
        issueDate: serverTimestamp(),
        registrationDate: serverTimestamp() // JOINING/REGISTRATION DATE updated to exact day of activation
      });

      // Optimistic state update:
      setMembers(prev => prev.map(m => m.uid === uid ? { 
        ...m, 
        ...updatePayload, 
        issueDate: now, 
        registrationDate: now 
      } : m));

      toast.success('Member approved successfully', { id: loadingToast });
    } catch (error) {
      toast.error('Approval failed', { id: loadingToast });
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleAddOffline = async (values: any): Promise<string | null> => {
    const loadingToast = toast.loading('Adding member...');
    try {
      // 0. Set local submitting state if needed or ensure we don't trigger global loading view
      // handleAddOffline is used in Dashboards which handle their own "isSubmitting" state
      
      // Sanitize email/username
      const finalEmail = values.email && values.email.includes('@') 
        ? values.email.toLowerCase().trim()
        : values.mobile && values.mobile.length === 10
          ? `${values.mobile}@hcrs.society`
          : values.email 
            ? `${values.email.trim().toLowerCase()}@hcrs.society` 
            : `${values.mobile || Date.now()}@hcrs.society`;

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
        
        // Also set expiry if it doesn't have one
        if (!data.expiryDate && (!existingMember || !existingMember.expiryDate)) {
          const expiry = new Date();
          expiry.setFullYear(expiry.getFullYear() + 1);
          finalData.expiryDate = expiry;
        }
      }

      // Automatically recalculate membership ID if constituency or district is updated/changed
      if (existingMember) {
        const hasNewDistrict = data.district !== undefined && data.district !== existingMember.district;
        const hasNewAssembly = data.assemblyConstituency !== undefined && data.assemblyConstituency !== existingMember.assemblyConstituency;

        if (hasNewDistrict || hasNewAssembly) {
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

      await updateDoc(doc(db, 'users', uid), finalData);

      // Optimistic state update:
      setMembers(prev => prev.map(m => m.uid === uid ? { 
        ...m, 
        ...finalData,
        issueDate: (finalData.issueDate === serverTimestamp()) ? new Date() : (finalData.issueDate || m.issueDate)
      } : m));

      toast.success('Successfully updated.', { id: loadingToast });
    } catch (error) {
      toast.error('Update failed.', { id: loadingToast });
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleSaveProfile = async (updatedData: Partial<UserProfile>) => {
    if (!user) return;
    const loadingToast = toast.loading('Saving your profile...');
    try {
      const finalData = { ...updatedData };
      
      const hasNewDistrict = updatedData.district !== undefined && updatedData.district !== user.district;
      const hasNewAssembly = updatedData.assemblyConstituency !== undefined && updatedData.assemblyConstituency !== user.assemblyConstituency;

      if (hasNewDistrict || hasNewAssembly) {
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

      await updateDoc(doc(db, 'users', user.uid), finalData);
      toast.success('Profile updated successfully! (വിവരങ്ങൾ പുതുക്കിയിരിക്കുന്നു.)', { id: loadingToast });
      setIsEditingProfile(false);
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
    if (!window.confirm('Are you sure you want to reset this members Password? (Note: They will need to contact admin for the new Password)')) return;
    
    const loadingToast = toast.loading('Processing reset request...');
    try {
      // Note: We can't update Firebase Auth password directly from client for another user easily 
      // without Admin SDK. However, we can store a 'requiresPinReset' or just tell the user.
      // For this prototype, we'll update their profile to remind them.
      await updateDoc(doc(db, 'users', uid), {
        status: 'pending', // Force re-verification if needed
        pinResetRequested: true
      });
      
      // Optimistic state update:
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, status: 'pending', pinResetRequested: true } : m));
      
      toast.success('Password reset request marked. Please contact member.', { id: loadingToast });
    } catch (error) {
      toast.error('Reset failed', { id: loadingToast });
    }
  };

  const handleUpdatePhoto = async (photo: File, targetUid?: string) => {
    const uid = targetUid || user?.uid;
    if (!uid) return;

    const loadingToast = toast.loading('Uploading profile picture...');
    try {
      const compressedPhoto = await compressImage(photo, 1000, 1000, 0.8);
      const photoRef = ref(storage, `photos/${uid}_profile.jpg`);
      const uploadResult = await uploadBytes(photoRef, compressedPhoto);
      const photoUrl = await getDownloadURL(uploadResult.ref);
      
      await updateDoc(doc(db, 'users', uid), { photoUrl });
      
      // Update local state
      if (uid === user?.uid) {
        setUser(prev => prev ? { ...prev, photoUrl } : null);
      }
      
      // Also update members list if in admin view
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, photoUrl } : m));
      
      toast.success('Profile picture updated!', { id: loadingToast });
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error('Upload failed. Please try again.', { id: loadingToast });
    }
  };
  
  const handleUpdateDistrictQuota = async (districtCode: string, total: number) => {
    try {
      const quotaRef = doc(db, 'districtQuotas', districtCode);
      const district = DISTRICTS.find(d => d.code === districtCode);
      await setDoc(quotaRef, {
        id: districtCode,
        districtName: district?.name || districtCode,
        total,
        used: districtQuotasUsed[districtCode] || 0
      }, { merge: true });
    } catch (error) {
      console.error("Error updating quota:", error);
      toast.error("Failed to update district quota");
    }
  };

  const handleSyncQuotas = async () => {
    const loadingToast = toast.loading('Syncing all district quotas...');
    try {
      const counts: Record<string, number> = {};
      DISTRICTS.forEach(d => counts[d.code] = 0);

      // Fetch actual Main Admins UIDs from database to exclude them dynamically
      const mainAdminUids = new Set<string>();
      try {
        const qAdmin = query(collection(db, 'users'), where('email', 'in', MAIN_ADMINS));
        const adminSnap = await getDocs(qAdmin);
        adminSnap.forEach(docSnap => {
          mainAdminUids.add(docSnap.id.toLowerCase());
        });
      } catch (err) {
        console.error("Error fetching main admin uids:", err);
      }
      
      // Calculate from local members list
      members.forEach(m => {
        if (m.district) {
          const code = m.district.toUpperCase();
          
          // Exclude Life Members
          const mType = (m.membership_type || m.membershipType || '').toUpperCase();
          if (mType === 'LIFE_MEMBER') return;
          
          // Exclude explicitly not counted
          if (m.isQuotaCounted === false) return;
          
          // Exclude online self-registrations
          if (!m.registeredBy || m.registeredBy === 'online' || m.registeredByName === 'Online Registration') return;
          
          // Exclude direct entries made by Main Admins
          const creatorName = (m.registeredByName || '').toLowerCase();
          const creatorUid = (m.registeredBy || '').toLowerCase();
          
          if (
            creatorUid === 'super_admin' || 
            creatorUid === 'admin' || 
            mainAdminUids.has(creatorUid) ||
            creatorName.includes('super admin') || 
            creatorName === 'admin' ||
            creatorName.includes('kmabarikiya') ||
            creatorName.includes('hcrsindia') ||
            creatorName.includes('mabarikiya') ||
            creatorName.includes('9645934571') ||
            MAIN_ADMINS.some(email => creatorName.includes(email.split('@')[0]))
          ) {
            return;
          }

          counts[code] = (counts[code] || 0) + 1;
        }
      });
      
      // Update each district document
      const updatePromises = Object.entries(counts).map(async ([code, count]) => {
        const quotaRef = doc(db, 'districtQuotas', code);
        try {
          await updateDoc(quotaRef, { used: count });
        } catch (e) {
           // If doc doesn't exist, set it
           const district = DISTRICTS.find(d => d.code === code);
           await setDoc(quotaRef, { 
             id: code, 
             districtName: district?.name || code,
             used: count,
             total: 500
           });
        }
      });
      
      await Promise.all(updatePromises);
      toast.success('All district quotas synchronized!', { id: loadingToast });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error('Failed to sync quotas', { id: loadingToast });
    }
  };

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9FC] p-8 text-center">
        <div className="relative mb-10 w-24 h-24">
          <RefreshCw className="w-full h-full text-brand-blue animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-brand-magenta rounded-full animate-pulse shadow-[0_0_15px_rgba(235,0,139,0.5)]" />
          </div>
        </div>
        
        <div className="space-y-2 mb-12">
          <h2 className="text-3xl font-black text-brand-magenta uppercase tracking-tight">Syncing Security</h2>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em]">HIGHRICH COMMUNITY REVIVAL SOCIETY</p>
        </div>

        <div className="bg-white border-2 border-slate-100 p-8 rounded-[40px] shadow-xl shadow-slate-200/50 max-w-sm w-full space-y-6">
           <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                 <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protocol 01</p>
                 <p className="text-xs font-bold text-slate-600">Secure Handshake ... OK</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-2xl bg-brand-magenta/10 flex items-center justify-center text-brand-magenta">
                 <Users className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protocol 02</p>
                 <p className="text-xs font-bold text-slate-600">{loadingStatus}</p>
              </div>
           </div>

           <div className="pt-4 px-2">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                 <div className="h-full bg-brand-magenta animate-pulse w-full rounded-full" />
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-3 tracking-widest text-center">
                Syncing with Database...
              </p>
           </div>
        </div>

        <div className="mt-16 space-y-4">
           <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-none">Experiencing issues?</p>
           <div className="flex gap-4 justify-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.reload()}
                className="text-[10px] font-black uppercase text-brand-blue hover:bg-brand-blue/5 rounded-xl px-6"
              >
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setLoadingStatus('Resetting...');
                  signOut(auth).then(() => {
                    setView('landing');
                    toast.info('Session reset. Please log in again.');
                  }).catch(() => {
                    setView('landing');
                  });
                }}
                className="text-[10px] font-black uppercase text-red-500 border-red-100 hover:bg-red-50 rounded-xl px-6 h-10"
              >
                Reset & Try Again
              </Button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans antialiased text-foreground selection:bg-brand-blue/20">
      {isQuotaExceeded && (() => {
        const isUserAdmin = user && (
          user.isAdmin || 
          user.role === 'admin' || 
          user.role === 'operator' ||
          MAIN_ADMINS.some(e => e.toLowerCase() === (user.email || '').toLowerCase()) ||
          SECOND_ADMINS.some(e => e.toLowerCase() === (user.email || '').toLowerCase())
        );

        if (isUserAdmin) {
          return (
            <div className="bg-amber-500 text-slate-900 px-4 py-2.5 font-sans font-semibold text-center text-xs md:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b border-amber-600/30 animate-in slide-in-from-top duration-500 sticky top-0 z-50 shadow-md">
              <div className="flex items-center gap-1.5 justify-center">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-950 animate-pulse" />
                <span>ഡാറ്റാബേസ് കണക്ഷൻ തടസ്സപ്പെട്ടു (Firestore Daily Free Read Quota Crossed).</span>
              </div>
              <span className="text-[10px] md:text-xs opacity-95">
                നാളെ വീണ്ടും ശ്രമിക്കുക, അല്ലെങ്കിൽ{' '} 
                <a 
                  href="https://console.firebase.google.com/project/gen-lang-client-0932665202/firestore/databases/ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528/data?openUpgradeDialog=true" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline font-black text-amber-950 hover:text-white transition-colors"
                >
                  ഇവിടെ ക്ലിക്ക് ചെയ്ത് ബില്ലിംഗ് അപ്ഗ്രേഡ് ചെയ്യുക
                </a>.
              </span>
            </div>
          );
        } else {
          return (
            <div className="bg-slate-800 text-slate-100 px-4 py-2.5 font-sans font-semibold text-center text-xs md:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b border-slate-700 animate-in slide-in-from-top duration-500 sticky top-0 z-50 shadow-md">
              <div className="flex items-center gap-1.5 justify-center">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                <span>സാങ്കേതിക തകരാർ കാരണം സർവീസ് താത്കാലികമായി ലഭ്യമല്ല. ദയവായി പിന്നീട് വീണ്ടും ശ്രമിക്കുക. (Service temporarily unavailable due to a technical error. Please try again later.)</span>
              </div>
            </div>
          );
        }
      })()}

      {view === 'landing' && (
        <LandingPage 
          announcements={announcements}
          onAccept={handleAcceptTerms} 
          onRenew={handleRenewClick}
          onLoginClick={() => setView('login')} 
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
        />
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
            isLoading={isLoggingIn}
          />
        </div>
      )}

      {view === 'support' && user && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white min-h-screen">
          {user.status === 'pending' ? (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center max-w-md mx-auto space-y-6">
              <div className="h-20 w-20 rounded-full bg-amber-100 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg animate-bounce">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-850 uppercase tracking-tight leading-none">
                അംഗത്വ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു!
              </h2>
              <p className="text-[10px] font-black tracking-widest text-amber-505 uppercase mt-1">MEMBERSHIP PENDING APPROVAL</p>

              <div className="bg-amber-50/50 border border-amber-500/15 p-5 rounded-2xl text-slate-600 font-semibold text-xs leading-relaxed text-left space-y-3">
                <p>
                  പ്രിയ അംഗമേ, താങ്കളുടെ പുതിയ അംഗത്വം അഡ്മിൻ വെരിഫൈ ചെയ്ത് അപ്പ്രൂവ് ചെയ്യേണ്ടതുണ്ട്. <strong>അപ്പ്രൂവ് ചെയ്തതിന് ശേഷം മാത്രമേ വിവര രജിസ്ട്രി ഫോം ലഭ്യമാകൂ.</strong>
                </p>
                <p className="text-[10.5px] text-slate-400 font-bold leading-normal uppercase">
                  Your registration is pending admin approval. Access to the Financial Info Registry portal will unlock once your account is active.
                </p>
              </div>

              <div className="w-full pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setView('card')}
                  className="w-full h-12 rounded-xl border-slate-250 text-xs uppercase text-slate-500 font-bold hover:bg-slate-50"
                >
                  തിരികെ ഐഡി കാർഡിലേക്ക് (Back to Card)
                </Button>
              </div>
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center max-w-md mx-auto space-y-6">
              <div className="h-20 w-20 rounded-full bg-rose-100 border border-brand-magenta/30 flex items-center justify-center text-brand-magenta shadow-lg animate-bounce">
                <ShieldAlert className="w-10 h-10" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-850 uppercase tracking-tight leading-none">
                വിവര രജിസ്ട്രി ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു!
              </h2>
              <p className="text-[10px] font-black tracking-widest text-brand-magenta uppercase mt-1">ACCESS BLOCKED / RENEWAL REQUIRED</p>

              <div className="bg-rose-50/50 border border-brand-magenta/15 p-5 rounded-2xl text-slate-600 font-semibold text-xs leading-relaxed text-left space-y-3">
                <p>
                  പ്രിയ അംഗമേ, താങ്കളുടെ പ്ലാൻ കാലാവധി കഴിഞ്ഞിരിക്കുകയാണ്. സപ്പോർട്ട് വിവരങ്ങൾ നൽകുന്നതിനുള്ള <strong>Financial Info Registry ഫോം ലഭിക്കുന്നതിനായി താങ്കളുടെ മെമ്പർഷിപ്പ് പുതുക്കേണ്ടതുണ്ട്.</strong>
                </p>
                <p className="text-[10.5px] text-slate-400 font-bold leading-normal uppercase">
                  Your membership validity has expired. To access/submit the Financial Info Registry form, please renew your membership now (₹100).
                </p>
              </div>

              <div className="w-full space-y-3 pt-4">
                <Button 
                  onClick={() => {
                    setPrefilledMobile(user.mobile);
                    setView('renewal');
                  }}
                  className="w-full h-14 rounded-2xl font-black bg-brand-magenta text-white shadow-xl shadow-brand-magenta/30 hover:scale-[1.01] active:scale-95 transition-all text-xs uppercase tracking-widest cursor-pointer"
                >
                  അംഗത്വം പുതുക്കുക ₹100 (Renew Now)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setView('card')}
                  className="w-full h-12 rounded-xl border-slate-250 text-xs uppercase text-slate-500 font-bold hover:bg-slate-50"
                >
                  തിരികെ ഐഡി കാർഡിലേക്ക് (Back to Card)
                </Button>
              </div>
            </div>
          ) : (
            <SupportClaimForm 
              user={user} 
              onClose={() => {
                setClaimRefreshTrigger(prev => prev + 1);
                setView('card');
              }} 
            />
          )}
        </div>
      )}

      {view === 'verify' && verifiedMember && (
        <div className="min-h-screen flex flex-col items-center p-4 pb-20 w-full max-w-lg mx-auto animate-in fade-in duration-500">
          {/* Dashboard Header with Logo */}
          <div className="w-full mb-6 flex items-center justify-between bg-emerald-500/10 backdrop-blur-2xl p-5 rounded-3xl border border-emerald-500/20 shadow-2xl">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-[10px] font-black text-foreground tracking-widest uppercase leading-none">HIGHRICH COMMUNITY REVIVAL SOCIETY</h1>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 inline animate-pulse" /> Official Verification Portal
                </p>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col items-center">
            {/* Status Shield Info Plate */}
            <div className="w-full max-w-sm mb-6 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border-2 border-emerald-500/35 p-5 rounded-[28px] text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-xl pointer-events-none" />
              <div className="h-10 w-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-500">
                <ShieldCheck className="w-5 h-5 animate-bounce" />
              </div>
              <h3 className="text-md font-black text-slate-850 uppercase tracking-tight leading-none">
                ഒഫീഷ്യൽ മെമ്പർ വെരിഫൈഡ് ✓
              </h3>
              <p className="text-[9px] font-black tracking-widest text-emerald-500 uppercase mt-1">HCRS VERIFIED MEMBER IDENTITY</p>
              
              <p className="text-slate-600 dark:text-slate-300 font-semibold text-[10px] leading-relaxed mt-2 p-3 bg-white/40 dark:bg-black/20 rounded-xl border border-emerald-500/10 shadow-inner">
                ഈ ആളുടെ മെമ്പർഷിപ്പ് വിവരങ്ങൾ പൂർണ്ണമായും വെരിഫൈഡ് ആയതുമാണ്.
                <br/>
                <span className="text-[8px] text-slate-400 dark:text-slate-400 font-bold block mt-1 uppercase">This member profile and active digital identity are officially authenticated and active on the HCRS platform.</span>
              </p>
            </div>

            {/* Read-only Member Card */}
            <div className="relative">
              <MembershipCard 
                member={verifiedMember} 
                showCelebration={false} 
                isReadOnly={true}
              />
            </div>

            {/* Controls to return home */}
            <div className="flex flex-col gap-3 w-full max-w-xs mt-8 pb-10">
              <Button 
                onClick={() => {
                  setVerifiedMember(null);
                  setView('landing');
                }}
                className="w-full h-15 rounded-2xl font-black bg-brand-blue hover:bg-brand-blue/95 text-white uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 border-b-4 border-brand-blue/40"
              >
                Go to Home Page
              </Button>
            </div>
          </div>
        </div>
      )}

      {view === 'card' && user && (
        <div className="min-h-screen flex flex-col items-center p-4 pb-20 w-full animate-in fade-in duration-500">
          {/* Dashboard Header with Logo */}
          <div className="w-full max-w-5xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/40 backdrop-blur-2xl p-5 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-[10px] font-black text-foreground tracking-widest uppercase leading-none">HIGHRICH COMMUNITY REVIVAL SOCIETY</h1>
                <p className="text-[9px] font-bold text-brand-magenta uppercase tracking-[0.2em] mt-1">{user.isAdmin ? 'Admin Console' : 'Official Member'}</p>
              </div>
            </div>
          </div>

          {isEditingProfile ? (
            <div className="w-full max-w-lg">
              <ProfileEditForm 
                user={user} 
                onSave={handleSaveProfile} 
                onCancel={() => setIsEditingProfile(false)} 
              />
            </div>
          ) : (
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center mt-2 px-2">
              {/* Left Column/Panel for Information, Statuses, and Quick Actions */}
              <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 w-full max-w-sm mx-auto lg:mx-0">
                
                {/* Welcome / Header Badges */}
                <div className="w-full">
                  {user.renewalPending ? (
                    <div className="flex flex-col items-center lg:items-start animate-in fade-in zoom-in duration-700">
                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-6 py-2 rounded-full text-[10px] font-black shadow-md mb-4 tracking-[0.2em] uppercase flex items-center gap-1.5 w-fit">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verification Pending
                      </div>
                      <h2 className="text-3xl font-black text-brand-magenta tracking-tight leading-none mb-2">Renewal <span className="text-brand-blue italic">Pending</span></h2>
                      <p className="text-foreground/40 text-[10px] font-black tracking-widest uppercase">Verification in Progress</p>
                    </div>
                  ) : isExpired ? (
                    <div className="flex flex-col items-center lg:items-start animate-in fade-in zoom-in duration-700">
                      <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-6 py-2 rounded-full text-[10px] font-black shadow-md mb-4 tracking-[0.2em] uppercase flex items-center gap-1.5 w-fit">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> Expired (കാലാവധി കഴിഞ്ഞു)
                      </div>
                      <h2 className="text-3xl font-black text-brand-magenta tracking-tight leading-none mb-2">Renewal <span className="text-brand-blue italic">Required</span></h2>
                      <p className="text-foreground/40 text-[10px] font-black tracking-widest uppercase">Highrich Community Revival Society</p>
                    </div>
                  ) : user.status === 'active' ? (
                    <div className="flex flex-col items-center lg:items-start animate-in fade-in zoom-in duration-700">
                      {showCelebration && (
                        <div className="mb-4 animate-bounce">
                          <Badge className="bg-brand-magenta text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl font-sans">Congratulations!</Badge>
                        </div>
                      )}
                      <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-6 py-2 rounded-full text-[10px] font-black shadow-md mb-4 tracking-[0.2em] uppercase w-fit">
                        Verification Complete
                      </div>
                      <h2 className="text-4xl font-black text-brand-magenta tracking-tight leading-none mb-2">Welcome <span className="text-brand-blue italic">Home</span></h2>
                      <p className="text-foreground/40 text-[10px] font-black tracking-widest uppercase">Verified Member of HCRS</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center lg:items-start animate-in fade-in slide-in-from-top-4 duration-500 text-center lg:text-left">
                      {showCelebration && (
                        <div className="mb-4 animate-bounce">
                          <Badge className="bg-brand-magenta text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">Congratulations!</Badge>
                        </div>
                      )}
                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-6 py-2 rounded-full text-[10px] font-black shadow-md mb-4 tracking-[0.2em] uppercase w-fit shadow-md">
                        Registration Success
                      </div>
                      <h2 className="text-3xl font-black text-brand-magenta tracking-tight leading-none mb-2">Membership <br/> <span className="text-brand-blue italic">In Progress</span></h2>
                      <p className="text-foreground/50 text-xs font-bold leading-relaxed max-w-xs mt-2">
                        നിങ്ങളുടെ രജിസ്ട്രേഷൻ പൂർത്തിയായി. അഡ്മിൻ പേയ്മെന്റ് വെരിഫൈ ചെയ്തുകഴിഞ്ഞാൽ നിങ്ങളുടെ ഒഫീഷ്യൽ കാർഡ് ഇവിടെ ലഭിക്കുന്നതാണ്.
                      </p>
                    </div>
                  )}
                </div>

                {/* Urgent Actions: Registration Alert / Financial Info Registry Banner */}
                <div className="w-full">
                  {user.renewalPending ? (
                    <div className="w-full bg-amber-50 rounded-[28px] border-2 border-amber-200/50 p-5 text-center lg:text-left shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-xl pointer-events-none" />
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto lg:mx-0 mb-3 text-amber-500">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <h3 className="text-sm font-black text-slate-850 uppercase tracking-tight leading-tight">
                        പുതുക്കൽ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു!
                      </h3>
                      <p className="text-[9px] font-black tracking-widest text-amber-500 uppercase mt-1">RENEWAL PENDING APPROVAL</p>
                      <p className="text-slate-600 font-semibold text-[10px] leading-relaxed mt-2.5">
                        താങ്കളുടെ ₹100 അതിവേഗ ഒഫീഷ്യൽ പുതുക്കൽ അടവ് പരിശോധിക്കുകയാണ്. ഇതുകഴിഞ്ഞാൽ ഫിനാൻഷ്യൽ ഇൻഫോ രജിസ്ട്രി ഫോം ഉടൻ ലഭ്യമാകും.
                      </p>
                    </div>
                  ) : user.status === 'pending' ? (
                    <div className="w-full bg-amber-50 rounded-[28px] border-2 border-amber-200/50 p-5 text-center lg:text-left shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-xl pointer-events-none" />
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto lg:mx-0 mb-3 text-amber-500">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <h3 className="text-sm font-black text-slate-850 uppercase tracking-tight leading-tight">
                        അംഗത്വ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു!
                      </h3>
                      <p className="text-[9px] font-black tracking-widest text-amber-500 uppercase mt-1">MEMBERSHIP PENDING APPROVAL</p>
                      <p className="text-slate-600 font-semibold text-[10px] leading-relaxed mt-2.5">
                        താങ്കളുടെ പുതിയ അംഗത്വ രജിസ്ട്രേഷൻ വിവരങ്ങളും പേയ്‌മെന്റും അഡ്മിൻ പാനലിൽ പരിശോധനയിലാണ്. വെരിഫിക്കേഷൻ പൂർത്തിയായാൽ ഇവിടെ കാർഡ് ആക്റ്റീവ് ആകുകയും വിവര രജിസ്ട്രി ഫോം ലഭ്യമാകുകയും ചെയ്യും.
                      </p>
                    </div>
                  ) : isExpired ? (
                    <div className="w-full bg-rose-50 border-2 border-brand-magenta/30 p-5 rounded-[28px] text-center lg:text-left shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-magenta/5 blur-xl pointer-events-none" />
                      <div className="h-10 w-10 rounded-full bg-brand-magenta/15 border border-brand-magenta/20 flex items-center justify-center mx-auto lg:mx-0 mb-3 text-brand-magenta">
                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                      </div>
                      <h3 className="text-md font-black text-slate-850 uppercase tracking-tight leading-none text-slate-800">
                        അംഗത്വ കാലാവധി കഴിഞ്ഞിരിക്കുന്നു!
                      </h3>
                      <p className="text-[9px] font-black tracking-widest text-brand-magenta uppercase mt-1">MEMBERSHIP EXPIRED</p>
                      <p className="text-slate-500 font-semibold text-[10px] leading-relaxed mt-2.5">
                        താങ്കളുടെ അംഗത്വം കാലാവധി കഴിഞ്ഞിരിക്കുന്നു. വിവര രജിസ്ട്രി ഫോം ഉപയോഗിക്കുന്നതിനും ഐഡി കാർഡ് പുതുക്കുന്നതിനും ₹100 അടയ്ക്കുക.
                      </p>
                      <Button 
                        onClick={() => {
                          setPrefilledMobile(user.mobile);
                          setView('renewal');
                        }}
                        className="w-full h-12 rounded-[18px] font-black bg-brand-magenta text-white shadow-md hover:scale-[1.01] active:scale-95 transition-all mt-4 text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        അംഗത്വം പുതുക്കുക ₹100 (Renew Now)
                      </Button>
                    </div>
                  ) : (
                    <>
                      {submittedClaimsCount >= 4 ? (
                        <div className="w-full space-y-3">
                          <Button 
                            onClick={() => setView('support')}
                            className="w-full h-16 rounded-[22px] font-black bg-emerald-600 text-white shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-wider flex items-center justify-center gap-3 border-b-4 border-emerald-700 cursor-pointer"
                          >
                            <ShieldCheck className="w-5 h-5" />
                            Registry Saved ✓
                          </Button>
                          <div className="text-center lg:text-left">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em]">രജിസ്ട്രി പൂർത്തിയായി (4/4 Submitted)</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">കുടുംബത്തിലെ എല്ലാവരുടെയും വിവരങ്ങൾ രേഖപ്പെടുത്തി</p>
                          </div>
                        </div>
                      ) : submittedClaimsCount > 0 ? (
                        <div className="w-full space-y-3">
                          <Button 
                            onClick={() => setView('support')}
                            className="w-full h-16 rounded-[22px] font-black bg-amber-500 text-white shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-wider flex items-center justify-center gap-3 border-b-4 border-amber-600 cursor-pointer"
                          >
                            <Info className="w-5 h-5 animate-pulse" />
                            Registry Status: {submittedClaimsCount}/4 Saved
                          </Button>
                          <div className="text-center lg:text-left">
                            <p className="text-[10px] font-black text-amber-550 uppercase tracking-[0.15em]">കൂടുതൽ വിവരങ്ങൾ നൽകാം (Slots Open)</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">{submittedClaimsCount} പേരുടെ വിവരങ്ങൾ നൽകി. ബാക്കി ചെയ്യാം.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full space-y-3">
                          <Button 
                            onClick={() => setView('support')}
                            className="w-full h-16 rounded-[22px] font-black bg-brand-magenta text-white shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-wider flex items-center justify-center gap-3 border-b-4 border-brand-magenta/40 cursor-pointer"
                          >
                            <Info className="w-5 h-5" />
                            Financial Info Registry
                          </Button>
                          <div className="text-center lg:text-left">
                            <p className="text-[10px] font-black text-brand-magenta uppercase tracking-[0.15em] animate-pulse">Action Required</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">വിവര രജിസ്ട്രി ഫോം പൂരിപ്പിക്കാൻ ഇവിടെ ക്ലിക്ക് ചെയ്യുക</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Account Controls Buttons Group */}
                <div className="flex flex-col gap-2.5 w-full mt-4">
                  <Button 
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full h-12 rounded-xl font-bold bg-brand-magenta/5 border border-brand-magenta/15 text-brand-magenta hover:bg-brand-magenta/10 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5 text-brand-magenta" /> Edit Profile Details
                  </Button>
                  {(user.role === 'admin' || user.role === 'operator' || user.isAdmin) && (
                    <Button 
                      onClick={() => setView(user.role === 'operator' ? 'operator' : 'admin')}
                      className="w-full h-12 rounded-xl font-bold bg-[#0054A6] hover:bg-[#004ca0] text-white uppercase tracking-widest text-[10px] shadow-sm cursor-pointer"
                    >
                      Open Dashboard
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setView('login')} 
                    className="bg-card w-full h-12 rounded-xl font-bold border-slate-200 text-slate-700 uppercase tracking-widest text-[10px]"
                  >
                    Change Account
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    className="w-full py-2 text-red-500 font-bold uppercase tracking-widest text-[9px]"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>

              {/* Right Column/Panel for the physical PVC digital ID Card */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center w-full">
                <div className={user.status !== 'active' ? 'relative group w-full flex justify-center' : 'w-full flex justify-center'}>
                  <MembershipCard 
                    member={user} 
                    showCelebration={showCelebration} 
                    onUpdatePhoto={handleUpdatePhoto}
                  />
                </div>
              </div>
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
              onUpdatePhoto={handleUpdatePhoto}
              onUpdateDistrictQuota={handleUpdateDistrictQuota}
              onSyncQuotas={handleSyncQuotas}
              districtQuotas={districtQuotas}
              districtQuotasUsed={districtQuotasUsed}
              handleLogout={handleLogout}
              onViewCard={() => setView('card')}
              onRefreshMembers={refreshMembersList}
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
            onRefreshMembers={refreshMembersList}
            isSyncingMembers={isSyncingDocs}
          />
        </div>
      )}

      <AiChatSupport />
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}
