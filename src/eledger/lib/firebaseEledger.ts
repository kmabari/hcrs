import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Dedicated Firebase Configuration for HCRS eLedger Project
// Strictly isolated from the main HCRS membership project
export const eledgerFirebaseConfig = {
  apiKey: "AIzaSyBSj2cHzYiZRq6HLeFX3aAPIs5Jqorqnuk",
  authDomain: "hcrs-eledger.firebaseapp.com",
  projectId: "hcrs-eledger",
  storageBucket: "hcrs-eledger.firebasestorage.app",
  messagingSenderId: "58006250437",
  appId: "1:58006250437:web:b3b3f54cd032849fb3a1ac",
  measurementId: "G-XFXMK9RRNK"
};

// Initialize an isolated named Firebase App instance specifically for eLedger
// This ensures 100% complete separation from the main HCRS website's Firebase instance
const existingApp = getApps().find(app => app.name === 'eledger');
export const eledgerApp = existingApp || initializeApp(eledgerFirebaseConfig, 'eledger');

export const eledgerAuth = getAuth(eledgerApp);
export const eledgerDb = getFirestore(eledgerApp);
export const eledgerStorage = getStorage(eledgerApp);

