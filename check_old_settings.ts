import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const currentConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const oldConfig = {
  ...currentConfig,
  projectId: "gen-lang-client-0932665202",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
};

async function checkOld() {
  const app = initializeApp(oldConfig, "OldSettingsCheck");
  const db = getFirestore(app, "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528");

  try {
    const docSnap = await getDoc(doc(db, 'settings', 'main_config'));
    if (docSnap.exists()) {
      console.log("SUCCESS! Got old settings/main_config:", docSnap.data());
      fs.writeFileSync('./old_settings_main_config.json', JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log("settings/main_config does not exist in old database.");
    }
  } catch (err: any) {
    console.error("Failed to read old settings/main_config:", err.message);
  }

  try {
    const dSnap = await getDoc(doc(db, 'settings', 'translations'));
    if (dSnap.exists()) {
      console.log("SUCCESS! Got old settings/translations:", Object.keys(dSnap.data()));
      fs.writeFileSync('./old_settings_translations.json', JSON.stringify(dSnap.data(), null, 2));
    } else {
      console.log("settings/translations does not exist in old database.");
    }
  } catch (err: any) {
    console.error("Failed to read old settings/translations:", err.message);
  }
}

checkOld()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
