import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function scan() {
  const app = initializeApp(config, "UserScanner");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");

    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    console.log(`Checking 'photoUrl' field values across ${snap.size} users...`);
    
    let keyExists = 0;
    let nonEmpties = 0;
    const valueCounts: Record<string, number> = {};

    snap.forEach(doc => {
      const u = doc.data();
      if ('photoUrl' in u) {
        keyExists++;
        const val = String(u.photoUrl);
        valueCounts[val] = (valueCounts[val] || 0) + 1;
        if (u.photoUrl && u.photoUrl !== "") {
          nonEmpties++;
        }
      }
    });

    console.log(`Key 'photoUrl' exists in ${keyExists} user documents.`);
    console.log(`Non-empty 'photoUrl' values: ${nonEmpties}`);
    console.log("Distribution of photoUrl values:", valueCounts);
  } catch (e: any) {
    console.error("Failed to scan photoUrl values:", e.message);
  }
}

scan().then(() => process.exit(0));
