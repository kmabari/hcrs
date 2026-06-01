import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkUser() {
  const targetMobile = '9037373037';
  console.log(`Checking mobile ${targetMobile} in Firestore...`);
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('mobile', '==', targetMobile));
  
  const querySnap = await getDocs(q);
  console.log(`Query completed. Found ${querySnap.size} document(s).`);
  
  querySnap.forEach(docSnap => {
    console.log(`\nDocument ID (UID): ${docSnap.id}`);
    console.log("Data:", JSON.stringify(docSnap.data(), null, 2));
  });
}

checkUser()
  .then(() => {
    console.log("Success checking user.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error checking user:", err);
    process.exit(1);
  });
