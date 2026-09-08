import React, { useState } from 'react';
import { UserProfile } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Lock, Save, ArrowLeft, Mail, MapPin, Heart, Calendar, AlertTriangle, LogOut, CheckCircle2 } from 'lucide-react';
import { DISTRICTS, BLOOD_GROUPS, CONSTITUENCIES, getAssemblyCode } from '@/src/constants';
import { sanitizeMemberAddress } from '@/src/lib/utils';

interface ProfileEditFormProps {
  user: UserProfile;
  onSave: (updatedData: Partial<UserProfile>) => Promise<void>;
  onCancel: () => void;
  isMandatory?: boolean;
}

export default function ProfileEditForm({ user, onSave, onCancel, isMandatory = false }: ProfileEditFormProps) {
  const [address, setAddress] = useState(sanitizeMemberAddress(user.address) || '');
  const [email, setEmail] = useState(user.email || '');
  const [pincode, setPincode] = useState(user.pincode || '');
  const [postOffice, setPostOffice] = useState(user.postOffice || '');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup || '');
  const [gender, setGender] = useState(user.gender || '');
  const [dob, setDob] = useState(user.dob || '');
  const [district, setDistrict] = useState(user.district || '');
  const [assemblyConstituency, setAssemblyConstituency] = useState(
    user.assemblyConstituency && user.assemblyConstituency !== 'NA' ? user.assemblyConstituency : ''
  );
  const [sponsorName, setSponsorName] = useState(user.sponsorName || '');
  const [sponsorMobile, setSponsorMobile] = useState(user.sponsorMobile || '');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateAll = (): { isValid: boolean; newErrors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    // 1. District
    if (!district || !district.trim() || !DISTRICTS.some(d => d.code === district)) {
      newErrors.district = 'ദയവായി ജില്ല തിരഞ്ഞെടുക്കുക / Please select District';
    }

    // 2. Assembly Constituency
    if (!assemblyConstituency || !assemblyConstituency.trim() || assemblyConstituency === 'NA') {
      newErrors.assemblyConstituency = 'ദയവായി നിയമസഭാ മണ്ഡലം തിരഞ്ഞെടുക്കുക / Please select Assembly Constituency';
    }

    // 3. Address
    const cleanAddress = address.trim();
    const isPlaceholderAddress = 
      cleanAddress.toLowerCase().includes('founding core') || 
      cleanAddress.toLowerCase().includes('registered life') ||
      cleanAddress.toLowerCase().includes('hcrs registered');

    if (!cleanAddress || cleanAddress.length < 5 || isPlaceholderAddress) {
      newErrors.address = 'ദയവായി പൂർണ്ണമായ യഥാർത്ഥ മേൽവിലാസം നൽകുക (പ്ലേസ്‌ഹോൾഡർ അല്ലാതെ) / Enter full residential address';
    }

    // 4. Post Office
    const cleanPostOffice = postOffice.trim();
    if (!cleanPostOffice || cleanPostOffice.length < 2) {
      newErrors.postOffice = 'ദയവായി പോസ്റ്റ് ഓഫീസ് നൽകുക / Enter Post Office name';
    }

    // 5. Pin Code
    const cleanPincode = pincode.trim().replace(/\D/g, '');
    if (!cleanPincode || !/^\d{6}$/.test(cleanPincode)) {
      newErrors.pincode = 'സാധുവായ 6 അക്ക പിൻകോഡ് നൽകുക / Enter valid 6-digit PIN code';
    }

    // 6. Date of Birth
    if (!dob || !dob.trim()) {
      newErrors.dob = 'ദയവായി ജനന തീയതി നൽകുക / Please select Date of Birth';
    } else {
      const birthDate = new Date(dob);
      const now = new Date();
      if (isNaN(birthDate.getTime()) || birthDate > now) {
        newErrors.dob = 'സാധുവായ ജനന തീയതി നൽകുക / Enter a valid past Date of Birth';
      }
    }

    // 7. Gender
    if (!gender || !gender.trim() || !['Male', 'Female', 'Other'].includes(gender)) {
      newErrors.gender = 'ദയവായി ലിംഗം തിരഞ്ഞെടുക്കുക / Please select Gender';
    }

    // 8. Blood Group
    if (!bloodGroup || !bloodGroup.trim() || !BLOOD_GROUPS.includes(bloodGroup)) {
      newErrors.bloodGroup = 'ദയവായി രക്തഗ്രൂപ്പ് തിരഞ്ഞെടുക്കുക / Please select Blood Group';
    }

    // 9. Email (Optional, but if entered must be valid)
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'സാധുവായ ഇമെയിൽ നൽകുക / Enter a valid email address';
    }

    // 10. Sponsor Mobile (Optional, but if entered must be 10 digits)
    const cleanSponsorMobile = sponsorMobile.trim().replace(/\D/g, '');
    if (cleanSponsorMobile && cleanSponsorMobile.length !== 10) {
      newErrors.sponsorMobile = 'സ്പോൺസറുടെ മൊബൈൽ നമ്പർ 10 അക്കങ്ങൾ ആയിരിക്കണം / Sponsor mobile must be 10 digits';
    }

    // 11. Mandatory Profile Verification Confirmation Checkbox
    if (isMandatory && !isConfirmed) {
      newErrors.isConfirmed = 'മേൽവിലാസവും വിവരങ്ങളും പരിശോധിച്ച് താഴെ ടിക്ക് ചെയ്യുക / Please verify and confirm profile details';
    }

    return { isValid: Object.keys(newErrors).length === 0, newErrors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Validation Check
    const { isValid, newErrors } = validateAll();
    if (!isValid) {
      setErrors(newErrors);

      // Focus or scroll to the first missing required field
      const firstFieldKey = Object.keys(newErrors)[0];
      const targetElement = document.getElementById(`m-${firstFieldKey}`) || document.getElementById(`field-${firstFieldKey}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetElement.focus?.();
      }

      toast.error('ഫില്ല് ചെയ്യാത്ത കോളങ്ങൾ നിർബന്ധമായും പൂരിപ്പിക്കുക! (Please fill all required fields before saving)', {
        duration: 5000,
        id: 'profile_incomplete_toast'
      });
      return;
    }

    setIsSubmitting(true);
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanSponsorMobile = sponsorMobile.trim().replace(/\D/g, '');

    const updatedData: Partial<UserProfile> = {
      address: address.trim(),
      email: cleanEmail,
      pincode: pincode.trim().replace(/\D/g, ''),
      postOffice: postOffice.trim(),
      bloodGroup: bloodGroup,
      gender: gender,
      dob: dob,
      district: district,
      assemblyConstituency: assemblyConstituency,
      sponsorName: sponsorName.trim(),
      sponsorMobile: cleanSponsorMobile,
      mustCompleteProfile: false,
      profileCompleted: true
    };

    try {
      await onSave(updatedData);
      if (!isMandatory) {
        onCancel();
      }
    } catch (err) {
      console.error("Save profile error:", err);
      toast.error("Failed to update profile details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDistrictName = (code: string) => {
    return DISTRICTS.find(d => d.code === code)?.name || code;
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-premium p-6 sm:p-8 max-w-lg w-full mx-auto space-y-6 text-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          {isMandatory ? (
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              onClick={onCancel}
              className="rounded-xl h-9 px-3 border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="ലോഗൗട്ട് ചെയ്യുക"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>ലോഗൗട്ട് (Logout)</span>
            </Button>
          ) : (
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              onClick={onCancel}
              className="rounded-xl h-9 px-3 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>തിരികെ (Back)</span>
            </Button>
          )}
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              {isMandatory ? 'Complete Profile (പ്രൊഫൈൽ പൂർത്തിയാക്കുക)' : 'Edit Profile (പ്രൊഫൈൽ തിരുത്തുക)'}
            </h3>
            <p className="text-[10px] text-amber-700 font-extrabold uppercase">
              {isMandatory ? 'Mandatory Profile Completion' : 'Update Personal Details'}
            </p>
          </div>
        </div>
      </div>

      {isMandatory && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-xs font-bold text-amber-950 leading-relaxed shadow-xs">
          <div className="flex items-center gap-2 mb-1 text-amber-900 uppercase font-black text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>ശ്രദ്ധിക്കുക: പ്രൊഫൈൽ വിവരങ്ങൾ പൂർത്തിയാക്കുക</span>
          </div>
          <p className="text-[12px] font-semibold text-amber-900 leading-normal">
            പ്രിയ അംഗമേ, മെമ്പർഷിപ്പ് ഐഡി കാർഡിലേക്ക് പ്രവേശിക്കുന്നതിനായി താങ്കളുടെ മേൽവിലാസം, പോസ്റ്റ് ഓഫീസ്, പിൻകോഡ്, മണ്ഡലം, രക്തഗ്രൂപ്പ് തുടങ്ങിയ <strong className="font-black text-amber-950 underline">ഫില്ല് ചെയ്യാത്ത എല്ലാ വിവരങ്ങളും താഴെ പൂരിപ്പിച്ച് സേവ് ചെയ്യുക</strong>. എല്ലാ കോളങ്ങളും പൂരിപ്പിച്ചതിനു ശേഷം മാത്രമേ ഐഡി കാർഡ് കാണാൻ സാധിക്കൂ.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        
        {/* PERMANENTLY LOCKED FIELDS SECTION */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-black text-[9px] uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            Locked Fields (Permanently Permanent)
          </div>
          
          <div className="grid grid-cols-2 gap-3.5 divide-y divide-slate-100/50">
            <div className="pb-1.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Name</span>
              <span className="text-xs font-black text-slate-600 truncate block">{user.name}</span>
            </div>
            <div className="pb-1.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Mobile</span>
              <span className="text-xs font-mono font-black text-slate-600 truncate block">{user.mobile}</span>
            </div>
            <div className="pt-2 pb-1.5 col-span-2">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Membership ID</span>
              <span className="text-xs font-mono font-black text-brand-blue truncate block">{user.membershipId || 'KL/HCRS/PENDING'}</span>
            </div>
            <div className="pt-2 pb-1.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Constituency Code</span>
              <span className="text-xs font-mono font-black text-brand-blue truncate block">
                {user.constituencyCode || (user.assemblyConstituency ? getAssemblyCode(user.assemblyConstituency) : 'NA')}
              </span>
            </div>
            <div className="pt-2 pb-0.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">State</span>
              <span className="text-xs font-black text-slate-600 truncate block">{user.state || 'Kerala'}</span>
            </div>
          </div>
          <div className="mt-2.5 bg-amber-50 border border-amber-300 rounded-xl p-3 text-center">
            <p className="text-xs sm:text-sm font-bold text-amber-950 leading-snug">
              പേര്, മൊബൈൽ നമ്പർ, മെമ്പർഷിപ്പ് നമ്പർ എന്നിവയിൽ മാറ്റങ്ങൾ വരുത്തുവാൻ അഡ്മിനുമായി ബന്ധപ്പെടുക.
            </p>
            <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
              (Contact admin to update core credentials)
            </p>
          </div>
        </div>

        {/* EDITABLE FIELDS SECTION */}
        <div className="space-y-4">
          <div className="font-black text-[10px] text-brand-blue uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>Editable Personal Information</span>
            <span className="text-rose-600 text-[9px] font-bold">* ചിഹ്നമുള്ളവ നിർബന്ധം</span>
          </div>

          {/* District & Assembly Constituency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" id="field-district">
              <Label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                District / ജില്ല <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Select value={district} onValueChange={(val) => {
                setDistrict(val);
                clearFieldError('district');
                setAssemblyConstituency(CONSTITUENCIES[val]?.[0] || '');
                clearFieldError('assemblyConstituency');
              }}>
                <SelectTrigger className={`h-11 rounded-xl border text-xs font-black bg-white transition-all ${errors.district ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus:ring-brand-blue'}`}>
                  <SelectValue placeholder="-- ജില്ല തിരഞ്ഞെടുക്കുക / Select District --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {DISTRICTS.map(d => (
                    <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district && (
                <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.district}</p>
              )}
            </div>
            
            <div className="space-y-1.5" id="field-assemblyConstituency">
              <Label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Assembly Constituency / മണ്ഡലം <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Select 
                value={assemblyConstituency} 
                onValueChange={(val) => {
                  setAssemblyConstituency(val);
                  clearFieldError('assemblyConstituency');
                }}
                disabled={!district}
              >
                <SelectTrigger className={`h-11 rounded-xl border text-xs font-black bg-white transition-all ${errors.assemblyConstituency ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus:ring-brand-blue'}`}>
                  <SelectValue placeholder={district ? "-- മണ്ഡലം തിരഞ്ഞെടുക്കുക --" : "ആദ്യം ജില്ല തിരഞ്ഞെടുക്കുക"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(CONSTITUENCIES[district] || []).map(ac => (
                    <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assemblyConstituency && (
                <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.assemblyConstituency}</p>
              )}
            </div>
          </div>

          {/* Email (Optional) */}
          <div className="space-y-1.5" id="field-email">
            <Label htmlFor="m-email" className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> Email Address</span>
              <span className="text-[9px] font-bold text-slate-400 normal-case">(Optional / നിർബന്ധമില്ല)</span>
            </Label>
            <Input 
              id="m-email"
              type="email"
              placeholder="e.g. member@email.com (നിർബന്ധമില്ല)"
              className={`h-11 rounded-xl border px-3.5 text-xs font-semibold ${errors.email ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus-visible:ring-brand-blue'}`}
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
            />
            {errors.email && (
              <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Gender & DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" id="field-dob">
              <Label htmlFor="m-dob" className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Date of Birth / ജനന തീയതി <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Input 
                id="m-dob"
                type="date"
                className={`h-11 rounded-xl border px-3 text-xs font-bold ${errors.dob ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus-visible:ring-brand-blue'}`}
                value={dob}
                onChange={e => {
                  setDob(e.target.value);
                  clearFieldError('dob');
                }}
              />
              {errors.dob && (
                <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.dob}</p>
              )}
            </div>
            
            <div className="space-y-1.5" id="field-gender">
              <Label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Gender / ലിംഗം <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Select value={gender} onValueChange={(val) => {
                setGender(val);
                clearFieldError('gender');
              }}>
                <SelectTrigger className={`h-11 rounded-xl border text-xs font-black bg-white transition-all ${errors.gender ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus:ring-brand-blue'}`}>
                  <SelectValue placeholder="-- ലിംഗം തിരഞ്ഞെടുക്കുക --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male / പുരുഷൻ</SelectItem>
                  <SelectItem value="Female">Female / സ്ത്രീ</SelectItem>
                  <SelectItem value="Other">Other / മറ്റുള്ളവ</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.gender}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5" id="field-address">
            <Label htmlFor="m-address" className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Correspondence Address / മേൽവിലാസം <span className="text-rose-600 font-bold">*</span>
            </Label>
            <Textarea 
              id="m-address"
              placeholder="പൂർണ്ണമായ വീട്ടുപേര്, സ്ഥലം തുടങ്ങിയ മേൽവിലാസം നൽകുക"
              className={`min-h-16 rounded-xl border px-3.5 text-xs font-semibold ${errors.address ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus-visible:ring-brand-blue'}`}
              value={address}
              onChange={e => {
                setAddress(e.target.value);
                if (e.target.value.trim().length >= 5) {
                  clearFieldError('address');
                }
              }}
            />
            {errors.address && (
              <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.address}</p>
            )}
          </div>

          {/* Post Office & Pin Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" id="field-postOffice">
              <Label htmlFor="m-post" className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Post Office / പോസ്റ്റ് ഓഫീസ് <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Input 
                id="m-post"
                type="text"
                placeholder="Post Office name"
                className={`h-11 rounded-xl border px-3.5 text-xs font-semibold ${errors.postOffice ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus-visible:ring-brand-blue'}`}
                value={postOffice}
                onChange={e => {
                  setPostOffice(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    clearFieldError('postOffice');
                  }
                }}
              />
              {errors.postOffice && (
                <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.postOffice}</p>
              )}
            </div>
            <div className="space-y-1.5" id="field-pincode">
              <Label htmlFor="m-pin" className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Pin Code / പിൻകോഡ് <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Input 
                id="m-pin"
                type="text"
                maxLength={6}
                placeholder="6 digits PIN"
                className={`h-11 rounded-xl border px-3.5 text-xs font-semibold font-mono ${errors.pincode ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus-visible:ring-brand-blue'}`}
                value={pincode}
                onChange={e => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setPincode(cleaned);
                  if (cleaned.length === 6) {
                    clearFieldError('pincode');
                  }
                }}
              />
              {errors.pincode && (
                <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.pincode}</p>
              )}
            </div>
          </div>

          {/* Blood Group */}
          <div className="space-y-1.5" id="field-bloodGroup">
            <Label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" /> Blood Group / രക്തഗ്രൂപ്പ് <span className="text-rose-600 font-bold">*</span>
            </Label>
            <Select value={bloodGroup} onValueChange={(val) => {
              setBloodGroup(val);
              clearFieldError('bloodGroup');
            }}>
              <SelectTrigger className={`h-11 rounded-xl border text-xs font-black bg-white transition-all ${errors.bloodGroup ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus:ring-brand-blue'}`}>
                <SelectValue placeholder="-- രക്തഗ്രൂപ്പ് തിരഞ്ഞെടുക്കുക / Select Blood Group --" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {BLOOD_GROUPS.map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bloodGroup && (
              <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.bloodGroup}</p>
            )}
          </div>

          {/* Leader / Sponsor Section */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                Leader / Sponsor Details <span className="text-[10px] font-bold text-slate-500 normal-case">(Optional / നിർബന്ധമില്ല)</span>
              </Label>
              <span className="text-[10px] font-bold text-slate-500">For printed membership form</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-sponsor-name" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Leader / Sponsor Name <span className="text-[9px] font-bold text-slate-400 normal-case">(Optional)</span>
                </Label>
                <Input 
                  id="edit-sponsor-name"
                  type="text"
                  placeholder="Leader Name (Optional)"
                  className="h-11 rounded-xl border-slate-300 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
                  value={sponsorName}
                  onChange={e => setSponsorName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5" id="field-sponsorMobile">
                <Label htmlFor="edit-sponsor-mobile" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Leader Mobile <span className="text-[9px] font-bold text-slate-400 normal-case">(Optional)</span>
                </Label>
                <Input 
                  id="edit-sponsor-mobile"
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile (Optional)"
                  className={`h-11 rounded-xl border px-3.5 text-xs font-semibold font-mono ${errors.sponsorMobile ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-300 focus-visible:ring-brand-blue'}`}
                  value={sponsorMobile}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setSponsorMobile(cleaned);
                    if (cleaned.length === 10 || cleaned.length === 0) {
                      clearFieldError('sponsorMobile');
                    }
                  }}
                />
                {errors.sponsorMobile && (
                  <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.sponsorMobile}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MANDATORY VERIFICATION CONFIRMATION CHECKBOX */}
        {isMandatory && (
          <div 
            id="field-isConfirmed"
            onClick={() => {
              setIsConfirmed(!isConfirmed);
              clearFieldError('isConfirmed');
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
              isConfirmed 
                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' 
                : (errors.isConfirmed ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500' : 'border-amber-400 bg-amber-50/30 hover:border-amber-500')
            }`}
          >
            <Checkbox 
              checked={isConfirmed} 
              onCheckedChange={(val) => {
                setIsConfirmed(!!val);
                clearFieldError('isConfirmed');
              }} 
              className={`w-5 h-5 pointer-events-none rounded-md ${
                isConfirmed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-amber-400 bg-white'
              }`}
            />
            <div className="flex-1">
              <Label className={`text-xs sm:text-sm font-extrabold cursor-pointer leading-normal ${
                isConfirmed ? 'text-emerald-950' : 'text-slate-900'
              }`}>
                ഞാൻ മേൽവിലാസവും പ്രൊഫൈൽ വിവരങ്ങളും പരിശോധിച്ചു, കൃത്യമാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു *
              </Label>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                I have verified my address and profile details and confirm they are correct and up-to-date.
              </p>
              {errors.isConfirmed && (
                <p className="text-[10.5px] font-bold text-rose-600 mt-1">{errors.isConfirmed}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border-slate-300 hover:bg-slate-100 text-slate-800 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isMandatory ? (
              <>
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>ലോഗൗട്ട് (Logout)</span>
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span>തിരികെ (Back)</span>
              </>
            )}
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-[1.5] h-12 rounded-xl bg-brand-magenta hover:bg-brand-magenta/90 text-slate-950 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
          >
            <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : (isMandatory ? 'ഫില്ല് ചെയ്ത് സ്ഥിരീകരിക്കുക (Verify & Save)' : 'Save Profile (സേവ് ചെയ്യുക)')}
          </Button>
        </div>
      </form>
    </div>
  );
}
