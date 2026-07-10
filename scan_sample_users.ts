import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function scanSampleUsers() {
  const app = initializeApp(config, "SampleScanner");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Logged in!");

    const snap = await getDocs(query(collection(db, 'users'), limit(20)));
    console.log(`Retrieved ${snap.size} sample users. Checking fields...`);
    snap.forEach(doc => {
      const data = doc.data();
      const keys = Object.keys(data);
      const claimKeys = keys.filter(k => k.toLowerCase().includes('claim') || k.toLowerCase().includes('ticket'));
      if (claimKeys.length > 0 || data.claims || data.support_tickets) {
        console.log(`User ${doc.id} (${data.name}) has claim/ticket fields:`, claimKeys, data.claims, data.support_tickets);
      }
    });
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

scanSampleUsers().then(() => process.exit(0));
