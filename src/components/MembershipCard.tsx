import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, MapPin, ShieldCheck, Camera, PartyPopper, Share2, LogOut, Calendar, Phone, Mail, Award, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserProfile } from '@/src/types';
import { DISTRICTS, getAssemblyCode } from '@/src/constants';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { compressImage } from '@/src/lib/imageUtils';
import { getOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';
import Logo from '../Logo';

interface MembershipCardProps {
  member: UserProfile;
  onUpdatePhoto?: (file: File) => void;
  showCelebration?: boolean;
  isAdmin?: boolean;
  onLogout?: () => void;
  isReadOnly?: boolean;
}

export default function MembershipCard({ member, onUpdatePhoto, showCelebration = true, isAdmin = false, onLogout, isReadOnly = false }: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    const loadingToast = toast.loading('കാർഡ് ഡൗൺലോഡിനായി തയാറാക്കുന്നു...');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: '#FFFFFF' });
      const imgData = canvas.toDataURL('image/png');
      setGeneratedImage(imgData);
      toast.success('ഫോട്ടോ തെയ്യാറായിട്ടുണ്ട്!', { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error('ചിത്രം തെയ്യാറാക്കാൻ പറ്റിയില്ല. ദയവായി നേരിട്ട് സ്ക്രീൻഷോട്ട് എടുക്കുക.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const data = await getOrgSettings();
    setSettings(data);
  };

  useEffect(() => {
    if (!showCelebration) return;
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    const spread = 75;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: spread, origin: { x: 0, y: 0.8 }, colors: ['#EC008C', '#0054A6'] });
      confetti({ particleCount: 3, angle: 120, spread: spread, origin: { x: 1, y: 0.8 }, colors: ['#EC008C', '#0054A6'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [showCelebration]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
       toast.error("Please select an image file");
       return;
    }
    
    const initialUrl = URL.createObjectURL(file);
    setPreviewUrl(initialUrl);

    try {
      const compressed = await compressImage(file, 600, 600, 0.7);
      const compressedUrl = URL.createObjectURL(compressed);
      setPreviewUrl(compressedUrl);
      
      if (onUpdatePhoto) {
        const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });
        onUpdatePhoto(compressedFile);
      }
    } catch (err) {
      console.error("Compression failed:", err);
      if (onUpdatePhoto) onUpdatePhoto(file);
    }
  };

  const shareImage = async () => {
    if (!cardRef.current) return;
    toast.info('Preparing for WhatsApp sharing...');
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `HCRS_ID_${member.name}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'HCRS Digital ID', text: `${member.name} - ${member.membershipId}` });
        } else {
          const link = document.createElement('a');
          link.download = `HCRS_ID_${member.name}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          toast.info('Sharing intent fallback triggered: Downloader booted.');
        }
      });
    } catch (error) { toast.error('Failed to encode membership card'); }
  };

  const downloadPDF = async () => {
    if (!cardRef.current) return;
    const loadingToast = toast.loading('Building premium print-ready document...');
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3.5, useCORS: true, backgroundColor: '#FFFFFF' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 54, 86, undefined, 'FAST');
      pdf.save(`${member.name}_HCRS_Card.pdf`);
      toast.success('Successfully downloaded Premium PDF!', { id: loadingToast });
    } catch (error) { toast.error('Download failed. Please try again.', { id: loadingToast }); }
  };

  const districtName = DISTRICTS.find(d => d.code === member.district)?.name || member.district;

  const formatDate = (date: any) => {
    if (!date) return 'Processing...';
    try {
      if (date?.toDate) return date.toDate().toLocaleDateString('en-IN');
      if (date?.seconds) return new Date(date.seconds * 1000).toLocaleDateString('en-IN');
      const d = new Date(date);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('en-IN');
    } catch (e) {
      return '---';
    }
  };

  const isExpired = member.role !== 'admin' && member.role !== 'operator' && !member.isAdmin && member.status !== 'pending' && (
    member.renewalPending ||
    (() => {
      const exp = member.expiryDate || (() => {
        const reg = member.registrationDate;
        if (!reg) return null;
        const regD = reg.toDate ? reg.toDate() : (reg.seconds ? new Date(reg.seconds * 1000) : new Date(reg));
        if (isNaN(regD.getTime())) return null;
        const expD = new Date(regD);
        expD.setFullYear(expD.getFullYear() + 1);
        return expD;
      })();
      if (!exp) return true;
      const d = exp.toDate ? exp.toDate() : (exp.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
      return isNaN(d.getTime()) ? true : d.getTime() < Date.now();
    })()
  );

  const getRenewalDate = (date: any) => {
    // If we have an explicit expiry date, use that!
    const exp = member.expiryDate;
    if (exp) {
      try {
        const d = exp?.toDate ? exp.toDate() : (exp?.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
        if (!isNaN(d.getTime())) {
          const isPast = d.getTime() < Date.now();
          return `${d.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
        }
      } catch (e) {
        // Fallback
      }
    }
    
    // Fallback if no expiry date on user profile
    if (!date) return '---';
    try {
      const d = date?.toDate ? date.toDate() : (date?.seconds ? new Date(date.seconds * 1000) : new Date(date));
      if (isNaN(d.getTime())) return '---';
      d.setFullYear(d.getFullYear() + 1);
      const isPast = d.getTime() < Date.now();
      return `${d.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
    } catch (e) {
      return '---';
    }
  };

  const VERCEL_URL = 'https://hcrs-kappa.vercel.app';
  const baseUrl = typeof window !== 'undefined' && 
    !window.location.origin.includes('ais-dev') && 
    !window.location.origin.includes('ais-pre') && 
    !window.location.origin.includes('localhost') && 
    !window.location.origin.includes('127.0.0.1') && 
    !window.location.origin.includes('google.com')
      ? window.location.origin 
      : VERCEL_URL;

  // Public QR Generator API pointing to verification profile URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${baseUrl}/verify/${member.uid || 'guest'}`)}`;

  const cardDetails = [
    { label: 'Phone', value: member.mobile || 'N/A', icon: Phone },
    ...(member.renewalDate ? [
      { label: 'Join Date', value: formatDate(member.registrationDate), icon: Award },
      { label: 'Renewed', value: formatDate(member.renewalDate), icon: Calendar },
      { label: 'Expiry Date', value: getRenewalDate(member.registrationDate), icon: Clock }
    ] : [
      { label: 'Email', value: member.email || 'N/A', icon: Mail },
      { label: 'Join Date', value: formatDate(member.registrationDate), icon: Award },
      { label: 'Expiry Date', value: getRenewalDate(member.registrationDate), icon: Clock }
    ])
  ];

  return (
    <div className="flex flex-col items-center gap-8 p-4 selection:bg-brand-blue/10 animate-in fade-in zoom-in duration-500 w-full max-w-md mx-auto">
      {showCelebration && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-2 mt-2">
          <div className="bg-brand-blue/5 text-brand-blue px-5 py-1.5 rounded-full text-[10px] font-black border border-brand-blue/10 inline-flex items-center gap-1.5 uppercase tracking-widest">
             <PartyPopper className="w-3.5 h-3.5" /> Registered Member
          </div>
          <h2 className="text-lg font-black text-brand-magenta uppercase tracking-tighter leading-none italic mt-1">
            Welcome to highrich family
          </h2>
        </motion.div>
      )}

      {/* Screenshot Friendly Outer Backdrop Container - Enhanced with hyper-realistic Wooden Surface Mockup */}
      <div className="w-full bg-[#3c2517] p-5 md:p-6 rounded-[32px] border-4 border-[#25150c] flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-2xl min-h-[660px]">
        {/* Deep luxurious wood background, planks and lighting highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#4a3121] to-[#25150c] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.22] bg-[repeating-linear-gradient(0deg,#1c0d06_0px,#1c0d06_1px,transparent_1px,transparent_20px)] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.12] bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_45px,#000_45px,#000_46px)] pointer-events-none" />
        {/* Soft radial overlay mimicking high-end restaurant/gallery lamp spot */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.85)_100%)] pointer-events-none" />
        {/* Glossy varnish light streak reflection */}
        <div className="absolute -top-[30%] -left-[20%] w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.12] rotate-[22deg] pointer-events-none" />

        {/* Core Premium 3D PVC ID Card with Double Metallic Bevel Frame (Gold theme for Life Member, Slate theme for Adhoc Member) */}
        {(() => {
          const isLifeMember = member.membership_type === 'LIFE_MEMBER';
          const cardBorderClass = isLifeMember 
            ? "border-[6px] border-[#D4AF37] shadow-[25px_30px_50px_rgba(0,0,0,0.95)] bg-gradient-to-br from-[#24170b] via-[#120803] to-[#040201]"
            : "border-[6px] border-slate-700/85 shadow-[25px_30px_50px_rgba(0,0,0,0.9)] bg-gradient-to-br from-[#121b2b] via-[#090f19] to-[#02050b]";

          const itemPlateClass = `border-t border-b rounded-lg p-1.5 flex items-center justify-between transition-all ${
            isLifeMember 
              ? 'bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-[#9A7D0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_2px_3px_rgba(0,0,0,0.4)] text-[#1a0f02]'
              : 'bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-350 shadow-[inset_0_1px_1px_white,0_2px_3px_rgba(0,0,0,0.22)] text-[#0f172a]'
          }`;

          const textTitleClass = `text-[7px] font-black uppercase tracking-wider ${
            isLifeMember ? 'text-amber-950/80 font-sans' : 'text-slate-500 font-sans'
          }`;

          const textValueClass = `text-[10px] font-black font-mono transition-all ${
            isLifeMember ? 'text-[#180a01]' : 'text-[#0f172a]'
          }`;

          const qrPlateBg = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-600 shadow-[inset_0_1px_1px_white,0_2px_3px_rgba(0,0,0,0.4)]"
            : "bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-300 shadow-[inset_0_1px_1px_white,0_2.5px_4px_rgba(0,0,0,0.4)]";

          const signaturePlateBg = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-600 shadow-[inset_0_1px_1px_white,0_2.5px_4px_rgba(0,0,0,0.4)] text-[#1a0f02]"
            : "bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-300 text-[#0f172a]";

          const logoRingClass = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-[#9A7D0A]"
            : "bg-gradient-to-b from-[#ffffff] via-[#e2e8f0] to-[#cbd5e1] border-slate-350";

          const photoRingClass = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-600"
            : "bg-gradient-to-b from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] border-slate-350";

          const namePlateClass = isLifeMember
            ? "bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-amber-700"
            : "bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-400";

          return (
            <div 
              ref={cardRef} 
              className={`w-[340px] h-[590px] rounded-[24px] text-slate-800 relative overflow-hidden font-sans flex flex-col justify-between shrink-0 select-none ${cardBorderClass}`}
            >
              {isExpired && (
                <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[1px] z-40 flex items-center justify-center pointer-events-none">
                  <div className="bg-gradient-to-r from-red-700 to-red-600 text-white font-black uppercase text-[10px] tracking-[0.2em] px-5 py-2.5 rounded-xl shadow-2xl -rotate-12 border border-red-500/30 flex items-center gap-2 select-none scale-105">
                    <Clock className="w-4 h-4 animate-pulse text-white" /> EXPIRED (കാലാവധി കഴിഞ്ഞു)
                  </div>
                </div>
              )}
              {!isExpired && member.status === 'pending' && (
                <div className="absolute inset-0 bg-amber-950/15 backdrop-blur-[1px] z-40 flex items-center justify-center pointer-events-none">
                  <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-black uppercase text-[10px] tracking-[0.15em] px-5 py-3 rounded-xl shadow-2xl -rotate-12 border border-amber-400/30 flex flex-col items-center gap-1 text-center select-none scale-105">
                    <Clock className="w-4 h-4 animate-pulse text-white" />
                    <span>PENDING APPROVAL</span>
                    <span className="text-[9px] font-bold block normal-case">(അപ്രൂവലിനായി കാത്തിരിക്കുന്നു)</span>
                  </div>
                </div>
              )}

              {/* Top Premium Card Margin strip - Gold or Magenta */}
              <div className={`h-1.5 w-full absolute top-0 left-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${isLifeMember ? 'bg-gradient-to-r from-amber-300 via-[#D4AF37] to-amber-800' : 'bg-gradient-to-r from-[#FF1493] via-[#ec008c] to-[#990055]'}`} />

              {/* Header section with HCRS Logo Left + Metallic Embossed Panel Right */}
              <div className="p-4 pt-5 shrink-0 flex items-center justify-between gap-3 relative">
                {/* Circular Frame for official logo */}
                <div className={`p-1 rounded-full shadow-[inset_0_1.5px_2px_rgba(255,255,255,1),0_3px_6px_rgba(0,0,0,0.5)] w-[52px] h-[52px] flex items-center justify-center border shrink-0 ${logoRingClass}`}>
                  <div className="bg-white rounded-full p-0.5 w-full h-full flex items-center justify-center overflow-hidden">
                    <img 
                      src="https://i.ibb.co/DHKT5DRn/1000072034-removebg-preview-1.png" 
                      alt="HCRS Official Logo" 
                      className="w-10 h-10 object-contain" 
                      crossOrigin="anonymous" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Premium Embossed Header Panel */}
                <div className={`flex-1 p-2 rounded-xl border-t border-b shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2.5px_4px_rgba(0,0,0,0.35)] text-center ${isLifeMember ? 'bg-gradient-to-b from-[#FFFDF5] via-[#F7DC6F] to-[#B7950B] border-amber-600' : 'bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#94a3b8] border-slate-400'}`}>
                  <h1 className="text-slate-900 text-[8.5px] font-black leading-tight uppercase tracking-tight">
                    HIGHRICH COMMUNITY REVIVAL SOCIETY
                  </h1>
                  <div className={`w-full h-[1px] my-1 ${isLifeMember ? 'bg-amber-800/35' : 'bg-slate-350'}`} />
                  <p className={`text-[7px] font-black tracking-widest uppercase leading-none italic ${isLifeMember ? 'text-amber-950 font-sans' : 'text-brand-magenta'}`}>
                    {isLifeMember ? "FOUNDING LIFE MEMBER" : "TOGETHER WE GROW"}
                  </p>
                </div>
              </div>

              {/* Profile and Name section with Ring Highlights & Metallic Plates */}
              <div className="flex flex-col items-center shrink-0 relative text-center">
                {/* Circular picture formatted inside heavy-beveled gold/silver ring */}
                <label className={`${isReadOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'} group block`}>
                  {!isReadOnly && <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />}
                  <div className={`w-[102px] h-[102px] rounded-full p-1 border shadow-[0_4px_8px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform duration-300 ${photoRingClass}`}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative border-4 border-white shadow-inner">
                      {previewUrl || member.photoUrl ? (
                        <>
                          <img src={previewUrl || member.photoUrl} alt="Photo" className="w-full h-full object-cover" crossOrigin="anonymous" />
                          {!isReadOnly && (
                            <div className="absolute inset-0 bg-brand-blue/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1.5px]">
                              <Camera size={14} className="text-white" />
                              <span className="text-[6px] font-black uppercase tracking-wider">Update</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 relative">
                          <User size={34} className="text-slate-400 shrink-0" />
                          {!isReadOnly && (
                            <div className="absolute inset-0 bg-brand-blue/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1.5px]">
                              <Camera size={14} className="text-white" />
                              <span className="text-[6px] font-black uppercase tracking-wider">Add Photo</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                {/* Member Name Embossed Plate */}
                <div className={`mt-2.5 w-[85%] mx-auto py-1 px-3 rounded-lg border-t border-b shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] ${namePlateClass}`}>
                  <h3 className="text-[11.5px] font-extrabold text-slate-900 uppercase leading-none tracking-tight truncate max-w-[240px] mx-auto">
                    {member.name}
                  </h3>
                </div>

                {/* Membership Category Ribbon block */}
                <div className="mt-2 flex items-center justify-center">
                  {isLifeMember ? (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-550 to-amber-600 text-white text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg border border-amber-300">
                      👑 LIFE MEMBER
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-[#0b101a] border border-slate-800 text-slate-200 text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-md">
                      💼 ADHOC MEMBER
                    </span>
                  )}
                </div>

                {/* District & Mandalam (Assembly Constituency is Mandalam) */}
                <p className={`text-[9px] font-black uppercase tracking-wider mt-2 font-sans ${isLifeMember ? 'text-amber-500' : 'text-brand-magenta'}`}>
                  {districtName} DISTRICT - {member.constituencyCode || (member.assemblyConstituency ? getAssemblyCode(member.assemblyConstituency) : 'NA')}
                </p>
              </div>

              {/* Member Details Columns Section styled as Stacked Premium Plates */}
              <div className="px-5 space-y-1.5 py-1 shrink-0">
                {/* 1. MEMBER ID */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>MEMBER ID</span>
                  <span className={textValueClass}>{member.membershipId || 'KL/HCRS/PENDING'}</span>
                </div>

                {/* 2. PHONE */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>PHONE</span>
                  <span className={textValueClass}>{member.mobile || 'N/A'}</span>
                </div>

                {/* 3. EMAIL */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>EMAIL</span>
                  <span className={`${textValueClass} truncate max-w-[170px] text-right`}>{member.email || 'N/A'}</span>
                </div>

                {/* 4. JOIN DATE */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>JOIN DATE</span>
                  <span className={textValueClass}>{formatDate(member.registrationDate)}</span>
                </div>

                {/* 5. EXPIRY DATE */}
                <div className={itemPlateClass}>
                  <span className={textTitleClass}>{isLifeMember ? 'VALIDITY' : 'EXPIRY DATE'}</span>
                  <span className={`${textValueClass} ${!isLifeMember ? 'text-brand-magenta' : 'text-amber-900 font-extrabold animate-pulse'}`}>
                    {isLifeMember ? '⭐ PERMANENT ACTIVE' : getRenewalDate(member.registrationDate)}
                  </span>
                </div>
              </div>

              {/* Bottom section with QR layout & verified signatures on Plates */}
              <div className="border-t border-slate-800/50 pt-2 px-4 pb-[11px] shrink-0 flex items-center justify-between gap-2 bg-black/40 relative">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-blue via-transparent to-[#FF1493] z-10" />

                {/* Interactive Live Verification QR Code framed in embossed gold/silver plate */}
                <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 w-[64px] h-[75px] ${qrPlateBg}`}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Verification QR" 
                    className="w-[38px] h-[38px] object-contain" 
                    crossOrigin="anonymous" 
                  />
                  <span className={`text-[4.5px] font-black uppercase mt-1 tracking-widest text-center leading-none ${isLifeMember ? 'text-amber-950' : 'text-indigo-950'}`}>SCAN TO VERIFY</span>
                </div>

                {/* Secretary Signature Plate */}
                <div className={`flex-1 p-1.5 rounded-xl border flex flex-col justify-between items-center h-[75px] text-center ${signaturePlateBg}`}>
                  <div className="flex-1 flex items-center justify-center">
                    <span 
                      className={`text-[13px] font-normal select-none tracking-normal italic leading-none ${isLifeMember ? 'text-amber-950' : 'text-indigo-950'}`}
                      style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                    >
                      Bineesh Kumar
                    </span>
                  </div>
                  <div className={`w-full border-t my-0.5 ${isLifeMember ? 'border-amber-700/30' : 'border-slate-350'}`} />
                  <p className={`text-[5.5px] font-black uppercase tracking-tight leading-none truncate max-w-full ${isLifeMember ? 'text-amber-900' : 'text-slate-700'}`}>
                    Bineesh Kumar
                  </p>
                  <p className={`text-[4.5px] font-black uppercase tracking-widest leading-none mt-0.5 ${isLifeMember ? 'text-amber-850/70' : 'text-slate-400'}`}>SECRETARY</p>
                </div>

                {/* President Signature Plate */}
                <div className={`flex-1 p-1.5 rounded-xl border flex flex-col justify-between items-center h-[75px] text-center ${signaturePlateBg}`}>
                  <div className="flex-1 flex items-center justify-center">
                    <span 
                      className={`text-[14px] font-normal select-none tracking-normal italic leading-none ${isLifeMember ? 'text-amber-950' : 'text-indigo-950'}`}
                      style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                    >
                      M. A. Bari
                    </span>
                  </div>
                  <div className={`w-full border-t my-0.5 ${isLifeMember ? 'border-amber-700/30' : 'border-slate-350'}`} />
                  <p className={`text-[5.5px] font-black uppercase tracking-tight leading-none truncate max-w-full ${isLifeMember ? 'text-amber-900' : 'text-slate-700'}`}>
                    M. A. Bari
                  </p>
                  <p className={`text-[4.5px] font-black uppercase tracking-widest leading-none mt-0.5 ${isLifeMember ? 'text-amber-850' : 'text-[#FF1493]'}`}>PRESIDENT</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Sleek Action Controls */}
      <div className="flex flex-col gap-4 w-full px-2 pb-24 shrink-0 transition-all font-sans">
        {(member.status === 'active' || member.isApproved || isAdmin) && (
          <div className="flex flex-col gap-3">
            {!isScreenshotMode ? (
              <>
                {/* Visual Instructional Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-250/60 rounded-[20px] p-4 space-y-2 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-2 text-amber-700 font-extrabold text-[11px] uppercase tracking-wider">
                    <Camera className="w-4 h-4 text-brand-magenta animate-pulse" />
                    <span>മെമ്പർഷിപ്പ് കാർഡ് ലഭിക്കാൻ (Instruction)</span>
                  </div>
                  <p className="text-[11.5px] font-bold text-slate-700 leading-relaxed">
                    മൊബൈൽ ഫോണുകളിൽ കാർഡ് നേരിട്ട് ഡൗൺലോഡ് ചെയ്യുന്നത് തടസ്സപ്പെടാൻ സാധ്യതയുള്ളതിനാൽ ദയവായി ഈ <strong className="text-[#FF1493] font-black">കാർഡ് നിങ്ങളുടെ ഫോണിൽ ഒരു സ്ക്രീൻഷോട്ട് (Screenshot)</strong> എടുത്തു സൂക്ഷിക്കുക!
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    (താഴെയുള്ള 'Screenshot Mode' ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ കാർഡ് മാത്രമായി ലഭിക്കും)
                  </p>
                </div>

                {/* Primary Action Button: Screenshot Assist Mode */}
                <Button 
                  onClick={() => setIsScreenshotMode(true)}
                  className="w-full h-12 font-black rounded-xl text-xs uppercase tracking-wider shadow-md bg-brand-blue hover:bg-brand-blue/95 text-white flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Camera className="w-4 h-4 text-white animate-bounce" />
                  <span>📸 Screenshot Mode (കാർഡ് മാത്രം കാണുക)</span>
                </Button>
              </>
            ) : (
              <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-3 px-6 shadow-2xl text-center">
                <div className="flex items-center justify-center gap-1.5 text-brand-magenta font-black text-[10px] uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-brand-magenta animate-pulse" />
                  <span>Screenshot Mode Active</span>
                </div>
                <p className="text-[11px] font-bold text-slate-200 leading-relaxed">
                  മറ്റു ബട്ടണുകൾ എല്ലാം മാറ്റിവെച്ചിട്ടുണ്ട്. കാർഡ് പൂർണ്ണമായി കാണാം. ഇപ്പോൾ നിങ്ങൾക്ക് <strong className="text-white font-extrabold">ഒരു സ്ക്രീൻഷോട്ട് (Screenshot)</strong> എടുക്കാം.
                </p>
                <Button 
                  onClick={() => setIsScreenshotMode(false)}
                  className="w-full h-11 bg-brand-magenta hover:bg-brand-magenta/90 text-white rounded-xl font-black uppercase text-[10.5px] tracking-wider transition-transform active:scale-95"
                >
                  Exit Mode (തിരികെ പേജിലേക്ക് പോകുക)
                </Button>
              </div>
            )}
          </div>
        )}
        {!isScreenshotMode && onLogout && (
          <div className="pt-6 flex justify-center w-full">
            <Button 
               variant="ghost" 
               onClick={onLogout} 
               className="font-bold text-[9px] uppercase tracking-widest text-red-500 hover:text-red-650 hover:bg-red-50/50 px-6 h-9 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
