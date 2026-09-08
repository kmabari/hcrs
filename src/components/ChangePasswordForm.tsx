import React, { useState } from 'react';
import { UserProfile } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound, LogOut, AlertCircle, Sparkles, User, BadgeCheck } from 'lucide-react';
import Logo from '@/src/Logo';
import { motion } from 'motion/react';

interface ChangePasswordFormProps {
  user: UserProfile;
  onPasswordChanged: (newPin: string) => Promise<void>;
  onLogout: () => void;
  isLoading?: boolean;
}

export default function ChangePasswordForm({
  user,
  onPasswordChanged,
  onLogout,
  isLoading = false
}: ChangePasswordFormProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly numeric, maximum 6 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setNewPin(digitsOnly);
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly numeric, maximum 6 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNewPin = newPin.replace(/\D/g, '').slice(0, 6);
    const cleanConfirmPin = confirmPin.replace(/\D/g, '').slice(0, 6);

    if (!cleanNewPin || cleanNewPin.length !== 6) {
      toast.error('പാസ്‌വേഡ് കൃത്യമായി 6 അക്കങ്ങൾ (digits) ആയിരിക്കണം. (Password must be exactly 6 digits)');
      return;
    }

    if (cleanNewPin === '123456') {
      toast.error('ഡീഫോൾട്ട് പാസ്‌വേഡ് (123456) ഉപയോഗിക്കാൻ പാടില്ല. പുതിയ 6 അക്ക പാസ്‌വേഡ് നൽകുക. (Cannot use default password 123456)');
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      toast.error('നൽകിയ പാസ്‌വേഡുകൾ പരസ്പരം പൊരുത്തപ്പെടുന്നില്ല! (Passwords do not match)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPasswordChanged(cleanNewPin);
    } catch (err: any) {
      console.error('Change password failed:', err);
      toast.error(err?.message || 'പാസ്‌വേഡ് മാറ്റാൻ സാധിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക. (Failed to change password)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-br from-slate-950 via-[#0a1226] to-[#0f172a] relative overflow-hidden selection:bg-amber-400 selection:text-slate-950">
      {/* Dynamic Ambient Glowing Color Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      {/* Main Glass Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="relative backdrop-blur-2xl bg-gradient-to-b from-slate-900/85 via-slate-900/90 to-slate-950/95 border border-white/15 rounded-[32px] sm:rounded-[36px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] p-6 sm:p-8 space-y-6 text-white overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-blue-500 before:via-amber-400 before:to-indigo-500 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-1.5 after:bg-gradient-to-r after:from-indigo-500 after:via-amber-400 after:to-blue-500">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative inline-block p-3.5 bg-white/10 backdrop-blur-xl rounded-[26px] border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:scale-105 transition-all duration-300">
              <Logo className="scale-105 mx-auto" />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 p-1.5 rounded-full text-slate-950 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-black tracking-wider uppercase backdrop-blur-md shadow-xs">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              സുരക്ഷാ നിർദ്ദേശം (Security Notice)
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              പാസ്‌വേഡ് മാറ്റുക <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent text-base sm:text-lg font-black uppercase tracking-wider">
                Change Mandatory Password
              </span>
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-sm">
              സുരക്ഷ മുൻനിർത്തി ആദ്യമായി ലോഗിൻ ചെയ്യുമ്പോൾ ഡീഫോൾട്ട് പാസ്‌വേഡ് (123456) മാറ്റി പുതിയ 6 അക്ക രഹസ്യ കോഡ് നൽകേണ്ടതുണ്ട്.
            </p>
          </div>

          {/* Member Profile Glass Card */}
          <div className="relative backdrop-blur-xl bg-white/[0.06] hover:bg-white/[0.08] transition-colors rounded-2xl p-4 border border-white/15 shadow-inner space-y-2">
            <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-amber-400" />
                അംഗത്തിന്റെ പേര്
              </span>
              <span className="flex items-center gap-1">
                <BadgeCheck className="w-3 h-3 text-emerald-400" />
                മെമ്പർഷിപ്പ് നമ്പർ
              </span>
            </div>
            <div className="flex justify-between items-center font-black text-white">
              <span className="truncate max-w-[180px] text-sm text-white font-extrabold">{user.name}</span>
              <span className="font-mono text-amber-400 text-xs px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/30">
                {user.membershipId || user.mobile}
              </span>
            </div>
          </div>

          {/* Glass Form Columns */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* New Password Glass Column */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="new-pin" className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  പുതിയ പാസ്‌വേഡ് (New 6-Digit Password)
                </Label>
                <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
                  newPin.length === 6 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' 
                    : 'bg-white/10 text-slate-400 border border-white/10'
                }`}>
                  {newPin.length}/6 digits
                </span>
              </div>
              
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-amber-400 transition-colors">
                  <KeyRound className="w-4 h-4" />
                </div>
                <Input
                  id="new-pin"
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="6 അക്ക രഹസ്യ കോഡ് നൽകുക"
                  value={newPin}
                  onChange={handleNewPinChange}
                  className="h-13 pl-11 pr-12 rounded-2xl bg-white/[0.07] hover:bg-white/[0.1] focus-visible:bg-white/[0.14] border-2 border-white/20 focus-visible:border-amber-400 focus-visible:ring-4 focus-visible:ring-amber-400/20 text-white font-mono text-base font-black tracking-widest backdrop-blur-md placeholder:text-slate-500 transition-all shadow-inner"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold pl-1">കൃത്യമായി 6 അക്കങ്ങൾ ടൈപ്പ് ചെയ്യുക (Only 6 numbers)</p>
            </div>

            {/* Confirm Password Glass Column */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="confirm-pin" className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  പാസ്‌വേഡ് വീണ്ടും നൽകുക (Confirm 6-Digit Password)
                </Label>
                <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
                  confirmPin.length === 6 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' 
                    : 'bg-white/10 text-slate-400 border border-white/10'
                }`}>
                  {confirmPin.length}/6 digits
                </span>
              </div>
              
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <Input
                  id="confirm-pin"
                  type={showConfirmPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="പുതിയ പാസ്‌വേഡ് ഒരിക്കൽ കൂടി"
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  className="h-13 pl-11 pr-12 rounded-2xl bg-white/[0.07] hover:bg-white/[0.1] focus-visible:bg-white/[0.14] border-2 border-white/20 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-400/20 text-white font-mono text-base font-black tracking-widest backdrop-blur-md placeholder:text-slate-500 transition-all shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Warning when entering 123456 */}
            {newPin === '123456' && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-rose-500/15 border border-rose-400/40 text-rose-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>123456 ഡീഫോൾട്ട് പാസ്‌വേഡ് ആയതിനാൽ പുതിയ മറ്റൊരു 6 അക്ക പാസ്‌വേഡ് തിരഞ്ഞെടുക്കുക.</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting || isLoading || newPin.length !== 6 || confirmPin.length !== 6 || newPin === '123456'}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer border-b-4 border-amber-700/80 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <KeyRound className="w-4 h-4" />
                {isSubmitting || isLoading ? 'പാസ്‌വേഡ് മാറ്റുന്നു...' : 'പാസ്‌വേഡ് സേവ് ചെയ്യുക (Save Password)'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="w-full h-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border-white/20 text-slate-200 font-bold text-xs uppercase tracking-wider backdrop-blur-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                ലോഗ് ഔട്ട് (Sign Out)
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
