import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function checkData() {
  console.log("Initializing Firebase Admin SDK for active workspace project...");
  
  // By passing empty config, Admin SDK automatically resolves current project context (hcrs-membership)
  try {
    initializeApp();
    console.log("Admin SDK initialized successfully with environment credentials.");
  } catch (err: any) {
    console.warn("Express default init failed, trying explicit project ID...", err.message);
    try {
      initializeApp({ projectId: 'hcrs-membership' });
    } catch (inner: any) {
      console.error("Failed completely to initialize Admin SDK:", inner.message);
      process.exit(1);
    }
  }

  const db = getFirestore();
  const collections = ['users', 'claims', 'gallery', 'announcements', 'districtQuotas', 'settings', 'support_tickets', 'migration_logs', 'committees'];

  console.log("\n--- QUERYING COLLECTION SIZES DIRECTLY BEYOND RULES ---");
  for (const coll of collections) {
    try {
      const snap = await db.collection(coll).get();
      console.log(`Collection '${coll}': ${snap.size} documents found.`);
      if (snap.size > 0) {
        console.log(`  Sample Document IDs:`, snap.docs.slice(0, 3).map(d => d.id));
        if (coll === 'claims') {
          console.log(`  First Claim sample details:`, snap.docs[0].data());
        }
        if (coll === 'settings') {
          console.log(`  Settings doc sample:`, snap.docs[0].id, snap.docs[0].data());
        }
      }
    } catch (err: any) {
      console.error(`  Error reading '${coll}':`, err.message);
    }
  }
}

checkData().then(() => process.exit(0));
