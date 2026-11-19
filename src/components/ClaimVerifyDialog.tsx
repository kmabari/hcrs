import { useState } from 'react';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { toast } from 'sonner';

const money = (n: any) => `₹ ${(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Company verification of ONE claim. Left column: exactly what the member wrote (read-only).
 * Right column: the company's verified figures. "Send" saves them on the claim, and the member's
 * claim form (section 4) then prints the verified figures.
 */
export default function ClaimVerifyDialog({ claim, officerName = '', onClose, onSaved }: {
  claim: any; officerName?: string; onClose: () => void; onSaved: (claimId: string, v: any) => void;
}) {
  const cv = claim?.companyVerification || null;
  const claimedPaid = Number(claim?.totalPaid) || 0;
  const claimedReceived = Number(claim?.totalReceived) || 0;
  const [advance, setAdvance] = useState(cv ? String(cv.advanceAmount) : '');
  const [received, setReceived] = useState(cv ? String(cv.returnReceived) : '');
  const [bankRef, setBankRef] = useState(cv?.bankRef || '');
  const [officer, setOfficer] = useState(cv?.officerName || officerName);
  const [date, setDate] = useState(cv?.auditDate || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const verifiedNet = (Number(advance) || 0) - (Number(received) || 0);
  const inp = 'w-full border-2 rounded-lg px-2 py-1.5 text-sm font-mono';

  const send = async () => {
    if (advance === '' || received === '') return toast.error('Verified Advance, Verified Received എന്നിവ നൽകുക.');
    setSaving(true);
    try {
      const res = await authenticatedFetch('/api/claim-verification/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.id, advanceAmount: advance, returnReceived: received, bankRef, officerName: officer, auditDate: date })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'സേവ് ചെയ്യാൻ കഴിഞ്ഞില്ല.');
      toast.success('Verified amount sent. അംഗത്തിന്റെ ഫോമിൽ ഇത് വന്നു.');
      onSaved(claim.id, j.companyVerification);
      onClose();
    } catch { toast.error('നെറ്റ്‌വർക്ക് പ്രശ്നം. വീണ്ടും ശ്രമിക്കുക.'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-black text-lg text-slate-900">Company Verification</h3>
          <p className="text-sm font-bold">{claim.userName || claim.claimantName || claim.name} {claim.relation && claim.relation !== 'Self' ? `(${claim.relation})` : ''}</p>
          <p className="text-xs text-slate-600">{claim.highrichId ? `Customer ID: ${claim.highrichId} • ` : ''}{claim.userMobile || ''}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-slate-200 p-3 space-y-2 bg-slate-50">
            <p className="text-xs font-black uppercase text-slate-500">Member's claim (as written)</p>
            <div><p className="text-[11px] font-bold text-slate-500">Advance Paid</p><p className="font-mono font-black">{money(claimedPaid)}</p></div>
            <div><p className="text-[11px] font-bold text-slate-500">Amount Received</p><p className="font-mono font-black text-emerald-700">{money(claimedReceived)}</p></div>
            <div><p className="text-[11px] font-bold text-slate-500">Total Balance</p><p className="font-mono font-black text-brand-blue">{money(claimedPaid - claimedReceived)}</p></div>
          </div>

          <div className="rounded-xl border-2 border-emerald-300 p-3 space-y-2">
            <p className="text-xs font-black uppercase text-emerald-700">Company verified (type here)</p>
            <label className="block text-[11px] font-bold text-slate-600">Verified Advance Paid ₹
              <input className={inp} inputMode="decimal" value={advance} onChange={e => setAdvance(e.target.value)} placeholder={String(claimedPaid)} />
            </label>
            <label className="block text-[11px] font-bold text-slate-600">Verified Amount Received ₹
              <input className={inp} inputMode="decimal" value={received} onChange={e => setReceived(e.target.value)} placeholder={String(claimedReceived)} />
            </label>
            <div><p className="text-[11px] font-bold text-slate-600">Verified Total Balance</p><p className="font-mono font-black text-emerald-800">{money(verifiedNet)}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block text-[11px] font-bold text-slate-600">Bank Ledger / UTR Ref
            <input className={inp} value={bankRef} onChange={e => setBankRef(e.target.value)} />
          </label>
          <label className="block text-[11px] font-bold text-slate-600">Verification Officer
            <input className={inp} value={officer} onChange={e => setOfficer(e.target.value)} />
          </label>
          <label className="block text-[11px] font-bold text-slate-600">Audit Date
            <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} />
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" className="text-sm font-bold border-2 rounded-lg px-4 py-2" onClick={onClose}>Cancel</button>
          <button type="button" disabled={saving} className="text-sm font-black bg-emerald-700 text-white rounded-lg px-5 py-2 disabled:opacity-50" onClick={send}>{saving ? 'Sending…' : 'Send (അംഗത്തിന്റെ ഫോമിലേക്ക്)'}</button>
        </div>
      </div>
    </div>
  );
}
