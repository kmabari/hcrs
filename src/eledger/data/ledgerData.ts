import { 
  LedgerVoucher, 
  TreasuryMetrics, 
  CategorySummary, 
  MemberFinancialAccount, 
  AuditLogEntry,
  ELedgerUser 
} from '../types';

export const INITIAL_TREASURY_METRICS: TreasuryMetrics = {
  openingBankBalance: 10000,
  totalBankCredits: 0,
  totalMemberAllocations: 0,
  totalMemberExpenses: 0,
  currentMemberHeldBalance: 0,
  currentBankBalance: 10000,
  totalSocietyFundBalance: 10000,
  totalInflow: 10000,
  totalOutflow: 0,
  currentReserveBalance: 10000,
  pendingAuditsCount: 0,
  verifiedVouchersCount: 0,
  totalMembersContributed: 0,
  lastAuditedDate: 'Pending Audit',
};

export const INITIAL_CATEGORY_SUMMARIES: CategorySummary[] = [
  {
    category: 'Legal Defense & Court Fund',
    allocated: 0,
    spent: 0,
    balance: 0,
    percentageUsed: 0,
  },
  {
    category: 'Welfare & Emergency Relief',
    allocated: 0,
    spent: 0,
    balance: 0,
    percentageUsed: 0,
  },
  {
    category: 'Revival & Administrative Operations',
    allocated: 0,
    spent: 0,
    balance: 0,
    percentageUsed: 0,
  },
  {
    category: 'State & District Chapter Fund',
    allocated: 0,
    spent: 0,
    balance: 0,
    percentageUsed: 0,
  },
  {
    category: 'Special Member Allocation Pool',
    allocated: 0,
    spent: 0,
    balance: 0,
    percentageUsed: 0,
  },
];

export const INITIAL_VOUCHERS: LedgerVoucher[] = [];

export const INITIAL_ELEDGER_USERS: ELedgerUser[] = [
  {
    id: 'admin-hcrskerala',
    name: 'HCRS State Admin',
    email: 'hcrskerala@gmail.com',
    mobile: '9847000001',
    role: 'admin',
    status: 'active',
    district: 'State HQ',
    createdAt: new Date().toISOString().split('T')[0],
  }
];

export const INITIAL_MEMBER_FINANCIAL_ACCOUNTS: Record<string, MemberFinancialAccount> = {};

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];


