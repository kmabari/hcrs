import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./extracted_old_users.json', 'utf8'));
if (data.length > 0) {
  console.log("First user keys:", Object.keys(data[0]));
  console.log("First user entire object (excluding photo if any):");
  const temp = { ...data[0] };
  delete temp.photoUrl;
  delete temp.photo;
  delete temp.paymentProofUrl;
  console.log(temp);
} else {
  console.log("Empty json");
}
