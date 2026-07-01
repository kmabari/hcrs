import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
<<<<<<< HEAD
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
=======
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const oldConfig = {
  ...currentConfig,
  projectId: "gen-lang-client-0932665202",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

async function testDatabase(label: string, config: any, dbId: string) {
  console.log(`\n=============================================`);
  console.log(` TESTING: ${label}`);
  console.log(` ProjectId: ${config.projectId}`);
  console.log(` DatabaseId: ${dbId}`);
  console.log(`=============================================`);

  const appName = label.replace(/\s+/g, '_');
  const app = initializeApp(config, appName);
  const auth = getAuth(app);
  const db = getFirestore(app, dbId);

  // Authenticate as Admin
  console.log("--- Authenticating with Email/Password ---");
  try {
    const userCred = await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Log in successful! User ID:", userCred.user.uid);
  } catch (authErr: any) {
    console.error("Auth login failed:", authErr.message);
  }

  // 1. Fetch districtQuotas/WYD
  console.log("--- Checking districtQuotas/WYD ---");
>>>>>>> new-repo/main
  try {
    const quotaWYDSnap = await getDoc(doc(db, 'districtQuotas', 'WYD'));
    if (quotaWYDSnap.exists()) {
      console.log("WYD Quota Success:", quotaWYDSnap.data());
    } else {
      console.log("WYD Quota document does not exist.");
    }
  } catch (err: any) {
<<<<<<< HEAD
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
=======
    console.error("WYD Quota Fetch Failed:", err.message);
  }

  // 2. Fetch public settings
  console.log("--- Checking settings/global_v2 ---");
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'global_v2'));
    if (settingsSnap.exists()) {
      console.log("Settings global_v2 Success:", settingsSnap.data());
    } else {
      console.log("Settings global_v2 does not exist.");
    }
  } catch (err: any) {
    console.error("Settings Fetch Failed:", err.message);
  }

  // 3. Try listing users (will work if read rules allow or if there are no rules)
  console.log("--- Checking users collection ---");
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnap.size} users.`);
    if (usersSnap.size > 0) {
      console.log("Sample user:", usersSnap.docs[0].id, {
        ...usersSnap.docs[0].data(),
        photoUrl: undefined, // Hide long base64 strings if any
        photo: undefined,
        photo_base64: undefined
      });
    }
  } catch (err: any) {
    console.error("Users list failed:", err.message);
  }
}

async function run() {
  // Test default database
  await testDatabase("Default Database", currentConfig, "(default)");

  // Test current configuration
  await testDatabase("Current Configuration", currentConfig, currentConfig.firestoreDatabaseId);

  // Test old database on current project (just in case)
  await testDatabase("Old Database ID on Current Project", currentConfig, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  // Test old project with old database ID
  await testDatabase("Old Project Setup", oldConfig, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");
>>>>>>> new-repo/main
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Unhandled Error:", err);
    process.exit(1);
  });
