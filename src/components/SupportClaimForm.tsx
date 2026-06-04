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
  Info
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
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    return () => unsub();
  }, []);
  
  // Form State
  const [highrichId, setHighrichId] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [otherCategory, setOtherCategory] = useState('');
  const [categoryDetails, setCategoryDetails] = useState<Record<string, CategoryDetail>>({});
  const [noBreakup, setNoBreakup] = useState(false);
  const [totalItems, setTotalItems] = useState({ paid: 0, received: 0, pending: 0 });
  const [futurePreference, setFuturePreference] = useState('');
  const [hardshipStatus, setHardshipStatus] = useState<string[]>([]);
  const [existingClaimId, setExistingClaimId] = useState<string | null>(null);
  const [consentLegal, setConsentLegal] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Fetch existing claim for this user to prevent resubmission
  useEffect(() => {
    async function checkExistingClaim() {
      if (!user) return;
      try {
        setLoading(true);
        let found = false;
        
        // Priority 1: Check by mobile number
        if (user.mobile) {
          const qMobile = query(collection(db, 'claims'), where('userMobile', '==', user.mobile));
          const snapMobile = await getDocs(qMobile);
          if (!snapMobile.empty) {
            setExistingClaimId(snapMobile.docs[0].id);
            setAlreadySubmitted(true);
            found = true;
          }
        }
        
        // Priority 2: Check by UID if not already found
        if (!found && user.uid) {
          const qUid = query(collection(db, 'claims'), where('uid', '==', user.uid));
          const snapUid = await getDocs(qUid);
          if (!snapUid.empty) {
            setExistingClaimId(snapUid.docs[0].id);
            setAlreadySubmitted(true);
          }
        }
      } catch (err) {
        console.error("Error fetching existing claim:", err);
      } finally {
        setLoading(false);
      }
    }
    checkExistingClaim();
  }, [user]);

  // Auto Calculations
  useEffect(() => {
    if (noBreakup) return;
    
    let totalPaid = 0;
    let totalRec = 0;
    
    selectedCategories.forEach(cat => {
      const detail = categoryDetails[cat] || { paid: 0, received: 0, pending: 0 };
      totalPaid += Number(detail.paid) || 0;
      totalRec += Number(detail.received) || 0;
    });

    setTotalItems({
      paid: totalPaid,
      received: totalRec,
      pending: totalPaid - totalRec
    });
  }, [categoryDetails, selectedCategories, noBreakup]);

  const handleCategoryDetailChange = (catId: string, field: 'paid' | 'received', value: string) => {
    const numVal = parseFloat(value) || 0;
    setCategoryDetails(prev => {
      const current = prev[catId] || { paid: 0, received: 0, pending: 0 };
      const updated = { ...current, [field]: numVal };
      updated.pending = updated.paid - updated.received;
      return { ...prev, [catId]: updated };
    });
  };

  const handleTotalChange = (field: 'paid' | 'received', value: string) => {
    const numVal = parseFloat(value) || 0;
    setTotalItems(prev => {
      const updated = { ...prev, [field]: numVal };
      updated.pending = updated.paid - updated.received;
      return updated;
    });
  };

  const isEmergency = hardshipStatus.some(h => ['bank', 'crisis', 'medical'].includes(h));

  const priorityInfo = useMemo(() => {
    if (isEmergency) return { label: 'EMERGENCY RED', color: 'bg-red-600', text: 'ബാങ്ക് ജപ്തി ഭീഷണി / കടുത്ത പ്രയാസങ്ങൾ (Bank seizure / serious hardship)' };
    if (futurePreference === 'settlement') return { label: 'RED', color: 'bg-red-500', text: 'ഉടൻ സെറ്റിൽമെന്റ് ആവശ്യപ്പെടുന്നു (Demanding immediate settlement)' };
    if (futurePreference === 'wait') return { label: 'ORANGE', color: 'bg-orange-500', text: 'കുറച്ചു സമയം കാത്തിരിക്കാൻ തയ്യാറാണ് (Willing to wait some time)' };
    if (futurePreference === 'continue') return { label: 'GREEN', color: 'bg-green-500', text: 'കമ്പനിയുമായി തുടർന്നു പോകാൻ താല്പര്യപ്പെടുന്നു (Willing to continue with company)' };
    return { label: 'PENDING', color: 'bg-slate-400', text: 'മുൻഗണന തിരഞ്ഞെടുക്കുക (Selection required)' };
  }, [isEmergency, futurePreference]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const claimData = {
        uid: user.uid,
        membershipId: user.membershipId || 'PENDING',
        userName: user.name,
        userMobile: user.mobile,
        userDistrict: user.district || '',
        userAddress: user.address || '',
        userConstituency: user.constituency || '',
        userEmail: user.email || '',
        userBloodGroup: user.bloodGroup || '',
        highrichId,
        categories: selectedCategories,
        otherCategory,
        categoryDetails,
        noBreakup,
        totalPaid: totalItems.paid,
        totalReceived: totalItems.received,
        totalPending: totalItems.pending,
        futurePreference,
        hardshipStatus,
        isEmergency,
        priorityStatus: priorityInfo.label,
        consentLegal,
        updatedAt: serverTimestamp(),
        // Only add createdAt for new submissions
        ...(existingClaimId ? {} : { createdAt: serverTimestamp() })
      };

      if (existingClaimId) {
        await updateDoc(doc(db, 'claims', existingClaimId), claimData);
        setCompleted(true);
        toast.success('നിങ്ങളുടെ വിവരങ്ങൾ വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തിട്ടുണ്ട്.');
      } else {
        await addDoc(collection(db, 'claims'), claimData);
        setCompleted(true);
        toast.success('നിങ്ങളുടെ വിവരങ്ങൾ വിജയകരമായി സമർപ്പിച്ചിട്ടുണ്ട്.');
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (alreadySubmitted && !completed) {
    return (
      <div className="p-8 text-center space-y-6 max-w-md mx-auto flex flex-col justify-center min-h-screen my-auto">
        <div className="w-20 h-20 bg-rose-50 border border-brand-magenta/30 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-magenta shadow-lg">
          <ShieldAlert className="w-10 h-10 animate-pulse text-brand-magenta" />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">സമർപ്പണം ഇതിനകം പൂർത്തിയായി!<br/>(Already Submitted)</h2>
        <p className="text-brand-magenta text-[10px] font-black tracking-widest uppercase">REGISTRY ACCESS SECURELY BLOCKED</p>

        <div className="bg-rose-50/50 border border-brand-magenta/15 p-5 rounded-2xl text-slate-705 font-bold text-xs leading-relaxed text-left space-y-3">
          <p className="text-slate-700">
            പ്രിയ അംഗമേ, താങ്കൾ ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് വിവര രജിസ്ട്രി ഫോം വിജയകരമായി ഇതിനകം തന്നെ സമർപ്പിച്ചിട്ടുള്ളതാണ്.
          </p>
          <p className="text-slate-600">
            സുരക്ഷാ ക്രമീകരണങ്ങൾ അനുസരിച്ച്, <strong>ഒരു തവണ സമർപ്പിച്ച വിവരങ്ങൾ പിന്നീട് മാറ്റാനോ വീണ്ടും ഫോം പൂരിപ്പിക്കാനോ സാധ്യമല്ല.</strong> ഇത് ഡ്യൂപ്ലിക്കേഷൻ ഒഴിവാക്കാനും ഡാറ്റാ സുരക്ഷിതത്വം ഉറപ്പുവരുത്താനും വേണ്ടിയാണ്.
          </p>
          <hr className="border-brand-magenta/10" />
          <p className="text-[10px] text-slate-400 font-extrabold leading-normal uppercase">
            You have already submitted your financial details. For security and data integrity reasons, forms cannot be edited or resubmitted once finalized.
          </p>
        </div>

        <Button onClick={onClose} className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue/95 text-white font-bold h-13 shadow-lg active:scale-95 transition-all text-xs">
          തിരികെ ഡാഷ്‌ബോർഡിലേക്ക് (Back to Dashboard)
        </Button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="p-8 text-center space-y-6 max-w-md mx-auto flex flex-col justify-center min-h-full my-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-300">
          <CheckCircle2 className="w-10 h-10 text-green-600 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black text-brand-blue uppercase tracking-tight">സമർപ്പണം വിജയകരം (Submitted Successfully)</h2>
        <p className="text-slate-500 text-[11px] font-bold tracking-widest uppercase">FINANCIAL REGISTRY SUBMISSION COMPLETED</p>

        <div className="bg-emerald-50/50 border border-emerald-500/15 p-5 rounded-2xl text-slate-700 font-semibold text-xs leading-relaxed text-left space-y-3">
          <p>
            പ്രിയ അംഗമേ, താങ്കൾ നൽകിയ വിവരങ്ങൾ വിജയകരമായി സിസ്റ്റത്തിൽ രേഖപ്പെടുത്തി.
          </p>
          <p>
            നിങ്ങളുടെ സമ്മതപ്രകാരം, <strong>ഇതിന്റെ ഒരു കോപ്പി മാനേജ്മെന്റിനും മറ്റൊരു കോപ്പി ലീഗൽ അഡ്വൈസർക്കും കൈമാറുന്നതാണ്.</strong> ക്ലെയിം വെരിഫിക്കേഷൻ ടീം ഈ വിവരങ്ങൾ തുടർനടപടികൾക്കായി പരിശോധിക്കുന്നതാണ്.
          </p>
          <hr className="border-emerald-500/10" />
          <p className="text-[10px] text-slate-400 font-bold leading-normal uppercase">
            A copy of this submission will be shared with the management and the company's legal advisor based on your consent for auditing and coordination purposes.
          </p>
        </div>

        <Button onClick={onClose} className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-13 shadow-lg active:scale-95 transition-all">
          തിരികെ ഡാഷ്‌ബോർഡിലേക്ക് (Back to Dashboard)
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
            <Info className="w-5 h-5" />
          </div>
          <div>
             <h3 className="text-sm font-black text-brand-blue uppercase tracking-tight">Financial Registry</h3>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Member Financial Information Registry</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0">✕</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-8">
        
        {/* User Info Read-only */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Member Name</p>
              <p className="text-xs font-bold text-slate-700 truncate">{user.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</p>
              <p className="text-xs font-bold text-slate-700">{user.mobile}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Membership ID</p>
              <p className="text-xs font-bold text-brand-blue truncate">{user.membershipId || 'Wait for approval'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Address</p>
              <p className="text-xs font-bold text-slate-500 truncate">{user.address}</p>
            </div>
        </div>

        {/* Verification Warning Card / Disclaimer */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[28px] p-5 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-xl pointer-events-none" />
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
              <Info className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest leading-none">പ്രധാന വിവരണം (Important Disclaimer)</h4>
              <p className="text-slate-700 font-bold text-xs leading-relaxed">
                ഇത് നിങ്ങളുടെ യഥാർത്ഥ കണക്ക് ആയിക്കൊള്ളണമെന്നില്ല. ആവറേജ് മനസ്സിലാക്കാൻ വേണ്ടിയാണ്. നിങ്ങളുടെ കണക്കും കമ്പനിയുടെ ഡാറ്റയും ചെക്ക് ചെയ്തതിനുശേഷം ആ ഡാറ്റ പ്രകാരമുള്ള സംഖ്യയാണ് നിങ്ങൾക്ക് ലഭിക്കാൻ ഉണ്ടാവുകയുള്ളൂ എന്ന് നിങ്ങൾ മനസ്സിലാക്കണം. നിങ്ങളുടെ ഓർമ്മയിലുള്ള സംഖ്യ എഴുതിയാൽ മതിയാകും.
              </p>
              <p className="text-[10px] text-amber-600 font-bold uppercase leading-normal">
                This does not need to be your exact claim amount. It is collected to understand the overall average. The final eligible amount is processed only after verifying records with the company database. State the amounts based on your recollection.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: ID & Categories */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-[10px] font-black">1</span>
            <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest">Company Identification</h4>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Highrich ID Number (Optional)</Label>
            <Input 
              placeholder="Enter HR ID if known"
              value={highrichId}
              onChange={(e) => setHighrichId(e.target.value)}
              className="h-12 border-2 border-slate-100 rounded-xl font-bold focus:border-brand-blue/20"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Participation Categories</Label>
            <div className="grid grid-cols-1 gap-3">
              {CATEGORIES.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => {
                    setSelectedCategories(prev => 
                      prev.includes(cat.id) 
                        ? prev.filter(i => i !== cat.id) 
                        : [...prev, cat.id]
                    );
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                    selectedCategories.includes(cat.id) 
                      ? 'border-brand-magenta bg-brand-magenta/[0.03] shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <Checkbox checked={selectedCategories.includes(cat.id)} className="border-slate-300 pointer-events-none mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black tracking-tight ${cat.headerColor}`}>
                      {cat.heading}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-normal">
                      {cat.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCategories.includes('other') && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 border-2 border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
              <Label className="text-[10px] font-black text-brand-blue uppercase tracking-widest ml-1">നിങ്ങൾക്ക് വിശദമായി വല്ലതും എഴുതി പറയാനുണ്ടെങ്കിൽ ഇവിടെ എഴുതാം (Write in detail here)</Label>
              <Input 
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
                placeholder="ഇവിടെ എഴുതുക (Write here...)"
                className="h-12 border-2 border-slate-100 bg-white rounded-xl font-bold focus:border-brand-blue/30"
              />
              <p className="text-[9.5px] font-bold text-slate-400 uppercase mt-1">നിങ്ങളുടെ മറ്റ് വിവരങ്ങൾ വ്യക്തമായി ഇവിടെ നൽകാം (Enter details here)</p>
            </motion.div>
          )}
        </section>

        {/* Section 2: Amounts */}
        <section className="space-y-6">
           <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-[10px] font-black">2</span>
            <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest">Amount Details</h4>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3 mb-4">
             <Checkbox 
               id="no-breakup"
               checked={noBreakup}
               onCheckedChange={(val) => setNoBreakup(!!val)}
               className="w-5 h-5"
             />
             <Label htmlFor="no-breakup" className="text-xs font-bold text-slate-600 leading-tight">
               I cannot provide category-wise breakup. (കാറ്റഗറി തിരിച്ചുള്ള വിവരം നൽകാൻ സാധിക്കില്ല)
             </Label>
          </div>

          <AnimatePresence mode="wait">
            {noBreakup ? (
              <motion.div key="no-breakup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Card className="border-2 border-slate-100 shadow-none">
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Total Amount Paid</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="0"
                          value={totalItems.paid || ''}
                          onChange={(e) => handleTotalChange('paid', e.target.value)}
                          className="pl-9 h-12 bg-white border-slate-200 rounded-xl font-black text-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Total Received Amount</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number"
                          placeholder="0"
                          value={totalItems.received || ''}
                          onChange={(e) => handleTotalChange('received', e.target.value)}
                          className="pl-9 h-12 bg-white border-slate-200 rounded-xl font-black text-lg"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="with-breakup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {selectedCategories.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-400">Please select categories above to enter amounts.</p>
                  </div>
                ) : (
                  selectedCategories.map(catId => (
                    <Card key={catId} className="border-2 border-slate-100 shadow-none bg-slate-50/50">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col min-w-0">
                            <h5 className={`text-xs font-black tracking-tight ${CATEGORIES.find(c => c.id === catId)?.headerColor || 'text-brand-blue'}`}>
                              {CATEGORIES.find(c => c.id === catId)?.heading || catId}
                            </h5>
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5 truncate leading-none">
                              {CATEGORIES.find(c => c.id === catId)?.sub}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-white text-[10px] font-black">
                            {((categoryDetails[catId]?.paid || 0) - (categoryDetails[catId]?.received || 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} Pending
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Paid Amount</Label>
                            <Input 
                               type="number"
                               placeholder="Paid"
                               value={categoryDetails[catId]?.paid || ''}
                               onChange={(e) => handleCategoryDetailChange(catId, 'paid', e.target.value)}
                               className="h-10 border-slate-200 font-bold text-brand-blue bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Received</Label>
                            <Input 
                               type="number"
                               placeholder="Rec."
                               value={categoryDetails[catId]?.received || ''}
                               onChange={(e) => handleCategoryDetailChange(catId, 'received', e.target.value)}
                               className="h-10 border-slate-200 font-bold text-green-600 bg-white"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Section 4: Summary */}
        <section className="bg-brand-blue rounded-[32px] p-6 text-white space-y-6 shadow-2xl shadow-brand-blue/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-brand-magenta" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Amount Summary (തുക വിവരങ്ങൾ)</h4>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-end justify-between border-b border-white/10 pb-4">
               <div className="space-y-1">
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest text-white">Total Pending Amount</p>
                  <p className="text-4xl font-black text-brand-magenta tracking-tighter">
                    ₹{totalItems.pending.toLocaleString('en-IN')}
                  </p>
               </div>
               <Badge className="bg-white/10 text-white border-0 text-[10px] py-1 mb-1">Self Declared</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-lg font-black text-white">₹{totalItems.paid.toLocaleString('en-IN')}</p>
               </div>
               <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mb-1">Total Received</p>
                  <p className="text-lg font-black text-white">₹{totalItems.received.toLocaleString('en-IN')}</p>
               </div>
            </div>
          </div>

          <p className="text-[9px] text-white/40 italic font-medium leading-relaxed">
            Note: This information is collected for support coordination and member-side reference. Final verification may require additional confirmation.
          </p>
        </section>

        {/* Section 5 & 6 */}
        <section className="space-y-8">
           {/* Step 3: Preference */}
           <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-[10px] font-black">3</span>
                <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest">ഭാവിയിലെ താല്പര്യം (Future Preference)</h4>
              </div>
              
              <div className="space-y-3">
                 <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                   If company operations restart, what is your preference? (കമ്പനി പ്രവർത്തനം പുനരാരംഭിക്കുകയാണെങ്കിൽ താങ്കളുടെ താൽപര്യം?)
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
                         <Label htmlFor={pref.id} className="text-xs font-bold text-slate-700 cursor-pointer flex-1">
                           {pref.label}
                         </Label>
                      </div>
                    ))}
                 </RadioGroup>
              </div>
           </div>

           {/* Step 4: Emergency */}
           <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-[10px] font-black">4</span>
                <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest">അടിയന്തിര പ്രാധാന്യ വിവരങ്ങൾ (Emergency Status)</h4>
              </div>

              <div className="space-y-3">
                 <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                   Current hardship status (താങ്കളുടെ നിലവിലെ അവസ്ഥ)
                 </p>
                 <div className="grid grid-cols-1 gap-3">
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
                       className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                         hardshipStatus.includes(hard.id)
                           ? 'border-red-500 bg-red-50'
                           : 'border-slate-100 hover:border-slate-200'
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
           </div>
        </section>

        {/* Priority Status Visualization */}
        <section className="bg-slate-50 border-2 border-slate-100 rounded-[32px] p-6 space-y-4">
           <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Priority</h4>
              <Badge className={`${priorityInfo.color} text-white border-0 px-3 py-1 font-black text-[9px]`}>
                 {priorityInfo.label}
              </Badge>
           </div>
           
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${priorityInfo.color} flex items-center justify-center text-white shadow-xl`}>
                 <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                 <p className="text-xs font-black text-slate-700">{priorityInfo.text}</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Automatic Priority Status</p>
              </div>
           </div>
        </section>

        {/* Step 5: Transparency & Sharing Consent */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-[10px] font-black">5</span>
            <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest text-[11px]">സമ്മതപത്രം (Sharing Consent)</h4>
          </div>

          <div 
            onClick={() => setConsentLegal(!consentLegal)}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              consentLegal 
                ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' 
                : 'border-slate-100 hover:border-slate-200 bg-white'
            }`}
          >
            <Checkbox checked={consentLegal} onCheckedChange={(val) => setConsentLegal(!!val)} className={`w-5 h-5 border-slate-300 mt-1 pointer-events-none ${consentLegal ? 'border-emerald-600 bg-emerald-600 text-white' : ''}`} />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                ഇതിന്റെ ഒരു കോപ്പി മാനേജ്മെന്റിനും ഒരു കോപ്പി ലീഗൽ അഡ്വൈസർക്കും കൈമാറുന്നതാണ്. അതിന് ഞാൻ സമ്മതിക്കുന്നു.
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase leading-normal">
                A copy of this form submission will be shared with the management and the company's legal advisor. Do you agree with this?
              </p>
              <div className="flex gap-2.5 mt-1.5">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${consentLegal ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                  {consentLegal ? 'സമ്മതിച്ചു (Agreed)' : 'സമ്മതമില്ല (Not Agreed - Consent Required)'}
                </span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-2xl border-t z-20 flex gap-4">
        <Button 
          variant="outline" 
          onClick={onClose} 
          className="h-14 flex-1 rounded-2xl border-slate-200 font-bold text-slate-500"
        >
          Cancel
        </Button>
        <Button 
          disabled={loading || !futurePreference || hardshipStatus.length === 0 || !consentLegal}
          onClick={handleSubmit} 
          className="h-14 flex-[2] rounded-2xl bg-brand-blue text-white shadow-xl shadow-brand-blue/20 hover:shadow-2xl transition-all font-black text-sm relative overflow-hidden"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" /> {existingClaimId ? 'Updating...' : 'Submitting...'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {existingClaimId ? 'Update Details (പുതുക്കുക)' : 'Submit Form (സമർപ്പിക്കുക)'} <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
