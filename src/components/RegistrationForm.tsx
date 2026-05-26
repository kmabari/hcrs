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
    <div className="min-h-screen py-20 px-4 font-sans relative overflow-hidden flex items-center justify-center">
      {/* Dynamic graphic backdrops */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-magenta/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/8 blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full z-10">
        <div className="text-center mb-10">
          <div className="inline-block p-3 bg-white shadow-premium rounded-[26px] mb-4 border border-slate-100 transition-all hover:scale-105">
            <Logo className="scale-105 mx-auto" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Membership Registration</h2>
          <p className="text-brand-magenta text-[10px] font-black tracking-widest mt-2 uppercase">HIGHRICH COMMUNITY REVIVAL SOCIETY</p>
        </div>

        {/* Sleek Form Container */}
        <Card className="border-2 border-slate-150 bg-white shadow-premium overflow-hidden rounded-[36px]">
          <CardHeader className="bg-slate-50/85 border-b border-slate-150 pb-6 pt-8 px-8 md:px-10">
            <CardTitle className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
              {step === 'details' ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                  Fast Registration
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
                    <Receipt className="w-5 h-5" />
                  </div>
                  Membership Payment
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400 font-black uppercase tracking-widest text-[9px] mt-2">
              {step === 'details' ? 'Secure Registration Node • Step 1' : 'Treasury Portal • Step 2'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 md:p-10">
            {step === 'details' ? (
              <Form {...form}>
                <form onSubmit={handleNextStep} className="space-y-7">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {/* Name Input */}
                    <FormField control={form.control} name="name" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider ml-1">Full Name (പൂർണ്ണമായ പേര്)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              placeholder="Enter your full legal name" 
                              className={`pl-12 h-13 bg-white border-2 border-slate-200 focus:border-brand-blue/80 focus:ring-0 focus:bg-white transition-all rounded-2xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500 focus:border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Phone Input */}
                    <FormField control={form.control} name="mobile" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider ml-1">Mobile Number (ഫോൺ നമ്പർ)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
                            <Input 
                              {...field} 
                              maxLength={10}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, '');
                                field.onChange(cleaned);
                              }}
                              placeholder="10-digit number" 
                              className={`pl-12 h-13 bg-white border-2 border-slate-200 focus:border-brand-blue/80 focus:ring-0 focus:bg-white transition-all rounded-2xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* State Select */}
                    <FormField control={form.control} name="state" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider ml-1">State (സംസ്ഥാനം)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className={`h-13 bg-white border-2 border-slate-200 focus:border-brand-blue/80 transition-all rounded-2xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
                              <div className="flex items-center gap-2">
                                <Landmark className={`w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-300"}`} />
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
                        <FormItem className="col-span-1 space-y-1.5">
                          <FormLabel className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider ml-1">District (ജില്ല)</FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('assemblyConstituency', CONSTITUENCIES[val]?.[0] || '');
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-13 bg-white border-2 border-slate-200 focus:border-brand-blue/80 transition-all rounded-2xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
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
                        <FormItem className="col-span-1 space-y-1.5">
                          <FormLabel className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider ml-1">Assembly Constituency (മണ്ഡലം)</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            disabled={!district}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-13 bg-white border-2 border-slate-200 focus:border-brand-blue/80 transition-all rounded-2xl font-bold text-sm text-slate-800 ${fieldState.error ? 'border-red-500' : ''}`}>
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
                  <div className="border-t border-slate-100 pt-6 flex items-start gap-3.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10.5px] text-slate-500 font-bold uppercase leading-relaxed">
                      നിങ്ങൾ വിജയകരമായി രജിസ്റ്റർ ചെയ്താൽ, നിങ്ങളുടെ മൊബൈൽ നമ്പറും പാസ്‌വേഡ് '123456' ഉം ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യാം. തുടർന്ന് പ്രൊഫൈൽ എഡിറ്റ് ചെയ്ത് നിങ്ങളുടെ മറ്റ് വിവരങ്ങൾ പൂർത്തീകരിക്കാവുന്നതാണ്.
                    </p>
                  </div>

                  {/* Move to Step 2 Button */}
                  <Button 
                    type="submit" 
                    disabled={district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district]}
                    className="w-full h-13 rounded-2xl text-xs font-black transition-all shadow-lg shadow-brand-blue/15 hover:shadow-brand-blue/25 uppercase tracking-widest bg-gradient-to-r from-brand-blue to-indigo-600 text-white disabled:opacity-50 flex items-center justify-center gap-1.5 hover:translate-y-[-1px] active:translate-y-0"
                  >
                    {(district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district])
                      ? 'Quota Exhausted / ക്വാട്ട കഴിഞ്ഞു' 
                      : 'Proceed to Payment / പേയ്മെന്റിലേക്ക് പോവുക'}
                    <ArrowRight className="w-4 h-4 text-white" />
                  </Button>
                </form>
              </Form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-7">
                <div className="bg-[#081426] text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-magenta/10 blur-2xl pointer-events-none" />
                  
                  <h4 className="font-extrabold text-[#0066FF] text-base flex items-center gap-3 mb-4 uppercase tracking-wider">
                    <Receipt className="w-5 h-5 text-[#FF1493]" />
                    HCRS Secure Treasury (അംഗത്വ ട്രഷറി)
                  </h4>
                  
                  <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                    Pay <span className="text-[#FF1493] font-black text-lg">₹200</span> for 1-Year National Active Membership. Scan the QR code or pay directly to the official registry receiver:
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-6 mt-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    {/* Public UPI Payment QR Generator */}
                    <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-100 shrink-0">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('upi://pay?pa=9645934571@ybl&pn=HCRS%20Kerala&am=200&cu=INR')}`}
                        alt="UPI Payment QR Code"
                        className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                      />
                    </div>

                    <div className="space-y-3.5 w-full text-center sm:text-left">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-[#FF1493] uppercase">Official UPI Number</span>
                        <div 
                          className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl mt-1 border border-slate-850 cursor-pointer hover:border-[#0066FF]/50 transition-all active:scale-98"
                          onClick={() => {
                            navigator.clipboard.writeText('9645934571');
                            toast.success('UPI details copied / നമ്പർ കോപ്പി ചെയ്തു!');
                          }}
                        >
                          <span className="font-mono font-black text-[#0066FF] text-lg sm:text-xl">9645934571</span>
                          <span className="text-[8px] font-black text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">Copy</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1.5">
                        <a 
                          href="upi://pay?pa=9645934571@ybl&pn=HCRS%20Kerala&am=200&cu=INR" 
                          className="text-[9px] font-black uppercase tracking-wider bg-[#0066FF] text-white px-3 py-1.5 rounded-lg hover:bg-opacity-90 active:scale-95 transition-all inline-flex items-center gap-1"
                        >
                          Pay with UPI
                        </a>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('9645934571@ybl');
                            toast.success('UPI VPA Copied / UPI വിലാസം കോപ്പി ചെയ്തു!');
                          }}
                          className="text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-750 active:scale-95 transition-all"
                        >
                          Copy VPA
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-wide leading-relaxed">
                    * Google Pay, PhonePe, and Paytm can pay directly to the mobile number <span className="text-white font-extrabold">9645934571</span>.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">
                      UPI / UTR Transaction ID (12-അക്ക ട്രാന്സാക്ഷൻ ഐഡി) <span className="text-[#FF1493]">*</span>
                    </label>
                    <Input 
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 3145XXXXXXXX"
                      maxLength={12}
                      className="h-14 bg-white border-2 border-slate-200 focus:border-[#0066FF]/80 focus:ring-0 transition-all rounded-2xl font-black font-mono tracking-wider text-center text-lg placeholder:text-slate-350"
                    />
                  </div>

                  <p className="text-[10.5px] font-bold text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                    * അടച്ച തുകയുടെ ശരിയായ 12-അക്ക യു.പി.ഐ റഫറൻസ് നമ്പറോ ട്രാൻസാക്ഷൻ ഐഡിയോ പൂരിപ്പിക്കുക. പരിശോധനയ്ക്ക് ശേഷം അഡ്മിൻ പ്രൊഫൈൽ ആക്റ്റീവ് ചെയ്യുന്നതാണ്.
                  </p>

                  <div className="flex flex-col gap-3">
                    <Button 
                      type="button" 
                      onClick={handleFinalSubmit}
                      disabled={transactionId.trim().length < 8}
                      className="w-full h-14 rounded-2xl font-black bg-gradient-to-r from-[#0066FF] to-indigo-600 text-white shadow-lg shadow-[#0066FF]/15 hover:shadow-brand-blue/25 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 hover:translate-y-[-1.5px] active:translate-y-0"
                    >
                      Complete Registration / രജിസ്റ്റർ ചെയ്യുക
                      <ArrowRight className="w-4 h-4 text-white" />
                    </Button>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setStep('details')}
                      className="w-full h-12 rounded-2xl text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /> Go Back / വിവരങ്ങൾ തിരുത്തുക
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
