export const HCRS_OFFICIAL_UPI_ID = 'gpay-11261967768@okbizaxis';
export const HCRS_OFFICIAL_UPI_NAME = 'HIGHRICH COMMUNITY REVIVAL SOCIETY';

// Decoded from the original working Google Pay merchant QR supplied by HCRS.
// Merchant metadata must be preserved; a plain pa/pn UPI URI is rejected by
// Google Pay for this merchant VPA even though it can display the payee name.
export const HCRS_OFFICIAL_MERCHANT_UPI_PAYLOAD =
  'upi://pay?pa=gpay-11261967768@okbizaxis&mc=5411&pn=Google%20Pay%20Merchant&oobe=fos123&qrst=stn&tr=1261967768&cu=INR&ver=01&mode=01';

export function buildUpiPaymentPayload(upiId: string, accountName: string, amount?: number): string {
  const normalizedUpiId = (upiId || HCRS_OFFICIAL_UPI_ID).trim().toLowerCase();
  if (normalizedUpiId === HCRS_OFFICIAL_UPI_ID) {
    // Do not append an amount or alter the original signed merchant fields.
    return HCRS_OFFICIAL_MERCHANT_UPI_PAYLOAD;
  }

  const params = new URLSearchParams({
    pa: normalizedUpiId,
    pn: (accountName || HCRS_OFFICIAL_UPI_NAME).trim(),
    cu: 'INR'
  });
  if (amount && Number.isFinite(amount) && amount > 0) {
    params.set('am', amount.toFixed(2));
  }
  return `upi://pay?${params.toString()}`;
}

export function buildUpiQrImageUrl(upiId: string, accountName: string, amount?: number, size = 300): string {
  const payload = buildUpiPaymentPayload(upiId, accountName, amount);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
