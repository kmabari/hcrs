import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, MapPin, ShieldCheck, Camera, PartyPopper, Share2, LogOut, Calendar, Phone, Mail, Award, Clock, User, Printer, FileText, MessageCircle, Headphones, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserProfile } from '@/src/types';
import { DISTRICTS, getAssemblyCode } from '@/src/constants';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { compressImage, html2canvasOklchOnClone, imageUrlToDataUrl, triggerFileDownload } from '@/src/lib/imageUtils';
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && member?.uid) {
      return localStorage.getItem(`local_card_photo_${member.uid}`) || member.photoUrl || null;
    }
    return member?.photoUrl || null;
  });
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const exitScreenshotMode = () => {
    setIsScreenshotMode(false);
    if (typeof window !== 'undefined' && window.history.state?.screenshotMode) {
      window.history.back();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isScreenshotMode) {
      window.history.pushState({ screenshotMode: true }, '');
      
      const handlePopState = (e: PopStateEvent) => {
        setIsScreenshotMode(false);
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isScreenshotMode]);

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
        const availableWidth = width > 0 ? width - (isScreenshotMode ? 12 : 20) : (window.innerWidth - 24);
        const targetScale = availableWidth < targetWidth ? Math.max(0.35, availableWidth / targetWidth) : 1;
        
        requestAnimationFrame(() => {
          setScale(targetScale);
        });
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [isScreenshotMode]);

  const handleGenerateImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    const loadingToast = toast.loading('മെമ്പർഷിപ്പ് കാർഡ് ഡൗൺലോഡിനായി തയാറാക്കുന്നു...');
    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      // Focus on card element precisely
      const canvas = await renderCardToCanvas(3);
      if (!canvas) {
        throw new Error('Canvas render returned null');
      }
      const imgData = canvas.toDataURL('image/png');
      setGeneratedImage(imgData);
      
      // Attempt immediate direct browser download
      try {
        const link = document.createElement('a');
        link.download = `HCRS_CARD_${member.name.trim().replace(/\s+/g, '_')}.png`;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('കാർഡ് വിജയകരമായി ഫോണിലേക്ക് ഡൗൺലോഡ് ചെയ്‌തിട്ടുണ്ട്!', { id: loadingToast });
      } catch (innerErr) {
        console.warn("Direct file anchor download skipped/failed, showing fallback preview:", innerErr);
        toast.success('ഫോട്ടോ തയാറായിട്ടുണ്ട്! താഴെ തെളിഞ്ഞു വരുന്ന ചിത്രത്തിൽ അമർത്തിപ്പിടിച്ചു ഗാലറിയിലേക്ക് സേവ് ചെയ്യാം.', { id: loadingToast });
      }
    } catch (error: any) {
      console.error("Screenshot generation error:", error);
      toast.error('ചിത്രം തയ്യാറാക്കാൻ കഴിഞ്ഞില്ല. ദയവായി നേരിട്ട് സ്ക്രീൻഷോട്ട് എടുക്കുക.', { id: loadingToast });
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

  const getDistrictWhatsAppDetails = () => {
    const rawDist = member.district || '';
    const cleanDist = rawDist.trim().toUpperCase();
    const districtObj = DISTRICTS.find(d => 
      d.code.toUpperCase() === cleanDist || 
      d.name.toUpperCase() === cleanDist ||
      cleanDist.includes(d.code.toUpperCase()) ||
      cleanDist.includes(d.name.toUpperCase())
    );

    const distCode = districtObj ? districtObj.code : rawDist;
    const distName = districtObj ? districtObj.name : (rawDist || 'Kerala');

    const assignedLink = settings.districtWhatsAppLinks?.[distCode] || 
                         settings.districtWhatsAppLinks?.[rawDist] || 
                         settings.districtWhatsAppLinks?.[distName];

    const isActive = (settings.districtWhatsAppActive?.[distCode] !== false) &&
                     (settings.districtWhatsAppActive?.[rawDist] !== false);

    if (assignedLink && isActive) {
      let finalUrl = assignedLink.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        const digits = finalUrl.replace(/\D/g, '');
        finalUrl = digits.length === 10 ? `https://wa.me/91${digits}` : `https://wa.me/${digits}`;
      }
      return {
        url: finalUrl,
        districtName: distName,
        districtCode: distCode,
        isCustom: true
      };
    }

    // Default Central Helpline
    return {
      url: 'https://wa.me/919645934571',
      districtName: distName,
      districtCode: distCode,
      isCustom: false
    };
  };

  const handleOpenCustomerCareWhatsApp = () => {
    const { url, districtName } = getDistrictWhatsAppDetails();
    const greetingText = `*HCRS Customer Care Support Request*%0A%0A*Member Name:* ${encodeURIComponent(member.name || 'Member')}%0A*Membership ID:* ${encodeURIComponent(member.membershipId || 'N/A')}%0A*District:* ${encodeURIComponent(districtName)}%0A*Mobile:* ${encodeURIComponent(member.mobile || '')}%0A%0A_Hello Customer Care, I need assistance regarding my HCRS membership._`;
    
    // Check if the URL already has query parameters
    let targetUrl = url;
    if (targetUrl.includes('wa.me')) {
      const separator = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${separator}text=${greetingText}`;
    }
    
    window.open(targetUrl, '_blank');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
       toast.error("ദയവായി ഒരു ഫോട്ടോ തിരഞ്ഞെടുക്കുക (Please select an image file)");
       return;
    }
    
    // Instantly load image purely from local file into state & localStorage
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPreviewUrl(dataUrl);
        if (member?.uid) {
          try {
            localStorage.setItem(`local_card_photo_${member.uid}`, dataUrl);
          } catch (err) {
            console.warn("LocalStorage photo cache quota exceeded, preview active:", err);
          }
        }
        toast.success("ഫോട്ടോ കാർഡിൽ ചേർത്തു! കാർഡിന്റെ സ്ക്രീൻഷോട്ട് എടുക്കാം.", { duration: 4000 });
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so selecting the same or another file always triggers onChange
    e.target.value = '';
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  };

  const renderCardToCanvas = async (exportScale = 2.5): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;

    // 1. Pre-inline all <img> elements to base64 Data URLs so CORS/tainting never blocks canvas export
    const imgElements = cardRef.current.getElementsByTagName('img');
    const originalSrcs: { el: HTMLImageElement; src: string }[] = [];

    for (let i = 0; i < imgElements.length; i++) {
      const img = imgElements.item(i) as HTMLImageElement;
      if (img && img.src && !img.src.startsWith('data:')) {
        originalSrcs.push({ el: img, src: img.src });
        try {
          const dataUrl = await imageUrlToDataUrl(img.src);
          if (dataUrl && dataUrl.startsWith('data:')) {
            img.src = dataUrl;
          }
        } catch (e) {
          console.warn("Could not pre-inline image for card export:", e);
        }
      }
    }

    try {
      const canvas = await html2canvas(cardRef.current, { 
        scale: exportScale, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: null,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        imageTimeout: 8000,
        onclone: (clonedDoc) => {
          html2canvasOklchOnClone(clonedDoc);
          // Remove transform: scale(...) on cloned ancestors
          const allNodes = clonedDoc.querySelectorAll('*');
          allNodes.forEach((node) => {
            const htmlEl = node as HTMLElement;
            if (htmlEl.style && htmlEl.style.transform && htmlEl.style.transform.includes('scale')) {
              htmlEl.style.transform = 'none';
            }
          });
        }
      });
      return canvas;
    } finally {
      // Restore original URLs
      for (const item of originalSrcs) {
        item.el.src = item.src;
      }
    }
  };

  const generateCardPdfBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await renderCardToCanvas(2.5);
      if (!canvas) return null;
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      // Standard A4 dimensions in mm: 210 x 297
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Center card neatly on standard A4 page (Standard ID card scale ~ 86mm width)
      const cardWidth = 86; // mm
      const cardHeight = (canvas.height / canvas.width) * cardWidth;
      const xPos = (210 - cardWidth) / 2;
      const yPos = 28; // top margin in mm

      // Header on A4 page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text('HIGHRICH COMMUNITY REVIVAL SOCIETY', 105, 16, { align: 'center' });
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('OFFICIAL MEMBERSHIP IDENTITY CARD • A4 PRINT COPY', 105, 21, { align: 'center' });

      // Add Card image
      pdf.addImage(imgData, 'JPEG', xPos, yPos, cardWidth, cardHeight, undefined, 'FAST');

      // Add cutting / folding guide below the card
      const guideY = yPos + cardHeight + 10;
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(25, guideY, 185, guideY);

      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('✂ Cut along the card outline. Suitable for PVC card lamination or ID holder insertion.', 105, guideY + 5, { align: 'center' });
      
      // Member details summary table at the bottom of the A4 page
      const detailsY = guideY + 14;
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(25, detailsY, 160, 48, 3, 3, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(25, detailsY, 160, 48, 3, 3, 'D');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59);
      pdf.text('MEMBER DETAILS VERIFICATION SHEET', 30, detailsY + 8);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Full Name: ${member.name || 'N/A'}`, 30, detailsY + 16);
      pdf.text(`Membership ID: ${member.membershipId || 'N/A'}`, 30, detailsY + 23);
      pdf.text(`Mobile: ${member.mobile || 'N/A'}`, 30, detailsY + 30);
      pdf.text(`District: ${districtName} | Constituency: ${member.assemblyConstituency || 'N/A'}`, 30, detailsY + 37);
      pdf.text(`Serial No: ${member.serialNo || 'N/A'} | Status: ${(member.status || 'Active').toUpperCase()}`, 30, detailsY + 44);

      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`, 180, detailsY + 8, { align: 'right' });

      return pdf.output('blob');
    } catch (err) {
      console.error("Generate PDF error:", err);
      return null;
    }
  };

  const downloadA4PDF = async () => {
    if (!cardRef.current) return;
    const loadingToast = toast.loading('A4 പ്രിന്റ് PDF ഡൗൺലോഡ് ചെയ്യുന്നു (Generating PDF)...');
    try {
      const pdfBlob = await generateCardPdfBlob();
      if (!pdfBlob) {
        toast.error('PDF തയ്യാറാക്കാൻ സാധിച്ചില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.', { id: loadingToast });
        return;
      }
      const cleanName = member.name.trim().replace(/\s+/g, '_');
      triggerBlobDownload(pdfBlob, `HCRS_ID_${cleanName}_A4_Print.pdf`);
      toast.success('A4 Print PDF വിജയകരമായി ഡൗൺലോഡ് ചെയ്തിട്ടുണ്ട്!', { id: loadingToast });
    } catch (error) {
      console.error('A4 PDF error:', error);
      toast.error('PDF ഡൗൺലോഡ് പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.', { id: loadingToast });
    }
  };

  const shareCardImage = async () => {
    if (!cardRef.current) return;
    const loadingToast = toast.loading('കാർഡ് ചിത്രം തയ്യാറാക്കുന്നു (Preparing Image)...');
    try {
      const canvas = await renderCardToCanvas(2.5);
      if (!canvas) {
        toast.error('ചിത്രം തയ്യാറാക്കാൻ സാധിച്ചില്ല.', { id: loadingToast });
        return;
      }

      const imgData = canvas.toDataURL('image/png');
      setGeneratedImage(imgData);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('ചിത്രം തയ്യാറാക്കാൻ സാധിച്ചില്ല.', { id: loadingToast });
          return;
        }
        const cleanName = member.name.trim().replace(/\s+/g, '_');
        const fileName = `HCRS_CARD_${cleanName}.png`;
        const imageFile = new File([blob], fileName, { type: 'image/png' });

        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
          toast.dismiss(loadingToast);
          await navigator.share({
            files: [imageFile],
            title: `HCRS ID Card - ${member.name}`,
            text: `Highrich Community Revival Society Membership ID Card of ${member.name} (${member.membershipId || ''})`
          });
        } else {
          triggerBlobDownload(blob, fileName);
          toast.success('കാർഡ് ഇമേജ് ഡൗൺലോഡ് ആയിട്ടുണ്ട്! വാട്സാപ്പിൽ നേരിട്ട് അയക്കാം.', { id: loadingToast, duration: 6000 });
        }
      }, 'image/png');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share Image error:', error);
        toast.error('ഷെയർ ചെയ്യുന്നതിൽ തടസ്സം നേരിട്ടു: ' + (error?.message || ''), { id: loadingToast });
      } else {
        toast.dismiss(loadingToast);
      }
    }
  };

  const downloadPNG = async () => {
    if (!cardRef.current) return;
    const loadingToast = toast.loading('കാർഡ് ചിത്രം (Image) ഡൗൺലോഡ് ചെയ്യുന്നു...');
    try {
      const canvas = await renderCardToCanvas(2.5);
      if (!canvas) {
        toast.error('ചിത്രം ഡൗൺലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല. സ്ക്രീൻഷോട്ട് മോഡ് ഉപയോഗിക്കുക.', { id: loadingToast });
        return;
      }
      
      const imgData = canvas.toDataURL('image/png');
      setGeneratedImage(imgData);
      const cleanName = member.name.trim().replace(/\s+/g, '_');
      const filename = `HCRS_CARD_${cleanName}.png`;

      canvas.toBlob((blob) => {
        if (blob) {
          triggerBlobDownload(blob, filename);
          toast.success('മെമ്പർഷിപ്പ് കാർഡ് ഇമേജ് ഡൗൺലോഡ് ചെയ്‌തു! താഴെ പ്രിവ്യൂവും ലഭ്യമാണ്.', { id: loadingToast });
        } else {
          triggerFileDownload(imgData, filename);
          toast.success('മെമ്പർഷിപ്പ് കാർഡ് ഇമേജ് വിജയകരമായി തയാറായി!', { id: loadingToast });
        }
      }, 'image/png');
    } catch (err) {
      console.error('PNG error:', err);
      toast.error('ഡൗൺലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല. സ്ക്രീൻഷോട്ട് മോഡ് ഉപയോഗിക്കുക.', { id: loadingToast });
    }
  };

  const handlePrintCard = async () => {
    if (!cardRef.current) return;
    const loadingToast = toast.loading('Preparing print dialog...');
    try {
      const canvas = await renderCardToCanvas(3);
      if (!canvas) {
        throw new Error('Canvas render returned null');
      }
      const imgData = canvas.toDataURL('image/png');
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>HCRS Membership Card - ${member.name}</title>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 15mm;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: #ffffff;
                  color: #1e293b;
                  text-align: center;
                }
                .print-header {
                  margin-bottom: 20px;
                }
                .print-header h1 {
                  font-size: 18px;
                  margin: 0 0 4px 0;
                  color: #0f172a;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .print-header p {
                  font-size: 11px;
                  color: #64748b;
                  margin: 0;
                  font-weight: 600;
                }
                .card-container {
                  display: flex;
                  justify-content: center;
                  margin: 20px auto;
                }
                .card-image {
                  width: 86mm;
                  height: auto;
                  border-radius: 12px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  border: 1px solid #e2e8f0;
                }
                .guide-text {
                  font-size: 10px;
                  color: #94a3b8;
                  margin-top: 15px;
                  border-top: 1px dashed #cbd5e1;
                  padding-top: 10px;
                  width: 80%;
                  margin-left: auto;
                  margin-right: auto;
                }
                .member-details {
                  margin-top: 25px;
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 15px 20px;
                  text-align: left;
                  max-width: 140mm;
                  margin-left: auto;
                  margin-right: auto;
                }
                .member-details h3 {
                  margin: 0 0 10px 0;
                  font-size: 12px;
                  text-transform: uppercase;
                  color: #334155;
                  letter-spacing: 0.5px;
                  border-bottom: 1px solid #e2e8f0;
                  padding-bottom: 5px;
                }
                .detail-row {
                  display: flex;
                  justify-content: space-between;
                  font-size: 11px;
                  margin-bottom: 6px;
                }
                .detail-label {
                  color: #64748b;
                  font-weight: 600;
                }
                .detail-value {
                  color: #0f172a;
                  font-weight: 700;
                }
                @media print {
                  body {
                    padding: 0;
                    background: transparent;
                  }
                  .no-print {
                    display: none;
                  }
                }
              </style>
            </head>
            <body onload="window.print();">
              <div class="print-header">
                <h1>Highrich Community Revival Society</h1>
                <p>Official Membership Identity Card • A4 Print Copy</p>
              </div>
              <div class="card-container">
                <img src="${imgData}" class="card-image" alt="Membership Card" />
              </div>
              <div class="guide-text">
                ✂ Cut along the card outline. Suitable for standard PVC card pouches or holders.
              </div>
              <div class="member-details">
                <h3>Member Record Verification</h3>
                <div class="detail-row">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">${member.name || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Membership ID:</span>
                  <span class="detail-value">${member.membershipId || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Mobile Number:</span>
                  <span class="detail-value">${member.mobile || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">District / Constituency:</span>
                  <span class="detail-value">${districtName} / ${member.assemblyConstituency || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Serial Number:</span>
                  <span class="detail-value">${member.serialNo || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">${(member.status || 'Active').toUpperCase()}</span>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success('Print dialog ready!', { id: loadingToast });
      } else {
        toast.error('Could not open print window. Please allow popups.', { id: loadingToast });
      }
    } catch (error) {
      console.error('Print card error:', error);
      toast.error('Failed to open print dialog.', { id: loadingToast });
    }
  };

  const districtName = DISTRICTS.find(d => d.code === member.district)?.name || member.district;

  const parseDateField = (date: any): Date | null => {
    if (!date) return null;
    try {
      if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
      if (typeof date.toDate === 'function') return date.toDate();
      if (date.seconds !== undefined) return new Date(date.seconds * 1000);
      if (date._seconds !== undefined) return new Date(date._seconds * 1000);
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '---';
    const d = parseDateField(date);
    return d ? d.toLocaleDateString('en-IN') : '---';
  };

  const isLifeMember = String(member.membership_type || '').toUpperCase().includes('LIFE') ||
    String(member.membershipType || '').toUpperCase().includes('LIFE');
  const isBanned = (member.status || '').toLowerCase() === 'banned' || (member.status || '').toLowerCase() === 'disabled';
  const isExpired = member.role !== 'admin' && member.role !== 'operator' && !member.isAdmin && member.status !== 'pending' && member.renewalPending !== true && !isLifeMember && (
    (() => {
      const expDate = parseDateField(member.expiryDate);
      if (expDate) {
        return expDate.getTime() < Date.now();
      }
      const regDate = parseDateField(member.registrationDate);
      if (!regDate) return false;
      const expD = new Date(regDate);
      expD.setFullYear(expD.getFullYear() + 1);
      return expD.getTime() < Date.now();
    })()
  );

  const isPending = member.role !== 'admin' && !member.isAdmin && (
    member.renewalPending === true || 
    member.status === 'pending' || 
    (!member.isApproved && member.status !== 'active' && member.status !== 'offline')
  );

  const getRenewalDate = (date: any) => {
    // If we have an explicit expiry date, use that!
    const expDate = parseDateField(member.expiryDate);
    if (expDate) {
      const isPast = expDate.getTime() < Date.now();
      return `${expDate.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
    }
    
    // Fallback if no expiry date on user profile
    const regDate = parseDateField(date || member.registrationDate);
    if (!regDate) return '---';
    const d = new Date(regDate);
    d.setFullYear(d.getFullYear() + 1);
    const isPast = d.getTime() < Date.now();
    return `${d.toLocaleDateString('en-IN')}${isPast ? ' (EXPIRED)' : ''}`;
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
    <div 
      onClick={isScreenshotMode ? exitScreenshotMode : undefined}
      className={isScreenshotMode 
        ? "fixed inset-0 z-50 bg-[#0d1b3e] flex flex-col items-center justify-center p-4 overflow-auto cursor-pointer animate-in fade-in duration-300"
        : "flex flex-col items-center gap-8 p-1 sm:p-4 selection:bg-brand-blue/10 animate-in fade-in zoom-in duration-500 w-full max-w-md mx-auto"
      }
    >
      {/* Subtle, floating top Exit Button */}
      {isScreenshotMode && (
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              exitScreenshotMode();
            }}
            className="bg-black/60 hover:bg-black/80 text-white font-black text-xs px-4 py-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10 flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            ✕ EXIT SCREENSHOT
          </button>
        </div>
      )}

      {showCelebration && !isScreenshotMode && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-2 mt-2">
          <div className="bg-brand-blue text-blue-200 px-5 py-1.5 rounded-full text-[11px] font-black border border-blue-400 inline-flex items-center gap-1.5 uppercase tracking-widest">
             <PartyPopper className="w-3.5 h-3.5 text-amber-300" /> Registered Member
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#ffd700] uppercase tracking-tighter leading-none italic mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Welcome to highrich family
          </h2>
        </motion.div>
      )}

      {/* Screenshot Friendly Outer Backdrop Container - Enhanced with hyper-realistic Wooden Surface Mockup */}
      <div 
        ref={containerRef}
        style={{ minHeight: isScreenshotMode ? 'auto' : '630px' }}
        className={isScreenshotMode 
          ? "w-full max-w-sm sm:max-w-md bg-transparent p-1 border-0 flex flex-col items-center justify-center relative shrink-0 shadow-none animate-none"
          : "w-full bg-[#3c2517] p-2.5 sm:p-5 md:p-6 rounded-[32px] border-4 border-[#25150c] flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-2xl transition-all duration-300"
        }
      >
        {/* Deep luxurious wood background, planks and lighting highlight */}
        {!isScreenshotMode && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#4a3121] to-[#25150c] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.22] bg-[repeating-linear-gradient(0deg,#1c0d06_0px,#1c0d06_1px,transparent_1px,transparent_20px)] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.12] bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_45px,#000_45px,#000_46px)] pointer-events-none" />
            {/* Soft radial overlay mimicking high-end restaurant/gallery lamp spot */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.85)_100%)] pointer-events-none" />
            {/* Glossy varnish light streak reflection */}
            <div className="absolute -top-[30%] -left-[20%] w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.12] rotate-[22deg] pointer-events-none" />
          </>
        )}

        {/* Core Premium 3D PVC ID Card with Double Metallic Bevel Frame (Gold theme for Life Member, Slate theme for Adhoc Member) */}
        {(() => {
          const cardBorderClass = isLifeMember 
            ? "border-[6px] border-[#D4AF37] shadow-[12px_16px_36px_rgba(0,0,0,0.7)] bg-gradient-to-br from-[#FFFEF6] via-[#FAF4DB] to-[#F1E5C0]"
            : "border-[6px] border-[#818cf8]/50 shadow-[12px_16px_36px_rgba(0,0,0,0.45)] bg-gradient-to-br from-[#FAFBFD] via-[#F0F4F8] to-[#E2E8F0]";

          const itemPlateClass = `border-t border-b rounded-lg p-1.5 px-3 flex items-center justify-between transition-all ${
            isLifeMember 
              ? 'bg-gradient-to-b from-[#FFFDF2] via-[#F5D76E] to-[#C99E32] border-[#9A7D0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_2px_3px_rgba(0,0,0,0.4)] text-[#1a0f02]'
              : 'bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-slate-350 shadow-[inset_0_1px_1px_white,0_2px_3px_rgba(0,0,0,0.22)] text-[#0f172a]'
          }`;

          const textTitleClass = `text-[10px] font-black uppercase tracking-wider ${
            isLifeMember ? 'text-amber-950 font-sans' : 'text-slate-900 dark:text-slate-950 font-sans'
          }`;

          const textValueClass = `text-[12px] font-black font-mono transition-all ${
            isLifeMember ? 'text-amber-950' : 'text-slate-950'
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

          const bottomSectionBg = isLifeMember
            ? "bg-amber-950/[0.04] border-t border-amber-800/15"
            : "bg-slate-900/[0.04] border-t border-slate-350/50";

          return (
            <div 
              style={{ 
                width: `${340 * scale}px`, 
                height: `${610 * scale}px`, 
                position: 'relative'
              }}
              className="transition-all duration-150 shrink-0 select-none mx-auto flex items-center justify-center p-1"
            >
              <div 
                style={{ 
                  transform: `scale(${scale})`, 
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '340px',
                  height: '610px'
                }}
              >
                <div 
                  ref={cardRef} 
                  className={`w-[340px] h-[610px] rounded-[24px] text-slate-800 relative overflow-hidden font-sans flex flex-col justify-between shrink-0 select-none ${cardBorderClass}`}
                >
              {/* Top Premium Card Margin strip - Gold or Magenta */}
              <div className={`h-1.5 w-full absolute top-0 left-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${isLifeMember ? 'bg-gradient-to-r from-amber-300 via-[#D4AF37] to-amber-800' : 'bg-gradient-to-r from-[#FF1493] via-[#ec008c] to-[#990055]'}`} />

              {/* Expired/Banned Ribbon */}
              {(isExpired || isBanned) && (
                <div className="absolute top-[26px] -right-[38px] w-[130px] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold text-[8px] py-1 uppercase tracking-wider text-center rotate-45 z-40 shadow-[0_2px_5px_rgba(0,0,0,0.4)] border-y border-white/10 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="font-sans font-black drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)] text-white">
                    {isBanned ? '🚫 BANNED' : '⚠️ EXPIRED'}
                  </span>
                  <span className="text-[5px] mt-0.5 tracking-normal leading-none font-bold opacity-90 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]">
                    {isBanned ? 'റദ്ദാക്കി' : 'കാലാവധി കഴിഞ്ഞു'}
                  </span>
                </div>
              )}

              {/* Pending Approval Ribbon */}
              {isPending && !isBanned && !isExpired && (
                <div className="absolute top-[26px] -right-[38px] w-[130px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-[8px] py-1 uppercase tracking-wider text-center rotate-45 z-40 shadow-[0_2px_5px_rgba(0,0,0,0.35)] border-y border-amber-300 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="font-sans font-black text-slate-950">
                    🕒 PENDING
                  </span>
                  <span className="text-[5.5px] mt-0.5 tracking-normal leading-none font-extrabold text-slate-950">
                    അപ്പ്രൂവൽ പെൻഡിങ്
                  </span>
                </div>
              )}

              {/* Header section with HCRS Logo Left + Metallic Embossed Panel Right */}
              <div className="p-3.5 pt-4 shrink-0 flex items-center justify-between gap-2.5 relative">
                {/* Circular Frame for official logo */}
                <div className={`p-1 rounded-full shadow-[inset_0_1.5px_2px_rgba(255,255,255,1),0_3px_6px_rgba(0,0,0,0.5)] w-[58px] h-[58px] flex items-center justify-center border shrink-0 ${logoRingClass}`}>
                  <div className="bg-white rounded-full p-0.5 w-full h-full flex items-center justify-center overflow-hidden">
                    <img 
                      src={settings.logoUrl || "https://i.ibb.co/d42zfDwq/782447521-1074313911653476-2779143939229298450-n.gif"} 
                      alt="HCRS Official Logo" 
                      className="w-[46px] h-[46px] object-contain" 
                      crossOrigin="anonymous" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Premium Embossed Header Panel (Gold metallic for Life Member, Silver metallic for Official Member) */}
                <div className={`flex-1 py-1.5 px-2.5 rounded-xl border-t border-b shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2.5px_4px_rgba(0,0,0,0.35)] text-center ${isLifeMember ? 'bg-gradient-to-b from-[#FFFDF5] via-[#F7DC6F] to-[#B7950B] border-amber-600' : 'bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#cbd5e1] border-slate-300'}`}>
                  <h1 className="text-slate-900 text-[11px] font-black leading-tight uppercase tracking-tight">
                    HIGHRICH COMMUNITY REVIVAL SOCIETY
                  </h1>
                  <div className={`w-full h-[1px] my-0.5 ${isLifeMember ? 'bg-amber-800/35' : 'bg-slate-350'}`} />
                  <p className={`text-[8.5px] font-black tracking-widest uppercase leading-none italic ${isLifeMember ? 'text-amber-950 font-sans' : 'text-[#1a2b5c]'}`}>
                    {isLifeMember ? "LIFE MEMBER" : "OFFICIAL MEMBER"}
                  </p>
                </div>
              </div>

              {/* Profile and Name section with Ring Highlights & Metallic Plates */}
              <div className="flex flex-col items-center shrink-0 relative text-center">
                {/* Circular picture formatted inside heavy-beveled gold/silver ring */}
                <label className={`${isReadOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'} group block`}>
                  {!isReadOnly && <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />}
                  <div className={`w-[90px] h-[90px] rounded-full p-1 border shadow-[0_4px_8px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform duration-300 ${photoRingClass}`}>
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
                           <User size={30} className="text-slate-400 shrink-0" />
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
                <div className={`mt-2 w-[85%] mx-auto py-1 px-3 rounded-lg border-t border-b shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] ${namePlateClass}`}>
                  <h3 className="text-[13px] font-black text-slate-900 uppercase leading-none tracking-tight truncate max-w-[240px] mx-auto">
                    {member.name}
                  </h3>
                </div>

                 {/* Membership Category Ribbon block */}
                <div className="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
                  {isLifeMember ? (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-550 to-amber-600 text-white text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg border border-amber-300">
                      👑 LIFE MEMBER
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-[#1a2b5c] border border-slate-800 text-white text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-md">
                      💼 OFFICIAL MEMBER
                    </span>
                  )}
                </div>

                {isPending && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[7.5px] font-black px-3 py-0.5 rounded border border-amber-300/50 animate-pulse uppercase tracking-wider shadow-[0_1.5px_3px_rgba(0,0,0,0.3)]">
                      ⚠️ APPROVAL PENDING / അപ്പ്രൂവൽ പെൻഡിങ്
                    </span>
                  </div>
                )}

                {/* District & Mandalam (Assembly Constituency is Mandalam) */}
                <p className={`text-[9px] font-black uppercase tracking-wider mt-1 font-sans ${isLifeMember ? 'text-amber-800' : 'text-slate-950'}`}>
                  {districtName} DISTRICT - {member.constituencyCode || (member.assemblyConstituency ? getAssemblyCode(member.assemblyConstituency) : 'NA')}
                </p>
              </div>

              {/* Member Details Columns Section styled as Stacked Premium Plates */}
              <div className="px-4 space-y-1 py-1 shrink-0">
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
                  <span className={`${textValueClass} ${!isLifeMember ? 'text-[#1a2b5c]' : 'text-amber-900 font-extrabold'}`}>
                    {isLifeMember ? '⭐ PERMANENT / LIFETIME' : getRenewalDate(member.registrationDate)}
                  </span>
                </div>
              </div>

              {/* Bottom section with QR layout & verified signatures on Plates */}
              <div className={`pt-2 px-4 pb-[11px] shrink-0 flex items-center justify-between gap-2 relative ${bottomSectionBg}`}>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-blue via-transparent to-[#FF1493] z-10" />

                {/* Interactive Live Verification QR Code framed in embossed gold/silver plate */}
                <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 w-[74px] h-[78px] ${qrPlateBg}`}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Verification QR" 
                    className="w-[42px] h-[42px] object-contain" 
                    crossOrigin="anonymous" 
                  />
                  <span className={`text-[6.5px] font-black uppercase mt-1 tracking-wider text-center leading-none ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>SCAN TO VERIFY</span>
                </div>

                {/* Secretary Signature Plate */}
                <div className={`flex-1 p-1.5 rounded-xl border flex flex-col justify-between items-center h-[78px] text-center ${signaturePlateBg}`}>
                  <div className="flex-1 flex items-center justify-center">
                    <span 
                      className={`text-[14px] font-black select-none tracking-normal italic leading-none ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}
                      style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                    >
                      Bineesh Kumar
                    </span>
                  </div>
                  <div className={`w-full border-t my-0.5 ${isLifeMember ? 'border-amber-700/50' : 'border-slate-400'}`} />
                  <p className={`text-[6.5px] font-black uppercase tracking-tight leading-none truncate max-w-full ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>
                    Bineesh Kumar
                  </p>
                  <p className={`text-[5.5px] font-black uppercase tracking-widest leading-none mt-0.5 ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>SECRETARY</p>
                </div>

                {/* President Signature Plate */}
                <div className={`flex-1 p-1.5 rounded-xl border flex flex-col justify-between items-center h-[78px] text-center ${signaturePlateBg}`}>
                  <div className="flex-1 flex items-center justify-center">
                    <span 
                      className={`text-[15px] font-black select-none tracking-normal italic leading-none ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}
                      style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Courier New', cursive" }}
                    >
                      M. A. Bari
                    </span>
                  </div>
                  <div className={`w-full border-t my-0.5 ${isLifeMember ? 'border-amber-700/50' : 'border-slate-400'}`} />
                  <p className={`text-[6.5px] font-black uppercase tracking-tight leading-none truncate max-w-full ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>
                    M. A. Bari
                  </p>
                  <p className={`text-[5.5px] font-black uppercase tracking-widest leading-none mt-0.5 ${isLifeMember ? 'text-amber-950' : 'text-slate-950'}`}>PRESIDENT</p>
                </div>
              </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Fallback Long-Press Image Section (Shown when card PNG is successfully compiled) */}
      {/* Sleek Action Controls */}
      {!isScreenshotMode && (
        <div className="flex flex-col gap-4 w-full px-2 pb-24 shrink-0 transition-all font-sans">
          {(member.status === 'active' || member.isApproved || isAdmin) && (
            <div className="flex flex-col gap-3">
              {/* ULTRA CRISP PREMIUM CRYSTAL GLASS UI BANNER */}
              <div 
                onClick={() => setIsScreenshotMode(true)}
                className="w-full relative overflow-hidden rounded-2xl p-4 sm:p-5 backdrop-blur-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-[#002244]/95 border-2 border-amber-400/70 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_25px_rgba(245,158,11,0.2)] hover:shadow-[0_16px_50px_rgba(245,158,11,0.35)] hover:border-amber-300 transition-all duration-300 cursor-pointer group active:scale-[0.98] select-none"
              >
                {/* Glossy glass reflection sheen */}
                <div className="absolute -top-10 -left-10 w-full h-24 bg-gradient-to-b from-white/15 to-transparent -rotate-12 pointer-events-none" />
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/30 transition-all" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/30 transition-all" />

                <div className="relative z-10 flex items-center gap-3.5 sm:gap-4">
                  {/* Glowing Amber Glass Camera Badge */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 border-2 border-amber-200 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                    <Camera className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                  </div>

                  {/* Sharp High-Contrast Glass Text */}
                  <div className="flex flex-col items-start flex-1 min-w-0 text-left">
                    <h4 className="text-[14px] sm:text-[16px] font-black text-white leading-snug drop-shadow-md tracking-normal break-words">
                      നിങ്ങളുടെ പ്രൊഫൈൽ ഫോട്ടോ ആഡ് ചെയ്തു സ്ക്രീൻ short എടുക്കുക
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          )}
          {onLogout && (
            <div className="pt-2 flex justify-center w-full">
              <Button 
                 variant="ghost" 
                 onClick={onLogout} 
                 className="font-black text-xs uppercase tracking-widest text-red-700 hover:text-red-900 hover:bg-red-50 px-6 h-9 rounded-xl cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-1.5 text-red-700" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Minimal Bottom Guide */}
      {isScreenshotMode && (
        <p className="absolute bottom-6 text-center text-slate-200 text-xs font-black tracking-wider uppercase select-none pointer-events-none px-4 font-sans drop-shadow-md">
          തെയ്യാറാണ്! സ്ക്രീൻഷോട്ട് എടുക്കുക • മടങ്ങാൻ എവിടെയെങ്കിലും തൊടുക
        </p>
      )}
    </div>
  );
}
