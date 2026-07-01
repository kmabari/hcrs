import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function getAdminPins() {
  const app = initializeApp(currentConfig, "PinScanner");
  const auth = getAuth(app);
  const db = getFirestore(app, currentConfig.firestoreDatabaseId);

  // Sign in as admin to have read permissions (we can log in with admin@hcrs.society/246810)
  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Logged in successfully to read user profiles.");
  } catch (e: any) {
    console.error("Auth login failed:", e.message);
    return;
  }

  // Scan all users with admin roles or specific emails
  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log(`Scanning ${snap.size} profiles...`);
    snap.forEach(doc => {
      const data = doc.data();
      const email = String(data.email || '').toLowerCase();
      const role = String(data.role || '').toLowerCase();
      const isAdmin = data.isAdmin === true || data.isAdmin === 'true';
      if (isAdmin || role === 'admin' || role === 'operator' || email.includes('hcrskerala') || email.includes('hcrsindia') || email.includes('mabarikiya')) {
        console.log(`Admin User ID: ${doc.id}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Email: ${data.email}`);
        console.log(`  Mobile: ${data.mobile}`);
        console.log(`  Role: ${data.role} | IsAdmin: ${data.isAdmin}`);
        console.log(`  PIN: ${data.pin || data.password || 'N/A'}`);
        console.log(`-------------------------------------------`);
      }
    });
  } catch (e: any) {
    console.error("Failed to query users:", e.message);
  }
}

getAdminPins()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
