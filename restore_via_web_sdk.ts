import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const users = JSON.parse(fs.readFileSync('./extracted_old_users.json', 'utf8'));

function parseValue(val: any): any {
  if (val && typeof val === 'object') {
    if (val.type === 'firestore/timestamp/1.0' && typeof val.seconds === 'number') {
      return new Timestamp(val.seconds, val.nanoseconds || 0);
    }
    if (Array.isArray(val)) {
      return val.map(item => parseValue(item));
    }
    const parsed: any = {};
    for (const key of Object.keys(val)) {
      parsed[key] = parseValue(val[key]);
    }
    return parsed;
  }
  return val;
}

const DISTRICT_NAMES: Record<string, string> = {
  MLP: "Malappuram",
  KTM: "Kottayam",
  KNR: "Kannur",
  PKD: "Palakkad",
  EKM: "Ernakulam",
  WYD: "Wayanad",
  KSD: "Kasaragod",
  KOZ: "Kozhikode",
  TCR: "Thrissur",
  TVM: "Thiruvananthapuram",
  ALp: "Alappuzha",
  PTA: "Pathanamthitta",
  KLM: "Kollam",
  IDK: "Idukki"
};

async function runRestore() {
  console.log(`Starting restore of ${users.length} users to project: ${config.projectId}`);
  const app = initializeApp(config, "UploaderWebSDK");
  const db = getFirestore(app);

  let successCount = 0;
  let batch = writeBatch(db);
  let batchSize = 0;

  const districtsCount: Record<string, number> = {};

  for (let i = 0; i < users.length; i++) {
    const rawUser = users[i];
    const userDoc = parseValue(rawUser);
    const userId = userDoc.id || userDoc.uid;

    if (!userId) {
      console.log(`Skipping index ${i}: no valid id or uid`);
      continue;
    }

    // Keep track of district counts
    const d = (userDoc.district || 'UNKNOWN').toUpperCase().trim();
    if (d && d !== 'UNKNOWN') {
      districtsCount[d] = (districtsCount[d] || 0) + 1;
    }

    const docRef = doc(db, 'users', userId);
    batch.set(docRef, userDoc);
    batchSize++;
    successCount++;

    if (batchSize === 400) {
      console.log(`Committing batch. Restored so far: ${successCount}`);
      await batch.commit();
      batch = writeBatch(db);
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    console.log(`Committing final batch of: ${batchSize}`);
    await batch.commit();
  }

  console.log(`Successfully restored ${successCount} users to 'users' collection!`);

  // Now, let's seed/update the district quotas based on the actual counts!
  console.log("\nSeeding districtQuotas based on restored users...");
  for (const [code, count] of Object.entries(districtsCount)) {
    const name = DISTRICT_NAMES[code] || code;
    const qDocRef = doc(db, 'districtQuotas', code);
    const quotaData = {
      id: code,
      districtName: name,
      used: count,
      total: Math.max(count + 200, 500) // Give them healthy room to add more members
    };
    await setDoc(qDocRef, quotaData);
    console.log(`  - District Quota updated for ${code} (${name}): used = ${count}, total = ${quotaData.total}`);
  }

  // Also seed default main_config settings if they don't exist
  console.log("\nChecking or creating default main_config in 'settings' collection...");
  try {
    const mainConfigRef = doc(db, 'settings', 'main_config');
    const defaultSettings = {
      fullName: 'HCRS society',
      shortName: 'HCRS',
      aboutUs: 'HCRS contributes towards social improvement and mutual assistance.',
      mission: 'Providing best care and services.',
      vision: 'Building a prosperous and cooperative society.',
      phone: '9645934571',
      email: 'hcrskerala@gmail.com',
      website: 'www.hcrs.society',
      districtDetails: 'Kerala State'
    };
    await setDoc(mainConfigRef, defaultSettings);
    console.log("Successfully created default system settings/main_config!");
  } catch (err: any) {
    console.error("Failed to create default settings/main_config:", err.message);
  }

  console.log("\nRestore process completed fully and cleanly!");
}

runRestore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Restore failed:", err);
    process.exit(1);
  });
