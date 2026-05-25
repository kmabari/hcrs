import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, ArrowRight, ArrowLeft, ShieldCheck, Heart, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from './types';
import Logo from './Logo';

interface RenewalFormProps {
  onBack: () => void;
  onSuccess: (member: UserProfile) => void;
}

export default function RenewalForm({ onBack, onSuccess }: RenewalFormProps) {
  const [step, setStep] = useState<'search' | 'confirm' | 'payment'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundMember, setFoundMember] = useState<UserProfile | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) {
      toast.error('Please enter Membership ID or Mobile Number');
      return;
    }

    setSearching(true);
    try {
      // Search by membershipId OR mobile
      const qId = query(collection(db, 'users'), where('membershipId', '==', searchQuery.toUpperCase()));
      const qMob = query(collection(db, 'users'), where('mobile', '==', searchQuery));
      
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
                    placeholder="e.g. KL/MLP/KTK/1001 or 9645..."
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
              <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-[28px] p-6">
                <h4 className="font-black text-brand-blue text-base flex items-center gap-3 mb-3 uppercase tracking-tight">
                  <Receipt className="w-6 h-6" />
                  Renewal Treasury
                </h4>
                <p className="text-sm text-foreground/70 font-bold leading-relaxed">Pay <span className="text-brand-magenta font-black italic">₹100</span> via GPay/PhonePe to:</p>
                <div className="bg-white border border-border p-5 rounded-2xl mt-4 flex items-center justify-between group cursor-copy shadow-sm" onClick={() => {
                  navigator.clipboard.writeText('9645934571');
                  toast.success('Number copied');
                }}>
                  <p className="text-3xl font-mono font-black text-brand-blue tracking-tighter">9645934571</p>
                  <span className="text-[10px] font-black text-brand-blue/40 uppercase tracking-widest">Copy</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-foreground/70 font-black uppercase text-[10px] tracking-widest ml-1">Transaction Ref No.</label>
                  <Input 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter 12-digit UPI Transaction ID"
                    className="h-14 bg-white/5 border-border focus:border-brand-blue/50 transition-all rounded-[20px] font-bold"
                  />
                </div>
                <Button 
                  onClick={handleRenewalSubmit}
                  disabled={submitting}
                  className="w-full h-16 rounded-[24px] text-lg font-black shadow-xl shadow-brand-blue/10 bg-brand-blue text-white hover:bg-brand-blue/90"
                >
                  {submitting ? 'Submitting...' : 'Submit Renewal Request'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setStep('confirm')}
                  className="w-full h-12 rounded-[20px] text-foreground/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all"
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
