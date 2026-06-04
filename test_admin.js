import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  const app = initializeApp({
    projectId: "gen-lang-client-0932665202"
  });
  const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");
  console.log("Database initialized successfully!");
  
  // Test reading a document
  const testRef = db.collection('test').doc('connection');
  const snap = await testRef.get();
  console.log("Successfully connected! Succeeded in reading test document:", snap.exists);
} catch (e) {
  console.error("Test failed:", e);
}
