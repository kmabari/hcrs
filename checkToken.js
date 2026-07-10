import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function checkToken() {
  const userCredential = await signInWithEmailAndPassword(auth, "l-molyjoseph955@gmail.com", "123456");
  const user = userCredential.user;
  const idTokenResult = await user.getIdTokenResult();
  console.log("ID Token Claims:");
  console.log(idTokenResult.claims);
}

checkToken()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
