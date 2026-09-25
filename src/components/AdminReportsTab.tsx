import { useEffect, useMemo, useState } from 'react';
import { UserProfile } from '../types';
import { auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DuplicateSerialDryRunReport from './DuplicateSerialDryRunReport';
import JanamailAdminReport from './JanamailAdminReport';
import { AlertCircle, Calendar, Download, Printer, RefreshCw, Search, ShieldAlert } from 'lucide-react';

interface Props {
  members: UserProfile[]; claims?: any[]; onApprove: (uid: string) => void | Promise<any>;
  onViewDetails: (member: UserProfile) => void; DISTRICTS: { code: string; name: string }[];
  userDistrict?: string; isSuperAdmin?: boolean;
}
interface PaymentRecord {
  id: string; paymentId?: string; orderId?: string; transactionId?: string; paymentType?: string;
  amount?: number; memberId?: string; membershipId?: string; name?: string; mobile?: string;
  paymentStatus?: string; status?: string; paymentDate?: string; paymentTime?: string;
}
type ReportType = 'new_memberships' | 'renewals';
type DateFilter = 'today' | 'yesterday' | 'custom_date' | 'date_range';
type StatusFilter = 'all' | 'successful' | 'processing' | 'pending' | 'failed';
type PaymentStatus = Exclude<StatusFilter, 'all'>;
interface AuditRow { uid:string; authEmail:string; authCreatedAt:string; mobile:string; name:string; membershipId:string; classification:string; reason:string; }
interface ReconciliationRow { paymentId:string; orderId:string; amount:number; razorpayStatus:string; method:string; createdAt:string; paymentType:string; hcrsPaymentRecorded:boolean; hcrsPaymentStatus:string; membershipId:string; memberName:string; memberStatus:string; renewalPending:boolean; expiryDate:string; reconciliationStatus:string; }
interface PaymentExceptionRow { paymentId:string; orderId:string; amount:number; createdAt:string; method:string; paymentType:string; membershipId:string; memberName:string; mobile:string; hcrsPaymentRecorded:boolean; memberStatus:string; renewalPending:boolean; expiryDate:string; result:string; }
interface ClaimMismatchRow { claimId:string; relation:string; claimName:string; claimMobile:string; claimMemberId:string; claimUid:string; uidOwnerName:string; uidOwnerMobile:string; uidOwnerMemberId:string; problems:string[]; }
interface ReportRow {
  key: string; member?: UserProfile; source: 'member' | 'payment'; type: ReportType;
  name: string; mobile: string; membershipId: string; district: string; assembly: string;
  amount: number; status: PaymentStatus; rawStatus: string; orderId: string; paymentId: string;
  transactionId: string; date: Date | null; expiryDate?: unknown; approved: boolean;
}

const text = (value: unknown) => String(value || '').trim();
const mobile = (value: unknown) => text(value).replace(/\D/g, '').slice(-10);
const escapeHtml = (value: unknown) => text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export default function AdminReportsTab({
  members, claims = [], onApprove, onViewDetails, DISTRICTS, userDistrict, isSuperAdmin = true
}: Props) {
  const [reportType, setReportType] = useState<ReportType>('new_memberships');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [district, setDistrict] = useState(userDistrict && !isSuperAdmin ? userDistrict : 'all');
  const [search, setSearch] = useState('');
  const [exceptionRows,setExceptionRows]=useState<PaymentExceptionRow[]>([]);
  const [exceptionDate,setExceptionDate]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
  const [exceptionLoading,setExceptionLoading]=useState(false);
  const [exceptionError,setExceptionError]=useState('');
  const runPaymentExceptions=async()=>{setExceptionLoading(true);setExceptionError('');try{const token=await auth.currentUser?.getIdToken();if(!token)throw new Error('Admin authentication required');const response=await fetch(`/api/admin/payment-exceptions?date=${encodeURIComponent(exceptionDate)}`,{headers:{Authorization:`Bearer ${token}`}});const body=await response.json();if(!response.ok)throw new Error(body.error||'Payment exceptions audit failed');setExceptionRows(Array.isArray(body.rows)?body.rows:[]);}catch(e:any){setExceptionError(e?.message||'Payment exceptions audit failed');}finally{setExceptionLoading(false);}};
  const [recoveryBusy,setRecoveryBusy]=useState<string|null>(null);
  const [recoveryVerified,setRecoveryVerified]=useState<Record<string,boolean>>({});
  const [recoveryMessage,setRecoveryMessage]=useState<Record<string,string>>({});
  const paymentRecovery=async(row:PaymentExceptionRow,action:'verify'|'repair')=>{
    setRecoveryBusy(row.paymentId); setRecoveryMessage(x=>({...x,[row.paymentId]:''}));
    try{
      const token=await auth.currentUser?.getIdToken(); if(!token)throw new Error('Admin authentication required');
      if(action==='repair'&&!recoveryVerified[row.paymentId])throw new Error('Verify payment first');
      if(action==='repair'&&!window.confirm(`Repair this captured payment?\n\n${row.memberName||row.membershipId||row.mobile}\n₹${row.amount}\n${row.paymentId}\n\nThis will update the HCRS payment record and membership status.`)) return;
      const response=await fetch('/api/admin/payment-recovery',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({paymentId:row.paymentId,action})});
      const body=await response.json(); if(!response.ok)throw new Error(body.error||'Payment recovery failed');
      if(action==='verify'){setRecoveryVerified(x=>({...x,[row.paymentId]:true}));setRecoveryMessage(x=>({...x,[row.paymentId]:'Verified with Razorpay — ready to repair'}));}
      else {setRecoveryMessage(x=>({...x,[row.paymentId]:body.alreadyRecovered?'Already repaired earlier':'Repair completed'})); await runPaymentExceptions();}
    }catch(e:any){setRecoveryMessage(x=>({...x,[row.paymentId]:e?.message||'Payment recovery failed'}));}
    finally{setRecoveryBusy(null);}
  };
  const [reconMobile, setReconMobile] = useState('');
  const [reconDate, setReconDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [reconRows, setReconRows] = useState<ReconciliationRow[]>([]);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');
  const runPaymentReconciliation = async () => {
    // Normalize Unicode/locale digits and formatting before validation. This also
    // handles mobile keyboards/autofill that visually render ASCII digits but emit
    // localized numeral code points or invisible formatting characters.
    const normalizeDigits = (value: string) => Array.from(value || '').map(ch => {
      const cp = ch.codePointAt(0) || 0;
      if (cp >= 0x30 && cp <= 0x39) return ch;
      if (cp >= 0x660 && cp <= 0x669) return String(cp - 0x660);
      if (cp >= 0x6F0 && cp <= 0x6F9) return String(cp - 0x6F0);
      if (cp >= 0x966 && cp <= 0x96F) return String(cp - 0x966);
      if (cp >= 0xD66 && cp <= 0xD6F) return String(cp - 0xD66);
      return '';
    }).join('');
    const clean = normalizeDigits(reconMobile).slice(-10);
    if (clean !== reconMobile) setReconMobile(clean);
    if (clean.length !== 10) { setReconError(`Mobile value received: ${clean.length} digits. Please clear the field and type all 10 digits again.`); return; }
    setReconLoading(true); setReconError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Admin authentication required');
      const response = await fetch(`/api/admin/payment-reconciliation?date=${encodeURIComponent(reconDate)}&mobile=${encodeURIComponent(clean)}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Reconciliation failed');
      setReconRows(Array.isArray(body.rows) ? body.rows : []);
    } catch (e:any) { setReconError(e?.message || 'Reconciliation failed'); }
    finally { setReconLoading(false); }
  };

  const [claimMismatchRows,setClaimMismatchRows]=useState<ClaimMismatchRow[]>([]);
  const [claimMismatchLoading,setClaimMismatchLoading]=useState(false);
  const [claimMismatchError,setClaimMismatchError]=useState('');
  const [claimMismatchScanned,setClaimMismatchScanned]=useState(false);
  const runClaimMismatchAudit=async()=>{
    setClaimMismatchLoading(true); setClaimMismatchError('');
    try{
      const token=await auth.currentUser?.getIdToken(); if(!token)throw new Error('Admin authentication required');
      const response=await fetch('/api/admin/claim-mismatch-audit',{headers:{Authorization:`Bearer ${token}`}});
      const body=await response.json(); if(!response.ok)throw new Error(body.error||'Claim mismatch audit failed');
      setClaimMismatchRows(Array.isArray(body.rows)?body.rows:[]); setClaimMismatchScanned(true);
    }catch(e:any){setClaimMismatchError(e?.message||'Claim mismatch audit failed');}
    finally{setClaimMismatchLoading(false);}
  };
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditDate, setAuditDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const runSecurityAudit = async () => {
    setAuditLoading(true); setAuditError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Admin authentication required');
      const response = await fetch(`/api/admin/security-audit?date=${encodeURIComponent(auditDate)}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Audit failed');
      setAuditRows(Array.isArray(body.rows) ? body.rows : []);
    } catch (e:any) { setAuditError(e?.message || 'Audit failed'); }
    finally { setAuditLoading(false); }
  };

  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const today = dateKey(now);
  const previousDay = new Date(now);
  previousDay.setDate(previousDay.getDate() - 1);
  const yesterday = dateKey(previousDay);
  const [customDate, setCustomDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    try {
      if (typeof value?.toDate === 'function') return value.toDate();
      if (value?.seconds) return new Date(value.seconds * 1000);
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch { return null; }
  };
  // A renewal/payment update must never make an old member look newly registered.
  const registrationDate = (member: UserProfile) =>
    parseDate(member.registrationDate) || parseDate((member as any).createdAt);
  const renewalDate = (member: UserProfile) =>
    parseDate(member.renewalDate) || parseDate(member.renewalPaymentDate);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch('/api/admin/payments?limit=10000', { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return;
        const body = await response.json();
        if (!cancelled) setPayments(Array.isArray(body.payments) ? body.payments : []);
      } catch (error) { console.warn('Failed to load report payments:', error); }
    })();
    return () => { cancelled = true; };
  }, []);

  const normalizeStatus = (rawValue: unknown, evidence: {
    orderId?: unknown; paymentId?: unknown; transactionId?: unknown; isPaid?: boolean; approved?: boolean;
  }): PaymentStatus => {
    const raw = text(rawValue).toLowerCase().replace(/[\s-]+/g, '_');
    if (/failed|failure|cancelled|canceled|error|rejected/.test(raw)) return 'failed';
    if (/processing|verification_pending|pending_verification|awaiting_approval|authorized|initiated|created/.test(raw)) return 'processing';
    if (/pending/.test(raw)) return 'pending';
    const successful = /payment_verified|renewal_auto_approved|success|successful|captured|renewed|paid/.test(raw);
    const completion = Boolean(evidence.paymentId || evidence.transactionId || evidence.isPaid);
    if (successful && completion) return 'successful';
    if (evidence.orderId && !completion) return 'processing';
    if (evidence.isPaid && (evidence.paymentId || evidence.transactionId)) return 'successful';
    return 'pending';
  };

  const findMember = (payment: PaymentRecord) => {
    const paymentMobile = mobile(payment.mobile);
    return members.find(member =>
      (!!payment.memberId && member.uid === payment.memberId) ||
      (!!payment.membershipId && member.membershipId === payment.membershipId) ||
      (!!paymentMobile && mobile(member.mobile) === paymentMobile));
  };

  const memberRow = (member: UserProfile, type: ReportType): ReportRow => {
    const rawStatus = text(member.paymentStatus || member.status);
    const orderId = text(member.orderId);
    const paymentId = text(member.paymentId);
    const transactionId = text(type === 'renewals' ? member.renewalTransactionId || member.transactionId : member.transactionId);
    const approved = member.status === 'active' || Boolean(member.isApproved);
    return {
      key: `member:${type}:${member.uid}`, member, source: 'member', type,
      name: text(member.name), mobile: text(member.mobile), membershipId: text(member.membershipId),
      district: text(member.district || member.districtCode), assembly: text(member.assemblyConstituency),
      amount: type === 'new_memberships' ? 200 : 100,
      status: normalizeStatus(rawStatus, { orderId, paymentId, transactionId, isPaid: member.isPaid, approved }),
      rawStatus, orderId, paymentId, transactionId,
      date: type === 'new_memberships' ? registrationDate(member) : renewalDate(member),
      expiryDate: member.expiryDate, approved
    };
  };
  const paymentRow = (payment: PaymentRecord, type: ReportType): ReportRow => {
    const member = findMember(payment);
    const rawStatus = text(payment.paymentStatus || payment.status);
    const orderId = text(payment.orderId);
    const paymentId = text(payment.paymentId);
    const transactionId = text(payment.transactionId || payment.paymentId);
    const approved = Boolean(member && (member.status === 'active' || member.isApproved));
    const name = text(payment.name || member?.name);
    const memberMobile = text(payment.mobile || member?.mobile);
    const membershipId = text(payment.membershipId || member?.membershipId || payment.memberId);
    const normalizedStatus = normalizeStatus(rawStatus, { orderId, paymentId, transactionId, isPaid: member?.isPaid, approved });
    const workflowComplete = Boolean(member && name && memberMobile && membershipId);
    return {
      key: `payment:${type}:${payment.id || paymentId || orderId}`, member, source: 'payment', type,
      name, mobile: memberMobile, membershipId,
      district: text(member?.district || member?.districtCode), assembly: text(member?.assemblyConstituency),
      amount: Number(payment.amount || (type === 'new_memberships' ? 200 : 100)),
      status: normalizedStatus === 'successful' && !workflowComplete ? 'processing' : normalizedStatus,
      rawStatus, orderId, paymentId, transactionId,
      date: parseDate(payment.paymentTime) || parseDate(payment.paymentDate),
      expiryDate: member?.expiryDate, approved
    };
  };

  const rows = useMemo(() => {
    const paymentRows = payments.flatMap(payment => {
      const rawType = text(payment.paymentType).toLowerCase();
      const amount = Number(payment.amount || 0);
      const type: ReportType | null = rawType.includes('renew') || amount === 100
        ? 'renewals'
        : /new|registration|membership/.test(rawType) || amount === 200
          ? 'new_memberships'
          : null;
      return type ? [paymentRow(payment, type)] : [];
    });
    const paymentIds = new Set(paymentRows.flatMap(row => [row.paymentId, row.transactionId, row.orderId].filter(Boolean)));
    const memberRows: ReportRow[] = [];
    members.forEach(member => {
      const registration = memberRow(member, 'new_memberships');
      if (![registration.paymentId, registration.transactionId, registration.orderId].some(id => id && paymentIds.has(id))) memberRows.push(registration);
      if (renewalDate(member)) {
        const renewal = memberRow(member, 'renewals');
        if (![renewal.paymentId, renewal.transactionId, renewal.orderId].some(id => id && paymentIds.has(id))) memberRows.push(renewal);
      }
    });
    return [...paymentRows, ...memberRows];
  }, [members, payments]);

  const selectedDateMatches = (date: Date | null) => {
    if (!date) return false;
    const key = dateKey(date);
    if (dateFilter === 'today') return key === today;
    if (dateFilter === 'yesterday') return key === yesterday;
    if (dateFilter === 'custom_date') return key === customDate;
    if (!fromDate || !toDate) return false;
    return key >= (fromDate <= toDate ? fromDate : toDate) && key <= (fromDate <= toDate ? toDate : fromDate);
  };
  const districtName = (code: string) => DISTRICTS.find(item => item.code === code)?.name || code || '-';
  const filteredRows = rows.filter(row => {
    if (row.type !== reportType || !selectedDateMatches(row.date)) return false;
    if (district !== 'all' && row.district !== district && districtName(row.district) !== district) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    return !query || [row.name, row.mobile, row.membershipId, row.orderId, row.paymentId, row.transactionId]
      .some(value => value.toLowerCase().includes(query));
  }).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const dailySummary = (type: ReportType, day: string) => {
    const dayRows = rows.filter(row => row.type === type && row.date && dateKey(row.date) === day);
    const successfulRows = dayRows.filter(row => row.status === 'successful');
    return {
      total: dayRows.length,
      successful: successfulRows.length,
      successfulAmount: successfulRows.reduce((sum, row) => sum + row.amount, 0)
    };
  };
  const statusLabel = (status: PaymentStatus) => ({
    successful: 'Paid / Successful', processing: 'Payment Processing / Verification Pending',
    pending: 'Pending', failed: 'Failed'
  }[status]);
  const statusStyle = (status: PaymentStatus) => ({
    successful: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    processing: 'bg-blue-100 text-blue-950 border-blue-300',
    pending: 'bg-amber-100 text-amber-950 border-amber-300',
    failed: 'bg-red-100 text-red-950 border-red-300'
  }[status]);
  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
  const formatTime = (date: Date | null) => date ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
  const formatExpiry = (value: unknown) => { const parsed = parseDate(value); return parsed ? formatDate(parsed) : '-'; };
  const selectedDateLabel = dateFilter === 'today' ? 'Today' : dateFilter === 'yesterday' ? 'Yesterday' :
    dateFilter === 'custom_date' ? customDate : `${fromDate} → ${toDate}`;

  const exportCsv = () => {
    const headers = ['Name','Mobile','Member ID','Membership Type','District','Amount','Payment Status',
      'Razorpay Order ID','Razorpay Payment ID','Transaction ID','Date','Time'];
    const quote = (value: unknown) => `"${text(value || '-').replace(/"/g, '""')}"`;
    const data = filteredRows.map(row => [row.name || '-', row.mobile || '-', row.membershipId || '-',
      row.type === 'renewals' ? 'Renewal' : 'New', districtName(row.district), row.amount, statusLabel(row.status),
      row.orderId || '-', row.paymentId || '-', row.transactionId || '-', formatDate(row.date), formatTime(row.date)]
      .map(quote).join(','));
    const blob = new Blob(['\uFEFF' + [headers.map(quote).join(','), ...data].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `HCRS_${reportType}_${dateFilter}_${today}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow popups to print the report.'); return; }
    const body = filteredRows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.name || '-')}</td>
      <td>${escapeHtml(row.mobile || '-')}</td><td>${escapeHtml(row.membershipId || '-')}</td>
      <td>${escapeHtml(districtName(row.district))}</td><td>₹${row.amount}</td>
      <td>${escapeHtml(statusLabel(row.status))}</td><td>${escapeHtml(row.orderId || '-')}</td>
      <td>${escapeHtml(row.paymentId || '-')}</td><td>${escapeHtml(row.transactionId || '-')}</td>
      <td>${escapeHtml(formatDate(row.date))}<br>${escapeHtml(formatTime(row.date))}</td></tr>`).join('');
    printWindow.document.write(`<!doctype html><html><head><title>HCRS Report</title><style>
      @page{size:A4 landscape;margin:9mm}body{font:10px Arial;color:#0f172a}h1{font-size:17px;margin:0 0 5px}.meta{margin-bottom:10px;color:#334155}
      table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #94a3b8;padding:5px;vertical-align:top;overflow-wrap:anywhere}
      th{background:#e2e8f0;text-align:left}tr:nth-child(even){background:#f8fafc}</style></head>
      <body onload="window.print()"><h1>HCRS ${reportType === 'renewals' ? 'Renewals' : 'New Memberships'} Report</h1>
      <div class="meta">Date: ${escapeHtml(selectedDateLabel)} | District: ${escapeHtml(district === 'all' ? 'All' : district)}
      | Payment Status: ${escapeHtml(statusFilter)} | Search: ${escapeHtml(search || '-')} | Records: ${filteredRows.length}</div>
      <table><thead><tr><th>#</th><th>Name</th><th>Mobile</th><th>Member ID</th><th>District</th><th>Amount</th>
      <th>Payment Status</th><th>Order ID</th><th>Payment ID</th><th>Transaction ID</th><th>Date / Time</th></tr></thead>
      <tbody>${body || '<tr><td colspan="11" style="text-align:center">No records found for the selected filters.</td></tr>'}</tbody></table></body></html>`);
    printWindow.document.close();
  };

  const Metric = ({ label, summary, fee, dark = false }: { label: string; summary: ReturnType<typeof dailySummary>; fee: number; dark?: boolean }) =>
    <Card className={dark ? 'bg-[#0b1730] border-2 border-slate-600' : 'bg-white border-2 border-slate-200'}>
      <CardContent className="p-4 min-h-32 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[11px] font-black uppercase ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{label}</span>
          <Badge className={dark ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'}>₹{fee}</Badge>
        </div><strong className={`text-3xl ${dark ? 'text-white' : 'text-slate-950'}`}>{summary.total}</strong>
        <span className={`text-xs font-extrabold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
          Successful {summary.successful} · ₹{summary.successfulAmount}
        </span>
      </CardContent>
    </Card>;

  return <div className="space-y-6">
    <DuplicateSerialDryRunReport members={members} claims={claims} canApply={isSuperAdmin} />
    <Card className="border-2 border-purple-300 bg-white"><CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-black text-slate-950">Claim Ownership Mismatch Audit — All Members</h3><p className="text-xs font-bold text-slate-600">Read-only. Cross-checks Claim UID, mobile and Member ID. Firebase data is not changed.</p></div><Button onClick={runClaimMismatchAudit} disabled={claimMismatchLoading} className="bg-purple-700 text-white hover:bg-purple-800"><ShieldAlert className="w-4 h-4 mr-2"/>{claimMismatchLoading?'Scanning…':'Find Claim Mismatches'}</Button></div>
      {claimMismatchError&&<div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">{claimMismatchError}</div>}
      {claimMismatchScanned&&!claimMismatchLoading&&!claimMismatchError&&claimMismatchRows.length===0&&<div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-black text-emerald-900">No ownership mismatches found.</div>}
      {claimMismatchRows.length>0&&<><div className="font-black text-red-800">Problems found: {claimMismatchRows.length}</div><div className="overflow-x-auto"><table className="w-full min-w-[1400px] text-xs text-left"><thead className="bg-slate-200"><tr>{['Claim Name','Claim Mobile','Claim Member ID','Relation','Claim UID','UID Owner','Owner Mobile','Owner Member ID','Problem','Claim ID'].map(x=><th key={x} className="p-2 font-black">{x}</th>)}</tr></thead><tbody>{claimMismatchRows.map(row=><tr key={row.claimId} className="border-t"><td className="p-2 font-bold">{row.claimName||'-'}</td><td className="p-2">{row.claimMobile||'-'}</td><td className="p-2 font-mono">{row.claimMemberId||'-'}</td><td className="p-2">{row.relation||'-'}</td><td className="p-2 font-mono break-all">{row.claimUid||'-'}</td><td className="p-2 font-bold">{row.uidOwnerName||'-'}</td><td className="p-2">{row.uidOwnerMobile||'-'}</td><td className="p-2 font-mono">{row.uidOwnerMemberId||'-'}</td><td className="p-2"><Badge className="bg-red-100 text-red-950 whitespace-normal">{(row.problems||[]).join(' · ')}</Badge></td><td className="p-2 font-mono break-all">{row.claimId}</td></tr>)}</tbody></table></div></>}
    </CardContent></Card>

    <Card className="border-2 border-orange-300 bg-white"><CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-black text-slate-950">Captured Payment Exceptions — All Members</h3><p className="text-xs font-bold text-slate-600">Read-only: finds captured Razorpay payments with missing HCRS records or failed membership activation.</p></div>
      <div className="flex items-end gap-2"><label className="text-xs font-black text-slate-700">Date<Input type="date" value={exceptionDate} onChange={e=>setExceptionDate(e.target.value)} className="mt-1 bg-white text-slate-950 [color-scheme:light]"/></label><Button onClick={runPaymentExceptions} disabled={exceptionLoading} className="bg-orange-600 text-white hover:bg-orange-700">{exceptionLoading?'Checking…':'Find Payment Problems'}</Button></div></div>
      {exceptionError&&<div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">{exceptionError}</div>}
      {!exceptionLoading&&!exceptionError&&exceptionRows.length===0&&<p className="text-xs font-bold text-slate-500">Select a date and press Find Payment Problems.</p>}
      {exceptionRows.length>0&&<><div className="font-black text-red-800">Problems found: {exceptionRows.length}</div><div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-xs text-left"><thead className="bg-slate-200"><tr>{['Time','Name','Mobile','Member ID','Amount','Type','HCRS Record','Member Status','Expiry','Problem','Payment ID'].map(x=><th key={x} className="p-2 font-black">{x}</th>)}</tr></thead><tbody>{exceptionRows.map(row=><tr key={row.paymentId} className="border-t"><td className="p-2">{row.createdAt?new Date(row.createdAt).toLocaleString('en-IN'):'-'}</td><td className="p-2 font-bold">{row.memberName||'-'}</td><td className="p-2">{row.mobile||'-'}</td><td className="p-2 font-mono">{row.membershipId||'-'}</td><td className="p-2 font-black">₹{row.amount}</td><td className="p-2">{row.paymentType||'-'}</td><td className="p-2">{row.hcrsPaymentRecorded?'Saved':'Missing'}</td><td className="p-2">{row.memberStatus||'-'}{row.renewalPending?' · pending':''}</td><td className="p-2">{row.expiryDate?new Date(row.expiryDate).toLocaleDateString('en-IN'):'-'}</td><td className="p-2"><Badge className="bg-red-100 text-red-950">{row.result}</Badge></td><td className="p-2 font-mono break-all"><div>{row.paymentId}</div><div className="mt-2 flex flex-wrap gap-1"><Button size="sm" variant="outline" disabled={recoveryBusy===row.paymentId} onClick={()=>paymentRecovery(row,'verify')}>{recoveryBusy===row.paymentId?'Checking…':'Verify Details'}</Button>{row.result!=='Captured — Member not resolved'&&<Button size="sm" disabled={!recoveryVerified[row.paymentId]||recoveryBusy===row.paymentId} onClick={()=>paymentRecovery(row,'repair')} className="bg-emerald-700 text-white hover:bg-emerald-800">Repair</Button>}</div>{recoveryMessage[row.paymentId]&&<div className={`mt-1 text-[11px] font-bold ${recoveryVerified[row.paymentId]?'text-emerald-800':'text-red-700'}`}>{recoveryMessage[row.paymentId]}</div>}</td></tr>)}</tbody></table></div></>}
    </CardContent></Card>
    <Card className="border-2 border-blue-200 bg-white"><CardContent className="p-4 space-y-3">
      <div><h3 className="font-black text-slate-950">Payment Reconciliation — Razorpay ↔ HCRS</h3><p className="text-xs font-bold text-slate-600">Read-only check. Confirms Razorpay payment status, HCRS payment record and member renewal status.</p></div>
      <div className="grid sm:grid-cols-[1fr_180px_auto] gap-2 items-end">
        <label className="text-xs font-black text-slate-700">Mobile Number<Input type="tel" inputMode="numeric" autoComplete="off" value={reconMobile} onChange={e=>setReconMobile(e.target.value)} placeholder="10-digit mobile" className="mt-1 bg-white text-slate-950" /></label>
        <label className="text-xs font-black text-slate-700">Payment Date<Input type="date" value={reconDate} onChange={e=>setReconDate(e.target.value)} className="mt-1 bg-white text-slate-950 [color-scheme:light]" /></label>
        <Button onClick={runPaymentReconciliation} disabled={reconLoading || !reconDate} className="bg-blue-700 text-white hover:bg-blue-800"><Search className="w-4 h-4 mr-2"/>{reconLoading ? 'Checking…' : 'Check Payment'}</Button>
      </div>
      {reconError && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">{reconError}</div>}
      {!reconLoading && !reconError && reconRows.length === 0 && reconMobile.length === 10 && <p className="text-xs font-bold text-slate-500">Press Check Payment to search Razorpay and HCRS records for this date.</p>}
      {reconRows.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-xs text-left"><thead className="bg-slate-200"><tr>{['Time','Member','Member ID','Amount','Razorpay','HCRS Record','Member Status','Expiry','Result','Payment ID'].map(x=><th key={x} className="p-2 font-black">{x}</th>)}</tr></thead><tbody>{reconRows.map(row=><tr key={row.paymentId} className="border-t">
        <td className="p-2">{row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '-'}</td><td className="p-2 font-bold">{row.memberName||'-'}</td><td className="p-2 font-mono">{row.membershipId||'-'}</td><td className="p-2 font-black">₹{row.amount}</td>
        <td className="p-2"><Badge className={row.razorpayStatus==='captured'?'bg-emerald-100 text-emerald-950':'bg-amber-100 text-amber-950'}>{row.razorpayStatus||'-'}</Badge></td>
        <td className="p-2">{row.hcrsPaymentRecorded ? 'Saved' : 'Missing'}</td><td className="p-2">{row.memberStatus||'-'}{row.renewalPending?' · renewal pending':''}</td><td className="p-2">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('en-IN') : '-'}</td>
        <td className="p-2"><Badge className={row.reconciliationStatus.includes('active')?'bg-emerald-100 text-emerald-950':row.reconciliationStatus.includes('mismatch')||row.reconciliationStatus.includes('missing')?'bg-red-100 text-red-950':'bg-amber-100 text-amber-950'}>{row.reconciliationStatus}</Badge></td><td className="p-2 font-mono break-all">{row.paymentId}</td>
      </tr>)}</tbody></table></div>}
    </CardContent></Card>

    <Card className="border-2 border-red-200 bg-white"><CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-black text-slate-950">Security Audit — Date-wise</h3><p className="text-xs font-bold text-slate-600">Read-only: Firebase data is not changed or deleted.</p></div>
      <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-black text-slate-700">Select Date<Input type="date" value={auditDate} onChange={e=>setAuditDate(e.target.value)} className="mt-1 bg-white text-slate-950 [color-scheme:light]" /></label><Button onClick={runSecurityAudit} disabled={auditLoading || !auditDate} className="bg-red-700 text-white hover:bg-red-800"><ShieldAlert className="w-4 h-4 mr-2"/>{auditLoading ? 'Checking…' : 'Check Selected Date'}</Button></div></div>
      {auditError && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">{auditError}</div>}
      {auditRows.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs text-left"><thead className="bg-slate-200"><tr>{['Time','Mobile','Name','Member ID','Auth Email','Result','Reason'].map(x=><th key={x} className="p-2 font-black">{x}</th>)}</tr></thead><tbody>{auditRows.map(row=><tr key={row.uid} className="border-t"><td className="p-2">{new Date(row.authCreatedAt).toLocaleString('en-IN')}</td><td className="p-2 font-bold">{row.mobile||'-'}</td><td className="p-2">{row.name||'-'}</td><td className="p-2 font-mono">{row.membershipId||'-'}</td><td className="p-2 font-mono">{row.authEmail||'-'}</td><td className="p-2"><Badge className={row.classification === 'Likely unauthorized fallback' ? 'bg-red-100 text-red-950' : row.classification.startsWith('Legitimate') ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'}>{row.classification}</Badge></td><td className="p-2">{row.reason}</td></tr>)}</tbody></table></div>}
      {!auditLoading && !auditError && auditRows.length === 0 && <p className="text-xs font-bold text-slate-500">Select a date and press Check Selected Date to run the audit.</p>}
    </CardContent></Card>
    <JanamailAdminReport />\n    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="New Reg Today" summary={dailySummary('new_memberships', today)} fee={200} />
      <Metric label="New Reg Yesterday" summary={dailySummary('new_memberships', yesterday)} fee={200} dark />
      <Metric label="Renewals Today" summary={dailySummary('renewals', today)} fee={100} />
      <Metric label="Renewals Yesterday" summary={dailySummary('renewals', yesterday)} fee={100} dark />
    </div>
    <Card className="overflow-hidden border-2 border-slate-300 bg-white text-slate-950 shadow-sm">
      <div className="bg-[#071126] p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-2 rounded-xl bg-[#132044] p-2">
          <Button onClick={() => setReportType('new_memberships')} className={reportType === 'new_memberships' ? 'bg-blue-700 text-white' : 'bg-transparent text-slate-200 hover:bg-slate-800'}>New Memberships Report</Button>
          <Button onClick={() => setReportType('renewals')} className={reportType === 'renewals' ? 'bg-orange-600 text-white' : 'bg-transparent text-slate-200 hover:bg-slate-800'}><RefreshCw className="w-4 h-4 mr-2" />Renewals Report</Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Button variant="outline" onClick={printReport} className="bg-white text-slate-950 border-white hover:bg-slate-100"><Printer className="w-4 h-4 mr-2" />Print Report (A4)</Button>
          <Button onClick={exportCsv} className="bg-emerald-600 text-white hover:bg-emerald-700"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
        </div>
        <div className="border-t border-slate-500 pt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([['today','Today'],['yesterday','Yesterday'],['custom_date','Custom Date'],['date_range','Date Range']] as [DateFilter,string][]).map(([value,label]) =>
              <Button key={value} size="sm" variant="outline" onClick={() => setDateFilter(value)}
                className={dateFilter === value ? 'bg-blue-700 text-white border-blue-500 hover:bg-blue-800' : 'bg-white text-slate-950 border-slate-300 hover:bg-slate-100'}>
                <Calendar className="w-3.5 h-3.5 mr-1" />{label}</Button>)}
          </div>
          {dateFilter === 'custom_date' && <label className="block text-xs font-bold text-white">Select Date
            <Input type="date" value={customDate} onChange={event => setCustomDate(event.target.value)} className="mt-1 bg-white text-slate-950 [color-scheme:light]" /></label>}
          {dateFilter === 'date_range' && <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-white">From Date<Input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="mt-1 bg-white text-slate-950 [color-scheme:light]" /></label>
            <label className="text-xs font-bold text-white">To Date<Input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="mt-1 bg-white text-slate-950 [color-scheme:light]" /></label>
          </div>}
          <div className="grid sm:grid-cols-2 gap-2">
            <select value={district} onChange={event => setDistrict(event.target.value)} disabled={!isSuperAdmin && Boolean(userDistrict)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950">
              <option value="all">All Districts</option>{DISTRICTS.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950">
              <option value="all">All Payment Statuses</option><option value="successful">Successful</option>
              <option value="processing">Payment Processing / Verification Pending</option><option value="pending">Pending</option><option value="failed">Failed</option>
            </select>
          </div>
          <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
            <Input value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Search name, mobile, Member ID, Order/Payment ID..." className="pl-10 bg-white text-slate-950 placeholder:text-slate-600" /></div>
        </div>
      </div>
      <div className="p-4 bg-slate-100 border-b-2 border-slate-300 flex flex-wrap justify-between items-center gap-2">
        <h3 className="font-black text-slate-950">{reportType === 'renewals' ? 'Renewals' : 'New Memberships'} Report ({filteredRows.length} records)</h3>
        <div className="flex gap-2"><Badge className="bg-slate-900 text-white">{selectedDateLabel}</Badge>
          <Badge className="bg-blue-100 text-blue-950 border border-blue-300">Filtered: {filteredRows.length}</Badge></div>
      </div>
      {filteredRows.length === 0 ? <div className="p-12 text-center text-slate-800 font-bold">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />No records found for the selected filters.</div> : <>
        <div className="md:hidden divide-y-2 divide-slate-200">{filteredRows.map((row, index) =>
          <article key={row.key} className="p-4 space-y-3 bg-white text-slate-950">
            <div className="flex justify-between items-start gap-2"><div className="min-w-0">
              <p className="text-xs font-black text-blue-900 break-all">#{index + 1} · {row.membershipId || '-'}</p>
              <p className="font-black break-words">{row.name || '-'}</p><p className="text-sm font-bold text-slate-800">{row.mobile || '-'}</p>
            </div><Badge className={`shrink-0 max-w-[48%] whitespace-normal text-center border ${statusStyle(row.status)}`}>{statusLabel(row.status)}</Badge></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Detail label="Membership Type" value={row.type === 'renewals' ? 'Renewal' : 'New'} /><Detail label="Amount" value={`₹${row.amount}`} />
              <Detail label="District" value={districtName(row.district)} /><Detail label="Date / Time" value={`${formatDate(row.date)} · ${formatTime(row.date)}`} />
              <Detail wide label="Razorpay Order ID" value={row.orderId || '-'} mono /><Detail wide label="Razorpay Payment ID" value={row.paymentId || '-'} mono />
              <Detail wide label="Transaction ID" value={row.transactionId || '-'} mono />{row.type === 'renewals' && <Detail wide label="New Expiry" value={formatExpiry(row.expiryDate)} />}
            </div>
            {row.member && <div className="flex justify-end gap-2">
              {!row.approved && row.source === 'member' && <Button size="sm" disabled={approvingUid === row.member.uid}
                onClick={async () => { setApprovingUid(row.member!.uid); try { await onApprove(row.member!.uid); } finally { setApprovingUid(null); } }}>Approve</Button>}
              <Button size="sm" variant="outline" className="bg-white text-slate-950 border-slate-400" onClick={() => onViewDetails(row.member!)}>Details</Button>
            </div>}
          </article>)}</div>
        <div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[1500px] text-xs text-left text-slate-950">
          <thead className="bg-slate-200"><tr>{['#','Name','Mobile','Member ID','Type','District','Amount','Payment Status','Order ID','Payment ID','Transaction ID','Date','Time','Actions']
            .map(label => <th key={label} className="p-3 font-black">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-200">{filteredRows.map((row,index) => <tr key={row.key} className="hover:bg-slate-50">
            <td className="p-3">{index+1}</td><td className="p-3 font-black">{row.name || '-'}</td><td className="p-3 font-bold">{row.mobile || '-'}</td>
            <td className="p-3 font-mono font-bold">{row.membershipId || '-'}</td><td className="p-3">{row.type === 'renewals' ? 'Renewal' : 'New'}</td>
            <td className="p-3">{districtName(row.district)}</td><td className="p-3 font-black">₹{row.amount}</td>
            <td className="p-3"><Badge className={`border ${statusStyle(row.status)}`}>{statusLabel(row.status)}</Badge></td>
            <IdCell value={row.orderId} /><IdCell value={row.paymentId} /><IdCell value={row.transactionId} />
            <td className="p-3">{formatDate(row.date)}</td><td className="p-3">{formatTime(row.date)}</td>
            <td className="p-3">{row.member ? <Button size="sm" variant="outline" onClick={() => onViewDetails(row.member!)}>Details</Button> : '-'}</td>
          </tr>)}</tbody></table></div>
      </>}
      {statusFilter === 'processing' && <div className="m-4 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm font-bold text-blue-950 flex gap-2">
        <ShieldAlert className="w-5 h-5 shrink-0" />These records require verification. They are not included in successful payment totals and should not automatically be asked to pay again.</div>}
    </Card>
  </div>;
}

function Detail({ label, value, wide = false, mono = false }: { label: string; value: string; wide?: boolean; mono?: boolean }) {
  return <div className={`${wide ? 'col-span-2' : ''} min-w-0 rounded-lg border border-slate-200 bg-slate-100 p-2`}>
    <span className="block font-bold text-slate-700">{label}</span>
    <strong className={`${mono ? 'font-mono break-all select-all' : 'break-words'} text-slate-950`}>{value}</strong></div>;
}
function IdCell({ value }: { value: string }) {
  return <td className="p-3 font-mono break-all select-all max-w-52 text-slate-900">{value || '-'}</td>;
}
