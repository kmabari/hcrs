import { auth } from './firebase';

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const parsed = new URL(url, window.location.origin);
  if (parsed.origin !== window.location.origin || (!parsed.pathname.startsWith('/api/admin/') && parsed.pathname !== '/api/save-settings')) return fetch(input, init);
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization') && auth.currentUser) {
    headers.set('Authorization', `Bearer ${await auth.currentUser.getIdToken()}`);
  }
  return fetch(input, { ...init, headers });
}
