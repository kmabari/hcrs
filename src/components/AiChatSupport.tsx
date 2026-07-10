import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  PhoneCall, 
  UserCheck, 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Bot, 
  ChevronRight,
  Headphones,
  Undo2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { useI18n } from '../lib/i18n';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AiChatSupport() {
  const { lang, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState<any | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [hasEnteredPhone, setHasEnteredPhone] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTicketSubmitted, setIsTicketSubmitted] = useState(false);
  const [ticketDetails, setTicketDetails] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to chat end safely without layout shifts or page flickering
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isSending, isVerifying, isTicketSubmitted]);

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      initChat();
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error('ദയവായി സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക. (Please enter exactly 10-digit mobile number)');
      return;
    }

    setIsVerifying(true);
    try {
      // Query users collection to check if profile exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('mobile', '==', cleanPhone), limit(1));
      const querySnapshot = await getDocs(q);

      let foundMemberObj: any = null;
      querySnapshot.forEach((doc) => {
        foundMemberObj = { uid: doc.id, ...doc.data() };
      });

      setHasEnteredPhone(true);
      const userPhoneMsg: Message = { role: 'user', text: `മൊബൈൽ നമ്പർ: ${cleanPhone}` };
      const nextHistory = [...messages, userPhoneMsg];
      setMessages(nextHistory);

      if (foundMemberObj) {
        setVerifiedMember(foundMemberObj);
        setIsGuest(false);
        await getAndSetGreetingFromAI(foundMemberObj, cleanPhone, nextHistory);
      } else {
        setVerifiedMember(null);
        setIsGuest(true);
        await getAndSetGreetingFromAI(null, cleanPhone, nextHistory);
      }
    } catch (err) {
      console.error('Error verifying phone inside chatbot:', err);
      toast.error('കണക്ഷൻ പ്രശ്നമുണ്ട്. എന്നിരുന്നാലും താങ്കൾക്ക് സംശയങ്ങൾ ചോദിക്കാം.');
      setHasEnteredPhone(true);
      setIsGuest(true);
    } finally {
      setIsVerifying(false);
    }
  };

  // Initiate Chatbot with greeting message
  const initChat = () => {
    setMessages([
      {
        role: 'model',
        text: t('chat_welcome', "ഹലോ സുഹൃത്തേ! HCRS (ഹൈറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി) 'വഴികാട്ടി AI' അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം. 🤝\n\nസൊസൈറ്റിയെയോ മറ്റ് വിവരങ്ങളെയോ കുറിച്ച് എന്തെങ്കിലും സഹായം ആവശ്യമുണ്ടോ? പ്രൊഫൈൽ വിവരങ്ങൾ നേരിട്ട് കാണാനും ഇവിടെ ചാറ്റ് ചെയ്യാനും മുകളിലുള്ള ബോക്സിൽ മൊബൈൽ നമ്പർ നൽകി താങ്കൾക്ക് ലോഗിൻ ചെയ്യാവുന്നതാണ്!")
      }
    ]);
  };

  // Ultra-robust Client-Side Malayalam FAQ & Core-Logic Assistant
  const generateLocalFallbackResponse = (userQuery: string, member: any): string => {
    const query = (userQuery || "").toLowerCase().trim();
    
    // Help helper function
    const hasWord = (words: string[]) => words.some(w => query.includes(w));

    // 1. Hello / Greeting
    if (hasWord(['hi', 'hello', 'hey', 'ഹലോ', 'ഹായ്', 'നമസ്കാരം', 'സുഖം', 'സുഖമാണോ', 'good morning', 'good evening'])) {
      if (member) {
        return `ഹലോ ${member.name}! HCRS 'വഴികാട്ടി AI' അസിസ്റ്റന്റിലേക്ക് വീണ്ടും സ്വാഗതം. 🤝

ഞങ്ങൾ ഇന്ന് താങ്കളെ എങ്ങനെയാണ് സഹായിക്കേണ്ടത്? സൊസൈറ്റിയുടെ പ്രധാന പ്രവർത്തനങ്ങൾ, കോടതി കേസ് വിവരങ്ങൾ, മെമ്പർഷിപ്പ് വിവരങ്ങൾ, സപ്പോർട്ട് ക്ലൈം രജിസ്ട്രി എന്നിവയെക്കുറിച്ചുള്ള നിങ്ങളുടെ ചോദ്യങ്ങൾ താഴെ ചോദിക്കാവുന്നതാണ്. 😊`;
      }
      return `ഹലോ സുഹൃത്തേ! HCRS 'വഴികാട്ടി AI' അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം. 🤝

HCRS സൊസൈറ്റിയെക്കുറിച്ചോ, ലോഗിൻ ചെയ്യുന്ന രീതികളെയോ, പുതിയ മെമ്പർഷിപ്പ് എടുക്കുന്നതിനെയോ അല്ലെങ്കിൽ മറ്റ് പ്രധാന സൊസൈറ്റി വിവരങ്ങളെയോ കണ്ടെത്താൻ ഞാൻ നിങ്ങളെ സഹായിക്കാം. നിങ്ങളുടെ പ്രൊഫൈൽ വിവരങ്ങൾ പരിശോധിക്കാൻ മുകളിലുള്ള ബോക്സിൽ മൊബൈൽ നമ്പർ സമർപ്പിക്കാവുന്നതാണ്!`;
    }

    // 2. Case / Court Updates
    if (hasWord(['കേസ്', 'കോടതി', 'കേസുകൾ', 'ഹിയറിങ്', ' update', ' court', ' case', 'അപ്ഡേറ്റ്', 'മാനേജർ', 'തീയതി'])) {
      return `📅 **HCRS കോടതി കേസ് വിവരങ്ങളും ഏറ്റവും പുതിയ അപ്ഡേറ്റുകളും:**

അംഗങ്ങളുടെ അവകാശങ്ങൾ പുനഃസ്ഥാപിക്കുന്നതിനും സാമ്പത്തിക സുരക്ഷിതത്വത്തിനുമായി HCRS സൊസൈറ്റിയുടെ നേതൃത്വത്തിൽ നിയമപരമായ നടപടികൾ നടന്നു വരികയാണ്. 

* **അടുത്ത കേസ് തീയതി:** 2026-ൽ നിശ്ചയിച്ചിട്ടുള്ള ഒഫീഷ്യൽ തീയതികൾ സൊസൈറ്റിയുടെ ഹോംപേജിൽ തത്സമയം അപ്ഡേറ്റ് ചെയ്യുന്നതാണ്. ഹോംപേജിലെ 'അറിയിപ്പുകൾ' (News & Live Updates) പാനൽ സന്ദർശിക്കുക.
* **കൂടുതൽ വിവരങ്ങൾക്ക്:** പ്രസ്തുത വിഷയങ്ങളിൽ കൃത്യമായ കോടതി ഹിയറിങ് വിവരങ്ങൾ അറിയാൻ നിങ്ങളുടെ ജില്ലാ മാനേജറുമായോ സൊസൈറ്റി ഭാരവാഹികളുമായോ നേരിട്ട് ബന്ധപ്പെടാവുന്നതാണ്.`;
    }

    // 3. Claims / Money / Refund Registry
    if (hasWord(['ക്ലൈം', 'claim', 'പണം', 'പൈസ', 'കാശു', 'തുക', 'വാങ്ങാൻ', ' money', ' refund', ' registry', ' register claim', 'ഫോം', 'സമർപ്പിക്കുക', 'വруമാനം'])) {
      return `📋 **HCRS സപ്പോർട്ട് ക്ലൈം ഫോം (Financial Information Registry) വിവരങ്ങൾ:**

ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റി അഗങ്ങളുടെ സാമ്പത്തിക സാഹചര്യങ്ങളും വാലറ്റ് കുടുങ്ങിക്കിടക്കുന്ന തുകകളും സംബന്ധിച്ച വിവരങ്ങൾ ശേഖരിക്കുന്ന സുതാര്യമായ ഒരു വിവരശേഖരണ പ്ലാറ്റ്‌ഫോമാണ് **Member Financial Information Registry**.

* **എങ്ങനെ സമർപ്പിക്കാം:** നിങ്ങളുടെ മെമ്പർ അക്കൗണ്ടിൽ ലോഗിൻ ചെയ്ത ശേഷം ഡാഷ്‌ബോർഡിലുള്ള **'Support Claim Form'** ക്ലിക്ക് ചെയ്ത് നിങ്ങളുടെ കൂപ്പൺ, ഒടിടി വിവരങ്ങൾ സ്വയം പ്രഖ്യാപിച്ച് റെക്കോർഡ് ചെയ്യാം.
* **ഡിപെൻഡന്റ് സൗകര്യം:** ഈ ക്ലൈം അപേക്ഷയോടൊപ്പം തന്നെ കുടുംബത്തിലെ മറ്റു 3 പേരുടെ വിവരങ്ങൾ കൂടി നിങ്ങൾക്ക് ഒന്നിച്ച് രജിസ്റ്റർ ചെയ്യാം.
* **ചെക്ക് ലീഫ് ആവശ്യമുണ്ടോ:** ഇല്ല, യാതൊരു ചെക്ക് ലീഫോ ചെക്ക് കോപ്പിയോ സ്കാൻ ചെയ്ത് നൽകേണ്ടതില്ല. ഇൻവെസ്റ്റ്മെന്റ് വിവരങ്ങൾ ഒഫീഷ്യൽ റെക്കോർഡ് ഇല്ലാതെ തന്നെ പൂർണ്ണ സുതാര്യതയോടു കൂടെ ഇവിടെ സ്വയം പ്രഖ്യാപിച്ച് റെക്കോർഡ് ചെയ്യുക മാത്രമാണ് ചെയ്യുന്നത്.
* **അതിപ്രധാനം:** ഈ വിവര ശേഖരണം ഭാവി ആസൂത്രണങ്ങൾക്കും സാമൂഹിക പ്രതിനിധ്യത്തിനുമാണ്. ഇത് ഒരു **Payment Guarantee** അല്ലെങ്കിൽ കോടതി വഴിയുള്ള പെട്ടെന്നുള്ള തിരിച്ചടവ് വേദി അല്ല എന്ന കാര്യം പ്രത്യേകം ഓർക്കുക.`;
    }

    // 4. Digital Membership Card / Certificate / Download Card
    if (hasWord(['കാർഡ്', 'card', '아이ഡി', 'id', 'സർട്ടിഫിക്കറ്റ്', 'certificate', 'അംഗത്വ കാർഡ്', 'മെമ്പർഷിപ്പ് കാർഡ്', 'ഡൗൺലോഡ്'])) {
      return `💳 **ഡിജിറ്റൽ മെമ്പർഷിപ്പ് കാർഡ് എങ്ങനെ കാണാം/ഡൗൺലോഡ് ചെയ്യാം:**

എല്ലാ ആക്റ്റീവ് അപ്രൂവ്ഡ് മെമ്പർമാർക്കും തത്സമയം അവരുടെ വെബ്സൈറ്റ് അക്കൗണ്ടിൽ നിന്ന് ഒഫീഷ്യൽ ഡിജിറ്റൽ കാർഡുകൾ ഡൗൺലോഡ് ചെയ്യാം.

* **ചെയ്യേണ്ട രീതി:** നിങ്ങളുടെ 10 അക്ക മൊബൈൽ നമ്പറും പാസ്‌വേഡും ഉപയോഗിച്ച് മെമ്പർഷിപ്പ് പോർട്ടലിൽ വിജയകരമായി ലോഗിൻ ചെയ്യുക. 
* ലോഗിൻ ചെയ്ത ശേഷം ഡാഷ്‌ബോർഡിലുള്ള **'View Digital ID Card'** ബട്ടൺ അമർത്തുക.
* നിങ്ങളുടെ ഫോട്ടോ, സിഗ്നേച്ചർ, ഒഫീഷ്യൽ പേര്, മെമ്പർഷിപ്പ് ഐഡി എന്നിവയോടുകൂടിയ കാർഡ് അവിടെ ലഭ്യമാകും. ഇത് വളരെ എളുപ്പത്തിൽ ഡൗൺലോഡ് ചെയ്യുകയോ പ്രിന്റ് എടുക്കുകയോ ചെയ്യാം.`;
    }

    // 5. Profile Edit / Change Name/Mobile/Correction
    if (hasWord(['മാറ്റാൻ', 'മാറ്റണം', 'തിരുത്താൻ', 'തിരുത്തണം', 'പേര് തെറ്റി', 'ഫോൺ നമ്പർ മാറ്റാൻ', 'മൊബൈൽ മാറ്റാൻ', 'തിരുത്തലുകൾ', ' change', ' correction', ' edit'])) {
      return `✏️ **പ്രൊഫൈൽ വിവരങ്ങൾ തിരുത്തൽ / പ്രൊഫൈൽ തിരുത്താൻ:**

✏️ സുരക്ഷാ ക്രമീകരണങ്ങളും ഔദ്യോഗിക വിവരങ്ങളുടെ സുതാര്യതയും മുൻനിർത്തി, അപേക്ഷ നൽകിയതിൽ എന്തെങ്കിലും മാറ്റം വരുത്താൻ മെമ്പർമാർക്ക് ചില സുരക്ഷാ നിയന്ത്രണങ്ങൾ ഉണ്ട്.

* **മാറ്റാൻ കഴിയുന്നത്:** ലോഗിൻ ചെയ്തതിന് ശേഷം പ്രൊഫൈലിൽ കയറി നിങ്ങളുടെ വിലാസം, ഇമെയിൽ, ജില്ല, മണ്ഡലം എന്നിവ നിങ്ങൾക്ക് സ്വയം എഡിറ്റ് ചെയ്യാം.
* **മാറ്റാൻ കഴിയാത്തവ (Admins Only):** നിങ്ങളുടെ ഔദ്യോഗിക പേര്, മെമ്പർഷിപ്പ് നമ്പർ, മൊബൈൽ നമ്പർ എന്നിവ നിങ്ങൾക്ക് സ്വയം മാറ്റാൻ കഴിയില്ല. ഈ വിവരങ്ങളിൽ തെറ്റുണ്ടെങ്കിൽ തിരുത്താനായി ഡാഷ്‌ബോർഡിലെ **'Raise Support Ticket'** അമർത്തി ജില്ലാ അഡ്മിന് അപേക്ഷ നൽകുകയോ ജില്ലാ മാനേജറെ നേരിട്ട് ബന്ധപ്പെടുകയോ ചെയ്യുക.`;
    }

    // 6. Membership Renewal / Expired / Duration
    if (hasWord(['പുതുക്കാൻ', 'പുതുക്കൽ', ' renew', ' expired', 'വാലിഡിറ്റി', 'കാലാവധി കഴിഞ്ഞു', 'തുടരുക'])) {
      return `🔄 **മെമ്പർഷിപ്പ് പുതുക്കുന്നതിനുള്ള വിവരങ്ങൾ:**

* **കാലാവധി:** എച്ച്.സി.ആർ.എസ് മെമ്പർഷിപ്പ് കാലാവധി രജിസ്ട്രേഷൻ തീയതി മുതൽ ഒരു വർഷത്തേക്കാണ്.
* **എങ്ങനെ പുതുക്കാം:** ഓരോ വർഷവും ₹100 ബാങ്ക് ട്രാൻസാക്ഷൻ വഴി അടച്ച് അതിന്റെ രസീത് സമർപ്പിച്ച് മെമ്പർഷിപ്പ് പുതുക്കാം.
* **രീതി:** മെയിൻ മെനുവിലെ 'Renewal' എന്ന ഓപ്ഷൻ വഴിയോ നിങ്ങളുടെ അക്കൗണ്ടിൽ ലോഗിൻ ചെയ്ത് ഡാഷ്‌ബോർഡിൽ കാണുന്ന 'Renew Now' പ്രൊപ്പോസൽ വഴിയോ പുതുക്കൽ അപേക്ഷ സമർപ്പിക്കാം.`;
    }

    // 7. How to register / Join / Become Member / Fees
    if (hasWord(['മെമ്പർഷിപ്പ്', 'മെമ്പർ', 'ചേരാൻ', 'എടുക്കാൻ', 'പുതിയ', 'രജിസ്റ്റർ', 'രജിസ്ട്രേഷൻ', 'രജിസ്ട്രി', 'register', 'membership', 'join', 'fee', 'ഫീസ്', 'അംഗത്വം', 'അംഗം'])) {
      return `📝 **HCRS-ൽ എങ്ങനെയൊരു പുതിയ മെമ്പർഷിപ്പ് എടുക്കാം?**

HCRS വെബ്‌സൈറ്റിന്റെ മെയിൻ ഹോംപേജിലുള്ള **'Register' / 'ന്യൂ രജിസ്ട്രേഷൻ'** ഓപ്ഷൻ വഴി വളരെ ലളിതമായി ആർക്കും ഇവിടെ പുതിയ മെമ്പർഷിപ്പ് എടുക്കാവുന്നതാണ്. ഇതിനായുള്ള ഘട്ടങ്ങൾ താഴെ പറയുന്നവയാണ്:

1. **വ്യക്തിഗത വിവരങ്ങൾ നൽകുക:** നിങ്ങളുടെ പേര്, സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ, ജില്ല, മണ്ഡലം എന്നിവ കൃത്യമായി നൽകുക. (കുടുംബാംഗങ്ങളെ പിന്നീട് പാനലിൽ ലോഗിൻ ചെയ്ത ശേഷം ആഡ് ചെയ്യാവുന്നതാണ്).
2. **ഫോട്ടോയും ഒപ്പും അപ്‌ലോഡ് ചെയ്യുക:** നിങ്ങളുടെ പേഴ്സണൽ പാസ്‌പോർട്ട് സൈസ് പ്രൊഫൈൽ ഫോട്ടോയും നിങ്ങളുടെ ഒപ്പും സെലക്ട് ചെയ്യുക.
3. **പെയ്‌മെന്റ് വിവരങ്ങൾ:** ബാങ്ക് അക്കൗണ്ടിലേക്ക് രജിസ്ട്രേഷൻ ഫീസായ ₹200 അടച്ച ശേഷം ആ ഇടപാടിന്റെ രസീത് പ്രൂഫ് (Receipt Photo/Screenshot) ഇവിടെ അപ്‌ലോഡ് ചെയ്യേണ്ടതുണ്ട്.
4. **രജിസ്ട്രേഷൻ സമർപ്പിക്കുക:** വിവരങ്ങൾ കൺഫേം ചെയ്ത ശേഷം സബ്മിറ്റ് ചെയ്യുക.

തുടർന്ന് നിങ്ങളുടെ അപേക്ഷയും പെയ്മെന്റും ജില്ലാ മാനേജർ/അഡ്മിൻ പരിശോധിച്ച് അപ്രൂവ് ചെയ്ത ശേഷം നിങ്ങളുടെ വാട്സാപ്പിലേക്ക്/ഫോണിലേക്ക് ഒഫീഷ്യൽ 6-അക്ക ലോഗിൻ പിൻ (PIN) നമ്പർ ലഭിക്കും.`;
    }

    // 8. Contact HCRS / Committee Members
    if (hasWord(['ബന്ധപ്പെടാൻ', 'നമ്പർ', 'ഫോൺ', 'ഭാരവാഹികൾ', 'കമ്മിറ്റി', ' contact', ' phone', ' office', ' location', 'തൃശൂർ', 'thrissur'])) {
      return `📞 **സൊസൈറ്റി ഭാരവാഹികളെയോ ജില്ലാ കമ്മിറ്റിയെയോ എങ്ങനെ ബന്ധപ്പെടാം:**

* **വിലാസം:** HCRS ഹെഡ് ഓഫീസ് Thrissur സന്ദർശിക്കുകയോ ജില്ലാ ഭാരവാഹികളെ നേരിട്ട് ബന്ധപ്പെടുകയോ ചെയ്യാം.
* **സമ്പർക്കം:** നിങ്ങളുടെ ജില്ലയിലെ കാര്യങ്ങൾ വളരെ മികച്ച രീതിയിൽ ഏകോപിപ്പിക്കുന്നതിനായി സൊസൈറ്റിയുടെ ജില്ലാ കമ്മിറ്റികൾ രൂപീകരിച്ചിട്ടുണ്ട്. മെമ്പർഷിപ്പ് പിൻ വിവരങ്ങൾക്കും രജിസ്ട്രേഷൻ സംശയങ്ങൾക്കും നിങ്ങളുടെ **ജില്ലാ മാനേജറെയോ** മണ്ഡലം കമ്മിറ്റി പ്രതിനിധികളെയോ നിങ്ങൾക്ക് ബന്ധപ്പെടാം.
* കൂടാതെ വെബ്‌സൈറ്റിലെ ഒഫീഷ്യൽ **'Contact'** പേജ് മുഖേന നിങ്ങൾക്കുള്ള സംശയങ്ങൾ നേരിട്ട് അയക്കാവുന്നതുമാണ്.`;
    }

    // 9. Objectives / Purpose
    if (hasWord(['ലક્ષ്യം', 'ലક્ષ്യങ്ങൾ', 'ഉദ്ദേശം', 'ഉദ്ദേശങ്ങൾ', 'purpose', 'aim', 'objectives', 'society', 'എന്താണ്', 'എന്താ'])) {
      return `🎯 **HCRS സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങളും ഉദ്ദേശങ്ങളും:**

ഹൈക്കുറിച്ച് (Highrich) കമ്മ്യൂണിറ്റിക്ക് ശാക്തീകരണവും കൈത്താങ്ങും നൽകുക, മുൻകാലങ്ങളിലുള്ള കമ്മ്യൂണിറ്റി മെമ്പർമാരുടെ ഡിജിറ്റൽ ക്ലൈമുകൾ ചിട്ടയോടെ പരിഹരിക്കാനുള്ള സുതാര്യമായ ഒരു വേദി ഒരുക്കുക എന്നിവയാണ് **ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി (HCRS)** യുടെ പ്രധാന ലക്ഷ്യം.

* **കൂപ്പൺ റീഡീമിംഗ് സപ്പോർട്ട്:** മുൻകാലങ്ങളിൽ കുടുങ്ങിക്കിടക്കുന്ന മെമ്പർമാരുടെ റെഡീം കൂപ്പണുകൾ, OTT അഡ്വാൻസുകൾ, മറ്റു കോൺസൈൻമെന്റ് തുകകൾ എന്നിവ കൃത്യമായി ഇൻവെന്ററി ചെയ്യുകയും റിവൈവൽ ആനുകൂല്യങ്ങളും പെയ്‌മെന്റുകളും ലഭ്യമാക്കുകയുമാണ് ഇതിന്റെ പ്രധാന ഉദ്ദേശം.
* **കൂട്ടായ സുതാര്യത:** അഡ്മിൻ - ഡിസ്ട്രിക്റ്റ് ലെവലിലുള്ള സൂപ്പർവൈസർമാർ വഴി സാധാരണക്കാരായ മെമ്പർമാരുടെ പ്രശ്നങ്ങൾ വളരെ വിശ്വസനീയമായും ഓൺലൈനായും തീർപ്പാക്കുക എന്നതാണ് സംഘടന വിഭാവനം ചെയ്യുന്നത്.`;
    }

    // 10. Services / Portal Services
    if (hasWord(['സർവീസ്', 'സർവീസുകൾ', 'സേവനം', 'സേവനങ്ങൾ', 'services', 'service', 'സൌകര്യം', 'സൗകര്യം', 'സൗകര്യങ്ങൾ'])) {
      return `💼 **HCRS-ലൂടെ ലഭിക്കുന്ന പ്രധാന സേവനങ്ങൾ (Key Services):**

1. **ഡിപെൻഡന്റ് ക്ലൈം ഫെസിലിറ്റി (Dependent Claims):** ഒരൊറ്റ ലോഗിൻ സെഷനിലൂടെ തന്റെ കുടുംബാംഗങ്ങളായ പരമാവധി 3 ഡിപെൻഡന്റ് മെമ്പർമാരെക്കൂടി (അച്ഛൻ, അമ്മ, ഭാര്യ, мക്കൾ) ആഡ് ചെയ്യാനും ഒന്നിച്ച് വളരെ വേഗത്തിൽ ക്ലൈം ഇൻഫർമേഷൻ സമർപ്പിക്കാനുമുള്ള സൗകര്യം.
2. **ഡിജിറ്റൽ മെമ്പർഷിപ്പ് ഐഡന്റിറ്റി കാർഡ്:** ഫുൾ കളർ ഡിസൈനിൽ ഉള്ള നിങ്ങളുടെ ഡിജിറ്റൽ മെമ്പർഷിപ്പ് ഐഡന്റിറ്റി കാർഡ് ലൈവായി കാണാനും നിങ്ങളുടെ മൊബൈലിലേക്ക് ഡൗൺലോഡ് ചെയ്യാനും പ്രിന്റ് ചെയ്യാനുമുള്ള ലോഗിൻ സൗകര്യം.
3. **ഓൺലൈൻ പ്രൊഫൈൽ തിരുത്തൽ (Support Tickets):** അക്കൗണ്ടിലുള്ള നിങ്ങളുടെ വിവരങ്ങൾ തെറ്റിയാൽ നേരിട്ട് ജില്ലാ മാനേജർക്കോ അഡ്മിനോ ടിക്കറ്റ് സമർപ്പിക്കാനും അതിന്റെ മുൻഗണന ഓൺലൈനായി ട്രാക്ക് ചെയ്യാനുമുള്ള സംവിധാനം.
4. **റിന്യൂവൽ പെയ്മെന്റ് സിസ്റ്റം:** കാലഹരണപ്പെടുന്ന മെമ്പർഷിപ്പുകൾ ലളിതമായി റിന്യൂ ചെയ്യാനും തത്സമയ പെയ്മെന്റ് പ്രൂഫ് കൺട്രോൾസ് ചെയ്യാനുമുള്ള സൗകര്യം.`;
    }

    // 11. constituency committee / മണ്ഡലം കമ്മിറ്റി
    if (hasWord(['മണ്ഡലം', 'മണ്ഡലം കമ്മിറ്റി', 'മണ്ഡലം കമ്മറ്റി', 'constituency'])) {
      return `🏢 **മണ്ഡലം കമ്മിറ്റി വിവരങ്ങൾ:**

മണ്ഡലം കമ്മിറ്റിയുടെ പ്രധാന ചുമതല എച്ച്.സി.ആർ.എസ് സൊസൈറ്റിയുടെ താഴേത്തട്ടിലുള്ള മെമ്പർമാരെയും പ്രാദേശിക പ്രവർത്തനങ്ങളെയും ഫീൽഡ് ലെവൽ വിവരശേഖരണത്തെയും ഏകോപിപ്പിക്കുക എന്നതാണ്; ജില്ലാ കമ്മിറ്റിയുമായി ചേർന്നാണ് മണ്ഡലം കമ്മിറ്റി പ്രവർത്തിക്കുന്നത്.`;
    }

    // 12. Legal Advice / നിയമോപദേശം
    if (hasWord(['നിയമോപദേശം', 'നിയമം', 'കേസ് പോരാട്ടം', 'legal advice', 'lawyer'])) {
      return `⚖️ **നിയമോപദേശ സംബന്ധമായ അറിയിപ്പ്:**

HCRS നിയമപരമായ സഹായങ്ങളും ഉപദേശങ്ങളും നേരിട്ട് നൽകുന്നില്ല. വിവരങ്ങൾ അറിയാൻ നിങ്ങളുടെ ജില്ലാ മാനേജറെയോ കമ്മിറ്റിയെയോ ബന്ധപ്പെടുക, കൂടുതൽ പ്രത്യേക നിയമോപദേശങ്ങൾക്കായി ഒരു യോഗ്യതയുള്ള വക്കീലിനെ നേരിട്ട് സമീപിക്കാൻ താത്പര്യപ്പെടുന്നു.`;
    }

    // 13. Welfare Activities / വെൽഫെയർ
    if (hasWord(['വെൽഫെയർ', 'ക്ഷേമ', 'സഹായങ്ങൾ', 'welfare'])) {
      return `🤝 **HCRS ക്ഷേമ പ്രവർത്തനങ്ങൾ:**

അംഗങ്ങളുടെ ക്ഷേമം, ആരോഗ്യം, പഠനം, മെഡിക്കൽ അസിസ്റ്റന്റ് പദ്ധതികൾ, കൂട്ടായ ദുരിതാശ്വാസം തുടങ്ങിയ സാമൂഹിക സേവന പ്രവർത്തനങ്ങൾക്ക് എച്ച്.സി.ആർ.എസ് സൊസൈറ്റി മുൻഗണന നൽകുന്നു.`;
    }

    // 14. Mission / ദൗത്യം
    if (hasWord(['ദൗത്യം', 'വിഷൻ', 'mission', 'vision'])) {
      return `🚀 **HCRS വിഷൻ & മിഷൻ (ദൗത്യം):**

ബുദ്ധിമുട്ടിലായ കുടുംബങ്ങളെ പിന്തുണയ്ക്കുകയും കമ്മ്യൂണിറ്റിയെ ഒന്നിപ്പിക്കുകയും സുതാര്യവും നിയമപരവുമായ രീതിയിലൂടെ അർഹമായ ആനുകൂല്യങ്ങൾ ലഭ്യമാക്കാൻ കമ്മ्युनिटीയെ ശക്തിപ്പെടുത്തുകയുമാണ് ഞങ്ങളുടെ ലക്ഷ്യം.`;
    }

    // 15. PIN / പാസ്‌വേഡ്
    if (hasWord(['പിൻ', 'pin', 'പാസ്‌വേഡ്', 'password', 'മറന്നു', 'ലോഗിൻ', 'login'])) {
      return `🔑 **ലോഗിൻ പിൻ (PIN) സംബന്ധിച്ച വിവരങ്ങൾ:**

* രജിസ്ട്രേഷൻ സമയത്ത് സമർപ്പിച്ച വിവരങ്ങളും പെയ്മെന്റും നിങ്ങളുടെ ജില്ലാ മാനേജർ അല്ലെങ്കിൽ ഒഫീഷ്യൽ അഡ്മിൻ പരിശോധിച്ച് അപ്രൂവ് ചെയ്ത് കഴിഞ്ഞാൽ മാത്രമേ നിങ്ങളുടെ പ്രൊഫൈൽ ആക്റ്റീവ് ആവുകയും 6 അക്ക ലോഗിൻ പിൻ ലഭ്യമാവുകയും ചെയ്യുകയുള്ളൂ.
* പ്രൊഫൈൽ അപ്രൂവ് ആയിരിക്കുകയും പിൻ ലഭിക്കാതിരിക്കുകയോ മറന്നുപോവുകയോ ചെയ്തെങ്കിൽ, നിങ്ങളുടെ ജില്ലാ മാനേജരുമായോ അല്ലെങ്കിൽ നേരിട്ട് സപ്പോർട്ട് വഴിയോ ബന്ധപ്പെട്ട് പുതിയ ലോഗിൻ പിൻ റീസെറ്റ് ചെയ്ത് ലഭ്യമാക്കാവുന്നതാണ്.`;
    }

    // If they are logged in and none of specific FAQs matched:
    if (member) {
      return `പ്രിയ ${member.name}, താങ്കളുടെ ഈ ചോദ്യം പരിശോധനയ്ക്കായി HCRS അഡ്മിൻ ടീമിന് കൈമാറിയിട്ടുണ്ട്. പരിശോധിച്ച ശേഷം ഒഫീഷ്യൽ മറുപടി നൽകുന്നതാണ്.

(Your question has been forwarded to the HCRS Admin Team for verification. Once reviewed, an official response will be provided.)`;
    }
    
    return `ನಿಮ್ಮ ചോദ്യം പരിശോധനയ്ക്കായി HCRS അഡ്മിൻ ടീമിന് കൈമാറിയിട്ടുണ്ട്. പരിശോധിച്ച ശേഷം ഒഫീഷ്യൽ മറുപടി നൽകുന്നതാണ്. HCRS സംബന്ധിച്ച പൊതുവായ സംശയങ്ങൾക്ക് 'രജിസ്റ്റർ', 'ലക്ഷ്യം' അല്ലെങ്കിൽ 'സേവനം' എന്ന് ചോദിക്കാവുന്നതാണ്.

(Your question has been forwarded to the HCRS Admin Team for verification. Once reviewed, an official response will be provided.)`;
  };

  const handleQuickPublicQuestion = async (questionText: string) => {
    setIsGuest(true);
    setVerifiedMember(null);
    setPhone('');
    setHasEnteredPhone(true);

    const userMsg: Message = { role: 'user', text: questionText };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);

    setIsSending(true);
    try {
      let dataText = '';
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: questionText,
            history: messages.slice(-8),
            verifiedMember: null
          })
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            throw new Error('HtmlRedirect');
          }
          const data = await response.json();
          dataText = data.text;
        } else {
          throw new Error('APIError');
        }
      } catch (err) {
        console.warn('Fallback to local assistant resolver:', err);
        dataText = generateLocalFallbackResponse(questionText, null);
      }

      setMessages(prev => [
        ...prev,
        { role: 'model', text: dataText }
      ]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: generateLocalFallbackResponse(questionText, null) }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSkipPhoneVerification = async () => {
    setIsGuest(true);
    setVerifiedMember(null);
    setPhone('');
    setHasEnteredPhone(true);

    const guestUserMsg: Message = { role: 'user', text: 'HCRS പൊതുവിവരങ്ങൾ അറിയാൻ താത്പര്യപ്പെടുന്നു (View General Info)' };
    const nextHistory = [...messages, guestUserMsg];
    setMessages(nextHistory);

    await getAndSetGreetingFromAI(null, '', nextHistory);
  };

  const getAndSetGreetingFromAI = async (member: any, phoneNum: string, currentHistory: Message[]) => {
    setIsSending(true);
    try {
      const prompt = member 
        ? `[SYSTEM: User verified mobile: ${phoneNum}. Name: ${member.name}. Mobile: ${member.mobile || 'N/A'}. ID: ${member.membershipId || 'Pending'}. Status: ${member.status}. Introduce yourself warmly to ${member.name}, confirm their account look up is successful, and ask how you can help them today with HCRS.]`
        : !phoneNum
          ? `[SYSTEM: Welcome them warmly as a general public visitor. Tell them they can ask any general questions about HCRS (Highrich Community Revival Society), such as:
1. എങ്ങനെയൊരു പുതിയ മെമ്പർഷിപ്പ് എടുക്കാം? (How to join membership)
2. എന്താണ് ഈ സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങളും ഉദ്ദേശങ്ങളും? (Aim & purpose of HCRS)
3. എന്തൊക്കെയാണ് നിങ്ങൾ അവർക്ക് കൊടുക്കുന്ന സർവീസുകൾ? (Services HCRS provides)
തോളോട് തോൾ ചേർന്ന് മലയാളത്തിൽ വളരെ വ്യക്തമായും സന്തോഷത്തോടും കൂടെ മറുപടി പറയുക. മുകളിലുള്ള മൊബൈൽ നമ്പർ വെരിഫിക്കേഷൻ വഴി മാത്രമേ ഡീറ്റെയിൽസ് പരിശോധിക്കാൻ സാധിക്കൂ എന്ന കാര്യം ഓപ്ഷണലായി ഓർമ്മിപ്പിക്കാം.]`
          : `[SYSTEM: User typed mobile ${phoneNum}, but no profile exists. Politely welcome them as a guest, mention that they are not registered in the database, and ask how you can help them.]`;

      const languageInstruction = `[SYSTEM LANGUAGE ENFORCEMENT: The user's active application language is ${lang === 'ml' ? 'Malayalam (മലയാളം)' : lang === 'hi' ? 'Hindi (हिन्दी)' : 'English'}. You MUST reply, greet, and explain EVERYTHING strictly, completely, and exclusively in ${lang === 'ml' ? 'Malayalam (മലയാളം)' : lang === 'hi' ? 'Hindi (हिन्दी)' : 'English'}. Avoid using words from other languages.]`;
      const combinedPrompt = `${prompt}\n\n${languageInstruction}`;

      let dataText = '';
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: combinedPrompt,
            history: currentHistory.slice(-8),
            verifiedMember: member
          })
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            throw new Error('HtmlRedirect');
          }
          const data = await response.json();
          dataText = data.text;
        } else {
          throw new Error('ResponseNotOk');
        }
      } catch (err) {
        console.warn('Greeting fetch failed/redirected, using local representation.', err);
        dataText = member 
          ? `ഹലോ ${member.name}! താങ്കളുടെ പ്രൊഫൈൽ വിജയകരമായി കണ്ടെത്തിയിട്ടുണ്ട്. നിങ്ങൾക്ക് എന്ത് സഹായമാണ് നൽകേണ്ടത്? (ഹോംപേജിലെ വിവരങ്ങൾ കാണാൻ താങ്കൾക്ക് അസിസ്റ്റന്റുമായി തുടർന്ന് സംസാരിക്കാം)`
          : !phoneNum
            ? `ഹലോ സുഹൃത്തേ! HCRS സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങളും ഉദ്ദേശങ്ങളും സർവീസുകളും എന്തൊക്കെയാണെന്ന് അറിയാനാണോ താങ്കൾ താല്പര്യപ്പെടുന്നത്? എന്ത് സഹായമാണ് ഞാൻ ചെയ്തു തരേണ്ടത്?`
            : `ഹലോ സുഹൃത്തേ, നൽകിയ നമ്പറിൽ പ്രൊഫൈൽ ഒന്നും കണ്ടെത്തിയില്ല. എന്നിരുന്നാലും സംഘടനയെക്കുറിച്ചുള്ള പൊതുവായ സംശയങ്ങൾ പരിഹരിക്കാൻ ഇവിടെ ചോദിക്കാവുന്നതാണ്.`;
      }

      setMessages(prev => [
        ...prev,
        { role: 'model', text: dataText }
      ]);
    } catch (e) {
      console.error(e);
      const fallbackText = member 
        ? `ഹലോ ${member.name}! താങ്കളുടെ പ്രൊഫൈൽ വിജയകരമായി കണ്ടെത്തിയിട്ടുണ്ട്. നിങ്ങൾക്ക് എന്ത് സഹായമാണ് നൽകേണ്ടത്?`
        : !phoneNum
          ? `ഹലോ സുഹൃത്തേ! HCRS സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങളും ഉദ്ദേശങ്ങളും സർവീസുകളും എന്തൊക്കെയാണെന്ന് അറിയാനാണോ താങ്കൾ താല്പര്യപ്പെടുന്നത്? എന്ത് സഹായമാണ് ഞാൻ ചെയ്തു തരേണ്ടത്?`
          : `ഹലോ സുഹൃത്തേ, നൽകിയ നമ്പറിൽ പ്രൊഫൈൽ ഒന്നും കണ്ടെത്തിയില്ല. എന്നിരുന്നാലും സംഘടനയെക്കുറിച്ചുള്ള പൊതുവായ സംശയങ്ങൾ പരിഹരിക്കാൻ ഇവിടെ ചോദിക്കാവുന്നതാണ്.`;
      setMessages(prev => [
        ...prev,
        { role: 'model', text: fallbackText }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const msgToSend = customMsg || inputMessage;
    if (!msgToSend.trim()) return;

    if (!customMsg) setInputMessage('');

    // Check if the input message is exactly a 10-digit mobile number!
    const digitOnly = msgToSend.trim().replace(/\D/g, '');
    if (digitOnly.length === 10 && msgToSend.trim() === digitOnly) {
      setIsSending(true);
      try {
        setPhone(digitOnly);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('mobile', '==', digitOnly), limit(1));
        const querySnapshot = await getDocs(q);

        let foundMemberObj: any = null;
        querySnapshot.forEach((doc) => {
          foundMemberObj = { uid: doc.id, ...doc.data() };
        });

        const userPhoneMsg: Message = { role: 'user', text: `മൊബൈൽ നമ്പർ: ${digitOnly}` };
        const updatedMessagesWithPhone = [...messages, userPhoneMsg];
        setMessages(updatedMessagesWithPhone);
        setHasEnteredPhone(true);

        if (foundMemberObj) {
          setVerifiedMember(foundMemberObj);
          setIsGuest(false);
          await getAndSetGreetingFromAI(foundMemberObj, digitOnly, updatedMessagesWithPhone);
        } else {
          setVerifiedMember(null);
          setIsGuest(true);
          await getAndSetGreetingFromAI(null, digitOnly, updatedMessagesWithPhone);
        }
        return; // Success, intercepted!
      } catch (err) {
        console.error('Error verifying phone typed in message box:', err);
      } finally {
        setIsSending(false);
      }
    }
    
    // Add user message to history
    const updatedMessages = [...messages, { role: 'user', text: msgToSend } as Message];
    setMessages(updatedMessages);

    setIsSending(true);
    try {
      let responseText = '';
      try {
        // Direct call to our backend API endpoint passing the current verifiedMember profile
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msgToSend,
            history: messages.slice(-8), // Send previous history (which excludes the new active message) to stay under token limits
            verifiedMember: verifiedMember
          })
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            throw new Error('HtmlRedirect');
          }
          const data = await response.json();
          responseText = data.text;
        } else {
          throw new Error('APIError');
        }
      } catch (err) {
        console.warn('API chat failed or was intercepted, using offline FAQ fallback resolver:', err);
        responseText = generateLocalFallbackResponse(msgToSend, verifiedMember);
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

      // Check if user is asking for corrections, photoupdate or receipt update in the text
      const lowerText = msgToSend.toLowerCase();
      const needsTicket = lowerText.includes('തെറ്റ്') || 
                          lowerText.includes('തിരുത്ത') || 
                          lowerText.includes('മാറ്റി') || 
                          lowerText.includes('ഫോട്ടോ') || 
                          lowerText.includes('receipt') || 
                          lowerText.includes('രസീത്') || 
                          lowerText.includes('രജിസ്റ്ററേഷൻ പ്രശ്നം') ||
                          lowerText.includes('മൊബൈൽ മാറ്റണം');

      if (needsTicket && !isTicketSubmitted) {
        // Offer quick ticket log
        setTicketDetails(msgToSend);
      }

    } catch (err: any) {
      console.error('Chat handleSendMessage error:', err);
      const displayMsg = err.message || 'എനിക്ക് കണക്ഷൻ ലഭിക്കുന്നില്ല';
      const warningPrompt = `ക്ഷമിക്കണം, എനിക്ക് ലൈവ് കണക്ഷൻ ലഭിക്കുന്നില്ല (${displayMsg}).\n\n💡 നിങ്ങളിപ്പോൾ ആപ്ലിക്കേഷൻ സെക്യൂർ ഫ്രെയിമിലാണ് കാണുന്നത്. ചില ബ്രൗസറുകൾ (പ്രത്യേകിച്ച് Safari/iPhone/iOS) ഇങ്ങനെയുള്ള പ്ലാറ്റ്‌ഫോം കുക്കികൾ ബ്ലോക്ക് ചെയ്യാറുണ്ട്. ഇതിന് പരിഹാരമായി ഏറ്റവും മുകളിലുള്ള 'Authenticate / Open in New Tab' അമർത്തുക അല്ലെങ്കിൽ മറ്റൊരു ബ്രൗസർ (Chrome/Edge) ഉപയോഗിക്കുക.`;
      setMessages(prev => [
        ...prev,
        { role: 'model', text: warningPrompt }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Automated Ticket logger trigger
  const handleLogTicket = async (issueType: string) => {
    setIsVerifying(true);
    try {
      const name = verifiedMember?.name || 'Guest User';
      const originalMobile = phone || verifiedMember?.mobile || 'No Phone';
      const mId = verifiedMember?.membershipId || 'Pending';
      const notes = ticketDetails || `AI chat assistance logs regarding: ${issueType}`;

      const ticketData = {
        memberName: name,
        memberId: mId,
        phone: originalMobile,
        issue: issueType,
        aiSummary: notes,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'support_tickets'), ticketData);

      setIsTicketSubmitted(true);
      setTicketDetails(null);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: `✅ താങ്കളുടെ വിഷയം വിജയകരമായി അഡ്മിനെ അറിയിച്ചിട്ടുണ്ട്! വിഷയം: "${issueType}". അഡ്മിൻ പാനലിൽ ഇതിൻ്റെ നോട്ടിഫിക്കേഷൻ അയച്ചിട്ടുണ്ട്. അവർ ഇത് എത്രയും വേഗം പരിശോധിച്ച് പരിഹരിക്കുന്നതാണ്.` }
      ]);
      toast.success('അഡ്മിന് നോട്ടിഫിക്കേഷൻ അയച്ചിട്ടുണ്ട്!');
    } catch (error) {
      console.error(error);
      toast.error('ടിക്കറ്റ് രജിസ്റ്റർ ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetChat = () => {
    setPhone('');
    setHasEnteredPhone(false);
    setVerifiedMember(null);
    setIsGuest(false);
    setMessages([]);
    setIsTicketSubmitted(false);
    setTicketDetails(null);
    initChat();
  };

  return (
    <>
      {/* Floating support trigger */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          id="ai-chatbot-trigger"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpen}
          className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-full flex items-center justify-center text-white shadow-2xl relative border-2 border-white cursor-pointer group"
        >
          <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1.5 -right-1.5 bg-brand-magenta text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-bounce shadow">
            സപ്പോർട്ട്
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col h-[600px] relative"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-5 flex items-center justify-between border-b border-emerald-500/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white">
                    <Bot className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[15px] tracking-tight flex items-center gap-1.5 leading-none uppercase">
                      HCRS വഴികാട്ടി AI
                    </h3>
                    <p className="text-[10px] text-white/80 font-semibold mt-1">24x7 ഔദ്യോഗിക അസിസ്റ്റന്റ് വഴി</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetChat}
                    title="Reset Chat"
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Verified member quick glance plate */}
              {verifiedMember ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
                  {verifiedMember.photoUrl ? (
                    <img 
                      src={verifiedMember.photoUrl} 
                      alt="Verified member" 
                      className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                      <UserCheck className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate uppercase mt-0.5">
                      {verifiedMember.name}
                    </h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 inline-block uppercase tracking-wider mt-0.5">
                      {verifiedMember.membershipId || 'Approval Pending'}
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      verifiedMember.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'
                    }`}>
                      {verifiedMember.status === 'active' ? 'ACTIVE' : verifiedMember.status}
                    </span>
                    <button
                      onClick={() => {
                        setHasEnteredPhone(false);
                        setVerifiedMember(null);
                        setIsGuest(false);
                        setPhone('');
                        setMessages(prev => [
                          ...prev,
                          { role: 'model', text: 'മറ്റൊരു നമ്പർ വെരിഫൈ ചെയ്യാനായി താഴെ പുതിയ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.' }
                        ]);
                      }}
                      className="text-[8px] text-[#0066FF] font-black underline uppercase cursor-pointer hover:opacity-80"
                    >
                      Change Number
                    </button>
                  </div>
                </div>
              ) : isGuest && (
                <div className="bg-amber-50 dark:bg-amber-950/25 p-2.5 px-4 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold uppercase mt-0.5">
                      പ്രൊഫൈൽ ലഭ്യമല്ല (Guest Profile)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setHasEnteredPhone(false);
                      setVerifiedMember(null);
                      setIsGuest(false);
                      setPhone('');
                      setMessages(prev => [
                        ...prev,
                        { role: 'model', text: 'മറ്റൊരു നമ്പർ വെരിഫൈ ചെയ്യാനായി താഴെ പുതിയ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.' }
                      ]);
                    }}
                    className="text-[9px] text-amber-600 dark:text-amber-450 font-black underline uppercase cursor-pointer hover:opacity-80"
                  >
                    Change Number
                  </button>
                </div>
              )}

              {/* Chat messages */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === 'model' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      {m.role === 'model' && (
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm text-[10px] font-black">
                          AI
                        </div>
                      )}
                      <div
                        className={`p-3.5 rounded-[22px] text-xs font-semibold leading-relaxed shadow-sm ${
                          m.role === 'model'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                            : 'bg-emerald-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Submitting Ticket State */}
                {ticketDetails && !isTicketSubmitted && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-[11px] font-bold uppercase tracking-tight">ലോഗ് സപ്പോർട്ട് ടിക്കറ്റ്</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                      അഡ്മിന് കൈമാറി നിങ്ങളുടെ പേര് തെറ്റുകൾ, ഫോട്ടോ എന്നിവ ശരിയാക്കാൻ ഞങ്ങൾ ടിക്കറ്റ് സമർപ്പിക്കട്ടെയോ?
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleLogTicket('Spelling Correction')}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        പേര് തിരുത്തൽ (Name)
                      </button>
                      <button
                        onClick={() => handleLogTicket('Photo Re-upload')}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        ഫോട്ടോ ചേഞ്ച് ചെയ്യൽ (Photo)
                      </button>
                      <button
                        onClick={() => handleLogTicket('Receipt Verification Error')}
                        className="bg-teal-500 hover:bg-teal-600 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        റസീപ്റ്റ് പ്രശ്നം
                      </button>
                      <button
                        onClick={() => handleLogTicket('Mobile Change Request')}
                        className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        മൊബൈൽ മാറ്റൽ
                      </button>
                    </div>
                  </div>
                )}

                {/* Verification/Loading indicator */}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm text-[10px] font-black">
                        AI
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-[22px] rounded-tl-sm text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        വഴികാട്ടി AI അപ്ഡേറ്റ് ടൈപ്പുചെയ്യുന്നു...
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              {hasEnteredPhone && !isTicketSubmitted && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none">
                  <button
                    onClick={() => {
                      setHasEnteredPhone(false);
                      setVerifiedMember(null);
                      setIsGuest(false);
                      setPhone('');
                      setMessages(prev => [
                        ...prev,
                        { role: 'model', text: 'മറ്റൊരു നമ്പർ വെരിഫൈ ചെയ്യാനായി താഴെ പുതിയ കറക്റ്റ് 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.' }
                      ]);
                    }}
                    className="bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[10px] font-black text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-900 cursor-pointer shrink-0"
                  >
                    മൊബൈൽ നമ്പർ തിരുത്തുക (Change Phone)
                  </button>
                  <button
                    onClick={() => handleSendMessage(undefined, 'എന്റെ സ്റ്റാറ്റസ് എന്താണ്?')}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-350 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                  >
                    ക്വറി: എന്റ സ്റ്റാറ്റസ് എന്ത്?
                  </button>
                  <button
                    onClick={() => handleSendMessage(undefined, 'എന്റെ പേര് തിരുത്തണം പ്ലീസ്.')}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-350 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                  >
                    പേര് തിരുത്തൽ
                  </button>
                  <button
                    onClick={() => handleSendMessage(undefined, 'ഫോട്ടോ തെറ്റാണ്, മാറ്റണം.')}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-350 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                  >
                    ഫോട്ടോ അപ്ഡേറ്റ്
                  </button>
                  <button
                    onClick={() => handleSendMessage(undefined, 'സാധാരണ സംശയങ്ങൾ?')}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-350 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                  >
                    സംഘടന വിവരങ്ങൾ
                  </button>
                </div>
              )}

              {/* Dynamic input bar */}
              <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {!hasEnteredPhone ? (
                  <div className="flex flex-col gap-3">
                    <form onSubmit={handlePhoneSubmit} className="flex gap-2 w-full">
                      <input
                        type="tel"
                        value={phone}
                        maxLength={10}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder={t('chat_placeholder_phone', "10 അക്ക മൊബൈൽ നമ്പർ നൽകുക")}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-xs uppercase px-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" /> {t('chat_btn_verify', "Verify")}
                          </>
                        )}
                      </button>
                    </form>
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-[1px] bg-slate-100 dark:bg-slate-850 flex-1"></span>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide px-1">{t('chat_or', "അല്ലെങ്കിൽ (OR)")}</span>
                      <span className="h-[1px] bg-slate-100 dark:bg-slate-855 flex-1"></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSkipPhoneVerification}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/45 text-[10px] font-black uppercase text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Bot className="w-3.5 h-3.5 text-emerald-500" /> {t('chat_btn_skip', "ഫോൺ നമ്പർ ഇല്ലാതെ മലയാളത്തിൽ നേരിട്ട് ചോദിക്കുക (Public Chat)")}
                    </button>

                    <div className="flex flex-col gap-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-900 pt-2.5">
                      <div className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase text-center tracking-wider mb-1">
                        താഴെയുള്ള പൊതു സംശയങ്ങൾ ക്ലിക്ക് ചെയ്ത് അറിയാം
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickPublicQuestion('എങ്ങനെയൊരു പുതിയ മെമ്പർഷിപ്പ് എടുക്കാം?')}
                        className="w-full text-left py-2 px-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>📝 എങ്ങനെയൊരു പുതിയ മെമ്പർഷിപ്പ് എടുക്കാം?</span>
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPublicQuestion('എന്താണ് ഈ സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങളും ഉദ്ദേശങ്ങളും?')}
                        className="w-full text-left py-2 px-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 hover:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>🎯 എന്താണ് ഈ സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങൾ?</span>
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPublicQuestion('എന്തൊക്കെയാണ് നിങ്ങൾ നൽകുന്ന പ്രധാന സർവീസുകൾ?')}
                        className="w-full text-left py-2 px-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>💼 ഒഫീഷ്യൽ സർവീസുകൾ എന്തൊക്കെയാണ്?</span>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={t('chat_placeholder_msg', "ഇവിടെ ചോദിക്കൂ...")}
                      disabled={isSending}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !inputMessage.trim()}
                      className="w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
