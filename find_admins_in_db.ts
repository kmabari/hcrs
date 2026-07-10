import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function findAdmins() {
  const app = initializeApp(config, "findAdminsApp");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
    console.log("Logged in UID:", auth.currentUser?.uid);

    const snapshot = await getDocs(collection(db, 'users'));
    console.log(`Total users in DB: ${snapshot.size}`);

    const admins: any[] = [];
    const operators: any[] = [];
    const isAdminFields: any[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.isAdmin === true) {
        isAdminFields.push({ id: doc.id, email: data.email, role: data.role, name: data.name });
      }
      if (data.role === 'admin') {
        admins.push({ id: doc.id, email: data.email, role: data.role, name: data.name });
      }
      if (data.role === 'operator') {
        operators.push({ id: doc.id, email: data.email, role: data.role, name: data.name });
      }
    });

    console.log("\nUsers with isAdmin === true:", isAdminFields);
    console.log("\nUsers with role === 'admin':", admins);
    console.log("\nUsers with role === 'operator':", operators);

  } catch (err: any) {
    console.error("Failed to fetch users:", err.message);
  }
}

findAdmins().then(() => process.exit(0));
