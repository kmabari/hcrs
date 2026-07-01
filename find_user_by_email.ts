import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function scan() {
  const app = initializeApp(config, "UserScanner");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");

    const usersRef = collection(db, 'users');
    const snap = await getDocs(query(usersRef, where('email', '==', 'hcrskerala@gmail.com')));
    console.log(`Found ${snap.size} users with email hcrskerala@gmail.com:`);
    snap.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
}

scan().then(() => process.exit(0));
