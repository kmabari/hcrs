import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft,
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
import { subscribeToOrgSettings, OrgSettings, defaultSettings, subscribeToGallery, GalleryItem, Announcement } from '@/src/lib/cms';
import { STATIC_GALLERY_IMAGES } from '../constants';
import { cn } from '@/lib/utils';
import Logo from '../Logo';

export function extractDirectImageUrl(url: string | undefined): string {
  if (!url) return '';
  let val = url.trim();
  
  // Extract from HTML src matching src="..."
  const srcMatch = val.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1].trim();
  }
  
  // Extract from BBCode img matching [img]...[/img]
  const bbcMatch = val.match(/\[img\]([^\[]+)\[\/img\]/i);
  if (bbcMatch && bbcMatch[1]) {
    return bbcMatch[1].trim();
  }

  // Extract from HTML href matching href="..."
  const hrefMatch = val.match(/href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1] && hrefMatch[1].includes('i.ibb.co')) {
    return hrefMatch[1].trim();
  }
  
  return val;
}

interface LandingPageProps {
  announcements?: Announcement[];
  onAccept: () => void;
  onRenew: () => void;
  onLoginClick: () => void;
  onGalleryClick: () => void;
  onRenewWithMobile?: (mobile: string) => void;
  onRegisterWithMobile?: (mobile: string) => void;
  onLoginDirect?: (mobile: string, pin: string) => Promise<boolean>;
}

export default function LandingPage({ 
  announcements = [],
  onAccept, 
  onRenew, 
  onLoginClick, 
  onGalleryClick, 
  onRenewWithMobile, 
  onRegisterWithMobile, 
  onLoginDirect 
}: LandingPageProps) {
  const [stage, setStage] = useState<'landing' | 'guidelines' | 'claim_check'>('landing');
  const [agreed, setAgreed] = useState(false);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentAnnounceIndex, setCurrentAnnounceIndex] = useState(0);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-blue/10 relative overflow-x-hidden pb-12">
      {/* Absolute background graphics */}
      <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] rounded-full bg-brand-blue/10 blur-3xl pointer-events-none" />
      <div className="absolute top-[30%] right-[-100px] w-[700px] h-[700px] rounded-full bg-brand-magenta/8 blur-3xl pointer-events-none" />

      {/* Navigation Bar */}
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-8 py-5",
          isScrolled ? "bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-md py-3.5" : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="bg-white p-1.5 rounded-2xl shadow-md border border-slate-150 group-hover:scale-105 transition-all">
              <Logo size="sm" className="h-[32px] w-auto" />
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider leading-none">HCRS Portal</h1>
              <p className="text-[9px] font-black text-brand-magenta uppercase tracking-widest mt-1">Kerala Division</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue transition-colors">Home</button>
            <button onClick={onGalleryClick} className="text-[11px] font-black uppercase tracking-widest text-brand-magenta hover:opacity-80 transition-opacity flex items-center gap-1.5">
              Archives
              <span className="w-2 h-2 rounded-full bg-brand-magenta animate-pulse" />
            </button>
            <button onClick={() => document.getElementById('contact-us')?.scrollIntoView({ behavior: 'smooth' })} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue transition-colors">Contact</button>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={onLoginClick}
              className="text-[11px] font-black uppercase tracking-widest text-slate-800 border-2 border-slate-200/80 hover:bg-slate-100 rounded-xl h-10 px-4 transition-all"
            >
              Sign In
            </Button>
            <Button 
              className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl px-5 h-10 font-black uppercase text-[11px] tracking-widest shadow-md hover:translate-y-[-1px] active:translate-y-0 transition-all border border-brand-blue"
              onClick={onRenew}
            >
              Get ID Card
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Showcase / Hero Cover */}
      <div className="w-full flex flex-col items-center pt-32 pb-16 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block p-4 bg-white/95 shadow-premium rounded-[32px] border border-slate-100 mb-8"
        >
          <Logo className="scale-[1.3]" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="max-w-4xl"
        >
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight uppercase leading-[1.05] mb-6">
            {settings.fullName}
          </h1>
          <div className="flex items-center justify-center gap-3.5 mb-2">
            <span className="h-[2px] w-12 bg-gradient-to-r from-transparent to-brand-magenta" />
            <p className="text-brand-magenta font-black uppercase tracking-[0.25em] text-xs md:text-sm">
              {settings.shortName} Kerala Division
            </p>
            <span className="h-[2px] w-12 bg-gradient-to-l from-transparent to-brand-magenta" />
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
            className="w-full max-w-7xl mx-auto px-4 pb-24 space-y-16 z-10 relative"
          >
            {/* TODAY'S UPDATE BOX (ഇന്നത്തെ അപ്ഡേഷൻ) */}
            {(() => {
              const activeAnnouncements = (() => {
                const list = announcements ? [...announcements.filter(a => a.active !== false)] : [];
                if (settings?.announcementActive && (settings?.announcementText || settings?.announcementImageUrl || settings?.announcementTitle)) {
                  list.unshift({
                    id: 'legacy',
                    title: settings?.announcementTitle || "ഇന്നത്തെ അപ്ഡേഷൻ",
                    text: settings?.announcementText,
                    caseDate: settings?.announcementCaseDate || "",
                    caseNo: settings?.announcementCaseNo || "",
                    caseName: settings?.announcementCaseName || "",
                    court: settings?.announcementCourt || "",
                    advocate: settings?.announcementAdvocate || "",
                    judgeBench: settings?.announcementJudgeBench || "",
                    imageUrl: settings?.announcementImageUrl || ""
                  } as Announcement);
                }
                return list;
              })();

              const currentAnn = activeAnnouncements[currentAnnounceIndex] || activeAnnouncements[0];

              if (!settings?.announcementActive || !currentAnn) return null;

              return (
                <div id="home_announcement_box" className="max-w-4xl mx-auto w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-3 border-[#FF1493] rounded-[36px] p-6 md:p-8 shadow-[0_30px_70px_rgba(255,20,147,0.15)] relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-4 duration-1000">
                  {/* Decorative glowing backdrops */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-blue via-brand-magenta to-indigo-600" />
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF1493]/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />

                  {/* Special Update Header Badge with animated pulse */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <span className="bg-gradient-to-r from-[#FF1493] to-indigo-600 text-white font-extrabold uppercase px-6 py-2 rounded-full text-[10px] md:text-xs tracking-[0.2em] shadow-lg shadow-brand-magenta/30 border border-white/15 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      ഏറ്റവും പുതിയ വിവരങ്ങൾ / NEW LIVE UPDATE
                    </span>
                    
                    {activeAnnouncements.length > 1 && (
                      <span className="bg-slate-900/90 text-slate-300 font-mono text-xs font-black px-4 py-1.5 rounded-full border border-slate-800 shadow-inner">
                        UPDATE {currentAnnounceIndex + 1} OF {activeAnnouncements.length}
                      </span>
                    )}
                  </div>

                  {currentAnn.imageUrl && (
                    <div className="mb-6 flex justify-center max-w-lg mx-auto overflow-hidden rounded-[24px] border-2 border-slate-800 bg-slate-900/40 p-2 shadow-inner">
                      <img 
                        src={extractDirectImageUrl(currentAnn.imageUrl)} 
                        alt={currentAnn.title}
                        className="w-full h-auto max-h-[450px] object-contain rounded-[18px] transition-transform duration-500 hover:scale-[1.02]"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60 text-left">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-brand-blue/20 text-brand-blue flex items-center justify-center shadow-inner">
                        <RefreshCw className="w-5 h-5 text-brand-blue" />
                      </span>
                      <div>
                        <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                          {currentAnn.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Notification Center / അറിയിപ്പ് കോളം</p>
                      </div>
                    </div>
                    {currentAnn.caseDate && (
                      <span className="self-start sm:self-center bg-brand-magenta text-white border border-brand-magenta/20 px-4.5 py-1.5 rounded-full font-black text-xs tracking-wider uppercase font-mono shadow-md shadow-brand-magenta/20">
                        {currentAnn.caseDate}
                      </span>
                    )}
                  </div>

                  {currentAnn.text && (
                    <div className="text-slate-200 text-xs md:text-sm font-semibold leading-relaxed mb-6 whitespace-pre-wrap bg-slate-900/60 p-4 md:p-6 rounded-[24px] border border-slate-800 shadow-inner text-left">
                      {currentAnn.text}
                    </div>
                  )}

                  {/* Case Related Detailed Specifications */}
                  {(currentAnn.caseNo || currentAnn.caseName || currentAnn.court || currentAnn.advocate || currentAnn.judgeBench) && (
                    <div className="bg-slate-950/80 border border-slate-850 rounded-[28px] p-5 md:p-6 mb-6 space-y-3 shadow-md relative overflow-hidden text-left">
                      <div className="absolute top-0 right-0 bg-[#FF1493]/15 text-[#FF1493] font-black font-mono text-[9px] px-3.5 py-1 rounded-bl-2xl uppercase tracking-widest">
                        Case Profile / കേസ് വിവരങ്ങൾ
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {currentAnn.caseNo && (
                          <div className="flex flex-col gap-1 border-b border-slate-800/40 pb-2 md:border-b-0 md:pb-0">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">കേസ് നമ്പർ (Case No.):</span>
                            <span className="font-black text-white text-sm font-mono">{currentAnn.caseNo}</span>
                          </div>
                        )}
                        {currentAnn.caseName && (
                          <div className="flex flex-col gap-1 border-b border-slate-800/40 pb-2 md:border-b-0 md:pb-0">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">ആയ കേസ് (Case Name):</span>
                            <span className="font-black text-white text-sm">{currentAnn.caseName}</span>
                          </div>
                        )}
                        {currentAnn.court && (
                          <div className="flex flex-col gap-1 border-b border-slate-800/40 pb-2 md:border-b-0 md:pb-0">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">കോടതി (Court):</span>
                            <span className="font-black text-white text-sm">{currentAnn.court}</span>
                          </div>
                        )}
                        {currentAnn.advocate && (
                          <div className="flex flex-col gap-1 border-b border-slate-800/40 pb-2 md:border-b-0 md:pb-0">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">അഭിഭാഷകൻ (Advocate):</span>
                            <span className="font-black text-white text-sm">{currentAnn.advocate}</span>
                          </div>
                        )}
                        {currentAnn.judgeBench && (
                          <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">ബെഞ്ച് (Judge/Bench):</span>
                            <span className="font-black text-white text-sm leading-tight">{currentAnn.judgeBench}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Multi-announcements dynamic action controllers */}
                  {activeAnnouncements.length > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/50">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setCurrentAnnounceIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
                        }}
                        className="text-slate-400 hover:text-white hover:bg-slate-900/60 rounded-full py-2 px-4 text-xs font-bold flex items-center gap-1.5 transition-all text-left self-stretch sm:self-auto justify-center"
                      >
                        <ChevronLeft className="w-4 h-4 text-[#FF1493]" />
                        മുൻപത്തെ എഴുത്ത് (PREV)
                      </Button>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          type="button"
                          onClick={() => {
                            setCurrentAnnounceIndex(0);
                            toast.success('തിരഞ്ഞെടുപ്പ് ആദ്യ അറിയിപ്പിലേക്ക് റീസെറ്റ് ചെയ്തിരിക്കുന്നു.');
                          }}
                          className="bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black px-4 py-2.5 rounded-xl border border-slate-800 flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-brand-blue animate-spin" />
                          റീപ്രസ്സ് (RESET)
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            setCurrentAnnounceIndex((prev) => (prev + 1) % activeAnnouncements.length);
                          }}
                          className="bg-gradient-to-r from-[#FF1493] to-indigo-600 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-magenta/20 flex-1 sm:flex-initial"
                        >
                          അടുത്ത അപ്ഡേഷൻ (NEXT)
                          <ChevronRight className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Primary Action Bento Grid - Redesigned with Premium high-contrast buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Enrollment Card */}
              <div
                className="group relative bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)] hover:border-brand-magenta/30 transition-all text-center flex flex-col items-center justify-between min-h-[400px]"
              >
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="bg-brand-magenta/10 w-16 h-16 rounded-2xl flex items-center justify-center text-brand-magenta group-hover:scale-115 group-hover:rotate-3 transition-transform shadow-sm">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Membership</h2>
                    <span className="inline-flex mt-2 bg-pink-50 text-brand-magenta border border-pink-100 font-black text-[10px] tracking-wider uppercase px-3.5 py-1 rounded-full">
                      ന്യൂ മെമ്പർഷിപ്പ് • ₹200
                    </span>
                    <p className="text-slate-500 font-bold text-xs mt-4 leading-relaxed max-w-[280px]">
                      Register as an official active member to gain community credentials.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setStage('guidelines')}
                  className="w-full mt-6 h-13 rounded-2xl text-xs font-black shadow-lg shadow-brand-magenta/15 hover:shadow-brand-magenta/25 bg-gradient-to-r from-brand-magenta to-pink-500 text-white hover:opacity-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest hover:translate-y-[-1.5px] active:translate-y-0"
                >
                  Register Now
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Renewal Card */}
              <div
                className="group relative bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)] hover:border-brand-blue/30 transition-all text-center flex flex-col items-center justify-between min-h-[400px]"
              >
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="bg-brand-blue/10 w-16 h-16 rounded-2xl flex items-center justify-center text-brand-blue group-hover:scale-115 group-hover:-rotate-3 transition-transform shadow-sm">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Renew card</h2>
                    <span className="inline-flex mt-2 bg-blue-50 text-brand-blue border border-blue-100 font-black text-[10px] tracking-wider uppercase px-3.5 py-1 rounded-full">
                      അംഗത്വം പുതുക്കൽ • ₹100
                    </span>
                    <p className="text-slate-500 font-bold text-xs mt-4 leading-relaxed max-w-[280px]">
                      Renew your existing membership card easily with quick online processing.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={onRenew}
                  className="w-full mt-6 h-13 rounded-2xl text-xs font-black shadow-lg shadow-brand-blue/15 hover:shadow-brand-blue/25 bg-gradient-to-r from-brand-blue to-indigo-600 text-white hover:opacity-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest hover:translate-y-[-1.5px] active:translate-y-0"
                >
                  Renew Card Now
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Claim Card */}
              <div
                className="group relative bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)] hover:border-emerald-500/30 transition-all text-center flex flex-col items-center justify-between min-h-[400px]"
              >
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="bg-emerald-100/60 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-115 group-hover:rotate-3 transition-transform shadow-sm">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Support Claim</h2>
                    <span className="inline-flex mt-2 bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[10px] tracking-wider uppercase px-3.5 py-1 rounded-full">
                      ക്ലയിം ഫോം • Verified
                    </span>
                    <p className="text-slate-500 font-bold text-xs mt-4 leading-relaxed max-w-[280px]">
                      Enter your mobile number to check eligibility and proceed to your claim.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    setClaimMobile('');
                    setClaimResult(null);
                    setStage('claim_check');
                  }}
                  className="w-full mt-6 h-13 rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest hover:translate-y-[-1.5px] active:translate-y-0"
                >
                  File Support Claim
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Micro Access Card - Upgraded */}
            <div className="flex flex-col items-center max-w-sm mx-auto bg-white border border-slate-150 p-8 rounded-[36px] shadow-premium relative overflow-hidden group">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-4">Official Logins</span>
              <Button 
                onClick={onLoginClick}
                className="w-full h-13 rounded-2xl font-black text-white bg-slate-900 hover:bg-slate-950 shadow-lg transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 group hover:translate-y-[-1px] active:translate-y-0"
              >
                Sign In to Portal
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <motion.div 
                  className="bg-white p-8 rounded-[32px] shadow-premium border border-slate-150 space-y-5"
                >
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Our Mission</h3>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                    "{settings.mission}"
                  </p>
                </motion.div>
                
                <motion.div 
                   className="bg-gradient-to-br from-brand-magenta to-pink-600 p-8 rounded-[32px] shadow-premium text-white space-y-5"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                    <Eye className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">Our Vision</h3>
                  <p className="text-xs font-semibold leading-relaxed opacity-95">
                    "{settings.vision}"
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Gallery Archive Grid Redesign */}
            <section className="space-y-8 max-w-5xl mx-auto pt-6" id="gallery-preview">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-brand-magenta/5 text-brand-magenta px-4 py-1.5 rounded-full border border-brand-magenta/10">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="font-extrabold text-[10px] uppercase tracking-wider">Visual Records</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
                    Secretariat <span className="bg-gradient-to-r from-brand-magenta to-pink-500 bg-clip-text text-transparent">Moments</span>
                  </h2>
                </div>
                
                <Button 
                  onClick={onGalleryClick}
                  className="bg-white hover:bg-slate-50 text-slate-800 rounded-xl px-5 h-12 font-black uppercase text-[10px] tracking-wider border-2 border-slate-200/80 transition-all shadow-sm hover:shadow-md"
                >
                  Browse Full Gallery
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {gallery.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {gallery.slice(0, 4).map((item, index) => (
                    <motion.div
                      key={item.url + index}
                      whileHover={{ y: -4 }}
                      className="group relative aspect-[3/4] rounded-[28px] overflow-hidden bg-white p-1.5 border border-slate-200/60 shadow-premium cursor-pointer"
                      onClick={onGalleryClick}
                    >
                      <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-100">
                        <img 
                          src={item.url} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <div className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transform translate-y-2 group-hover:translate-y-0 transition-all duration-305">
                            View Gallery
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[32px] p-12 border-2 border-slate-100 shadow-premium flex flex-col items-center text-center space-y-5">
                   <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 shadow-sm border border-slate-150">
                      <ImageIcon className="w-7 h-7" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">No Archive Photos Yet</h3>
                     <p className="text-slate-500 font-bold text-xs max-w-sm mx-auto mt-2 leading-relaxed">Explore Secretariat updates once the administrators upload new event files.</p>
                   </div>
                </div>
              )}
            </section>

            {/* Map & Address Section */}
            <section id="contact-us" className="bg-white border-2 border-slate-100 rounded-[36px] shadow-premium overflow-hidden grid grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto">
              <div className="p-8 md:p-12 space-y-10">
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Connect with HCRS</h2>
                  <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-md">For queries regarding registrations, identity verification or support claims.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue shrink-0 shadow-sm border border-brand-blue/5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Headquarters</p>
                      <p className="text-slate-700 text-xs font-bold leading-relaxed">{settings.address}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-brand-magenta/10 rounded-xl flex items-center justify-center text-brand-magenta shrink-0 shadow-sm border border-brand-magenta/5">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Helpline</p>
                      <p className="text-slate-700 text-xs font-bold">{settings.phone}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue shrink-0 shadow-sm border border-brand-blue/5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Office</p>
                      <p className="text-slate-700 text-xs font-bold break-all leading-normal">{settings.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-brand-magenta/10 rounded-xl flex items-center justify-center text-brand-magenta shrink-0 shadow-sm border border-brand-magenta/5">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Official Site</p>
                      <a href={settings.website} target="_blank" rel="noreferrer" className="text-slate-700 text-xs font-bold hover:text-brand-magenta transition-colors break-all leading-normal">{settings.website}</a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 relative flex items-center justify-center p-8 overflow-hidden border-t md:border-t-0 md:border-l-2 border-slate-100 font-sans">
                <div className="relative bg-white p-8 rounded-3xl shadow-premium border border-slate-150 text-center space-y-5 max-w-xs">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-slate-950">
                    <MapPin className="w-7 h-7 text-brand-magenta" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Active Districts</h3>
                    <p className="text-slate-500 font-semibold text-xs mt-2 leading-relaxed">{settings.districtDetails}</p>
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
            <Card className="border-2 border-slate-150 bg-white shadow-premium overflow-hidden rounded-[36px]">
              <CardHeader className="bg-slate-50/80 border-b border-slate-150 pb-8 pt-10 px-8 md:px-10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tight">
                    <ShieldCheck className="w-7 h-7 text-brand-magenta" />
                    Registry Guidelines
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => setStage('landing')} 
                    className="rounded-full w-10 h-10 p-0 hover:bg-slate-100 border-2 border-slate-205 text-slate-600 transition-all"
                  >
                     <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-10 pb-6 px-8 md:px-10">
                <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                  {[
                    "Membership is strictly open only to citizens supportive of the HCRS core objectives.",
                    "Digital identity credentials are dynamically generated after verified payment & approval.",
                    "Intentional submission of falsified credentials constitutes permanent blacklisting.",
                    "The Digital identity card is a secure dynamic property issued in Kerala division.",
                    "All registration and support claims deposits are completely non-refundable."
                  ].map((text, idx) => (
                    <div key={idx} className="flex gap-4 items-start group">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md border border-slate-950">
                        <span className="font-extrabold text-[11px]">{idx + 1}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed pt-1">{text}</p>
                    </div>
                  ))}
                </div>

                <div 
                  className="flex items-center space-x-4 p-5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border-2 border-slate-150 transition-all cursor-pointer w-full group" 
                  onClick={() => setAgreed(!agreed)}
                >
                  <Checkbox 
                    id="terms" 
                    checked={agreed} 
                    onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    className="data-[state=checked]:bg-brand-magenta data-[state=checked]:border-brand-magenta border-2 border-slate-305 w-6 h-6 rounded-lg transition-transform group-hover:scale-105"
                  />
                  <Label 
                    htmlFor="terms" 
                    className="text-[11px] font-black uppercase tracking-wider cursor-pointer select-none text-slate-600 leading-relaxed"
                  >
                    I agree to the terms and hereby proceed to the public registry.
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="pt-2 pb-10 px-8 md:px-10">
                <Button 
                  className="w-full h-14 font-black rounded-2xl transition-all shadow-lg active:translate-y-0 disabled:opacity-40 uppercase tracking-widest text-xs bg-gradient-to-r from-brand-magenta to-pink-500 text-white hover:opacity-95 disabled:hover:opacity-40"
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
            <Card className="border-2 border-slate-150 bg-white shadow-premium overflow-hidden rounded-[36px]">
              <CardHeader className="bg-slate-50/80 border-b border-slate-150 pb-8 pt-10 px-8 md:px-10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3 text-slate-950 uppercase tracking-tight">
                    <ShieldCheck className="w-7 h-7 text-brand-magenta" />
                    യൂസർ വേരിഫിക്കേഷൻ
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setStage('landing');
                      setClaimResult(null);
                    }} 
                    className="rounded-full w-10 h-10 p-0 hover:bg-slate-100 border-2 border-slate-205 text-slate-600 transition-all"
                  >
                     <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-10 pb-6 px-8 md:px-10">
                {!claimResult ? (
                  <div className="space-y-8">
                    <div className="bg-pink-50 border-2 border-pink-100 p-6 rounded-2xl">
                      <p className="text-xs font-extrabold text-slate-850 leading-relaxed">
                        ക്ലൈം ഫോം ആക്സസ് ചെയ്യുന്നതിനായി ദയവായി നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത മൊബൈൽ നമ്പർ നൽകി വേരിഫൈ ചെയ്യുക.
                        <br/>
                        <span className="text-[10px] text-brand-magenta block mt-2 uppercase font-black tracking-wider">Please enter your registered mobile number to check eligibility and proceed to your claim.</span>
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Mobile Number (മൊബൈൽ നമ്പർ)</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <Input 
                          type="tel"
                          maxLength={10}
                          value={claimMobile}
                          onChange={(e) => setClaimMobile(e.target.value.replace(/\D/g, ''))}
                          placeholder="**********"
                          className="pl-12 h-14 bg-white border-2 border-slate-200 focus:border-brand-magenta/80 focus:ring-0 transition-all rounded-2xl font-black font-mono text-xl text-slate-900"
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
                      className="w-full h-14 font-black rounded-2xl transition-all shadow-lg uppercase tracking-widest text-xs bg-gradient-to-r from-brand-magenta to-pink-500 text-white hover:opacity-95"
                    >
                      {checkingClaim ? 'പരിശോധിക്കുന്നു (Checking...)' : 'മൊബൈൽ നമ്പർ വേരിഫൈ ചെയ്യുക (Verify Mobile)'}
                    </Button>
                  </div>
                ) : claimResult === 'registered' ? (
                  <div className="space-y-8 text-left py-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-pink-100 border-2 border-pink-200 rounded-2xl flex items-center justify-center mx-auto text-brand-magenta mb-4 shadow-sm">
                        <ShieldCheck className="w-8 h-8 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                        நிலവിലുള്ള ഒഫീഷ്യൽ മെമ്പർ!
                      </h3>
                      <p className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider mt-2">Please enter Secure PIN to access your ID Card and Claim Form.</p>
                    </div>

                    <div className="bg-slate-50 border-2 border-slate-150 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Registered Number</p>
                        <p className="text-base font-black text-slate-800 tracking-tight font-mono mt-2">{claimMobile}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                          setClaimPin('');
                        }}
                        className="text-[10px] text-brand-magenta font-black uppercase tracking-wider border-2 border-pink-100 bg-pink-50/50 hover:bg-pink-50 rounded-xl"
                      >
                        Change Number
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Security PIN (പാസ്‌വേഡ് അടിക്കുക)</Label>
                      <Input 
                        type="password"
                        maxLength={12}
                        value={claimPin}
                        onChange={(e) => setClaimPin(e.target.value)}
                        placeholder="••••"
                        className="h-14 bg-white border-2 border-slate-200 focus:border-brand-magenta/80 focus:ring-0 transition-all rounded-2xl font-black text-center text-xl tracking-widest font-mono text-slate-900"
                      />
                    </div>

                    <div className="pt-4 flex flex-col gap-4">
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
                        className="w-full h-14 bg-gradient-to-r from-brand-magenta to-pink-500 text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2"
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
                        className="w-full h-12 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase text-[10px] rounded-2xl"
                      >
                        Return Home
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 text-center py-4">
                    <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto border-2 border-pink-200 text-brand-magenta shadow-sm">
                      <UserPlus className="w-8 h-8 cursor-not-allowed" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                        രജിസ്റ്റർ ചെയ്യാത്ത മൊബൈൽ നമ്പർ!
                      </h3>
                      <p className="text-brand-magenta font-black text-[10px] uppercase tracking-wider block pt-1">Unregistered Mobile Number</p>
                    </div>

                    <p className="text-slate-600 font-bold text-xs leading-relaxed max-w-md mx-auto">
                      ഈ മൊബൈൽ നമ്പർ നിലവിൽ ഇതിൽ രജിസ്റ്റർ ചെയ്തിട്ടില്ല. രജിസ്റ്റർ ചെയ്ത മെമ്പർമാർക്ക് മാത്രമേ ക്ലൈം ഫയൽ ചെയ്യാൻ സാധിക്കുകയുള്ളൂ. ദയവായി പുതിയ മെമ്പർഷിപ്പ് എടുത്ത് ₹200 പെയ്മെന്റിലേക്ക് മാറുക.
                      <br/>
                      <span className="text-[10px] text-slate-400 font-black block mt-3 uppercase tracking-wider leading-relaxed">This mobile number is not registered. To apply for a claim form, please register as a new member with a payment of ₹200 first.</span>
                    </p>

                    <div className="pt-6 flex flex-col sm:flex-row gap-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                        }}
                        className="flex-1 h-13 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase text-[10px] rounded-2xl"
                      >
                        Search Again
                      </Button>
                      <Button 
                        onClick={() => onRegisterWithMobile?.(claimMobile)}
                        className="flex-1 h-13 bg-gradient-to-r from-brand-magenta to-pink-500 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl shadow-lg"
                      >
                         രജിസ്റ്റർ ചെയ്യുക ₹200 (Register Now)
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
