import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testAll() {
  console.log("Checking all collections on the current database...");
  const app = initializeApp(config, "TestAllCollectionsRelaxed");
  const db = getFirestore(app);

  const collections = ['users', 'claims', 'gallery', 'announcements', 'districtQuotas', 'settings', 'support_tickets', 'migration_logs', 'committees'];

  for (const coll of collections) {
    try {
      const q = query(collection(db, coll), limit(5));
      const snapshot = await getDocs(q);
      console.log(`Collection '${coll}': ${snapshot.size} documents found (checked first 5)`);
      if (snapshot.size > 0) {
        console.log(`  Sample IDs:`, snapshot.docs.map(d => d.id));
      }
    } catch (err: any) {
      console.error(`  Error reading collection '${coll}':`, err.message);
    }
  }
}

testAll()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
