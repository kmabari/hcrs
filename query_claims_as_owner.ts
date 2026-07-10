import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testQueryWithOwnerFilter() {
  console.log("Initializing Firebase for filtered query...");
  const app = initializeApp(config, "FilteredQueryTest");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "admin@hcrs.society";
  const pin = "246810";

  try {
    console.log(`Signing in as ${email}...`);
    await signInWithEmailAndPassword(auth, email, pin);
    const uid = auth.currentUser?.uid;
    console.log("Login successful! UID:", uid);

    console.log("Performing filtered query: claims where uid == UID...");
    const q = query(collection(db, 'claims'), where('uid', '==', uid));
    const snap = await getDocs(q);
    console.log(`[Success] Filtered query completed! Found ${snap.size} claims for UID ${uid}.`);
  } catch (err: any) {
    console.error("Filtered query failed:", err.code, err.message);
  }
}

testQueryWithOwnerFilter().then(() => process.exit(0));
