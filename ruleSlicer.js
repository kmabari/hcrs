import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function sliceRules() {
  const uid = "2jgcCrgHp2hTwGXZCe9L1FztB8T2";

  console.log("Pre-cleaning up document via admin for clean Attempt 1...");
  const adminAuth = getAuth();
  await signInWithEmailAndPassword(adminAuth, "9645934571@hcrs.society", "246810");
  await deleteDoc(doc(db, 'users', uid));

  await signInWithEmailAndPassword(auth, "l-molyjoseph955@gmail.com", "123456");
  console.log("Logged in UID:", auth.currentUser.uid);

  // Minimal profile that should comply with all basic rules inside isValidUser and allow create conditions
  const minimalProfile = {
    uid: uid,
    name: "Moly Joseph",
    mobile: "7561897767",
    email: "l-molyjoseph955@gmail.com",
    isAdmin: false,
    role: "member",
    membership_type: "LIFE_MEMBER",
    status: "active"
  };

  console.log("Attempt 1: Writing minimal valid profile...");
  try {
    await setDoc(doc(db, 'users', uid), minimalProfile);
    console.log("-> Success! Minimal write allowed.");
  } catch (err) {
    console.error("-> Failed on minimal write:", err.message);
    return;
  }

  // Use a temporary administrative sign-in to clean up the document so Attempt 2 is also a fresh create!
  console.log("Cleaning up document via admin for clean Attempt 2...");
  const adminCred = await signInWithEmailAndPassword(adminAuth, "9645934571@hcrs.society", "246810");
  await deleteDoc(doc(db, 'users', uid));
  await signInWithEmailAndPassword(auth, "l-molyjoseph955@gmail.com", "123456");

  // If minimal succeeded, let's add fields one by one to find the culprit
  const fullProfile = {
    pincode: '676501',
    photoUrl: '',
    constituencyCode: 'PKD',
    isAdmin: false,
    state: 'Kerala',
    role: 'member',
    email: 'l-molyjoseph955@gmail.com',
    waStatus: 'Pending',
    isApproved: true,
    serialNo: 5,
    registeredByName: 'Main Admin',
    membership_type: 'LIFE_MEMBER',
    districtCode: 'TCR',
    mobile: '7561897767',
    membershipId: 'HCRS-LIFE-KL-TCR-PKD-005',
    name: 'Moly Joseph',
    address: 'HCRS Registered Life Founding Core',
    assemblyConstituency: 'Puthukkad',
    district: 'TCR',
    registeredBy: '6yBHMajWEAMdqgqf3h9JX7PlosH3',
    stateCode: 'KL',
    uid: uid,
    pin: '123456',
    status: 'active',
    isPaid: true
  };

  console.log("\nAttempt 2: Writing full profile (excluding expiryDate & registrationDate)...");
  try {
    await setDoc(doc(db, 'users', uid), fullProfile);
    console.log("-> Success! Full profile write allowed.");
  } catch (err) {
    console.error("-> Failed on full profile write:", err.message);
  }
}

sliceRules()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
