import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  FileText, 
  TrendingUp, 
  Scale, 
  AlertCircle,
  Plus,
  Users,
  UserPlus,
  Mail,
  Phone,
  KeyRound,
  Trash2,
  Edit2,
  Search,
  Filter,
  Send,
  Power,
  PowerOff,
  UserCheck,
  AlertTriangle,
  Info,
  Lock,
  RotateCcw,
  AlertOctagon,
  Sparkles,
  X
} from 'lucide-react';
import { LedgerVoucher, TreasuryMetrics, CategorySummary, ELedgerUser, ELedgerRole, AccountStatus } from '../types';
import { resetAllEledgerFinancialsToZero } from '../lib/eledgerService';

interface AdminLedgerDashboardProps {
  metrics: TreasuryMetrics;
  categories: CategorySummary[];
  vouchers: LedgerVoucher[];
  users: ELedgerUser[];
  onApproveVoucher: (id: string) => void;
  onRejectVoucher: (id: string) => void;
  onAddUser: (user: Omit<ELedgerUser, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onUpdateUser: (id: string, updates: Partial<ELedgerUser>) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string } | void;
  onToggleUserStatus: (id: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string } | void;
  onSendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onDeleteUser: (id: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string } | void;
  onResetFinancialsToZero?: () => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
}

export const AdminLedgerDashboard: React.FC<AdminLedgerDashboardProps> = ({
  metrics,
  categories,
  vouchers,
  users,
  onApproveVoucher,
  onRejectVoucher,
  onAddUser,
  onUpdateUser,
  onToggleUserStatus,
  onSendPasswordReset,
  onDeleteUser,
  onResetFinancialsToZero,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'vouchers' | 'allocations'>('users');
  
  // User Management State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'treasurer' | 'auditor' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending_setup'>('all');
  
  // Dedicated Testing Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  
  // Dedicated Secure Change Password Modal State
  const [passwordResetTargetUser, setPasswordResetTargetUser] = useState<ELedgerUser | null>(null);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [resetModalFeedback, setResetModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Form State for Add/Edit User
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'treasurer' | 'auditor' | 'member'>('member');
  const [formDistrict, setFormDistrict] = useState('State Committee HQ');
  const [formMembershipId, setFormMembershipId] = useState('');
  const [formError, setFormError] = useState('');
  const [actionNotification, setActionNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const pendingVouchers = vouchers.filter((v) => v.status === 'pending_approval');
  const approvedVouchers = vouchers.filter((v) => v.status === 'approved' || v.status === 'audited');

  // Committee Seat Counts (20 State Committee Members + 3 Office Bearers = 23 Total)
  const adminCount = users.filter(u => u.role === 'admin').length;
  const treasurerCount = users.filter(u => u.role === 'treasurer').length;
  const auditorCount = users.filter(u => u.role === 'auditor').length;
  const memberCount = users.filter(u => u.role === 'member').length;
  const totalCount = users.length;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionNotification({ type, message });
    setTimeout(() => {
      setActionNotification(null);
    }, 5000);
  };

  const handleExecuteResetToZero = async () => {
    setIsResettingData(true);
    try {
      let result;
      if (onResetFinancialsToZero) {
        result = await onResetFinancialsToZero();
      } else {
        result = await resetAllEledgerFinancialsToZero('Central Administrator');
      }

      if (result && typeof result === 'object' && 'success' in result && !result.success) {
        showNotification('error', result.message || 'Failed to reset financial records.');
      } else {
        showNotification('success', 'എല്ലാ സാമ്പത്തിക കണക്കുകളും വിജയകരമായി സീറോ (₹0) ആക്കി റീസെറ്റ് ചെയ്തു! All financial records reset to zero.');
        setShowResetModal(false);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error occurred while resetting financial data.');
    } finally {
      setIsResettingData(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormMobile('');
    setFormRole(memberCount < 20 ? 'member' : 'treasurer');
    setFormDistrict('State Committee HQ');
    setFormMembershipId(`HCRS-SC-${(memberCount + 1).toString().padStart(2, '0')}`);
    setFormError('');
    setShowAddUserModal(true);
  };

  const handleOpenEditModal = (user: ELedgerUser) => {
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormMobile(user.mobile);
    setFormRole(user.role);
    setFormDistrict(user.district || 'State Committee HQ');
    setFormMembershipId(user.membershipId || '');
    setFormError('');
    setShowAddUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) {
      setFormError('Please enter a valid official email address.');
      return;
    }

    const cleanedMobile = formMobile.replace(/\D/g, '');
    if (cleanedMobile.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (editingUserId) {
      // Check duplicate email with other users
      const duplicate = users.find(u => u.id !== editingUserId && u.email.toLowerCase() === formEmail.trim().toLowerCase());
      if (duplicate) {
        setFormError('An account with this email address already exists.');
        return;
      }

      // Check role quota if role was modified
      const originalUser = users.find(u => u.id === editingUserId);
      if (originalUser && originalUser.role !== formRole) {
        if (formRole === 'admin' && users.filter(u => u.id !== editingUserId && u.role === 'admin').length >= 1) {
          setFormError('Only 1 Central Admin account is permitted under HCRS State Committee structure.');
          return;
        }
        if (formRole === 'treasurer' && users.filter(u => u.id !== editingUserId && u.role === 'treasurer').length >= 1) {
          setFormError('Only 1 State Treasurer account is permitted under HCRS State Committee structure.');
          return;
        }
        if (formRole === 'auditor' && users.filter(u => u.id !== editingUserId && u.role === 'auditor').length >= 1) {
          setFormError('Only 1 Statutory Auditor account is permitted under HCRS State Committee structure.');
          return;
        }
        if (formRole === 'member' && users.filter(u => u.id !== editingUserId && u.role === 'member').length >= 20) {
          setFormError('State Committee maximum capacity of 20 Members reached.');
          return;
        }
      }

      const updatePayload: Partial<ELedgerUser> = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        mobile: cleanedMobile,
        role: formRole,
      };

      if (formDistrict.trim()) {
        updatePayload.district = formDistrict.trim();
      }

      // Optional membershipId only for member role
      if (formRole === 'member' && formMembershipId.trim()) {
        updatePayload.membershipId = formMembershipId.trim();
      }

      setIsSavingUser(true);
      try {
        const result = await onUpdateUser(editingUserId, updatePayload);
        if (result && typeof result === 'object' && 'success' in result && !result.success) {
          setFormError(result.message || 'Failed to update account.');
          setIsSavingUser(false);
          return;
        }

        showNotification('success', `User "${formName.trim()}" updated successfully.`);
        setShowAddUserModal(false);
      } catch (err: any) {
        setFormError(err.message || 'Failed to save changes. Please try again.');
      } finally {
        setIsSavingUser(false);
      }
    } else {
      // Role quota checks for new account
      if (formRole === 'admin' && adminCount >= 1) {
        setFormError('Only 1 Central Admin account is permitted under HCRS State Committee structure.');
        return;
      }
      if (formRole === 'treasurer' && treasurerCount >= 1) {
        setFormError('Only 1 State Treasurer account is permitted under HCRS State Committee structure.');
        return;
      }
      if (formRole === 'auditor' && auditorCount >= 1) {
        setFormError('Only 1 Statutory Auditor account is permitted under HCRS State Committee structure.');
        return;
      }
      if (formRole === 'member' && memberCount >= 20) {
        setFormError('State Committee maximum capacity of 20 Members reached.');
        return;
      }

      const addPayload: Omit<ELedgerUser, 'id' | 'createdAt'> = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        mobile: cleanedMobile,
        role: formRole,
        status: 'pending_setup',
      };

      if (formDistrict.trim()) {
        addPayload.district = formDistrict.trim();
      }

      if (formRole === 'member') {
        if (formMembershipId.trim()) {
          addPayload.membershipId = formMembershipId.trim();
        }
        addPayload.assignedSeatNumber = memberCount + 1;
      }

      setIsSavingUser(true);
      try {
        const result = await onAddUser(addPayload);
        if (result.success) {
          showNotification('success', result.message);
          setShowAddUserModal(false);
        } else {
          setFormError(result.message);
        }
      } catch (err: any) {
        setFormError(err.message || 'Failed to create user.');
      } finally {
        setIsSavingUser(false);
      }
    }
  };

  const handleOpenPasswordResetModal = (user: ELedgerUser) => {
    setPasswordResetTargetUser(user);
    setResetModalFeedback(null);
    setIsSendingResetLink(false);
  };

  const handleClosePasswordResetModal = () => {
    setPasswordResetTargetUser(null);
    setResetModalFeedback(null);
    setIsSendingResetLink(false);
  };

  const handleSendResetLinkInModal = async () => {
    if (!passwordResetTargetUser) return;
    setIsSendingResetLink(true);
    setResetModalFeedback(null);
    try {
      const res = await onSendPasswordReset(passwordResetTargetUser.email);
      if (res.success) {
        setResetModalFeedback({
          type: 'success',
          message: `Official Firebase password-reset link successfully dispatched to ${passwordResetTargetUser.email}. The user can open the link in their inbox to choose a new password.`
        });
        showNotification('success', `Password reset link sent to ${passwordResetTargetUser.email}`);
      } else {
        setResetModalFeedback({
          type: 'error',
          message: res.message || 'Failed to dispatch reset link. Please verify internet connection and registered email.'
        });
        showNotification('error', res.message);
      }
    } catch (err: any) {
      setResetModalFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred while sending reset email.'
      });
    } finally {
      setIsSendingResetLink(false);
    }
  };

  const handleTriggerPasswordReset = async (email: string, name: string) => {
    const res = await onSendPasswordReset(email);
    if (res.success) {
      showNotification('success', `Password setup/reset instructions dispatched to ${email} for ${name}.`);
    } else {
      showNotification('error', res.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.mobile.includes(searchQuery) ||
      (u.membershipId && u.membershipId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/50 border border-amber-500/20 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Central Executive Console
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">HCRS State Committee Administration</h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Administer committee user accounts (1 Admin, 1 Treasurer, 1 Auditor, 20 Members), enforce role security, and authorize disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Committee Capacity</div>
            <div className="text-lg sm:text-xl font-black text-amber-400">{totalCount} / 23 Total <span className="text-xs text-slate-300 font-normal">({memberCount}/20 Members)</span></div>
          </div>
        </div>
      </div>

      {/* Testing Sandbox Control Bar (Temporary Tool for Testing - Can be removed when real accounts go live) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold text-sm">
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>ടെസ്റ്റിംഗ് മോഡ്: കണക്കുകൾ റീസെറ്റ് ചെയ്യുക (Testing Reset Mode)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            ടെസ്റ്റിംഗ് വേളയിൽ എല്ലാ വൗച്ചറുകളും, ബാങ്ക് ക്രെഡിറ്റുകളും, 20 മെമ്പർമാരുടെയും അലോക്കേഷൻ/ചിലവ് ബാലൻസുകളും സീറോ (₹0) ആക്കി പുനഃക്രമീകരിക്കാം. ലോഗിൻ വിവരങ്ങൾ അതേപടി നിലനിൽക്കും.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shrink-0 cursor-pointer transition border border-red-500/30"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All Data to ₹0</span>
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionNotification && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold transition animate-in fade-in shadow-md ${
          actionNotification.type === 'success' 
            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
            : 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
        }`}>
          {actionNotification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
          <span>{actionNotification.message}</span>
        </div>
      )}

      {/* Admin Module Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeAdminTab === 'users'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User & Committee ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('vouchers')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeAdminTab === 'vouchers'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Vouchers ({pendingVouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('allocations')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeAdminTab === 'allocations'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Budget Ceilings</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT (ADMIN ONLY) */}
      {activeAdminTab === 'users' && (
        <div className="space-y-6">
          {/* Real User Structure Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
                <span className="font-bold uppercase truncate">Central Admin</span>
                <span className="font-mono font-bold text-amber-500 shrink-0">{adminCount}/1</span>
              </div>
              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {adminCount === 1 ? 'Configured' : 'Vacant'}
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">Full eLedger & Controls</p>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
                <span className="font-bold uppercase truncate">Treasurer</span>
                <span className="font-mono font-bold text-blue-500 shrink-0">{treasurerCount}/1</span>
              </div>
              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {treasurerCount === 1 ? 'Configured' : 'Vacant'}
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">Disbursements & Fund</p>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
                <span className="font-bold uppercase truncate">Auditor</span>
                <span className="font-mono font-bold text-emerald-500 shrink-0">{auditorCount}/1</span>
              </div>
              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {auditorCount === 1 ? 'Configured' : 'Vacant'}
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">CA Audit & Compliance</p>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
                <span className="font-bold uppercase truncate">Members</span>
                <span className="font-mono font-bold text-purple-500 shrink-0">{memberCount}/20</span>
              </div>
              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {memberCount} / 20 Seats
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">Isolated Self-Ledger</p>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="p-3.5 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by full name, email, mobile, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Mobile Controls (Vertical Stack with 2-Col Filters + Full-Width Button) */}
            <div className="flex flex-col gap-2.5 sm:hidden">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="auditor">Auditor</option>
                  <option value="member">Member</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending_setup">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <button
                onClick={handleOpenAddModal}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New User Account</span>
              </button>
            </div>

            {/* Desktop Controls (Inline row) */}
            <div className="hidden sm:flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="auditor">Auditor</option>
                  <option value="member">Committee Member</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending_setup">Pending Setup</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New User</span>
              </button>
            </div>

            {/* Architecture Info Notice */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-300">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <b>Security Architecture:</b> All real users are managed with unique email identifiers and authenticated via Firebase Authentication Email/Password. No passwords or sensitive credentials are ever stored in Firestore or client code.
              </div>
            </div>

            {/* MOBILE USER CARDS (Visible on mobile screens) */}
            <div className="block md:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  No users matching the search criteria.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
                  >
                    {/* User Header & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white text-sm truncate">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{user.district || 'State HQ'}</span>
                          {user.membershipId && (
                            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                              • {user.membershipId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            : user.role === 'treasurer'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                            : user.role === 'auditor'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                        }`}>
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>{user.role}</span>
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          user.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : user.status === 'pending_setup'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'active' ? 'bg-emerald-500' : user.status === 'pending_setup' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span>{user.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono text-[11px] truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-mono text-[11px]">{user.mobile}</span>
                      </div>
                    </div>

                    {/* Mobile Card Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <button
                        onClick={() => handleOpenPasswordResetModal(user)}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs active:scale-98"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Change Password</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Toggle Active / Inactive */}
                        <button
                          onClick={async () => {
                            const res = await onToggleUserStatus(user.id);
                            if (res && typeof res === 'object' && 'success' in res) {
                              if (res.success) {
                                showNotification('success', res.message);
                              } else {
                                showNotification('error', res.message);
                              }
                            }
                          }}
                          className={`p-2 rounded-xl transition cursor-pointer border ${
                            user.status === 'active'
                              ? 'bg-slate-100 dark:bg-slate-800 hover:bg-red-100 text-slate-600 dark:text-slate-300 hover:text-red-700 border-slate-200 dark:border-slate-700'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          }`}
                          title={user.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {user.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>

                        {/* Edit User */}
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Edit User Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete User */}
                        {user.role !== 'admin' && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to remove account for ${user.name}?`)) {
                                const res = await onDeleteUser(user.id);
                                if (res && typeof res === 'object' && 'success' in res) {
                                  if (res.success) {
                                    showNotification('success', `User account for ${user.name} removed.`);
                                  } else {
                                    showNotification('error', res.message);
                                  }
                                } else {
                                  showNotification('success', `User account for ${user.name} removed.`);
                                }
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-100 text-slate-400 hover:text-red-600 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP USER TABLE (Visible on md+ screens) */}
            <div className="hidden md:block overflow-x-auto max-h-[360px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">User & Contact</th>
                    <th className="py-2.5 px-3">Assigned Role</th>
                    <th className="py-2.5 px-3">District / ID</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Account Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No users matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {user.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{user.email}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{user.mobile}</span>
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            user.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : user.role === 'treasurer'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              : user.role === 'auditor'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{user.role}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          <div className="font-medium">{user.district || 'State HQ'}</div>
                          {user.membershipId && (
                            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                              {user.membershipId}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : user.status === 'pending_setup'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-emerald-500' : user.status === 'pending_setup' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                            <span>{user.status.replace('_', ' ')}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Change Password Modal Trigger */}
                            <button
                              onClick={() => handleOpenPasswordResetModal(user)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-2xs"
                              title={`Change Password / Send Reset Link for ${user.name}`}
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="hidden sm:inline">Change Password</span>
                            </button>

                            {/* Toggle Active / Inactive */}
                            <button
                              onClick={async () => {
                                const res = await onToggleUserStatus(user.id);
                                if (res && typeof res === 'object' && 'success' in res) {
                                  if (res.success) {
                                    showNotification('success', res.message);
                                  } else {
                                    showNotification('error', res.message);
                                  }
                                }
                              }}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                user.status === 'active'
                                  ? 'bg-slate-100 dark:bg-slate-800 hover:bg-red-100 text-slate-600 dark:text-slate-300 hover:text-red-700'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                              title={user.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {user.status === 'active' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            </button>

                            {/* Edit User */}
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                              title="Edit User Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User */}
                            {user.role !== 'admin' && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to remove account for ${user.name}?`)) {
                                    const res = await onDeleteUser(user.id);
                                    if (res && typeof res === 'object' && 'success' in res) {
                                      if (res.success) {
                                        showNotification('success', `User account for ${user.name} removed.`);
                                      } else {
                                        showNotification('error', res.message);
                                      }
                                    } else {
                                      showNotification('success', `User account for ${user.name} removed.`);
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-100 text-slate-400 hover:text-red-600 transition cursor-pointer"
                                title="Remove User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* TAB 2: VOUCHERS APPROVAL */}
      {activeAdminTab === 'vouchers' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Vouchers Awaiting Executive Approval</span>
              </h2>
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                {pendingVouchers.length} Action Required
              </span>
            </div>

            {pendingVouchers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-medium">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All disbursement vouchers are approved and up-to-date.
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3">
                {pendingVouchers.map((v) => (
                  <div key={v.id} className="p-4 sm:p-5 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 border-2 border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">{v.voucherNumber}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">{v.category}</span>
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{v.description}</div>
                      <div className="text-xs text-slate-500">
                        Beneficiary: <b className="text-slate-700 dark:text-slate-300">{v.paidToOrReceivedFrom}</b> • Ref: <span className="font-mono">{v.referenceNo}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold">Amount</div>
                        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{formatCurrency(v.amount)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApproveVoucher(v.id)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Authorize</span>
                        </button>
                        <button
                          onClick={() => onRejectVoucher(v.id)}
                          className="px-3 py-2 rounded-xl bg-red-100 dark:bg-red-950 hover:bg-red-200 text-red-700 dark:text-red-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved / Active Vouchers */}
          <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Authorized Disbursement History ({approvedVouchers.length})
            </h2>
            <div className="overflow-x-auto max-h-[340px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Beneficiary</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {approvedVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold">{v.voucherNumber}</td>
                      <td className="py-3 px-3 text-slate-500">{v.date}</td>
                      <td className="py-3 px-3 font-semibold">{v.category}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{v.paidToOrReceivedFrom}</td>
                      <td className="py-3 px-3 text-right font-black">{formatCurrency(v.amount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUDGET CEILINGS & ALLOCATIONS */}
      {activeAdminTab === 'allocations' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <span>Head-wise Budget Caps & Escrow Protection</span>
              </h2>
              <p className="text-xs text-slate-500">
                Statutory limits ordained by the State Committee for legal defense, member welfare, and chapter grants.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((c) => (
                <div key={c.category} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{c.category}</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{c.percentageUsed}% Spent</span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${Math.min(c.percentageUsed, 100)}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Allocated: <b>{formatCurrency(c.allocated)}</b></span>
                    <span>Remaining: <b className="text-emerald-600 dark:text-emerald-400">{formatCurrency(c.balance)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="max-w-md w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {editingUserId ? 'Edit Committee Account' : 'Add State Committee User'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Real user authentication via Firebase Auth
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adv. Rajesh K. Nair"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Official Email Address (Unique ID)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. member.ernakulam@hcrs.org"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number (10 Digits)</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9847012345"
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="member">Committee Member (17 max)</option>
                    <option value="treasurer">State Treasurer (1)</option>
                    <option value="auditor">Statutory Auditor (1)</option>
                    <option value="admin">Central Admin (1)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">District / Chapter</label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="State Committee HQ">State Committee HQ</option>
                    <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                    <option value="Kollam">Kollam</option>
                    <option value="Pathanamthitta">Pathanamthitta</option>
                    <option value="Alappuzha">Alappuzha</option>
                    <option value="Kottayam">Kottayam</option>
                    <option value="Idukki">Idukki</option>
                    <option value="Ernakulam">Ernakulam</option>
                    <option value="Thrissur">Thrissur</option>
                    <option value="Palakkad">Palakkad</option>
                    <option value="Malappuram">Malappuram</option>
                    <option value="Kozhikode">Kozhikode</option>
                    <option value="Wayanad">Wayanad</option>
                    <option value="Kannur">Kannur</option>
                    <option value="Kasaragod">Kasaragod</option>
                  </select>
                </div>
              </div>

              {formRole === 'member' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Membership / Seat ID</label>
                  <input
                    type="text"
                    placeholder="e.g. HCRS-SC-05"
                    value={formMembershipId}
                    onChange={(e) => setFormMembershipId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}

              {editingUserId && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const targetUser = users.find(u => u.id === editingUserId);
                      if (targetUser) {
                        setShowAddUserModal(false);
                        handleOpenPasswordResetModal(targetUser);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-between text-xs hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Change Password / Send Reset Link</span>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      Open Reset Flow
                    </span>
                  </button>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                🔒 A password setup link will be automatically generated for this account via Firebase Authentication.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSavingUser}
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingUser ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingUserId ? 'Save Changes' : 'Create & Invite User'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED SECURE CHANGE PASSWORD / SEND RESET LINK MODAL */}
      {passwordResetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="max-w-md w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                    Change User Password
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    State Committee Authentication & Security
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePasswordResetModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Target User & Registered Email Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    {passwordResetTargetUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {passwordResetTargetUser.district || 'State Committee HQ'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  {passwordResetTargetUser.role}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Registered Official Email Address
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white font-bold shadow-2xs">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">{passwordResetTargetUser.email}</span>
                </div>
              </div>
            </div>

            {/* Security Explanation */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 text-xs text-amber-900 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Zero-Knowledge Credential Security</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                In strict compliance with society privacy rules and Firebase security standards, existing passwords are never displayed, requested, or stored.
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-900/30">
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Click <b>"Send Password Reset Link"</b> to dispatch an official Firebase Authentication email to <b>{passwordResetTargetUser.email}</b>.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>The user opens the secure link in their email inbox.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>The user sets their new password, which activates immediately.</span>
                </div>
              </div>
            </div>

            {/* Inline Feedback Toast */}
            {resetModalFeedback && (
              <div className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-bold animate-in fade-in shadow-xs ${
                resetModalFeedback.type === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
              }`}>
                {resetModalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-extrabold">{resetModalFeedback.type === 'success' ? 'Password Reset Email Sent' : 'Action Failed'}</div>
                  <div className="text-[11px] font-normal opacity-90">{resetModalFeedback.message}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClosePasswordResetModal}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {resetModalFeedback?.type === 'success' ? 'Done' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSendingResetLink}
                onClick={handleSendResetLinkInModal}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 text-xs transition active:scale-95"
              >
                {isSendingResetLink ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{resetModalFeedback?.type === 'success' ? 'Resend Password Reset Link' : 'Send Password Reset Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED TESTING MODAL: RESET ALL FINANCIALS TO ZERO */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    റീസെറ്റ് സ്ഥിരീകരിക്കുക (Reset to ₹0)
                  </h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                    Testing Mode Financial Reset Confirmation
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isResettingData && setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500" />
                <span>ഈ ഓപ്പറേഷൻ ചെയ്യുന്ന കാര്യങ്ങൾ:</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
                <li>എല്ലാ <b>വൗച്ചറുകളും (Vouchers)</b> ഡിലീറ്റ് ചെയ്യപ്പെടും.</li>
                <li>എല്ലാ <b>ബാങ്ക് ക്രെഡിറ്റ് രേഖകളും</b> ഡിലീറ്റ് ചെയ്യപ്പെടും.</li>
                <li>തുടക്ക ബാങ്ക് ബാലൻസ് (Opening Balance) <b>₹0</b> ആയി മാറും.</li>
                <li><b>20 മെമ്പർമാരുടെയും</b> അലോക്കേഷൻ, ചിലവുകൾ, ബാലൻസ് എന്നിവ <b>₹0</b> ആകും.</li>
                <li>എല്ലാ ഫണ്ട് വിഭാഗങ്ങളുടെയും ബാലൻസ് <b>₹0</b> ആകും.</li>
                <li><b>യൂസർ അക്കൗണ്ടുകളും പാസ്‌വേഡുകളും</b> മാറ്റമില്ലാതെ നിലനിൽക്കും.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 font-medium">
              💡 <b>കുറിപ്പ്:</b> ടെസ്റ്റിംഗ് പൂർത്തിയായി യഥാർത്ഥ കണക്കുകൾ രേഖപ്പെടുത്തി തുടങ്ങുമ്പോൾ ഈ ബട്ടൺ സുരക്ഷിതമായി ഒഴിവാക്കാവുന്നതാണ്.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isResettingData}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition disabled:opacity-50"
              >
                Cancel (റദ്ദാക്കുക)
              </button>
              <button
                type="button"
                disabled={isResettingData}
                onClick={handleExecuteResetToZero}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs shadow-lg cursor-pointer flex items-center gap-2 transition disabled:opacity-50"
              >
                {isResettingData ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>റീസെറ്റ് ചെയ്യുന്നു...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>അതെ, എല്ലാം ₹0 ആക്കുക (Confirm Reset)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
