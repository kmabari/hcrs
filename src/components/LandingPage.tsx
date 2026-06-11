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
    <div className="min-h-screen bg-white text-[#222222] font-sans selection:bg-[#0A2E5C]/10 relative overflow-x-hidden pb-12">
      {/* Absolute brand ambient graphics deleted for professional flat style */}

      {/* Navigation Bar */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm px-4 md:px-8 py-3.5 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-200 group-hover:scale-105 transition-all">
              <Logo size="sm" className="h-[32px] w-auto" />
            </div>
            <div>
              <h1 className="text-xs font-semibold text-slate-900 uppercase tracking-wider leading-none">HCRS Portal</h1>
              <p className="text-[9px] font-bold text-[#D91E63] uppercase tracking-widest mt-1">Kerala Division</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[11px] font-semibold uppercase tracking-wider text-slate-650 hover:text-[#0A2E5C] transition-colors">
              {t('nav_home', 'Home')}
            </button>
            <button onClick={onGalleryClick} className="text-[11px] font-bold uppercase tracking-wider text-[#D91E63] hover:text-[#D91E63]/80 transition-colors flex items-center gap-1.5">
              {t('nav_archives', 'Archives')}
              <span className="w-1.5 h-1.5 rounded-full bg-[#D91E63] animate-pulse" />
            </button>
            <button onClick={() => document.getElementById('contact-us')?.scrollIntoView({ behavior: 'smooth' })} className="text-[11px] font-semibold uppercase tracking-wider text-slate-650 hover:text-[#0A2E5C] transition-colors">
              {t('nav_contact', 'Contact')}
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <LanguageSwitcher />
            <Button 
              variant="outline" 
              onClick={onLoginClick}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-[10px] h-10 px-4 transition-all shadow-sm"
            >
              {t('nav_sign_in', 'Sign In')}
            </Button>
            <Button 
              className="bg-[#0A2E5C] hover:bg-[#1E5AA8] text-white rounded-[10px] px-5 h-10 font-bold uppercase text-[11px] tracking-wider shadow-sm transition-all border border-[#0A2E5C]"
              onClick={onRenew}
            >
              {t('nav_get_id_card', 'Get ID Card')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Showcase / Hero Cover - Government Portal Style */}
      <div className="w-full max-w-6xl mx-auto pt-24 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative bg-[#F5F7FA] rounded-[20px] p-8 md:p-14 overflow-hidden border border-slate-200 shadow-sm"
        >
          {/* Flat Grid Layer */}
          <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Core Content */}
          <div className="relative flex flex-col items-center text-center">
            
            {/* Top Registration Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 px-5 py-2 rounded-full shadow-sm mb-8 transition-all cursor-default"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <span className="font-bold text-[10px] md:text-xs text-[#0A2E5C] uppercase tracking-wider">
                {t('hero_reg_badge', 'Govt. Registered Society • Reg No: TSR/TC/93/2025')}
              </span>
            </motion.div>
 
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="p-3 bg-white shadow-sm rounded-[12px] border border-slate-200 mb-8"
            >
              <Logo className="scale-100" />
            </motion.div>

            {/* Main Title & Subtitle */}
            <div className="max-w-4xl space-y-4 mb-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0A2E5C] tracking-tight uppercase leading-[1.2]">
                {t('hero_title_1', 'HIGHRICH COMMUNITY')}<br />
                <span className="text-[#D91E63]">
                  {t('hero_title_2', 'REVIVAL SOCIETY')}
                </span> (HCRS)
              </h1>
              <p className="text-slate-650 font-normal text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                {t('hero_subtitle', 'A Registered Society Committed To Reviving & Supporting The Highrich Community')}
              </p>
            </div>

            {/* Horizontal Line divider */}
            <div className="w-full max-w-xs h-px bg-slate-200 mb-10" />

            {/* Core Pillars / Professional Icons Grid */}
            <div className="w-full max-w-5xl">
              <p className="text-[10px] md:text-xs font-bold text-[#D91E63] uppercase tracking-wider mb-6">
                {t('hero_core_pillars', 'Our Core Pillars')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                {[
                  {
                    key: "community",
                    titleDefault: "Community Welfare",
                    descDefault: "Fostering kinship, solidarity and mutual group communication among all members.",
                    icon: Users,
                    color: "text-[#0A2E5C] bg-[#0A2E5C]/10 border-[#0A2E5C]/20"
                  },
                  {
                    key: "revival",
                    titleDefault: "Revival Efforts",
                    descDefault: "Rebuilding community confidence, outlining dynamic revival strategies, and restoring legal clarity.",
                    icon: Sparkles,
                    color: "text-[#1E5AA8] bg-[#1E5AA8]/10 border-[#1E5AA8]/20"
                  },
                  {
                    key: "support",
                    titleDefault: "Medical & Social Support",
                    descDefault: "Active social welfare initiatives, essential educational support, and continuous medical aid guidance.",
                    icon: HeartHandshake,
                    color: "text-[#D91E63] bg-[#D91E63]/10 border-[#D91E63]/20"
                  },
                  {
                    key: "legal",
                    titleDefault: "Legal Assistance",
                    descDefault: "Providing lawful help mechanisms, structured representation, and protecting member interests in forums.",
                    icon: Shield,
                    color: "text-emerald-700 bg-emerald-50 border-emerald-150"
                  }
                ].map((pillar, i) => {
                  const IconComponent = pillar.icon;
                  return (
                    <motion.div
                      key={pillar.key}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm hover:border-[#1E5AA8]/40 transition-[border-color,box-shadow] duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center border ${pillar.color} mb-4 shrink-0`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <h3 className="text-[#222222] font-semibold text-sm md:text-base leading-tight uppercase">
                          {t(`pillar_${pillar.key}_title`, pillar.titleDefault)}
                        </h3>
                      </div>
                      <p className="text-slate-600 text-xs font-normal leading-relaxed mt-2.5">
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
                  className="max-w-4xl mx-auto w-full bg-white border-l-4 border-[#0A2E5C] border-y border-r border-slate-200 rounded-[10px] p-6 md:p-8 shadow-sm relative overflow-hidden transition-all duration-300 text-left"
                  onMouseEnter={() => {
                    setIsAutoPlaying(false);
                    setUserInteracted(true);
                  }}
                  onTouchStart={() => {
                    setIsAutoPlaying(false);
                    setUserInteracted(true);
                  }}
                >
                  {/* Top Accent Strip */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#0A2E5C] to-[#D91E63]" />

                  {/* Header Status & Navigation indicators */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#0A2E5C] text-white font-bold uppercase px-3.5 py-1.5 rounded-[4px] text-[10px] md:text-xs tracking-wider border border-[#0A2E5C] flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          isAutoPlaying ? "bg-emerald-400 animate-pulse" : "bg-white"
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
                          className="bg-slate-100 hover:bg-slate-200 text-slate-750 rounded-full p-2 border border-slate-200 transition-all text-xs"
                          title={isAutoPlaying ? "Auto-scroll Pause" : "Auto-scroll Play"}
                        >
                          {isAutoPlaying ? <Pause className="w-3.5 h-3.5 text-[#0A2E5C]" /> : <Play className="w-3.5 h-3.5 text-[#D91E63]" />}
                        </button>
                      )}
                    </div>

                    {activeAnnouncementsList.length > 1 && (
                      <div className="flex flex-col sm:flex-row items-center gap-3 self-center md:self-auto">
                        {/* Auto scroll status indicator badge */}
                        <span className={cn(
                          "text-[9px] font-bold tracking-wider uppercase px-3 py-1 rounded-[4px] border",
                          isAutoPlaying 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-150 animate-pulse"
                            : "bg-amber-50 text-amber-850 border-amber-150"
                        )}>
                          {isAutoPlaying 
                            ? "🔄 ഓട്ടോ സ്ക്രോൾ വിവരങ്ങൾ (Auto Scrolling)"
                            : "⏸️ താൽക്കാലികമായി നിർത്തിയിരിക്കുന്നു (Paused / Touch to read)"
                          }
                        </span>

                        <span className="bg-slate-50 text-[#222222] font-mono text-xs font-bold px-4 py-1.5 rounded-[4px] border border-slate-200 shadow-sm">
                          UPDATE {currentAnnounceIndex + 1} OF {activeAnnouncementsList.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bullet progress / Dot Indicator page control panel */}
                  {activeAnnouncementsList.length > 1 && (
                    <div className="flex justify-center items-center gap-2 mb-6 bg-slate-50 py-2 px-4 rounded-[6px] border border-slate-200 max-w-sm mx-auto">
                      {activeAnnouncementsList.map((ann, idx) => (
                        <button
                          key={ann.id || idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentAnnounceIndex(idx);
                            setIsAutoPlaying(false);
                            setUserInteracted(true);
                          }}
                          className={cn(
                            "h-2 rounded-full transition-all duration-300 relative",
                            currentAnnounceIndex === idx 
                              ? "w-8 bg-[#0A2E5C]" 
                              : "w-2 bg-slate-300 hover:bg-slate-400"
                          )}
                          title={`Go to update ${idx + 1}`}
                        >
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Slide Content Animation Wrapper for dynamic visible changes */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentAnnounceIndex}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      {currentAnn.imageUrl && (
                        <div className="mb-6 flex justify-center max-w-lg mx-auto overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50 p-1.5 shadow-sm">
                          <img 
                             src={extractDirectImageUrl(currentAnn.imageUrl)} 
                            alt={currentAnn.title}
                            className="w-full h-auto max-h-[450px] object-contain rounded-[8px] transition-transform duration-500 hover:scale-[1.01]"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 text-left">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 rounded-lg bg-[#0A2E5C]/10 text-[#0A2E5C] flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-[#0A2E5C]" />
                          </span>
                          <div>
                            <h3 className="text-lg md:text-xl font-semibold text-[#0A2E5C] uppercase tracking-tight">
                              {currentAnn.title}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Notification Center / അറിയിപ്പ് കോളം</p>
                          </div>
                        </div>
                        {currentAnn.caseDate && (
                          <span className="self-start sm:self-center bg-[#D91E63] text-white px-4 py-1.5 rounded-[4px] font-bold text-xs tracking-wider uppercase font-mono shadow-sm">
                            {currentAnn.caseDate}
                          </span>
                        )}
                      </div>

                      {currentAnn.text && (
                        <div className="text-[#222222] text-xs md:text-sm font-normal leading-relaxed mb-6 whitespace-pre-wrap bg-slate-50 p-4 md:p-6 rounded-[10px] border border-slate-200 shadow-sm text-left">
                          {currentAnn.text}
                        </div>
                      )}

                      {/* Case Related Detailed Specifications */}
                      {(currentAnn.caseNo || currentAnn.caseName || currentAnn.court || currentAnn.advocate || currentAnn.judgeBench) && (
                        <div className="bg-white border border-slate-200 rounded-[10px] p-5 md:p-6 mb-6 space-y-3 shadow-sm relative overflow-hidden text-left">
                          <div className="absolute top-0 right-0 bg-[#D91E63]/10 text-[#D91E63] font-bold font-mono text-[9px] px-3.5 py-1 rounded-bl-[10px] uppercase tracking-wider">
                            Case Profile / കേസ് വിവരങ്ങൾ
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {currentAnn.caseNo && (
                              <div className="flex flex-col gap-1 border-b border-slate-100 pb-2 md:border-b-0 md:pb-0">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">കേസ് നമ്പർ (Case No.):</span>
                                <span className="font-semibold text-slate-900 text-sm font-mono">{currentAnn.caseNo}</span>
                              </div>
                            )}
                            {currentAnn.caseName && (
                              <div className="flex flex-col gap-1 border-b border-slate-100 pb-2 md:border-b-0 md:pb-0">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">ആയ കേസ് (Case Name):</span>
                                <span className="font-semibold text-slate-900 text-sm">{currentAnn.caseName}</span>
                              </div>
                            )}
                            {currentAnn.court && (
                              <div className="flex flex-col gap-1 border-b border-slate-100 pb-2 md:border-b-0 md:pb-0">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">കോടതി (Court):</span>
                                <span className="font-semibold text-slate-900 text-sm">{currentAnn.court}</span>
                              </div>
                            )}
                            {currentAnn.advocate && (
                              <div className="flex flex-col gap-1 border-b border-slate-100 pb-2 md:border-b-0 md:pb-0">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">അഭിഭാഷകൻ (Advocate):</span>
                                <span className="font-semibold text-slate-900 text-sm">{currentAnn.advocate}</span>
                              </div>
                            )}
                            {currentAnn.judgeBench && (
                              <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">ബെഞ്ച് (Judge/Bench):</span>
                                <span className="font-semibold text-slate-900 text-sm leading-tight">{currentAnn.judgeBench}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Multi-announcements dynamic action controllers */}
                  {activeAnnouncementsList.length > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 mt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentAnnounceIndex((prev) => (prev - 1 + activeAnnouncementsList.length) % activeAnnouncementsList.length);
                          setIsAutoPlaying(false);
                          setUserInteracted(true);
                        }}
                        className="text-slate-550 hover:text-[#0A2E5C] hover:bg-slate-50 rounded-lg py-2 px-4 text-xs font-bold flex items-center gap-1.5 transition-all text-left self-stretch sm:self-auto justify-center"
                      >
                        <ChevronLeft className="w-4 h-4 text-[#D91E63]" />
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
                          className="bg-slate-100 text-slate-600 hover:text-slate-905 hover:bg-slate-200 text-xs font-bold px-4 py-2.5 rounded-[10px] border border-slate-350 flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#0A2E5C]" />
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
                          className="bg-[#D91E63] hover:bg-[#B71C1C] text-white font-bold text-xs px-5 py-2.5 rounded-[10px] flex items-center justify-center gap-2 shadow-sm flex-1 sm:flex-initial transition-all"
                        >
                          {t('btn_next_update', "അടുത്ത അപ്ഡേഷൻ (NEXT)")}
                          <ChevronRight className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Primary Action Bento Grid - Redesigned with Corporate style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Enrollment Card */}
              <div
                className="group relative bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm hover:border-[#D91E63]/30 transition-all text-center flex flex-col items-center justify-between min-h-[380px]"
              >
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="bg-[#D91E63]/10 w-14 h-14 rounded-[10px] flex items-center justify-center text-[#D91E63] group-hover:scale-105 transition-transform shadow-sm">
                    <UserPlus className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight uppercase">
                      {t('card_new_membership_title', 'New Membership')}
                    </h2>
                    <span className="inline-flex mt-2 bg-[#D91E63]/5 text-[#D91E63] border border-[#D91E63]/10 font-bold text-[10px] tracking-wider uppercase px-3.5 py-0.5 rounded-[4px]">
                      {t('card_new_membership_badge', 'ന്യൂ മെമ്പർഷിപ്പ് • ₹200')}
                    </span>
                    <p className="text-slate-650 font-normal text-xs mt-4 leading-relaxed max-w-[280px]">
                      {t('card_new_membership_desc', 'Register as an official active member to gain community credentials.')}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setStage('guidelines')}
                  className="w-full mt-6 h-11 rounded-[10px] text-xs font-semibold bg-[#0A2E5C] text-white hover:bg-[#1E5AA8] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  {t('card_new_membership_btn', 'Register Now')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Renewal Card */}
              <div
                className="group relative bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm hover:border-[#0A2E5C]/30 transition-all text-center flex flex-col items-center justify-between min-h-[380px]"
              >
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="bg-[#0A2E5C]/10 w-14 h-14 rounded-[10px] flex items-center justify-center text-[#0A2E5C] group-hover:scale-105 transition-transform shadow-sm">
                    <RefreshCw className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight uppercase">
                      {t('card_renew_membership_title', 'Renew card')}
                    </h2>
                    <span className="inline-flex mt-2 bg-[#0A2E5C]/5 text-[#0A2E5C] border border-[#0A2E5C]/10 font-bold text-[10px] tracking-wider uppercase px-3.5 py-0.5 rounded-[4px]">
                      {t('card_renew_membership_badge', 'അംഗത്വം പുതുക്കൽ • ₹100')}
                    </span>
                    <p className="text-slate-600 font-normal text-xs mt-4 leading-relaxed max-w-[280px]">
                      {t('card_renew_membership_desc', 'Renew your existing membership card easily with quick online processing.')}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={onRenew}
                  className="w-full mt-6 h-11 rounded-[10px] text-xs font-semibold bg-[#0A2E5C] text-white hover:bg-[#1E5AA8] transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-sm"
                >
                  {t('card_renew_membership_btn', 'Renew Card Now')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Information Registry Card */}
              <div
                className="group relative bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm hover:border-[#D91E63]/30 transition-all text-center flex flex-col items-center justify-between min-h-[380px]"
              >
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="bg-[#0A2E5C]/10 w-14 h-14 rounded-[10px] flex items-center justify-center text-[#0A2E5C] group-hover:scale-105 transition-transform shadow-sm">
                    <Info className="w-7 h-7 text-[#0A2E5C]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight uppercase">
                      {t('card_registry_title', 'Member Financial Information Registry')}
                    </h2>
                    <div className="flex flex-col gap-1 items-center mt-2">
                      <span className="inline-flex bg-[#0A2E5C]/5 text-[#0A2E5C] border border-[#0A2E5C]/10 font-bold text-[9px] tracking-wider uppercase px-2.5 py-0.5 rounded-[4px]">
                        {t('card_registry_badge', 'Verified Information Collection')}
                      </span>
                      <span className="text-[10px] font-bold text-[#D91E63] uppercase tracking-wider mt-0.5">
                        {t('card_registry_sub_badge', 'Verified Member Information Collection Portal')}
                      </span>
                    </div>
                    <p className="text-slate-650 font-normal text-xs mt-4 leading-relaxed max-w-[280px]">
                      {t('card_registry_desc', 'This portal is designed to collect and verify financial information from members for planning, coordination, and support purposes.')}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    setClaimMobile('');
                    setClaimResult(null);
                    setStage('claim_check');
                  }}
                  className="w-full mt-6 h-11 rounded-[10px] text-xs font-semibold bg-[#D91E63] text-white hover:bg-[#B71C1C] transition-all flex items-center justify-center gap-2 uppercase tracking-wide shadow-sm"
                >
                  {t('card_registry_btn', 'Access Registry Portal')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Micro Access Card - Upgraded */}
            <div className="flex flex-col items-center max-w-sm mx-auto bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm relative overflow-hidden group">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4">Official Logins</span>
              <Button 
                onClick={onLoginClick}
                className="w-full h-11 rounded-[10px] font-semibold text-white bg-[#0A2E5C] hover:bg-[#1E5AA8] shadow-sm transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 group"
              >
                Sign In to Portal
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
            {/* About HCRS & Our Mission Section - Redesigned to exact specifications */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-6xl mx-auto pt-6 text-left font-sans">
              
              {/* Left Column (lg:col-span-5): ABOUT HCRS */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="lg:col-span-5 space-y-6 flex flex-col justify-between"
              >
                <div className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm relative h-full flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full pointer-events-none" />
                  
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-[#D91E63]/5 text-[#D91E63] px-3.5 py-1.5 rounded-[4px] border border-[#D91E63]/10">
                      <Building2 className="w-4 h-4" />
                      <span className="font-bold text-[10px] uppercase tracking-wider">About HCRS • ഞങ്ങളെക്കുറിച്ച്</span>
                    </div>
 
                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tight uppercase leading-none">
                      About <span className="text-[#D91E63]">HCRS</span>
                    </h2>
 
                    <div className="space-y-5 text-sm text-slate-600 font-normal leading-relaxed">
                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-[6px] bg-slate-50 border border-slate-200 text-[#0A2E5C] flex items-center justify-center shrink-0 shadow-sm">
                          <Building2 className="w-5 h-5 text-[#D91E63]" />
                        </div>
                        <p className="pt-0.5 text-[13px] md:text-sm font-normal text-slate-700">
                          <strong className="text-slate-950 font-semibold">HIGHRICH COMMUNITY REVIVAL SOCIETY (HCRS)</strong> is a legally registered non-profit organization formed in 2025 in Thrissur, Kerala.
                        </p>
                      </div>
 
                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-[6px] bg-slate-50 border border-slate-200 text-[#0A2E5C] flex items-center justify-center shrink-0 shadow-sm">
                          <Users className="w-5 h-5 text-[#0A2E5C]" />
                        </div>
                        <p className="pt-0.5 text-[13px] md:text-sm font-normal text-slate-700">
                          HCRS was established as a <strong className="text-slate-950 font-semibold">revival committee</strong> for the members of Highrich Online Shoppe.
                        </p>
                      </div>
 
                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-[6px] bg-slate-50 border border-slate-200 text-[#0A2E5C] flex items-center justify-center shrink-0 shadow-sm">
                          <HeartHandshake className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="pt-0.5 text-[13px] md:text-sm font-normal text-slate-700">
                          Efforts are ongoing to support affected community members through welfare initiatives, awareness programs, community support activities, and <strong className="text-slate-950 font-semibold">lawful assistance mechanisms</strong>.
                        </p>
                      </div>
 
                      <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-[6px] bg-slate-50 border border-slate-200 text-[#0A2E5C] flex items-center justify-center shrink-0 shadow-sm">
                          <Sparkles className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="pt-0.5 text-[13px] md:text-sm font-normal text-slate-700">
                          HCRS remains committed to helping members <strong className="text-slate-950 font-semibold">rebuild confidence, stability, and opportunities</strong> through collective action.
                        </p>
                      </div>
                    </div>
                  </div>
 
                  {/* Registered Status Sub-Card */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-[6px] bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Kerala Division</p>
                      <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide mt-1.5">Registered Non-Profit</p>
                    </div>
                  </div>
                </div>
              </motion.div>
 
              {/* Right Column (lg:col-span-7): OUR MISSION & CARD MATRIX */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="lg:col-span-7 space-y-6"
              >
                <div className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm h-full flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-[#0A2E5C]/5 text-[#0A2E5C] px-3.5 py-1.5 rounded-[4px] border border-[#0A2E5C]/10">
                      <Target className="w-4 h-4" />
                      <span className="font-bold text-[10px] uppercase tracking-wider">Our Society Mission • ലക്ഷ്യങ്ങൾ</span>
                    </div>
 
                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tight uppercase leading-none">
                      Our <span className="text-[#0A2E5C]">Mission</span>
                    </h2>
 
                    <p className="text-sm font-normal text-slate-500 leading-relaxed">
                      Our society works to restore trust and rebuild livelihoods through:
                    </p>
 
                    {/* Mission Core Focus Cards Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        {
                          title: "Community Welfare",
                          titleMl: "കമ്മ്യൂണിറ്റി ക്ഷേമം",
                          icon: Users,
                          iconColor: "text-[#0A2E5C]",
                          bgColor: "bg-slate-50 border-slate-200"
                        },
                        {
                          title: "Medical Assistance",
                          titleMl: "ചികിത്സാ സഹായം",
                          icon: Activity,
                          iconColor: "text-rose-600",
                          bgColor: "bg-slate-50 border-slate-200"
                        },
                        {
                          title: "Legal Awareness",
                          titleMl: "നിയമ ബോധവൽക്കരണം",
                          icon: Gavel,
                          iconColor: "text-amber-600",
                          bgColor: "bg-slate-50 border-slate-200"
                        },
                        {
                          title: "Social Support",
                          titleMl: "സാമൂഹിക പിന്തുണ",
                          icon: HeartHandshake,
                          iconColor: "text-emerald-600",
                          bgColor: "bg-slate-50 border-slate-200"
                        },
                        {
                          title: "Financial Guidance",
                          titleMl: "സാമ്പത്തിക മാർഗ്ഗനിർദ്ദേശം",
                          icon: Briefcase,
                          iconColor: "text-[#1E5AA8]",
                          bgColor: "bg-slate-50 border-slate-200"
                        }
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div 
                            key={item.title}
                            className={`p-4 rounded-[6px] border ${item.bgColor} flex flex-col justify-between transition-all hover:border-[#1E5AA8]/30 cursor-default`}
                          >
                            <div className={`w-9 h-9 rounded-[6px] bg-white flex items-center justify-center shadow-sm border border-slate-200 shrink-0 mb-3`}>
                              <Icon className={`w-4 h-4 ${item.iconColor}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 text-xs leading-snug uppercase tracking-tight">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-bold tracking-wide mt-1">
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
                    <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-5 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                      <div className="space-y-1.5 max-w-sm">
                        <div className="inline-flex items-center gap-1.5 text-[#D91E63] font-bold uppercase text-[10px] tracking-wider leading-none">
                          <BadgeAlert className="w-3.5 h-3.5" />
                          Special Attention segment
                        </div>
                        <p className="text-xs font-semibold text-slate-650 leading-relaxed pt-1">
                          Our society pays a prioritized focus and active attention to:
                        </p>
                      </div>
 
                      {/* Pill list targeting priority members */}
                      <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full sm:w-auto">
                        {[
                          { lbl: "Women", lblMl: "വനിതകൾ", icon: Heart },
                          { lbl: "Widows", lblMl: "വിധവകൾ", icon: Shield },
                          { lbl: "Senior Citizens", lblMl: "മുതിർന്ന പൗരന്മാർ", icon: Award },
                          { lbl: "Families", lblMl: "നിരാലംബർ", icon: Users }
                        ].map((priority) => {
                          const PriIcon = priority.icon;
                          return (
                            <div 
                              key={priority.lbl}
                              className="bg-white px-3.5 py-2.5 rounded-[6px] border border-slate-200 flex items-center gap-2 shadow-sm shrink-0"
                            >
                              <PriIcon className="w-3.5 h-3.5 text-[#D91E63] shrink-0" />
                              <div>
                                <p className="font-semibold text-[10px] text-slate-850 leading-none uppercase">{priority.lbl}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{priority.lblMl}</p>
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
              <div className="text-center space-y-2 font-sans">
                <div className="inline-flex items-center gap-2 bg-[#0A2E5C]/5 text-[#0A2E5C] px-3.5 py-1.5 rounded-[4px] border border-[#0A2E5C]/10">
                  <Activity className="w-4 h-4 text-[#0A2E5C]" />
                  <span className="font-bold text-[10px] uppercase tracking-wider">Operational Focus • പ്രധാന പ്രവർത്തനങ്ങൾ</span>
                </div>
                <h2 className="text-3xl md:text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                  Our Key <span className="text-[#0A2E5C]">Activities</span>
                </h2>
                <p className="text-slate-500 font-normal text-xs md:text-sm max-w-xl mx-auto">
                  We are actively engaged in structured initiatives and programs to restore the community.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1 */}
                <div 
                  className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-[6px] bg-[#0A2E5C]/5 border border-[#0A2E5C]/10 text-[#0A2E5C] flex items-center justify-center shadow-sm">
                      <IdCard className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight">
                      Membership Campaigns
                    </h3>
                    <p className="text-slate-600 font-normal text-xs md:text-sm leading-relaxed">
                      HCRS Membership Campaigns unite members and supporters for welfare, awareness, revival initiatives, and community participation.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-[#0A2E5C]">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Uniting Members</span>
                    <span className="w-2 h-2 rounded-full bg-[#0A2E5C]" />
                  </div>
                </div>

                {/* Card 2 */}
                <div 
                  className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-[6px] bg-[#D91E63]/5 border border-[#D91E63]/10 text-[#D91E63] flex items-center justify-center shadow-sm">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight">
                      Welfare Activities
                    </h3>
                    <p className="text-slate-600 font-normal text-xs md:text-sm leading-relaxed">
                      Supporting members through welfare programs, awareness campaigns, and compassionate assistance initiatives.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-[#D91E63]">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Active Relief</span>
                    <span className="w-2 h-2 rounded-full bg-[#D91E63]" />
                  </div>
                </div>

                {/* Card 3 */}
                <div 
                  className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group transition-all text-left"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-[6px] bg-[#1E5AA8]/5 border border-[#1E5AA8]/10 text-[#1E5AA8] flex items-center justify-center shadow-sm">
                      <Coins className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight">
                      Financial Support
                    </h3>
                    <p className="text-slate-600 font-normal text-xs md:text-sm leading-relaxed">
                      Providing support initiatives for education, medical needs, emergencies, and livelihood recovery efforts.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-[#1E5AA8]">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Essential Recovery</span>
                    <span className="w-2 h-2 rounded-full bg-[#1E5AA8]" />
                  </div>
                </div>
              </div>

              {/* Dynamic Galleries Preview Section */}
              <div className="space-y-8 pt-8 font-sans">
                {[
                  {
                    category: 'Membership Campaigns',
                    title: 'Membership Campaigns Archive',
                    desc: 'Sneak peek into physical membership campaigns, active recruitment zones, and community interactions.',
                    icon: <IdCard className="w-5 h-5 text-[#0A2E5C]" />,
                    bgColor: 'bg-slate-50',
                    btnColor: 'text-[#0A2E5C] hover:bg-slate-100 border-slate-200'
                  },
                  {
                    category: 'Welfare Activities',
                    title: 'Welfare Activities Photo Grid',
                    desc: 'Capturing moments of direct relief campaigns, compassionate delivery work, and home visits.',
                    icon: <HeartHandshake className="w-5 h-5 text-[#D91E63]" />,
                    bgColor: 'bg-slate-50',
                    btnColor: 'text-[#D91E63] hover:bg-slate-100 border-slate-200'
                  },
                  {
                    category: 'Financial Support',
                    title: 'Financial Support & Activity Gallery',
                    desc: 'Transparency and active record checking of educational support, emergency medical disbursements.',
                    icon: <Coins className="w-5 h-5 text-[#1E5AA8]" />,
                    bgColor: 'bg-slate-50',
                    btnColor: 'text-[#1E5AA8] hover:bg-slate-100 border-slate-200'
                  }
                ].map((act) => {
                  const sectionImages = gallery.filter(img => img.category === act.category).slice(0, 6);
                  return (
                    <div 
                      key={act.category} 
                      className={`p-6 md:p-8 rounded-[10px] border border-slate-200 bg-white shadow-sm text-left space-y-6 ${act.bgColor}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[6px] bg-white shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                            {act.icon}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight">{act.title}</h3>
                            <p className="text-[11px] text-slate-500 font-normal">{act.desc}</p>
                          </div>
                        </div>

                        <Button 
                          onClick={onGalleryClick}
                          className={`rounded-[10px] h-9 text-[10px] font-semibold uppercase tracking-wider px-4 bg-white border border-slate-200 shadow-sm transition-all ${act.btnColor}`}
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
                              className="aspect-square bg-slate-100 border border-slate-200 rounded-[8px] overflow-hidden relative cursor-pointer group shadow-sm"
                            >
                              <img 
                                src={img.url} 
                                alt={img.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-[#222222]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-350 flex items-end p-2.5 backdrop-blur-[1px]">
                                <p className="text-[9px] font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight">
                                  {img.title}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 bg-white border border-dashed border-slate-200 rounded-[8px] flex flex-col items-center justify-center text-center">
                          <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Preview Gallery Empty</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* OUR JOURNEY SECTION */}
            <section className="space-y-12 max-w-5xl mx-auto pt-20 pb-10">
              <div className="text-center space-y-2 font-sans">
                <div className="inline-flex items-center gap-2 bg-[#D91E63]/5 text-[#D91E63] px-3.5 py-1.5 rounded-[4px] border border-[#D91E63]/10">
                  <Compass className="w-4 h-4 text-[#D91E63]" />
                  <span className="font-bold text-[10px] uppercase tracking-wider">The Timeline • ചരിത്രവഴി</span>
                </div>
                <h2 className="text-3xl md:text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                  Our <span className="text-[#D91E63]">Journey</span>
                </h2>
                <p className="text-slate-500 font-normal text-xs md:text-sm max-w-xl mx-auto">
                  A timeline tracking our establishment, unity, and dedicated ongoing community efforts.
                </p>
              </div>

              {/* Timeline graphic wrapper */}
              <div className="relative border-l-2 border-slate-200 ml-4 md:ml-32 space-y-12 text-left">
                {/* Milestone 1 */}
                <div className="relative pl-8 sm:pl-12 group">
                  {/* Flat Professional Node */}
                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-white border-4 border-[#D91E63] shadow-sm group-hover:scale-110 transition-transform" />
                  
                  {/* Content Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start font-sans">
                    {/* Year/Signpost (Left alignment offset) */}
                    <div className="md:col-span-3 -ml-4 md:-ml-40 md:text-right pr-0 md:pr-10">
                      <span className="inline-block bg-[#D91E63]/10 text-[#D91E63] font-bold text-xs px-3.5 py-1.5 rounded-[4px] border border-[#D91E63]/25 shadow-sm uppercase tracking-wider">
                        2025 • ESTD
                      </span>
                    </div>
                    {/* Card container */}
                    <div className="md:col-span-9 bg-white border border-slate-200 p-6 md:p-8 rounded-[10px] shadow-sm hover:border-[#D91E63]/40 transition-all duration-200">
                      <h3 className="text-lg md:text-xl font-semibold text-slate-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D91E63]" />
                        Foundation In Thrissur
                      </h3>
                      <p className="text-slate-650 font-normal text-xs md:text-sm leading-relaxed">
                        The Highrich Community Revival Society (HCRS) was formed in 2025 in Thrissur, Kerala.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div className="relative pl-8 sm:pl-12 group">
                  {/* Flat Professional Node */}
                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-white border-4 border-[#0A2E5C] shadow-sm group-hover:scale-110 transition-transform" />
                  
                  {/* Content Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start font-sans">
                    {/* Year/Signpost */}
                    <div className="md:col-span-3 -ml-4 md:-ml-40 md:text-right pr-0 md:pr-10">
                      <span className="inline-block bg-[#0A2E5C]/10 text-[#0A2E5C] font-bold text-xs px-3.5 py-1.5 rounded-[4px] border border-[#0A2E5C]/25 shadow-sm uppercase tracking-wider">
                        OUR FOCUS
                      </span>
                    </div>
                    {/* Card container */}
                    <div className="md:col-span-9 bg-white border border-slate-200 p-6 md:p-8 rounded-[10px] shadow-sm hover:border-[#0A2E5C]/40 transition-all duration-200">
                      <h3 className="text-lg md:text-xl font-semibold text-slate-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0A2E5C]" />
                        Unity & Welfare Mobilization
                      </h3>
                      <p className="text-slate-650 font-normal text-xs md:text-sm leading-relaxed">
                        The organization was established to unite members, promote community welfare, and provide support initiatives during difficult circumstances.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div className="relative pl-8 sm:pl-12 group">
                  {/* Flat Professional Node */}
                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-white border-4 border-emerald-600 shadow-sm group-hover:scale-110 transition-transform" />
                  
                  {/* Content Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start font-sans">
                    {/* Year/Signpost */}
                    <div className="md:col-span-3 -ml-4 md:-ml-40 md:text-right pr-0 md:pr-10">
                      <span className="inline-block bg-emerald-50 text-emerald-800 font-bold text-xs px-3.5 py-1.5 rounded-[4px] border border-emerald-200 shadow-sm uppercase tracking-wider">
                        ONGOING
                      </span>
                    </div>
                    {/* Card container */}
                    <div className="md:col-span-9 bg-white border border-slate-200 p-6 md:p-8 rounded-[10px] shadow-sm hover:border-emerald-500/40 transition-all duration-200">
                      <h3 className="text-lg md:text-xl font-semibold text-slate-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        Continuous Support Platform
                      </h3>
                      <p className="text-slate-650 font-normal text-xs md:text-sm leading-relaxed">
                        Today HCRS continues to serve as a platform for awareness, welfare, support, and community engagement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* OUR VISION & FOCUS AREAS SECTION */}
            <section className="space-y-12 max-w-6xl mx-auto pt-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch font-sans">
                {/* OUR VISION (Left 5-cols) */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="lg:col-span-5 relative bg-[#0A2E5C] rounded-[10px] p-8 md:p-10 shadow-sm flex flex-col justify-between overflow-hidden text-left"
                >
                  <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="space-y-6 relative max-w-sm font-sans text-white">
                    <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3.5 py-1.5 rounded-[4px] border border-white/20">
                      <Eye className="w-4 h-4 text-white" />
                      <span className="font-bold text-[10px] uppercase tracking-wider text-slate-100">Our society Vision • ദർശനം</span>
                    </div>

                    <h2 className="text-2xl font-semibold text-white tracking-tight uppercase">
                      Our <span className="text-white">Vision</span>
                    </h2>

                    <p className="text-slate-100 font-normal text-sm leading-relaxed pt-2">
                      To build empowered communities where every individual enjoys dignity, support, opportunity, and access to essential resources.
                    </p>
                  </div>

                  <div className="pt-8 border-t border-white/15 mt-8 flex items-center gap-4 relative">
                    <div className="w-11 h-11 rounded-[6px] bg-white/10 text-white flex items-center justify-center border border-white/20 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-semibold uppercase tracking-wider">Empowerment First</h4>
                      <p className="text-[10px] text-slate-300 font-normal tracking-wide mt-0.5">Dignity • Opportunity • Support</p>
                    </div>
                  </div>
                </motion.div>

                {/* FOCUS AREAS (Right 7-cols) */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="lg:col-span-7 bg-white border border-slate-200 p-8 md:p-10 rounded-[10px] shadow-sm flex flex-col justify-between text-left"
                >
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-[#0A2E5C]/5 text-[#0A2E5C] px-3.5 py-1.5 rounded-[4px] border border-[#0A2E5C]/10">
                      <Target className="w-4 h-4 text-[#0A2E5C]" />
                      <span className="font-bold text-[10px] uppercase tracking-wider">Social Pillars • സുപ്രധാന ലക്ഷ്യങ്ങൾ</span>
                    </div>

                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tight uppercase leading-none">
                      Focus <span className="text-[#0A2E5C]">Areas</span>
                    </h2>

                    <p className="text-slate-500 font-normal text-xs md:text-sm">
                      We focus on critical development blocks to foster societal health and security.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-sans">
                      {[
                        {
                          num: "01",
                          title: "Social Welfare",
                          titleMl: "സാമൂഹിക ക്ഷേമം",
                          desc: "Supporting health, education, and livelihood initiatives.",
                          icon: Heart,
                          color: "bg-rose-50 border-rose-100 text-rose-600"
                        },
                        {
                          num: "02",
                          title: "Women & Youth Development",
                          titleMl: "സ്ത്രീ-യുവജന ക്ഷേമം",
                          desc: "Encouraging participation, empowerment, and leadership.",
                          icon: Users,
                          color: "bg-pink-50 border-pink-100 text-[#D91E63]"
                        },
                        {
                          num: "03",
                          title: "Community Support",
                          titleMl: "കമ്മ्युनिटी പിന്തുണ",
                          desc: "Building stronger support networks and crisis response structures.",
                          icon: HeartHandshake,
                          color: "bg-emerald-50 border-emerald-100 text-emerald-600"
                        },
                        {
                          num: "04",
                          title: "Awareness Programs",
                          titleMl: "ബോധവൽക്കരണം",
                          desc: "Promoting education, legal orientation, and information sharing.",
                          icon: Compass,
                          color: "bg-blue-50 border-blue-100 text-blue-600"
                        }
                      ].map((area) => {
                        const AreaIcon = area.icon;
                        return (
                          <div 
                            key={area.title} 
                            className="p-5 bg-slate-50 border border-slate-200 rounded-[6px] flex items-start gap-4 transition-all group"
                          >
                            <div className={`w-10 h-10 rounded-[6px] shrink-0 flex items-center justify-center border ${area.color}`}>
                              <AreaIcon className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 font-sans">
                              <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Area {area.num}</span>
                              <h4 className="text-slate-900 font-semibold text-sm uppercase leading-tight">{area.title}</h4>
                              <p className="text-[10px] text-[#D91E63] font-bold uppercase tracking-wider">{area.titleMl}</p>
                              <p className="text-slate-500 text-xs font-normal leading-relaxed pt-1">{area.desc}</p>
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
                <div className="inline-flex items-center gap-2 bg-[#0A2E5C]/5 text-[#0A2E5C] px-3.5 py-1.5 rounded-[4px] border border-[#0A2E5C]/10">
                  <Network className="w-4 h-4 text-[#0A2E5C]" />
                  <span className="font-bold text-[10px] uppercase tracking-wider">Administrative structure • കമ്മിറ്റികൾ</span>
                </div>
                <h2 className="text-3xl md:text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                  State & District <span className="text-[#0A2E5C]">Committees</span>
                </h2>
                <p className="text-slate-500 font-normal text-xs md:text-sm max-w-xl mx-auto">
                  Highrich Community Revival Society operates through State, District, and local leadership teams.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-[10px] p-8 md:p-10 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
                  {/* Left explanation block */}
                  <div className="lg:col-span-5 space-y-5 font-sans">
                    <div className="w-12 h-12 bg-slate-50 text-[#0A2E5C] border border-slate-200 rounded-[6px] flex items-center justify-center shadow-sm">
                      <Network className="w-5 h-5 text-[#D91E63]" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 uppercase tracking-tight">
                      Structured Coordination
                    </h3>
                    <p className="text-slate-600 font-normal text-xs md:text-sm leading-relaxed">
                      These committees coordinate welfare initiatives, member support, awareness programs, and community activities to ensure structural efficiency and rapid service delivery.
                    </p>
                    <div className="w-20 h-1 bg-[#0A2E5C] rounded" />
                  </div>

                  {/* Right 3 core columns */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6 font-sans">
                    {[
                      {
                        title: "State Leadership",
                        titleMl: "സംസ്ഥാന സമിതി",
                        desc: "Apex planning body formulating state-wide welfare frameworks.",
                        icon: UserCheck,
                        color: "text-[#D91E63] bg-[#D91E63]/5 border-[#D91E63]/15"
                      },
                      {
                        title: "District Committee",
                        titleMl: "ജില്ലാ കമ്മിറ്റികൾ",
                        desc: "District divisions managing localized member outreach.",
                        icon: Building2,
                        color: "text-[#0A2E5C] bg-[#0A2E5C]/5 border-[#0A2E5C]/15"
                      },
                      {
                        title: "Team Network",
                        titleMl: "ഗ്രൂപ്പ് ശൃംഖല",
                        desc: "Grassroots division coordinating instant helpline assistance.",
                        icon: Network,
                        color: "text-emerald-700 bg-emerald-50 border-emerald-150"
                      }
                    ].map((item, index) => {
                      const TeamIcon = item.icon;
                      return (
                        <div 
                          key={index} 
                          className="bg-slate-50 border border-slate-200 transition-all rounded-[6px] p-6 flex flex-col justify-between h-full font-sans shadow-sm"
                        >
                          <div className="space-y-4">
                            <div className={`w-10 h-10 rounded-[6px] flex items-center justify-center border ${item.color}`}>
                              <TeamIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-tight leading-tight">{item.title}</h4>
                              <p className="text-[10px] text-[#D91E63] font-bold uppercase tracking-wider mt-1">{item.titleMl}</p>
                            </div>
                          </div>
                          <p className="text-slate-500 text-xs font-normal leading-relaxed mt-4">
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
                <div className="inline-flex items-center gap-2 bg-[#0A2E5C]/5 text-[#0A2E5C] px-3.5 py-1.5 rounded-[4px] border border-[#0A2E5C]/10">
                  <Award className="w-4 h-4 text-[#0A2E5C]" />
                  <span className="font-bold text-[10px] uppercase tracking-wider">Member Privileges • അംഗത്വ ആനുകൂല്യങ്ങൾ</span>
                </div>
                <h2 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                  HCRS Membership <span className="text-[#0A2E5C]">Benefits</span>
                </h2>
                <p className="text-slate-500 font-normal text-xs md:text-sm max-w-xl mx-auto">
                  By joining our registered collective, you unlock vital community support systems, legal standing, and advocacy channels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Benefit 1 */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group transition-all text-left font-sans"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#0A2E5C]/3 rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-[6px] bg-[#0A2E5C]/5 border border-[#0A2E5C]/10 text-[#0A2E5C] flex items-center justify-center shadow-sm transition-transform">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-905 uppercase tracking-tight leading-tight">
                        Reclaiming Livelihoods
                      </h3>
                      <p className="text-[10px] text-[#0A2E5C] font-bold uppercase tracking-wider mt-1">
                        ജീവനമാർഗ്ഗ പുനരുദ്ധാരണം
                      </p>
                    </div>
                    <p className="text-slate-500 font-normal text-xs leading-relaxed">
                      Working collectively to support members through awareness, welfare initiatives, and community revival efforts.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-[#0A2E5C]">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Life Recovery Block</span>
                    <span className="w-2 h-2 rounded-full bg-[#0A2E5C]" />
                  </div>
                </motion.div>

                {/* Benefit 2 */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group transition-all text-left font-sans"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#D91E63]/3 rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-[6px] bg-[#D91E63]/5 border border-[#D91E63]/10 text-[#D91E63] flex items-center justify-center shadow-sm transition-transform">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-905 uppercase tracking-tight leading-tight">
                        Stand For Justice
                      </h3>
                      <p className="text-[10px] text-[#D91E63] font-bold uppercase tracking-wider mt-1">
                        നീതിക്കായുള്ള നിലകൊള്ളൽ
                      </p>
                    </div>
                    <p className="text-slate-500 font-normal text-xs leading-relaxed">
                      Members can participate in lawful representation efforts, petitions, and community advocacy initiatives.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-[#D91E63]">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Advocacy Standing</span>
                    <span className="w-2 h-2 rounded-full bg-[#D91E63]" />
                  </div>
                </motion.div>

                {/* Benefit 3 */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200 p-8 rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group transition-all text-left font-sans"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-[6px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm transition-transform">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-905 uppercase tracking-tight leading-tight">
                        Guaranteed Privacy
                      </h3>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">
                        വ്യക്തിവിവര സുരക്ഷിതത്വം
                      </p>
                    </div>
                    <p className="text-slate-500 font-normal text-xs leading-relaxed">
                      HCRS is committed to protecting member information through secure and responsible data handling practices.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-emerald-600">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Encrypted Safeguards</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Gallery Archive Grid Redesign */}
            <section className="space-y-8 max-w-6xl mx-auto pt-16" id="gallery-preview">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-left">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-[#D91E63]/5 text-[#D91E63] px-3.5 py-1.5 rounded-[4px] border border-[#D91E63]/10">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="font-bold text-[10px] uppercase tracking-wider">Visual Records</span>
                  </div>
                  <h2 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight mt-1">
                    Secretariat <span className="text-[#0A2E5C]">Moments</span>
                  </h2>
                </div>
                
                <Button 
                  onClick={onGalleryClick}
                  className="bg-white hover:bg-slate-50 text-slate-800 rounded-[10px] px-5 h-12 font-semibold uppercase text-xs tracking-wider border border-slate-200 transition-all shadow-sm"
                >
                  Browse Full Gallery
                  <ChevronRight className="w-4 h-4 ml-1 text-[#0A2E5C]" />
                </Button>
              </div>

              {gallery.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {gallery.slice(0, 4).map((item, index) => (
                    <motion.div
                      key={item.url + index}
                      whileHover={{ y: -4 }}
                      className="group relative aspect-[3/4] rounded-[10px] overflow-hidden bg-white p-1.5 border border-slate-200 shadow-sm cursor-pointer"
                      onClick={onGalleryClick}
                    >
                      <div className="w-full h-full rounded-[6px] overflow-hidden relative bg-slate-100">
                        <img 
                          src={item.url} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <div className="bg-white text-slate-900 px-4 py-2 rounded-[6px] shadow text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                            View Gallery
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[10px] p-12 border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
                   <div className="w-12 h-12 bg-slate-50 rounded-[6px] flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                      <ImageIcon className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight font-sans">No Archive Photos Yet</h3>
                     <p className="text-slate-500 font-normal text-xs max-w-sm mx-auto mt-1 leading-relaxed">Explore Secretariat updates once the administrators upload new event files.</p>
                   </div>
                </div>
              )}
            </section>

            {/* Map & Address Section */}
            <section id="contact-us" className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto pt-0 text-left font-sans">
              <div className="p-8 md:p-12 space-y-10">
                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">Connect with HCRS</h2>
                  <p className="text-slate-500 font-normal text-xs leading-relaxed max-w-md">For queries regarding registrations, identity verification or the financial context registry.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-[#0A2E5C]/5 rounded-[6px] flex items-center justify-center text-[#0A2E5C] shrink-0 border border-[#0A2E5C]/10">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Headquarters</p>
                      <p className="text-slate-700 text-xs font-normal leading-relaxed">{settings.address}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-[#D91E63]/5 rounded-[6px] flex items-center justify-center text-[#D91E63] shrink-0 border border-[#D91E63]/10">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Helpline</p>
                      <p className="text-slate-700 text-xs font-normal">{settings.phone}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-[#0A2E5C]/5 rounded-[6px] flex items-center justify-center text-[#0A2E5C] shrink-0 border border-[#0A2E5C]/10">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Office</p>
                      <p className="text-slate-700 text-xs font-normal break-all leading-normal">{settings.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-[#D91E63]/5 rounded-[6px] flex items-center justify-center text-[#D91E63] shrink-0 border border-[#D91E63]/10">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Official Site</p>
                      <a href={settings.website} target="_blank" rel="noreferrer" className="text-slate-700 text-xs font-normal hover:text-[#D91E63] transition-colors break-all leading-normal">{settings.website}</a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 relative flex items-center justify-center p-8 overflow-hidden border-t md:border-t-0 md:border-l border-slate-200 fn-sans">
                <div className="relative bg-white p-8 rounded-[10px] shadow-sm border border-slate-200 text-center space-y-4 max-w-xs w-full">
                  <div className="w-12 h-12 bg-[#0A2E5C] text-white rounded-[6px] mx-auto flex items-center justify-center shadow">
                    <MapPin className="w-6 h-6 text-[#D91E63]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Active Districts</h3>
                    <p className="text-slate-500 font-normal text-xs mt-2 leading-relaxed">{settings.districtDetails}</p>
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
            <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden rounded-[10px]">
              <CardHeader className="bg-slate-50 border-b border-slate-200 pb-6 pt-6 px-8 md:px-10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold flex items-center gap-3 text-slate-900 uppercase tracking-tight font-sans">
                    <ShieldCheck className="w-5 h-5 text-[#D91E63]" />
                    {t('guidelines_title', 'Registry Guidelines')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => setStage('landing')} 
                    className="rounded-[6px] w-9 h-9 p-0 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all"
                  >
                     <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-8 pb-4 px-8 md:px-10">
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar text-left font-sans">
                  {[
                    t('rule_1', 'Membership is strictly open only to citizens supportive of the HCRS core objectives.'),
                    t('rule_2', 'Digital identity credentials are dynamically generated after verified payment & approval.'),
                    t('rule_3', 'Intentional submission of falsified credentials constitutes permanent blacklisting.'),
                    t('rule_4', 'The Digital identity card is a secure dynamic property issued in Kerala division.'),
                    t('rule_5', 'All registration and member registry verification fees are completely non-refundable.')
                  ].map((text, idx) => (
                    <div key={idx} className="flex gap-4 items-start group">
                      <div className="w-6 h-6 rounded-[4px] bg-[#0A2E5C] text-white flex items-center justify-center shrink-0">
                        <span className="font-semibold text-xs">{idx + 1}</span>
                      </div>
                      <p className="text-xs font-normal text-slate-650 leading-relaxed pt-0.5">{text}</p>
                    </div>
                  ))}
                </div>

                <div 
                  className="flex items-center space-x-4 p-4 bg-slate-50 hover:bg-slate-100/50 rounded-[10px] border border-slate-200 transition-all cursor-pointer w-full group" 
                  onClick={() => setAgreed(!agreed)}
                >
                  <Checkbox 
                    id="terms" 
                    checked={agreed} 
                    onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    className="data-[state=checked]:bg-[#0A2E5C] data-[state=checked]:border-[#0A2E5C] border border-slate-300 w-5 h-5 rounded-[4px] transition-transform"
                  />
                  <Label 
                    htmlFor="terms" 
                    className="text-xs font-normal cursor-pointer select-none text-slate-600 leading-normal"
                  >
                    {t('guidelines_agree_checkbox', 'I agree to the terms and hereby proceed to the public registry.')}
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="pt-2 pb-8 px-8 md:px-10">
                <Button 
                  className="w-full h-12 font-semibold rounded-[10px] transition-all shadow-sm disabled:opacity-40 uppercase tracking-wider text-xs bg-[#0A2E5C] text-[#FFFFFF] hover:bg-[#1E5AA8] disabled:hover:opacity-40"
                  disabled={!agreed}
                  onClick={onAccept}
                >
                  {t('guidelines_btn_proceed', 'Proceed to registry form')}
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
            <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden rounded-[10px]">
              <CardHeader className="bg-slate-50 border-b border-slate-200 pb-6 pt-6 px-8 md:px-10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold flex items-center gap-3 text-slate-950 uppercase tracking-tight font-sans">
                    <Info className="w-5 h-5 text-[#0A2E5C]" />
                    മെമ്പർ വിവര രജിസ്ട്രി
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setStage('landing');
                      setClaimResult(null);
                    }} 
                    className="rounded-[6px] w-9 h-9 p-0 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all"
                  >
                     <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-8 pb-6 px-8 md:px-10">
                {!claimResult ? (
                  <div className="space-y-8">
                    {/* Secure and Trusted Registry Information Block */}
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-[10px] space-y-4 text-left font-sans">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[6px] bg-[#0A2E5C]/5 border border-[#0A2E5C]/10 flex items-center justify-center text-[#0A2E5C] shrink-0">
                          <Info className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 leading-tight uppercase">Member Financial Information Registry</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-1">
                            <span className="inline-flex bg-[#0A2E5C]/5 text-[#0A2E5C] border border-[#0A2E5C]/10 font-bold text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-[4px] shrink-0">
                              Verified Information Collection
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Verified Member Information Portal</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-600 font-normal space-y-3 leading-relaxed border-t border-slate-200 pt-4">
                        <p className="font-semibold text-slate-800">
                          This portal is designed to collect and verify financial information from members for planning, coordination, and support purposes.
                        </p>
                        
                        <div className="space-y-1.5 pl-3 border-l-2 border-[#0A2E5C]/30 pb-0.5 mt-2">
                          <p className="text-[10px] font-bold text-[#0A2E5C] uppercase tracking-wider mb-1">The information collected will help identify:</p>
                          <p className="flex items-start gap-1.5 text-[11px] text-slate-705">
                            <span className="text-[#D91E63] shrink-0">•</span> Members facing urgent financial difficulties
                          </p>
                          <p className="flex items-start gap-1.5 text-[11px] text-slate-705">
                            <span className="text-[#D91E63] shrink-0">•</span> Members requiring priority consideration for future support initiatives
                          </p>
                          <p className="flex items-start gap-1.5 text-[11px] text-slate-705">
                            <span className="text-[#D91E63] shrink-0">•</span> Members who wish to continue participating in future business opportunities
                          </p>
                          <p className="flex items-start gap-1.5 text-[11px] text-slate-705">
                            <span className="text-[#D91E63] shrink-0">•</span> Members who prefer settlement and closure of their financial involvement upon resolution
                          </p>
                        </div>
                        
                        <p className="text-slate-500 text-[11px]">
                          The information submitted through this registry will be compiled, verified, and may be shared with the Highrich Management and Legal Team for reference, planning, verification, and member support activities.
                        </p>
                        
                        <p className="text-slate-500 text-[11px]">
                          This registry is intended solely for information collection, member verification, and support planning purposes.
                        </p>
                        
                        <p className="bg-[#0A2E5C]/3 border border-[#0A2E5C]/10 p-3.5 rounded-[6px] text-[10px] text-slate-600 font-semibold leading-normal">
                          <strong>Note:</strong> Submission of information does not constitute a legal claim, compensation claim, or guarantee of payment.
                        </p>
                      </div>

                      <div className="bg-pink-50 border border-pink-100 p-4 rounded-[6px] mt-4">
                        <p className="text-xs font-semibold text-slate-850 leading-relaxed">
                          വിവര രജിസ്ട്രി ഫോം ആക്സസ് ചെയ്യുന്നതിനായി ദയവായി നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത മൊബൈൽ നമ്പർ നൽകി വേരിഫൈ ചെയ്യുക:
                          <span className="text-[10px] text-[#D91E63] block mt-1.5 uppercase font-bold tracking-wider">Please enter your registered mobile number to check eligibility and proceed to the registry.</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 font-sans text-left">
                      <Label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Mobile Number (മൊബൈൽ നമ്പർ)</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <Input 
                          type="tel"
                          maxLength={10}
                          value={claimMobile}
                          onChange={(e) => setClaimMobile(e.target.value.replace(/\D/g, ''))}
                          placeholder="**********"
                          className="pl-11 h-12 bg-white border border-slate-200 focus:border-[#D91E63] focus:ring-0 transition-all rounded-[6px] font-semibold font-mono text-lg text-slate-900"
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
                          toast.error(`വേриഫിക്കേഷൻ പരാജയപ്പെട്ടു: ${errMsg}. ദയവായി വീണ്ടും ശ്രമിക്കുക.`);
                        } finally {
                          setCheckingClaim(false);
                        }
                      }}
                      disabled={checkingClaim}
                      className="w-full h-12 font-semibold rounded-[10px] transition-all bg-[#0A2E5C] text-white hover:bg-[#1E5AA8] uppercase tracking-wider text-xs shadow-sm"
                    >
                      {checkingClaim ? 'പരിശോധിക്കുന്നു (Checking...)' : 'മൊബൈൽ നമ്പർ വേരിഫൈ ചെയ്യുക (Verify Mobile)'}
                    </Button>
                  </div>
                ) : claimResult === 'registered' ? (
                  <div className="space-y-6 text-left py-2 font-sans">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-pink-50 border border-pink-150 rounded-[6px] flex items-center justify-center mx-auto text-[#D91E63] mb-3">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight leading-none">
                        നിലവിലുള്ള ഒഫീഷ്യൽ മെമ്പർ!
                      </h3>
                      <p className="text-slate-500 font-normal text-[10px] uppercase tracking-wider mt-1.5">Please enter Secure PIN to access your ID Card and Information Registry.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-[6px] flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Registered Number</p>
                        <p className="text-base font-semibold text-slate-850 tracking-tight font-mono mt-2">{claimMobile}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                          setClaimPin('');
                        }}
                        className="text-[10px] text-[#D91E63] font-bold uppercase tracking-wider border border-[#D91E63]/25 bg-[#D91E63]/3 hover:bg-[#D91E63]/10 rounded-[6px]"
                      >
                        Change Number
                      </Button>
                    </div>

                    {/* Accurate Status Display */}
                    {claimUserStatus === 'pending' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-[6px] p-4 space-y-1 text-slate-800 font-normal text-xs leading-relaxed">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold uppercase text-[10px] tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          അംഗത്വ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു (Pending Approval)
                        </div>
                        <p className="text-slate-600 font-normal">
                          നിങ്ങളുടെ പുതിയ മെമ്പർഷിപ്പ് രജിസ്ട്രേഷൻ അഡ്മിൻ പാനലിൽ വെരിഫിക്കേഷനിലാണ്. അഡ്മിൻ അപ്പ്രൂവ് ചെയ്തതിന് ശേഷം മാത്രമേ ക്ലെയിം വിവരങ്ങൾ സമർപ്പിക്കാൻ സാധിക്കുകയുള്ളൂ.
                        </p>
                      </div>
                    )}

                    {claimUserStatus === 'renewal_pending' && (
                      <div className="bg-orange-50 border border-orange-255 rounded-[6px] p-4 space-y-1 text-slate-800 font-normal text-xs leading-relaxed">
                        <div className="flex items-center gap-1.5 text-orange-900 font-bold uppercase text-[10px] tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                          റിന്യൂവൽ അപ്പ്രൂവലിനായി കാത്തിരിക്കുന്നു (Renewal Pending)
                        </div>
                        <p className="text-slate-600 font-normal">
                          നിങ്ങൾ സബ്മിറ്റ് ചെയ്ത ₹100 റിന്യൂവൽ പേയ്മെന്റ് വെരിഫൈ ചെയ്യാൻ ബാക്കിയാണ്. അഡ്മിൻ ഇത് അപ്പ്രൂവ് ചെയ്തയുടൻ ക്ലെയിം പോർട്ടലിൽ പ്രവേശിക്കാൻ സാധിക്കും.
                        </p>
                      </div>
                    )}

                    {claimUserStatus === 'expired' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-[6px] p-4 space-y-1 text-slate-800 font-normal text-xs leading-relaxed">
                        <div className="flex items-center gap-1.5 text-rose-800 font-bold uppercase text-[10px] tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                          മെമ്പർഷിപ്പ് കാലാവധി കഴിഞ്ഞിരിക്കുന്നു (Membership Expired)
                        </div>
                        <p className="text-slate-600 font-normal">
                          നിങ്ങളുടെ മെമ്പർഷിപ്പ് കാലാവധി അവസാനിച്ചിരിക്കുന്നു. ക്ലെയിം വിവരങ്ങൾ രേഖപ്പെടുത്താൻ ആദ്യം ലോഗിൻ ചെയ്ത് ₹100 അടച്ചു അംഗത്വം പുതുക്കേണ്ടതുണ്ട്.
                        </p>
                      </div>
                    )}

                    {claimUserStatus === 'active' && (
                      <div className="space-y-3">
                        <div className="bg-green-50/40 border border-green-150 rounded-[6px] p-4 space-y-1 my-2 text-slate-800 font-normal text-xs leading-relaxed">
                          <div className="flex items-center gap-1.5 text-green-800 font-bold uppercase text-[10px] tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            മെമ്പർഷിപ്പ് ആക്ടീവ് ആണ് (Active Official Member)
                          </div>
                          <p className="text-slate-500 text-[11px] font-normal leading-normal">
                            ക്ലെയിം വിവരങ്ങൾ രേഖപ്പെടുത്തുന്നതിനായി നിങ്ങളുടെ രഹസ്യ PIN നൽകാവുന്നതാണ്.
                          </p>
                        </div>

                        {userHasSubmittedClaim && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-[6px] p-4 space-y-1.5 text-xs font-semibold">
                            <p className="font-bold text-[11px] text-amber-850 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 block animate-pulse" />
                              പ്രധാന അറിയിപ്പ് (Important Notice)
                            </p>
                            <p className="leading-relaxed text-slate-700 font-normal text-xs">
                              താങ്കളുടെ ഫോൺ വഴിയുള്ള സപ്പോർട്ട് ക്ലൈം ഫോം വിജയകരമായി ഫിൽ ചെയ്തു കഴിഞ്ഞതാണ്. ഇനി നിങ്ങളുടെ കുടുംബത്തിലെ പരമാവധി മൂന്ന് (3) പേർക്ക് കൂടി മാത്രമേ വിവരങ്ങൾ രേഖപ്പെടുത്താൻ അവസരമുള്ളൂ.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {claimUserStatus === 'active' && (
                      <div className="space-y-3">
                        <Label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Security PIN (പാസ്‌വേഡ് അടിക്കുക)</Label>
                        <Input 
                          type="password"
                          maxLength={12}
                          value={claimPin}
                          onChange={(e) => setClaimPin(e.target.value)}
                          placeholder="••••"
                          className="h-12 bg-white border border-slate-200 focus:border-[#D91E63] focus:ring-0 transition-all rounded-[6px] font-semibold text-center text-lg tracking-widest font-mono text-slate-900"
                        />
                      </div>
                    )}

                    <div className="pt-4 flex flex-col gap-4">
                      {claimUserStatus === 'active' && (
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
                          className="w-full h-12 bg-[#0A2E5C] hover:bg-[#1E5AA8] text-white font-semibold uppercase text-xs tracking-wider rounded-[10px] shadow-sm flex items-center justify-center gap-2"
                        >
                          {loggingInClaim ? 'ലോഗിൻ ചെയ്യുന്നു (Logging inside...)' : 'ലോഗിൻ ചെയ്യുക (Secure Login)'}
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                          setClaimPin('');
                        }}
                        className="w-full h-12 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold uppercase text-[10px] rounded-[10px]"
                      >
                        Return Home
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 text-center py-4 font-sans">
                    <div className="w-12 h-12 bg-pink-100 rounded-[6px] flex items-center justify-center mx-auto border border-pink-200 text-[#D91E63] shadow-sm mb-3">
                      <UserPlus className="w-6 h-6 cursor-not-allowed" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-slate-900 uppercase tracking-tight leading-none">
                        രജിസ്റ്റർ ചെയ്യാത്ത മൊബൈൽ നമ്പർ!
                      </h3>
                      <p className="text-[#D91E63] font-bold text-[10px] uppercase tracking-wider block pt-1">Unregistered Mobile Number</p>
                    </div>

                    <p className="text-slate-600 font-normal text-xs leading-relaxed max-w-md mx-auto">
                      ഈ മൊബൈൽ നമ്പർ നിലവിൽ ഇതിൽ രജിസ്റ്റർ ചെയ്തിട്ടില്ല. രജിസ്റ്റർ ചെയ്ത മെമ്പർമാർക്ക് മാത്രമേ വിവര രജിസ്ട്രി ഫോം നൽകാൻ സാധിക്കുകയുള്ളൂ. ദയവായി പുതിയ മെമ്പർഷിപ്പ് എടുത്ത് ₹200 പെയ്മെന്റിലേക്ക് മാറുക.
                      <br/>
                      <span className="text-[10px] text-slate-400 font-normal block mt-3 uppercase tracking-wider leading-relaxed">This mobile number is not registered. Only registered active members can access the information registry. Please register as a new member with a payment of ₹200 first.</span>
                    </p>

                    <div className="pt-6 flex flex-col sm:flex-row gap-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setClaimResult(null);
                          setClaimMobile('');
                        }}
                        className="flex-1 h-12 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold uppercase text-[10px] rounded-[10px]"
                      >
                        Search Again
                      </Button>
                      <Button 
                        onClick={() => onRegisterWithMobile?.(claimMobile)}
                        className="flex-1 h-12 bg-[#D91E63] hover:bg-[#c21453] text-white font-semibold uppercase text-[10px] tracking-wider rounded-[10px] shadow-sm"
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
