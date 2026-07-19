import React, { useState, useEffect } from "react";
import { ArrowLeft, Mail, ShieldAlert, ExternalLink, Calendar, Users, Star, BookOpen, AlertTriangle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CampaignInfo from "./CampaignInfo";
import EmailEditor from "./EmailEditor";
import QRSection from "./QRSection";
import FAQ from "./FAQ";
import Disclaimer from "./Disclaimer";
import { subscribeToGallery, subscribeToAnnouncements, subscribeToJanamailConfig, JanamailConfig } from "../../lib/cms";

interface OperationJanamailProps {
  onBack: () => void;
}

export default function OperationJanamail({ onBack }: OperationJanamailProps) {
  const [campaignImages, setCampaignImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [config, setConfig] = useState<JanamailConfig | null>(null);
  const [isReadMoreExpanded, setIsReadMoreExpanded] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(null);

  useEffect(() => {
    const unsubConfig = subscribeToJanamailConfig((conf) => {
      setConfig(conf);
    });

    const unsubGallery = subscribeToGallery((items) => {
      const matches = items.filter(item =>
        item.category?.toLowerCase().includes("janamail") ||
        item.category?.toLowerCase().includes("campaign") ||
        item.title?.toLowerCase().includes("janamail") ||
        item.title?.toLowerCase().includes("campaign")
      ).map(item => item.url);

      if (matches.length > 0) {
        setCampaignImages(prev => Array.from(new Set([...prev, ...matches])));
      }
    });

    const unsubAnnouncements = subscribeToAnnouncements((items) => {
      const matches = items.filter(item =>
        item.title?.toLowerCase().includes("janamail") ||
        item.title?.toLowerCase().includes("campaign") ||
        item.text?.toLowerCase().includes("janamail") ||
        item.text?.toLowerCase().includes("campaign")
      ).map(item => item.imageUrl).filter(Boolean) as string[];

      if (matches.length > 0) {
        setCampaignImages(prev => Array.from(new Set([...prev, ...matches])));
      }
    });

    return () => {
      unsubConfig();
      unsubGallery();
      unsubAnnouncements();
    };
  }, []);

  // Default fallback if no dynamic campaign images are fetched
  const displayImages = campaignImages.length > 0 
    ? campaignImages 
    : ["https://i.ibb.co/B5YWH43C/IMG-20260706-WA0108.jpg"];

  const campaignArtwork = config?.artworkUrl || displayImages[0];

  const getStatusBadge = () => {
    if (config?.campaignStatus === "completed" || config?.campaignStatus === "disabled" || config?.active === false) {
      return (
        <span className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          CAMPAIGN COMPLETED
        </span>
      );
    }
    if (config?.campaignStatus === "draft") {
      return (
        <span className="text-[10px] md:text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          DRAFT CAMPAIGN
        </span>
      );
    }
    return (
      <span className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
        ACTIVE CAMPAIGN
      </span>
    );
  };

  const showBanner = config?.active === false || config?.campaignStatus === "disabled" || config?.campaignStatus === "completed" || config?.campaignStatus === "draft";

  return (
    <main className="min-h-screen bg-slate-50 antialiased font-sans selection:bg-blue-100/40 text-slate-800 pb-16">
      
      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm py-4.5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 text-slate-600 hover:text-[#1a2b5c] transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>മടങ്ങുക / Return Home</span>
          </button>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>
      </nav>

      {/* Header Section with Small Page Title */}
      <header className="max-w-4xl mx-auto px-6 pt-12 pb-6 text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-bold tracking-wider text-blue-700 border border-blue-100/80">
          <Mail className="w-3.5 h-3.5" />
          HCRS PUBLIC CAMPAIGN
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-950 uppercase tracking-tight">
          {config?.campaignName || "OPERATION JANAMAIL"}
        </h1>
      </header>

      {/* Short Introduction Section (4-5 lines) */}
      <section className="max-w-2xl mx-auto px-6 text-center mb-6">
        <p className="text-sm md:text-base leading-relaxed text-slate-600 font-medium font-sans">
          {config?.campaignIntroduction || "ഓരോ പൗരനും അവരുടെ അഭിപ്രായങ്ങളും ആവശ്യങ്ങളും ബന്ധപ്പെട്ട സർക്കാർ അധികാരികളെ മാന്യവും ഉത്തരവാദിത്തപരവുമായി അറിയിക്കാൻ സഹായിക്കുന്ന ഒരു പൊതുപങ്കാളിത്ത ഇ-മെയിൽ ക്യാമ്പയിനാണ് Operation Janamail. ഇതിലൂടെ നിങ്ങളുടെ ശബ്ദം നേരിട്ട് അധികാരികളുടെ മുൻപിലേക്ക് എത്തിക്കാൻ സാധിക്കുന്നു."}
        </p>

        {!isReadMoreExpanded ? (
          <div className="mt-5">
            <button
              onClick={() => {
                setIsReadMoreExpanded(true);
                setOpenSection(1); // Auto-open the first section for helpful onboarding
              }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <span>കൂടുതൽ വായിക്കാം / Read More</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <button
              onClick={() => {
                setIsReadMoreExpanded(false);
                setOpenSection(null);
              }}
              className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer"
            >
              <span>വിവരങ്ങൾ ചുരുക്കാം / Read Less</span>
              <motion.span animate={{ rotate: 180 }} className="inline-block">
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>
          </div>
        )}
      </section>

      {/* Expandable Accordion Cards Section */}
      <AnimatePresence initial={false}>
        {isReadMoreExpanded && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto px-6 mb-12 space-y-4"
          >
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-4">
                കൂടുതൽ വിവരങ്ങൾ / Detailed Campaign Information
              </h3>
              
              <div className="space-y-3">
                {[
                  {
                    id: 1,
                    titleMl: "Operation Janamail എന്നാൽ എന്താണ്?",
                    titleEn: "What is Operation Janamail?",
                    icon: BookOpen,
                    iconColor: "text-blue-600 bg-blue-50 border-blue-100",
                    content: (
                      <div className="space-y-3 text-slate-600 text-xs md:text-sm leading-relaxed font-sans">
                        <p className="font-semibold text-slate-800">
                          ഓരോ പൗരനും അവരുടെ അഭിപ്രായങ്ങളും ആവശ്യങ്ങളും ബന്ധപ്പെട്ട സർക്കാർ അധികാരികളെ മാന്യവും ഉത്തരവാദിത്തപരവുമായി അറിയിക്കാൻ സഹായിക്കുന്ന ഒരു പൊതുപങ്കാളിത്ത ഇ-മെയിൽ ക്യാമ്പയിനാണ് Operation Janamail.
                        </p>
                        <p>
                          ഇതുവഴി സാധാരണക്കാരായ ജനങ്ങൾക്ക് അവരുടെ ആശങ്കകളും ബുദ്ധിമുട്ടുകളും നേരിട്ട് അധികാരികളുടെയും ഉന്നത ഉദ്യോഗസ്ഥരുടെയും മുൻപിലേക്ക് എത്തിക്കാൻ ഒരു സുതാര്യമായ വേദി ഒരുങ്ങുന്നു. ഇത് തികച്ചും സമാധാനപരവും നിയമപരവുമായ ഒരു ആശയവിനിമയ മാർഗ്ഗമാണ്.
                        </p>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2 text-slate-500 text-[11px] md:text-xs">
                          <span className="font-bold text-slate-700 block mb-0.5">English Overview:</span>
                          Operation Janamail is a collaborative public email campaign designed to enable every citizen to convey their views, suggestions, and grievances directly to government officials and key administrative bodies in a highly transparent, dignified, and legal manner.
                        </div>
                      </div>
                    )
                  },
                  {
                    id: 2,
                    titleMl: "എന്തുകൊണ്ടാണ് ഈ ക്യാമ്പയിൻ?",
                    titleEn: "Why this campaign?",
                    icon: Users,
                    iconColor: "text-purple-600 bg-purple-50 border-purple-100",
                    content: (
                      <div className="space-y-3 text-slate-600 text-xs md:text-sm leading-relaxed font-sans">
                        <p className="font-semibold text-slate-800">
                          കേസിന്റെയും അനുബന്ധ കാര്യങ്ങളുടെയും നീണ്ട കാലതാമസം മൂലം പ്രതിസന്ധിയിലായ സാധാരണക്കാരുടെ ജീവനോപാധി സംരക്ഷിക്കുന്നതിന് വേണ്ടിയാണ് ഈ ക്യാമ്പയിൻ.
                        </p>
                        <p>
                          HIGH RICH Online Shoppe എന്ന സ്ഥാപനവുമായി ബന്ധപ്പെട്ട നിയമനടപടികൾ കഴിഞ്ഞ രണ്ടര വർഷത്തിലേറെയായി വിവിധ കോടതികളിൽ തുടരുകയാണ്. നടപടിക്രമങ്ങളിലെ കാലതാമസം കാരണം ഈ സ്ഥാപനവുമായി ബന്ധപ്പെട്ട് ഉപജീവനം കണ്ടെത്തിയിരുന്ന പതിനായിരക്കണക്കിന് സാധാരണ കുടുംബങ്ങളാണ് ഇന്ന് കടുത്ത പ്രതിസന്ധി നേരിടുന്നത്.
                        </p>
                        <p>
                          ലക്ഷക്കണക്കിന് സാധാരണ മനുഷ്യർ കടുത്ത സാമ്പത്തിക ബുദ്ധിമുട്ടുകളിലും കടക്കെണിയിലുമായി കഴിയുമ്പോൾ അവരുടെ നിസ്സഹായാവസ്ഥയും പ്രശ്നങ്ങളും ബന്ധപ്പെട്ട സർക്കാർ വൃത്തങ്ങളിലെയും ഭരണ നേതൃത്വത്തിലെയും അധികാരികൾക്ക് മുന്നിൽ അവതരിപ്പിക്കേണ്ടതുണ്ട്.
                        </p>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2 text-slate-500 text-[11px] md:text-xs">
                          <span className="font-bold text-slate-700 block mb-0.5">English Overview:</span>
                          With legal proceedings in court delayed for over 2.5 years, thousands of families depending on the business are facing extreme livelihood crises. This public effort aims to convey these hardships to key governmental channels and seek expedite support.
                        </div>
                      </div>
                    )
                  },
                  {
                    id: 3,
                    titleMl: "ക്യാമ്പയിന്റെ പ്രധാന ലക്ഷ്യങ്ങൾ",
                    titleEn: "Campaign Objectives",
                    icon: Star,
                    iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
                    content: (
                      <div className="space-y-3.5 text-slate-600 text-xs md:text-sm leading-relaxed font-sans">
                        <p className="font-semibold text-slate-850">
                          കൂട്ടായ ജനശബ്ദത്തിലൂടെ താഴെ പറയുന്ന പ്രധാന ലക്ഷ്യങ്ങളാണ് നാം മുന്നോട്ട് വെക്കുന്നത്:
                        </p>
                        <ul className="space-y-2.5">
                          <li className="flex gap-2.5 items-start">
                            <span className="text-emerald-500 shrink-0 mt-0.5">📍</span>
                            <div>
                              <strong className="text-slate-800 block">ബുദ്ധിമുട്ടുകൾ അധികാരികളിൽ എത്തിക്കുക</strong>
                              കേസിന്റെ തുടർച്ചയായ താമസം കാരണം സാധാരണ ജനങ്ങൾ നേരിടുന്ന യഥാർത്ഥ മാനുഷികവും ജീവകാരുണ്യപരവുമായ പ്രത്യാഘാതങ്ങൾ ഭരിക്കുന്ന നേതൃത്വത്തെ ബോധ്യപ്പെടുത്തുക.
                            </div>
                          </li>
                          <li className="flex gap-2.5 items-start">
                            <span className="text-emerald-500 shrink-0 mt-0.5">📍</span>
                            <div>
                              <strong className="text-slate-800 block">ഭരണപരമായ ശ്രദ്ധയും ദ്രുതപരിഹാരവും ആവശ്യപ്പെടുക</strong>
                              വിഷയത്തിൽ നിയമപരമായ ചട്ടക്കൂടിനുള്ളിൽ നിന്നുകൊണ്ട് ഭരണപരമായ ശ്രദ്ധ ക്ഷണിക്കുകയും കേസുകൾ വേഗത്തിൽ പൂർത്തിയാക്കാൻ അഭ്യർത്ഥിക്കുകയും ചെയ്യുക.
                            </div>
                          </li>
                          <li className="flex gap-2.5 items-start">
                            <span className="text-emerald-500 shrink-0 mt-0.5">📍</span>
                            <div>
                              <strong className="text-slate-800 block">ജീവനോപാധികൾ പുനഃസ്ഥാപിക്കുക</strong>
                              സാധാരണക്കാരായ ലക്ഷക്കണക്കിന് ആളുകളുടെ തൊഴിലും ഉപജീവനവും തിരികെ ലഭിക്കുന്നതിനായി കമ്പനിയുടെ പ്രവർത്തനം സുതാര്യമായി പുനരാരംഭിക്കാൻ ആവശ്യമായ അനുകൂല നടപടികൾ കൈക്കൊള്ളാൻ അഭ്യർത്ഥിക്കുക.
                            </div>
                          </li>
                        </ul>
                      </div>
                    )
                  },
                  {
                    id: 4,
                    titleMl: "പ്രധാന അറിയിപ്പ് & നിർദ്ദേശങ്ങൾ",
                    titleEn: "Important Notice & Guidelines",
                    icon: AlertTriangle,
                    iconColor: "text-amber-600 bg-amber-50 border-amber-100",
                    content: (
                      <div className="space-y-3 text-slate-600 text-xs md:text-sm leading-relaxed font-sans">
                        <p className="font-semibold text-slate-800">
                          ഇമെയിൽ അയയ്ക്കുന്നതിനു മുൻപായി താഴെ പറയുന്ന പ്രധാന നിർദ്ദേശങ്ങൾ ദയവായി ശ്രദ്ധിക്കുക:
                        </p>
                        <ul className="space-y-2.5">
                          <li className="flex gap-2.5 items-start">
                            <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                            <div>
                              <strong className="text-slate-800">മാന്യവും ഭവ്യവുമായ ഭാഷ:</strong> സന്ദേശങ്ങളിൽ വ്യക്തിപരമായ ആക്ഷേപങ്ങളോ, വെല്ലുവിളികളോ, ഭീഷണികളോ പൂർണ്ണമായും ഒഴിവാക്കി ഔദ്യോഗികവും മാന്യവുമായ ഭാഷ മാത്രമേ ഉപയോഗിക്കാവൂ.
                            </div>
                          </li>
                          <li className="flex gap-2.5 items-start">
                            <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                            <div>
                              <strong className="text-slate-800">വിവരങ്ങളുടെ സത്യസന്ധത:</strong> നിങ്ങൾ രേഖപ്പെടുത്തുന്ന ഫോൺ നമ്പറും പേരും പൂർണ്ണമായും സത്യസന്ധവും യാഥാർത്ഥ്യവുമായിരിക്കണം.
                            </div>
                          </li>
                          <li className="flex gap-2.5 items-start">
                            <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                            <div>
                              <strong className="text-slate-800">വ്യക്തിപരമായ ഉത്തരവാദിത്തം:</strong> നിങ്ങൾ അയക്കുന്ന ഇമെയിൽ നിങ്ങളുടെ വ്യക്തിപരമായ താല്പര്യവും സമ്മതവും പ്രകാരമുള്ളതാണ്. ദുരുപയോഗം നിയമപരമായ നടപടികൾക്ക് കാരണമായേക്കാം.
                            </div>
                          </li>
                        </ul>
                        {config?.importantNotice && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] md:text-xs text-slate-500 italic">
                            <strong className="text-slate-700 block not-italic mb-0.5">CMS അഡ്മിൻ അറിയിപ്പ്:</strong>
                            {config.importantNotice}
                          </div>
                        )}
                      </div>
                    )
                  }
                ].map((section) => {
                  const IconComponent = section.icon;
                  const isOpen = openSection === section.id;
                  
                  return (
                    <div
                      key={section.id}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                        isOpen 
                          ? "border-blue-300 shadow-md ring-1 ring-blue-100" 
                          : "border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      {/* Header */}
                      <button
                        onClick={() => setOpenSection(isOpen ? null : section.id)}
                        className="w-full flex items-center justify-between p-4 text-left select-none focus:outline-none cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border shrink-0 ${section.iconColor}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#1a2b5c] text-sm md:text-base leading-tight">
                              {section.titleMl}
                            </h4>
                            <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wide mt-0.5">
                              {section.titleEn}
                            </p>
                          </div>
                        </div>
                        
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </button>

                      {/* Content */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                          >
                            <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/30">
                              <div className="pt-4">
                                {section.content}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Main Sections Stacked Elegantly */}
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        {showBanner && (
          <div className={`border rounded-2xl p-5 flex items-start gap-3 text-left shadow-xs ${
            config?.campaignStatus === "draft" 
              ? "bg-amber-50 border-amber-200" 
              : "bg-red-50 border-red-200"
          }`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
              config?.campaignStatus === "draft" ? "text-amber-600" : "text-red-600 animate-pulse"
            }`} />
            <div className="space-y-1">
              {config?.campaignStatus === "draft" ? (
                <>
                  <h3 className="text-xs font-black text-amber-800 uppercase tracking-tight">
                    ക്യാമ്പയിൻ ഡ്രാഫ്റ്റ് മോഡിലാണ് / DRAFT CAMPAIGN
                  </h3>
                  <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                    ഈ ക്യാമ്പയിൻ ഇപ്പോൾ രൂപകൽപ്പനയിലോ പരീക്ഷണത്തിലോ ആണ്. ഇത് ഇതുവരെ പൂർണ്ണമായും സജീവമായിട്ടില്ല. നിങ്ങൾക്ക് ടെംപ്ലേറ്റുകൾ പരിശോധിക്കാം, പക്ഷെ ഔദ്യോഗികമായി അയക്കാൻ കഴിയില്ല.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xs font-black text-red-800 uppercase tracking-tight">
                    ക്യാമ്പയിൻ പൂർത്തിയായിരിക്കുന്നു / CAMPAIGN COMPLETED
                  </h3>
                  <p className="text-xs text-red-700 leading-relaxed font-semibold">
                    അഡ്മിനിസ്ട്രേറ്റർമാർ ഈ ഇമെയിൽ ക്യാമ്പയിൻ പൂർത്തിയാക്കിയിരിക്കുകയാണ്. പുതിയ ഇമെയിലുകൾ ഇപ്പോൾ സ്വീകരിക്കുന്നില്ല.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Email Editor Section containing the Form with strict order */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/60 overflow-hidden">
          <EmailEditor config={config} />
        </div>

        {/* Clean, low-contrast footer containing T&C and disclaimer */}
        <footer className="pt-8 border-t border-slate-200 text-center space-y-4 text-slate-400 text-xs pb-12">
          {config?.termsAndConditions && (
            <p className="leading-relaxed">
              <b>വ്യവസ്ഥകളും നിബന്ധനകളും:</b> {config.termsAndConditions}
            </p>
          )}
          <p className="leading-relaxed">
            <b>Disclaimer:</b> {config?.disclaimer || "ഈ ക്യാമ്പയിൻ പൊതുജനങ്ങൾക്ക് വിവരങ്ങൾ നൽകുന്നതിനായുള്ളതാണ്. എല്ലാ ഇമെയിലുകളും നിയമപരമായും ഉത്തരവാദിത്തത്തോടെയും മാത്രം ഉപയോഗിക്കണം."}
          </p>
        </footer>

      </div>

      {/* Lightbox / Zoom Overlay */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Operation Janamail Campaign Poster Expanded"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-sm select-none"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full shadow-md transition-colors font-bold text-sm leading-none flex items-center justify-center w-8 h-8"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
