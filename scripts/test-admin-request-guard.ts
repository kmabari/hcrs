import assert from 'node:assert/strict';
import express from 'express';
import { createMainAdminGuard } from '../src/lib/adminRequestGuard';
const app = express();
let actions = 0;
app.use(createMainAdminGuard({
  available: () => true,
  verifyToken: async token => {
    if (token === 'main') return {uid:'main',email:'hcrskerala@gmail.com'};
    if (token === 'district') return {uid:'district',email:'hcrspalakkad@hcrs.society'};
    throw new Error('Invalid token');
  },
  loadProfile: async () => ({role:'admin',isAdmin:true})
}));
app.use((_req,res) => { actions++; res.json({ok:true}); });
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening',resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No test server address');
const base = `http://127.0.0.1:${address.port}`;
try {
  for (const path of ['/api/admin/payments','/admin/payments','/api/admin/approve-member','/admin/approve-renewal','/api/admin/save-settings','/save-settings','/api/admin/payment-exceptions/test/review']) {
    assert.equal((await fetch(base+path)).status,401);
    assert.equal((await fetch(base+path,{headers:{Authorization:'Bearer district'}})).status,403);
    assert.equal((await fetch(base+path,{headers:{Authorization:'Bearer bad'}})).status,401);
    assert.equal((await fetch(base+path,{headers:{Authorization:'Bearer main'}})).status,200);
  }
  assert.equal(actions,7, 'Denied requests must not reach an action handler');
  assert.equal((await fetch(base+'/api/razorpay/config')).status,200);
  console.log('Main-console API authentication and district-denial checks passed.');
} finally { await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve())); }
