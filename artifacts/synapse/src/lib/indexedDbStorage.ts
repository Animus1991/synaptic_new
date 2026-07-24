const DB_NAME = 'synapse-learning';
const DB_VERSION = 3;
const TEXT_STORE = 'file-text';
const THUMBNAIL_STORE = 'file-thumbnails';
const BLOB_STORE = 'file-blobs';
const LARGE_TEXT_THRESHOLD = 48_000;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TEXT_STORE)) {
        db.createObjectStore(TEXT_STORE);
      }
      if (!db.objectStoreNames.contains(THUMBNAIL_STORE)) {
        db.createObjectStore(THUMBNAIL_STORE);
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbSaveText(fileId: string, text: string): Promise<void> {
  try {
    await idbPut(TEXT_STORE, fileId, text);
  } catch {
    // IndexedDB unavailable — caller keeps inline text in localStorage
  }
}

export async function idbLoadText(fileId: string): Promise<string | null> {
  try {
    return await idbGet<string>(TEXT_STORE, fileId);
  } catch {
    return null;
  }
}

export async function idbDeleteText(fileId: string): Promise<void> {
  try {
    await idbDelete(TEXT_STORE, fileId);
  } catch {
    // ignore
  }
}

export async function idbSaveThumbnail(storageKey: string, blob: Blob): Promise<void> {
  await idbPut(THUMBNAIL_STORE, storageKey, blob);
}

export async function idbLoadThumbnail(storageKey: string): Promise<Blob | null> {
  try {
    return await idbGet<Blob>(THUMBNAIL_STORE, storageKey);
  } catch {
    return null;
  }
}

export async function idbDeleteThumbnail(storageKey: string): Promise<void> {
  try {
    await idbDelete(THUMBNAIL_STORE, storageKey);
  } catch {
    // ignore
  }
}

export async function idbSaveSourceBlob(fileId: string, blob: Blob): Promise<void> {
  await idbPut(BLOB_STORE, fileId, blob);
}

export async function idbLoadSourceBlob(fileId: string): Promise<Blob | null> {
  try {
    return await idbGet<Blob>(BLOB_STORE, fileId);
  } catch {
    return null;
  }
}

export async function idbDeleteSourceBlob(fileId: string): Promise<void> {
  try {
    await idbDelete(BLOB_STORE, fileId);
  } catch {
    // ignore
  }
}

export function shouldOffloadText(text: string | undefined): boolean {
  return !!text && text.length >= LARGE_TEXT_THRESHOLD;
}

export { LARGE_TEXT_THRESHOLD };
