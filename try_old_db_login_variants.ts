import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const oldConfig = {
  ...currentConfig,
  projectId: "gen-lang-client-0932665202",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

const credentials = [
  { email: "kmabarikiyafoods@gmail.com", pin: "123456" },
  { email: "kmabarikiyafoods@gmail.com", pin: "246810" },
  { email: "hcrskerala@gmail.com", pin: "123456" },
  { email: "hcrskerala@gmail.com", pin: "246810" },
  { email: "admin@hcrs.society", pin: "123456" },
  { email: "admin@hcrs.society", pin: "246810" },
  { email: "9645934571@hcrs.society", pin: "123456" },
  { email: "9645934571@hcrs.society", pin: "246810" },
];

async function tryVariants() {
  const app = initializeApp(oldConfig, "OldAppVariants");
  const auth = getAuth(app);
  const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  for (const cred of credentials) {
    console.log(`\nTesting login: ${cred.email} with password: ${cred.pin}...`);
    try {
      const userCred = await signInWithEmailAndPassword(auth, cred.email, cred.pin);
      const uid = userCred.user.uid;
      console.log(`-> LOGIN SUCCESS! Email: ${cred.email}, UID: ${uid}`);

      // Now query claims to see if permission is granted
      try {
        const claimsSnap = await getDocs(collection(db, 'claims'));
        console.log(`--> SUCCESS! Found ${claimsSnap.size} claims in old database!`);
        if (claimsSnap.size > 0) {
          claimsSnap.docs.forEach((doc, idx) => {
            console.log(`    [#${idx + 1}] ID: ${doc.id}`, doc.data());
          });
          // Stop scanning since we got them!
          return;
        }
      } catch (err: any) {
        console.log(`--> Claims query failed for this session: ${err.message}`);
      }

      // Try checking if (default) database has them instead
      try {
        const defaultDb = getFirestore(app, "(default)");
        const claimsSnap = await getDocs(collection(defaultDb, 'claims'));
        console.log(`--> SUCCESS! Found ${claimsSnap.size} claims in OLD (default) database!`);
        if (claimsSnap.size > 0) {
          claimsSnap.docs.forEach((doc, idx) => {
            console.log(`    [#${idx + 1}] ID: ${doc.id}`, doc.data());
          });
          return;
        }
      } catch (err: any) {
        console.log(`--> Default db claims query failed for this session: ${err.message}`);
      }

    } catch (e: any) {
      console.log(`-> Login failed: ${e.message}`);
    }
  }
}

tryVariants()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
