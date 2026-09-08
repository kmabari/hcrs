import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ArrowRight, ArrowLeft, KeyRound, Smartphone, ShieldCheck, AlertCircle, RefreshCw, X, MessageCircle, Mail, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, getDocsFromServer, getDocFromServer, limit } from 'firebase/firestore';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import Logo from '../Logo';
import { useI18n } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

const loginSchema = z.object({
  mobile: z.string().trim().refine((val) => {
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11 || cleaned.length === 12 || (val.includes('@') && val.length > 5) || val.trim().length >= 3;
  }, {
    message: 'ശരിയായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക',
  }),
  pin: z.string().min(1, 'Password നൽകുക'),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLogin: (values: { email: string; pin: string }) => Promise<{ success: boolean; error?: string } | boolean> | void;
  onGoogleLogin: () => void;
  onBack: () => void;
  onRegisterClick?: (mobile?: string) => void;
  isLoading?: boolean;
}

export default function LoginForm({ onLogin, onGoogleLogin, onBack, onRegisterClick, isLoading = false }: LoginFormProps) {
  const { t } = useI18n();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMobileInput, setResetMobileInput] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobile: '',
      pin: '',
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);
    try {
      // Clean mobile input: if it contains digits with country code or prefix, extract the 10 digits
      let processedInput = values.mobile.trim();
      const onlyDigits = processedInput.replace(/\D/g, '');
      if (!processedInput.includes('@') && onlyDigits.length >= 10) {
        processedInput = onlyDigits.slice(-10);
      }

      const result: any = await onLogin({ email: processedInput, pin: values.pin });
      if (result && typeof result === 'object' && result.success === false) {
        setAuthError(result.error || 'ലോഗിൻ പരാജയപ്പെട്ടു. വിവരങ്ങൾ പരിശോധിക്കുക.');
      } else if (result === false) {
        setAuthError('തെറ്റായ പാസ്‌വേഡ്! താങ്കളുടെ ശരിയായ 6 അക്ക പാസ്‌വേഡ് നൽകുക.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'ലോഗിൻ പരാജയപ്പെട്ടു.');
    }
  };

  const openResetModal = () => {
    const currentMobile = form.getValues('mobile') || '';
    setResetMobileInput(currentMobile);
    setResetSuccessMessage(null);
    setShowResetModal(true);
  };

  const handleResetPinSubmit = async () => {
    const rawInput = resetMobileInput.trim();
    if (!rawInput) {
      toast.error('ദയവായി നിങ്ങളുടെ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.');
      return;
    }

    // If input is an email
    if (rawInput.includes('@')) {
      const loadingToast = toast.loading('Sending password reset email...');
      setIsResettingPin(true);
      try {
        await sendPasswordResetEmail(auth, rawInput);
        toast.success('പാസ്‌വേഡ് റീസെറ്റ് ലിങ്ക് ഇമെയിലിലേക്ക് അയച്ചു.', { id: loadingToast });
        setResetSuccessMessage('പാസ്‌വേഡ് റീസെറ്റ് ലിങ്ക് നിങ്ങളുടെ ഇമെയിലിലേക്ക് അയച്ചിട്ടുണ്ട്. ഇൻബോക്സ് പരിശോധിക്കുക.');
      } catch (error: any) {
        console.warn('Reset email notice:', error);
        toast.error(error?.message || 'Failed to send reset email.', { id: loadingToast });
      } finally {
        setIsResettingPin(false);
      }
      return;
    }

    const cleanMobile = rawInput.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      toast.error('ദയവായി ശരിയായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.');
      return;
    }

    const loadingToast = toast.loading('പാസ്‌വേഡ് 123456 ആയി റീസെറ്റ് ചെയ്യുന്നു...');
    setIsResettingPin(true);
    try {
      let resetDone = false;
      try {
        const res = await fetch('/api/reset-member-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanMobile })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            resetDone = true;
          }
        }
      } catch (srvErr) {
        console.warn("Server pin reset notice, attempting direct Firestore reset:", srvErr);
      }

      if (!resetDone) {
        // Direct Firestore Reset with server-first retrieval with timeout safeguard
        const fetchDocsServer = async (q: any, timeoutMs = 2500) => {
          try {
            const serverPromise = getDocsFromServer(q);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
            const s: any = await Promise.race([serverPromise, timeoutPromise]);
            if (s && !s.empty) return s;
          } catch (e) {}
          return await getDocs(q);
        };
        const fetchDocServer = async (ref: any, timeoutMs = 2500) => {
          try {
            const serverPromise = getDocFromServer(ref);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
            const s: any = await Promise.race([serverPromise, timeoutPromise]);
            if (s && s.exists()) return s;
          } catch (e) {}
          return await getDoc(ref);
        };

        const usersRef = collection(db, 'users');
        let docsToUpdate: any[] = [];

        const mobileVariations = [
          cleanMobile,
          `+91${cleanMobile}`,
          `91${cleanMobile}`,
          `0${cleanMobile}`,
          `+91 ${cleanMobile}`
        ];

        const snap = await fetchDocsServer(query(usersRef, where('mobile', 'in', mobileVariations), limit(10)));
        if (snap && !snap.empty) docsToUpdate.push(...snap.docs);

        if (docsToUpdate.length === 0) {
          const directIds = [cleanMobile, `hcrs_imp_${cleanMobile}`, `offline_${cleanMobile}`, `life_${cleanMobile}`];
          for (const dId of directIds) {
            try {
              const dSnap = await fetchDocServer(doc(db, 'users', dId), 1500);
              if (dSnap && dSnap.exists()) {
                docsToUpdate.push(dSnap);
                break;
              }
            } catch (e) {}
          }
        }

        if (docsToUpdate.length === 0 && !isNaN(Number(cleanMobile))) {
          const snapNum = await fetchDocsServer(query(usersRef, where('mobile', '==', Number(cleanMobile))), 1500);
          if (snapNum && !snapNum.empty) docsToUpdate.push(...snapNum.docs);
        }

        if (docsToUpdate.length === 0) {
          for (const altField of ['cleanMobile', 'phone', 'whatsapp', 'sponsorMobile']) {
            const snapAlt = await fetchDocsServer(query(usersRef, where(altField, '==', cleanMobile)), 1500);
            if (snapAlt && !snapAlt.empty) {
              docsToUpdate.push(...snapAlt.docs);
              break;
            }
          }
        }

        if (docsToUpdate.length === 0) {
          throw new Error('ഈ മൊബൈൽ നമ്പറിൽ രജിസ്റ്റർ ചെയ്ത അക്കൗണ്ട് കണ്ടെത്തിയില്ല. (Account not found with this mobile)');
        }
        for (const docSnap of docsToUpdate) {
          await updateDoc(docSnap.ref, {
            pin: '123456',
            mustChangePassword: true,
            pinResetRequested: true
          });
        }
      }

      toast.success('പാസ്‌വേഡ് വിജയകരമായി 123456 ആയി റീസെറ്റ് ചെയ്തു!', { id: loadingToast, duration: 6000 });
      setResetSuccessMessage('താങ്കളുടെ പാസ്‌വേഡ് വിജയകരമായി 123456 ആയി മാറ്റിയിട്ടുണ്ട്. ഇനി താഴെ കാണുന്ന "ലോഗിൻ ചെയ്യുക" ബട്ടൺ ക്ലിക്ക് ചെയ്ത് പ്രവേശിക്കാം.');

      // Auto fill form
      form.setValue('mobile', cleanMobile);
      form.setValue('pin', '123456');
      setAuthError(null);
    } catch (err: any) {
      console.error('PIN reset failed:', err);
      toast.error(err?.message || 'പാസ്‌വേഡ് റീസെറ്റ് സാധ്യമായില്ല. അഡ്മിനെ ബന്ധപ്പെടുക.', { id: loadingToast });
    } finally {
      setIsResettingPin(false);
    }
  };

  const handleWhatsAppHelp = () => {
    const rawInput = resetMobileInput.trim() || form.getValues('mobile') || '';
    const cleanMobile = rawInput.replace(/\D/g, '').slice(-10);
    const msg = encodeURIComponent(
      `നമസ്കാരം,\nഎന്റെ HCRS മെമ്പർഷിപ്പ് മൊബൈൽ നമ്പർ: ${cleanMobile || '—'}\nഎനിക്ക് പാസ്‌വേഡ് റീസെറ്റ് ചെയ്തു തരണമെന്ന് അഭ്യർത്ഥിക്കുന്നു.`
    );
    window.open(`https://wa.me/919645934571?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start pt-3 sm:pt-6 pb-8 px-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 selection:bg-[#1a2b5c]/10 relative overflow-x-hidden overflow-y-auto">
      {/* Subtle Blue and Gold Accent Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#1a2b5c]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#c9a227]/4 blur-3xl pointer-events-none" />

      {/* Floating Language Switcher */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full z-10"
      >
        {/* Prominently Centered Brand Header */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-block p-3.5 sm:p-4 bg-white shadow-premium rounded-[28px] mb-3 border border-slate-200/80 transition-all hover:scale-105 duration-300">
            <Logo className="scale-110 mx-auto" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
            {t('login_title', 'Account Login')}
          </h2>
          <p className="text-[11px] font-black text-[#c9a227] mt-2 uppercase tracking-widest leading-none">
            {t('hero_title_1', 'HIGHRICH COMMUNITY')} {t('hero_title_2', 'REVIVAL SOCIETY')}
          </p>
        </div>

        {/* Centered Card with Subtle Border Glow and Kerala Kasavu Border Pattern */}
        <div className="relative bg-white border-2 border-slate-200 p-6 sm:p-8 rounded-[36px] shadow-premium overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-[#1a2b5c] before:via-[#c9a227] before:to-[#233875] after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-1.5 after:bg-gradient-to-r after:from-[#233875] after:via-[#c9a227] after:to-[#1a2b5c]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wider ml-1 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#1a2b5c]" />
                      <span>മൊബൈൽ നമ്പർ (Mobile Number)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? 'text-[#1a2b5c]' : 'text-slate-500'}`} />
                        <Input 
                          {...field} 
                          type="text"
                          inputMode="numeric"
                          placeholder="10 അക്ക മൊബൈൽ നമ്പർ നൽകുക" 
                          disabled={isLoading}
                          onChange={(e) => {
                            if (authError) setAuthError(null);
                            const val = e.target.value;
                            if (val.includes('@') || /[a-zA-Z\/-]/.test(val)) {
                              field.onChange(val);
                            } else {
                              const digits = val.replace(/\D/g, '');
                              field.onChange(digits);
                            }
                          }}
                          className={`pl-12 h-13 bg-white border-2 ${authError ? 'border-red-400 bg-red-50/10' : 'border-slate-300'} focus:border-[#1a2b5c] focus:ring-2 focus:ring-[#1a2b5c]/20 transition-all rounded-2xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-bold text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex justify-between items-center bg-transparent px-1">
                      <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-[#1a2b5c]" />
                        <span>PASSWORD (പാസ്‌വേഡ്)</span>
                      </FormLabel>
                      <button 
                        type="button" 
                        disabled={isLoading}
                        onClick={openResetModal}
                        className="text-xs text-blue-700 hover:text-blue-950 hover:underline transition-colors font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 text-blue-700" />
                        {t('btn_reset_password', 'Reset Password')}
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? 'text-[#1a2b5c]' : 'text-slate-500'}`} />
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Password നൽകുക" 
                          disabled={isLoading}
                          maxLength={20}
                          onChange={(e) => {
                            if (authError) setAuthError(null);
                            field.onChange(e.target.value);
                          }}
                          className={`pl-12 h-13 bg-white border-2 ${authError ? 'border-red-500 bg-red-50/30' : 'border-slate-300'} focus:border-[#1a2b5c] focus:ring-2 focus:ring-[#1a2b5c]/20 transition-all rounded-2xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-bold text-red-600" />
                  </FormItem>
                )}
              />

              {authError && (
                <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex flex-col gap-2.5 text-red-800 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs font-bold leading-relaxed space-y-0.5 flex-1">
                      <p className="text-red-950 font-black">{authError}</p>
                    </div>
                  </div>

                  {/* Helpful Quick Actions: Reset PIN and WhatsApp Help */}
                  <div className="pt-2 border-t border-red-200/80 flex flex-col sm:flex-row gap-2 mt-1">
                    <button
                      type="button"
                      onClick={openResetModal}
                      className="flex-1 py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>പാസ്‌വേഡ് റീസെറ്റ് ചെയ്യുക (Reset PIN)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppHelp}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Help</span>
                    </button>
                  </div>

                  {onRegisterClick && (authError.includes('രജിസ്റ്റർ') || authError.includes('not registered') || authError.includes('അംഗത്വം')) && (
                    <button
                      id="login-register-cta-btn"
                      type="button"
                      onClick={() => onRegisterClick(form.getValues('mobile'))}
                      className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5 mt-1"
                    >
                      <span>ഇവിടെ ക്ലിക്ക് ചെയ്ത് പുതിയ അംഗത്വം എടുക്കുക (Register Now)</span>
                    </button>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-13 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-[#1a2b5c]/20 transition-all hover:scale-[1.01] active:scale-100 group uppercase tracking-widest bg-gradient-to-r from-[#1a2b5c] to-[#233875] hover:from-[#0d1733] hover:to-[#1a2b5c] text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? t('btn_processing', 'Processing...') : `${t('login_btn', 'Log In')} →`}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-slate-400">
                  <span className="bg-white px-3 font-sans">അല്ലെങ്കിൽ / OR</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={onGoogleLogin}
                className="w-full h-14 rounded-2xl text-xs sm:text-sm font-black border-2 border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 transition-all hover:scale-[1.01] active:scale-100 uppercase tracking-wider flex items-center justify-center gap-3 text-slate-900 font-sans cursor-pointer shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div className="flex flex-col items-start text-left leading-tight">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900">Sign In with Google</span>
                  <span className="text-[10px] text-blue-700 font-bold lowercase tracking-normal">സുരക്ഷിതമായി ലോഗിൻ ചെയ്യുക</span>
                </div>
              </Button>
            </form>
          </Form>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack}
            disabled={isLoading}
            className="text-slate-800 hover:text-slate-950 font-black uppercase tracking-widest text-xs border-2 border-slate-300 bg-white hover:bg-slate-100 rounded-2xl px-6 h-11 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="mr-1.5 w-4 h-4 text-[#1a2b5c]" />
            {t('btn_back_home', 'Go to Home Page')}
          </Button>

          <div className="pt-2 border-t border-slate-200/80 w-full flex justify-center">
            <button
               type="button"
               disabled={isLoading}
               onClick={onGoogleLogin}
               className="text-xs font-black uppercase tracking-widest text-slate-700 hover:text-[#1a2b5c] transition-all flex items-center gap-1.5 group cursor-pointer"
            >
               <ShieldCheck className="w-4 h-4 text-[#1a2b5c] group-hover:scale-110 transition-transform" />
               Verified Official Channel
            </button>
          </div>
        </div>
      </motion.div>

      {/* PASSWORD RESET / FORGOT PIN MODAL */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-slate-200 overflow-hidden"
            >
              {/* Top gradient stripe */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#1a2b5c] via-[#c9a227] to-[#233875]" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800">
                  <RefreshCw className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    പാസ്‌വേഡ് റീസെറ്റ് (Reset Password)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    രജിസ്റ്റർ ചെയ്ത മൊബൈൽ നമ്പർ നൽകുക
                  </p>
                </div>
              </div>

              {resetSuccessMessage ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 font-bold leading-relaxed">
                      {resetSuccessMessage}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      // Trigger login with 123456
                      form.handleSubmit(onSubmit)();
                    }}
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    123456 നൽകി ഇപ്പോൾ ലോഗിൻ ചെയ്യുക →
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5 ml-1">
                      രജിസ്റ്റർ ചെയ്ത മൊബൈൽ നമ്പർ / ഇമെയിൽ
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={resetMobileInput}
                        onChange={(e) => setResetMobileInput(e.target.value)}
                        placeholder="10 അക്ക മൊബൈൽ നമ്പർ"
                        className="pl-10 h-12 border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-950 focus:border-[#1a2b5c]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-semibold ml-1">
                      മൊബൈൽ നമ്പർ നൽകിയാൽ പാസ്‌വേഡ് നേരിട്ട് <strong className="text-slate-900 font-black">123456</strong> ആയി റീസെറ്റ് ചെയ്യപ്പെടും. ശേഷം പുതിയ പാസ്‌വേഡ് മാറ്റാം.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <Button
                      type="button"
                      disabled={isResettingPin}
                      onClick={handleResetPinSubmit}
                      className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      {isResettingPin ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {resetMobileInput.includes('@') ? 'ഇമെയിൽ റീസെറ്റ് ലിങ്ക് അയക്കുക' : 'പാസ്‌വേഡ് 123456 ആക്കുക (Reset PIN)'}
                    </Button>

                    <div className="relative py-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                        <span className="bg-white px-2">അല്ലെങ്കിൽ (OR)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleWhatsAppHelp}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp അഡ്മിൻ സഹായം (Admin Helpline)
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

