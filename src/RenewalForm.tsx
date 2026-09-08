import React, { useState, useEffect } from 'react';
import { useI18n } from './lib/i18n';
import { motion } from 'motion/react';
import { Search, ArrowRight, ArrowLeft, ShieldCheck, Heart, CreditCard, QrCode, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, limit, addDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import Logo from './Logo';
import { processRazorpayPayment } from './lib/razorpay';
import { sendWARenewalMessage } from './lib/whatsapp';
import { getOrgSettings, subscribeToOrgSettings, OrgSettings, defaultSettings } from './lib/cms';

interface RenewalFormProps {
  onBack: () => void;
  onSuccess: (member: UserProfile) => void;
  initialMobile?: string;
}

export default function RenewalForm({ onBack, onSuccess, initialMobile }: RenewalFormProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<'search' | 'confirm' | 'payment'>('search');
  const [searchQuery, setSearchQuery] = useState(initialMobile || '');
  const [searching, setSearching] = useState(false);
  const [foundMember, setFoundMember] = useState<UserProfile | null>(null);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);
  const [isSubmittingQr, setIsSubmittingQr] = useState(false);

  // Settings & Payment State
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'razorpay' | 'qrcode'>('qrcode');
  const [qrTransactionId, setQrTransactionId] = useState('');
  const [qrPaymentDate, setQrPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qrPaymentTime, setQrPaymentTime] = useState(() => new Date().toTimeString().split(' ')[0].substring(0, 5));

  useEffect(() => {
    const unsubscribe = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  const razorpayEnabled = orgSettings?.razorpayEnabled ?? false;
  const qrCodePaymentEnabled = orgSettings?.qrCodePaymentEnabled ?? true;
  const renewalFee = orgSettings?.renewalFee || 100;

  useEffect(() => {
    if (razorpayEnabled && !qrCodePaymentEnabled) {
      setActivePaymentMethod('razorpay');
    } else if (!razorpayEnabled && qrCodePaymentEnabled) {
      setActivePaymentMethod('qrcode');
    } else if (razorpayEnabled && qrCodePaymentEnabled) {
      setActivePaymentMethod('qrcode');
    }
  }, [razorpayEnabled, qrCodePaymentEnabled]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleRazorpayRenewal = async () => {
    if (!foundMember) return;
    setIsProcessingRazorpay(true);
    const loadingToast = toast.loading('Initiating Razorpay Renewal Payment...');
    try {
      const paymentDetails = await processRazorpayPayment({
        paymentType: 'renewal',
        memberId: foundMember.uid,
        mobile: foundMember.mobile,
        name: foundMember.name,
        amount: renewalFee
      });

      toast.loading('Saving renewal payment record to database...', { id: loadingToast });

      const memberRef = doc(db, 'users', foundMember.uid);
      const now = new Date();
      
      // Calculate extended expiry date (current expiry + 1 year, or today + 1 year)
      let newExpiryDate = new Date();
      if (foundMember.expiryDate) {
        const expD = (foundMember.expiryDate as any).toDate ? (foundMember.expiryDate as any).toDate() : ((foundMember.expiryDate as any).seconds ? new Date((foundMember.expiryDate as any).seconds * 1000) : new Date(foundMember.expiryDate as any));
        if (!isNaN(expD.getTime()) && expD.getTime() > Date.now()) {
          newExpiryDate = new Date(expD);
          newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
        } else {
          newExpiryDate.setFullYear(now.getFullYear() + 1);
        }
      } else {
        newExpiryDate.setFullYear(now.getFullYear() + 1);
      }

      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      const renewalData = {
        status: 'active',
        isApproved: true,
        renewalPending: false,
        renewalTransactionId: paymentDetails.paymentId,
        renewalDate: serverTimestamp(),
        renewalPaymentDate: todayStr,
        renewalPaymentTime: timeStr,
        paymentAmount: renewalFee,
        paymentId: paymentDetails.paymentId,
        orderId: paymentDetails.orderId,
        transactionId: paymentDetails.paymentId,
        paymentTime: paymentDetails.paymentTime,
        paymentMethod: 'Razorpay',
        paymentStatus: 'Renewed',
        receiptNumber: paymentDetails.receiptNumber,
        expiryDate: newExpiryDate
      };

      await updateDoc(memberRef, renewalData);

      // Save receipt to users/{uid}/receipts subcollection
      try {
        const receiptsRef = collection(db, 'users', foundMember.uid, 'receipts');
        await addDoc(receiptsRef, {
          receiptNo: paymentDetails.receiptNumber,
          receiptType: 'Membership Renewal',
          receiptLabel: 'Membership Renewal Receipt',
          amount: renewalFee,
          paymentId: paymentDetails.paymentId,
          orderId: paymentDetails.orderId,
          transactionId: paymentDetails.paymentId,
          paymentTime: paymentDetails.paymentTime,
          paymentMethod: 'Razorpay',
          paymentStatus: 'Renewed',
          status: 'Paid',
          paymentDate: todayStr,
          createdAt: serverTimestamp(),
          memberId: foundMember.membershipId || foundMember.uid
        });
      } catch (rErr) {
        console.warn("Notice saving renewal receipt document:", rErr);
      }

      toast.success('Membership Renewed Successfully! (അംഗത്വം വിജയകരമായി പുതുക്കി)', { id: loadingToast });

      const updatedMember: UserProfile = {
        ...foundMember,
        ...renewalData,
        expiryDate: newExpiryDate
      } as UserProfile;

      // Auto-trigger WhatsApp message if enabled
      try {
        const settings = await getOrgSettings();
        if (settings.whatsappEnabled !== false && settings.whatsappRenewalEnabled !== false && settings.registrationMode !== 'bulk') {
          setTimeout(() => {
            sendWARenewalMessage({
              name: foundMember.name,
              mobile: foundMember.mobile,
              uid: foundMember.uid,
              membershipId: foundMember.membershipId,
              transactionId: paymentDetails.paymentId,
              amount: renewalFee,
              expiryDate: newExpiryDate.toLocaleDateString('en-IN')
            });
          }, 600);
        }
      } catch (waErr) {
        console.warn("WhatsApp renewal trigger error:", waErr);
      }

      onSuccess(updatedMember);
    } catch (err: any) {
      console.error('Razorpay Renewal Error:', err);
      toast.error(err.message || 'Renewal payment failed or cancelled.', { id: loadingToast });
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  const handleQrCodeRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundMember) return;

    const cleanTxId = qrTransactionId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanTxId || cleanTxId.length < 6) {
      toast.error('Please enter a valid 12-digit UPI UTR / Transaction ID (സാധുവായ ട്രാൻസാക്ഷൻ ഐഡി നൽകുക)');
      return;
    }

    setIsSubmittingQr(true);
    const loadingToast = toast.loading('Submitting Renewal Request for Verification...');
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      const receiptNo = `RCP-REN-${Date.now().toString().slice(-6)}`;

      const memberRef = doc(db, 'users', foundMember.uid);

      const renewalData = {
        renewalPending: true,
        renewalTransactionId: cleanTxId,
        renewalDate: serverTimestamp(),
        renewalPaymentDate: qrPaymentDate || todayStr,
        renewalPaymentTime: qrPaymentTime || timeStr,
        paymentAmount: renewalFee,
        paymentId: cleanTxId,
        transactionId: cleanTxId,
        paymentMethod: 'QR Code',
        paymentStatus: 'Pending Verification',
        receiptNumber: receiptNo
      };

      await updateDoc(memberRef, renewalData);

      // Save receipt to users/{uid}/receipts subcollection
      try {
        const receiptsRef = collection(db, 'users', foundMember.uid, 'receipts');
        await addDoc(receiptsRef, {
          receiptNo: receiptNo,
          receiptType: 'Membership Renewal',
          receiptLabel: 'Membership Renewal Receipt',
          amount: renewalFee,
          paymentId: cleanTxId,
          orderId: '',
          transactionId: cleanTxId,
          paymentTime: new Date().toISOString(),
          paymentMethod: 'QR Code',
          paymentStatus: 'Pending Verification',
          status: 'Pending Verification',
          paymentDate: qrPaymentDate || todayStr,
          createdAt: serverTimestamp(),
          memberId: foundMember.membershipId || foundMember.uid
        });
      } catch (rErr) {
        console.warn("Notice saving renewal receipt:", rErr);
      }

      toast.success('Renewal Request Submitted! Admin verification in progress. (പുതുക്കൽ അപേക്ഷ സമർപ്പിച്ചു)', { id: loadingToast });

      const updatedMember: UserProfile = {
        ...foundMember,
        ...renewalData
      } as UserProfile;

      onSuccess(updatedMember);
    } catch (err: any) {
      console.error('QR Renewal Error:', err);
      toast.error(err.message || 'Failed to submit renewal request.', { id: loadingToast });
    } finally {
      setIsSubmittingQr(false);
    }
  };

  // Check if member has active validity
  const getMemberValidityInfo = (member: UserProfile) => {
    const isLifeMember = String(member.membership_type || member.membershipType || '').toUpperCase().includes('LIFE');
    if (isLifeMember) {
      return { hasActiveValidity: true, message: 'താങ്കൾ ഒരു ലൈഫ് മെമ്പർ (Life Member) ആണ്. താങ്കൾക്ക് റിന്യൂ ചെയ്യേണ്ടതില്ല.' };
    }

    if (member.role === 'admin' || member.role === 'operator' || member.isAdmin) {
      return { hasActiveValidity: true, message: 'താങ്കൾ ഒരു അഡ്മിൻ/ഓപ്പറേറ്റർ ആണ്. പുതുക്കൽ ആവശ്യമില്ല.' };
    }
    
    if (member.renewalPending) {
      return { hasActiveValidity: false, message: null }; // Wait for admin approval
    }

    const exp = member.expiryDate || (() => {
      const reg = member.registrationDate;
      if (!reg) return null;
      const regD = reg.toDate ? reg.toDate() : (reg.seconds ? new Date(reg.seconds * 1000) : new Date(reg));
      if (isNaN(regD.getTime())) return null;
      const expD = new Date(regD);
      expD.setFullYear(expD.getFullYear() + 1);
      return expD;
    })();

    if (!exp) return { hasActiveValidity: false, message: null };

    const d = exp.toDate ? exp.toDate() : (exp.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
    if (isNaN(d.getTime())) return { hasActiveValidity: false, message: null };

    const isActive = d.getTime() > Date.now();
    if (isActive) {
      const dateString = d.toLocaleDateString('en-IN');
      return { 
        hasActiveValidity: true, 
        message: `താങ്കൾക്ക് ഈ വർഷം ${dateString} വരെ വാലിഡിറ്റി ഉണ്ട്. താങ്കൾക്ക് റിന്യൂ ചെയ്യാൻ സമയമായിട്ടില്ല.` 
      };
    }

    return { hasActiveValidity: false, message: null };
  };

  useEffect(() => {
    if (initialMobile) {
      const runAutoSearch = async () => {
        setSearching(true);
        try {
          const qMob = query(collection(db, 'users'), where('mobile', '==', initialMobile), limit(1));
          const snapMob = await getDocs(qMob);
          const docSnap = snapMob.docs[0];
          if (docSnap) {
            setFoundMember({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            setStep('confirm');
          }
        } catch (e) {
          console.error("Auto search from landing page failed", e);
        } finally {
          setSearching(false);
        }
      };
      runAutoSearch();
    }
  }, [initialMobile]);

  const handleSearch = async () => {
    if (!searchQuery) {
      toast.error('Please enter Membership ID or Mobile Number');
      return;
    }

    setSearching(true);
    try {
      // Search by membershipId OR mobile
      const qId = query(collection(db, 'users'), where('membershipId', '==', searchQuery.toUpperCase()), limit(1));
      const qMob = query(collection(db, 'users'), where('mobile', '==', searchQuery), limit(1));
      
      const [snapId, snapMob] = await Promise.all([getDocs(qId), getDocs(qMob)]);
      
      let docSnap = snapId.docs[0] || snapMob.docs[0];
      
      if (docSnap) {
        setFoundMember({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        setStep('confirm');
      } else {
        toast.error('No membership found. Please check details or contact admin.');
      }
    } catch (error) {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start pt-4 sm:pt-8 pb-16 px-4 bg-gradient-to-br from-slate-50 via-white to-slate-100 selection:bg-[#1a2b5c]/10 relative overflow-x-hidden overflow-y-auto">
      {/* Subtle Blue and Gold Accent Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#1a2b5c]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#c9a227]/4 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full z-10"
      >
        {/* Prominently Centered Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-block p-3.5 sm:p-4 bg-white shadow-premium rounded-[28px] mb-3 border border-slate-200/80 transition-all hover:scale-105 duration-300">
            <Logo className="scale-110 mx-auto" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
            {t('renewal_title', 'Membership Renewal')}
          </h2>
          <p className="text-xs font-black text-[#c9a227] mt-2 uppercase tracking-widest leading-none">
            HIGHRICH COMMUNITY REVIVAL SOCIETY
          </p>
        </div>

        {/* Card with Border and Brand Gradient Strip */}
        <div className="relative bg-white border-2 border-slate-200 p-6 sm:p-8 rounded-[36px] shadow-premium overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-[#1a2b5c] before:via-[#c9a227] before:to-[#233875] after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-1.5 after:bg-gradient-to-r after:from-[#233875] after:via-[#c9a227] after:to-[#1a2b5c]">
          {step === 'search' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-slate-900 font-black uppercase text-xs tracking-wider ml-1 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-[#1a2b5c]" />
                  <span>{t('renewal_search_label', 'Search ID or Mobile (ഐഡി അല്ലെങ്കിൽ ഫോൺ നമ്പർ)')}</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('renewal_search_placeholder', "e.g. KL/MLP/KTK/1001 or mobile number")}
                    className="pl-12 h-13 bg-white border-2 border-slate-300 focus:border-[#1a2b5c] focus:ring-2 focus:ring-[#1a2b5c]/20 transition-all rounded-2xl font-bold text-sm text-slate-950 placeholder:text-slate-400 shadow-xs"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="w-full h-13 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-[#1a2b5c]/20 group bg-gradient-to-r from-[#1a2b5c] to-[#233875] hover:from-[#0d1733] hover:to-[#1a2b5c] text-white flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest"
              >
                {searching ? t('search_loading', 'Looking up...') : t('find_profile_btn', 'Find Profile (വിവരങ്ങൾ കണ്ടെത്തുക)')}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button 
                variant="outline" 
                onClick={onBack}
                className="w-full h-11 rounded-2xl text-slate-700 hover:text-slate-950 font-black uppercase tracking-widest text-xs border-2 border-slate-300 bg-white hover:bg-slate-100 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 text-[#1a2b5c]" />
                {t('return_home_btn', 'Return Home')}
              </Button>
            </div>
          )}

          {step === 'confirm' && foundMember && (
            <div className="space-y-6">
              <div className="bg-slate-50 border-2 border-slate-200 p-5 sm:p-6 rounded-3xl text-center space-y-2 shadow-xs">
                <div className="w-14 h-14 bg-[#1a2b5c]/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-[#1a2b5c]/20">
                  <Heart className="w-7 h-7 text-[#1a2b5c]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight truncate">{foundMember.name}</h3>
                <p className="text-xs font-mono font-black text-[#1a2b5c] tracking-wider">{foundMember.membershipId}</p>
                <p className="text-xs font-bold text-slate-600">{foundMember.mobile}</p>
              </div>

              {(() => {
                const validity = getMemberValidityInfo(foundMember);
                if (validity.hasActiveValidity) {
                  return (
                    <div className="space-y-5">
                      <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-3xl text-center space-y-3 shadow-xs">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto border border-amber-300 text-amber-800">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <p className="text-xs sm:text-sm font-black text-amber-950 leading-relaxed">
                          {validity.message}
                        </p>
                      </div>
                      
                      <div className="space-y-3 pt-1">
                        <Button 
                          onClick={() => setStep('search')}
                          className="w-full h-13 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-[#1a2b5c] to-[#233875] text-white hover:from-[#0d1733] hover:to-[#1a2b5c] shadow-lg shadow-[#1a2b5c]/20 uppercase tracking-wider cursor-pointer"
                        >
                          {t('renewal_search_another', 'പകരം വേറെ ഐഡി തിരയുക (Search Another)')}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={onBack}
                          className="w-full h-11 rounded-2xl text-slate-700 hover:text-slate-950 font-black uppercase tracking-widest text-xs border-2 border-slate-300 bg-white hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          {t('return_home_btn', 'Return Home')}
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-200">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{t('renewal_fee_label', 'Renewal Fee')}</span>
                      <span className="text-2xl font-black text-[#1a2b5c]">₹{renewalFee}</span>
                    </div>
                    <Button 
                      onClick={() => setStep('payment')}
                      className="w-full h-13 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-[#1a2b5c]/20 bg-gradient-to-r from-[#1a2b5c] to-[#233875] hover:from-[#0d1733] hover:to-[#1a2b5c] text-white uppercase tracking-widest cursor-pointer"
                    >
                      {t('reg_proceed_to_payment', 'Proceed to Payment')} (₹{renewalFee})
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('search')}
                      className="w-full h-11 rounded-2xl text-slate-700 hover:text-slate-950 font-black uppercase tracking-widest text-xs border-2 border-slate-300 bg-white hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      {t('renewal_not_you', 'Not you? Search again')}
                    </Button>
                  </div>
                );
              })()}
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              {/* PAYMENT METHOD SELECTION (When both are enabled) */}
              {razorpayEnabled && qrCodePaymentEnabled && (
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod('qrcode')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                    className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
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

              {/* 1. RAZORPAY RENEWAL VIEW */}
              {((razorpayEnabled && !qrCodePaymentEnabled) || (razorpayEnabled && qrCodePaymentEnabled && activePaymentMethod === 'razorpay')) && (
                <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-[28px] p-6 border-2 border-brand-blue shadow-2xl relative overflow-hidden space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/30 flex items-center justify-center text-white border border-brand-blue/50 shrink-0 shadow-inner">
                        <CreditCard className="w-5 h-5 text-brand-magenta" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base uppercase tracking-wide">
                          Razorpay Renewal Payment
                        </h4>
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
                          UPI • GPay • PhonePe • Cards • NetBanking
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider w-fit shrink-0">
                      Fee: ₹{renewalFee} (Fixed)
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-bold leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10 text-left">
                    അംഗത്വം പുതുക്കൽ ഫീസ് <span className="text-emerald-400 font-extrabold">₹{renewalFee}</span> ആയി സിസ്റ്റം ഓട്ടോമാറ്റിക് ആയി ക്രമീകരിച്ചിരിക്കുന്നു. Razorpay വഴി തൽക്ഷണം പുതുക്കൽ പൂർത്തിയാക്കാം.
                  </p>

                  <Button
                    type="button"
                    onClick={handleRazorpayRenewal}
                    disabled={isProcessingRazorpay}
                    className="w-full h-14 rounded-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>{isProcessingRazorpay ? 'Processing Renewal...' : `Pay ₹${renewalFee} via Razorpay (₹${renewalFee} അടയ്ക്കുക)`}</span>
                  </Button>
                </div>
              )}

              {/* 2. QR CODE / UPI RENEWAL VIEW */}
              {((!razorpayEnabled && qrCodePaymentEnabled) || (razorpayEnabled && qrCodePaymentEnabled && activePaymentMethod === 'qrcode')) && (
                <form onSubmit={handleQrCodeRenewal} className="bg-slate-900 text-white rounded-[28px] p-5 sm:p-6 border-2 border-brand-magenta shadow-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-magenta/30 flex items-center justify-center text-white border border-brand-magenta/50 shrink-0 shadow-inner">
                        <QrCode className="w-5 h-5 text-brand-magenta" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base uppercase tracking-wide">
                          Official QR Code Renewal
                        </h4>
                        <p className="text-[10px] text-pink-200 font-bold uppercase tracking-wider">
                          GPay • PhonePe • Paytm • BHIM • UPI
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider w-fit shrink-0">
                      Fee: ₹{renewalFee}
                    </div>
                  </div>

                  {/* QR Image and UPI details */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="bg-white p-2.5 rounded-2xl shadow-lg shrink-0">
                      <img
                        src={orgSettings.qrCodeImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(orgSettings.upiId || 'hcrs.kerala@okaxis')}%26pn=${encodeURIComponent(orgSettings.upiAccountName || 'HIGHRICH COMMUNITY REVIVAL SOCIETY')}%26cu=INR`}
                        alt="HCRS Official UPI QR Code"
                        className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">UPI ID:</span>
                      <div className="flex items-center justify-center sm:justify-start gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="font-mono font-black text-xs text-emerald-400 select-all truncate">
                          {orgSettings.upiId || 'hcrs.kerala@okaxis'}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(orgSettings.upiId || 'hcrs.kerala@okaxis', 'UPI ID')}
                          className="text-[10px] font-black text-brand-blue hover:text-white bg-blue-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="text-[11px] font-bold text-slate-300">
                        {orgSettings.upiAccountName || 'HIGHRICH COMMUNITY REVIVAL SOCIETY'}
                      </p>
                      {orgSettings.bankName && (
                        <p className="text-[10px] text-slate-400">
                          {orgSettings.bankName} • {orgSettings.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* UTR input */}
                  <div className="space-y-1.5 text-left bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-200 flex items-center justify-between">
                      <span>12-Digit UPI UTR / Transaction ID *</span>
                      <span className="text-[10px] font-bold text-emerald-400">Mandatory</span>
                    </label>
                    <Input
                      required
                      value={qrTransactionId}
                      onChange={(e) => setQrTransactionId(e.target.value.toUpperCase())}
                      placeholder="e.g. 412356789012 or UPI Ref No"
                      className="h-11 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-magenta font-mono text-sm font-black text-white"
                    />
                  </div>

                  {/* Date and time */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Payment Date</label>
                      <Input
                        type="date"
                        value={qrPaymentDate}
                        onChange={(e) => setQrPaymentDate(e.target.value)}
                        className="h-9 text-xs font-bold bg-slate-950 border-slate-800 text-white rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Payment Time</label>
                      <Input
                        type="time"
                        value={qrPaymentTime}
                        onChange={(e) => setQrPaymentTime(e.target.value)}
                        className="h-9 text-xs font-bold bg-slate-950 border-slate-800 text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmittingQr || !qrTransactionId.trim()}
                    className="w-full h-13 rounded-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmittingQr ? 'Submitting...' : `Submit Renewal (പുതുക്കൽ സമർപ്പിക്കുക - ₹${renewalFee})`}</span>
                  </Button>
                </form>
              )}

              {/* 3. BOTH DISABLED VIEW */}
              {!razorpayEnabled && !qrCodePaymentEnabled && (
                <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-3xl text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-black text-amber-900 uppercase">Online Payments Temporarily Paused</h4>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-md mx-auto">
                    ഓൺലൈൻ പേയ്‌മെന്റ് സംവിധാനം താൽക്കാലികമായി അപ്ഡേറ്റ് ചെയ്തുകൊണ്ടിരിക്കുകയാണ്. പുതുക്കലിനായി ദയവായി നിങ്ങളുടെ ജില്ലാ കൺവീനറുമായോ അഡ്മിനുമായോ ബന്ധപ്പെടുക.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('confirm')}
                  className="w-full h-11 rounded-2xl text-slate-700 hover:text-slate-950 font-black uppercase tracking-widest text-xs border-2 border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#1a2b5c]" />
                  {t('reg_go_back_btn', 'Go Back / വിവരങ്ങൾ തിരുത്തുക')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
