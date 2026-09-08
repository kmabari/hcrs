import React, { useState, useEffect } from 'react';
import { ELedgerNavbar } from './components/ELedgerNavbar';
import { ELedgerLogin } from './components/ELedgerLogin';
import { AdminLedgerDashboard } from './components/AdminLedgerDashboard';
import { TreasurerLedgerDashboard } from './components/TreasurerLedgerDashboard';
import { AuditorLedgerDashboard } from './components/AuditorLedgerDashboard';
import { MemberLedgerDashboard } from './components/MemberLedgerDashboard';
import { LedgerReports } from './components/LedgerReports';
import { 
  INITIAL_TREASURY_METRICS, 
  INITIAL_CATEGORY_SUMMARIES, 
  INITIAL_VOUCHERS, 
  INITIAL_ELEDGER_USERS, 
  INITIAL_MEMBER_FINANCIAL_ACCOUNTS, 
  INITIAL_AUDIT_LOGS 
} from './data/ledgerData';
import { ELedgerUser, LedgerVoucher, MemberFinancialAccount, ELedgerBankCredit } from './types';
import {
  bootstrapEledgerDataIfEmpty,
  subscribeToEledgerAuth,
  eledgerSignOut,
  subscribeToUsers,
  subscribeToMetrics,
  subscribeToCategories,
  subscribeToVouchers,
  subscribeToMemberAccounts,
  subscribeToAuditLogs,
  subscribeToBankCredits,
  addEledgerBankCredit,
  deleteEledgerBankCredit,
  updateOpeningBankBalance,
  submitMemberExpenseInDb,
  addEledgerUser,
  updateEledgerUser,
  toggleEledgerUserStatus,
  deleteEledgerUser,
  eledgerSendPasswordReset,
  createEledgerVoucher,
  approveEledgerVoucher,
  rejectEledgerVoucher,
  auditEledgerVoucher,
  allocateMemberCreditInDb,
  setMemberExactAllocationInDb,
  submitMemberBillClaimInDb,
} from './lib/eledgerService';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';

interface ELedgerModuleProps {
  onBackToWebsite: () => void;
}

export const ELedgerModule: React.FC<ELedgerModuleProps> = ({ onBackToWebsite }) => {
  const [currentTab, setCurrentTab] = useState<'login' | 'dashboard' | 'reports'>('login');
  const [currentUser, setCurrentUser] = useState<ELedgerUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [users, setUsers] = useState<ELedgerUser[]>(INITIAL_ELEDGER_USERS);
  const [metrics, setMetrics] = useState(INITIAL_TREASURY_METRICS);
  const [categories, setCategories] = useState(INITIAL_CATEGORY_SUMMARIES);
  const [vouchers, setVouchers] = useState<LedgerVoucher[]>(INITIAL_VOUCHERS);
  const [bankCredits, setBankCredits] = useState<ELedgerBankCredit[]>([]);
  const [memberAccounts, setMemberAccounts] = useState<Record<string, MemberFinancialAccount>>(INITIAL_MEMBER_FINANCIAL_ACCOUNTS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // 1. Real-time Firebase Auth listener on Mount
  useEffect(() => {
    const unsubscribeAuth = subscribeToEledgerAuth((user, loading) => {
      setCurrentUser(user);
      setAuthLoading(loading);
      if (user) {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab('login');
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // 2. Real-time Firestore Subscriptions only active when Authenticated
  useEffect(() => {
    if (!currentUser) {
      setUsers(INITIAL_ELEDGER_USERS);
      setMetrics(INITIAL_TREASURY_METRICS);
      setCategories(INITIAL_CATEGORY_SUMMARIES);
      setVouchers(INITIAL_VOUCHERS);
      setBankCredits([]);
      setMemberAccounts(INITIAL_MEMBER_FINANCIAL_ACCOUNTS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      return;
    }

    // If Admin, ensure initial empty metrics / category structures exist
    if (currentUser.role === 'admin') {
      bootstrapEledgerDataIfEmpty();
    }

    const unsubUsers = subscribeToUsers((u) => {
      if (u.length > 0) setUsers(u);
    });

    const unsubMetrics = subscribeToMetrics((m) => {
      setMetrics(m);
    });

    const unsubCategories = subscribeToCategories((c) => {
      if (c.length > 0) setCategories(c);
    });

    const unsubVouchers = subscribeToVouchers((v) => {
      if (v.length > 0) setVouchers(v);
    });

    const unsubBankCredits = subscribeToBankCredits((bc) => {
      setBankCredits(bc);
    });

    const unsubMembers = subscribeToMemberAccounts((m) => {
      if (Object.keys(m).length > 0) setMemberAccounts(m);
    });

    const unsubAudit = subscribeToAuditLogs((a) => {
      if (a.length > 0) setAuditLogs(a);
    });

    return () => {
      unsubUsers();
      unsubMetrics();
      unsubCategories();
      unsubVouchers();
      unsubBankCredits();
      unsubMembers();
      unsubAudit();
    };
  }, [currentUser?.id, currentUser?.role]);

  // Authentication Handlers
  const handleLoginSuccess = (user: ELedgerUser) => {
    setCurrentUser(user);
    setCurrentTab('dashboard');
  };

  const handleLogout = async () => {
    await eledgerSignOut();
    setCurrentUser(null);
    setCurrentTab('login');
  };

  // User Management Handlers (Admin Only)
  const handleAddUser = async (userData: Omit<ELedgerUser, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    const res = await addEledgerUser(userData, users);
    return res;
  };

  const handleUpdateUser = async (id: string, updates: Partial<ELedgerUser>): Promise<{ success: boolean; message: string }> => {
    const res = await updateEledgerUser(id, updates);
    if (res.success && currentUser && (currentUser.id === id || currentUser.email.toLowerCase() === updates.email?.toLowerCase())) {
      setCurrentUser(prev => prev ? ({ ...prev, ...updates }) : null);
    }
    return res;
  };

  const handleToggleUserStatus = async (id: string): Promise<{ success: boolean; message: string }> => {
    const target = users.find(u => u.id === id);
    if (target) {
      return await toggleEledgerUserStatus(id, target.status);
    }
    return { success: false, message: 'User not found.' };
  };

  const handleSendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    return await eledgerSendPasswordReset(email);
  };

  const handleDeleteUser = async (id: string): Promise<{ success: boolean; message: string }> => {
    return await deleteEledgerUser(id);
  };

  // Treasury Operations Handlers
  const handleCreateVoucher = async (newVoucherData: Omit<LedgerVoucher, 'id' | 'voucherNumber' | 'status' | 'preparedBy'>) => {
    const prepName = currentUser ? `${currentUser.name} (${currentUser.role})` : 'State Treasurer';
    await createEledgerVoucher(newVoucherData, prepName, vouchers.length);
  };

  const handleAddBankCredit = async (creditData: Partial<ELedgerBankCredit>): Promise<{ success: boolean; message: string }> => {
    return await addEledgerBankCredit(creditData);
  };

  const handleDeleteBankCredit = async (id: string): Promise<{ success: boolean; message: string }> => {
    return await deleteEledgerBankCredit(id);
  };

  const handleUpdateOpeningBalance = async (amount: number): Promise<{ success: boolean; message: string }> => {
    return await updateOpeningBankBalance(amount);
  };

  const handleApproveVoucher = async (id: string) => {
    const approver = currentUser ? currentUser.name : 'Central Admin';
    await approveEledgerVoucher(id, approver);
  };

  const handleRejectVoucher = async (id: string) => {
    await rejectEledgerVoucher(id);
  };

  const handleAuditVoucher = async (id: string, notes: string) => {
    const auditorTitle = currentUser ? currentUser.name : 'Statutory Auditor (CA)';
    const targeted = vouchers.find(v => v.id === id);
    const vNo = targeted ? targeted.voucherNumber : `HCRS/VOUCH/2026/${id}`;
    await auditEledgerVoucher(id, notes, auditorTitle, vNo);
  };

  const handleAllocateMemberCredit = async (memberId: string, amount: number) => {
    const targetAcc = memberAccounts[memberId];
    const memberUser = users.find(u => u.id === memberId);
    return await allocateMemberCreditInDb(memberId, amount, targetAcc, memberUser);
  };

  const handleSetMemberExactAllocation = async (memberId: string, exactAmount: number) => {
    const targetAcc = memberAccounts[memberId];
    const memberUser = users.find(u => u.id === memberId);
    return await setMemberExactAllocationInDb(memberId, exactAmount, targetAcc, memberUser);
  };

  const handleSubmitMemberExpense = async (expense: { 
    description: string; 
    amount: number; 
    invoiceRef: string;
    category?: string;
    date?: string;
    receiptUrl?: string;
  }) => {
    if (!currentUser) return;
    const targetAcc = memberAccounts[currentUser.id] || currentMemberAccount;
    await submitMemberExpenseInDb(currentUser.id, {
      date: expense.date || new Date().toISOString().split('T')[0],
      category: expense.category || 'General Operational Expense',
      description: expense.description,
      amount: expense.amount,
      invoiceRef: expense.invoiceRef,
      receiptUrl: expense.receiptUrl,
    }, targetAcc);
  };

  // Get current member's isolated financial account (matched by UID, email, or name)
  const currentMemberAccount: MemberFinancialAccount = (() => {
    if (!currentUser) {
      return (
        memberAccounts['default-member'] || {
          userId: 'default-member',
          membershipId: 'HCRS-SC-01',
          memberName: 'State Committee Member',
          email: 'member@hcrs.org',
          mobile: '9847000000',
          district: 'State HQ',
          allocatedCredit: 0,
          totalContributed: 0,
          expensesClaimed: 0,
          availableBalance: 0,
          billsSubmitted: 0,
          status: 'active',
          recentTransactions: [],
        }
      );
    }

    // 1. Direct match by ID
    if (memberAccounts[currentUser.id]) {
      return memberAccounts[currentUser.id];
    }

    const accountsList = Object.values(memberAccounts) as MemberFinancialAccount[];

    // 2. Match by Email
    if (currentUser.email) {
      const targetByEmail = accountsList.find(
        (acc) => acc.email && acc.email.toLowerCase().trim() === currentUser.email!.toLowerCase().trim()
      );
      if (targetByEmail) return targetByEmail;
    }

    // 3. Match by Name
    if (currentUser.name) {
      const targetByName = accountsList.find(
        (acc) => acc.memberName && acc.memberName.toLowerCase().trim() === currentUser.name!.toLowerCase().trim()
      );
      if (targetByName) return targetByName;
    }

    // 4. Default fallback
    return (
      memberAccounts['default-member'] || {
        userId: currentUser.id,
        membershipId: currentUser.membershipId || 'HCRS-SC-01',
        memberName: currentUser.name || 'State Committee Member',
        email: currentUser.email || '',
        mobile: currentUser.mobile || '',
        district: currentUser.district || 'State HQ',
        allocatedCredit: 0,
        totalContributed: 0,
        expensesClaimed: 0,
        availableBalance: 0,
        billsSubmitted: 0,
        status: 'active',
        recentTransactions: [],
      }
    );
  })();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
          <Lock className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verifying eLedger Committee Authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950 w-full max-w-full overflow-x-hidden">
      <ELedgerNavbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab as any)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onBackToWebsite={onBackToWebsite}
        onOpenLogin={() => setCurrentTab('login')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-w-0">
        {!currentUser ? (
          <ELedgerLogin
            onLoginSuccess={handleLoginSuccess}
            onCancel={onBackToWebsite}
          />
        ) : (
          <>
            {currentTab === 'reports' && (currentUser.role === 'admin' || currentUser.role === 'treasurer' || currentUser.role === 'auditor') && (
              <LedgerReports
                metrics={metrics}
                categories={categories}
                vouchers={vouchers}
                auditLogs={auditLogs}
                users={users}
                memberAccounts={memberAccounts}
                bankCredits={bankCredits}
              />
            )}

            {currentTab === 'dashboard' && currentUser.role === 'admin' && (
              <AdminLedgerDashboard
                metrics={metrics}
                categories={categories}
                vouchers={vouchers}
                users={users}
                onApproveVoucher={handleApproveVoucher}
                onRejectVoucher={handleRejectVoucher}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onToggleUserStatus={handleToggleUserStatus}
                onSendPasswordReset={handleSendPasswordReset}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {currentTab === 'dashboard' && currentUser.role === 'treasurer' && (
              <TreasurerLedgerDashboard
                metrics={metrics}
                bankCredits={bankCredits}
                vouchers={vouchers}
                categories={categories}
                users={users}
                memberAccounts={memberAccounts}
                onCreateVoucher={handleCreateVoucher}
                onAllocateMemberCredit={handleAllocateMemberCredit}
                onSetMemberExactAllocation={handleSetMemberExactAllocation}
                onAddBankCredit={handleAddBankCredit}
                onDeleteBankCredit={handleDeleteBankCredit}
                onUpdateOpeningBalance={handleUpdateOpeningBalance}
              />
            )}

            {currentTab === 'dashboard' && currentUser.role === 'auditor' && (
              <AuditorLedgerDashboard
                metrics={metrics}
                categories={categories}
                vouchers={vouchers}
                auditLogs={auditLogs}
                onAuditVoucher={handleAuditVoucher}
              />
            )}

            {(currentTab === 'dashboard' || currentTab === 'reports') && currentUser.role === 'member' && (
              <MemberLedgerDashboard
                currentUser={currentUser}
                financialAccount={currentMemberAccount}
                onSubmitBillClaim={handleSubmitMemberExpense}
                metrics={metrics}
                vouchers={vouchers}
                categories={categories}
                bankCredits={bankCredits}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
