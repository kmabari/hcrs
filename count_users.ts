import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function countUsers() {
  const app = initializeApp(config, "CountUsers");
  const db = getFirestore(app);

  try {
    const qSnap = await getDocs(collection(db, 'users'));
    console.log(`Total users in current database 'users' collection: ${qSnap.size}`);
  } catch (err: any) {
    console.error("Count users failed with:", err.code, err.message);
  }
}

countUsers().then(() => process.exit(0));
