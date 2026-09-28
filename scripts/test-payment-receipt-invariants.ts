import assert from 'node:assert/strict';
import {
  getPaymentPersistencePlan,
  getRazorpayReceiptDocumentId,
  getReceiptPaymentKey,
  memberHasAppliedPayment,
  classifyCapturedRegistrationCandidates
} from '../src/lib/paymentReceiptInvariants';

const complete = getPaymentPersistencePlan({ paymentSaved: true, memberApplied: true, receiptSaved: true });
assert.deepEqual(complete, { writePayment: false, updateMember: false, writeReceipt: false, complete: true });

const missingReceipt = getPaymentPersistencePlan({ paymentSaved: true, memberApplied: true, receiptSaved: false });
assert.deepEqual(missingReceipt, { writePayment: false, updateMember: false, writeReceipt: true, complete: false });

const missingMember = getPaymentPersistencePlan({ paymentSaved: true, memberApplied: false, receiptSaved: false });
assert.deepEqual(missingMember, { writePayment: false, updateMember: true, writeReceipt: true, complete: false });

assert.equal(getRazorpayReceiptDocumentId('pay_Test-123'), 'razorpay_pay_Test-123');
assert.equal(getReceiptPaymentKey({ paymentId: 'pay_1', receiptNo: 'R-1' }), 'payment:pay_1');
assert.equal(getReceiptPaymentKey({ transactionId: 'pay_1', receiptNo: 'R-2' }), 'payment:pay_1');
assert.equal(getReceiptPaymentKey({ receiptNo: 'R-3', year: 2026 }), 'receipt:R-3');
assert.notEqual(
  getReceiptPaymentKey({ receiptNo: 'R-2026-A', year: 2026 }),
  getReceiptPaymentKey({ receiptNo: 'R-2026-B', year: 2026 })
);

assert.equal(memberHasAppliedPayment({ renewalTransactionId: 'pay_1' }, 'pay_1'), true);
assert.equal(memberHasAppliedPayment({ renewalTransactionId: 'pay_2' }, 'pay_1'), false);

assert.deepEqual(classifyCapturedRegistrationCandidates([]), { status: 'none', candidate: null });
assert.deepEqual(classifyCapturedRegistrationCandidates(['pay_1']), { status: 'unique', candidate: 'pay_1' });
assert.deepEqual(classifyCapturedRegistrationCandidates(['pay_1', 'pay_2']), { status: 'ambiguous', candidate: null });

console.log('Payment/receipt invariant tests passed.');
