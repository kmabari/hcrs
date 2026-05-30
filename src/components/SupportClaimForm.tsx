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
  RefreshCw
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
    id: 'grocery', 
    label: 'Grocery Consignment Advance (ഗ്രോസറി കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    heading: 'Grocery (ഗ്രോസറി)', 
    sub: 'Consignment Advance (കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    headerColor: 'text-emerald-600 font-extrabold'
  },
  { 
    id: 'goodwill', 
    label: 'Goodwill Consignment Advance (ഗുഡ്‌വിൽ കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    heading: 'Goodwill (ഗുഡ്‌വിൽ)', 
    sub: 'Consignment Advance (കോൺസൈമെന്റ് അഡ്വാൻസ്)',
    headerColor: 'text-amber-600 font-extrabold'
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
  { id: 'settlement', label: 'I prefer settlement and closure after receiving balance' },
  { id: 'wait', label: 'I can wait if company continues and grows' },
  { id: 'continue', label: 'I am ready to continue with company based on future plans' }
];

const HARDSHIPS = [
  { id: 'bank', label: 'Under bank seizure pressure' },
  { id: 'crisis', label: 'Serious financial crisis' },
  { id: 'medical', label: 'Medical emergency' },
  { id: 'none', label: 'No emergency' }
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

  // Fetch existing claim for this user to allow edit/update
  useEffect(() => {
    async function checkExistingClaim() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        const q = query(collection(db, 'claims'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        if (snap.docs.length > 0) {
          const docData = snap.docs[0].data();
          setExistingClaimId(snap.docs[0].id);
          
          if (docData.highrichId) setHighrichId(docData.highrichId);
          if (docData.categories) setSelectedCategories(docData.categories);
          if (docData.otherCategory) setOtherCategory(docData.otherCategory);
          if (docData.categoryDetails) setCategoryDetails(docData.categoryDetails);
          if (docData.noBreakup !== undefined) setNoBreakup(docData.noBreakup);
          if (docData.totalPaid !== undefined || docData.totalReceived !== undefined) {
             setTotalItems({
                paid: docData.totalPaid || 0,
                received: docData.totalReceived || 0,
                pending: (docData.totalPaid || 0) - (docData.totalReceived || 0)
             });
          }
          if (docData.futurePreference) setFuturePreference(docData.futurePreference);
          if (docData.hardshipStatus) setHardshipStatus(docData.hardshipStatus);
          
          toast.info('മുമ്പ് സബ്മിറ്റ് ചെയ്ത വിവരങ്ങൾ കാണിച്ചിരിക്കുന്നു. നിങ്ങൾക്ക് ആവശ്യമുള്ള മാറ്റങ്ങൾ വരുത്തി അപ്ഡേറ്റ് ചെയ്യാവുന്നതാണ്.');
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
    if (isEmergency) return { label: 'EMERGENCY RED', color: 'bg-red-600', text: 'Bank seizure / serious hardship' };
    if (futurePreference === 'settlement') return { label: 'RED', color: 'bg-red-500', text: 'Demanding immediate settlement' };
    if (futurePreference === 'wait') return { label: 'ORANGE', color: 'bg-orange-500', text: 'Willing to wait some time' };
    if (futurePreference === 'continue') return { label: 'GREEN', color: 'bg-green-500', text: 'Willing to continue with company' };
    return { label: 'PENDING', color: 'bg-slate-400', text: 'Selection required' };
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

  if (completed) {
    return (
      <div className="p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-brand-blue uppercase">Submitted Successfully</h2>
        <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto">
          Thank you for providing your details. Our coordination team will review your information.
        </p>
        <Button onClick={onClose} className="w-full h-12 rounded-xl bg-brand-blue font-bold">Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-magenta/10 flex items-center justify-center text-brand-magenta">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
             <h3 className="text-sm font-black text-brand-blue uppercase tracking-tight">Member Support</h3>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Highrich Claim Form</p>
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

        {/* TODAY'S UPDATE BOX (ഇന്നത്തെ അപ്ഡേഷൻ) */}
        {orgSettings?.announcementActive && (
          <div id="member_announcement_box_claim" className="w-full bg-gradient-to-br from-indigo-50/90 to-blue-50/90 border-2 border-brand-blue/30 rounded-3xl p-5 shadow-md relative overflow-hidden transition-all duration-300">
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

            {/* Case Related Detailed Specifications */}
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
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Specify Other Category</Label>
              <Input 
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
                className="h-12 border-2 border-slate-100 rounded-xl font-bold"
              />
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
                <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest">Future Preference</h4>
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
                <h4 className="text-xs font-black text-brand-blue uppercase tracking-widest">Emergency Status</h4>
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
                       <Label className="text-xs font-black text-slate-700 flex-1 truncate">{hard.label}</Label>
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
          disabled={loading || !futurePreference || hardshipStatus.length === 0}
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
