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
  Image as ImageIcon,
  Users,
  HeartHandshake,
  Scale,
  Shield,
  Award,
  Heart,
  Briefcase,
  Activity,
  Building2,
  CalendarRange,
  Sparkles,
  Gavel,
  BadgeAlert,
  IdCard,
  Coins,
  Compass,
  Network,
  UserCheck,
  Pause,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { subscribeToOrgSettings, OrgSettings, defaultSettings, subscribeToGallery, GalleryItem, Announcement } from '@/src/lib/cms';
import { STATIC_GALLERY_IMAGES } from '../constants';
import { cn } from '@/lib/utils';
import Logo from '../Logo';
import { useI18n } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

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
  const { t, lang } = useI18n();
  const [agreed, setAgreed] = useState(false);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentAnnounceIndex, setCurrentAnnounceIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);

  // Compute active announcements globally in component scope
  const activeAnnouncementsList = (() => {
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

  // Autoplay rotation every 5 seconds (5000 ms)
  useEffect(() => {
    if (activeAnnouncementsList.length <= 1) return;
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentAnnounceIndex((prev) => (prev + 1) % activeAnnouncementsList.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeAnnouncementsList.length, isAutoPlaying]);

  // Resume autoplaying after 12 seconds of no physical interaction
  useEffect(() => {
    if (!userInteracted) return;

    const timer = setTimeout(() => {
      setIsAutoPlaying(true);
      setUserInteracted(false);
    }, 12000);

    return () => clearTimeout(timer);
  }, [userInteracted, currentAnnounceIndex]);

  // States for claim lookup system
  const [claimMobile, setClaimMobile] = useState('');
  const [claimPin, setClaimPin] = useState('');
  const [checkingClaim, setCheckingClaim] = useState(false);
  const [loggingInClaim, setLoggingInClaim] = useState(false);
  const [claimResult, setClaimResult] = useState<'found' | 'not_found' | 'registered' | null>(null);
  const [claimUserStatus, setClaimUserStatus] = useState<'active' | 'pending' | 'renewal_pending' | 'expired'>('active');
  const [userHasSubmittedClaim, setUserHasSubmittedClaim] = useState(false);

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
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue transition-colors">
              {t('nav_home', 'Home')}
            </button>
            <button onClick={onGalleryClick} className="text-[11px] font-black uppercase tracking-widest text-brand-magenta hover:opacity-80 transition-opacity flex items-center gap-1.5">
              {t('nav_archives', 'Archives')}
              <span className="w-2 h-2 rounded-full bg-brand-magenta animate-pulse" />
            </button>
            <button onClick={() => document.getElementById('contact-us')?.scrollIntoView({ behavior: 'smooth' })} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue transition-colors">
              {t('nav_contact', 'Contact')}
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <LanguageSwitcher />
            <Button 
              variant="outline" 
              onClick={onLoginClick}
              className="text-[11px] font-black uppercase tracking-widest text-slate-800 border-2 border-slate-200/80 hover:bg-slate-100 rounded-xl h-10 px-4 transition-all"
            >
              {t('nav_sign_in', 'Sign In')}
            </Button>
            <Button 
              className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl px-5 h-10 font-black uppercase text-[11px] tracking-widest shadow-md hover:translate-y-[-1px] active:translate-y-0 transition-all border border-brand-blue"
              onClick={onRenew}
            >
              {t('nav_get_id_card', 'Get ID Card')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Showcase / Hero Cover - Redesigned Professional Banner */}
      <div className="w-full max-w-6xl mx-auto pt-32 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-[40px] p-8 md:p-14 overflow-hidden border-2 border-slate-800 shadow-[0_40px_80px_rgba(0,0,0,0.35)]"
        >
          {/* Decorative Background Accents */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,20,147,0.12),transparent_45%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_45%)] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <div className="absolute -left-16 -top-16 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-brand-magenta/10 rounded-full blur-3xl pointer-events-none" />

          {/* Dot Grid Layer */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Core Content */}
          <div className="relative flex flex-col items-center text-center">
            
            {/* Top Registration Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-slate-900/95 hover:bg-slate-850/95 border border-slate-800 px-5 py-2.5 rounded-full shadow-inner mb-8 transition-all cursor-default"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              </div>
              <span className="font-extrabold text-[10px] md:text-xs text-slate-300 uppercase tracking-[0.18em] font-mono">
                {t('hero_reg_badge', 'Govt. Registered Society • Reg No: TSR/TC/93/2025')}
              </span>
            </motion.div>

            {/* Glowing Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="p-4 bg-white/95 shadow-lg shadow-white/5 rounded-[32px] border border-white/10 mb-8"
            >
              <Logo className="scale-[1.15]" />
            </motion.div>

            {/* Main Title & Subtitle */}
            <div className="max-w-4xl space-y-6 mb-12">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase leading-[1.1] [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
                {t('hero_title_1', 'HIGHRICH COMMUNITY')}<br />
                <span className="bg-gradient-to-r from-brand-blue via-violet-400 to-[#FF1493] bg-clip-text text-transparent">
                  {t('hero_title_2', 'REVIVAL SOCIETY')}
                </span> (HCRS)
              </h1>
              <p className="text-slate-300 font-bold text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                {t('hero_subtitle', 'A Registered Society Committed To Reviving & Supporting The Highrich Community')}
              </p>
            </div>

            {/* Horizontal Line divider */}
            <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-slate-850 to-transparent mb-12" />

            {/* Core Pillars / Professional Icons Grid */}
            <div className="w-full max-w-5xl">
              <p className="text-[10px] md:text-xs font-black text-brand-magenta uppercase tracking-[0.25em] mb-6">
                {t('hero_core_pillars', 'Our Core Pillars')}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                {[
                  {
                    key: "community",
                    titleDefault: "Community Welfare",
                    descDefault: "Fostering kinship, solidarity and mutual group communication among all members.",
                    icon: Users,
                    color: "text-blue-400 bg-blue-500/10 border-blue-500/20"
                  },
                  {
                    key: "revival",
                    titleDefault: "Revival Efforts",
                    descDefault: "Rebuilding community confidence, outlining dynamic revival strategies, and restoring legal clarity.",
                    icon: Sparkles,
                    color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  },
                  {
                    key: "support",
                    titleDefault: "Medical & Social Support",
                    descDefault: "Active social welfare initiatives, essential educational support, and continuous medical aid guidance.",
                    icon: HeartHandshake,
                    color: "text-rose-400 bg-rose-500/10 border-rose-500/20"
                  },
                  {
                    key: "legal",
                    titleDefault: "Legal Assistance",
                    descDefault: "Providing lawful help mechanisms, structured representation, and protecting member interests in forums.",
                    icon: Shield,
                    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                  }
                ].map((pillar, i) => {
                  const IconComponent = pillar.icon;
                  return (
                    <motion.div
                      key={pillar.key}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="bg-slate-900/60 border border-slate-850 rounded-[28px] p-6 hover:border-slate-700/80 transition-all group hover:bg-slate-900 duration-300 flex flex-col justify-between animate-fade-in"
                    >
                      <div>
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${pillar.color} mb-4 shrink-0 group-hover:scale-110 transition-transform`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <h3 className="text-white font-extrabold text-sm md:text-base leading-tight uppercase">
                          {t(`pillar_${pillar.key}_title`, pillar.titleDefault)}
                        </h3>
                      </div>
                      <p className="text-slate-400 text-xs font-semibold leading-relaxed mt-2.5">
                        {t(`pillar_${pillar.key}_desc`, pillar.descDefault)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

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
              const currentAnn = activeAnnouncementsList[currentAnnounceIndex] || activeAnnouncementsList[0];

              if (!settings?.announcementActive || !currentAnn) return null;

              return (
                <div 
                  id="home_announcement_box" 
                  className="max-w-4xl mx-auto w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-3 border-[#FF1493] rounded-[36px] p-6 md:p-8 shadow-[0_30px_70px_rgba(255,20,147,0.15)] relative overflow-hidden transition-all duration-300"
                  onMouseEnter={() => {
                    setIsAutoPlaying(false);
                    setUserInteracted(true);
                  }}
                  onTouchStart={() => {
                    setIsAutoPlaying(false);
                    setUserInteracted(true);
                  }}
                >
                  {/* Decorative glowing backdrops */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-blue via-brand-magenta to-indigo-600" />
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF1493]/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />

                  {/* Header Status & Navigation indicators */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="bg-gradient-to-r from-[#FF1493] to-indigo-600 text-white font-extrabold uppercase px-4 py-1.5 rounded-full text-[10px] md:text-xs tracking-[0.1em] shadow-lg shadow-brand-magenta/30 border border-white/15 flex items-center gap-2">
                        <span className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          isAutoPlaying ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                        )}></span>
                        ഏറ്റവും പുതിയ വിവരങ്ങൾ / NEW LIVE UPDATE
                      </span>
                      
                      {activeAnnouncementsList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAutoPlaying(!isAutoPlaying);
                            setUserInteracted(true);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 border border-white/5 transition-all text-xs"
                          title={isAutoPlaying ? "Auto-scroll Pause" : "Auto-scroll Play"}
                        >
                          {isAutoPlaying ? <Pause className="w-3.5 h-3.5 text-emerald-300" /> : <Play className="w-3.5 h-3.5 text-brand-magenta" />}
                        </button>
                      )}
                    </div>

                    {activeAnnouncementsList.length > 1 && (
                      <div className="flex flex-col sm:flex-row items-center gap-3 self-center md:self-auto">
                        {/* Auto scroll status indicator badge */}
                        <span className={cn(
                          "text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full border",
                          isAutoPlaying 
                            ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30 animate-pulse"
                            : "bg-rose-950/60 text-rose-300 border-rose-800/30"
                        )}>
                          {isAutoPlaying 
                            ? "🔄 ഓട്ടോ സ്ക്രോൾ വിവരങ്ങൾ (Auto Scrolling)"
                            : "⏸️ താൽക്കാലികമായി നിർത്തിയിരിക്കുന്നു (Paused / Touch to read)"
                          }
                        </span>

                        <span className="bg-slate-900/90 text-slate-300 font-mono text-xs font-black px-4 py-1.5 rounded-full border border-slate-800 shadow-inner">
                          UPDATE {currentAnnounceIndex + 1} OF {activeAnnouncementsList.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bullet progress / Dot Indicator page control panel */}
                  {activeAnnouncementsList.length > 1 && (
                    <div className="flex justify-center items-center gap-2 mb-6 bg-slate-900/65 py-2.5 px-4 rounded-2xl border border-slate-800 max-w-md mx-auto">
                      {activeAnnouncementsList.map((ann, idx) => (
                        <button
                          key={ann.id || idx}
                          type="button; "
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentAnnounceIndex(idx);
                            setIsAutoPlaying(false);
                            setUserInteracted(true);
                          }}
                          className={cn(
                            "h-2.5 rounded-full transition-all duration-300 relative",
                            currentAnnounceIndex === idx 
                              ? "w-8 bg-gradient-to-r from-[#FF1493] to-indigo-600 shadow-[0_0_10px_#FF1493]" 
                              : "w-2.5 bg-slate-700 hover:bg-slate-500"
                          )}
                          title={`Go to update ${idx + 1}`}
                        >
                          {currentAnnounceIndex === idx && (
                            <span className="absolute -inset-1 rounded-full bg-[#FF1493]/20 animate-ping" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Slide Content Animation Wrapper for dynamic visible changes */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentAnnounceIndex}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="space-y-6"
                    >
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
                    </motion.div>
                  </AnimatePresence>

                  {/* Multi-announcements dynamic action controllers */}
                  {activeAnnouncementsList.length > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/50 mt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentAnnounceIndex((prev) => (prev - 1 + activeAnnouncementsList.length) % activeAnnouncementsList.length);
                          setIsAutoPlaying(false);
                          setUserInteracted(true);
                        }}
                        className="text-slate-400 hover:text-white hover:bg-slate-900/60 rounded-full py-2 px-4 text-xs font-bold flex items-center gap-1.5 transition-all text-left self-stretch sm:self-auto justify-center"
                      >
                        <ChevronLeft className="w-4 h-4 text-[#FF1493]" />
                        മുൻപത്തെ എഴുത്ത് (PREV)
                      </Button>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentAnnounceIndex(0);
                            setIsAutoPlaying(true);
                            setUserInteracted(false);
                            toast.success('തിരഞ്ഞെടുപ്പ് ആദ്യ അറിയിപ്പിലേക്ക് റീസെറ്റ് ചെയ്തിരിക്കുന്നു.');
                          }}
                          className="bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black px-4 py-2.5 rounded-xl border border-slate-800 flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-brand-blue" />
                          ആദ്യം മുതൽ (RESET)
                        </Button>

                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentAnnounceIndex((prev) => (prev + 1) % activeAnnouncementsList.length);
                            setIsAutoPlaying(false);
                            setUserInteracted(true);
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

              {/* Information Registry Card */}
              <div
                className="group relative bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)] hover:border-brand-magenta/30 transition-all text-center flex flex-col items-center justify-between min-h-[400px]"
              >
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="bg-brand-blue/10 w-16 h-16 rounded-2xl flex items-center justify-center text-brand-blue group-hover:scale-115 group-hover:rotate-3 transition-transform shadow-sm">
                    <Info className="w-8 h-8 text-brand-blue" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase">Member Financial Information Registry</h2>
                    <div className="flex flex-col gap-1 items-center mt-2">
                      <span className="inline-flex bg-brand-blue/5 text-brand-blue border border-brand-blue/10 font-bold text-[9px] tracking-wider uppercase px-3 py-0.5 rounded-full">
                        Verified Information Collection
                      </span>
                      <span className="text-[10px] font-extrabold text-[#FF1493] uppercase tracking-wider mt-0.5">
                        Verified Member Information Collection Portal
                      </span>
                    </div>
                    <p className="text-slate-500 font-bold text-xs mt-4 leading-relaxed max-w-[280px]">
                      This portal is designed to collect and verify financial information from members for planning, coordination, and support purposes.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    setClaimMobile('');
                    setClaimResult(null);
                    setStage('claim_check');
                  }}
                  className="w-full mt-6 h-13 rounded-2xl text-xs font-black shadow-lg shadow-brand-blue/15 hover:shadow-brand-blue/25 bg-gradient-to-r from-brand-blue to-[#FF1493] text-white hover:opacity-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest hover:translate-y-[-1.5px] active:translate-y-0"
                >
                  Access Registry Portal
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
            {/* About HCRS & Our Mission Section - Redesigned to exact specifications */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-6xl mx-auto pt-6 text-left">
              
              {/* Left Column (lg:col-span-5): ABOUT HCRS */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-5 space-y-6 flex flex-col justify-between"
              >
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium relative h-full flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-brand-magenta/5 to-transparent rounded-full pointer-events-none" />
                  
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-brand-magenta/5 text-brand-magenta px-4 py-1.5 rounded-full border border-brand-magenta/10">
                      <Building2 className="w-4 h-4" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">About HCRS • ഞങ്ങളെക്കുറിച്ച്</span>
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">
                      About <span className="text-brand-magenta">HCRS</span>
                    </h2>

                    <div className="space-y-5 text-sm text-slate-600 font-semibold leading-relaxed">
                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <Building2 className="w-5 h-5 text-brand-magenta" />
                        </div>
                        <p className="pt-1 text-[13px] md:text-sm font-bold text-slate-700">
                          <strong className="text-slate-950 font-black">HIGHRICH COMMUNITY REVIVAL SOCIETY (HCRS)</strong> is a legally registered non-profit organization formed in 2025 in Thrissur, Kerala.
                        </p>
                      </div>

                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <Users className="w-5 h-5 text-brand-blue" />
                        </div>
                        <p className="pt-1 text-[13px] md:text-sm font-bold text-slate-700">
                          HCRS was established as a <strong className="text-slate-950 font-black">revival committee</strong> for the members of Highrich Online Shoppe.
                        </p>
                      </div>

                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <HeartHandshake className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="pt-1 text-[13px] md:text-sm font-bold text-slate-700">
                          Efforts are ongoing to support affected community members through welfare initiatives, awareness programs, community support activities, and <strong className="text-slate-950 font-black">lawful assistance mechanisms</strong>.
                        </p>
                      </div>

                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="pt-1 text-[13px] md:text-sm font-bold text-slate-700">
                          HCRS remains committed to helping members <strong className="text-slate-950 font-black">rebuild confidence, stability, and opportunities</strong> through collective action.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Registered Status Sub-Card */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Kerala Division</p>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider mt-1.5">Registered Non-Profit</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column (lg:col-span-7): OUR MISSION & CARD MATRIX */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="lg:col-span-7 space-y-6"
              >
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium h-full flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-brand-blue/5 text-brand-blue px-4 py-1.5 rounded-full border border-brand-blue/10">
                      <Target className="w-4 h-4" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">Our Society Mission • ലക്ഷ്യങ്ങൾ</span>
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">
                      Our <span className="text-brand-blue">Mission</span>
                    </h2>

                    <p className="text-sm font-bold text-slate-500 leading-relaxed">
                      Our society works to restore trust and rebuild livelihoods through:
                    </p>

                    {/* Mission Core Focus Cards Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        {
                          title: "Community Welfare",
                          titleMl: "കമ്മ്യൂണിറ്റി ക്ഷേമം",
                          icon: Users,
                          iconColor: "text-blue-500",
                          bgColor: "bg-blue-50/70 border-blue-100/80"
                        },
                        {
                          title: "Medical Assistance",
                          titleMl: "ചികിത്സാ സഹായം",
                          icon: Activity,
                          iconColor: "text-rose-500",
                          bgColor: "bg-rose-50/70 border-rose-100/80"
                        },
                        {
                          title: "Legal Awareness",
                          titleMl: "നിയമ ബോധവൽക്കരണം",
                          icon: Gavel,
                          iconColor: "text-amber-500",
                          bgColor: "bg-amber-50/70 border-amber-100/80"
                        },
                        {
                          title: "Social Support",
                          titleMl: "സാമൂഹിക പിന്തുണ",
                          icon: HeartHandshake,
                          iconColor: "text-emerald-500",
                          bgColor: "bg-emerald-50/70 border-emerald-100/80"
                        },
                        {
                          title: "Financial Guidance",
                          titleMl: "സാമ്പത്തിക മാർഗ്ഗനിർദ്ദേശം",
                          icon: Briefcase,
                          iconColor: "text-purple-500",
                          bgColor: "bg-purple-50/70 border-purple-100/80"
                        }
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div 
                            key={item.title}
                            className={`p-4.5 rounded-2xl border-2 ${item.bgColor} flex flex-col justify-between transition-all hover:scale-[1.02] cursor-default`}
                          >
                            <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 shrink-0 mb-3`}>
                              <Icon className={`w-4 h-4 ${item.iconColor}`} />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-[#111111] text-xs leading-snug uppercase tracking-tight">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-extrabold tracking-wide mt-1">
                                {item.titleMl}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Attention Priority Segment */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="bg-gradient-to-r from-pink-500/5 to-rose-500/5 border-2 border-pink-100/80 rounded-[28px] p-5 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                      <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-brand-magenta/5 rounded-full blur-xl pointer-events-none" />
                      
                      <div className="space-y-1.5 max-w-sm">
                        <div className="inline-flex items-center gap-1.5 text-brand-magenta font-black uppercase text-[10px] tracking-widest leading-none">
                          <BadgeAlert className="w-3.5 h-3.5" />
                          Special Attention segment
                        </div>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed pt-1">
                          Our society pays a prioritized focus and active attention to:
                        </p>
                      </div>

                      {/* Pill list targeting priority members */}
                      <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full sm:w-auto">
                        {[
                          { lbl: "Women", lblMl: "വനിതകൾ", icon: Heart },
                          { lbl: "Widows", lblMl: "വിധവകൾ", icon: Shield },
                          { lbl: "Senior Citizens", lblMl: "മുതിർന്ന പൗരന്മാർ", icon: Award },
                          { lbl: "Families facing hardships", lblMl: "നിരാലംബർ", icon: Users }
                        ].map((priority) => {
                          const PriIcon = priority.icon;
                          return (
                            <div 
                              key={priority.lbl}
                              className="bg-white px-3.5 py-2.5 rounded-xl border border-pink-150/80 flex items-center gap-2 shadow-sm shrink-0"
                            >
                              <PriIcon className="w-3.5 h-3.5 text-brand-magenta shrink-0" />
                              <div>
                                <p className="font-extrabold text-[10px] text-slate-850 leading-none uppercase">{priority.lbl}</p>
                                <p className="text-[9px] font-black text-slate-400 mt-0.5">{priority.lblMl}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>

            </div>

            {/* OUR KEY ACTIVITIES SECTION */}
            <section className="space-y-8 max-w-6xl mx-auto pt-16">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-brand-blue/5 text-brand-blue px-4 py-1.5 rounded-full border border-brand-blue/10">
                  <Activity className="w-4 h-4 text-brand-blue" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Operational Focus • പ്രധാന പ്രവർത്തനങ്ങൾ</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
                  Our Key <span className="text-brand-blue">Activities</span>
                </h2>
                <p className="text-slate-500 font-semibold text-xs md:text-sm max-w-xl mx-auto">
                  We are actively engaged in structured initiatives and programs to restore the community.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1 */}
                <motion.div 
                  whileHover={{ y: -6 }}
                  className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <IdCard className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Membership Campaigns
                    </h3>
                    <p className="text-slate-600 font-semibold text-xs md:text-sm leading-relaxed">
                      HCRS Membership Campaigns unite members and supporters for welfare, awareness, revival initiatives, and community participation.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between text-blue-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">Uniting Members</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                </motion.div>

                {/* Card 2 */}
                <motion.div 
                  whileHover={{ y: -6 }}
                  className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Welfare Activities
                    </h3>
                    <p className="text-slate-600 font-semibold text-xs md:text-sm leading-relaxed">
                      Supporting members through welfare programs, awareness campaigns, and compassionate assistance initiatives.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between text-rose-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">Active Relief</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  </div>
                </motion.div>

                {/* Card 3 */}
                <motion.div 
                  whileHover={{ y: -6 }}
                  className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Coins className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Financial Support
                    </h3>
                    <p className="text-slate-600 font-semibold text-xs md:text-sm leading-relaxed">
                      Providing support initiatives for education, medical needs, emergencies, and livelihood recovery efforts.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between text-amber-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">Essential Recovery</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                </motion.div>
              </div>

              {/* Dynamic Galleries Preview Section */}
              <div className="space-y-8 pt-8">
                {[
                  {
                    category: 'Membership Campaigns',
                    title: 'Membership Campaigns Archive',
                    desc: 'Sneak peek into physical membership campaigns, active recruitment zones, and community interactions.',
                    icon: <IdCard className="w-5 h-5 text-blue-500" />,
                    bgColor: 'bg-blue-50/20 border-blue-100/60',
                    btnColor: 'text-blue-600 hover:bg-blue-50 border-blue-200'
                  },
                  {
                    category: 'Welfare Activities',
                    title: 'Welfare Activities Photo Grid',
                    desc: 'Capturing moments of direct relief campaigns, compassionate delivery work, and home visits.',
                    icon: <HeartHandshake className="w-5 h-5 text-rose-500" />,
                    bgColor: 'bg-rose-50/20 border-rose-100/60',
                    btnColor: 'text-rose-600 hover:bg-rose-50 border-rose-200'
                  },
                  {
                    category: 'Financial Support',
                    title: 'Financial Support & Activity Gallery',
                    desc: 'Transparency and active record checking of educational support, emergency medical disbursements.',
                    icon: <Coins className="w-5 h-5 text-amber-500" />,
                    bgColor: 'bg-amber-50/20 border-amber-100/60',
                    btnColor: 'text-amber-600 hover:bg-amber-50 border-amber-200'
                  }
                ].map((act) => {
                  const sectionImages = gallery.filter(img => img.category === act.category).slice(0, 6);
                  return (
                    <div 
                      key={act.category} 
                      className={`p-6 md:p-8 rounded-[32px] border-2 bg-white shadow-premium text-left space-y-6 ${act.bgColor}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-150 flex items-center justify-center shrink-0">
                            {act.icon}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{act.title}</h3>
                            <p className="text-[11px] text-slate-500 font-semibold">{act.desc}</p>
                          </div>
                        </div>

                        <Button 
                          onClick={onGalleryClick}
                          className={`rounded-xl h-9 text-[10px] font-black uppercase tracking-wider px-4 bg-white border shadow-sm hover:shadow-md transition-all ${act.btnColor}`}
                        >
                          View All Photos
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>

                      {sectionImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
                          {sectionImages.map((img, i) => (
                            <motion.div
                              key={img.url + i}
                              whileHover={{ y: -3 }}
                              onClick={onGalleryClick}
                              className="aspect-square bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative cursor-pointer group shadow-sm"
                            >
                              <img 
                                src={img.url} 
                                alt={img.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5 backdrop-blur-[1px]">
                                <p className="text-[9px] font-extrabold text-white uppercase tracking-tight line-clamp-2 leading-tight">
                                  {img.title}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 bg-white/40 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                          <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Preview Gallery Empty</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* OUR JOURNEY SECTION */}
            <section className="space-y-12 max-w-5xl mx-auto pt-20 pb-10">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-brand-magenta/5 text-brand-magenta px-4 py-1.5 rounded-full border border-brand-magenta/10">
                  <Compass className="w-4 h-4 text-brand-magenta" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider">The Timeline • ചരിത്രവഴി</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
                  Our <span className="text-brand-magenta">Journey</span>
                </h2>
                <p className="text-slate-500 font-semibold text-xs md:text-sm max-w-xl mx-auto">
                  A timeline tracking our establishment, unity, and dedicated ongoing community efforts.
                </p>
              </div>

              {/* Timeline graphic wrapper */}
              <div className="relative border-l-2 border-slate-200/80 ml-4 md:ml-32 space-y-12 text-left">
                {/* Milestone 1 */}
                <div className="relative pl-8 sm:pl-12 group">
                  {/* Glowing Node */}
                  <div className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-slate-950 border-4 border-brand-magenta group-hover:scale-125 transition-transform shadow-md" />
                  
                  {/* Content Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Year/Signpost (Left alignment offset) */}
                    <div className="md:col-span-3 -ml-4 md:-ml-40 md:text-right pr-0 md:pr-10">
                      <span className="inline-block bg-slate-950 text-brand-magenta font-black font-mono text-xs md:text-sm px-4.5 py-1.5 rounded-full border border-brand-magenta/10 shadow-sm uppercase tracking-widest">
                        2025 • ESTD
                      </span>
                    </div>
                    {/* Card container */}
                    <div className="md:col-span-9 bg-white border border-slate-150 p-6 md:p-8 rounded-[28px] shadow-premium hover:border-brand-magenta/30 transition-all duration-300">
                      <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-magenta" />
                        Foundation In Thrissur
                      </h3>
                      <p className="text-slate-600 font-bold text-xs md:text-sm leading-relaxed">
                        The Highrich Community Revival Society (HCRS) was formed in 2025 in Thrissur, Kerala.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div className="relative pl-8 sm:pl-12 group">
                  {/* Glowing Node */}
                  <div className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-slate-950 border-4 border-brand-blue group-hover:scale-125 transition-transform shadow-md" />
                  
                  {/* Content Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Year/Signpost */}
                    <div className="md:col-span-3 -ml-4 md:-ml-40 md:text-right pr-0 md:pr-10">
                      <span className="inline-block bg-slate-950 text-brand-blue font-black font-mono text-xs md:text-sm px-4 py-1.5 rounded-full border border-brand-blue/10 shadow-sm uppercase tracking-wider">
                        OUR FOCUS
                      </span>
                    </div>
                    {/* Card container */}
                    <div className="md:col-span-9 bg-white border border-slate-150 p-6 md:p-8 rounded-[28px] shadow-premium hover:border-brand-blue/30 transition-all duration-300">
                      <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-blue" />
                        Unity & Welfare Mobilization
                      </h3>
                      <p className="text-slate-600 font-bold text-xs md:text-sm leading-relaxed">
                        The organization was established to unite members, promote community welfare, and provide support initiatives during difficult circumstances.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div className="relative pl-8 sm:pl-12 group">
                  {/* Glowing Node */}
                  <div className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-slate-950 border-4 border-emerald-500 group-hover:scale-125 transition-transform shadow-md" />
                  
                  {/* Content Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Year/Signpost */}
                    <div className="md:col-span-3 -ml-4 md:-ml-40 md:text-right pr-0 md:pr-10">
                      <span className="inline-block bg-slate-950 text-emerald-400 font-black font-mono text-xs md:text-sm px-4.5 py-1.5 rounded-full border border-emerald-500/10 shadow-sm uppercase tracking-wider">
                        ONGOING
                      </span>
                    </div>
                    {/* Card container */}
                    <div className="md:col-span-9 bg-white border border-slate-150 p-6 md:p-8 rounded-[28px] shadow-premium hover:border-emerald-500/30 transition-all duration-300">
                      <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Continuous Support Platform
                      </h3>
                      <p className="text-slate-600 font-bold text-xs md:text-sm leading-relaxed">
                        Today HCRS continues to serve as a platform for awareness, welfare, support, and community engagement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* OUR VISION & FOCUS AREAS SECTION */}
            <section className="space-y-12 max-w-6xl mx-auto pt-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* OUR VISION (Left 5-cols) */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="lg:col-span-5 relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-[40px] p-8 md:p-10 border-2 border-slate-800 shadow-premium flex flex-col justify-between overflow-hidden text-left"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,20,147,0.08),transparent_40%)] pointer-events-none" />
                  <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="space-y-6 relative max-w-sm">
                    <div className="inline-flex items-center gap-2 bg-white/5 text-brand-magenta px-4 py-1.5 rounded-full border border-white/10">
                      <Eye className="w-4 h-4 text-brand-magenta" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-200">Our society Vision • ദർശനം</span>
                    </div>

                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                      Our <span className="text-white">Vision</span>
                    </h2>

                    <p className="text-slate-100 font-bold text-sm leading-relaxed pt-2">
                      To build empowered communities where every individual enjoys dignity, support, opportunity, and access to essential resources.
                    </p>
                  </div>

                  <div className="pt-8 border-t border-slate-850 mt-8 flex items-center gap-4 relative">
                    <div className="w-11 h-11 rounded-xl bg-brand-magenta/10 text-brand-magenta flex items-center justify-center border border-brand-magenta/20 shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">Empowerment First</h4>
                      <p className="text-[10px] text-slate-400 font-extrabold tracking-wider mt-0.5">Dignity • Opportunity • Support</p>
                    </div>
                  </div>
                </motion.div>

                {/* FOCUS AREAS (Right 7-cols) */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="lg:col-span-7 bg-white border-2 border-slate-100 p-8 md:p-10 rounded-[36px] shadow-premium flex flex-col justify-between text-left"
                >
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-brand-blue/5 text-brand-blue px-4 py-1.5 rounded-full border border-brand-blue/10">
                      <Target className="w-4 h-4 text-brand-blue" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">Social Pillars • സുപ്രധാന ലക്ഷ്യങ്ങൾ</span>
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">
                      Focus <span className="text-brand-blue">Areas</span>
                    </h2>

                    <p className="text-slate-500 font-semibold text-xs md:text-sm">
                      We focus on critical development blocks to foster societal health and security.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {[
                        {
                          num: "01",
                          title: "Social Welfare",
                          titleMl: "സാമൂഹിക ക്ഷേമം",
                          desc: "Supporting health, education, and livelihood initiatives.",
                          icon: Heart,
                          color: "bg-rose-50 border-rose-100 text-rose-500"
                        },
                        {
                          num: "02",
                          title: "Women & Youth Development",
                          titleMl: "സ്ത്രീ-യുവജന ക്ഷേമം",
                          desc: "Encouraging participation, empowerment, and leadership.",
                          icon: Users,
                          color: "bg-purple-50 border-purple-100 text-purple-500"
                        },
                        {
                          num: "03",
                          title: "Community Support",
                          titleMl: "കമ്മ്യൂണിറ്റി പിന്തുണ",
                          desc: "Building stronger support networks and crisis response structures.",
                          icon: HeartHandshake,
                          color: "bg-emerald-50 border-emerald-100 text-emerald-500"
                        },
                        {
                          num: "04",
                          title: "Awareness Programs",
                          titleMl: "ബോധവൽക്കരണം",
                          desc: "Promoting education, legal orientation, and information sharing.",
                          icon: Compass,
                          color: "bg-blue-50 border-blue-100 text-blue-500"
                        }
                      ].map((area) => {
                        const AreaIcon = area.icon;
                        return (
                          <div 
                            key={area.title} 
                            className="p-5 bg-slate-50/50 border border-slate-150 rounded-2xl flex items-start gap-4 hover:border-slate-300 transition-all group"
                          >
                            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${area.color} group-hover:scale-110 transition-transform`}>
                              <AreaIcon className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-black font-mono text-slate-400 block tracking-wider uppercase">Area {area.num}</span>
                              <h4 className="text-slate-900 font-extrabold text-sm uppercase leading-tight">{area.title}</h4>
                              <p className="text-[10px] text-brand-magenta font-black uppercase tracking-wider">{area.titleMl}</p>
                              <p className="text-slate-500 text-xs font-bold leading-relaxed pt-1">{area.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* OUR STATE & DISTRICT COMMITTEES SECTION */}
            <section className="space-y-8 max-w-6xl mx-auto pt-20">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-brand-blue/5 text-brand-blue px-4 py-1.5 rounded-full border border-brand-blue/10">
                  <Network className="w-4 h-4 text-brand-blue" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Administrative structure • കമ്മിറ്റികൾ</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
                  State & District <span className="text-brand-blue">Committees</span>
                </h2>
                <p className="text-slate-500 font-semibold text-xs md:text-sm max-w-xl mx-auto">
                  Highrich Community Revival Society operates through State, District, and local leadership teams.
                </p>
              </div>

              <div className="bg-white border-2 border-slate-100 rounded-[36px] p-8 md:p-10 shadow-premium">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
                  {/* Left explanation block */}
                  <div className="lg:col-span-5 space-y-5">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                      <Network className="w-6 h-6 text-brand-magenta" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Structured Coordination
                    </h3>
                    <p className="text-slate-600 font-semibold text-xs md:text-sm leading-relaxed">
                      These committees coordinate welfare initiatives, member support, awareness programs, and community activities to ensure structural efficiency and rapid service delivery.
                    </p>
                    <div className="w-20 h-1 bg-gradient-to-r from-brand-blue to-brand-magenta rounded" />
                  </div>

                  {/* Right 3 core columns */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      {
                        title: "State Leadership",
                        titleMl: "സംസ്ഥാന സമിതി",
                        desc: "Apex planning body formulating state-wide welfare frameworks.",
                        icon: UserCheck,
                        color: "text-brand-magenta bg-brand-magenta/5 border-brand-magenta/10"
                      },
                      {
                        title: "District Committee",
                        titleMl: "ജില്ലാ കമ്മിറ്റികൾ",
                        desc: "District divisions managing localized member outreach.",
                        icon: Building2,
                        color: "text-brand-blue bg-brand-blue/5 border-brand-blue/10"
                      },
                      {
                        title: "Team Network",
                        titleMl: "ഗ്രൂപ്പ് ശൃംഖല",
                        desc: "Grassroots division coordinating instant helpline assistance.",
                        icon: Network,
                        color: "text-emerald-500 bg-emerald-50/70 border-emerald-100"
                      }
                    ].map((item, index) => {
                      const TeamIcon = item.icon;
                      return (
                        <div 
                          key={index} 
                          className="bg-slate-50/50 hover:bg-white border border-slate-150 hover:border-slate-300 transition-all rounded-2xl p-6 flex flex-col justify-between h-full hover:shadow-sm"
                        >
                          <div className="space-y-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.color}`}>
                              <TeamIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm uppercase tracking-tight">{item.title}</h4>
                              <p className="text-[10px] text-brand-magenta font-black uppercase tracking-wider mt-0.5">{item.titleMl}</p>
                            </div>
                          </div>
                          <p className="text-slate-500 text-xs font-semibold leading-relaxed mt-4">
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* HCRS MEMBERSHIP BENEFITS SECTION */}
            <section className="space-y-8 max-w-6xl mx-auto pt-20">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-brand-magenta/5 text-brand-magenta px-4 py-1.5 rounded-full border border-brand-magenta/10">
                  <Award className="w-4 h-4 text-brand-magenta" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Member Privileges • അംഗത്വ ആനുകൂല്യങ്ങൾ</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
                  HCRS Membership <span className="text-brand-magenta">Benefits</span>
                </h2>
                <p className="text-slate-500 font-semibold text-xs md:text-sm max-w-xl mx-auto">
                  By joining our registered collective, you unlock vital community support systems, legal standing, and advocacy channels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Benefit 1 */}
                <motion.div 
                  whileHover={{ y: -6 }}
                  className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Reclaiming Livelihoods
                      </h3>
                      <p className="text-[10px] text-brand-blue font-black uppercase tracking-wider mt-0.5">
                        ജീവനമാർഗ്ഗ പുനരുദ്ധാരണം
                      </p>
                    </div>
                    <p className="text-slate-600 font-semibold text-xs md:text-sm leading-relaxed">
                      Working collectively to support members through awareness, welfare initiatives, and community revival efforts.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between text-blue-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">Life Recovery Block</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                </motion.div>

                {/* Benefit 2 */}
                <motion.div 
                  whileHover={{ y: -6 }}
                  className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-brand-magenta/5 to-transparent rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 text-brand-magenta flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Stand For Justice
                      </h3>
                      <p className="text-[10px] text-brand-magenta font-black uppercase tracking-wider mt-0.5">
                        നീതിക്കായുള്ള നിലകൊള്ളൽ
                      </p>
                    </div>
                    <p className="text-slate-600 font-semibold text-xs md:text-sm leading-relaxed">
                      Members can participate in lawful representation efforts, petitions, and community advocacy initiatives.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between text-brand-magenta">
                    <span className="text-[10px] font-black uppercase tracking-wider">Advocacy Standing</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-magenta animate-pulse" />
                  </div>
                </motion.div>

                {/* Benefit 3 */}
                <motion.div 
                  whileHover={{ y: -6 }}
                  className="bg-white border-2 border-slate-100 p-8 rounded-[36px] shadow-premium flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Guaranteed Privacy
                      </h3>
                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mt-0.5">
                        വ്യക്തിവിവര സുരക്ഷിതത്വം
                      </p>
                    </div>
                    <p className="text-slate-600 font-semibold text-xs md:text-sm leading-relaxed">
                      HCRS is committed to protecting member information through secure and responsible data handling practices.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between text-emerald-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">Encrypted Safeguards</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </motion.div>
              </div>
            </section>

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
                  <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-md">For queries regarding registrations, identity verification or the financial context registry.</p>
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
                    "All registration and member registry verification fees are completely non-refundable."
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
                    <Info className="w-7 h-7 text-brand-blue" />
                    മെമ്പർ വിവര രജിസ്ട്രി
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setStage('landing');
                      setClaimResult(null);
                    }} 
                    className="rounded-full w-10 h-10 p-0 hover:bg-slate-100 border-2 border-slate-200 text-slate-600 transition-all"
                  >
                     <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-10 pb-6 px-8 md:px-10">
                {!claimResult ? (
                  <div className="space-y-8">
                    {/* Secure and Trusted Registry Information Block */}
                    <div className="bg-slate-50 border-2 border-slate-150 p-6 rounded-3xl space-y-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                          <Info className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-tight uppercase">Member Financial Information Registry</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-1">
                            <span className="inline-flex bg-brand-blue/5 text-brand-blue border border-brand-blue/10 font-bold text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-full shrink-0">
                              Verified Information Collection
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Verified Member Information Portal</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-600 font-semibold space-y-3 leading-relaxed border-t border-slate-150 pt-4">
                        <p className="font-extrabold text-slate-800">
                          This portal is designed to collect and verify financial information from members for planning, coordination, and support purposes.
                        </p>
                        
                        <div className="space-y-1.5 pl-3 border-l-2 border-brand-blue/30 pb-0.5 mt-2">
                          <p className="text-[10px] font-black text-brand-blue uppercase tracking-wider mb-1">The information collected will help identify:</p>
                          <p className="flex items-start gap-1.5 text-[11px] font-bold text-slate-700">
                            <span className="text-brand-magenta shrink-0">•</span> Members facing urgent financial difficulties
                          </p>
                          <p className="flex items-start gap-1.5 text-[11px] font-bold text-slate-700">
                            <span className="text-brand-magenta shrink-0">•</span> Members requiring priority consideration for future support initiatives
                          </p>
                          <p className="flex items-start gap-1.5 text-[11px] font-bold text-slate-700">
                            <span className="text-brand-magenta shrink-0">•</span> Members who wish to continue participating in future business opportunities
                          </p>
                          <p className="flex items-start gap-1.5 text-[11px] font-bold text-slate-700">
                            <span className="text-brand-magenta shrink-0">•</span> Members who prefer settlement and closure of their financial involvement upon resolution
                          </p>
                        </div>
                        
                        <p className="text-slate-605 text-[11px]">
                          The information submitted through this registry will be compiled, verified, and may be shared with the Highrich Management and Legal Team for reference, planning, verification, and member support activities.
                        </p>
                        
                        <p className="text-slate-605 text-[11px]">
                          This registry is intended solely for information collection, member verification, and support planning purposes.
                        </p>
                        
                        <p className="bg-brand-blue/[0.03] border border-brand-blue/10 p-3.5 rounded-xl text-[10px] text-slate-600 font-bold leading-normal">
                          <strong>Note:</strong> Submission of information does not constitute a legal claim, compensation claim, or guarantee of payment.
                        </p>
                      </div>

                      <div className="bg-pink-50 border-2 border-pink-100 p-4 rounded-xl mt-4">
                        <p className="text-xs font-extrabold text-slate-800 leading-relaxed">
                          വിവര രജിസ്ട്രി ഫോം ആക്സസ് ചെയ്യുന്നതിനായി ദയവായി നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത മൊബൈൽ നമ്പർ നൽകി വേരിഫൈ ചെയ്യുക:
                          <span className="text-[10px] text-brand-magenta block mt-1.5 uppercase font-black tracking-wider">Please enter your registered mobile number to check eligibility and proceed to the registry.</span>
                        </p>
                      </div>
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
                          // Check if they already submitted a claim
                          let claimsSnap;
                          let submitted = false;
                          try {
                            const claimsQ = query(collection(db, 'claims'), where('userMobile', '==', claimMobile.trim()), limit(1));
                            claimsSnap = await getDocs(claimsQ);
                            if (claimsSnap && !claimsSnap.empty) {
                              submitted = true;
                            }
                          } catch (err: any) {
                            console.error("Claims query error:", err);
                            // If index is missing or query fails, we can log and fallback to continue check
                          }
                          setUserHasSubmittedClaim(submitted);

                          const q = query(collection(db, 'users'), where('mobile', '==', claimMobile.trim()), limit(1));
                          const querySnapshot = await getDocs(q);
                          if (!querySnapshot.empty) {
                            const foundUser = querySnapshot.docs[0].data();
                            const isPending = foundUser.status === 'pending';
                            const isRenewalPending = !!foundUser.renewalPending;
                            
                            // Check if they are expired
                            const isUserExpired = isRenewalPending || (() => {
                              const exp = foundUser.expiryDate;
                              if (!exp) {
                                const reg = foundUser.registrationDate;
                                if (!reg) return false;
                                const regD = reg.toDate ? reg.toDate() : (reg.seconds ? new Date(reg.seconds * 1000) : new Date(reg));
                                if (isNaN(regD.getTime())) return false;
                                const expD = new Date(regD);
                                expD.setFullYear(expD.getFullYear() + 1);
                                return expD.getTime() < Date.now();
                              }
                              const d = exp.toDate ? exp.toDate() : (exp.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
                              return isNaN(d.getTime()) ? false : d.getTime() < Date.now();
                            })();

                            if (isPending) {
                              setClaimUserStatus('pending');
                              toast.info('അംഗത്വം അപ്പ്രൂവൽ പ്രക്രിയയിലാണ്! (Membership approval is pending.)');
                            } else if (isRenewalPending) {
                              setClaimUserStatus('renewal_pending');
                              toast.info('അംഗത്വം റിന്യൂവൽ അപ്പ്രൂവൽ പ്രക്രിയയിലാണ്! (Renewal approval is pending.)');
                            } else if (isUserExpired) {
                              setClaimUserStatus('expired');
                              toast.warning('മെമ്പർഷിപ്പ് കാലാവധി കഴിഞ്ഞിരിക്കുന്നു! (Membership validity has expired!)');
                            } else {
                              setClaimUserStatus('active');
                              toast.success('മൊബൈൽ നമ്പർ കണ്ടെത്തി! നിങ്ങളുടെ Password (PIN) അടിക്കുക.');
                            }

                            setClaimResult('registered');
                          } else {
                            toast.info('രജിസ്റ്റർ ചെയ്യാത്ത മൊബൈൽ നമ്പർ! പുതിയ മെമ്പർഷിപ്പിനായി ₹200 പെയ്മെന്റിലേക്ക് ഓട്ടോമാറ്റിക് ആയി മാറുന്നു...');
                            setClaimResult('not_found');
                            setTimeout(() => {
                              onRegisterWithMobile?.(claimMobile);
                            }, 1500);
                          }
                        } catch (e: any) {
                          console.error("Verification error:", e);
                          const errMsg = e?.message || String(e);
                          toast.error(`വേരിഫിക്കേഷൻ പരാജയപ്പെട്ടു: ${errMsg}. ദയവായി വീണ്ടും ശ്രമിക്കുക.`);
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
                        നിലവിലുള്ള ഒഫീഷ്യൽ മെമ്പർ!
                      </h3>
                      <p className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider mt-2">Please enter Secure PIN to access your ID Card and Information Registry.</p>
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

                    {/* Accurate Status Display */}
                    {claimUserStatus === 'pending' && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-1.5 text-slate-850 font-semibold text-xs leading-relaxed font-sans">
                        <div className="flex items-center gap-1.5 text-amber-900 font-extrabold uppercase text-[10px] tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                          അംഗത്വ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു (Pending Approval)
                        </div>
                        <p className="text-slate-600 font-medium">
                          നിങ്ങളുടെ പുതിയ മെമ്പർഷിപ്പ് രജിസ്ട്രേഷൻ അഡ്മിൻ പാനലിൽ വെരിഫിക്കേഷനിലാണ്. അഡ്മിൻ അപ്പ്രൂവ് ചെയ്തതിന് ശേഷം മാത്രമേ ക്ലെയിം വിവരങ്ങൾ സമർപ്പിക്കാൻ സാധിക്കുകയുള്ളൂ.
                        </p>
                      </div>
                    )}

                    {claimUserStatus === 'renewal_pending' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-1.5 text-slate-850 font-semibold text-xs leading-relaxed font-sans">
                        <div className="flex items-center gap-1.5 text-orange-900 font-extrabold uppercase text-[10px] tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                          റിന്യൂവൽ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു (Renewal Pending)
                        </div>
                        <p className="text-slate-600 font-medium">
                          നിങ്ങൾ സബ്മിറ്റ് ചെയ്ത ₹100 റിന്യൂവൽ പേയ്മെന്റ് വെരിഫൈ ചെയ്യാൻ ബാക്കിയാണ്. അഡ്മിൻ ഇത് അപ്പ്രൂവ് ചെയ്തയുടൻ ക്ലെയിം പോർട്ടലിൽ പ്രവേശിക്കാൻ സാധിക്കും.
                        </p>
                      </div>
                    )}

                    {claimUserStatus === 'expired' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1.5 text-slate-850 font-semibold text-xs leading-relaxed font-sans">
                        <div className="flex items-center gap-1.5 text-rose-800 font-extrabold uppercase text-[10px] tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          മെമ്പർഷിപ്പ് കാലാവധി കഴിഞ്ഞിരിക്കുന്നു (Membership Expired)
                        </div>
                        <p className="text-slate-600 font-medium">
                          നിങ്ങളുടെ മെമ്പർഷിപ്പ് കാലാവധി അവസാനിച്ചിരിക്കുന്നു. ക്ലെയിം വിവരങ്ങൾ രേഖപ്പെടുത്താൻ ആദ്യം ലോഗിൻ ചെയ്ത് ₹100 അടച്ചു അംഗത്വം പുതുക്കേണ്ടതുണ്ട്.
                        </p>
                      </div>
                    )}

                    {claimUserStatus === 'active' && (
                      <div className="space-y-3">
                        <div className="bg-green-50/40 border border-green-150 rounded-2xl p-4 space-y-1 my-2 text-slate-800 font-medium text-xs leading-relaxed font-sans">
                          <div className="flex items-center gap-1.5 text-green-800 font-extrabold uppercase text-[10px] tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            മെമ്പർഷിപ്പ് ആക്ടീവ് ആണ് (Active Official Member)
                          </div>
                          <p className="text-slate-500 text-[11px] font-medium leading-normal">
                            ക്ലെയിം വിവരങ്ങൾ രേഖപ്പെടുത്തുന്നതിനായി നിങ്ങളുടെ രഹസ്യ PIN നൽകാവുന്നതാണ്.
                          </p>
                        </div>

                        {userHasSubmittedClaim && (
                          <div className="bg-amber-50 border-2 border-amber-200 text-amber-900 rounded-2xl p-4 space-y-1.5 text-xs font-semibold animate-pulse shadow-sm">
                            <p className="font-extrabold text-[11px] text-amber-850 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 block" />
                              പ്രധാന അറിയിപ്പ് (Important Notice)
                            </p>
                            <p className="leading-relaxed text-slate-705 font-bold text-xs">
                              താങ്കളുടെ ഫോൺ വഴിയുള്ള സപ്പോർട്ട് ക്ലൈം ഫോം വിജയകരമായി ഫിൽ ചെയ്തു കഴിഞ്ഞതാണ്. ഇനി നിങ്ങളുടെ കുടുംബത്തിലെ പരമാവധി മൂന്ന് (3) പേർക്ക് കൂടി മാത്രമേ വിവരങ്ങൾ രേഖപ്പെടുത്താൻ അവസരമുള്ളൂ.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

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
                      ഈ മൊബൈൽ നമ്പർ നിലവിൽ ഇതിൽ രജിസ്റ്റർ ചെയ്തിട്ടില്ല. രജിസ്റ്റർ ചെയ്ത മെമ്പർമാർക്ക് മാത്രമേ വിവര രജിസ്ട്രി ഫോം നൽകാൻ സാധിക്കുകയുള്ളൂ. ദയവായി പുതിയ മെമ്പർഷിപ്പ് എടുത്ത് ₹200 പെയ്മെന്റിലേക്ക് മാറുക.
                      <br/>
                      <span className="text-[10px] text-slate-400 font-black block mt-3 uppercase tracking-wider leading-relaxed">This mobile number is not registered. Only registered active members can access the information registry. Please register as a new member with a payment of ₹200 first.</span>
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
