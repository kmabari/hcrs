import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function scan() {
  console.log("Initializing firebase-admin for project gen-lang-client-0932665202 standard DB (default)...");
  try {
    const app = initializeApp({
      projectId: "gen-lang-client-0932665202"
    }, "old_default_admin");
    
    const db = getFirestore(app);
    const snap = await db.collection('users').limit(10).get();
    console.log(`SUCCESS! Found ${snap.size} users in (default) database.`);
    if (snap.size > 0) {
      console.log("Sample user:", snap.docs[0].id, snap.docs[0].data());
    }
  } catch (err: any) {
    console.error("Failed standard DB (default) read:", err.message);
  }

  console.log("\nInitializing firebase-admin for project gen-lang-client-0932665202 specific DB ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528...");
  try {
    const app = initializeApp({
      projectId: "gen-lang-client-0932665202"
    }, "old_specific_admin");
    
    // In firebase-admin, to specify a database ID, we can pass it as a parameter or configuration
    // Wait, let's see how databaseId is specified in firebase-admin:
    const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");
    const snap = await db.collection('users').limit(10).get();
    console.log(`SUCCESS! Found ${snap.size} users in specific database.`);
  } catch (err: any) {
    console.error("Failed specific DB read:", err.message);
  }
}

scan()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
