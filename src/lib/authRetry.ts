/**
 * Firebase Auth calls fail with `auth/network-request-failed` on weak mobile
 * networks, captive/ad-blocking DNS, or a momentary drop. These are transient,
 * so retry them a few times with backoff before surfacing an error.
 *
 * Only network-level failures are retried. Real auth errors (wrong password,
 * email-already-in-use, ...) are thrown immediately.
 */

export const isNetworkAuthError = (err: any): boolean => {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return code === 'auth/network-request-failed' ||
    code === 'auth/timeout' ||
    msg.includes('network-request-failed');
};

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function withAuthRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1200;
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      if (!isNetworkAuthError(err) || attempt === retries) throw err;
      // Wait for the browser to report connectivity again, but never forever.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await new Promise<void>(resolve => {
          const done = () => { window.removeEventListener('online', done); resolve(); };
          window.addEventListener('online', done);
          setTimeout(done, 8000);
        });
      }
      await sleep(baseDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}

export const NETWORK_ERROR_MESSAGE_ML =
  'ഇന്റർനെറ്റ് കണക്ഷൻ പ്രശ്നം കാരണം സെർവറുമായി ബന്ധപ്പെടാൻ കഴിഞ്ഞില്ല. നെറ്റ്‌വർക്ക് (WiFi/Mobile Data) പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക. VPN / Ad-blocker / Private DNS ഉണ്ടെങ്കിൽ ഓഫ് ചെയ്യുക. (Network error – please check your connection and try again.)';
