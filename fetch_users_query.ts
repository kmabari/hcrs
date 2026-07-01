import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const config = {
  projectId: "gen-lang-client-0932665202",
  appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
  apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

async function fetchAllUsers() {
  const app = initializeApp(config, "FetchAllOld");
  const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log(`SUCCESS! Found ${snap.size} users without authentication!`);
    if (snap.size > 0) {
      const tvm = [];
      snap.forEach(doc => {
        const data = doc.data();
        const dist = String(data.district || '').toUpperCase();
        if (dist === 'TVM' || dist.includes('THIRUVANANTHAPURAM') || String(data.address || '').toUpperCase().includes('THIRUVANANTHAPURAM')) {
          tvm.push({ id: doc.id, name: data.name, mobile: data.mobile, district: data.district, registrationDate: data.registrationDate });
        }
      });
      console.log(`Total Thiruvananthapuram members: ${tvm.length}`);
      tvm.forEach((u, i) => {
        console.log(`[${i+1}] ${u.name} (Mobile: ${u.mobile}, Dist: ${u.district})`);
      });
    }
  } catch (err: any) {
    console.error("Failed to query unauthenticated users:", err.message);
  }
}

fetchAllUsers()
  .then(() => process.exit(0))
  .catch(()=> process.exit(1));
