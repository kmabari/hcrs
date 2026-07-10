import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, orderBy } from 'firebase/firestore';

const configs = {
  oldSandboxProject: {
    projectId: "gen-lang-client-0932665202",
    appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
    apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
    authDomain: "gen-lang-client-0932665202.firebaseapp.com",
  },
  customProject: {
    projectId: "hcrs-membership",
    appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
    apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
    authDomain: "hcrs-membership.firebaseapp.com",
  },
  currentSandboxProject: {
    projectId: "ais-asia-southeast1-b8fcff19c3",
    appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
    apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
    authDomain: "ais-asia-southeast1-b8fcff19c3.firebaseapp.com",
  }
};

async function scanCollection(label: string, config: any, dbId: string) {
  console.log(`\n---------------------------------------------`);
  console.log(`Scanning: ${label} (DB: ${dbId})`);
  try {
    const app = initializeApp(config, label.replace(/\s+/g, '_'));
    const db = getFirestore(app, dbId);
    
    // Paginated load/query search to stay within rules/quota and avoid blank block fails
    let allUsers: any[] = [];
    let lastDoc: any = null;
    let hasMore = true;
    let batchIndex = 0;

    console.log(`Fetching from users...`);
    while (hasMore && allUsers.length < 500) {
      let q = query(collection(db, 'users'), orderBy('__name__'), limit(100));
      if (lastDoc) {
        // Query pagination in client-side Firestore is simpler, but to keep the script robust let's just fetch first 200/500 if permissions allow
        break;
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        break;
      }
      
      snap.docs.forEach(doc => {
        allUsers.push({ id: doc.id, ...doc.data() });
      });
      break; // Stop after first batch for safety, or check if we loaded
    }

    console.log(`Loaded ${allUsers.length} sample users.`);
    if (allUsers.length > 0) {
      const tvmUsers = allUsers.filter(u => 
        String(u.district || '').toUpperCase() === 'TVM' || 
        String(u.district || '').toUpperCase().includes('THIRUVANANTHAPURAM') ||
        String(u.address || '').toUpperCase().includes('THIRUVANANTHAPURAM') ||
        String(u.address || '').toUpperCase().includes('TVM') ||
        String(u.membershipId || '').toUpperCase().includes('TVM')
      );
      console.log(`Found ${tvmUsers.length} TVM users out of ${allUsers.length} in this batch.`);
      if (tvmUsers.length > 0) {
        console.log("Sample TVM profile:", tvmUsers[0]);
      } else {
        // Print some general info to see what districts are present
        const districts = [...new Set(allUsers.map(u => u.district))];
        console.log("Districts found in this batch:", districts);
      }
    }
  } catch (err: any) {
    console.error(`Fetch failed for ${label}:`, err.message);
  }
}

async function run() {
  // 1. Old project with specific database
  await scanCollection("Old Project (Specific DB)", configs.oldSandboxProject, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");
  
  // 2. Old project with (default) database
  await scanCollection("Old Project (Default DB)", configs.oldSandboxProject, "(default)");
  
  // 3. Custom project with (default) database
  await scanCollection("Custom Project", configs.customProject, "(default)");
  
  // 4. Current project with specific database
  await scanCollection("Current Project (Specific DB)", configs.currentSandboxProject, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
