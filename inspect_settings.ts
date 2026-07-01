import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function inspect() {
  const app = initializeApp(currentConfig, "InspectSettingsApp");
  const db = getFirestore(app, currentConfig.firestoreDatabaseId);

  try {
    const snap = await getDocs(collection(db, 'settings'));
    console.log(`Found ${snap.size} documents in 'settings':`);
    snap.forEach(doc => {
      console.log(`- Document ID: ${doc.id}`);
      console.log(`  Data:`, JSON.stringify(doc.data(), null, 2));
    });
  } catch (e: any) {
    console.error("Failed to read settings collection:", e.message);
  }
}

inspect().then(() => process.exit(0));
