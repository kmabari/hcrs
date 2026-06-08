import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  IndianRupee,
  LayoutDashboard,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Info,
  Users,
  User,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { subscribeToOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';

interface CategoryDetail {
  paid: number;
  received: number;
  pending: number;
}

interface SupportClaimFormProps {
  user: any;
  onClose: () => void;
}

const CATEGORIES = [
  { 
    id: 'digital', 
    label: 'Digital Redeem Coupon (ഡിജിറ്റൽ റെഡീം കൂപ്പൺ)',
    heading: 'Digital (ഡിജിറ്റൽ)', 
    sub: 'Redeem Coupon (റെഡീം കൂപ്പൺ)',
    headerColor: 'text-rose-600 font-extrabold'
  },
  { 
    id: 'ott', 
    label: 'OTT Consignment Advance (OTT കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    heading: 'OTT (ഓ ടി ടി)', 
    sub: 'Consignment Advance (കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    headerColor: 'text-violet-600 font-extrabold'
  },
  { 
    id: 'other', 
    label: 'Other Consignment Advance (മറ്റു കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    heading: 'Other (മറ്റുള്ളവ)', 
    sub: 'Consignment Advance (മറ്റു കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    headerColor: 'text-slate-600 font-extrabold'
  }
];

const PREFERENCES = [
  { id: 'settlement', label: 'ബാക്കി തുക ലഭിച്ച ശേഷം സെറ്റിൽമെന്റും അക്കൗണ്ട് ക്ലോസ് ചെയ്യാനും ഞാൻ താല്പര്യപ്പെടുന്നു (I prefer settlement and closure after receiving balance)' },
  { id: 'wait', label: 'കമ്പനി തുടർന്നു പോകുകയാണെങ്കിൽ എനിക്ക് കാത്തിരിക്കാൻ സാധിക്കും (I can wait if company continues and grows)' },
  { id: 'continue', label: 'ഭാവി പ്ലാനുകൾ അനുസരിച്ച് കമ്പനിയുമായി തുടർന്നു പോകാൻ ഞാൻ തയ്യാറാണ് (I am ready to continue with company based on future plans)' }
];

const HARDSHIPS = [
  { id: 'bank', label: 'ബാങ്ക് ജപ്തി ഭീഷണി നേരിടുന്നു (Under bank seizure pressure)' },
  { id: 'crisis', label: 'ഗുരുതരമായ സാമ്പത്തിക പ്രതിസന്ധി (Serious financial crisis)' },
  { id: 'medical', label: 'ചികിത്സാ ആവശ്യങ്ങൾ / അത്യാഹിതങ്ങൾ (Medical emergency)' },
  { id: 'none', label: 'അടിയന്തിര പ്രാധാന്യമില്ല (No emergency)' }
];

export function SupportClaimForm({ user, onClose }: SupportClaimFormProps) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedClaims, setSubmittedClaims] = useState<any[]>([]);

  // 1. Claimant State - Self
  const [selfSelected, setSelfSelected] = useState(true);
  const [selfName, setSelfName] = useState(user?.name || '');
  const [selfHighrichId, setSelfHighrichId] = useState('');
  const [selfCategories, setSelfCategories] = useState<string[]>([]);
  const [selfOtherCategory, setSelfOtherCategory] = useState('');
  const [selfCategoryDetails, setSelfCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [selfNoBreakup, setSelfNoBreakup] = useState(false);
  const [selfTotalPaid, setSelfTotalPaid] = useState(0);
  const [selfTotalReceived, setSelfTotalReceived] = useState(0);
  const [selfTotalPending, setSelfTotalPending] = useState(0);
  const [selfNotes, setSelfNotes] = useState('');

  // 2. Claimant State - Parent (Mother or Father)
  const [parentSelected, setParentSelected] = useState(false);
  const [parentRelation, setParentRelation] = useState<'Mother' | 'Father' | ''>('');
  const [parentName, setParentName] = useState('');
  const [parentHighrichId, setParentHighrichId] = useState('');
  const [parentCategories, setParentCategories] = useState<string[]>([]);
  const [parentOtherCategory, setParentOtherCategory] = useState('');
  const [parentCategoryDetails, setParentCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [parentNoBreakup, setParentNoBreakup] = useState(false);
  const [parentTotalPaid, setParentTotalPaid] = useState(0);
  const [parentTotalReceived, setParentTotalReceived] = useState(0);
  const [parentTotalPending, setParentTotalPending] = useState(0);
  const [parentNotes, setParentNotes] = useState('');

  // 3. Claimant State - Child (Son or Daughter)
  const [childSelected, setChildSelected] = useState(false);
  const [childRelation, setChildRelation] = useState<'Son' | 'Daughter' | ''>('');
  const [childName, setChildName] = useState('');
  const [childHighrichId, setChildHighrichId] = useState('');
  const [childCategories, setChildCategories] = useState<string[]>([]);
  const [childOtherCategory, setChildOtherCategory] = useState('');
  const [childCategoryDetails, setChildCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [childNoBreakup, setChildNoBreakup] = useState(false);
  const [childTotalPaid, setChildTotalPaid] = useState(0);
  const [childTotalReceived, setChildTotalReceived] = useState(0);
  const [childTotalPending, setChildTotalPending] = useState(0);
  const [childNotes, setChildNotes] = useState('');

  // 4. Claimant State - Spouse (Wife or Husband)
  const [spouseSelected, setSpouseSelected] = useState(false);
  const [spouseRelation, setSpouseRelation] = useState<'Wife' | 'Husband' | ''>('');
  const [spouseName, setSpouseName] = useState('');
  const [spouseHighrichId, setSpouseHighrichId] = useState('');
  const [spouseCategories, setSpouseCategories] = useState<string[]>([]);
  const [spouseOtherCategory, setSpouseOtherCategory] = useState('');
  const [spouseCategoryDetails, setSpouseCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [spouseNoBreakup, setSpouseNoBreakup] = useState(false);
  const [spouseTotalPaid, setSpouseTotalPaid] = useState(0);
  const [spouseTotalReceived, setSpouseTotalReceived] = useState(0);
  const [spouseTotalPending, setSpouseTotalPending] = useState(0);
  const [spouseNotes, setSpouseNotes] = useState('');

  // General Questions
  const [futurePreference, setFuturePreference] = useState('');
  const [hardshipStatus, setHardshipStatus] = useState<string[]>([]);
  const [consentLegal, setConsentLegal] = useState(false);

  // Computed booleans for already submitted slots
  const hasSelf = useMemo(() => submittedClaims.some(c => c.relation === 'Self'), [submittedClaims]);
  const hasParent = useMemo(() => submittedClaims.some(c => ['Mother', 'Father'].includes(c.relation)), [submittedClaims]);
  const hasChild = useMemo(() => submittedClaims.some(c => ['Son', 'Daughter'].includes(c.relation)), [submittedClaims]);
  const hasSpouse = useMemo(() => submittedClaims.some(c => ['Wife', 'Husband'].includes(c.relation)), [submittedClaims]);

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    return () => unsub();
  }, []);

  // Fetch existing claims for this user to check submission status
  useEffect(() => {
    async function checkExistingClaims() {
      if (!user) return;
      try {
        setLoading(true);
        
        const rawMobile = String(user.mobile || '').replace(/\D/g, '');
        const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
        const offlineUid = cleanMobile ? `offline_${cleanMobile}` : '';
        const activeUid = user.uid || '';

        // Prepare our parallel query promises
        const queryPromises = [];
        const claimsMap = new Map<string, any>();

        // 1. Query by active UID
        if (activeUid) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('uid', '==', activeUid)))
              .catch(err => {
                console.warn("checkExistingClaims activeUid query notice:", err);
                return null;
              })
          );
        }

        // 2. Query by offline UID
        if (offlineUid) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('uid', '==', offlineUid)))
              .catch(err => {
                console.warn("checkExistingClaims offlineUid query notice:", err);
                return null;
              })
          );
        }

        // 3. Query by userMobile (string)
        if (cleanMobile) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('userMobile', '==', cleanMobile)))
              .catch(err => {
                console.warn("checkExistingClaims cleanMobile query notice:", err);
                return null;
              })
          );
        }

        // 4. Query by userMobile (numeric)
        const numericMobile = Number(cleanMobile);
        if (cleanMobile && !isNaN(numericMobile)) {
          queryPromises.push(
            getDocs(query(collection(db, 'claims'), where('userMobile', '==', numericMobile)))
              .catch(err => {
                console.warn("checkExistingClaims numericMobile query notice:", err);
                return null;
              })
          );
        }

        // Execute all queries in parallel for high speed and robustness
        const snaps = await Promise.all(queryPromises);
        
        // Collate and deduplicate docs
        for (const snap of snaps) {
          if (snap && !snap.empty) {
            snap.docs.forEach(docSnap => {
              claimsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
            });
          }
        }

        let docsList = Array.from(claimsMap.values());

        // --- DYNAMIC CLAIM UID AUTO-HEALING ---
        // If they logged in and are active, heal claims registered with 'offline_' prefix
        if (activeUid && !activeUid.startsWith('offline_') && docsList.length > 0) {
          for (const claim of docsList) {
            if (claim.uid !== activeUid) {
              console.log(`Auto-healing offline claim ID "${claim.id}" UID: ${claim.uid} -> ${activeUid}`);
              try {
                await updateDoc(doc(db, 'claims', claim.id), {
                  uid: activeUid,
                  userMobile: cleanMobile || claim.userMobile || ''
                });
                // Update local memory reference
                claim.uid = activeUid;
                if (cleanMobile) claim.userMobile = cleanMobile;
              } catch (err) {
                console.warn("Failed to background auto-heal claim UID:", err);
              }
            }
          }
        }

        if (docsList.length > 0) {
          setSubmittedClaims(docsList);
          
          const hasSelfDb = docsList.some(c => c.relation === 'Self');
          const hasParentDb = docsList.some(c => ['Mother', 'Father'].includes(c.relation));
          const hasChildDb = docsList.some(c => ['Son', 'Daughter'].includes(c.relation));
          const hasSpouseDb = docsList.some(c => ['Wife', 'Husband'].includes(c.relation));
          
          if (hasSelfDb && hasParentDb && hasChildDb && hasSpouseDb) {
            setAlreadySubmitted(true);
          } else {
            setAlreadySubmitted(false);
            
            // Uncheck submitted categories to prevent duplicate actions
            setSelfSelected(false);
            setParentSelected(false);
            setChildSelected(false);
            setSpouseSelected(false);
            
            // Select the first non-submitted category in list
            if (!hasSelfDb) {
              setSelfSelected(true);
            } else if (!hasParentDb) {
              setParentSelected(true);
            } else if (!hasChildDb) {
              setChildSelected(true);
            } else if (!hasSpouseDb) {
              setSpouseSelected(true);
            }
          }
        } else {
          setSubmittedClaims([]);
          setAlreadySubmitted(false);
          setSelfSelected(true);
          setParentSelected(false);
          setChildSelected(false);
          setSpouseSelected(false);
        }
      } catch (err: any) {
        console.warn("Status check notice: Database query error", err);
      } finally {
        setLoading(false);
      }
    }
    checkExistingClaims();
  }, [user]);

  // Recalculate Totals - Self
  useEffect(() => {
    if (selfNoBreakup) return;
    let paid = 0;
    let rec = 0;
    selfCategories.forEach(cat => {
      const detail = selfCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setSelfTotalPaid(paid);
    setSelfTotalReceived(rec);
    setSelfTotalPending(paid - rec);
  }, [selfCategoryDetails, selfCategories, selfNoBreakup]);

  // Recalculate Totals - Parent
  useEffect(() => {
    if (parentNoBreakup) return;
    let paid = 0;
    let rec = 0;
    parentCategories.forEach(cat => {
      const detail = parentCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setParentTotalPaid(paid);
    setParentTotalReceived(rec);
    setParentTotalPending(paid - rec);
  }, [parentCategoryDetails, parentCategories, parentNoBreakup]);

  // Recalculate Totals - Child
  useEffect(() => {
    if (childNoBreakup) return;
    let paid = 0;
    let rec = 0;
    childCategories.forEach(cat => {
      const detail = childCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setChildTotalPaid(paid);
    setChildTotalReceived(rec);
    setChildTotalPending(paid - rec);
  }, [childCategoryDetails, childCategories, childNoBreakup]);

  // Recalculate Totals - Spouse
  useEffect(() => {
    if (spouseNoBreakup) return;
    let paid = 0;
    let rec = 0;
    spouseCategories.forEach(cat => {
      const detail = spouseCategoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      paid += Number(detail.paid) || 0;
      rec += Number(detail.received) || 0;
    });
    setSpouseTotalPaid(paid);
    setSpouseTotalReceived(rec);
    setSpouseTotalPending(paid - rec);
  }, [spouseCategoryDetails, spouseCategories, spouseNoBreakup]);

  // Helper State Handlers
  const handleCategoryDetailChange = (
    claimant: 'self' | 'parent' | 'child' | 'spouse',
    catId: string,
    field: 'paid' | 'received',
    value: string
  ) => {
    const numVal = parseFloat(value) || 0;
    const setter = claimant === 'self' ? setSelfCategoryDetails 
                 : claimant === 'parent' ? setParentCategoryDetails 
                 : claimant === 'child' ? setChildCategoryDetails
                 : setSpouseCategoryDetails;
    
    setter(prev => {
      const current = prev[catId] || { paid: 0, received: 0, pending: 0 };
      const updated = { ...current, [field]: numVal };
      updated.pending = updated.paid - updated.received;
      return { ...prev, [catId]: updated };
    });
  };

  const handleTotalChange = (
    claimant: 'self' | 'parent' | 'child' | 'spouse',
    field: 'paid' | 'received',
    value: string
  ) => {
    const numVal = parseFloat(value) || 0;
    if (claimant === 'self') {
      if (field === 'paid') {
        setSelfTotalPaid(numVal);
        setSelfTotalPending(numVal - selfTotalReceived);
      } else {
        setSelfTotalReceived(numVal);
        setSelfTotalPending(selfTotalPaid - numVal);
      }
    } else if (claimant === 'parent') {
      if (field === 'paid') {
        setParentTotalPaid(numVal);
        setParentTotalPending(numVal - parentTotalReceived);
      } else {
        setParentTotalReceived(numVal);
        setParentTotalPending(parentTotalPaid - numVal);
      }
    } else if (claimant === 'child') {
      if (field === 'paid') {
        setChildTotalPaid(numVal);
        setChildTotalPending(numVal - childTotalReceived);
      } else {
        setChildTotalReceived(numVal);
        setChildTotalPending(childTotalPaid - numVal);
      }
    } else {
      if (field === 'paid') {
        setSpouseTotalPaid(numVal);
        setSpouseTotalPending(numVal - spouseTotalReceived);
      } else {
        setSpouseTotalReceived(numVal);
        setSpouseTotalPending(spouseTotalPaid - numVal);
      }
    }
  };

  // Combined Totals for visual feedback
  const combinedTotalPaid = useMemo(() => {
    let t = 0;
    if (selfSelected) t += selfTotalPaid;
    if (parentSelected) t += parentTotalPaid;
    if (childSelected) t += childTotalPaid;
    if (spouseSelected) t += spouseTotalPaid;
    return t;
  }, [selfSelected, selfTotalPaid, parentSelected, parentTotalPaid, childSelected, childTotalPaid, spouseSelected, spouseTotalPaid]);

  const combinedTotalReceived = useMemo(() => {
    let t = 0;
    if (selfSelected) t += selfTotalReceived;
    if (parentSelected) t += parentTotalReceived;
    if (childSelected) t += childTotalReceived;
    if (spouseSelected) t += spouseTotalReceived;
    return t;
  }, [selfSelected, selfTotalReceived, parentSelected, parentTotalReceived, childSelected, childTotalReceived, spouseSelected, spouseTotalReceived]);

  const combinedTotalPending = useMemo(() => {
    let t = 0;
    if (selfSelected) t += selfTotalPending;
    if (parentSelected) t += parentTotalPending;
    if (childSelected) t += childTotalPending;
    if (spouseSelected) t += spouseTotalPending;
    return t;
  }, [selfSelected, selfTotalPending, parentSelected, parentTotalPending, childSelected, childTotalPending, spouseSelected, spouseTotalPending]);

  const isEmergency = hardshipStatus.some(h => ['bank', 'crisis', 'medical'].includes(h));

  const priorityInfo = useMemo(() => {
    if (isEmergency) return { label: 'EMERGENCY RED', color: 'bg-red-600', text: 'ബാങ്ക് ജപ്തി ഭീഷണി / കടുത്ത പ്രയാസങ്ങൾ (Bank seizure / serious hardship)' };
    if (futurePreference === 'settlement') return { label: 'RED', color: 'bg-red-500', text: 'ഉടൻ സെറ്റിൽമെന്റ് ആവശ്യപ്പെടുന്നു (Demanding immediate settlement)' };
    if (futurePreference === 'wait') return { label: 'ORANGE', color: 'bg-orange-500', text: 'കുറച്ചു സമയം കാത്തിരിക്കാൻ തയ്യാറാണ് (Willing to wait some time)' };
    if (futurePreference === 'continue') return { label: 'GREEN', color: 'bg-green-500', text: 'കമ്പനിയുമായി തുടർന്നു പോകാൻ താല്പര്യപ്പെടുന്നു (Willing to continue with company)' };
    return { label: 'PENDING', color: 'bg-slate-400', text: 'മുൻഗണന തിരഞ്ഞെടുക്കുക (Selection required)' };
  }, [isEmergency, futurePreference]);

  // Form validations for active claimants
  const hasAtLeastOneClaimant = selfSelected || parentSelected || childSelected || spouseSelected;
  
  const selfValid = !selfSelected || (
    selfName.trim().length > 0 && 
    (selfNoBreakup || selfCategories.length > 0)
  );

  const parentValid = !parentSelected || (
    parentName.trim().length > 0 && 
    parentRelation !== '' && 
    (parentNoBreakup || parentCategories.length > 0)
  );

  const childValid = !childSelected || (
    childName.trim().length > 0 && 
    childRelation !== '' && 
    (childNoBreakup || childCategories.length > 0)
  );

  const spouseValid = !spouseSelected || (
    spouseName.trim().length > 0 && 
    spouseRelation !== '' && 
    (spouseNoBreakup || spouseCategories.length > 0)
  );

  const formIsValid = 
    hasAtLeastOneClaimant && 
    selfValid && 
    parentValid && 
    childValid && 
    spouseValid && 
    futurePreference && 
    hardshipStatus.length > 0 && 
    consentLegal;

  const handleSubmit = async () => {
    if (!formIsValid) {
      toast.error('ദയവായി എല്ലാ ആവശ്യ വിവരങ്ങളും പൂരിപ്പിക്കുക.');
      return;
    }

    try {
      setLoading(true);
      
      const deleteExistingForCategory = async (relations: string[]) => {
        try {
          if (user.uid) {
            const qUid = query(collection(db, 'claims'), where('uid', '==', user.uid));
            const snapUid = await getDocs(qUid);
            for (const docSnap of snapUid.docs) {
              const d = docSnap.data();
              if (relations.includes(d.relation)) {
                await deleteDoc(docSnap.ref);
              }
            }
          } else if (user.mobile) {
            const qMobile = query(collection(db, 'claims'), where('userMobile', '==', user.mobile));
            const snapMobile = await getDocs(qMobile);
            for (const docSnap of snapMobile.docs) {
              const d = docSnap.data();
              if (relations.includes(d.relation)) {
                await deleteDoc(docSnap.ref);
              }
            }
          }
        } catch (err) {
          console.error("Error deleting matching key:", err);
        }
      };

      const commonData = {
        uid: user.uid,
        membershipId: user.membershipId || 'PENDING',
        userMobile: user.mobile,
        userDistrict: user.district || '',
        userAddress: user.address || '',
        userConstituency: user.constituency || '',
        userEmail: user.email || '',
        userBloodGroup: user.bloodGroup || '',
        futurePreference,
        hardshipStatus,
        isEmergency,
        priorityStatus: priorityInfo.label,
        consentLegal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 1. Submit Self Claim
      if (selfSelected && !hasSelf) {
        await deleteExistingForCategory(['Self']);
        const selfClaim = {
          ...commonData,
          relation: 'Self',
          relationLabel: 'Self (സ്വന്തം)',
          userName: selfName || user.name,
          highrichId: selfHighrichId,
          categories: selfCategories,
          otherCategory: selfOtherCategory,
          categoryDetails: selfCategoryDetails,
          noBreakup: selfNoBreakup,
          totalPaid: selfTotalPaid,
          totalReceived: selfTotalReceived,
          totalPending: selfTotalPending,
          notes: selfNotes,
        };
        await addDoc(collection(db, 'claims'), selfClaim);
      }

      // 2. Submit Parent Claim
      if (parentSelected && !hasParent) {
        await deleteExistingForCategory(['Mother', 'Father']);
        const parentClaim = {
          ...commonData,
          relation: parentRelation,
          relationLabel: parentRelation === 'Mother' ? 'അമ്മ (Mother)' : 'അച്ഛൻ (Father)',
          userName: parentName,
          highrichId: parentHighrichId,
          categories: parentCategories,
          otherCategory: parentOtherCategory,
          categoryDetails: parentCategoryDetails,
          noBreakup: parentNoBreakup,
          totalPaid: parentTotalPaid,
          totalReceived: parentTotalReceived,
          totalPending: parentTotalPending,
          notes: parentNotes,
        };
        await addDoc(collection(db, 'claims'), parentClaim);
      }

      // 3. Submit Child Claim
      if (childSelected && !hasChild) {
        await deleteExistingForCategory(['Son', 'Daughter']);
        const childClaim = {
          ...commonData,
          relation: childRelation,
          relationLabel: childRelation === 'Son' ? 'മകൻ (Son)' : 'മകൾ (Daughter)',
          userName: childName,
          highrichId: childHighrichId,
          categories: childCategories,
          otherCategory: childOtherCategory,
          categoryDetails: childCategoryDetails,
          noBreakup: childNoBreakup,
          totalPaid: childTotalPaid,
          totalReceived: childTotalReceived,
          totalPending: childTotalPending,
          notes: childNotes,
        };
        await addDoc(collection(db, 'claims'), childClaim);
      }

      // 4. Submit Spouse Claim
      if (spouseSelected && !hasSpouse) {
        await deleteExistingForCategory(['Wife', 'Husband']);
        const spouseClaim = {
          ...commonData,
          relation: spouseRelation,
          relationLabel: spouseRelation === 'Wife' ? 'ഭാര്യ (Wife)' : 'ഭർത്താവ് (Husband)',
          userName: spouseName,
          highrichId: spouseHighrichId,
          categories: spouseCategories,
          otherCategory: spouseOtherCategory,
          categoryDetails: spouseCategoryDetails,
          noBreakup: spouseNoBreakup,
          totalPaid: spouseTotalPaid,
          totalReceived: spouseTotalReceived,
          totalPending: spouseTotalPending,
          notes: spouseNotes,
        };
        await addDoc(collection(db, 'claims'), spouseClaim);
      }

      setCompleted(true);
      toast.success('നിങ്ങളുടെ വിവരങ്ങൾ വിജയകരമായി സമർപ്പിച്ചിട്ടുണ്ട്.');
    } catch (error) {
      console.error("Submission error:", error);
      toast.error('രേഖപ്പെടുത്തുന്നതിൽ പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.');
    } finally {
      setLoading(false);
    }
  };

  // Render Already Submitted View
  if (alreadySubmitted && !completed) {
    return (
      <div className="p-8 text-center space-y-6 max-w-lg mx-auto flex flex-col justify-center min-h-screen my-auto">
        <div className="w-16 h-16 bg-rose-50 border border-brand-magenta/30 rounded-full flex items-center justify-center mx-auto mb-2 text-brand-magenta shadow-lg">
          <ShieldAlert className="w-8 h-8 animate-pulse text-brand-magenta" />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">സമർപ്പണം ഇതിനകം പൂർത്തിയായി!<br/>(Already Submitted)</h2>
        <p className="text-brand-magenta text-[9px] font-black tracking-widest uppercase">REGISTRY ACCOUNT ACCESS PROTECTED</p>

        {/* List of Registered Claimants */}
        <div className="space-y-4 text-left mt-4">
          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">രജിസ്റ്റർ ചെയ്ത ക്ലെയിമുകൾ (Registered Claims):</h4>
          <div className="grid grid-cols-1 gap-3">
            {submittedClaims.map((claim, idx) => (
              <div key={claim.id || idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 block">{claim.userName}</span>
                    {claim.highrichId && (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded mt-1 inline-block">HR ID: {claim.highrichId}</span>
                    )}
                  </div>
                  <Badge className="text-[9px] font-black uppercase bg-brand-magenta/10 text-brand-magenta border-none rounded-lg py-1 px-2.5">
                    {claim.relation === 'Self' ? 'സ്വന്തം (Self)' :
                     claim.relation === 'Mother' ? 'അമ്മ (Mother)' :
                     claim.relation === 'Father' ? 'അച്ഛൻ (Father)' :
                     claim.relation === 'Son' ? 'മകൻ (Son)' :
                     claim.relation === 'Daughter' ? 'മകൾ (Daughter)' :
                     claim.relation === 'Wife' ? 'ഭാര്യ (Wife)' :
                     claim.relation === 'Husband' ? 'ഭർത്താവ് (Husband)' : claim.relationLabel || claim.relation || 'Self'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-2.5 mt-1.5 border-t border-slate-200/60 text-[11px] font-bold">
                  <div>
                    <p className="text-[8px] text-slate-400 uppercase tracking-wider font-extrabold">Paid (പണമടച്ചത്)</p>
                    <p className="text-slate-700 font-black">₹{claim.totalPaid?.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-400 uppercase tracking-wider font-extrabold">Received (ലഭിച്ചത്)</p>
                    <p className="text-green-600 font-black">₹{claim.totalReceived?.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-400 uppercase tracking-wider font-extrabold">Pending (ബാക്കി)</p>
                    <p className="text-brand-magenta font-black">₹{claim.totalPending?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-2xl text-slate-800 font-bold text-xs leading-relaxed text-left space-y-3">
          <p className="text-emerald-950 font-extrabold text-sm flex items-center gap-1.5 leading-none mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
            അറിയിപ്പ് (Important Notice):
          </p>
          <p className="text-slate-800 font-extrabold text-xs leading-relaxed">
            താങ്കളുടെയും കുടുംബാംഗങ്ങളുടെയും 4 ഫോമുകളും വിജയകരമായി സമർപ്പിച്ചിട്ടുള്ളതാണ്. വിവരങ്ങൾ ഡിലീറ്റ് ചെയ്യുകയോ എഡിറ്റ് ചെയ്യുകയോ ചെയ്യണമെങ്കിൽ ദയവായി അഡ്മിനുമായി ബന്ധപ്പെടുക.
          </p>
          <p className="text-slate-500 font-medium text-[10.5px] leading-normal uppercase">
            All 4 claim forms have been successfully submitted. If you need to modify or delete your submissions, please contact an administrator.
          </p>
        </div>

        <Button onClick={onClose} className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue/95 text-white font-bold shadow-lg active:scale-95 transition-all text-xs">
          തിരികെ ഡാഷ്‌ബോർഡിലേക്ക് (Back to Dashboard)
        </Button>
      </div>
    );
  }

  // Render Submitted successfully output
  if (completed) {
    const totalFilledNow = (() => {
      let count = submittedClaims.length;
      if (selfSelected && !hasSelf) count++;
      if (parentSelected && !hasParent) count++;
      if (childSelected && !hasChild) count++;
      if (spouseSelected && !hasSpouse) count++;
      return count;
    })();

    const remainingSlots = 4 - totalFilledNow;

    return (
      <div className="p-8 text-center space-y-6 max-w-md mx-auto flex flex-col justify-center min-h-screen my-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-300 shadow-md">
          <CheckCircle2 className="w-8 h-8 text-green-600 animate-bounce" />
        </div>
        <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">സമർപ്പണം വിജയകരം<br/>(Submitted Successfully)</h2>
        <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">FINANCIAL REGISTRY SUBMISSION COMPLETED</p>

        <div className="bg-emerald-50/50 border border-emerald-500/15 p-5 rounded-2xl text-slate-705 font-bold text-xs leading-relaxed text-left space-y-3 shadow-inner">
          <p className="text-emerald-950 font-black text-sm">
            പ്രിയ അംഗമേ,
          </p>
          <p className="text-slate-700 font-bold">
            താങ്കൾ സമർപ്പിച്ച വിവരങ്ങൾ വിജയകരമായി സിസ്റ്റത്തിൽ രേഖപ്പെടുത്തി. {totalFilledNow > 0 && `ഇതുവരെ ആകെ ${totalFilledNow} വ്യക്തികളുടെ വിവരങ്ങൾ നൽകിയിട്ടുണ്ട്.`}
          </p>
          {remainingSlots > 0 ? (
            <p className="text-amber-800 bg-amber-50/70 p-3 rounded-xl border border-amber-100 mt-2 font-black leading-relaxed">
              താങ്കളുടെ കുടുംബാംഗങ്ങൾക്കായി ബാക്കിയുള്ള <strong>{remainingSlots} പേരുടെ ക്ലെയിം ഫോമുകൾ</strong> എപ്പോൾ വേണമെങ്കിലും പൂരിപ്പിച്ചു സമർപ്പിക്കാവുന്നതാണ്!
            </p>
          ) : (
            <p className="text-emerald-800 bg-emerald-100/50 p-3 rounded-xl border border-emerald-200 mt-2 font-black">
              താങ്കളുടെ ലോഗിൻ വഴിയുള്ള പരമാവധി 4 ക്ലെയിം കാർഡുകളും പൂർണ്ണമായി സമർപ്പിച്ചു കഴിഞ്ഞു.
            </p>
          )}
          <p className="text-[10px] text-slate-500 font-medium leading-normal mt-2 pt-1 border-t border-slate-100">
            സമ്മതപ്രകാരം വിവരങ്ങൾ അഡ്മിൻ ഒഡിറ്റിംഗ് പാനലിലും ലീഗൽ അഡ്വൈസർ കോപ്പിയിലുമായി ഉൾപ്പെടുത്തി തുടർനടപടികൾ സ്വീകരിക്കുന്നതാണ്.
          </p>
        </div>

        <Button onClick={onClose} className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-bold shadow-lg active:scale-95 transition-all text-xs">
          തിരികെ ഡാഷ്‌ബോർഡിലേക്ക് (Back to Dashboard)
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-28">
      {/* Header */}
      <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-xl z-25 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
            <Users className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
             <h3 className="text-xs font-black text-brand-blue uppercase tracking-tight">ക്ലെയിം രജിസ്ട്രി ഫോം (Claim Registry)</h3>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Register up to 3 direct family members</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0 font-bold">✕</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 max-w-2xl mx-auto w-full">
        
        {/* User Info Read-only */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 grid grid-cols-2 gap-4 shadow-sm">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Account Member</p>
              <p className="text-xs font-black text-slate-700 truncate">{user.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</p>
              <p className="text-xs font-black text-slate-700">{user.mobile}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Membership ID</p>
              <p className="text-xs font-black text-brand-blue truncate">{user.membershipId || 'Wait for approval'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">District</p>
              <p className="text-xs font-black text-slate-500 truncate">{user.district || 'N/A'}</p>
            </div>
        </div>

        {/* Information Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-2">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-wide">പ്രധാന നിർദ്ദേശം (Warning & Limit Rules)</h4>
                <p className="text-slate-700 font-bold text-[11px] leading-relaxed">
                  ഈ ഫോം വഴി <strong>3 വ്യക്തികളുടെ വരെ (അതോടൊപ്പം അച്ഛൻ/അമ്മ അല്ലെങ്കിൽ മകൻ/മകൾ)</strong> വിഹിതങ്ങൾ പരമാവധി ക്ലെയിം ചെയ്യാവുന്നതാണ്. ഓരോ വ്യക്തിയെയും അഡ്മിൻ പാനലിൽ വ്യത്യസ്ത വ്യക്തികളായി കണക്കാക്കി പരിഗണിക്കുന്നതാണ്.
                </p>
              </div>
            </div>
        </div>

        {/* Previously Submitted Claims and remaining count notice */}
        {submittedClaims.length > 0 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-1.5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-wide">രജിസ്ട്രേഷൻ പുരോഗതി (Registry Status)</h4>
                    <p className="text-slate-700 font-bold text-[11px] leading-relaxed">
                      താങ്കളുടെ <strong>{submittedClaims.length} ക്ലെയിം ഫോം(കൾ)</strong> ഇതിനകം സമർപ്പിച്ചിട്ടുള്ളതാണ്.
                      {submittedClaims.length < 4 ? (
                        <> കുടുംബത്തിലെ ബാക്കി <strong>{4 - submittedClaims.length} വ്യക്തികൾക്കുള്ള ഫോം കൂടി</strong> താഴെ പൂരിപ്പിച്ചു സബ്മിറ്റ് ചെയ്യാവുന്നതാണ്.</>
                      ) : (
                        <> എല്ലാ അവസരങ്ങളും പരമാവധി ഉപയോഗിച്ചു കഴിഞ്ഞു.</>
                      )}
                    </p>
                  </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                റജിസ്റ്റർ ചെയ്ത കുടുംബാംഗങ്ങൾ (Registered Claims)
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {submittedClaims.map((claim, idx) => (
                  <div key={claim.id || idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center text-xs font-bold text-slate-700 shadow-xs">
                    <div>
                      <p className="font-extrabold text-slate-800 text-[11.5px] leading-tight">{claim.userName}</p>
                      <p className="text-[9px] font-bold text-slate-405 mt-0.5 uppercase tracking-wider">
                        {claim.relation === 'Self' ? 'സ്വന്തം (Self)' :
                         claim.relation === 'Mother' ? 'അമ്മ (Mother)' :
                         claim.relation === 'Father' ? 'അച്ഛൻ (Father)' :
                         claim.relation === 'Son' ? 'മകൻ (Son)' :
                         claim.relation === 'Daughter' ? 'മകൾ (Daughter)' :
                         claim.relation === 'Wife' ? 'ഭാര്യ (Wife)' :
                         claim.relation === 'Husband' ? 'ഭർത്താവ് (Husband)' : claim.relationLabel || claim.relation}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider leading-none mb-0.5">Pending Amount</p>
                      <p className="text-xs font-black text-brand-magenta">₹{claim.totalPending?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SLOT 1: SELF CLAIM (ആ വ്യക്തി) */}
        {!hasSelf && (
        <Card className="border-2 border-slate-150 rounded-3xl shadow-sm overflow-hidden bg-white">
          <CardContent className="p-5 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-black">1</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">സ്വന്തം ക്ലെയിം (Self Claimant)</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Primary member details</p>
                </div>
              </div>
              <Checkbox 
                checked={selfSelected} 
                onCheckedChange={(val) => setSelfSelected(!!val)} 
                className="w-5 h-5 border-slate-300" 
              />
            </div>

            {selfSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">പേര് (Claimant name)</Label>
                    <Input 
                      value={selfName} 
                      onChange={(e) => setSelfName(e.target.value)} 
                      placeholder="പേര് നൽകുക"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Highrich Company ID (Optional)</Label>
                    <Input 
                      value={selfHighrichId} 
                      onChange={(e) => setSelfHighrichId(e.target.value)} 
                      placeholder="Enter HR ID if known"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                   <Checkbox 
                     id="self-no-breakup"
                     checked={selfNoBreakup}
                     onCheckedChange={(val) => setSelfNoBreakup(!!val)}
                     className="w-4 h-4"
                   />
                   <Label htmlFor="self-no-breakup" className="text-11px font-bold text-slate-600 leading-tight cursor-pointer">
                     കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {selfNoBreakup ? (
                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 p-4 border border-dashed rounded-2xl">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Paid Amount (തുക നൽകിയത്)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Paid"
                          value={selfTotalPaid || ''}
                          onChange={(e) => handleTotalChange('self', 'paid', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Received (ലഭിച്ച തുക)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Received"
                          value={selfTotalReceived || ''}
                          onChange={(e) => handleTotalChange('self', 'received', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക (Select Categories)</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = selfCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setSelfCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3 py-2 border rounded-xl cursor-pointer text-xs font-black flex items-center gap-2 transition-all ${isSel ? 'border-brand-magenta bg-brand-magenta/[0.04] text-brand-magenta' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {selfCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex items-center justify-between p-3 border border-slate-150 rounded-xl bg-slate-50/40 gap-4">
                            <span className="text-[11px] font-black text-slate-600 block shrink-0 w-28 truncate">{cat?.heading || catId}</span>
                            <div className="flex gap-2 flex-1">
                              <Input 
                                type="number" 
                                placeholder="Paid" 
                                value={selfCategoryDetails[catId]?.paid || ''}
                                onChange={(e) => handleCategoryDetailChange('self', catId, 'paid', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                              <Input 
                                type="number" 
                                placeholder="Recd." 
                                value={selfCategoryDetails[catId]?.received || ''}
                                onChange={(e) => handleCategoryDetailChange('self', catId, 'received', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">നോട്ട് / കൂടുതൽ വിവരങ്ങൾ (Notes / Remarks regarding payment)</Label>
                  <textarea 
                    value={selfNotes} 
                    onChange={(e) => setSelfNotes(e.target.value)} 
                    placeholder="ഏത് അക്കൗണ്ടിൽ നിന്നാണ് പണം നൽകിയത് അല്ലെങ്കിൽ ട്രാൻസാക്ഷൻ സംബന്ധമായ കൂടുതൽ വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം..."
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:border-brand-magenta/85 focus:ring-0 focus:outline-none min-h-20 bg-slate-50/20"
                  />
                </div>

                {/* Amount mini-badge */}
                <div className="bg-slate-50 rounded-2xl p-3 flex justify-between items-center text-xs text-slate-500 font-bold">
                  <span>ആകെ മിച്ച തുക:</span>
                  <span className="text-sm font-black text-brand-magenta">₹{selfTotalPending.toLocaleString('en-IN')}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
        )}

        {/* SLOT 2: PARENT CLAIM (മാതാവ് അല്ലെങ്കിൽ പിതാവ്) */}
        {!hasParent && (
        <Card className="border-2 border-slate-150 rounded-3xl shadow-sm overflow-hidden bg-white">
          <CardContent className="p-5 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-black">2</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">മാതാവ് / പിതാവ് ക്ലെയിം (Parent Claimant)</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Add Mother or Father (Only one parent limit)</p>
                </div>
              </div>
              <Checkbox 
                checked={parentSelected} 
                onCheckedChange={(val) => {
                  setParentSelected(!!val);
                  if (!!val && !parentRelation) setParentRelation('Mother'); // default relationship
                }} 
                className="w-5 h-5 border-slate-300" 
              />
            </div>

            {parentSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Relationship selector - MANDATORY & Restricted to Parent */}
                <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
                   <Label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">ആ വ്യക്തിയുമായുള്ള ബന്ധം തിരയുക * (Relation - Required)</Label>
                   <RadioGroup 
                     value={parentRelation} 
                     onValueChange={(val) => setParentRelation(val as 'Mother' | 'Father')} 
                     className="flex gap-4"
                   >
                     <div className="flex items-center gap-2 cursor-pointer">
                       <RadioGroupItem value="Mother" id="parent-mother" className="text-brand-magenta" />
                       <Label htmlFor="parent-mother" className="text-xs font-bold text-slate-700 cursor-pointer">അമ്മ (Mother)</Label>
                     </div>
                     <div className="flex items-center gap-2 cursor-pointer">
                       <RadioGroupItem value="Father" id="parent-father" className="text-brand-magenta" />
                       <Label htmlFor="parent-father" className="text-xs font-bold text-slate-700 cursor-pointer">അച്ഛൻ (Father)</Label>
                     </div>
                   </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">മാതാവ് / പിതാവിന്റെ പേര് * (Full Name - Required)</Label>
                    <Input 
                      value={parentName} 
                      onChange={(e) => setParentName(e.target.value)} 
                      placeholder="പേര് നൽകുക (Enter Full Name)"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Highrich Company ID (Optional)</Label>
                    <Input 
                      value={parentHighrichId} 
                      onChange={(e) => setParentHighrichId(e.target.value)} 
                      placeholder="Enter HR ID if known"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                   <Checkbox 
                     id="parent-no-breakup"
                     checked={parentNoBreakup}
                     onCheckedChange={(val) => setParentNoBreakup(!!val)}
                     className="w-4 h-4"
                   />
                   <Label htmlFor="parent-no-breakup" className="text-11px font-bold text-slate-600 leading-tight cursor-pointer">
                     കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {parentNoBreakup ? (
                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 p-4 border border-dashed rounded-2xl">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Paid Amount (തുക നൽകിയത്)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Paid"
                          value={parentTotalPaid || ''}
                          onChange={(e) => handleTotalChange('parent', 'paid', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Received (ലഭിച്ച തുക)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Received"
                          value={parentTotalReceived || ''}
                          onChange={(e) => handleTotalChange('parent', 'received', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക (Select Categories)</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = parentCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setParentCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3 py-2 border rounded-xl cursor-pointer text-xs font-black flex items-center gap-2 transition-all ${isSel ? 'border-brand-magenta bg-brand-magenta/[0.04] text-brand-magenta' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {parentCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex items-center justify-between p-3 border border-slate-150 rounded-xl bg-slate-50/40 gap-4">
                            <span className="text-[11px] font-black text-slate-600 block shrink-0 w-28 truncate">{cat?.heading || catId}</span>
                            <div className="flex gap-2 flex-1">
                              <Input 
                                type="number" 
                                placeholder="Paid" 
                                value={parentCategoryDetails[catId]?.paid || ''}
                                onChange={(e) => handleCategoryDetailChange('parent', catId, 'paid', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                              <Input 
                                type="number" 
                                placeholder="Recd." 
                                value={parentCategoryDetails[catId]?.received || ''}
                                onChange={(e) => handleCategoryDetailChange('parent', catId, 'received', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">നോട്ട് / കൂടുതൽ വിവരങ്ങൾ (Notes / Remarks regarding payment)</Label>
                  <textarea 
                    value={parentNotes} 
                    onChange={(e) => setParentNotes(e.target.value)} 
                    placeholder="ഏത് അക്കൗണ്ടിൽ നിന്നാണ് പണം നൽകിയത് അല്ലെങ്കിൽ ട്രാൻസാക്ഷൻ സംബന്ധമായ കൂടുതൽ വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം..."
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:border-brand-magenta/85 focus:ring-0 focus:outline-none min-h-20 bg-slate-50/20"
                  />
                </div>

                {/* Amount mini-badge */}
                <div className="bg-slate-50 rounded-2xl p-3 flex justify-between items-center text-xs text-slate-500 font-bold">
                  <span>ആകെ മിച്ച തുക:</span>
                  <span className="text-sm font-black text-brand-magenta">₹{parentTotalPending.toLocaleString('en-IN')}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
        )}

        {/* SLOT 3: CHILD CLAIM (മകൻ അല്ലെങ്കിൽ മകൾ) */}
        {!hasChild && (
        <Card className="border-2 border-slate-150 rounded-3xl shadow-sm overflow-hidden bg-white">
          <CardContent className="p-5 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-black">3</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">മകൻ / മകൾ ക്ലെയിം (Child Claimant)</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Add Daughter or Son (Only one child limit)</p>
                </div>
              </div>
              <Checkbox 
                checked={childSelected} 
                onCheckedChange={(val) => {
                  setChildSelected(!!val);
                  if (!!val && !childRelation) setChildRelation('Son'); // default relationship
                }} 
                className="w-5 h-5 border-slate-300" 
              />
            </div>

            {childSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Relationship selector - MANDATORY & Restricted to Child */}
                <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 font-medium">
                   <Label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">ആ വ്യക്തിയുമായുള്ള ബന്ധം തിരയുക * (Relation - Required)</Label>
                   <RadioGroup 
                     value={childRelation} 
                     onValueChange={(val) => setChildRelation(val as 'Son' | 'Daughter')} 
                     className="flex gap-4"
                   >
                     <div className="flex items-center gap-2 cursor-pointer">
                       <RadioGroupItem value="Son" id="child-son" className="text-brand-magenta" />
                       <Label htmlFor="child-son" className="text-xs font-bold text-slate-700 cursor-pointer">മകൻ (Son)</Label>
                     </div>
                     <div className="flex items-center gap-2 cursor-pointer">
                       <RadioGroupItem value="Daughter" id="child-daughter" className="text-brand-magenta" />
                       <Label htmlFor="child-daughter" className="text-xs font-bold text-slate-700 cursor-pointer">മകൾ (Daughter)</Label>
                     </div>
                   </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">മകൻ / മകളുടെ പേര് * (Full Name - Required)</Label>
                    <Input 
                      value={childName} 
                      onChange={(e) => setChildName(e.target.value)} 
                      placeholder="പേര് നൽകുക (Enter Full Name)"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Highrich Company ID (Optional)</Label>
                    <Input 
                      value={childHighrichId} 
                      onChange={(e) => setChildHighrichId(e.target.value)} 
                      placeholder="Enter HR ID if known"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                   <Checkbox 
                     id="child-no-breakup"
                     checked={childNoBreakup}
                     onCheckedChange={(val) => setChildNoBreakup(!!val)}
                     className="w-4 h-4"
                   />
                   <Label htmlFor="child-no-breakup" className="text-11px font-bold text-slate-600 leading-tight cursor-pointer">
                     കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {childNoBreakup ? (
                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 p-4 border border-dashed rounded-2xl">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Paid Amount (തുക നൽകിയത്)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Paid"
                          value={childTotalPaid || ''}
                          onChange={(e) => handleTotalChange('child', 'paid', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Received (ലഭിച്ച തുക)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Received"
                          value={childTotalReceived || ''}
                          onChange={(e) => handleTotalChange('child', 'received', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക (Select Categories)</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = childCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setChildCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3 py-2 border rounded-xl cursor-pointer text-xs font-black flex items-center gap-2 transition-all ${isSel ? 'border-brand-magenta bg-brand-magenta/[0.04] text-brand-magenta' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {childCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex items-center justify-between p-3 border border-slate-150 rounded-xl bg-slate-50/40 gap-4">
                            <span className="text-[11px] font-black text-slate-600 block shrink-0 w-28 truncate">{cat?.heading || catId}</span>
                            <div className="flex gap-2 flex-1">
                              <Input 
                                type="number" 
                                placeholder="Paid" 
                                value={childCategoryDetails[catId]?.paid || ''}
                                onChange={(e) => handleCategoryDetailChange('child', catId, 'paid', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                              <Input 
                                type="number" 
                                placeholder="Recd." 
                                value={childCategoryDetails[catId]?.received || ''}
                                onChange={(e) => handleCategoryDetailChange('child', catId, 'received', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">നോട്ട് / കൂടുതൽ വിവരങ്ങൾ (Notes / Remarks regarding payment)</Label>
                  <textarea 
                    value={childNotes} 
                    onChange={(e) => setChildNotes(e.target.value)} 
                    placeholder="ഏത് അക്കൗണ്ടിൽ നിന്നാണ് പണം നൽകിയത് അല്ലെങ്കിൽ ട്രാൻസാക്ഷൻ സംബന്ധമായ കൂടുതൽ വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം..."
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:border-brand-magenta/85 focus:ring-0 focus:outline-none min-h-20 bg-slate-50/20"
                  />
                </div>

                {/* Amount mini-badge */}
                <div className="bg-slate-50 rounded-2xl p-3 flex justify-between items-center text-xs text-slate-500 font-bold">
                  <span>ആകെ മിച്ച തുക:</span>
                  <span className="text-sm font-black text-brand-magenta">₹{childTotalPending.toLocaleString('en-IN')}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
        )}

        {/* SLOT 4: SPOUSE CLAIM (ഭാര്യ അല്ലെങ്കിൽ ഭർത്താവ് - Spouse Claimant) */}
        {!hasSpouse && (
        <Card className="border-2 border-slate-150 rounded-3xl shadow-sm overflow-hidden bg-white">
          <CardContent className="p-5 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-black">4</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">ഭാര്യ / ഭർത്താവ് ക്ലെയിം (Spouse Claimant)</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Add Wife or Husband</p>
                </div>
              </div>
              <Checkbox 
                checked={spouseSelected} 
                onCheckedChange={(val) => {
                  setSpouseSelected(!!val);
                  if (!!val && !spouseRelation) setSpouseRelation('Wife'); // default relationship
                }} 
                className="w-5 h-5 border-slate-300" 
              />
            </div>

            {spouseSelected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Relationship selector - Wife or Husband */}
                <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 font-medium">
                   <Label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">ആ വ്യക്തിയുമായുള്ള ബന്ധം തിരഞ്ഞെടുക്കുക * (Relation - Required)</Label>
                   <RadioGroup 
                     value={spouseRelation} 
                     onValueChange={(val) => setSpouseRelation(val as 'Wife' | 'Husband')} 
                     className="flex gap-4"
                   >
                     <div className="flex items-center gap-2 cursor-pointer">
                       <RadioGroupItem value="Wife" id="spouse-wife" className="text-brand-magenta" />
                       <Label htmlFor="spouse-wife" className="text-xs font-bold text-slate-700 cursor-pointer">ഭാര്യ (Wife)</Label>
                     </div>
                     <div className="flex items-center gap-2 cursor-pointer">
                       <RadioGroupItem value="Husband" id="spouse-husband" className="text-brand-magenta" />
                       <Label htmlFor="spouse-husband" className="text-xs font-bold text-slate-700 cursor-pointer">ഭർത്താവ് (Husband)</Label>
                     </div>
                   </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">ഭാര്യ / ഭർത്താവിന്റെ പേര് * (Full Name - Required)</Label>
                    <Input 
                      value={spouseName} 
                      onChange={(e) => setSpouseName(e.target.value)} 
                      placeholder="പേര് നൽകുക (Enter Full Name)"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Highrich Company ID (Optional)</Label>
                    <Input 
                      value={spouseHighrichId} 
                      onChange={(e) => setSpouseHighrichId(e.target.value)} 
                      placeholder="Enter HR ID if known"
                      className="h-11 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Sub-breakup Selector */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                   <Checkbox 
                     id="spouse-no-breakup"
                     checked={spouseNoBreakup}
                     onCheckedChange={(val) => setSpouseNoBreakup(!!val)}
                     className="w-4 h-4"
                   />
                   <Label htmlFor="spouse-no-breakup" className="text-11px font-bold text-slate-600 leading-tight cursor-pointer">
                     കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല (Single manual total)
                   </Label>
                </div>

                {/* Breakup Details OR Total manual entries */}
                {spouseNoBreakup ? (
                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 p-4 border border-dashed rounded-2xl">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Paid Amount (തുക നൽകിയത്)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Paid"
                          value={spouseTotalPaid || ''}
                          onChange={(e) => handleTotalChange('spouse', 'paid', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Received (ലഭിച്ച തുക)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="Received"
                          value={spouseTotalReceived || ''}
                          onChange={(e) => handleTotalChange('spouse', 'received', e.target.value)}
                          className="pl-8 h-10 bg-white border-slate-200 rounded-lg font-black text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ലഭ്യമായ കാറ്റഗറികൾ തിരഞ്ഞെടുക്കുക (Select Categories)</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSel = spouseCategories.includes(cat.id);
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => {
                              setSpouseCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            className={`px-3 py-2 border rounded-xl cursor-pointer text-xs font-black flex items-center gap-2 transition-all ${isSel ? 'border-brand-magenta bg-brand-magenta/[0.04] text-brand-magenta' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <Checkbox checked={isSel} className="w-4 h-4 border-slate-300 pointer-events-none" />
                            {cat.heading}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Inputs */}
                    <div className="space-y-3">
                      {spouseCategories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <div key={catId} className="flex items-center justify-between p-3 border border-slate-150 rounded-xl bg-slate-50/40 gap-4">
                            <span className="text-[11px] font-black text-slate-600 block shrink-0 w-28 truncate">{cat?.heading || catId}</span>
                            <div className="flex gap-2 flex-1">
                              <Input 
                                type="number" 
                                placeholder="Paid" 
                                value={spouseCategoryDetails[catId]?.paid || ''}
                                onChange={(e) => handleCategoryDetailChange('spouse', catId, 'paid', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                              <Input 
                                type="number" 
                                placeholder="Recd." 
                                value={spouseCategoryDetails[catId]?.received || ''}
                                onChange={(e) => handleCategoryDetailChange('spouse', catId, 'received', e.target.value)}
                                className="h-9 border-slate-200 text-xs text-slate-700 bg-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">നോട്ട് / കൂടുതൽ വിവരങ്ങൾ (Notes / Remarks regarding payment)</Label>
                  <textarea 
                    value={spouseNotes} 
                    onChange={(e) => setSpouseNotes(e.target.value)} 
                    placeholder="ഏത് അക്കൗണ്ടിൽ നിന്നാണ് പണം നൽകിയത് അല്ലെങ്കിൽ ട്രാൻസാക്ഷൻ സംബന്ധമായ കൂടുതൽ വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം..."
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:border-brand-magenta/85 focus:ring-0 focus:outline-none min-h-20 bg-slate-50/20"
                  />
                </div>

                {/* Amount mini-badge */}
                <div className="bg-slate-50 rounded-2xl p-3 flex justify-between items-center text-xs text-slate-500 font-bold">
                  <span>ആകെ മിച്ച തുക:</span>
                  <span className="text-sm font-black text-brand-magenta">₹{spouseTotalPending.toLocaleString('en-IN')}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
        )}

        {/* COMBINED TOTAL DISPLAY */}
        <section className="bg-brand-blue rounded-3xl p-6 text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-brand-magenta" />
            <h4 className="text-[10px] font-black uppercase tracking-wider opacity-60">ആകെ തുക വിവരങ്ങൾ (Combined Totals)</h4>
          </div>

          {/* Claimant-wise Breakdown List */}
          <div className="space-y-2 border-b border-white/10 pb-4">
            <p className="text-[9px] font-black opacity-55 uppercase tracking-wider text-pink-300">വ്യക്തിഗത തുകകൾ (Individual Claimants Breakdown):</p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              {selfSelected && (
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <div>
                    <span className="text-[10px] font-black text-brand-magenta uppercase">സ്വന്തം (Self)</span>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{selfName || user?.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] opacity-45 block">Pending</span>
                    <span className="text-sm font-black text-white">₹{selfTotalPending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              {parentSelected && (
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <div>
                    <span className="text-[10px] font-black text-brand-magenta uppercase">
                      {parentRelation === 'Mother' ? 'അമ്മ (Mother)' : parentRelation === 'Father' ? 'അച്ഛൻ (Father)' : 'മാതാവ്/പിതാവ് (Parent)'}
                    </span>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{parentName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] opacity-45 block">Pending</span>
                    <span className="text-sm font-black text-white">₹{parentTotalPending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              {childSelected && (
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <div>
                    <span className="text-[10px] font-black text-brand-magenta uppercase">
                      {childRelation === 'Son' ? 'മകൻ (Son)' : childRelation === 'Daughter' ? 'മകൾ (Daughter)' : 'മകൻ/മകൾ (Child)'}
                    </span>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{childName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] opacity-45 block">Pending</span>
                    <span className="text-sm font-black text-white">₹{childTotalPending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-end justify-between border-b border-white/10 pb-3">
               <div>
                  <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest text-white">Combined Pending Claim</p>
                  <p className="text-3xl font-black text-brand-magenta tracking-tight">
                    ₹{combinedTotalPending.toLocaleString('en-IN')}
                  </p>
               </div>
               <Badge className="bg-white/10 text-white border-0 text-[10px] py-1 mb-1">Combined</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-1">
               <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[8px] font-bold opacity-50 uppercase tracking-wider mb-0.5">Total Paid</p>
                  <p className="text-base font-black text-white">₹{combinedTotalPaid.toLocaleString('en-IN')}</p>
               </div>
               <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[8px] font-bold opacity-50 uppercase tracking-wider mb-0.5">Total Received</p>
                  <p className="text-base font-black text-white">₹{combinedTotalReceived.toLocaleString('en-IN')}</p>
               </div>
            </div>
          </div>
        </section>

        {/* GENERAL STATEMENT PREFERENCE */}
        <Card className="border-2 border-slate-150 rounded-3xl shadow-sm overflow-hidden bg-white">
          <CardContent className="p-5 md:p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-brand-magenta" />
                <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest">ഭാവിയിലെ താല്പര്യം (Future Preference)</h4>
              </div>
              
              <div className="space-y-3">
                 <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                   കമ്പനി പ്രവർത്തനം പുനരാരംഭിക്കുകയാണെങ്കിൽ താങ്കളുടെ കുടുംബത്തിന്റെ താൽപര്യം? (Select family preference)
                 </p>
                 <RadioGroup value={futurePreference} onValueChange={setFuturePreference} className="space-y-3">
                    {PREFERENCES.map(pref => (
                      <div 
                        key={pref.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          futurePreference === pref.id 
                            ? 'border-brand-magenta bg-brand-magenta/5' 
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                        onClick={() => setFuturePreference(pref.id)}
                      >
                         <RadioGroupItem value={pref.id} id={pref.id} className="text-brand-magenta" />
                         <Label htmlFor={pref.id} className="text-xs font-bold text-slate-700 cursor-pointer flex-1 leading-normal">
                           {pref.label}
                         </Label>
                      </div>
                    ))}
                 </RadioGroup>
              </div>
          </CardContent>
        </Card>

        {/* HARDSHIP STATUS (EMERGENCY STATUS) */}
        <Card className="border-2 border-slate-150 rounded-3xl shadow-sm bg-white">
          <CardContent className="p-5 md:p-6 space-y-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">ഗുരുതര നിലവിലെ അവസ്ഥ (Hardship / Emergency Status)</h4>
              </div>

              <div className="space-y-3">
                 <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                   നിലവിൽ താങ്കളോ കുടുംബമോ നേരിടുന്ന സാമ്പത്തിക ബുദ്ധിമുട്ടുകൾ തിരഞ്ഞെടുക്കുക (Select economic hardship)
                 </p>
                 <div className="grid grid-cols-1 gap-2.5">
                   {HARDSHIPS.map(hard => (
                     <div 
                       key={hard.id}
                       onClick={() => {
                        if (hardshipStatus.includes(hard.id)) {
                          setHardshipStatus(prev => prev.filter(i => i !== hard.id));
                        } else {
                          if (hard.id === 'none') {
                            setHardshipStatus(['none']);
                          } else {
                            setHardshipStatus(prev => [...prev.filter(i => i !== 'none'), hard.id]);
                          }
                        }
                       }}
                       className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                         hardshipStatus.includes(hard.id)
                           ? 'border-red-500 bg-red-50'
                           : 'border-slate-150 hover:border-slate-200'
                       }`}
                     >
                       <Checkbox checked={hardshipStatus.includes(hard.id)} className={`pointer-events-none ${hardshipStatus.includes(hard.id) ? "border-red-500" : ""}`} />
                       <Label className="text-xs font-bold text-slate-700 cursor-pointer flex-1 leading-relaxed">{hard.label}</Label>
                       {['bank', 'crisis', 'medical'].includes(hard.id) && (
                         <ShieldAlert className="w-4 h-4 text-red-500" />
                       )}
                     </div>
                   ))}
                 </div>
              </div>
          </CardContent>
        </Card>

        {/* SHARING CONSENT */}
        <section className="space-y-4">
          <div 
            onClick={() => setConsentLegal(!consentLegal)}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              consentLegal 
                ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <Checkbox checked={consentLegal} onCheckedChange={(val) => setConsentLegal(!!val)} className={`w-5 h-5 border-slate-350 mt-1 pointer-events-none ${consentLegal ? 'border-emerald-600 bg-emerald-600 text-white' : ''}`} />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                ഇതിന്റെ കോപ്പികൾ വെരിഫിക്കേഷനും ഓഡിറ്റിംഗിനുമായി മാനേജ്മെന്റും ലീഗൽ കൗൺസിലറുമായി പങ്കുവെക്കുന്നതിന് ഞാൻ സമ്മതിക്കുന്നു. * (Consent Required)
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase leading-normal">
                I hereby consent to verify and share these claims with company management and legal advisors.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-2xl border-t z-20 flex gap-4 max-w-2xl mx-auto rounded-t-3xl shadow-lg border">
        <Button 
          variant="outline" 
          onClick={onClose} 
          className="h-12 flex-1 rounded-xl border-slate-200 font-semibold text-slate-500"
        >
          Cancel
        </Button>
        <Button 
          disabled={loading || !formIsValid}
          onClick={handleSubmit} 
          className="h-12 flex-[2] rounded-xl bg-brand-blue text-white shadow-xl shadow-brand-blue/15 hover:shadow-2xl transition-all font-black text-xs relative overflow-hidden"
        >
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <Clock className="w-4 h-4 animate-spin" /> സുരക്ഷാ റജിസ്റ്റർ സമർപ്പിക്കുന്നു...
            </span>
          ) : (
            <span className="flex items-center gap-2 justify-center">
              ക്ലെയിം വിവരങ്ങൾ സമർപ്പിക്കുക (Submit Claim) <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
