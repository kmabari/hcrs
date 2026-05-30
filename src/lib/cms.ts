import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, addDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from './firebase';

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
      return docSnap.data() as OrgSettings;
    }
    return defaultSettings;
  } catch (error) {
    console.error("Error fetching settings:", error);
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
      callback(docSnap.data() as OrgSettings);
    } else {
      callback(defaultSettings);
    }
  });
}

export async function addGalleryItem(item: Omit<GalleryItem, 'id' | 'createdAt'>) {
  const collRef = collection(db, 'gallery');
  return await addDoc(collRef, {
    ...item,
    createdAt: serverTimestamp()
  });
}

export async function deleteGalleryItem(id: string) {
  const docRef = doc(db, 'gallery', id);
  await deleteDoc(docRef);
}

export function subscribeToGallery(callback: (items: GalleryItem[]) => void) {
  const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GalleryItem[];
    callback(items);
  });
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
    callback(items);
  });
}

