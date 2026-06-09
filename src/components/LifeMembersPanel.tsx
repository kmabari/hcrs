import React, { useState, useMemo, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '@/src/lib/imageUtils';
import { DISTRICTS, BLOOD_GROUPS, getAssemblyCode } from '@/src/constants';
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
}

const LIFE_MANDALAMS = ["Kottakkal", "Tanur", "Tirurangadi", "Vengara", "Malappuram", "Nilambur"];

export default function LifeMembersPanel({ members, adminUser }: LifeMembersPanelProps) {
  // Filter for currently active Life Members
  const lifeMembers = useMemo(() => {
    return members.filter(m => m.membership_type === 'LIFE_MEMBER');
  }, [members]);

  // Outstanding count
  const lifeCount = lifeMembers.length;
  const isLimitReached = lifeCount >= 23;

  // Set of occupied serials parsed from membershipId (last 3 digits) or custom serialNo field
  const occupiedSerials = useMemo(() => {
    const serials = new Set<number>();
    members.forEach(m => {
      if (m.membership_type === 'LIFE_MEMBER') {
        if (m.serialNo && typeof m.serialNo === 'number') {
          serials.add(m.serialNo);
        } else if (m.membershipId) {
          const parts = m.membershipId.split('-');
          const lastPart = parts[parts.length - 1];
          const num = parseInt(lastPart, 10);
          if (!isNaN(num)) serials.add(num);
        }
      }
    });
    return serials;
  }, [members]);

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

  // Profile Card trigger modal
  const [viewingMember, setViewingMember] = useState<UserProfile | null>(null);

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
      // Check duplicate mobile in whole database
      const usersRef = collection(db, 'users');
      const mobileQuery = query(usersRef, where('mobile', '==', cleanMobile));
      const mobileSnap = await getDocs(mobileQuery);
      
      if (!mobileSnap.empty) {
        toast.error('ഈ മൊബൈൽ നമ്പർ ഇതിനകം രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്. തനിപ്പകർപ്പ് അനുവദനീയമല്ല.', { id: loadingToast });
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
      // Format ID: HCRS-LIFE-KL-MLP-KTK-### as explicitly requested
      const generatedMembershipId = `HCRS-LIFE-KL-MLP-KTK-${serialStr}`;

      const newProfile: any = {
        uid: finalUid,
        name: name.trim(),
        mobile: cleanMobile,
        email: email.trim() || `${cleanMobile}@hcrs-life.society`,
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
        districtCode: 'MLP',
        constituencyCode: 'KTK',
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
                    {LIFE_MANDALAMS.map(mnd => (
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
                          {/* Action Button: View premium ID card */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingMember(m)}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center z-[100] p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 relative w-full max-w-lg shadow-2xl my-auto">
            <button 
              onClick={() => setViewingMember(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 p-2 rounded-full transition-colors z-50Close"
            >
              <Trash2 className="w-4 h-4 rotate-45" /> {/* Use rotating trash can for cancel effect or generic Close icon */}
            </button>
            <div className="text-center mb-4 pt-2">
              <h3 className="font-black text-amber-400 text-sm uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500 animate-spin" />
                FOUNDING LIFE MEMBER CARD
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">പ്രീമിയം ഗോൾഡ് ഡിസൈൻ ഡിജിറ്റൽ സർട്ടിഫിക്കറ്റ്/ഐഡി</p>
            </div>
            
            <div className="flex justify-center my-4 overflow-x-auto">
              <MembershipCard member={viewingMember} isReadOnly={true} showCelebration={false} />
            </div>

            <div className="mt-4 flex justify-center">
              <Button 
                onClick={() => setViewingMember(null)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase px-8 py-2.5 rounded-xl transition-all"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
