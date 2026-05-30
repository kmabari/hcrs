import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, ArrowRight, ArrowLeft, ShieldCheck, Heart, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, limit } from 'firebase/firestore';
import { UserProfile } from './types';
import Logo from './Logo';

interface RenewalFormProps {
  onBack: () => void;
  onSuccess: (member: UserProfile) => void;
  initialMobile?: string;
}

const QR_MIRRORS = [
  'https://images.weserv.nl/?url=https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg',
  'https://wsrv.nl/?url=https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg',
  'https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg'
];

export default function RenewalForm({ onBack, onSuccess, initialMobile }: RenewalFormProps) {
  const [step, setStep] = useState<'search' | 'confirm' | 'payment'>('search');
  const [searchQuery, setSearchQuery] = useState(initialMobile || '');
  const [searching, setSearching] = useState(false);
  const [foundMember, setFoundMember] = useState<UserProfile | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [paymentTime, setPaymentTime] = useState(() => {
    const today = new Date();
    return today.toTimeString().split(' ')[0].substring(0, 5);
  });
  const [submitting, setSubmitting] = useState(false);
  const [mirrorIndex, setMirrorIndex] = useState(0);
  const [qrSrc, setQrSrc] = useState(QR_MIRRORS[0]);

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

  const handleRenewalSubmit = async () => {
    if (!transactionId) {
      toast.error('Please enter payment transaction ID');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Processing renewal request...');
    
    try {
      if (!foundMember) return;
      
      const memberRef = doc(db, 'users', foundMember.uid);
      await updateDoc(memberRef, {
        status: 'pending', // Re-verify renewal
        isApproved: false,
        renewalPending: true,
        renewalTransactionId: transactionId,
        renewalDate: serverTimestamp(),
        renewalPaymentDate: paymentDate,
        renewalPaymentTime: paymentTime,
        // We don't change membershipId or other details
      });
      
      toast.success('Renewal request submitted! Admin will verify soon.', { id: loadingToast });
      onSuccess(foundMember);
    } catch (error) {
      toast.error('Renewal failed. Please try again.', { id: loadingToast });
      handleFirestoreError(error, OperationType.UPDATE, `users/${foundMember?.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <Logo className="mb-4 scale-125" />
          <h2 className="text-3xl font-black text-brand-blue uppercase tracking-tight mt-6">Membership Renewal</h2>
          <p className="text-foreground/50 text-[10px] font-black tracking-[0.2em] mt-1 uppercase">HIGHRICH COMMUNITY REVIVAL SOCIETY</p>
        </div>

        <Card className="border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden rounded-[32px]">
          {step === 'search' && (
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-foreground/70 font-black uppercase text-[10px] tracking-widest ml-1">Search ID or Mobile</label>
                <div className="relative">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-foreground/30" />
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. KL/MLP/KTK/1001 or **********"
                    className="pl-12 h-14 bg-white/5 border-border focus:border-brand-blue/50 transition-all rounded-[20px] font-bold text-lg"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="w-full h-16 rounded-[24px] text-lg font-black shadow-xl shadow-brand-blue/10 group bg-brand-blue text-white hover:bg-brand-blue/90"
              >
                {searching ? 'Looking up...' : 'Find Profile'}
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button 
                variant="ghost" 
                onClick={onBack}
                className="w-full h-12 rounded-[20px] text-foreground/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Return Home
              </Button>
            </CardContent>
          )}

          {step === 'confirm' && foundMember && (
            <CardContent className="p-8 space-y-8">
              <div className="bg-brand-blue/5 border border-brand-blue/20 p-6 rounded-[28px] text-center">
                <div className="w-16 h-16 bg-brand-magenta/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-magenta/20">
                  <Heart className="w-8 h-8 text-brand-magenta" />
                </div>
                <h3 className="text-2xl font-black text-brand-blue uppercase tracking-tight truncate">{foundMember.name}</h3>
                <p className="text-[10px] font-black text-foreground/40 tracking-[0.2em] mt-1">{foundMember.membershipId}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Renewal Fee</span>
                  <span className="text-xl font-black text-brand-blue">₹100</span>
                </div>
                <Button 
                  onClick={() => setStep('payment')}
                  className="w-full h-16 rounded-[24px] text-lg font-black shadow-xl shadow-brand-blue/10 bg-brand-blue text-white hover:bg-brand-blue/90"
                >
                  Proceed to Payment
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setStep('search')}
                  className="w-full h-12 rounded-[20px] text-foreground/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all"
                >
                  Not you? Search again
                </Button>
              </div>
            </CardContent>
          )}

          {step === 'payment' && (
            <CardContent className="p-8 space-y-8">
              <div className="bg-[#030e1d] text-white rounded-[32px] p-6 md:p-8 border-3 border-brand-blue shadow-2xl relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 right-0 w-36 h-36 bg-brand-blue/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-brand-magenta/15 blur-3xl pointer-events-none" />
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-blue via-brand-magenta to-indigo-600" />
                
                <h4 className="font-extrabold text-white text-base md:text-lg flex items-center justify-center sm:justify-start gap-3 mb-4 uppercase tracking-wider">
                  <span className="p-1.5 rounded-xl bg-brand-blue/20 text-[#0066FF] flex items-center justify-center animate-pulse">
                    <Receipt className="w-5 h-5 text-[#FF1493]" />
                  </span>
                  പേയ്മെന്റ് ക്യു ആർ കോഡ് (UPI Payment QR)
                </h4>
                
                <p className="text-xs text-slate-200 font-extrabold leading-relaxed text-center sm:text-left bg-brand-blue/5 p-3 rounded-2xl border border-brand-blue/20 mb-5">
                  Scan the QR code below using GPay, PhonePe, or Paytm to pay <span className="text-[#FF1493] font-black text-lg underline decoration-brand-magenta">₹100</span> for 1-Year Membership Renewal. (താഴെയുള്ള ക്യു ആർ കോഡ് സ്കാൻ ചെയ്ത് ₹100 അടയ്ക്കുക):
                </p>

                <div className="flex flex-col items-center justify-center gap-4 bg-slate-900/60 p-6 rounded-[24px] border-2 border-slate-800 shadow-inner">
                  {/* Public UPI Payment QR with Proxy support for Palakkad cellular ISP blocks */}
                  <div className="bg-white p-3 rounded-2xl shadow-xl shrink-0">
                    <img 
                      src={qrSrc}
                      onError={() => {
                        if (mirrorIndex < QR_MIRRORS.length - 1) {
                          const nextIndex = mirrorIndex + 1;
                          setMirrorIndex(nextIndex);
                          setQrSrc(QR_MIRRORS[nextIndex]);
                        }
                      }}
                      alt="UPI Payment QR Code"
                      className="w-44 h-44 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 w-full text-center mt-1">
                    <p className="text-[10px] font-black text-white bg-slate-950/80 px-4 py-2 rounded-lg border border-slate-800 tracking-wider flex items-center gap-1.5 justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ഈ QR കോഡ് സ്കാൻ ചെയ്ത് ₹100 അടയ്ക്കുക
                    </p>
                    
                    {/* Diagnostic & Mirror Selector */}
                    <div className="w-full mt-3 bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl text-left space-y-2.5">
                      <span className="text-[9px] font-extrabold text-[#FF1493] uppercase tracking-wider block">
                        ക്യു ആർ കോഡ് ലോഡിങ് തകരാർ പരിഹരിപ്പാൻ (QR Load Options)
                      </span>
                      <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                        പാലക്കാട് ഉൾപ്പെടെയുള്ള ചില മൊബൈൽ നെറ്റ്‌വർക്കുകളിൽ QR കാണാൻ കഴിഞ്ഞില്ലെങ്കിൽ താഴത്തെ ഓപ്ഷനുകൾ ഉപയോഗിക്കുക:
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMirrorIndex(0);
                            setQrSrc(QR_MIRRORS[0]);
                          }}
                          className={`h-7 rounded-md text-[8px] font-black uppercase transition-all ${qrSrc === QR_MIRRORS[0] ? 'bg-brand-blue text-white border-brand-blue' : 'bg-slate-900 border-slate-800 text-slate-300'}`}
                        >
                          ചാനൽ 1
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMirrorIndex(1);
                            setQrSrc(QR_MIRRORS[1]);
                          }}
                          className={`h-7 rounded-md text-[8px] font-black uppercase transition-all ${qrSrc === QR_MIRRORS[1] ? 'bg-brand-blue text-white border-brand-blue' : 'bg-slate-900 border-slate-800 text-slate-300'}`}
                        >
                          ചാനൽ 2
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMirrorIndex(2);
                            setQrSrc(QR_MIRRORS[2]);
                          }}
                          className={`h-7 rounded-md text-[8px] font-black uppercase transition-all ${qrSrc === QR_MIRRORS[2] ? 'bg-brand-blue text-white border-brand-blue' : 'bg-slate-900 border-slate-800 text-slate-300'}`}
                        >
                          ചാനൽ 3 (Direct)
                        </Button>
                      </div>
                      
                      <div className="pt-1.5 border-t border-slate-800/40">
                        <a 
                          href="https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="block w-full text-center bg-[#FF1493]/10 hover:bg-[#FF1493]/20 border border-[#FF1493]/25 text-[#FF1493] rounded-lg py-1.5 font-bold text-[9px] uppercase tracking-wider transition-all"
                        >
                          ലിങ്ക് വഴി കാണുക (Direct Link)
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {/* Payment Date & Time Input fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">
                      അടച്ച തീയതി (Payment Date) <span className="text-[#FF1493]">*</span>
                    </label>
                    <Input 
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-12 bg-white border-2 border-slate-200 focus:border-[#0066FF]/80 focus:ring-0 transition-all rounded-xl font-bold font-mono text-center text-sm"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">
                      അടച്ച സമയം (Payment Time) <span className="text-[#FF1493]">*</span>
                    </label>
                    <Input 
                      type="time"
                      value={paymentTime}
                      onChange={(e) => setPaymentTime(e.target.value)}
                      className="h-12 bg-white border-2 border-slate-200 focus:border-[#0066FF]/80 focus:ring-0 transition-all rounded-xl font-bold font-mono text-center text-sm"
                    />
                  </div>
                </div>

                {/* Quick Helper Button and indicator */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 leading-tight text-left">
                    തീയതിയും സമയവും ഇപ്പോഴത്തെ സമയത്തേക്ക് സെറ്റ് ചെയ്യുവാൻ:
                  </span>
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      setPaymentDate(today.toISOString().split('T')[0]);
                      setPaymentTime(today.toTimeString().split(' ')[0].substring(0, 5));
                      toast.success('തീയതിയും സമയവും ഇപ്പോഴത്തെ സമയത്തേക്ക് മാറ്റി!');
                    }}
                    className="border border-[#0066FF]/30 text-[#0066FF] hover:bg-[#0066FF]/5 text-[9px] font-black uppercase px-2.5 h-8 rounded-lg shrink-0 flex items-center gap-1.5 bg-white"
                  >
                    ഇപ്പോൾ (Use Current)
                  </Button>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">
                    ട്രാൻസാക്ഷൻ ഐഡി നമ്പർ അടിക്കുക (Enter Transaction ID) <span className="text-[#FF1493]">*</span>
                  </label>
                  <Input 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.replace(/\D/g, ''))}
                    placeholder="TXNXXXXXXXXXX"
                    maxLength={12}
                    className="h-14 bg-white border-2 border-slate-200 focus:border-[#0066FF]/80 focus:ring-0 transition-all rounded-2xl font-black font-mono tracking-wider text-center text-lg placeholder:text-slate-300"
                  />
                </div>

                <p className="text-[10px] font-bold text-slate-400 leading-relaxed text-left border-t border-slate-100 pt-3">
                  * ശരിയായ 12-അക്ക യു.പി.ഐ നമ്പർ ഇവിടെ നൽകി പുതുക്കൽ പൂർത്തിയാക്കുക. വെരിഫിക്കേഷന് ശേഷം അംഗത്വം ഉടനടി സജീവമാകും.
                </p>

                <div className="flex flex-col gap-2.5">
                  <Button 
                    onClick={handleRenewalSubmit}
                    disabled={submitting || transactionId.trim().length < 8}
                    className="w-full h-14 rounded-2xl font-black bg-gradient-to-r from-[#0066FF] to-indigo-600 text-white shadow-lg shadow-[#0066FF]/15 hover:shadow-brand-blue/25 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 hover:translate-y-[-1px] active:translate-y-0"
                  >
                    {submitting ? 'Submitting request...' : 'Complete Renewal / അപ്ഡേറ്റ് ചെയ്യുക'}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep('confirm')}
                    className="w-full h-12 rounded-2xl text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
