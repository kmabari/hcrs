import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, limit } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function simulateHealing() {
  console.log("Authenticating as admin to fetch life member records first...");
  const adminEmail = "9645934571@hcrs.society";
  const adminPin = "246810";
  await signInWithEmailAndPassword(auth, adminEmail, adminPin);
  
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  
  const lifeMembers = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const isLife = String(data.membership_type || '').toUpperCase().includes('LIFE') ||
                   String(data.membershipType || '').toUpperCase().includes('LIFE') ||
                   String(data.membershipId || '').toUpperCase().includes('LIFE');
    if (isLife && docSnap.id.startsWith('life_')) {
      lifeMembers.push({ id: docSnap.id, ...data });
    }
  });

  console.log(`Found ${lifeMembers.length} unhealed Life Members. Simulating healing candidate queries...`);

  for (const m of lifeMembers) {
    console.log(`\nSimulating login/healing check for: ${m.name} (${m.mobile})`);
    
    // Simulate candidate generation
    const candidates = [];
    let loginMobile = m.mobile || '';
    let currentEmail = m.email || '';
    
    if (loginMobile && /^\d{10}$/.test(loginMobile)) {
      candidates.push({ field: 'mobile', value: loginMobile, desc: 'extracted mobile' });
    }
    if (currentEmail) {
      candidates.push({ field: 'email', value: currentEmail, desc: 'current auth email' });
    }
    
    // Deduplicate candidates
    const uniqueCandidates = [];
    const seen = new Set();
    for (const cand of candidates) {
      const key = `${cand.field}::${cand.value.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCandidates.push(cand);
      }
    }

    console.log("Generated candidates:", uniqueCandidates);
    
    let matchedDoc = null;
    for (const cand of uniqueCandidates) {
      const q = query(usersRef, where(cand.field, '==', cand.value), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        matchedDoc = qSnap.docs[0];
        console.log(`-> Matched candidate: ${cand.desc}. Found Document ID: ${matchedDoc.id}`);
        break;
      }
    }

    if (matchedDoc) {
      console.log(`SUCCESS: Found matching document ${matchedDoc.id} for healing simulation.`);
    } else {
      console.log(`WARNING: Could not find any matching document for healing simulation!`);
    }
  }
}

simulateHealing()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error("Simulation failed:", err);
    process.exit(1);
  });
