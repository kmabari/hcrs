import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, limit, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function printMoly() {
  const q = query(collection(db, 'users'), where('mobile', '==', '7561897767'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("No document matched mobile 7561897767");
    return;
  }
  const docSnap = snap.docs[0];
  console.log("Found document with ID:", docSnap.id);
  const data = docSnap.data();
  console.log("Moly Joseph Profile fields:");
  for (const [key, val] of Object.entries(data)) {
    console.log(`  ${key}: val=${val} type=${typeof val}`);
  }
}

printMoly()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
