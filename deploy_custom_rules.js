import fs from 'fs';

async function deployRules() {
  console.log("Reading firebase-applet-config.json...");
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId || "(default)";
  console.log(`Using Project: ${projectId}, Database: ${databaseId}`);
  
  console.log("Reading rules file...");
  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
  
  console.log("Fetching Google Metadata access token...");
  let token = "";
  try {
    const tokenRes = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-account/default/token", {
      headers: { "Metadata-Flavor": "Google" }
    });
    if (!tokenRes.ok) {
      throw new Error(`Metadata server returned status ${tokenRes.status}`);
    }
    const tokenJson = await tokenRes.json();
    token = tokenJson.access_token;
    console.log("Acquired access token successfully!");
  } catch (err) {
    console.error("Failed to acquire access token from Metadata server:", err.message);
    console.log("Fallback: attempting to use application default credential via google-auth-library...");
    try {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
      });
      const client = await auth.getClient();
      const accessTokenObj = await client.getAccessToken();
      token = accessTokenObj.token;
      console.log("Acquired access token via google-auth-library successfully!");
    } catch (authErr) {
      console.error("Both credentials resolution paths failed. Error:", authErr.message);
      return;
    }
  }

  if (!token) {
    console.error("No valid authorization token resolved. Aborting.");
    return;
  }

  // 1. Create Ruleset
  console.log("Creating new Firebase Ruleset for projects/" + projectId + "...");
  const rulesetRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: "firestore.rules",
            content: rulesContent
          }
        ]
      }
    })
  });

  const rulesetJson = await rulesetRes.json();
  if (!rulesetRes.ok) {
    console.error("Ruleset creation FAILED!", JSON.stringify(rulesetJson, null, 2));
    return;
  }

  const rulesetName = rulesetJson.name;
  console.log("Ruleset created successfully! Ruleset Resource Name:", rulesetName);

  // 2. Release Ruleset to named database
  const releaseName = `projects/${projectId}/releases/cloud.firestore/${databaseId}`;
  console.log("Creating/updating release to named database release path:", releaseName);
  
  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore%2F${databaseId}?updateMask=release.rulesetName`;
  const releaseRes = await fetch(releaseUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      release: {
        name: releaseName,
        rulesetName: rulesetName
      }
    })
  });

  const releaseJson = await releaseRes.json();
  if (!releaseRes.ok) {
    console.error("Releasing ruleset to custom named database FAILED!", JSON.stringify(releaseJson, null, 2));
    return;
  }

  console.log("RELEASE COMPLETED SUCCESSFULLY! Rules are now LIVE on database " + databaseId + "!");
}

deployRules()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Execution failed:", err);
    process.exit(1);
  });
