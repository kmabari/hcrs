import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const oldConfig = {
  ...currentConfig,
  projectId: "gen-lang-client-0932665202",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

const emails = ["admin@hcrs.society", "9645934571@hcrs.society", "hcrskerala@gmail.com"];
const pin = "246810";

async function scanDb(label: string, config: any, dbId: string) {
  console.log(`\n=============================================`);
  console.log(` SCANNING DATABASE: ${label} (${dbId})`);
  console.log(`=============================================`);

  const appName = label.replace(/\s+/g, '_');
  const app = initializeApp(config, appName);
  const auth = getAuth(app);
  const db = getFirestore(app, dbId);

  let loggedIn = false;
  for (const email of emails) {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, pin);
      console.log(`Successfully logged in as: ${email}`);
      loggedIn = true;
      break;
    } catch (e: any) {
      console.log(`Failed sign-in for ${email}: ${e.message}`);
    }
  }

  if (!loggedIn) {
    console.log("Could not log in with existing credentials. Trying auto-creation of admin...");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, "admin@hcrs.society", pin);
      console.log("Created & Logged in as: admin@hcrs.society");
      loggedIn = true;
    } catch (e: any) {
      console.log(`Failed to create admin account: ${e.message}`);
    }
  }

  // Look for users
  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
    console.log(`[users] Found ${usersSnap.size} user documents.`);
    if (usersSnap.size > 0) {
      console.log("Sample User IDs found in users collection:");
      usersSnap.docs.slice(0, 3).forEach(doc => {
        console.log(`  - ${doc.id}: ${doc.data().name || doc.data().displayName}`);
      });
    }
  } catch (e: any) {
    console.log(`[users] Query failed: ${e.message}`);
  }

  // Look for claims
  try {
    const claimsSnap = await getDocs(collection(db, 'claims'));
    console.log(`[claims] Found ${claimsSnap.size} claim documents.`);
    if (claimsSnap.size > 0) {
      claimsSnap.docs.forEach((doc, idx) => {
        const claim = doc.data();
        console.log(`  - #${idx + 1} ID: ${doc.id} | Name: ${claim.userName || claim.name} | Mobile: ${claim.userMobile || claim.mobile} | Total Pending: ${claim.totalPending}`);
      });
    }
  } catch (e: any) {
    console.log(`[claims] Query failed: ${e.message}`);
  }

  // Look for migration_logs
  try {
    const logsSnap = await getDocs(collection(db, 'migration_logs'));
    console.log(`[migration_logs] Found ${logsSnap.size} documents.`);
  } catch (e) {
    // ignore
  }
}

async function run() {
  // Test current configuration with standard database
  await scanDb("Current Config DB", currentConfig, currentConfig.firestoreDatabaseId);

  // Test old database ID on old project
  await scanDb("Old DB ID on Old Project", oldConfig, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  // Test default database ID on old project
  await scanDb("Default DB ID on Old Project", oldConfig, "(default)");
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
