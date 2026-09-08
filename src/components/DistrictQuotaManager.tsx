import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DISTRICTS, CONSTITUENCIES } from '../constants';
import { UserProfile } from '../types';
import { 
  MapPin, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Share2, 
  QrCode, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  Sliders, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Search,
  MessageCircle,
  Users,
  Percent,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';

interface DistrictQuotaManagerProps {
  districtQuotas?: Record<string, number>;
  districtQuotasUsed?: Record<string, number>;
  onUpdateDistrictQuota?: (districtCode: string, total: number) => Promise<void> | void;
  onSyncQuotas?: () => Promise<void> | void;
  adminUser?: UserProfile | null;
}

// Map standard district codes to RTO codes and Malayalam names
export const DISTRICT_DETAILS: Record<string, { rto: string; mlName: string; region: string }> = {
  TVM: { rto: 'KL-01', mlName: 'തിരുവനന്തപുരം', region: 'South' },
  KLM: { rto: 'KL-02', mlName: 'കൊല്ലം', region: 'South' },
  PTA: { rto: 'KL-03', mlName: 'പത്തനംതിട്ട', region: 'South' },
  ALP: { rto: 'KL-04', mlName: 'ആലപ്പുഴ', region: 'South' },
  KTM: { rto: 'KL-05', mlName: 'കോട്ടയം', region: 'Central' },
  IDK: { rto: 'KL-06', mlName: 'ഇടുക്കി', region: 'Central' },
  EKM: { rto: 'KL-07', mlName: 'എറണാകുളം', region: 'Central' },
  TCR: { rto: 'KL-08', mlName: 'തൃശ്ശൂർ', region: 'Central' },
  PKD: { rto: 'KL-09', mlName: 'പാലക്കാട്', region: 'Central' },
  MLP: { rto: 'KL-10', mlName: 'മലപ്പുറം', region: 'North' },
  KOZ: { rto: 'KL-11', mlName: 'കോഴിക്കോട്', region: 'North' },
  WYD: { rto: 'KL-12', mlName: 'വയനാട്', region: 'North' },
  KNR: { rto: 'KL-13', mlName: 'കണ്ണൂർ', region: 'North' },
  KSD: { rto: 'KL-14', mlName: 'കാസർഗോഡ്', region: 'North' },
};

export default function DistrictQuotaManager({
  districtQuotas = {},
  districtQuotasUsed = {},
  onUpdateDistrictQuota,
  onSyncQuotas,
  adminUser
}: DistrictQuotaManagerProps) {
  const [localQuotas, setLocalQuotas] = useState<Record<string, number>>({});
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [qrModalDistrict, setQrModalDistrict] = useState<{ code: string; name: string; url: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState<string>('500');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setLocalQuotas(districtQuotas);
  }, [districtQuotas]);

  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://hcrs-kerala.web.app';

  // Generate distinct URL for a district
  const getDistrictUrl = (districtCode: string) => {
    return `${origin}/?view=register&district=${districtCode}`;
  };

  // Copy district distinct link to clipboard
  const handleCopyLink = async (districtCode: string, districtName: string) => {
    const url = getDistrictUrl(districtCode);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(districtCode);
      toast.success(`${districtName} Distinct Registration Link Copied!`, {
        description: url
      });
      setTimeout(() => setCopiedCode(null), 2500);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  // WhatsApp Share with customized Malayalam & English invite text
  const handleWhatsAppShare = (districtCode: string, districtName: string) => {
    const url = getDistrictUrl(districtCode);
    const detail = DISTRICT_DETAILS[districtCode];
    const mlName = detail?.mlName || districtName;
    const rto = detail?.rto || districtCode;
    const total = localQuotas[districtCode] ?? districtQuotas[districtCode] ?? 0;
    const used = districtQuotasUsed[districtCode] || 0;
    const remains = Math.max(0, total - used);

    const message = `🏛️ *HCRS KERALA - ${districtName.toUpperCase()} DISTRICT REGISTRATION* 🏛️\n` +
      `📌 *ജില്ല:* ${mlName} (${districtName} - ${rto})\n` +
      `📋 *ലഭ്യമായ ക്വാട്ട:* ${remains} / ${total}\n\n` +
      `ഹൈക്കോടതി റിട്ടയേർഡ് & പെൻഷനേഴ്സ് വെൽഫെയർ സ്കീമിൽ ${mlName} ജില്ലയിലെ ഓൺലൈൻ അംഗത്വ രജിസ്ട്രേഷനായി താഴെ കാണുന്ന ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക:\n\n` +
      `🔗 *Distinct District Link:*\n${url}\n\n` +
      `_ഈ ലിങ്ക് വഴി രജിസ്റ്റർ ചെയ്യുമ്പോൾ ${districtName} ജില്ല സ്വയം സെലക്റ്റ് ആകുന്നതാണ്._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Generate QR Code Modal
  const handleOpenQr = async (districtCode: string, districtName: string) => {
    const url = getDistrictUrl(districtCode);
    try {
      const qrImage = await QRCodeLib.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#002B49',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(qrImage);
      setQrModalDistrict({ code: districtCode, name: districtName, url });
    } catch (err) {
      toast.error('Failed to generate QR Code');
    }
  };

  // Download QR Code PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl || !qrModalDistrict) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `HCRS_${qrModalDistrict.name}_${qrModalDistrict.code}_Registration_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code Downloaded!');
  };

  // Copy all 14 District URLs in bulk
  const handleCopyAllUrls = async () => {
    let text = `🏛️ *HCRS KERALA - DISTRICT REGISTRATION LINKS (DISTINCT URLs)* 🏛️\n\n`;
    DISTRICTS.forEach((d, idx) => {
      const detail = DISTRICT_DETAILS[d.code];
      const ml = detail?.mlName || d.name;
      const rto = detail?.rto || d.code;
      const url = getDistrictUrl(d.code);
      text += `${idx + 1}. *${d.name} (${ml} - ${rto}):*\n   ${url}\n\n`;
    });

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('All 14 District URLs copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy URLs');
    }
  };

  // Save single district quota
  const handleSaveQuota = async (districtCode: string) => {
    const num = parseInt(editValue, 10);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid quota number');
      return;
    }

    setIsSaving(districtCode);
    try {
      if (onUpdateDistrictQuota) {
        await onUpdateDistrictQuota(districtCode, num);
      }
      setLocalQuotas(prev => ({ ...prev, [districtCode]: num }));
      setEditingCode(null);
      toast.success(`Quota for ${districtCode} updated to ${num}`);
    } catch (err) {
      toast.error('Failed to save quota');
    } finally {
      setIsSaving(null);
    }
  };

  // Quick adjust +/-
  const handleQuickAdjust = async (districtCode: string, delta: number) => {
    const current = localQuotas[districtCode] ?? districtQuotas[districtCode] ?? 0;
    const newTotal = Math.max(0, current + delta);
    setIsSaving(districtCode);
    try {
      if (onUpdateDistrictQuota) {
        await onUpdateDistrictQuota(districtCode, newTotal);
      }
      setLocalQuotas(prev => ({ ...prev, [districtCode]: newTotal }));
      toast.success(`${districtCode} quota: ${newTotal}`);
    } catch (err) {
      toast.error('Failed to adjust quota');
    } finally {
      setIsSaving(null);
    }
  };

  // Apply Bulk Quota
  const handleApplyBulkQuota = async () => {
    const num = parseInt(bulkValue, 10);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid quota number');
      return;
    }

    setIsBulkSaving(true);
    try {
      if (onUpdateDistrictQuota) {
        for (const d of DISTRICTS) {
          await onUpdateDistrictQuota(d.code, num);
        }
      }
      const newMap: Record<string, number> = {};
      DISTRICTS.forEach(d => { newMap[d.code] = num; });
      setLocalQuotas(newMap);
      setBulkModalOpen(false);
      toast.success(`All 14 districts quota updated to ${num}!`);
    } catch (err) {
      toast.error('Failed to apply bulk quota');
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Trigger Database Sync
  const handleTriggerSync = async () => {
    if (!onSyncQuotas) return;
    setIsSyncing(true);
    try {
      await onSyncQuotas();
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate overall state stats
  const totalAllocated = DISTRICTS.reduce((acc, d) => acc + (localQuotas[d.code] ?? districtQuotas[d.code] ?? 0), 0);
  const totalUsed = DISTRICTS.reduce((acc, d) => acc + (districtQuotasUsed[d.code] || 0), 0);
  const totalRemaining = Math.max(0, totalAllocated - totalUsed);
  const overallPercentage = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;
  const exhaustedDistrictsCount = DISTRICTS.filter(d => {
    const tot = localQuotas[d.code] ?? districtQuotas[d.code] ?? 0;
    const usd = districtQuotasUsed[d.code] || 0;
    return tot > 0 && usd >= tot;
  }).length;

  // Filter districts
  const filteredDistricts = DISTRICTS.filter(d => {
    const detail = DISTRICT_DETAILS[d.code];
    const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (detail?.mlName && detail.mlName.includes(searchQuery)) ||
      (detail?.rto && detail.rto.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchRegion = regionFilter === 'all' || detail?.region?.toLowerCase() === regionFilter.toLowerCase();

    return matchSearch && matchRegion;
  });

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 max-w-full">
      {/* Top Header Card */}
      <div className="bg-linear-to-br from-slate-900 via-brand-blue to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden w-full min-w-0 max-w-full">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-magenta/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 min-w-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-brand-magenta mb-3 border border-white/10 max-w-full">
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">District Quotas & Distinct Registration Links</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight break-words">
              District Quota & Link Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xl break-words">
              Manage registration quotas across all 14 districts in Kerala and generate distinct direct registration links (Distinct URLs) with QR codes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <Button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-bold rounded-xl min-h-11 h-auto py-2 px-3.5 cursor-pointer transition-all flex-1 sm:flex-none whitespace-normal break-words text-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 shrink-0 inline ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Used Counts</span>
            </Button>

            <Button
              onClick={() => setBulkModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl min-h-11 h-auto py-2 px-3.5 shadow-lg shadow-amber-500/20 cursor-pointer transition-all flex-1 sm:flex-none whitespace-normal break-words text-center"
            >
              <Sliders className="w-4 h-4 mr-2 shrink-0 inline" />
              <span>Bulk Set Quota</span>
            </Button>

            <Button
              onClick={handleCopyAllUrls}
              className="bg-brand-magenta hover:bg-brand-magenta/90 text-white text-xs font-bold rounded-xl min-h-11 h-auto py-2 px-3.5 shadow-lg shadow-brand-magenta/20 cursor-pointer transition-all flex-1 sm:flex-none whitespace-normal break-words text-center"
            >
              <Copy className="w-4 h-4 mr-2 shrink-0 inline" />
              <span>Copy All 14 Links</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full min-w-0 max-w-full">
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total State Quota</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{totalAllocated.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">Total allocated across 14 districts</p>
        </Card>

        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registered</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">{totalUsed.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">Total registered active members</p>
        </Card>

        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State Balance Left</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-brand-magenta flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-brand-magenta mt-2">{totalRemaining.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">Available quota remaining</p>
        </Card>

        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Utilization</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{overallPercentage}%</p>
            {exhaustedDistrictsCount > 0 && (
              <Badge variant="destructive" className="text-[9px] font-black">
                {exhaustedDistrictsCount} Full
              </Badge>
            )}
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className={`h-full transition-all duration-500 ${
                overallPercentage >= 90 ? 'bg-red-500' : overallPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search district, code, or name..."
            className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Region:</span>
          {['all', 'South', 'Central', 'North'].map((reg) => (
            <button
              key={reg}
              onClick={() => setRegionFilter(reg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                regionFilter === reg
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {reg === 'all' ? 'All Districts (14)' : `${reg} Kerala`}
            </button>
          ))}
        </div>
      </div>

      {/* 14 Districts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDistricts.map((d) => {
          const detail = DISTRICT_DETAILS[d.code] || { rto: d.code, mlName: d.name, region: 'Kerala' };
          const total = localQuotas[d.code] ?? districtQuotas[d.code] ?? 0;
          const used = districtQuotasUsed[d.code] || 0;
          const remaining = Math.max(0, total - used);
          const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
          const isExhausted = total > 0 && used >= total;
          const isNearExhausted = total > 0 && !isExhausted && percent >= 80;
          const distinctUrl = getDistrictUrl(d.code);
          const isEditing = editingCode === d.code;
          const isCurrentlySaving = isSaving === d.code;
          const isCopied = copiedCode === d.code;

          return (
            <Card 
              key={d.code} 
              className={`border-2 transition-all rounded-3xl overflow-hidden shadow-xs hover:shadow-md bg-white ${
                isExhausted 
                  ? 'border-red-300/80 bg-red-50/10' 
                  : isNearExhausted 
                    ? 'border-amber-300/80' 
                    : 'border-slate-200/80'
              }`}
            >
              <CardHeader className="p-5 pb-3 border-b border-slate-100/80 bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue font-black text-sm">
                      {detail.rto}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-black text-slate-900">
                          {d.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 border-slate-200 bg-white">
                          {d.code}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-brand-blue mt-0.5">
                        {detail.mlName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    {isExhausted ? (
                      <Badge className="bg-red-500 text-white text-[9px] font-black uppercase">
                        Quota Full
                      </Badge>
                    ) : isNearExhausted ? (
                      <Badge className="bg-amber-500 text-white text-[9px] font-black uppercase">
                        Near Full ({percent}%)
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase">
                        Active ({remaining} Left)
                      </Badge>
                    )}
                    <span className="text-[9px] font-bold text-slate-400 mt-1">
                      {CONSTITUENCIES[d.code]?.length || 0} Mandalam
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Quota Numbers Display */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Allocated</span>
                    <p className="text-base font-black text-slate-800 mt-0.5">{total}</p>
                  </div>
                  <div className="border-x border-slate-200/60">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Used</span>
                    <p className="text-base font-black text-emerald-700 mt-0.5">{used}</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-brand-magenta uppercase tracking-widest">Balance</span>
                    <p className="text-base font-black text-brand-magenta mt-0.5">{remaining}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Quota Fill Rate</span>
                    <span className="font-black text-slate-900">{percent}% ({used}/{total})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isExhausted ? 'bg-red-500' : isNearExhausted ? 'bg-amber-500' : 'bg-brand-blue'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Quota Editor Form */}
                <div className="pt-2 border-t border-slate-100">
                  {isEditing ? (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Set New Quota:</span>
                        <button 
                          onClick={() => setEditingCode(null)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="e.g. 500"
                          className="h-9 text-xs font-black bg-white rounded-xl"
                          min="0"
                        />
                        <Button
                          onClick={() => handleSaveQuota(d.code)}
                          disabled={isCurrentlySaving}
                          size="sm"
                          className="bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-bold rounded-xl h-9 px-4 cursor-pointer"
                        >
                          {isCurrentlySaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                      {/* Quick buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => setEditValue(String((parseInt(editValue || '0', 10) || 0) + 50))}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:bg-slate-100"
                        >
                          +50
                        </button>
                        <button
                          onClick={() => setEditValue(String((parseInt(editValue || '0', 10) || 0) + 100))}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:bg-slate-100"
                        >
                          +100
                        </button>
                        <button
                          onClick={() => setEditValue('500')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:bg-slate-100"
                        >
                          500
                        </button>
                        <button
                          onClick={() => setEditValue('1000')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:bg-slate-100"
                        >
                          1000
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => handleQuickAdjust(d.code, -10)}
                          disabled={isCurrentlySaving || total <= 0}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-[10px] font-black border-slate-200 hover:bg-slate-100 cursor-pointer"
                          title="Decrease by 10"
                        >
                          -10
                        </Button>
                        <Button
                          onClick={() => handleQuickAdjust(d.code, +50)}
                          disabled={isCurrentlySaving}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-[10px] font-black border-slate-200 hover:bg-slate-100 cursor-pointer text-emerald-700 bg-emerald-50/50"
                          title="Increase by 50"
                        >
                          +50
                        </Button>
                        <Button
                          onClick={() => handleQuickAdjust(d.code, +100)}
                          disabled={isCurrentlySaving}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-[10px] font-black border-slate-200 hover:bg-slate-100 cursor-pointer text-brand-blue bg-blue-50/50"
                          title="Increase by 100"
                        >
                          +100
                        </Button>
                      </div>

                      <Button
                        onClick={() => {
                          setEditingCode(d.code);
                          setEditValue(String(total));
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-[10px] font-black border-slate-300 hover:bg-slate-100 cursor-pointer text-slate-700"
                      >
                        <Sliders className="w-3 h-3 mr-1 text-slate-500" />
                        Edit Quota
                      </Button>
                    </div>
                  )}
                </div>

                {/* Distinct URL Box & Actions */}
                <div className="bg-slate-50/80 border border-slate-200/80 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <LinkIcon className="w-3 h-3 text-brand-blue" />
                      Distinct Registration URL:
                    </span>
                    <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                      Auto-Selects {d.name}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 overflow-hidden">
                    <span className="text-[10px] font-mono text-slate-600 truncate select-all">
                      {distinctUrl}
                    </span>
                  </div>

                  {/* Actions: Copy, WhatsApp, QR, Open */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <Button
                      onClick={() => handleCopyLink(d.code, d.name)}
                      variant="outline"
                      size="sm"
                      className={`h-8 px-1.5 rounded-xl text-[10px] font-bold border-slate-200 cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        isCopied ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-slate-100'
                      }`}
                      title="Copy registration link"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </Button>

                    <Button
                      onClick={() => handleWhatsAppShare(d.code, d.name)}
                      size="sm"
                      className="h-8 px-1.5 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs flex items-center justify-center gap-1"
                      title="Share to WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>Share</span>
                    </Button>

                    <Button
                      onClick={() => handleOpenQr(d.code, d.name)}
                      variant="outline"
                      size="sm"
                      className="h-8 px-1.5 rounded-xl text-[10px] font-bold border-slate-200 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-1 text-slate-700"
                      title="Generate QR Code"
                    >
                      <QrCode className="w-3 h-3 text-brand-magenta" />
                      <span>QR</span>
                    </Button>

                    <Button
                      onClick={() => window.open(distinctUrl, '_blank')}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-1.5 rounded-xl text-[10px] font-bold text-brand-blue hover:bg-blue-50 cursor-pointer flex items-center justify-center gap-1"
                      title="Test registration link"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* QR Code Modal */}
      <Dialog open={!!qrModalDistrict} onOpenChange={(open) => !open && setQrModalDistrict(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-brand-blue" />
              <span>{qrModalDistrict?.name} District QR Code</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-500">
              Scan this QR to open the distinct registration form with {qrModalDistrict?.name} preselected.
            </DialogDescription>
          </DialogHeader>

          {qrDataUrl && (
            <div className="space-y-4 py-2">
              <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-inner inline-block mx-auto">
                <img 
                  src={qrDataUrl} 
                  alt="District Registration QR Code" 
                  className="w-56 h-56 mx-auto rounded-xl"
                />
                <p className="text-[11px] font-black text-brand-blue mt-3">
                  HCRS {qrModalDistrict?.name} ({DISTRICT_DETAILS[qrModalDistrict?.code || '']?.rto})
                </p>
                <p className="text-[9px] font-bold text-slate-400">
                  {DISTRICT_DETAILS[qrModalDistrict?.code || '']?.mlName} District Registration
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Link Destination:</p>
                <p className="text-xs font-mono text-slate-700 truncate mt-0.5">{qrModalDistrict?.url}</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={handleDownloadQr}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-bold rounded-xl h-11 px-6 shadow-md shadow-brand-blue/20 cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>Download QR PNG</span>
                </Button>
                <Button
                  onClick={() => qrModalDistrict && handleCopyLink(qrModalDistrict.code, qrModalDistrict.name)}
                  variant="outline"
                  className="text-xs font-bold rounded-xl h-11 px-5 border-slate-200 cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Copy Link</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Quota Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              <span>Bulk Set District Quotas</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-500">
              Set the standard registration quota uniformly across all 14 districts in Kerala.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">
                Standard Quota per District:
              </label>
              <Input
                type="number"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="e.g. 500"
                className="h-11 rounded-xl text-base font-black"
                min="0"
              />
            </div>

            <div className="flex items-center gap-2">
              {[250, 500, 1000, 2000, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBulkValue(String(val))}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-700 transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                ⚠️ Note: Saving this will update the quota for all 14 districts to <strong>{bulkValue || 0}</strong>. Total state quota will be <strong>{((parseInt(bulkValue, 10) || 0) * 14).toLocaleString()}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                variant="ghost"
                className="text-xs font-bold rounded-xl h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyBulkQuota}
                disabled={isBulkSaving}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl h-11 px-6 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {isBulkSaving ? 'Applying...' : 'Apply to All 14 Districts'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
