import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const oldConfig = {
  projectId: "gen-lang-client-0932665202",
  appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
  apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-19791e7f-a2f5-4d27-af39-dcf31cf457a7",
  storageBucket: "gen-lang-client-0932665202.appspot.com",
  messagingSenderId: "739674403429",
  measurementId: "G-DB4NFRT6H7"
};

async function testOld() {
  const app = initializeApp(oldConfig, "TestOldDbPublic");
  const db = getFirestore(app, "ai-studio-19791e7f-a2f5-4d27-af39-dcf31cf457a7");

  try {
    const docSnap = await getDoc(doc(db, "districtQuotas", "WYD"));
    if (docSnap.exists()) {
      console.log("Success! Read from ai-studio-19791e7f-a2f5-4d27-af39-dcf31cf457a7:", docSnap.data());
    } else {
      console.log("Document does not exist in old database. (But connection is successful)");
    }
  } catch (err: any) {
    console.error("Error connecting or reading:", err.message);
  }
}

testOld()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
