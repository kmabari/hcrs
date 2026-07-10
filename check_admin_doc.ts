import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function checkAdminDoc() {
  const app = initializeApp(config, "CheckAdminDoc");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    const uid = auth.currentUser?.uid;
    console.log("Logged in UID:", uid);
    
    // Print claims and idToken info
    const tokenResult = await auth.currentUser?.getIdTokenResult();
    console.log("Token Claims:", tokenResult?.claims);

    const docSnap = await getDoc(doc(db, 'users', uid!));
    if (docSnap.exists()) {
      console.log("Admin user document EXISTS:", docSnap.data());
    } else {
      console.log("Admin user document DOES NOT exist in 'users' collection.");
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

checkAdminDoc().then(() => process.exit(0));
