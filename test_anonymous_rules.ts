import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testAnon() {
  console.log("Initializing Firebase without logging in...");
  const app = initializeApp(config, "AnonTest");
  const db = getFirestore(app);

  // Test 1: Get single user doc
  try {
    const userSnap = await getDoc(doc(db, 'users', '01K5pQ2hT5bpHa43ggkzzhx991F2'));
    console.log("Anon Test 1: Single user doc get: SUCCESS, exists?", userSnap.exists());
  } catch (e: any) {
    console.error("Anon Test 1: Single user doc get: FAILED with:", e.code, e.message);
  }

  // Test 2: List users with limit 1
  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
    console.log("Anon Test 2: List users limit 1: SUCCESS, size:", usersSnap.size);
  } catch (e: any) {
    console.error("Anon Test 2: List users limit 1: FAILED with:", e.code, e.message);
  }
}

testAnon().then(() => process.exit(0));
