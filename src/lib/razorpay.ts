import { toast } from 'sonner';

export interface RazorpayPaymentOptions {
  paymentType: 'registration' | 'renewal';
  memberId?: string;
  mobile?: string;
  name?: string;
  email?: string;
  amount?: number;
  registrationData?: any;
}

export interface VerifiedPaymentDetails {
  paymentAmount: number;
  paymentId: string;
  orderId: string;
  transactionId: string;
  paymentTime: string;
  paymentMethod: string;
  paymentStatus: string;
  receiptNumber: string;
  memberId: string;
}

/**
 * Dynamically loads Razorpay checkout script if not already present
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Interactive payment modal when Razorpay keys are in demo/sandbox mode
 * Ensures the user MUST see payment details, choose UPI/Card, enter details, and click Pay.
 */
function showInteractiveDemoPaymentModal(
  orderData: any,
  options: RazorpayPaymentOptions
): Promise<VerifiedPaymentDetails> {
  return new Promise((resolve, reject) => {
    const { paymentType, name, mobile, memberId } = options;
    const amount = paymentType === 'registration' ? 200 : 100;
    const title = paymentType === 'registration' 
      ? 'HCRS 1-Year Membership Registration' 
      : 'HCRS 1-Year Membership Renewal';

    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'razorpay-interactive-modal';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(3, 10, 24, 0.85);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
      background: #0f172a;
      border: 2px solid #2563eb;
      border-radius: 24px;
      max-width: 440px;
      width: 100%;
      color: #ffffff;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    `;

    modalBox.innerHTML = `
      <style>
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .rzp-pay-method {
          border: 1.5px solid #334155;
          padding: 12px;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
        }
        .rzp-pay-method:hover, .rzp-pay-method.selected {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }
      </style>
      
      <!-- Modal Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 20px 24px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            <span style="font-weight: 900; letter-spacing: 0.5px; font-size: 16px; color: #ffffff;">RAZORPAY GATEWAY (SANDBOX)</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 2px;">ONLINE PAYMENT TEST ENVIRONMENT</div>
        </div>
        <div style="background: #059669; color: #ffffff; font-weight: 900; padding: 6px 14px; border-radius: 999px; font-size: 16px;">
          ₹${amount}
        </div>
      </div>

      <!-- Modal Body -->
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 18px;">
        <div style="background: #1e293b; padding: 14px; border-radius: 16px; border: 1px solid #334155;">
          <div style="font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Payment Details</div>
          <div style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-top: 4px;">${title}</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">Payer Name: <strong>${name || 'Member'}</strong> | Phone: <strong>${mobile || 'N/A'}</strong></div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Receipt No: ${orderData.receiptNumber || 'RCP-LIVE'}</div>
        </div>

        <div>
          <label style="font-size: 12px; font-weight: 800; color: #cbd5e1; display: block; margin-bottom: 8px; text-transform: uppercase;">Select Payment Method</label>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="rzp-pay-method selected" id="method-upi">
              <input type="radio" name="payMethod" checked style="accent-color: #3b82f6;">
              <div>
                <div style="font-weight: 800; font-size: 13px;">UPI / QR Code</div>
                <div style="font-size: 11px; color: #94a3b8;">Google Pay, PhonePe, Paytm, BHIM</div>
              </div>
            </div>
            <div class="rzp-pay-method" id="method-card">
              <input type="radio" name="payMethod" style="accent-color: #3b82f6;">
              <div>
                <div style="font-weight: 800; font-size: 13px;">Credit / Debit Card</div>
                <div style="font-size: 11px; color: #94a3b8;">Visa, MasterCard, RuPay</div>
              </div>
            </div>
          </div>
        </div>

        <div id="upi-input-container">
          <label style="font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 4px;">Enter VPA / Phone Number for UPI</label>
          <input type="text" id="rzp-vpa-input" value="${mobile ? mobile + '@upi' : 'user@okaxis'}" style="width: 100%; background: #020617; border: 1.5px solid #334155; padding: 10px 14px; border-radius: 12px; color: #ffffff; font-weight: 700; font-size: 13px; outline: none;" />
        </div>

        <div style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); padding: 10px 12px; border-radius: 12px; font-size: 11px; color: #fde047; font-weight: 600;">
          💡 <strong>Notice:</strong> To enable live Razorpay Bank Settlement, set <code style="background: rgba(0,0,0,0.4); padding: 2px 4px; border-radius: 4px;">RAZORPAY_KEY_ID</code> (starts with rzp_test_ or rzp_live_) & <code style="background: rgba(0,0,0,0.4); padding: 2px 4px; border-radius: 4px;">RAZORPAY_KEY_SECRET</code> in server environment secrets.
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 10px; margin-top: 4px;">
          <button id="rzp-cancel-btn" style="flex: 1; height: 48px; border-radius: 14px; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; font-weight: 800; font-size: 13px; cursor: pointer; transition: all 0.2s;">
            Cancel
          </button>
          <button id="rzp-submit-btn" style="flex: 2; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #059669, #0d9488); color: #ffffff; border: none; font-weight: 900; font-size: 14px; cursor: pointer; box-shadow: 0 10px 20px -5px rgba(5, 150, 105, 0.4); transition: all 0.2s;">
            Pay ₹${amount} Now
          </button>
        </div>
      </div>
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    // Method selection listeners
    const methodUpi = modalBox.querySelector('#method-upi') as HTMLElement;
    const methodCard = modalBox.querySelector('#method-card') as HTMLElement;
    const cancelBtn = modalBox.querySelector('#rzp-cancel-btn') as HTMLButtonElement;
    const submitBtn = modalBox.querySelector('#rzp-submit-btn') as HTMLButtonElement;

    methodUpi?.addEventListener('click', () => {
      methodUpi.classList.add('selected');
      methodCard?.classList.remove('selected');
      (methodUpi.querySelector('input') as HTMLInputElement).checked = true;
    });

    methodCard?.addEventListener('click', () => {
      methodCard.classList.add('selected');
      methodUpi?.classList.remove('selected');
      (methodCard.querySelector('input') as HTMLInputElement).checked = true;
    });

    cancelBtn?.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
      reject(new Error('Payment process was cancelled by user.'));
    });

    submitBtn?.addEventListener('click', async () => {
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      submitBtn.innerText = 'Processing Payment...';
      submitBtn.style.opacity = '0.7';

      try {
        await new Promise((r) => setTimeout(r, 1200));

        const mockPayId = `pay_razor_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const mockOrderId = orderData.orderId;

        const verifyRes = await fetch('/api/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: mockOrderId,
            razorpay_payment_id: mockPayId,
            razorpay_signature: 'demo_signature',
            paymentType,
            memberId: memberId || '',
            receiptNumber: orderData.receiptNumber
          })
        });

        if (!verifyRes.ok) {
          throw new Error('Payment verification failed.');
        }

        const verifyData = await verifyRes.json();
        document.body.removeChild(modalOverlay);
        resolve(verifyData.paymentDetails);
      } catch (err: any) {
        document.body.removeChild(modalOverlay);
        reject(err);
      }
    });
  });
}

/**
 * Initiates Razorpay Payment flow with strict backend amount validation & server verification
 * Registration = ₹200 (Fixed)
 * Renewal = ₹100 (Fixed)
 */
export async function processRazorpayPayment(
  options: RazorpayPaymentOptions
): Promise<VerifiedPaymentDetails> {
  const { paymentType, memberId, mobile, name, email, registrationData } = options;

  // 1. Load Razorpay SDK
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Razorpay SDK failed to load. Please check internet connection.');
  }

  // 2. Request backend order creation (Backend enforces fixed amount: 200 for reg, 100 for renewal)
  const orderRes = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentType,
      memberId: memberId || '',
      mobile: mobile || ''
    })
  });

  if (!orderRes.ok) {
    const errData = await orderRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to initialize payment order with server.');
  }

  const orderData = await orderRes.json();
  const expectedAmount = paymentType === 'registration' ? 200 : 100;

  // Verify backend strictly assigned exact business rule amount
  if (orderData.amount !== expectedAmount) {
    throw new Error(`Security Error: Payment amount mismatch. Expected ₹${expectedAmount}`);
  }

  // If environment runs in demo fallback mode without live Razorpay keys configured, show interactive modal
  if (orderData.isDemo) {
    return showInteractiveDemoPaymentModal(orderData, options);
  }

  // 3. Launch Official Razorpay Modal
  return new Promise<VerifiedPaymentDetails>((resolve, reject) => {
    const razorpayOptions = {
      key: orderData.keyId,
      amount: orderData.amountInPaise,
      currency: orderData.currency || 'INR',
      name: 'HIGHRICH COMMUNITY REVIVAL SOCIETY (HCRS)',
      description: paymentType === 'registration' 
        ? '1-Year Membership Registration Fee (₹200)' 
        : '1-Year Membership Renewal Fee (₹100)',
      order_id: orderData.orderId,
      prefill: {
        name: name || '',
        contact: mobile || '',
        email: email || ''
      },
      theme: {
        color: '#0066FF'
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment process was cancelled by user.'));
        }
      },
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType,
              memberId: memberId || '',
              registrationData: registrationData || null,
              receiptNumber: orderData.receiptNumber
            })
          });

          if (!verifyRes.ok) {
            const verifyErr = await verifyRes.json().catch(() => ({}));
            throw new Error(verifyErr.error || 'Payment signature verification failed.');
          }

          const verifyData = await verifyRes.json();
          resolve(verifyData.paymentDetails);
        } catch (err: any) {
          reject(err);
        }
      }
    };

    const rzp = new (window as any).Razorpay(razorpayOptions);
    rzp.on('payment.failed', (resp: any) => {
      reject(new Error(resp.error?.description || 'Razorpay payment failed.'));
    });
    rzp.open();
  });
}

