import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function getTotals() {
  const app = initializeApp(config, "GetTotals");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Logged in successfully. Fetching /system/totals...");

    const totalsSnap = await getDoc(doc(db, 'system', 'totals'));
    if (totalsSnap.exists()) {
      console.log("SYSTEM TOTALS DOCUMENT EXISTS:", totalsSnap.data());
    } else {
      console.log("SYSTEM TOTALS DOCUMENT DOES NOT EXIST.");
    }
  } catch (err: any) {
    console.error("Error fetching system totals:", err.code, err.message);
  }
}

getTotals().then(() => process.exit(0));
