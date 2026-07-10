import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function scanCurrent() {
  console.log("Current Database:", currentConfig.projectId);
  const app = initializeApp(currentConfig, "ScanCurrentApp");
  const auth = getAuth(app);
  const db = getFirestore(app, currentConfig.firestoreDatabaseId);

  try {
    console.log("Signing in as admin...");
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Login successful!");
  } catch (e: any) {
    console.log("Login failed:", e.message);
    try {
      console.log("Logging in as hcrskerala...");
      await signInWithEmailAndPassword(auth, "hcrskerala@gmail.com", "246810");
      console.log("Login successful!");
    } catch (e2: any) {
      console.log("Login as hcrskerala failed:", e2.message);
      return;
    }
  }

  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log(`\nTotal users in current database: ${snap.size}`);
    
    const districtCounts: Record<string, number> = {};
    const tvmUsers: any[] = [];
    
    snap.forEach(doc => {
      const data = doc.data();
      const dist = String(data.district || 'UNKNOWN').toUpperCase();
      districtCounts[dist] = (districtCounts[dist] || 0) + 1;
      
      if (dist === 'TVM' || dist.includes('THIRUVANANTHAPURAM')) {
        tvmUsers.push({ id: doc.id, name: data.name, mobile: data.mobile, district: data.district, registrationDate: data.registrationDate });
      }
    });
    
    console.log("\nUsers by District:");
    for (const [dist, count] of Object.entries(districtCounts)) {
      console.log(`  - ${dist}: ${count}`);
    }
    
    console.log(`\nFound ${tvmUsers.length} users from Thiruvananthapuram:`);
    tvmUsers.forEach((u, i) => {
      console.log(`  [${i+1}] ID: ${u.id}, Name: ${u.name}, Mobile: ${u.mobile}, Date: ${u.registrationDate}`);
    });
    
  } catch (e: any) {
    console.error("Failed to query users collection:", e.message);
  }
}

scanCurrent()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
