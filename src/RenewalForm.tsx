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

export default function RenewalForm({ onBack, onSuccess, initialMobile }: RenewalFormProps) {
  const [step, setStep] = useState<'search' | 'confirm' | 'payment'>('search');
  const [searchQuery, setSearchQuery] = useState(initialMobile || '');
  const [searching, setSearching] = useState(false);
  const [foundMember, setFoundMember] = useState<UserProfile | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
              <div className="bg-[#081426] text-white rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-magenta/10 blur-xl pointer-events-none" />
                
                <h4 className="font-extrabold text-[#0066FF] text-base flex items-center gap-3 mb-3 uppercase tracking-wider">
                  <Receipt className="w-5 h-5 text-[#FF1493]" />
                  Renewal Treasury (പുതുക്കൽ ട്രഷറി)
                </h4>
                
                <p className="text-xs text-slate-300 font-semibold leading-relaxed text-center sm:text-left">
                  Scan the QR code below using any UPI app (GPay, PhonePe, Paytm) to pay <span className="text-[#FF1493] font-black text-lg">₹100</span> for 1-Year Membership Renewal:
                </p>

                <div className="flex flex-col items-center justify-center gap-4 mt-5 bg-slate-900/40 p-5 rounded-xl border border-slate-800">
                  <div className="bg-white p-2.5 rounded-xl shadow-lg shrink-0">
                    <img 
                      src="https://i.ibb.co/KczsHznx/IMG-20250606-WA0242.jpg"
                      alt="Renewal QR"
                      className="w-40 h-40 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800 text-center uppercase tracking-wider">
                    ഈ QR കോഡ് സ്കാൻ ചെയ്ത് ₹100 അടയ്ക്കുക
                  </p>
                </div>
              </div>

              <div className="space-y-5">
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
