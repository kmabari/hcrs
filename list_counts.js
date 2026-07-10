import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Authenticating...");
  await signInWithEmailAndPassword(auth, "9645934571@hcrs.society", "246810");
  console.log("Authenticated! Fetching counts...\n");

  const usersColl = collection(db, 'users');
  const allUsersSnap = await getDocs(usersColl);
  console.log("Total users in DB:", allUsersSnap.size);

  const pendingUsersSnap = await getDocs(query(usersColl, where('status', '==', 'pending')));
  console.log("Pending users in DB:", pendingUsersSnap.size);

  const renewalUsersSnap = await getDocs(query(usersColl, where('renewalPending', '==', true)));
  console.log("Renewal pending users in DB:", renewalUsersSnap.size);

  const claimsColl = collection(db, 'claims');
  const claimsSnap = await getDocs(claimsColl);
  console.log("Total claims in DB:", claimsSnap.size);
  
  if (claimsSnap.size > 0) {
    console.log("Sample Claim 1:", claimsSnap.docs[0].data());
  }

  const ticketsColl = collection(db, 'support_tickets');
  const ticketsSnap = await getDocs(ticketsColl);
  console.log("Total support tickets in DB:", ticketsSnap.size);
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
