import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Toaster, toast } from 'sonner';
import { auth } from '../lib/firebase';
import ClaimVerificationPanel from './ClaimVerificationPanel';

const CV_EMAIL = /^cv\d{10}@hcrs\.society$/;

/** Standalone page opened from the verifier link: mobile + password, then ONLY the claim verification panel. */
export default function ClaimVerifierPortal() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, u => { setEmail(u?.email || ''); setReady(true); }), []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = mobile.replace(/\D/g, '').slice(-10);
    if (m.length !== 10 || !password) return toast.error('മൊബൈലും പാസ്‌വേഡും നൽകുക.');
    setBusy(true);
    try { await signInWithEmailAndPassword(auth, `cv${m}@hcrs.society`, password); }
    catch { toast.error('മൊബൈൽ നമ്പറോ പാസ്‌വേഡോ ശരിയല്ല.'); }
    finally { setBusy(false); }
  };

  if (!ready) return <div className="p-8 text-center">Loading…</div>;
  const loggedIn = CV_EMAIL.test(email);

  return <div className="min-h-screen bg-slate-50 p-4">
    <Toaster position="top-center" richColors />
    <div className="max-w-5xl mx-auto">
      {loggedIn ? <>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold">HCRS — Claim Verification</h1>
          <button type="button" className="text-sm font-bold underline" onClick={() => signOut(auth)}>Logout</button>
        </div>
        <ClaimVerificationPanel officerName="" />
      </> : <form onSubmit={login} className="max-w-sm mx-auto mt-16 bg-white border rounded-2xl p-5 space-y-3">
        <h1 className="font-bold text-lg">HCRS — Claim Verification Login</h1>
        {email && <p className="text-xs text-red-700">ഈ ലോഗിന് ഈ പേജിലേക്ക് ആക്സസ് ഇല്ല. വെരിഫയർ നമ്പർ ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക.</p>}
        <input className="w-full border rounded-lg px-3 py-2" inputMode="numeric" maxLength={10} placeholder="Mobile number" value={mobile} onChange={e => setMobile(e.target.value)} />
        <input className="w-full border rounded-lg px-3 py-2" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" disabled={busy} className="w-full bg-slate-900 text-white font-bold rounded-lg py-2 disabled:opacity-50">{busy ? 'Logging in…' : 'Login'}</button>
      </form>}
    </div>
  </div>;
}
