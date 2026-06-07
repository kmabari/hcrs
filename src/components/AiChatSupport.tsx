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
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AiChatSupport() {
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

  // Initiate Chatbot with greeting message
  const initChat = () => {
    setMessages([
      {
        role: 'model',
        text: 'ഹലോ! ഞാൻ വഴികാട്ടി AI അസിസ്റ്റന്റ് ആണ്. നിങ്ങൾക്ക് എന്തു സഹായമാണ് വേണ്ടത്? നിങ്ങളുടെ മെമ്പർഷിപ്പ് വിഭരങ്ങൾ പരിശോധിക്കാനായി ദയവായി നിങ്ങളുടെ 10 അക്ക മൊബൈൽ നമ്പർ താഴെ നൽകുക.'
      }
    ]);
  };

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
      const q = query(usersRef, where('mobile', '==', cleanPhone));
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

  const getAndSetGreetingFromAI = async (member: any, phoneNum: string, currentHistory: Message[]) => {
    setIsSending(true);
    try {
      const prompt = member 
        ? `[SYSTEM: User verified mobile: ${phoneNum}. Name: ${member.name}. Mobile: ${member.mobile || 'N/A'}. ID: ${member.membershipId || 'Pending'}. Status: ${member.status}. Introduce yourself warmly to ${member.name}, confirm their account look up is successful, and ask how you can help them today with HCRS.]`
        : `[SYSTEM: User typed mobile ${phoneNum}, but no profile exists. Politely welcome them as a guest, mention that they are not registered in the database, and ask how you can help them.]`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: currentHistory.slice(-8),
          verifiedMember: member
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          { role: 'model', text: data.text }
        ]);
      } else {
        const fallbackText = member 
          ? `ഹലോ ${member.name}! താങ്കളുടെ പ്രൊഫൈൽ വിജയകരമായി കണ്ടെത്തിയിട്ടുണ്ട്. നിങ്ങൾക്ക് എന്ത് സഹായമാണ് നൽകേണ്ടത്?`
          : `ഹലോ സുഹൃത്തേ, നൽകിയ നമ്പറിൽ പ്രൊഫൈൽ ഒന്നും കണ്ടെത്തിയില്ല. എന്താണ് താങ്കൾക്ക് ചോദിക്കാനുള്ളത്?`;
        setMessages(prev => [
          ...prev,
          { role: 'model', text: fallbackText }
        ]);
      }
    } catch (e) {
      console.error(e);
      const fallbackText = member 
        ? `ഹലോ ${member.name}! താങ്കളുടെ പ്രൊഫൈൽ വിജയകരമായി കണ്ടെത്തിയിട്ടുണ്ട്. നിങ്ങൾക്ക് എന്ത് സഹായമാണ് നൽകേണ്ടത്?`
        : `ഹലോ സുഹൃത്തേ, നൽകിയ നമ്പറിൽ പ്രൊഫൈൽ ഒന്നും കണ്ടെത്തിയില്ല. എന്താണ് താങ്കൾക്ക് ചോദിക്കാനുള്ളത്?`;
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
        const q = query(usersRef, where('mobile', '==', digitOnly));
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

      if (!response.ok) {
        let errMessage = 'Failed to query API';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMessage = errData.error;
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);

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
      setMessages(prev => [
        ...prev,
        { role: 'model', text: `ക്ഷമിക്കണം, എനിക്ക് കണക്ഷൻ ലഭിക്കുന്നില്ല (${displayMsg}). എന്നാൽ നിങ്ങളുടെ പ്രശ്നങ്ങൾ പരിഹരിക്കാനായി ഞാൻ എപ്പോഴും കൂടെയുണ്ട്.` }
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
                  <form onSubmit={handlePhoneSubmit} className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="10 അക്ക മൊബൈൽ നമ്പർ നൽകുക"
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
                          <UserCheck className="w-4 h-4" /> Verify
                        </>
                      )}
                    </button>
                  </form>
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
                      placeholder="ഇവിടെ ചോദിക്കൂ..."
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
