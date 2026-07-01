import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function fetchAll() {
  console.log("Initializing Firebase...");
  const app = initializeApp(config, "AdminFetchAllCollections");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "admin@hcrs.society";
  const pin = "246810";

  try {
    console.log(`Signing in as ${email}...`);
    await signInWithEmailAndPassword(auth, email, pin);
    console.log("Login successful! Current UID:", auth.currentUser?.uid);

    const collections = ['users', 'claims', 'gallery', 'announcements', 'districtQuotas', 'settings', 'support_tickets', 'migration_logs', 'committees'];

    for (const coll of collections) {
      try {
        const qSnap = await getDocs(collection(db, coll));
        console.log(`Collection '${coll}': ${qSnap.size} documents found.`);
        if (qSnap.size > 0) {
          console.log(`  IDs:`, qSnap.docs.slice(0, 5).map(doc => doc.id));
        }
      } catch (err: any) {
        console.error(`  Error reading collection '${coll}':`, err.code, err.message);
      }
    }
  } catch (err: any) {
    console.error("Authentication/Setup fail:", err.code, err.message);
  }
}

fetchAll().then(() => process.exit(0));
