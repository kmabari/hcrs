import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testConnection() {
  console.log("Analyzing Firestore database connection with relaxed rules...");
  const app = initializeApp(config, "TestConnectionRelaxed");
  const db = getFirestore(app);

  try {
    const q = query(collection(db, 'users'), limit(5));
    const snapshot = await getDocs(q);
    console.log(`Connection successful! Total users listed in this batch check: ${snapshot.size}`);
    if (snapshot.size > 0) {
      console.log("Sample user record ID:", snapshot.docs[0].id);
    }
  } catch (err: any) {
    console.error("Firestore access failed:", err.message);
  }
}

testConnection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
