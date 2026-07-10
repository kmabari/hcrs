import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testClaims() {
  const app = initializeApp(config, "TestClaimsWrite");
  const db = getFirestore(app);

  try {
    const qSnap = await getDocs(collection(db, 'claims'));
    console.log(`Claims size: ${qSnap.size}`);
  } catch (err: any) {
    console.error("Claims query failed with:", err.code, err.message);
  }
}

testClaims().then(() => process.exit(0));
