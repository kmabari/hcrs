import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, Info, Target, Eye, MapPin, Phone, Mail, Globe, LayoutGrid, RefreshCw } from 'lucide-react';
import { getOrgSettings, saveOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';

export default function BrandingManager() {
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const data = await getOrgSettings();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveOrgSettings(settings);
      toast.success('Branding & Content updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-magenta" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-premium rounded-[32px] bg-white overflow-hidden">
        <CardHeader className="bg-brand-blue/5 border-b border-brand-blue/10 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-brand-blue p-3 rounded-2xl text-white">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-brand-blue uppercase tracking-tight">Branding & Main Content</CardTitle>
                <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Manage public identity and core information</CardDescription>
              </div>
            </div>
            <Button 
               onClick={handleSave} 
               disabled={saving}
               className="bg-brand-blue text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-blue/20"
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              SAVE CHANGES
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSave} className="space-y-10">
            {/* Identity */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-brand-blue/40 uppercase tracking-[0.3em] flex items-center gap-2">
                 <Info className="w-3 h-3" /> Basic Identity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Official Full Name</Label>
                  <Input 
                    value={settings.fullName} 
                    onChange={e => setSettings({...settings, fullName: e.target.value})}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Short Name / Initials</Label>
                  <Input 
                    value={settings.shortName} 
                    onChange={e => setSettings({...settings, shortName: e.target.value})}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="font-bold text-slate-700">Official Logo URL</Label>
                  <Input 
                    value={settings.logoUrl || ''} 
                    onChange={e => setSettings({...settings, logoUrl: e.target.value})}
                    placeholder="https://firebasestorage.googleapis.com/..."
                    className="h-12 rounded-xl border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">This will update the logo on the ID card and public website.</p>
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Core Content */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-brand-blue/40 uppercase tracking-[0.3em] flex items-center gap-2">
                 <LayoutGrid className="w-3 h-3" /> Core Content (About / Mission / Vision)
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 flex items-center gap-2">
                    <Info className="w-4 h-4" /> About Us Content
                  </Label>
                  <Textarea 
                    value={settings.aboutUs} 
                    onChange={e => setSettings({...settings, aboutUs: e.target.value})}
                    className="min-h-[150px] rounded-2xl border-slate-200 p-4"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Our Mission Statement
                    </Label>
                    <Textarea 
                      value={settings.mission} 
                      onChange={e => setSettings({...settings, mission: e.target.value})}
                      className="min-h-[100px] rounded-2xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                       <Eye className="w-4 h-4" /> Our Vision Statement
                    </Label>
                    <Textarea 
                      value={settings.vision} 
                      onChange={e => setSettings({...settings, vision: e.target.value})}
                      className="min-h-[100px] rounded-2xl border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Today's Special Announcement / Update column */}
            <div className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
              <h3 className="text-xs font-black text-brand-blue uppercase tracking-[0.3em] flex items-center gap-2">
                 <RefreshCw className="w-3.5 h-3.5 text-brand-blue" /> ഇന്നത്തെ അപ്ഡേഷൻ (Today's Announcement)
              </h3>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider -mt-3">
                അംഗങ്ങളുടെ ഐഡി തുറക്കുമ്പോൾ കാണിക്കുന്ന ഇന്നത്തെ അപ്ഡേഷൻ വിവരങ്ങൾ ഇവിടെ സജ്ജമാക്കാം.
              </p>

              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-150">
                  <div className="space-y-0.5">
                    <Label className="font-black text-slate-800 text-[10.5px] uppercase tracking-wider">അപ്ഡേഷൻ കാണിക്കണോ ? (Status)</Label>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ഇത് ആക്റ്റീവ് ആക്കിയാൽ മാത്രമേ മെമ്പർ കാർഡ് പേജിൽ ഈ ബോക്സ് പ്രത്യക്ഷപ്പെടുകയുള്ളൂ.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setSettings({ ...settings, announcementActive: true })}
                      className={`h-10 rounded-lg text-[10px] font-black px-4 uppercase tracking-wider shrink-0 transition-colors ${
                        settings.announcementActive ? 'bg-brand-blue text-white' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      Active (ഓൺ)
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setSettings({ ...settings, announcementActive: false })}
                      className={`h-10 rounded-lg text-[10px] font-black px-4 uppercase tracking-wider shrink-0 transition-colors ${
                        !settings.announcementActive ? 'bg-red-500 text-white' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      Inactive (ഓഫ്)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-700">അപ്ഡേഷൻ ഹെഡിങ് (Title)</Label>
                    <Input 
                      value={settings.announcementTitle || ''} 
                      onChange={e => setSettings({...settings, announcementTitle: e.target.value})}
                      placeholder="ഇന്നത്തെ അപ്ഡേഷൻ"
                      className="h-11 rounded-lg border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-700">തീയതി (Case Date / Date)</Label>
                    <Input 
                      value={settings.announcementCaseDate || ''} 
                      onChange={e => setSettings({...settings, announcementCaseDate: e.target.value})}
                      placeholder="ഉദാ: 2026-06-15"
                      className="h-11 rounded-lg border-slate-200 bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs">പ്രധാന വിഷയം / വിവരണം (Main Announcement Brief)</Label>
                  <Textarea 
                    value={settings.announcementText || ''} 
                    onChange={e => setSettings({...settings, announcementText: e.target.value})}
                    placeholder="വിഷയത്തെക്കുറിച്ചുള്ള വിവരങ്ങൾ ഇവിടെ മുഴുവനായി നൽകാം..."
                    className="min-h-[100px] rounded-xl border-slate-200 bg-white p-3 font-semibold text-xs leading-relaxed"
                  />
                </div>

                <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-200/50 space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-brand-blue tracking-widest">കേസ് സംബന്ധമായ വിവരങ്ങൾ (Optional Court Case Details)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label className="font-bold text-[10.5px] text-slate-600">കേസ് നമ്പർ (Case No.)</Label>
                      <Input 
                        value={settings.announcementCaseNo || ''} 
                        onChange={e => setSettings({...settings, announcementCaseNo: e.target.value})}
                        placeholder="ഉദാ: WP(C) No. 4321/2026"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-[10.5px] text-slate-600">കേസ് ഏതാണ് (Case Name / Type)</Label>
                      <Input 
                        value={settings.announcementCaseName || ''} 
                        onChange={e => setSettings({...settings, announcementCaseName: e.target.value})}
                        placeholder="ഉദാ: റിട്ട് ഹർജി"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-[10.5px] text-slate-600">കോടതി (Court Name)</Label>
                      <Input 
                        value={settings.announcementCourt || ''} 
                        onChange={e => setSettings({...settings, announcementCourt: e.target.value})}
                        placeholder="ഉദാ: കേരള ഹൈക്കോടതി"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-[10.5px] text-slate-600">അഭിഭാഷകന്റെ പേര് (Advocate Name)</Label>
                      <Input 
                        value={settings.announcementAdvocate || ''} 
                        onChange={e => setSettings({...settings, announcementAdvocate: e.target.value})}
                        placeholder="ഉദാ: അഡ്വ. പ്രേംരാജ് കുമാർ"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="font-bold text-[10.5px] text-slate-600">ജഡ്ജിയുടെ പേര് / ബെഞ്ച് (Judge's Name / Bench)</Label>
                      <Input 
                        value={settings.announcementJudgeBench || ''} 
                        onChange={e => setSettings({...settings, announcementJudgeBench: e.target.value})}
                        placeholder="ഉദാ: ജസ്റ്റിസ് ഇക്ബാൽ അഹമ്മദ് ബെഞ്ച്"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Contact & Address */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-brand-magenta/40 uppercase tracking-[0.3em] flex items-center gap-2">
                 <MapPin className="w-3 h-3" /> Contact & Address Information
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Official Head Office Address</Label>
                  <Textarea 
                    value={settings.address} 
                    onChange={e => setSettings({...settings, address: e.target.value})}
                    className="min-h-[80px] rounded-2xl border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Contact Phone
                    </Label>
                    <Input 
                      value={settings.phone} 
                      onChange={e => setSettings({...settings, phone: e.target.value})}
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Contact Email
                    </Label>
                    <Input 
                      value={settings.email} 
                      onChange={e => setSettings({...settings, email: e.target.value})}
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Website URL
                    </Label>
                    <Input 
                      value={settings.website} 
                      onChange={e => setSettings({...settings, website: e.target.value})}
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">District Details</Label>
                    <Input 
                      value={settings.districtDetails} 
                      onChange={e => setSettings({...settings, districtDetails: e.target.value})}
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-6">
              <Button 
                type="submit" 
                disabled={saving}
                className="w-full h-16 rounded-[24px] font-black text-lg bg-brand-blue text-white hover:bg-brand-blue/90 shadow-2xl shadow-brand-blue/20 uppercase tracking-widest"
              >
                {saving ? 'UPDATING...' : 'SAVE ALL SETTINGS'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
