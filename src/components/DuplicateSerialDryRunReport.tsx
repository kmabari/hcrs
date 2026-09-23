import { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSearch } from 'lucide-react';
import { UserProfile } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props { members: UserProfile[]; claims: any[]; }
const mobile = (v: unknown) => String(v || '').replace(/\D/g, '').slice(-10);
const serial = (m: UserProfile) => {
  const direct = Number((m as any).serialNo);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const suffix = String(m.membershipId || '').match(/(\d+)\s*$/)?.[1];
  return suffix ? Number(suffix) : 0;
};
const dateValue = (v: any) => {
  if (!v) return Number.MAX_SAFE_INTEGER;
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  const n = new Date(v).getTime(); return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
};
const nextId = (id: string | undefined, n: number) => String(id || '').replace(/\d+\s*$/, String(n));

export default function DuplicateSerialDryRunReport({ members, claims }: Props) {
  const maxSerial = useMemo(() => members.reduce((max, m) => Math.max(max, serial(m)), 1000), [members]);
  const rows = useMemo(() => members
    .filter(m => m.role !== 'admin' && m.role !== 'operator' && serial(m) === 1001)
    .sort((a, b) => dateValue(a.registrationDate || (a as any).createdAt) - dateValue(b.registrationDate || (b as any).createdAt) || String(a.uid || '').localeCompare(String(b.uid || '')))
    .map((member, index) => {
      const keep = index === 0; const proposed = keep ? 1001 : maxSerial + index; const mob = mobile(member.mobile);
      const linked = claims.filter(c => (member.uid && c.uid === member.uid) || (mob && mobile(c.userMobile || c.mobile) === mob) || (member.membershipId && String(c.membershipId || '').toLowerCase() === String(member.membershipId).toLowerCase()));
      return { member, keep, proposed, proposedId: keep ? member.membershipId || '' : nextId(member.membershipId, proposed), linked };
    }), [members, claims, maxSerial]);
  const exportExcel = () => {
    const data = rows.map((r, i) => ({ 'Sl No': i + 1, UID: r.member.uid || '', Name: r.member.name || '', Mobile: r.member.mobile || '', District: r.member.district || r.member.districtCode || '', 'Old Serial': 1001, 'Old Membership ID': r.member.membershipId || '', Action: r.keep ? 'KEEP ORIGINAL 1001' : 'PROPOSE NUMBER CHANGE', 'Proposed Serial': r.proposed, 'Proposed Membership ID': r.proposedId, 'Verification Forms Found': r.linked.length, 'Verification Form IDs': r.linked.map(c => c.id || '').filter(Boolean).join(', ') }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Serial 1001 Dry Run'); XLSX.writeFile(wb, 'HCRS_serial_1001_dry_run.xlsx');
  };
  return <Card className="border-2 border-amber-200 bg-amber-50/40 rounded-2xl"><CardContent className="p-4 sm:p-6 space-y-4">
    <div className="flex flex-col sm:flex-row justify-between gap-3"><div><div className="flex items-center gap-2"><FileSearch className="w-5 h-5 text-amber-700"/><h3 className="font-black">Serial 1001 — Dry-run Report</h3></div><p className="text-xs text-slate-600 mt-1">Preview മാത്രം. Firestore data ഒന്നും മാറ്റുന്നില്ല.</p></div><Button variant="outline" onClick={exportExcel} disabled={!rows.length}><Download className="w-4 h-4 mr-2"/>Export Excel</Button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{[['1001 Records', rows.length], ['Keep Original', rows.length ? 1 : 0], ['Proposed Changes', Math.max(0, rows.length - 1)], ['Current Max Serial', maxSerial]].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-white p-3"><p className="text-[10px] uppercase font-black text-slate-400">{label}</p><p className="text-xl font-black">{value}</p></div>)}</div>
    {!rows.length ? <div className="rounded-xl border bg-white p-5 text-center font-bold text-emerald-700">Serial 1001 records കണ്ടെത്തിയില്ല.</div> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[900px] text-xs"><thead className="bg-slate-100"><tr>{['Member','District','Old ID','Action','Proposed ID','Verification Forms'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.member.uid || String(r.member.mobile)} className="border-t"><td className="p-3 font-bold">{r.member.name}<div className="font-mono font-normal">{r.member.mobile}</div></td><td className="p-3">{r.member.district || r.member.districtCode}</td><td className="p-3 font-mono">{r.member.membershipId || '1001'}</td><td className="p-3"><Badge>{r.keep ? 'Keep 1001' : '1001 → ' + r.proposed}</Badge></td><td className="p-3 font-mono text-blue-700">{r.proposedId || r.proposed}</td><td className="p-3">{r.linked.length ? 'Found: ' + r.linked.length : 'None'}</td></tr>)}</tbody></table></div>}
  </CardContent></Card>;
}
