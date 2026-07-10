import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, startAfter, orderBy } from 'firebase/firestore';
import fs from 'fs';

const config = {
  projectId: "gen-lang-client-0932665202",
  appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
  apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

async function fetchAllUsersPaginated() {
  const app = initializeApp(config, "FetchAllOldPaginated");
  const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  console.log("Paginating 5 by 5 to extract all users...");
  const allUsers: any[] = [];
  let lastVisible: any = null;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      let q = query(
        collection(db, 'users'), 
        orderBy('__name__'), // Order by document ID to ensure stable pagination
        limit(5)
      );
      
      if (lastVisible) {
        q = query(
          collection(db, 'users'),
          orderBy('__name__'),
          startAfter(lastVisible),
          limit(5)
        );
      }
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        hasMore = false;
        break;
      }
      
      console.log(`Page ${page}: Fetched ${snap.size} user documents.`);
      
      snap.forEach(doc => {
        allUsers.push({ id: doc.id, ...doc.data() });
      });
      
      lastVisible = snap.docs[snap.docs.length - 1];
      page++;
      
      // Safety break to prevent infinite loop
      if (page > 300) {
        console.log("Pagination safety break (Max 300 pages) reached.");
        break;
      }
    } catch (err: any) {
      console.error(`Page ${page} failed:`, err.message);
      hasMore = false;
      break;
    }
  }

  console.log(`\nSuccessfully fetched ${allUsers.length} total users from the old database!`);
  
  if (allUsers.length > 0) {
    fs.writeFileSync('extracted_old_users.json', JSON.stringify(allUsers, null, 2));
    console.log("Saved all extracted users to extracted_old_users.json");
    
    const tvm = allUsers.filter(u => {
      const dist = String(u.district || '').toUpperCase();
      const addr = String(u.address || '').toUpperCase();
      return dist === 'TVM' || dist.includes('THIRUVANANTHAPURAM') || addr.includes('THIRUVANANTHAPURAM') || addr.includes('TVM');
    });
    
    console.log(`\nFound ${tvm.length} Thiruvananthapuram (TVM) members:`);
    tvm.forEach((u, i) => {
      console.log(`  [${i+1}] Name: ${u.name}, Mobile: ${u.mobile}, District: ${u.district}, Approved: ${u.isApproved}`);
    });
  }
}

fetchAllUsersPaginated()
  .then(() => process.exit(0))
  .catch(()=> process.exit(1));
