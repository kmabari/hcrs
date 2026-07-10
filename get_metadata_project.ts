import fetch from 'node-fetch';

async function getProject() {
  try {
    const res = await fetch('http://metadata.google.internal/computeMetadata/v1/project/project-id', {
      headers: { 'Metadata-Flavor': 'Google' }
    });
    if (res.ok) {
      const pId = await res.text();
      console.log("Actual GCP Project ID:", pId);
    } else {
      console.log("Metadata request failed:", res.statusText);
    }
  } catch (err: any) {
    console.error("Could not fetch GCP metadata:", err.message);
  }
}

getProject();
