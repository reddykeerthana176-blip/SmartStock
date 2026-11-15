const DB_NAME = 'SmartStock_Offline_DB';
const DB_VERSION = 1;

let dbPromise = null;

const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Products store for offline browsing & POS lookup
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: '_id' });
        prodStore.createIndex('SKU', 'SKU', { unique: false });
        prodStore.createIndex('barcode', 'barcode', { unique: false });
        prodStore.createIndex('category', 'category', { unique: false });
      }

      // Sync queue store for offline sales & stock-ins
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'operationId' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('createdAt', 'clientTimestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB Error]', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
};

/**
 * Cache products from server to IndexedDB
 */
export const cacheProductsOffline = async (products = []) => {
  try {
    const db = await openDB();
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    for (const product of products) {
      store.put(product);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Product caching failed:', err);
  }
};

/**
 * Get all cached products from IndexedDB
 */
export const getOfflineProducts = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

/**
 * Queue an operation while offline
 */
export const queueOfflineOperation = async (op) => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');

    const operationRecord = {
      operationId: op.operationId || `OP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      entityType: op.entityType,
      action: op.action,
      payload: op.payload,
      idempotencyKey: op.idempotencyKey || `IDEM-${Date.now()}`,
      clientTimestamp: new Date().toISOString(),
      status: 'PENDING',
    };

    store.put(operationRecord);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(operationRecord);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to queue offline operation:', err);
    throw err;
  }
};

/**
 * Get all pending offline operations
 */
export const getPendingSyncQueue = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

/**
 * Clear synced items from the queue
 */
export const clearSyncedOperations = async (operationIds = []) => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');

    for (const opId of operationIds) {
      store.delete(opId);
    }

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
};
