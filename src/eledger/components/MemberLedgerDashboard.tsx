import React, { useState } from 'react';
import { 
  Users, 
  Wallet, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowUpRight, 
  FileText,
  Clock,
  PlusCircle,
  Receipt,
  AlertCircle,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Printer
} from 'lucide-react';
import { MemberFinancialAccount, ELedgerUser, MemberTransaction, TreasuryMetrics, LedgerVoucher, CategorySummary, ELedgerBankCredit } from '../types';
import { A4PrintReportsModal } from './A4PrintReportsModal';

interface MemberLedgerDashboardProps {
  currentUser: ELedgerUser;
  financialAccount: MemberFinancialAccount;
  onSubmitBillClaim?: (claim: { 
    description: string; 
    amount: number; 
    invoiceRef: string;
    category?: string;
    date?: string;
    receiptUrl?: string;
  }) => void;
  metrics?: TreasuryMetrics;
  vouchers?: LedgerVoucher[];
  categories?: CategorySummary[];
  bankCredits?: ELedgerBankCredit[];
}

export const MemberLedgerDashboard: React.FC<MemberLedgerDashboardProps> = ({
  currentUser,
  financialAccount,
  onSubmitBillClaim,
  metrics,
  vouchers = [],
  categories = [],
  bankCredits = [],
}) => {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showA4PrintModal, setShowA4PrintModal] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState('Travel & Conveyance (യാത്രാ ചെലവ്)');
  const [claimDesc, setClaimDesc] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimRef, setClaimRef] = useState('');
  const [formError, setFormError] = useState('');
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  const availableBalance = financialAccount.availableBalance || 0;
  const parsedAmount = parseFloat(claimAmount) || 0;
  const projectedBalance = Math.max(0, availableBalance - parsedAmount);

  const expenseCategories = [
    'Travel & Conveyance (യാത്രാ ചെലവ്)',
    'District Review & Meeting Expenses (ജില്ലാ യോഗങ്ങൾ / അവലോകനം)',
    'Legal & Court Documentation (കോടതി / വക്കീൽ ഫീസ് & രേഖകൾ)',
    'Xerox, Printing & Stationery (പ്രിന്റിംഗ്, സെറോക്സ് & സ്റ്റേഷനറി)',
    'Postal, Courier & Dispatch (തപാൽ / കൊറിയർ ചെലവുകൾ)',
    'Emergency Member Relief & Welfare (അടിയന്തിര ആശ്വാസ ധനസഹായം)',
    'Administrative & Chapter Operations (മേഖലാ ഓഫീസ് ചെലവുകൾ)',
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!claimDesc.trim()) {
      setFormError('Please describe the purpose of this expense.');
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please enter a valid expense amount.');
      return;
    }

    if (parsedAmount > availableBalance) {
      setFormError(`Expense amount (₹${parsedAmount.toLocaleString('en-IN')}) exceeds your current available wallet balance (₹${availableBalance.toLocaleString('en-IN')}). Please request additional credit allocation from the State Treasurer.`);
      return;
    }

    if (onSubmitBillClaim) {
      onSubmitBillClaim({
        date: expenseDate,
        category: expenseCategory,
        description: claimDesc.trim(),
        amount: parsedAmount,
        invoiceRef: claimRef.trim() || `BILL-${Date.now().toString().slice(-4)}`,
      });
    }

    setClaimSubmitted(true);
    setTimeout(() => {
      setClaimSubmitted(false);
      setShowClaimModal(false);
      setClaimDesc('');
      setClaimAmount('');
      setClaimRef('');
      setFormError('');
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Member Profile & Wallet Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-purple-950 via-slate-900 to-slate-900 border border-purple-500/20 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase">
            <Users className="w-3.5 h-3.5" /> State Committee Member Wallet
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.name}</h1>
          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
            <span>Seat ID: <b className="font-mono text-amber-300">{financialAccount.membershipId || currentUser.membershipId || 'HCRS-SC-01'}</b></span>
            <span>•</span>
            <span>District: <b className="text-white">{currentUser.district || financialAccount.district || 'State HQ'}</b></span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Reconciled Treasury Wallet
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md text-right space-y-1.5 min-w-[240px]">
          <div className="text-xs text-purple-200 font-bold uppercase tracking-wider">Current Available Balance</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {formatCurrency(availableBalance)}
          </div>
          <div className="text-[11px] text-slate-300 flex items-center justify-end gap-1.5">
            <span>Allocated Pool:</span>
            <b className="text-amber-300 font-bold">{formatCurrency(financialAccount.allocatedCredit || 0)}</b>
          </div>
        </div>
      </div>

      {/* Automatic Reconciliation Explanation Callout */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold text-amber-800 dark:text-amber-200">
            Automatic Treasury Reconciliation (ഓട്ടോമാറ്റിക് റീകൺസിലിയേഷൻ)
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            നിങ്ങളുടെ വാലറ്റിൽ നിന്നുമുള്ള ഓരോ ചിലവും രേഖപ്പെടുത്തുമ്പോൾ, ആ തുക നിങ്ങളുടെ <b>Current Available Balance</b>-ൽ നിന്ന് ഉടനടി കുറയുകയും, ഒപ്പം <b>State Treasury Expense</b>-ലും തനിയെ (automatically) രേഖപ്പെടുത്തപ്പെടുകയും ചെയ്യുന്നു.
          </p>
        </div>
      </div>

      {/* 3 Metric Cards for This Member */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
            <span>Expenses Incurred (ചിലവഴിച്ചത്)</span>
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatCurrency(financialAccount.expensesClaimed || 0)}
          </div>
          <p className="text-xs text-slate-500">{financialAccount.billsSubmitted || 0} Invoices / Expenses Settled</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
            <span>Allocated Advance (ലഭിച്ച വിഹിതം)</span>
            <Wallet className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(financialAccount.allocatedCredit || 0)}
          </div>
          <p className="text-xs text-slate-500">Provided by State Treasurer for operational activities.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase text-slate-500">Quick Actions</div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setFormError('');
                setShowClaimModal(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-black text-slate-950 flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Record New Expense
            </button>
            <button 
              onClick={() => setShowA4PrintModal(true)}
              className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
              title="Generate Official A4 Statement"
            >
              <Printer className="w-4 h-4" /> A4 Statement
            </button>
          </div>
        </div>
      </div>

      {/* Member's Isolated Transaction Log */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-purple-500" />
              <span>Personal Financial Ledger & Expense Statement ({financialAccount.recentTransactions?.length || 0})</span>
            </h2>
            <p className="text-[11px] text-slate-500">Separated Credit (+) and Expense (-) columns • Auto-Synced with State Treasury</p>
          </div>
          <button 
            onClick={() => setShowA4PrintModal(true)}
            className="self-start sm:self-auto py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" /> Print A4 Statement
          </button>
        </div>

        {/* Structured Financial Ledger Table with Separate Credit & Expense Columns */}
        <div className="w-full max-w-full overflow-x-auto max-h-[380px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
          <table className="min-w-[680px] w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Details & Category</th>
                <th className="py-3 px-3">Bill / Ref #</th>
                <th className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">Credit / വരവ് (+)</th>
                <th className="py-3 px-3 text-right text-red-600 dark:text-red-400">Expense / ചിലവ് (-)</th>
                <th className="py-3 px-3 text-right text-slate-900 dark:text-white">Balance / ബാക്കി</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!financialAccount.recentTransactions || financialAccount.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No transactions recorded yet in this member wallet. Click "Record New Expense" to log operational expenses.
                  </td>
                </tr>
              ) : (
                financialAccount.recentTransactions.map((tx) => {
                  const isCredit = tx.type === 'credit_allocation' || tx.type === 'contribution';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {tx.date}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{tx.description}</span>
                          {tx.voucherNo && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                              {tx.voucherNo}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{tx.category || 'Member Operational Activity'}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {tx.referenceNo || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {isCredit ? `+${formatCurrency(tx.amount)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-red-600 dark:text-red-400 whitespace-nowrap">
                        {!isCredit ? `-${formatCurrency(tx.amount)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap font-mono">
                        {formatCurrency(tx.balanceAfterTransaction)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {financialAccount.recentTransactions && financialAccount.recentTransactions.length > 0 && (
              <tfoot className="sticky bottom-0 bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 font-black text-xs">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 uppercase text-[10px] text-slate-500 text-right">
                    Account Totals:
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(financialAccount.allocatedCredit || 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">
                    -{formatCurrency(financialAccount.expensesClaimed || 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white font-mono text-sm">
                    {formatCurrency(financialAccount.availableBalance || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                    Record Expense (ചിലവ് രേഖപ്പെടുത്തുക)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Automatically deducted from your wallet & synced to Treasury
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {claimSubmitted ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="font-black text-base text-slate-900 dark:text-white">Expense Recorded Successfully!</h4>
                <p className="text-xs text-slate-500">
                  ₹{parsedAmount.toLocaleString('en-IN')} deducted from your wallet and automatically reflected in Treasury Expenses.
                </p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} className="space-y-3.5 text-xs">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Date (തീയതി)</label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Category (ഇനം)</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                    >
                      {expenseCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Statutory Purpose (വിവരണം)</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Ernakulam District Review Travel Petrol & Highway Toll expenses"
                    value={claimDesc}
                    onChange={(e) => setClaimDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Spent (തുക ₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 200"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-black text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bill / Voucher Ref No.</label>
                    <input
                      type="text"
                      placeholder="e.g. TOLL-82918 or BILL-01"
                      value={claimRef}
                      onChange={(e) => setClaimRef(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Real-time Wallet Deduction Preview */}
                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 space-y-1.5">
                  <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                    <span>Current Wallet Balance:</span>
                    <span className="font-black">{formatCurrency(availableBalance)}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Expense to Deduct:</span>
                    <span className="font-black text-red-500">-{formatCurrency(parsedAmount)}</span>
                  </div>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-between pt-1 border-t border-purple-200 dark:border-purple-800">
                    <span>Projected Balance After Deduction:</span>
                    <span>{formatCurrency(projectedBalance)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 font-black text-slate-950 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Confirm & Record Expense
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Official A4 Statement Print Modal */}
      <A4PrintReportsModal
        isOpen={showA4PrintModal}
        onClose={() => setShowA4PrintModal(false)}
        initialMode="single_member"
        initialMemberId={currentUser.id}
        metrics={metrics || {
          totalInflow: 0,
          totalOutflow: 0,
          currentReserveBalance: 0,
          statutoryReserve: 0,
          operationalBuffer: 0,
          advocateFundPool: 0,
          auditedVouchersCount: 0,
          pendingVouchersCount: 0,
          discrepancyCount: 0,
          openingBankBalance: 0,
          totalBankCredits: 0,
          currentBankBalance: 0,
          totalMemberAllocations: financialAccount.allocatedCredit || 0,
          totalMemberExpenses: financialAccount.expensesClaimed || 0,
          currentMemberHeldBalance: financialAccount.availableBalance || 0,
          totalSocietyFundBalance: financialAccount.availableBalance || 0,
        }}
        categories={categories}
        vouchers={vouchers}
        bankCredits={bankCredits}
        users={[currentUser]}
        memberAccounts={{ [currentUser.id]: financialAccount }}
      />
    </div>
  );
};

