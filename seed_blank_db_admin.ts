import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize the Admin SDK with current config's project ID
const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
console.log("Initializing Admin SDK for project database seeding:", currentConfig.projectId);

try {
  initializeApp({
    projectId: currentConfig.projectId
  });
  console.log("Firebase Admin SDK initialized successfully");
} catch (e: any) {
  console.error("Initialization error:", e.message);
}

const DISTRICTS = [
  { name: 'Kasaragod', code: 'KSD' },
  { name: 'Kannur', code: 'KNR' },
  { name: 'Wayanad', code: 'WYD' },
  { name: 'Kozhikode', code: 'KOZ' },
  { name: 'Malappuram', code: 'MLP' },
  { name: 'Palakkad', code: 'PKD' },
  { name: 'Thrissur', code: 'TCR' },
  { name: 'Ernakulam', code: 'EKM' },
  { name: 'Idukki', code: 'IDK' },
  { name: 'Kottayam', code: 'KTM' },
  { name: 'Alappuzha', code: 'ALP' },
  { name: 'Pathanamthitta', code: 'PTA' },
  { name: 'Kollam', code: 'KLM' },
  { name: 'Thiruvananthapuram', code: 'TVM' },
];

async function seedDatabase() {
  try {
    const db = getFirestore();

    console.log("\n==================================================");
    console.log("Seeding default data into blank Firestore database...");
    console.log("==================================================");

    // 1. Seed districtQuotas
    console.log("1. Seeding districtQuotas collection...");
    const quotasColl = db.collection('districtQuotas');
    for (const d of DISTRICTS) {
      const docRef = quotasColl.doc(d.code);
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set({
          total: 1000,
          used: 0
        });
        console.log(`   - Created quota for ${d.name} (${d.code}) : Total 1000, Used 0`);
      } else {
        console.log(`   - Quota for ${d.code} already exists.`);
      }
    }

    // 2. Seed settings/main_config
    console.log("\n2. Seeding settings/main_config document...");
    const settingsDoc = db.collection('settings').doc('main_config');
    const settingsSnap = await settingsDoc.get();
    if (!settingsSnap.exists) {
      await settingsDoc.set({
        fullName: "HIGHRICH COMMUNITY REVIVAL SOCIETY",
        shortName: "HCRS",
        aboutUs: "Highrich Community Revival Society is built to assist members in recovering their funds and establishing sustainable active support panels.",
        mission: "Revival and security of members' livelihoods.",
        vision: "An empowered highrich-impact community.",
        address: "Kerala, India",
        phone: "+91 96459 34571",
        email: "hcrskerala@gmail.com",
        website: "https://www.hcrs.in",
        districtDetails: "Local community coordination help desks across all 14 districts."
      });
      console.log("   - Created settings/main_config successfully.");
    } else {
      console.log("   - settings/main_config already exists.");
    }

    // 3. Seed system/totals
    console.log("\n3. Seeding system/totals document...");
    const totalsDoc = db.collection('system').doc('totals');
    const totalsSnap = await totalsDoc.get();
    if (!totalsSnap.exists) {
      await totalsDoc.set({
        count: 0
      });
      console.log("   - Created system/totals successfully.");
    } else {
      console.log("   - system/totals already exists.");
    }

    // 4. Seed system/ping
    console.log("\n4. Seeding system/ping document...");
    const pingDoc = db.collection('system').doc('ping');
    await pingDoc.set({
      ping: true,
      timestamp: new Date()
    });
    console.log("   - Set system/ping status.");

    console.log("\nDatabase seed completed successfully! 🎉");
  } catch (error: any) {
    console.error("Error seeding new database:", error.message);
  }
}

seedDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
