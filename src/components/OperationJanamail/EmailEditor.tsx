import React, { useState, useEffect, useRef } from "react";
import { Mail, Check, Copy, RotateCcw, Send, HelpCircle, Share2, QrCode, ChevronDown, Shield, AlertCircle, Info, Lock, FileText, PenTool, Sparkles, Save, AlertTriangle } from "lucide-react";
import { CampaignTemplate, subscribeToCampaignTemplates, JanamailConfig } from "../../lib/cms";
import { motion } from "motion/react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import QRCode from "qrcode";
import { toast } from "sonner";

const KERALA_DISTRICTS = [
  { code: "KSD", en: "Kasaragod", ml: "കാസർഗോഡ്" },
  { code: "KNR", en: "Kannur", ml: "കണ്ണൂർ" },
  { code: "WYD", en: "Wayanad", ml: "വയനാട്" },
  { code: "KOZ", en: "Kozhikode", ml: "കോഴിക്കോട്" },
  { code: "MLP", en: "Malappuram", ml: "മലപ്പുറം" },
  { code: "PKD", en: "Palakkad", ml: "പാലക്കാട്" },
  { code: "TCR", en: "Thrissur", ml: "തൃശ്ശൂർ" },
  { code: "EKM", en: "Ernakulam", ml: "എറണാകുളം" },
  { code: "IDK", en: "Idukki", ml: "ഇടുക്കി" },
  { code: "KTM", en: "Kottayam", ml: "കോട്ടയം" },
  { code: "ALP", en: "Alappuzha", ml: "ആലപ്പുഴ" },
  { code: "PTA", en: "Pathanamthitta", ml: "പത്തനംതിട്ട" },
  { code: "KLM", en: "Kollam", ml: "കൊല്ലം" },
  { code: "TVM", en: "Thiruvananthapuram", ml: "തിരുവനന്തപുരം" }
];

interface EmailEditorProps {
  config?: JanamailConfig | null;
}

export default function EmailEditor({ config }: EmailEditorProps) {
  const [name, setName] = useState(() => localStorage.getItem("janamail_draft_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("janamail_draft_phone") || "");
  const [district, setDistrict] = useState(() => localStorage.getItem("janamail_draft_district") || "");
  const [place, setPlace] = useState(() => localStorage.getItem("janamail_draft_place") || "");
  const [category, setCategory] = useState(() => localStorage.getItem("janamail_draft_category") || "Highrich Member");
  const [address, setAddress] = useState(() => localStorage.getItem("janamail_draft_address") || "");
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // User Authentication & Participation Tracking States
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasParticipated, setHasParticipated] = useState(false);

  // Auto Save status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const isLoaded = useRef(false);

  // Confirmation Checkbox States (fully dynamic)
  const [checkedIndices, setCheckedIndices] = useState<Record<number, boolean>>({});

  // Guarantee exactly four mandatory checkboxes
  const rawConfirmations = config?.confirmations?.filter(c => c.trim() !== "") || [];
  const activeConfirmations = rawConfirmations.length >= 4
    ? rawConfirmations.slice(0, 4)
    : [
        ...rawConfirmations,
        ...[
          "ഞാൻ നൽകിയിട്ടുള്ള പേര്, വിലാസം, ഫോൺ നമ്പർ എന്നിവ പൂർണ്ണമായും സത്യസന്ധവും കൃത്യവുമാണ് എന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. (I certify that my name, address, and phone number are completely authentic and correct.)",
          "ഈ പൊതു ക്യാമ്പയിനിൽ ഞാൻ തികച്ചും സ്വമേധയാ ആണ് പങ്കെടുക്കുന്നതെന്നും എന്റെ അറിവോടും പൂർണ്ണ സമ്മതത്തോടും കൂടിയാണെന്നും വ്യക്തമാക്കുന്നു. (I confirm that my participation is fully voluntary and with my complete consent.)",
          "ഇമെയിലിൽ ഉൾപ്പെടുത്തിയിരിക്കുന്ന കാര്യങ്ങളിൽ വ്യക്തിപരമായ അധിക്ഷേപങ്ങളോ ദുരുദ്ദേശ്യമോ ഇല്ലെന്ന് ഉറപ്പ് നൽകുന്നു. (I guarantee that the petition content is respectful and free from any personal abuse or malice.)",
          "ഈ ക്യാമ്പയിന്റെ എല്ലാ നിബന്ധനകളും വായിച്ചു മനസ്സിലാക്കി, സന്ദേശത്തിന്റെ പൂർണ്ണ വ്യക്തിപരമായ ഉത്തരവാദിത്തം ഞാൻ ഏറ്റെടുക്കുന്നു. (I accept full individual responsibility for sending this email petition.)"
        ].slice(rawConfirmations.length)
      ];

  const isFullyConfirmed = activeConfirmations.every((_, idx) => checkedIndices[idx]);
  
  // Campaign Templates State
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return localStorage.getItem("janamail_draft_templateId") || "";
  });
  
  const [recipients, setRecipients] = useState(
    "ca.budsact@kerala.gov.in"
  );
  
  const [isCustomized, setIsCustomized] = useState(() => {
    return localStorage.getItem("janamail_draft_isCustomized") === "true";
  });

  const [subject, setSubject] = useState(() => {
    const isCust = localStorage.getItem("janamail_draft_isCustomized") === "true";
    if (isCust) {
      return localStorage.getItem("janamail_draft_subject") || "ഹൈറിച്ച് തട്ടിപ്പ് കേസ്: അടിയന്തര നടപടികളും ഇരകൾക്ക് നീതിയും ആവശ്യപ്പെട്ട് പൊതുജന ഹർജി";
    }
    return "ഹൈറിച്ച് തട്ടിപ്പ് കേസ്: അടിയന്തര നടപടികളും ഇരകൾക്ക് നീതിയും ആവശ്യപ്പെട്ട് പൊതുജന ഹർജി";
  });

  const [body, setBody] = useState(() => {
    const isCust = localStorage.getItem("janamail_draft_isCustomized") === "true";
    if (isCust) {
      return localStorage.getItem("janamail_draft_body") || "";
    }
    return "";
  });

  const [copied, setCopied] = useState(false);
  const [cc, setCc] = useState("");

  const isCampaignActive = config?.active !== false && config?.campaignStatus !== "disabled" && config?.campaignStatus !== "completed";
  const isFormValid = !!(name.trim() && phone.trim() && district.trim() && place.trim() && category.trim());
  const canSubmit = isFullyConfirmed && isCampaignActive && isFormValid && !isSubmitting;

  // Predefined Malayalam petition body template (fallback if DB empty)
  const getTemplateBodyForFallback = () => {
    return `ബഹുമാനപ്പെട്ട കേരള മുഖ്യമന്ത്രിയും ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരും മുൻപാകെ,

വിഷയം: ഹൈറിച്ച് തട്ടിപ്പ് കേസിൽ അടിയന്തരമായ അന്വേഷണവും ഇരകൾക്ക് നീതി ലഭ്യമാക്കലും.

ഞാൻ താഴെ ഒപ്പിട്ടിരിക്കുന്ന വ്യക്തി, ഹൈറിച്ച് ഓൺലൈൻ ഷോപ്പി തട്ടിപ്പിൽ പെട്ട് എന്റെയും എന്റെ കുടുംബത്തിന്റെയും ജീവിതാവസാനിപ്പിക്കേണ്ടി വന്നിരിക്കുന്ന സാഹചര്യത്തെക്കുറിച്ചും അതിൽ അടിയന്തരമായി സർക്കാർ ഇടപെടൽ ആവശ്യപ്പെട്ടും ഈ ഹർജി സമർപ്പിക്കുന്നു.

കൂട്ടായ നിക്ഷേപ തട്ടിപ്പിലൂടെ പതിനായിരക്കണക്കിന് സാധാരണക്കാരായ മനുഷ്യരുടെ അധ്വാനത്തിന്റെ വിയർപ്പും ജീവിതാവശ്യങ്ങൾക്കായി മാറ്റിവെച്ചിരുന്ന പണവും നഷ്ടപ്പെട്ടിരിക്കുകയാണ്. ഈ തട്ടിപ്പ് നമ്മുടെ സമൂഹത്തിൽ വലിയ സാമ്പത്തിക പ്രതിസന്ധിയും മാനസിക ബുദ്ധിമുട്ടുകളും ഉണ്ടാക്കിയിട്ടുണ്ട്.

ആയതിനാൽ ബഹുമാനപ്പെട്ട അധികാരികൾ താഴെ പറയുന്ന ആവശ്യങ്ങളിൽ അടിയന്തരമായി നടപടി സ്വീകരിക്കണമെന്ന് അപേക്ഷിക്കുന്നു:
1. BUDS നിയമപ്രകാരം പ്രതികളുടെ മുഴുവൻ സ്വത്തുക്കളും അടിയന്തരമായി കണ്ടുകെട്ടി ലേലം ചെയ്യുക.
2. ലേലം ചെയ്ത തുക ഇരകളായ നിക്ഷേപകർക്ക് കാലതാമസം കൂടാതെ വിതരണം ചെയ്യുക.
3. ഈ കേസിൽ വിട്ടുവീഴ്ചയില്ലാത്തതും സുതാര്യവുമായ അന്വേഷണം അടിയന്തരമായി പൂർത്തിയാക്കുക.

ഈ ഹർജിയിൽ പങ്കാളിയാകുന്ന എന്റെ വിവരങ്ങൾ താഴെ ചേർക്കുന്നു:

പേര്: {name}
ഫോൺ നമ്പർ: {phone}
സ്ഥലം/വിലാസം: {address}

ഈ വിഷയത്തിൽ താങ്കളുടെ ഭാഗത്ത് നിന്നും അനുകൂലവും അടിയന്തരവുമായ ഇടപെടലുകൾ ഉണ്ടാകുമെന്ന് പ്രതീക്ഷിക്കുന്നു.

വിശ്വസ്തതയോടെ,
{name}`;
  };

  const cleanTemplateBody = (rawBody: string): string => {
    let bodyText = rawBody || "";
    
    const cutoffKeywords = [
      "ഈ ഹർജിയിൽ പങ്കാളിയാകുന്ന എന്റെ വിവരങ്ങൾ",
      "പേര്:",
      "പേര് :",
      "വിശ്വസ്തതയോടെ,",
      "വിശ്വസ്തതയോടെ"
    ];
    
    for (const keyword of cutoffKeywords) {
      const index = bodyText.indexOf(keyword);
      if (index !== -1) {
        bodyText = bodyText.substring(0, index);
      }
    }
    
    return bodyText.trim();
  };

  const getMergedText = (rawText: string, uName: string, uMobile: string, uDistrict: string, uPlace: string, uCategory: string) => {
    let text = rawText || "";
    
    // Explicit Malayalam placeholders
    text = text.replace(/\[പേര്\]/g, uName || "[പേര്]");
    text = text.replace(/\[മൊബൈൽ\]/g, uMobile || "[മൊബൈൽ]");
    text = text.replace(/\[ജില്ല\]/g, uDistrict || "[ജില്ല]");
    text = text.replace(/\[സ്ഥലം\]/g, uPlace || "[സ്ഥലം]");
    text = text.replace(/\[വിഭാഗം\]/g, uCategory || "[വിഭാഗം]");
    text = text.replace(/\[വിഭാഗം\/കാറ്റഗറി\]/g, uCategory || "[വിഭാഗം/കാറ്റഗറി]");

    // System double braces
    text = text.replace(/\{\{FULL_NAME\}\}/g, uName || "[പേര്]");
    text = text.replace(/\{\{MOBILE\}\}/g, uMobile || "[മൊബൈൽ]");
    text = text.replace(/\{\{DISTRICT\}\}/g, uDistrict || "[ജില്ല]");
    text = text.replace(/\{\{PLACE\}\}/g, uPlace || "[സ്ഥലം]");
    text = text.replace(/\{\{CATEGORY\}\}/g, uCategory || "[വിഭാഗം]");
    
    // Fallback old brackets
    text = text.replace(/{name}/g, uName || "[പേര്]");
    text = text.replace(/{phone}/g, uMobile || "[മൊബൈൽ]");
    text = text.replace(/{address}/g, `${uPlace || "[സ്ഥലം]"}, ${uDistrict || "[ജില്ല]"}`);
    text = text.replace(/{category}/g, uCategory || "[വിഭാഗം]");
    return text;
  };

  const stripHeaderAndSignature = (text: string): string => {
    let cleanText = text || "";
    
    // Normalize line endings to \n
    cleanText = cleanText.replace(/\r\n/g, "\n");
    
    // Strip headers line by line from the top if they start with പേര്/മൊബൈൽ/ജില്ല/സ്ഥലം/വിഭാഗം/ഫോൺ നമ്പർ/സ്ഥലം\/വിലാസം
    const lines = cleanText.split("\n");
    while (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (
        firstLine.startsWith("പേര്:") ||
        firstLine.startsWith("പേര് :") ||
        firstLine.startsWith("മൊബൈൽ:") ||
        firstLine.startsWith("മൊബൈൽ :") ||
        firstLine.startsWith("ജില്ല:") ||
        firstLine.startsWith("ജില്ല :") ||
        firstLine.startsWith("സ്ഥലം:") ||
        firstLine.startsWith("സ്ഥലം :") ||
        firstLine.startsWith("വിഭാഗം:") ||
        firstLine.startsWith("വിഭാഗം :") ||
        firstLine.startsWith("ഫോൺ നമ്പർ:") ||
        firstLine.startsWith("സ്ഥലം/വിലാസം:") ||
        firstLine === ""
      ) {
        lines.shift();
      } else {
        break;
      }
    }
    cleanText = lines.join("\n").trim();
    
    // Cut off old/new signature keywords at the bottom
    const cutoffKeywords = [
      "ഈ ഹർജിയിൽ പങ്കാളിയാകുന്ന എന്റെ വിവരങ്ങൾ",
      "വിശ്വസ്തതയോടെ,",
      "വിശ്വസ്തതയോടെ"
    ];
    
    for (const keyword of cutoffKeywords) {
      const index = cleanText.indexOf(keyword);
      if (index !== -1) {
        cleanText = cleanText.substring(0, index);
      }
    }
    
    return cleanText.trim();
  };

  const getFormattedBody = (templateBody: string, userName: string, userPhone: string, userDistrict: string, userPlace: string, userCategory: string) => {
    const cleaned = cleanTemplateBody(templateBody);
    const merged = getMergedText(cleaned, userName, userPhone, userDistrict, userPlace, userCategory);
    
    // Header format
    const header = `പേര്: ${userName || "[പേര്]"}\nമൊബൈൽ: ${userPhone || "[മൊബൈൽ]"}\nജില്ല: ${userDistrict || "[ജില്ല]"}\nസ്ഥലം: ${userPlace || "[സ്ഥലം]"}\nവിഭാഗം: ${userCategory || "[വിഭാഗം]"}\n\n`;
    
    return header + merged;
  };

  const getFinalBodyWithSignature = (baseBody: string, uName: string, uMobile: string, uDistrict: string, uPlace: string, uCategory: string) => {
    // Strip any existing header and signature to avoid duplicate layouts
    const cleanBodyText = stripHeaderAndSignature(baseBody);
    
    // Merge any remaining placeholders inside the body
    const mergedBody = getMergedText(cleanBodyText, uName, uMobile, uDistrict, uPlace, uCategory);
    
    // Re-construct the header
    const header = `പേര്: ${uName || ""}\nമൊബൈൽ: ${uMobile || ""}\nജില്ല: ${uDistrict || ""}\nസ്ഥലം: ${uPlace || ""}\nവിഭാഗം: ${uCategory || ""}\n\n`;
    
    // Re-construct the signature exactly as requested
    const signature = `\n\nവിശ്വസ്തതയോടെ,\n\n${uName || ""}\n${uPlace || ""}`;
    
    return header + mergedBody + signature;
  };

  const [activeComposeMethod, setActiveComposeMethod] = useState<"template" | "custom">(() => {
    const saved = localStorage.getItem("janamail_draft_method");
    return (saved === "template" || saved === "custom") ? saved : "template";
  });

  // Auto Save Effect
  useEffect(() => {
    if (!isLoaded.current) {
      isLoaded.current = true;
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      localStorage.setItem("janamail_draft_name", name);
      localStorage.setItem("janamail_draft_phone", phone);
      localStorage.setItem("janamail_draft_district", district);
      localStorage.setItem("janamail_draft_place", place);
      localStorage.setItem("janamail_draft_category", category);
      localStorage.setItem("janamail_draft_address", address);
      localStorage.setItem("janamail_draft_subject", subject);
      localStorage.setItem("janamail_draft_body", body);
      localStorage.setItem("janamail_draft_method", activeComposeMethod);
      localStorage.setItem("janamail_draft_isCustomized", String(isCustomized));
      localStorage.setItem("janamail_draft_templateId", selectedTemplateId);
      setSaveStatus("saved");
    }, 1000);

    return () => clearTimeout(timer);
  }, [name, phone, district, place, category, address, subject, body, activeComposeMethod, isCustomized, selectedTemplateId]);

  const handleManualSave = () => {
    setSaveStatus("saving");
    localStorage.setItem("janamail_draft_name", name);
    localStorage.setItem("janamail_draft_phone", phone);
    localStorage.setItem("janamail_draft_district", district);
    localStorage.setItem("janamail_draft_place", place);
    localStorage.setItem("janamail_draft_category", category);
    localStorage.setItem("janamail_draft_address", address);
    localStorage.setItem("janamail_draft_subject", subject);
    localStorage.setItem("janamail_draft_body", body);
    localStorage.setItem("janamail_draft_method", activeComposeMethod);
    localStorage.setItem("janamail_draft_isCustomized", String(isCustomized));
    localStorage.setItem("janamail_draft_templateId", selectedTemplateId);
    
    setTimeout(() => {
      setSaveStatus("saved");
    }, 250);
  };

  // Sync recipients and CC when parent config changes
  useEffect(() => {
    setRecipients(config?.recipients || "ca.budsact@kerala.gov.in");
    setCc(config?.cc || "chiefsecy@kerala.gov.in, chiefminister@kerala.gov.in, min.rev@kerala.gov.in, dgp.pol@kerala.gov.in, adgpcb.pol@kerala.gov.in, adgpint.pol@kerala.gov.in, adgplo.pol@kerala.gov.in, digtsrrange.pol@kerala.gov.in");

    if (config) {
      // Sync active compose method based on emailMode selection if appropriate
      if (config.emailMode === "custom") {
        setActiveComposeMethod("custom");
      } else if (config.emailMode === "templates") {
        setActiveComposeMethod("template");
      }
    }
  }, [config]);

  // Subscribe to dynamic Campaign Templates from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToCampaignTemplates((items) => {
      const activeItems = items.filter(t => t.active);
      setTemplates(activeItems);
      
      // Select the first template by default if none selected yet
      if (activeItems.length > 0 && !selectedTemplateId) {
        const first = activeItems[0];
        setSelectedTemplateId(first.id || "");
      }
    });
    return () => unsubscribe();
  }, [selectedTemplateId]);

  // Dynamically update body if the user hasn't manually customized the body textarea (Reference Templates mode)
  useEffect(() => {
    if (activeComposeMethod === "template" && !isCustomized) {
      const activeTemplate = templates.find(t => t.id === selectedTemplateId);
      if (activeTemplate) {
        setSubject(getMergedText(activeTemplate.subject, name, phone, district, place, category));
        setBody(getFormattedBody(activeTemplate.body, name, phone, district, place, category));
      } else {
        setSubject(getMergedText("ഹൈറിച്ച് തട്ടിപ്പ് കേസ്: അടിയന്തര നടപടികളും ഇരകൾക്ക് നീതിയും ആവശ്യപ്പെട്ട് പൊതുജന ഹർജി", name, phone, district, place, category));
        setBody(getFormattedBody(getTemplateBodyForFallback(), name, phone, district, place, category));
      }
    }
  }, [name, phone, district, place, category, selectedTemplateId, templates, isCustomized, activeComposeMethod]);

  // Immunize shared campaign link against 404 router errors using query params
  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?view=janamail`
    : "https://hcrskerala.org/?view=janamail";

  // Listen to Firebase Auth state to track verified HCRS member account
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const uProfile = { uid: fbUser.uid, ...userDoc.data() } as any;
            setCurrentUserProfile(uProfile);
            
            // Prefill name, phone, district, and place if not already entered
            if (!localStorage.getItem("janamail_draft_name") && uProfile.name) {
              setName(uProfile.name);
            }
            if (!localStorage.getItem("janamail_draft_phone") && uProfile.mobile) {
              setPhone(uProfile.mobile);
            }
            if (!localStorage.getItem("janamail_draft_district") && uProfile.district) {
              const matched = KERALA_DISTRICTS.find(
                d => d.code.toUpperCase() === uProfile.district.toUpperCase() || 
                     d.en.toLowerCase() === uProfile.district.toLowerCase() ||
                     d.ml === uProfile.district
              );
              if (matched) {
                setDistrict(matched.ml);
              } else {
                setDistrict(uProfile.district);
              }
            }
            if (!localStorage.getItem("janamail_draft_place") && uProfile.place) {
              setPlace(uProfile.place);
            }
            if (!localStorage.getItem("janamail_draft_address") && uProfile.address) {
              setAddress(uProfile.address);
            }
            if (!localStorage.getItem("janamail_draft_category")) {
              if (uProfile.membership_type === "LIFE_MEMBER" || uProfile.membership_type === "ADHOC_MEMBER" || uProfile.membershipType === "Life") {
                setCategory("HCRS / Highrich Member");
              } else {
                setCategory("Highrich Member");
              }
            }
          } else {
            setCurrentUserProfile(null);
          }

          // Check if user has already participated (local storage or claims collection fallback)
          const isLocalParticipated = localStorage.getItem("janamail_participated") === "true" || localStorage.getItem(`janamail_participated_${fbUser.uid}`) === "true";
          if (isLocalParticipated) {
            setHasParticipated(true);
          } else {
            const partDoc = await getDoc(doc(db, "claims", `janamail_${fbUser.uid}`));
            if (partDoc.exists()) {
              setHasParticipated(true);
            } else {
              setHasParticipated(false);
            }
          }
        } catch (err) {
          console.error("Error loading user participation in EmailEditor:", err);
        }
      } else {
        setCurrentUserProfile(null);
        setHasParticipated(false);
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);



  const handleModeChange = (mode: "template" | "custom") => {
    setActiveComposeMethod(mode);
    if (mode === "custom") {
      setSubject("");
      setBody("");
      setIsCustomized(true);
    } else {
      setIsCustomized(false);
      // Reload current or first template
      const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
      if (activeTemplate) {
        setSelectedTemplateId(activeTemplate.id || "");
        setSubject(getMergedText(activeTemplate.subject, name, phone, district, place, category));
        setBody(getFormattedBody(activeTemplate.body, name, phone, district, place, category));
      } else {
        setSubject(getMergedText("ഹൈറിച്ച് തട്ടിപ്പ് കേസ്: അടിയന്തര നടപടികളും ഇരകൾക്ക് നീതിയും ആവശ്യപ്പെട്ട് പൊതുജന ഹർജി", name, phone, district, place, category));
        setBody(getFormattedBody(getTemplateBodyForFallback(), name, phone, district, place, category));
      }
    }
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    setIsCustomized(true);
  };

  const handleResetTemplate = () => {
    setIsCustomized(false);
    if (activeComposeMethod === "template") {
      const activeTemplate = templates.find(t => t.id === selectedTemplateId);
      if (activeTemplate) {
        setSubject(getMergedText(activeTemplate.subject, name, phone, district, place, category));
        setBody(getFormattedBody(activeTemplate.body, name, phone, district, place, category));
      } else {
        setSubject(getMergedText("ഹൈറിച്ച് തട്ടിപ്പ് കേസ്: അടിയന്തര നടപടികളും ഇരകൾക്ക് നീതിയും ആവശ്യപ്പെട്ട് പൊതുജന ഹർജി", name, phone, district, place, category));
        setBody(getFormattedBody(getTemplateBodyForFallback(), name, phone, district, place, category));
      }
    } else {
      setSubject("");
      setBody("");
    }
  };

  const handleParticipateNow = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, method: "gmail" | "mailto") => {
    e.preventDefault();

    if (!canSubmit) {
      if (!isFormValid) {
        toast.error("ദയവായി എല്ലാ വിവരങ്ങളും നൽകുക. (Please fill all mandatory fields.)");
      } else if (!isFullyConfirmed) {
        toast.error("ദയവായി എല്ലാ ചെക്ക്ബോക്സുകളും ടിക്ക് ചെയ്യുക.");
      }
      return;
    }

    const formatEmailField = (fieldValue: string, encodeEach: boolean): string => {
      const normalized = (fieldValue || "")
        .replace(/;/g, ",")
        .replace(/\s+/g, "");
      const emailList = normalized.split(",").filter(Boolean);
      
      if (encodeEach) {
        // Encode each individual email address but keep commas literal.
        // This is crucial for Gmail web/app URL to avoid HTTP 400 Bad Request while ensuring TO and CC work.
        return emailList.map(email => encodeURIComponent(email)).join(",");
      } else {
        // For standard mailto URLs, we keep commas and emails literal for the TO path section.
        return emailList.join(",");
      }
    };

    const finalSubject = getMergedText(subject, name, phone, district, place, category).trim();
    const finalBody = getFinalBodyWithSignature(body, name, phone, district, place, category).trim();

    // Guard against multiple participation if they somehow bypassed UI checks
    if (currentUserProfile && hasParticipated) {
      toast.error("നിങ്ങൾ ഇതിനകം ഈ ക്യാമ്പയിനിൽ പങ്കെടുത്തിട്ടുണ്ട്.");
      return;
    }

    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    
    let targetUrl = "";
    if (method === "gmail") {
      const params = new URLSearchParams();
      params.set("view", "cm");
      params.set("fs", "1");
      
      const cleanTo = (recipients || "").replace(/;/g, ",").replace(/\s+/g, "");
      params.set("to", cleanTo);
      
      const cleanCc = (cc || "").replace(/;/g, ",").replace(/\s+/g, "");
      if (cleanCc) {
        params.set("cc", cleanCc);
      }
      
      params.set("su", finalSubject);
      params.set("body", finalBody);
      
      targetUrl = `https://mail.google.com/mail/?${params.toString().replace(/\+/g, "%20")}`;
    } else {
      const cleanRecipientsForMailto = formatEmailField(recipients, false);
      const cleanCcForMailto = formatEmailField(cc, false);
      let mailtoUrl = `mailto:${cleanRecipientsForMailto}?`;
      const params: string[] = [];
      if (cleanCcForMailto) {
        params.push(`cc=${encodeURIComponent(cleanCcForMailto)}`);
      }
      params.push(`subject=${encodeURIComponent(finalSubject)}`);
      params.push(`body=${encodeURIComponent(finalBody)}`);
      targetUrl = mailtoUrl + params.join("&");
    }

    setIsSubmitting(true);
    setApiError(null);

    // 1. Record participation state in Google Sheets via Server API (replaces Firestore setDoc)
    const loadingToast = toast.loading("പങ്കാളിത്തം രേഖപ്പെടുത്തുന്നു...");
    try {
      const response = await fetch("/api/janamail/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: name.trim(),
          mobileNumber: phone.trim(),
          district: district.trim(),
          placePost: place.trim(),
          category: category.trim(),
          selectedSubject: finalSubject,
          dateTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          gmailLaunchStatus: `Launched (${method === "gmail" ? "Gmail" : "Standard Mail"})`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save details to Google Sheets.");
      }

      setHasParticipated(true);
      localStorage.setItem("janamail_participated", "true");
      if (currentUserProfile?.uid) {
        localStorage.setItem(`janamail_participated_${currentUserProfile.uid}`, "true");
      }
      toast.success("വിവരങ്ങൾ ഗൂഗിൾ ഷീറ്റിൽ വിജയകരമായി രേഖപ്പെടുത്തിയിരിക്കുന്നു!", { id: loadingToast });
      
      // Enable the button immediately after a successful Google Sheets registration
      setIsSubmitting(false);
      setApiError(null);
    } catch (err: any) {
      console.error("Error saving participant details to Google Sheets:", err);
      const errMsg = err.message || "വിവരങ്ങൾ ഷീറ്റിൽ രേഖപ്പെടുത്താൻ സാധിച്ചില്ല.";
      toast.error(errMsg, { id: loadingToast });
      setApiError(errMsg);
      
      // Ensure the button is enabled and not silently disabled on error
      setIsSubmitting(false);
      // Block Gmail launch and early return on API failure
      return;
    }

    // 2. Open Gmail / Native mail interface safely using location.href as required
    window.location.href = targetUrl;

    // Set submitted state to show Thank You message
    setShowThankYou(true);
  };

  const copyToClipboard = () => {
    const finalBodyText = getFinalBodyWithSignature(body, name, phone, district, place, category);
    navigator.clipboard.writeText(finalBodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  return (
    <section className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-xs">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Section Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
            <Mail className="w-3.5 h-3.5" />
            ഇമെയിൽ അയക്കാം / SEND EMAIL
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight text-center">
            ഹർജി തയാറാക്കുക (Compose Your Petition)
          </h2>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            നിങ്ങളുടെ വിവരങ്ങൾ നൽകി വളരെ എളുപ്പത്തിൽ ഇമെയിൽ തയാറാക്കി അയക്കാം.
          </p>
        </div>

        {/* Auto Save & Draft Control Panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4.5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 shrink-0">
              {saveStatus === "saving" ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </>
              ) : (
                <>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                </>
              )}
            </div>
            
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  {saveStatus === "saving" ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <span className="inline-block animate-spin text-[10px]">🔄</span>
                      Saving...
                    </span>
                  ) : (
                    <span className="text-emerald-700 flex items-center gap-1">
                      Saved ✓
                    </span>
                  )}
                </span>
                <span className="text-[9px] bg-slate-200/60 text-slate-500 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Auto Save Active
                </span>
              </div>
              <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">
                നിങ്ങളുടെ വിവരങ്ങളും കത്തും തത്സമയം സുരക്ഷിതമായി സേവ് ചെയ്യപ്പെടുന്നു. (Draft automatically saved in real-time)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSave}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-4.5 py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-98 transition-all duration-150 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>
        </div>

        {/* Step 1: User Details */}
        <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-2xl">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="flex items-center justify-center bg-blue-600 text-white rounded-full w-5 h-5 text-[9px] font-black">1</span>
            നിങ്ങളുടെ വിവരങ്ങൾ (User Details)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                മുഴുവൻ പേര് / Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
                placeholder="നിങ്ങളുടെ മുഴുവൻ പേര് നൽകുക"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                മൊബൈൽ നമ്പർ / Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
                placeholder="നിങ്ങളുടെ മൊബൈൽ നമ്പർ"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                ജില്ല / District *
              </label>
              <select
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
              >
                <option value="" disabled>ജില്ല തിരഞ്ഞെടുക്കുക (Select District)</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d.code} value={d.ml}>
                    {d.ml} ({d.en})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                സ്ഥലം / പോസ്റ്റ് / Place / Post *
              </label>
              <input
                type="text"
                required
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
                placeholder="സ്ഥലം അല്ലെങ്കിൽ പോസ്റ്റ് ഓഫീസ്"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                വിഭാഗം / Category *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
              >
                <option value="" disabled>വിഭാഗം തിരഞ്ഞെടുക്കുക (Select Category)</option>
                <option value="HCRS / Highrich Member">HCRS / Highrich Member</option>
                <option value="Highrich Member">Highrich Member</option>
              </select>
            </div>
          </div>

          {/* Recipient Information Display */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Primary Recipient (TO)
              </label>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-left">
                <div className="font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Competent Authority</span>
                </div>
                <div className="font-mono text-slate-600 break-all bg-white border border-slate-150 rounded-lg px-2.5 py-1.5 shadow-2xs select-all">
                  {recipients || (config && config.recipients) || "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Copies (CC)
              </label>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-left">
                <div className="font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>ക്യാമ്പയിൻ പകർപ്പ് (Campaign Copies)</span>
                </div>
                <div className="font-mono text-slate-600 break-all bg-white border border-slate-150 rounded-lg px-2.5 py-1.5 shadow-2xs select-all">
                  {cc || (config && config.cc) || "No CC recipients configured"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center my-1 text-slate-300 select-none">
          <span className="text-lg font-bold">↓</span>
        </div>

        {/* Step 2: Email Subject */}
        <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-2xl">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="flex items-center justify-center bg-blue-600 text-white rounded-full w-5 h-5 text-[9px] font-black">2</span>
            വിഷയം (Email Subject)
          </h3>

          {/* Writing Mode Selector Card Grid */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
              ഹർജി തയാറാക്കേണ്ട രീതി / Select Writing Mode *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option 1: Reference Templates */}
              <div
                onClick={() => handleModeChange("template")}
                className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                  activeComposeMethod === "template"
                    ? "bg-blue-50/30 border-blue-600 shadow-sm ring-1 ring-blue-600/10"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                    activeComposeMethod === "template"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10"
                      : "bg-slate-50 text-slate-500 border-slate-100 group-hover:bg-slate-100"
                  }`}>
                    <FileText className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className={`font-extrabold text-sm leading-tight transition-colors ${
                      activeComposeMethod === "template" ? "text-blue-900" : "text-slate-800 group-hover:text-slate-950"
                    }`}>
                      Reference Templates
                    </h4>
                    <p className="text-[10px] font-bold text-blue-600/80 uppercase tracking-wider">
                      റെഫറൻസ് ടെംപ്ലേറ്റുകൾ
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed pt-1">
                      മുൻകൂട്ടി തയാറാക്കിയ ഔദ്യോഗിക വിഷയങ്ങളും ഉള്ളടക്കങ്ങളും നേരിട്ട് ഉപയോഗിക്കാം.
                    </p>
                  </div>
                </div>
                {activeComposeMethod === "template" && (
                  <div className="absolute top-4 right-4 text-blue-600">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Option 2: Write My Own Email */}
              <div
                onClick={() => handleModeChange("custom")}
                className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                  activeComposeMethod === "custom"
                    ? "bg-blue-50/30 border-blue-600 shadow-sm ring-1 ring-blue-600/10"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                    activeComposeMethod === "custom"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10"
                      : "bg-slate-50 text-slate-500 border-slate-100 group-hover:bg-slate-100"
                  }`}>
                    <PenTool className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className={`font-extrabold text-sm leading-tight transition-colors ${
                      activeComposeMethod === "custom" ? "text-blue-900" : "text-slate-800 group-hover:text-slate-950"
                    }`}>
                      Write My Own Email
                    </h4>
                    <p className="text-[10px] font-bold text-blue-600/80 uppercase tracking-wider">
                      സ്വന്തമായി എഴുതാം
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed pt-1">
                      നിങ്ങളുടേതായ വിഷയവും കത്തിന്റെ ഉള്ളടക്കവും പൂർണ്ണമായും സ്വന്തമായി തയാറാക്കാം.
                    </p>
                  </div>
                </div>
                {activeComposeMethod === "custom" && (
                  <div className="absolute top-4 right-4 text-blue-600">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {activeComposeMethod === "template" && (
              <div className="space-y-3">
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Select Email Subject / വിഷയം തിരഞ്ഞെടുക്കുക *
                  </label>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    താഴെ നൽകിയിരിക്കുന്ന വിഷയങ്ങളിൽ നിങ്ങൾക്ക് ഇഷ്ടമുള്ളത് തിരഞ്ഞെടുക്കാം.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {templates.map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTemplateId(t.id || "");
                          setSubject(t.subject);
                          setRecipients(config?.recipients || "ca.budsact@kerala.gov.in");
                          setCc(config?.cc || "chiefsecy@kerala.gov.in, chiefminister@kerala.gov.in, min.rev@kerala.gov.in, dgp.pol@kerala.gov.in, adgpcb.pol@kerala.gov.in, adgpint.pol@kerala.gov.in, adgplo.pol@kerala.gov.in, digtsrrange.pol@kerala.gov.in");
                          setIsCustomized(false);
                        }}
                        className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none text-left ${
                          isSelected
                            ? "bg-blue-50/25 border-blue-600 shadow-sm ring-1 ring-blue-600/15"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected 
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                              : "bg-white border-slate-300 group-hover:border-slate-400"
                          }`}>
                            {isSelected && (
                              <Check className="w-3 h-3 stroke-[3.5] text-white" />
                            )}
                          </div>
                          
                          <div className="space-y-1 pr-4">
                            <h5 className={`font-extrabold text-xs md:text-sm leading-tight transition-colors ${
                              isSelected ? "text-blue-900" : "text-slate-800 group-hover:text-slate-950"
                            }`}>
                              {t.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                              <b>Subject:</b> {t.subject}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {templates.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
                      No active subjects available.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                {activeComposeMethod === "template" ? "വിഷയം / Subject Line Details" : "വിഷയം / Enter Custom Subject *"}
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                readOnly={activeComposeMethod === "template" && config?.writeMyOwnEnabled === false}
                className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium leading-normal text-slate-600 ${
                  activeComposeMethod === "template" && config?.writeMyOwnEnabled === false ? "cursor-not-allowed opacity-80" : ""
                }`}
                placeholder={activeComposeMethod === "template" ? "Email Subject" : "Enter your custom subject line..."}
              />
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center my-1 text-slate-300 select-none">
          <span className="text-lg font-bold">↓</span>
        </div>

        {/* Step 3: Email Body */}
        <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center bg-blue-600 text-white rounded-full w-5 h-5 text-[9px] font-black">3</span>
              കത്തിന്റെ ഉള്ളടക്കം (Email Body)
            </h3>
            
            <div className="flex items-center gap-2">
              {isCustomized && (
                <button
                  onClick={handleResetTemplate}
                  className="text-xs text-red-650 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
              
              <button
                onClick={copyToClipboard}
                className="text-xs text-slate-650 hover:text-slate-850 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative min-h-[350px] flex flex-col bg-white rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all overflow-hidden">
            <textarea
              value={body}
              onChange={handleBodyChange}
              readOnly={activeComposeMethod === "template" && config?.writeMyOwnEnabled === false}
              className={`w-full flex-1 bg-transparent p-5 text-sm font-medium text-slate-700 leading-relaxed focus:outline-none resize-none font-sans min-h-[350px] ${
                activeComposeMethod === "template" && config?.writeMyOwnEnabled === false ? "cursor-not-allowed select-all opacity-80" : ""
              }`}
              placeholder="ഇമെയിലിന്റെ ഉള്ളടക്കം ഇവിടെ കാണാം..."
            />

            {/* Live Personal Signature Block */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 text-left select-none relative group">
              <div className="absolute top-3.5 right-4 flex items-center gap-1.5 text-[9px] font-black text-blue-600 tracking-wider uppercase">
                <Lock className="w-3 h-3" />
                <span>Automatic Signature</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
                കത്തിന്റെ ഒപ്പ് / Signature Preview
              </p>
              <div className="font-sans text-xs font-bold text-slate-700 leading-relaxed bg-white/70 border border-slate-200/60 rounded-xl p-3 shadow-xs space-y-1.5">
                <p className="text-slate-550 font-medium">വിശ്വസ്തതയോടെ,</p>
                <p className="text-slate-800 text-sm">{name || "[പേര്]"}</p>
                <p className="text-slate-700">{place || "[സ്ഥലം]"}</p>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-150 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {activeComposeMethod === "custom" || config?.writeMyOwnEnabled !== false ? (
                <span>📝 നിങ്ങൾക്ക് ആവശ്യമെങ്കിൽ ഈ കത്തിന്റെ ഉള്ളടക്കത്തിൽ മാറ്റങ്ങൾ വരുത്താം.</span>
              ) : (
                <span className="text-red-500 font-extrabold">🔒 ഈ ക്യാമ്പയിന്റെ ഇമെയിൽ ഉള്ളടക്കം തിരുത്തുന്നത് അഡ്മിൻ അനുവദിച്ചിട്ടില്ല.</span>
              )}
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center my-1 text-slate-300 select-none">
          <span className="text-lg font-bold">↓</span>
        </div>

        {/* Step 4: Confirmation */}
        <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center bg-blue-600 text-white rounded-full w-5 h-5 text-[9px] font-black">4</span>
              സ്ഥിരീകരണം (Required Confirmation)
            </h3>
            
            {/* Real-time Counter Badge */}
            {(() => {
              const count = Object.keys(checkedIndices).filter(k => checkedIndices[Number(k)]).length;
              const allChecked = count === activeConfirmations.length;
              return (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-all duration-300 ${
                  allChecked 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${allChecked ? "bg-emerald-600 animate-pulse" : "bg-amber-500 animate-ping"}`} />
                  <span>{count} / {activeConfirmations.length} VERIFIED</span>
                </div>
              );
            })()}
          </div>
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-left shadow-xs space-y-5">
            {/* Dynamic Progress Bar */}
            {(() => {
              const count = Object.keys(checkedIndices).filter(k => checkedIndices[Number(k)]).length;
              const percent = (count / activeConfirmations.length) * 100;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>പുരോഗതി / CERTIFICATION PROGRESS</span>
                    <span className={count === activeConfirmations.length ? "text-emerald-600 font-extrabold" : "text-slate-650"}>
                      {percent}% Completed
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                    <motion.div 
                      className={`h-full transition-all duration-300 ${
                        count === activeConfirmations.length 
                          ? "bg-gradient-to-r from-emerald-500 to-green-600" 
                          : "bg-gradient-to-r from-blue-500 to-indigo-600"
                      }`}
                      animate={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {config?.confirmationSectionDescription && (
              <p className="text-xs text-slate-500 leading-relaxed font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                {config.confirmationSectionDescription}
              </p>
            )}
            
            <div className="grid grid-cols-1 gap-3.5">
              {activeConfirmations.map((text, idx) => {
                const isChecked = !!checkedIndices[idx];
                
                // Human badges and icons for each of the four rules
                const sectionBadges = [
                  { labelMl: "വിവരങ്ങളുടെ കൃത്യത", labelEn: "ACCURACY", color: "bg-blue-50 text-blue-700 border-blue-100", icon: Shield },
                  { labelMl: "സ്വമേധയായുള്ള പങ്കാളിത്തം", labelEn: "VOLUNTARY", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Info },
                  { labelMl: "മാന്യത ഉറപ്പ് നൽകൽ", labelEn: "RESPECTFUL", color: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertCircle },
                  { labelMl: "പൂർണ്ണ ഉത്തരവാദിത്തം", labelEn: "RESPONSIBILITY", color: "bg-teal-50 text-teal-700 border-teal-100", icon: Lock }
                ];
                
                const badge = sectionBadges[idx % sectionBadges.length];
                const IconComponent = badge.icon;

                return (
                  <label 
                    key={idx} 
                    className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none group/card ${
                      isChecked
                        ? "bg-emerald-50/20 border-emerald-500 shadow-sm shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"
                    }`}
                  >
                    {/* Checkbox input overlay */}
                    <div className="flex items-center shrink-0 mt-0.5 relative">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setCheckedIndices(prev => ({ ...prev, [idx]: e.target.checked }))}
                        className="sr-only" // Hide real checkbox and use our custom premium designer component
                      />
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                        isChecked 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                          : "bg-white border-slate-300 group-hover/card:border-slate-400 group-focus/card:border-blue-500"
                      }`}>
                        {isChecked && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${
                          isChecked ? "bg-emerald-100 text-emerald-800 border-emerald-200" : badge.color
                        }`}>
                          {isChecked ? "VERIFIED • സ്ഥിരീകരിച്ചു" : `${badge.labelMl} • ${badge.labelEn}`}
                        </span>
                      </div>
                      
                      <p className={`text-xs md:text-sm font-semibold leading-relaxed transition-colors ${
                        isChecked ? "text-emerald-900" : "text-slate-700 group-hover/card:text-slate-950"
                      }`}>
                        {text}
                      </p>
                    </div>

                    <div className={`p-2 rounded-lg shrink-0 transition-all ${
                      isChecked ? "text-emerald-600 bg-emerald-100/50" : "text-slate-300"
                    }`}>
                      <IconComponent className="w-4 h-4 stroke-[2]" />
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Error/Instruction Message if some are unchecked */}
            {(() => {
              const count = Object.keys(checkedIndices).filter(k => checkedIndices[Number(k)]).length;
              const allChecked = count === activeConfirmations.length;
              if (!allChecked) {
                return (
                  <div className="bg-amber-50/40 border border-amber-200/60 p-3.5 rounded-xl flex items-start gap-2.5 text-amber-850">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5 animate-bounce" />
                    <p className="text-[11px] md:text-xs font-semibold leading-relaxed">
                      തുടരുന്നതിനായി മുകളിലുള്ള 4 നിബന്ധനകളും വായിച്ച് കണ്ട് ടിക്ക് അടയാളപ്പെടുത്തേണ്ടതുണ്ട്. (Please read and check all 4 conditions above to unlock the submission button.)
                    </p>
                  </div>
                );
              }
              return (
                <div className="bg-emerald-50/40 border border-emerald-200/60 p-3.5 rounded-xl flex items-start gap-2.5 text-emerald-800">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="text-[11px] md:text-xs font-semibold leading-relaxed">
                    എല്ലാ നിബന്ധനകളും വിജയകരമായി സ്ഥിരീകരിച്ചിരിക്കുന്നു. താഴെയുള്ള <b>Continue to Gmail</b> ബട്ടൺ ഇപ്പോൾ ഉപയോഗിക്കാവുന്നതാണ്.
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center my-1 text-slate-300 select-none">
          <span className="text-lg font-bold">↓</span>
        </div>

        {/* Step 5: Gmail Button */}
        <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-2xl flex flex-col items-center">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 self-start">
            <span className="flex items-center justify-center bg-blue-600 text-white rounded-full w-5 h-5 text-[9px] font-black">5</span>
            പങ്കെടുക്കുക (Gmail Button)
          </h3>

          {showThankYou ? (
            <div className="w-full bg-emerald-50 rounded-2xl border border-emerald-200 p-5 flex flex-col items-center text-center gap-3 animate-fade-in shadow-xs">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div className="space-y-1 max-w-xl text-center">
                <h4 className="text-sm font-black text-emerald-800 text-center">
                  ഹർജി വിജയകരമായി സമർപ്പിച്ചു! / Petition Drafted Successfully!
                </h4>
                <p className="text-xs md:text-sm text-emerald-700 font-semibold leading-relaxed whitespace-pre-wrap">
                  {config?.thankYouMessage || "ഹർജി വിജയകരമായി സമർപ്പിച്ചു. നന്ദി!"}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5 mt-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const finalSubject = getMergedText(subject, name, phone, district, place, category).trim();
                    const finalBody = getFinalBodyWithSignature(body, name, phone, district, place, category).trim();
                    
                    const params = new URLSearchParams();
                    params.set("view", "cm");
                    params.set("fs", "1");
                    
                    const cleanTo = (recipients || "").replace(/;/g, ",").replace(/\s+/g, "");
                    params.set("to", cleanTo);
                    
                    const cleanCc = (cc || "").replace(/;/g, ",").replace(/\s+/g, "");
                    if (cleanCc) {
                      params.set("cc", cleanCc);
                    }
                    
                    params.set("su", finalSubject);
                    params.set("body", finalBody);
                    
                    const gmailUrl = `https://mail.google.com/mail/?${params.toString().replace(/\+/g, "%20")}`;
                    window.location.href = gmailUrl;
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EA4335] via-[#E2345D] to-[#CF2585] hover:shadow-lg text-white font-extrabold text-[11px] uppercase tracking-wider px-5 py-3 rounded-xl transition duration-150 cursor-pointer shadow-md"
                >
                  <Mail className="w-3.5 h-3.5" />
                  ഇമെയിൽ തുറക്കുക (GO TO MAIL)
                </button>
                <button
                  onClick={() => {
                    setShowThankYou(false);
                    setCheckedIndices({});
                  }}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider px-4 py-3 rounded-xl transition duration-150 cursor-pointer border border-slate-200"
                >
                  <RotateCcw className="w-3 h-3" />
                  മറ്റൊരു ഹർജി (New Petition)
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full text-center space-y-4 pt-2 flex flex-col items-center">
              {checkingAuth ? (
                <div className="flex items-center gap-2 py-4 text-slate-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                  <span className="inline-block animate-spin text-sm">🔄</span>
                  Checking participation status...
                </div>
              ) : currentUserProfile && hasParticipated ? (
                <div className="w-full bg-rose-50 border border-rose-200 p-5 rounded-2xl text-left space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                    <span>പങ്കാളിത്തം തടസ്സപ്പെട്ടിരിക്കുന്നു (Participation Limit Reached)</span>
                  </div>
                  <p className="text-xs md:text-sm text-rose-700 font-extrabold leading-relaxed">
                    നിങ്ങൾ ഇതിനകം ഈ ക്യാമ്പയിനിൽ പങ്കെടുത്തിട്ടുണ്ട്. ഈ അക്കൗണ്ടിൽ നിന്ന് വീണ്ടും ഇമെയിൽ അയയ്ക്കാൻ സാധിക്കില്ല.
                  </p>
                  <p className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">
                    Only one campaign participation is allowed per verified HCRS member account to maintain campaign authenticity.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold max-w-md">
                    മേൽപ്പറഞ്ഞ കാര്യങ്ങൾ സ്ഥിരീകരിച്ച ശേഷം താഴെയുള്ള <b>Go to Mail</b> ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ ജിമെയിലിൽ ഈ കത്തും വിഷയവും തനിയെ ലോഡ് ചെയ്യപ്പെടും.
                  </p>

                  {apiError && (() => {
                    const isSheetsApiDisabled = apiError.includes("sheets.googleapis.com") || apiError.includes("disabled") || apiError.includes("739674403429");
                    const linkRegex = /(https?:\/\/[^\s]+)/g;
                    const matches = apiError.match(linkRegex);
                    const apiLink = matches && matches[0] ? matches[0].replace(/[.,;:()'"\s]+$/, "") : "https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=739674403429";

                    if (isSheetsApiDisabled) {
                      return (
                        <div className="w-full max-w-md bg-amber-50 border border-amber-200 p-5 rounded-2xl text-left space-y-3 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 animate-bounce" />
                            <span>API ആക്ടിവേഷൻ ആവശ്യമാണ് / API ENABLEMENT REQUIRED</span>
                          </div>
                          <p className="text-xs text-amber-950 font-extrabold leading-relaxed">
                            ഗൂഗിൾ ക്ലൗഡ് പ്രോജക്റ്റിൽ Google Sheets API പ്രവർത്തനക്ഷമമാക്കിയിട്ടില്ല. (The Google Sheets API is not enabled in your Google Cloud Project.)
                          </p>
                          <div className="text-[11px] text-amber-800 space-y-1 bg-amber-100/50 p-3 rounded-xl border border-amber-200/50 leading-relaxed font-semibold">
                            <p className="font-extrabold">പരിഹാര മാർഗ്ഗങ്ങൾ (How to Fix):</p>
                            <ol className="list-decimal list-inside space-y-1 text-[10px]">
                              <li>താഴെ നൽകിയിരിക്കുന്ന ലിങ്ക് സന്ദർശിക്കുക.</li>
                              <li>നിങ്ങളുടെ ഗൂഗിൾ അക്കൗണ്ട് ലോഗിൻ ചെയ്ത ശേഷം <b>Enable</b> ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.</li>
                              <li>കുറച്ചു മിനിറ്റുകൾക്ക് ശേഷം പേജ് റീഫ്രഷ് ചെയ്ത് വീണ്ടും ശ്രമിക്കുക.</li>
                            </ol>
                          </div>
                          <a
                            href={apiLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer shadow-md text-center"
                          >
                            <span>Google Sheets API അക്റ്റീവ് ചെയ്യുക</span>
                            <span className="text-xs">🔗</span>
                          </a>
                        </div>
                      );
                    }

                    const isPermissionError = apiError.toLowerCase().includes("permission") || 
                                              apiError.toLowerCase().includes("denied") || 
                                              apiError.toLowerCase().includes("403") || 
                                              apiError.toLowerCase().includes("access");

                    if (isPermissionError) {
                      const serviceAccountEmail = "firebase-adminsdk-fbsvc@hcrs-membership.iam.gserviceaccount.com";
                      return (
                        <div className="w-full max-w-md bg-amber-50 border border-amber-200 p-5 rounded-2xl text-left space-y-3 animate-in fade-in duration-200 shadow-xs">
                          <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                            <Lock className="w-5 h-5 shrink-0 text-amber-600 animate-pulse" />
                            <span>അനുമതി ആവശ്യമാണ് / PERMISSION REQUIRED</span>
                          </div>
                          
                          <p className="text-xs text-amber-950 font-bold leading-relaxed">
                            ഈ ആപ്ലിക്കേഷന്റെ സർവീസ് അക്കൗണ്ടിന് നിങ്ങളുടെ ഗൂഗിൾ ഷീറ്റിലേക്ക് വിവരങ്ങൾ എഴുതാൻ ആവശ്യമായ അനുമതിയില്ല. (The service account does not have edit access to your Google Sheet.)
                          </p>
                          
                          <div className="space-y-2 bg-amber-100/40 p-3.5 rounded-xl border border-amber-200/40 font-semibold text-[11px] text-amber-900 leading-relaxed">
                            <p className="font-extrabold">പരിഹാര മാർഗ്ഗങ്ങൾ (How to Fix):</p>
                            <ol className="list-decimal list-inside space-y-2 text-[10.5px]">
                              <li>താഴെ നൽകിയിരിക്കുന്ന സർവീസ് അക്കൗണ്ട് ഇമെയിൽ കോപ്പി ചെയ്യുക.</li>
                              <li>നിങ്ങളുടെ ഗൂഗിൾ ഷീറ്റ് തുറന്ന് മുകളിൽ വലതുവശത്തുള്ള <b>Share (പങ്കുവെക്കുക)</b> ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.</li>
                              <li>ഈ സർവീസ് അക്കൗണ്ട് ഇമെയിൽ അവിടെ ചേർത്ത് റോൾ <b>Editor</b> ആയി സജ്ജീകരിച്ച് സേവ് ചെയ്യുക.</li>
                            </ol>
                          </div>

                          <div className="flex flex-col gap-1.5 bg-white border border-slate-200 p-3 rounded-xl">
                            <span className="text-[9px] font-black tracking-wider uppercase text-slate-400">സർവീസ് അക്കൗണ്ട് ഇമെയിൽ / Service Account Email</span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-800 select-all break-all leading-normal">
                                {serviceAccountEmail}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(serviceAccountEmail);
                                  toast.success("ഇമെയിൽ കോപ്പി ചെയ്തു! (Service account email copied!)");
                                }}
                                className="flex items-center justify-center p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition shrink-0"
                                title="Copy Email"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="w-full max-w-md bg-rose-50 border border-rose-200 p-4.5 rounded-2xl text-left space-y-1.5 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-600" />
                          <span>രജിസ്ട്രേഷൻ പരാജയപ്പെട്ടു / REGISTRATION FAILED</span>
                        </div>
                        <p className="text-xs text-rose-700 font-extrabold leading-relaxed">
                          {apiError}
                        </p>
                        <p className="text-[10px] text-rose-500 font-semibold leading-normal">
                          ഷീറ്റിൽ വിവരങ്ങൾ രേഖപ്പെടുത്താൻ സാധിച്ചില്ല. ദയവായി ഈ പിശക് പരിശോധിക്കുകയോ വീണ്ടും ശ്രമിക്കുകയോ ചെയ്യുക. (Google Sheets saving failed. Please inspect this error or try again.)
                        </p>
                      </div>
                    );
                  })()}

                  <div className="relative w-full max-w-md group">
                    {canSubmit && (
                      <>
                        {/* Deep ambient premium glow */}
                        <motion.div
                          className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-[#EA4335] via-[#E2345D] to-[#CF2585] opacity-30 blur-2xl pointer-events-none"
                          animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.2, 0.45, 0.2],
                          }}
                          transition={{
                            duration: 4.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        {/* Soft second-layer glow */}
                        <motion.div
                          className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#EA4335] via-[#E2345D] to-[#CF2585] opacity-40 blur-lg pointer-events-none"
                          animate={{
                            scale: [1, 1.025, 1],
                            opacity: [0.35, 0.65, 0.35],
                          }}
                          transition={{
                            duration: 3.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        {/* Premium LED border glow layer */}
                        <motion.div
                          className="absolute inset-0 rounded-2xl border border-transparent pointer-events-none z-10"
                          animate={{
                            borderColor: [
                              "rgba(234, 67, 53, 0.3)",
                              "rgba(226, 52, 93, 0.75)",
                              "rgba(207, 37, 133, 0.3)"
                            ],
                            boxShadow: [
                              "inset 0 0 6px rgba(234, 67, 53, 0.15)",
                              "inset 0 0 12px rgba(226, 52, 93, 0.45)",
                              "inset 0 0 6px rgba(207, 37, 133, 0.15)"
                            ]
                          }}
                          transition={{
                            duration: 3.8,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </>
                    )}
                    
                    <motion.button
                      onClick={(e) => handleParticipateNow(e, "gmail")}
                      disabled={!canSubmit}
                      className={`relative w-full flex items-center justify-center gap-3 font-black text-sm md:text-base uppercase tracking-wider px-6 py-4.5 rounded-2xl shadow-md border border-transparent transition-all duration-300 ${
                        canSubmit
                          ? "bg-gradient-to-r from-[#EA4335] via-[#E2345D] to-[#CF2585] text-white hover:shadow-lg cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                      }`}
                      whileHover={canSubmit ? { scale: 1.015, y: -1 } : {}}
                      whileTap={canSubmit ? { scale: 0.98, y: 0 } : {}}
                      animate={canSubmit ? {
                        scale: [1, 1.012, 1],
                      } : {}}
                      transition={canSubmit ? {
                        scale: {
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                      } : {}}
                    >
                      <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                        {isSubmitting ? (
                          <span className="inline-block animate-spin text-sm text-[#EA4335]">🔄</span>
                        ) : (
                          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2005/00/svg">
                            <path d="M20 4H18V13.5L12 18L6 13.5V4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H6V10.5L12 15L18 10.5V20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#EA4335" />
                            <path d="M4 20H6V10.5L2 7.5V18C2 19.1 2.9 20 4 20Z" fill="#4285F4" />
                            <path d="M20 20H18V10.5L22 7.5V18C22 19.1 21.1 20 20 20Z" fill="#34A853" />
                            <path d="M18 4H16.5V10.5L12 13.5L7.5 10.5V4H6V10.5L12 15L18 10.5V4Z" fill="#FBBC05" />
                          </svg>
                        )}
                      </div>
                      <span className="font-extrabold tracking-wider">
                        {isSubmitting ? "പങ്കാളിത്തം രേഖപ്പെടുത്തുന്നു..." : "Go to Mail"}
                      </span>
                    </motion.button>
                  </div>

                  {!isCampaignActive && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      ⚠️ ക്യാമ്പയിൻ നിലവിൽ നിർത്തലാക്കിയിരിക്കുകയാണ് (Campaign is currently inactive).
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    ⚠️ <b>മുന്നറിയിപ്പ്:</b> ഇമെയിൽ തനിയെ അയക്കപ്പെടില്ല. ജിമെയിലിൽ പോയ ശേഷം നിങ്ങൾക്ക് പരിശോധിച്ചു അയക്കാം.
                  </p>
                </>
              )}
            </div>
          )}
        </div>



      </div>
    </section>
  );
}
