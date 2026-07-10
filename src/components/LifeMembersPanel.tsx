import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '@/src/lib/imageUtils';
import { DISTRICTS, CONSTITUENCIES, BLOOD_GROUPS, getAssemblyCode } from '@/src/constants';
import { UserProfile } from '@/src/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, UserPlus, Upload, ShieldCheck, Mail, Phone, MapPin, AlertCircle, Trash2, Camera, Sparkles } from 'lucide-react';
import MembershipCard from './MembershipCard';

interface LifeMembersPanelProps {
  members: UserProfile[];
  adminUser: any;
  onUpdatePhoto?: (file: File, uid: string) => void;
}

export default function LifeMembersPanel({ members, adminUser, onUpdatePhoto }: LifeMembersPanelProps) {
  const MAIN_ADMINS = [
    'kmabarikiyafoods@gmail.com',
    'hcrsindia@gmail.com',
    'admin@hcrs.society',
    '9645934571@hcrs.society',
    'mabarikiyafoods@gmail.com'
  ];
  const adminEmail = (adminUser?.email || '').toLowerCase().trim();
  const isMainAdmin = MAIN_ADMINS.some(e => e.toLowerCase() === adminEmail) ||
                      (adminUser?.role === 'admin' && !adminUser?.district) ||
                      (adminUser?.mobile === '9645934571');

  const [editingSerialMember, setEditingSerialMember] = useState<UserProfile | null>(null);
  const [selectedNewSerial, setSelectedNewSerial] = useState<number | null>(null);
  const [isUpdatingSerial, setIsUpdatingSerial] = useState(false);
  const [isBypassActive, setIsBypassActive] = useState(false);
  const [customSerialInput, setCustomSerialInput] = useState<string>('');

  const handleUpdateSerial = async () => {
    if (!editingSerialMember) return;

    const serialToUse = isBypassActive ? parseInt(customSerialInput, 10) : selectedNewSerial;

    if (serialToUse === null || serialToUse === undefined || isNaN(serialToUse)) {
      toast.error("ദയവായി സാധുവായ ഒരു സീരിയൽ നമ്പർ നൽകുക.");
      return;
    }

    if (!isBypassActive && (serialToUse < 1 || serialToUse > 23)) {
      toast.error("സാധുവായ സീരിയൽ നമ്പർ തിരഞ്ഞെടുക്കുക (01 - 23).");
      return;
    }

    if (!isBypassActive) {
      const isTaken = globalLifeMembers.some(
        (m) => m.uid !== editingSerialMember.uid && m.serialNo === serialToUse
      );
      if (isTaken) {
        toast.error(`സീരിയൽ നമ്പർ ${serialToUse} ഇതിനകം മറ്റൊരു മെമ്പറിന് നൽകിയിട്ടുള്ളതാണ്.`);
        return;
      }
    }

    setIsUpdatingSerial(true);
    const loadingToast = toast.loading('സീരിയൽ നമ്പർ മാറ്റുന്നു...');

    try {
      const dCode = (editingSerialMember.district || 'MLP').toUpperCase();
      const assembly = editingSerialMember.assemblyConstituency || 'Kottakkal';
      const aCode = getAssemblyCode(assembly).toUpperCase();
      const serialStr = String(serialToUse).padStart(3, '0');
      const newMembershipId = `HCRS-LIFE-KL-${dCode}-${aCode}-${serialStr}`;

      const memberRef = doc(db, 'users', editingSerialMember.uid);
      await setDoc(memberRef, {
        serialNo: serialToUse,
        membershipId: newMembershipId
      }, { merge: true });

      toast.success('സീരിയൽ നമ്പർ വിജയകരമായി മാറ്റിയിരിക്കുന്നു!', { id: loadingToast });
      setEditingSerialMember(null);
      setSelectedNewSerial(null);
      setCustomSerialInput('');
      setIsBypassActive(false);
    } catch (error: any) {
      console.error("Error updating serial number:", error);
      toast.error('സീരിയൽ മാറ്റാൻ സാധിച്ചില്ല: ' + error.message, { id: loadingToast });
    } finally {
      setIsUpdatingSerial(false);
    }
  };

  // Load ALL life members globally from firestore in real-time
  const [globalLifeMembers, setGlobalLifeMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('membership_type', '==', 'LIFE_MEMBER')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach(doc => {
        list.push({ uid: doc.id, ...(doc.data() as any) });
      });
      setGlobalLifeMembers(list);
    }, (error) => {
      console.error("Error listening to global life members:", error);
    });
    return () => unsubscribe();
  }, []);

  // Filter for currently active Life Members (using global list)
  const lifeMembers = useMemo(() => {
    return globalLifeMembers;
  }, [globalLifeMembers]);

  // Outstanding count
  const lifeCount = globalLifeMembers.length;
  const isLimitReached = lifeCount >= 23;

  // Set of occupied serials parsed from membershipId (last 3 digits) or custom serialNo field
  const occupiedSerials = useMemo(() => {
    const serials = new Set<number>();
    globalLifeMembers.forEach(m => {
      if (m.serialNo && typeof m.serialNo === 'number') {
        serials.add(m.serialNo);
      } else if (m.membershipId) {
        const parts = m.membershipId.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num)) serials.add(num);
      }
    });
    return serials;
  }, [globalLifeMembers]);

  // Form States
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('MLP'); // Default to Malappuram
  const [mandalam, setMandalam] = useState('Kottakkal'); // Default to Kottakkal
  const [selectedSerial, setSelectedSerial] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize constituency list when district changes so that they correspond correctly
  useEffect(() => {
    const list = CONSTITUENCIES[district] || [];
    if (list.length > 0) {
      if (!list.includes(mandalam)) {
        setMandalam(list[0]);
      }
    } else {
      setMandalam('');
    }
  }, [district]);

  // Profile Card trigger modal
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const [isCardScreenshotActive, setIsCardScreenshotActive] = useState(false);

  // Duplicate Check Engine
  const [dupSearchMobile, setDupSearchMobile] = useState('9447537303');
  const [searchedDupMembers, setSearchedDupMembers] = useState<UserProfile[]>([]);
  const [isSearchingDup, setIsSearchingDup] = useState(false);

  const duplicatePhoneGroups = useMemo(() => {
    const groups: Record<string, UserProfile[]> = {};
    globalLifeMembers.forEach(m => {
      const ph = (m.mobile || '').trim().replace(/\D/g, '');
      if (!ph || ph.length < 10) return;
      if (!groups[ph]) groups[ph] = [];
      groups[ph].push(m);
    });

    const duplicateGroupsList: { mobile: string; members: UserProfile[] }[] = [];
    Object.entries(groups).forEach(([mobile, list]) => {
      if (list.length > 1) {
        duplicateGroupsList.push({ mobile, members: list });
      }
    });
    return duplicateGroupsList;
  }, [globalLifeMembers]);

  const handleSearchDuplicateByMobile = async (mob: string) => {
    const clean = mob.trim().replace(/\D/g, '');
    if (clean.length !== 10) {
      toast.error("10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.");
      return;
    }
    setIsSearchingDup(true);
    try {
      const q = query(collection(db, 'users'), where('mobile', '==', clean));
      const snap = await getDocs(q);
      const results: UserProfile[] = [];
      snap.forEach(docSnap => {
        results.push({ uid: docSnap.id, ...(docSnap.data() as any) });
      });
      setSearchedDupMembers(results);
      if (results.length === 0) {
        toast.info("ഈ നമ്പറിൽ ആരും കാണുന്നില്ല.");
      } else if (results.length === 1) {
        toast.info("തനിപ്പകർപ്പുകൾ ഒന്നും കാണാനില്ല (1 അംഗം മാത്രം).");
      } else {
        toast.success(`${results.length} തനിപ്പകർപ്പുകൾ കണ്ടെത്തി!`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("തിരച്ചിൽ പരാജയപ്പെട്ടു: " + e.message);
    } finally {
      setIsSearchingDup(false);
    }
  };

  const handleDeleteDuplicate = async (uidToDelete: string, mobileToCheck: string) => {
    if (!window.confirm("ഈ റെക്കോർഡ് ഇല്ലാതാക്കാൻ നിങ്ങൾ തീർച്ചയായും ആഗ്രഹിക്കുന്നുണ്ടോ? തനിപ്പകർപ്പിൽ ഒരെണ്ണം മാത്രം ബാക്കി വെച്ച് മറ്റുള്ളവ ഡിലീറ്റ് ചെയ്യുക.")) {
      return;
    }
    const loadingToast = toast.loading('മെമ്പർ റെക്കോർഡ് ഇല്ലാതാക്കുന്നു...');
    try {
      await deleteDoc(doc(db, 'users', uidToDelete));
      toast.success("റെക്കോർഡ് വിജയകരമായി നീക്കം ചെയ്തു!", { id: loadingToast });
      
      if (mobileToCheck) {
        handleSearchDuplicateByMobile(mobileToCheck);
      }
    } catch (err: any) {
      console.error("Error deleting duplicate:", err);
      toast.error("ഡിലീറ്റ് ചെയ്യാൻ സാധിച്ചില്ല: " + err.message, { id: loadingToast });
    }
  };

  const viewingMember = useMemo(() => {
    return globalLifeMembers.find(m => m.uid === viewingMemberId) || null;
  }, [viewingMemberId, globalLifeMembers]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("തെറ്റായ ഫയൽ ഫോർമാറ്റ്! ചിത്രം മാത്രം തിരഞ്ഞെടുക്കുക.");
      return;
    }
    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLimitReached) {
      toast.error("ലൈഫ് മെമ്പർഷിപ്പ് പരിധി കഴിഞ്ഞു (23/23). കൂടുതൽ ആളുകളെ ചേർക്കാൻ സാധ്യമല്ല.");
      return;
    }

    if (!name.trim()) {
      toast.error("പൂർണ്ണമായ പേര് നൽകുക.");
      return;
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error("ദയവായി സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.");
      return;
    }

    if (!district) {
      toast.error("ദയവായി ജില്ല തിരഞ്ഞെടുക്കുക.");
      return;
    }

    if (!mandalam) {
      toast.error("ദയവായി മണ്ഡലം തിരഞ്ഞെടുക്കുക.");
      return;
    }

    if (selectedSerial === null) {
      toast.error("ദയവായി ഒരു സീരിയൽ നമ്പർ (01 - 23) തിരഞ്ഞെടുക്കുക.");
      return;
    }

    if (occupiedSerials.has(selectedSerial)) {
      toast.error(`സീരിയൽ നമ്പർ ${selectedSerial} ഇതിനകം കൈവശപ്പെടുത്തിയിട്ടുണ്ട്. മറ്റൊരു നമ്പർ തിരഞ്ഞെടുക്കുക.`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('ലൈഫ് മെമ്പർഷിപ്പ് രജിസ്റ്റർ ചെയ്യുന്നു...');

    try {
      const usersRef = collection(db, 'users');

      // Check duplicate mobile in whole database
      const mobileQuery = query(usersRef, where('mobile', '==', cleanMobile));
      const mobileSnap = await getDocs(mobileQuery);
      
      if (!mobileSnap.empty) {
        toast.error('ഈ മൊബൈൽ നമ്പർ ഇതിനകം രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്. തനിപ്പകർപ്പ് അനുവദനീയമല്ല.', { id: loadingToast });
        setIsSubmitting(false);
        return;
      }

      // Check duplicate serial number in whole database (never allow duplicates)
      const serialQuery = query(
        usersRef, 
        where('membership_type', '==', 'LIFE_MEMBER'),
        where('serialNo', '==', selectedSerial)
      );
      const serialSnap = await getDocs(serialQuery);
      if (!serialSnap.empty) {
        toast.error(`സീരിയൽ നമ്പർ ${selectedSerial} ഇതിനകം മറ്റൊരു മെമ്പറിന് നൽകിയിട്ടുള്ളതാണ്. തനിപ്പകർപ്പ് അനുവദനീയമല്ല.`, { id: loadingToast });
        setIsSubmitting(false);
        return;
      }

      const finalUid = `life_${cleanMobile}_${Date.now()}`;
      let finalPhotoUrl = '';

      if (selectedPhoto) {
        try {
          const compressed = await compressImage(selectedPhoto, 650, 650, 0.75);
          const photoRef = ref(storage, `photos/${finalUid}_profile.jpg`);
          const uploadResult = await uploadBytes(photoRef, compressed);
          finalPhotoUrl = await getDownloadURL(uploadResult.ref);
        } catch (photoErr) {
          console.error("Photo upload error:", photoErr);
          toast.warning("പ്രൊഫൈൽ ഫോട്ടോ അപ്‌ലോഡ് പരാജയപ്പെട്ടു, പകരം ഫോട്ടോ ഇല്ലാതെ മുന്നോട്ട് പോകുന്നു.");
        }
      }

      // Format serial block suffix to 3 digits fixed
      const serialStr = String(selectedSerial).padStart(3, '0');
      
      // Dynamic codes depending on selected district and mandalam
      const dCode = district.toUpperCase();
      const aCode = getAssemblyCode(mandalam).toUpperCase();
      const generatedMembershipId = `HCRS-LIFE-KL-${dCode}-${aCode}-${serialStr}`;

      const newProfile: any = {
        uid: finalUid,
        name: name.trim(),
        mobile: cleanMobile,
        email: email.trim().toLowerCase() || `${cleanMobile}@hcrs-life.society`,
        pin: '123456',
        state: 'Kerala',
        district: district,
        assemblyConstituency: mandalam,
        address: 'HCRS Registered Life Founding Core',
        pincode: '676501',
        membershipId: generatedMembershipId,
        membership_type: 'LIFE_MEMBER',
        status: 'active',
        isPaid: true,
        isApproved: true,
        isAdmin: false,
        role: 'member',
        serialNo: selectedSerial,
        registrationDate: new Date(),
        expiryDate: null, // Perpetual, never expires
        photoUrl: finalPhotoUrl,
        waStatus: 'Pending',
        stateCode: 'KL',
        districtCode: dCode,
        constituencyCode: aCode,
        registeredBy: adminUser?.uid || 'super_admin',
        registeredByName: adminUser?.name || 'Super Admin'
      };

      // Direct write to user document
      await setDoc(doc(db, 'users', finalUid), newProfile);

      toast.success('ലൈഫ് മെമ്പർഷിപ്പ് വിജയകരമായി ചേർത്തിട്ടുണ്ട്! (Founding Member Created)', { id: loadingToast });
      
      // Cleanup states
      setName('');
      setMobile('');
      setEmail('');
      setSelectedSerial(null);
      setSelectedPhoto(null);
      setPhotoPreview(null);
    } catch (error: any) {
      console.error(error);
      toast.error('രജിസ്ട്രേഷൻ സമയത്ത് പിശക് സംഭവിച്ചു: ' + error.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top statistics and info bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-amber-200 bg-amber-50/50 shadow-xs relative overflow-hidden md:col-span-2">
          <div className="absolute right-0 top-0 text-amber-100/40 pointer-events-none translate-x-6 -translate-y-6">
            <Crown size={150} />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500 animate-pulse" />
              Founding Life Members Category (ലൈഫ് മെമ്പർഷിപ്പ്)
            </CardTitle>
            <CardDescription className="text-amber-700 font-medium">
              നിർദ്ദിഷ്ട 23 സ്ഥാപക അംഗങ്ങൾക്ക് മാത്രമുള്ള പ്രീമിയം ലേഔട്ട്. ഇവർക്ക് വാർഷിക പുതുക്കലുകളോ പെയ്‌മെന്റ് പരിശോധനകളോ ആവശ്യമില്ല.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-amber-900/80 leading-relaxed relative z-10">
            ലഭ്യമാകുന്ന തനത് ഐഡി ഫോർമാറ്റ്: <strong className="font-mono bg-amber-150 p-1 px-1.5 rounded text-[11px] text-amber-950 font-black">HCRS-LIFE-KL-MLP-KTK-001</strong> മുതൽ <strong className="font-mono bg-amber-150 p-1 px-1.5 rounded text-[11px] text-amber-950 font-black">HCRS-LIFE-KL-MLP-KTK-023</strong> വരെ.
          </CardContent>
        </Card>

        {/* Real-time progression gauge */}
        <Card className={`border shadow-xs flex flex-col justify-between p-5 text-center ${isLimitReached ? 'bg-amber-900 text-amber-100 border-amber-800' : 'bg-white text-slate-800 border-slate-200'}`}>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest block mb-1">
              Active Registered limit
            </span>
            <div className="text-4xl font-black font-mono flex items-center justify-center gap-1">
              {lifeCount} <span className="text-lg text-slate-400 font-medium">/ 23</span>
            </div>
          </div>
          <div className="mt-4">
            {isLimitReached ? (
              <div className="bg-amber-800 border border-amber-700 text-amber-300 rounded-xl py-2 px-3 text-[10px] font-black uppercase tracking-wider animate-pulse">
                🚫 പരിധി പൂർത്തിയായി (23/23 Limit Reached)
              </div>
            ) : (
              <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl py-2 px-3 text-[10.5px] font-bold">
                {23 - lifeCount} സീറ്റുകൾ ലഭ്യമാണ്
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Creation Form block */}
        <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
            <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-black uppercase tracking-tight">
              <UserPlus className="w-4 h-4 text-brand-blue" /> Add New Founding Life Member
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-500">
              സ്ഥാപക അംഗത്തെ നേരിട്ട് സൂപ്പർ അഡ്മിൻ മോഡ് മുഖേന ചേർക്കുക.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5Col-span-1 md:col-span-2">
                  <Label htmlFor="life-name" className="text-xs font-black uppercase text-slate-600 block">Name (പേര്) <span className="text-red-500">*</span></Label>
                  <Input 
                    id="life-name" 
                    placeholder="Full Name" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="h-10 text-slate-800"
                    disabled={isLimitReached || isSubmitting}
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="life-mobile" className="text-xs font-black uppercase text-slate-600 block">Mobile Number <span className="text-red-500">*</span></Label>
                  <Input 
                    id="life-mobile" 
                    placeholder="10-digit Phone" 
                    maxLength={10}
                    value={mobile} 
                    onChange={e => setMobile(e.target.value)}
                    className="h-10 text-slate-800"
                    disabled={isLimitReached || isSubmitting}
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="life-email" className="text-xs font-black uppercase text-slate-600 block">Email (ঐച്ഛികം)</Label>
                  <Input 
                    id="life-email" 
                    type="email"
                    placeholder="Email Address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="h-10 text-slate-800"
                    disabled={isLimitReached || isSubmitting}
                  />
                </div>

                {/* District selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase text-slate-600 block">District (ജില്ല) <span className="text-red-500">*</span></Label>
                  <select 
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    disabled={isLimitReached || isSubmitting}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {DISTRICTS.map(dist => (
                      <option key={dist.code} value={dist.code}>{dist.name} ({dist.code})</option>
                    ))}
                  </select>
                </div>

                {/* Mandalam selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase text-slate-600 block">Mandalam (മണ്ഡലം) <span className="text-red-500">*</span></Label>
                  <select
                    value={mandalam}
                    onChange={e => setMandalam(e.target.value)}
                    disabled={isLimitReached || isSubmitting}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {(CONSTITUENCIES[district] || []).map(mnd => (
                      <option key={mnd} value={mnd}>{mnd}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo selector */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-600 block">Profile Photo (ഫോട്ടോ) <span className="text-[10px] text-slate-450 normal-case">(നല്ല വ്യക്തതയുള്ള പ്രൊഫൈൽ ഫോട്ടോകൾ തിരഞ്ഞെടുക്കുക)</span></Label>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 overflow-hidden shrink-0 flex items-center justify-center bg-slate-50">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={isLimitReached || isSubmitting}
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLimitReached || isSubmitting}
                      className="h-10 text-xs font-black tracking-wide flex items-center gap-2 uppercase"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Select Photo file
                    </Button>
                  </div>
                </div>
              </div>

              {/* Serial Number Grid layout (01 to 23 Visual selectors) */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-black uppercase text-slate-600 block">
                  Serial Number (01 to 23 പെട്ടി തിരഞ്ഞെടുക്കുക) <span className="text-red-500">*</span>
                </Label>
                <p className="text-[10px] text-slate-500 font-bold leading-none mb-2">
                  കൈവശപ്പെടുത്തിയ പെട്ടികൾ ഡിസേബിൾ ചെയ്തു കാണിച്ചിട്ടുള്ളതാണ്. ഇതുവഴി ഐഡി രൂപപ്പെടുന്നത് തടസ്സമില്ലാതെ ഒന്നിനു പുറകെ ഒന്നായി ക്രമീകരിക്കാം.
                </p>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {Array.from({ length: 23 }, (_, index) => {
                    const sn = index + 1;
                    const isTaken = occupiedSerials.has(sn);
                    const isSelected = selectedSerial === sn;

                    return (
                      <button
                        key={sn}
                        type="button"
                        disabled={isTaken || isLimitReached || isSubmitting}
                        onClick={() => setSelectedSerial(sn)}
                        className={`text-xs font-mono font-black h-9 rounded-lg flex items-center justify-center border-2 transition-all ${
                          isTaken 
                            ? 'bg-slate-150 border-slate-200 text-slate-400 cursor-not-allowed line-through' 
                            : isSelected 
                              ? 'bg-amber-500 border-amber-600 text-white font-extrabold shadow-md scale-105' 
                              : 'bg-white border-slate-250 hover:bg-amber-50 hover:border-amber-400 text-slate-700 hover:text-amber-700'
                        }`}
                      >
                        {String(sn).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Registration trigger btn */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isLimitReached || isSubmitting}
                  className={`w-full h-11 uppercase font-black tracking-wider text-xs rounded-xl shadow-md transition-all active:scale-95 ${
                    isLimitReached 
                      ? 'bg-slate-300 text-slate-505 cursor-not-allowed' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2'
                  }`}
                >
                  <Crown className="w-4 h-4 text-white animate-bounce" />
                  {isSubmitting ? 'രജിസ്റ്റർ ചെയ്യുന്നു...' : '🎯 Create Founding Life Member'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Existing Founding Members List */}
        <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
            <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-black uppercase tracking-tight">
              <Sparkles className="w-4 h-4 text-amber-500" /> Founding Life Members list
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-500">
              നിലവിൽ വിജയകരമായി ചേർത്ത സ്ഥാപക അംഗങ്ങളുടെ ഡിറ്റെയിൽസ്.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {lifeMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Crown className="w-12 h-12 text-slate-200 mx-auto" />
                <p className="text-xs font-bold font-sans">സ്ഥാപക അംഗങ്ങൾ ഒന്നും ചേർക്കപ്പെട്ടിട്ടില്ല.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
                {lifeMembers
                  .sort((a, b) => (a.serialNo || 0) - (b.serialNo || 0))
                  .map((m) => {
                    const distName = DISTRICTS.find(d => d.code === m.district)?.name || m.district;
                    return (
                      <div key={m.uid} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar picture */}
                          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-amber-300 p-0.5 bg-amber-50">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt="Photo" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-extrabold text-sm">
                                {m.name ? m.name.charAt(0) : 'U'}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight truncate max-w-[170px] flex items-center gap-1">
                              {m.name}
                              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />
                            </h4>
                            <p className="text-[10px] font-black font-mono text-amber-700 mt-0.5">
                              {m.membershipId}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              District: {distName} ({m.assemblyConstituency})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isMainAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSerialMember(m);
                                setSelectedNewSerial(m.serialNo || null);
                              }}
                              className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800 text-[10px] font-black uppercase h-8 px-2.5 rounded-lg flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Change Serial
                            </Button>
                          )}
                          {/* Action Button: View premium ID card */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingMemberId(m.uid)}
                            className="bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800 text-[10px] font-black uppercase h-8 px-2.5 rounded-lg flex items-center gap-1"
                          >
                            <Crown className="w-3 h-3 text-amber-500" /> View Card
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail card viewer Modal */}
      {viewingMember && (
        <div className={`fixed inset-0 bg-black/80 backdrop-blur-xs flex items-start sm:items-center justify-center z-[100] overflow-y-auto animate-in fade-in duration-300 ${isCardScreenshotActive ? 'p-0' : 'p-2 sm:p-4'}`}>
          <div className={isCardScreenshotActive 
            ? "bg-transparent border-none p-0 relative w-full max-w-lg shadow-none my-auto transition-all duration-300 flex flex-col items-center justify-center" 
            : "bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 relative w-full max-w-lg shadow-2xl my-auto transition-all duration-300"
          }>
            {!isCardScreenshotActive && (
              <>
                <button 
                  onClick={() => setViewingMemberId(null)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 p-2 rounded-full transition-colors z-50"
                >
                  <Trash2 className="w-4 h-4 rotate-45" />
                </button>
                <div className="text-center mb-4 pt-2">
                  <h3 className="font-black text-amber-400 text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 font-sans">
                    <Crown className="w-4 h-4 text-amber-500 animate-spin" />
                    FOUNDING LIFE MEMBER CARD
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">പ്രീമിയം ഗോൾഡ് ഡിസൈൻ ഡിജിറ്റൽ സർട്ടിഫിക്കറ്റ്/ഐഡി</p>
                </div>
              </>
            )}
            
            <div className={`flex justify-center overflow-x-auto ${isCardScreenshotActive ? 'my-0 w-full animate-pulse-once' : 'my-4'}`}>
              <MembershipCard 
                member={viewingMember} 
                isReadOnly={false} 
                onUpdatePhoto={onUpdatePhoto ? (file) => onUpdatePhoto(file, viewingMember.uid) : undefined}
                onScreenshotModeChange={setIsCardScreenshotActive}
                showCelebration={false} 
              />
            </div>

            {!isCardScreenshotActive && (
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={() => setViewingMemberId(null)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase px-8 py-2.5 rounded-xl transition-all"
                >
                  Close View
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔍 Duplicate Resolver Component for Main Admins */}
      {isMainAdmin && (
        <Card className="border border-red-200 bg-red-50/10 shadow-sm rounded-3xl mt-6 overflow-hidden">
          <CardHeader className="bg-red-50/50 border-b border-red-100 p-5">
            <CardTitle className="text-red-800 flex items-center gap-2 text-base font-black uppercase tracking-tight">
              <ShieldCheck className="w-5 h-5 text-red-650 animate-pulse" />
              Duplicate Resolver Center (തനിപ്പകർപ്പുകൾ നീക്കം ചെയ്യാം)
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-500">
              ഒരു വ്യക്തി ഒന്നിൽ കൂടുതൽ തവണ രജിസ്റ്റർ ചെയ്തിട്ടുണ്ടെങ്കിൽ, ഒരെണ്ണം മാത്രം ബാക്കി നിർത്തി മറ്റുള്ളവ നീക്കം ചെയ്യാം.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Quick check automated report */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                Automated Duplicate Tracker (ലൈഫ് മെമ്പേഴ്‌സ് മാത്രം)
              </h4>
              
              {duplicatePhoneGroups.length === 0 ? (
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-[11px] text-green-700 font-bold">
                  ✓ ക്രമക്കേടുകൾ ഒന്നും കണ്ടില്ല! ലൈഫ് മെമ്പർ ലിസ്റ്റിൽ ആവർത്തിച്ചുള്ള കോൺടാക്റ്റുകൾ ഒന്നുമില്ല.
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicatePhoneGroups.map((group) => (
                    <div key={group.mobile} className="border border-amber-200 bg-white p-4 rounded-2xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black bg-amber-150 text-amber-950 px-2 rounded-full py-0.5">
                          Mobile: {group.mobile} ({group.members.length} repetitions)
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDupSearchMobile(group.mobile);
                            handleSearchDuplicateByMobile(group.mobile);
                          }}
                          className="h-7 text-[10px] font-black uppercase border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                        >
                          Show duplicates to clear
                        </Button>
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        ഈ നമ്പറിൽ ആവർത്തിച്ചു വന്നിരിക്കുന്നവർ: {group.members.map(m => m.name).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual check query engine */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-800">
                Search & Resolve duplicate records (ഏതൊരു അക്കൗണ്ടും പരിശോധിക്കാം)
              </h4>
              <p className="text-[10px] text-slate-500 font-bold leading-normal">
                താഴെ മൊബൈൽ നമ്പർ എന്റർ ചെയ്ത് അന്വേഷിച്ചാൽ, ആ മൊബൈലിലുള്ള എല്ലാ ഡോക്യുമെന്റുകളും കാണാം. അതിൽ ഒരെണ്ണം മാത്രം നിർത്തി ഡബിൾ വന്ന മറ്റ് ഫേക്ക് കോപ്പികൾ ഡിലീറ്റ് ചെയ്യാം.
              </p>
              
              <div className="flex gap-2">
                <Input
                  type="text"
                  maxLength={10}
                  placeholder="10-digit phone number (eg: 9447537303)"
                  value={dupSearchMobile}
                  onChange={(e) => setDupSearchMobile(e.target.value)}
                  className="max-w-xs h-10 text-xs font-mono font-bold"
                />
                <Button
                  onClick={() => handleSearchDuplicateByMobile(dupSearchMobile)}
                  disabled={isSearchingDup}
                  className="bg-slate-850 hover:bg-slate-900 text-white text-xs font-black uppercase px-5 rounded-lg"
                >
                  {isSearchingDup ? 'Searching...' : 'Check For Duplicates'}
                </Button>
              </div>

              {searchedDupMembers.length > 0 && (
                <div className="mt-4 border border-slate-200 rounded-2xl bg-slate-50/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between text-xs font-black uppercase text-slate-700 pb-2 border-b border-slate-200">
                    <span>Records Found ({searchedDupMembers.length})</span>
                    <span className="text-[10px] text-amber-600 font-bold normal-case">
                      തനിപ്പകർപ്പിൽ ഒരെണ്ണം മാത്രം ബാക്കി വെച്ച് മറ്റുള്ളവ ഡിലീറ്റ് ചെയ്യുക.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchedDupMembers.map((m) => {
                      const distName = DISTRICTS.find(d => d.code === m.district)?.name || m.district;
                      return (
                        <div key={m.uid} className="bg-white border border-slate-200 p-3.5 rounded-2xl space-y-3 flex flex-col justify-between shadow-3xs relative overflow-hidden">
                          {m.membership_type === 'LIFE_MEMBER' && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tight">
                              Life Member
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {m.photoUrl ? (
                                <img src={m.photoUrl} className="w-8 h-8 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                  {m.name?.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h5 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{m.name}</h5>
                                <p className="text-[9px] font-mono text-slate-400 font-bold">{m.uid}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-600 pt-1.5 font-sans font-medium">
                              <div><strong>ID:</strong> <span className="font-mono text-[9px]">{m.membershipId || 'N/A'}</span></div>
                              <div><strong>District:</strong> {distName}</div>
                              <div><strong>Serial:</strong> {m.serialNo || 'N/A'}</div>
                              <div><strong>Mobile:</strong> {m.mobile}</div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={m.membership_type === 'LIFE_MEMBER' || m.membershipType === 'LIFE_MEMBER'}
                              onClick={() => handleDeleteDuplicate(m.uid, m.mobile)}
                              className={`h-8 text-[10px] font-black uppercase tracking-wider px-3 rounded-lg flex items-center gap-1 text-white ${
                                (m.membership_type === 'LIFE_MEMBER' || m.membershipType === 'LIFE_MEMBER')
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                  : 'bg-red-600 hover:bg-red-750'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              {(m.membership_type === 'LIFE_MEMBER' || m.membershipType === 'LIFE_MEMBER') ? 'Life Member (Locked/Safe)' : 'Delete Duplicate Record'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      )}

      {/* Change Serial Modal for Main Admin */}
      {editingSerialMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 relative w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Change Serial Number
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1 leading-normal">
              {editingSerialMember.name} (ID: {editingSerialMember.membershipId}) എന്ന അംഗത്തിന്റെ സീരിയൽ നമ്പർ മാറ്റുക.
            </p>

            <div className="my-5 space-y-4">
              {/* Bylaw manual override switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-3xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight block">
                    Bylaw Manual Override
                  </span>
                  <span className="text-[9.5px] text-slate-450 font-bold block leading-tight">
                    വിലക്കുകളും ഡ്യൂപ്ലിക്കേറ്റ് പരിശോധനകളും ഒഴിവാക്കുക
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !isBypassActive;
                    setIsBypassActive(nextMode);
                    if (nextMode) {
                      setCustomSerialInput(editingSerialMember.serialNo ? String(editingSerialMember.serialNo) : '');
                    }
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${isBypassActive ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isBypassActive ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {isBypassActive ? (
                <div className="space-y-2 p-3.5 bg-blue-50/50 border border-blue-200 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-xs font-black uppercase text-blue-900 block">
                    Enter Manual Serial number (01 to 999+)
                  </Label>
                  <p className="text-[10px] text-blue-700 font-bold leading-normal">
                    നിങ്ങൾക്ക് ഇവിടെ ബൈലോ അനുസരിച്ച് ഏത് നമ്പറും (ഉദാ: 24, 25, 50, 100) നൽകാനും ഡ്യൂപ്ലിക്കേറ്റ് പരിശോധന മറികടക്കാനും സാധിക്കും.
                  </p>
                  <Input
                    type="number"
                    min={1}
                    value={customSerialInput}
                    onChange={(e) => setCustomSerialInput(e.target.value)}
                    placeholder="ഉദാഹരണം: 24"
                    className="h-10 text-slate-800 bg-white border-blue-250 focus-visible:ring-blue-500 font-mono font-bold"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase text-slate-600 block">
                    Select New Serial Number (01 to 23)
                  </Label>
                  <div className="grid grid-cols-6 gap-2 pt-2">
                    {Array.from({ length: 23 }, (_, index) => {
                      const sn = index + 1;
                      const isTaken = globalLifeMembers.some(m => m.uid !== editingSerialMember.uid && m.serialNo === sn);
                      const isSelected = selectedNewSerial === sn;
                      const isCurrent = editingSerialMember.serialNo === sn;

                      return (
                        <button
                          key={sn}
                          type="button"
                          disabled={isTaken || isUpdatingSerial}
                          onClick={() => setSelectedNewSerial(sn)}
                          className={`text-xs font-mono font-black h-9 rounded-lg flex flex-col items-center justify-center border-2 transition-all relative ${
                            isTaken 
                              ? 'bg-slate-100 border-slate-200 text-slate-450 cursor-not-allowed line-through' 
                              : isSelected 
                                ? 'bg-blue-650 border-blue-700 text-white font-extrabold shadow-md scale-105' 
                                : isCurrent
                                  ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                                  : 'bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-400 text-slate-700'
                          }`}
                        >
                          <span>{String(sn).padStart(2, '0')}</span>
                          {isCurrent && (
                            <span className="absolute -top-1.5 -right-1 text-[8px] bg-amber-500 text-white font-black px-1 rounded-full scale-75">
                              Curr
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingSerial}
                onClick={() => {
                  setEditingSerialMember(null);
                  setSelectedNewSerial(null);
                  setCustomSerialInput('');
                  setIsBypassActive(false);
                }}
                className="flex-1 h-11 text-xs font-bold uppercase text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  isUpdatingSerial || 
                  (isBypassActive 
                    ? !customSerialInput || parseInt(customSerialInput, 10) === editingSerialMember.serialNo
                    : (selectedNewSerial === null || selectedNewSerial === editingSerialMember.serialNo)
                  )
                }
                onClick={handleUpdateSerial}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider"
              >
                {isUpdatingSerial ? 'Updating...' : 'Save Serial'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
