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
    if (intent && !form.getValues('email')) {
      form.setValue('email', `hcrs${intent.toLowerCase()}@hcrs.society`);
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 selection:bg-brand-blue/20 bg-slate-50 relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/5 blur-3xl" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-magenta/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-white shadow-premium rounded-[24px] mb-4 border border-slate-100">
            <Logo className="scale-110 mx-auto" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">
            Portal Access
          </h2>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-none">
            Highrich Community Revival Society
          </p>
        </div>

        {/* glassmorphism Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border border-white/50 shadow-premium">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-magenta/10 flex items-center justify-center text-brand-magenta">
              <KeyRound className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-brand-magenta uppercase tracking-wide">
                Member Authentication
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
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
                  <FormItem className="space-y-1.5Packed">
                    <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">
                      Mobile / Email / Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? 'text-brand-magenta' : 'text-slate-300'}`} />
                        <Input 
                          {...field} 
                          type="text" 
                          placeholder="Eg: 9876543210 or email@domain.com" 
                          disabled={isLoading}
                          className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-magenta focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
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
                  <FormItem className="space-y-1.5Packed">
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider">
                        Secure code (PIN)
                      </FormLabel>
                      <button 
                        type="button" 
                        disabled={isLoading}
                        onClick={handleForgotPassword}
                        className="text-[10px] text-brand-magenta hover:text-brand-magenta/80 transition-colors font-black uppercase tracking-wider disabled:opacity-50"
                      >
                        Reset Password
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? 'text-brand-magenta' : 'text-slate-300'}`} />
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="••••" 
                          disabled={isLoading}
                          maxLength={12}
                          className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-magenta focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
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
                className="w-full h-12 rounded-xl text-xs font-black shadow-lg shadow-brand-magenta/15 hover:shadow-brand-magenta/20 transition-all hover:translate-y-[-1px] active:translate-y-0 group uppercase tracking-widest bg-brand-magenta text-white hover:bg-brand-magenta/95"
              >
                {isLoading ? 'Processing Access...' : 'Verify Credentials'}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
              </Button>
            </form>
          </Form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onBack}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider text-[10px] hover:bg-white/40 rounded-xl"
          >
            <ArrowLeft className="mr-1.5 w-3.5 h-3.5" />
            Return to Landing Portal
          </Button>

          <div className="pt-4 border-t border-slate-200/60 w-full flex justify-center">
            <button
               type="button"
               disabled={isLoading}
               onClick={onGoogleLogin}
               className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 hover:text-brand-blue transition-all flex items-center gap-1.5 group"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-blue/50" />
              Verified Official Channel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
