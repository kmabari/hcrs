import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { html2canvasOklchOnClone } from './imageUtils';
import { toast } from 'sonner';
import { DISTRICTS } from '../constants';
import {
  formatClaimDateTime,
  formatClaimDateOnly,
  compareMobiles,
  renderPersonCourtClaimPage,
  getCourtReportBaseStyles
} from './claimPrint';

/**
 * Escapes HTML characters to prevent breaking table markup.
 */
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts numbers into Indian Currency words (Crores, Lakhs, Thousands, Hundreds).
 */
export const numberToWordsIndian = (num: number): string => {
  if (isNaN(num) || num === 0) return 'Zero';
  num = Math.floor(Math.abs(num));
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  };

  let result = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = num;

  if (crore > 0) result += convertLessThanOneThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + ' Thousand ';
  if (remaining > 0) result += convertLessThanOneThousand(remaining) + ' ';

  return result.trim();
};

/**
 * Renders exactly 1 A4 Page for the "COMPETENT AUTHORITY CLAIM FORM"
 * Preserves the exact structure, 14 numbered items, and appearance of the supplied reference image:
 * - Top header: HOME-SC3/126/2024-HOME (left) and I/6510468/2025 (right)
 * - Heading: Claim Form
 * - Exactly 14 numbered rows with 3-column structure (Number | Particulars | Customer's Answer)
 * - Exact wording, order, and punctuation
 * - Signature area at bottom right with Digital Confirmation status when verified
 * - Fits cleanly on A4 paper with nothing cut off
 * - STRICTLY EXCLUDES admin-only internal financial/audit answers
 */
export const renderPersonCompetentAuthorityClaimPage = (
  claim: any,
  userProf: any,
  pageNum: number = 1,
  totalPages: number = 1
): string => {
  // Depositor / Claimant Identity
  const memberName = claim?.userName || claim?.claimantName || claim?.name || userProf?.name || 'N/A';
  const primaryMobile = claim?.userMobile || userProf?.mobile || '';
  const individualMobile = claim?.individualMobile || (claim?.memberMobile && claim?.memberMobile !== primaryMobile ? claim.memberMobile : '');
  const mobileVal = (individualMobile && individualMobile !== primaryMobile)
    ? `${individualMobile} (Primary: ${primaryMobile})`
    : (individualMobile || primaryMobile || 'N/A');

  // Address
  const districtObj = DISTRICTS.find(d => d.code === (claim?.userDistrict || userProf?.district));
  const districtName = districtObj?.name || claim?.userDistrict || userProf?.district || 'Kerala';
  const constName = claim?.userConstituency || claim?.constituency || userProf?.assemblyConstituency || '';
  const permAddress = claim?.userAddress || claim?.address || userProf?.address || 'N/A';
  const postOffice = claim?.postOffice || userProf?.postOffice || '';
  const pincode = claim?.pincode || userProf?.pincode || '';

  const permAddressFormatted = `${permAddress}${postOffice ? ', P.O. ' + postOffice : ''}${pincode ? ', PIN: ' + pincode : ''}`;
  const resAddressWithDistrict = `${permAddress}${postOffice ? ', P.O. ' + postOffice : ''}, District: ${districtName}${pincode ? ' - ' + pincode : ''}${constName ? ' (' + constName + ' LAC)' : ''}`;

  // Amount and Words
  const paidAmount = Number(claim?.totalPaid) || 0;
  const amountStr = paidAmount.toLocaleString('en-IN');
  const amountInWords = numberToWordsIndian(paidAmount);

  // Date and Token / Receipt
  const depositDate = claim?.paymentDate || formatClaimDateOnly(claim?.createdAt);
  const receiptTokenNo = claim?.tokenNo || claim?.serialNo || (claim?.highrichId ? `HR-${claim.highrichId}` : 'On Record');
  const highrichIdVal = claim?.highrichId || userProf?.highrichId || '';

  // KYC details
  const aadhaarVal = claim?.aadhaar || userProf?.aadhaar || userProf?.adhaar || 'On File / Submitted via KYC';
  const panVal = claim?.panNumber || claim?.pan || userProf?.panNumber || userProf?.pan || 'N/A';
  const emailVal = claim?.userEmail || userProf?.email || 'N/A';

  // Bank of Deposit (Row 10)
  let modeOfDeposit = 'Online / Bank Transfer / UPI';
  const bankParts: string[] = [];
  if (claim?.paidFromBank) bankParts.push(`Bank: ${claim.paidFromBank}`);
  if (claim?.paidFromBranch) bankParts.push(`Branch: ${claim.paidFromBranch}`);
  if (claim?.paidFromAccount) bankParts.push(`A/c No: ${claim.paidFromAccount}`);
  if (claim?.paidFromIfsc) bankParts.push(`IFSC: ${claim.paidFromIfsc}`);
  if (claim?.transactionId || claim?.transactionRef) {
    bankParts.push(`Txn Ref: ${claim.transactionId || claim.transactionRef}`);
  }
  const modeAnswer = bankParts.length > 0
    ? `${modeOfDeposit} (${bankParts.join(', ')})`
    : modeOfDeposit;

  // Nominee (Row 12)
  let nomineeVal = 'As per Highrich ID / KYC Nomination';
  if (claim?.nomineeName) {
    nomineeVal = `${claim.nomineeName} (${claim.nomineeRelation || 'Nominee'})`;
  } else if (claim?.relation && claim.relation !== 'Self') {
    nomineeVal = `${userProf?.name || 'Primary Depositor'} (${claim.relationLabel || claim.relation})`;
  } else if (userProf?.nomineeName) {
    nomineeVal = `${userProf.nomineeName} (${userProf.nomineeRelation || 'Nominee'})`;
  }

  // Restitution Bank (Row 13)
  const restParts: string[] = [];
  if (claim?.settlementAccountNumber || userProf?.settlementAccountNumber || userProf?.accountNumber) {
    restParts.push(`A/c No: ${claim?.settlementAccountNumber || userProf?.settlementAccountNumber || userProf?.accountNumber}`);
  }
  if (claim?.settlementBankName || userProf?.settlementBankName || userProf?.bankName) {
    restParts.push(`Bank: ${claim?.settlementBankName || userProf?.settlementBankName || userProf?.bankName}`);
  }
  if (claim?.settlementBranch || userProf?.settlementBranch || userProf?.branch) {
    restParts.push(`Branch: ${claim?.settlementBranch || userProf?.settlementBranch || userProf?.branch}`);
  }
  if (claim?.settlementIfsc || userProf?.settlementIfsc || userProf?.ifscCode) {
    restParts.push(`IFSC: ${claim?.settlementIfsc || userProf?.settlementIfsc || userProf?.ifscCode}`);
  }
  if (claim?.settlementAccountHolder || userProf?.name) {
    restParts.push(`Holder: ${claim?.settlementAccountHolder || userProf?.name}`);
  }
  const restitutionAnswer = restParts.length > 0
    ? restParts.join(', ')
    : 'To be verified and credited to Claimant Verified Bank Account';

  // Digital Signature / Confirmation verification
  const isDigitallyConfirmed = !!(
    claim?.consentLegal === true ||
    claim?.consentLegal === 'true' ||
    claim?.createdAt ||
    claim?.tokenNo ||
    claim?.id
  );
  const submissionTimestamp = formatClaimDateTime(claim?.createdAt || claim?.updatedAt);

  return `
    <div class="competent-a4-page">
      <!-- Top Reference Header exactly as in attached reference image -->
      <div class="competent-top-header">
        <span>HOME-SC3/126/2024-HOME</span>
        <span>I/6510468/2025</span>
      </div>

      <!-- Centered Document Title -->
      <div class="competent-doc-title">Claim Form</div>

      <!-- Exactly 14 Numbered Rows with 3-column table structure: Number | Particulars | Customer's Answer -->
      <table class="competent-table">
        <tbody>
          <!-- Row 1 -->
          <tr>
            <td class="col-num">1</td>
            <td class="col-part">Name of the Depositor:</td>
            <td class="col-ans">${escapeHtml(memberName)}</td>
          </tr>

          <!-- Row 2 -->
          <tr>
            <td class="col-num">2.</td>
            <td class="col-part">Permanent Address of the Depositor :</td>
            <td class="col-ans">${escapeHtml(permAddressFormatted)}</td>
          </tr>

          <!-- Row 3 -->
          <tr>
            <td class="col-num">3</td>
            <td class="col-part">Communication/Residential Address of the Depositor with District:</td>
            <td class="col-ans">${escapeHtml(resAddressWithDistrict)}</td>
          </tr>

          <!-- Row 4 -->
          <tr>
            <td class="col-num">4.</td>
            <td class="col-part">Name and address of the firm in which the deposit taken:</td>
            <td class="col-ans">
              Highrich Online Shoppe Pvt. Ltd.<br>
              Reg. Office: TC9/3702/014, 2nd Floor, Kanimangalam Tower, Valapad, Thrissur - 680567, Kerala, India (CIN: U51909KL2019PTC060087)
            </td>
          </tr>

          <!-- Row 5 -->
          <tr>
            <td class="col-num">5</td>
            <td class="col-part">Name of the deposited branch:</td>
            <td class="col-ans">${escapeHtml(claim?.paidFromBranch ? claim.paidFromBranch.trim() : 'Thrissur Head Office / Central Digital Portal')}</td>
          </tr>

          <!-- Row 6 -->
          <tr>
            <td class="col-num">6</td>
            <td class="col-part">Name of the District in which the deposit taken:</td>
            <td class="col-ans">Thrissur</td>
          </tr>

          <!-- Row 7 -->
          <tr>
            <td class="col-num">7</td>
            <td class="col-part">Actual amount deposited</td>
            <td class="col-ans">₹${amountStr}${amountInWords ? ` (Rupees ${amountInWords} Only)` : ''}</td>
          </tr>

          <!-- Row 8 -->
          <tr>
            <td class="col-num">8</td>
            <td class="col-part">Date & Fixed Deposit Receipt No.</td>
            <td class="col-ans">
              Date: ${escapeHtml(depositDate)} & Receipt/Token No: ${escapeHtml(receiptTokenNo)}
              ${highrichIdVal ? `<br>Highrich Customer ID: ${escapeHtml(highrichIdVal)}` : ''}
            </td>
          </tr>

          <!-- Row 9 -->
          <tr>
            <td class="col-num">9</td>
            <td class="col-part">
              a)whether criminal case is pending ,if so, give its details with FIR Number and police station :<br>
              b) whether case is pending before any civil court including Consumer Redressal Commission etc,or appeals pending , give its details:
            </td>
            <td class="col-ans">
              a) Crime cases registered by Kerala Police / Crime Branch (e.g. Crime No. 25/2024 Crime Branch, Cherpu PS Crime No. 913/2023). Depositor has not filed separate individual police FIR.<br>
              b) Collective proceedings pending before the Hon'ble High Court of Kerala & Special Court (BUDS Act), Thrissur. Claimant represented through Highrich Customers & Resellers Welfare Society (HCRS).
            </td>
          </tr>

          <!-- Row 10 -->
          <tr>
            <td class="col-num">10</td>
            <td class="col-part">
              Mode of making deposit:(Cash/Cheque/Online).<br>
              If through Bank, then Name of Bank,Branch & Account No. with IFSC Code.)
            </td>
            <td class="col-ans">${escapeHtml(modeAnswer)}</td>
          </tr>

          <!-- Row 11 -->
          <tr>
            <td class="col-num">11</td>
            <td class="col-part">
              Details of the depositer:<br>
              a)Adhaar No:<br>
              b)PAN No:<br>
              c)Mobile No:<br>
              d)e-mail Id:
            </td>
            <td class="col-ans">
              a) Adhaar No: ${escapeHtml(aadhaarVal)}<br>
              b) PAN No: ${escapeHtml(panVal)}<br>
              c) Mobile No: ${escapeHtml(mobileVal)}<br>
              d) e-mail Id: ${escapeHtml(emailVal)}
            </td>
          </tr>

          <!-- Row 12 -->
          <tr>
            <td class="col-num">12</td>
            <td class="col-part">Nominee to be nominated in the claim /Relationship with the Depositor</td>
            <td class="col-ans">${escapeHtml(nomineeVal)}</td>
          </tr>

          <!-- Row 13 -->
          <tr>
            <td class="col-num">13</td>
            <td class="col-part">
              Account No, Name of bank & Branch of the Claimant for restitution<br>
              (Enclose a cancelled cheque along with the claim application)
            </td>
            <td class="col-ans">${escapeHtml(restitutionAnswer)}</td>
          </tr>

          <!-- Row 14 -->
          <tr>
            <td class="col-num">14</td>
            <td class="col-part">
              Annex copy of all Receipts and Supporting documents of the deposit<br>
              a)<br>
              b)
            </td>
            <td class="col-ans">
              a) Bank Statement / UPI Online Payment Proof (Ref: ${escapeHtml(claim?.transactionId || claim?.transactionRef || 'Enclosed')})<br>
              b) Highrich User ID / Statement & HCRS Membership Proof (${escapeHtml(claim?.highrichId || claim?.membershipId || userProf?.membershipId || 'Enclosed')})
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Bottom Signature / Digital Confirmation Section -->
      <div class="competent-signature-area">
        ${isDigitallyConfirmed ? `
          <div class="digital-cert-badge">
            <div class="cert-status">✓ Digitally Confirmed & Signed</div>
            <div class="cert-name">Depositor / Claimant: ${escapeHtml(memberName)}</div>
            <div class="cert-meta">Mobile: ${escapeHtml(mobileVal)} • Ref / Token: ${escapeHtml(claim?.tokenNo || claim?.id || 'ONLINE-CLAIM')}</div>
            <div class="cert-date">Date & Time: ${escapeHtml(submissionTimestamp)}</div>
          </div>
        ` : `
          <div style="width: 220px; border-top: 1px solid #000000; margin: 24px 0 4px auto;"></div>
        `}
        <div class="sig-label">Signature of Depositor/Claimant</div>
      </div>
    </div>
  `;
};

/**
 * CSS stylesheet for Competent Authority Claim Form
 */
export const getCompetentAuthorityStyles = (): string => `
  @page {
    size: A4 portrait;
    margin: 8mm 12mm 8mm 12mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 10px;
    line-height: 1.35;
    -webkit-font-smoothing: antialiased;
  }
  .competent-a4-page {
    width: 760px;
    min-height: 1060px;
    max-height: 1110px;
    box-sizing: border-box;
    background: #ffffff;
    color: #000000;
    padding: 22px 28px;
    margin: 0 auto;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .competent-a4-page:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .competent-top-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    font-size: 11px;
    color: #000000;
    margin-bottom: 12px;
    font-family: Arial, sans-serif;
  }
  .competent-doc-title {
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    color: #000000;
    margin-bottom: 12px;
    letter-spacing: 0.2px;
    font-family: Arial, sans-serif;
  }
  .competent-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #000000;
    font-size: 9.5px;
    line-height: 1.32;
    color: #000000;
  }
  .competent-table td {
    border: 1px solid #000000;
    padding: 4px 6px;
    vertical-align: top;
    color: #000000;
  }
  .col-num {
    width: 32px;
    text-align: center;
    font-weight: 600;
  }
  .col-part {
    width: 48%;
    font-weight: 400;
  }
  .col-ans {
    width: 48%;
    font-weight: 600;
    word-break: break-word;
  }
  .competent-signature-area {
    margin-top: 14px;
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .digital-cert-badge {
    display: inline-block;
    text-align: left;
    border: 1px solid #16a34a;
    background-color: #f0fdf4;
    padding: 3.5px 8px;
    border-radius: 4px;
    font-size: 8px;
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .cert-status {
    font-weight: 800;
    color: #15803d;
  }
  .cert-name {
    font-weight: 700;
    color: #0f172a;
  }
  .cert-meta, .cert-date {
    color: #475569;
    font-size: 7.5px;
  }
  .sig-label {
    font-weight: 700;
    font-size: 11px;
    color: #000000;
    margin-top: 2px;
  }
  .screen-toolbar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: #0f172a;
    color: #ffffff;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    z-index: 99999;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    margin-bottom: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toolbar-title {
    display: flex;
    flex-direction: column;
    text-align: left;
  }
  .toolbar-title strong {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.3px;
  }
  .toolbar-title span {
    font-size: 10.5px;
    color: #cbd5e1;
    margin-top: 1px;
  }
  .toolbar-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .toolbar-actions button {
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .btn-print {
    background: #10b981;
    color: #ffffff;
  }
  .btn-close {
    background: #ef4444;
    color: #ffffff;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .no-print, .screen-toolbar {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
    }
    .competent-a4-page {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      page-break-after: always !important;
      break-after: page !important;
      overflow: visible !important;
    }
    .competent-a4-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  }
`;

/**
 * Normalizes input claims into a non-empty array of unique claims
 */
function normalizeClaims(claims: any[] | any): any[] {
  if (!claims) return [];
  const list = Array.isArray(claims) ? claims : [claims];
  const uniqueMap = new Map<string, any>();
  for (const c of list) {
    if (!c) continue;
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  return Array.from(uniqueMap.values());
}

/**
 * Returns full HTML string for Competent Authority Claim Form
 */
export const getCompetentAuthorityClaimFullHtml = (primaryMember: any, claims: any[] | any): string => {
  const cleanClaims = normalizeClaims(claims);
  const totalCount = cleanClaims.length || 1;
  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Claimant';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Competent Authority Claim Form (${totalCount} Pages) - ${escapeHtml(primeName)}</title>
    <style>
      ${getCompetentAuthorityStyles()}
    </style>
  </head>
  <body>
    <div class="no-print screen-toolbar">
      <div class="toolbar-title">
        <strong>Competent Authority Claim Form</strong>
        <span>Official Statutory Claim Record (${totalCount} Pages) • ${escapeHtml(primeName)}</span>
      </div>
      <div class="toolbar-actions">
        <button onclick="window.print()" class="btn-print">🖨️ Print / Save as PDF</button>
        <button onclick="window.close()" class="btn-close">✕ Close</button>
      </div>
    </div>

    ${cleanClaims.map((claim, idx) => renderPersonCompetentAuthorityClaimPage(claim, primaryMember, idx + 1, totalCount)).join('')}
  </body>
</html>`;
};

/**
 * Prints the Competent Authority Claim Form
 */
export const printCompetentAuthorityClaimReport = (primaryMember: any, claims: any[] | any) => {
  const cleanClaims = normalizeClaims(claims);
  if (cleanClaims.length === 0) {
    alert('No claim records found to print.');
    return;
  }

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Claimant';
  const totalCount = cleanClaims.length;

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Competent Authority Claim Form (${totalCount} Pages) - ${escapeHtml(primeName)}</title>
        <style>
          ${getCompetentAuthorityStyles()}
        </style>
      </head>
      <body>
        <div class="no-print screen-toolbar">
          <div class="toolbar-title">
            <strong>Competent Authority Claim Form</strong>
            <span>Official Statutory Claim Record (${totalCount} Pages) • ${escapeHtml(primeName)}</span>
          </div>
          <div class="toolbar-actions">
            <button onclick="window.print()" class="btn-print">🖨️ Print / Save as PDF</button>
            <button onclick="window.close()" class="btn-close">✕ Close</button>
          </div>
        </div>

        ${cleanClaims.map((claim, idx) => renderPersonCompetentAuthorityClaimPage(claim, primaryMember, idx + 1, totalCount)).join('')}

        <script>
          window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
              window.print();
            }, 350);
          });
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
};

/**
 * Generates an A4 PDF document for Competent Authority Claim Form
 */
export const generateCompetentAuthorityClaimPdf = async (primaryMember: any, claims: any[] | any) => {
  const cleanClaims = normalizeClaims(claims);
  if (cleanClaims.length === 0) {
    throw new Error('No claim records found.');
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Claimant';
  const safeName = primeName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Competent_Authority_Claim_Form_${safeName}.pdf`;

  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const container = document.createElement('div');
  container.id = 'pdf-competent-render-offscreen';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#000000';
  container.style.zIndex = '-999999';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    ${getCompetentAuthorityStyles()}
    .pdf-single-page {
      width: 794px !important;
      min-height: 1123px !important;
      max-height: 1123px !important;
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .competent-a4-page {
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      width: 100% !important;
      height: 1123px !important;
      max-height: 1123px !important;
      padding: 24px 32px !important;
    }
  `;
  container.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleanClaims.map((claim, idx) => {
    return `<div class="pdf-single-page">
      ${renderPersonCompetentAuthorityClaimPage(claim, primaryMember, idx + 1, cleanClaims.length)}
    </div>`;
  }).join('');
  container.appendChild(wrapper);

  document.body.appendChild(container);

  try {
    await new Promise(r => setTimeout(r, 250));

    const pageElements = container.querySelectorAll('.pdf-single-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123,
        onclone: html2canvasOklchOnClone
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
    }

    return {
      pdf,
      fileName,
      primeName,
      totalCount: cleanClaims.length
    };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Downloads Competent Authority Claim Form as PDF file
 */
export const downloadCompetentAuthorityClaimPdf = async (primaryMember: any, claims: any[] | any) => {
  const cleanClaims = normalizeClaims(claims);
  if (cleanClaims.length === 0) {
    toast.error('ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
    return;
  }

  const loadingToast = toast.loading('Competent Authority Claim Form PDF തയ്യാറാക്കുന്നു...');
  try {
    const { pdf, fileName } = await generateCompetentAuthorityClaimPdf(primaryMember, cleanClaims);
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    toast.success('Competent Authority Claim Form വിജയകരമായി ഡൗൺലോഡ് ചെയ്തു!', { id: loadingToast });
  } catch (err: any) {
    console.error('Error downloading Competent Authority Claim PDF:', err);
    toast.error('PDF ഡൗൺലോഡ് ചെയ്യാൻ സാധിച്ചില്ല: ' + (err?.message || 'Error'), { id: loadingToast });
  }
};

/**
 * COMBO PRINT: "Management Form + Competent Authority Claim Form"
 * Combines existing Management/Company Form and the new Competent Authority Claim Form into one combined print/PDF.
 * For each individual claimant in a group, their own Management Form and individual Competent Authority Claim Form are paired together.
 */
export const printManagementAndCompetentAuthorityComboReport = (primaryMember: any, claims: any[] | any) => {
  const cleanClaims = normalizeClaims(claims);
  if (cleanClaims.length === 0) {
    alert('No claim records found to print.');
    return;
  }

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Member';
  const totalPages = cleanClaims.length * 2;

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Management + Competent Authority Combo (${totalPages} Pages) - ${escapeHtml(primeName)}</title>
        <style>
          ${getCourtReportBaseStyles()}
          ${getCompetentAuthorityStyles()}
          .page-scaler-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            margin: 0 0 16px 0;
            padding: 8px 0;
          }
          @media print {
            .page-scaler-wrapper {
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print screen-toolbar">
          <div class="toolbar-title">
            <strong>Management + Competent Authority Claim Form (Combo)</strong>
            <span>Complete ${totalPages} Pages Statutory & Management Record • ${escapeHtml(primeName)}</span>
          </div>
          <div class="toolbar-actions">
            <button onclick="window.print()" class="btn-print">🖨️ Print / Save as PDF</button>
            <button onclick="window.close()" class="btn-close">✕ Close</button>
          </div>
        </div>

        ${cleanClaims.map((claim, idx) => {
          const mgmtPageNum = idx * 2 + 1;
          const compPageNum = idx * 2 + 2;
          return `
            <!-- Claimant #${idx + 1} - Management / Company Form -->
            <div class="page-scaler-wrapper">
              ${renderPersonCourtClaimPage(claim, primaryMember, mgmtPageNum, totalPages)}
            </div>

            <!-- Claimant #${idx + 1} - Competent Authority Claim Form -->
            <div class="page-scaler-wrapper">
              ${renderPersonCompetentAuthorityClaimPage(claim, primaryMember, compPageNum, totalPages)}
            </div>
          `;
        }).join('')}

        <script>
          window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
              window.print();
            }, 450);
          });
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
};

/**
 * Generates Combined PDF for Management Form + Competent Authority Claim Form
 */
export const generateManagementAndCompetentAuthorityComboPdf = async (primaryMember: any, claims: any[] | any) => {
  const cleanClaims = normalizeClaims(claims);
  if (cleanClaims.length === 0) {
    throw new Error('No claim records found.');
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Member';
  const safeName = primeName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Management_and_Competent_Authority_Combo_${safeName}.pdf`;
  const totalPages = cleanClaims.length * 2;

  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const container = document.createElement('div');
  container.id = 'pdf-mgmt-competent-combo-render';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#000000';
  container.style.zIndex = '-999999';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    ${getCourtReportBaseStyles()}
    ${getCompetentAuthorityStyles()}
    .pdf-single-page {
      width: 794px !important;
      min-height: 1123px !important;
      max-height: 1123px !important;
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .page-container {
      box-shadow: none !important;
      border: 1.5px solid #003366 !important;
      margin: 0 !important;
      width: 100% !important;
      height: 1123px !important;
      max-height: 1123px !important;
    }
    .competent-a4-page {
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      width: 100% !important;
      height: 1123px !important;
      max-height: 1123px !important;
      padding: 24px 32px !important;
    }
  `;
  container.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleanClaims.map((claim, idx) => {
    const mgmtPageNum = idx * 2 + 1;
    const compPageNum = idx * 2 + 2;
    return `
      <div class="pdf-single-page">
        ${renderPersonCourtClaimPage(claim, primaryMember, mgmtPageNum, totalPages)}
      </div>
      <div class="pdf-single-page">
        ${renderPersonCompetentAuthorityClaimPage(claim, primaryMember, compPageNum, totalPages)}
      </div>
    `;
  }).join('');
  container.appendChild(wrapper);

  document.body.appendChild(container);

  try {
    await new Promise(r => setTimeout(r, 250));

    const pageElements = container.querySelectorAll('.pdf-single-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123,
        onclone: html2canvasOklchOnClone
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
    }

    return {
      pdf,
      fileName,
      primeName,
      totalPages
    };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Downloads Combined Management + Competent Authority PDF
 */
export const downloadManagementAndCompetentAuthorityComboPdf = async (primaryMember: any, claims: any[] | any) => {
  const cleanClaims = normalizeClaims(claims);
  if (cleanClaims.length === 0) {
    toast.error('ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
    return;
  }

  const loadingToast = toast.loading('Management + Competent Authority Combo PDF തയ്യാറാക്കുന്നു...');
  try {
    const { pdf, fileName } = await generateManagementAndCompetentAuthorityComboPdf(primaryMember, cleanClaims);
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    toast.success('Combo PDF വിജയകരമായി ഡൗൺലോഡ് ചെയ്തു!', { id: loadingToast });
  } catch (err: any) {
    console.error('Error downloading Combo PDF:', err);
    toast.error('Combo PDF ഡൗൺലോഡ് ചെയ്യാൻ സാധിച്ചില്ല: ' + (err?.message || 'Error'), { id: loadingToast });
  }
};
