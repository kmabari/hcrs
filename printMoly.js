import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function printMoly() {
  const oldDocId = "life_7561897767_1781102904443";
  const snap = await getDoc(doc(db, 'users', oldDocId));
  const data = snap.data();
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
