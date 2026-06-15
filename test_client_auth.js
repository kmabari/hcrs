import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { readFile } from 'fs/promises';

const config = JSON.parse(await readFile('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email = 'hcrskerala@gmail.com';
  const pin = '246810';
  
  console.log(`Attempting to sign in as ${email}...`);
  let user;
  try {
    const res = await signInWithEmailAndPassword(auth, email, pin);
    user = res.user;
    console.log("Signed in successfully! UID:", user.uid);
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      console.log("User not found or invalid credential. Attempting to create user...");
      try {
        const res = await createUserWithEmailAndPassword(auth, email, pin);
        user = res.user;
        console.log("Created user successfully! UID:", user.uid);
      } catch (createError) {
        console.error("Failed to create user:", createError);
        return;
      }
    } else {
      console.error("Sign in failed:", error);
      return;
    }
  }

  // Double check if operator document exists in users
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      console.log("Creating database operator profile for", email);
      await setDoc(userRef, {
        uid: user.uid,
        name: 'Kerala State Admin',
        email: email,
        role: 'operator',
        status: 'active',
        district: 'MLP',
        serialNo: 0,
        registrationDate: new Date()
      });
      console.log("Operator profile created!");
    } else {
      console.log("Operator profile already exists:", snap.data().name);
    }
  } catch (e) {
    console.log("Note: profiles read/write failed, probably security rules require operator status, let's see:", e.message);
  }
}

run();
