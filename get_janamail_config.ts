import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { initializeFirestore, doc, getDoc, memoryLocalCache } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

async function run() {
  const app = initializeApp(config, "JanamailConfigLoader");
  const auth = getAuth(app);
  
  // Initialize firestore with long polling
  const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true
  }, config.firestoreDatabaseId);

  try {
    console.log("Signing in...");
    try {
      await signInWithEmailAndPassword(auth, "admin@hcrs.society", "246810");
      console.log("Sign-in successful as admin@hcrs.society!");
    } catch (e) {
      console.log("admin@hcrs.society failed, trying hcrskerala@gmail.com...");
      await signInWithEmailAndPassword(auth, "hcrskerala@gmail.com", "246810");
      console.log("Sign-in successful as hcrskerala@gmail.com!");
    }
    
    console.log("Fetching settings/janamail_config...");
    const docSnap = await getDoc(doc(db, "settings", "janamail_config"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("SUCCESS janamail_config:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("janamail_config not found!");
    }

    console.log("Fetching settings/main_config...");
    const mainSnap = await getDoc(doc(db, "settings", "main_config"));
    if (mainSnap.exists()) {
      const data = mainSnap.data();
      console.log("SUCCESS main_config");
      console.log("Keys:", Object.keys(data));
      for (const [k, v] of Object.entries(data)) {
        if (k.toLowerCase().includes("sheet") || k.toLowerCase().includes("spread") || k.toLowerCase().includes("id") || k === "url" || k === "link") {
          console.log(`${k}:`, v);
        }
      }
    } else {
      console.log("main_config not found!");
    }

    console.log("Fetching settings/imported_settings_0...");
    const impSnap = await getDoc(doc(db, "settings", "imported_settings_0"));
    if (impSnap.exists()) {
      const data = impSnap.data();
      console.log("SUCCESS imported_settings_0");
      console.log("Keys:", Object.keys(data));
      for (const [k, v] of Object.entries(data)) {
        if (k.toLowerCase().includes("sheet") || k.toLowerCase().includes("spread") || k.toLowerCase().includes("id") || k === "url" || k === "link") {
          console.log(`${k}:`, v);
        }
      }
    } else {
      console.log("imported_settings_0 not found!");
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

run().then(() => process.exit(0));
