import assert from 'node:assert/strict';
import { MAIN_ADMIN_EMAILS, isMainAdminAccount, getDistrictAdminDistrict } from '../src/lib/adminAccess';
import { DISTRICTS, DISTRICT_SLUGS, getDistrictAdminUrl } from '../src/lib/districtUtils';

for (const district of DISTRICTS) {
  const email = `hcrs${DISTRICT_SLUGS[district.code]}@hcrs.society`;
  assert.equal(getDistrictAdminDistrict(email), district.code);
  for (const profile of [null, {role:'operator'}, {role:'admin',isAdmin:true}, {role:'admin',district:district.code}]) {
    assert.equal(isMainAdminAccount(email, profile), false, `${email} cannot enter main console`);
  }
  assert.equal(new URL(getDistrictAdminUrl(district.code)).searchParams.get('distLogin'), DISTRICT_SLUGS[district.code]);
}
for (const email of MAIN_ADMIN_EMAILS) assert.equal(isMainAdminAccount(email), true);
assert.equal(isMainAdminAccount(undefined, {role:'admin',isAdmin:true}), false);
assert.equal(isMainAdminAccount('admin_fake@example.com'), false);
assert.equal(isMainAdminAccount('admin_fake@example.com', {role:'admin',isAdmin:true}), false);
assert.equal(isMainAdminAccount('district@example.com', {role:'admin',isAdmin:true,district:'MLP'}), false);
assert.equal(isMainAdminAccount('member@example.com', {role:'member'}), false);
assert.equal(getDistrictAdminDistrict('hcrsmalappuram@example.com'), null);
assert.throws(() => getDistrictAdminUrl('unknown'));
console.log('All 14 district access, stale-role denial and login-link checks passed.');
