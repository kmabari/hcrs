import React, { useState } from 'react';
import { useI18n, Language } from '../lib/i18n';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; label: string; nativeLabel: string; flag: string }[] = [
    { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', flag: '🇮🇳' },
    { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' }
  ];

  const currentLang = languages.find(l => l.code === lang) || languages[0];

  return (
    <div className="relative inline-block text-left z-[1000]" id="language-switcher-container">
      {/* Dropdown Toggle Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
        id="language-switcher-button"
      >
        <Globe className="w-3.5 h-3.5 text-brand-blue" />
        <span className="font-sans font-extrabold">{currentLang.flag} {currentLang.nativeLabel}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Items */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2.5 w-44 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-xl shadow-slate-200/50 z-50 origin-top-right focus:outline-none"
            >
              <div className="py-1 space-y-0.5">
                {languages.map((item) => {
                  const isActive = item.code === lang;
                  return (
                    <button
                      key={item.code}
                      role="menuitem"
                      onClick={() => {
                        setLanguage(item.code);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-all duration-150 cursor-pointer ${
                        isActive 
                          ? 'bg-slate-50 text-brand-blue' 
                          : 'bg-transparent text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] leading-none shrink-0">{item.flag}</span>
                        <div className="flex flex-col">
                          <span className="font-extrabold leading-tight">{item.nativeLabel}</span>
                          <span className="text-[9px] font-medium leading-none text-slate-400 mt-0.5 font-sans">{item.label}</span>
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-brand-blue stroke-[3px]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
