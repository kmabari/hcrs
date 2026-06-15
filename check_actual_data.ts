import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Authenticating as main admin...");
  try {
    await signInWithEmailAndPassword(auth, "9645934571@hcrs.society", "246810");
    console.log("Admin logged in successfully.");
  } catch (err: any) {
    console.error("Admin Authentication Failed:", err.message);
    process.exit(1);
  }

  // 1. Fetch districtQuotas/WYD
  console.log("\n--- Checking districtQuotas/WYD ---");
  try {
    const quotaWYDSnap = await getDoc(doc(db, 'districtQuotas', 'WYD'));
    if (quotaWYDSnap.exists()) {
      console.log("WYD Quota Success:", quotaWYDSnap.data());
    } else {
      console.log("WYD Quota document does not exist.");
    }
  } catch (err: any) {
    console.error("WYD Quota Fetch Failed:", {
      message: err.message,
      code: err.code,
      customData: err.customData
    });
  }

  // 2. Fetch districtQuotas/KOZ
  console.log("\n--- Checking districtQuotas/KOZ ---");
  try {
    const quotaKOZSnap = await getDoc(doc(db, 'districtQuotas', 'KOZ'));
    if (quotaKOZSnap.exists()) {
      console.log("KOZ Quota Success:", quotaKOZSnap.data());
    } else {
      console.log("KOZ Quota document does not exist.");
    }
  } catch (err: any) {
    console.error("KOZ Quota Fetch Failed:", {
      message: err.message,
      code: err.code,
      customData: err.customData
    });
  }

  // 3. Wayanad operator document
  console.log("\n--- Checking users/jPPUKUTZHpTU0j9pzmArOMXYZbx1 ---");
  try {
    const userWYDSnap = await getDoc(doc(db, 'users', 'jPPUKUTZHpTU0j9pzmArOMXYZbx1'));
    if (userWYDSnap.exists()) {
      console.log("WYD Operator Success:", userWYDSnap.data());
    } else {
      console.log("WYD Operator document does not exist.");
    }
  } catch (err: any) {
    console.error("WYD Operator Fetch Failed:", {
      message: err.message,
      code: err.code,
      customData: err.customData
    });
  }

  // 4. Kozhikode operator document
  console.log("\n--- Checking users/VTCNvjz8RGXEha1XIqMelBQwu1l2 ---");
  try {
    const userKOZSnap = await getDoc(doc(db, 'users', 'VTCNvjz8RGXEha1XIqMelBQwu1l2'));
    if (userKOZSnap.exists()) {
      console.log("KOZ Operator Success:", userKOZSnap.data());
    } else {
      console.log("KOZ Operator document does not exist.");
    }
  } catch (err: any) {
    console.error("KOZ Operator Fetch Failed:", {
      message: err.message,
      code: err.code,
      customData: err.customData
    });
  }
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Unhandled Error:", err);
    process.exit(1);
  });
