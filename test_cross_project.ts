import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const activeConfig = {
  projectId: "ais-asia-southeast1-b8fcff19c3",
  appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
  apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
  authDomain: "ais-asia-southeast1-b8fcff19c3.firebaseapp.com",
};

async function testActive() {
  const app = initializeApp(activeConfig, "TestActiveProject");
  const auth = getAuth(app);
  const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  try {
    console.log("Authenticating against ais-asia-southeast1-b8fcff19c3...");
    const cred = await signInWithEmailAndPassword(auth, "9645934571@hcrs.society", "246810");
    console.log("Auth success! User UID:", cred.user.uid);
    
    console.log("Reading from database under this auth...");
    const snap = await getDoc(doc(db, "districtQuotas", "WYD"));
    if (snap.exists()) {
      console.log("SUCCESS! Got WYD Data:", snap.data());
    } else {
      console.log("Document does not exist.");
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

testActive()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
