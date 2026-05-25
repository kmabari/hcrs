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
