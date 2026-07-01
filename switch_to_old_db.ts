import fs from 'fs';

const oldConfig = {
  projectId: "gen-lang-client-0932665202",
  appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
  apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
  authDomain: "gen-lang-client-0932665202.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-2eaab070-9ce1-4d91-bbeb-abf7bacb0528",
  storageBucket: "gen-lang-client-0932665202.appspot.com",
  messagingSenderId: "739674403429",
  measurementId: "G-DB4NFRT6H7"
};

// Check if we need to backup first
if (fs.existsSync('./firebase-applet-config.json')) {
  const current = fs.readFileSync('./firebase-applet-config.json', 'utf8');
  if (current.includes('hcrs-membership')) {
    fs.writeFileSync('./firebase-applet-config-custom-backup.json', current);
    console.log("Backed up your custom hcrs-membership configuration to firebase-applet-config-custom-backup.json");
  }
}

fs.writeFileSync('./firebase-applet-config.json', JSON.stringify(oldConfig, null, 2));
console.log("SUCCESSFULLY switched your application database config to the OLD AI Studio Temporary Database.");
console.log("Please restart your dev server or wait for hot-reloads to test in the browser.");
