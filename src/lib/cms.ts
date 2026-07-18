import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, addDoc, deleteDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firebase';

export interface OrgSettings {
  fullName: string;
  shortName: string;
  logoUrl?: string;
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
  announcementActive: false,
  announcementTitle: 'ഇന്നത്തെ അപ്ഡേഷൻ (Today\'s Update)',
  announcementText: '',
  announcementCaseNo: '',
  announcementCaseDate: '',
  announcementCaseName: '',
  announcementCourt: '',
  announcementAdvocate: '',
  announcementJudgeBench: '',
  announcementImageUrl: ''
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
    console.error("Error fetching settings:", error);
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
  const collRef = collection(db, 'gallery_categories');
  return onSnapshot(collRef, async (snapshot) => {
    if (snapshot.empty) {
      // Seed default categories
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
      try {
        for (const cat of DEFAULT_CATEGORIES) {
          await addDoc(collRef, { name: cat, createdAt: serverTimestamp() });
        }
      } catch (err) {
        console.error("Seeding categories failed:", err);
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
      callback(categories);
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
    callback([]);
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
  return onSnapshot(docRef, async (snapshot) => {
    if (!snapshot.exists()) {
      // Seed default settings
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
        whyThisCampaign: "ഹൈറിച്ച് തട്ടിപ്പ് കേസിലെ ഇരകൾക്ക് നീതി ലഭിക്കുന്നതിനും തട്ടിപ്പുകാർക്കെതിരെ മാതൃകാപരമായ ശിക്ഷാനടപടകളും സ്വീകരിക്കുന്നതിനും ശക്തമായ അന്വേഷണം ആവശ്യപ്പെട്ട് ഞങ്ങൾ അധികാരികളിലേക്ക് ഈ ഹർജി സമർപ്പിക്കുന്നു.",
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
        confirmationSectionDescription: "മേൽപ്പറഞ്ഞ കാര്യങ്ങൾ സ്ഥിരീകരിച്ച ശേഷം താഴെയുള്ള Continue to Gmail ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ ജിമെയിലിൽ ഈ കത്തും വിഷയവും തനിയെ ലോഡ് ചെയ്യപ്പെടും."
      };
      try {
        await setDoc(docRef, {
          ...defaultConf,
          lastUpdated: serverTimestamp()
        });
        callback({ id: 'janamail_config', ...defaultConf });
      } catch (err) {
        console.error("Seeding janamail_config failed:", err);
      }
    } else {
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        recipients: data?.recipients || "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com",
        cc: data?.cc || "",
        active: data?.active !== undefined ? data?.active : true,
        campaignName: data?.campaignName || "Operation Janamail",
        campaignTagline: data?.campaignTagline || "പൊതുപങ്കാളിത്തത്തോടെയുള്ള ഇമെയിൽ ഹർജി ക്യാമ്പയിൻ",
        startDate: data?.startDate || "",
        endDate: data?.endDate || "",
        artworkUrl: data?.artworkUrl || "",
        campaignIntroduction: data?.campaignIntroduction || "ഓരോ പൗരനും അവരുടെ അഭിപ്രായങ്ങളും ആവശ്യങ്ങളും ബന്ധപ്പെട്ട സർക്കാർ അധികാരികളെ മാന്യവും ഉത്തരവാദിത്തപരവുമായി അറിയിക്കാൻ സഹായിക്കുന്ന ഒരു പൊതുപങ്കാളിത്ത ഇ-മെയിൽ ക്യാമ്പയിനാണ് Operation Janamail.",
        whyThisCampaign: data?.whyThisCampaign || "ഹൈറിച്ച് തട്ടിപ്പ് കേസിലെ ഇരകൾക്ക് നീതി ലഭിക്കുന്നതിനും തട്ടിപ്പുകാർക്കെതിരെ മാതൃകാപരമായ ശിക്ഷാനടപടികൾ സ്വീകരിക്കുന്നതിനും ശക്തമായ അന്വേഷണം ആവശ്യപ്പെട്ട് ഞങ്ങൾ അധികാരികളിലേക്ക് ഈ ഹർജി സമർപ്പിക്കുന്നു.",
        importantNotice: data?.importantNotice || "ദയവായി ഇമെയിൽ അയയ്ക്കുന്നതിനു മുൻപായി നിങ്ങളുടെ വിവരങ്ങൾ കൃത്യമാണെന്നും ഇമെയിൽ ബോഡി ശ്രദ്ധാപൂർവ്വം വായിച്ചിട്ടുണ്ടെന്നും ഉറപ്പാക്കുക. നിയമപരമായ ആവശ്യങ്ങൾക്ക് മാത്രമേ ഈ ക്യാമ്പയിൻ ഉപയോഗിക്കുകയുള്ളൂ.",
        faqItems: data?.faqItems || [
          { question: "ഈ ക്യാമ്പയിൻ എന്തിനാണ്?", answer: "പൊതുജനങ്ങളുടെ അഭിപ്രായം ബന്ധപ്പെട്ട അധികാരികൾക്ക് ഇമെയിൽ വഴി അറിയിക്കാനാണ്." },
          { question: "ഇത് നിയമപരമാണോ?", answer: "നിയമപരവും ഉത്തരവാദിത്തത്തോടെയും മാത്രമേ ഈ സംവിധാനം ഉപയോഗിക്കാവൂ." },
          { question: "സ്പാം അയക്കാമോ?", answer: "ഇല്ല. ഒരേ സന്ദേശം ആവർത്തിച്ച് അയക്കുന്നത് ഒഴിവാക്കണം." }
        ],
        disclaimer: data?.disclaimer || "ഈ ക്യാമ്പയിൻ പൊതുജനങ്ങൾക്ക് വിവരങ്ങൾ നൽകുന്നതിനായുള്ളതാണ്. എല്ലാ ഇമെയിലുകളും നിയമപരമായും ഉത്തരവാദിത്തത്തോടെയും മാത്രം ഉപയോഗിക്കണം. സ്പാം സന്ദേശങ്ങൾ അയയ്ക്കരുത്.",
        termsAndConditions: data?.termsAndConditions || "ഈ ക്യാമ്പയിനിൽ പങ്കെടുക്കുന്നതിലൂടെ നിങ്ങൾ പൂർണ്ണമായും സത്യസന്ധമായ വിവരങ്ങൾ മാത്രമേ നൽകുന്നുള്ളൂ എന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. ദുരുപയോഗം നിയമപരമായ നടപടികൾക്ക് കാരണമായേക്കാം.",
        confirmations: data?.confirmations || [
          "ഞാൻ നൽകിയിട്ടുള്ള എല്ലാ വിവരങ്ങളും സത്യസന്ധവും കൃത്യവുമാണ് എന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു.",
          "എന്റെ അറിവോടെയും സമ്മതത്തോടെയുമാണ് ഈ ഹർജി അയക്കുന്നത്.",
          "ഈ ക്യാമ്പയിന്റെ എല്ലാ നിബന്ധനകളും വ്യവസ്ഥകളും ഞാൻ വായിച്ചു മനസ്സിലാക്കി അംഗീകരിക്കുന്നു.",
          "കേരള സർക്കാരിന്റെയും മറ്റ് അന്വേഷണ ഏജൻസികളുടെയും സുതാര്യമായ അന്വേഷണത്തിന് ഞാൻ പിന്തുണ പ്രഖ്യാപിക്കുന്നു."
        ],
        thankYouMessage: data?.thankYouMessage || "ഹർജി വിജയകരമായി സമർപ്പിച്ചു. നന്ദി!",
        writeMyOwnEnabled: data?.writeMyOwnEnabled !== undefined ? data?.writeMyOwnEnabled : true,
        campaignStatus: data?.campaignStatus || "live",
        emailMode: data?.emailMode || "both",
        mainNoticeTitle: data?.mainNoticeTitle || "Operation Janamail – പ്രധാന അറിയിപ്പ്",
        whyCampaignHeading: data?.whyCampaignHeading || "എന്തുകൊണ്ടാണ് Operation Janamail?",
        confirmationSectionTitle: data?.confirmationSectionTitle || "സ്ഥിരീകരണം (Mandatory)",
        confirmationSectionDescription: data?.confirmationSectionDescription || "മേൽപ്പറഞ്ഞ കാര്യങ്ങൾ സ്ഥിരീകരിച്ച ശേഷം താഴെയുള്ള Continue to Gmail ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ ജിമെയിലിൽ ഈ കത്തും വിഷയവും തനിയെ ലോഡ് ചെയ്യപ്പെടും.",
        lastUpdated: data?.lastUpdated
      });
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'settings/janamail_config');
    callback({
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
        { question: "സ്പാം അയക്കാമോ?", answer: "ഇല്ല. ഒരേ സന്ദേശം ആവർсть അയക്കുന്നത് ഒഴിവാക്കണം." }
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
      confirmationSectionDescription: "മേൽപ്പറഞ്ഞ കാര്യങ്ങൾ സ്ഥിരീകരിച്ച ശേഷം താഴെയുള്ള Continue to Gmail ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ ജിമെയിലിൽ ഈ കത്തും വിഷയവും തനിയെ ലോഡ് ചെയ്യപ്പെടും."
    });
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
    subject: "ഹൈറിച്ച് തട്ടിപ്പ് കേസ്: അടിയന്തര നടപടികളും ഇരകൾക്ക് നീതിയും ആവശ്യപ്പെട്ട് പൊതുജന ഹർജി",
    body: `ബഹുമാനപ്പെട്ട കേരള മുഖ്യമന്ത്രിയും ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരും മുൻപാകെ,

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
{name}`,
    active: true,
    priority: 1,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "സ്വത്തുക്കൾ കണ്ടുകെട്ടാൻ ആവശ്യപ്പെട്ട് (Confiscate Properties)",
    subject: "ഹൈറിച്ച് നിക്ഷേപ തട്ടിപ്പ്: പ്രതികളുടെ സ്വത്തുക്കൾ കണ്ടുകെട്ടാൻ അടിയന്തര നടപടി സ്വീകരിക്കണം",
    body: `ബഹുമാനപ്പെട്ട കേരള മുഖ്യമന്ത്രിയും ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരും മുൻപാകെ,

വിഷയം: ഹൈറിച്ച് നിക്ഷേപ തട്ടിപ്പിലെ പ്രതികളുടെ സ്വത്തുക്കൾ കണ്ടുകെട്ടാൻ അടിയന്തര നടപടി ആവശ്യപ്പെടുന്നു.

ഞാൻ താഴെ ഒപ്പിട്ടിരിക്കുന്ന വ്യക്തി, ഹൈറിച്ച് ഓൺലൈൻ ഷോപ്പി തട്ടിപ്പിൽ എന്റെ പണം നഷ്ടമായ സാഹചര്യത്തിൽ ഈ ഹർജി സമർപ്പിക്കുന്നു. സാധാരണക്കാരായ ജനങ്ങളെ വഞ്ചിച്ച പ്രതികളുടെ സ്വത്തുക്കൾ കണ്ടുകെട്ടാൻ വൈകുന്ന ഓരോ ദിവസവും ഇരകൾക്ക് വലിയ പ്രയാസമുണ്ടാക്കുന്നു.

ആവശ്യങ്ങൾ:
1. പ്രതികളുടെ എല്ലാ സ്വത്തുക്കളും BUDS നിയമപ്രകാരം അടിയന്തരമായി പിടിച്ചെടുക്കുക.
2. സാധാരണക്കാരുടെ നിക്ഷേപങ്ങൾ ഉടൻ തിരികെ നൽകാൻ കോടതി നിർദ്ദേശങ്ങൾ പാലിക്കുക.

പേര്: {name}
ഫോൺ നമ്പർ: {phone}
സ്ഥലം/വിലാസം: {address}

വിശ്വസ്തതയോടെ,
{name}`,
    active: true,
    priority: 2,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "BUDS നിയമപ്രകാരമുള്ള നടപടികൾക്ക് (Action under BUDS Act)",
    subject: "ഹൈറിച്ച് ഇരകൾക്ക് നീതി ലഭ്യമാക്കുക; BUDS നിയമപ്രകാരം നടപടികൾ വേഗത്തിലാക്കുക",
    body: `ബഹുമാനപ്പെട്ട കേരള മുഖ്യമന്ത്രിയും ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരും മുൻപാകെ,

വിഷയം: ഹൈറിച്ച് തട്ടിപ്പിൽ BUDS നിയമപ്രകാരമുള്ള നടപടികൾ വേഗത്തിലാക്കാൻ അപേക്ഷ.

ഞാൻ താഴെ ഒപ്പിട്ടിരിക്കുന്ന വ്യക്തി, ഹൈറിച്ച് നിക്ഷേപ തട്ടിപ്പ് കേസിൽ സർക്കാരിന്റെയും അന്വേഷണ ഏജൻസികളുടെയും അടിയന്തര ശ്രദ്ധ ക്ഷണിക്കുന്നു.

ആവശ്യങ്ങൾ:
1. BUDS നിയമം അനുശാസിക്കുന്ന കർശനമായ നിയമനടപടികൾ പ്രതികൾക്കെതിരെ സ്വീകരിക്കുക.
2. നിക്ഷേപകരുടെ പണം കണ്ടുകെട്ടിയ സ്വത്തുക്കളിൽ നിന്നും തിരിച്ചു നൽകുക.

പേര്: {name}
ഫോൺ നമ്പർ: {phone}
സ്ഥലം/വിലാസം: {address}

വിശ്വസ്തതയോടെ,
{name}`,
    active: true,
    priority: 3,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "സുതാര്യമായ അന്വേഷണം ആവശ്യപ്പെട്ട് (Transparent Investigation)",
    subject: "ഹൈറിച്ച് കേസിലെ സുതാര്യമായ അന്വേഷണവും ഇരകളുടെ പണം തിരിച്ചുനൽകലും ഉറപ്പാക്കുക",
    body: `ബഹുമാനപ്പെട്ട കേരള മുഖ്യമന്ത്രിയും ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരും മുൻപാകെ,

വിഷയം: ഹൈറിച്ച് തട്ടിപ്പ് കേസിൽ സുതാര്യവും സമയബന്ധിതവുമായ അന്വേഷണം ആവശ്യപ്പെടുന്നു.

ഞാൻ താഴെ ഒപ്പിട്ടിരിക്കുന്ന വ്യക്തി, ഹൈറിച്ച് കേസിലെ അന്വേഷണം സുതാര്യമായി പൂർത്തിയാക്കണമെന്ന് ആവശ്യപ്പെടുന്നു.

ആവശ്യങ്ങൾ:
1. കേസിൽ ഉൾപ്പെട്ടിരിക്കുന്ന മറ്റെല്ലാവരെയും നിയമത്തിന് മുന്നിൽ കൊണ്ടുവരിക.
2. സാധാരണക്കാരായ ജനങ്ങൾക്ക് അവരുടെ പണം തിരികെ ലഭിക്കുമെന്ന് ഉറപ്പാക്കുക.

പേര്: {name}
ഫോൺ നമ്പർ: {phone}
സ്ഥലം/വിലാസം: {address}

വിശ്വസ്തതയോടെ,
{name}`,
    active: true,
    priority: 4,
    recipients: "chiefminister@kerala.gov.in, home.dept@kerala.gov.in, hcrskerala@gmail.com"
  },
  {
    name: "അടിയന്തര സർക്കാർ ഇടപെടലിന് (Government Intervention)",
    subject: "സാധാരണക്കാരായ നിക്ഷേപകരുടെ സംരക്ഷണം: ഹൈറിച്ച് തട്ടിപ്പിൽ അടിയന്തര സർക്കാർ ഇടപെടൽ വേണം",
    body: `ബഹുമാനപ്പെട്ട കേരള മുഖ്യമന്ത്രിയും ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരും മുൻപാകെ,

വിഷയം: സാധാരണക്കാരായ നിക്ഷേപകരുടെ സംരക്ഷണം ആവശ്യപ്പെട്ടുള്ള അപേക്ഷ.

ഞാൻ താഴെ ഒപ്പിട്ടിരിക്കുന്ന വ്യക്തി, ഹൈറിച്ച് തട്ടിപ്പ് കാരണം ദുരിതമനുഭവിക്കുന്ന ആയിരക്കണക്കിന് സാധാരണ കുടുംബങ്ങളുടെ ജീവൻ രക്ഷിക്കാൻ അടിയന്തര സർക്കാർ ഇടപെടൽ അഭ്യർത്ഥിക്കുന്നു.

ആവശ്യങ്ങൾ:
1. ഇരകൾക്ക് അടിയന്തര നിയമസഹായവും നീതിയും ഉറപ്പാക്കുക.
2. പ്രതികളുടെ സാമ്പത്തിക ഇടപാടുകൾ കൃത്യമായി പരിശോധിച്ച് പിടിച്ചെടുക്കുക.

പേര്: {name}
ഫോൺ നമ്പർ: {phone}
സ്ഥലം/വിലാസം: {address}

വിശ്വസ്തതയോടെ,
{name}`,
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


