import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testClaims() {
  console.log("Initializing Firebase...");
  const app = initializeApp(config, "AdminClaimsCheckDirect");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "admin@hcrs.society";
  const pin = "246810";

  try {
    console.log(`Signing in as ${email}...`);
    const cred = await signInWithEmailAndPassword(auth, email, pin);
    console.log("Login successful! UID:", cred.user.uid);

    // Try a single write to 'claims' to see if write permission is allowed
    console.log("Attempting single write to claims...");
    const testClaimRef = doc(db, 'claims', 'test_claim_id_by_admin_' + Date.now());
    await setDoc(testClaimRef, {
      uid: cred.user.uid,
      userName: 'Test Admin User',
      totalPending: '1000',
      userMobile: '9645934571'
    });
    console.log("SUCCESS! Wrote test claim document.");

    // Now try querying claims collection
    console.log("Querying claims collection...");
    const qSnap = await getDocs(collection(db, 'claims'));
    console.log(`Successfully fetched claims! Count: ${qSnap.size}`);
    if (qSnap.size > 0) {
      qSnap.docs.forEach(doc => {
        console.log(` - ID: ${doc.id} =>`, doc.data());
      });
    }
  } catch (err: any) {
    console.error("FAILED during Admin claims check:", err.code, err.message);
  }
}

testClaims().then(() => process.exit(0));
