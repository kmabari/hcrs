import React, { useState, useEffect } from 'react';
import { DISTRICTS, getDistrictCode } from '@/src/constants';
import { getOrgSettings, saveOrgSettings, OrgSettings, defaultSettings, subscribeToOrgSettings } from '@/src/lib/cms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MessageCircle, 
  ExternalLink, 
  Save, 
  Power, 
  Copy, 
  RefreshCw, 
  Phone, 
  CheckCircle2, 
  Search, 
  ShieldCheck,
  Zap,
  HelpCircle,
  Link2
} from 'lucide-react';

export default function DistrictWhatsAppManager() {
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [activeStatus, setActiveStatus] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savingDistrict, setSavingDistrict] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToOrgSettings((data) => {
      setSettings(data);
      if (data.districtWhatsAppLinks) {
        setLinks(data.districtWhatsAppLinks);
      }
      if (data.districtWhatsAppActive) {
        setActiveStatus(data.districtWhatsAppActive);
      }
    });
    return () => unsub();
  }, []);

  const formatWhatsAppUrl = (input: string): string => {
    const clean = input.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    // If it's a mobile number (e.g. 10 digits or with 91)
    const digitsOnly = clean.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `https://wa.me/91${digitsOnly}`;
    }
    if (digitsOnly.length > 10) {
      return `https://wa.me/${digitsOnly}`;
    }
    return clean;
  };

  const handleLinkChange = (districtCode: string, value: string) => {
    setLinks(prev => ({
      ...prev,
      [districtCode]: value
    }));
  };

  const handleToggleActive = async (districtCode: string) => {
    const currentActive = activeStatus[districtCode] !== false; // Default true if link exists
    const newActive = !currentActive;
    const updatedStatus = { ...activeStatus, [districtCode]: newActive };
    setActiveStatus(updatedStatus);

    try {
      await saveOrgSettings({
        districtWhatsAppActive: updatedStatus
      });
      toast.success(`${districtCode} WhatsApp support ${newActive ? 'activated ✅' : 'deactivated ⏸️'}`);
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error('Failed to update status');
    }
  };

  const handleSaveDistrict = async (districtCode: string) => {
    setSavingDistrict(districtCode);
    const rawVal = links[districtCode] || '';
    const formattedUrl = formatWhatsAppUrl(rawVal);
    const updatedLinks = { ...links, [districtCode]: formattedUrl };
    const updatedActive = { ...activeStatus, [districtCode]: activeStatus[districtCode] ?? true };

    try {
      await saveOrgSettings({
        districtWhatsAppLinks: updatedLinks,
        districtWhatsAppActive: updatedActive
      });
      setLinks(updatedLinks);
      setActiveStatus(updatedActive);
      toast.success(`${districtCode} WhatsApp link saved successfully!`);
    } catch (err) {
      console.error("Save district link error:", err);
      toast.error(`Failed to save ${districtCode} link`);
    } finally {
      setSavingDistrict(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const formatted: Record<string, string> = {};
    Object.keys(links).forEach(code => {
      formatted[code] = formatWhatsAppUrl(links[code]);
    });

    try {
      await saveOrgSettings({
        districtWhatsAppLinks: formatted,
        districtWhatsAppActive: activeStatus
      });
      setLinks(formatted);
      toast.success('All 14 District WhatsApp links updated successfully!');
    } catch (err) {
      console.error("Save all links error:", err);
      toast.error('Failed to update district links');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyDefaultHelpline = async () => {
    const defaultHelpline = 'https://wa.me/919645934571';
    const newLinks = { ...links };
    const newActive = { ...activeStatus };

    DISTRICTS.forEach(d => {
      if (!newLinks[d.code]) {
        newLinks[d.code] = defaultHelpline;
        newActive[d.code] = true;
      }
    });

    setLinks(newLinks);
    setActiveStatus(newActive);

    try {
      await saveOrgSettings({
        districtWhatsAppLinks: newLinks,
        districtWhatsAppActive: newActive
      });
      toast.success('Default HCRS WhatsApp Helpline (+91 96459 34571) applied to all unset districts!');
    } catch (err) {
      console.error("Apply default helpline error:", err);
      toast.error('Failed to apply default helpline');
    }
  };

  const filteredDistricts = DISTRICTS.filter(d => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return d.name.toLowerCase().includes(term) || d.code.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-950 text-white rounded-3xl overflow-hidden shadow-xl">
        <CardHeader className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-400/40 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <CardTitle className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    District Customer Care WhatsApp Module
                  </CardTitle>
                  <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5">
                    14 Districts
                  </Badge>
                </div>
                <CardDescription className="text-xs font-bold text-slate-300 max-w-2xl leading-relaxed">
                  എല്ലാ 14 ജില്ലകൾക്കുമുള്ള കസ്റ്റമർ കെയർ വാട്സാപ്പ് നമ്പറുകളും ലിങ്കുകളും ഇവിടെ നിയന്ത്രിക്കാം. അംഗത്തിന്റെ പ്രൊഫൈലിൽ ഈ ലിങ്ക് സ്വയമേവ ലഭ്യമാകും.
                </CardDescription>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={handleApplyDefaultHelpline}
                variant="outline"
                className="h-11 px-4 rounded-xl border-emerald-400/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Fill Default Helpline (+91 96459 34571)</span>
              </Button>

              <Button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save All Districts</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search district name or code..."
            className="pl-10 h-10 rounded-xl border-slate-300 text-xs font-bold"
          />
        </div>
        <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
          <span>Active Links:</span>
          <Badge className="bg-emerald-100 text-emerald-900 font-black">
            {DISTRICTS.filter(d => !!links[d.code] && activeStatus[d.code] !== false).length} / 14 Active
          </Badge>
        </div>
      </div>

      {/* 14 District Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDistricts.map((d) => {
          const currentLink = links[d.code] || '';
          const isActive = activeStatus[d.code] !== false && !!currentLink;
          const isSavingThis = savingDistrict === d.code;

          return (
            <Card 
              key={d.code} 
              className={`rounded-3xl border-2 transition-all overflow-hidden ${
                isActive 
                  ? 'border-emerald-500/40 bg-white shadow-md hover:shadow-lg' 
                  : 'border-slate-200 bg-slate-50/70 shadow-xs'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {d.code}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      {d.name}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Kerala District #{DISTRICTS.findIndex(x => x.code === d.code) + 1}
                    </p>
                  </div>
                </div>

                {/* Status Toggle Switch Badge */}
                <button
                  type="button"
                  onClick={() => handleToggleActive(d.code)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300'
                  }`}
                  title="Click to Activate / Deactivate"
                >
                  <Power className={`w-3 h-3 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                  <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                </button>
              </div>

              {/* Card Body */}
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block flex items-center justify-between">
                    <span>WhatsApp Link / Mobile Number</span>
                    {currentLink && (
                      <span className="text-[10px] text-slate-400 lowercase font-mono">
                        {currentLink.startsWith('http') ? 'link format' : 'phone number'}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={currentLink}
                      onChange={(e) => handleLinkChange(d.code, e.target.value)}
                      placeholder="e.g. 9645934571 or https://wa.me/91..."
                      className="pl-10 h-11 rounded-xl border-2 border-slate-300 focus:border-emerald-500 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Tip: Enter 10-digit number (e.g. 9645934571) or full wa.me link.
                  </p>
                </div>

                {/* Quick Action Controls */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={() => handleSaveDistrict(d.code)}
                    disabled={isSavingThis}
                    className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSavingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save</span>
                  </Button>

                  {currentLink && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const url = formatWhatsAppUrl(currentLink);
                          window.open(url, '_blank');
                        }}
                        className="h-10 px-3 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-black flex items-center gap-1 cursor-pointer"
                        title="Test WhatsApp Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Test</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const url = formatWhatsAppUrl(currentLink);
                          navigator.clipboard.writeText(url);
                          toast.success(`${d.name} WhatsApp link copied!`);
                        }}
                        className="h-10 px-2.5 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
                        title="Copy Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
