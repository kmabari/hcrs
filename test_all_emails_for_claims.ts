import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const accounts = [
  { email: 'kmabarikiyafoods@gmail.com', pin: '123456' },
  { email: 'hcrskerala@gmail.com', pin: '123456' },
  { email: 'admin@hcrs.society', pin: '246810' },
  { email: 'srejithwayanad@gmail.com', pin: '240678' }
];

async function checkAccounts() {
  for (const acct of accounts) {
    const app = initializeApp(config, `App_${acct.email.replace(/[@\.]/g, '_')}`);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log(`\nTesting account: ${acct.email}...`);
    try {
      await signInWithEmailAndPassword(auth, acct.email, acct.pin);
      console.log(`  Login success! UID: ${auth.currentUser?.uid}`);

      // Test reading claims
      try {
        const snap = await getDocs(query(collection(db, 'claims'), limit(3)));
        console.log(`  CLAIMS READ SUCCESS! Size: ${snap.size}`);
        if (snap.size > 0) {
          console.log(`    First claim ID: ${snap.docs[0].id}`);
        }
      } catch (err: any) {
        console.log(`  CLAIMS READ FAILED: ${err.message}`);
      }

      // Test reading support_tickets
      try {
        const snap = await getDocs(query(collection(db, 'support_tickets'), limit(3)));
        console.log(`  SUPPORT_TICKETS READ SUCCESS! Size: ${snap.size}`);
        if (snap.size > 0) {
          console.log(`    First ticket ID: ${snap.docs[0].id}`);
        }
      } catch (err: any) {
        console.log(`  SUPPORT_TICKETS READ FAILED: ${err.message}`);
      }

    } catch (err: any) {
      console.log(`  Login failed: ${err.message}`);
    }
  }
}

checkAccounts().then(() => process.exit(0));
