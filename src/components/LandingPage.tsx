import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { 
  ShieldCheck, 
  ChevronRight, 
  Check, 
  UserPlus, 
  RefreshCw, 
  ArrowLeft, 
  Info, 
  Target, 
  Eye, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  LayoutGrid, 
  AlertTriangle,
  Image as ImageIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { subscribeToOrgSettings, OrgSettings, defaultSettings, subscribeToGallery, GalleryItem } from '@/src/lib/cms';
import { STATIC_GALLERY_IMAGES } from '../constants';
import { cn } from '@/lib/utils';
import Logo from '../Logo';

interface LandingPageProps {
  onAccept: () => void;
  onRenew: () => void;
  onLoginClick: () => void;
  onGalleryClick: () => void;
  onRenewWithMobile?: (mobile: string) => void;
  onRegisterWithMobile?: (mobile: string) => void;
  onLoginDirect?: (mobile: string, pin: string) => Promise<boolean>;
}

export default function LandingPage({ onAccept, onRenew, onLoginClick, onGalleryClick, onRenewWithMobile, onRegisterWithMobile, onLoginDirect }: LandingPageProps) {
  const [stage, setStage] = useState<'landing' | 'guidelines' | 'claim_check'>('landing');
  const [agreed, setAgreed] = useState(false);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);

  // States for claim lookup system
  const [claimMobile, setClaimMobile] = useState('');
  const [claimPin, setClaimPin] = useState('');
  const [checkingClaim, setCheckingClaim] = useState(false);
  const [loggingInClaim, setLoggingInClaim] = useState(false);
  const [claimResult, setClaimResult] = useState<'found' | 'not_found' | 'registered' | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubSettings = subscribeToOrgSettings((data) => {
      setSettings(data);
    });
    const unsubGallery = subscribeToGallery((data) => {
      const cmsUrls = new Set(data.map(item => item.url));
      const filteredStatic = (STATIC_GALLERY_IMAGES as any[]).filter(item => !cmsUrls.has(item.url));
      setGallery([...filteredStatic, ...data] as GalleryItem[]);
    });
    return () => {
      unsubSettings();
      unsubGallery();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-blue/10 relative overflow-x-hidden">
      {/* Absolute background graphics */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-brand-blue/5 blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[-100px] w-[600px] h-[600px] rounded-full bg-brand-magenta/5 blur-3xl pointer-events-none" />

      {/* Navigation Bar */}
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-8 py-4",
          isScrolled ? "bg-white/70 backdrop-blur-md border-b border-slate-200/40 shadow-sm py-3" : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-2.5 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
              <Logo size="sm" className="h-[28px] w-auto" />
            </div>
            <div>
              <h1 className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-none">HCRS Portal</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kerala Division</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-7">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-blue transition-colors">Home</button>
            <button onClick={onGalleryClick} className="text-[10px] font-black uppercase tracking-widest text-brand-magenta hover:opacity-80 transition-opacity flex items-center gap-1.5">
              Archives
              <span className="w-1.5 h-1.5 rounded-full bg-brand-magenta animate-pulse" />
            </button>
            <button onClick={() => document.getElementById('contact-us')?.scrollIntoView({ behavior: 'smooth' })} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-blue transition-colors">Contact</button>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={onLoginClick}
              className="text-[10px] font-black uppercase tracking-widest text-brand-magenta hover:bg-brand-magenta/5 rounded-xl h-9 px-3.5"
            >
              Sign In
            </Button>
            <Button 
              className="bg-brand-blue text-white rounded-xl px-5 h-9 font-black uppercase text-[10px] tracking-widest shadow-sm hover:translate-y-[-1px] active:translate-y-0 transition-all border border-brand-blue"
              onClick={onRenew}
            >
              Get ID Card
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Showcase / Hero Cover */}
      <div className="w-full flex flex-col items-center pt-24 pb-12 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block p-4 bg-white/75 backdrop-blur-xl rounded-[28px] shadow-sm border border-white mb-8"
        >
          <Logo className="scale-[1.25]" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="max-w-3xl"
        >
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight uppercase leading-[1.05] mb-4">
            {settings.fullName}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-8 bg-brand-magenta/30" />
            <p className="text-brand-magenta font-black uppercase tracking-[0.25em] text-[10px] md:text-xs">
              {settings.shortName} Kerala Division
            </p>
            <span className="h-px w-8 bg-brand-magenta/30" />
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {stage === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-7xl mx-auto px-4 pb-24 space-y-20 z-10 relative"
          >
            {/* Primary Action Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <motion.button 
                whileHover={{ y: -3 }}
                onClick={() => setStage('guidelines')}
                className="group relative bg-white/80 p-8 rounded-[28px] border border-slate-200/50 hover:border-brand-magenta/20 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-6"
              >
                <div className="bg-brand-magenta/5 p-6 rounded-2xl group-hover:bg-brand-magenta group-hover:text-white transition-colors text-brand-magenta">
                  <UserPlus className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">New Enrollment</h2>
                  <p className="text-brand-magenta font-black uppercase text-[9px] tracking-widest mt-2.5 bg-brand-magenta/5 px-3 py-1 rounded-full inline-block">
                    പുതിയ രജിസ്ട്രേഷൻ - ₹200
                  </p>
                  <p className="text-slate-400 font-medium text-[10px] mt-3 block leading-relaxed max-w-[280px]">
                    Register as an official active member to gain community credentials.
                  </p>
                </div>
              </motion.button>

              <motion.button 
                whileHover={{ y: -3 }}
                onClick={onRenew}
                className="group relative bg-white/80 p-8 rounded-[28px] border border-slate-200/50 hover:border-brand-blue/20 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-6"
              >
                <div className="bg-brand-blue/5 p-6 rounded-2xl group-hover:bg-brand-blue group-hover:text-white transition-colors text-brand-blue">
                  <RefreshCw className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Renew Membership</h2>
                  <p className="text-brand-blue font-black uppercase text-[9px] tracking-widest mt-2.5 bg-brand-blue/5 px-3 py-1 rounded-full inline-block">
                    അംഗത്വം പുതുക്കൽ - ₹100
                  </p>
                  <p className="text-slate-400 font-medium text-[10px] mt-3 block leading-relaxed max-w-[280px]">
                    Renew your existing membership card easily with quick online processing.
                  </p>
                </div>
              </motion.button>

              <motion.button 
                whileHover={{ y: -3 }}
                onClick={() => {
                  setClaimMobile('');
                  setClaimResult(null);
                  setStage('claim_check');
                }}
                className="group relative bg-white/80 p-8 rounded-[28px] border border-slate-200/50 hover:border-brand-magenta/20 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-6"
              >
                <div className="bg-brand-magenta/5 p-6 rounded-2xl group-hover:bg-brand-magenta group-hover:text-white transition-colors text-brand-magenta">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Support Claim</h2>
                  <p className="text-brand-magenta font-black uppercase text-[9px] tracking-widest mt-2.5 bg-brand-magenta/5 px-3 py-1 rounded-full inline-block">
                    ക്ലയിം ഫോം - ക്ലിക്ക് ചെയ്യുക
                  </p>
                  <p className="text-slate-400 font-medium text-[10px] mt-3 block leading-relaxed max-w-[280px]">
                    Enter your mobile number to check eligibility and proceed to your claim.
                  </p>
                </div>
              </motion.button>
            </div>

            {/* Micro Access Card */}
            <div className="flex flex-col items-center max-w-sm mx-auto bg-white/70 backdrop-blur-md border border-slate-200/40 p-8 rounded-[32px] shadow-sm">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] mb-4">Official Logins</span>
              <Button 
                onClick={onLoginClick}
                className="w-full h-12 rounded-xl font-black text-white bg-slate-800 hover:bg-slate-900 shadow-md transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 group border border-slate-900"
              >
                Sign In to Portal
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>

            {/* About & Context Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto pt-6">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 bg-brand-magenta/5 text-brand-magenta px-4 py-1.5 rounded-full border border-brand-magenta/10">
                  <Info className="w-4 h-4" />
                  <span className="font-black text-[9px] uppercase tracking-wider">About Our Society</span>
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">
                  Fostering Community <br/>
                  <span className="text-brand-blue italic">And Economic Unity</span>
                </h2>
                <div className="text-sm text-slate-500 font-medium leading-relaxed space-y-4">
                  {settings.aboutUs.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </motion.div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div 
                  className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/40 space-y-4"
                >
                  <div className="w-10 h-10 bg-brand-blue/5 rounded-xl flex items-center justify-center text-brand-blue">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Our Mission</h3>
                  <p className="text-xs font-semibold text-slate-400 leading-relaxed italic">
                    "{settings.mission}"
                  </p>
                </motion.div>
                
                <motion.div 
                   className="bg-brand-magenta p-6 rounded-[24px] shadow-sm text-white space-y-4"
                >
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-white tracking-tight">Our Vision</h3>
                  <p className="text-xs font-semibold leading-relaxed opacity-90">
                    "{settings.vision}"
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Gallery Archive Grid Redesign */}
            <section className="space-y-8 max-w-5xl mx-auto pt-6" id="gallery-preview">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 bg-brand-magenta/5 text-brand-magenta px-4 py-1.5 rounded-full border border-brand-magenta/10">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="font-black text-[9px] uppercase tracking-wider">Visual Records</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                    Secretariat <span className="text-brand-magenta">Moments</span>
                  </h2>
                </div>
                
                <Button 
                  onClick={onGalleryClick}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl px-5 h-10 font-bold uppercase text-[10px] tracking-wider border border-slate-200 transition-colors"
                >
                  Browse Full Gallery
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {gallery.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.slice(0, 4).map((item, index) => (
                    <motion.div
                      key={item.url + index}
                      whileHover={{ y: -2 }}
                      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-white p-1 border border-slate-200/50 shadow-sm cursor-pointer"
                      onClick={onGalleryClick}
                    >
                      <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-50">
                        <img 
                          src={item.url} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/95 p-2 rounded-lg text-slate-800 shadow-sm text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                            View Gallery
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
                   <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">No Archive Photos Yet</h3>
                     <p className="text-slate-400 font-medium text-xs max-w-sm mx-auto mt-1">Explore Secretariat updates once the administrators upload new event files.</p>
                   </div>
                </div>
              )}
            </section>

            {/* Map & Address Section */}
            <section id="contact-us" className="bg-white border border-slate-200/50 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto">
              <div className="p-8 md:p-12 space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Connect with HCRS</h2>
                  <p className="text-slate-400 font-medium text-xs">For queries regarding registrations, identity verification or support claims.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex gap-4 items-start">
                    <div className="w-9 h-9 bg-brand-blue/5 rounded-lg flex items-center justify-center text-brand-blue shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Headquarters</p>
                      <p className="text-slate-600 text-xs font-semibold leading-relaxed">{settings.address}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-9 h-9 bg-brand-magenta/5 rounded-lg flex items-center justify-center text-brand-magenta shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Helpline</p>
                      <p className="text-slate-600 text-xs font-semibold">{settings.phone}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-9 h-9 bg-brand-blue/5 rounded-lg flex items-center justify-center text-brand-blue shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Email Email</p>
                      <p className="text-slate-600 text-xs font-semibold break-all">{settings.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-9 h-9 bg-brand-magenta/5 rounded-lg flex items-center justify-center text-brand-magenta shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Official Site</p>
                      <a href={settings.website} target="_blank" rel="noreferrer" className="text-slate-600 text-xs font-semibold hover:text-brand-magenta transition-colors">{settings.website}</a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 relative flex items-center justify-center p-8 overflow-hidden border-t md:border-t-0 md:border-l border-slate-200/60 font-sans">
                <div className="relative bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4 max-w-xs">
                  <div className="w-12 h-12 bg-slate-950 text-white rounded-xl mx-auto flex items-center justify-center shadow-md">
                    <MapPin className="w-6 h-6 text-brand-magenta" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Active Districts</h3>
                    <p className="text-slate-400 font-semibold text-xs mt-1 leading-relaxed">{settings.districtDetails}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Simple Clean Modern Footer */}
            <footer className="pt-12 border-t border-slate-200/50 max-w-5xl mx-auto">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Logo size="sm" className="h-[24px] w-auto border border-slate-200/30 p-0.5 rounded bg-white" />
                    <p className="font-bold">© {new Date().getFullYear()} HCRS Society. Public Registry Channel.</p>
                  </div>
                  <div className="flex gap-4 font-bold uppercase tracking-wider text-[9px]">
                    <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
                    <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
                  </div>
               </div>
            </footer>
          </motion.div>
        ) : stage === 'guidelines' ? (
          <motion.div
            key="guidelines"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-2xl mx-auto px-4 pb-24 pt-4"
          >
            <Card className="border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-premium overflow-hidden rounded-[24px]">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6 pt-8 px-8">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black flex items-center gap-2.5 text-slate-800 uppercase tracking-tight">
                    <ShieldCheck className="w-6 h-6 text-brand-magenta" />
                    Registry Guidelines
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => setStage('landing')} 
                    className="rounded-full w-9 h-9 p-0 hover:bg-slate-150 border border-slate-200/60 text-slate-500"
                  >
                     <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-8 pb-6 px-8">
                <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {[
                    "Membership is strictly open only to citizens supportive of the HCRS core objectives.",
                    "Digital identity credentials are dynamically generated after verified payment & approval.",
                    "Intentional submission of falsified credentials constitutes permanent blacklisting.",
                    "The Digital identity card is a secure dynamic property issued in Kerala division.",
                    "All registration and support claims deposits are completely non-refundable."
                  ].map((text, idx) => (
                    <div key={idx} className="flex gap-4 items-start group">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 shadow-sm border border-slate-200/30">
                        <span className="text-slate-500 font-bold text-xs">{idx + 1}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 leading-relaxed pt-0.5">{text}</p>
                    </div>
                  ))}
                </div>

                <div 
                  className="flex items-center space-x-3.5 p-4 bg-slate-50 rounded-xl border border-slate-205 transition-all cursor-pointer w-full hover:bg-slate-100/50" 
                  onClick={() => setAgreed(!agreed)}
                >
                  <Checkbox 
                    id="terms" 
                    checked={agreed} 
                    onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    className="data-[state=checked]:bg-brand-magenta data-[state=checked]:border-brand-magenta border-slate-300 w-5 h-5 rounded-md"
                  />
                  <Label 
                    htmlFor="terms" 
                    className="text-[10px] font-black uppercase tracking-wider cursor-pointer select-none text-slate-500"
                  >
                    I agree to the terms and hereby proceed to the public registry.
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="pt-2 pb-8 px-8">
                <Button 
                  className="w-full h-12 font-black rounded-xl transition-all shadow-md active:translate-y-0 disabled:opacity-30 uppercase tracking-widest text-xs bg-brand-magenta text-white hover:bg-brand-magenta/95"
                  disabled={!agreed}
                  onClick={onAccept}
                >
                  Proceed to registry form
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="claim_check"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-2xl mx-auto px-4 pb-24 pt-4"
          >
            <Card className="border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-premium overflow-hidden rounded-[24px]">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6 pt-8 px-8">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black flex items-center gap-2.5 text-slate-800 uppercase tracking-tight">
                    <ShieldCheck className="w-6 h-6 text-brand-magenta" />
                    യൂസർ വേരിഫിക്കേഷൻ (Support Claim)
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setStage('landing');
                      setClaimResult(null);
                    }} 
                    className="rounded-full w-9 h-9 p-0 hover:bg-slate-150 border border-slate-200/60 text-slate-500"
                  >
                     <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-8 pb-6 px-8">
                {!claimResult ? (
                  <div className="space-y-6">
                    <div className="bg-brand-magenta/5 border border-brand-magenta/10 p-5 rounded-2xl">
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                        ക്ലൈം ഫോം ആക്സസ് ചെയ്യുന്നതിനായി ദയവായി നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത മൊബൈൽ നമ്പർ നൽകി വേരിഫൈ ചെയ്യുക.
                        <br/>
                        <span className="text-[10px] text-slate-400 block mt-1 uppercase font-bold tracking-wider">Please enter your registered mobile number to check eligibility and proceed to your claim.</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Mobile Number (മൊബൈൽ നമ്പർ)</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <Input 
                          type="tel"
                          maxLength={10}
                          value={claimMobile}
                          onChange={(e) => setClaimMobile(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 9645934571"
                          className="pl-12 h-12 bg-white border border-slate-200 focus:border-brand-magenta/50 transition-all rounded-xl font-bold font-mono text-lg"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={async () => {
                        if (!claimMobile || !/^\d{10}$/.test(claimMobile)) {
                          toast.error('സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക / Please enter a valid 10-digit mobile number');
                          return;
                        }
                        setCheckingClaim(true);
                        setClaimResult(null);
                        try {
                          const q = query(collection(db, 'users'), where('mobile', '==', claimMobile.trim()), limit(1));
                          const querySnapshot = await getDocs(q);
                          if (!querySnapshot.empty) {
                            toast.success('മൊബൈൽ നമ്പർ കണ്ടെത്തി! നിങ്ങളുടെ Password (PIN) അടിക്കുക.');
                            setClaimResult('registered');
                          } else {
                            toast.info('രജിസ്റ്റർ ചെയ്യാത്ത മൊബൈൽ നമ്പർ! പുതിയ മെമ്പർഷിപ്പിനായി ₹200 പെയ്മെന്റിലേക്ക് ഓട്ടോമാറ്റിക് ആയി മാറുന്നു...');
                            setClaimResult('not_found');
                            setTimeout(() => {
                              onRegisterWithMobile?.(claimMobile);
                            }, 1500);
                          }
                        } catch (e) {
                          console.error(e);
                          toast.error('വേരിഫിക്കേഷൻ പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.');
                        } finally {
                          setCheckingClaim(false);
                        }
                      }}
                      disabled={checkingClaim}
                      className="w-full h-12 font-black rounded-xl transition-all shadow-md uppercase tracking-widest text-xs bg-brand-magenta text-white hover:bg-brand-magenta/95"
                    >
                      {checkingClaim ? 'പരിശോധിക്കുന്നു (Checking...)' : 'മൊബൈൽ നമ്പർ വേരിഫൈ ചെയ്യുക (Verify Mobile)'}
                    </Button>
                  </div>
                ) : claimResult === 'registered' ? (
                  <div className="space-y-6 text-left py-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-brand-magenta/10 rounded-full flex items-center justify-center mx-auto border border-brand-magenta/20 text-brand-magenta mb-4">
                        <ShieldCheck className="w-8 h-8 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-brand-magenta uppercase tracking-tight leading-none text-slate-900">
                        നിലവിലുള്ള ഒഫീഷ്യൽ മെമ്പർ!
                      </h3>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">Please enter Security PIN to access your ID Card and Claim Form.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Registered Number</p>
                        <p className="text-base font-black text-slate-700 tracking-tight font-mono mt-1">{claimMobile}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                          setClaimPin('');
                        }}
                        className="text-[10px] text-brand-magenta font-black uppercase tracking-wider hover:bg-slate-100"
                      >
                        Change Number
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Security PIN (പാസ്‌വേഡ് അടിക്കുക)</Label>
                      <Input 
                        type="password"
                        maxLength={12}
                        value={claimPin}
                        onChange={(e) => setClaimPin(e.target.value)}
                        placeholder="••••"
                        className="h-12 bg-white border border-slate-200 focus:border-brand-magenta/50 transition-all rounded-xl font-bold text-center text-lg tracking-widest font-mono text-slate-800"
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                      <Button 
                        onClick={async () => {
                          if (!claimPin || claimPin.length < 4) {
                            toast.error('സാധുവായ PIN നൽകുക / Please enter your secure PIN');
                            return;
                          }
                          setLoggingInClaim(true);
                          try {
                            if (typeof window !== 'undefined') {
                              sessionStorage.setItem('hcrs_claim_redirect', 'true');
                            }
                            const success = await onLoginDirect?.(claimMobile, claimPin);
                            if (success === false) {
                              if (typeof window !== 'undefined') {
                                sessionStorage.removeItem('hcrs_claim_redirect');
                              }
                              toast.error('PIN തെറ്റാണ്. ദയവായി വീണ്ടും ശ്രമിക്കുക. (Invalid security PIN. Please try again.)');
                            }
                          } catch (err) {
                            if (typeof window !== 'undefined') {
                              sessionStorage.removeItem('hcrs_claim_redirect');
                            }
                            console.error(err);
                          } finally {
                            setLoggingInClaim(false);
                          }
                        }}
                        disabled={loggingInClaim}
                        className="w-full h-12 bg-brand-magenta text-white hover:bg-brand-magenta/90 font-black uppercase text-[11px] tracking-wider rounded-xl shadow-lg shadow-brand-magenta/10 flex items-center justify-center gap-2"
                      >
                        {loggingInClaim ? 'ലോഗിൻ ചെയ്യുന്നു (Logging inside...)' : 'ലോഗിൻ ചെയ്യുക (Secure Login)'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                          setClaimPin('');
                        }}
                        className="w-full h-11 border border-slate-200 text-slate-500 font-black uppercase text-[10px]"
                      >
                        Return Home
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto border border-slate-200 text-slate-500">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-brand-magenta uppercase tracking-tight leading-none text-slate-900">
                        രജിസ്റ്റർ ചെയ്യാത്ത മൊബൈൽ നമ്പർ!
                      </h3>
                      <p className="text-brand-magenta font-bold text-xs uppercase tracking-wider">Unregistered Mobile Number</p>
                    </div>

                    <p className="text-slate-500 font-semibold text-xs leading-relaxed max-w-md mx-auto">
                      ഈ മൊബൈൽ നമ്പർ നിലവിൽ ഇതിൽ രജിസ്റ്റർ ചെയ്തിട്ടില്ല. രജിസ്റ്റർ ചെയ്ത മെമ്പർമാർക്ക് മാത്രമേ ക്ലൈം ഫയൽ ചെയ്യാൻ സാധിക്കുകയുള്ളൂ. ദയവായി പുതിയ മെമ്പർഷിപ്പ് എടുത്ത് ₹200 പെയ്മെന്റിലേക്ക് മാറുക.
                      <br/>
                      <span className="text-[10px] text-slate-400 font-bold block mt-2 uppercase">This mobile number is not registered. To apply for a claim form, please register as a new member with a payment of ₹200 first.</span>
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                        }}
                        className="flex-1 h-11 border border-slate-200 text-slate-500 font-black uppercase text-[10px]"
                      >
                        വീണ്ടും നോക്കുക (Search Again)
                      </Button>
                      <Button 
                        onClick={() => onRegisterWithMobile?.(claimMobile)}
                        className="flex-1 h-11 bg-brand-magenta text-white hover:bg-brand-magenta/90 font-black uppercase text-[10px] tracking-wider"
                      >
                         പുതിയ അംഗത്വം എടുക്കുക ₹200 (Register Now)
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
