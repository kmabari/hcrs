import { useEffect, useState } from 'react';
import { DISTRICTS, getDistrictAdminUrl } from '../lib/districtUtils';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { toast } from 'sonner';

type AdminInfo = { mobile: string; name: string } | null;

export default function DistrictAdminLinks() {
  const [admins, setAdmins] = useState<Record<string, AdminInfo>>({});
  const [form, setForm] = useState<Record<string, { name: string; mobile: string; password: string }>>({});
  const [saving, setSaving] = useState<string>('');

  const load = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/district-admins');
      if (!res.ok) return;
      const data = await res.json();
      setAdmins(data.admins || {});
    } catch { /* optional */ }
  };
  useEffect(() => { load(); }, []);

  const setField = (code: string, key: 'name' | 'mobile' | 'password', value: string) =>
    setForm(prev => ({ ...prev, [code]: { name: '', mobile: '', password: '', ...prev[code], [key]: value } }));

  const save = async (code: string, districtName: string) => {
    const f = form[code] || { name: '', mobile: '', password: '' };
    const mobile = (f.mobile || admins[code]?.mobile || '').replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) return toast.error('10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.');
    if ((f.password || '').length < 6) return toast.error('പാസ്‌വേഡ് കുറഞ്ഞത് 6 അക്ഷരം വേണം.');
    setSaving(code);
    try {
      const res = await authenticatedFetch('/api/admin/set-district-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ district: code, mobile, password: f.password, name: f.name })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || 'സേവ് ചെയ്യാൻ കഴിഞ്ഞില്ല.');
      toast.success(`${districtName} ജില്ലാ അഡ്മിൻ ലോഗിൻ സേവ് ചെയ്തു`);
      setForm(prev => ({ ...prev, [code]: { name: '', mobile: '', password: '' } }));
      load();
    } catch {
      toast.error('നെറ്റ്‌വർക്ക് പ്രശ്നം. വീണ്ടും ശ്രമിക്കുക.');
    } finally { setSaving(''); }
  };

  return <details className="rounded-2xl border border-slate-200 bg-white p-4 my-4">
    <summary className="font-bold cursor-pointer">District Admin Login — 14 Districts (mobile + password + link)</summary>
    <p className="text-sm text-slate-600 mt-2">ഓരോ ജില്ലയുടെയും അഡ്മിൻ മൊബൈൽ നമ്പറും പാസ്‌വേഡും ഇവിടെ സെറ്റ് ചെയ്യുക. ലിങ്ക് അഡ്മിന് അയച്ചുകൊടുക്കുക; മൊബൈൽ + പാസ്‌വേഡ് ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യാം.</p>
    <div className="grid gap-3 md:grid-cols-2 mt-3">
      {DISTRICTS.map(district => {
        const url = getDistrictAdminUrl(district.code, window.location.origin);
        const current = admins[district.code];
        const f = form[district.code] || { name: '', mobile: '', password: '' };
        return <div key={district.code} className="rounded-xl border p-3 space-y-2">
          <p className="font-bold">District Admin — {district.name}</p>
          <p className="text-xs text-slate-600">{current ? `Current admin mobile: ${current.mobile || '—'}` : 'Admin login not set yet'}</p>
          <input className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="Admin name (optional)" value={f.name} onChange={e => setField(district.code, 'name', e.target.value)} />
          <input className="w-full border rounded-lg px-2 py-1.5 text-sm" inputMode="numeric" maxLength={10} placeholder={current?.mobile ? `Mobile (${current.mobile})` : 'Mobile number'} value={f.mobile} onChange={e => setField(district.code, 'mobile', e.target.value.replace(/\D/g, ''))} />
          <input className="w-full border rounded-lg px-2 py-1.5 text-sm" type="text" autoComplete="off" placeholder="New password (min 6)" value={f.password} onChange={e => setField(district.code, 'password', e.target.value)} />
          <button type="button" disabled={saving === district.code} className="text-sm font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-50" onClick={() => save(district.code, district.name)}>
            {saving === district.code ? 'Saving…' : current ? 'Update mobile / password' : 'Set mobile / password'}
          </button>
          <a className="block text-xs text-blue-700 break-all" href={url}>{url}</a>
          <button type="button" className="text-sm font-bold" onClick={async () => {
            try { await navigator.clipboard.writeText(url); toast.success(`${district.name} admin link copied`); }
            catch { toast.error('Could not copy. Select the link and copy it.'); }
          }}>Copy login link</button>
        </div>;
      })}
    </div>
  </details>;
}
