import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./extracted_old_users.json', 'utf8'));
console.log("Total users in extracted_old_users.json:", users.length);

const tvm = users.filter((u: any) => 
  String(u.district || '').toUpperCase() === 'TVM' || 
  String(u.district || '').toUpperCase().includes('THIRUVANANTHAPURAM') ||
  String(u.address || '').toUpperCase().includes('THIRUVANANTHAPURAM') ||
  String(u.address || '').toUpperCase().includes('TVM') ||
  String(u.membershipId || '').toUpperCase().includes('TVM')
);

console.log("Total Thiruvananthapuram (TVM) users in extracted_old_users.json:", tvm.length);
if (tvm.length > 0) {
  console.log("Sample TVM user in JSON:", tvm[0]);
}

const districtsCount: { [key: string]: number } = {};
users.forEach((u: any) => {
  const d = u.district || 'UNKNOWN';
  districtsCount[d] = (districtsCount[d] || 0) + 1;
});
console.log("Districts summary in JSON:", districtsCount);
