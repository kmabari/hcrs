import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, addDoc, deleteDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firebase';

export interface OrgSettings {
  fullName: string;
  shortName: string;
  logoUrl?: string;
  animatedLogoUrl?: string;
  logoScale?: number;
  aboutUs: string;
  mission: string;
  vision: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  districtDetails: string;
  updatedAt: any;
  registrationMode?: 'normal' | 'bulk';
  whatsappEnabled?: boolean;
  whatsappNewMemberEnabled?: boolean;
  whatsappRenewalEnabled?: boolean;
  whatsappClaimEnabled?: boolean;
  announcementActive?: boolean;
  announcementText?: string;
  announcementCaseNo?: string;
  announcementCaseDate?: string;
  announcementCaseName?: string;
  announcementCourt?: string;
  announcementAdvocate?: string;
  announcementJudgeBench?: string;
  announcementTitle?: string;
  announcementImageUrl?: string;
  districtWhatsAppLinks?: Record<string, string>;
  districtWhatsAppActive?: Record<string, boolean>;
  // Payment Operations Configuration
  razorpayEnabled?: boolean;
  qrCodePaymentEnabled?: boolean;
  upiId?: string;
  upiAccountName?: string;
  qrCodeImageUrl?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  qrInstructions?: string;
  registrationFee?: number;
  renewalFee?: number;
  razorpayKeyId?: string;
  razorpayStatusNote?: string;
}

export interface GalleryItem {
  id?: string;
  url: string;
  category: string;
  title: string;
  description?: string;
  createdAt: any;
  order?: number;
  district?: string;
}

export interface Announcement {
  id?: string;
  title: string;
  text: string;
  caseDate?: string;
  caseNo?: string;
  caseName?: string;
  court?: string;
  advocate?: string;
  judgeBench?: string;
  createdAt?: any;
  active?: boolean;
  imageUrl?: string;
}

const SETTINGS_DOC_ID = 'main_config';

export const defaultSettings: OrgSettings = {
  fullName: "HIGHRICH COMMUNITY REVIVAL SOCIETY",
  shortName: "HCRS",
  logoUrl: 'https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png',
  animatedLogoUrl: 'https://i.ibb.co/d42zfDwq/782447521-1074313911653476-2779143939229298450-n.gif',
  aboutUs: `HIGHRICH COMMUNITY REVIVAL SOCIETY (HCRS) is a socio-economic organization dedicated to the welfare and revival of our community. Registered as a society, our primary objective is to empower members through collective support, education, and social initiatives. We work tirelessly to provide a platform for community members to grow, prosper, and support each other during times of need.

At HCRS, we believe that 'Unity is Strength.' By bringing together individuals from all walks of life, we aim to build a resilient community that can overcome any challenge. Our activities range from social welfare programs and educational support to member-focused revival programs that help families rebuild their lives.

Our society operates across all 14 districts of Kerala, with a strong network of dedicated committees and volunteers who work at the grass-root level to ensure every member receives the support they deserve.`,
  mission: "To revitalize our community by providing structured social and economic support through collective empowerment, education, and revival initiatives, ensuring no member is left behind.",
  vision: "To build a prosperous, self-reliant, and united community where every individual is empowered to thrive and every family lives with dignity and financial security.",
  address: "HCRS Head Office, 1st Floor, City Center, Main Road, Kasaragod, Kerala - 671121",
  phone: "+91 96459 34571",
  email: "hcrs.kerala@gmail.com",
  website: "www.hcrs-society.org",
  districtDetails: "Active in all 14 districts of Kerala with committed grass-root leadership.",
  updatedAt: new Date(),
  registrationMode: 'normal',
  whatsappEnabled: true,
  whatsappNewMemberEnabled: true,
  whatsappRenewalEnabled: true,
  whatsappClaimEnabled: true,
  announcementActive: false,
  announcementTitle: 'ഇന്നത്തെ അപ്ഡേഷൻ (Today\'s Update)',
  announcementText: '',
  announcementCaseNo: '',
  announcementCaseDate: '',
  announcementCaseName: '',
  announcementCourt: '',
  announcementAdvocate: '',
  announcementJudgeBench: '',
  announcementImageUrl: '',
  districtWhatsAppLinks: {},
  districtWhatsAppActive: {},
  // Default Payment Operations Configuration
  razorpayEnabled: false, // Default false while verification is pending
  qrCodePaymentEnabled: true, // Default true to maintain active QR payments
  upiId: 'hcrs.kerala@okaxis',
  upiAccountName: 'HIGHRICH COMMUNITY REVIVAL SOCIETY',
  qrCodeImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=hcrs.kerala@okaxis%26pn=HIGHRICH%20COMMUNITY%20REVIVAL%20SOCIETY%26cu=INR',
  bankName: 'State Bank of India (SBI)',
  accountNumber: '41235678901',
  ifscCode: 'SBIN0070123',
  branchName: 'Kasaragod Main Branch',
  qrInstructions: 'Scan the official HCRS QR Code or pay using UPI ID. After completing payment in your UPI app, copy and enter the 12-digit UPI Reference / UTR Number below to complete registration.',
  registrationFee: 200,
  renewalFee: 100,
  razorpayKeyId: 'rzp_live_HCRSKerala9645',
  razorpayStatusNote: 'Razorpay KYC / Bank verification is currently under review. Enable toggle once approved.'
};

export async function getOrgSettings(): Promise<OrgSettings> {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as OrgSettings;
      try {
        localStorage.setItem('hcrs_cached_org_settings', JSON.stringify(data));
      } catch (e) {
        console.warn("localStorage set failed:", e);
      }
      return data;
    }
    return defaultSettings;
  } catch (error) {
    // Gracefully fallback to cached settings or defaults if offline
    try {
      const cached = localStorage.getItem('hcrs_cached_org_settings');
      if (cached) {
        return JSON.parse(cached) as OrgSettings;
      }
    } catch (e) {
      console.warn("localStorage read failed:", e);
    }
    return defaultSettings;
  }
}

export async function saveOrgSettings(settings: Partial<OrgSettings>) {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeToOrgSettings(callback: (settings: OrgSettings) => void) {
  return onSnapshot(doc(db, 'settings', SETTINGS_DOC_ID), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as OrgSettings;
      try {
        localStorage.setItem('hcrs_cached_org_settings', JSON.stringify(data));
      } catch (e) {
        console.warn("localStorage set failed:", e);
      }
      callback(data);
    } else {
      callback(defaultSettings);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `settings/${SETTINGS_DOC_ID}`);
    try {
      const cached = localStorage.getItem('hcrs_cached_org_settings');
      if (cached) {
        callback(JSON.parse(cached) as OrgSettings);
        return;
      }
    } catch (e) {
      console.warn("localStorage read fallback failed:", e);
    }
    callback(defaultSettings);
  });
}

export async function addGalleryItem(item: Omit<GalleryItem, 'id' | 'createdAt'>) {
  const collRef = collection(db, 'gallery');
  return await addDoc(collRef, {
    ...item,
    createdAt: serverTimestamp(),
    order: item.order !== undefined ? item.order : 0
  });
}

export async function updateGalleryItem(id: string, updates: Partial<GalleryItem>) {
  const docRef = doc(db, 'gallery', id);
  await updateDoc(docRef, updates);
}

export async function deleteGalleryItem(id: string) {
  const docRef = doc(db, 'gallery', id);
  await deleteDoc(docRef);
}

export function subscribeToGallery(callback: (items: GalleryItem[]) => void) {
  const q = query(collection(db, 'gallery'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GalleryItem[];
    // Sort items primarily by 'order' (ascending) and secondarily by 'createdAt' (descending)
    items.sort((a, b) => {
      const orderA = a.order !== undefined ? Number(a.order) : 0;
      const orderB = b.order !== undefined ? Number(b.order) : 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
    try {
      localStorage.setItem('hcrs_cached_gallery', JSON.stringify(items));
    } catch (e) {
      console.warn("localStorage set gallery failed:", e);
    }
    callback(items);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'gallery');
    try {
      const cached = localStorage.getItem('hcrs_cached_gallery');
      if (cached) {
        callback(JSON.parse(cached) as GalleryItem[]);
        return;
      }
    } catch (e) {
      console.warn("localStorage read gallery failed:", e);
    }
    callback([]);
  });
}

export function subscribeToGalleryCategories(callback: (categories: string[]) => void) {
  const DEFAULT_CATEGORIES = [
    'Membership Campaigns',
    'Welfare Activities',
    'Financial Support',
    'State Committee',
    'District Committee',
    'Mandalam Committee',
    'Society Programs',
    'Public Meetings',
    'Legal Activities',
    'Community Support Activities',
    'Other Events'
  ];

  const collRef = collection(db, 'gallery_categories');
  return onSnapshot(collRef, async (snapshot) => {
    if (snapshot.empty) {
      // Return defaults immediately to avoid UI stall
      callback(DEFAULT_CATEGORIES);
      try {
        for (const cat of DEFAULT_CATEGORIES) {
          await addDoc(collRef, { name: cat, createdAt: serverTimestamp() });
        }
      } catch (err) {
        console.warn("Auto-seeding categories note:", err);
      }
    } else {
      const categories: string[] = [];
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.name) {
          categories.push(data.name);
        }
      });
      // Sort alphabetically
      categories.sort((a, b) => a.localeCompare(b));
      try {
        localStorage.setItem('hcrs_cached_gallery_categories', JSON.stringify(categories));
      } catch (e) {
        console.warn("localStorage set gallery_categories failed:", e);
      }
      callback(categories.length > 0 ? categories : DEFAULT_CATEGORIES);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'gallery_categories');
    try {
      const cached = localStorage.getItem('hcrs_cached_gallery_categories');
      if (cached) {
        callback(JSON.parse(cached) as string[]);
        return;
      }
    } catch (e) {
      console.warn("localStorage read gallery_categories failed:", e);
    }
    callback(DEFAULT_CATEGORIES);
  });
}

export async function addGalleryCategory(name: string) {
  const collRef = collection(db, 'gallery_categories');
  const snap = await getDocs(collRef);
  const exists = snap.docs.some(docSnap => docSnap.data()?.name?.trim().toLowerCase() === name.trim().toLowerCase());
  if (!exists) {
    await addDoc(collRef, { name: name.trim(), createdAt: serverTimestamp() });
  }
}

export async function deleteGalleryCategory(name: string) {
  const collRef = collection(db, 'gallery_categories');
  const snap = await getDocs(collRef);
  const matchingDoc = snap.docs.find(docSnap => docSnap.data()?.name?.trim().toLowerCase() === name.trim().toLowerCase());
  if (matchingDoc) {
    await deleteDoc(doc(db, 'gallery_categories', matchingDoc.id));
  }
}

export async function addAnnouncement(item: Omit<Announcement, 'id' | 'createdAt'>) {
  const collRef = collection(db, 'announcements');
  return await addDoc(collRef, {
    ...item,
    createdAt: serverTimestamp()
  });
}

export async function updateAnnouncement(id: string, item: Partial<Announcement>) {
  const docRef = doc(db, 'announcements', id);
  await updateDoc(docRef, item);
}

export async function deleteAnnouncement(id: string) {
  const docRef = doc(db, 'announcements', id);
  await deleteDoc(docRef);
}

export function subscribeToAnnouncements(callback: (items: Announcement[]) => void) {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Announcement[];
    try {
      localStorage.setItem('hcrs_cached_announcements', JSON.stringify(items));
    } catch (e) {
      console.warn("localStorage set announcements failed:", e);
    }
    callback(items);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'announcements');
    try {
      const cached = localStorage.getItem('hcrs_cached_announcements');
      if (cached) {
        callback(JSON.parse(cached) as Announcement[]);
        return;
      }
    } catch (e) {
      console.warn("localStorage read announcements failed:", e);
    }
    callback([]);
  });
}

export interface CommitteeMember {
  id?: string;
  name: string;
  nameMl?: string;
  designation: string;
  designationMl?: string;
  level: 'state' | 'district' | 'mandalam';
  district?: string; // district code, e.g. 'TCR'
  mandalam?: string; // mandalam name, e.g. 'Guruvayur'
  imageUrl?: string;
  order?: number;
  createdAt?: any;
}

export async function addCommitteeMember(member: Omit<CommitteeMember, 'id' | 'createdAt'>) {
  const collRef = collection(db, 'committees');
  const cleanMember = Object.fromEntries(
    Object.entries(member).filter(([_, v]) => v !== undefined)
  );
  return await addDoc(collRef, {
    ...cleanMember,
    createdAt: serverTimestamp(),
    order: member.order !== undefined ? member.order : 0
  });
}

export async function updateCommitteeMember(id: string, updates: Partial<CommitteeMember>) {
  const docRef = doc(db, 'committees', id);
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );
  await updateDoc(docRef, cleanUpdates);
}

export async function deleteCommitteeMember(id: string) {
  const docRef = doc(db, 'committees', id);
  await deleteDoc(docRef);
}

export function subscribeToCommitteeMembers(
  callback: (items: CommitteeMember[]) => void,
  errorCallback?: (error: Error) => void
) {
  const q = query(collection(db, 'committees'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CommitteeMember[];
    
    // Sort items by order (asc) and name (asc)
    items.sort((a, b) => {
      const orderA = a.order !== undefined ? Number(a.order) : 0;
      const orderB = b.order !== undefined ? Number(b.order) : 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    
    try {
      localStorage.setItem('hcrs_cached_committees', JSON.stringify(items));
    } catch (e) {
      console.warn("localStorage set committees failed:", e);
    }
    callback(items);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'committees');
    try {
      const cached = localStorage.getItem('hcrs_cached_committees');
      if (cached) {
        callback(JSON.parse(cached) as CommitteeMember[]);
        return;
      }
    } catch (e) {
      console.warn("localStorage read committees failed:", e);
    }
    if (errorCallback) {
      errorCallback(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// Campaign Templates Section (Operation Janamail)
export interface JanamailConfig {
  id?: string;
  recipients: string;
  cc: string;
  active: boolean;
  campaignName?: string;
  campaignTagline?: string;
  startDate?: string;
  endDate?: string;
  artworkUrl?: string;
  campaignIntroduction?: string;
  whyThisCampaign?: string;
  importantNotice?: string;
  termsAndConditions?: string;
  disclaimer?: string;
  confirmations?: string[];
  faqItems?: { question: string; answer: string }[];
  thankYouMessage?: string;
  writeMyOwnEnabled?: boolean;
  campaignStatus?: "draft" | "live" | "disabled" | "completed";
  emailMode?: "templates" | "custom" | "both";
  lastUpdated?: any;
  mainNoticeTitle?: string;
  whyCampaignHeading?: string;
  confirmationSectionTitle?: string;
  confirmationSectionDescription?: string;
  restrictOneParticipation?: boolean;
}

export interface CampaignTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  priority: number;
  recipients?: string;
  cc?: string;
  lastUpdated?: any;
}

export function subscribeToJanamailConfig(callback: (config: JanamailConfig) => void) {
  const docRef = doc(db, 'settings', 'janamail_config');
  const defaultConf: JanamailConfig = {
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com",
    cc: "",
    active: true,
    campaignName: "Operation Janamail",
    campaignTagline: "പൊതുപങ്കാളിത്തത്തോടെയുള്ള ഇമെയിൽ ഹർജി ക്യാമ്പയിൻ",
    startDate: "",
    endDate: "",
    artworkUrl: "",
    campaignIntroduction: "ഓരോ പൗരനും അവരുടെ അഭിപ്രായങ്ങളും ആവശ്യങ്ങളും ബന്ധപ്പെട്ട സർക്കാർ അധികാരികളെ മാന്യവും ഉത്തരവാദിത്തപരവുമായി അറിയിക്കാൻ സഹായിക്കുന്ന ഒരു പൊതുപങ്കാളിത്ത ഇ-മെയിൽ ക്യാമ്പയിനാണ് Operation Janamail.",
    whyThisCampaign: "ഹൈറിച്ച് തട്ടിപ്പ് കേസിലെ ഇരകൾക്ക് നീതി ലഭിക്കുന്നതിനും തട്ടിപ്പുകാർക്കെതിരെ മാതൃകാപരമായ ശിക്ഷാനടപടികൾ സ്വീകരിക്കുന്നതിനും ശക്തമായ അന്വേഷണം ആവശ്യപ്പെട്ട് ഞങ്ങൾ അധികാരികളിലേക്ക് ഈ ഹർജി സമർപ്പിക്കുന്നു.",
    importantNotice: "ദയവായി ഇമെയിൽ അയയ്ക്കുന്നതിനു മുൻപായി നിങ്ങളുടെ വിവരങ്ങൾ കൃത്യമാണെന്നും ഇമെയിൽ ബോഡി ശ്രദ്ധാപൂർവ്വം വായിച്ചിട്ടുണ്ടെന്നും ഉറപ്പാക്കുക. നിയമപരമായ ആവശ്യങ്ങൾക്ക് മാത്രമേ ഈ ക്യാമ്പയിൻ ഉപയോഗിക്കുകയുള്ളൂ.",
    faqItems: [
      { question: "ഈ ക്യാമ്പയിൻ എന്തിനാണ്?", answer: "പൊതുജനങ്ങളുടെ അഭിപ്രായം ബന്ധപ്പെട്ട അധികാരികൾക്ക് ഇമെയിൽ വഴി അറിയിക്കാനാണ്." },
      { question: "ഇത് നിയമപരമാണോ?", answer: "നിയമപരവും ഉത്തരവാദിത്തത്തോടെയും മാത്രമേ ഈ സംവിധാനം ഉപയോഗിക്കാവൂ." },
      { question: "സ്പാം അയക്കാമോ?", answer: "ഇല്ല. ഒരേ സന്ദേശം ആവർത്തിച്ച് അയക്കുന്നത് ഒഴിവാക്കണം." }
    ],
    disclaimer: "ഈ ക്യാമ്പയിൻ പൊതുജനങ്ങൾക്ക് വിവരങ്ങൾ നൽകുന്നതിനായുള്ളതാണ്. എല്ലാ ഇമെയിലുകളും നിയമപരമായും ഉത്തരവാദിത്തത്തോടെയും മാത്രം ഉപയോഗിക്കണം. സ്പാം സന്ദേശങ്ങൾ അയയ്ക്കരുത്.",
    termsAndConditions: "ഈ ക്യാമ്പയിനിൽ പങ്കെടുക്കുന്നതിലൂടെ നിങ്ങൾ പൂർണ്ണമായും സത്യസന്ധമായ വിവരങ്ങൾ മാത്രമേ നൽകുന്നുള്ളൂ എന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. ദുരുപയോഗം നിയമപരമായ നടപടികൾക്ക് കാരണമായേക്കാം.",
    confirmations: [
      "ഞാൻ നൽകിയിട്ടുള്ള എല്ലാ വിവരങ്ങളും സത്യസന്ധവും കൃത്യവുമാണ് എന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു.",
      "എന്റെ അറിവോടെയും സമ്മതത്തോടെയുമാണ് ഈ ഹർജി അയക്കുന്നത്.",
      "ഈ ക്യാമ്പയിന്റെ എല്ലാ നിബന്ധനകളും വ്യവസ്ഥകളും ഞാൻ വായിച്ചു മനസ്സിലാക്കി അംഗീകരിക്കുന്നു.",
      "കേരള സർക്കാരിന്റെയും മറ്റ് അന്വേഷണ ഏജൻസികളുടെയും സുതാര്യമായ അന്വേഷണത്തിന് ഞാൻ പിന്തുണ പ്രഖ്യാപിക്കുന്നു."
    ],
    thankYouMessage: "ഹർജി വിജയകരമായി സമർപ്പിച്ചു. നന്ദി!",
    writeMyOwnEnabled: true,
    campaignStatus: "live",
    emailMode: "both",
    mainNoticeTitle: "Operation Janamail – പ്രധാന അറിയിപ്പ്",
    whyCampaignHeading: "എന്തുകൊണ്ടാണ് Operation Janamail?",
    confirmationSectionTitle: "സ്ഥിരീകരണം (Mandatory)",
    confirmationSectionDescription: "മേൽപ്പറഞ്ഞ കാര്യങ്ങൾ സ്ഥിരീകരിച്ച ശേഷം താഴെയുള്ള Continue to Gmail ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ ജിമെയിലിൽ ഈ കത്തും വിഷയവും തനിയെ ലോഡ് ചെയ്യപ്പെടും.",
    restrictOneParticipation: true
  };

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({ id: 'janamail_config', ...defaultConf });
    } else {
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        recipients: data?.recipients || defaultConf.recipients,
        cc: data?.cc || defaultConf.cc,
        active: data?.active !== undefined ? data?.active : defaultConf.active,
        campaignName: data?.campaignName || defaultConf.campaignName,
        campaignTagline: data?.campaignTagline || defaultConf.campaignTagline,
        startDate: data?.startDate || "",
        endDate: data?.endDate || "",
        artworkUrl: data?.artworkUrl || "",
        campaignIntroduction: data?.campaignIntroduction || defaultConf.campaignIntroduction,
        whyThisCampaign: data?.whyThisCampaign || defaultConf.whyThisCampaign,
        importantNotice: data?.importantNotice || defaultConf.importantNotice,
        faqItems: data?.faqItems || defaultConf.faqItems,
        disclaimer: data?.disclaimer || defaultConf.disclaimer,
        termsAndConditions: data?.termsAndConditions || defaultConf.termsAndConditions,
        confirmations: data?.confirmations || defaultConf.confirmations,
        thankYouMessage: data?.thankYouMessage || defaultConf.thankYouMessage,
        writeMyOwnEnabled: data?.writeMyOwnEnabled !== undefined ? data?.writeMyOwnEnabled : defaultConf.writeMyOwnEnabled,
        campaignStatus: data?.campaignStatus || defaultConf.campaignStatus,
        emailMode: data?.emailMode || defaultConf.emailMode,
        mainNoticeTitle: data?.mainNoticeTitle || defaultConf.mainNoticeTitle,
        whyCampaignHeading: data?.whyCampaignHeading || defaultConf.whyCampaignHeading,
        confirmationSectionTitle: data?.confirmationSectionTitle || defaultConf.confirmationSectionTitle,
        confirmationSectionDescription: data?.confirmationSectionDescription || defaultConf.confirmationSectionDescription,
        restrictOneParticipation: data?.restrictOneParticipation !== undefined ? data?.restrictOneParticipation : defaultConf.restrictOneParticipation,
        lastUpdated: data?.lastUpdated
      });
    }
  }, (err) => {
    // Graceful fallback for offline or unauthenticated users
    callback({ id: 'janamail_config', ...defaultConf });
  });
}

export async function updateJanamailConfig(updates: Partial<JanamailConfig>) {
  const docRef = doc(db, 'settings', 'janamail_config');
  await setDoc(docRef, {
    ...updates,
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

export async function addCampaignTemplate(template: Omit<CampaignTemplate, 'id' | 'lastUpdated'>) {
  const collRef = collection(db, 'campaign_templates');
  return await addDoc(collRef, {
    ...template,
    lastUpdated: serverTimestamp()
  });
}

export async function updateCampaignTemplate(id: string, updates: Partial<CampaignTemplate>) {
  const docRef = doc(db, 'campaign_templates', id);
  await updateDoc(docRef, {
    ...updates,
    lastUpdated: serverTimestamp()
  });
}

export async function deleteCampaignTemplate(id: string) {
  const docRef = doc(db, 'campaign_templates', id);
  await deleteDoc(docRef);
}

const INITIAL_TEMPLATES: Omit<CampaignTemplate, 'id' | 'lastUpdated'>[] = [
  {
    name: "അടിയന്തര നടപടിയും നീതിയും ആവശ്യപ്പെട്ട് (Demand Action & Justice)",
    subject: "ഹൈറിച്ച് തട്ടിപ്പ്: ഇരകൾക്ക് നീതി നൽകുക",
    body: `ബഹുമാനപ്പെട്ട മുഖ്യമന്ത്രി മുൻപാകെ,
ഹൈറിച്ച് തട്ടിപ്പിൽ പെട്ട എന്റെ പണം തിരികെ ലഭിക്കാൻ അടിയന്തര ഇടപെടൽ ആവശ്യപ്പെടുന്നു. പ്രതികളുടെ സ്വത്തുക്കൾ അടിയന്തരമായി ലേലം ചെയ്യണം.

പേര്: {name}
ഫോൺ: {phone}
സ്ഥലം: {address}`,
    active: true,
    priority: 1,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "സ്വത്തുക്കൾ കണ്ടുകെട്ടാൻ ആവശ്യപ്പെട്ട് (Confiscate Properties)",
    subject: "ഹൈറിച്ച് കേസ്: സ്വത്തുക്കൾ കണ്ടുകെട്ടുക",
    body: `ബഹുമാനപ്പെട്ട മുഖ്യമന്ത്രി മുൻപാകെ,
ഹൈറിച്ച് നിക്ഷേപ തട്ടിപ്പിലെ പ്രതികളുടെ മുഴുവൻ സ്വത്തുക്കളും BUDS നിയമപ്രകാരം അടിയന്തരമായി കണ്ടുകെട്ടി ലേലം ചെയ്യണമെന്ന് ആവശ്യപ്പെടുന്നു.

പേര്: {name}
ഫോൺ: {phone}
സ്ഥലം: {address}`,
    active: true,
    priority: 2,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "BUDS നിയമപ്രകാരമുള്ള നടപടികൾക്ക് (Action under BUDS Act)",
    subject: "ഹൈറിച്ച് കേസ്: BUDS നിയമപ്രകാരമുള്ള നടപടി",
    body: `ബഹുമാനപ്പെട്ട മുഖ്യമന്ത്രി മുൻപാകെ,
ഹൈറിച്ച് തട്ടിപ്പ് കേസിൽ പ്രതികൾക്കെതിരെ BUDS നിയമപ്രകാരമുള്ള നടപടികൾ വേഗത്തിലാക്കി ഇരകളുടെ പണം തിരികെ ലഭ്യമാക്കാൻ അപേക്ഷിക്കുന്നു.

പേര്: {name}
ഫോൺ: {phone}
സ്ഥലം: {address}`,
    active: true,
    priority: 3,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "സുതാര്യമായ അന്വേഷണം ആവശ്യപ്പെട്ട് (Transparent Investigation)",
    subject: "ഹൈറിച്ച് തട്ടിപ്പ്: സുതാര്യമായ അന്വേഷണം",
    body: `ബഹുമാനപ്പെട്ട മുഖ്യമന്ത്രി മുൻപാകെ,
ഹൈറിച്ച് തട്ടിപ്പ് കേസിൽ സമയബന്ധിതവും സുതാര്യവുമായ അന്വേഷണം ഉറപ്പാക്കി കുറ്റവാളികളെ നിയമത്തിന് മുന്നിൽ കൊണ്ടുവരണമെന്ന് അപേക്ഷിക്കുന്നു.

പേര്: {name}
ഫോൺ: {phone}
സ്ഥലം: {address}`,
    active: true,
    priority: 4,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "അടിയന്തര സർക്കാർ ഇടപെടലിന് (Government Intervention)",
    subject: "ഹൈറിച്ച് കേസ്: അടിയന്തര സർക്കാർ ഇടപെടൽ",
    body: `ബഹുമാനപ്പെട്ട മുഖ്യമന്ത്രി മുൻപാകെ,
ഹൈറിച്ച് തട്ടിപ്പ് കാരണം ദുരിതമനുഭവിക്കുന്ന സാധാരണക്കാരായ ആയിരക്കണക്കിന് കുടുംബങ്ങളെ രക്ഷിക്കാൻ അടിയന്തര സർക്കാർ ഇടപെടൽ ആവശ്യപ്പെടുന്നു.

പേര്: {name}
ഫോൺ: {phone}
സ്ഥലം: {address}`,
    active: true,
    priority: 5,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  }
];

export function subscribeToCampaignTemplates(callback: (items: CampaignTemplate[]) => void) {
  const collRef = collection(db, 'campaign_templates');
  return onSnapshot(collRef, async (snapshot) => {
    if (snapshot.empty) {
      // Seed initial templates
      try {
        for (const tmpl of INITIAL_TEMPLATES) {
          await addDoc(collRef, {
            ...tmpl,
            lastUpdated: serverTimestamp()
          });
        }
      } catch (err) {
        console.error("Seeding campaign templates failed:", err);
      }
    } else {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CampaignTemplate[];

      // Sort by priority (ascending)
      items.sort((a, b) => {
        const pA = a.priority !== undefined ? Number(a.priority) : 999;
        const pB = b.priority !== undefined ? Number(b.priority) : 999;
        return pA - pB;
      });

      try {
        localStorage.setItem('hcrs_cached_campaign_templates', JSON.stringify(items));
      } catch (e) {
        console.warn("localStorage set campaign_templates failed:", e);
      }
      callback(items);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'campaign_templates');
    try {
      const cached = localStorage.getItem('hcrs_cached_campaign_templates');
      if (cached) {
        callback(JSON.parse(cached) as CampaignTemplate[]);
        return;
      }
    } catch (e) {
      console.warn("localStorage read campaign_templates failed:", e);
    }
    callback([]);
  });
}

export { normalizeImageUrl } from './imageUrlUtils';



