import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testWithAdmin() {
  console.log("Logging in as Admin: 9645934571@hcrs.society...");
  await signInWithEmailAndPassword(auth, "9645934571@hcrs.society", "246810");
  console.log("Admin login success!");

  const targetUid = "2jgcCrgHp2hTwGXZCe9L1FztB8T2"; // Moly Joseph's auth UID
  const oldDocId = "life_7561897767_1781102904443";

  const minimalProfile = {
    uid: targetUid,
    name: "Moly Joseph",
    mobile: "7561897767",
    email: "l-molyjoseph955@gmail.com",
    isAdmin: false,
    role: "member",
    membership_type: "LIFE_MEMBER",
    status: "active"
  };

  console.log("Admin attempting setDoc to users/" + targetUid + "...");
  try {
    await setDoc(doc(db, 'users', targetUid), minimalProfile);
    console.log("-> Admin setDoc SUCCESS!");
  } catch (err) {
    console.error("-> Admin setDoc FAILED:", err.message);
  }

  console.log("Admin attempting deleteDoc of users/" + oldDocId + "...");
  try {
    await deleteDoc(doc(db, 'users', oldDocId));
    console.log("-> Admin deleteDoc SUCCESS!");
  } catch (err) {
    console.error("-> Admin deleteDoc FAILED:", err.message);
  }
}

testWithAdmin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
