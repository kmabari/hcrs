import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { User, Phone, MapPin, CreditCard, Droplets, Camera, Lock, ArrowRight, ArrowLeft, Receipt, ShieldCheck } from 'lucide-react';
import { DISTRICTS, BLOOD_GROUPS, STATES, CONSTITUENCIES } from '@/src/constants';
import Logo from '../Logo';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  address: z.string().min(5, 'Enter full address'),
  district: z.string().min(1, 'Select district'),
  state: z.string().min(1, 'Select state'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter 6-digit pincode'),
  postOffice: z.string().min(1, 'Post office is required'),
  assemblyConstituency: z.string().min(1, 'Assembly constituency is required'),
  bloodGroup: z.string().min(1, 'Select blood group'),
  transactionId: z.string().min(6, 'Enter valid transaction id'),
  paymentTime: z.string().min(1, 'Select payment time'),
  pin: z.string().min(6, 'Password is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  onSubmit: (values: FormValues) => void;
  districtQuotas?: Record<string, number>;
  districtQuotasUsed?: Record<string, number>;
}

export default function RegistrationForm({ onSubmit, districtQuotas = {}, districtQuotasUsed = {} }: RegistrationFormProps) {
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('hcrs_registration_step');
    return saved ? parseInt(saved, 10) : 1;
  });

  React.useEffect(() => {
    localStorage.setItem('hcrs_registration_step', step.toString());
  }, [step]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      address: '',
      district: '',
      state: STATES[0].code,
      pincode: '',
      postOffice: '',
      assemblyConstituency: '',
      bloodGroup: BLOOD_GROUPS[0],
      transactionId: '',
      paymentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pin: '123456',
    },
  });

  React.useEffect(() => {
    const saved = localStorage.getItem('hcrs_registration_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name || parsed.mobile) {
          form.reset({ 
            ...form.getValues(),
            ...parsed, 
            paymentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          });
          toast.info('മുമ്പ് പൂരിപ്പിച്ചു തുടങ്ങിയ ഫോം ലഭ്യമാണ് (Previous draft loaded).', {
            action: {
              label: 'Clear (മായ്ക്കുക)',
              onClick: () => {
                localStorage.removeItem('hcrs_registration_cache');
                localStorage.removeItem('hcrs_registration_step');
                form.reset({
                  name: '',
                  mobile: '',
                  email: '',
                  address: '',
                  district: '',
                  state: STATES[0].code,
                  pincode: '',
                  postOffice: '',
                  assemblyConstituency: '',
                  bloodGroup: BLOOD_GROUPS[0],
                  transactionId: '',
                  paymentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  pin: '123456',
                });
                setStep(1);
                toast.success('ഫോം ക്ലിയർ ചെയ്തു. (Form cleared)');
              }
            },
            duration: 7000
          });
        }
      } catch (e) {
        console.error("Failed to parse saved registration data", e);
      }
    }
  }, []);

  React.useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem('hcrs_registration_cache', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const district = form.watch('district');
  const availableConstituencies = CONSTITUENCIES[district] || [];

  const nextStep = async () => {
    const fieldsToValidate = step === 1 
      ? ['name', 'mobile', 'email', 'pin', 'bloodGroup'] as const
      : step === 2 
      ? ['transactionId', 'paymentTime'] as const
      : ['address', 'district', 'state', 'pincode', 'postOffice', 'assemblyConstituency'] as const;

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (step < 3) setStep(step + 1);
      else {
        form.handleSubmit((data) => onSubmit(data))();
      }
    } else {
      toast.error('ചില കോളങ്ങൾ പൂരിപ്പിക്കാൻ ബാക്കിയുണ്ട് (Please fill all required fields correctly).');
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen py-16 px-4 font-sans bg-slate-50 relative overflow-hidden flex items-center justify-center">
      {/* Dynamic graphic backdrops */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-magenta/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-blue/5 blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full z-10">
        <div className="text-center mb-10">
          <div className="inline-block p-2.5 bg-white shadow-premium rounded-[22px] mb-3 border border-slate-100">
            <Logo className="scale-105 mx-auto" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Registration</h2>
          <p className="text-slate-400 text-[9px] font-bold tracking-widest mt-1.5 uppercase">HIGHRICH COMMUNITY REVIVAL SOCIETY</p>
        </div>

        {/* Dynamic Minimalist Progress Node */}
        <div className="mb-10 flex justify-between items-center px-6 max-w-sm mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-500 shadow-sm ${
                step === i ? 'bg-brand-blue text-white ring-4 ring-brand-blue/15' : 
                step > i ? 'bg-brand-magenta text-white' : 'bg-white border border-slate-200 text-slate-300'
              }`}>
                {step > i ? '✓' : i}
              </div>
              {i < 3 && <div className={`w-12 h-[2px] mx-1 rounded-full transition-colors duration-500 ${step > i ? 'bg-brand-magenta' : 'bg-slate-205 border-dashed border transition-colors'}`} />}
            </div>
          ))}
        </div>

        {/* Sleek Form Container */}
        <Card className="border border-white/50 bg-white/80 backdrop-blur-xl shadow-premium overflow-hidden rounded-[28px]">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 pt-7 px-8">
            <CardTitle className="text-lg font-black text-brand-blue flex items-center gap-3.5 uppercase tracking-tight">
              {step === 1 && <User className="w-5 h-5 text-brand-blue" />}
              {step === 2 && <CreditCard className="w-5 h-5 text-brand-magenta animate-pulse" />}
              {step === 3 && <MapPin className="w-5 h-5 text-brand-blue" />}
              {step === 1 ? 'Personal Profile' : step === 2 ? 'Payment Verification' : 'Location Data'}
            </CardTitle>
            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Secure Registration Node</CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <Form {...form}>
              <form className="space-y-6">
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <FormField control={form.control} name="name" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Full Name (പൂർണ്ണമായ പേര്)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              placeholder="Enter your full legal name" 
                              className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="mobile" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Mobile Number (ഫോൺ നമ്പർ)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              maxLength={10}
                              placeholder="10-digit number" 
                              className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="pin" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Login PIN / Password (പാസ്‌വേഡ് - 6 അക്കം)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              type="password"
                              placeholder="Set 6-digit login pin" 
                              maxLength={12}
                              className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="email" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Email Address (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Receipt className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="Optional: name@example.com" 
                              className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="bloodGroup" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Blood Group</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
                              <div className="flex items-center gap-2">
                                <Droplets className={`w-4 h-4 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                                <SelectValue placeholder="Select Blood Group" />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div className="bg-brand-blue/[0.04] border border-brand-blue/15 rounded-2xl p-6.5 text-center">
                      <h4 className="font-black text-brand-blue text-sm flex items-center justify-center gap-2.5 mb-2.5 uppercase tracking-wide">
                        <Receipt className="w-5 h-5 text-brand-magenta" />
                        Treasury Fee Deposit Gateway
                      </h4>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed">Deposit <span className="text-brand-blue font-black italic">₹200</span> via UPI (Google Pay, PhonePe, Paytm):</p>
                      <div 
                        className="bg-white border border-slate-200/80 px-6 py-4 rounded-xl mt-3.5 flex items-center justify-between group cursor-pointer shadow-sm hover:border-brand-blue transition-all" 
                        onClick={() => {
                          navigator.clipboard.writeText('9645934571');
                          toast.success('Official number copied to clipboard! (9645934571)');
                        }}
                      >
                        <p className="text-2xl font-mono font-black text-brand-blue tracking-tighter">9645934571</p>
                        <span className="text-[8px] font-black text-slate-400 group-hover:text-brand-blue transition-colors uppercase tracking-widest leading-none">Copy Number</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-3 font-semibold uppercase tracking-wide leading-tight">
                        * Input the Transaction ID from the transfer receipt below.
                      </p>
                    </div>

                    <FormField control={form.control} name="transactionId" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">UPI Transaction Reference Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Receipt className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? "text-brand-magenta" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              placeholder="12-digit UPI / GPay Ref No." 
                              className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-magenta focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="paymentTime" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Confirmed Payment Time</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="time" 
                            className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-magenta focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <FormField control={form.control} name="address" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Full Delivery Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="House / Flat No, Street, Landmark" 
                            className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="district" render={({ field, fieldState }) => (
                        <FormItem className="col-span-1 space-y-1.5Packed">
                          <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">District</FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('assemblyConstituency', CONSTITUENCIES[val]?.[0] || '');
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Select District" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="state" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5Packed">
                          <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Select State" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="assemblyConstituency" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5Packed">
                          <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Assembly Constituency</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            disabled={!district}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder={district ? "Select Assembly" : "Select District first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {availableConstituencies.map(ac => <SelectItem key={ac} value={ac}>{ac}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="pincode" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5Packed">
                          <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Pincode</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              maxLength={6} 
                              placeholder="6-digit PIN" 
                              className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="postOffice" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Post Office Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Post Office name matching pincode" 
                            className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </motion.div>
                )}

                {/* Back / Next Multi-Step Actions */}
                <div className="flex gap-4 pt-8 border-t border-slate-100/60">
                  {step > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevStep} 
                      className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 border-slate-200 bg-white"
                    >
                      <ArrowLeft className="mr-1.5 w-4 h-4" />
                      Back
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    disabled={step === 3 && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district]}
                    className="flex-[2] h-12 rounded-xl h-12 text-xs font-black transition-all shadow-lg shadow-brand-blue/15 hover:shadow-brand-blue/20 uppercase tracking-widest bg-brand-blue hover:bg-brand-blue/95 text-white disabled:opacity-50"
                  >
                    {step === 3 ? (
                      (districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district])
                        ? 'Quota Exhausted' 
                        : 'Complete Registration'
                    ) : 'Continue Step'}
                    {step < 3 && <ArrowRight className="ml-1.5 w-4 h-4" />}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
