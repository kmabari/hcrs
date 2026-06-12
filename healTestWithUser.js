import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function runTest() {
  console.log("Authenticating as Life Member: l-molyjoseph955@gmail.com...");
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, "l-molyjoseph955@gmail.com", "123456");
    console.log("Auth success! Logged in UID:", userCredential.user.uid);
  } catch (err) {
    console.error("Auth failed:", err);
    return;
  }

  const authUser = userCredential.user;
  const oldDocId = "life_7561897767_1781102904443";
  
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
