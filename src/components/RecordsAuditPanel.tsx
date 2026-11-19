import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

const mobOf = (m: any) => String(m?.mobile || '').replace(/\D/g, '').slice(-10);
const ms = (v: any) => { if (!v) return 0; const t = v.toDate ? v.toDate().getTime() : (v.seconds ? v.seconds * 1000 : new Date(v).getTime()); return Number.isNaN(t) ? 0 : t; };
const dateStr = (v: any) => { const t = ms(v); return t ? new Date(t).toLocaleDateString('en-IN') : '—'; };

/**
 * READ-ONLY audit of the loaded member records: explains why the list/Excel shows fewer members than the
 * database holds, lists mobiles that have more than one record, and lists suspicious active records.
 * It never changes data.
 */
export default function RecordsAuditPanel({ members, adminEmails, getStatus }: {
  members: any[]; adminEmails: string[]; getStatus: (m: any) => string;
}) {
  const [showDup, setShowDup] = useState(true);
  const audit = useMemo(() => {
    const adminSet = new Set(adminEmails.map(e => e.toLowerCase()));
    const isAdminRec = (m: any) => adminSet.has(String(m.email || '').toLowerCase()) || m.role === 'admin' || m.role === 'operator' || m.membership_type === 'DISTRICT_ADMIN';
    let admins = 0, deleted = 0;
    const base: any[] = [];
    members.forEach(m => {
      if (isAdminRec(m)) { admins++; return; }
      if (m.status === 'deleted') { deleted++; return; }
      base.push(m);
    });
    const groups = new Map<string, any[]>();
    let noMobile = 0;
    base.forEach(m => { const k = mobOf(m); if (!k) { noMobile++; return; } (groups.get(k) || groups.set(k, []).get(k)!).push(m); });
    const dupGroups = Array.from(groups.entries()).filter(([, g]) => g.length > 1);
    const hidden = dupGroups.reduce((n, [, g]) => n + g.length - 1, 0);
    const suspicious = base.filter(m => {
      if (getStatus(m) !== 'active' && m.status !== 'active') return false;
      const nm = String(m.name || '').trim();
      return !nm || nm === 'Member' || nm === 'undefined' || !mobOf(m) || !m.membershipId || (m.isPaid !== true && !m.registeredBy);
    });
    return { total: members.length, admins, deleted, noMobile, base: base.length, hidden, shown: base.length - hidden, dupGroups, suspicious };
  }, [members, adminEmails, getStatus]);

  const exportDup = () => {
    const rows: any[] = [];
    audit.dupGroups.forEach(([mob, g]) => g.forEach(m => rows.push({
      Mobile: mob, 'Doc ID': m.uid || m.id || '', Name: m.name || '', 'Membership ID': m.membershipId || '', Status: getStatus(m), 'Raw status': m.status || '',
      Paid: m.isPaid ? 'Yes' : 'No', 'Renewal pending': m.renewalPending ? 'Yes' : 'No', Registered: dateStr(m.registrationDate), Expiry: dateStr(m.expiryDate), District: m.district || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Duplicate mobiles');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(audit.suspicious.map(m => ({
      Mobile: mobOf(m), 'Doc ID': m.uid || m.id || '', Name: m.name || '', 'Membership ID': m.membershipId || '', Status: getStatus(m), Paid: m.isPaid ? 'Yes' : 'No', Registered: dateStr(m.registrationDate), District: m.district || ''
    }))), 'Suspicious active');
    XLSX.writeFile(wb, `HCRS_Records_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const Stat = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-xl border p-3 bg-white"><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="text-xl font-black font-mono">{value.toLocaleString('en-IN')}</p></div>
  );

  return (
    <section className="w-full space-y-4">
      <h3 className="font-black text-lg">Records Audit (വായിക്കാൻ മാത്രം — ഒന്നും മാറ്റില്ല)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="ആകെ റെക്കോർഡ് (loaded)" value={audit.total} />
        <Stat label="ലിസ്റ്റിലും Excel-ലും" value={audit.shown} />
        <Stat label="ഒരേ മൊബൈൽ — മറച്ചത്" value={audit.hidden} />
        <Stat label="Deleted" value={audit.deleted} />
        <Stat label="Admin accounts" value={audit.admins} />
        <Stat label="മൊബൈൽ ഇല്ലാത്തത്" value={audit.noMobile} />
        <Stat label="Duplicate മൊബൈലുകൾ" value={audit.dupGroups.length} />
        <Stat label="സംശയമുള്ള ആക്ടീവ്" value={audit.suspicious.length} />
      </div>
      <p className="text-xs text-slate-600">ആകെ − (Admin + Deleted + മറച്ച ഡ്യൂപ്ലിക്കേറ്റ്) = ലിസ്റ്റിലെ എണ്ണം. "Deleted/Admin" കൂടാതെ ലോഡ് ചെയ്ത റെക്കോർഡുകൾ മാത്രമേ ഇവിടെ കണക്കാകൂ.</p>
      <button type="button" className="text-sm font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5" onClick={exportDup}>Download audit (Excel)</button>

      <div>
        <button type="button" className="text-sm font-black underline" onClick={() => setShowDup(s => !s)}>{showDup ? '▼' : '▶'} ഒരേ മൊബൈലിൽ ഒന്നിലധികം റെക്കോർഡ് ({audit.dupGroups.length})</button>
        {showDup && (
          <div className="mt-2 space-y-2 max-h-[60vh] overflow-y-auto">
            {audit.dupGroups.slice(0, 200).map(([mob, g]) => (
              <div key={mob} className="rounded-xl border p-2 text-xs">
                <p className="font-black font-mono">{mob} <span className="font-bold text-slate-500">({g.length} records)</span></p>
                {g.map((m, i) => (
                  <p key={(m.uid || m.id || '') + i} className="font-mono">
                    {(m.uid || m.id || '').toString().slice(0, 14)} • {m.name || '—'} • {m.membershipId || 'no-ID'} • {getStatus(m)} • paid:{m.isPaid ? 'Y' : 'N'} • renewPending:{m.renewalPending ? 'Y' : 'N'} • expiry {dateStr(m.expiryDate)}
                  </p>
                ))}
              </div>
            ))}
            {audit.dupGroups.length > 200 && <p className="text-xs text-slate-500">ആദ്യത്തെ 200 മാത്രം കാണിച്ചു. ബാക്കി Excel-ൽ ഉണ്ട്.</p>}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-black">സംശയമുള്ള ആക്ടീവ് റെക്കോർഡുകൾ ({audit.suspicious.length})</p>
        <p className="text-xs text-slate-500">പേര് ഇല്ല/“Member”, മൊബൈൽ അല്ലെങ്കിൽ മെമ്പർഷിപ്പ് ഐഡി ഇല്ല, അല്ലെങ്കിൽ പണം അടച്ചിട്ടില്ലാത്ത ഓൺലൈൻ അംഗം.</p>
        <div className="mt-2 space-y-1 max-h-[50vh] overflow-y-auto text-xs font-mono">
          {audit.suspicious.slice(0, 300).map((m, i) => (
            <p key={(m.uid || m.id || '') + i} className="rounded border px-2 py-1">{mobOf(m) || 'no-mobile'} • {m.name || '—'} • {m.membershipId || 'no-ID'} • paid:{m.isPaid ? 'Y' : 'N'} • {(m.uid || m.id || '').toString().slice(0, 14)}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
