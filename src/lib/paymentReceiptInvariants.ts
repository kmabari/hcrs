export type PaymentPersistenceState = {
  paymentSaved: boolean;
  memberApplied: boolean;
  receiptSaved: boolean;
};

export const getPaymentPersistencePlan = (state: PaymentPersistenceState) => ({
  writePayment: !state.paymentSaved,
  updateMember: !state.memberApplied,
  writeReceipt: !state.receiptSaved,
  complete: state.paymentSaved && state.memberApplied && state.receiptSaved
});

export const getRazorpayReceiptDocumentId = (paymentId: string) =>
  `razorpay_${String(paymentId || '').replace(/[^A-Za-z0-9_-]/g, '')}`;

export const getReceiptPaymentKey = (receipt: Record<string, any>) => {
  const paymentId = String(receipt.paymentId || receipt.transactionId || '').trim();
  if (paymentId) return `payment:${paymentId}`;

  const receiptNo = String(receipt.receiptNo || '').trim();
  if (receiptNo) return `receipt:${receiptNo}`;

  return `document:${String(receipt.id || '')}`;
};

export const memberHasAppliedPayment = (member: Record<string, any>, paymentId: string) =>
  [member.paymentId, member.transactionId, member.renewalTransactionId]
    .some(value => String(value || '') === String(paymentId || ''));
