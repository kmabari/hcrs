import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, Info, Target, Eye, MapPin, Phone, Mail, Globe, LayoutGrid, RefreshCw, Trash2, Plus, CheckCircle2, X } from 'lucide-react';
import { getOrgSettings, saveOrgSettings, OrgSettings, defaultSettings, addAnnouncement, deleteAnnouncement, updateAnnouncement, subscribeToAnnouncements, Announcement } from '@/src/lib/cms';

export default function BrandingManager() {
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New & Edit announcement form state
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCaseDate, setNewCaseDate] = useState('');
  const [newCaseNo, setNewCaseNo] = useState('');
  const [newCaseName, setNewCaseName] = useState('');
  const [newCourt, setNewCourt] = useState('');
  const [newAdvocate, setNewAdvocate] = useState('');
  const [newJudgeBench, setNewJudgeBench] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const startEditing = (ann: Announcement) => {
    setEditingAnnId(ann.id || null);
    setNewTitle(ann.title);
    setNewText(ann.text);
    setNewCaseDate(ann.caseDate || '');
    setNewCaseNo(ann.caseNo || '');
    setNewCaseName(ann.caseName || '');
    setNewCourt(ann.court || '');
    setNewAdvocate(ann.advocate || '');
    setNewJudgeBench(ann.judgeBench || '');
    setNewImageUrl(ann.imageUrl || '');
    toast.message('തിരുത്താനുള്ള വിവരങ്ങൾ ഫോമിലേക്ക് ലോഡ് ചെയ്‌തിരിക്കുന്നു.', {
      description: 'മുകളിലെ ഫോമിൽ വിവരങ്ങൾ തിരുത്തിയ ശേഷം മാറ്റങ്ങൾ സേവ് ചെയ്യുക.',
    });
    // Scroll to section smoothly
    const formSec = document.getElementById('announcement_form_container');
    if (formSec) {
      formSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEditing = () => {
    setEditingAnnId(null);
    setNewTitle('');
    setNewText('');
    setNewCaseDate('');
    setNewCaseNo('');
    setNewCaseName('');
    setNewCourt('');
    setNewAdvocate('');
    setNewJudgeBench('');
    setNewImageUrl('');
  };

  useEffect(() => {
    fetchSettings();
    const unsubAnnouncements = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
    });
    return () => {
      unsubAnnouncements();
    };
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
            <div className="space-y-6 bg-slate-50/50 p-6 md:p-8 rounded-3xl border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150">
                <div>
                  <h3 className="text-xs font-black text-brand-blue uppercase tracking-[0.3em] flex items-center gap-2">
                     <RefreshCw className="w-3.5 h-3.5 text-brand-blue animate-spin" /> പ്രധാന അറിയിപ്പുകൾ (Manage Live Updates & Announcements)
                  </h3>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mt-1">
                    വെബ്‌സൈറ്റിൽ കാണിക്കുന്ന മികച്ച അറിയിപ്പുകളുടെ വിവരങ്ങൾ ഇവിടെ നൽകാം. നിങ്ങൾക്ക് ഒന്നിൽ കൂടുതൽ അപ്ഡേറ്റുകൾ ഇവിടെ ചേർക്കാവുന്നതാണ്.
                  </p>
                </div>
                
                {/* Global Status toggler */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="space-y-0.5">
                    <Label className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider block">അറിയിപ്പ് കോളം (Status)</Label>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{settings.announcementActive ? 'ഓൺ (Active)' : 'ഓഫ് (Inactive)'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSettings({ ...settings, announcementActive: true })}
                      className={`h-8 rounded-lg text-[9px] font-black px-3.5 uppercase tracking-wider transition-colors ${
                        settings.announcementActive ? 'bg-brand-blue text-white' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      Active
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSettings({ ...settings, announcementActive: false })}
                      className={`h-8 rounded-lg text-[9px] font-black px-3.5 bg-red-500 text-white uppercase tracking-wider transition-colors ${
                        !settings.announcementActive ? 'bg-red-500 text-white' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      Inactive
                    </Button>
                  </div>
                </div>
              </div>

              {/* Add/Edit Announcement Form Accordion/Box */}
              <div id="announcement_form_container" className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4 scroll-mt-6">
                <h4 className="text-[11px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
                  {editingAnnId ? <Save className="w-4 h-4 text-brand-blue animate-pulse" /> : <Plus className="w-4 h-4 text-brand-magenta" />}
                  {editingAnnId ? 'അറിയിപ്പ് എഡിറ്റ് ചെയ്യുക (Edit Active Announcement)' : 'പുതിയ അറിയിപ്പ് ചേർക്കുക (Add New Announcement)'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-700">അപ്ഡേഷൻ ഹെഡിങ് (Title / Heading) *</Label>
                    <Input 
                      value={newTitle} 
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="ഉദാ: ഇന്നത്തെ അപ്ഡേഷൻ (Today's Updates)"
                      className="h-11 rounded-lg border-slate-200 font-bold text-slate-700 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-700">തീയതി (Date / Case Date)</Label>
                    <Input 
                      value={newCaseDate} 
                      onChange={e => setNewCaseDate(e.target.value)}
                      placeholder="ഉദാ: 2026-06-15"
                      className="h-11 rounded-lg border-slate-200 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs">പ്രധാന അറിയിപ്പ് വിവരണം (Announcement Main Description) *</Label>
                  <Textarea 
                    value={newText} 
                    onChange={e => setNewText(e.target.value)}
                    placeholder="മുഴുവൻ വിവരങ്ങളും ഇവിടെ നൽകുക..."
                    className="min-h-[90px] rounded-xl border-slate-200 p-3 font-semibold text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs">ന്യൂസ് ഇമേജ് ലിങ്ക് (Image / Photo Link URL) (Optional)</Label>
                  <Input 
                    value={newImageUrl} 
                    onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="ഉദാ: https://images.weserv.nl/?url=https://..."
                    className="h-11 rounded-lg border-slate-200 font-semibold text-xs"
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    ചില വാർത്തകളിൽ ഇമേജുകൾ ഉൾപ്പെടുത്താൻ വെബ് സൈറ്റുകളിൽ നിന്നുള്ള ഇമേജ് ലിങ്ക് പേസ്റ്റ് ചെയ്യുക.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
                  <h5 className="text-[9.5px] font-black uppercase text-brand-magenta tracking-widest">കേസ് സംബന്ധമായ വിവരങ്ങൾ (Optional Case Profile Details)</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label className="font-bold text-[10px] text-slate-600">കേസ് നമ്പർ (Case No.)</Label>
                      <Input 
                        value={newCaseNo} 
                        onChange={e => setNewCaseNo(e.target.value)}
                        placeholder="ഉദാ: WP(C) No. 4321/2026"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-[10px] text-slate-600">കേസ് ഏതാണ് (Case Name)</Label>
                      <Input 
                        value={newCaseName} 
                        onChange={e => setNewCaseName(e.target.value)}
                        placeholder="ഉദാ: റിട്ട് ഹർജി"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-[10px] text-slate-600">കോടതി (Court Name)</Label>
                      <Input 
                        value={newCourt} 
                        onChange={e => setNewCourt(e.target.value)}
                        placeholder="ഉദാ: കേരള ഹൈക്കോടതി"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-[10px] text-slate-600">അഭിഭാഷകന്റെ പേര് (Advocate Name)</Label>
                      <Input 
                        value={newAdvocate} 
                        onChange={e => setNewAdvocate(e.target.value)}
                        placeholder="ഉദാ: അഡ്വ. പ്രേംരാജ് കുമാർ"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="font-bold text-[10px] text-slate-600">ജഡ്ജിയുടെ പേര് / ബെഞ്ച് (Judge's Name / Bench)</Label>
                      <Input 
                        value={newJudgeBench} 
                        onChange={e => setNewJudgeBench(e.target.value)}
                        placeholder="ഉദാ: ജസ്റ്റിസ് ഇക്ബാൽ അഹമ്മദ് ബെഞ്ച്"
                        className="h-10 rounded-lg border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  {editingAnnId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEditing}
                      className="w-full sm:w-auto h-10 border-slate-200 text-slate-500 hover:bg-slate-50 font-black text-[10px] uppercase tracking-wider rounded-xl px-5 flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                      എഡിറ്റിങ് ക്യാൻസൽ (Cancel Edit)
                    </Button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  
                  <Button
                    type="button"
                    disabled={adding}
                    onClick={async () => {
                      if (!newTitle.trim() || !newText.trim()) {
                        toast.error('ഹെഡിങ്, വാർത്ത വിവരണം എന്നിവ നൽകൽ നിർബന്ധമാണ്.');
                        return;
                      }
                      setAdding(true);
                      const annData = {
                        title: newTitle.trim(),
                        text: newText.trim(),
                        caseDate: newCaseDate.trim(),
                        caseNo: newCaseNo.trim(),
                        caseName: newCaseName.trim(),
                        court: newCourt.trim(),
                        advocate: newAdvocate.trim(),
                        judgeBench: newJudgeBench.trim(),
                        imageUrl: newImageUrl.trim(),
                        active: true
                      };
                      try {
                        if (editingAnnId) {
                          await updateAnnouncement(editingAnnId, annData);
                          toast.success('വാർത്ത വിവരങ്ങൾ വിജയകരമായി അപ്‌ഡേറ്റ് ചെയ്തു.');
                          setEditingAnnId(null);
                        } else {
                          await addAnnouncement(annData);
                          toast.success('പുതിയ അറിയിപ്പ് വിജയകരമായി ചേർത്തു.');
                        }
                        // Reset form fields
                        setNewTitle('');
                        setNewText('');
                        setNewCaseDate('');
                        setNewCaseNo('');
                        setNewCaseName('');
                        setNewCourt('');
                        setNewAdvocate('');
                        setNewJudgeBench('');
                        setNewImageUrl('');
                      } catch (error) {
                        console.error(error);
                        toast.error(editingAnnId ? 'അപ്‌ഡേറ്റ് ചെയ്യാൻ കഴിഞ്ഞില്ല.' : 'അറിയിപ്പ് ചേർക്കാൻ കഴിഞ്ഞില്ല.');
                      } finally {
                        setAdding(false);
                      }
                    }}
                    className={`w-full sm:w-auto text-white font-black text-[10.5px] uppercase tracking-wider rounded-xl h-10 px-6 shadow-md ${
                      editingAnnId ? 'bg-brand-blue shadow-brand-blue/10 hover:bg-brand-blue/95' : 'bg-brand-magenta shadow-brand-magenta/10 hover:bg-brand-magenta/95'
                    }`}
                  >
                    {adding ? 'പ്രോസസ്സിങ്...' : editingAnnId ? 'മാറ്റങ്ങൾ സേവ് ചെയ്യുക (SAVE CHANGES)' : 'അറിയിപ്പ് കോൺഫിഗർ ചെയ്യുക (ADD NOW)'}
                  </Button>
                </div>
              </div>

              {/* Saved Announcements List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">നിലവിലുള്ള അറിയിപ്പുകൾ (Current Announcements List ({announcements.length}))</h4>
                {announcements.length === 0 ? (
                  <div className="bg-white p-6 border border-slate-200/60 rounded-2xl text-center text-slate-400 text-xs font-semibold">
                    നിലവിൽ അറിയിപ്പുകൾ ഒന്നും ചേർത്തിട്ടില്ല. ദയവായി മുകളിൽ പുതിയത് ചേർക്കുക.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all">
                        <div className="space-y-1.5 text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-800 text-sm truncate">{ann.title}</span>
                            {ann.caseDate && (
                              <span className="bg-brand-blue/10 text-brand-blue text-[9px] font-black px-2 py-0.5 rounded-full">{ann.caseDate}</span>
                            )}
                            {ann.active ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[8.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 text-[8.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Paused</span>
                            )}
                          </div>
                          
                          <p className="text-slate-500 font-semibold text-xs leading-relaxed line-clamp-2 whitespace-pre-wrap">{ann.text}</p>
                          
                          {ann.imageUrl && (
                            <div className="text-[9px] text-[#FF1493] font-bold flex items-center gap-1">
                              <span>📸 ഇമേജ് ലിങ്ക് ലഭ്യമാണ്:</span>
                              <span className="underline truncate max-w-[200px] font-normal">{ann.imageUrl}</span>
                            </div>
                          )}

                          {ann.caseNo && (
                            <div className="text-[9px] text-brand-magenta font-black uppercase tracking-wider mt-1">
                              CASE: {ann.caseNo} | {ann.court || 'Court'}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 md:self-center shrink-0 w-full md:w-auto justify-end">
                          {/* Edit button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(ann)}
                            className="h-8 rounded-lg text-[9px] font-extrabold px-3 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center gap-1"
                          >
                            Edit / തിരുത്തുക
                          </Button>

                          {/* Toggle Active status */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await updateAnnouncement(ann.id!, { active: !ann.active });
                                toast.success('അറിയിപ്പ് സ്റ്റാറ്റസ് മാറ്റിയിരിക്കുന്നു.');
                              } catch (e) {
                                toast.error('സ്റ്റാറ്റസ് മാറ്റാൻ കഴിഞ്ഞില്ല.');
                              }
                            }}
                            className={`h-8 rounded-lg text-[9px] font-extrabold px-3 ${
                              ann.active ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {ann.active ? 'Pause' : 'Activate'}
                          </Button>
                          
                          {/* Delete design of announcement */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm('ഈ അറിയിപ്പ് എന്നെന്നേക്കുമായി ഡിലീറ്റ് ചെയ്യണമെന്നുറപ്പാണോ?')) {
                                try {
                                  await deleteAnnouncement(ann.id!);
                                  toast.success('അറിയിപ്പ് വിജയകരമായി ഡിലീറ്റ് ചെയ്തു.');
                                  if (editingAnnId === ann.id) {
                                    cancelEditing();
                                  }
                                } catch (e) {
                                  toast.error('ഡിലീറ്റ് ചെയ്യാൻ കഴിഞ്ഞില്ല.');
                                }
                              }
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
