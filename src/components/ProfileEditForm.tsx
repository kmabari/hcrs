import React, { useState } from 'react';
import { UserProfile } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Lock, Save, ArrowLeft, Mail, MapPin, Heart, Calendar, EyeOff } from 'lucide-react';
import { DISTRICTS, BLOOD_GROUPS } from '@/src/constants';

interface ProfileEditFormProps {
  user: UserProfile;
  onSave: (updatedData: Partial<UserProfile>) => Promise<void>;
  onCancel: () => void;
}

export default function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const [address, setAddress] = useState(user.address || '');
  const [email, setEmail] = useState(user.email || '');
  const [pincode, setPincode] = useState(user.pincode || '');
  const [postOffice, setPostOffice] = useState(user.postOffice || '');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup || '');
  const [gender, setGender] = useState(user.gender || '');
  const [dob, setDob] = useState(user.dob || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Sanitize values
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    const updatedData: Partial<UserProfile> = {
      address: address.trim(),
      email: cleanEmail,
      pincode: pincode.trim().replace(/\D/g, ''),
      postOffice: postOffice.trim(),
      bloodGroup: bloodGroup,
      gender: gender,
      dob: dob
    };

    try {
      await onSave(updatedData);
      onCancel();
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
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCancel}
          className="rounded-full w-9 h-9 border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Edit Profile</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Update edit-permissible personal details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
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
            <div className="pt-2 pb-0.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">State</span>
              <span className="text-xs font-black text-slate-600 truncate block">{user.state || 'Kerala'}</span>
            </div>
            <div className="pt-2 pb-0.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">District / Mandalam</span>
              <span className="text-xs font-black text-slate-600 truncate block">
                {getDistrictName(user.district)} / {user.assemblyConstituency}
              </span>
            </div>
          </div>
          <p className="text-[9px] text-indigo-505 font-bold uppercase text-center mt-2">
            ⚠️ Contact high-rank administrators to amend locked values.
          </p>
        </div>

        {/* EDITABLE FIELDS SECTION */}
        <div className="space-y-4">
          <div className="font-black text-[10px] text-brand-blue uppercase tracking-wider border-b border-slate-100 pb-1.5">
            Editable Personal Information
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="m-email" className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" /> Email Address
            </Label>
            <Input 
              id="m-email"
              type="text"
              placeholder="e.g. member@email.com"
              className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Gender & DOB */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Date of Birth
              </Label>
              <Input 
                type="date"
                className="h-11 rounded-xl border-slate-200 px-3 focus-visible:ring-brand-blue text-xs font-bold"
                value={dob}
                onChange={e => setDob(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                Gender
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-black bg-white">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="m-address" className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Correspondence Address
            </Label>
            <Textarea 
              id="m-address"
              placeholder="Enter full permanent/mailing address"
              className="min-h-16 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Post Office & Pin Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-post" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Post Office
              </Label>
              <Input 
                id="m-post"
                type="text"
                placeholder="Post Town"
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold"
                value={postOffice}
                onChange={e => setPostOffice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-pin" className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Pin Code
              </Label>
              <Input 
                id="m-pin"
                type="text"
                maxLength={6}
                placeholder="6 digits pincode"
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:ring-brand-blue text-xs font-semibold font-mono"
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          {/* Blood Group */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" /> Blood Group
            </Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-black bg-white">
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {BLOOD_GROUPS.map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-xl bg-brand-magenta hover:bg-brand-magenta/95 text-white font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
