import { PaymentReceipt, UserProfile } from '../types';
import { FALLBACK_LOGO_URL } from '../constants';

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

export const getReceiptMembershipCategory = (member: UserProfile): 'LIFE MEMBER' | 'ADHOC MEMBER' =>
  member.membership_type === 'LIFE_MEMBER' || member.membershipType === 'Life'
    ? 'LIFE MEMBER'
    : 'ADHOC MEMBER';

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

  const sealUrl = `${window.location.origin}/hcrs-official-seal.png`;

  const pages = entries.map(({ member, receipt }) => {
    const transactionId = receipt.transactionId || '-';
    const paymentId = receipt.paymentId || '-';
    const orderId = receipt.orderId || '-';
    const paymentTime = receipt.paymentTime || '-';
    const category = getReceiptMembershipCategory(member);
    return `
      <section class="receipt-page">
        <div class="receipt-shell">
          <header>
            <img class="logo" src="${escapeHtml(FALLBACK_LOGO_URL)}" alt="HCRS Logo" />
            <h1>HIGHRICH COMMUNITY REVIVAL<br/>SOCIETY</h1>
            <p class="reg">REG. NO: TSR/TC/93/2025 &nbsp;|&nbsp; WWW.HCRS.IN</p>
            <p class="address">Central Accounts Division, Kerala</p>
          </header>
          <div class="receipt-title">OFFICIAL PAYMENT RECEIPT<br/><small>(പേയ്‌മെന്റ് രസീത്)</small></div>
          <div class="grid member-grid">
            <div><label>Receipt Number</label><strong>${escapeHtml(receipt.receiptNo)}</strong></div>
            <div><label>Date of Payment / Joining</label><strong>${escapeHtml(receipt.paymentDate)}</strong></div>
            <div><label>Received From</label><strong>${escapeHtml(member.name || '-')}</strong></div>
            <div><label>Membership ID</label><strong>${escapeHtml(member.membershipId || '-')}</strong></div>
            <div><label>Mobile Number</label><strong>${escapeHtml(member.mobile || '-')}</strong></div>
            <div><label>District / Assembly</label><strong>${escapeHtml(member.district || '-')} / ${escapeHtml(member.assemblyConstituency || '-')}</strong></div>
            <div><label>Membership Category</label><strong class="category">${category}</strong></div>
            <div><label>Payment Status</label><strong>${escapeHtml(receipt.status)}</strong></div>
          </div>
          <div class="payment-box">
            <div><label>Purpose of Payment</label><strong>${escapeHtml(receipt.receiptLabel)}</strong></div>
            <div class="amount"><label>Amount</label><strong>₹${escapeHtml(receipt.amount)}.00</strong></div>
          </div>
          <div class="total"><span>TOTAL PAID</span><strong>₹${escapeHtml(receipt.amount)}.00</strong></div>
          <h2>Transaction Details</h2>
          <div class="transaction-grid">
            <div><label>Razorpay Order ID</label><span>${escapeHtml(orderId)}</span></div>
            <div><label>Razorpay Payment ID</label><span>${escapeHtml(paymentId)}</span></div>
            <div><label>Transaction ID</label><span>${escapeHtml(transactionId)}</span></div>
            <div><label>Payment Time</label><span>${escapeHtml(paymentTime)}</span></div>
          </div>
          <footer>
            <div class="verified">✓ &nbsp; SECURED &amp; VERIFIED</div>
            <div class="seal-block"><img src="${escapeHtml(sealUrl)}" alt="Official HCRS Seal"/><b>Authorized Signatory</b></div>
          </footer>
        </div>
      </section>`;
  }).join('');

  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #182238; background: white; }
      .receipt-page { width: 100%; min-height: 273mm; padding: 6mm; page-break-after: always; break-after: page; position: relative; }
      .receipt-page:last-child { page-break-after: auto; break-after: auto; }
      .receipt-shell { min-height: 260mm; border: 2px dashed #cbd5e1; border-radius: 18px; padding: 10mm; position: relative; }
      header { text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
      .logo { width: 58px; height: 58px; object-fit: contain; margin-bottom: 6px; }
      h1 { margin: 0; color: #111827; font-size: 20px; line-height: 1.05; }
      header p { margin: 6px 0 0; font-weight: 700; }
      .reg { color: #94a3b8; letter-spacing: .12em; font-size: 9px; }
      .address { color: #64748b; font-size: 10px; }
      .receipt-title { margin: 16px 0; padding: 9px; border-radius: 18px; color: white; background: #020617; text-align: center; font-weight: 900; letter-spacing: .05em; font-size: 13px; }
      .receipt-title small { font-size: 10px; }
      .grid, .transaction-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; }
      .grid div, .transaction-grid div { padding: 5px 0; min-width: 0; }
      label { display: block; color: #64748b; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
      strong, span { font-size: 11px; overflow-wrap: anywhere; }
      .category { color: #075985; }
      .payment-box { margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 14px 14px 0 0; padding: 10px 12px; display: grid; grid-template-columns: 1fr auto; gap: 20px; }
      .amount { text-align: right; }
      .amount strong, .total strong { font-size: 14px; color: #b58a15; }
      .total { border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 14px 14px; padding: 9px 12px; display: flex; justify-content: flex-end; gap: 25px; align-items: center; font-size: 10px; font-weight: 900; }
      h2 { margin: 14px 0 5px; font-size: 10px; color: #334155; text-transform: uppercase; }
      .transaction-grid { border: 1px solid #e2e8f0; border-radius: 14px; padding: 8px 12px; }
      footer { position: absolute; left: 10mm; right: 10mm; bottom: 8mm; border-top: 1px solid #e2e8f0; padding-top: 9px; display: flex; justify-content: space-between; align-items: flex-end; }
      .verified { color: #059669; font-size: 10px; font-weight: 900; }
      .seal-block { display: flex; flex-direction: column; align-items: center; font-size: 8px; color: #475569; }
      .seal-block img { width: 62px; height: 62px; object-fit: contain; mix-blend-mode: multiply; margin-bottom: 2px; }
      @media screen { body { background: #e2e8f0; } .receipt-page { max-width: 210mm; margin: 12px auto; background: white; } }
      @media print { .receipt-page { background: white; } }
    </style></head><body>${pages}<script>window.onload=()=>{window.print();};<\/script></body></html>`);
  printWindow.document.close();
  return true;
};
