// Native IndexedDB Cache helper for large datasets (e.g. 8000+ member records ~6.5MB)
// Unlike localStorage (which hard-caps at 5MB), IndexedDB supports hundreds of megabytes safely.

const DB_NAME = 'hcrs_offline_store';
const STORE_NAME = 'datasets';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = (err) => {
        console.warn('[idbCache] IndexedDB open error:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[idbCache] IndexedDB initialization error:', e);
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = (err) => {
          console.warn('[idbCache] idbSet error:', err);
          resolve();
        };
      } catch (err) {
        console.warn('[idbCache] Transaction error:', err);
        resolve();
      }
    });
  } catch (e) {
    console.warn('[idbCache] idbSet outer error:', e);
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {}
}
