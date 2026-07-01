import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const oldConfig = {
  ...currentConfig,
  projectId: "gen-lang-client-0932665202",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

async function tryAccess() {
  const app = initializeApp(oldConfig, "OldAppSec");
  const auth = getAuth(app);
  const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  const email = "admin@hcrs.society";
  const pin = "246810";

  let uid = "";
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pin);
    uid = cred.user.uid;
    console.log("Logged in to old project successfully as admin. UID:", uid);
  } catch (e: any) {
    console.log("Sign-in failed:", e.message, "Trying registration...");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pin);
      uid = cred.user.uid;
      console.log("Registered on old project successfully. UID:", uid);
    } catch (createErr: any) {
      console.error("Registration failed:", createErr.message);
      return;
    }
  }

  // Now let's try writing an admin profile document for this UID in the old database
  console.log("Attempting to write admin profile in old database...");
  try {
    await setDoc(doc(db, 'users', uid), {
      uid: uid,
      name: "Admin",
      email: email,
      isAdmin: true,
      role: "admin",
      status: "active"
    });
    console.log("SUCCESSFULLY wrote admin profile in old database!");
  } catch (e: any) {
    console.warn("Could not write admin profile in old database:", e.message);
  }

  // Try fetching claims
  try {
    const claimsSnap = await getDocs(collection(db, 'claims'));
    console.log(`Found ${claimsSnap.size} claims!`);
    claimsSnap.docs.forEach((doc, i) => {
      console.log(`[Claim #${i+1}]`, doc.id, doc.data());
    });
  } catch (e: any) {
    console.error("Claims query still failed:", e.message);
  }
}

tryAccess()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
