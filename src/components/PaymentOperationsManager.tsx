import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  QrCode, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Save, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  Building2, 
  Wallet, 
  ArrowRight, 
  Eye, 
  Sliders, 
  Sparkles,
  Smartphone,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getOrgSettings, saveOrgSettings, OrgSettings, defaultSettings } from '../lib/cms';
import { UserProfile } from '../types';

interface PaymentOperationsManagerProps {
  user?: UserProfile | null;
}

export default function PaymentOperationsManager({ user }: PaymentOperationsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePreview, setActivePreview] = useState<'reg' | 'renewal'>('reg');
  const [selectedPreviewMethod, setSelectedPreviewMethod] = useState<'razorpay' | 'qrcode'>('qrcode');

  // Form State
  const [razorpayEnabled, setRazorpayEnabled] = useState<boolean>(false);
  const [qrCodePaymentEnabled, setQrCodePaymentEnabled] = useState<boolean>(true);
  const [upiId, setUpiId] = useState<string>('hcrs.kerala@okaxis');
  const [upiAccountName, setUpiAccountName] = useState<string>('HIGHRICH COMMUNITY REVIVAL SOCIETY');
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string>('');
  const [bankName, setBankName] = useState<string>('State Bank of India (SBI)');
  const [accountNumber, setAccountNumber] = useState<string>('41235678901');
  const [ifscCode, setIfscCode] = useState<string>('SBIN0070123');
  const [branchName, setBranchName] = useState<string>('Kasaragod Main Branch');
  const [qrInstructions, setQrInstructions] = useState<string>('');
  const [registrationFee, setRegistrationFee] = useState<number>(200);
  const [renewalFee, setRenewalFee] = useState<number>(100);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('rzp_live_HCRSKerala9645');
  const [razorpayStatusNote, setRazorpayStatusNote] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings: OrgSettings = await getOrgSettings();
      setRazorpayEnabled(settings.razorpayEnabled ?? false);
      setQrCodePaymentEnabled(settings.qrCodePaymentEnabled ?? true);
      setUpiId(settings.upiId || defaultSettings.upiId || 'hcrs.kerala@okaxis');
      setUpiAccountName(settings.upiAccountName || defaultSettings.upiAccountName || 'HIGHRICH COMMUNITY REVIVAL SOCIETY');
      setQrCodeImageUrl(settings.qrCodeImageUrl || defaultSettings.qrCodeImageUrl || '');
      setBankName(settings.bankName || defaultSettings.bankName || 'State Bank of India (SBI)');
      setAccountNumber(settings.accountNumber || defaultSettings.accountNumber || '41235678901');
      setIfscCode(settings.ifscCode || defaultSettings.ifscCode || 'SBIN0070123');
      setBranchName(settings.branchName || defaultSettings.branchName || 'Kasaragod Main Branch');
      setQrInstructions(settings.qrInstructions || defaultSettings.qrInstructions || '');
      setRegistrationFee(settings.registrationFee || 200);
      setRenewalFee(settings.renewalFee || 100);
      setRazorpayKeyId(settings.razorpayKeyId || 'rzp_live_HCRSKerala9645');
      setRazorpayStatusNote(settings.razorpayStatusNote || defaultSettings.razorpayStatusNote || '');
    } catch (e) {
      console.error('Failed to load payment settings:', e);
      toast.error('Could not load payment settings from database');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDefaultQr = () => {
    const encodedPa = encodeURIComponent(upiId.trim());
    const encodedPn = encodeURIComponent(upiAccountName.trim());
    const newQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${encodedPa}%26pn=${encodedPn}%26cu=INR`;
    setQrCodeImageUrl(newQrUrl);
    toast.success('Generated official UPI QR Code for ' + upiId);
  };

  const handleSave = async () => {
    if (!razorpayEnabled && !qrCodePaymentEnabled) {
      const confirmed = window.confirm(
        'Warning: Both Razorpay and QR Code payment methods are disabled. Applicants will not be able to pay online. Do you want to proceed?'
      );
      if (!confirmed) return;
    }

    setSaving(true);
    const saveToast = toast.loading('Saving Payment Operations configuration to Firestore...');
    try {
      const updateData: Partial<OrgSettings> = {
        razorpayEnabled,
        qrCodePaymentEnabled,
        upiId: upiId.trim(),
        upiAccountName: upiAccountName.trim(),
        qrCodeImageUrl: qrCodeImageUrl.trim() || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${encodeURIComponent(upiId.trim())}%26pn=${encodeURIComponent(upiAccountName.trim())}%26cu=INR`,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim(),
        qrInstructions: qrInstructions.trim(),
        registrationFee: Number(registrationFee) || 200,
        renewalFee: Number(renewalFee) || 100,
        razorpayKeyId: razorpayKeyId.trim(),
        razorpayStatusNote: razorpayStatusNote.trim()
      };

      await saveOrgSettings(updateData);
      toast.success('Payment Operations settings updated successfully! (സെറ്റിങ്സ് വിജയകരമായി സേവ് ചെയ്തു)', { id: saveToast });
    } catch (e: any) {
      console.error('Failed to save payment settings:', e);
      toast.error(e.message || 'Failed to save payment configuration', { id: saveToast });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const confirmed = window.confirm('Reset all payment settings to default HCRS configuration?');
    if (!confirmed) return;

    setRazorpayEnabled(false);
    setQrCodePaymentEnabled(true);
    setUpiId('hcrs.kerala@okaxis');
    setUpiAccountName('HIGHRICH COMMUNITY REVIVAL SOCIETY');
    setQrCodeImageUrl('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=hcrs.kerala@okaxis%26pn=HIGHRICH%20COMMUNITY%20REVIVAL%20SOCIETY%26cu=INR');
    setBankName('State Bank of India (SBI)');
    setAccountNumber('41235678901');
    setIfscCode('SBIN0070123');
    setBranchName('Kasaragod Main Branch');
    setQrInstructions('Scan the official HCRS QR Code or pay using UPI ID. After completing payment in your UPI app, copy and enter the 12-digit UPI Reference / UTR Number below to complete registration.');
    setRegistrationFee(200);
    setRenewalFee(100);
    setRazorpayKeyId('rzp_live_HCRSKerala9645');
    setRazorpayStatusNote('Razorpay KYC / Bank verification is currently under review. Enable toggle once approved.');
    toast.info('Restored default values. Click "Save Changes" to apply.');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Operational Mode
  const getOperationalMode = () => {
    if (razorpayEnabled && qrCodePaymentEnabled) {
      return {
        label: 'Dual Payment Mode (രണ്ടും ലഭ്യമാണ്)',
        description: 'Razorpay പേയ്‌മെന്റുകൾ ഓട്ടോമാറ്റിക് അപ്രൂവൽ ആകും (Instant ID Card); QR Code പേയ്‌മെന്റുകൾ അഡ്മിൻ വെരിഫിക്കേഷനായി പെൻഡിങ്ങിൽ വരും.',
        color: 'bg-emerald-500 text-white',
        border: 'border-emerald-500/30'
      };
    }
    if (!razorpayEnabled && qrCodePaymentEnabled) {
      return {
        label: 'QR Code Mode (ക്യുആർ കോഡ് മാത്രം - അഡ്മിൻ വെരിഫിക്കേഷൻ)',
        description: 'അപേക്ഷകർ QR കോഡ് വഴി തുക അടച്ച് UTR നമ്പർ നൽകുന്നു. അഡ്മിൻ പാനലിൽ നിന്ന് വെരിഫൈ ചെയ്ത് അപ്രൂവൽ നൽകിയാൽ മാത്രമേ കാർഡ് ആക്ടീവ് ആകൂ.',
        color: 'bg-brand-magenta text-white',
        border: 'border-brand-magenta/30'
      };
    }
    if (razorpayEnabled && !qrCodePaymentEnabled) {
      return {
        label: 'Razorpay Gateway Only (ഓൺലൈൻ ഗേറ്റ്‌വേ മാത്രം - ഓട്ടോ അപ്രൂവൽ)',
        description: 'Razorpay വഴി പെയ്മെന്റ് പൂർത്തിയാകുമ്പോൾ തന്നെ അഡ്മിൻ ഇടപെടലില്ലാതെ ഓട്ടോമാറ്റിക് ആയി അപ്പ്രൂവ് ആയി ഡിജിറ്റൽ ഐഡി കാർഡ് ലഭ്യമാകും.',
        color: 'bg-brand-blue text-white',
        border: 'border-blue-500/30'
      };
    }
    return {
      label: 'All Online Payments Disabled (ഓഫ്‌ലൈൻ മാത്രം)',
      description: 'Online payment intake is paused. Members will be asked to contact administration.',
      color: 'bg-amber-600 text-white',
      border: 'border-amber-500/30'
    };
  };

  const mode = getOperationalMode();

  const handleApplyPreset = (type: 'razorpay' | 'qr' | 'both') => {
    if (type === 'razorpay') {
      setRazorpayEnabled(true);
      setQrCodePaymentEnabled(false);
      toast.info('Selected Razorpay Only Mode (ഓട്ടോമാറ്റിക് അപ്രൂവൽ മോഡ്). Click "Save Settings" to apply.');
    } else if (type === 'qr') {
      setRazorpayEnabled(false);
      setQrCodePaymentEnabled(true);
      toast.info('Selected QR Code Only Mode (മാനുവൽ അഡ്മിൻ വെരിഫിക്കേഷൻ മോഡ്). Click "Save Settings" to apply.');
    } else if (type === 'both') {
      setRazorpayEnabled(true);
      setQrCodePaymentEnabled(true);
      toast.info('Selected Dual Payment Mode. Click "Save Settings" to apply.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-brand-blue animate-spin mb-4" />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Loading Payment Operations...</h3>
        <p className="text-xs text-slate-400 font-bold mt-1">പേയ്‌മെന്റ് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Status Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-magenta/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-blue/30 rounded-2xl border border-brand-blue/50 text-white shadow-inner">
                <Wallet className="w-6 h-6 text-brand-magenta" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  Payment Operations Module
                  <Badge className="bg-brand-blue text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 border-none">
                    Admin Control
                  </Badge>
                </h2>
                <p className="text-xs font-bold text-slate-300">
                  പേയ്‌മെന്റ് രീതികളുടെ കൺട്രോൾ പാനൽ (Razorpay & QR Code Payment Switchboard)
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 font-medium max-w-3xl leading-relaxed">
              Razorpay, QR Code UPI പേയ്‌മെന്റ് സിസ്റ്റങ്ങൾ പരസ്പരം ബന്ധമില്ലാതെ സ്വതന്ത്രമായി (Independently) ഓൺ/ഓഫ് ചെയ്യാം. Razorpay വെരിഫിക്കേഷൻ പൂർത്തിയാകുന്നത് വരെ QR Code പേയ്‌മെന്റ് സിസ്റ്റം പൂർണ്ണമായും സജ്ജമായി പ്രവർത്തിക്കും.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleResetDefaults}
              variant="outline"
              disabled={saving}
              className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Reset Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Settings (സേവ് ചെയ്യുക)'}</span>
            </Button>
          </div>
        </div>

        {/* Real-time Status Strip */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Razorpay Gateway</p>
                <p className="text-xs font-extrabold text-white mt-0.5">
                  {razorpayEnabled ? 'Auto-Approval Active' : 'Currently Disabled (Off)'}
                </p>
              </div>
            </div>
            <Badge className={razorpayEnabled ? 'bg-emerald-500 text-white font-black' : 'bg-slate-700 text-slate-300 font-bold'}>
              {razorpayEnabled ? 'ON' : 'OFF'}
            </Badge>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-magenta/20 text-brand-magenta">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">QR Code UPI</p>
                <p className="text-xs font-extrabold text-white mt-0.5">
                  {qrCodePaymentEnabled ? 'Manual Verify Active' : 'Currently Disabled (Off)'}
                </p>
              </div>
            </div>
            <Badge className={qrCodePaymentEnabled ? 'bg-emerald-500 text-white font-black' : 'bg-slate-700 text-slate-300 font-bold'}>
              {qrCodePaymentEnabled ? 'ON' : 'OFF'}
            </Badge>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Mode</p>
                <p className="text-xs font-extrabold text-white truncate max-w-[150px] mt-0.5">
                  {mode.label}
                </p>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Quick Mode Preset Buttons */}
        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Presets (വേഗത്തിൽ മോഡ് മാറ്റാൻ):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleApplyPreset('razorpay')}
              className={`p-2.5 rounded-xl border text-xs font-black text-left flex items-center justify-between transition-all cursor-pointer ${
                razorpayEnabled && !qrCodePaymentEnabled
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="font-extrabold">1. Razorpay മാത്രം (Auto)</div>
                <div className="text-[10px] opacity-80 font-normal">തനിയെ അപ്രൂവ് ആകും • ID കാർഡ് വരും</div>
              </div>
              {razorpayEnabled && !qrCodePaymentEnabled && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('qr')}
              className={`p-2.5 rounded-xl border text-xs font-black text-left flex items-center justify-between transition-all cursor-pointer ${
                !razorpayEnabled && qrCodePaymentEnabled
                  ? 'bg-brand-magenta border-pink-400 text-white shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="font-extrabold">2. QR Code മാത്രം (Manual)</div>
                <div className="text-[10px] opacity-80 font-normal">അഡ്മിൻ വെരിഫൈ ചെയ്തു അപ്രൂവ് ചെയ്യണം</div>
              </div>
              {!razorpayEnabled && qrCodePaymentEnabled && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('both')}
              className={`p-2.5 rounded-xl border text-xs font-black text-left flex items-center justify-between transition-all cursor-pointer ${
                razorpayEnabled && qrCodePaymentEnabled
                  ? 'bg-emerald-700 border-emerald-400 text-white shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="font-extrabold">3. രണ്ടും ലഭ്യമാക്കുക (Dual)</div>
                <div className="text-[10px] opacity-80 font-normal">Razorpay: ഓട്ടോ • QR: അഡ്മിൻ വെരിഫിക്കേഷൻ</div>
              </div>
              {razorpayEnabled && qrCodePaymentEnabled && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
            </button>
          </div>
        </div>
      </div>

      {/* Clear Rules Explanation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50/90 border-2 border-blue-200 p-4 sm:p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-brand-blue font-black text-xs uppercase tracking-wide">
            <CreditCard className="w-4 h-4" />
            <span>റൂൾ 1: Razorpay Gateway വഴി (₹200 / ₹100)</span>
          </div>
          <p className="text-xs text-blue-950 font-bold leading-relaxed">
            ⚡ <span className="underline">ഓട്ടോമാറ്റിക് ഇൻസ്റ്റന്റ് അപ്രൂവൽ:</span> Razorpay വഴി പണം വിജയകരമായി അടച്ചു കഴിഞ്ഞാൽ അഡ്മിന് യാതൊരു ജോലിയും ചെയ്യാതെ തന്നെ അക്കൗണ്ട് ഓട്ടോമാറ്റിക് ആയി ആക്ടീവ് ആവുകയും തത്സമയം ഡിജിറ്റൽ ഐഡി കാർഡ് ലഭ്യമാവുകയും ചെയ്യും.
          </p>
        </div>

        <div className="bg-pink-50/90 border-2 border-pink-200 p-4 sm:p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-brand-magenta font-black text-xs uppercase tracking-wide">
            <QrCode className="w-4 h-4" />
            <span>റൂൾ 2: QR Code സിസ്റ്റം വഴി (₹200 / ₹100)</span>
          </div>
          <p className="text-xs text-pink-950 font-bold leading-relaxed">
            📋 <span className="underline">അഡ്മിൻ വെരിഫിക്കേഷൻ നിർബന്ധം:</span> QR കോഡ് വഴി സ്കാൻ ചെയ്ത് UTR നമ്പർ നൽകി സബ്മിറ്റ് ചെയ്യുന്ന അപേക്ഷകൾ പെൻഡിങ്ങിൽ കിടക്കും. അക്കൗണ്ടിൽ പൈസ വന്നു എന്ന് അഡ്മിൻ വെരിഫൈ ചെയ്ത് 'Approve' ബട്ടൺ അടിച്ചാൽ മാത്രമേ ആക്ടീവ് ആകുകയും കാർഡ് ലഭിക്കുകയും ചെയ്യുകയുള്ളൂ.
          </p>
        </div>
      </div>

      {/* Main Switchboard & Configuration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PANEL 1: RAZORPAY GATEWAY CONTROL */}
        <Card className={`border-2 rounded-[32px] transition-all bg-white shadow-sm overflow-hidden ${
          razorpayEnabled ? 'border-brand-blue shadow-md' : 'border-slate-200'
        }`}>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                  razorpayEnabled ? 'bg-brand-blue' : 'bg-slate-400'
                }`}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-black uppercase text-slate-900 tracking-tight">
                      1. Razorpay Gateway
                    </CardTitle>
                    <Badge className={razorpayEnabled ? 'bg-emerald-600 text-white font-black text-[9px]' : 'bg-amber-100 text-amber-900 border-amber-300 font-black text-[9px]'}>
                      {razorpayEnabled ? 'STATUS: ENABLED' : 'STATUS: DISABLED'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-bold text-slate-500 mt-0.5">
                    Automated Checkout (Cards, NetBanking, Instant UPI)
                  </CardDescription>
                </div>
              </div>

              {/* Master Toggle */}
              <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs">
                <Label htmlFor="toggle-razorpay" className="text-xs font-black uppercase text-slate-700 cursor-pointer">
                  {razorpayEnabled ? 'ON' : 'OFF'}
                </Label>
                <Switch
                  id="toggle-razorpay"
                  checked={razorpayEnabled}
                  onCheckedChange={setRazorpayEnabled}
                  className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-7 space-y-6">
            {/* Status info box */}
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
              razorpayEnabled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-start gap-2.5">
                {razorpayEnabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-extrabold">
                    {razorpayEnabled 
                      ? 'Razorpay Gateway is Active! Members can pay directly via Razorpay checkout.' 
                      : 'Razorpay Verification Notice: Verification is currently pending with Razorpay merchant team.'}
                  </p>
                  <p className="mt-1 font-medium text-slate-700">
                    {razorpayEnabled
                      ? 'When active, applicants will see the instant Razorpay payment option for ₹200 registration and ₹100 renewal.'
                      : 'While verification is pending, keep this switch OFF. All payments will be routed seamlessly through the official QR Code system.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Razorpay Key ID (പബ്ലിക് കീ)</span>
                  <span className="text-[10px] font-bold text-slate-400">Live / Test Key</span>
                </Label>
                <Input
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="e.g. rzp_live_xxxxxxxx or rzp_test_xxxxxxxx"
                  className="h-11 rounded-xl font-mono text-xs font-bold border-2 border-slate-200 focus:border-brand-blue"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Verification / Status Remarks (അഡ്മിൻ കുറിപ്പ്)
                </Label>
                <Input
                  value={razorpayStatusNote}
                  onChange={(e) => setRazorpayStatusNote(e.target.value)}
                  placeholder="e.g. KYC under review by Razorpay compliance team"
                  className="h-11 rounded-xl text-xs font-bold border-2 border-slate-200 focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
              <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-blue" />
                Integration Status Overview
              </p>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                  Razorpay Checkout SDK is fully integrated and tested in code.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                  Instant payment receipts and transaction records are preserved.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                  Toggle switch ON anytime with zero code modifications needed.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* PANEL 2: QR CODE & UPI PAYMENT CONTROL */}
        <Card className={`border-2 rounded-[32px] transition-all bg-white shadow-sm overflow-hidden ${
          qrCodePaymentEnabled ? 'border-brand-magenta shadow-md' : 'border-slate-200'
        }`}>
          <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                  qrCodePaymentEnabled ? 'bg-brand-magenta' : 'bg-slate-400'
                }`}>
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-black uppercase text-slate-900 tracking-tight">
                      2. QR Code UPI Payment
                    </CardTitle>
                    <Badge className={qrCodePaymentEnabled ? 'bg-emerald-600 text-white font-black text-[9px]' : 'bg-slate-200 text-slate-700 font-black text-[9px]'}>
                      {qrCodePaymentEnabled ? 'STATUS: ENABLED' : 'STATUS: DISABLED'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-bold text-slate-500 mt-0.5">
                    Scan & Pay (GPay, PhonePe, Paytm, BHIM + UTR Verification)
                  </CardDescription>
                </div>
              </div>

              {/* Master Toggle */}
              <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs">
                <Label htmlFor="toggle-qr" className="text-xs font-black uppercase text-slate-700 cursor-pointer">
                  {qrCodePaymentEnabled ? 'ON' : 'OFF'}
                </Label>
                <Switch
                  id="toggle-qr"
                  checked={qrCodePaymentEnabled}
                  onCheckedChange={setQrCodePaymentEnabled}
                  className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Official UPI ID *</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(upiId, 'UPI ID')}
                    className="text-[10px] font-black text-brand-blue hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </Label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. hcrs.kerala@okaxis"
                  className="h-11 rounded-xl font-mono text-xs font-bold border-2 border-slate-200 focus:border-brand-magenta"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Payee / Society Name *
                </Label>
                <Input
                  value={upiAccountName}
                  onChange={(e) => setUpiAccountName(e.target.value)}
                  placeholder="HIGHRICH COMMUNITY REVIVAL SOCIETY"
                  className="h-11 rounded-xl text-xs font-bold border-2 border-slate-200 focus:border-brand-magenta"
                />
              </div>
            </div>

            {/* Bank details grid */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-magenta" />
                Society Central Bank Details (സൊസൈറ്റി ബാങ്ക് അക്കൗണ്ട്)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500">Bank Name</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="h-9 text-xs font-bold bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500">Account No.</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="h-9 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500">IFSC Code</Label>
                  <Input
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="h-9 text-xs font-mono font-bold bg-white uppercase"
                  />
                </div>
              </div>
            </div>

            {/* QR Image URL and auto generator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  QR Code Image & Preview
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateDefaultQr}
                  className="h-8 text-[10px] font-black uppercase tracking-wider text-brand-magenta border-brand-magenta/30 hover:bg-pink-50 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Regenerate from UPI ID
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                  <img
                    src={qrCodeImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(upiId)}%26pn=${encodeURIComponent(upiAccountName)}%26cu=INR`}
                    alt="HCRS UPI QR Code"
                    className="w-28 h-28 object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-black text-slate-900 uppercase truncate">
                    {upiAccountName}
                  </p>
                  <p className="text-xs font-mono font-bold text-brand-blue">
                    {upiId}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    This official QR code is rendered directly in member registration and renewal payment steps.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Payment Instructions for Members (അംഗങ്ങൾക്കുള്ള നിർദ്ദേശം)
              </Label>
              <Textarea
                rows={2}
                value={qrInstructions}
                onChange={(e) => setQrInstructions(e.target.value)}
                placeholder="Scan QR code using GPay, PhonePe, Paytm or BHIM..."
                className="text-xs font-medium border-2 border-slate-200 focus:border-brand-magenta rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TARIFF / FEE STRUCTURE */}
      <Card className="border-2 border-slate-200 rounded-[32px] bg-white shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand-blue" />
              Membership Fee Tariffs (അംഗത്വ ഫീസ് നിരക്കുകൾ)
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Configure standard registration and annual renewal fee amounts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
          <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  New Member Registration Fee
                </Label>
                <p className="text-[11px] text-slate-500 font-bold">പുതിയ അംഗത്വ രജിസ്ട്രേഷൻ ഫീസ്</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-brand-blue">₹{registrationFee}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-500">₹</span>
              <Input
                type="number"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(Number(e.target.value))}
                className="h-11 bg-white font-black text-sm rounded-xl border-2 border-slate-300"
              />
            </div>
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  Annual Renewal Fee
                </Label>
                <p className="text-[11px] text-slate-500 font-bold">വാർഷിക അംഗത്വ പുതുക്കൽ ഫീസ്</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-brand-magenta">₹{renewalFee}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-500">₹</span>
              <Input
                type="number"
                value={renewalFee}
                onChange={(e) => setRenewalFee(Number(e.target.value))}
                className="h-11 bg-white font-black text-sm rounded-xl border-2 border-slate-300"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* LIVE INTERACTIVE SIMULATION PREVIEW FOR ADMIN */}
      <Card className="border-2 border-indigo-200 rounded-[32px] bg-slate-900 text-white shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-indigo-800/40 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                <Eye className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                  Live Member View Simulation
                  <Badge className="bg-teal-500 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5">
                    Interactive Preview
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-300">
                  ഇപ്പോഴത്തെ സെറ്റിങ്സ് പ്രകാരം ഉപയോക്താക്കൾക്ക് സ്ക്രീൻ എങ്ങനെ കാണപ്പെടുന്നുവെന്ന് പരിശോധിക്കുക
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 p-1 rounded-2xl border border-white/15">
              <Button
                size="sm"
                onClick={() => setActivePreview('reg')}
                className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activePreview === 'reg' ? 'bg-brand-blue text-white shadow-md' : 'bg-transparent text-slate-300 hover:text-white'
                }`}
              >
                Registration (₹{registrationFee})
              </Button>
              <Button
                size="sm"
                onClick={() => setActivePreview('renewal')}
                className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activePreview === 'renewal' ? 'bg-brand-magenta text-white shadow-md' : 'bg-transparent text-slate-300 hover:text-white'
                }`}
              >
                Renewal (₹{renewalFee})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <div className="max-w-xl mx-auto bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            {/* Header of Simulated Card */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-brand-magenta" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  {activePreview === 'reg' ? 'New Membership Payment' : 'Membership Renewal Payment'}
                </span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black">
                Fee: ₹{activePreview === 'reg' ? registrationFee : renewalFee}
              </Badge>
            </div>

            {/* If BOTH are ON: Show Tab Selector */}
            {razorpayEnabled && qrCodePaymentEnabled && (
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewMethod('razorpay')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedPreviewMethod === 'razorpay'
                      ? 'bg-brand-blue text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Razorpay Online
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPreviewMethod('qrcode')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedPreviewMethod === 'qrcode'
                      ? 'bg-brand-magenta text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code / UPI
                </button>
              </div>
            )}

            {/* CASE 1: Razorpay view */}
            {((razorpayEnabled && !qrCodePaymentEnabled) || (razorpayEnabled && qrCodePaymentEnabled && selectedPreviewMethod === 'razorpay')) && (
              <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 p-5 rounded-2xl border border-brand-blue/50 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-blue/30 text-white flex items-center justify-center mx-auto border border-brand-blue/50">
                  <CreditCard className="w-6 h-6 text-brand-magenta" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wide">Razorpay Instant Gateway</h4>
                  <p className="text-[11px] text-blue-200 font-bold uppercase mt-0.5">UPI • GPay • PhonePe • Cards • NetBanking</p>
                </div>
                <p className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10 text-left">
                  {activePreview === 'reg' ? 'അംഗത്വ രജിസ്ട്രേഷൻ ഫീസ്' : 'അംഗത്വം പുതുക്കൽ ഫീസ്'}{' '}
                  <span className="text-emerald-400 font-extrabold">₹{activePreview === 'reg' ? registrationFee : renewalFee}</span>{' '}
                  ആയി തൽക്ഷണം Razorpay വഴി അടയ്ക്കാം.
                </p>
                <Button
                  disabled
                  className="w-full h-12 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-xs uppercase tracking-widest shadow-lg"
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  Pay ₹{activePreview === 'reg' ? registrationFee : renewalFee} via Razorpay
                </Button>
              </div>
            )}

            {/* CASE 2: QR Code view */}
            {((!razorpayEnabled && qrCodePaymentEnabled) || (razorpayEnabled && qrCodePaymentEnabled && selectedPreviewMethod === 'qrcode')) && (
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="bg-white p-2 rounded-xl shrink-0">
                    <img
                      src={qrCodeImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(upiId)}%26pn=${encodeURIComponent(upiAccountName)}%26cu=INR`}
                      alt="UPI QR Code"
                      className="w-24 h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Society UPI</p>
                    <p className="text-xs font-mono font-black text-emerald-400 select-all">{upiId}</p>
                    <p className="text-[11px] font-bold text-slate-300">{upiAccountName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Scan with Google Pay, PhonePe, Paytm or BHIM</p>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-xs font-black uppercase text-slate-300">
                    Enter 12-digit UPI UTR / Transaction ID *
                  </Label>
                  <Input
                    disabled
                    placeholder="e.g. 412356789012"
                    className="h-11 rounded-xl bg-slate-950 border-slate-700 font-mono font-bold text-xs text-white"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    {qrInstructions || 'After completing payment in your UPI app, copy and enter the 12-digit Transaction ID.'}
                  </p>
                </div>

                <Button
                  disabled
                  className="w-full h-12 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-xs uppercase tracking-widest shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Submit Registration (അപേക്ഷ സമർപ്പിക്കുക)
                </Button>
              </div>
            )}

            {/* CASE 3: BOTH OFF */}
            {!razorpayEnabled && !qrCodePaymentEnabled && (
              <div className="bg-amber-950/40 border border-amber-500/30 p-6 rounded-2xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-sm font-black text-amber-300 uppercase">Online Payments Currently Paused</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  ഓൺലൈൻ പേയ്‌മെന്റ് സംവിധാനം താൽക്കാലികമായി ലഭ്യമല്ല. ദയവായി ജില്ലാ ഓഫീസുമായി ബന്ധപ്പെടുക.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
