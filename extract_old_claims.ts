import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const oldConfig = {
  ...currentConfig,
  projectId: "gen-lang-client-0932665202",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

async function tryExtractClaims() {
  console.log("Attempting to connect to the old database to search for claims...");
  
  // Try with the custom database ID from the old project
  const dbId = "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528";
  const app = initializeApp(oldConfig, "ExtractOldClaimsApp");
  const db = getFirestore(app, dbId);

  try {
    const claimsSnap = await getDocs(collection(db, 'claims'));
    console.log(`[Success] Found ${claimsSnap.size} claims in old custom database!`);
    if (claimsSnap.size > 0) {
      const claimsList = claimsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fs.writeFileSync('extracted_old_claims.json', JSON.stringify(claimsList, null, 2));
      console.log("Successfully saved old claims to extracted_old_claims.json!");
    }
    return;
  } catch (err: any) {
    console.error(`[Custom DB Error] Could not query claims library:`, err.code, err.message);
  }

  // Fallback: Test with the (default) database ID of the old project
  try {
    const defaultDb = getFirestore(app, "(default)");
    const claimsSnap = await getDocs(collection(defaultDb, 'claims'));
    console.log(`[Success] Found ${claimsSnap.size} claims in old (default) database!`);
    if (claimsSnap.size > 0) {
      const claimsList = claimsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fs.writeFileSync('extracted_old_claims.json', JSON.stringify(claimsList, null, 2));
      console.log("Successfully saved old claims to extracted_old_claims.json!");
    }
  } catch (err: any) {
    console.error(`[(default) DB Error] Could not query claims library:`, err.code, err.message);
  }
}

tryExtractClaims().then(() => process.exit(0));
