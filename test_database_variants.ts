import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const config = {
  projectId: "gen-lang-client-0932665202",
  appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
  apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

async function testDb(dbId: string) {
  console.log(`\nTesting database: ${dbId}`);
  const app = initializeApp(config, `App_${dbId.replace(/\-/g, '_')}`);
  const db = getFirestore(app, dbId);

  try {
    const docSnap = await getDoc(doc(db, "districtQuotas", "WYD"));
    if (docSnap.exists()) {
      console.log(`Success! [${dbId}] read WYD:`, docSnap.data());
    } else {
      console.log(`[${dbId}] Success but WYD document does not exist.`);
    }
  } catch (err: any) {
    console.error(`[${dbId}] Error:`, err.message);
  }
}

async function run() {
  await testDb("ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");
  await testDb("ai-studio-19791e7f-a2f5-4d27-af39-dcf31cf457a7");
}

run()
  .then(() => process.exit(0))
  .catch(()=> process.exit(1));
