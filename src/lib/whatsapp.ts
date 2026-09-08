import { UserProfile } from '../types';
import { SHARED_URL } from '../constants';

export const getBaseUrl = () => {
  const VERCEL_URL = 'https://hcrs-kappa.vercel.app';
  return typeof window !== 'undefined' && 
    !window.location.origin.includes('ais-dev') && 
    !window.location.origin.includes('ais-pre') && 
    !window.location.origin.includes('localhost') && 
    !window.location.origin.includes('127.0.0.1') && 
    !window.location.origin.includes('google.com')
      ? window.location.origin 
      : VERCEL_URL;
};

// 1. New Membership Welcome & Credentials Message
export const getWAMessage = (member: { name: string, mobile: string, uid: string, pin?: string, membershipId?: string, district?: string }) => {
  const baseUrl = getBaseUrl();
  const magicLink = `${baseUrl}/?memberId=${member.uid}`;
  const cleanMobile = (member.mobile || '').replace(/\D/g, '').slice(-10);
  
  return `അഭിനന്ദനങ്ങൾ! താങ്കളുടെ HCRS മെമ്പർഷിപ്പ് അപ്പ്രൂവ് ചെയ്തിരിക്കുന്നു. താങ്കൾക്ക് എച്ച്.സി.ആർ.എസിലേക്ക് (HCRS) സ്വാഗതം.

മെമ്പർ പേര്: ${member.name}
മെമ്പർഷിപ്പ് ഐഡി: ${member.membershipId || cleanMobile}
യൂസർ ഐഡി: ${cleanMobile}
പാസ്സ്‌വേർഡ്: ${member.pin || '123456'}

താഴെ കാണുന്ന ലിങ്കിൽ ക്ലിക്ക് ചെയ്താൽ താങ്കളുടെ ഒഫീഷ്യൽ മെമ്പർഷിപ്പ് കാർഡ് ലഭിക്കുന്നതാണ്:
${magicLink}

Highrich Community Revival Society (HCRS) Kerala State Committee.`;
};

export const sendWAMessage = (member: { name: string, mobile: string, uid: string, pin?: string, membershipId?: string, district?: string }) => {
  const cleanMobile = (member.mobile || '').replace(/\D/g, '').slice(-10);
  if (!cleanMobile) return;
  const message = getWAMessage(member);
  try {
    window.open(`https://api.whatsapp.com/send?phone=91${cleanMobile}&text=${encodeURIComponent(message)}`, '_blank');
  } catch (err) {
    console.warn("Failed to open WhatsApp window:", err);
  }
};

// 2. Membership Renewal Confirmation Message
export const getWARenewalMessage = (member: { 
  name: string, 
  mobile: string, 
  uid: string, 
  membershipId?: string, 
  transactionId?: string,
  amount?: number | string,
  expiryDate?: string
}) => {
  const baseUrl = getBaseUrl();
  const magicLink = `${baseUrl}/?memberId=${member.uid}`;
  const cleanMobile = (member.mobile || '').replace(/\D/g, '').slice(-10);

  return `അഭിനന്ദനങ്ങൾ! താങ്കളുടെ HCRS മെമ്പർഷിപ്പ് വിജയകരമായി പുതുക്കിയിരിക്കുന്നു (Renewal Successful).

മെമ്പർ പേര്: ${member.name}
മെമ്പർഷിപ്പ് ഐഡി: ${member.membershipId || cleanMobile}
യൂസർ ഐഡി: ${cleanMobile}
${member.transactionId ? `റഫറൻസ് / പെയ്മെന്റ് ഐഡി: ${member.transactionId}\n` : ''}${member.amount ? `തുക: ₹${member.amount}\n` : ''}${member.expiryDate ? `പുതിയ കാലാവധി: ${member.expiryDate}\n` : 'സർവീസ് കാലാവധി 1 വർഷത്തേക്ക് കൂടി ദീർഘിപ്പിച്ചിരിക്കുന്നു.\n'}
പുതുക്കിയ ഡിജിറ്റൽ മെമ്പർഷിപ്പ് കാർഡ് കാണാൻ താഴെയുള്ള ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക:
${magicLink}

Highrich Community Revival Society (HCRS) Kerala State Committee.`;
};

export const sendWARenewalMessage = (member: { 
  name: string, 
  mobile: string, 
  uid: string, 
  membershipId?: string, 
  transactionId?: string,
  amount?: number | string,
  expiryDate?: string
}) => {
  const cleanMobile = (member.mobile || '').replace(/\D/g, '').slice(-10);
  if (!cleanMobile) return;
  const message = getWARenewalMessage(member);
  try {
    window.open(`https://api.whatsapp.com/send?phone=91${cleanMobile}&text=${encodeURIComponent(message)}`, '_blank');
  } catch (err) {
    console.warn("Failed to open WhatsApp window:", err);
  }
};

// 3. Support / Settlement Claim Form Submission Message
export const getWAClaimMessage = (claim: {
  userName: string;
  userMobile: string;
  tokenNo?: string | number;
  tokensList?: string[];
  totalPaid?: number | string;
  totalReceived?: number | string;
  totalPending?: number | string;
  categories?: string[];
  district?: string;
}) => {
  const cleanMobile = (claim.userMobile || '').replace(/\D/g, '').slice(-10);
  const tokenDisplay = claim.tokensList && claim.tokensList.length > 0 
    ? claim.tokensList.join(', ') 
    : (claim.tokenNo ? `#${claim.tokenNo}` : 'Submitted');

  const paidNum = typeof claim.totalPaid === 'number' ? claim.totalPaid : parseFloat(String(claim.totalPaid || 0)) || 0;
  const recNum = typeof claim.totalReceived === 'number' ? claim.totalReceived : parseFloat(String(claim.totalReceived || 0)) || 0;
  const penNum = typeof claim.totalPending === 'number' ? claim.totalPending : parseFloat(String(claim.totalPending || 0)) || (paidNum - recNum);

  return `പ്രിയ ${claim.userName},
താങ്കളുടെ HCRS സഹായധന / സെറ്റിൽമെന്റ് ക്ലെയിം ഫോം വിജയകരമായി സബ്മിറ്റ് ചെയ്തിരിക്കുന്നു.

ടോക്കൺ നമ്പർ: ${tokenDisplay}
മെമ്പർ പേര്: ${claim.userName}
മൊബൈൽ നമ്പർ: ${cleanMobile}
${claim.district ? `ജില്ല: ${claim.district}\n` : ''}--------------------------------
ആകെ നിക്ഷേപിച്ചത് (Total Paid): ₹${paidNum.toLocaleString('en-IN')}
തിരികെ ലഭിച്ചത് (Total Received): ₹${recNum.toLocaleString('en-IN')}
ബാക്കി ലഭിക്കാനുള്ള തുക (Total Pending): ₹${penNum.toLocaleString('en-IN')}
--------------------------------
${claim.categories && claim.categories.length > 0 ? `ക്ലെയിം ചെയ്ത ഇനങ്ങൾ: ${claim.categories.join(', ')}\n\n` : ''}താങ്കളുടെ അപേക്ഷ നിയമപരമായി പരിശോധിച്ച് തുടർനടപടികൾ സ്വീകരിക്കുന്നതാണ്. കൂടുതൽ വിവരങ്ങൾക്ക് HCRS ജില്ലാ കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക.

Highrich Community Revival Society (HCRS) Kerala State Committee.`;
};

export const sendWAClaimMessage = (claim: {
  userName: string;
  userMobile: string;
  tokenNo?: string | number;
  tokensList?: string[];
  totalPaid?: number | string;
  totalReceived?: number | string;
  totalPending?: number | string;
  categories?: string[];
  district?: string;
}) => {
  const cleanMobile = (claim.userMobile || '').replace(/\D/g, '').slice(-10);
  if (!cleanMobile) return;
  const message = getWAClaimMessage(claim);
  try {
    window.open(`https://api.whatsapp.com/send?phone=91${cleanMobile}&text=${encodeURIComponent(message)}`, '_blank');
  } catch (err) {
    console.warn("Failed to open WhatsApp window:", err);
  }
};

