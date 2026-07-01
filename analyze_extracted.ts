import fs from 'fs';

const users = JSON.parse(fs.readFileSync('extracted_old_users.json', 'utf8'));
console.log(`Analyzing ${users.length} extracted users...`);

// Let's count districts
const districts: Record<string, number> = {};
const matchTvm: any[] = [];

users.forEach((u: any) => {
  const dist = String(u.district || '').toUpperCase().trim();
  districts[dist] = (districts[dist] || 0) + 1;
  
  const matchesSearch = 
    dist.includes('TVM') || 
    dist.includes('THIRUVANANTHAPURAM') || 
    dist.includes('TRIVANDRUM') || 
    dist.includes('തിരുവനന്തപുരം') ||
    String(u.address || '').toUpperCase().includes('THIRUVANANTHAPURAM') ||
    String(u.address || '').toUpperCase().includes('TVM') ||
    String(u.address || '').includes('തിരുവനന്തപുരം') ||
    String(u.membershipId || '').toUpperCase().includes('TVM');
    
  if (matchesSearch) {
    matchTvm.push(u);
  }
});

console.log("\nDistricts found in the extracted list:");
for (const [dist, count] of Object.entries(districts)) {
  console.log(`  - ${dist || '(EMPTY)'}: ${count}`);
}

console.log(`\nFound ${matchTvm.length} Thiruvananthapuram/TVM members out of 370 scanned:`);
matchTvm.forEach((u, i) => {
  console.log(`  [${i+1}] ID: ${u.id}, Name: ${u.name}, District: ${u.district}, Address: ${u.address ? u.address.replace(/\n/g, ' ') : ''}, Mobile: ${u.mobile}`);
});
