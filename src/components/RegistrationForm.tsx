import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  MapPin, 
  Landmark, 
  Building, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CreditCard, 
  CheckCircle2, 
  FileText,
  QrCode,
  Copy,
  AlertTriangle,
  Building2,
  Smartphone,
  Loader2
} from 'lucide-react';
import { DISTRICTS, STATES, CONSTITUENCIES, BLOOD_GROUPS } from '@/src/constants';
import Logo from '../Logo';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { processRazorpayPayment } from '../lib/razorpay';
import { subscribeToOrgSettings, OrgSettings, defaultSettings } from '../lib/cms';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required / പൂർണ്ണമായ പേര് നൽകുക'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number / 10 അക്ക മെബൈൽ നമ്പർ നൽകുക'),
  email: z.string().email('Enter valid email / സാധുവായ ഇമെയിൽ നൽകുക').or(z.literal('')),
  dob: z.string().min(1, 'Select Date of Birth / ജനന തീയതി തിരഞ്ഞെടുക്കുക'),
  gender: z.string().min(1, 'Select gender / ലിംഗം തിരഞ്ഞെടുക്കുക'),
  bloodGroup: z.string().min(1, 'Select blood group / രക്തഗ്രൂപ്പ് തിരഞ്ഞെടുക്കുക'),
  address: z.string().min(3, 'Address is required / മേൽവിലാസം നൽകുക'),
  postOffice: z.string().min(2, 'Post office is required / പോസ്റ്റ് ഓഫീസ് നൽകുക'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter 6-digit PIN code / 6 അക്ക പിൻകോഡ് നൽകുക'),
  state: z.string().min(1, 'Select state / സ്റ്റേറ്റ് തിരഞ്ഞെടുക്കുക'),
  district: z.string().min(1, 'Select district / ജില്ല തിരഞ്ഞെടുക്കുക'),
  assemblyConstituency: z.string().min(1, 'Assembly constituency is required / മണ്ഡലം തിരഞ്ഞെടുക്കുക'),
  sponsorName: z.string().optional().or(z.literal('')),
  sponsorMobile: z.string().refine(val => !val || /^\d{10}$/.test(val), {
    message: 'Enter valid 10-digit Leader / Sponsor Mobile / 10 അക്ക ലീഡറുടെ മൊബൈൽ നമ്പർ നൽകുക'
  }).optional().or(z.literal('')),
  pin: z.string().min(6, 'Enter at least 6 characters for login password / കുറഞ്ഞത് 6 അക്ക പാസ്‌വേഡ് നൽകുക'),
});

type FormValues = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  onSubmit: (values: any) => void;
  districtQuotas?: Record<string, number>;
  districtQuotasUsed?: Record<string, number>;
  initialMobile?: string;
  orgSettings?: OrgSettings;
}

export default function RegistrationForm({ 
  onSubmit, 
  districtQuotas = {}, 
  districtQuotasUsed = {}, 
  initialMobile,
  orgSettings: propOrgSettings
}: RegistrationFormProps) {
  const { t } = useI18n();
  const [step, setStep] = React.useState<'details' | 'payment'>('details');
  const [agreeAdhoc, setAgreeAdhoc] = React.useState(false);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = React.useState(false);
  const [isSubmittingQr, setIsSubmittingQr] = React.useState(false);
  
  // Settings & Payment State
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(propOrgSettings || defaultSettings);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'razorpay' | 'qrcode'>('qrcode');
  const [qrTransactionId, setQrTransactionId] = useState('');
  const [qrPaymentDate, setQrPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qrPaymentTime, setQrPaymentTime] = useState(() => new Date().toTimeString().split(' ')[0].substring(0, 5));

  // Sponsor Auto-Lookup state
  const [sponsorLookupStatus, setSponsorLookupStatus] = useState<{
    loading: boolean;
    verified: boolean;
    name: string;
    membershipId?: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  const razorpayEnabled = orgSettings?.razorpayEnabled ?? false;
  const qrCodePaymentEnabled = orgSettings?.qrCodePaymentEnabled ?? true;
  const regFee = orgSettings?.registrationFee || 200;

  // Auto set active payment method when settings change
  useEffect(() => {
    if (razorpayEnabled && !qrCodePaymentEnabled) {
      setActivePaymentMethod('razorpay');
    } else if (!razorpayEnabled && qrCodePaymentEnabled) {
      setActivePaymentMethod('qrcode');
    } else if (razorpayEnabled && qrCodePaymentEnabled) {
      setActivePaymentMethod('qrcode'); // Default to reliable QR while Razorpay pending
    }
  }, [razorpayEnabled, qrCodePaymentEnabled]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: initialMobile || '',
      email: '',
      dob: '',
      gender: '',
      bloodGroup: '',
      address: '',
      postOffice: '',
      pincode: '',
      state: 'Kerala',
      district: '',
      assemblyConstituency: '',
      sponsorName: '',
      sponsorMobile: '',
      pin: '123456',
    },
  });

  // Auto-detect district from URL query parameters (distinct district links)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawDist = params.get('district') || params.get('d') || params.get('dist');
    if (rawDist) {
      const cleanDist = rawDist.trim().toUpperCase();
      const rtoMap: Record<string, string> = {
        'KL-01': 'TVM', 'KL01': 'TVM', '01': 'TVM', '1': 'TVM',
        'KL-02': 'KLM', 'KL02': 'KLM', '02': 'KLM', '2': 'KLM',
        'KL-03': 'PTA', 'KL03': 'PTA', '03': 'PTA', '3': 'PTA',
        'KL-04': 'ALP', 'KL04': 'ALP', '04': 'ALP', '4': 'ALP',
        'KL-05': 'KTM', 'KL05': 'KTM', '05': 'KTM', '5': 'KTM',
        'KL-06': 'IDK', 'KL06': 'IDK', '06': 'IDK', '6': 'IDK',
        'KL-07': 'EKM', 'KL07': 'EKM', '07': 'EKM', '7': 'EKM',
        'KL-08': 'TCR', 'KL08': 'TCR', '08': 'TCR', '8': 'TCR',
        'KL-09': 'PKD', 'KL09': 'PKD', '09': 'PKD', '9': 'PKD',
        'KL-10': 'MLP', 'KL10': 'MLP', '10': 'MLP',
        'KL-11': 'KOZ', 'KL11': 'KOZ', '11': 'KOZ',
        'KL-12': 'WYD', 'KL12': 'WYD', '12': 'WYD',
        'KL-13': 'KNR', 'KL13': 'KNR', '13': 'KNR',
        'KL-14': 'KSD', 'KL14': 'KSD', '14': 'KSD',
      };

      let matchedCode: string | null = null;
      if (rtoMap[cleanDist]) {
        matchedCode = rtoMap[cleanDist];
      } else {
        const found = DISTRICTS.find(d => 
          d.code.toUpperCase() === cleanDist || 
          d.name.toUpperCase() === cleanDist ||
          d.name.toUpperCase().startsWith(cleanDist)
        );
        if (found) matchedCode = found.code;
      }

      if (matchedCode) {
        form.setValue('district', matchedCode, { shouldValidate: true });
      }
    }
  }, [form]);

  // Watch sponsorMobile for auto-verifying existing member leaders
  const watchedSponsorMobile = form.watch('sponsorMobile');
  useEffect(() => {
    const cleanSponsor = (watchedSponsorMobile || '').replace(/\D/g, '').slice(-10);
    if (cleanSponsor.length === 10) {
      let isMounted = true;
      setSponsorLookupStatus({ loading: true, verified: false, name: '' });
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('mobile', '==', cleanSponsor), limit(1));
      getDocs(q).then((snap) => {
        if (!isMounted) return;
        if (!snap.empty) {
          const sponsorDoc = snap.docs[0].data();
          const sName = sponsorDoc.name || '';
          const sId = sponsorDoc.membershipId || '';
          setSponsorLookupStatus({ loading: false, verified: true, name: sName, membershipId: sId });
          const currentSponsorName = form.getValues('sponsorName');
          if (!currentSponsorName || currentSponsorName.trim() === '') {
            form.setValue('sponsorName', sName, { shouldValidate: true });
          }
        } else {
          setSponsorLookupStatus({ loading: false, verified: false, name: '' });
        }
      }).catch((err) => {
        console.warn('Sponsor lookup check error:', err);
        if (isMounted) setSponsorLookupStatus(null);
      });
      return () => {
        isMounted = false;
      };
    } else {
      setSponsorLookupStatus(null);
    }
  }, [watchedSponsorMobile, form]);

  const district = form.watch('district');
  const availableConstituencies = CONSTITUENCIES[district] || [];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleRazorpayRegistration = async () => {
    setIsProcessingRazorpay(true);
    const formVals = form.getValues();
    try {
      const paymentDetails = await processRazorpayPayment({
        paymentType: 'registration',
        name: formVals.name,
        mobile: formVals.mobile,
        email: formVals.email || `${formVals.mobile}@hcrs.society`,
        amount: regFee
      });

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      const fullValues = {
        ...formVals,
        cleanMobile: formVals.mobile.replace(/\D/g, '').slice(-10),
        transactionId: paymentDetails.paymentId,
        paymentId: paymentDetails.paymentId,
        orderId: paymentDetails.orderId,
        paymentAmount: regFee,
        paymentMethod: 'Razorpay',
        paymentStatus: 'PAYMENT_VERIFIED',
        receiptNumber: paymentDetails.receiptNumber,
        paymentDate: todayStr,
        paymentTime: timeStr,
        paymentTimeISO: paymentDetails.paymentTime,
      };

      toast.success('Razorpay Payment Verified! Completing Registration...');
      onSubmit(fullValues);
    } catch (err: any) {
      console.error('Razorpay Registration Error:', err);
      toast.error(err.message || 'Payment failed or cancelled.');
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  const handleQrCodeRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTxId = qrTransactionId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanTxId || cleanTxId.length < 6) {
      toast.error('Please enter a valid 12-digit UPI UTR / Transaction ID (സാധുവായ ട്രാൻസാക്ഷൻ ഐഡി നൽകുക)');
      return;
    }

    setIsSubmittingQr(true);
    const formVals = form.getValues();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const fullValues = {
      ...formVals,
      cleanMobile: formVals.mobile.replace(/\D/g, '').slice(-10),
      transactionId: cleanTxId,
      paymentId: cleanTxId,
      orderId: '',
      paymentAmount: regFee,
      paymentMethod: 'QR Code',
      paymentStatus: 'Pending Verification',
      receiptNumber: `RCP-REG-${Date.now().toString().slice(-6)}`,
      paymentDate: qrPaymentDate || todayStr,
      paymentTime: qrPaymentTime || timeStr,
      paymentTimeISO: new Date().toISOString(),
    };

    toast.success('Registration Submitted! Verification in Progress / അപേക്ഷ വിജയകരമായി സമർപ്പിച്ചു');
    onSubmit(fullValues);
    setIsSubmittingQr(false);
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeAdhoc) {
      toast.error('Please accept the HCRS Membership declaration / രജിസ്റ്റർ ചെയ്യുന്നതിനായി അഡ്ഹോക്ക് മെമ്പർഷിപ്പ് നിബന്ധനകൾ അംഗീകരിക്കുക');
      return;
    }
    const isValid = await form.trigger();
    if (isValid) {
      const loadingToast = toast.loading('Auditing registration status...');
      try {
        const cleanMobile = form.getValues('mobile').replace(/\D/g, '').slice(-10);
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('mobile', '==', cleanMobile), 
          where('status', 'in', ['pending', 'active', 'offline', 'disabled']),
          limit(1)
        );
        const res = await getDocs(q);
        if (!res.empty) {
          toast.error("This mobile number is already registered. Please go back and log in. (ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് നേരത്തെ രജിസ്റ്റർ ചെയ്തതാണ്. ദയവായി ലോഗിൻ ചെയ്യുക.)");
          toast.dismiss(loadingToast);
          return;
        }
        toast.dismiss(loadingToast);
        setStep("payment");
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Failed to verify mobile number. Please try again.");
      }
    } else {
      toast.error("Please fill in all required fields / ദയവായി എല്ലാ ആവശ്യമായ വിവരങ്ങളും പൂരിപ്പിക്കുക");
    }
  };

  const currentValues = form.watch();

  return (
    <div className="min-h-screen pt-2 pb-12 sm:py-12 md:py-20 px-3 sm:px-6 font-sans relative overflow-x-hidden flex flex-col items-center justify-start sm:justify-center">
      {/* Dynamic graphic backdrops */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-magenta/8 blur-3xl pointer-events-none max-md:hidden" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/8 blur-3xl pointer-events-none max-md:hidden" />

      <div className="max-w-2xl w-full z-10 mx-auto px-0.5 sm:px-2">
        <div className="text-center mb-3 sm:mb-8">
          <div className="inline-block p-3 sm:p-5 bg-white shadow-premium rounded-[26px] sm:rounded-[36px] mb-2 sm:mb-4 border border-slate-100 transition-all hover:scale-105">
            <Logo className="w-28 h-28 xs:w-32 xs:h-32 sm:w-44 sm:h-44 md:w-48 md:h-48 mx-auto" size="lg" />
          </div>
          <h2 className="text-xl xs:text-2xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase leading-tight px-1 sm:px-0">
            {t('reg_title', 'Membership Registration')}
          </h2>
          <p className="text-[#c9a227] text-[10.5px] xs:text-xs sm:text-base font-black tracking-widest mt-1 sm:mt-2 uppercase px-1">
            HIGHRICH COMMUNITY REVIVAL SOCIETY
          </p>
        </div>

        {/* Sleek Form Container */}
        <Card className="border-2 border-slate-200 bg-white shadow-2xl overflow-hidden rounded-[26px] sm:rounded-[36px] w-full">
          <CardHeader className="bg-slate-100/90 border-b-2 border-slate-200 p-4 sm:p-7 md:p-8">
            <CardTitle className="text-lg sm:text-2xl font-black text-slate-950 flex items-center gap-2.5 uppercase tracking-tight">
              {step === 'details' ? (
                <>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand-blue/15 flex items-center justify-center text-brand-blue shadow-xs shrink-0">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span>{t('reg_full_title', 'Full Membership Registration')}</span>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand-blue/15 flex items-center justify-center text-brand-blue shadow-xs shrink-0">
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span>{t('reg_payment_title', 'Membership Payment')}</span>
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-700 font-extrabold uppercase tracking-wider text-xs sm:text-sm mt-1 sm:mt-2">
              {step === 'details' ? 'Official Membership Application • Step 1' : 'Secure Treasury Portal • Step 2'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-7 md:p-9">
            {step === 'details' ? (
              <Form {...form}>
                <form onSubmit={handleNextStep} className="space-y-6 sm:space-y-7">
                  
                  {/* SECTION 1: PERSONAL INFORMATION */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-900">
                      <User className="w-4 h-4 text-brand-blue" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                        1. Personal Details (വ്യക്തിഗത വിവരങ്ങൾ)
                      </h3>
                    </div>

                    {/* Name Input */}
                    <FormField control={form.control} name="name" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                          {t('reg_fullname_label', "Full Name (പൂർണ്ണമായ പേര്)")} *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-500"}`} />
                            <Input 
                              {...field} 
                              placeholder={t('reg_fullname_placeholder', "Enter your full legal name")} 
                              className={`pl-12 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:bg-white transition-all rounded-xl font-bold text-sm sm:text-base text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs font-bold text-red-600" />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phone Input */}
                      <FormField control={form.control} name="mobile" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                            {t('reg_mobile_label', "Mobile Number (ഫോൺ നമ്പർ)")} *
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-500"}`} />
                              <Input 
                                {...field} 
                                maxLength={10}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/\D/g, '');
                                  field.onChange(cleaned);
                                }}
                                placeholder="10-digit mobile" 
                                className={`pl-12 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:bg-white transition-all rounded-xl font-bold text-sm sm:text-base text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                              />
                            </div>
                          </FormControl>
                          <p className="text-[11px] font-semibold text-slate-500">
                            പുതിയ മെമ്പറുടെ സ്വന്തം 10 അക്ക മൊബൈൽ നമ്പർ (ഈ നമ്പറിലാണ് അക്കൗണ്ട് രജിസ്റ്റർ ചെയ്യുന്നത്).
                          </p>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Email Input */}
                      <FormField control={form.control} name="email" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                            Email Address (ഇമെയിൽ വിലാസം)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${field.value ? "text-brand-blue" : "text-slate-500"}`} />
                              <Input 
                                {...field} 
                                type="email"
                                placeholder="example@mail.com" 
                                className={`pl-12 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:bg-white transition-all rounded-xl font-bold text-sm sm:text-base text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Date of Birth */}
                      <FormField control={form.control} name="dob" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wide block">
                            DOB (ജനന തീയതി) *
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                              <Input 
                                {...field} 
                                type="date"
                                className={`pl-10 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue transition-all rounded-xl font-bold text-xs sm:text-sm text-slate-950 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Gender */}
                      <FormField control={form.control} name="gender" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wide block">
                            Gender (ലിംഗം) *
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className={`h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-xs sm:text-sm text-slate-950 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Select Gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male (പുരുഷൻ)</SelectItem>
                              <SelectItem value="Female">Female (സ്ത്രീ)</SelectItem>
                              <SelectItem value="Other">Other (മറ്റുള്ളവ)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Blood Group */}
                      <FormField control={form.control} name="bloodGroup" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wide block">
                            Blood (രക്തഗ്രൂപ്പ്) *
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className={`h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-xs sm:text-sm text-slate-950 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`}>
                                <div className="flex items-center gap-1.5">
                                  <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <SelectValue placeholder="Select Blood" />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BLOOD_GROUPS.map(bg => (
                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* SECTION 2: ADDRESS & LOCATION */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-900">
                      <MapPin className="w-4 h-4 text-brand-blue" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                        2. Residential Address & Constituency (മേൽവിലാസവും മണ്ഡലവും)
                      </h3>
                    </div>

                    {/* Address Textarea */}
                    <FormField control={form.control} name="address" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                          House Name / Residential Address (മേൽവിലാസം) *
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={2}
                            placeholder="Enter house name, street, locality" 
                            className={`bg-white border-2 border-slate-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:bg-white transition-all rounded-xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-bold text-red-600" />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Post Office */}
                      <FormField control={form.control} name="postOffice" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                            Post Office (പോസ്റ്റ് ഓഫീസ്) *
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input 
                                {...field} 
                                placeholder="Post Office Name" 
                                className={`pl-11 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* PIN Code */}
                      <FormField control={form.control} name="pincode" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                            PIN Code (പിൻകോഡ് - 6 Digits) *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              maxLength={6}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, '');
                                field.onChange(cleaned);
                              }}
                              placeholder="6-digit PIN" 
                              className={`h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* State */}
                      <FormField control={form.control} name="state" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wide block">
                            State (സംസ്ഥാനം) *
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className={`h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-xs sm:text-sm text-slate-950 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`}>
                                <div className="flex items-center gap-1.5">
                                  <Landmark className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <SelectValue placeholder="State" />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STATES.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* District */}
                      <FormField control={form.control} name="district" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wide block">
                            District (ജില്ല) *
                          </FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('assemblyConstituency', CONSTITUENCIES[val]?.[0] || '');
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-xs sm:text-sm text-slate-950 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="District" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Assembly Constituency */}
                      <FormField control={form.control} name="assemblyConstituency" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs tracking-wide block">
                            Constituency (മണ്ഡലം) *
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            disabled={!district}
                          >
                            <FormControl>
                              <SelectTrigger className={`h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-xs sm:text-sm text-slate-950 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder={district ? "Constituency" : "Select District"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {availableConstituencies.map(ac => <SelectItem key={ac} value={ac}>{ac}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* SECTION 3: LEADER / SPONSOR DETAILS */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col gap-1 pb-2 border-b border-slate-200 text-slate-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-blue" />
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                          3. Leader / Sponsor Details <span className="text-[11px] font-bold text-slate-500 normal-case">(Optional)</span>
                        </h3>
                      </div>
                      <p className="text-[11px] font-bold text-slate-600">
                        * Leader / Sponsor name and mobile number can be provided for records (Optional).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Leader / Sponsor Name */}
                      <FormField control={form.control} name="sponsorName" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                            Leader / Sponsor Name <span className="text-[11px] font-bold text-slate-500 normal-case">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                              <Input 
                                {...field} 
                                placeholder="Enter Leader / Sponsor Name (Optional)" 
                                className={`pl-12 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500 ring-2 ring-red-200' : ''}`} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />

                      {/* Leader / Sponsor Mobile */}
                      <FormField control={form.control} name="sponsorMobile" render={({ field, fieldState }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                            Leader / Sponsor Mobile <span className="text-[11px] font-bold text-slate-500 normal-case">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                              <Input 
                                {...field} 
                                type="tel"
                                maxLength={10}
                                placeholder="10-digit mobile number (Optional)" 
                                onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))}
                                className={`pl-12 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                              />
                              {sponsorLookupStatus?.loading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-blue" />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-bold text-red-600" />
                        </FormItem>
                      )} />
                    </div>

                    {/* Sponsor Verification Feedback Banner */}
                    {sponsorLookupStatus?.verified && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-bold text-emerald-950">
                            അംഗീകൃത HCRS മെമ്പർ / ലീഡർ: <span className="font-black text-emerald-800 underline">{sponsorLookupStatus.name}</span> {sponsorLookupStatus.membershipId ? `(ID: ${sponsorLookupStatus.membershipId})` : ''}
                          </p>
                          <p className="text-emerald-700 text-[11px] mt-0.5">
                            ✓ നിലവിലുള്ള മെമ്പറുടെ നമ്പർ സ്പോൺസറായി വിജയകരമായി സ്വീകരിച്ചു. പുതിയ മെമ്പർഷിപ്പ് നിങ്ങളുടെ സ്വന്തം നമ്പറിലായിരിക്കും രജിസ്റ്റർ ചെയ്യുക.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: ACCOUNT SECURITY & PIN */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-900">
                      <Lock className="w-4 h-4 text-brand-blue" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                        4. Portal Login Password (ലോഗിൻ പാസ്‌വേഡ്)
                      </h3>
                    </div>

                    <FormField control={form.control} name="pin" render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-slate-900 font-black uppercase text-xs sm:text-sm tracking-wide block">
                          Create Account Password / PIN (കുറഞ്ഞത് 6 അക്ഷരങ്ങൾ/അക്കങ്ങൾ) *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <Input 
                              {...field} 
                              type="password"
                              placeholder="Enter login password" 
                              className={`pl-12 h-[48px] sm:h-12 bg-white border-2 border-slate-300 focus:border-brand-blue rounded-xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs ${fieldState.error ? 'border-red-500' : ''}`} 
                            />
                          </div>
                        </FormControl>
                        <p className="text-[11px] text-slate-600 font-semibold mt-1">
                          ഈ പാസ്‌വേഡും നിങ്ങളുടെ മൊബൈൽ നമ്പറും ഉപയോഗിച്ച് ഭാവിയിൽ വെബ്സൈറ്റിൽ നേരിട്ട് ലോഗിൻ ചെയ്യാൻ സാധിക്കും.
                        </p>
                        <FormMessage className="text-xs font-bold text-red-600" />
                      </FormItem>
                    )} />
                  </div>

                  {/* HCRS DECLARATION / CONSENT CHECKBOX */}
                  <div 
                    onClick={() => setAgreeAdhoc(!agreeAdhoc)}
                    className={`p-4.5 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                        agreeAdhoc 
                          ? 'border-brand-magenta bg-brand-magenta/5 shadow-sm' 
                          : 'border-slate-300 hover:border-slate-400 bg-slate-50 shadow-xs'
                    }`}
                  >
                    <Checkbox 
                      checked={agreeAdhoc} 
                      onCheckedChange={(val) => setAgreeAdhoc(!!val)} 
                      className={`w-5.5 h-5.5 mt-0.5 pointer-events-none shrink-0 ${
                        agreeAdhoc 
                          ? 'border-brand-magenta bg-brand-magenta text-white' 
                          : 'border-slate-400 bg-white'
                      }`} 
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-xs sm:text-sm font-black leading-relaxed ${agreeAdhoc ? 'text-slate-950' : 'text-slate-900'}`}>
                        ഞാൻ HCRS (ഹൈറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി) ഭരണഘടനാ തത്വങ്ങളും അഡ്ഹോക്ക് മെമ്പർഷിപ്പ് നിബന്ധനകളും വായിച്ചു മനസ്സിലാക്കി പൂർണ്ണമായും അംഗീകരിക്കുന്നു. *
                      </p>
                      <p className="text-[11px] text-slate-600 font-bold">
                        (I agree to abide by the Society Rules, Regulations and Terms & Conditions of HCRS Adhoc Membership)
                      </p>
                    </div>
                  </div>

                  {/* Move to Step 2 Button */}
                  <Button 
                    type="submit" 
                    disabled={!agreeAdhoc || (district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district])}
                    className="w-full h-[52px] sm:h-14 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/35 uppercase tracking-widest bg-brand-blue hover:bg-[#083D91] text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:translate-y-[-1px] active:translate-y-0 px-4 cursor-pointer"
                  >
                    {(district && districtQuotas[district] !== undefined && districtQuotas[district] > 0 && (districtQuotasUsed[district] || 0) >= districtQuotas[district])
                      ? t('reg_quota_exhausted', 'Quota Exhausted / ക്വാട്ട കഴിഞ്ഞു') 
                      : t('reg_proceed_to_payment', 'Proceed to Payment / പേയ്മെന്റിലേക്ക് പോവുക (₹200)')}
                    <ArrowRight className="w-5 h-5 text-white shrink-0" />
                  </Button>
                </form>
              </Form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                {/* Applicant Summary Card */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-black text-slate-900 uppercase">അപേക്ഷകന്റെ വിവരങ്ങൾ (Applicant Review)</span>
                    <span className="text-xs font-extrabold text-brand-blue bg-blue-100 px-2.5 py-0.5 rounded-md">Step 2 of 2</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block">പേര് (Name):</span>
                      <span className="text-slate-950 font-black text-sm">{currentValues.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">മൊബൈൽ (Mobile):</span>
                      <span className="text-slate-950 font-black text-sm">{currentValues.mobile}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">ജില്ല / മണ്ഡലം:</span>
                      <span className="text-slate-900 font-bold">{currentValues.district} / {currentValues.assemblyConstituency}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">രക്തഗ്രൂപ്പ് (Blood Group):</span>
                      <span className="text-rose-700 font-black">{currentValues.bloodGroup}</span>
                    </div>
                  </div>
                </div>

                {/* PAYMENT METHOD SELECTION (When both are enabled) */}
                {razorpayEnabled && qrCodePaymentEnabled && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActivePaymentMethod('qrcode')}
                      className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activePaymentMethod === 'qrcode'
                          ? 'bg-brand-magenta text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      QR Code / UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePaymentMethod('razorpay')}
                      className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activePaymentMethod === 'razorpay'
                          ? 'bg-brand-blue text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Razorpay Online
                    </button>
                  </div>
                )}

                {/* 1. RAZORPAY PAYMENT VIEW */}
                {((razorpayEnabled && !qrCodePaymentEnabled) || (razorpayEnabled && qrCodePaymentEnabled && activePaymentMethod === 'razorpay')) && (
                  <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-[28px] p-5 sm:p-7 border-2 border-brand-blue shadow-2xl relative overflow-hidden space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-brand-blue/30 flex items-center justify-center text-white border border-brand-blue/50 shrink-0 shadow-inner">
                          <CreditCard className="w-6 h-6 text-brand-magenta" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-base sm:text-lg uppercase tracking-wide">
                            Razorpay Instant Payment
                          </h4>
                          <p className="text-xs text-blue-200 font-extrabold uppercase tracking-wider">
                            UPI • GPay • PhonePe • Cards • NetBanking
                          </p>
                        </div>
                      </div>
                      <div className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider w-fit shrink-0">
                        Amount: ₹{regFee} (Fixed)
                      </div>
                    </div>

                    <p className="text-xs text-slate-100 font-bold leading-relaxed bg-black/40 p-3.5 rounded-2xl border border-white/15">
                      പുതിയ അംഗത്വ രജിസ്ട്രേഷൻ ഫീസ് <span className="text-emerald-400 font-extrabold">₹{regFee}</span> ആയി സിസ്റ്റം നേരിട്ട് ക്രമീകരിച്ചിരിക്കുന്നു. താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്ത് Razorpay വഴി നേരിട്ട് തുക അടയ്ക്കാം.
                    </p>

                    <Button
                      type="button"
                      onClick={handleRazorpayRegistration}
                      disabled={isProcessingRazorpay}
                      className="w-full h-14 rounded-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span>{isProcessingRazorpay ? 'Processing Payment...' : `Pay ₹${regFee} via Razorpay (₹${regFee} ഓൺലൈൻ അടയ്ക്കുക)`}</span>
                    </Button>
                  </div>
                )}

                {/* 2. QR CODE / UPI PAYMENT VIEW */}
                {((!razorpayEnabled && qrCodePaymentEnabled) || (razorpayEnabled && qrCodePaymentEnabled && activePaymentMethod === 'qrcode')) && (
                  <form onSubmit={handleQrCodeRegistration} className="bg-slate-900 text-white rounded-[28px] p-5 sm:p-7 border-2 border-brand-magenta shadow-2xl space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-brand-magenta/30 flex items-center justify-center text-white border border-brand-magenta/50 shrink-0 shadow-inner">
                          <QrCode className="w-6 h-6 text-brand-magenta" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-base sm:text-lg uppercase tracking-wide">
                            Official QR Code / UPI Payment
                          </h4>
                          <p className="text-xs text-pink-200 font-bold uppercase tracking-wider">
                            GPay • PhonePe • Paytm • BHIM • NetBanking
                          </p>
                        </div>
                      </div>
                      <div className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider w-fit shrink-0">
                        Fee: ₹{regFee} (Fixed)
                      </div>
                    </div>

                    {/* QR Code and Account Info Card */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800">
                      <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0">
                        <img
                          src={orgSettings.qrCodeImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(orgSettings.upiId || 'hcrs.kerala@okaxis')}%26pn=${encodeURIComponent(orgSettings.upiAccountName || 'HIGHRICH COMMUNITY REVIVAL SOCIETY')}%26cu=INR`}
                          alt="HCRS Official UPI QR Code"
                          className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Society UPI ID:</span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="font-mono font-black text-xs sm:text-sm text-emerald-400 select-all truncate">
                            {orgSettings.upiId || 'hcrs.kerala@okaxis'}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(orgSettings.upiId || 'hcrs.kerala@okaxis', 'UPI ID')}
                            className="text-[10px] font-black text-brand-blue hover:text-white bg-blue-500/20 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <p className="text-xs font-extrabold text-slate-200">
                          {orgSettings.upiAccountName || 'HIGHRICH COMMUNITY REVIVAL SOCIETY'}
                        </p>
                        {orgSettings.bankName && (
                          <div className="text-[10px] text-slate-400 font-medium space-y-0.5 pt-1 border-t border-slate-800/80">
                            <p><span className="text-slate-300 font-bold">Bank:</span> {orgSettings.bankName}</p>
                            {orgSettings.accountNumber && (
                              <p><span className="text-slate-300 font-bold">A/C:</span> {orgSettings.accountNumber} {orgSettings.ifscCode && `(IFSC: ${orgSettings.ifscCode})`}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step-by-step instruction notice */}
                    <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 text-xs text-slate-200 space-y-1">
                      <p className="font-black text-brand-magenta text-[11px] uppercase tracking-wider">
                        നിർദ്ദേശങ്ങൾ (Payment Steps):
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        {orgSettings.qrInstructions || 'മുകളിലുള്ള QR Code സ്കാൻ ചെയ്തോ UPI ID വഴിയോ ₹200 അടയ്ക്കുക. പേയ്‌മെന്റ് പൂർത്തിയായ ശേഷം ലഭിക്കുന്ന 12 അക്ക UPI UTR / Transaction ID താഴെ നൽകുക.'}
                      </p>
                    </div>

                    {/* UTR / Transaction ID Input Field */}
                    <div className="space-y-2 text-left bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center justify-between">
                        <span>12-Digit UPI UTR / Transaction ID *</span>
                        <span className="text-[10px] font-bold text-emerald-400">നിർബന്ധം (Mandatory)</span>
                      </label>
                      <Input
                        required
                        value={qrTransactionId}
                        onChange={(e) => setQrTransactionId(e.target.value.toUpperCase())}
                        placeholder="e.g. 412356789012 or UPI Ref No"
                        className="h-12 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-brand-magenta font-mono text-sm font-black text-white"
                      />
                      <p className="text-[10px] text-slate-400 font-semibold">
                        GPay / PhonePe / Paytm ഹിസ്റ്ററിയിൽ കാണുന്ന 12 അക്ക UPI റഫറൻസ് നമ്പർ (UTR) ഇവിടെ കൃത്യമായി രേഖപ്പെടുത്തുക.
                      </p>
                    </div>

                    {/* Date & Time fields */}
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Payment Date</label>
                        <Input
                          type="date"
                          value={qrPaymentDate}
                          onChange={(e) => setQrPaymentDate(e.target.value)}
                          className="h-10 text-xs font-bold bg-slate-950 border-slate-800 text-white rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Payment Time</label>
                        <Input
                          type="time"
                          value={qrPaymentTime}
                          onChange={(e) => setQrPaymentTime(e.target.value)}
                          className="h-10 text-xs font-bold bg-slate-950 border-slate-800 text-white rounded-xl"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmittingQr || !qrTransactionId.trim()}
                      className="w-full h-14 rounded-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{isSubmittingQr ? 'Submitting...' : 'Submit Registration (അപേക്ഷ സമർപ്പിക്കുക)'}</span>
                    </Button>
                  </form>
                )}

                {/* 3. BOTH DISABLED VIEW */}
                {!razorpayEnabled && !qrCodePaymentEnabled && (
                  <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-3xl text-center space-y-3">
                    <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
                    <h4 className="text-base font-black text-amber-900 uppercase">Online Payments Temporarily Paused</h4>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-md mx-auto">
                      ഓൺലൈൻ പേയ്‌മെന്റ് സംവിധാനം താൽക്കാലികമായി അപ്ഡേറ്റ് ചെയ്തുകൊണ്ടിരിക്കുകയാണ്. അഡ്ഹോക്ക് മെമ്പർഷിപ്പിനായി ദയവായി നിങ്ങളുടെ ജില്ലാ കൺവീനറുമായോ കേന്ദ്ര ഓഫീസുമായോ നേരിട്ട് ബന്ധപ്പെടുക.
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep('details')}
                    className="w-full h-12 rounded-2xl text-slate-800 hover:text-slate-950 font-black uppercase tracking-widest text-xs border-2 border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-800" /> {t('reg_go_back_btn', 'Go Back / വിവരങ്ങൾ തിരുത്തുക')}
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
