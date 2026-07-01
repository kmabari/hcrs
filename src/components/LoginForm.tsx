import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { Lock, ArrowRight, ArrowLeft, KeyRound, Smartphone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
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
  email: z.string().min(1, 'Enter Username or Mobile Number'),
  pin: z.string().min(4, 'Password must be at least 4 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLogin: (values: LoginValues) => void;
  onGoogleLogin: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function LoginForm({ onLogin, onGoogleLogin, onBack, isLoading = false }: LoginFormProps) {
  const { t } = useI18n();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      pin: '',
    },
  });

  useEffect(() => {
    const intent = sessionStorage.getItem('hcrs_district_intent');
    if (intent) {
      if (!form.getValues('email')) {
        form.setValue('email', `hcrs${intent.toLowerCase()}@hcrs.society`);
      }
      if (!form.getValues('pin')) {
        form.setValue('pin', '246810');
      }
    }
  }, [form]);

  const onSubmit = (values: LoginValues) => {
    onLogin(values);
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email || !email.includes('@')) {
      toast.error('Please enter your email address first.');
      return;
    }

    const loadingToast = toast.loading('Sending reset text...');
    try {
      if (email.includes('@hcrs.society')) {
        toast.error('Password reset via email is not available for mobile-registered accounts. Please contact your District Admin. (മൊബൈൽ നമ്പർ ഉപയോഗിച്ചുള്ള അക്കൗണ്ടുകൾക്ക് നേരിട്ട് പാസ്‌വേഡ് റീസെറ്റ് ചെയ്യാൻ കഴിയില്ല. അഡ്മിനെ ബന്ധപ്പെടുക.)', { id: loadingToast, duration: 8000 });
        return;
      }
      await sendPasswordResetEmail(auth, email);
      toast.success('Reset link sent to your inbox.', { id: loadingToast });
    } catch (error: any) {
      console.error('Reset error:', error);
      let errorMsg = 'Failed to send reset email.';
      
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'No user found with this email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address.';
      }
      
      toast.error(errorMsg, { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 selection:bg-brand-blue/20 relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-magenta/8 blur-3xl pointer-events-none" />

      {/* Floating Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white shadow-premium rounded-[28px] mb-4 border border-slate-100 transition-all hover:scale-105">
            <Logo className="scale-110 mx-auto" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
            {t('login_title', 'Account Login')}
          </h2>
          <p className="text-[10px] font-black text-brand-magenta mt-2.5 uppercase tracking-widest leading-none">
            {t('hero_title_1', 'HIGHRICH COMMUNITY')} {t('hero_title_2', 'REVIVAL SOCIETY')}
          </p>
        </div>

        {/* glassmorphism Card */}
        <div className="bg-white border-2 border-slate-150 p-8 rounded-[36px] shadow-premium">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-brand-magenta/10 flex items-center justify-center text-brand-magenta shadow-sm">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {t('login_title', 'Account Login')}
              </h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 leading-none">
                {t('hero_title_1', 'HIGHRICH COMMUNITY')}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider ml-1">
                      {t('label_mobile', 'Mobile Number')} / Email / Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? 'text-brand-magenta' : 'text-slate-300'}`} />
                        <Input 
                          {...field} 
                          type="text" 
                          placeholder="********** / admin@hcrs.society" 
                          disabled={isLoading}
                          className={`pl-12 h-13 bg-white border-2 border-slate-200 focus:border-brand-magenta/80 focus:ring-0 focus:bg-white transition-all rounded-2xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1 bg-transparent px-1">
                      <FormLabel className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                        {t('form_password', 'Password')}
                      </FormLabel>
                      <button 
                        type="button" 
                        disabled={isLoading}
                        onClick={handleForgotPassword}
                        className="text-[10px] text-brand-magenta hover:text-brand-magenta/80 hover:underline transition-colors font-black uppercase tracking-wider disabled:opacity-50"
                      >
                        {t('btn_reset_password', 'Reset Password')}
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? 'text-brand-magenta' : 'text-slate-300'}`} />
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="••••" 
                          disabled={isLoading}
                          maxLength={12}
                          className={`pl-12 h-13 bg-white border-2 border-slate-200 focus:border-brand-magenta/80 focus:ring-0 focus:bg-white transition-all rounded-2xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-red-500" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-13 rounded-2xl text-xs font-black shadow-lg shadow-brand-magenta/15 hover:shadow-brand-magenta/25 transition-all hover:translate-y-[-1px] active:translate-y-0 group uppercase tracking-widest bg-gradient-to-r from-brand-magenta to-pink-500 text-white hover:opacity-95"
              >
                {isLoading ? t('btn_processing', 'Processing...') : t('login_btn', 'Log In')}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-150" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <span className="bg-white px-3 font-sans">OR</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={onGoogleLogin}
                className="w-full h-13 rounded-2xl text-xs font-black border-2 border-slate-200 hover:bg-slate-50 transition-all hover:translate-y-[-1px] active:translate-y-0 uppercase tracking-widest flex items-center justify-center gap-3 text-slate-705 bg-white font-sans"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign In with Google
              </Button>

              {/* Admin login help box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  ⚠️ അഡ്മിൻ ലോഗിൻ ഗൈഡ് (Admin Access Backup)
                </p>
                <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                  മൊബൈൽ ബ്രൗസറോ അതോ ഗൂഗിൾ ലോഗിൻ പോപ്പ്അപ്പോ ലഭിക്കുന്നില്ലെങ്കിൽ, മുകളിലെ <span className="font-extrabold text-amber-900">Mobile Number / Email</span> ബോക്സിൽ നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത അഡ്മിൻ ഇമെയിൽ ഐഡി (ഉദാഹരണത്തിന്: <span className="font-mono font-bold text-amber-900">hcrskerala@gmail.com</span>) നൽകുക. തുടർന്ന് <span className="font-extrabold text-amber-900">Password</span> ബോക്സിൽ <span className="font-mono font-bold text-amber-900">246810</span> എന്ന് ടൈപ്പ് ചെയ്ത് താഴെയുള്ള <b>"Log In"</b> ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ നിങ്ങൾക്ക് അഡ്മിൻ പാനലിലേക്ക് നേരിട്ട് പ്രവേശിക്കാം.
                </p>
              </div>

              {/* Offline Local Backup access button */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => onLogin({ email: "offline_backup", pin: "246810" })}
                  className="w-full h-12 rounded-2xl text-xs font-black border-2 border-dashed border-slate-300 hover:border-brand-blue hover:bg-brand-blue/5 text-slate-650 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 bg-slate-50/50"
                >
                  <ShieldCheck className="w-4 h-4 text-brand-blue animate-pulse" />
                  ലോക്കൽ പ്രിവ്യൂ മോഡ് (Local Offline Backup)
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onBack}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 font-extrabold uppercase tracking-widest text-[10px] hover:bg-white/40 rounded-2xl px-6 h-11 transition-all"
          >
            <ArrowLeft className="mr-1.5 w-4 h-4" />
            {t('btn_back_home', 'Go to Home Page')}
          </Button>

          <div className="pt-4 border-t border-slate-200/60 w-full flex justify-center">
            <button
               type="button"
               disabled={isLoading}
               onClick={onGoogleLogin}
               className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-blue transition-all flex items-center gap-1.5 group"
            >
              <ShieldCheck className="w-4 h-4 text-slate-300 group-hover:text-brand-blue/50" />
              Verified Official Channel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
