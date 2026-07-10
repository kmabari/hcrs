import fs from 'fs';

if (fs.existsSync('./firebase-applet-config-custom-backup.json')) {
  const custom = fs.readFileSync('./firebase-applet-config-custom-backup.json', 'utf8');
  fs.writeFileSync('./firebase-applet-config.json', custom);
  console.log("SUCCESSFULLY restored your CUSTOM database configuration (hcrs-membership) from backup!");
} else {
  // If the backup file was deleted or not found, write the default customized one for hcrs-membership
  const hcrsConfig = {
    projectId: "hcrs-membership",
    appId: "1:739674403429:web:c8a088e14981ead61f0c8c",
    apiKey: "AIzaSyCaXenet2_IGJUNp9koD1PiEgC6p8HHKNk",
    authDomain: "hcrs-membership.firebaseapp.com",
    firestoreDatabaseId: "(default)",
    storageBucket: "hcrs-membership.firebasestorage.app",
    messagingSenderId: "739674403429",
    measurementId: "G-DB4NFRT6H7"
  };
  fs.writeFileSync('./firebase-applet-config.json', JSON.stringify(hcrsConfig, null, 2));
  console.log("SUCCESSFULLY wrote your CUSTOM database configuration (hcrs-membership) to firebase-applet-config.json");
}
