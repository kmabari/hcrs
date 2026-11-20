import { useState } from 'react';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { toast } from 'sonner';

/** Main admin: read-only view of every claim + member record that belongs to one mobile number. */
export default function ClaimDiagnose() {
  const [mobile, setMobile] = useState('');
  const [data, setData] = useState<any>(null);
  const run = async () => {
    try {
      const res = await authenticatedFetch(`/api/admin/claim-diagnose?mobile=${mobile.replace(/\D/g, '').slice(-10)}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'Failed');
      setData(j);
    } catch { toast.error('Network problem'); }
  };
  return <details className="rounded-2xl border border-slate-200 bg-white p-4 my-4">
    <summary className="font-bold cursor-pointer">Claim records check (by mobile)</summary>
    <div className="flex gap-2 mt-3">
      <input className="border rounded-lg px-2 py-1.5 text-sm" inputMode="numeric" maxLength={10} placeholder="Mobile" value={mobile} onChange={e => setMobile(e.target.value)} />
      <button type="button" onClick={run} className="text-sm font-bold bg-slate-900 text-white rounded-lg px-3">Check</button>
    </div>
    {data && <div className="mt-3 space-y-3 text-xs overflow-x-auto">
      <p className="font-bold">Member records ({data.members.length})</p>
      <table className="min-w-full border"><thead><tr>{['uid', 'name', 'mobile', 'memberId', 'status', 'deleted', 'expiry'].map(h => <th key={h} className="border px-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{data.members.map((m: any) => <tr key={m.uid}>{[m.uid, m.name, String(m.mobile), m.membershipId, m.status, m.deleted ? 'YES' : '', m.expiry].map((v, i) => <td key={i} className="border px-1 break-all">{v}</td>)}</tr>)}</tbody></table>
      <p className="font-bold">Claims ({data.claims.length})</p>
      <table className="min-w-full border"><thead><tr>{['claimId', 'relation', 'owner uid', 'owner known?', 'userMobile', 'memberId', 'paid', 'received', 'verified', 'created'].map(h => <th key={h} className="border px-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{data.claims.map((c: any) => <tr key={c.id}>{[c.id, c.relation, c.uid, c.ownerIsKnownMember ? 'yes' : 'NO', String(c.userMobile), c.membershipId, String(c.totalPaid), String(c.totalReceived), c.verified ? 'YES' : '', c.created].map((v, i) => <td key={i} className="border px-1 break-all">{v}</td>)}</tr>)}</tbody></table>
    </div>}
  </details>;
}
