import { useState, useEffect, lazy, Suspense } from 'react';
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
import Logo from './Logo';
import { UserProfile } from './types';
import { subscribeToOrgSettings, OrgSettings, defaultSettings } from './lib/cms';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { DISTRICTS, CONSTITUENCIES, LOGO_URL, FALLBACK_LOGO_URL } from './constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { auth, db, storage, handleFirestoreError, OperationType, secondaryAuth } from './lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { Clock, LogOut, Camera, ShieldCheck, RefreshCw, Users, ShieldAlert, ArrowRight, Eye, Pencil, Trash2, MoreVertical, Receipt, Mail, Smartphone, Search, MapPin, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  if (suffix === 'malappuram' || suffix === 'malapuram' || suffix === 'mlp') return 'MLP';
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
  const [view, setView] = useState<'landing' | 'register' | 'renewal' | 'login' | 'card' | 'admin' | 'operator' | 'support' | 'loading' | 'gallery'>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [districtQuotas, setDistrictQuotas] = useState<Record<string, number>>({});
  const [districtQuotasUsed, setDistrictQuotasUsed] = useState<Record<string, number>>({});
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [prefilledMobile, setPrefilledMobile] = useState('');

  const isExpired = user && user.role !== 'admin' && user.role !== 'operator' && !user.isAdmin && user.status !== 'pending' && (
    user.renewalPending ||
    !user.expiryDate ||
    (() => {
      const exp = user.expiryDate;
      const d = exp?.toDate ? exp.toDate() : (exp?.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
      return isNaN(d.getTime()) ? true : d.getTime() < Date.now();
    })()
  );

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    return () => unsub();
  }, []);
  const [isDirectManual, setIsDirectManual] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hcrs_direct_manual') === 'true';
    }
    return false;
  });

  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing...');
  const [fireStatus, setFireStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const getDistrictCode = (nameOrCode: string) => {
    if (!nameOrCode) return 'OTH';
    const normalized = nameOrCode.trim().toUpperCase();
    const d = DISTRICTS.find(dist => {
      const nameUpper = dist.name.toUpperCase();
      const plainLocalName = dist.name.split(' ')[0].toUpperCase();
      return nameUpper.includes(normalized) || normalized.includes(plainLocalName) || dist.code.toUpperCase() === normalized;
    });
    return d ? d.code : (normalized.length > 3 ? normalized.slice(0, 3) : normalized);
  };

  const getAssemblyCode = (name: string) => {
    if (!name) return 'OTH';
    // Remove spaces, take first 3-5 chars or specific mappings
    const clean = name.trim().toUpperCase().replace(/\s/g, '');
    
    // Specific Mappings for Districts mentioned or common ones
    // Kannur (KNN)
    if (clean === 'THALASSERY') return 'TSY';
    if (clean === 'KANNUR') return 'KNR';
    if (clean === 'TALIPARAMBA') return 'TBA';
    if (clean === 'IRITTY') return 'IRY';
    if (clean === 'PAYYANUR') return 'PNR';
    
    // Malappuram (MPM)
    if (clean === 'KOTTAKKAL') return 'KTK';
    if (clean === 'MALAPPURAM') return 'MPM';
    if (clean === 'PERINTHALMANNA') return 'PMN';
    if (clean === 'NILAMBUR') return 'NBR';
    
    // Ernakulam (EKM)
    if (clean === 'KOCHI') return 'KOC';
    if (clean === 'ALUVA') return 'ALV';
    
    // Kozhikode (KOZ)
    if (clean === 'KOZHIKODE') return 'KOZ';
    if (clean === 'VADAKARA') return 'VDK';

    // Default strategy: first 3 significant letters
    return clean.length >= 3 ? clean.slice(0, 3) : clean.padEnd(3, 'X');
  };

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
      return params.has('memberId') || params.has('distLogin') || hasPathVerify;
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
    }

    if (memberId) {
      console.log("Found memberId in URL/Path:", memberId);
      const fetchMemberForPreview = async () => {
        try {
          const docRef = doc(db, 'users', memberId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const memberData = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
            setUser(memberData);
            setView('card');
            toast.success(`Viewing card for ${memberData.name}`);
            
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
    // Safety check: If still loading after 30 seconds, fallback to landing
    const timer = setTimeout(() => {
      if (view === 'loading' && !isMagicLink) {
        console.log("Loading timeout: Falling back to landing");
        toast.info("സെഷൻ ടൈം-ഔട്ട് ആയി. ദയവായി ലോഗിൻ വീണ്ടും ശ്രമിക്കുക. (Connection timed out)");
        setView('landing');
      }
    }, 15000); // 15 seconds for consistency
    return () => clearTimeout(timer);
  }, [view, isMagicLink]);

  useEffect(() => {
    let unsubscribeMembers: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      console.log("Auth State Changed:", authUser?.email, "Current View:", view);
      
      if (isRegistering) {
        console.log("Auth change ignored: isRegistering is true");
        return;
      }

      if (!authUser) {
        console.log("No authenticated user found.");
        if (!isMagicLink) {
          setUser(null);
          setMembers([]);
          if (unsubscribeMembers) { unsubscribeMembers(); unsubscribeMembers = null; }
          if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
          const curUrl = new URLSearchParams(window.location.search);
          if (view !== 'register' && !curUrl.has('memberId')) setView('landing');
        }
        return;
      }

      setLoadingStatus('Handshake Verified...');
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
        if (view !== 'register') {
          if (isSuperAdminEmail) setView('admin');
          else setView('operator'); // Second admins go to operator (district) view by default unless approved
        }
      }

      if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
      if (unsubscribeMembers) { unsubscribeMembers(); unsubscribeMembers = null; }

      console.log("User is authenticated, fetching profile listener for UID:", authUser.uid);
      setLoadingStatus('Syncing Profile...');
      unsubscribeUser = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
        let userData: UserProfile | null = null;
        console.log("Profile Snapshot Received. Exists:", docSnap.exists());
        
        if (docSnap.exists()) {
          setLoadingStatus('Finalizing Access...');
          const freshData = { uid: authUser.uid, ...docSnap.data() } as UserProfile;
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
          
          const isAdmin = userData.role === 'admin' || userData.isAdmin;
          const isOperator = userData.role === 'operator';
          
          if (isDirectManual && !isMagicLink) {
            setView('operator');
          } else if (isAdmin) {
             setView('admin');
          } else if (isOperator) {
            setView('operator');
          } else {
            const claimRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('hcrs_claim_redirect') === 'true' : false;
            if (claimRedirect) {
              if (typeof window !== 'undefined') sessionStorage.removeItem('hcrs_claim_redirect');
              setView('support');
            } else if (view !== 'register' && view !== 'renewal') {
              setView('card');
            }
          }

          if (isAdmin || isOperator) {
            if (!unsubscribeMembers) {
              let q;
              if (isAdmin) {
                 const isSuper = MAIN_ADMINS.some(e => e.toLowerCase() === currentEmail) || !userData.district;
                 q = isSuper 
                   ? query(collection(db, 'users')) 
                   : query(collection(db, 'users'), where('district', '==', userData.district));
              } else {
                 q = userData.district 
                   ? query(collection(db, 'users'), where('district', '==', userData.district))
                   : query(collection(db, 'users'), where('registeredBy', '==', authUser.uid));
              }
              
              unsubscribeMembers = onSnapshot(q, (snapshot) => {
                const list = snapshot.docs
                  .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
                  .filter(u => {
                    const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === (u.email || '').toLowerCase());
                    return !isMainAdmin;
                  });
                  
                setMembers(prev => {
                   if (prev.length === list.length && snapshot.metadata.fromCache) return prev;
                   return list;
                });
              }, (err) => {
                console.error("Members fetch error:", err);
              });
            }
          }
        } else {
          console.warn("Profile document not found for UID:", authUser.uid);
          if (view === 'loading' && !isAdminEmail) {
            // If they just logged in but have no doc, maybe they're new or deleted
            setView('register');
            toast.info('പൂർണ്ണരൂപം ലഭ്യമല്ല. ദയവായി രജിസ്റ്റർ ചെയ്യുക. (Profile not found, please register)');
          }
        }
      }, (error) => {
        console.error("Profile listen error:", error);
        if (isSuperAdminEmail) setView('admin');
        else if (!isMagicLink && view !== 'register') setView('landing');
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
    let targetEmail = (values.email || '').trim().toLowerCase();
    const trimmedPin = (values.pin || '').trim();
    const isMobile = /^\d{10}$/.test(targetEmail);

    setIsLoggingIn(true);
    setLoadingStatus('Authenticating...');
    try {
      setView('loading');

      if (isMobile) {
        setLoadingStatus('Resolving Mobile Identity...');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('mobile', '==', targetEmail), limit(1));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const userData = querySnap.docs[0].data();
          if (userData.email) targetEmail = userData.email;
          else targetEmail = `${targetEmail}@hcrs.society`;
        } else {
          targetEmail = `${targetEmail}@hcrs.society`;
        }
      }
      setLoadingStatus(`Connecting as ${targetEmail}...`);
      let authResult;
      try {
        authResult = await signInWithEmailAndPassword(auth, targetEmail, trimmedPin);
        console.log("Auth sign-in successful for:", authResult.user.uid);
      } catch (signInError: any) {
        const isSecondAdmin = SECOND_ADMINS.some(email => email.toLowerCase() === targetEmail.toLowerCase());
        if (isSecondAdmin && trimmedPin === '246810' && 
            (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential')) {
          console.log("Second admin user not found with standard credentials. Attempting auto-registration...");
          try {
            authResult = await createUserWithEmailAndPassword(auth, targetEmail, trimmedPin);
            console.log("Auto-registration/login successful for second admin:", authResult.user.uid);
          } catch (signUpError: any) {
            console.error("Auto-registration failed:", signUpError);
            throw signInError; // propagate original signInError
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

      // 1. Move Quota Check BEFORE Auth Creation to avoid orphan accounts
      const distCode = getDistrictCode(values.district);
      const districtQuota = districtQuotas[distCode];
      const usedDistrictQuota = districtQuotasUsed[distCode] || 0;
      
      if (districtQuota !== undefined && districtQuota > 0 && usedDistrictQuota >= districtQuota) {
        throw new Error(`ദയവായി ശ്രദ്ധിക്കുക: ${values.district} ജില്ലക്ക് അനുവദിച്ച എൻട്രികളുടെ എണ്ണം കഴിഞ്ഞിരിക്കുന്നു. (Quota exhausted for ${values.district})`);
      }

      toast.loading('Creating secure account...', { id: loadingToast });
      
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
      
      toast.loading('Saving your details...', { id: loadingToast });
      const userRef = doc(db, 'users', uid);
      const metadataRef = doc(db, 'system', 'totals');
      const quotaRef = doc(db, 'districtQuotas', distCode);
      
      try {
        let nextSerial = 0;
        await runTransaction(db, async (transaction) => {
          // Perform all reads first
          const qSnap = await transaction.get(quotaRef);
          const metaDoc = await transaction.get(metadataRef);

          // Handle quota logic
          if (qSnap.exists()) {
            const qData = qSnap.data();
            if (qData.total > 0 && (qData.used || 0) >= qData.total) {
              throw new Error("QUOTA_FULL");
            }
            transaction.update(quotaRef, { used: increment(1) });
          } else {
            transaction.set(quotaRef, {
              id: distCode,
              districtName: DISTRICTS.find(d => d.code === distCode)?.name || distCode,
              total: 500,
              used: 1
            });
          }
          
          // Handle metadata/serial logic
          nextSerial = 1001;
          if (metaDoc.exists()) {
            nextSerial = (metaDoc.data().count || 1000) + 1;
          }
          transaction.set(metadataRef, { count: nextSerial }, { merge: true });

          const memberDistCode = getDistrictCode(values.district);
          const assemblyCode = getAssemblyCode(values.assemblyConstituency);
          const membershipId = `KL/${memberDistCode}/${assemblyCode}/${nextSerial}`;

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
            waStatus: 'Pending'
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

      const paddedSerial = String(member.serialNo).padStart(3, '0');
      const distCode = (member.district || 'MLP').toUpperCase();
      const assemblyCode = getAssemblyCode(member.assemblyConstituency || '');
      const finalId = `KL/${distCode}/${assemblyCode}/${paddedSerial}`;

      const now = new Date();
      const expiry = new Date();
      expiry.setFullYear(now.getFullYear() + 1); // Default 1 year for all

      const isBulk = orgSettings?.registrationMode === 'bulk';

      await updateDoc(doc(db, 'users', uid), {
        status: 'active',
        isApproved: true,
        membershipId: finalId,
        issueDate: serverTimestamp(),
        expiryDate: expiry,
        waStatus: isBulk ? 'Pending' : 'Sent'
      });
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
      const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === currentEmail);
      const isAdminAccount = values.role === 'admin';
      const adminDist = (user?.role === 'operator' || isSecondAdmin || isAdminAccount) 
        ? (values.district || user?.district)
        : values.district;
      
      const distCodeForQuota = getDistrictCode(adminDist || values.district || 'MLP');
      const districtQuota = districtQuotas[distCodeForQuota];
      const usedDistrictQuota = districtQuotasUsed[distCodeForQuota] || 0;

      console.log(`AddOffline Quota Check: ${distCodeForQuota} -> ${usedDistrictQuota}/${districtQuota}`);

      // 1. Check District Quota
      if (districtQuota !== undefined && districtQuota > 0 && usedDistrictQuota >= districtQuota) {
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

      await runTransaction(db, async (transaction) => {
        // 1. ALL READS FIRST
        const qSnap = await transaction.get(quotaRef);
        const metaDoc = await transaction.get(metadataRef);
        
        // 2. LOGIC AND WRITES
        if (qSnap.exists()) {
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

        let nextSerial = (metaDoc.data()?.count || 1000) + 1;
        transaction.set(metadataRef, { count: nextSerial }, { merge: true });

        const paddedSerial = String(nextSerial).padStart(3, '0');
        const distCodeMember = (values.district || 'MLP').toUpperCase();
        const assemblyCode = getAssemblyCode(values.assemblyConstituency || '');
        const finalId = `KL/${distCodeMember}/${assemblyCode}/${paddedSerial}`;

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
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);

        const offlineMemberData = {
          uid,
          ...values,
          email: finalEmail, // USE SANITIZED EMAIL
          registrationDate: serverTimestamp(),
          membershipId: finalId,
          status: 'active', // Auto-approved
          isPaid: true,
          isApproved: true,
          issueDate: serverTimestamp(),
          expiryDate: expiry,
          isAdmin: isAdminAccount,
          role: values.role || 'member',
          quota: values.quota || 0,
          quotaUsed: 0,
          registeredBy: user?.uid, // Track who added this member
          registeredByName: user?.name || 'Admin', // Store name for display
          serialNo: nextSerial,
          waStatus: isBulk ? 'Pending' : 'Sent'
        };
        transaction.set(userRef, offlineMemberData);
      });
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
      // If we are explicitly setting isApproved to true in an update, 
      // ensure status is active and issueDate is set (Request #3)
      const finalData = { ...data };
      if (data.isApproved === true) {
        finalData.status = 'active';
        finalData.issueDate = serverTimestamp();
        
        // Also set expiry if it doesn't have one
        if (!data.expiryDate) {
          const expiry = new Date();
          expiry.setFullYear(expiry.getFullYear() + 1);
          finalData.expiryDate = expiry;
        }
      }

      await updateDoc(doc(db, 'users', uid), finalData);
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
      await updateDoc(doc(db, 'users', user.uid), updatedData);
      toast.success('Profile updated successfully! (വിവരങ്ങൾ പുതുക്കിയിരിക്കുന്നു.)', { id: loadingToast });
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Save profile error:", error);
      toast.error('Failed to update details.', { id: loadingToast });
    }
  };

  const handleDeleteMember = async (uid: string) => {
    const loadingToast = toast.loading('Deactivating member profile...');
    console.log("Attempting to deactivate (soft-delete) document:", uid);
    try {
      const userRef = doc(db, 'users', uid);
      
      // Update status to deleted instead of hard delete
      await updateDoc(userRef, {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        deletedBy: auth.currentUser?.email
      });
      
      toast.success('Member deactivated and hidden.', { id: loadingToast });
      console.log(`Soft-deleted user successfully: ${uid}`);
    } catch (error: any) {
      console.error("Deactivation failed:", error);
      let msg = 'Deactivation failed. ';
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
      
      // Calculate from local members list
      members.forEach(m => {
        if (m.district) {
          const code = m.district.toUpperCase();
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
      {view === 'landing' && (
        <LandingPage 
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
          <SupportClaimForm 
            user={user} 
            onClose={() => setView('card')} 
          />
        </div>
      )}

      {view === 'card' && user && (
        <div className="min-h-screen flex flex-col items-center p-4 pb-20">
          {/* Dashboard Header with Logo */}
          <div className="w-full max-w-lg mb-6 flex items-center justify-between bg-card/40 backdrop-blur-2xl p-5 rounded-3xl border border-white/10 shadow-2xl">
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
            <>
              <div className="w-full flex flex-col items-center">
                {/* TODAY'S UPDATE BOX (ഇന്നത്തെ അപ്ഡേഷൻ) */}
                {orgSettings?.announcementActive && (
                  <div id="member_announcement_box" className="w-full max-w-sm mb-8 bg-gradient-to-br from-indigo-50/90 to-blue-50/90 border-2 border-brand-blue/30 rounded-3xl p-5 shadow-md relative overflow-hidden transition-all duration-300">
                    {/* Glossy top decorative banner */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-blue to-brand-magenta" />
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="p-1.5 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-xs font-black text-brand-blue uppercase tracking-tight">
                        {orgSettings?.announcementTitle || 'ഇന്നത്തെ അപ്ഡേഷൻ'}
                      </h3>
                      {orgSettings?.announcementCaseDate && (
                        <span className="ml-auto bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/15 px-2.5 py-0.5 rounded-full font-black text-[9px] tracking-wider uppercase font-mono">
                          {orgSettings?.announcementCaseDate}
                        </span>
                      )}
                    </div>

                    {orgSettings?.announcementText && (
                      <div className="text-slate-700 text-xs font-semibold leading-relaxed mb-4 whitespace-pre-wrap bg-white/40 p-3 rounded-2xl border border-slate-100/55">
                        {orgSettings?.announcementText}
                      </div>
                    )}

                    {/* Case Related Detailed Specifications (Court case parameters requested in prompt) */}
                    {(orgSettings?.announcementCaseNo || orgSettings?.announcementCaseName || orgSettings?.announcementCourt || orgSettings?.announcementAdvocate || orgSettings?.announcementJudgeBench) && (
                      <div className="bg-white/90 border border-slate-100 rounded-2xl p-3.5 space-y-2.5 mt-2.5 shadow-xs">
                        {orgSettings?.announcementCaseNo && (
                          <div className="flex justify-between items-center text-[10px] border-b border-dashed border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">കേസ് നമ്പർ (Case No.):</span>
                            <span className="font-black text-slate-800 text-right truncate pl-4 max-w-[190px] font-mono">{orgSettings?.announcementCaseNo}</span>
                          </div>
                        )}
                        {orgSettings?.announcementCaseName && (
                          <div className="flex justify-between items-center text-[10px] border-b border-dashed border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">ആയ കേസ് (Case Name):</span>
                            <span className="font-black text-slate-800 text-right truncate pl-4 max-w-[190px]">{orgSettings?.announcementCaseName}</span>
                          </div>
                        )}
                        {orgSettings?.announcementCourt && (
                          <div className="flex justify-between items-center text-[10px] border-b border-dashed border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">കോടതി (Court):</span>
                            <span className="font-black text-slate-800 text-right truncate pl-4 max-w-[190px]">{orgSettings?.announcementCourt}</span>
                          </div>
                        )}
                        {orgSettings?.announcementAdvocate && (
                          <div className="flex justify-between items-center text-[10px] border-b border-dashed border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">അഭിഭാഷകൻ (Advocate):</span>
                            <span className="font-black text-slate-800 text-right truncate pl-4 max-w-[190px]">{orgSettings?.announcementAdvocate}</span>
                          </div>
                        )}
                        {orgSettings?.announcementJudgeBench && (
                          <div className="flex justify-between items-start text-[10px]">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] shrink-0 mt-0.5">ബെഞ്ച് (Judge/Bench):</span>
                            <span className="font-black text-slate-800 text-right max-w-[190px] leading-tight pl-4">{orgSettings?.announcementJudgeBench}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* URGENT ACTIONS - MOVED TO TOP */}
                <div className="w-full max-w-sm mb-10">
                  {user.renewalPending ? (
                    <div className="w-full bg-amber-50 rounded-[28px] border-2 border-amber-200/50 p-6 text-center shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-xl pointer-events-none" />
                      <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-500">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-black text-slate-850 uppercase tracking-tight leading-tight">
                        പുതുക്കൽ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു!
                      </h3>
                      <p className="text-[10px] font-black tracking-widest text-amber-500 uppercase mt-2">RENEWAL PENDING APPROVAL</p>
                      
                      <p className="text-slate-600 font-semibold text-[11px] leading-relaxed mt-4">
                        താങ്കളുടെ ₹100 അതിവേഗ ഒഫീഷ്യൽ പുതുക്കൽ അടവ് പരിശോധിക്കുകയാണ്. ഇതുകഴിഞ്ഞാൽ ഉടൻ ക്ലൈം ഫോം ലഭ്യമാകും.
                        <br/>
                        <span className="text-[9.5px] text-slate-400 font-bold block mt-2 uppercase">Our admin team is verifying your ₹100 renewal receipt. The claim form unlocks once completed.</span>
                      </p>
                    </div>
                  ) : isExpired ? (
                    <div className="w-full bg-rose-50 border-2 border-brand-magenta/30 p-6 rounded-[28px] text-center shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-magenta/5 blur-xl pointer-events-none" />
                      <div className="h-12 w-12 rounded-full bg-brand-magenta/15 border border-brand-magenta/20 flex items-center justify-center mx-auto mb-4 text-brand-magenta">
                        <AlertTriangle className="w-6 h-6 animate-bounce" />
                      </div>
                      
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">
                        അംഗത്വ കാലാവധി കഴിഞ്ഞിരിക്കുന്നു!
                      </h3>
                      <p className="text-[10px] font-black tracking-widest text-brand-magenta uppercase mt-2">MEMBERSHIP EXPIRED / RENEWAL REQUIRED</p>
                      
                      <p className="text-slate-500 font-semibold text-xs leading-relaxed mt-4">
                        താങ്കളുടെ അംഗത്വം കാലാവധി കഴിഞ്ഞിരിക്കുന്നു. ക്ലൈം ഫോം ഉപയോഗിക്കുന്നതിനും ഐഡി കാർഡ് പുതുക്കുന്നതിനും ₹100 അടയ്ക്കുക.
                        <br/>
                        <span className="text-[9.5px] text-slate-400 font-bold block mt-2 uppercase">Your membership validity has expired. To lock active card features and support claims, please renew now.</span>
                      </p>

                      <Button 
                        onClick={() => {
                          setPrefilledMobile(user.mobile);
                          setView('renewal');
                        }}
                        className="w-full h-14 rounded-2xl font-black bg-brand-magenta text-white shadow-xl shadow-brand-magenta/30 hover:scale-[1.01] active:scale-95 transition-all mt-6 text-xs uppercase tracking-widest cursor-pointer"
                      >
                        അംഗത്വം പുതുക്കുക ₹100 (Renew Now)
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        onClick={() => setView('support')}
                        className="w-full h-18 rounded-[28px] font-black bg-brand-magenta text-white shadow-2xl shadow-brand-magenta/30 hover:scale-[1.02] active:scale-95 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 border-b-4 border-brand-magenta/40"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                           <ShieldAlert className="w-5 h-5" />
                        </div>
                        Support & Claim Form
                      </Button>
                      <div className="flex flex-col items-center mt-4 space-y-1">
                        <p className="text-[10px] font-black text-brand-magenta uppercase tracking-[0.2em] animate-pulse">Action Required</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ക്ലൈം ഫോം പൂരിപ്പിക്കാൻ ഇവിടെ ക്ലിക്ക് ചെയ്യുക</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center mb-10 max-w-md">
                  {user.renewalPending ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-8 py-3 rounded-full text-[10px] font-black shadow-lg mb-6 tracking-[0.2em] uppercase flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verification Pending
                      </div>
                      <h2 className="text-3xl font-black text-brand-magenta tracking-tight leading-none mb-2">Renewal <span className="text-brand-blue italic">Pending</span></h2>
                      <p className="text-foreground/40 text-[10px] font-black tracking-widest uppercase">Verification in Progress</p>
                    </div>
                  ) : isExpired ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                      <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-8 py-3 rounded-full text-[10px] font-black shadow-lg mb-6 tracking-[0.2em] uppercase flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> Expired (കാലാവധി കഴിഞ്ഞു)
                      </div>
                      <h2 className="text-3xl font-black text-brand-magenta tracking-tight leading-none mb-2">Renewal <span className="text-brand-blue italic">Required</span></h2>
                      <p className="text-foreground/40 text-[10px] font-black tracking-widest uppercase">Highrich Community Revival Society</p>
                    </div>
                  ) : user.status === 'active' ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                      {showCelebration && (
                        <div className="mb-4 animate-bounce">
                          <Badge className="bg-brand-magenta text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">Congratulations!</Badge>
                        </div>
                      )}
                      <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-8 py-3 rounded-full text-[10px] font-black shadow-lg mb-6 tracking-[0.2em] uppercase">
                        Verification Complete
                      </div>
                      <h2 className="text-3xl font-black text-brand-magenta tracking-tight leading-none mb-2">Welcome <span className="text-brand-blue italic">Home</span></h2>
                      <p className="text-foreground/40 text-[10px] font-black tracking-widest uppercase">Verified Member of HCRS</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500 text-center">
                      {showCelebration && (
                        <div className="mb-4 animate-bounce">
                          <Badge className="bg-brand-magenta text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">Congratulations!</Badge>
                        </div>
                      )}
                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-8 py-3 rounded-full text-[10px] font-black shadow-lg mb-6 tracking-[0.2em] uppercase">
                        Registration Success
                      </div>
                      <h2 className="text-2xl font-black text-brand-magenta tracking-tight leading-tight mb-4">Membership <br/> <span className="text-brand-blue italic">In Progress</span></h2>
                      <p className="text-foreground/50 text-xs font-bold leading-relaxed px-8 max-w-xs">
                        നിങ്ങളുടെ രജിസ്ട്രേഷൻ പൂർത്തിയായി. അഡ്മിൻ പേയ്മെന്റ് വെരിഫൈ ചെയ്തുകഴിഞ്ഞാൽ നിങ്ങളുടെ ഒഫീഷ്യൽ കാർഡ് ഇവിടെ ലഭിക്കുന്നതാണ്.
                      </p>
                    </div>
                  )}
                 </div>
               
                <div className="w-full flex flex-col items-center">
                  {/* Member Card */}
                  <div className={user.status !== 'active' ? 'relative group' : ''}>
                    <MembershipCard 
                      member={user} 
                      showCelebration={showCelebration} 
                      onUpdatePhoto={handleUpdatePhoto}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs mt-12 pb-20">
                <Button 
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full h-16 rounded-2xl font-bold bg-brand-magenta text-white uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all mb-1 border-b-4 border-brand-magenta/40"
                >
                  <Pencil className="w-4 h-4 text-white" /> Edit Profile Details
                </Button>
                {user.isAdmin && (
                  <Button 
                    onClick={() => setView('admin')}
                    className="w-full h-16 rounded-2xl font-bold bg-brand-blue text-white uppercase tracking-widest shadow-xl"
                  >
                    Open Dashboard
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setView('login')} 
                  className="bg-card w-full h-16 rounded-2xl font-bold border-white/10 text-foreground uppercase tracking-widest"
                >
                  Change Account
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout} 
                  className="w-full py-4 text-red-500 font-bold uppercase tracking-widest text-xs"
                >
                  Sign Out
                </Button>
              </div>
            </>
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
          />
        </div>
      )}

      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}
