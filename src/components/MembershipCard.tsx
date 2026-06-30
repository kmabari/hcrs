import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Camera, PartyPopper, LogOut, Calendar, Phone, Mail, Award, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserProfile } from '@/src/types';
import { DISTRICTS, getAssemblyCode, SHARED_URL } from '@/src/constants';
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
  onScreenshotModeChange?: (active: boolean) => void;
}

export default function MembershipCard({ member, onUpdatePhoto, showCelebration = true, isAdmin = false, onLogout, isReadOnly = false, onScreenshotModeChange }: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    onScreenshotModeChange?.(isScreenshotMode);
  }, [isScreenshotMode, onScreenshotModeChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const targetWidth = 340;
        const paddedWidth = width - 20; 
        const targetScale = paddedWidth < targetWidth ? Math.max(0.35, paddedWidth / targetWidth) : 1;
        requestAnimationFrame(() => { setScale(targetScale); });
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleGenerateImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    const loadingToast = toast.loading('മെമ്പർഷിപ്പ് കാർഡ് ഡൗൺലോഡിനായി തയാറാക്കുന്നു...');
    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      const canvas = await html2canvas(cardRef.current, { 
        scale: 3, useCORS: true, backgroundColor: null, scrollX: 0, scrollY: 0, windowWidth: 340, windowHeight: 590
      });
      const imgData = canvas.toDataURL('image/png');
      setGeneratedImage(imgData);
      try {
        const link = document.createElement('a');
        link.download = `HCRS_CARD_${member.name.trim().replace(/\s+/g, '_')}.png`;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('കാർഡ് വിജയകരമായി ഫോണിലേക്ക് ഡൗൺലോഡ് ചെയ്‌തിട്ടുണ്ട്!', { id: loadingToast });
      } catch (innerErr) {
        toast.success('ഫോട്ടോ തയാറായിട്ടുണ്ട്!', { id: loadingToast });
      }
    } catch (error: any) {
      toast.error('ചിത്രം തയ്യാറാക്കാൻ കഴിഞ്ഞില്ല.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);
  const fetchSettings = async () => { const data = await getOrgSettings(); setSettings(data); };

  useEffect(() => {
    if (!showCelebration) return;
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 75, origin: { x: 0, y: 0.8 }, colors: ['#EC008C', '#0054A6'] });
      confetti({ particleCount: 3, angle: 120, spread: 75, origin: { x: 1, y: 0.8 }, colors: ['#EC008C', '#0054A6'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [showCelebration]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    } catch (err) { if (onUpdatePhoto) onUpdatePhoto(file); }
  };

  const districtName = DISTRICTS.find(d => d.code === member.district)?.name || member.district;

  const formatDate = (date: any) => {
    if (!date) return 'Processing...';
    try {
      if (date?.toDate) return date.toDate().toLocaleDateString('en-IN');
      if (date?.seconds) return new Date(date.seconds * 1000).toLocaleDateString('en-IN');
      const d = new Date(date);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('en-IN');
    } catch (e) { return '---'; }
  };

  const isLifeMember = String(member.membership_type || '').toUpperCase().includes('LIFE') || String(member.membershipType || '').toUpperCase().includes('LIFE');
  const isBanned = (member.status || '').toLowerCase() === 'banned' || (member.status || '').toLowerCase() === 'disabled';
  const isExpired = member.role !== 'admin' && member.role !== 'operator' && !member.isAdmin && member.status !== 'pending' && member.renewalPending !== true && !isLifeMember && (
    (() => {
      const exp = member.expiryDate || (() => {
        const reg = member.registrationDate;
        if (!reg) return null;
        const regD = reg.toDate ? reg.toDate() : (reg.seconds ? new Date(reg.seconds * 1000) : new Date(reg));
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
    const exp = member.expiryDate;
    if (exp) {
      try {
        const d = exp?.toDate ? exp.toDate() : (exp?.seconds ? new Date(exp.seconds * 1000) : new Date(exp));
        if (!isNaN(d.getTime())) {
          const isPast = d.getTime() < Date.now();
          return `${d.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
        }
      } catch (e) {}
    }
    if (!date) return '---';
    try {
      const d = date?.toDate ? date.toDate() : (date?.seconds ? new Date(date.seconds * 1000) : new Date(date));
      if (isNaN(d.getTime())) return '---';
      d.setFullYear(d.getFullYear() + 1);
      const isPast = d.getTime() < Date.now();
      return `${d.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
    } catch (e) { return '---'; }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : SHARED_URL;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${baseUrl}/verify/${member.uid || 'guest'}`)}`;

  return (
    <div className="flex flex-col items-center gap-8 p-1 sm:p-4 w-full max-w-md mx-auto">
      <div ref={containerRef} style={{ minHeight: '630px' }} className="w-full bg-[#3c2517] p-2.5 sm:p-5 rounded-[32px] border-4 border-[#25150c] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4a3121] to-[#25150c]" />
        
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '340px', height: '590px' }}>
          <div ref={cardRef} className="w-[340px] h-[590px] rounded-[24px] bg-slate-900 border-[6px] border-slate-700 relative flex flex-col justify-between overflow-hidden">
            
            {/* RENEWAL PENDING സീൽ ഇവിടെ വരുന്നു */}
            {member.renewalPending === true && !isBanned && !isExpired && (
              <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] z-40 pointer-events-none select-none">
                <div className="border-[4px] border-double border-red-600/90 p-2 px-3 rounded-xl flex flex-col items-center justify-center bg-white/10 backdrop-blur-[0.5px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] max-w-[220px]">
                  <span className="text-[12px] font-black tracking-[0.12em] text-red-600 font-sans uppercase">RENEWAL PENDING</span>
                  <div className="w-full h-[1.5px] bg-red-600/80 my-1" />
                  <span className="text-[11.5px] font-extrabold text-red-600 text-center font-sans">പുതുക്കൽ പരിശോധനയിൽ</span>
                </div>
              </div>
            )}

            <div className="p-6 text-white text-center">
              <h3 className="text-xl font-black">{member.name}</h3>
              <p className="text-sm font-bold text-brand-magenta">{member.membershipId}</p>
            </div>
            
            <div className="p-6 text-white">
              <p>District: {districtName}</p>
              <p>Expiry: {getRenewalDate(member.registrationDate)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <Button onClick={handleGenerateImage} className="w-full h-12 bg-[#0054A6] text-white">
        Download Card
      </Button>
    </div>
  );
}
