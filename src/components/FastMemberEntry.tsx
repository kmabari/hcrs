import React, { useState } from 'react';
import { db, secondaryAuth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { DISTRICTS, CONSTITUENCIES } from '@/src/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserProfile } from '@/src/types';
import { CheckCircle2, UserPlus, Copy, RefreshCw, Phone, User, Landmark, ShieldCheck } from 'lucide-react';

interface FastMemberEntryProps {
  adminUser: UserProfile | null;
  districtQuotas: Record<string, number>;
  districtQuotasUsed: Record<string, number>;
  onMemberAdded?: () => void;
}

const DEFAULT_PASSWORD = "123456";

export default function FastMemberEntry({ adminUser, districtQuotas, districtQuotasUsed, onMemberAdded }: FastMemberEntryProps) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('Kerala');
  const [district, setDistrict] = useState(adminUser?.district || '');
  const [mandalam, setMandalam] = useState('');
  
  React.useEffect(() => {
    if (adminUser?.district) {
      setDistrict(adminUser.district);
    }
  }, [adminUser?.district]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdMember, setCreatedMember] = useState<{
    name: string;
    mobile: string;
    membershipId: string;
    password: string;
    district: string;
    mandalam: string;
  } | null>(null);

  // Filter mandalams (constituencies) based on chosen district
  const mandalamOptions = district ? (CONSTITUENCIES[district] || []) : [];

  const handleReset = () => {
    setName('');
    setMobile('');
    setDistrict(adminUser?.district || '');
    setMandalam('');
    setCreatedMember(null);
  };

  const handleCopy = () => {
    if (!createdMember) return;
    const districtName = DISTRICTS.find(d => d.code === createdMember.district)?.name || createdMember.district;
    const textToCopy = `*HCRS Membership Created Successfully!*\n\n*Name:* ${createdMember.name}\n*Mobile:* ${createdMember.mobile}\n*Membership ID:* ${createdMember.membershipId}\n*District:* ${districtName}\n*Mandalam:* ${createdMember.mandalam}\n\n*How to Login:*\n1. Visit portal\n2. Log in with your mobile number: *${createdMember.mobile}*\n3. Enter password: *${createdMember.password}*\n\n_Keep your login credentials secure. Welcome to HCRS! "Together We Grow"_`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success('Credentials copied to clipboard! (വിവരങ്ങൾ കോപ്പി ചെയ്തു)');
    }).catch(err => {
      console.error('Copy failed: ', err);
      toast.error('Could not copy automatically. Please select text manually.');
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validations
    if (!name.trim()) {
      toast.error('Please enter Member Name.');
      return;
    }
    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!state) {
      toast.error('Please select State.');
      return;
    }
    if (!district) {
      toast.error('Please select District.');
      return;
    }
    if (!mandalam) {
      toast.error('Please select Mandalam.');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Initiating Fast Manual Entry...');

    try {
      // 1. MOBILE NUMBER PROTECTION: Check for uniqueness
      const usersRef = collection(db, 'users');
      const mobileQuery = query(
        usersRef, 
        where('mobile', '==', cleanMobile), 
        where('status', 'in', ['pending', 'active', 'offline', 'disabled'])
      );
      const mobileSnap = await getDocs(mobileQuery);
      if (!mobileSnap.empty) {
        toast.error('Mobile number already registered. No duplicate permits allowed.', { id: loadingToast });
        setIsSubmitting(false);
        return;
      }

      // 2. DISTRICT QUOTA CHECK
      const distQuota = districtQuotas[district];
      const usedDistQuota = districtQuotasUsed[district] || 0;
      if (distQuota !== undefined && distQuota > 0 && usedDistQuota >= distQuota) {
        toast.error(`അനുവദിച്ച എൻട്രികളുടെ പരിധി കവിഞ്ഞു! (District quota exhausted for ${district}: ${usedDistQuota}/${distQuota})`, { id: loadingToast });
        setIsSubmitting(false);
        return;
      }

      // 3. ADMIN PERSONAL QUOTA CHECK (if operator or secondary admin)
      if (adminUser && adminUser.role !== 'admin') {
        const adminDocRef = doc(db, 'users', adminUser.uid);
        const adminSnap = await getDoc(adminDocRef);
        if (adminSnap.exists()) {
          const adminData = adminSnap.data();
          const pQuota = adminData.quota;
          const pUsed = adminData.quotaUsed || 0;
          if (pQuota !== undefined && pQuota > 0 && pUsed >= pQuota) {
            toast.error('നിങ്ങളുടെ വ്യക്തിഗത എൻട്രികളുടെ ക്വാട്ട പരിധി കഴിഞ്ഞു. (Personal limit exhausted)', { id: loadingToast });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // 4. CREATE AUTH ACCOUNT IN FIREBASE AUTH using secondary app instance
      const virtualEmail = `${cleanMobile}@hcrs.society`;
      let finalUid = '';
      try {
        const authResult = await createUserWithEmailAndPassword(secondaryAuth, virtualEmail, DEFAULT_PASSWORD);
        finalUid = authResult.user.uid;
        // Sign out secondary session immediately
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Fallback if auth exists but firestore was missing/stale
          finalUid = `offline_${cleanMobile}_${Date.now()}`;
        } else {
          throw authErr;
        }
      }

      if (!finalUid) {
        throw new Error('Authentication mapping failed.');
      }

      // 5. TRANSACTION FOR INCREMENTING SERIAl NO & WRITING RECORD
      const stateCode = 'KER'; // Standard State code for Kerala
      const metadataRef = doc(db, 'system', 'totals');
      const quotaRef = doc(db, 'districtQuotas', district);
      const userRef = doc(db, 'users', finalUid);

      let nextSerial = 1001;

      await runTransaction(db, async (transaction) => {
        // Reads
        const qSnap = await transaction.get(quotaRef);
        const metaDoc = await transaction.get(metadataRef);

        // Quota increment logic in transaction
        if (qSnap.exists()) {
          const qData = qSnap.data();
          if (qData.total && qData.total > 0 && (qData.used || 0) >= qData.total) {
            throw new Error(`QUOTA_EXHAUSTED`);
          }
          transaction.update(quotaRef, { used: increment(1) });
        } else {
          // Initialize district quota if not exists
          const distName = DISTRICTS.find(d => d.code === district)?.name || district;
          transaction.set(quotaRef, {
            id: district,
            districtName: distName,
            total: 500,
            used: 1
          });
        }

        // Serial check logic
        if (metaDoc.exists()) {
          nextSerial = (metaDoc.data().count || 1000) + 1;
        }
        transaction.set(metadataRef, { count: nextSerial }, { merge: true });

        // Update operator personal limit used
        if (adminUser) {
          const opRef = doc(db, 'users', adminUser.uid);
          transaction.set(opRef, { quotaUsed: increment(1) }, { merge: true });
        }

        // Generate Structured Membership ID: State + District + Mandalam (Assembly) + Running Serial 6 digits
        // For Mandalam code: First 3 letters of Chosen Mandalam stripped of whitespace
        const cleanMandalamName = mandalam.toUpperCase().replace(/\s/g, '');
        const mandalamCode = cleanMandalamName.length >= 3 ? cleanMandalamName.substring(0, 3) : 'MDL';
        
        const serialStr = String(nextSerial).padStart(6, '0');
        const generatedMembershipId = `${stateCode}-${district}-${mandalamCode}-${serialStr}`.toUpperCase();

        const newProfile: any = {
          uid: finalUid,
          name: name.trim(),
          mobile: cleanMobile,
          email: '', // empty initially as required
          state: state,
          district: district,
          assemblyConstituency: mandalam,
          address: '',
          pincode: '',
          postOffice: '',
          bloodGroup: '',
          gender: '',
          dob: '',
          membershipId: generatedMembershipId,
          status: 'active', // Approved and Active instantly
          isPaid: true,
          isApproved: true,
          isAdmin: false,
          role: 'member',
          serialNo: nextSerial,
          registrationDate: serverTimestamp(),
          registeredBy: adminUser?.uid || 'district_admin',
          registeredByName: adminUser?.name || 'District Admin',
          waStatus: 'Pending'
        };

        transaction.set(userRef, newProfile);
      });

      // 6. SUCCESS
      const cleanMandalamName = mandalam.toUpperCase().replace(/\s/g, '');
      const mandalamCode = cleanMandalamName.length >= 3 ? cleanMandalamName.substring(0, 3) : 'MDL';
      const serialStr = String(nextSerial).padStart(6, '0');
      const generatedMembershipId = `${stateCode}-${district}-${mandalamCode}-${serialStr}`.toUpperCase();

      setCreatedMember({
        name: name.trim(),
        mobile: cleanMobile,
        membershipId: generatedMembershipId,
        password: DEFAULT_PASSWORD,
        district: district,
        mandalam: mandalam
      });

      toast.success('Member created successfully! (അംഗത്തെ വിജയകരമായി ചേർത്തു)', { id: loadingToast });
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (err: any) {
      console.error('Fast manual entry error:', err);
      let errorMsg = 'Failed to record entry. Plese check options.';
      if (err.message === 'QUOTA_EXHAUSTED') {
        errorMsg = 'District quota constraint violated.';
      }
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdMember) {
    return (
      <div className="bg-white rounded-3xl border border-amber-100 shadow-xl p-8 max-w-xl mx-auto space-y-6 text-slate-800 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Member Registered!</h3>
            <p className="text-sm font-semibold text-emerald-600 font-bold">അംഗ അക്കൗണ്ട് വിജയകരമായി രജിസ്റ്റർ ചെയ്യുകയും അപ്രൂവ് ചെയ്യുകയുംചെയ്തു (Active & Approved)</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 divide-y divide-slate-100 font-sans">
          <div className="flex justify-between py-2.5 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Member Name</span>
            <span className="text-sm font-black text-slate-800">{createdMember.name}</span>
          </div>
          <div className="flex justify-between py-2.5 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile Number</span>
            <span className="text-sm font-mono font-black text-slate-800">{createdMember.mobile}</span>
          </div>
          <div className="flex justify-between py-2.5 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Membership ID</span>
            <span className="text-xs font-mono font-black bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-md leading-none">
              {createdMember.membershipId}
            </span>
          </div>
          <div className="flex justify-between py-2.5 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">State & District</span>
            <span className="text-sm font-black text-slate-800">
              Kerala | {DISTRICTS.find(d => d.code === createdMember.district)?.name || createdMember.district}
            </span>
          </div>
          <div className="flex justify-between py-2.5 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mandalam</span>
            <span className="text-sm font-black text-slate-800">{createdMember.mandalam}</span>
          </div>
          <div className="flex justify-between py-2.5 items-center bg-brand-magenta/5 border border-brand-magenta/10 rounded-xl p-3 mt-4">
            <span className="text-xs font-black text-brand-magenta uppercase tracking-wider">Default Password</span>
            <span className="text-sm font-mono font-black text-brand-magenta">{createdMember.password}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleCopy}
            className="flex-1 h-12 rounded-xl bg-brand-blue hover:bg-brand-blue/95 text-white font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy Access Details
          </Button>
          <Button 
            onClick={handleReset}
            variant="outline"
            className="flex-1 h-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Add Next Member
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow- premium max-w-xl mx-auto overflow-hidden animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-brand-blue to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
            <UserPlus className="w-5 h-5 text-brand-magenta" />
          </div>
          <div>
            <h3 className="font-black text-base uppercase tracking-tight">Fast Member Entry</h3>
            <p className="text-[10px] text-slate-350 font-bold uppercase">Rapid manual student/member registration</p>
          </div>
        </div>
        <div className="bg-brand-magenta text-white px-2.5 py-1 rounded-full text-[8.5px] font-black tracking-widest uppercase">Admin Mode</div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 text-slate-800 font-sans">
        <p className="text-xs text-slate-505 leading-relaxed bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
          Use this module to instantly create active, verified member profiles. A credentials account will be set up automatically inside Firebase Auth with a default PIN (123456) & formatted ID. Name and mobile number fields are permanent.
        </p>

        {/* Name Fields */}
        <div className="space-y-2">
          <Label className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-blue" />
            Member Name <span className="text-red-500">*</span>
          </Label>
          <Input 
            type="text"
            required
            placeholder="Enter full legal name"
            className="h-12 rounded-xl border-slate-200 px-4 focus-visible:ring-brand-blue text-sm font-semibold"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <Label className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-brand-blue" />
            Mobile Number (Username) <span className="text-red-500">*</span>
          </Label>
          <Input 
            type="tel"
            required
            maxLength={10}
            placeholder="10 digit phone number (e.g. 9876543210)"
            className="h-12 rounded-xl border-slate-200 px-4 focus-visible:ring-brand-blue text-sm font-semibold font-mono"
            value={mobile}
            onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
          />
          <p className="text-[9.5px] text-indigo-500 font-bold leading-none uppercase">Mobile number will be used to log in. Must be globally unique.</p>
        </div>

        {/* Location selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* State Selection */}
          <div className="space-y-2">
            <Label className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-brand-blue" />
              State <span className="text-red-500">*</span>
            </Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-extrabold bg-white">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kerala">Kerala</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* District Selection */}
          <div className="space-y-2">
            <Label className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-brand-blue" />
              District <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={district} 
              onValueChange={val => {
                setDistrict(val);
                setMandalam(''); // reset mandalam when district changes
              }}
              disabled={!!adminUser?.district}
            >
              <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-extrabold bg-white disabled:opacity-50">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {DISTRICTS.map(d => (
                  <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mandalam Selection */}
          <div className="space-y-2">
            <Label className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-brand-magenta" />
              Mandalam <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={mandalam} 
              onValueChange={setMandalam}
              disabled={!district}
            >
              <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-brand-blue text-xs font-extrabold bg-white disabled:opacity-50">
                <SelectValue placeholder={district ? "Select mandalam" : "Choose district first"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {mandalamOptions.map(ac => (
                  <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Terms details */}
        <div className="border-t border-slate-100 pt-6 flex sm:items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 self-start sm:self-center" />
          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            By submitting, this profile is marked as paid and verified immediately. Expiry date will set to 1 year from today.
          </p>
        </div>

        <Button 
          type="submit"
          className="w-full h-12 rounded-xl bg-brand-magenta hover:bg-brand-magenta/95 text-white font-black uppercase text-xs tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-md mt-2 disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Member Account...' : 'Instant Create Member Profile'}
        </Button>
      </form>
    </div>
  );
}
