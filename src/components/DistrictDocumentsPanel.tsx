import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, FileText, Receipt as ReceiptIcon, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '../types';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { isDistrictMatch, getDistrictName } from '../lib/districtUtils';
import {
  compareMobiles,
  downloadAllClaimsPdf,
  downloadCourtClaimPdf,
  printCourtClaimReport,
  formatClaimCategories
} from '../lib/claimPrint';
import { buildRegistrationReceipt, buildProfileRenewalReceipt, downloadReceiptsPdf } from '../lib/receiptUtils';

/**
 * District admin documents: claim forms (view / print / PDF) and member receipts (PDF),
 * strictly for the logged-in admin's OWN district. The server also scopes the claims it returns.
 */
export default function DistrictDocumentsPanel({ district, members }: { district: string; members: UserProfile[] }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<'claims' | 'receipts' | null>(null);
  const [showList, setShowList] = useState(false);

  const districtName = getDistrictName(district);
  const districtMembers = useMemo(
    () => members.filter(m => m.status !== 'deleted' && m.role !== 'operator' && m.role !== 'admin' && m.membership_type !== 'DISTRICT_ADMIN' && isDistrictMatch(m.district, district)),
    [members, district]
  );

  const loadClaims = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/database/claims?fresh=true&t=${Date.now()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setClaims(Array.isArray(json.data) ? json.data : []);
      setLoaded(true);
    } catch (err: any) {
      toast.error('ക്ലെയിമുകൾ ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല: ' + (err?.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClaims(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const memberFor = (claim: any) => members.find(m => m.uid === claim.uid || compareMobiles(m.mobile, claim.userMobile));

  const downloadClaimsPdf = async () => {
    if (busy) return;
    if (claims.length === 0) { toast.error('ഡൗൺലോഡ് ചെയ്യാനുള്ള ക്ലെയിമുകൾ ഇല്ല.'); return; }
    setBusy('claims');
    const toastId = toast.loading(`PDF തയ്യാറാക്കുന്നു... 0/${claims.length} — ദയവായി ഈ പേജ് അടയ്ക്കരുത്.`);
    try {
      const result = await downloadAllClaimsPdf(
        claims.map(claim => ({ claim, member: memberFor(claim) })), 'court',
        {
          fileLabel: `HCRS_Claim_Forms_${districtName}`,
          onProgress: (done, total) => toast.loading(`PDF തയ്യാറാക്കുന്നു... ${done}/${total} — ദയവായി ഈ പേജ് അടയ്ക്കരുത്.`, { id: toastId })
        }
      );
      toast.success(`${result.pages} ക്ലെയിം ഫോമുകൾ ${result.files} PDF ഫയലായി ഡൗൺലോഡ് ചെയ്തു.`, { id: toastId, duration: 8000 });
    } catch (err: any) {
      toast.error('PDF ഡൗൺലോഡ് പരാജയപ്പെട്ടു: ' + (err?.message || 'Error'), { id: toastId });
    } finally { setBusy(null); }
  };

  const downloadReceipts = async () => {
    if (busy) return;
    if (districtMembers.length === 0) { toast.error('ഡൗൺലോഡ് ചെയ്യാനുള്ള അംഗങ്ങൾ ഇല്ല.'); return; }
    const entries: Array<{ member: UserProfile; receipt: any }> = [];
    districtMembers.forEach(member => {
      entries.push({ member, receipt: buildRegistrationReceipt(member) });
      const renewal = buildProfileRenewalReceipt(member);
      if (renewal) entries.push({ member, receipt: renewal });
    });
    setBusy('receipts');
    const toastId = toast.loading(`രസീത് PDF തയ്യാറാക്കുന്നു... 0/${entries.length} — ദയവായി ഈ പേജ് അടയ്ക്കരുത്.`);
    try {
      const result = await downloadReceiptsPdf(entries, {
        fileLabel: `HCRS_Receipts_${districtName}`,
        onProgress: (done, total) => toast.loading(`രസീത് PDF തയ്യാറാക്കുന്നു... ${done}/${total} — ദയവായി ഈ പേജ് അടയ്ക്കരുത്.`, { id: toastId })
      });
      toast.success(`${result.receipts} രസീതുകൾ ${result.files} PDF ഫയലായി ഡൗൺലോഡ് ചെയ്തു.`, { id: toastId, duration: 8000 });
    } catch (err: any) {
      toast.error('രസീത് PDF ഡൗൺലോഡ് പരാജയപ്പെട്ടു: ' + (err?.message || 'Error'), { id: toastId });
    } finally { setBusy(null); }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">Claim Forms & Receipts — {districtName}</h3>
          <p className="text-[11px] text-slate-500 font-semibold">
            ഈ ജില്ലയിലെ ക്ലെയിം ഫോമുകളും അംഗങ്ങളുടെ രസീതുകളും PDF ആയി ഡൗൺലോഡ് ചെയ്യാം (50 പേജ് വീതമുള്ള ഫയലുകൾ).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={downloadClaimsPdf} disabled={busy !== null || loading || claims.length === 0}
            className="h-10 rounded-xl font-black text-xs uppercase !bg-emerald-700 hover:!bg-emerald-800 !text-white">
            {busy === 'claims' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            Claim Forms PDF ({claims.length})
          </Button>
          <Button size="sm" onClick={downloadReceipts} disabled={busy !== null || districtMembers.length === 0}
            className="h-10 rounded-xl font-black text-xs uppercase !bg-blue-700 hover:!bg-blue-800 !text-white">
            {busy === 'receipts' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ReceiptIcon className="w-4 h-4 mr-1.5" />}
            Receipts PDF ({districtMembers.length})
          </Button>
          <Button size="sm" variant="outline" onClick={loadClaims} disabled={loading} className="h-10 rounded-xl font-black text-xs uppercase">
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowList(v => !v)} className="h-10 rounded-xl font-black text-xs uppercase">
            <FileText className="w-4 h-4 mr-1.5" /> {showList ? 'Hide' : 'View'} Claims
          </Button>
        </div>
      </div>

      {showList && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          {loading && !loaded ? (
            <div className="p-6 text-center text-sm font-bold text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />ലോഡ് ചെയ്യുന്നു...</div>
          ) : claims.length === 0 ? (
            <div className="p-6 text-center text-sm font-bold text-slate-500">ഈ ജില്ലയിൽ ക്ലെയിമുകൾ ഇല്ല.</div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {claims.map((claim, idx) => {
                const member = memberFor(claim);
                return (
                  <div key={claim.id || idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-900 truncate">{claim.userName || member?.name || '—'} <span className="text-[10px] font-bold text-slate-400">({claim.relationLabel || claim.relation || 'Self'})</span></p>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        {claim.userMobile || member?.mobile || ''} • {claim.membershipId || member?.membershipId || ''} • {formatClaimCategories(claim.categories || [])}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 px-2 text-[10px] font-black uppercase"
                        onClick={() => printCourtClaimReport(claim, member)}><Printer className="w-3 h-3 mr-1" />Print</Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-[10px] font-black uppercase"
                        onClick={() => downloadCourtClaimPdf(claim, member)}><Download className="w-3 h-3 mr-1" />PDF</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
