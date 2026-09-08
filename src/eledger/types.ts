export type ELedgerRole = 'guest' | 'admin' | 'treasurer' | 'auditor' | 'member';

export type AccountStatus = 'active' | 'inactive' | 'pending_setup';

export interface ELedgerUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'admin' | 'treasurer' | 'auditor' | 'member';
  status: AccountStatus;
  membershipId?: string;
  district?: string;
  createdAt: string;
  lastLoginAt?: string;
  invitedAt?: string;
  assignedSeatNumber?: number; // 1-17 for committee members
}

export interface MemberFinancialAccount {
  userId: string;
  membershipId: string;
  memberName: string;
  email: string;
  mobile: string;
  district: string;
  allocatedCredit: number;
  totalContributed: number;
  expensesClaimed: number;
  availableBalance: number;
  billsSubmitted: number;
  status: 'active' | 'pending' | 'settled';
  recentTransactions: MemberTransaction[];
}

export interface MemberTransaction {
  id: string;
  date: string;
  type: 'credit_allocation' | 'expense_reimbursement' | 'relief_grant' | 'contribution';
  category?: string;
  memberName?: string;
  description: string;
  amount: number;
  balanceAfterTransaction: number;
  referenceNo: string;
  voucherNo?: string;
  status: 'verified' | 'pending' | 'processed';
}

export interface ELedgerBankCredit {
  id: string;
  fromDate: string;
  toDate: string;
  monthLabel: string;
  amount: number;
  bankName: string;
  referenceNo: string;
  description: string;
  recordedBy: string;
  createdAt: string;
  slipProofUrl?: string;
  // Compatibility and UI aliases
  bankUtrReference?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  verifiedBy?: string;
  slipUrlOrNote?: string;
}

export type VoucherType = 'income' | 'expense' | 'transfer';
export type VoucherStatus = 'draft' | 'pending_approval' | 'approved' | 'audited' | 'rejected';
export type FundCategory = 
  | 'Legal Defense & Court Fund'
  | 'Welfare & Emergency Relief'
  | 'Revival & Administrative Operations'
  | 'State & District Chapter Fund'
  | 'Special Member Allocation Pool'
  | 'General Reserve Vault';

export interface LedgerVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  type: VoucherType;
  category: FundCategory;
  amount: number;
  description: string;
  paidToOrReceivedFrom: string;
  paymentMode: 'Bank Transfer (NEFT/RTGS)' | 'UPI / Digital' | 'Cheque' | 'Cash / Impress';
  referenceNo: string;
  status: VoucherStatus;
  preparedBy: string;
  approvedBy?: string;
  auditedBy?: string;
  auditNotes?: string;
  attachmentsCount: number;
  district?: string;
}

export interface TreasuryMetrics {
  openingBankBalance: number;
  totalBankCredits: number;
  totalMemberAllocations: number;
  totalMemberExpenses: number;
  currentMemberHeldBalance: number;
  currentBankBalance: number;
  totalSocietyFundBalance: number;
  totalInflow: number;
  totalOutflow: number;
  currentReserveBalance: number;
  pendingAuditsCount: number;
  verifiedVouchersCount: number;
  totalMembersContributed: number;
  lastAuditedDate: string;
}

export interface MonthlyReconciliationStatement {
  id: string;
  monthLabel: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  bankCredits: number;
  allocations: number;
  memberExpenses: number;
  directDisbursements: number;
  closingBalance: number;
  isReconciled: boolean;
}

export interface CategorySummary {
  category: FundCategory;
  allocated: number;
  spent: number;
  balance: number;
  percentageUsed: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  voucherNo: string;
  auditorName: string;
  action: 'Verified & Approved' | 'Flagged Discrepancy' | 'Requested Clarification' | 'Certified Balance';
  comment: string;
  hashSignature: string;
}


