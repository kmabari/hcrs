import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testWrite() {
  console.log("Initializing Firebase...");
  const app = initializeApp(config, "WriteTest");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "admin@hcrs.society";
  const pin = "246810";

  try {
    console.log(`Signing in as ${email}...`);
    await signInWithEmailAndPassword(auth, email, pin);
    console.log("Login successful! Current UID:", auth.currentUser?.uid);

    const testClaimRef = doc(db, 'claims', 'test_write_doc_id_999');
    const dummyClaim = {
      uid: auth.currentUser?.uid,
      membershipId: "KL/WYD/MND/999",
      totalPaid: 1000,
      totalReceived: 200,
      futurePreference: "Refund"
    };

    console.log("Attempting to write to 'claims'...");
    await setDoc(testClaimRef, dummyClaim);
    console.log("Write to 'claims' successful!");

    console.log("Attempting to delete test claim...");
    await deleteDoc(testClaimRef);
    console.log("Delete successful!");

  } catch (err: any) {
    console.error("Write/Delete Failed:", err.code, err.message);
  }
}

testWrite().then(() => process.exit(0));
