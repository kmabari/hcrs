import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Building2, 
  Users, 
  Wallet, 
  Landmark, 
  Layers, 
  Search, 
  ArrowLeft, 
  X, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  Scale, 
  TrendingDown, 
  Clock, 
  ArrowDownLeft,
  Info,
  ChevronDown
} from 'lucide-react';
import { 
  TreasuryMetrics, 
  CategorySummary, 
  LedgerVoucher, 
  AuditLogEntry, 
  ELedgerUser, 
  MemberFinancialAccount, 
  ELedgerBankCredit,
  MemberTransaction
} from '../types';

export type ReportPrintMode = 'society_total' | 'single_member' | 'all_members' | 'head_summary';

interface A4PrintReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ReportPrintMode;
  initialMemberId?: string;
  metrics: TreasuryMetrics;
  categories: CategorySummary[];
  vouchers: LedgerVoucher[];
  bankCredits: ELedgerBankCredit[];
  users: ELedgerUser[];
  memberAccounts: Record<string, MemberFinancialAccount>;
  auditLogs?: AuditLogEntry[];
}

export const A4PrintReportsModal: React.FC<A4PrintReportsModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'society_total',
  initialMemberId,
  metrics,
  categories,
  vouchers,
  bankCredits,
  users,
  memberAccounts,
  auditLogs = [],
}) => {
  const [printMode, setPrintMode] = useState<ReportPrintMode>(initialMode);
  
  // Date Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'current_fy' | 'last_30_days'>('all');

  // Member selection for Single Member Statement
  const committeeMembers = useMemo(() => {
    const memberMap = new Map<string, ELedgerUser>();
    users.filter(u => u.role === 'member').forEach(u => {
      const key = (u.email || u.membershipId || u.name || u.id).trim().toLowerCase();
      if (!memberMap.has(key)) {
        memberMap.set(key, u);
      } else {
        const existing = memberMap.get(key)!;
        if (existing.id.startsWith('usr-') && !u.id.startsWith('usr-')) {
          memberMap.set(key, u);
        }
      }
    });
    return Array.from(memberMap.values());
  }, [users]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    initialMemberId || (committeeMembers[0]?.id || '')
  );

  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  // Preset Date range handler
  const handleDatePreset = (preset: 'all' | 'this_month' | 'current_fy' | 'last_30_days') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === 'current_fy') {
      // Indian Financial Year: Starts April 1
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStartDate = `${fyStartYear}-04-01`;
      setFromDate(fyStartDate);
      setToDate(todayStr);
    } else if (preset === 'last_30_days') {
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFromDate(past30);
      setToDate(todayStr);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const reportDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const reportTimestamp = useMemo(() => {
    return new Date().toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  // Filter bank credits by date range
  const filteredBankCredits = useMemo(() => {
    return bankCredits.filter(bc => {
      if (fromDate && (bc.fromDate < fromDate && bc.toDate < fromDate)) return false;
      if (toDate && (bc.fromDate > toDate && bc.toDate > toDate)) return false;
      return true;
    });
  }, [bankCredits, fromDate, toDate]);

  // Filter vouchers by date range
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      if (fromDate && v.date < fromDate) return false;
      if (toDate && v.date > toDate) return false;
      return true;
    });
  }, [vouchers, fromDate, toDate]);

  // Direct disbursements (non-member vouchers)
  const directDisbursements = useMemo(() => {
    return filteredVouchers.filter(v => !v.paidToOrReceivedFrom?.includes('Member') && v.type === 'expense');
  }, [filteredVouchers]);

  const totalDirectDisbursements = useMemo(() => {
    return directDisbursements.reduce((acc, v) => acc + (v.amount || 0), 0);
  }, [directDisbursements]);

  // Helper to compile full chronological transactions for a member
  const getMemberDetailedStatement = (member: ELedgerUser) => {
    const accountsList = Object.values(memberAccounts) as MemberFinancialAccount[];
    const emailClean = (member.email || '').trim().toLowerCase();
    const nameClean = (member.name || '').trim().toLowerCase();
    const memIdClean = (member.membershipId || '').trim().toLowerCase();

    const acc = memberAccounts[member.id] || 
      (emailClean ? accountsList.find(a => a.email && a.email.toLowerCase().trim() === emailClean) : undefined) ||
      (memIdClean ? accountsList.find(a => a.membershipId && a.membershipId.toLowerCase().trim() === memIdClean) : undefined) ||
      (nameClean ? accountsList.find(a => a.memberName && a.memberName.toLowerCase().trim() === nameClean) : undefined) ||
      {
        userId: member.id,
        membershipId: member.membershipId || 'HCRS-SC-01',
        memberName: member.name,
        email: member.email,
        mobile: member.mobile,
        district: member.district || 'State HQ',
        allocatedCredit: 0,
        totalContributed: 0,
        expensesClaimed: 0,
        availableBalance: 0,
        billsSubmitted: 0,
        status: 'active',
        recentTransactions: [],
      };

    // Combine raw transactions and any matching vouchers
    const rawTx: MemberTransaction[] = [...(acc.recentTransactions || [])];

    // If transactions are empty but allocated credit > 0, provide opening allocation
    if (rawTx.length === 0 && acc.allocatedCredit > 0) {
      rawTx.push({
        id: `init-${member.id}`,
        date: member.createdAt ? member.createdAt.split('T')[0] : '2026-04-01',
        type: 'credit_allocation',
        category: 'Special Member Allocation Pool',
        description: 'Committee Operational Advance Grant (അഡ്വാൻസ് ഫണ്ട് അനുവദിച്ചു)',
        amount: acc.allocatedCredit,
        balanceAfterTransaction: acc.allocatedCredit,
        referenceNo: `GRANT-${member.membershipId || member.id.slice(-4).toUpperCase()}`,
        status: 'verified',
      });
    }

    // Also look for matching member vouchers
    vouchers.forEach(v => {
      if (v.paidToOrReceivedFrom?.includes(member.name) || v.paidToOrReceivedFrom === member.name) {
        const alreadyInTx = rawTx.some(t => t.referenceNo === v.referenceNo || t.id === v.id);
        if (!alreadyInTx) {
          rawTx.push({
            id: v.id,
            date: v.date,
            type: 'expense_reimbursement',
            category: v.category,
            description: v.description,
            amount: v.amount,
            balanceAfterTransaction: 0, // will compute
            referenceNo: v.referenceNo,
            voucherNo: v.voucherNumber,
            status: 'verified',
          });
        }
      }
    });

    // Sort chronologically ascending
    const sortedTx = rawTx.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Recompute exact running balance after each transaction
    let runningBalance = 0;
    let totalAllocated = 0;
    let totalSpent = 0;

    const computedTx = sortedTx.map(tx => {
      if (tx.type === 'credit_allocation' || tx.type === 'contribution') {
        runningBalance += tx.amount;
        totalAllocated += tx.amount;
      } else {
        runningBalance -= tx.amount;
        totalSpent += tx.amount;
      }
      return {
        ...tx,
        balanceAfterTransaction: runningBalance,
      };
    });

    // If account has an explicit allocatedCredit that differs from computed, align it
    const finalAllocated = totalAllocated > 0 ? totalAllocated : (acc.allocatedCredit || 0);
    const finalSpent = totalSpent > 0 ? totalSpent : (acc.expensesClaimed || 0);
    const finalAvailable = finalAllocated - finalSpent;

    // Apply date filter
    const dateFilteredTx = computedTx.filter(tx => {
      if (fromDate && tx.date < fromDate) return false;
      if (toDate && tx.date > toDate) return false;
      return true;
    });

    // Calculate opening balance before fromDate if date filter is active
    let openingBeforeFromDate = 0;
    if (fromDate) {
      const priorTx = computedTx.filter(tx => tx.date < fromDate);
      if (priorTx.length > 0) {
        openingBeforeFromDate = priorTx[priorTx.length - 1].balanceAfterTransaction;
      }
    } else {
      openingBeforeFromDate = finalAllocated;
    }

    const filteredSpentInPeriod = dateFilteredTx
      .filter(tx => tx.type === 'expense_reimbursement')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const filteredAllocatedInPeriod = dateFilteredTx
      .filter(tx => tx.type === 'credit_allocation' || tx.type === 'contribution')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      member,
      account: acc,
      transactions: dateFilteredTx,
      allTransactionsCount: computedTx.length,
      allocatedCredit: finalAllocated,
      expensesClaimed: finalSpent,
      availableBalance: finalAvailable,
      openingBeforeFromDate,
      filteredSpentInPeriod,
      filteredAllocatedInPeriod,
    };
  };

  // Single member active statement
  const activeSingleMemberData = useMemo(() => {
    const mem = committeeMembers.find(m => m.id === selectedMemberId) || committeeMembers[0];
    if (!mem) return null;
    return getMemberDetailedStatement(mem);
  }, [committeeMembers, selectedMemberId, vouchers, memberAccounts, fromDate, toDate]);

  // All committee members statements
  const allMembersStatements = useMemo(() => {
    return committeeMembers.map(m => getMemberDetailedStatement(m));
  }, [committeeMembers, vouchers, memberAccounts, fromDate, toDate]);

  // Society-level totals for the report
  const societyReportTotals = useMemo(() => {
    const totalAllocatedAll = allMembersStatements.reduce((sum, s) => sum + s.allocatedCredit, 0);
    const totalExpensesAll = allMembersStatements.reduce((sum, s) => sum + s.expensesClaimed, 0);
    const totalMemberHeldBalanceAll = allMembersStatements.reduce((sum, s) => sum + s.availableBalance, 0);
    
    const openingBank = metrics.openingBankBalance || 0;
    const totalBankCreditsSum = bankCredits.reduce((sum, bc) => sum + (bc.amount || 0), 0);
    
    // Formula reconciliation
    const currentBankBalance = openingBank + totalBankCreditsSum - totalAllocatedAll - totalDirectDisbursements;
    const totalSocietyFundBalance = currentBankBalance + totalMemberHeldBalanceAll;

    return {
      openingBankBalance: openingBank,
      totalBankCredits: totalBankCreditsSum,
      totalAllocatedToMembers: totalAllocatedAll,
      totalMemberExpenses: totalExpensesAll,
      totalDirectDisbursements,
      totalCurrentMemberBalances: totalMemberHeldBalanceAll,
      currentBankBalance,
      totalSocietyFundBalance,
    };
  }, [allMembersStatements, metrics, bankCredits, totalDirectDisbursements]);

  // Filter members list for picker dropdown
  const filteredMemberList = useMemo(() => {
    if (!memberSearchQuery) return committeeMembers;
    const q = memberSearchQuery.toLowerCase();
    return committeeMembers.filter(m => 
      m.name.toLowerCase().includes(q) || 
      (m.membershipId && m.membershipId.toLowerCase().includes(q)) ||
      (m.district && m.district.toLowerCase().includes(q))
    );
  }, [committeeMembers, memberSearchQuery]);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      
      {/* ON-SCREEN TOOLBAR & CONTROLS (Hidden when printing via CSS @media print) */}
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 mb-4 shadow-2xl text-white space-y-4 no-print" data-no-print="true">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>HCRS eLedger Statutory A4 Print & Statement Engine</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  A4 Print-Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official high-resolution audit reports, individual member expense statements, and society reconciliation balance sheets.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Document (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Close Report Terminal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs & Date Filtering Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Print Mode Pills */}
          <div className="lg:col-span-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPrintMode('single_member')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                printMode === 'single_member'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>1. PRINT THIS MEMBER</span>
            </button>

            <button
              onClick={() => setPrintMode('all_members')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                printMode === 'all_members'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. PRINT ALL MEMBERS ({committeeMembers.length})</span>
            </button>

            <button
              onClick={() => setPrintMode('society_total')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                printMode === 'society_total'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>3. PRINT SOCIETY TOTAL REPORT</span>
            </button>
          </div>

          {/* Date Filter & Member Chooser */}
          <div className="lg:col-span-6 flex flex-wrap items-center justify-start lg:justify-end gap-2.5">
            {printMode === 'single_member' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Select Member:</span>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white max-w-[200px]"
                >
                  {committeeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.membershipId || 'Member'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400 ml-1" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('all');
                }}
                className="bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-[11px]"
                placeholder="From Date"
              />
              <span className="text-slate-500 font-bold">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('all');
                }}
                className="bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-[11px]"
                placeholder="To Date"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => handleDatePreset('all')}
                  className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                  title="Reset Date Range"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDatePreset('this_month')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  datePreset === 'this_month' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => handleDatePreset('current_fy')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  datePreset === 'current_fy' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                FY 2026-27
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE A4 CONTAINER (Rendered on white background with clean borders for crisp printing) */}
      <div className="w-full max-w-5xl printable-report-container">
        
        {/* ========================================================================= */}
        {/* MODE 1: PRINT THIS MEMBER (Single Committee Member Statement)             */}
        {/* ========================================================================= */}
        {printMode === 'single_member' && activeSingleMemberData && (
          <div className="a4-page-sheet bg-white text-slate-900 p-8 sm:p-12 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 min-h-[1100px] flex flex-col justify-between">
            <div>
              {/* Official HCRS Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-widest uppercase px-2 py-0.5 bg-slate-900 text-white rounded">
                        OFFICIAL STATEMENT
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Reg. No: 142/IV/2026 • Statutory eLedger System
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                      HIGH RICH COMMUNITY REVIVAL SOCIETY (HCRS)
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">
                      State Committee Directorate • Member Operational Financial Statement
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-600 shrink-0">
                    <div className="font-bold text-slate-900">Statement Date: {reportDateFormatted}</div>
                    <div className="text-[10px] text-slate-500">Generated: {reportTimestamp}</div>
                    <div className="text-[10px] font-mono font-semibold text-blue-800">
                      Ref: STMT-{activeSingleMemberData.member.id.slice(-6).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Profile Banner Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Committee Member Name</div>
                  <div className="text-sm font-black text-slate-900">{activeSingleMemberData.member.name}</div>
                  <div className="text-[10px] text-slate-600">{activeSingleMemberData.member.email}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Membership / Seat ID</div>
                  <div className="text-sm font-mono font-black text-blue-900">
                    {activeSingleMemberData.member.membershipId || 'HCRS-SC-01'}
                  </div>
                  <div className="text-[10px] text-slate-600">State Committee Member</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Assigned District</div>
                  <div className="text-sm font-black text-slate-900">
                    {activeSingleMemberData.member.district || 'State HQ'}
                  </div>
                  <div className="text-[10px] text-slate-600">Mobile: {activeSingleMemberData.member.mobile || 'N/A'}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Statement Period</div>
                  <div className="text-xs font-bold text-slate-900">
                    {fromDate || toDate ? `${fromDate || 'Beginning'} to ${toDate || 'Present'}` : 'All Time (Full FY 2026-27)'}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold">Verified Treasury Wallet</div>
                </div>
              </div>

              {/* 4-Key Metrics Highlight for Member */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">1. Total Amount Allocated</div>
                  <div className="text-base font-black text-slate-900">
                    {formatCurrency(activeSingleMemberData.allocatedCredit)}
                  </div>
                  <div className="text-[9px] text-slate-500">അനുവദിച്ച ഫണ്ട്</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">2. Opening Balance</div>
                  <div className="text-base font-black text-slate-700">
                    {formatCurrency(activeSingleMemberData.openingBeforeFromDate)}
                  </div>
                  <div className="text-[9px] text-slate-500">തുടക്കത്തിലെ ബാക്കി</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">3. Total Amount Spent</div>
                  <div className="text-base font-black text-red-600">
                    {formatCurrency(activeSingleMemberData.expensesClaimed)}
                  </div>
                  <div className="text-[9px] text-slate-500">ആകെ ചിലവഴിച്ച തുക</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                  <div className="text-[10px] font-black uppercase text-emerald-900">4. Current Available Balance</div>
                  <div className="text-base font-black text-emerald-700">
                    {formatCurrency(activeSingleMemberData.availableBalance)}
                  </div>
                  <div className="text-[9px] text-emerald-800 font-bold">കൈവശമുള്ള ബാക്കി തുക</div>
                </div>
              </div>

              {/* Detailed Itemized Transaction Ledger Table */}
              <div className="space-y-2 mb-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Itemized Transaction & Expense Record (ഇനവിവരങ്ങൾ)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Showing {activeSingleMemberData.transactions.length} verified entries
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Sl</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Expense Category / Head</th>
                        <th className="py-2.5 px-3">Description / Purpose</th>
                        <th className="py-2.5 px-3">Bill / Ref #</th>
                        <th className="py-2.5 px-3 text-right text-emerald-800">Credit / വരവ് (+)</th>
                        <th className="py-2.5 px-3 text-right text-red-700">Expense / ചിലവ് (-)</th>
                        <th className="py-2.5 px-3 text-right">Balance / ബാക്കി</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSingleMemberData.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                            No transactions recorded for this member during the selected statement period.
                          </td>
                        </tr>
                      ) : (
                        activeSingleMemberData.transactions.map((tx, idx) => {
                          const isCredit = tx.type === 'credit_allocation' || tx.type === 'contribution';
                          return (
                            <tr key={tx.id || idx} className="hover:bg-slate-50/80">
                              <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{tx.date}</td>
                              <td className="py-2 px-3 font-medium text-slate-700">{tx.category || 'Member Operational Expense'}</td>
                              <td className="py-2 px-3 text-slate-800 max-w-xs">{tx.description}</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-blue-700 font-bold whitespace-nowrap">
                                {tx.referenceNo || 'N/A'}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-emerald-600 whitespace-nowrap">
                                {isCredit ? `+${formatCurrency(tx.amount)}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-red-600 whitespace-nowrap">
                                {!isCredit ? `-${formatCurrency(tx.amount)}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                {formatCurrency(tx.balanceAfterTransaction)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900">
                        <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[10px]">
                          Statement Summary Totals:
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">
                          +{formatCurrency(activeSingleMemberData.allocatedCredit)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-red-600">
                          -{formatCurrency(activeSingleMemberData.expensesClaimed)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-800 text-sm">
                          {formatCurrency(activeSingleMemberData.availableBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* A4 Formal Signatures and Verification Footer */}
            <div className="border-t border-slate-200 pt-6 mt-6 avoid-break">
              <div className="grid grid-cols-3 gap-8 text-center text-xs">
                <div className="space-y-6">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                  <div>
                    <div className="font-bold text-slate-900">State Committee Member</div>
                    <div className="text-[10px] text-slate-500">Signature & Date</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                  <div>
                    <div className="font-bold text-slate-900">State Treasurer</div>
                    <div className="text-[10px] text-slate-500">High Rich Community Revival Society</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                  <div>
                    <div className="font-bold text-slate-900">President / General Secretary</div>
                    <div className="text-[10px] text-slate-500">HCRS State Directorate</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                <span>Certified Electronic Statement • HCRS eLedger Statutory Accounting Terminal</span>
                <span>Page 1 of 1 • System Hash: {activeSingleMemberData.member.id.toUpperCase().slice(0, 12)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: PRINT ALL MEMBERS (Batch A4 Print - Separate Page For Each Member) */}
        {/* ========================================================================= */}
        {printMode === 'all_members' && (
          <div className="space-y-8">
            {allMembersStatements.map((memberData, index) => (
              <div 
                key={memberData.member.id} 
                className="a4-page-sheet bg-white text-slate-900 p-8 sm:p-12 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 min-h-[1100px] flex flex-col justify-between page-break-always"
              >
                <div>
                  {/* Official HCRS Header */}
                  <div className="border-b-2 border-slate-900 pb-4 mb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black tracking-widest uppercase px-2 py-0.5 bg-slate-900 text-white rounded">
                            MEMBER STATEMENT #{index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            Reg. No: 142/IV/2026 • HCRS Statutory eLedger
                          </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                          HIGH RICH COMMUNITY REVIVAL SOCIETY (HCRS)
                        </h1>
                        <p className="text-xs font-semibold text-slate-700">
                          State Committee Member Operational Financial Statement
                        </p>
                      </div>

                      <div className="text-right text-xs text-slate-600 shrink-0">
                        <div className="font-bold text-slate-900">Statement Date: {reportDateFormatted}</div>
                        <div className="text-[10px] text-slate-500">Generated: {reportTimestamp}</div>
                        <div className="text-[10px] font-mono font-semibold text-blue-800">
                          Ref: STMT-BATCH-{index + 1}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Member Profile Banner Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">Member Name</div>
                      <div className="text-sm font-black text-slate-900">{memberData.member.name}</div>
                      <div className="text-[10px] text-slate-600">{memberData.member.email}</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">Membership / Seat ID</div>
                      <div className="text-sm font-mono font-black text-blue-900">
                        {memberData.member.membershipId || `HCRS-SC-${index + 1}`}
                      </div>
                      <div className="text-[10px] text-slate-600">Seat {memberData.member.assignedSeatNumber || index + 1} / 17</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">District</div>
                      <div className="text-sm font-black text-slate-900">
                        {memberData.member.district || 'State HQ'}
                      </div>
                      <div className="text-[10px] text-slate-600">Mobile: {memberData.member.mobile || 'N/A'}</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">Statement Period</div>
                      <div className="text-xs font-bold text-slate-900">
                        {fromDate || toDate ? `${fromDate || 'Start'} to ${toDate || 'End'}` : 'Full FY 2026-27'}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold">Active Ledger Account</div>
                    </div>
                  </div>

                  {/* 4-Key Metrics Highlight for Member */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold uppercase text-slate-500">1. Allocated Credit</div>
                      <div className="text-base font-black text-slate-900">
                        {formatCurrency(memberData.allocatedCredit)}
                      </div>
                      <div className="text-[9px] text-slate-500">അനുവദിച്ച ഫണ്ട്</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold uppercase text-slate-500">2. Opening Balance</div>
                      <div className="text-base font-black text-slate-700">
                        {formatCurrency(memberData.openingBeforeFromDate)}
                      </div>
                      <div className="text-[9px] text-slate-500">തുടക്കത്തിലെ ബാക്കി</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold uppercase text-slate-500">3. Total Expended</div>
                      <div className="text-base font-black text-red-600">
                        {formatCurrency(memberData.expensesClaimed)}
                      </div>
                      <div className="text-[9px] text-slate-500">ചിലവഴിച്ച തുക</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                      <div className="text-[10px] font-black uppercase text-emerald-900">4. Available Balance</div>
                      <div className="text-base font-black text-emerald-700">
                        {formatCurrency(memberData.availableBalance)}
                      </div>
                      <div className="text-[9px] text-emerald-800 font-bold">കൈവശമുള്ള ബാക്കി</div>
                    </div>
                  </div>

                  {/* Detailed Itemized Transaction Ledger Table */}
                  <div className="space-y-2 mb-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Itemized Transaction & Expense Record (ഇനവിവരങ്ങൾ)</span>
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {memberData.transactions.length} entries recorded
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-3">Sl</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Expense Category</th>
                            <th className="py-2.5 px-3">Description / Purpose</th>
                            <th className="py-2.5 px-3">Bill / Ref #</th>
                            <th className="py-2.5 px-3 text-right text-emerald-800">Credit / വരവ് (+)</th>
                            <th className="py-2.5 px-3 text-right text-red-700">Expense / ചിലവ് (-)</th>
                            <th className="py-2.5 px-3 text-right">Balance / ബാക്കി</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {memberData.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                                No expense transactions recorded for this member during this period.
                              </td>
                            </tr>
                          ) : (
                            memberData.transactions.map((tx, idx) => {
                              const isCredit = tx.type === 'credit_allocation' || tx.type === 'contribution';
                              return (
                                <tr key={tx.id || idx} className="hover:bg-slate-50/80">
                                  <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{tx.date}</td>
                                  <td className="py-2 px-3 font-medium text-slate-700">{tx.category || 'General Operational Expense'}</td>
                                  <td className="py-2 px-3 text-slate-800 max-w-xs">{tx.description}</td>
                                  <td className="py-2 px-3 font-mono text-[10px] text-blue-700 font-bold whitespace-nowrap">
                                    {tx.referenceNo || 'N/A'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-black text-emerald-600 whitespace-nowrap">
                                    {isCredit ? `+${formatCurrency(tx.amount)}` : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-black text-red-600 whitespace-nowrap">
                                    {!isCredit ? `-${formatCurrency(tx.amount)}` : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                    {formatCurrency(tx.balanceAfterTransaction)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900">
                            <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[10px]">
                              Summary Totals:
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700">
                              +{formatCurrency(memberData.allocatedCredit)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-red-600">
                              -{formatCurrency(memberData.expensesClaimed)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-800 text-sm">
                              {formatCurrency(memberData.availableBalance)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="border-t border-slate-200 pt-6 mt-6 avoid-break">
                  <div className="grid grid-cols-3 gap-8 text-center text-xs">
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-400 mx-4"></div>
                      <div>
                        <div className="font-bold text-slate-900">{memberData.member.name}</div>
                        <div className="text-[10px] text-slate-500">Member Signature</div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-400 mx-4"></div>
                      <div>
                        <div className="font-bold text-slate-900">State Treasurer</div>
                        <div className="text-[10px] text-slate-500">HCRS State Directorate</div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-400 mx-4"></div>
                      <div>
                        <div className="font-bold text-slate-900">General Secretary</div>
                        <div className="text-[10px] text-slate-500">HCRS State Directorate</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                    <span>Certified HCRS eLedger Financial Document • Page {index + 1} of {allMembersStatements.length}</span>
                    <span>Ref: BATCH-{memberData.member.id.slice(-4).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: PRINT SOCIETY TOTAL REPORT (Master Financial Balance Sheet)       */}
        {/* ========================================================================= */}
        {printMode === 'society_total' && (
          <div className="a4-page-sheet bg-white text-slate-900 p-8 sm:p-12 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 min-h-[1100px] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-widest uppercase px-2.5 py-0.5 bg-slate-900 text-white rounded">
                        STATUTORY TREASURY RECONCILIATION REPORT
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Reg. No: 142/IV/2026 • Certified eLedger Model
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                      HIGH RICH COMMUNITY REVIVAL SOCIETY (HCRS)
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">
                      State Treasury Consolidated Reconciliation Statement & Balance Sheet
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-600 shrink-0">
                    <div className="font-bold text-slate-900">Report Date: {reportDateFormatted}</div>
                    <div className="text-[10px] text-slate-500">Generated: {reportTimestamp}</div>
                    <div className="text-[10px] font-mono font-bold text-blue-900">
                      Doc Ref: HCRS-RECON-{Date.now().toString().slice(-6)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Reconciliation 8-Point Formula Balance Sheet */}
              <div className="mb-6 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-600" />
                  <span>Executive Treasury Balance Sheet Summary (പ്രധാന സാമ്പത്തിക സംഗ്രഹം)</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Metric 1 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">1. Opening Bank Balance</div>
                    <div className="text-base font-black text-slate-900">
                      {formatCurrency(societyReportTotals.openingBankBalance)}
                    </div>
                    <div className="text-[9px] text-slate-400">തുടക്കത്തിലെ ബാങ്ക് ബാലൻസ്</div>
                  </div>

                  {/* Metric 2 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">2. Bank Credits (Deposits)</div>
                    <div className="text-base font-black text-emerald-600">
                      +{formatCurrency(societyReportTotals.totalBankCredits)}
                    </div>
                    <div className="text-[9px] text-slate-400">{bankCredits.length} Statement Entries</div>
                  </div>

                  {/* Metric 3 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">3. Total Member Allocations</div>
                    <div className="text-base font-black text-purple-700">
                      {formatCurrency(societyReportTotals.totalAllocatedToMembers)}
                    </div>
                    <div className="text-[9px] text-slate-400">{committeeMembers.length} Members Pool</div>
                  </div>

                  {/* Metric 4 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">4. Total Member Expenses</div>
                    <div className="text-base font-black text-red-600">
                      {formatCurrency(societyReportTotals.totalMemberExpenses)}
                    </div>
                    <div className="text-[9px] text-slate-400">മെമ്പർമാർ ചിലവഴിച്ച തുക</div>
                  </div>

                  {/* Metric 5 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">5. Direct Disbursements</div>
                    <div className="text-base font-black text-slate-800">
                      {formatCurrency(societyReportTotals.totalDirectDisbursements)}
                    </div>
                    <div className="text-[9px] text-slate-400">HQ Direct Disbursements</div>
                  </div>

                  {/* Metric 6 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">6. Total Member Held Balance</div>
                    <div className="text-base font-black text-indigo-700">
                      {formatCurrency(societyReportTotals.totalCurrentMemberBalances)}
                    </div>
                    <div className="text-[9px] text-slate-400">മെമ്പർമാരുടെ കൈവശം (Unspent)</div>
                  </div>

                  {/* Metric 7 */}
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-0.5">
                    <div className="text-[10px] font-black text-blue-900 uppercase">7. Current Bank Balance</div>
                    <div className="text-base font-black text-blue-700">
                      {formatCurrency(societyReportTotals.currentBankBalance)}
                    </div>
                    <div className="text-[9px] text-blue-800 font-bold">ബാങ്കിലുള്ള ലിക്വിഡ് ഫണ്ട്</div>
                  </div>

                  {/* Metric 8 */}
                  <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-400 space-y-0.5">
                    <div className="text-[10px] font-black text-amber-950 uppercase">8. Total Society Unspent Fund</div>
                    <div className="text-base font-black text-slate-950">
                      {formatCurrency(societyReportTotals.totalSocietyFundBalance)}
                    </div>
                    <div className="text-[9px] text-amber-900 font-bold">= Bank + Member Balances</div>
                  </div>
                </div>
              </div>

              {/* Member-Wise Allocation & Spending Summary Roster Table */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>State Committee Member-Wise Allocation & Expense Summary (മെമ്പർ തിരിച്ചുള്ള കണക്ക്)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {allMembersStatements.length} Active Committee Members
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Sl</th>
                        <th className="py-2.5 px-3">Member Name</th>
                        <th className="py-2.5 px-3">Member ID</th>
                        <th className="py-2.5 px-3">District</th>
                        <th className="py-2.5 px-3 text-right">Allocated Pool</th>
                        <th className="py-2.5 px-3 text-right">Expenses Settled</th>
                        <th className="py-2.5 px-3 text-right">Available Balance</th>
                        <th className="py-2.5 px-3 text-center">% Utilized</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allMembersStatements.map((memData, idx) => {
                        const util = memData.allocatedCredit > 0 
                          ? Math.round((memData.expensesClaimed / memData.allocatedCredit) * 100)
                          : 0;
                        return (
                          <tr key={memData.member.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{memData.member.name}</td>
                            <td className="py-2 px-3 font-mono text-blue-700 font-semibold">{memData.member.membershipId || `HCRS-SC-${idx + 1}`}</td>
                            <td className="py-2 px-3 text-slate-600">{memData.member.district || 'State HQ'}</td>
                            <td className="py-2 px-3 text-right font-medium">{formatCurrency(memData.allocatedCredit)}</td>
                            <td className="py-2 px-3 text-right font-medium text-red-600">{formatCurrency(memData.expensesClaimed)}</td>
                            <td className="py-2 px-3 text-right font-black text-emerald-700">{formatCurrency(memData.availableBalance)}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">{util}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[10px]">
                          Combined Member Totals:
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatCurrency(societyReportTotals.totalAllocatedToMembers)}</td>
                        <td className="py-2.5 px-3 text-right text-red-600">{formatCurrency(societyReportTotals.totalMemberExpenses)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">{formatCurrency(societyReportTotals.totalCurrentMemberBalances)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {societyReportTotals.totalAllocatedToMembers > 0 
                            ? `${Math.round((societyReportTotals.totalMemberExpenses / societyReportTotals.totalAllocatedToMembers) * 100)}%`
                            : '0%'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Head-Wise Society Allocation & Expenditure Summary */}
              <div className="space-y-2 mb-8 avoid-break">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Statutory Fund Heads Summary (ഫണ്ട് ഹെഡ് തിരിച്ചുള്ള കണക്കുകൾ)</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Head of Account</th>
                        <th className="py-2.5 px-3 text-right">Budget Allocation</th>
                        <th className="py-2.5 px-3 text-right">Actual Expended</th>
                        <th className="py-2.5 px-3 text-right">Surplus / Balance</th>
                        <th className="py-2.5 px-3 text-center">% Expended</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categories.map((c) => (
                        <tr key={c.category} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-bold text-slate-900">{c.category}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatCurrency(c.allocated)}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-800">{formatCurrency(c.spent)}</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-700">{formatCurrency(c.balance)}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">{c.percentageUsed}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Formal CA & Statutory Audit Signatures */}
            <div className="border-t border-slate-200 pt-6 mt-6 avoid-break">
              <div className="grid grid-cols-3 gap-8 text-center text-xs">
                <div className="space-y-6">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                  <div>
                    <div className="font-bold text-slate-900">State Treasurer</div>
                    <div className="text-[10px] text-slate-500">High Rich Community Revival Society</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                  <div>
                    <div className="font-bold text-slate-900">President / General Secretary</div>
                    <div className="text-[10px] text-slate-500">HCRS State Directorate</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                  <div>
                    <div className="font-bold text-slate-900">Statutory Auditor / CA</div>
                    <div className="text-[10px] text-slate-500">Membership No: FCA 21894</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                <span>Certified High Rich Community Revival Society Statutory Accounting Record</span>
                <span>Page 1 of 1 • Generated via eLedger Live Firestore Engine</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
