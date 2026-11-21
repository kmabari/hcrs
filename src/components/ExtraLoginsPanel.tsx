import { useState } from 'react';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { toast } from 'sonner';

/** Main admin: find and delete the extra login accounts (<mobile>_auth_x, _v2, _pNNNNNN). Member records are never deleted. */
export default function ExtraLoginsPanel() {
  const [info, setInfo] = useState<{ count: number; accounts: any[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const scan = async () => {
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/admin/extra-logins');
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'Scan failed');
      setInfo({ count: j.count, accounts: j.accounts || [] });
    } catch { toast.error('Network problem'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!info?.count) return;
    if (!window.confirm(`${info.count} അധിക ലോഗിൻ അക്കൗണ്ടുകൾ ഡിലീറ്റ് ചെയ്യണോ? അംഗ റെക്കോർഡുകൾ ഡിലീറ്റ് ആകില്ല. അംഗങ്ങൾ അടുത്ത തവണ ലോഗിൻ ചെയ്യുമ്പോൾ അവരുടെ ഒരൊറ്റ സ്ഥിര ലോഗിനിലേക്ക് കയറും.`)) return;
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/admin/delete-extra-logins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || 'Delete failed');
      toast.success(`ഡിലീറ്റ് ചെയ്തു: ${j.authDeleted} ലോഗിൻ, ${j.docsDeleted} ശൂന്യ പ്രൊഫൈൽ`);
      setInfo(null);
    } catch { toast.error('Network problem'); } finally { setBusy(false); }
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 my-4 space-y-2">
    <p className="font-bold">Extra login accounts (duplicate logins)</p>
    <p className="text-sm text-slate-600">ഒരു മൊബൈലിന് ഒരു സ്ഥിര ലോഗിൻ മാത്രം. പഴയ ലോഗിൻ ശ്രമങ്ങൾ ഉണ്ടാക്കിയ അധിക അക്കൗണ്ടുകൾ ഇവിടെ കണ്ടെത്തി ഡിലീറ്റ് ചെയ്യാം. അംഗത്വ റെക്കോർഡ്, ക്ലെയിം, രസീത് എന്നിവ ഇതുകൊണ്ട് ഡിലീറ്റ് ആകില്ല.</p>
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={scan} className="text-sm font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">{busy ? 'Working…' : 'Scan'}</button>
      {info && info.count > 0 && <button type="button" disabled={busy} onClick={del} className="text-sm font-bold bg-red-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">Delete all {info.count}</button>}
    </div>
    {info && <p className="text-sm">{info.count === 0 ? 'അധിക ലോഗിൻ ഒന്നുമില്ല.' : `${info.count} അധിക ലോഗിൻ കണ്ടെത്തി.`}</p>}
    {info && info.accounts.length > 0 && <ul className="text-xs max-h-48 overflow-auto divide-y">{info.accounts.slice(0, 50).map(a => <li key={a.uid} className="py-1 break-all">{a.email}</li>)}</ul>}
  </div>;
}
