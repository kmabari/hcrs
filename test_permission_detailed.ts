import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testPermissions() {
  console.log("Initializing Firebase...");
  const app = initializeApp(config, "AdminFetchAllCollectionsTest");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "admin@hcrs.society";
  const pin = "246810";

  try {
    console.log(`Signing in as ${email}...`);
    await signInWithEmailAndPassword(auth, email, pin);
    console.log("Login successful! Current UID:", auth.currentUser?.uid);
    console.log("Email from Auth currentUser object:", auth.currentUser?.email);

    // Test 1: Get a single user doc
    try {
      const userSnap = await getDoc(doc(db, 'users', '01K5pQ2hT5bpHa43ggkzzhx991F2'));
      console.log("Test 1: Single user doc get: SUCCESS, exists?", userSnap.exists());
    } catch (e: any) {
      console.error("Test 1: Single user doc get: FAILED with:", e.code, e.message);
    }

    // Test 2: List users with limit 1
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
      console.log("Test 2: List users limit 1: SUCCESS, size:", usersSnap.size);
    } catch (e: any) {
      console.error("Test 2: List users limit 1: FAILED with:", e.code, e.message);
    }

    // Test 3: Get a single claim doc
    try {
      const claimSnap = await getDoc(doc(db, 'claims', 'dummy_claim_id'));
      console.log("Test 3: Single claim doc get: SUCCESS, exists?", claimSnap.exists());
    } catch (e: any) {
      console.error("Test 3: Single claim doc get: FAILED with:", e.code, e.message);
    }

    // Test 4: List claims with limit 1
    try {
      const claimsSnap = await getDocs(query(collection(db, 'claims'), limit(1)));
      console.log("Test 4: List claims limit 1: SUCCESS, size:", claimsSnap.size);
    } catch (e: any) {
      console.error("Test 4: List claims limit 1: FAILED with:", e.code, e.message);
    }

    // Test 5: Get a single support ticket doc
    try {
      const ticketSnap = await getDoc(doc(db, 'support_tickets', 'dummy_ticket_id'));
      console.log("Test 5: Single ticket doc get: SUCCESS, exists?", ticketSnap.exists());
    } catch (e: any) {
      console.error("Test 5: Single ticket doc get: FAILED with:", e.code, e.message);
    }

    // Test 6: List support tickets with limit 1
    try {
      const ticketsSnap = await getDocs(query(collection(db, 'support_tickets'), limit(1)));
      console.log("Test 6: List tickets limit 1: SUCCESS, size:", ticketsSnap.size);
    } catch (e: any) {
      console.error("Test 6: List tickets limit 1: FAILED with:", e.code, e.message);
    }

  } catch (err: any) {
    console.error("Failure:", err.code, err.message);
  }
}

testPermissions().then(() => process.exit(0));
