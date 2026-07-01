import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function queryAdmin() {
  const app = initializeApp(config, "QueryAdmin");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Logged in!");

    const q = query(collection(db, 'users'), where('email', '==', 'hcrskerala@gmail.com'));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} users with email 'hcrskerala@gmail.com'`);
    snap.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

queryAdmin().then(() => process.exit(0));
