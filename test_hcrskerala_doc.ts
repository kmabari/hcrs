import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testHcrsKerala() {
  const app = initializeApp(config, "HcrsKeralaTest");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Logged in UID:", auth.currentUser?.uid);

    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', 'hcrskerala@gmail.com')));
    console.log("Found hcrskerala users count:", snap.size);
    snap.forEach(doc => {
      console.log("User doc:", doc.id, doc.data());
    });
  } catch (err: any) {
    console.error("Failed to query hcrskerala user:", err.message);
  }
}

testHcrsKerala().then(() => process.exit(0));
