import React, { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  Building2, 
  Receipt, 
  Upload, 
  FileText, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft,
  Sparkles,
  Users,
  Wallet,
  Coins,
  Send,
  Layers,
  Search,
  Landmark,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Info,
  Printer
} from 'lucide-react';
import { 
  LedgerVoucher, 
  FundCategory, 
  VoucherType, 
  ELedgerUser, 
  MemberFinancialAccount, 
  CategorySummary,
  ELedgerBankCredit,
  TreasuryMetrics
} from '../types';
import { A4PrintReportsModal, ReportPrintMode } from './A4PrintReportsModal';

interface TreasurerLedgerDashboardProps {
  metrics: TreasuryMetrics;
  bankCredits: ELedgerBankCredit[];
  vouchers: LedgerVoucher[];
  categories: CategorySummary[];
  users: ELedgerUser[];
  memberAccounts: Record<string, MemberFinancialAccount>;
  onCreateVoucher: (voucher: Omit<LedgerVoucher, 'id' | 'voucherNumber' | 'status' | 'preparedBy'>) => void;
  onAllocateMemberCredit?: (memberId: string, amount: number) => Promise<{ success: boolean; message: string }>;
  onSetMemberExactAllocation?: (memberId: string, exactAmount: number) => Promise<{ success: boolean; message: string }>;
  onAddBankCredit?: (creditData: Partial<ELedgerBankCredit>) => Promise<{ success: boolean; message: string }>;
  onDeleteBankCredit?: (id: string) => Promise<{ success: boolean; message: string }>;
  onUpdateOpeningBalance?: (amount: number) => Promise<{ success: boolean; message: string }>;
}

export const TreasurerLedgerDashboard: React.FC<TreasurerLedgerDashboardProps> = ({
  metrics,
  bankCredits,
  vouchers,
  categories,
  users,
  memberAccounts,
  onCreateVoucher,
  onAllocateMemberCredit,
  onSetMemberExactAllocation,
  onAddBankCredit,
  onDeleteBankCredit,
  onUpdateOpeningBalance,
}) => {
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'bank_credits' | 'vouchers' | 'member_credits' | 'fund_heads'>('reconciliation');
  
  // Modals
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showBankCreditModal, setShowBankCreditModal] = useState(false);
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);

  // A4 Print & Statement Engine Modal State
  const [showA4PrintModal, setShowA4PrintModal] = useState(false);
  const [a4PrintMode, setA4PrintMode] = useState<ReportPrintMode>('society_total');
  const [a4PrintMemberId, setA4PrintMemberId] = useState<string>('');

  const openA4Print = (mode: ReportPrintMode, memberId?: string) => {
    setA4PrintMode(mode);
    if (memberId) setA4PrintMemberId(memberId);
    setShowA4PrintModal(true);
  };

  // Direct Voucher Form State
  const [type, setType] = useState<VoucherType>('expense');
  const [category, setCategory] = useState<FundCategory>('Legal Defense & Court Fund');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer (NEFT/RTGS)' | 'UPI / Digital' | 'Cheque' | 'Cash / Impress'>('Bank Transfer (NEFT/RTGS)');
  const [referenceNo, setReferenceNo] = useState('');
  const [district, setDistrict] = useState('State HQ');

  // Bank Credit Form State
  const [creditFromDate, setCreditFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [creditToDate, setCreditToDate] = useState(new Date().toISOString().split('T')[0]);
  const [creditMonthLabel, setCreditMonthLabel] = useState(new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  const [creditAmount, setCreditAmount] = useState('');
  const [creditBankName, setCreditBankName] = useState('State Bank of India (A/c 4082190123)');
  const [creditUtr, setCreditUtr] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [creditSlipNote, setCreditSlipNote] = useState('');
  const [bankCreditError, setBankCreditError] = useState('');
  const [isSubmittingBankCredit, setIsSubmittingBankCredit] = useState(false);

  // Opening Balance Modal State
  const [newOpeningBalance, setNewOpeningBalance] = useState((metrics.openingBankBalance || 0).toString());
  const [isUpdatingOpeningBalance, setIsUpdatingOpeningBalance] = useState(false);

  // Member Credit Allocation State
  const [allocationMode, setAllocationMode] = useState<'set_exact' | 'add'>('set_exact');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberAllocationAmount, setMemberAllocationAmount] = useState('');
  const [allocationSuccess, setAllocationSuccess] = useState('');
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false);

  // Edit Single Member Allocation Modal
  const [editMemberModal, setEditMemberModal] = useState<{
    member: ELedgerUser;
    currentAlloc: number;
    currentExp: number;
    currentBal: number;
    newAllocAmount: string;
  } | null>(null);
  const [isSavingEditAlloc, setIsSavingEditAlloc] = useState(false);

  // Notification Toast
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [bankSearch, setBankSearch] = useState('');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'direct' | 'member_wallet'>('all');

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

  const memberRosterStats = useMemo(() => {
    let totalAllocated = 0;
    let totalExpenses = 0;
    let totalBalance = 0;
    const accountsList = Object.values(memberAccounts) as MemberFinancialAccount[];
    const processedKeys = new Set<string>();

    committeeMembers.forEach((m) => {
      const memKey = (m.email || m.membershipId || m.name || m.id).trim().toLowerCase();
      if (processedKeys.has(memKey)) return;
      processedKeys.add(memKey);

      const emailClean = (m.email || '').trim().toLowerCase();
      const memIdClean = (m.membershipId || '').trim().toLowerCase();
      const nameClean = (m.name || '').trim().toLowerCase();

      const acc = memberAccounts[m.id] || 
        (emailClean ? accountsList.find(a => a.email && a.email.toLowerCase().trim() === emailClean) : undefined) ||
        (memIdClean ? accountsList.find(a => a.membershipId && a.membershipId.toLowerCase().trim() === memIdClean) : undefined) ||
        (nameClean ? accountsList.find(a => a.memberName && a.memberName.toLowerCase().trim() === nameClean) : undefined) ||
        {
          allocatedCredit: 0,
          expensesClaimed: 0,
          availableBalance: 0,
        };
      totalAllocated += (acc.allocatedCredit || 0);
      totalExpenses += (acc.expensesClaimed || 0);
      totalBalance += (acc.availableBalance || 0);
    });

    return {
      totalAllocated,
      totalExpenses,
      totalBalance,
      memberCount: committeeMembers.length,
    };
  }, [committeeMembers, memberAccounts]);

  const availableCategories: FundCategory[] = [
    'Legal Defense & Court Fund',
    'Welfare & Emergency Relief',
    'Revival & Administrative Operations',
    'State & District Chapter Fund',
    'Special Member Allocation Pool',
    'General Reserve Vault',
  ];

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedbackToast({ type, message });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleSubmitVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !payee) return;

    onCreateVoucher({
      date: new Date().toISOString().split('T')[0],
      type,
      category,
      amount: parseFloat(amount),
      description,
      paidToOrReceivedFrom: payee,
      paymentMode,
      referenceNo: referenceNo || `REF-${Date.now().toString().slice(-6)}`,
      attachmentsCount: 1,
      district,
    });

    setShowVoucherModal(false);
    setAmount('');
    setDescription('');
    setPayee('');
    setReferenceNo('');
    showToast('success', 'Direct Treasury Voucher created and submitted to approval queue.');
  };

  const handleBankCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankCreditError('');

    // 1. Amount validation
    const parsed = parseFloat(creditAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setBankCreditError('Please enter a valid credit deposit amount greater than 0.');
      return;
    }

    // 2. From Date & To Date validation
    const cleanFromDate = (creditFromDate || '').trim();
    const cleanToDate = (creditToDate || '').trim();
    if (!cleanFromDate) {
      setBankCreditError('Please select a valid From Date (തുടക്കം).');
      return;
    }
    if (!cleanToDate) {
      setBankCreditError('Please select a valid To Date (അവസാനം).');
      return;
    }

    // 3. Month Label validation
    const cleanMonthLabel = (creditMonthLabel || '').trim();
    if (!cleanMonthLabel) {
      setBankCreditError('Please provide a Statement Month / Label (e.g. August 2026 Batch 1).');
      return;
    }

    // 4. Bank Name validation
    const cleanBankName = (creditBankName || '').trim();
    if (!cleanBankName) {
      setBankCreditError('Please enter the Bank Name & Society Account.');
      return;
    }

    // 5. Bank UTR / Reference validation
    const cleanUtr = (creditUtr || '').trim();
    if (!cleanUtr) {
      setBankCreditError('Please enter Bank UTR / Transaction Reference Number.');
      return;
    }

    // 6. Duplicate UTR check (defensive against undefined/null fields in existing list)
    const isDuplicate = bankCredits.some(bc => {
      const existingUtr = (bc?.bankUtrReference || bc?.referenceNo || '').trim();
      return existingUtr !== '' && existingUtr.toLowerCase() === cleanUtr.toLowerCase();
    });
    if (isDuplicate) {
      setBankCreditError(`A bank credit entry with UTR "${cleanUtr}" already exists. Please verify.`);
      return;
    }

    if (!onAddBankCredit) {
      setBankCreditError('Bank credit service handler is unavailable.');
      return;
    }

    setIsSubmittingBankCredit(true);
    try {
      const cleanDesc = (creditDesc || '').trim() || 'Bank statement credit deposit';
      const cleanSlipNote = (creditSlipNote || '').trim() || undefined;

      const res = await onAddBankCredit({
        fromDate: cleanFromDate,
        toDate: cleanToDate,
        dateRangeFrom: cleanFromDate,
        dateRangeTo: cleanToDate,
        monthLabel: cleanMonthLabel,
        amount: parsed,
        bankName: cleanBankName,
        referenceNo: cleanUtr.toUpperCase(),
        bankUtrReference: cleanUtr.toUpperCase(),
        description: cleanDesc,
        recordedBy: 'State Treasurer',
        verifiedBy: 'State Treasurer',
        slipProofUrl: cleanSlipNote,
        slipUrlOrNote: cleanSlipNote,
      });

      if (res.success) {
        showToast('success', `₹${parsed.toLocaleString('en-IN')} Bank Credit entry recorded. Automatic Treasury balance reconciled.`);
        setShowBankCreditModal(false);
        setCreditAmount('');
        setCreditUtr('');
        setCreditDesc('');
        setCreditSlipNote('');
      } else {
        setBankCreditError(res.message || 'Failed to record bank credit.');
      }
    } catch (err: any) {
      setBankCreditError(err.message || 'Failed to record bank credit.');
    } finally {
      setIsSubmittingBankCredit(false);
    }
  };

  const handleDeleteCredit = async (id: string, utr: string) => {
    const displayUtr = utr || 'Bank Credit Entry';
    if (!confirm(`Are you sure you want to delete Bank Credit entry (UTR: ${displayUtr})? Treasury metrics will automatically recalculate.`)) {
      return;
    }
    if (!onDeleteBankCredit) return;

    const res = await onDeleteBankCredit(id);
    if (res.success) {
      showToast('success', 'Bank Credit entry removed and treasury balance updated.');
    } else {
      showToast('error', res.message || 'Failed to delete entry.');
    }
  };

  const handleUpdateOpeningBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newOpeningBalance);
    if (isNaN(parsed) || parsed < 0) {
      alert('Please enter a valid non-negative opening balance.');
      return;
    }

    if (!onUpdateOpeningBalance) return;
    setIsUpdatingOpeningBalance(true);
    try {
      const res = await onUpdateOpeningBalance(parsed);
      if (res.success) {
        showToast('success', `Opening Bank Balance set to ₹${parsed.toLocaleString('en-IN')}. All balances reconciled.`);
        setShowOpeningBalanceModal(false);
      } else {
        showToast('error', res.message);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update opening balance.');
    } finally {
      setIsUpdatingOpeningBalance(false);
    }
  };

  const handleMemberCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !memberAllocationAmount) return;

    const parsed = parseFloat(memberAllocationAmount);
    if (isNaN(parsed) || parsed < 0) {
      showToast('error', 'Please enter a valid allocation amount (0 or greater).');
      return;
    }

    const memberObj = committeeMembers.find(m => m.id === selectedMemberId);
    setIsSubmittingAllocation(true);

    try {
      if (allocationMode === 'set_exact' && onSetMemberExactAllocation) {
        const res = await onSetMemberExactAllocation(selectedMemberId, parsed);
        if (res && res.success) {
          showToast('success', res.message || `Target allocation set to ₹${parsed.toLocaleString('en-IN')}.`);
          setAllocationSuccess(res.message || `₹${parsed.toLocaleString('en-IN')} target allocation set for ${memberObj?.name || 'Member'}.`);
          setMemberAllocationAmount('');
          setTimeout(() => {
            setAllocationSuccess('');
          }, 5000);
        } else {
          showToast('error', res?.message || 'Failed to update allocation.');
        }
      } else if (onAllocateMemberCredit) {
        const res = await onAllocateMemberCredit(selectedMemberId, parsed);
        if (res && res.success) {
          showToast('success', res.message || `₹${parsed.toLocaleString('en-IN')} allocated successfully.`);
          setAllocationSuccess(res.message || `₹${parsed.toLocaleString('en-IN')} credit assigned to ${memberObj?.name || 'Member'}. Member wallet updated.`);
          setMemberAllocationAmount('');
          setTimeout(() => {
            setAllocationSuccess('');
          }, 5000);
        } else {
          showToast('error', res?.message || 'Failed to allocate credit.');
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error occurred while updating member allocation.');
    } finally {
      setIsSubmittingAllocation(false);
    }
  };

  const handleSaveEditMemberAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberModal) return;
    const parsed = parseFloat(editMemberModal.newAllocAmount);
    if (isNaN(parsed) || parsed < 0) {
      showToast('error', 'Please enter a valid allocation amount (0 or greater).');
      return;
    }

    setIsSavingEditAlloc(true);
    try {
      if (onSetMemberExactAllocation) {
        const res = await onSetMemberExactAllocation(editMemberModal.member.id, parsed);
        if (res.success) {
          showToast('success', res.message);
          setEditMemberModal(null);
        } else {
          showToast('error', res.message);
        }
      } else if (onAllocateMemberCredit) {
        const diff = parsed - editMemberModal.currentAlloc;
        const res = await onAllocateMemberCredit(editMemberModal.member.id, diff);
        if (res.success) {
          showToast('success', `Allocation updated to ₹${parsed.toLocaleString('en-IN')}`);
          setEditMemberModal(null);
        } else {
          showToast('error', res.message);
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update member allocation.');
    } finally {
      setIsSavingEditAlloc(false);
    }
  };

  const filteredBankCredits = useMemo(() => {
    return bankCredits.filter(bc => {
      const q = (bankSearch || '').toLowerCase().trim();
      if (!q) return true;
      const utr = (bc.bankUtrReference || bc.referenceNo || '').toLowerCase();
      const bank = (bc.bankName || '').toLowerCase();
      const desc = (bc.description || '').toLowerCase();
      const month = (bc.monthLabel || '').toLowerCase();
      return utr.includes(q) || bank.includes(q) || desc.includes(q) || month.includes(q);
    });
  }, [bankCredits, bankSearch]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchesSearch = 
        v.voucherNumber.toLowerCase().includes(voucherSearch.toLowerCase()) ||
        v.description.toLowerCase().includes(voucherSearch.toLowerCase()) ||
        v.paidToOrReceivedFrom.toLowerCase().includes(voucherSearch.toLowerCase()) ||
        v.category.toLowerCase().includes(voucherSearch.toLowerCase());
      
      const isMemberExpense = !!v.memberId;
      if (voucherFilter === 'direct') return matchesSearch && !isMemberExpense;
      if (voucherFilter === 'member_wallet') return matchesSearch && isMemberExpense;
      return matchesSearch;
    });
  }, [vouchers, voucherSearch, voucherFilter]);

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-500/20 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl w-full max-w-full min-w-0">
        <div className="space-y-1.5 min-w-0 w-full md:w-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-black uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 shrink-0" /> State Treasury Operations
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white break-words">
            State Treasurer Ledger & Automatic Reconciliation Terminal
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Bank statement credit capture, unified formula-driven treasury reconciliation, and automatic member wallet synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => openA4Print('society_total')}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white text-xs font-black flex items-center justify-center gap-2 border border-amber-500/30 shadow-md active:scale-95 transition cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">A4 Reports</span>
          </button>

          <button
            onClick={() => setShowBankCreditModal(true)}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 shadow-md active:scale-95 transition cursor-pointer shrink-0"
          >
            <Landmark className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">+ Add Bank Credit</span>
          </button>

          <button
            onClick={() => setShowVoucherModal(true)}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 shadow-md active:scale-95 transition cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">+ Direct Voucher</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {feedbackToast && (
        <div className={`p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-xs font-bold transition animate-in fade-in shadow-md w-full min-w-0 ${
          feedbackToast.type === 'success' 
            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
            : 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
        }`}>
          {feedbackToast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span className="break-words">{feedbackToast.message}</span>
        </div>
      )}

      {/* CORE 7 RECONCILIATION SUMMARY METRICS */}
      <div className="space-y-3 w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white break-words">
              Unified Treasury Automatic Reconciliation (ഓട്ടോമാറ്റിക് റീകൺസിലിയേഷൻ)
            </h2>
          </div>
          <button
            onClick={() => {
              setNewOpeningBalance((metrics.openingBankBalance || 0).toString());
              setShowOpeningBalanceModal(true);
            }}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Edit2 className="w-3 h-3" /> Set Opening Bank Balance
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
          {/* Card 1: Opening Bank Balance */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase">1. Opening Bank Balance</span>
              <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.openingBankBalance || 0)}
            </div>
            <p className="text-[10px] text-slate-400">തുടക്കത്തിലെ ബാങ്ക് ബാലൻസ്</p>
          </div>

          {/* Card 2: Total Bank Credits */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase">2. Bank Deposits (Credits)</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(metrics.totalBankCredits || 0)}
            </div>
            <p className="text-[10px] text-slate-400">{bankCredits.length} Bank Statement Receipts</p>
          </div>

          {/* Card 3: Member Allocations */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase">3. Member Allocations</span>
              <Wallet className="w-4 h-4 text-purple-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">
              {formatCurrency(metrics.totalMemberAllocations || 0)}
            </div>
            <p className="text-[10px] text-slate-400">മെമ്പർമാർക്ക് അനുവദിച്ച തുക ({committeeMembers.length} Members)</p>
          </div>

          {/* Card 4: Member Expenses */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase">4. Member Expenses</span>
              <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(metrics.totalMemberExpenses || 0)}
            </div>
            <p className="text-[10px] text-slate-400">മെമ്പർമാർ ചിലവഴിച്ച തുക (Auto-synced)</p>
          </div>

          {/* Card 5: Member Available Balance (Allocations - Expenses) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase">5. Member Unspent Balance</span>
              <Users className="w-4 h-4 text-indigo-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">
              {formatCurrency(metrics.currentMemberHeldBalance || 0)}
            </div>
            <p className="text-[10px] text-slate-400">മെമ്പർമാരുടെ കൈവശമുള്ള തുക (Pool - Spent)</p>
          </div>

          {/* Card 6: Current Bank Balance */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase">6. Current Bank Balance</span>
              <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(metrics.currentBankBalance || 0)}
            </div>
            <p className="text-[10px] text-slate-400">ബാങ്കിലുള്ള ബാക്കി തുക (Bank Liquid)</p>
          </div>

          {/* Card 7: Total Society Fund Balance (Bank + Member Hand Balance) */}
          <div className="col-span-1 sm:col-span-2 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400 dark:border-amber-500/50 shadow-sm space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between text-xs text-amber-900 dark:text-amber-300 gap-2">
              <span className="font-black uppercase break-words">7. Total Society Unspent Fund Balance</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shrink-0">
                Formula Reconciled
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.totalSocietyFundBalance || 0)}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium break-words">
              = Bank Balance ({formatCurrency(metrics.currentBankBalance || 0)}) + Member Balances ({formatCurrency(metrics.currentMemberHeldBalance || 0)})
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'reconciliation'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Reconciliation Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('bank_credits')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'bank_credits'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4 shrink-0" />
            <span>Bank Statement Deposits ({bankCredits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'vouchers'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span>Treasury Vouchers ({vouchers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('member_credits')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'member_credits'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Member Wallets & Allocations ({committeeMembers.length}/17)</span>
          </button>

          <button
            onClick={() => setActiveTab('fund_heads')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'fund_heads'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Society Fund Heads</span>
          </button>
        </div>
      </div>

      {/* TAB: RECONCILIATION SUMMARY */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6 w-full max-w-full min-w-0">
          <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 break-words">
                  <Landmark className="w-5 h-5 text-blue-500 shrink-0" />
                  <span>Statutory Bank & Treasury Ledger Reconciliation Mathematical Model</span>
                </h3>
                <p className="text-xs text-slate-500">
                  HCRS Society automated accounting reconciliation equation running across bank statements and isolated member accounts.
                </p>
              </div>

              <button
                onClick={() => setShowBankCreditModal(true)}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Record Bank Deposit</span>
              </button>
            </div>

            {/* Formula Visual Box */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#09111E] border-2 border-amber-500/40 shadow-xl space-y-4 w-full min-w-0">
              <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                <div className="font-black text-xs sm:text-sm text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Reconciliation Flow Diagram & Live Ledger Equations</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[10px] font-black text-amber-300 uppercase tracking-widest">
                  Live Audit State
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs w-full min-w-0">
                {/* 1. Bank Inflows & Liquid Cash */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0F1E36] to-[#0A1424] border-2 border-blue-400/60 shadow-md space-y-2 w-full min-w-0">
                  <div className="font-black text-sm text-blue-300 flex items-center justify-between border-b border-blue-400/30 pb-2">
                    <span>Bank Inflows & Cash</span>
                    <Landmark className="w-4 h-4 text-blue-400 shrink-0" />
                  </div>
                  <div className="text-xs text-slate-200 flex items-center justify-between pt-1">
                    <span className="text-slate-300">Opening Balance:</span>
                    <b className="text-white font-bold">{formatCurrency(metrics.openingBankBalance || 0)}</b>
                  </div>
                  <div className="text-xs text-emerald-400 font-bold flex items-center justify-between">
                    <span>+ Total Bank Deposits:</span>
                    <span className="font-black text-emerald-300">{formatCurrency(metrics.totalBankCredits || 0)}</span>
                  </div>
                  <div className="text-xs text-rose-300 font-bold flex items-center justify-between">
                    <span>- Member Allocations:</span>
                    <span className="font-black text-rose-300">{formatCurrency(metrics.totalMemberAllocations || 0)}</span>
                  </div>
                  <div className="text-xs font-black text-cyan-300 pt-2.5 border-t border-blue-500/40 flex items-center justify-between">
                    <span>= Current Bank Balance:</span>
                    <span className="text-sm font-black text-white">{formatCurrency(metrics.currentBankBalance || 0)}</span>
                  </div>
                </div>

                {/* 2. Member Operational Wallets (Featured Dark Blue with Golden Border) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0D1B2A] to-[#08121E] border-2 border-amber-400 shadow-xl shadow-amber-500/10 space-y-2 w-full min-w-0 ring-2 ring-amber-400/20">
                  <div className="font-black text-sm text-amber-300 flex items-center justify-between border-b border-amber-400/40 pb-2">
                    <span className="tracking-wide">Member Operational Wallets</span>
                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                  <div className="text-xs text-slate-200 flex items-center justify-between pt-1">
                    <span className="text-slate-300">Total Pool Assigned:</span>
                    <b className="text-white font-black">{formatCurrency(metrics.totalMemberAllocations || 0)}</b>
                  </div>
                  <div className="text-xs text-amber-300 font-bold flex items-center justify-between">
                    <span>- Settled Expenses:</span>
                    <span className="font-black text-amber-200">{formatCurrency(metrics.totalMemberExpenses || 0)}</span>
                  </div>
                  <div className="text-xs text-amber-400 font-black flex items-center justify-between">
                    <span className="text-amber-300">Available in Member Wallets:</span>
                    <span className="text-sm font-black text-white">{formatCurrency(metrics.currentMemberHeldBalance || 0)}</span>
                  </div>
                  <div className="text-xs font-black text-amber-300 pt-2.5 border-t border-amber-400/40 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Status:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[11px] font-black text-emerald-300">
                      100% Auto-Reconciled
                    </span>
                  </div>
                </div>

                {/* 3. Society Total Unspent Assets */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#131F33] to-[#0A1322] border-2 border-emerald-400/60 shadow-md space-y-2 w-full min-w-0">
                  <div className="font-black text-sm text-emerald-300 flex items-center justify-between border-b border-emerald-400/30 pb-2">
                    <span>Society Total Unspent Assets</span>
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-xs text-slate-200 flex items-center justify-between pt-1">
                    <span className="text-slate-300">Bank Reserve:</span>
                    <b className="text-white font-bold">{formatCurrency(metrics.currentBankBalance || 0)}</b>
                  </div>
                  <div className="text-xs text-slate-200 flex items-center justify-between">
                    <span className="text-slate-300">+ Member Held Funds:</span>
                    <b className="text-emerald-300 font-bold">{formatCurrency(metrics.currentMemberHeldBalance || 0)}</b>
                  </div>
                  <div className="text-xs font-black text-emerald-300 pt-4 border-t border-emerald-500/40 flex items-center justify-between">
                    <span>= Total Society Fund:</span>
                    <span className="text-base font-black text-amber-300">{formatCurrency(metrics.totalSocietyFundBalance || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
              <button
                onClick={() => openA4Print('society_total')}
                className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 hover:border-amber-500 text-left transition cursor-pointer space-y-1 group w-full min-w-0"
              >
                <div className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Printer className="w-3.5 h-3.5 text-amber-500 shrink-0" /> A4 Print Engine</span>
                  <ArrowUpRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Generate A4 statements: Society total, all members, or individual member.</p>
              </button>

              <button
                onClick={() => setActiveTab('bank_credits')}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-left transition cursor-pointer space-y-1 w-full min-w-0"
              >
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Manage Bank Credits</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500">Record statement deposits with date range & UTR ref.</p>
              </button>

              <button
                onClick={() => setActiveTab('member_credits')}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-left transition cursor-pointer space-y-1 w-full min-w-0"
              >
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Allocate Member Credits</span>
                  <ArrowUpRight className="w-4 h-4 text-purple-500 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500">Assign operational spending advance to members.</p>
              </button>

              <button
                onClick={() => setActiveTab('vouchers')}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-left transition cursor-pointer space-y-1 w-full min-w-0"
              >
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                  <span>View All Vouchers</span>
                  <ArrowUpRight className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500">Inspect direct disbursements & synced expenses.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: BANK STATEMENT DEPOSITS (BANK CREDITS) */}
      {activeTab === 'bank_credits' && (
        <div className="space-y-6 w-full max-w-full min-w-0">
          <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 break-words">
                  <Landmark className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Bank Statement Credit Entries ({bankCredits.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Record official bank credits received into society accounts to automatically adjust the Opening & Current Bank Balance.
                </p>
              </div>

              <button
                onClick={() => setShowBankCreditModal(true)}
                className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Add Bank Statement Credit</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Bank UTR, Month, Bank Name or Purpose..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Bank Credits Table */}
            <div className="w-full max-w-full min-w-0 overflow-x-auto max-h-[340px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
              <table className="min-w-[620px] w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date Range / Month</th>
                    <th className="py-2.5 px-3">Bank & Account</th>
                    <th className="py-2.5 px-3">UTR / Ref No.</th>
                    <th className="py-2.5 px-3">Description / Source</th>
                    <th className="py-2.5 px-3 text-right">Credit Amount</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredBankCredits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No bank credit entries recorded yet. Click "Add Bank Statement Credit" to record deposits.
                      </td>
                    </tr>
                  ) : (
                    filteredBankCredits.map((bc) => {
                      const fromDate = bc.fromDate || bc.dateRangeFrom || '—';
                      const toDate = bc.toDate || bc.dateRangeTo || '—';
                      const utr = bc.bankUtrReference || bc.referenceNo || 'N/A';
                      const month = bc.monthLabel || 'Statement Deposit';
                      const bank = bc.bankName || 'State Bank of India';
                      const desc = bc.description || 'Bank statement credit deposit';
                      const amount = typeof bc.amount === 'number' ? bc.amount : parseFloat(String(bc.amount || 0));

                      return (
                        <tr key={bc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{month}</div>
                            <div className="text-[10px] text-slate-500">{fromDate} → {toDate}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {bank}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {utr}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {desc}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(isNaN(amount) ? 0 : amount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteCredit(bc.id, utr)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: VOUCHERS */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6 w-full max-w-full min-w-0">
          <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white break-words">
                  Treasury Voucher Journal ({vouchers.length} Total Vouchers)
                </h2>
                <p className="text-xs text-slate-500">
                  Consolidated ledger showing both direct society disbursements and automatically reconciled member wallet expenses.
                </p>
              </div>

              <button
                onClick={() => setShowVoucherModal(true)}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Create Direct Voucher</span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 w-full min-w-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto max-w-full min-w-0">
                <button
                  onClick={() => setVoucherFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                    voucherFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All ({vouchers.length})
                </button>
                <button
                  onClick={() => setVoucherFilter('direct')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                    voucherFilter === 'direct'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Direct Disbursements
                </button>
                <button
                  onClick={() => setVoucherFilter('member_wallet')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                    voucherFilter === 'member_wallet'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Member Wallet Auto-Expenses
                </button>
              </div>

              <div className="relative w-full sm:w-64 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search vouchers..."
                  value={voucherSearch}
                  onChange={(e) => setVoucherSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="w-full max-w-full min-w-0 overflow-x-auto max-h-[340px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
              <table className="min-w-[650px] w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Payee / Member</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No vouchers match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold">
                          <div>{v.voucherNumber}</div>
                          {v.memberId && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                              Member Wallet
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{v.date}</td>
                        <td className="py-3 px-3 font-semibold">{v.category}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{v.description}</td>
                        <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                          {v.paidToOrReceivedFrom}
                          {v.memberName && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400">By: {v.memberName}</div>
                          )}
                        </td>
                        <td className={`py-3 px-3 text-right font-black ${v.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {v.type === 'income' ? '+' : '-'}{formatCurrency(v.amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            v.status === 'audited'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : v.status === 'approved'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {v.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MEMBER OPERATIONAL CREDITS & WALLETS */}
      {activeTab === 'member_credits' && (
        <div className="space-y-6 w-full max-w-full min-w-0">
          <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 w-full max-w-full min-w-0">
            <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 break-words">
              <Coins className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Allocate Committee Member Operational Credits</span>
            </h2>
            <p className="text-xs text-slate-500">
              Assign approved operational spending pools to verified State Committee Members for travel, district reviews, and documentation expenses.
            </p>

            {allocationSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="break-words">{allocationSuccess}</span>
              </div>
            )}

            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit text-xs font-bold">
              <button
                type="button"
                onClick={() => setAllocationMode('set_exact')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  allocationMode === 'set_exact'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                = Set Exact Total Allocation (തുക നിശ്ചയിക്കുക)
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('add')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  allocationMode === 'add'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                + Add Additional Credit (കൂടുതൽ തുക ചേർക്കുക)
              </button>
            </div>

            <form onSubmit={handleMemberCreditSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs w-full min-w-0">
              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Committee Member</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => {
                    const mId = e.target.value;
                    setSelectedMemberId(mId);
                    if (mId && allocationMode === 'set_exact') {
                      const accountsList = Object.values(memberAccounts) as MemberFinancialAccount[];
                      const mObj = committeeMembers.find(m => m.id === mId);
                      const acc = memberAccounts[mId] || 
                        accountsList.find(a => mObj?.email && a.email && a.email.toLowerCase().trim() === mObj.email.toLowerCase().trim()) ||
                        accountsList.find(a => mObj?.name && a.memberName && a.memberName.toLowerCase().trim() === mObj.name.toLowerCase().trim());
                      if (acc && typeof acc.allocatedCredit === 'number') {
                        setMemberAllocationAmount(acc.allocatedCredit.toString());
                      }
                    }
                  }}
                  className="w-full min-w-0 max-w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold truncate"
                >
                  <option value="">-- Choose Member --</option>
                  {committeeMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.membershipId || 'Member'}) - {m.district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {allocationMode === 'set_exact' ? 'Target Total Allocation (₹ INR)' : 'Additional Credit (₹ INR)'}
                </label>
                <input
                  type="number"
                  required
                  placeholder={allocationMode === 'set_exact' ? 'e.g. 30000' : 'e.g. 5000'}
                  value={memberAllocationAmount}
                  onChange={(e) => setMemberAllocationAmount(e.target.value)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                />
              </div>

              <div className="flex items-end min-w-0">
                <button
                  type="submit"
                  disabled={isSubmittingAllocation}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md cursor-pointer transition active:scale-95 text-center justify-center whitespace-nowrap disabled:opacity-50"
                >
                  {isSubmittingAllocation 
                    ? 'Saving...' 
                    : allocationMode === 'set_exact' 
                    ? 'Set Target Allocation' 
                    : 'Add Member Credit'}
                </button>
              </div>
            </form>
          </div>

          {/* Members Table */}
          <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                  State Committee Member Allocation Roster ({committeeMembers.length} Members)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Consolidated operational tracking across all {committeeMembers.length} committee member accounts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openA4Print('all_members')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Print All Members Statements</span>
                </button>
              </div>
            </div>

            {/* Consolidated 17 Committee Member Financial Calculations Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center justify-between">
                  <span>1. Total Allocated Credit</span>
                  <span className="text-purple-600 font-black">All {memberRosterStats.memberCount} Members</span>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {formatCurrency(memberRosterStats.totalAllocated)}
                </div>
                <div className="text-[10px] text-slate-500">ആകെ അനുവദിച്ച തുക</div>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center justify-between">
                  <span>2. Total Expenses Settled</span>
                  <span className="text-red-500 font-bold">Verified Claims</span>
                </div>
                <div className="text-lg font-black text-red-600 dark:text-red-400">
                  {formatCurrency(memberRosterStats.totalExpenses)}
                </div>
                <div className="text-[10px] text-slate-500">ആകെ ചിലവഴിച്ച തുക</div>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center justify-between">
                  <span>3. Total Unspent Balance</span>
                  <span className="text-emerald-600 font-bold">With Members</span>
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(memberRosterStats.totalBalance)}
                </div>
                <div className="text-[10px] text-slate-500">കൈവശമുള്ള ആകെ ബാക്കി</div>
              </div>
            </div>

            <div className="w-full max-w-full min-w-0 overflow-x-auto max-h-[340px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
              <table className="min-w-[580px] w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Member Name</th>
                    <th className="py-2.5 px-3">District</th>
                    <th className="py-2.5 px-3 text-right">Allocated Pool</th>
                    <th className="py-2.5 px-3 text-right">Expenses Settled</th>
                    <th className="py-2.5 px-3 text-right">Available Balance</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {committeeMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No committee members registered yet. Add members via Admin User Management.
                      </td>
                    </tr>
                  ) : (
                    committeeMembers.map((m) => {
                      const accountsList = Object.values(memberAccounts) as MemberFinancialAccount[];
                      const emailClean = (m.email || '').trim().toLowerCase();
                      const memIdClean = (m.membershipId || '').trim().toLowerCase();
                      const nameClean = (m.name || '').trim().toLowerCase();

                      const acc = memberAccounts[m.id] || 
                        (emailClean ? accountsList.find(a => a.email && a.email.toLowerCase().trim() === emailClean) : undefined) ||
                        (memIdClean ? accountsList.find(a => a.membershipId && a.membershipId.toLowerCase().trim() === memIdClean) : undefined) ||
                        (nameClean ? accountsList.find(a => a.memberName && a.memberName.toLowerCase().trim() === nameClean) : undefined) ||
                        {
                          allocatedCredit: 0,
                          expensesClaimed: 0,
                          availableBalance: 0,
                        };
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            <div>{m.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{m.membershipId || 'Member'}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-500">{m.district || 'State HQ'}</td>
                          <td className="py-3 px-3 text-right font-medium">{formatCurrency(acc.allocatedCredit)}</td>
                          <td className="py-3 px-3 text-right font-medium">{formatCurrency(acc.expensesClaimed)}</td>
                          <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatCurrency(acc.availableBalance)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditMemberModal({
                                    member: m,
                                    currentAlloc: acc.allocatedCredit || 0,
                                    currentExp: acc.expensesClaimed || 0,
                                    currentBal: acc.availableBalance || 0,
                                    newAllocAmount: (acc.allocatedCredit || 0).toString(),
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-400 hover:text-slate-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0 whitespace-nowrap border border-amber-300/40"
                                title={`Edit Target Allocation for ${m.name}`}
                              >
                                <Edit2 className="w-3 h-3 shrink-0" />
                                <span>Edit / തിരുത്തുക</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openA4Print('single_member', m.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0 whitespace-nowrap"
                                title={`Print A4 Statement for ${m.name}`}
                              >
                                <Printer className="w-3 h-3 shrink-0" />
                                <span>Print A4</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {committeeMembers.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 font-black text-xs">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 uppercase text-[10px] text-slate-600 dark:text-slate-400 text-right">
                        All {memberRosterStats.memberCount} Members Total:
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(memberRosterStats.totalAllocated)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(memberRosterStats.totalExpenses)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        {formatCurrency(memberRosterStats.totalBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openA4Print('all_members')}
                          className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold"
                        >
                          Print All
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FUND HEADS */}
      {activeTab === 'fund_heads' && (
        <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 w-full max-w-full min-w-0">
          <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 break-words">
            <Layers className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Society Escrow & Head Reconciliations</span>
          </h2>
          <p className="text-xs text-slate-500">
            Treasury reconciliation summary across statutory scheduled accounts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 w-full min-w-0">
            {categories.map((c) => (
              <div key={c.category} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 w-full min-w-0">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 break-words">{c.category}</div>
                <div className="text-xs text-slate-500">
                  Allocated: <b>{formatCurrency(c.allocated)}</b>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-black">
                  Liquid Reserve: {formatCurrency(c.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD BANK STATEMENT CREDIT */}
      {showBankCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overflow-y-auto w-full">
          <div className="max-w-lg w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 my-auto min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-white break-words">
                    Record Bank Statement Credit
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    Add bank deposit to reconcile Opening & Bank Balances
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBankCreditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {bankCreditError && (
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="break-words">{bankCreditError}</span>
              </div>
            )}

            <form onSubmit={handleBankCreditSubmit} className="space-y-3 text-xs w-full min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                <div className="min-w-0">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">From Date (തുടക്കം)</label>
                  <input
                    type="date"
                    required
                    value={creditFromDate}
                    onChange={(e) => setCreditFromDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">To Date (അവസാനം)</label>
                  <input
                    type="date"
                    required
                    value={creditToDate}
                    onChange={(e) => setCreditToDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                <div className="min-w-0">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Statement Month / Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. August 2026 Batch 1"
                    value={creditMonthLabel}
                    onChange={(e) => setCreditMonthLabel(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Amount (₹ INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500000"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-black text-sm"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name & Society Account</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India (A/c 4082190123)"
                  value={creditBankName}
                  onChange={(e) => setCreditBankName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank UTR / Transaction Reference (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBIN928172901"
                  value={creditUtr}
                  onChange={(e) => setCreditUtr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold uppercase"
                />
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deposit Description / Source Fund Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Legal defense contributions collected across 14 district chapters"
                  value={creditDesc}
                  onChange={(e) => setCreditDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Slip Ref / Proof Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank statement pg 4, entry #12"
                  value={creditSlipNote}
                  onChange={(e) => setCreditSlipNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBankCreditModal(false)}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer hover:bg-slate-200 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBankCredit}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md cursor-pointer transition active:scale-95 disabled:opacity-50 text-xs whitespace-nowrap"
                >
                  {isSubmittingBankCredit ? 'Saving Credit...' : 'Confirm Bank Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT VOUCHER */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overflow-y-auto w-full">
          <div className="max-w-lg w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 my-auto min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-white break-words">
                    Create Official Direct Voucher
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    Direct central treasury disbursements and payments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVoucher} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs w-full min-w-0">
              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as VoucherType)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold truncate"
                >
                  <option value="expense">Direct Disbursement (Debit)</option>
                  <option value="income">Corpus / Direct Receipt (Credit)</option>
                  <option value="transfer">Head Transfer</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fund Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FundCategory)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold truncate"
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                />
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Beneficiary Party</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior High Court Counsel"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold truncate"
                >
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI / Digital">UPI / Digital</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash / Impress">Cash / Impress</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Ref / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9821034"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                />
              </div>

              <div className="sm:col-span-2 min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Purpose / Statutory Justification</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain disbursement purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md cursor-pointer text-xs whitespace-nowrap"
                >
                  Submit Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE OPENING BANK BALANCE */}
      {showOpeningBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overflow-y-auto w-full">
          <div className="max-w-md w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 my-auto min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-white break-words">
                    Set Opening Bank Balance
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    തുടക്കത്തിലെ ബാങ്ക് ബാലൻസ് രേഖപ്പെടുത്തുക
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOpeningBalanceModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateOpeningBalanceSubmit} className="space-y-3 text-xs w-full min-w-0">
              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Opening Bank Balance (₹ INR)</label>
                <input
                  type="number"
                  required
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-black text-sm"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-[11px] space-y-1 min-w-0">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Automatic Recalculation</span>
                </div>
                <p className="break-words">
                  Updating the opening bank balance will automatically recalculate the Current Bank Balance and the Total Society Fund Balance across the platform.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpeningBalanceModal(false)}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingOpeningBalance}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md cursor-pointer transition active:scale-95 disabled:opacity-50 text-xs whitespace-nowrap"
                >
                  {isUpdatingOpeningBalance ? 'Updating...' : 'Save Opening Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / CORRECT MEMBER ALLOCATION */}
      {editMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overflow-y-auto w-full">
          <div className="max-w-md w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 my-auto min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-white break-words">
                    Set Member Target Allocation
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    {editMemberModal.member.name} ({editMemberModal.member.membershipId || 'Member'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditMemberModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditMemberAllocation} className="space-y-4 text-xs w-full min-w-0">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Current Allocation</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(editMemberModal.currentAlloc)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Expenses Claimed</div>
                  <div className="text-sm font-black text-red-600 dark:text-red-400">{formatCurrency(editMemberModal.currentExp)}</div>
                </div>
              </div>

              <div className="min-w-0">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Target Allocated Pool (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editMemberModal.newAllocAmount}
                  onChange={(e) => setEditMemberModal({ ...editMemberModal, newAllocAmount: e.target.value })}
                  placeholder="e.g. 30000"
                  className="w-full min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-black text-base text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  ഉദാഹരണത്തിന് ₹30,000 എന്ന് നൽകിയാൽ ഈ മെമ്പറുടെ മൊത്തം അലൊക്കേഷൻ ₹30,000 ആയി മാറും. ചെലവഴിച്ച തുക കഴിച്ച് ബാക്കി തുക വാലറ്റിൽ ലഭ്യമാകും.
                </p>
              </div>

              {/* Projected Available Balance */}
              {(() => {
                const target = parseFloat(editMemberModal.newAllocAmount) || 0;
                const projectedBal = Math.max(0, target - editMemberModal.currentExp);
                return (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>Projected Wallet Available Balance:</span>
                      <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(projectedBal)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Formula: Target Allocation (₹{target.toLocaleString('en-IN')}) - Expenses (₹{editMemberModal.currentExp.toLocaleString('en-IN')}) = Available (₹{projectedBal.toLocaleString('en-IN')})
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditMemberModal(null)}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditAlloc}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md cursor-pointer transition active:scale-95 disabled:opacity-50 text-xs whitespace-nowrap"
                >
                  {isSavingEditAlloc ? 'Updating...' : 'Save Target Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A4 Print & Statement Engine Modal */}
      <A4PrintReportsModal
        isOpen={showA4PrintModal}
        onClose={() => setShowA4PrintModal(false)}
        initialMode={a4PrintMode}
        initialMemberId={a4PrintMemberId}
        metrics={metrics}
        categories={categories}
        vouchers={vouchers}
        bankCredits={bankCredits}
        users={users}
        memberAccounts={memberAccounts}
      />
    </div>
  );
};
