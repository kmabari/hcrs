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
            Portal Access
          </h2>
          <p className="text-[10px] font-black text-brand-magenta mt-2.5 uppercase tracking-widest leading-none">
            Highrich Community Revival Society
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
                Member Authentication
              </h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 leading-none">
                Operator / District / Member Gateway
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
                      Mobile / Email / Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? 'text-brand-magenta' : 'text-slate-300'}`} />
                        <Input 
                          {...field} 
                          type="text" 
                          placeholder="********** or admin@hcrs.com" 
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
                        Secure code (PIN)
                      </FormLabel>
                      <button 
                        type="button" 
                        disabled={isLoading}
                        onClick={handleForgotPassword}
                        className="text-[10px] text-brand-magenta hover:text-brand-magenta/80 hover:underline transition-colors font-black uppercase tracking-wider disabled:opacity-50"
                      >
                        Reset Password
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
                {isLoading ? 'Processing Access...' : 'Verify Credentials'}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />}
              </Button>
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
            Return to Landing Portal
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
