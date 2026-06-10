import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type Language = 'ml' | 'en' | 'hi';

export interface TranslationDictionary {
  [key: string]: {
    ml: string;
    en: string;
    hi: string;
  };
}

// Preloaded human-quality translations for instant load time
export const staticTranslations: TranslationDictionary = {
  // Navigation
  "nav_home": {
    ml: "ഹോം",
    en: "Home",
    hi: "होम"
  },
  "nav_archives": {
    ml: "ആർക്കൈവ്സ്",
    en: "Archives",
    hi: "अभिलेखागार"
  },
  "nav_contact": {
    ml: "ബന്ധപ്പെടുക",
    en: "Contact",
    hi: "संपर्क करें"
  },
  "nav_sign_in": {
    ml: "ലോഗിൻ",
    en: "Sign In",
    hi: "लॉग इन"
  },
  "nav_get_id_card": {
    ml: "ഐഡി കാർഡ്",
    en: "Get ID Card",
    hi: "आईडी कार्ड प्राप्त करें"
  },
  "nav_sign_out": {
    ml: "ലോഗൗട്ട്",
    en: "Sign Out",
    hi: "लॉग आउट"
  },
  "nav_dashboard": {
    ml: "ഡാഷ്‌ബോർഡ്",
    en: "Dashboard",
    hi: "डैशबोर्ड"
  },
  "nav_panel": {
    ml: "നിയന്ത്രണ പാനൽ",
    en: "Admin Control",
    hi: "प्रशासन नियंत्रण"
  },

  // Hero Section
  "hero_reg_badge": {
    ml: "ഗവൺമെന്റ് രജിസ്റ്റർ ചെയ്ത സൊസൈറ്റി • രജിസ്ട്രേഷൻ നമ്പർ: TSR/TC/93/2025",
    en: "Govt. Registered Society • Reg No: TSR/TC/93/2025",
    hi: "सरकारी पंजीकृत सोसाइटी • पंजीकरण संख्या: TSR/TC/93/2025"
  },
  "hero_title_1": {
    ml: "ഹൈറിച്ച് കമ്മ്യൂണിറ്റി",
    en: "HIGHRICH COMMUNITY",
    hi: "हाईरिच कम्युनिटी"
  },
  "hero_title_2": {
    ml: "റിവൈവൽ സൊസൈറ്റി",
    en: "REVIVAL SOCIETY",
    hi: "रिवाइवल सोसाइटी"
  },
  "hero_subtitle": {
    ml: "ഹൈറിച്ച് ഓൺലൈൻ ഷോപ്പിയുടെ പ്രവർത്തനം തടസ്സപ്പെട്ടതിനെ തുടർന്ന് പ്രയാസമനുഭവിക്കുന്ന മെമ്പർമാരെ പുനരുജ്ജീവിപ്പിക്കുന്നതിനും പിന്തുണയ്ക്കുന്നതിനുമായി ഔദ്യോഗികമായി രൂപീകരിച്ച രജിസ്റ്റർ ചെയ്ത സൊസൈറ്റി.",
    en: "A legally registered society formed in 2025 to support, guide, and protect members affected by the disruption of Highrich Online Shoppe.",
    hi: "हाईरिच ऑनलाइन शॉपी के बाधित होने से प्रभावित सदस्यों की सहायता, मार्गदर्शन और सुरक्षा के लिए 2025 में स्थापित एक कानूनी रूप से पंजीकृत सोसाइटी।"
  },
  "hero_core_pillars": {
    ml: "പ്രധാന ലക്ഷ്യങ്ങൾ",
    en: "Our Core Pillars",
    hi: "हमारे मुख्य आधार"
  },

  // Core Pillars
  "pillar_community_title": {
    ml: "കമ്മ്യൂണിറ്റി ബന്ധങ്ങൾ",
    en: "Community Welfare",
    hi: "सामुदायिक कल्याण"
  },
  "pillar_community_desc": {
    ml: "മെമ്പർമാർക്കിടയിൽ പരസ്പര ഐക്യവും ശക്തമായ ആശയവിനിമയ സംവിധാനങ്ങളും വളർത്തിയെടുക്കുക.",
    en: "Fostering kinship, solidarity, and robust communication networks among all registered members.",
    hi: "सभी पंजीकृत सदस्यों के बीच भाईचारा, एकजुटता और मजबूत संचार नेटवर्क को बढ़ावा देना।"
  },
  "pillar_revival_title": {
    ml: "പുനരുജ്ജീവനം",
    en: "Revival Efforts",
    hi: "पुनरुद्धार प्रयास"
  },
  "pillar_revival_desc": {
    ml: "മെമ്പർമാരുടെ നഷ്ടപ്പെട്ട ആത്മവിശ്വാസം വീണ്ടെടുക്കാനും അവരുടെ സാമ്പത്തിക പുനർനിർമ്മാണത്തിന് സഹായിക്കാനും വഴികളൊരുക്കുക.",
    en: "Rebuilding community confidence, outlining dynamic revival strategies, and restoring legal clarity.",
    hi: "सामुदायिक विश्वास का पुनर्निर्माण करना, गतिशील पुनरुद्धार रणनीतियों की रूपरेखा तैयार करना और कानूनी स्पष्टता बहाल करना।"
  },
  "pillar_support_title": {
    ml: "സഹായ പദ്ധതികൾ",
    en: "Medical & Social Support",
    hi: "चिकित्सा और सामाजिक सहायता"
  },
  "pillar_support_desc": {
    ml: "അർഹരായ മെമ്പർമാർക്കായി മെഡിക്കൽ സഹായം, വിദ്യാഭ്യാസ പിന്തുണ, മറ്റ് സാമൂഹിക ക്ഷേമ പ്രവർത്തനങ്ങൾ എന്നിവ നൽകുക.",
    en: "Active social welfare initiatives, essential educational support, and continuous medical aid guidance.",
    hi: "सक्रिय सामाजिक कल्याण पहल, आवश्यक शैक्षिक सहायता और निरंतर चिकित्सा सहायता मार्गदर्शन।"
  },
  "pillar_legal_title": {
    ml: "നിയമ സംരക്ഷണം",
    en: "Legal Assistance",
    hi: "कानूनी सहायता"
  },
  "pillar_legal_desc": {
    ml: "മെമ്പർമാരുടെ നിയമപരമായ താല്പര്യങ്ങൾ സംരക്ഷിക്കുന്നതിനായി ആവശ്യമായ നിയമസഹായങ്ങളും ഉപദേശങ്ങളും നൽകുക.",
    en: "Providing lawful help mechanisms, structured representation, and protecting member interests in forums.",
    hi: "कानूनी सहायता तंत्र, संरचित प्रतिनिधित्व प्रदान करना और मंचों में सदस्यों के हितों की रक्षा करना।"
  },

  // News & Updates Section
  "updates_title": {
    ml: "പ്രധാന വാർത്തകളും അപ്ഡേറ്റുകളും",
    en: "Important News & Updates",
    hi: "महत्वपूर्ण समाचार और अपडेट"
  },
  "announcement_header": {
    ml: "ഇന്നത്തെ ഒഫീഷ്യൽ അപ്ഡേഷൻ",
    en: "Today's Official Update",
    hi: "आज का आधिकारिक अपडेट"
  },

  // Website Navigation Instruction
  "navigation_title": {
    ml: "രജിസ്റ്റർ ചെയ്യേണ്ട രൂപം (വഴി)",
    en: "How to Navigate & Register",
    hi: "नेविगेट और पंजीकरण कैसे करें"
  },
  "navigation_step_1": {
    ml: "വെബ്സൈറ്റ് ഹോം പേജ് സന്ദർശിക്കുക (www.hcrs.in)",
    en: "Visit Homepage (www.hcrs.in)",
    hi: "होमपेज पर जाएं (www.hcrs.in)"
  },
  "navigation_step_2": {
    ml: "മെമ്പർഷിപ്പ് രജിസ്ട്രേഷൻ ഫോം തുറക്കുക",
    en: "Open Membership Registration",
    hi: "सदस्यता पंजीकरण खोलें"
  },
  "navigation_step_3": {
    ml: "ആവശ്യമായ വിവരങ്ങൾ കൃത്യമായി പൂരിപ്പിക്കുക",
    en: "Fill in the required information correctly",
    hi: "आवश्यक जानकारी सही-सही भरें"
  },
  "navigation_step_4": {
    ml: "ക്യുആർ കോഡ് സ്കാൻ ചെയ്ത് പേയ്മെന്റ് നടത്തുക",
    en: "Scan QR Code and make the payment",
    hi: "क्यूआर कोड स्कैन करें और भुगतान करें"
  },
  "navigation_step_5": {
    ml: "ട്രാന്സാക്ഷൻ ഐഡിയും തീയതിയും രേഖപ്പെടുത്തി സബ്മിറ്റ് ചെയ്യുക",
    en: "Enter transaction ID, date/time and submit",
    hi: "लेनदेन आईडी, दिनांक/समय दर्ज करें और जमा करें"
  },

  // Frequently Asked Questions
  "faq_section_title": {
    ml: "പതിവായി ചോദിക്കുന്ന ചോദ്യങ്ങൾ (FAQ)",
    en: "Frequently Asked Questions (FAQ)",
    hi: "अक्सर पूछे जाने वाले प्रश्न (FAQ)"
  },
  "faq_q1": {
    ml: "എന്താണ് എച്ച്.സി.ആർ.എസ് (HCRS)?",
    en: "What is HCRS?",
    hi: "एचसीआरएस (HCRS) क्या है?"
  },
  "faq_a1": {
    ml: "ഹൈറിക്ക് കമ്മ്യൂണിറ്റിയുടെ ക്ഷേമത്തിനും പുനരുജ്ജീവനത്തിനും വേണ്ടിയും കൂടുതൽ നിയമപരമായ ഏകോപനത്തിന് വേണ്ടിയും പ്രവർത്തിക്കുന്ന കേരളത്തിൽ രജിസ്റ്റർ ചെയ്ത ഒരു നോൺ-പ്രോഫിറ്റ് സൊസൈറ്റിയാണ് HCRS.",
    en: "HCRS (Highrich Community Revival Society) is a registered non-profit society working for the welfare, support, legal coordination, and revival efforts of the Highrich community.",
    hi: "एचसीआरएस (हाईरिच कम्युनिटी रिवाइवल सोसाइटी) एक पंजीकृत गैर-लाभकारी संस्था है जो हाईरिच समुदाय के कल्याण, समर्थन, कानूनी समन्वय और पुनरुद्धार प्रयासों के लिए काम कर रही है।"
  },
  "faq_q2": {
    ml: "സൊസൈറ്റിയുടെ പ്രധാന ലക്ഷ്യങ്ങൾ എന്തൊക്കെയാണ്?",
    en: "What is the purpose of HCRS?",
    hi: "एचसीआरएस का उद्देश्य क्या है?"
  },
  "faq_a2": {
    ml: "മെമ്പർമാരുടെ താല്പര്യങ്ങൾ സംരക്ഷിക്കുക, സാമൂഹികവും മെഡിക്കലും വിദ്യാഭ്യാസപരവുമായ സഹായങ്ങൾ നൽകുക, പ്രയാസമനുഭവിക്കുന്ന കുടുംബങ്ങളെ പുനരുജ്ജീവിപ്പിക്കാൻ സഹായിക്കുക എന്നിവയാണ് ലക്ഷ്യം.",
    en: "The Society works for welfare activities, legal assistance, community support, medical assistance, educational assistance, revival initiatives, and protecting the interests of members.",
    hi: "सोसाइटी कल्याणकारी गतिविधियों, कानूनी सहायता, सामुदायिक समर्थन, चिकित्सा सहायता, शैक्षिक सहायता, पुनरुद्धार पहलों और सदस्यों के हितों की रक्षा के लिए काम करती है।"
  },
  "faq_q3": {
    ml: "കേസ് ഇപ്പോൾ ഏത് കോടതിയിലാണ്PENDING ആയിരിക്കുന്നത്?",
    en: "Which court is handling the case?",
    hi: "मामले की सुनवाई किस अदालत में हो रही है?"
  },
  "faq_a3": {
    ml: "കേസ് സംബന്ധമായ കാര്യങ്ങൾ നിലവിൽ യോഗ്യതയുള്ള കോടതികളിലും നിയമ അധികാരികളുടെയും മുന്നിലാണ്. ഔദ്യോഗികമായ പുതിയ വിവരങ്ങൾ വെബ്‌സൈറ്റിലെ ഹോം പേജിൽ സമയാസമയങ്ങളിൽ പ്രസിദ്ധീകരിക്കുന്നതായിരിക്കും.",
    en: "The matter is presently before the appropriate courts and legal authorities. Members should refer to official updates published on the HCRS website for the latest status.",
    hi: "यह मामला वर्तमान में संबंधित अदालतों और कानूनी अधिकारियों के समक्ष है। नवीनतम स्थिति के लिए सदस्यों को एचसीआरएस वेबसाइट पर प्रकाशित आधिकारिक अपडेट देखना चाहिए।"
  },

  // Contact Us Section
  "contact_us_title": {
    ml: "ബന്ധപ്പെടുക",
    en: "Contact Us",
    hi: "संपर्क करें"
  },
  "contact_office_title": {
    ml: "രജിസ്റ്റേർഡ് ഓഫീസ് വിലാസം",
    en: "Registered Head Office",
    hi: "पंजीकृत मुख्य कार्यालय"
  },
  "contact_district_title": {
    ml: "ജില്ലാ കമ്മിറ്റികൾ",
    en: "District Committees",
    hi: "जिला समितियां"
  },
  "contact_mandal_title": {
    ml: "മണ്ഡലം കമ്മിറ്റികൾ",
    en: "Mandalam Committees",
    hi: "मंडल समितियां"
  },

  // Login Form
  "login_title": {
    ml: "അക്കൗണ്ട് ലോഗിൻ",
    en: "Account Login",
    hi: "खाता लॉगिन"
  },
  "login_subtitle": {
    ml: "മൊബൈൽ നമ്പറും പാസ്‌വേഡും നൽകി നിങ്ങളുടെ ഡാഷ്‌ബോർഡിലേക്ക് പ്രവേശിക്കുക.",
    en: "Enter your registered mobile number and password to access your dashboard.",
    hi: "अपने डैशबोर्ड तक पहुंचने के लिए अपना पंजीकृत मोबाइल नंबर और पासवर्ड दर्ज करें।"
  },
  "login_btn": {
    ml: "ലോഗിൻ ചെയ്യുക",
    en: "Log In",
    hi: "लॉग इन करें"
  },
  "login_verify_success": {
    ml: "ലോഗിൻ വിജയിച്ചു. ഡാഷ്‌ബോർഡ് ദയവായി പരിശോധിക്കുക.",
    en: "Login successful. Redirecting to dashboard.",
    hi: "लॉगिन सफल। डैशबोर्ड पर रीडायरेक्ट किया जा रहा है।"
  },
  "login_error_invalid": {
    ml: "നൽകിയ വിവരങ്ങൾ തെറ്റാണ്. ദയവായി വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ അഡ്മിനെ ബന്ധപ്പെടുക.",
    en: "Invalid mobile number or password. Please try again or contact Admin.",
    hi: "अमान्य मोबाइल नंबर या पासवर्ड। कृपया पुनः प्रयास करें या एडमिन से संपर्क करें।"
  },

  // Financial Registry / Claim Form
  "claim_registry_title": {
    ml: "സാമ്പത്തിക വിവര ശേഖരണ രജിസ്ട്രി (Financial Information Registry)",
    en: "Financial Information Registry",
    hi: "वित्तीय सूचना रजिस्ट्री"
  },
  "claim_registry_subtitle": {
    ml: "സൊസൈറ്റി ഭാവിയിലുള്ള ക്ഷേമ പദ്ധതികൾ ആസൂത്രണം ചെയ്യുന്നതിനും മുൻഗണനാ വിഭാഗങ്ങളെ കണ്ടെത്തുന്നതിനുമായി വിവരങ്ങൾ ശേഖരിക്കുന്നു.",
    en: "We collect financial configuration details for strategic planning, prioritizing distressed families, and community welfare database management.",
    hi: "हम रणनीतिक योजना, संकटग्रस्त परिवारों को प्राथमिकता देने और सामुदायिक कल्याण डेटाबेस प्रबंधन के लिए वित्तीय विवरण एकत्र करते हैं।"
  },
  "claim_purpose_title": {
    ml: "എന്തിനാണ് ഈ വിവരങ്ങൾ ശേഖരിക്കുന്നത്?",
    en: "Why is this information collected?",
    hi: "यह जानकारी क्यों एकत्र की जाती है?"
  },
  "claim_purpose_1": {
    ml: "അംഗങ്ങളുടെ യഥാർത്ഥ ആവശ്യങ്ങളും പ്രയാസങ്ങളും മനസ്സിലാക്കാൻ.",
    en: "To deeply understand member requirements and support options.",
    hi: "सदस्य की आवश्यकताओं और सहायता विकल्पों को गहराई से समझना।"
  },
  "claim_purpose_2": {
    ml: "അങ്ങേയറ്റം സാമ്പത്തിക ബുദ്ധിമുട്ട് അനുഭവിക്കുന്ന കുടുംബങ്ങളെ മുൻഗണനാ ക്രമത്തിൽ സഹായിക്കാൻ.",
    en: "To identify and prioritize highly distressed and economically backward families.",
    hi: "अत्यधिक संकटग्रस्त और आर्थिक रूप से पिछड़े परिवारों की पहचान करना और उन्हें प्राथमिकता देना।"
  },
  "claim_purpose_3": {
    ml: "ഭാവിയിലെ പുനരുദ്ധാരണ പ്രവർത്തനങ്ങൾ കൃത്യതയോടെ മുൻകൂട്ടി പ്ലാൻ ചെയ്യാൻ.",
    en: "To prepare reliable data for future revival planning and state support.",
    hi: "भविष्य के पुनरुद्धार नियोजन और राज्य सहायता के लिए विश्वसनीय डेटा तैयार करना।"
  },
  "claim_legal_warning": {
    ml: "ശ്രദ്ധിക്കുക: ഈ ഫോം കമ്പനിക്കെതിരെയുള്ള ഒരു നിയമപരമായ പരാതിയോ ക്ലൈമോ അല്ല. മെമ്പർമാരുടെ ക്ഷേമത്തിനായി സൊസൈറ്റി നേരിട്ട് തയ്യാറാക്കുന്ന വിവരശേഖരണം മാത്രമാണ്.",
    en: "Please note: This financial form is not a direct legal claim against the company. It is strictly an internal community data registry for planning and prioritizing member needs.",
    hi: "कृपया ध्यान दें: यह वित्तीय प्रपत्र कंपनी के खिलाफ सीधा कानूनी दावा नहीं है। यह केवल सदस्य की जरूरतों की योजना बनाने और प्राथमिकता देने के लिए एक आंतरिक सामुदायिक डेटा रजिस्ट्री है।"
  },
  "claim_submit_success": {
    ml: "സാമ്പത്തിക വിവരങ്ങൾ വിജയകരമായി രജിസ്റ്റർ ചെയ്തു.",
    en: "Financial details registered and recorded successfully.",
    hi: "वित्तीय विवरण सफलतापूर्वक पंजीकृत और रिकॉर्ड किए गए।"
  },

  // Registration form labels
  "label_name": {
    ml: "മുഴുവൻ പേര്",
    en: "Full Name",
    hi: "पूरा नाम"
  },
  "label_mobile": {
    ml: "മൊബൈൽ നമ്പർ",
    en: "Mobile Number",
    hi: "मोबाइल नंबर"
  },
  "label_district": {
    ml: "ജില്ല",
    en: "District",
    hi: "ज़िला"
  },
  "label_mandalam": {
    ml: "നിയമസഭാ മണ്ഡലം",
    en: "Assembly Constituency (Mandalam)",
    hi: "विधानसभा क्षेत्र (मंडल)"
  },
  "label_membership_fee": {
    ml: "മെമ്പർഷിപ്പ് ഫീസ്: ₹200",
    en: "Membership Fee: ₹200",
    hi: "सदस्यता शुल्क: ₹200"
  },
  "label_annual_renewal_fee": {
    ml: "വാർഷിക പുതുക്കൽ ഫീസ്: ₹100",
    en: "Annual Renewal Fee: ₹100",
    hi: "वार्षिक नवीनीकरण शुल्क: ₹100"
  },
  "label_payment_proof": {
    ml: "പെയ്മെന്റ് നടത്തിയ സ്ക്രീൻഷോട്ട്",
    en: "Upload Payment Screenshot",
    hi: "भुगतान स्क्रीनशॉट अपलोड करें"
  },
  "label_transaction_id": {
    ml: "യുപിഐ/ബാങ്ക് ട്രാൻസാക്ഷൻ ഐഡി (Transaction ID)",
    en: "UPI/Bank Transaction ID",
    hi: "यूपीआई/बैंक लेनदेन आईडी"
  },
  "label_date_time": {
    ml: "പെയ്മെന്റ് നടത്തിയ തീയതിയും സമയവും",
    en: "Payment Date and Time",
    hi: "भुगतान की तारीख और समय"
  },
  "label_submit_app": {
    ml: "അപേക്ഷ സമർപ്പിക്കുക",
    en: "Submit Application",
    hi: "आवेदन जमा करें"
  },

  // Dashboard Messages
  "dashboard_welcome": {
    ml: "എച്ച്.സി.ആർ.എസ് സൊസൈറ്റി ഡാഷ്‌ബോർഡിലേക്ക് സ്വാഗതം!",
    en: "Welcome to your HCRS Society Dashboard!",
    hi: "एचसीआरएस सोसाइटी डैशबोर्ड पर आपका स्वागत है!"
  },
  "dashboard_status_label": {
    ml: "അക്കൗണ്ട് സ്റ്റാറ്റസ്",
    en: "Account Status",
    hi: "खाता स्थिति"
  },
  "dashboard_id_card": {
    ml: "ഡിജിറ്റൽ മെമ്പർഷിപ്പ് കാർഡ്",
    en: "Digital Membership Card",
    hi: "डिजिटल सदस्यता कार्ड"
  },
  "dashboard_download_pdf": {
    ml: "പിഡിഎഫ് ഡൗൺലോഡ് ചെയ്യുക",
    en: "Download Card PDF",
    hi: "कार्ड पीडीएफ डाउनलोड करें"
  },
  "dashboard_renew_now": {
    ml: "മെമ്പർഷിപ്പ് പുതുക്കുക (Renew Now)",
    en: "Renew Membership",
    hi: "सदस्यता का नवीनीकरण करें"
  },
  "dashboard_welfare_activities": {
    ml: "ക്ഷേമ പ്രവർത്തനങ്ങൾ",
    en: "Welfare & Revival Benefits",
    hi: "कल्याण और पुनरुद्धार लाभ"
  },

  // Admin section
  "admin_title": {
    ml: "സൊസൈറ്റി അഡ്മിൻ പാനൽ",
    en: "Society Admin Dashboard",
    hi: "सोसाइटी एडमिन डैशबोर्ड"
  },
  "admin_language_manager": {
    ml: "ഭാഷാ മാനേജർ (Language Manager)",
    en: "Language Manager",
    hi: "भाषा प्रबंधक"
  },
  "admin_edit_translations": {
    ml: "വെബ്സൈറ്റ് വാക്കുകൾ തിരുത്തുക",
    en: "Edit Website Translations",
    hi: "वेबसाइट अनुवाद संपादित करें"
  },
  "admin_save_changes": {
    ml: "മാറ്റങ്ങൾ ഫയർസ്റ്റോറിലേക്ക് സേവ് ചെയ്യുക",
    en: "Save Changes to Firestore",
    hi: "फायरस्टोर में परिवर्तन सहेजें"
  },
  "admin_reset_defaults": {
    ml: "ആദ്യത്തെ സ്ഥിരവിവരങ്ങൾ റീസെറ്റ് ചെയ്യുക",
    en: "Reset to Default static Translations",
    hi: "डिफ़ॉल्ट अनुवाद रीसेट करें"
  },
  
  // Custom chatbot notification
  "chat_handoff_message": {
    ml: "പ്രിയ സുഹൃത്തേ, താങ്കളുടെ അപേക്ഷ വെരിഫിക്കേഷനായി എച്ച്.സി.ആർ.എസ് അഡ്മിൻ ടീമിന് കൈമാറിയിട്ടുണ്ട്. പരിശോധന കഴിഞ്ഞാലുടൻ കൃത്യമായ മറുപടി ലഭിക്കുന്നതാണ്.",
    en: "Your request has been forwarded to the HCRS Admin Team for verification. Please wait for verification and response.",
    hi: "आपका अनुरोध सत्यापन के लिए एचसीआरएस एडमिन टीम को भेज दिया गया है। कृपया सत्यापन और प्रतिक्रिया की प्रतीक्षा करें।"
  }
};

interface I18nContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, customFallbackDefault?: string) => string;
  dynamicOverrides: TranslationDictionary;
  updateDynamicOverride: (key: string, lang: Language, value: string) => void;
  saveDynamicOverridesToCloud: () => Promise<void>;
  resetDynamicOverridesToCloud: () => Promise<void>;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('hcrs_lang');
    return (saved as Language) || 'ml';
  });
  const [dynamicOverrides, setDynamicOverrides] = useState<TranslationDictionary>({});
  const [loading, setLoading] = useState(true);

  // Auto-subscribe to Firestore language translations overrides
  useEffect(() => {
    const docRef = doc(db, 'settings', 'translations');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.overrides) {
          setDynamicOverrides(data.overrides as TranslationDictionary);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn("Error subscribing to database overrides:", err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('hcrs_lang', newLang);
  };

  const t = (key: string, customFallbackDefault?: string): string => {
    // 1. Check dynamic overrides from cloud first
    if (dynamicOverrides[key] && dynamicOverrides[key][lang] !== undefined && dynamicOverrides[key][lang] !== "") {
      return dynamicOverrides[key][lang];
    }
    
    // 2. Check preloaded static high-quality definitions
    if (staticTranslations[key] && staticTranslations[key][lang] !== undefined) {
      return staticTranslations[key][lang];
    }

    // 3. Fallback to custom label provided in code
    return customFallbackDefault !== undefined ? customFallbackDefault : (staticTranslations[key]?.ml || key);
  };

  const updateDynamicOverride = (key: string, lCode: Language, val: string) => {
    setDynamicOverrides(prev => {
      const existing = prev[key] || { ml: "", en: "", hi: "" };
      return {
        ...prev,
        [key]: {
          ...existing,
          [lCode]: val
        }
      };
    });
  };

  const saveDynamicOverridesToCloud = async () => {
    try {
      const docRef = doc(db, 'settings', 'translations');
      await setDoc(docRef, { overrides: dynamicOverrides }, { merge: true });
    } catch (e) {
      console.error("Error saving dynamic translations of language switcher:", e);
      throw e;
    }
  };

  const resetDynamicOverridesToCloud = async () => {
    try {
      const docRef = doc(db, 'settings', 'translations');
      // Set to blank overrides to clear databases
      await setDoc(docRef, { overrides: {} }, { merge: true });
      setDynamicOverrides({});
    } catch (e) {
      console.error("Error resetting translation dictionary:", e);
      throw e;
    }
  };

  return (
    <I18nContext.Provider value={{
      lang,
      setLanguage,
      t,
      dynamicOverrides,
      updateDynamicOverride,
      saveDynamicOverridesToCloud,
      resetDynamicOverridesToCloud,
      loading
    }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
