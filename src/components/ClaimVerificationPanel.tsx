import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { toast } from 'sonner';

type Row = {
  id: string; name: string; relation: string; mobile: string; membershipId: string; district: string;
  highrichId: string; totalPaid: number; totalReceived: number;
  companyVerification: null | { advanceAmount: number; returnReceived: number; finalNetBalance: number; bankRef: string; officerName: string; auditDate: string };
};

/**
 * Company claim verification. Used by the main admin and by members designated as "claim verifier" staff.
 * The verified figures are saved on the claim and are printed in section 4 of the member's claim form.
 */
export default function ClaimVerificationPanel({ officerName = '', lazy = false }: { officerName?: string; lazy?: boolean }) {
  const [opened, setOpened] = useState(!lazy);
  const [rows, setRows] = useState<Row[]>([]);
  const [isMain, setIsMain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [onlyPending, setOnlyPending] = useState(true);
  const [openId, setOpenId] = useState('');
  const [f, setF] = useState({ advance: '', received: '', bankRef: '', officer: officerName, date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [verifierMobile, setVerifierMobile] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/claim-verification/list');
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'ക്ലെയിമുകൾ ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല.');
      setRows(j.data || []);
      setIsMain(!!j.isMain);
    } catch { toast.error('നെറ്റ്‌വർക്ക് പ്രശ്നം.'); } finally { setLoading(false); }
  };
  useEffect(() => { if (opened) load(); }, [opened]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(r => (!onlyPending || !r.companyVerification) &&
      (!t || [r.name, r.mobile, r.membershipId, r.highrichId].some(v => String(v || '').toLowerCase().includes(t)))).slice(0, 60);
  }, [rows, q, onlyPending]);

  const open = (r: Row) => {
    setOpenId(r.id);
    const v = r.companyVerification;
    setF({ advance: v ? String(v.advanceAmount) : '', received: v ? String(v.returnReceived) : '', bankRef: v?.bankRef || '', officer: v?.officerName || officerName, date: v?.auditDate || new Date().toISOString().slice(0, 10) });
  };

  const net = (Number(f.advance) || 0) - (Number(f.received) || 0);

  const save = async () => {
    if (f.advance === '' || f.received === '') return toast.error('Verified Advance, Verified Return എന്നിവ നൽകുക.');
    setSaving(true);
    try {
      const res = await authenticatedFetch('/api/claim-verification/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: openId, advanceAmount: f.advance, returnReceived: f.received, bankRef: f.bankRef, officerName: f.officer, auditDate: f.date })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'സേവ് ചെയ്യാൻ കഴിഞ്ഞില്ല.');
      setRows(prev => prev.map(r => r.id === openId ? { ...r, companyVerification: j.companyVerification } : r));
      setOpenId('');
      toast.success('Verified amount saved. അംഗത്തിന്റെ ഫോമിൽ ഇത് വരും.');
    } catch { toast.error('നെറ്റ്‌വർക്ക് പ്രശ്നം.'); } finally { setSaving(false); }
  };

  const setVerifier = async (enabled: boolean) => {
    try {
      const res = await authenticatedFetch('/api/admin/set-claim-verifier', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: verifierMobile, enabled })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'മാറ്റാൻ കഴിഞ്ഞില്ല.');
      toast.success(`${j.name || j.mobile}: ${enabled ? 'Claim Verifier staff ആക്കി' : 'Claim Verifier അനുമതി നീക്കി'}`);
      setVerifierMobile('');
    } catch { toast.error('നെറ്റ്‌വർക്ക് പ്രശ്നം.'); }
  };

  const inp = 'w-full border rounded-lg px-2 py-1.5 text-sm';
  if (!opened) {
    return (
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 my-4">
        <button type="button" className="font-black text-slate-900 underline" onClick={() => setOpened(true)}>Open Company Claim Verification (Verified Amount)</button>
      </section>
    );
  }
  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 my-4 space-y-3">
      <h3 className="font-black text-slate-900">Company Claim Verification (Verified Amount)</h3>
      <p className="text-xs text-slate-600">കമ്പനി പരിശോധിച്ച തുക ഇവിടെ നൽകിയാൽ അംഗത്തിന്റെ ക്ലെയിം ഫോമിലെ "Official Accounts Verification Record" ഭാഗത്ത് അത് നിറഞ്ഞ് വരും.</p>

      {isMain && (
        <div className="rounded-xl border p-3 space-y-2 bg-slate-50">
          <p className="text-sm font-bold">Claim Verifier Staff (അംഗത്തെ സ്റ്റാഫ് ആക്കുക)</p>
          <div className="flex flex-wrap gap-2">
            <input className={inp + ' max-w-[200px]'} inputMode="numeric" maxLength={10} placeholder="Member mobile" value={verifierMobile} onChange={e => setVerifierMobile(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className="text-sm font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5" onClick={() => setVerifier(true)}>Make verifier</button>
            <button type="button" className="text-sm font-bold border rounded-lg px-3 py-1.5" onClick={() => setVerifier(false)}>Remove</button>
          </div>
          <p className="text-[11px] text-slate-500">ഈ അംഗം സ്വന്തം ലോഗിനിൽ ഹോം പേജിൽ ഈ വെരിഫിക്കേഷൻ പാനൽ കാണും. മറ്റ് അഡ്മിൻ അധികാരങ്ങൾ ലഭിക്കില്ല.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input className={inp + ' max-w-xs'} placeholder="Search name / mobile / member ID" value={q} onChange={e => setQ(e.target.value)} />
        <label className="text-xs font-bold flex items-center gap-1"><input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} /> Not verified yet</label>
        <button type="button" className="text-xs font-bold border rounded-lg px-2 py-1" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
        <span className="text-xs text-slate-500">{rows.filter(r => r.companyVerification).length} / {rows.length} verified</span>
      </div>

      <div className="space-y-2">
        {shown.map(r => (
          <div key={r.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <p className="font-black">{r.name || '—'} {r.relation !== 'Self' && <span className="text-xs font-bold text-slate-500">({r.relation})</span>}</p>
                <p className="text-xs text-slate-600">{r.mobile} • {r.membershipId || '—'} • Claimed paid ₹{r.totalPaid.toLocaleString('en-IN')} / received ₹{r.totalReceived.toLocaleString('en-IN')}</p>
                {r.companyVerification && <p className="text-xs font-bold text-emerald-700">Verified: advance ₹{r.companyVerification.advanceAmount.toLocaleString('en-IN')} • return ₹{r.companyVerification.returnReceived.toLocaleString('en-IN')} • net ₹{r.companyVerification.finalNetBalance.toLocaleString('en-IN')}</p>}
              </div>
              <button type="button" className="text-sm font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5" onClick={() => open(r)}>{r.companyVerification ? 'Edit' : 'Verify'}</button>
            </div>
            {openId === r.id && (
              <div className="grid gap-2 sm:grid-cols-2 mt-3">
                <label className="text-xs font-bold">Verified Advance Amount ₹<input className={inp} inputMode="decimal" value={f.advance} onChange={e => setF({ ...f, advance: e.target.value })} /></label>
                <label className="text-xs font-bold">Verified Cumulative Return Received ₹<input className={inp} inputMode="decimal" value={f.received} onChange={e => setF({ ...f, received: e.target.value })} /></label>
                <p className="text-sm font-black sm:col-span-2">Final Net Balance Payable: ₹{net.toLocaleString('en-IN')}</p>
                <label className="text-xs font-bold">Bank Ledger Folio / UTR Ref<input className={inp} value={f.bankRef} onChange={e => setF({ ...f, bankRef: e.target.value })} /></label>
                <label className="text-xs font-bold">Verification Officer<input className={inp} value={f.officer} onChange={e => setF({ ...f, officer: e.target.value })} /></label>
                <label className="text-xs font-bold">Audit Date<input type="date" className={inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
                <div className="flex gap-2 items-end">
                  <button type="button" disabled={saving} className="text-sm font-bold bg-emerald-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50" onClick={save}>{saving ? 'Saving…' : 'Save verified amount'}</button>
                  <button type="button" className="text-sm font-bold border rounded-lg px-3 py-1.5" onClick={() => setOpenId('')}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!shown.length && !loading && <p className="text-sm text-slate-500">ക്ലെയിമുകൾ ഒന്നും കണ്ടില്ല.</p>}
      </div>
    </section>
  );
}
