import { PaymentReceipt, UserProfile } from '../types';

export const formatReceiptDate = (value: any): string => {
  if (!value) return '-';
  try {
    const date = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toISOString().split('T')[0];
  } catch {
    return '-';
  }
};

export const buildRegistrationReceipt = (member: UserProfile): PaymentReceipt => {
  const isLifeMember = member.membership_type === 'LIFE_MEMBER' || member.membershipType === 'Life';
  const receiptNo = (member as any).receiptNumber || member.paymentId || member.transactionId ||
    `HCRS-REG-${String(member.serialNo || 1000).padStart(4, '0')}`;
  const amount = Number(member.paymentAmount || (isLifeMember ? 300 : 200));
  const paid = Boolean(
    member.isPaid ||
    member.isApproved ||
    member.status === 'active' ||
    String(member.paymentStatus || '').toLowerCase().includes('verified')
  );

  return {
    id: `reg-${member.uid}`,
    receiptNo,
    receiptType: isLifeMember ? 'Life Membership' : 'Membership Fee',
    receiptLabel: isLifeMember ? 'Life Membership Receipt' : 'Membership Registration Receipt',
    amount,
    status: paid ? 'Paid' : 'Pending Verification',
    paymentDate: formatReceiptDate(member.paymentDate || member.registrationDate),
    createdAt: member.registrationDate,
    transactionId: member.transactionId || member.paymentId || '',
    paymentId: member.paymentId || '',
    orderId: member.orderId || '',
    paymentTime: member.paymentTime || '',
    paymentStatus: member.paymentStatus || (paid ? 'Paid' : 'Pending Verification')
  };
};

const escapeHtml = (value: unknown): string => String(value ?? '-')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const printA4Receipts = (
  entries: Array<{ member: UserProfile; receipt: PaymentReceipt }>,
  title = 'HCRS Membership Receipts'
): boolean => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const pages = entries.map(({ member, receipt }) => {
    const transactionId = receipt.transactionId || '-';
    const paymentId = receipt.paymentId || '-';
    const orderId = receipt.orderId || '-';
    const paymentTime = receipt.paymentTime || '-';
    return `
      <section class="receipt-page">
        <header>
          <h1>HIGHRICH COMMUNITY REVIVAL SOCIETY</h1>
          <p>Official Membership Payment Receipt / ഔദ്യോഗിക പേയ്‌മെന്റ് രസീത്</p>
        </header>
        <div class="receipt-title">${escapeHtml(receipt.receiptLabel)}</div>
        <div class="grid">
          <div><label>Receipt Number</label><strong>${escapeHtml(receipt.receiptNo)}</strong></div>
          <div><label>Payment / Joining Date</label><strong>${escapeHtml(receipt.paymentDate)}</strong></div>
          <div><label>Member Name</label><strong>${escapeHtml(member.name || '-')}</strong></div>
          <div><label>Mobile Number</label><strong>${escapeHtml(member.mobile || '-')}</strong></div>
          <div><label>Membership ID</label><strong>${escapeHtml(member.membershipId || '-')}</strong></div>
          <div><label>District</label><strong>${escapeHtml(member.district || '-')}</strong></div>
          <div><label>Amount</label><strong>₹${escapeHtml(receipt.amount)}.00</strong></div>
          <div><label>Status</label><strong>${escapeHtml(receipt.status)}</strong></div>
        </div>
        <h2>Transaction Details</h2>
        <div class="transaction-grid">
          <div><label>Razorpay Order ID</label><span>${escapeHtml(orderId)}</span></div>
          <div><label>Razorpay Payment ID</label><span>${escapeHtml(paymentId)}</span></div>
          <div><label>Transaction ID</label><span>${escapeHtml(transactionId)}</span></div>
          <div><label>Payment Time</label><span>${escapeHtml(paymentTime)}</span></div>
        </div>
        <footer><b>HCRS Accounts Division</b><span>System-generated receipt</span></footer>
      </section>`;
  }).join('');

  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: white; }
      .receipt-page { width: 100%; min-height: 273mm; padding: 14mm; border: 2px solid #12356b; page-break-after: always; break-after: page; position: relative; }
      .receipt-page:last-child { page-break-after: auto; break-after: auto; }
      header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 12px; }
      h1 { margin: 0; color: #12356b; font-size: 22px; }
      header p { margin: 7px 0 0; font-weight: 700; font-size: 12px; }
      .receipt-title { margin: 22px 0; padding: 10px; color: white; background: #12356b; text-align: center; font-weight: 800; letter-spacing: .05em; }
      .grid, .transaction-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
      .grid div, .transaction-grid div { border-bottom: 1px solid #cbd5e1; padding: 8px 0; min-width: 0; }
      label { display: block; color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; }
      strong, span { font-size: 13px; overflow-wrap: anywhere; }
      h2 { margin: 28px 0 8px; font-size: 13px; color: #12356b; text-transform: uppercase; }
      footer { position: absolute; left: 14mm; right: 14mm; bottom: 14mm; border-top: 1px solid #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; }
      @media screen { body { background: #e2e8f0; } .receipt-page { max-width: 210mm; margin: 12px auto; background: white; } }
      @media print { .receipt-page { border-color: #12356b; } }
    </style></head><body>${pages}<script>window.onload=()=>{window.print();};<\/script></body></html>`);
  printWindow.document.close();
  return true;
};
