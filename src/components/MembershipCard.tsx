import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, MapPin, ShieldCheck, Camera, PartyPopper, Share2, LogOut, Calendar, Phone, Mail, Award, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserProfile } from '@/src/types';
import { DISTRICTS } from '@/src/constants';
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
}

export default function MembershipCard({ member, onUpdatePhoto, showCelebration = true, isAdmin = false, onLogout }: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

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
    { label: 'Email', value: member.email || 'N/A', icon: Mail },
    { label: 'Join Date', value: formatDate(member.registrationDate), icon: Award },
    { label: 'Expiry Date', value: getRenewalDate(member.registrationDate), icon: Clock },
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

      {/* Screenshot Friendly Outer Backdrop Container */}
      <div className="w-full bg-slate-50/70 p-6 md:p-8 rounded-[36px] border border-slate-200/50 flex flex-col items-center justify-center shadow-inner relative overflow-hidden shrink-0">
        {/* Abstract vector backgrounds for beautiful depth framing */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-magenta/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-blue/5 blur-3xl rounded-full pointer-events-none" />
        
        {/* Core PVC-style ID Card Object */}
        <div 
          ref={cardRef} 
          className="w-[345px] h-[610px] bg-white rounded-[24px] text-slate-800 relative shadow-[0_24px_50px_rgba(0,0,0,0.12)] overflow-hidden font-sans border border-slate-200 flex flex-col justify-between shrink-0 select-none"
        >
          {isExpired && (
            <div className="absolute inset-0 bg-red-650/15 backdrop-blur-[1px] z-40 flex items-center justify-center pointer-events-none">
              <div className="bg-red-600/90 text-white font-black uppercase text-[10px] tracking-[0.2em] px-5 py-2.5 rounded-xl shadow-2xl -rotate-12 border border-red-500/30 flex items-center gap-2 select-none scale-110">
                <Clock className="w-4 h-4 animate-pulse text-white" /> EXPIRED (കാലാവധി കഴിഞ്ഞു)
              </div>
            </div>
          )}
          {/* Top Premium Card Margin Strip */}
          <div className="bg-brand-magenta h-1.5 w-full absolute top-0 left-0 z-30" />
          
          {/* Header section with branding & metallic logo frame - centered aligned */}
          <div className="bg-gradient-to-br from-brand-blue via-brand-blue to-indigo-950 h-[140px] relative px-4 pt-4 shrink-0 flex flex-col items-center justify-center text-center">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-magenta/15 blur-xl pointer-events-none" />
            
            <div className="bg-white/95 p-1 rounded-full shadow-md w-12 h-12 flex items-center justify-center border border-white/20 shrink-0 relative z-10 mb-1">
              <img 
                src="https://i.ibb.co/DHKT5DRn/1000072034-removebg-preview-1.png" 
                alt="HCRS Official Logo" 
                className="w-10 h-10 object-contain" 
                crossOrigin="anonymous" 
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="relative z-10">
              <h1 className="text-white text-[10px] font-black leading-none uppercase tracking-tight">
                HIGHRICH COMMUNITY REVIVAL SOCIETY
              </h1>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-brand-magenta font-black text-[12px] tracking-wider leading-none">HCRS</span>
                <span className="h-2.5 w-px bg-white/20" />
                <span className="text-[7.5px] text-slate-200 leading-none font-semibold tracking-wider italic uppercase">
                  "Together We Grow"
                </span>
              </div>
            </div>
          </div>

          {/* Profile section with ring highlights */}
          <div className="flex flex-col items-center shrink-0 relative z-20 -mt-10 mb-1">
            <label className="cursor-pointer group">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className="w-[96px] h-[96px] rounded-full p-1 bg-gradient-to-tr from-brand-blue to-brand-magenta shadow-md hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative border-4 border-white">
                  {previewUrl || member.photoUrl ? (
                    <>
                      <img src={previewUrl || member.photoUrl} alt="Photo" className="w-full h-full object-cover" crossOrigin="anonymous" />
                      <div className="absolute inset-0 bg-brand-blue/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1.5px]">
                        <Camera size={14} className="text-white" />
                        <span className="text-[6px] font-black uppercase tracking-wider">Update</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 relative">
                      <User size={36} className="text-slate-400 shrink-0" />
                      <div className="absolute inset-0 bg-brand-blue/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1.5px]">
                        <Camera size={14} className="text-white" />
                        <span className="text-[6px] font-black uppercase tracking-wider">Add Photo</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </label>

            <div className="mt-2.5 text-center px-4 w-full">
              <h3 className="text-base font-black text-slate-800 uppercase leading-none tracking-tight truncate max-w-[280px] mx-auto">
                {member.name}
              </h3>
              
              {/* Membership ID Number styled like pure metallic card badges */}
              <div className="mt-2 inline-flex items-center gap-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-105 rounded-md px-4 py-1">
                <span className="text-[8px] text-brand-blue font-black tracking-wider uppercase">MEMBER ID:</span>
                <span className="text-sm font-black text-brand-blue font-mono tracking-tight leading-none">
                  {member.membershipId || 'KL/HCRS/PENDING'}
                </span>
              </div>
              
              <p className="text-[10px] font-black text-brand-magenta uppercase tracking-widest mt-1.5">
                {districtName} DISTRICT
              </p>
            </div>
          </div>

          {/* Member Details Columns Section */}
          <div className="px-5 py-1 shrink-0">
            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-3.5 space-y-2 shadow-inner">
              {cardDetails.map((detail, idx) => {
                const IconComponent = detail.icon;
                return (
                  <div key={idx} className="flex justify-between items-center text-[10.5px]">
                    <div className="flex items-center gap-2 text-slate-500 shrink-0">
                      <IconComponent className="w-3.5 h-3.5 text-brand-blue/75" />
                      <span className="font-bold text-[8px] uppercase tracking-wider">{detail.label}</span>
                    </div>
                    <span className="font-black text-slate-800 truncate pl-4 max-w-[195px] text-right font-mono">
                      {detail.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom section with QR layout & verified signatures */}
          <div className="border-t border-slate-100 pt-3 px-5 pb-3.5 shrink-0 flex items-center justify-between bg-slate-50/40 relative">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-blue via-white to-brand-magenta z-10" />
            
            {/* Live QR Code verification block */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-1 rounded-lg border border-slate-200/80 shadow-xs">
                <img 
                  src={qrCodeUrl} 
                  alt="Verification QR" 
                  className="w-[50px] h-[50px] object-contain" 
                  crossOrigin="anonymous" 
                />
              </div>
              <p className="text-[5.5px] font-black text-slate-400 mt-1 uppercase tracking-widest leading-none">VERIFIED MEMBER</p>
            </div>

            {/* Secretary Signature */}
            <div className="text-center flex flex-col items-center select-none pt-1">
              <div className="h-7 flex items-end justify-center pb-0.5">
                <span 
                  className="text-[14px] font-normal text-indigo-900 select-none tracking-normal italic"
                  style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                >
                  Bineesh Kumar
                </span>
              </div>
              <div className="w-20 border-t border-slate-350 my-0.5" />
              <p className="text-[5.5px] font-black text-slate-550 uppercase tracking-wider leading-none">
                Bineesh Kumar M Alphons
              </p>
              <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest mt-0.5 leading-none">SECRETARY</p>
            </div>

            {/* President Signature */}
            <div className="text-center flex flex-col items-center select-none pt-1">
              <div className="h-7 flex items-end justify-center pb-0.5">
                <span 
                  className="text-[15px] font-normal text-indigo-900 select-none tracking-normal italic"
                  style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                >
                  M. A. Bari
                </span>
              </div>
              <div className="w-20 border-t border-slate-350 my-0.5" />
              <p className="text-[5.5px] font-black text-slate-550 uppercase tracking-wider leading-none">
                Mohamed Abdul Bari
              </p>
              <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest mt-0.5 leading-none">PRESIDENT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sleek Action Controls */}
      <div className="flex flex-col gap-4 w-full px-2 pb-24 shrink-0 transition-all font-sans">
        {(member.status === 'active' || member.isApproved || isAdmin) && (
          <div className="flex flex-col gap-3">
            {!isScreenshotMode ? (
              <>
                <div className="text-center space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                    ക്രെഡൻഷ്യൽ ശരിയായി റെൻഡർ ആകുന്നില്ലെങ്കിൽ സ്ക്രീൻഷോട്ട് എടുക്കുക
                  </p>
                </div>
                <Button 
                  onClick={downloadPDF} 
                  className="w-full h-11 font-black rounded-xl text-xs uppercase tracking-wider shadow-sm bg-brand-blue hover:bg-brand-blue/95 text-white"
                >
                  <Download className="mr-1.5 w-4 h-4" /> Download Certificate
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={shareImage} 
                    variant="outline" 
                    className="h-10 rounded-xl font-bold text-[9px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 bg-white text-brand-blue"
                  >
                    <Share2 className="mr-1.5 w-3.5 h-3.5" /> Share Image
                  </Button>
                  <Button 
                    onClick={() => setIsScreenshotMode(true)}
                    variant="outline" 
                    className="h-10 rounded-xl font-bold text-[9px] uppercase tracking-wider border-emerald-100 hover:bg-emerald-50 bg-emerald-50/10 text-emerald-600"
                  >
                    <Camera className="mr-1.5 w-3.5 h-3.5" /> Screenshot
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200/50 space-y-3 text-center">
                <p className="text-[10px] font-black text-brand-magenta uppercase tracking-wider">Screenshot Assistant Ready</p>
                <p className="text-[8px] font-semibold text-slate-405 leading-relaxed">
                  ബട്ടണുകൾ എല്ലാം ഹൈഡ് ചെയ്തിട്ടുണ്ട്. ഇപ്പോൾ നിങ്ങളുടെ ഫോണിൽ സ്ക്രീൻഷോട്ട് എടുക്കാം.
                </p>
                <Button 
                  onClick={() => setIsScreenshotMode(false)}
                  className="w-full h-9 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-black uppercase text-[8px] tracking-widest"
                >
                  Exit Camera Mode
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
