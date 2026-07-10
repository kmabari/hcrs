import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkLifeMembers() {
  console.log("Authenticating as admin...");
  const adminEmail = "9645934571@hcrs.society";
  const adminPin = "246810";
  
  await signInWithEmailAndPassword(auth, adminEmail, adminPin);
  
  console.log("Auth successful! Fetching users...");

  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  
  let count = 0;
  snap.forEach((doc) => {
    const data = doc.data();
    const isLife = String(data.membership_type || '').toUpperCase().includes('LIFE') ||
                   String(data.membershipType || '').toUpperCase().includes('LIFE') ||
                   String(data.membershipId || '').toUpperCase().includes('LIFE');
                   
    if (isLife) {
      count++;
      console.log(`[Life Member #${count}] ID: ${doc.id}`);
      for (const [key, val] of Object.entries(data)) {
        console.log(`  ${key}: ${val} (${typeof val})`);
      }
      console.log("-----------------------------------------");
    }
  });
}

checkLifeMembers()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error("Diagnosis error:", err);
    process.exit(1);
  });
