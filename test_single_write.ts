import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testSingle() {
  const app = initializeApp(config, "TestSingleWrite");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Login successful! Current UID:", auth.currentUser?.uid);
    
    // Attempt to update admin doc
    const docRef = doc(db, 'users', auth.currentUser!.uid);
    await updateDoc(docRef, { name: 'Main Admin' });
    console.log("SUCCESS! Updated admin document! isOperator() returned true!");
  } catch (err: any) {
    console.error("Single write failed:", err.message);
  }
}

testSingle()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
