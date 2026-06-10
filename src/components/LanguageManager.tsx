import React, { useState } from 'react';
import { useI18n, staticTranslations, Language } from '../lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Globe, 
  Search, 
  Save, 
  RotateCcw, 
  BookmarkCheck, 
  Sparkles, 
  Check, 
  FileEdit,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KeyGroup {
  id: string;
  label: string;
  description: string;
  color: string;
  pattern: RegExp;
}

const GROUPS: KeyGroup[] = [
  { id: 'all', label: 'All Texts', description: 'Every translation key in the system', color: 'bg-slate-150 text-slate-800', pattern: /.*/ },
  { id: 'nav', label: 'Navigation / Menus', description: 'Header navigation, sidebar, and logout links', color: 'bg-blue-50 text-blue-600 border-blue-200', pattern: /^nav_/ },
  { id: 'hero', label: 'Hero / Branding', description: 'Main hero screen titles, subtitles, and badges', color: 'bg-indigo-50 text-indigo-600 border-indigo-200', pattern: /^hero_/ },
  { id: 'pillar', label: 'Core Pillars', description: 'Aims, community, revival, support, and legal protection cards', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', pattern: /^pillar_/ },
  { id: 'form', label: 'Forms & Inputs', description: 'Registration, renewal, login inputs and error fields', color: 'bg-rose-50 text-rose-600 border-rose-200', pattern: /^(form_|label_)/ },
  { id: 'general', label: 'General / Buttons', description: 'Common text buttons, action links, and labels', color: 'bg-amber-50 text-amber-600 border-amber-200', pattern: /^(btn_|updates_|navigation_)/ },
  { id: 'faq', label: 'FAQs', description: 'Frequently Asked Questions and official answers', color: 'bg-violet-50 text-violet-600 border-violet-200', pattern: /^faq_/ },
  { id: 'chat', label: 'AI Chatbot', description: 'Predefined HCRS AI assistant prompts and text strings', color: 'bg-teal-50 text-teal-600 border-teal-200', pattern: /^chat_/ }
];

export default function LanguageManager() {
  const { 
    dynamicOverrides, 
    updateDynamicOverride, 
    saveDynamicOverridesToCloud, 
    resetDynamicOverridesToCloud,
    t 
  } = useI18n();

  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedKey, setSelectedKey] = useState<string>('nav_home');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Extract all compiled i18n keys
  const allKeys = Object.keys(staticTranslations);

  // Group filter criteria
  const targetGroup = GROUPS.find(g => g.id === selectedGroup) || GROUPS[0];
  
  // Filter keys based on search and selected tab group
  const filteredKeys = allKeys.filter(key => {
    const matchesGroup = targetGroup.pattern.test(key);
    
    if (!matchesGroup) return false;
    if (!search.trim()) return true;

    const lowerSearch = search.toLowerCase();
    const staticVal = staticTranslations[key] || { ml: '', en: '', hi: '' };
    const customVal = dynamicOverrides[key] || {};

    const matchText = [
      key,
      staticVal.ml,
      staticVal.en,
      staticVal.hi,
      customVal.ml || '',
      customVal.en || '',
      customVal.hi || ''
    ].join(' ').toLowerCase();

    return matchText.includes(lowerSearch);
  });

  const activeTranslations = staticTranslations[selectedKey] || { ml: '', en: '', hi: '' };
  const mlOverride = dynamicOverrides[selectedKey]?.ml ?? '';
  const enOverride = dynamicOverrides[selectedKey]?.en ?? '';
  const hiOverride = dynamicOverrides[selectedKey]?.hi ?? '';

  const handleTextChange = (langCode: Language, value: string) => {
    updateDynamicOverride(selectedKey, langCode, value);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const loadToast = toast.loading('Saving translation overrides securely to Firestore...');
    try {
      await saveDynamicOverridesToCloud();
      toast.success('Translations synchronized and updated successfully!', { id: loadToast });
    } catch (e) {
      console.error(e);
      toast.error('Failed to update translations. Please verify administrator rights.', { id: loadToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete all dynamic translation overrides? This will reset all website text back to preloaded defaults.')) {
      return;
    }
    setIsResetting(true);
    const loadToast = toast.loading('Clearing custom translations and resetting system defaults...');
    try {
      await resetDynamicOverridesToCloud();
      toast.success('All translations restored to core factory defaults.', { id: loadToast });
      if (allKeys.length > 0) {
        setSelectedKey(allKeys[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to reset translations.', { id: loadToast });
    } finally {
      setIsResetting(false);
    }
  };

  const getHumanReadableKeyName = (key: string) => {
    return key
      .replace(/^(nav_|hero_|pillar_|form_|btn_|faq_)/, '')
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Introduction Banner header */}
      <div className="bg-gradient-to-r from-brand-blue/10 to-violet-500/10 border border-brand-blue/15 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-brand-blue text-white hover:bg-brand-blue border-none text-[9px] uppercase tracking-wider px-2 py-0.5 font-bold">
                PRO MODULE
              </Badge>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">System Localization Engine</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Website Language & Localization Settings (ഭാഷാ മാനേജർ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl font-semibold">
              Manage complete website content translation across English, Malayalam, and Hindi from this panel. Changes update instantly in the cloud for all active users.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button 
              onClick={handleReset}
              variant="outline"
              disabled={isResetting || isSaving}
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 rounded-xl h-11 text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              Reset Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isResetting}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl h-11 px-5 text-xs font-black uppercase tracking-wider shadow-md hover:translate-y-[-1px] active:translate-y-0 transition-all border border-brand-blue flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Translations'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Keys Navigator Column */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-none shadow-sm bg-white p-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search keys, labels, or content translations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-11 border-slate-200 focus:border-brand-blue rounded-xl text-xs font-semibold bg-slate-50/50"
                />
              </div>

              {/* Group Badges select row */}
              <div className="flex flex-wrap gap-1.5 pt-1.5 max-h-[140px] overflow-y-auto pr-1">
                {GROUPS.map((group) => {
                  const isCur = selectedGroup === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group.id);
                        // Reset selection to the first matched key if current key will fail filter
                        const matched = allKeys.filter(k => group.pattern.test(k));
                        if (matched.length > 0 && !group.pattern.test(selectedKey)) {
                          setSelectedKey(matched[0]);
                        }
                      }}
                      className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                        isCur 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Group description tag */}
          <div className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-300" />
            Category: {targetGroup.description}
          </div>

          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
            <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Translation Keys ({filteredKeys.length})
              </h3>
              <span className="text-[10px] font-mono font-black text-brand-blue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                {selectedKey ? '1 Selected' : 'Select a key'}
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 divide-dashed">
              {filteredKeys.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Globe className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-extrabold uppercase tracking-wide">No translations match your search</p>
                </div>
              ) : (
                filteredKeys.map((k) => {
                  const isSel = selectedKey === k;
                  const custom = dynamicOverrides[k];
                  const hasCustom = custom && (custom.ml || custom.en || custom.hi);
                  
                  return (
                    <button
                      key={k}
                      onClick={() => setSelectedKey(k)}
                      className={`w-full text-left p-4 transition-all flex items-center justify-between group ${
                        isSel 
                          ? 'bg-blue-50/50 dark:bg-slate-900' 
                          : 'bg-transparent hover:bg-slate-50/30'
                      }`}
                    >
                      <div className="space-y-1 max-w-[85%]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black tracking-tight uppercase ${
                            isSel ? 'text-brand-blue font-black' : 'text-slate-800'
                          }`}>
                            {getHumanReadableKeyName(k)}
                          </span>
                          {hasCustom && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 font-bold border-none text-[8px] h-3 px-1.5 uppercase text-white scale-90">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-[9.5px] font-mono text-slate-400 font-semibold truncate leading-none">
                          {k}
                        </p>
                        <p className="text-[10px] text-slate-500 italic truncate font-medium mt-1 leading-normal">
                          {staticTranslations[k]?.ml || staticTranslations[k]?.en}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                        isSel ? 'text-brand-blue translate-x-0.5' : 'text-slate-300'
                      }`} />
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Side: Translation Workspace Editor */}
        <div className="lg:col-span-7">
          {selectedKey ? (
            <div className="space-y-6">
              {/* Workspace Card Header info */}
              <Card className="border-none shadow-sm bg-white p-6 rounded-[28px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 blur-2xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="bg-brand-blue/10 p-3 rounded-2xl text-brand-blue shrink-0">
                    <FileEdit className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Selected Translation Unit</span>
                      <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-mono">
                        {selectedKey.split('_')[0] || 'Key'}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-base md:text-lg tracking-tight uppercase mt-0.5 leading-snug">
                      {getHumanReadableKeyName(selectedKey)}
                    </h3>
                    <p className="text-[10.5px] font-mono text-slate-400 font-bold mt-1 tracking-wider leading-none">
                      KEY REFERENCE: {selectedKey}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Translation Panels Box */}
              <Card className="border-none shadow-sm bg-white p-6 rounded-[32px] space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Translation Workspaces</h4>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Modify the text in the boxes below to overwrite the default translations. Leaving these fields blank will fall back to default values.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Malayalam Editor Box */}
                  <div className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Malayalam (മലയാളം)
                      </label>
                      <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 font-mono font-bold tracking-wider uppercase px-2">
                        System Default ML
                      </Badge>
                    </div>
                    <Textarea
                      placeholder={activeTranslations.ml || 'Enter Malayalam Translation text...'}
                      value={mlOverride}
                      onChange={(e) => handleTextChange('ml', e.target.value)}
                      className="min-h-[75px] border-2 border-slate-200 focus:border-brand-blue focus:ring-0 rounded-2xl text-xs font-bold text-slate-800 bg-white placeholder-slate-400 transition-all shadow-inner leading-relaxed"
                    />
                    <div className="text-[10px] text-slate-400 font-semibold px-1 flex items-center gap-1 leading-none">
                      <Info className="w-3.5 h-3.5 text-slate-300" />
                      Fallback: <span className="font-bold">{activeTranslations.ml || 'None'}</span>
                    </div>
                  </div>

                  {/* English Editor Box */}
                  <div className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        English Text
                      </label>
                    </div>
                    <Textarea
                      placeholder={activeTranslations.en || 'Enter English translation text...'}
                      value={enOverride}
                      onChange={(e) => handleTextChange('en', e.target.value)}
                      className="min-h-[75px] border-2 border-slate-200 focus:border-brand-blue focus:ring-0 rounded-2xl text-xs font-bold text-slate-800 bg-white placeholder-slate-400 transition-all shadow-inner leading-relaxed"
                    />
                    <div className="text-[10px] text-slate-400 font-semibold px-1 flex items-center gap-1 leading-none">
                      <Info className="w-3.5 h-3.5 text-slate-300" />
                      Fallback: <span className="font-bold">{activeTranslations.en || 'None'}</span>
                    </div>
                  </div>

                  {/* Hindi Editor Box */}
                  <div className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Hindi Text (हिन्दी)
                      </label>
                    </div>
                    <Textarea
                      placeholder={activeTranslations.hi || 'Enter Hindi translation text...'}
                      value={hiOverride}
                      onChange={(e) => handleTextChange('hi', e.target.value)}
                      className="min-h-[75px] border-2 border-slate-200 focus:border-brand-blue focus:ring-0 rounded-2xl text-xs font-bold text-slate-800 bg-white placeholder-slate-400 transition-all shadow-inner leading-relaxed"
                    />
                    <div className="text-[10px] text-slate-400 font-semibold px-1 flex items-center gap-1 leading-none">
                      <Info className="w-3.5 h-3.5 text-slate-300" />
                      Fallback: <span className="font-bold">{activeTranslations.hi || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Instant Live Preview Board */}
                <div className="pt-6 border-t border-slate-100 bg-slate-50/50 p-4 -mx-6 -mb-6 rounded-b-[32px] space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-brand-blue animate-pulse" />
                      Live Dynamic Preview
                    </h5>
                    <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200 border-none text-[8.5px] uppercase font-bold tracking-wider">
                      Interactive View
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-inner">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Malayalam</p>
                      <p className="font-extrabold text-slate-800 break-words leading-snug">
                        {mlOverride || activeTranslations.ml}
                      </p>
                    </div>
                    <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-inner">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">English</p>
                      <p className="font-extrabold text-slate-800 break-words leading-snug">
                        {enOverride || activeTranslations.en}
                      </p>
                    </div>
                    <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-inner">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Hindi</p>
                      <p className="font-extrabold text-slate-800 break-words leading-snug">
                        {hiOverride || activeTranslations.hi}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="border-none shadow-sm bg-white p-16 rounded-[32px] text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
              <Globe className="w-16 h-16 text-slate-200 stroke-[1.2] mb-4 animate-spin-slow" />
              <h4 className="font-black text-slate-700 uppercase tracking-wider text-sm">No Key Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                Choose any localized text key from the navigation panel on the left to start editing the respective Malayalam, English, and Hindi translations.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
