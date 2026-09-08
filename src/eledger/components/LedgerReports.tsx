import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  Layers, 
  Scale, 
  CheckCircle2,
  Calendar,
  Users,
  Wallet,
  Landmark,
  Search,
  ArrowUpRight,
  Filter,
  Eye
} from 'lucide-react';
import { 
  TreasuryMetrics, 
  CategorySummary, 
  LedgerVoucher, 
  AuditLogEntry, 
  ELedgerUser, 
  MemberFinancialAccount, 
  ELedgerBankCredit 
} from '../types';
import { A4PrintReportsModal, ReportPrintMode } from './A4PrintReportsModal';

interface LedgerReportsProps {
  metrics: TreasuryMetrics;
  categories: CategorySummary[];
  vouchers: LedgerVoucher[];
  auditLogs: AuditLogEntry[];
  users?: ELedgerUser[];
  memberAccounts?: Record<string, MemberFinancialAccount>;
  bankCredits?: ELedgerBankCredit[];
}

export const LedgerReports: React.FC<LedgerReportsProps> = ({
  metrics,
  categories,
  vouchers,
  auditLogs,
  users = [],
  memberAccounts = {},
  bankCredits = [],
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'balance_sheet' | 'member_roster' | 'bank_credits' | 'audit_trail'>('balance_sheet');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalMode, setPrintModalMode] = useState<ReportPrintMode>('society_total');
  const [selectedMemberIdForPrint, setSelectedMemberIdForPrint] = useState<string>('');
  
  // Search filter for on-screen roster
  const [searchQuery, setSearchQuery] = useState('');

  const committeeMembers = useMemo(() => users.filter(u => u.role === 'member'), [users]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const openPrintModal = (mode: ReportPrintMode, memberId?: string) => {
    setPrintModalMode(mode);
    if (memberId) setSelectedMemberIdForPrint(memberId);
    setIsPrintModalOpen(true);
  };

  // Filtered members for on-screen table
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return committeeMembers;
    const q = searchQuery.toLowerCase();
    return committeeMembers.filter(m => 
      m.name.toLowerCase().includes(q) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(q)) ||
      (m.district && m.district.toLowerCase().includes(q))
    );
  }, [committeeMembers, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header & Quick A4 Print Launchpad */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-2">
              <ShieldCheck className="w-4 h-4" /> Statutory Financial Statements & A4 Engine
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Income & Expenditure Balance Sheet & Reports
            </h1>
            <p className="text-xs text-slate-500">
              Official reconciliation balance sheets, individual member statements, and statutory audit records.
            </p>
          </div>

          {/* 3 Quick A4 Print Action Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openPrintModal('society_total')}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md shadow-amber-400/20 active:scale-95"
            >
              <Landmark className="w-4 h-4" />
              <span>Print Society Total Report</span>
            </button>

            <button
              onClick={() => openPrintModal('all_members')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Users className="w-4 h-4" />
              <span>Print All Members ({committeeMembers.length})</span>
            </button>

            <button
              onClick={() => openPrintModal('single_member')}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md shadow-purple-600/20 active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span>Print Member Statement</span>
            </button>
          </div>
        </div>

        {/* Inner Report Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={() => setActiveReportTab('balance_sheet')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeReportTab === 'balance_sheet'
                ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>1. Society Balance Sheet</span>
          </button>

          <button
            onClick={() => setActiveReportTab('member_roster')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeReportTab === 'member_roster'
                ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Member Statements & Roster ({committeeMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveReportTab('bank_credits')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeReportTab === 'bank_credits'
                ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>3. Bank Deposits Ledger ({bankCredits.length})</span>
          </button>

          <button
            onClick={() => setActiveReportTab('audit_trail')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeReportTab === 'audit_trail'
                ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. CA Audit Certification</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SOCIETY BALANCE SHEET */}
      {activeReportTab === 'balance_sheet' && (
        <div className="space-y-8">
          {/* Balance Sheet Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase">Opening Bank Balance</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(metrics.openingBankBalance || 0)}</div>
              <p className="text-[11px] text-slate-400">Baseline fund at start of financial year.</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Bank Statement Credits</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">+{formatCurrency(metrics.totalBankCredits || metrics.totalInflow || 0)}</div>
              <p className="text-[11px] text-slate-400">{bankCredits.length} Verified bank statement deposits.</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Member Allocations</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{formatCurrency(metrics.totalMemberAllocations || 0)}</div>
              <p className="text-[11px] text-slate-400">Granted to 17 State Committee members.</p>
            </div>

            <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-900/40 space-y-1.5">
              <div className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase">Total Society Unspent Fund</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(metrics.totalSocietyFundBalance || metrics.currentReserveBalance || 0)}</div>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">= Bank Liquid ({formatCurrency(metrics.currentBankBalance || 0)}) + Member Balances</p>
            </div>
          </div>

          {/* Head-wise Account Allocation Table */}
          <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>Head-wise Expenditure & Balance Summary</span>
              </h2>
              <button
                onClick={() => openPrintModal('society_total')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print A4 Summary
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Head of Account</th>
                    <th className="pb-3 px-3 text-right">Budget Allocation</th>
                    <th className="pb-3 px-3 text-right">Actual Disbursed</th>
                    <th className="pb-3 px-3 text-right">Surplus / Balance</th>
                    <th className="pb-3 px-3 text-center">% Expended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {categories.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{c.category}</td>
                      <td className="py-3 px-3 text-right font-medium">{formatCurrency(c.allocated)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(c.spent)}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(c.balance)}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold">{c.percentageUsed}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBER STATEMENTS & ROSTER */}
      {activeReportTab === 'member_roster' && (
        <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>State Committee Member Ledger & Statement Hub</span>
              </h2>
              <p className="text-xs text-slate-500">
                Click "Print Statement" on any member to generate their official itemized A4 financial statement.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member, ID, district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <button
                onClick={() => openPrintModal('all_members')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shrink-0 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Batch Print All</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Member</th>
                  <th className="pb-3 px-3">Seat ID</th>
                  <th className="pb-3 px-3">District</th>
                  <th className="pb-3 px-3 text-right">Allocated Pool</th>
                  <th className="pb-3 px-3 text-right">Expenses Settled</th>
                  <th className="pb-3 px-3 text-right">Available Balance</th>
                  <th className="pb-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredMembers.map((member, idx) => {
                  const acc = memberAccounts[member.id] || {
                    allocatedCredit: 0,
                    expensesClaimed: 0,
                    availableBalance: 0,
                  };
                  return (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{member.name}</div>
                        <div className="text-[10px] text-slate-400">{member.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {member.membershipId || `HCRS-SC-${idx + 1}`}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{member.district || 'State HQ'}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-white">
                        {formatCurrency(acc.allocatedCredit)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(acc.expensesClaimed)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(acc.availableBalance)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => openPrintModal('single_member', member.id)}
                          className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print A4 Statement</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BANK DEPOSITS LEDGER */}
      {activeReportTab === 'bank_credits' && (
        <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600" />
              <span>Bank Statement Verified Deposits ({bankCredits.length} Credits)</span>
            </h2>
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              Total: {formatCurrency(bankCredits.reduce((s, bc) => s + (bc.amount || 0), 0))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Date Range</th>
                  <th className="pb-3 px-3">Bank Account</th>
                  <th className="pb-3 px-3">Reference / UTR</th>
                  <th className="pb-3 px-3">Description / Remittance</th>
                  <th className="pb-3 px-3 text-right">Credit Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {bankCredits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                      No bank credit statements recorded yet.
                    </td>
                  </tr>
                ) : (
                  bankCredits.map((bc) => (
                    <tr key={bc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {bc.fromDate} → {bc.toDate}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">{bc.bankName}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{bc.referenceNo}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{bc.description}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{formatCurrency(bc.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CA AUDIT CERTIFICATION */}
      {activeReportTab === 'audit_trail' && (
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-950 text-white border border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">Statutory Audit Certificate</h3>
              <p className="text-xs text-slate-400">Issued by Office of CA P. V. Mathew & Associates (FRN: 014892S)</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            "We have verified the books of accounts, voucher receipts, bank statements, and district remittances of the High Rich Community Revival Society. In our opinion, the eLedger records present a true and fair view of all receipts and disbursements for the financial period ending August 2026."
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span>Digital Verification Hash: <b className="font-mono text-emerald-400">0x8f2a4e9b7c11a0de248b81fa99c1e7a4b65d3210</b></span>
            <span>Date of Seal: 2026-08-28</span>
          </div>
        </div>
      )}

      {/* A4 Print Modal Component */}
      <A4PrintReportsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        initialMode={printModalMode}
        initialMemberId={selectedMemberIdForPrint}
        metrics={metrics}
        categories={categories}
        vouchers={vouchers}
        bankCredits={bankCredits}
        users={users}
        memberAccounts={memberAccounts}
        auditLogs={auditLogs}
      />
    </div>
  );
};
