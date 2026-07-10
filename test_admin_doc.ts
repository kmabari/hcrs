import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testAdminDoc() {
  const app = initializeApp(config, "AdminDocTest");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "admin@hcrs.society";
  const pin = "246810";

  await signInWithEmailAndPassword(auth, email, pin);
  const uid = auth.currentUser?.uid;
  console.log("Logged in UID:", uid);

  if (uid) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    console.log("Admin User document exists?", userSnap.exists());
    if (userSnap.exists()) {
      console.log("Admin User document data:", userSnap.data());
    }
  }
}

testAdminDoc().then(() => process.exit(0));
