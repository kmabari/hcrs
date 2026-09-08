import { DISTRICTS, CONSTITUENCIES } from '../constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { html2canvasOklchOnClone } from './imageUtils';
import { sanitizeMemberAddress } from './utils';
import { toast } from 'sonner';

export const formatClaimDateTime = (ts: any): string => {
  if (!ts) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  try {
    let d: Date;
    if (typeof ts.toDate === 'function') {
      d = ts.toDate();
    } else if (ts.seconds) {
      d = new Date(ts.seconds * 1000);
    } else {
      d = new Date(ts);
    }
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(ts);
  }
};

export const formatClaimDateOnly = (ts: any): string => {
  if (!ts) return '';
  try {
    let d: Date;
    if (typeof ts.toDate === 'function') {
      d = ts.toDate();
    } else if (ts.seconds) {
      d = new Date(ts.seconds * 1000);
    } else if (typeof ts === 'string') {
      const parts = ts.trim().split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else if (parts[2].length === 4) {
          d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
          d = new Date(ts);
        }
      } else {
        d = new Date(ts);
      }
    } else {
      d = new Date(ts);
    }
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(ts);
  }
};

export const numberToWordsINR = (num: number): string => {
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
  const remainder = num;

  if (crore > 0) result += convertLessThanOneThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanOneThousand(remainder);

  return result.trim();
};

export const getCategoryLabel = (cat: string): string => {
  const c = (cat || '').toLowerCase();
  if (c === 'digital') return 'Digital Redeem Coupon';
  if (c === 'ott') return 'OTT Consignment Advance';
  if (c === 'grocery') return 'Grocery Consignment Advance';
  if (c === 'goodwill') return 'Goodwill Consignment Advance';
  if (c === 'other') return 'Other Consignment Advance';
  return cat || 'Consignment Advance';
};

export const formatClaimCategories = (cats: string[] | string): string => {
  if (!cats) return 'Consignment Advance Account';
  if (Array.isArray(cats)) {
    return cats.map(c => getCategoryLabel(c)).join(', ');
  }
  return getCategoryLabel(String(cats));
};

export const compareMobiles = (m1?: string | number, m2?: string | number): boolean => {
  if (!m1 || !m2) return false;
  const s1 = String(m1).replace(/\D/g, '');
  const s2 = String(m2).replace(/\D/g, '');
  if (!s1 || !s2) return false;
  const last1 = s1.length >= 10 ? s1.slice(-10) : s1;
  const last2 = s2.length >= 10 ? s2.slice(-10) : s2;
  return last1 === last2;
};

export const HARDSHIP_OPTIONS_META: Record<string, {
  id: string;
  titleMl: string;
  titleEn: string;
  fullMl: string;
  fullEn: string;
  icon: string;
  isEmergency: boolean;
}> = {
  bank: {
    id: 'bank',
    titleMl: 'ബാങ്ക് ജപ്തി / loan recovery pressure',
    titleEn: 'Bank recovery / seizure pressure',
    fullMl: 'ബാങ്ക് ജപ്തി / loan recovery pressure നേരിടുന്നു',
    fullEn: 'Bank recovery / seizure pressure',
    icon: '🏦',
    isEmergency: true
  },
  crisis: {
    id: 'crisis',
    titleMl: 'ഗുരുതരമായ സാമ്പത്തിക പ്രതിസന്ധി',
    titleEn: 'Serious financial crisis',
    fullMl: 'ഗുരുതരമായ സാമ്പത്തിക പ്രതിസന്ധി നേരിടുന്നു',
    fullEn: 'Serious financial crisis',
    icon: '⚠️',
    isEmergency: true
  },
  medical: {
    id: 'medical',
    titleMl: 'ചികിത്സാ ആവശ്യങ്ങൾ / medical emergency',
    titleEn: 'Medical emergency / treatment need',
    fullMl: 'ചികിത്സാ ആവശ്യങ്ങൾ / medical emergency ഉണ്ട്',
    fullEn: 'Medical emergency / treatment need',
    icon: '🏥',
    isEmergency: true
  },
  none: {
    id: 'none',
    titleMl: 'അടിയന്തിര പ്രാധാന്യമില്ല',
    titleEn: 'No urgent emergency',
    fullMl: 'അടിയന്തിര പ്രാധാന്യമില്ല',
    fullEn: 'No urgent emergency',
    icon: '✓',
    isEmergency: false
  }
};

export const getHardshipDetail = (id: string) => {
  const key = (id || '').trim().toLowerCase();
  if (HARDSHIP_OPTIONS_META[key]) {
    return HARDSHIP_OPTIONS_META[key];
  }
  return {
    id: key,
    titleMl: key,
    titleEn: key,
    fullMl: key,
    fullEn: key,
    icon: '•',
    isEmergency: false
  };
};

export const getHardshipList = (hardshipStatus: string[] | string | undefined | null) => {
  if (!hardshipStatus) return [];
  const arr = Array.isArray(hardshipStatus) ? hardshipStatus : [hardshipStatus];
  return arr.filter(Boolean).map(h => getHardshipDetail(h));
};

export const getFuturePreferenceDetail = (pref: string) => {
  const p = (pref || '').trim().toLowerCase();
  if (p === 'settlement') {
    return {
      ml: 'ബാലൻസ് തുക ലഭിച്ചാൽ settlement ചെയ്ത് account closure ചെയ്യാൻ താൽപര്യപ്പെടുന്നു',
      en: 'Settlement and closure after receiving pending balance',
      short: 'സെറ്റിൽമെന്റും അക്കൗണ്ട് ക്ലോസ് ചെയ്യലും (Settlement & Closure)'
    };
  }
  if (p === 'wait') {
    return {
      ml: 'ബാലൻസ് തുകയിൽ നിന്ന് ഒരു ഭാഗം / 1/4 amount ലഭിച്ചാൽ ബാക്കി തുകയ്ക്കായി കാത്തിരിക്കാം',
      en: 'Willing to wait if part payment / 1/4th amount is received',
      short: '1/4 ഭാഗം ലഭിച്ചാൽ കാത്തിരിക്കാം (Wait if 1/4th received)'
    };
  }
  if (p === 'continue') {
    return {
      ml: 'കമ്പനി പ്രവർത്തനം പുനരാരംഭിച്ചാൽ കമ്പനിക്കൊപ്പം തുടർന്നു പോകാൻ തയ്യാറാണ്',
      en: 'Ready to continue with the company if business operations restart',
      short: 'കമ്പനിക്കൊപ്പം തുടർന്നു പോകാൻ തയ്യാറാണ് (Continue with Company)'
    };
  }
  if (p === 'urgent') {
    return {
      ml: 'നിലവിലെ സാഹചര്യത്തിൽ എത്രയും വേഗം payment ലഭിക്കണം',
      en: 'Need urgent payment due to personal/financial situation',
      short: 'എത്രയും വേഗം പേയ്മെന്റ് വേണം (Urgent Payment Needed)'
    };
  }
  return {
    ml: pref ? pref : 'ഉപഭോക്താവ് നൽകിയിട്ടില്ല (Not provided by customer)',
    en: pref ? pref : 'Not provided by customer',
    short: pref ? pref : 'Not provided by customer'
  };
};

export const getCourtReportBaseStyles = (): string => `
  @import url('https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');

  @page {
    size: A4 portrait;
    margin: 6mm 8mm 6mm 8mm;
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
    color: #0f172a;
    font-family: 'Noto Sans Malayalam', 'Manjari', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11.5px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .page-container {
    width: 100%;
    min-height: 282mm;
    max-height: 284mm;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 4.5mm 6.5mm;
    overflow: hidden;
    position: relative;
    background: #ffffff;
    font-family: 'Noto Sans Malayalam', 'Manjari', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .page-container:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .header-table {
    width: 100%;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 6px;
    margin-bottom: 6px;
  }
  .org-title {
    font-size: 19px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #003366;
    margin: 0 0 2px 0;
    line-height: 1.25;
  }
  .org-sub-meta {
    font-size: 9px;
    color: #334155;
    font-weight: 700;
    margin-top: 3px;
    line-height: 1.4;
  }
  .sub-title {
    font-size: 12px;
    font-weight: 800;
    color: #1e293b;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    line-height: 1.35;
  }
  .doc-tag {
    display: inline-block;
    background: #003366;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 900;
    padding: 4px 10px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.35px;
    margin-top: 5px;
    line-height: 1.3;
  }
  .meta-box {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 6px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 18px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px 14px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: 1.1fr 1.1fr 1.35fr 0.95fr;
    gap: 6px 14px;
  }
  .meta-label {
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    font-size: 8.5px;
    display: block;
    margin-bottom: 3.5px;
    letter-spacing: 0.35px;
    line-height: 1.3;
  }
  .meta-val {
    font-weight: 800;
    color: #0f172a;
    font-size: 11.5px;
    word-break: break-word;
    line-height: 1.45;
  }
  .section-heading {
    font-size: 11.5px;
    font-weight: 900;
    text-transform: uppercase;
    color: #003366;
    letter-spacing: 0.4px;
    margin: 8px 0 5px 0;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 3px;
    line-height: 1.35;
  }
  table.claim-table {
    width: 100%;
    border-collapse: collapse;
    margin: 5px 0 6px 0;
    font-size: 11px;
  }
  table.claim-table th {
    background: #003366;
    color: #ffffff;
    font-weight: 800;
    text-transform: uppercase;
    padding: 8px 12px;
    text-align: left;
    font-size: 9.5px;
    border: 1px solid #003366;
    letter-spacing: 0.3px;
    line-height: 1.35;
  }
  table.claim-table td {
    border: 1px solid #cbd5e1;
    padding: 7px 12px;
    font-size: 11.5px;
    line-height: 1.45;
    vertical-align: middle;
  }
  table.claim-table tr:nth-child(even) {
    background: #f8fafc;
  }
  .total-row td {
    background: #e2e8f0 !important;
    font-weight: 900;
    color: #003366;
    font-size: 12.5px;
    padding: 9px 12px !important;
    border-top: 1.2px solid #003366 !important;
    line-height: 1.4;
  }
  .declaration-box {
    border: 1px solid #94a3b8;
    background: #ffffff;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 5px;
    color: #1e293b;
    line-height: 1.55;
  }
  .signatures-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 7px;
  }
  .signatures-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
    gap: 12px;
    margin-top: 7px;
  }
  .sig-box {
    text-align: center;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 9px 12px 8px 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 125px;
  }
  .sig-title-main {
    font-size: 9.5px;
    font-weight: 900;
    color: #003366;
    text-transform: uppercase;
    line-height: 1.35;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-bottom: 5px;
  }
  .sig-title-sub {
    font-size: 8px;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    display: block;
    margin-top: 2px;
    line-height: 1.3;
  }
  .company-audit-box {
    border: 1.2px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 6px;
    padding: 9px 12px 8px 12px;
    margin-top: 5px;
  }
  .audit-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;
  }
  .audit-table td {
    padding: 5px 7px;
    font-size: 10px;
    vertical-align: middle;
    line-height: 1.4;
  }
  .audit-cell-label {
    font-weight: 800;
    color: #334155;
    width: 32%;
    text-transform: uppercase;
    font-size: 8.5px;
    line-height: 1.35;
  }
  .audit-cell-val {
    border-bottom: 1.2px dotted #64748b;
    font-family: monospace;
    font-weight: 900;
    color: #0f172a;
    width: 18%;
    font-size: 11px;
    padding-bottom: 2px;
    line-height: 1.4;
  }
  .audit-status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 5.5px 10px;
    background: #ffffff;
    border: 1.2px solid #cbd5e1;
    border-radius: 5px;
    margin-bottom: 6px;
  }
  .audit-tag {
    font-size: 8.5px;
    font-weight: 900;
    color: #003366;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .audit-sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 4px;
  }
  .audit-sig-col {
    background: #ffffff;
    border: 1.2px solid #cbd5e1;
    border-radius: 5px;
    padding: 8px 10px 7px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 98px;
  }
  .audit-sig-role {
    font-size: 9px;
    font-weight: 900;
    color: #003366;
    text-transform: uppercase;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 3.5px;
    margin-bottom: 4.5px;
    letter-spacing: 0.35px;
    line-height: 1.3;
  }
  .audit-field-line {
    font-size: 8.5px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 3.5px;
    line-height: 1.45;
  }
  .audit-sig-line {
    border-top: 1.3px solid #003366;
    padding-top: 4.5px;
    font-size: 9px;
    font-weight: 900;
    color: #003366;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.35;
  }
  .audit-sig-caption {
    font-size: 7.5px;
    font-weight: 700;
    color: #64748b;
    text-align: center;
    margin-top: 2px;
    line-height: 1.3;
  }
  .mgmt-verify-table {
    width: 100%;
    font-size: 9px;
    border-collapse: collapse;
    margin: 4px 0 5px 0;
    text-align: left;
  }
  .mgmt-verify-table td {
    padding: 3.5px 4px;
    border: none;
    line-height: 1.4;
  }
  .mgmt-field-label {
    color: #475569;
    font-weight: 800;
    width: 52%;
    font-size: 8.5px;
    text-transform: uppercase;
    line-height: 1.35;
  }
  .mgmt-field-line {
    border-bottom: 1.2px dotted #64748b;
    font-weight: 900;
    font-family: monospace;
    font-size: 10px;
    color: #0f172a;
    padding-bottom: 2px;
  }
  .sig-line {
    border-top: 1.3px solid #0f172a;
    padding-top: 5px;
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    color: #0f172a;
    line-height: 1.35;
  }
  .sig-sub {
    font-size: 8px;
    color: #64748b;
    margin-top: 2px;
    font-weight: 600;
    line-height: 1.3;
  }
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 34px;
    font-weight: 900;
    color: rgba(0, 51, 102, 0.035);
    text-transform: uppercase;
    pointer-events: none;
    z-index: -1;
    white-space: nowrap;
  }
  .screen-toolbar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: #003366;
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
    transition: transform 0.1s ease, opacity 0.2s ease;
  }
  .toolbar-actions button:active {
    transform: scale(0.96);
  }
  .btn-print {
    background: #10b981;
    color: #ffffff;
  }
  .btn-download {
    background: #ffffff;
    color: #003366;
  }
  .btn-share {
    background: #25d366;
    color: #ffffff;
  }
  .btn-close {
    background: #ef4444;
    color: #ffffff;
  }
  @media print {
    html, body {
      background: #ffffff !important;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print, .screen-toolbar {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  }
`;

/**
 * Render 1 single A4 Person Page for Court / Customer Settlement Form
 * (Consignment Advance Account Statement & Verification Record)
 * STRICTLY EXCLUDES: Police/court cases, Future Preference, Hardship, Combo Relationship, Admin-only notes.
 * Fills entire A4 page properly with zero extra blank pages.
 */
export const renderPersonCourtClaimPage = (
  claim: any,
  userProf: any,
  pageNum: number = 1,
  totalPages: number = 1
): string => {
  const isSelf = !claim.relation || claim.relation === 'Self';

  // District & Assembly Constituency
  const ownDist = claim.userDistrict || claim.district;
  const mainDist = userProf?.district || userProf?.userDistrict;
  const distCode = ownDist || mainDist;
  const districtObj = DISTRICTS.find(d => d.code === distCode);
  const districtName = districtObj?.name || distCode || 'Kerala';

  const ownConsti = claim.userConstituency || claim.constituency;
  const mainConsti = userProf?.assemblyConstituency || userProf?.constituency;
  const asslyName = ownConsti || mainConsti || 'N/A';

  // Residential address: must come from claimant address or synced main claimant address only.
  // Never use HCRS text or membership status.
  const ownAddress = sanitizeMemberAddress(claim.residentialAddress || claim.userAddress || claim.houseName || claim.address);
  const mainAddress = sanitizeMemberAddress(userProf?.residentialAddress || userProf?.userAddress || userProf?.houseName || userProf?.address);
  const addressStr = ownAddress || mainAddress || '';

  const ownPO = claim.postOffice || claim.po;
  const mainPO = userProf?.postOffice || userProf?.po;
  const postOfficeStr = (ownPO || mainPO || '').toString().trim();

  const ownPin = claim.pincode || claim.pin || claim.postalCode;
  const mainPin = userProf?.pincode || userProf?.pin || userProf?.postalCode;
  const pinStr = String(ownPin || mainPin || '').replace(/\D/g, '').slice(0, 6);

  let fullAddress = addressStr;
  if (fullAddress) {
    if (postOfficeStr && !fullAddress.toLowerCase().includes(postOfficeStr.toLowerCase())) {
      fullAddress += `, P.O. ${postOfficeStr}`;
    }
    if (pinStr && !fullAddress.includes(pinStr)) {
      fullAddress += `, PIN: ${pinStr}`;
    }
  } else {
    fullAddress = '................................';
  }

  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const dateStr = formatClaimDateTime(claim.createdAt);
  const memberName = claim.userName || claim.claimantName || claim.name || claim.spouseName || claim.parentName || claim.childName || claim.selfName || (isSelf ? userProf?.name : '') || 'N/A';
  const individualMobile = claim.individualMobile || (claim.memberMobile && claim.memberMobile !== claim.userMobile ? claim.memberMobile : '');
  const primaryMobile = claim.userMobile || userProf?.mobile || '';
  const mobileStr = (individualMobile && individualMobile !== primaryMobile)
    ? `${individualMobile} (Primary: ${primaryMobile})`
    : (individualMobile || primaryMobile || 'N/A');
  const panStr = (claim.panNumber || claim.pan || (isSelf ? (userProf?.panNumber || userProf?.pan || '') : '')).toString().trim();
  
  const paidVal = Number(claim.totalPaid) || 0;
  const receivedVal = Number(claim.totalReceived) || 0;
  const pendingBalance = paidVal - receivedVal;

  const joiningDateRaw = claim.joiningDate || (isSelf ? (userProf?.joiningDate || claim.registrationDate || userProf?.registrationDate) : '');
  const joiningDateStr = joiningDateRaw ? formatClaimDateOnly(joiningDateRaw) : '................................';

  return `
    <div class="page-container">
      <div>
        <!-- Header Table -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="org-title">HIGHRICH ONLINE SHOPPE PVT. LTD.</div>
              <div class="org-sub-meta">
                <span>CIN: U51909KL2019PTC060087</span> • 
                <span style="font-weight: 800; color: #003366;">COMPANY PAN: AABCH77066C</span> • 
                <span>Reg. Office: TC9/3702/014, 2nd Floor, Kanimangalam Tower, Valapad, Thrissur - 680567, Kerala, India</span>
              </div>
              <div class="doc-tag" style="margin-top: 4px;">CUSTOMER FINANCIAL STATEMENT & VERIFICATION FORM</div>
            </td>
            <td style="vertical-align: top; text-align: right; width: 205px;">
              <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.3px;">STATEMENT DATE</div>
              <div style="font-size: 11px; font-weight: 900; color: #003366; line-height: 1.3; margin-top: 2px;">${dateStr}</div>
              <div style="margin-top: 4px; display: inline-block; background: #003366; color: #ffffff; font-size: 9px; font-weight: 900; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.35px;">
                PAGE ${pageNum}/${totalPages}
              </div>
            </td>
          </tr>
        </table>

        <!-- Target Authority / Management Line -->
        <div style="font-size: 9px; color: #003366; font-weight: 800; margin-top: 4px; margin-bottom: 6px; padding: 3px 8px; background: #f8fafc; border-left: 2px solid #003366; border-radius: 3px; line-height: 1.4;">
          TO: THE MANAGEMENT OF HIGHRICH ONLINE SHOPPE PVT. LTD.
        </div>

        <!-- 1. CUSTOMER INFORMATION -->
        <div class="section-heading">1. CUSTOMER INFORMATION</div>
        <div class="meta-box" style="padding: 0; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="width: 52%; vertical-align: top; padding: 7px 12px; border-right: 1.2px solid #cbd5e1;">
                <div style="margin-bottom: 6.5px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">CUSTOMER / DECLARANT NAME:</div>
                  <div style="font-size: 12px; font-weight: 900; color: #003366; margin-top: 1px;">${memberName}</div>
                </div>
                <div style="margin-bottom: 6.5px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">CUSTOMER ID (PROVIDED BY THE COMPANY):</div>
                  <div style="font-size: 12px; font-weight: 900; color: #003366; font-family: monospace; margin-top: 1px;">${claim.highrichId || '................................'}</div>
                </div>
                <div style="margin-bottom: 6.5px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">DISTRICT & ASSEMBLY CONSTITUENCY:</div>
                  <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 1px;">${districtName} • ${asslyName}</div>
                </div>
                <div>
                  <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">FULL RESIDENTIAL ADDRESS:</div>
                  <div style="font-size: 10.5px; font-weight: 700; color: #0f172a; line-height: 1.4; margin-top: 1px;">${fullAddress}</div>
                </div>
              </td>
              <td style="width: 48%; vertical-align: top; padding: 7px 12px;">
                <div style="margin-bottom: 8px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">REGISTERED MOBILE NUMBER</div>
                  <div style="font-size: 12px; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 1px;">${mobileStr}</div>
                </div>
                <div style="margin-bottom: 8px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">CUSTOMER PAN CARD NUMBER</div>
                  <div style="font-size: 12px; font-weight: 900; color: #003366; font-family: monospace; margin-top: 1px;">${panStr || '................................'}</div>
                </div>
                <div>
                  <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">JOINING DATE</div>
                  <div style="font-size: 11.5px; font-weight: 900; color: #003366; font-family: monospace; margin-top: 1px;">${joiningDateStr}</div>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- 2. FINANCIAL STATEMENT – AMOUNT RECEIVED IN THE COURSE OF BUSINESS FOR SUPPLY OF GOODS & PROVISION OF SERVICES -->
        <div class="section-heading" style="line-height: 1.35;">2. FINANCIAL STATEMENT – AMOUNT RECEIVED IN THE COURSE OF BUSINESS FOR SUPPLY OF<br/>GOODS & PROVISION OF SERVICES</div>
        <table class="claim-table">
          <thead>
            <tr>
              <th style="width: 38%;">PARTICULARS / ACCOUNT HEAD</th>
              <th style="text-align: right; width: 20%;">ADVANCE PAID (₹)</th>
              <th style="text-align: right; width: 20%;">AMOUNT RECEIVED (₹)</th>
              <th style="text-align: right; width: 22%;">PENDING BALANCE (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 800; font-size: 11.5px;">ADVANCE ACCOUNT (നൽകിയ തുക)</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 12px;">₹ ${paidVal.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #94a3b8;">—</td>
              <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #94a3b8;">—</td>
            </tr>
            <tr>
              <td style="font-weight: 800; font-size: 11.5px;">PAYMENT RECEIVED FROM COMPANY (ലഭിച്ച തുക)</td>
              <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #94a3b8;">—</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a; font-size: 12px;">₹ ${receivedVal.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #94a3b8;">—</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="font-weight: 900; font-size: 12px; color: #003366;">BALANCE PAYABLE BY THE COMPANY (മിച്ച തുക)</td>
              <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #94a3b8;">—</td>
              <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #94a3b8;">—</td>
              <td style="text-align: right; font-family: monospace; font-weight: 900; color: #003366; font-size: 13.5px;">₹ ${pendingBalance.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <!-- 3. CUSTOMER DECLARATION & CONFIRMATION -->
        <div class="section-heading">3. CUSTOMER DECLARATION & CONFIRMATION</div>
        <div class="declaration-box">
          <div style="font-size: 9px; line-height: 1.5; color: #0f172a; font-weight: 600; text-align: justify;">
            I acknowledge that data pertaining to the advance paid by me to HIGHRICH ONLINE SHOPPE PVT. LTD are not readily available with the company as on date due to the pending litigation. In order to ascertain the true facts and figures, I am furnishing the data available with me. I hereby certify and declare that the financial figures and particulars stated in this statement are true, accurate, and correct to the best of my knowledge and records maintained by me. The Advance paid, cumulative returns received, and the final net balance which is claimed herein are subject to verification and final reconciliation with the official corporate books of accounts and bank reconciliation exercise of HIGHRICH ONLINE SHOPPE PVT. LTD. In the event of ongoing legal proceedings, due to the ongoing litigation, this statement and verification claim is submitted to facilitate disbursement of funds deposited before the Hon’ble Court/Competent Authority, subject to formal reconciliation by the Company and approval by the Hon’ble Court. I also affirm and submit that this form is submitted out of my free will and consent. I understand that the action arising out of the verification form is subject to verification and pending litigation in various Forums & Courts of Law.
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; padding-top: 7px; border-top: 1.2px dashed #cbd5e1;">
            <div>
              <span style="font-size: 8.5px; color: #059669; font-weight: 900; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3.5px 8px; border-radius: 4px; display: inline-block;">
                [√] CONDITIONS CONFIRMED & VERIFIED
              </span>
              <div style="font-size: 8.5px; color: #64748b; font-weight: 700; margin-top: 3px;">
                Date: ${dateStr} • Place: ${claim.place || claim.declarationPlace || userProf?.place || '____________________'}
              </div>
            </div>
            <div style="text-align: right; min-width: 220px;">
              <div style="font-size: 10.5px; font-weight: 900; color: #003366; line-height: 1.35;">${memberName}</div>
              <div style="border-top: 1.2px dotted #003366; margin-top: 22px; padding-top: 3px; font-size: 8px; color: #475569; font-weight: 700;">(Signature of the Customer / Declarant)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. HIGHRICH ONLINE SHOPPE PVT. LTD. — OFFICIAL ACCOUNTS VERIFICATION RECORD -->
      <div>
        <div class="section-heading">4. HIGHRICH ONLINE SHOPPE PVT. LTD. — OFFICIAL ACCOUNTS VERIFICATION RECORD</div>
        <div class="company-audit-box">
          <table class="audit-table">
            <tr>
              <td class="audit-cell-label">1. ADVANCE AMOUNT:</td>
              <td class="audit-cell-val">₹ _____________</td>
              <td class="audit-cell-label">3. FINAL NET BALANCE PAYABLE:</td>
              <td class="audit-cell-val font-bold" style="color: #003366;">₹ ______________</td>
            </tr>
            <tr>
              <td class="audit-cell-label">2. VERIFIED CUMULATIVE RETURN RECEIVED:</td>
              <td class="audit-cell-val">₹ _____________</td>
              <td class="audit-cell-label">4. BANK LEDGER FOLIO / UTR VERIFICATION REF:</td>
              <td class="audit-cell-val">_______________</td>
            </tr>
          </table>

          <div class="audit-status-row">
            <span class="audit-tag">[√] RECORDS VERIFIED</span>
            <span class="audit-tag">[√] ACCOUNTS RECONCILED</span>
            <span class="audit-tag">[√] PASSED FOR SETTLEMENT</span>
            <span style="font-size: 8.5px; color: #64748b; font-weight: 700; margin-left: auto;">
              Head Office Reconciliation • Thrissur, Kerala
            </span>
          </div>

          <div class="audit-sig-grid">
            <div class="audit-sig-col">
              <div class="audit-sig-role">AUDITED & RECONCILED BY</div>
              <div class="audit-field-line">Verification Officer: __________________________</div>
              <div class="audit-field-line">Signature: __________________________________</div>
              <div class="audit-field-line">Audit Date: ______ / ______ / 202____</div>
            </div>
            <div class="audit-sig-col" style="text-align: center; justify-content: space-between;">
              <div class="audit-sig-role" style="text-align: left;">FOR HIGHRICH ONLINE SHOPPE PVT. LTD.</div>
              <div style="font-size: 8.5px; font-weight: 800; color: #475569; letter-spacing: 0.3px; margin: 10px 0;">
                OFFICIAL CORPORATE SEAL & SIGNATURE
              </div>
              <div class="audit-sig-line">AUTHORIZED SIGNATORY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Render 1 Full Admin Page for a Claim (Customer / Admin Print)
 * INCLUDES: All customer details, Combo, Future Preference, Hardship, Priority Category, Notes.
 */
export const renderPersonFullAdminClaimPage = (
  claim: any,
  userProf: any,
  pageNum: number = 1,
  totalPages: number = 1
): string => {
  const isSelf = !claim.relation || claim.relation === 'Self';

  const ownDist = claim.userDistrict || claim.district;
  const mainDist = userProf?.district || userProf?.userDistrict;
  const distCode = ownDist || mainDist;
  const districtObj = DISTRICTS.find(d => d.code === distCode);
  const districtName = districtObj?.name || distCode || 'Kerala';

  const ownConsti = claim.userConstituency || claim.constituency;
  const mainConsti = userProf?.assemblyConstituency || userProf?.constituency;
  const asslyName = ownConsti || mainConsti || 'N/A';

  // Residential address: must come from claimant address or synced main claimant address only.
  // Never use HCRS text or membership status.
  const ownAddress = sanitizeMemberAddress(claim.residentialAddress || claim.userAddress || claim.houseName || claim.address);
  const mainAddress = sanitizeMemberAddress(userProf?.residentialAddress || userProf?.userAddress || userProf?.houseName || userProf?.address);
  const addressStr = ownAddress || mainAddress || '';

  const ownPO = claim.postOffice || claim.po;
  const mainPO = userProf?.postOffice || userProf?.po;
  const postOfficeStr = (ownPO || mainPO || '').toString().trim();

  const ownPin = claim.pincode || claim.pin || claim.postalCode;
  const mainPin = userProf?.pincode || userProf?.pin || userProf?.postalCode;
  const pinStr = String(ownPin || mainPin || '').replace(/\D/g, '').slice(0, 6);

  let fullAddress = addressStr;
  if (fullAddress) {
    if (postOfficeStr && !fullAddress.toLowerCase().includes(postOfficeStr.toLowerCase())) {
      fullAddress += `, P.O. ${postOfficeStr}`;
    }
    if (pinStr && !fullAddress.includes(pinStr)) {
      fullAddress += `, PIN: ${pinStr}`;
    }
  } else {
    fullAddress = 'Not provided by customer';
  }

  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const dateStr = formatClaimDateTime(claim.createdAt);
  const memberName = claim.userName || claim.claimantName || claim.name || claim.spouseName || claim.parentName || claim.childName || claim.selfName || (isSelf ? userProf?.name : '') || 'N/A';
  const individualMobile = claim.individualMobile || (claim.memberMobile && claim.memberMobile !== claim.userMobile ? claim.memberMobile : '');
  const primaryMobile = claim.userMobile || userProf?.mobile || '';
  const mobileStr = (individualMobile && individualMobile !== primaryMobile)
    ? `${individualMobile} (Primary: ${primaryMobile})`
    : (individualMobile || primaryMobile || 'N/A');
  const membershipIdStr = claim.membershipId || userProf?.membershipId || 'PENDING';
  const panStr = (claim.panNumber || claim.pan || (isSelf ? (userProf?.panNumber || userProf?.pan || '') : '')).toString().trim() || 'N/A';

  const relStr = (claim.relation || '').toLowerCase();
  const isSpouse = relStr === 'spouse' || relStr === 'wife' || relStr === 'husband';
  const isParent = relStr === 'parent' || relStr === 'mother' || relStr === 'father';
  const isChild = relStr === 'child' || relStr === 'son' || relStr === 'daughter';

  const joiningDateRaw = claim.joiningDate ||
    claim.customerJoiningDate ||
    (isSelf ? claim.selfJoiningDate : (
      isSpouse ? claim.spouseJoiningDate :
      isParent ? claim.parentJoiningDate :
      isChild ? claim.childJoiningDate : ''
    )) ||
    userProf?.joiningDate ||
    claim.registrationDate ||
    userProf?.registrationDate ||
    userProf?.regDate ||
    '';
  const joiningDateStr = joiningDateRaw ? formatClaimDateOnly(joiningDateRaw) : 'N/A';

  const adminPaid = Number(claim.totalPaid) || 0;
  const adminReceived = Number(claim.totalReceived) || 0;
  const adminPending = adminPaid - adminReceived;

  const priorityLabel = claim.priorityStatus || 'GENERAL';
  const priorityBg = priorityLabel === 'EMERGENCY RED' ? '#dc2626' :
                     priorityLabel === 'RED' ? '#ef4444' :
                     priorityLabel === 'ORANGE' ? '#f97316' : '#16a34a';

  const prefDetail = getFuturePreferenceDetail(claim.futurePreference);
  const hardshipList = getHardshipList(claim.hardshipStatus);

  return `
    <div class="page-container">
      <div>
        <!-- Header Table -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="org-title">HIGHRICH ONLINE SHOPPE PVT. LTD.</div>
              <div class="org-sub-meta">
                <span>CIN: U51909KL2019PTC060087</span> • 
                <span style="font-weight: 800; color: #003366;">COMPANY PAN: AABCH77066C</span> • 
                <span>Reg. Office: TC9/3702/014, 2nd Floor, Kanimangalam Tower, Valapad, Thrissur - 680567, Kerala, India</span>
              </div>
              <div class="doc-tag" style="background: #003366; margin-top: 4px;">CONSIGNMENT ADVANCE FINANCIAL STATEMENT & VERIFICATION RECORD</div>
            </td>
            <td style="vertical-align: top; text-align: right; width: 195px;">
              <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">ADMIN REF</div>
              <div style="font-size: 15px; font-weight: 900; color: #7e22ce; font-family: monospace;">#${tokenDisplay}</div>
              <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Registered: ${dateStr}</div>
              <div style="margin-top: 2px; display: inline-block; background: ${priorityBg}; color: #ffffff; font-size: 8.5px; font-weight: 900; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.35px;">
                ${priorityLabel} • PAGE ${pageNum}/${totalPages}
              </div>
            </td>
          </tr>
        </table>

        <!-- Target Authority / Management Line (Cleanly positioned below divider) -->
        <div style="font-size: 8.5px; color: #003366; font-weight: 800; margin-top: 4px; margin-bottom: 6px; padding: 3px 8px; background: #f8fafc; border-left: 2px solid #003366; border-radius: 3px; line-height: 1.4;">
          TO: THE MANAGEMENT & LEGAL COUNSELS / ADVOCATES OF HIGHRICH ONLINE SHOPPE PVT. LTD. & BEFORE THE HON'BLE COURT
        </div>

        <!-- Member & Administrative Profile -->
        <!-- 1. Member Profile & Relationship -->
        <div class="section-heading">1. Member Profile & Relationship</div>
        <div class="meta-box" style="padding: 9px 12px;">
          <div class="grid-3" style="gap: 6px 14px;">
            <div>
              <span class="meta-label">Claimant Name</span>
              <span class="meta-val" style="font-size: 12px; color: #003366;">${memberName}</span>
            </div>
            <div>
              <span class="meta-label">Relationship in Combo</span>
              <span class="meta-val" style="color: #be185d; font-size: 11.5px;">${claim.relation || 'Self'}</span>
            </div>
            <div>
              <span class="meta-label">Mobile Number</span>
              <span class="meta-val font-mono" style="font-size: 12px;">${mobileStr}</span>
            </div>
            <div>
              <span class="meta-label">Membership ID & Status</span>
              <span class="meta-val font-mono" style="color: #7e22ce; font-size: 11.5px;">${membershipIdStr} • ${(userProf?.status || 'Active').toUpperCase()}</span>
            </div>
            <div>
              <span class="meta-label">Customer ID</span>
              <span class="meta-val font-mono" style="color: #003366; font-size: 12px;">${claim.highrichId || 'N/A'}</span>
            </div>
            <div>
              <span class="meta-label">PAN Card Number</span>
              <span class="meta-val font-mono" style="font-size: 12px;">${panStr}</span>
            </div>
            <div>
              <span class="meta-label">Joining Date</span>
              <span class="meta-val font-mono" style="font-size: 11.5px; color: #003366;">${joiningDateStr}</span>
            </div>
            <div style="grid-column: span 2;">
              <span class="meta-label">District & Assembly</span>
              <span class="meta-val">${districtName} (${asslyName})</span>
            </div>
            <div style="grid-column: span 3;">
              <span class="meta-label">Full Address</span>
              <span class="meta-val" style="font-size: 10.5px; line-height: 1.4;">${fullAddress}</span>
            </div>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="section-heading">2. HIGHRICH ONLINE SHOPPE Pvt. Ltd. Consignment Advance Financials</div>
        <table class="claim-table">
          <thead>
            <tr>
              <th style="width: 37%;">Category / Head</th>
              <th style="text-align: right; width: 21%;">Consignment Advance Paid (₹)</th>
              <th style="text-align: right; width: 21%;">Amount Received (₹)</th>
              <th style="text-align: right; width: 21%;">Pending Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${!claim.noBreakup && claim.categoryDetails && Object.keys(claim.categoryDetails).length > 0 ? (
              Object.entries(claim.categoryDetails).map(([catKey, details]: [string, any]) => `
                <tr>
                  <td style="font-weight: 800; font-size: 11.5px;">${getCategoryLabel(catKey)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 12px;">₹${(details.paid || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a; font-size: 12px;">₹${(details.received || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900; color: #7e22ce; font-size: 12.5px;">₹${((Number(details.paid) || 0) - (Number(details.received) || 0)).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')
            ) : (
              `
                <tr>
                  <td style="font-weight: 800; font-size: 11.5px;">Consignment Advance Account (${claim.categories ? formatClaimCategories(claim.categories) : 'General'})</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 12px;">₹${adminPaid.toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a; font-size: 12px;">₹${adminReceived.toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900; color: #7e22ce; font-size: 12.5px;">₹${adminPending.toLocaleString('en-IN')}</td>
                </tr>
              `
            )}
            <tr class="total-row">
              <td style="font-size: 12px;">NET PENDING BALANCE</td>
              <td style="text-align: right; font-family: monospace; font-size: 12px;">₹${adminPaid.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; color: #16a34a; font-size: 12px;">₹${adminReceived.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; color: #7e22ce; font-size: 13.5px; font-weight: 900;">₹${adminPending.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <!-- Admin Specific Fields: Priority, Hardship, Future Preference -->
        <div class="section-heading">3. Administrative Assessment Details (അഡ്മിൻ അസസ്സ്മെന്റ് വിവരങ്ങൾ)</div>
        <div class="meta-box" style="border-color: #cbd5e1; background: #fffdf5; padding: 10px 14px;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <span class="meta-label">Priority Status & Category</span>
                <span class="meta-val" style="color: ${priorityBg}; font-size: 11.5px; font-weight: 900;">
                  ${priorityLabel} ${claim.isEmergency ? '• EMERGENCY PRIORITY VERIFIED' : ''}
                </span>
              </div>
              <div>
                <span class="meta-label">Verified / Handled By</span>
                <span class="meta-val" style="font-size: 11px;">${userProf?.registeredByName || userProf?.certAdminName || 'Portal Direct Submission'}</span>
              </div>
            </div>

            <!-- All Selected Hardship & Crisis Factors with Full Details -->
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px;">
              <span class="meta-label" style="margin-bottom: 4px; display: block;">
                Selected Hardship & Crisis Factors (അപേക്ഷകൻ തിരഞ്ഞെടുത്ത പ്രതിസന്ധികൾ):
              </span>
              ${hardshipList.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  ${hardshipList.map(h => `
                    <div style="display: flex; align-items: flex-start; gap: 6px; background: ${h.isEmergency ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${h.isEmergency ? '#fecaca' : '#e2e8f0'}; border-radius: 6px; padding: 4px 8px;">
                      <span style="font-size: 12px; line-height: 1;">${h.icon}</span>
                      <div style="font-size: 10px; line-height: 1.35;">
                        <span style="font-weight: 800; color: ${h.isEmergency ? '#b91c1c' : '#334155'};">${h.fullMl}</span>
                        <span style="color: #64748b; font-weight: 600; display: block; font-size: 9px;">(${h.fullEn})</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="font-size: 10px; color: #64748b; font-style: italic;">Not provided by customer (കസ്റ്റമർ രേഖപ്പെടുത്തിയിട്ടില്ല)</div>
              `}
            </div>

            <!-- Future Preference with Full Detail -->
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px;">
              <span class="meta-label" style="margin-bottom: 3px; display: block;">Future Preference (ഭാവിയിലെ തീരുമാനം):</span>
              ${claim.futurePreference ? `
                <div style="font-size: 10.5px; font-weight: 700; color: #003366; line-height: 1.4; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 5px 9px;">
                  ${prefDetail.ml}
                  <div style="font-size: 9.5px; color: #166534; font-weight: 600;">(${prefDetail.en})</div>
                </div>
              ` : `
                <div style="font-size: 10px; color: #64748b; font-style: italic;">Not provided by customer (കസ്റ്റമർ രേഖപ്പെടുത്തിയിട്ടില്ല)</div>
              `}
            </div>
          </div>
        </div>

        ${claim.notes ? `
          <div class="section-heading">4. Notes & Remarks</div>
          <div class="meta-box" style="padding: 8px 12px;">
            <span class="meta-val" style="font-size: 10px; color: #334155;">${claim.notes}</span>
          </div>
        ` : ''}
      </div>

      <!-- Signatures Grid -->
      <div class="signatures-grid-3">
        <div class="sig-box">
          <div class="sig-title-main">1. CLAIMANT / DECLARANT</div>
          <div class="sig-space" style="display:flex; flex-direction:column; justify-content:center; align-items:center; margin: 8px 0;">
            <span style="font-size:8.5px; color:#059669; font-weight:900; background:#ecfdf5; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius:4px;">✓ CONDITIONS CONFIRMED</span>
            <span style="font-size:7.5px; color:#64748b; font-weight:700; margin-top:3px;">${dateStr}</span>
          </div>
          <div style="border-top: 1.2px dotted #003366; padding-top: 4px;">
            <div class="sig-line" style="font-size: 10px; border-top: none;">${memberName}</div>
            <div class="sig-sub">(Declaration Confirmed by Declarant)</div>
          </div>
        </div>
        <div class="sig-box">
          <div class="sig-title-main">2. VERIFYING OFFICER (ACCOUNTS)</div>
          <div class="sig-space" style="margin: 8px 0; font-size: 8px; color: #64748b; text-align: left; line-height: 1.6;">
            <div>Verification: __________________</div>
            <div>Date: _____ / _____ / 202___</div>
          </div>
          <div style="border-top: 1.2px solid #003366; padding-top: 4px;">
            <div class="sig-line" style="font-size: 9px; border-top: none;">INTERNAL AUDIT & ACCOUNTS</div>
            <div class="sig-sub">Authorized Verification Officer</div>
          </div>
        </div>
        <div class="sig-box">
          <div class="sig-title-main">3. LEGAL COUNSEL / COMPANY SIGNATORY</div>
          <div class="sig-space" style="margin: 8px 0; font-size: 8px; font-weight: 800; color: #64748b;">
            OFFICIAL CORPORATE SEAL
          </div>
          <div style="border-top: 1.2px solid #003366; padding-top: 4px;">
            <div class="sig-line" style="font-size: 9px; border-top: none;">AUTHORIZED SIGNATORY</div>
            <div class="sig-sub">For HIGHRICH ONLINE SHOPPE Pvt. Ltd.</div>
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Print Court Claim Report (Single person or individual claim)
 */
export const printCourtClaimReport = (claim: any, memberProfile?: any) => {
  if (!claim) return;
  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const name = claim.userName || claim.claimantName || claim.name || claim.spouseName || claim.parentName || claim.childName || (claim.relation === 'Self' ? memberProfile?.name : '') || memberProfile?.name || 'Member';

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="ml">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
        <title>Consignment Advance Statement - ${name}</title>
        <style>
          ${getCourtReportBaseStyles()}
          html, body {
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            width: 100%;
            overflow-x: hidden;
          }
          .page-scaler-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            box-sizing: border-box;
            margin: 0 0 16px 0;
            padding: 8px 0;
          }
          .page-container {
            width: 760px;
            min-width: 760px;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06);
            border: 1.5px solid #cbd5e1;
            background: #ffffff;
            margin: 0 auto;
            transform-origin: top center;
            flex-shrink: 0;
          }
          @media print {
            html, body {
              padding: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
            }
            .page-scaler-wrapper {
              display: block !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .page-container {
              width: 100% !important;
              min-width: 0 !important;
              transform: none !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              max-width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print screen-toolbar">
          <div class="toolbar-title">
            <strong>Member Financial Information Registry</strong>
            <span>Official Record • ${name}</span>
          </div>
          <div class="toolbar-actions">
            <button onclick="window.print()" class="btn-print">🖨️ പ്രിന്റ് / സേവ് PDF (Print / Save as PDF)</button>
            <button onclick="shareViaWeb()" class="btn-share">📲 വാട്സാപ്പ് / ഷെയർ (WhatsApp)</button>
            <button onclick="window.close()" class="btn-close">✕ ക്ലോസ് (Close)</button>
          </div>
        </div>
        <div class="watermark">MEMBER FINANCIAL REGISTRY</div>
        <div class="page-scaler-wrapper">
          ${renderPersonCourtClaimPage(claim, memberProfile, 1, 1)}
        </div>

        <script>
          function shareViaWeb() {
            var text = "HIGHRICH ONLINE SHOPPE Pvt. Ltd. - Consignment Advance Financial Statement\\n" +
                       "Name: ${name}\\n" +
                       "Consignment Advance Paid: ₹${(claim.totalPaid || 0).toLocaleString('en-IN')}\\n" +
                       "Pending Balance: ₹${(claim.totalPending || 0).toLocaleString('en-IN')}\\n" +
                       "To: Company Management & Legal Counsels / Hon'ble Court";
            if (navigator.share) {
              navigator.share({
                title: "Consignment Advance Statement - ${name}",
                text: text,
                url: window.location.href
              }).catch(function(e){});
            } else {
              var waUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
              window.open(waUrl, '_blank');
            }
          }

          function autoFitDocument() {
            var baseWidth = 760;
            var clientWidth = document.documentElement.clientWidth || window.innerWidth;
            var wrappers = document.querySelectorAll('.page-scaler-wrapper');
            var pages = document.querySelectorAll('.page-container');
            
            if (clientWidth < 776) {
              var padding = 12;
              var availableWidth = Math.max(280, clientWidth - padding);
              var scale = Math.min(1, availableWidth / baseWidth);
              
              for (var i = 0; i < wrappers.length; i++) {
                var wrapper = wrappers[i];
                var page = pages[i];
                if (!page || !wrapper) continue;
                
                page.style.transform = 'scale(' + scale + ')';
                page.style.transformOrigin = 'top center';
                var pageHeight = page.offsetHeight || 1080;
                var scaledHeight = pageHeight * scale;
                wrapper.style.height = (scaledHeight + 10) + 'px';
              }
            } else {
              for (var i = 0; i < wrappers.length; i++) {
                var wrapper = wrappers[i];
                var page = pages[i];
                if (!page || !wrapper) continue;
                
                page.style.transform = 'none';
                wrapper.style.height = 'auto';
              }
            }
          }
          window.addEventListener('load', autoFitDocument);
          window.addEventListener('resize', autoFitDocument);
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            autoFitDocument();
            setTimeout(autoFitDocument, 50);
            setTimeout(autoFitDocument, 200);
          } else {
            document.addEventListener('DOMContentLoaded', autoFitDocument);
          }

          // Auto-prompt print after DOM renders
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
 * Get Court Combo Report Complete HTML string for direct in-app preview iframe / modal
 */
export const getCourtComboHtml = (primaryMember: any, memberClaims: any[]): string => {
  if (!memberClaims || memberClaims.length === 0) return '';
  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;

  return `<!DOCTYPE html>
<html lang="ml">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
    <style>
      ${getCourtReportBaseStyles()}
      *, *:before, *:after {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        width: 100%;
        overflow-x: hidden;
      }
      .page-scaler-wrapper {
        width: 100%;
        max-width: 100%;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        box-sizing: border-box;
        margin: 0 0 16px 0;
        padding: 8px 0;
        overflow: hidden;
      }
      .page-container {
        width: 760px;
        min-width: 760px;
        box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06);
        border: 1.5px solid #cbd5e1;
        background: #ffffff;
        margin: 0 auto;
        transform-origin: top center;
        flex-shrink: 0;
      }
      @media print {
        html, body {
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
        }
        .page-scaler-wrapper {
          display: block !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .page-container {
          width: 100% !important;
          min-width: 0 !important;
          transform: none !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          max-width: 100% !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="watermark">CONSIGNMENT ADVANCE STATEMENT</div>
    ${cleanClaims.map((claim, idx) => {
      return `<div class="page-scaler-wrapper">
        ${renderPersonCourtClaimPage(claim, primaryMember, idx + 1, totalCount)}
      </div>`;
    }).join('')}

    <script>
      function autoFitDocument() {
        var baseWidth = 760;
        var clientWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 360;
        var wrappers = document.querySelectorAll('.page-scaler-wrapper');
        var pages = document.querySelectorAll('.page-container');
        
        if (clientWidth < 776) {
          var padding = 4;
          var availableWidth = Math.max(280, clientWidth - padding);
          var scale = Math.min(1, availableWidth / baseWidth);
          
          for (var i = 0; i < wrappers.length; i++) {
            var wrapper = wrappers[i];
            var page = pages[i];
            if (!page || !wrapper) continue;
            
            page.style.transform = 'scale(' + scale + ')';
            page.style.transformOrigin = 'top center';
            var pageHeight = page.offsetHeight || 1080;
            var scaledHeight = pageHeight * scale;
            wrapper.style.height = (scaledHeight + 8) + 'px';
            wrapper.style.overflow = 'hidden';
            wrapper.style.width = '100%';
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
          }
        } else {
          for (var i = 0; i < wrappers.length; i++) {
            var wrapper = wrappers[i];
            var page = pages[i];
            if (!page || !wrapper) continue;
            
            page.style.transform = 'none';
            wrapper.style.height = 'auto';
            wrapper.style.overflow = 'visible';
          }
        }
      }
      window.addEventListener('load', autoFitDocument);
      window.addEventListener('resize', autoFitDocument);
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        autoFitDocument();
        setTimeout(autoFitDocument, 50);
        setTimeout(autoFitDocument, 200);
      } else {
        document.addEventListener('DOMContentLoaded', autoFitDocument);
      }
    </script>
  </body>
</html>`;
};

/**
 * Get Single Court Claim Report Complete HTML string for direct in-app preview
 */
export const getSingleCourtClaimHtml = (primaryMember: any, claim: any, pageNum: number = 1, totalPages: number = 1): string => {
  if (!claim) return '';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
    <style>
      ${getCourtReportBaseStyles()}
      *, *:before, *:after {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        width: 100%;
        overflow-x: hidden;
      }
      .page-scaler-wrapper {
        width: 100%;
        max-width: 100%;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        box-sizing: border-box;
        margin: 0 0 16px 0;
        padding: 8px 0;
        overflow: hidden;
      }
      .page-container {
        width: 760px;
        min-width: 760px;
        box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06);
        border: 1.5px solid #cbd5e1;
        background: #ffffff;
        margin: 0 auto;
        transform-origin: top center;
        flex-shrink: 0;
      }
      @media print {
        html, body {
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
        }
        .page-scaler-wrapper {
          display: block !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .page-container {
          width: 100% !important;
          min-width: 0 !important;
          transform: none !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          max-width: 100% !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="watermark">CONSIGNMENT ADVANCE STATEMENT</div>
    <div class="page-scaler-wrapper">
      ${renderPersonCourtClaimPage(claim, primaryMember, pageNum, totalPages)}
    </div>

    <script>
      function autoFitDocument() {
        var baseWidth = 760;
        var clientWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 360;
        var wrappers = document.querySelectorAll('.page-scaler-wrapper');
        var pages = document.querySelectorAll('.page-container');
        
        if (clientWidth < 776) {
          var padding = 4;
          var availableWidth = Math.max(280, clientWidth - padding);
          var scale = Math.min(1, availableWidth / baseWidth);
          
          for (var i = 0; i < wrappers.length; i++) {
            var wrapper = wrappers[i];
            var page = pages[i];
            if (!page || !wrapper) continue;
            
            page.style.transform = 'scale(' + scale + ')';
            page.style.transformOrigin = 'top center';
            var pageHeight = page.offsetHeight || 1080;
            var scaledHeight = pageHeight * scale;
            wrapper.style.height = (scaledHeight + 8) + 'px';
            wrapper.style.overflow = 'hidden';
            wrapper.style.width = '100%';
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
          }
        } else {
          for (var i = 0; i < wrappers.length; i++) {
            var wrapper = wrappers[i];
            var page = pages[i];
            if (!page || !wrapper) continue;
            
            page.style.transform = 'none';
            wrapper.style.height = 'auto';
            wrapper.style.overflow = 'visible';
          }
        }
      }
      window.addEventListener('load', autoFitDocument);
      window.addEventListener('resize', autoFitDocument);
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        autoFitDocument();
        setTimeout(autoFitDocument, 50);
        setTimeout(autoFitDocument, 200);
      } else {
        document.addEventListener('DOMContentLoaded', autoFitDocument);
      }
    </script>
  </body>
</html>`;
};

/**
 * Print Court Combo Report (All persons in a combo, exactly 1 A4 page per person)
 */
export const printCourtComboReport = (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    alert('No records found to print.');
    return;
  }

  // Deduplicate
  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Member';
  const firstToken = cleanClaims[0]?.tokenNo ?? cleanClaims[0]?.serialNo ?? 'COMBO';

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
        <title>Consignment Advance Statement (${totalCount} Pages) - ${primeName}</title>
        <style>
          ${getCourtReportBaseStyles()}
          html, body {
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            width: 100%;
            overflow-x: hidden;
          }
          .page-scaler-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            box-sizing: border-box;
            margin: 0 0 16px 0;
            padding: 8px 0;
          }
          .page-container {
            width: 760px;
            min-width: 760px;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06);
            border: 1.5px solid #cbd5e1;
            background: #ffffff;
            margin: 0 auto;
            transform-origin: top center;
            flex-shrink: 0;
          }
          @media print {
            html, body {
              padding: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
            }
            .page-scaler-wrapper {
              display: block !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .page-container {
              width: 100% !important;
              min-width: 0 !important;
              transform: none !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              max-width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print screen-toolbar">
          <div class="toolbar-title">
            <strong>Member Financial Information Registry</strong>
            <span>Official Statement Record (${totalCount} Pages) • ${primeName}</span>
          </div>
          <div class="toolbar-actions">
            <button onclick="window.print()" class="btn-print">🖨️ Print / Save as PDF</button>
            <button onclick="shareViaWeb()" class="btn-share">📲 Share via WhatsApp</button>
            <button onclick="window.close()" class="btn-close">✕ Close</button>
          </div>
        </div>
        <div class="watermark">MEMBER FINANCIAL REGISTRY</div>
        ${cleanClaims.map((claim, idx) => {
          return `<div class="page-scaler-wrapper">
            ${renderPersonCourtClaimPage(claim, primaryMember, idx + 1, totalCount)}
          </div>`;
        }).join('')}

        <script>
          function shareViaWeb() {
            var text = "HIGHRICH ONLINE SHOPPE Pvt. Ltd. - Consignment Advance Financial Statement (${totalCount} Persons)\\n" +
                       "Primary Account Holder: ${primeName}\\n" +
                       "Total Statement Pages: ${totalCount}\\n" +
                       "To: Company Management & Legal Counsels / Hon'ble Court";
            if (navigator.share) {
              navigator.share({
                title: "Consignment Advance Statement - ${primeName}",
                text: text,
                url: window.location.href
              }).catch(function(e){});
            } else {
              var waUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
              window.open(waUrl, '_blank');
            }
          }

          function autoFitDocument() {
            var baseWidth = 760;
            var clientWidth = document.documentElement.clientWidth || window.innerWidth;
            var wrappers = document.querySelectorAll('.page-scaler-wrapper');
            var pages = document.querySelectorAll('.page-container');
            
            if (clientWidth < 776) {
              var padding = 12;
              var availableWidth = Math.max(280, clientWidth - padding);
              var scale = Math.min(1, availableWidth / baseWidth);
              
              for (var i = 0; i < wrappers.length; i++) {
                var wrapper = wrappers[i];
                var page = pages[i];
                if (!page || !wrapper) continue;
                
                page.style.transform = 'scale(' + scale + ')';
                page.style.transformOrigin = 'top center';
                var pageHeight = page.offsetHeight || 1080;
                var scaledHeight = pageHeight * scale;
                wrapper.style.height = (scaledHeight + 10) + 'px';
              }
            } else {
              for (var i = 0; i < wrappers.length; i++) {
                var wrapper = wrappers[i];
                var page = pages[i];
                if (!page || !wrapper) continue;
                
                page.style.transform = 'none';
                wrapper.style.height = 'auto';
              }
            }
          }
          window.addEventListener('load', autoFitDocument);
          window.addEventListener('resize', autoFitDocument);
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            autoFitDocument();
            setTimeout(autoFitDocument, 50);
            setTimeout(autoFitDocument, 200);
          } else {
            document.addEventListener('DOMContentLoaded', autoFitDocument);
          }

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
 * Generate Multi-page or Single-page high-quality A4 PDF Document
 */
export const generateCourtComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  // Support flexible argument order: (claims, memberProfile) or (memberProfile, claims)
  let profile = primaryMember;
  let claimsList = memberClaims;
  if (Array.isArray(primaryMember) && (!memberClaims || !Array.isArray(memberClaims))) {
    claimsList = primaryMember;
    profile = memberClaims;
  }
  if (!Array.isArray(claimsList) && claimsList) {
    claimsList = [claimsList];
  }
  if (!claimsList || claimsList.length === 0) {
    throw new Error('No claim records available to generate PDF');
  }

  // Deduplicate claims
  const uniqueMap = new Map<string, any>();
  for (const c of claimsList) {
    if (!c) continue;
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  if (cleanClaims.length === 0) {
    throw new Error('No valid claim records to render in PDF');
  }
  const totalCount = cleanClaims.length;
  const singleClaim = cleanClaims[0];
  const singleName = singleClaim?.userName || singleClaim?.claimantName || singleClaim?.name || singleClaim?.spouseName || singleClaim?.parentName || singleClaim?.childName || (singleClaim?.relation === 'Self' ? profile?.name : '') || profile?.name || 'Member';
  const primeName = totalCount === 1 ? singleName : (profile?.name || cleanClaims[0]?.userName || 'Member');
  const safeName = primeName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = totalCount === 1
    ? `Consignment_Advance_Refund_Form_${safeName}.pdf`
    : `Consignment_Advance_Refund_Form_${safeName}_Combo_${totalCount}P.pdf`;

  const totalPaid = cleanClaims.reduce((sum, c) => sum + (Number(c.totalPaid) || 0), 0);
  const totalReceived = cleanClaims.reduce((sum, c) => sum + (Number(c.totalReceived) || 0), 0);
  const totalPending = cleanClaims.reduce((sum, c) => sum + (Number(c.totalPending) || 0), 0);
  const firstToken = cleanClaims[0]?.tokenNo ?? cleanClaims[0]?.serialNo ?? '1';

  // Ensure fonts are loaded in browser
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font readiness check error
    }
  }

  // Create temporary container off-screen strictly containing only the clean A4 page without toolbar
  const container = document.createElement('div');
  container.id = 'pdf-render-offscreen-' + Date.now();
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px'; // Exactly standard A4 width at 96 DPI
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#0f172a';
  container.style.zIndex = '-999999';
  container.style.opacity = '0.01'; // renders properly in browser canvas engine
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  // Inject base styles
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    ${getCourtReportBaseStyles()}
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
  `;
  container.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleanClaims.map((claim, idx) => {
    return `<div class="pdf-single-page">
      ${renderPersonCourtClaimPage(claim, profile, idx + 1, totalCount)}
    </div>`;
  }).join('');
  container.appendChild(wrapper);

  document.body.appendChild(container);

  try {
    // Give browser time to settle DOM & web fonts
    await new Promise(r => setTimeout(r, 250));

    let pageElements = container.querySelectorAll('.pdf-single-page');
    if (!pageElements || pageElements.length === 0) {
      pageElements = container.querySelectorAll('.page-container');
    }
    if (!pageElements || pageElements.length === 0) {
      throw new Error('Court Form elements could not be found for PDF rendering');
    }

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
      totalCount,
      totalPaid,
      totalReceived,
      totalPending,
      firstToken
    };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Direct .PDF File Download
 */
export const downloadCourtComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  // Support both (claims, profile) and (profile, claims) call signatures, single claim or array
  let profile = primaryMember;
  let claimsList = memberClaims;

  if (Array.isArray(primaryMember) && (!memberClaims || !Array.isArray(memberClaims))) {
    claimsList = primaryMember;
    profile = memberClaims;
  }
  if (!Array.isArray(claimsList) && claimsList) {
    claimsList = [claimsList];
  }

  if (!claimsList || claimsList.length === 0) {
    toast.error('ഡൗൺലോഡ് ചെയ്യാനുള്ള ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
    return;
  }

  const loadingToast = toast.loading('ഔദ്യോഗിക PDF തയ്യാറാക്കുന്നു... (Generating PDF File...)');
  try {
    const { pdf, fileName } = await generateCourtComboPdf(profile, claimsList);
    
    // 1. Ensure real PDF generation completed and output is a valid Blob
    const blob = pdf.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error('Generated PDF blob is empty');
    }

    // 2. Direct blob trigger to guarantee native download across all devices
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    downloadAnchor.target = '_blank';
    downloadAnchor.rel = 'noopener noreferrer';
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);

    // Dispatch real click event for full browser compatibility
    const clickEvt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    downloadAnchor.dispatchEvent(clickEvt);
    downloadAnchor.click();

    // Also trigger jsPDF built-in save as secondary guarantee where available
    try {
      if (typeof pdf.save === 'function') {
        pdf.save(fileName);
      }
    } catch {
      // Ignore if pdf.save is redundant with anchor click
    }

    // Clean up without revoking URL too early
    setTimeout(() => {
      if (document.body.contains(downloadAnchor)) {
        document.body.removeChild(downloadAnchor);
      }
      URL.revokeObjectURL(blobUrl);
    }, 60000);

    // 3. Success message shows ONLY after the download trigger actually runs
    toast.success('PDF ഫയൽ വിജയകരമായി ഡൗൺലോഡ് ചെയ്തു!', { id: loadingToast });
  } catch (err: any) {
    console.error('Error downloading PDF:', err);
    toast.error('PDF ഡൗൺലോഡ് ചെയ്യാൻ സാധിച്ചില്ല: ' + (err?.message || 'Error'), { id: loadingToast });
  }
};

/**
 * Direct .PDF Document Sharing via Web Share API / WhatsApp
 */
export const shareCourtComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    toast.error('ഷെയർ ചെയ്യാനുള്ള ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
    return;
  }

  const loadingToast = toast.loading('ഷെയർ ചെയ്യാനായി PDF ഫയൽ തയ്യാറാക്കുന്നു... (Preparing PDF...)');
  try {
    const { pdf, fileName, primeName, totalCount, totalPaid, totalPending, firstToken } = await generateCourtComboPdf(primaryMember, memberClaims);
    
    // Extract real PDF Blob & File
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const shareText = `*HIGHRICH ONLINE SHOPPE Pvt. Ltd. - CONSIGNMENT ADVANCE STATEMENT*\n` +
                      `*Submitted to Company Management & Legal Counsels / Hon'ble Court*\n\n` +
                      `👤 *Name:* ${primeName}\n` +
                      `📄 *Statement Ref:* #${firstToken}\n` +
                      `👥 *Total Pages:* ${totalCount} Persons\n` +
                      `💰 *Consignment Advance Paid:* ₹${totalPaid.toLocaleString('en-IN')}\n` +
                      `🔴 *Pending Balance:* ₹${totalPending.toLocaleString('en-IN')}\n\n` +
                      `To: Management & Advocates of Highrich Online Shoppe Pvt. Ltd. / Hon'ble Court`;

    // Attempt Native Web Share with the actual PDF file
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      toast.dismiss(loadingToast);
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Consignment Advance Refund Form - ${primeName}`,
          text: shareText
        });
        toast.success('PDF വിജയകരമായി ഷെയർ ചെയ്തു!');
        return;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return; // User cancelled share dialog
        }
        console.warn('Share cancelled or failed:', shareErr);
      }
    }

    // Fallback if browser doesn't support direct file attachment share:
    pdf.save(fileName);
    toast.success('PDF ഫയൽ ഡൗൺലോഡ് ചെയ്തു! വാട്സാപ്പിൽ അയക്കാം.', { id: loadingToast });
    
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n\n📄 (PDF File downloaded to your device)")}`;
    window.open(waUrl, '_blank');
  } catch (err) {
    console.error('Error sharing PDF:', err);
    toast.error('PDF തയ്യാറാക്കാൻ സാധിച്ചില്ല. പ്രിന്റ് വിൻഡോ ഉപയോഗിക്കുക.', { id: loadingToast });
    printCourtComboReport(primaryMember, memberClaims);
  }
};

/**
 * Aliases for backwards compatibility
 */
export const shareCourtComboReport = shareCourtComboPdf;
export const downloadCourtComboHtml = downloadCourtComboPdf;
export const downloadCourtClaimPdf = (claim: any, memberProfile?: any) => {
  if (!claim) return Promise.resolve();
  if (Array.isArray(claim)) {
    return downloadCourtComboPdf(memberProfile, claim);
  }
  if (Array.isArray(memberProfile)) {
    return downloadCourtComboPdf(claim, memberProfile);
  }
  const prof = memberProfile || (claim?.userProfile ? claim.userProfile : claim);
  return downloadCourtComboPdf(prof, [claim]);
};
export const shareCourtClaimPdf = (claim: any, memberProfile?: any) => shareCourtComboPdf(memberProfile || claim, Array.isArray(claim) ? claim : [claim]);


/**
 * Print Full Admin Claim Report (Single person)
 */
export const printFullAdminClaimReport = (claim: any, memberProfile?: any) => {
  if (!claim) return;
  const tokenDisplay = claim.tokenNo ?? claim.serialNo ?? 'N/A';
  const name = claim.userName || memberProfile?.name || 'Member';

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Full Admin Claim Report - #${tokenDisplay} - ${name}</title>
        <style>
          ${getCourtReportBaseStyles()}
        </style>
      </head>
      <body onload="window.print();">
        <div class="watermark">CONSIGNMENT ADVANCE STATEMENT</div>
        ${renderPersonFullAdminClaimPage(claim, memberProfile, 1, 1)}
      </body>
    </html>
  `);
  printWin.document.close();
};

/**
 * Print Full Admin Combo Report (All persons in a combo with full admin fields)
 */
export const printFullAdminComboReport = (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    alert('No records found to print.');
    return;
  }

  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print the report.');
    return;
  }

  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Combo';

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Full Admin Combo Report (${totalCount} Pages) - ${primeName}</title>
        <style>
          ${getCourtReportBaseStyles()}
        </style>
      </head>
      <body onload="window.print();">
        <div class="watermark">CONSIGNMENT ADVANCE STATEMENT</div>
        ${cleanClaims.map((claim, idx) => {
          return renderPersonFullAdminClaimPage(claim, primaryMember, idx + 1, totalCount);
        }).join('')}
      </body>
    </html>
  `);
  printWin.document.close();
};

/**
 * Generate Full Admin Combo PDF
 */
export const generateFullAdminComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    throw new Error('No claim records found.');
  }

  const uniqueMap = new Map<string, any>();
  for (const c of memberClaims) {
    const key = c.id || `${c.userMobile || ''}_${c.userName || ''}_${c.highrichId || ''}_${c.relation || ''}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const cleanClaims = Array.from(uniqueMap.values());
  const totalCount = cleanClaims.length;
  const primeName = primaryMember?.name || cleanClaims[0]?.userName || 'Admin_Record';
  const safeName = primeName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Admin_Full_Record_${safeName}.pdf`;

  const totalPaid = cleanClaims.reduce((sum, c) => sum + (Number(c.totalPaid) || 0), 0);
  const totalReceived = cleanClaims.reduce((sum, c) => sum + (Number(c.totalReceived) || 0), 0);
  const totalPending = cleanClaims.reduce((sum, c) => sum + (Number(c.totalPending) || 0), 0);
  const firstToken = cleanClaims[0]?.tokenNo ?? cleanClaims[0]?.serialNo ?? '1';

  // Ensure fonts are loaded in browser
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font readiness check error
    }
  }

  // Create temporary container off-screen strictly containing only the clean A4 page without toolbar
  const container = document.createElement('div');
  container.id = 'pdf-admin-render-offscreen';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#0f172a';
  container.style.zIndex = '-999999';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  // Inject base styles
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    ${getCourtReportBaseStyles()}
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
  `;
  container.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleanClaims.map((claim, idx) => {
    return `<div class="pdf-single-page">
      ${renderPersonFullAdminClaimPage(claim, primaryMember, idx + 1, totalCount)}
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
      totalCount,
      totalPaid,
      totalReceived,
      totalPending,
      firstToken
    };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Direct .PDF File Download for Full Admin Record
 */
export const downloadFullAdminComboPdf = async (primaryMember: any, memberClaims: any[]) => {
  if (!memberClaims || memberClaims.length === 0) {
    toast.error('ഡൗൺലോഡ് ചെയ്യാനുള്ള ക്ലെയിം വിവരങ്ങൾ ലഭ്യമല്ല');
    return;
  }

  const loadingToast = toast.loading('അഡ്മിൻ റെക്കോർഡ് PDF തയ്യാറാക്കുന്നു... (Generating Admin PDF...)');
  try {
    const { pdf, fileName } = await generateFullAdminComboPdf(primaryMember, memberClaims);
    
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    toast.success('Admin PDF വിജയകരമായി ഡൗൺലോഡ് ചെയ്തു!', { id: loadingToast });
  } catch (err: any) {
    console.error('Error downloading Admin PDF:', err);
    toast.error('Admin PDF ഡൗൺലോഡ് ചെയ്യാൻ സാധിച്ചില്ല: ' + (err?.message || 'Error'), { id: loadingToast });
  }
};

export const downloadFullAdminClaimPdf = (claim: any, memberProfile?: any) => downloadFullAdminComboPdf(memberProfile, [claim]);

export const printCustomerClaimReport = printFullAdminClaimReport;
export const printCustomerComboReport = printFullAdminComboReport;
export const printMemberComboReport = printCourtComboReport;
export const printMemberClaimReport = printCourtClaimReport;

export {
  renderPersonCompetentAuthorityClaimPage,
  getCompetentAuthorityStyles,
  getCompetentAuthorityClaimFullHtml,
  printCompetentAuthorityClaimReport,
  generateCompetentAuthorityClaimPdf,
  downloadCompetentAuthorityClaimPdf,
  printManagementAndCompetentAuthorityComboReport,
  generateManagementAndCompetentAuthorityComboPdf,
  downloadManagementAndCompetentAuthorityComboPdf,
  numberToWordsIndian
} from './competentAuthorityPrint';



