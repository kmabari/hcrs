import fs from 'fs';

const users = JSON.parse(fs.readFileSync('extracted_old_users.json', 'utf8'));
console.log(`Scanning fields of ${users.length} users...`);

const usersWithClaims: any[] = [];
const keysFound = new Set<string>();

users.forEach((u: any) => {
  Object.keys(u).forEach(key => keysFound.add(key));
  if (
    u.claimsCounter !== undefined || 
    u.redClaimsCounter !== undefined || 
    u.orangeClaimsCounter !== undefined ||
    u.greenClaimsCounter !== undefined ||
    u.claimStatus !== undefined || 
    u.claims !== undefined
  ) {
    usersWithClaims.push(u);
  }
});

console.log("\nAll unique keys found in user objects:");
console.log(Array.from(keysFound).join(', '));

console.log(`\nFound ${usersWithClaims.length} users with claims-related fields:`);
usersWithClaims.slice(0, 10).forEach((u, i) => {
  console.log(`[${i+1}] Name: ${u.name} | claimsCounter: ${u.claimsCounter} | redClaimsCode: ${u.redClaimsCounter}`);
});
