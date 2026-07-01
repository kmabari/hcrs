import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize the Admin SDK with current config's project ID
const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
console.log("Initializing admin SDK for new project:", currentConfig.projectId);

try {
  initializeApp({
    projectId: currentConfig.projectId
  });
  console.log("Firebase Admin SDK initialized successfully for project:", currentConfig.projectId);
} catch (e: any) {
  console.error("Initialization error:", e.message);
}

async function scanNewDb() {
  try {
    const db = getFirestore();
    const usersColl = db.collection('users');
    const snapshot = await usersColl.get();
    
    console.log(`\n========================================`);
    console.log(`NEW DB STATUS: ${currentConfig.projectId}`);
    console.log(`========================================`);
    console.log(`Total users found: ${snapshot.size}`);
    
    if (snapshot.size > 0) {
      const districts: Record<string, number> = {};
      const tvm: any[] = [];
      
      snapshot.forEach((doc: any) => {
        const u = doc.data();
        const dist = String(u.district || '').toUpperCase().trim();
        districts[dist] = (districts[dist] || 0) + 1;
        
        if (dist === 'TVM' || dist.includes('THIRUVANANTHAPURAM') || String(u.address || '').toUpperCase().includes('THIRUVANANTHAPURAM')) {
          tvm.push({ id: doc.id, ...u });
        }
      });
      
      console.log("\nDistricts found in NEW Database:");
      for (const [dist, count] of Object.entries(districts)) {
        console.log(`  - ${dist || '(EMPTY)'}: ${count}`);
      }
      
      console.log(`\nFound ${tvm.length} Thiruvananthapuram members:`);
      tvm.forEach((u, i) => {
        console.log(`  [${i+1}] Name: ${u.name}, Mobile: ${u.mobile}, District: ${u.district}`);
      });
    }
  } catch (error: any) {
    console.error("Error reading new database:", error.message);
  }
}

scanNewDb()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
