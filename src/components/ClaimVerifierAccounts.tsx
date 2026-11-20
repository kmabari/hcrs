import { useEffect, useState } from 'react';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { toast } from 'sonner';

type Account = { mobile: string; name: string; enabled: boolean };

/** Main admin: create mobile + password logins that can open ONLY the claim verification page. */
export default function ClaimVerifierAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [f, setF] = useState({ name: '', mobile: '', password: '' });
  const [saving, setSaving] = useState(false);
  const link = `${window.location.origin}/?claimverify=1`;

  const load = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/claim-verifier-accounts');
      if (res.ok) setAccounts((await res.json()).accounts || []);
    } catch { /* optional */ }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const mobile = f.mobile.replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) return toast.error('10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.');
    if (f.password.length < 6) return toast.error('പാസ്‌വേഡ് കുറഞ്ഞത് 6 അക്ഷരം വേണം.');
    setSaving(true);
    try {
      const res = await authenticatedFetch('/api/admin/set-claim-verifier-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password: f.password, name: f.name })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'സേവ് ചെയ്യാൻ കഴിഞ്ഞില്ല.');
      toast.success('വെരിഫയർ ലോഗിൻ സേവ് ചെയ്തു');
      setF({ name: '', mobile: '', password: '' });
      load();
    } catch { toast.error('നെറ്റ്‌വർക്ക് പ്രശ്നം.'); } finally { setSaving(false); }
  };

  const remove = async (mobile: string) => {
    if (!window.confirm(`${mobile} വെരിഫയർ ലോഗിൻ ഒഴിവാക്കണോ?`)) return;
    const res = await authenticatedFetch('/api/admin/remove-claim-verifier-account', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile })
    });
    if (res.ok) { toast.success('ഒഴിവാക്കി'); load(); } else toast.error('ഒഴിവാക്കാൻ കഴിഞ്ഞില്ല.');
  };

  return <div className="rounded-2xl border border-slate-200 bg-white p-4 my-4 space-y-3">
    <p className="font-bold">Claim Verifier Login (verification page only)</p>
    <p className="text-sm text-slate-600">മൊബൈൽ നമ്പറും നിങ്ങൾ തീരുമാനിക്കുന്ന പാസ്‌വേഡും നൽകി ലിങ്ക് അയച്ചാൽ അവർക്ക് ക്ലെയിം വെരിഫിക്കേഷൻ പേജ് മാത്രം തുറക്കാം. മറ്റൊരു ഭാഗവും കാണാനാവില്ല; അംഗത്വ എൻട്രി ഉണ്ടാകില്ല.</p>
    <div className="grid gap-2 md:grid-cols-4">
      <input className="border rounded-lg px-2 py-1.5 text-sm" placeholder="Name (optional)" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input className="border rounded-lg px-2 py-1.5 text-sm" inputMode="numeric" maxLength={10} placeholder="Mobile (10 digits)" value={f.mobile} onChange={e => setF({ ...f, mobile: e.target.value })} />
      <input className="border rounded-lg px-2 py-1.5 text-sm" autoComplete="off" placeholder="Password (min 6)" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
      <button type="button" disabled={saving} onClick={save} className="text-sm font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">{saving ? 'Saving…' : 'Create / update login'}</button>
    </div>
    <div className="text-xs break-all"><a className="text-blue-700" href={link}>{link}</a>{' '}
      <button type="button" className="font-bold" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success('Link copied'); } catch { toast.error('Copy failed'); } }}>Copy link</button>
    </div>
    {accounts.length > 0 && <ul className="text-sm divide-y">
      {accounts.map(a => <li key={a.mobile} className="flex items-center justify-between py-1.5">
        <span>{a.name || 'Verifier'} — {a.mobile}</span>
        <button type="button" className="text-red-700 font-bold text-xs" onClick={() => remove(a.mobile)}>Remove</button>
      </li>)}
    </ul>}
  </div>;
}
