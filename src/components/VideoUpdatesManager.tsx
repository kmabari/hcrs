import React, { useEffect, useState } from 'react';
import { Save, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrgSettings, saveOrgSettings, OrgSettings } from '@/src/lib/cms';
import { getYouTubeVideoId } from '@/src/lib/youtube';
import YouTubeVideoCard from './YouTubeVideoCard';

type VideoField = 'home' | 'verification' | 'janamail';
type FormState = Record<`${VideoField}VideoUrl` | `${VideoField}VideoTitle`, string>;

const emptyForm: FormState = {
  homeVideoUrl: '', homeVideoTitle: '',
  verificationVideoUrl: '', verificationVideoTitle: '',
  janamailVideoUrl: '', janamailVideoTitle: ''
};

const sections: Array<{ key: VideoField; heading: string; help: string }> = [
  { key: 'home', heading: 'Home Page Main Video', help: 'ഇപ്പോൾ പ്രധാനമായ ഏറ്റവും പുതിയ വീഡിയോ ഹോം പേജിൽ കാണിക്കും.' },
  { key: 'verification', heading: 'Verification Form Help Video', help: 'Verification / Settlement Form തുറക്കുന്ന ഭാഗത്ത് ഈ വീഡിയോ മാത്രം കാണിക്കും.' },
  { key: 'janamail', heading: 'Janamail Help Video', help: 'Operation Janamail പേജിൽ ഉപയോഗരീതി വിശദീകരിക്കുന്ന വീഡിയോ കാണിക്കും.' }
];

export default function VideoUpdatesManager() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOrgSettings().then((settings) => setForm({
      homeVideoUrl: settings.homeVideoUrl || '',
      homeVideoTitle: settings.homeVideoTitle || '',
      verificationVideoUrl: settings.verificationVideoUrl || '',
      verificationVideoTitle: settings.verificationVideoTitle || '',
      janamailVideoUrl: settings.janamailVideoUrl || '',
      janamailVideoTitle: settings.janamailVideoTitle || ''
    })).catch(() => toast.error('Video settings load ചെയ്യാൻ കഴിഞ്ഞില്ല.'));
  }, []);

  const save = async () => {
    const invalid = sections.find(({ key }) => {
      const url = form[`${key}VideoUrl`];
      return url.trim() && !getYouTubeVideoId(url);
    });
    if (invalid) {
      toast.error(`${invalid.heading}: ശരിയായ YouTube link നൽകുക.`);
      return;
    }

    setSaving(true);
    const loading = toast.loading('YouTube video settings saving...');
    try {
      const updates: Partial<OrgSettings> = {};
      sections.forEach(({ key }) => {
        (updates as any)[`${key}VideoUrl`] = form[`${key}VideoUrl`].trim();
        (updates as any)[`${key}VideoTitle`] = form[`${key}VideoTitle`].trim();
      });
      await saveOrgSettings(updates);
      toast.success('Video updates saved successfully.', { id: loading });
    } catch (error: any) {
      toast.error(error?.message || 'Video settings save ചെയ്യാൻ കഴിഞ്ഞില്ല.', { id: loading });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-black text-[#1a2b5c]"><Video className="h-5 w-5 text-red-600" /> YouTube Video Updates</CardTitle>
        <CardDescription>വീഡിയോ upload ചെയ്യേണ്ടതില്ല. YouTube link മാത്രം നൽകുക; thumbnail സ്വയം വരും.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map(({ key, heading, help }) => {
          const urlKey = `${key}VideoUrl` as keyof FormState;
          const titleKey = `${key}VideoTitle` as keyof FormState;
          return (
            <div key={key} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 lg:grid-cols-[1fr_300px]">
              <div className="space-y-3">
                <div><h3 className="text-sm font-black text-slate-900">{heading}</h3><p className="text-[11px] font-semibold text-slate-500">{help}</p></div>
                <div className="space-y-1"><Label>Video Title</Label><Input value={form[titleKey]} onChange={e => setForm(prev => ({ ...prev, [titleKey]: e.target.value }))} placeholder="വീഡിയോയുടെ തലക്കെട്ട്" /></div>
                <div className="space-y-1"><Label>YouTube Link</Label><Input value={form[urlKey]} onChange={e => setForm(prev => ({ ...prev, [urlKey]: e.target.value }))} placeholder="https://youtu.be/... or https://youtube.com/watch?v=..." /></div>
                <p className="text-[10px] font-semibold text-slate-400">Link നീക്കം ചെയ്ത് Save ചെയ്താൽ ആ ഭാഗത്തെ വീഡിയോ മറയും.</p>
              </div>
              <YouTubeVideoCard url={form[urlKey]} title={form[titleKey] || heading} compact />
            </div>
          );
        })}
        <Button onClick={save} disabled={saving} className="h-11 w-full rounded-xl bg-[#1a2b5c] font-black text-white sm:w-auto">
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Video Updates'}
        </Button>
      </CardContent>
    </Card>
  );
}
