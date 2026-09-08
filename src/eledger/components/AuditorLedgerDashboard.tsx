import React, { useState } from 'react';
import { 
  FileCheck2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  Download, 
  Hash, 
  Lock, 
  Building2,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { LedgerVoucher, AuditLogEntry, TreasuryMetrics, CategorySummary } from '../types';

interface AuditorLedgerDashboardProps {
  metrics: TreasuryMetrics;
  categories: CategorySummary[];
  vouchers: LedgerVoucher[];
  auditLogs: AuditLogEntry[];
  onAuditVoucher: (id: string, comment: string) => void;
}

export const AuditorLedgerDashboard: React.FC<AuditorLedgerDashboardProps> = ({
  metrics,
  categories,
  vouchers,
  auditLogs,
  onAuditVoucher,
}) => {
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [auditComment, setAuditComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const unauditedApprovedVouchers = vouchers.filter((v) => v.status === 'approved');
  const certifiedVouchers = vouchers.filter((v) => v.status === 'audited');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCertifyVoucher = (voucherId: string) => {
    if (!auditComment.trim()) {
      alert('Please provide statutory audit notes / verification remarks.');
      return;
    }
    onAuditVoucher(voucherId, auditComment.trim());
    setSelectedVoucherId(null);
    setAuditComment('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/20 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
            <FileCheck2 className="w-3.5 h-3.5" /> Statutory Audit Terminal
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Statutory Auditor Compliance & Verification</h1>
          <p className="text-xs text-slate-300">
            Independent statutory review (Read/Audit only). Verify bank UTRs, vouchers, and compute immutable verification stamps.
          </p>
        </div>

        <div className="p-3 px-4 rounded-2xl bg-white/10 border border-white/10 text-right">
          <div className="text-[10px] text-emerald-300 font-bold uppercase">Audit Coverage</div>
          <div className="text-xl font-black text-white">{certifiedVouchers.length} / {vouchers.length} Vouchers</div>
        </div>
      </div>

      {/* Read-Only Notice */}
      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <b>Auditor Role Constraints:</b> Read-only access to all financial books, treasury heads, and member credits. Statutory certification stamps cannot modify original transaction records.
        </span>
      </div>

      {/* Vouchers Awaiting Audit Certification */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Authorized Vouchers Awaiting Statutory Certification ({unauditedApprovedVouchers.length})</span>
          </h2>
        </div>

        {unauditedApprovedVouchers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-slate-50 dark:bg-slate-950">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            All authorized vouchers have been audited and certified.
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3">
            {unauditedApprovedVouchers.map((v) => (
              <div key={v.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{v.voucherNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">{v.category}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{v.description}</div>
                    <div className="text-[11px] text-slate-500">
                      Paid To: <b>{v.paidToOrReceivedFrom}</b> • Ref: <span className="font-mono">{v.referenceNo}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(v.amount)}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 uppercase">
                      Executive Approved
                    </span>
                  </div>
                </div>

                {selectedVoucherId === v.id ? (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Statutory Audit Notes & Verification Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Bank statement UTR cross-verified. Advocate fees voucher matched with court receipts."
                      value={auditComment}
                      onChange={(e) => setAuditComment(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedVoucherId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCertifyVoucher(v.id)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                      >
                        Stamp Statutory Audit Certification
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedVoucherId(v.id);
                        setAuditComment('Verified against official bank statement and statutory documentary receipts.');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Verify & Certify Voucher</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statutory Audit Log Entries */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-emerald-500" />
            <span>Certified Audit Trail & Cryptographic Verification Log</span>
          </h2>
        </div>

        <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{log.voucherNo}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black uppercase">
                    {log.action}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">{log.comment}</div>
                <div className="text-[10px] text-slate-400">
                  Auditor: <b className="text-slate-700 dark:text-slate-300">{log.auditorName}</b> • {log.timestamp}
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-[10px] text-slate-400 font-bold uppercase">SHA-256 Audit Seal</div>
                <div className="font-mono text-[10px] text-amber-600 dark:text-amber-400">{log.hashSignature}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
