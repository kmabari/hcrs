import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function runTest() {
  console.log("Logging in as Admin to query operator...");
  await signInWithEmailAndPassword(auth, "9645934571@hcrs.society", "246810");
  console.log("Admin logged in!");

  const opUid = "VTCNvjz8RGXEha1XIqMelBQwu1l2";
  const opRef = doc(db, 'users', opUid);
  const snap = await getDoc(opRef);
  
  if (snap.exists()) {
    console.log("Operator Doc found!");
    const data = snap.data();
    for (const [key, val] of Object.entries(data)) {
      console.log(`  ${key}:`, val, `(${typeof val})`);
    }
  } else {
    console.log("Operator Doc NOT found in 'users' collection!");
  }
}

runTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error running test:", err);
    process.exit(1);
  });
