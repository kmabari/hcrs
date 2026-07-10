console.log("Environment variables containing 'FIREBASE', 'GOOGLE', 'PROJECT' or 'KEY':");
for (const key of Object.keys(process.env)) {
  if (key.includes("FIREBASE") || key.includes("GOOGLE") || key.includes("PROJECT") || key.includes("KEY")) {
    console.log(`${key}: ${process.env[key] ? 'SET (length ' + process.env[key].length + ')' : 'EMPTY'}`);
  }
}
