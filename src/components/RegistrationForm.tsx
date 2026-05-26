import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { User, Phone, MapPin, Landmark, ShieldCheck, ArrowRight, Heart, Receipt, ArrowLeft } from 'lucide-react';
import { DISTRICTS, STATES, CONSTITUENCIES } from '@/src/constants';
import Logo from '../Logo';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required / പേര് നൽകുക'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number / 10 അക്ക മെബൈൽ നമ്പർ നൽകുക'),
  district: z.string().min(1, 'Select district / ജില്ല തിരഞ്ഞെടുക്കുക'),
  state: z.string().min(1, 'Select state / സ്റ്റേറ്റ് തിരഞ്ഞെടുക്കുക'),
  assemblyConstituency: z.string().min(1, 'Assembly constituency is required / മണ്ഡലം തിരഞ്ഞെടുക്കുക'),
});

type FormValues = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  onSubmit: (values: any) => void;
  districtQuotas?: Record<string, number>;
  districtQuotasUsed?: Record<string, number>;
  initialMobile?: string;
}

export default function RegistrationForm({ onSubmit, districtQuotas = {}, districtQuotasUsed = {}, initialMobile }: RegistrationFormProps) {
  const [step, setStep] = React.useState<'details' | 'payment'>('details');
  const [transactionId, setTransactionId] = React.useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: initialMobile || '',
      district: '',
      state: 'Kerala',
      assemblyConstituency: '',
    },
  });

  const district = form.watch('district');
  const availableConstituencies = CONSTITUENCIES[district] || [];

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (isValid) {
      setStep('payment');
    }
  };

  const handleFinalSubmit = () => {
    if (!transactionId.trim()) {
      toast.error('Please enter payment transaction ID / ട്രാന്സാക്ഷൻ ഐഡി നൽകുക');
      return;
    }
    const data = form.getValues();
    const fullValues = {
      ...data,
      email: '',
      address: '',
      pincode: '',
      postOffice: '',
      bloodGroup: '',
      transactionId: transactionId.trim(),
      paymentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pin: '123456', // default lock pin
    };
    onSubmit(fullValues);
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Membership Registration</h2>
          <p className="text-slate-400 text-[9px] font-bold tracking-widest mt-1.5 uppercase">HIGHRICH COMMUNITY REVIVAL SOCIETY</p>
        </div>

        {/* Sleek Form Container */}
        <Card className="border border-white/50 bg-white/80 backdrop-blur-xl shadow-premium overflow-hidden rounded-[28px]">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 pt-7 px-8">
            <CardTitle className="text-lg font-black text-brand-blue flex items-center gap-3.5 uppercase tracking-tight">
              {step === 'details' ? (
                <>
                  <User className="w-5 h-5 text-brand-blue" />
                  Fast Registration (ഉടൻ അംഗമാകുക)
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5 text-brand-blue" />
                  Membership Fee Payment (അംഗത്വ ഫീസ് അടയ്ക്കുക)
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">
              {step === 'details' ? 'Secure Registration Node' : 'Treasury Portal Step 2'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {step === 'details' ? (
              <Form {...form}>
                <form onSubmit={handleNextStep} className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {/* Name Input */}
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

                    {/* Phone Input */}
                    <FormField control={form.control} name="mobile" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Mobile Number (ഫോൺ നമ്പർ)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              maxLength={10}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, '');
                                field.onChange(cleaned);
                              }}
                              placeholder="10-digit number" 
                              className={`pl-11 h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* State Select */}
                    <FormField control={form.control} name="state" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5Packed">
                        <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">State (സംസ്ഥാനം)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className={`h-12 bg-white/60 border border-slate-200/80 focus:border-brand-blue transition-all rounded-xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
                              <div className="flex items-center gap-2">
                                <Landmark className={`w-4 h-4 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                                <SelectValue placeholder="Select State" />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* District */}
                      <FormField control={form.control} name="district" render={({ field, fieldState }) => (
                        <FormItem className="col-span-1 space-y-1.5Packed">
                          <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">District (ജില്ല)</FormLabel>
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

                      {/* Assembly Constituency */}
                      <FormField control={form.control} name="assemblyConstituency" render={({ field, fieldState }) => (
                        <FormItem className="col-span-1 space-y-1.5Packed">
                          <FormLabel className="text-slate-500 font-black uppercase text-[10px] tracking-wider ml-1">Assembly Constituency (മണ്ഡലം)</FormLabel>
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
                    </div>
                  </motion.div>

                  {/* Terms Info */}
                  <div className="border-t border-slate-100/60 pt-6 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-normal">
                      നിങ്ങൾ വിജയകരമായി രജിസ്റ്റർ ചെയ്താൽ, നിങ്ങളുടെ മൊബൈൽ നമ്പറും പാസ്‌വേഡ് '123456' ഉം ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യാം. തുടർന്ന് പ്രൊഫൈൽ എഡിറ്റ് ചെയ്ത് നിങ്ങളുടെ മറ്റ് വിവരങ്ങൾ പൂർത്തീകരിക്കാവുന്നതാണ്.
                    </p>
                  </div>

                  {/* Move to Step 2 Button */}
                  <Button 
                    type="submit" 
                    disabled={district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district]}
                    className="w-full h-12 rounded-xl text-xs font-black transition-all shadow-lg shadow-brand-blue/15 hover:shadow-brand-blue/20 uppercase tracking-widest bg-brand-blue hover:bg-brand-blue/95 text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {(district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district])
                      ? 'Quota Exhausted' 
                      : 'Proceed to Payment / പേയ്മെന്റിലേക്ക് പോവുക'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </Form>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-[28px] p-6">
                  <h4 className="font-black text-brand-blue text-base flex items-center gap-3 mb-3 uppercase tracking-tight">
                    <Receipt className="w-6 h-6" />
                    Membership Treasury (അംഗത്വ ട്രഷറി)
                  </h4>
                  <p className="text-sm text-foreground/75 font-bold leading-relaxed">
                    Pay <span className="text-brand-magenta font-black italic">₹200</span> via GPay/PhonePe to:
                  </p>
                  <div 
                    className="bg-white border border-border p-5 rounded-2xl mt-4 flex items-center justify-between group cursor-pointer shadow-sm active:scale-95 transition-transform" 
                    onClick={() => {
                      navigator.clipboard.writeText('9645934571');
                      toast.success('Number copied / നമ്പർ കോപ്പി ചെയ്തു!');
                    }}
                  >
                    <p className="text-3xl font-mono font-black text-brand-blue tracking-tighter">9645934571</p>
                    <span className="text-[10px] font-black text-brand-blue/40 uppercase tracking-widest bg-brand-blue/5 px-2.5 py-1 rounded-md">Copy (കോപ്പി)</span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-bold mt-2 uppercase">Please copy this number and pay via Google Pay or PhonePe.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">
                      UPI Transaction Ref No. (ട്രാന്സാക്ഷൻ ഐഡി)
                    </label>
                    <Input 
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter 12-digit UPI/UTR Number"
                      className="h-14 bg-white border border-slate-200 focus:border-brand-blue transition-all rounded-xl font-bold font-mono tracking-wider text-center"
                    />
                  </div>

                  <p className="text-[10.5px] font-bold text-slate-400 leading-normal border-t border-slate-100 pt-3">
                    * ശരിയായ ട്രാന്സാക്ഷൻ ഐഡി എന്റർ ചെയ്യുക. പേയ്‌മെന്റ് വെരിഫിക്കേഷന് ശേഷം അക്കൗണ്ട് അപ്പൂവ് ചെയ്യുന്നതാണ്.
                  </p>

                  <Button 
                    type="button" 
                    onClick={handleFinalSubmit}
                    disabled={!transactionId.trim()}
                    className="w-full h-14 rounded-xl font-black bg-brand-blue hover:bg-brand-blue/95 text-white shadow-xl shadow-brand-blue/15 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    Complete Registration / രജിസ്റ്റർ ചെയ്യുക
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setStep('details')}
                    className="w-full h-12 rounded-xl text-foreground/45 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back / വിവരങ്ങൾ തിരുത്തുക
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
