import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize the Admin SDK dynamically
try {
  initializeApp({
    projectId: 'gen-lang-client-0932665202'
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (e: any) {
  console.error("Initialization error:", e.message);
}

async function scanDatabase(dbId: string) {
  console.log(`\n--------------------------------------------`);
  console.log(`SCANNING DATABASE ID: ${dbId}`);
  console.log(`--------------------------------------------`);

  try {
    // In newer firebase-admin, to get a specific database:
    const db = getFirestore(dbId);
    
    const usersColl = db.collection('users');
    const snapshot = await usersColl.get();
    
    console.log(`Successfully checked db "${dbId}". Found ${snapshot.size} users.`);
    
    if (snapshot.size > 0) {
      const users: any[] = [];
      snapshot.forEach((doc: any) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      
      const tvmUsers = users.filter(u => 
        String(u.district || '').toLowerCase().includes('thiruvananthapuram') || 
        String(u.district || '').toLowerCase().includes('tvm') ||
        String(u.address || '').toLowerCase().includes('thiruvananthapuram') ||
        String(u.address || '').toLowerCase().includes('tvm')
      );
      
      console.log(`- Total users in this DB: ${users.length}`);
      console.log(`- Users matching Thiruvananthapuram/TVM: ${tvmUsers.length}`);
      
      // Save data to JSON files
      const filename = `backup_${dbId}_users.json`;
      fs.writeFileSync(filename, JSON.stringify(users, null, 2));
      console.log(`Saved ${users.length} users to ${filename}`);
      
      // Print sample of matching users
      if (tvmUsers.length > 0) {
        console.log("Sample Thiruvananthapuram users found:");
        tvmUsers.slice(0, 10).forEach((u, idx) => {
          console.log(`  [${idx+1}] Name: ${u.name}, District: ${u.district}, Mobile: ${u.mobile} (Approved: ${u.isApproved}, Role: ${u.role})`);
        });
      }
    }
  } catch (error: any) {
    console.error(`Error scanning db "${dbId}":`, error.message);
  }
}

async function run() {
  const dbsToScan = [
    '(default)',
    'ai-studio-19791e7f-a2f5-4d27-af39-dcf31cf457a7',
    'ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528'
  ];
  
  for (const dbId of dbsToScan) {
    await scanDatabase(dbId);
  }
}

run()
  .then(() => {
    console.log("\nScan complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Scan crash:", err);
    process.exit(1);
  });
