/**
 * offlineQueue.js
 * ----------------
 * IndexedDB-based offline capture queue for Smart Granite PWA.
 * When a field operator captures a block without internet, the form
 * data is stored here and auto-replayed when connectivity returns.
 *
 * Usage:
 *   import { offlineQueue } from './offlineQueue';
 *   await offlineQueue.enqueue({ blockId: '...', formData: {...} });
 *   const items = await offlineQueue.getAll();
 *   await offlineQueue.replay(submitFn);
 */

const DB_NAME    = 'smart-granite-offline';
const DB_VERSION = 1;
const STORE_NAME = 'capture-queue';

// ── Open DB ───────────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('queued_at', 'queued_at', { unique: false });
        store.createIndex('type',      'type',      { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── Queue API ─────────────────────────────────────────────────────────────────
export const offlineQueue = {

  /** Add a capture to the queue */
  async enqueue(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        ...item,
        queued_at: new Date().toISOString(),
        sync_status: 'pending',   // 'pending' | 'synced' | 'failed'
        retry_count: 0,
      };
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  },

  /** Get all pending items */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = (e) => reject(e.target.error);
    });
  },

  /** Get count of pending items */
  async pendingCount() {
    const all = await this.getAll();
    return all.filter(i => i.sync_status === 'pending').length;
  },

  /** Mark an item as synced and remove it */
  async markSynced(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = (e) => reject(e.target.error);
    });
  },

  /** Mark an item as failed */
  async markFailed(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.sync_status = 'failed';
          item.retry_count = (item.retry_count || 0) + 1;
          store.put(item);
        }
        resolve();
      };
      getReq.onerror = (e) => reject(e.target.error);
    });
  },

  /** Replay all pending items using the provided submit function */
  async replay(submitFn, onProgress) {
    const items = await this.getAll();
    const pending = items.filter(i => i.sync_status === 'pending');
    const results = { synced: 0, failed: 0 };

    for (const item of pending) {
      try {
        await submitFn(item);
        await this.markSynced(item.id);
        results.synced++;
        onProgress?.({ type: 'synced', item, results });
      } catch (err) {
        await this.markFailed(item.id);
        results.failed++;
        onProgress?.({ type: 'failed', item, error: err, results });
      }
    }
    return results;
  },

  /** Clear all synced items */
  async clearSynced() {
    const db = await openDB();
    const items = await this.getAll();
    const synced = items.filter(i => i.sync_status === 'synced');
    for (const item of synced) {
      await this.markSynced(item.id);
    }
  },
};

// ── Network Status Hook ───────────────────────────────────────────────────────
/** Register a service worker and return whether offline queue was replayed */
export async function registerSW(submitFn) {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.warn('[SW] Registration failed:', e);
  }

  // Listen for messages from SW to trigger replay
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'SYNC_QUEUE' && submitFn) {
      const count = await offlineQueue.pendingCount();
      if (count > 0) {
        console.log(`[OfflineQueue] Replaying ${count} queued captures...`);
        await offlineQueue.replay(submitFn);
      }
    }
  });

  // Also replay on network restoration
  window.addEventListener('online', async () => {
    const count = await offlineQueue.pendingCount();
    if (count > 0 && submitFn) {
      console.log(`[OfflineQueue] Online — replaying ${count} queued captures`);
      await offlineQueue.replay(submitFn);
    }
  });
}
