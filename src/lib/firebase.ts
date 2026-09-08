import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Support external deployment (Vercel, Netlify, custom domain, etc.) with robust fallback merging
const cleanStr = (val?: string | null): string => {
  if (!val) return '';
  const s = String(val).trim().replace(/^["']+|["']+$/g, '').trim();
  if (s === 'undefined' || s === 'null') return '';
  return s;
};

const getFirebaseConfig = () => {
  // Statically referenced import.meta.env properties for Vite compiler inlining during production build
  const envApiKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : undefined;
  const envProjectId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined;
  const envAuthDomain = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined;
  const envStorageBucket = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined;
  const envMessagingSenderId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined;
  const envAppId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : undefined;
  const envDatabaseURL = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_DATABASE_URL : undefined;
  const envMeasurementId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : undefined;
  const envDatabaseId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_DATABASE_ID : undefined;

  const apiKey = cleanStr(envApiKey) || cleanStr((firebaseConfig as any).apiKey);
  const projectId = cleanStr(envProjectId) || cleanStr((firebaseConfig as any).projectId) || 'hcrs-membership';
  
  // Intelligent authDomain resolution:
  // 1. env.VITE_FIREBASE_AUTH_DOMAIN
  // 2. firebaseConfig.authDomain
  // 3. Derived from projectId: `${projectId}.firebaseapp.com`
  let authDomain = cleanStr(envAuthDomain) || cleanStr((firebaseConfig as any).authDomain);
  // Strip http:// or https:// and any trailing slashes if accidentally provided in Vercel env settings
  authDomain = authDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
  if (!authDomain && projectId) {
    authDomain = `${projectId}.firebaseapp.com`;
  }

  let storageBucket = cleanStr(envStorageBucket) || cleanStr((firebaseConfig as any).storageBucket);
  storageBucket = storageBucket.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
  if (!storageBucket && projectId) {
    storageBucket = `${projectId}.firebasestorage.app`;
  }

  const messagingSenderId = cleanStr(envMessagingSenderId) || cleanStr((firebaseConfig as any).messagingSenderId);
  const appId = cleanStr(envAppId) || cleanStr((firebaseConfig as any).appId);
  const databaseURL = cleanStr(envDatabaseURL) || cleanStr((firebaseConfig as any).databaseURL);
  const measurementId = cleanStr(envMeasurementId) || cleanStr((firebaseConfig as any).measurementId);
  const firestoreDatabaseId = cleanStr(envDatabaseId) || cleanStr((firebaseConfig as any).firestoreDatabaseId) || '(default)';

  const final = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    databaseURL: databaseURL || undefined,
    measurementId: measurementId || undefined,
    firestoreDatabaseId: firestoreDatabaseId || '(default)'
  };

  if (typeof window !== 'undefined') {
    const isCustomEnv = !!(envApiKey || envProjectId || envAuthDomain);
    console.log(`[Firebase Auth Init] Loaded ${isCustomEnv ? 'Environment Variables' : 'Default JSON'} Config:`, {
      projectId: final.projectId,
      authDomain: final.authDomain,
      hasApiKey: !!final.apiKey,
      hasAppId: !!final.appId,
      currentHostname: window.location.hostname,
      currentOrigin: window.location.origin,
      inIframe: window.self !== window.top
    });
  }

  return final;
};

const finalConfig = getFirebaseConfig();

export const app = initializeApp(finalConfig);
export const secondaryApp = initializeApp(finalConfig, 'Secondary');

// Gracefully determine which local cache configuration is safe to use.
// Using memoryLocalCache with experimentalAutoDetectLongPolling ensures reliable,
// fast connectivity across Cloud Run containers, iframes, mobile browsers,
// and custom domains without stale IndexedDB multi-tab lock contention or forced long-polling stalls.
const getSafeFirestoreSettings = () => {
  return { 
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true
  };
};

const databaseId = finalConfig.firestoreDatabaseId && finalConfig.firestoreDatabaseId !== '(default)' 
  ? finalConfig.firestoreDatabaseId 
  : undefined;

// Safely initialize Firestore with resilient fallback so that module export never throws in production
let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(app, getSafeFirestoreSettings(), databaseId);
} catch (primaryErr) {
  console.warn("[Firebase] initializeFirestore with primary settings failed, retrying with defaults:", primaryErr);
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true
    }, databaseId);
  } catch (secondaryErr) {
    console.error("[Firebase] initializeFirestore secondary attempt failed:", secondaryErr);
    firestoreDb = initializeFirestore(app, {}, databaseId);
  }
}

let secDb: any;
try {
  secDb = initializeFirestore(secondaryApp, getSafeFirestoreSettings(), databaseId);
} catch (e) {
  secDb = firestoreDb;
}

export const db = firestoreDb;
export const secondaryDb = secDb;
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('exhausted');

  if (isQuota && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Only throw if it is a mutation/write operation, to prevent uncaught exceptions on listeners/reads while still reporting errors.
  if (operationType === OperationType.CREATE || operationType === OperationType.UPDATE || operationType === OperationType.DELETE || operationType === OperationType.WRITE) {
    throw new Error(JSON.stringify(errInfo));
  }
}

async function testConnection() {
  try {
    // Attempt to read a dummy document to wake up connection
    await getDoc(doc(db, 'system', 'ping'));
    console.log("Firestore connection initialized.");
  } catch (error) {
    if (error instanceof Error) {
       console.log("Firestore initialization status:", error.message);
       if (error.message.includes('unavailable') || error.message.includes('offline')) {
         console.warn("Firestore is running in offline mode. Local queries will serve cached state.");
       }
    }
  }
}

testConnection();
