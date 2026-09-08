import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  KeyRound, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { ELedgerUser } from '../types';
import { eledgerSignIn, eledgerSendPasswordReset } from '../lib/eledgerService';

interface ELedgerLoginProps {
  onLoginSuccess: (user: ELedgerUser) => void;
  onCancel: () => void;
}

export const ELedgerLogin: React.FC<ELedgerLoginProps> = ({
  onLoginSuccess,
  onCancel,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password / Setup Link modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your registered official email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await eledgerSignIn(email, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage('');
    setResetSuccessMessage('');

    if (!resetEmail.trim()) {
      setResetErrorMessage('Please enter your official registered email address.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await eledgerSendPasswordReset(resetEmail);
      if (res.success) {
        setResetSuccessMessage(res.message);
      } else {
        setResetErrorMessage(res.message);
      }
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Failed to dispatch password setup email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-10">
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
            HCRS eledger Committee Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Authorized sign-in for 1 Admin, 1 Treasurer, 1 Auditor, and 20 State Committee Members.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Real Email/Password Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Registered Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="e.g. admin.eledger@hcrs.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(email);
                  setResetSuccessMessage('');
                  setResetErrorMessage('');
                }}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Forgot Password / Reset Link?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your confidential account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <b>Firebase Authentication Enforced:</b> Role-based permissions are strictly segregated. Passwords are never stored in Firestore or client code.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 hover:scale-[1.01] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Committee Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password / Setup Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Reset Password / Account Setup
                </h3>
              </div>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter your registered official email address. A Firebase Authentication password setup/reset link will be issued.
            </p>

            {resetSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {resetErrorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePasswordResetSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. member@hcrs.org"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-black text-slate-950 shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {resetLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{resetLoading ? 'Sending...' : 'Send Reset Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
