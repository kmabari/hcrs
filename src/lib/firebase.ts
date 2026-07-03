import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Support external deployment (Vercel, Netlify, etc.) using custom environment variables
const getFirebaseConfig = () => {
  const metaObj = import.meta as any;
  const envConfig = {
    apiKey: metaObj.env?.VITE_FIREBASE_API_KEY,
    authDomain: metaObj.env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: metaObj.env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: metaObj.env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: metaObj.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: metaObj.env?.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: metaObj.env?.VITE_FIREBASE_DATABASE_ID || '(default)'
  };

  if (envConfig.apiKey && envConfig.projectId) {
    console.log("Firebase initialized using Vercel/Netlify environment variables config.");
    return envConfig;
  }

  return firebaseConfig;
};

const finalConfig = getFirebaseConfig();

const app = initializeApp(finalConfig);
const secondaryApp = initializeApp(finalConfig, 'Secondary');

// Gracefully determine which local cache configuration is safe to use.
// In iframe/sandbox environments, IndexedDB and tab synchronizations 
// can be blocked by browser security policies and cause connection hangs.
const getSafeFirestoreSettings = () => {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return { 
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true
      };
    }

    const isDevHost = window.location.hostname.includes('ais-dev') || 
                      window.location.hostname.includes('ais-pre') || 
                      window.location.hostname.includes('localhost') || 
                      window.location.hostname.includes('127.0.0.1') || 
                      window.location.hostname.includes('google.com');
                      
    const inIframe = window.self !== window.top;
    
    if (inIframe || isDevHost) {
      console.log("Memory cache enabled for preview/iframe environment to avoid IndexedDB crashes.");
      return { 
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true
      };
    }

    // Proactively verify we can access IndexedDB
    // Often merely accessing window.indexedDB throws a SecurityError in sandboxed iframes.
    const _ = window.indexedDB;

    return {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true
    };
  } catch (e) {
    console.warn("IndexedDB access is restricted or threw an error. Falling back to memory cache.", e);
    return { 
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true
    };
  }
};

const databaseId = finalConfig.firestoreDatabaseId && finalConfig.firestoreDatabaseId !== '(default)' 
  ? finalConfig.firestoreDatabaseId 
  : undefined;

export const db = initializeFirestore(app, getSafeFirestoreSettings(), databaseId);
export const secondaryDb = initializeFirestore(secondaryApp, getSafeFirestoreSettings(), databaseId);
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

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
