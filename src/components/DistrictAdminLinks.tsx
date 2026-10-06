import { DISTRICTS, getDistrictAdminUrl } from '../lib/districtUtils';
import { toast } from 'sonner';

export default function DistrictAdminLinks() {
  return <details className="rounded-2xl border border-slate-200 bg-white p-4 my-4">
    <summary className="font-bold cursor-pointer">District Admin Login Links — 14 Districts</summary>
    <p className="text-sm text-slate-600 mt-2">Login with the assigned district account. A link does not grant admin access.</p>
    <div className="grid gap-3 md:grid-cols-2 mt-3">
      {DISTRICTS.map(district => {
        const url = getDistrictAdminUrl(district.code, window.location.origin);
        return <div key={district.code} className="rounded-xl border p-3">
          <p className="font-bold">District Admin — {district.name}</p>
          <a className="text-xs text-blue-700 break-all" href={url}>{url}</a>
          <button type="button" className="block mt-2 text-sm font-bold" onClick={async () => {
            try { await navigator.clipboard.writeText(url); toast.success(`${district.name} admin link copied`); }
            catch { toast.error('Could not copy. Select the link and copy it.'); }
          }}>Copy login link</button>
        </div>;
      })}
    </div>
  </details>;
}
