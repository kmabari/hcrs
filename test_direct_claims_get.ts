import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testDirectClaim() {
  const app = initializeApp(config, "testDirectClaimApp");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Logged in UID:", auth.currentUser?.uid);

    const docRef = doc(db, 'claims', 'dummy_claim_id');
    const snap = await getDoc(docRef);
    console.log("Get doc success! Exists:", snap.exists());
  } catch (err: any) {
    console.error("Direct get claim failed:", err.code, err.message);
  }
}

testDirectClaim().then(() => process.exit(0));
