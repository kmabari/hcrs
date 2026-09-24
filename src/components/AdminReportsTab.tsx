import { useEffect, useMemo, useState } from 'react';
import { UserProfile } from '../types';
import { auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DuplicateSerialDryRunReport from './DuplicateSerialDryRunReport';
import { 
  Calendar, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  UserCheck, 
  RefreshCw, 
  ShieldCheck,
  AlertCircle,
  Printer,
  Loader2
} from 'lucide-react';

interface AdminReportsTabProps {
  members: UserProfile[];
  claims?: any[];
  onApprove: (uid: string) => void | Promise<any>;
  onViewDetails: (member: UserProfile) => void;
  DISTRICTS: { code: string; name: string }[];
  userDistrict?: string;
  isSuperAdmin?: boolean;
}

interface VerifiedPaymentRecord {
  id: string;
  paymentId: string;
  paymentType: string;
  amount: number;
  memberId: string;
  membershipId: string;
  name: string;
  mobile: string;
  paymentStatus: string;
  status: string;
  paymentDate: string;
  paymentTime: string;
}

export default function AdminReportsTab({
  members,
  claims = [],
  onApprove,
  onViewDetails,
  DISTRICTS,
  userDistrict,
  isSuperAdmin = true
}: AdminReportsTabProps) {
  const [reportType, setReportType] = useState<'new_memberships' | 'renewals'>('new_memberships');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('today');
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [verifiedPayments, setVerifiedPayments] = useState<VerifiedPaymentRecord[]>([]);
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const [customStartDate, setCustomStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const [selectedDistrict, setSelectedDistrict] = useState<string>(userDistrict && !isSuperAdmin ? userDistrict : 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    try {
      if (val.toDate) return val.toDate();
      if (val.seconds) return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const getMemberRegDate = (m: UserProfile): Date | null => {
    if (m.paymentTimeISO) return parseDate(m.paymentTimeISO);
    if (m.paymentDate) return parseDate(m.paymentDate);
    if (m.registrationDate) return parseDate(m.registrationDate);
    if ((m as any).createdAt) return parseDate((m as any).createdAt);
    return null;
  };

  const getMemberRenewalDate = (m: UserProfile): Date | null => {
    if (m.renewalDate) return parseDate(m.renewalDate);
    if (m.renewalPaymentDate) return parseDate(m.renewalPaymentDate);
    return null;
  };

  useEffect(() => {
    let cancelled = false;

    const loadVerifiedPayments = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch('/api/admin/payments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled) {
          setVerifiedPayments(Array.isArray(result.payments) ? result.payments : []);
        }
      } catch (error) {
        console.warn('Failed to load verified payments for reports:', error);
      }
    };

    loadVerifiedPayments();
    return () => { cancelled = true; };
  }, []);

  const renewalReportMembers = useMemo(() => {
    const cleanMobile = (value: unknown) => String(value || '').replace(/\D/g, '').slice(-10);
    const paymentIds = new Set<string>();

    const razorpayRenewals = verifiedPayments
      .filter(payment => String(payment.paymentType || '').toLowerCase() === 'renewal')
      .map(payment => {
        if (payment.paymentId) paymentIds.add(payment.paymentId);
        const paymentMobile = cleanMobile(payment.mobile);
        const matchedMember = members.find(member =>
          (!!payment.memberId && member.uid === payment.memberId) ||
          (!!payment.membershipId && member.membershipId === payment.membershipId) ||
          (!!paymentMobile && cleanMobile(member.mobile) === paymentMobile)
        );

        return {
          ...(matchedMember || {}),
          uid: `payment:${payment.id || payment.paymentId}`,
          name: payment.name || matchedMember?.name || 'Member',
          mobile: payment.mobile || matchedMember?.mobile || '',
          membershipId: payment.membershipId || matchedMember?.membershipId || payment.memberId || 'N/A',
          district: matchedMember?.district || '',
          districtCode: matchedMember?.districtCode || '',
          renewalDate: payment.paymentTime || payment.paymentDate,
          renewalPaymentDate: payment.paymentDate,
          renewalTransactionId: payment.paymentId,
          transactionId: payment.paymentId,
          paymentId: payment.paymentId,
          paymentAmount: payment.amount || 100,
          paymentStatus: payment.paymentStatus || payment.status || 'PAYMENT_VERIFIED',
          expiryDate: matchedMember?.expiryDate,
          status: matchedMember?.status || 'active',
          isPaid: true,
          isApproved: true,
          isAdmin: false,
          role: matchedMember?.role || 'member',
          registrationDate: matchedMember?.registrationDate || payment.paymentTime || payment.paymentDate
        } as UserProfile;
      });

    const otherRenewals = members.filter(member => {
      if (!getMemberRenewalDate(member)) return false;
      const transactionId = member.renewalTransactionId || member.transactionId || member.paymentId || '';
      return !transactionId || !paymentIds.has(transactionId);
    });

    return [...razorpayRenewals, ...otherRenewals];
  }, [members, verifiedPayments]);

  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // Calculate KPI Summary Counts
  const newMembersToday = members.filter(m => {
    const d = getMemberRegDate(m);
    return d && d.toISOString().split('T')[0] === todayStr;
  });

  const newMembersYesterday = members.filter(m => {
    const d = getMemberRegDate(m);
    return d && d.toISOString().split('T')[0] === yesterdayStr;
  });

  const renewalsToday = renewalReportMembers.filter(m => {
    const d = getMemberRenewalDate(m);
    return d && d.toISOString().split('T')[0] === todayStr;
  });

  const renewalsYesterday = renewalReportMembers.filter(m => {
    const d = getMemberRenewalDate(m);
    return d && d.toISOString().split('T')[0] === yesterdayStr;
  });

  const matchesDateFilter = (d: Date | null) => {
    if (!d) return false;
    const dStr = d.toISOString().split('T')[0];

    if (dateFilter === 'today') return dStr === todayStr;
    if (dateFilter === 'yesterday') return dStr === yesterdayStr;
    if (dateFilter === 'this_week') {
      const weekStart = getStartOfWeek(new Date());
      return d >= weekStart && d <= new Date();
    }
    if (dateFilter === 'this_month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    if (dateFilter === 'custom') {
      const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date('2000-01-01');
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date('2099-12-31');
      return d >= start && d <= end;
    }
    return true;
  };

  const matchesDistrict = (m: UserProfile) => {
    if (selectedDistrict === 'all') return true;
    return (m.district || m.districtCode) === selectedDistrict;
  };

  const matchesSearch = (m: UserProfile) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.mobile || '').includes(q) ||
      (m.membershipId || '').toLowerCase().includes(q)
    );
  };

  // Filter lists based on selected reportType
  const filteredNewMembers = members.filter(m => {
    const regD = getMemberRegDate(m);
    return matchesDateFilter(regD) && matchesDistrict(m) && matchesSearch(m);
  });

  const filteredRenewals = renewalReportMembers.filter(m => {
    const renD = getMemberRenewalDate(m);
    return renD && matchesDateFilter(renD) && matchesDistrict(m) && matchesSearch(m);
  });

  const formatDateTime = (val: Date | null) => {
    if (!val) return '---';
    return val.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatExpiryDate = (val: any) => {
    const d = parseDate(val);
    if (!d) return '---';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRenewalTransactionId = (m: UserProfile): string =>
    m.renewalTransactionId || m.transactionId || m.paymentId || 'N/A';

  const getDistrictLabel = (m: UserProfile): string => {
    const districtValue = m.district || m.districtCode;
    if (!districtValue) return 'N/A';
    return DISTRICTS.find(d => d.code === districtValue)?.name || districtValue;
  };

  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'new_memberships') {
      headers = ['Sl No', 'Member ID', 'Member Name', 'Mobile Number', 'District', 'Assembly Constituency', 'Payment Amount', 'Payment Status', 'Payment Date & Time', 'Approval Status'];
      rows = filteredNewMembers.map((m, idx) => [
        String(idx + 1),
        m.membershipId || 'N/A',
        `"${(m.name || '').replace(/"/g, '""')}"`,
        m.mobile || 'N/A',
        getDistrictLabel(m),
        m.assemblyConstituency || 'N/A',
        '₹200',
        m.paymentStatus || (m.isPaid ? 'PAYMENT_VERIFIED' : 'Pending Verification'),
        `"${formatDateTime(getMemberRegDate(m))}"`,
        m.status === 'active' || m.isApproved ? 'APPROVED' : 'PENDING_APPROVAL'
      ]);
    } else {
      headers = ['Sl No', 'Member ID', 'Member Name', 'Mobile Number', 'District', 'Renewal Payment Date & Time', 'Renewal Amount', 'Transaction ID', 'Payment Status', 'Expiry Date'];
      rows = filteredRenewals.map((m, idx) => [
        String(idx + 1),
        m.membershipId || 'N/A',
        `"${(m.name || '').replace(/"/g, '""')}"`,
        m.mobile || 'N/A',
        m.district || 'N/A',
        `"${formatDateTime(getMemberRenewalDate(m))}"`,
        '₹100',
        getRenewalTransactionId(m),
        m.paymentStatus || 'Renewed',
        `"${formatExpiryDate(m.expiryDate)}"`
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HCRS_${reportType}_report_${dateFilter}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    const isNew = reportType === 'new_memberships';
    const reportData = isNew ? filteredNewMembers : filteredRenewals;
    const reportTitle = isNew ? 'New Memberships Registration Report' : 'Memberships Renewal Report';
    const rate = isNew ? 200 : 100;
    const totalAmount = reportData.length * rate;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print the report.');
      return;
    }

    const tableRowsHtml = reportData.map((m, idx) => {
      const regTime = isNew ? formatDateTime(getMemberRegDate(m)) : formatDateTime(getMemberRenewalDate(m));
      const statusText = isNew 
        ? (m.status === 'active' || m.isApproved ? 'APPROVED' : 'PENDING')
        : (m.paymentStatus || 'RENEWED');
      return `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: bold;">${m.membershipId || 'N/A'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${m.name || 'N/A'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${m.mobile || 'N/A'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${m.district || 'N/A'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${regTime}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${rate}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${statusText}</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HCRS - ${reportTitle}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .header h1 { margin: 0 0 4px 0; font-size: 16px; color: #0f172a; text-transform: uppercase; font-weight: 800; }
            .header p { margin: 0; font-size: 10px; color: #64748b; }
            .meta-box { display: flex; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 11px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .meta-val { font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
            th { background: #f1f5f9; color: #334155; font-weight: 800; text-transform: uppercase; font-size: 9px; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 15px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div>
              <h1>Highrich Community Revival Society</h1>
              <p>${reportTitle} • Official Administrative Audit</p>
            </div>
            <div style="text-align: right;">
              <p>Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</p>
              <p style="font-weight: 700; color: #0f172a;">Filter: ${dateFilter.toUpperCase()} | District: ${selectedDistrict === 'all' ? 'ALL' : selectedDistrict}</p>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <span class="meta-label">Total Records</span>
              <span class="meta-val">${reportData.length} Members</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Fee Rate</span>
              <span class="meta-val">₹${rate} per member</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Total Amount</span>
              <span class="meta-val" style="color: #059669;">₹${totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Report Category</span>
              <span class="meta-val">${isNew ? 'New Registration (₹200)' : 'Membership Renewal (₹100)'}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 35px;">Sl</th>
                <th style="width: 100px;">Membership ID</th>
                <th>Member Name</th>
                <th>Mobile</th>
                <th>District</th>
                <th style="text-align: center; width: 120px;">Date & Time</th>
                <th style="text-align: right; width: 60px;">Amount</th>
                <th style="text-align: center; width: 80px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml || '<tr><td colspan="8" style="text-align:center; padding: 20px; color: #94a3b8;">No records found for the selected filter.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <span>Highrich Community Revival Society • Internal Audit Document</span>
            <span>Page 1 of 1</span>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      <DuplicateSerialDryRunReport members={members} claims={claims} canApply={isSuperAdmin} />
      <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">New Reg Today</span>
              <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5">₹200</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950">
              {newMembersToday.length}
            </div>
            <span className="text-[10px] text-slate-700 font-black mt-1">Total ₹{newMembersToday.length * 200}</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#172443] to-[#071126] border-2 border-[#31456f] shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-slate-100 tracking-wider">New Reg Yesterday</span>
              <Badge className="text-[9px] px-1.5 py-0.5 bg-white text-slate-950 border border-white">₹200</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {newMembersYesterday.length}
            </div>
            <span className="text-[10px] text-slate-200 font-black mt-1">Total ₹{newMembersYesterday.length * 200}</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-200 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Renewals Today</span>
              <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0.5">₹100</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950">
              {renewalsToday.length}
            </div>
            <span className="text-[10px] text-slate-700 font-black mt-1">Total ₹{renewalsToday.length * 100}</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#172443] to-[#071126] border-2 border-[#31456f] shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-slate-100 tracking-wider">Renewals Yesterday</span>
              <Badge className="text-[9px] px-1.5 py-0.5 bg-white text-slate-950 border border-white">₹100</Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {renewalsYesterday.length}
            </div>
            <span className="text-[10px] text-slate-200 font-black mt-1">Total ₹{renewalsYesterday.length * 100}</span>
          </CardContent>
        </Card>
      </div>

      {/* Control Toolbar: View Selector & Filter Controls */}
      <Card className="p-4 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Row 1: Sub-tab toggle (New Memberships vs Renewals) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-850">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-full sm:w-auto">
            <Button
              type="button"
              variant={reportType === 'new_memberships' ? 'default' : 'ghost'}
              onClick={() => setReportType('new_memberships')}
              className={`flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                reportType === 'new_memberships'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              New Memberships Report ({filteredNewMembers.length})
            </Button>
            <Button
              type="button"
              variant={reportType === 'renewals' ? 'default' : 'ghost'}
              onClick={() => setReportType('renewals')}
              className={`flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                reportType === 'renewals'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Renewals Report ({filteredRenewals.length})
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
            <Button
              onClick={printReport}
              variant="outline"
              className="h-10 px-4 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center gap-2 cursor-pointer flex-1 sm:flex-none justify-center"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Print Report (A4)
            </Button>
            <Button
              onClick={exportToCSV}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 cursor-pointer flex-1 sm:flex-none justify-center"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Row 2: Date Filters & District Filter */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Button
              size="sm"
              variant={dateFilter === 'today' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('today')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'yesterday' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('yesterday')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              Yesterday
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'this_week' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('this_week')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              This Week
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'this_month' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('this_month')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'custom' ? 'default' : 'ghost'}
              onClick={() => setDateFilter('custom')}
              className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer"
            >
              Custom Range
            </Button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
              <Calendar className="w-4 h-4 text-slate-400 ml-1" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-800"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-800"
              />
            </div>
          )}

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!isSuperAdmin && !!userDistrict}
            className="h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Districts</option>
            {DISTRICTS.map(d => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, mobile, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
            />
          </div>
        </div>
      </Card>

      {/* Main Table Content */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {reportType === 'new_memberships' ? (
          <div>
            <div className="p-4 bg-slate-100/90 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black uppercase text-slate-950 dark:text-slate-100 tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-blue" />
                New Memberships Report ({filteredNewMembers.length} records)
              </h3>
              <Badge className="bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800 text-[11px] font-black">
                Fee: ₹200 / registration
              </Badge>
            </div>

            {filteredNewMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-700 dark:text-slate-300 font-extrabold text-sm space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <p>No new memberships found for the selected date range and filters.</p>
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredNewMembers.map((member, index) => {
                    const isApproved = member.status === 'active' || member.isApproved;
                    const isPaid = member.isPaid || member.paymentStatus === 'PAYMENT_VERIFIED' || member.paymentStatus === 'Active';
                    return (
                      <div key={member.uid} className="p-4 space-y-3 bg-white dark:bg-slate-950">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-brand-blue break-all">#{index + 1} · {member.membershipId || 'PENDING'}</p>
                            <p className="text-sm font-black text-slate-950 dark:text-white break-words">{member.name || 'N/A'}</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{member.mobile || 'N/A'}</p>
                          </div>
                          <Badge className={`shrink-0 text-[9px] font-black ${isPaid ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'}`}>
                            {isPaid ? 'PAID ₹200' : 'PAYMENT PENDING'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-2"><span className="block text-slate-500">District</span><b>{member.district || 'N/A'}</b></div>
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-2"><span className="block text-slate-500">Assembly</span><b className="break-words">{member.assemblyConstituency || 'N/A'}</b></div>
                          <div className="col-span-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-2"><span className="block text-slate-500">Payment date</span><b>{formatDateTime(getMemberRegDate(member))}</b></div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={isApproved ? 'bg-green-100 text-green-950' : 'bg-amber-100 text-amber-950'}>{isApproved ? 'APPROVED' : 'PENDING APPROVAL'}</Badge>
                          <Button size="sm" variant="outline" onClick={() => onViewDetails(member)}>Details</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-xs">
                  <thead className="bg-slate-200/80 dark:bg-slate-900 text-slate-950 dark:text-slate-100 font-black uppercase text-[11px] tracking-wider border-b-2 border-slate-300 dark:border-slate-700">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Member ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">District</th>
                      <th className="p-3">Assembly</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3">Payment Date & Time</th>
                      <th className="p-3">Approval Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold text-slate-950 dark:text-slate-100">
                    {filteredNewMembers.map((member, index) => {
                      const isApproved = member.status === 'active' || member.isApproved;
                      const isPaid = member.isPaid || member.paymentStatus === 'PAYMENT_VERIFIED' || member.paymentStatus === 'Active';
                      const regDate = getMemberRegDate(member);

                      return (
                        <tr key={member.uid} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-black">{index + 1}</td>
                          <td className="p-3 font-mono font-black text-brand-blue">{member.membershipId || 'PENDING'}</td>
                          <td className="p-3 font-black text-slate-950 dark:text-white">{member.name}</td>
                          <td className="p-3 font-mono font-extrabold">{member.mobile}</td>
                          <td className="p-3 font-extrabold">{member.district}</td>
                          <td className="p-3 font-extrabold">{member.assemblyConstituency || 'N/A'}</td>
                          <td className="p-3">
                            <Badge className={`text-[10.5px] font-black px-2 py-0.5 border ${
                              isPaid ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800' : 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
                            }`}>
                              {isPaid ? 'PAYMENT_VERIFIED (₹200)' : 'Pending Payment'}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-200 text-xs font-extrabold">
                            {formatDateTime(regDate)}
                          </td>
                          <td className="p-3">
                            {isApproved ? (
                              <Badge className="bg-green-100 text-green-950 dark:bg-green-950/60 dark:text-green-200 border border-green-300 dark:border-green-800 text-[10.5px] font-black flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                APPROVED
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10.5px] font-black flex items-center gap-1 w-fit">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                PENDING_APPROVAL
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {!isApproved && (
                              <Button
                                size="sm"
                                disabled={approvingUid === member.uid}
                                onClick={async () => {
                                  if (approvingUid) return;
                                  setApprovingUid(member.uid);
                                  try {
                                    await onApprove(member.uid);
                                  } catch (err) {
                                    console.error("Approve error:", err);
                                  } finally {
                                    setApprovingUid(null);
                                  }
                                }}
                                className="h-8 px-3 bg-brand-blue hover:bg-brand-blue/90 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                              >
                                {approvingUid === member.uid ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Approving...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(member)}
                              className="h-8 px-3 text-[10px] font-black border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer shadow-xs"
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="p-4 bg-[#132044] border-b-2 border-[#263765] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-300" />
                Renewals Report ({filteredRenewals.length} records)
              </h3>
              <Badge className="bg-amber-300 text-amber-950 border border-amber-200 text-[11px] font-black">
                Renewal Fee: ₹100 / member
              </Badge>
            </div>

            {filteredRenewals.length === 0 ? (
              <div className="p-12 text-center text-slate-700 dark:text-slate-300 font-extrabold text-sm space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <p>No renewals found for the selected date range and filters.</p>
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredRenewals.map((member, index) => (
                    <div key={member.uid} className="p-4 space-y-3 bg-white dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-amber-700 break-all">#{index + 1} · {member.membershipId || 'N/A'}</p>
                          <p className="text-sm font-black text-slate-950 dark:text-white break-words">{member.name || 'N/A'}</p>
                          <p className="text-xs font-black text-slate-800 dark:text-white">Mobile: {member.mobile || 'N/A'}</p>
                        </div>
                        <Badge className="shrink-0 bg-emerald-100 text-emerald-950 text-[9px] font-black">RENEWED ₹100</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg bg-slate-100 dark:bg-[#16213d] p-2 border border-slate-200 dark:border-slate-700"><span className="block text-slate-500 dark:text-slate-300 font-bold">District</span><b className="text-slate-950 dark:text-white">{getDistrictLabel(member)}</b></div>
                        <div className="rounded-lg bg-slate-100 dark:bg-[#16213d] p-2 border border-slate-200 dark:border-slate-700"><span className="block text-slate-500 dark:text-slate-300 font-bold">New expiry</span><b className="text-slate-950 dark:text-white">{formatExpiryDate(member.expiryDate)}</b></div>
                        <div className="col-span-2 rounded-lg bg-slate-100 dark:bg-[#16213d] p-2 border border-slate-200 dark:border-slate-700"><span className="block text-slate-500 dark:text-slate-300 font-bold">Renewal payment date</span><b className="text-slate-950 dark:text-white">{formatDateTime(getMemberRenewalDate(member))}</b></div>
                        <div className="col-span-2 rounded-lg bg-slate-100 dark:bg-[#16213d] p-2 border border-slate-200 dark:border-slate-700"><span className="block text-slate-500 dark:text-slate-300 font-bold">Transaction ID</span><b className="break-all text-slate-950 dark:text-white">{getRenewalTransactionId(member)}</b></div>
                      </div>
                      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => onViewDetails(member)} className="bg-white text-slate-900 border-slate-300 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">Details</Button></div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1280px] text-left text-xs">
                  <thead className="bg-slate-200/80 dark:bg-slate-900 text-slate-950 dark:text-slate-100 font-black uppercase text-[11px] tracking-wider border-b-2 border-slate-300 dark:border-slate-700">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Member ID</th>
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">District</th>
                      <th className="p-3">Renewal Payment Date</th>
                      <th className="p-3">Renewal Fee</th>
                      <th className="p-3">Transaction ID</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3">New Expiry Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold text-slate-950 dark:text-slate-100">
                    {filteredRenewals.map((member, index) => {
                      const renDate = getMemberRenewalDate(member);

                      return (
                        <tr key={member.uid} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-black">{index + 1}</td>
                          <td className="p-3 font-mono font-black text-brand-blue">{member.membershipId}</td>
                          <td className="p-3 font-black text-slate-950 dark:text-white">{member.name}</td>
                          <td className="p-3 font-mono font-extrabold">{member.mobile}</td>
                          <td className="p-3 font-extrabold">{member.district}</td>
                          <td className="p-3 text-slate-800 dark:text-slate-200 text-xs font-extrabold">
                            {formatDateTime(renDate)}
                          </td>
                          <td className="p-3 font-black text-emerald-700 dark:text-emerald-400 text-sm">₹100</td>
                          <td className="p-3 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">
                            {getRenewalTransactionId(member)}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-[10.5px] font-black">
                              {member.paymentStatus || 'Renewed'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">
                            {formatExpiryDate(member.expiryDate)}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(member)}
                              className="h-8 px-3 text-[10px] font-black border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer shadow-xs"
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
