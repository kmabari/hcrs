import { UserProfile } from '../types';
import { SHARED_URL } from '../constants';

export const getWAMessage = (member: { name: string, mobile: string, uid: string, pin?: string, membershipId?: string }) => {
  const FALLBACK_URL = SHARED_URL;
  const baseUrl = typeof window !== 'undefined' && 
    !window.location.origin.includes('ais-dev') && 
    !window.location.origin.includes('ais-pre') && 
    !window.location.origin.includes('localhost') && 
    !window.location.origin.includes('127.0.0.1') && 
    !window.location.origin.includes('google.com')
      ? window.location.origin 
      : FALLBACK_URL;
  
  const magicLink = `${baseUrl}/?memberId=${member.uid}`;
  
  return `അഭിനന്ദനങ്ങൾ! താങ്കളുടെ HCRS മെമ്പർഷിപ്പ് അപ്പ്രൂവ് ചെയ്തിരിക്കുന്നു. താങ്കൾക്ക് എച്ച് സി ആർ എസിലേക്ക് സ്വാഗതം. കാണാൻ ലിങ്ക് ഓപ്പൺ ചെയ്യുക. താഴെ പറയുന്ന ലിങ്കിൽ നിന്നും താങ്കളുടെ മെമ്പർഷിപ്പ് കാർഡ് ലഭിക്കുന്നതാണ്:

യൂസർ ഐഡി: ${member.mobile}
പാസ്സ്‌വേർഡ്: ${member.pin || '123456'}

ലിങ്ക്: ${magicLink}`;
};

export const sendWAMessage = (member: { name: string, mobile: string, uid: string, pin?: string, membershipId?: string }) => {
  const message = getWAMessage(member);
  window.open(`https://api.whatsapp.com/send?phone=91${member.mobile}&text=${encodeURIComponent(message)}`, '_blank');
};
