import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function runTest() {
  console.log("Authenticating as Life Member: ollassery@gmail.com...");
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, "ollassery@gmail.com", "123456");
    console.log("Auth success! Logged in UID:", userCredential.user.uid);
  } catch (err) {
    console.log("Auth login failed, trying to sign in or register if user doesn't exist...");
    try {
      // Try to create the Auth account if it doesn't exist, simulating the app's healing flow
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      userCredential = await createUserWithEmailAndPassword(auth, "ollassery@gmail.com", "123456");
      console.log("Auth creation success! Logged in UID:", userCredential.user.uid);
    } catch (createErr) {
      console.error("Auth creation/login failed:", createErr.message);
      return;
    }
  }

  const authUser = userCredential.user;
  const oldDocId = "life_7736586048_1781058136029";
  
  // 1. Fetch old document
  console.log(`Step 1: Fetching old document: ${oldDocId}...`);
  let oldDocSnap;
  try {
    oldDocSnap = await getDoc(doc(db, 'users', oldDocId));
    console.log("Fetch success! Exists:", oldDocSnap.exists());
  } catch (err) {
    console.error("Fetch old doc failed:", err);
    return;
  }

  if (!oldDocSnap.exists()) {
    console.error("Old document not found in Firestore!");
    return;
  }

  const profileData = oldDocSnap.data();
  console.log("Profile data retrieved:", profileData.name);
  const healedProfile = {
    ...profileData,
    uid: authUser.uid,
    role: profileData.role || 'member',
    status: profileData.status || 'active',
  };

  // 2. Try setDoc
  console.log(`Step 2: Performing setDoc of healed profile to users/${authUser.uid}...`);
  try {
    await setDoc(doc(db, 'users', authUser.uid), healedProfile);
    console.log("SUCCESS: setDoc of healed profile was ALLOWED!");
  } catch (err) {
    console.error("FAILED: setDoc of healed profile was REJECTED:", err);
  }

  // 3. Try deleteDoc
  console.log(`Step 3: Performing deleteDoc of old document users/${oldDocId}...`);
  try {
    await deleteDoc(doc(db, 'users', oldDocId));
    console.log("SUCCESS: deleteDoc of old profile was ALLOWED!");
  } catch (err) {
    console.error("FAILED: deleteDoc of old profile was REJECTED:", err);
  }
}

runTest()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
