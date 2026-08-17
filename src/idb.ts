/**
 * Tiny IndexedDB wrapper — just enough to persist recent-file entries
 * (FileSystemFileHandle is structured-cloneable, so Chrome/Edge can
 * reopen files across sessions with one permission click).
 */

const DB_NAME = "opentypora";
const STORE = "recents";

export interface RecentEntry {
  key: string;
  name: string;
  ts: number;
  handle?: FileSystemFileHandle;
  tauriPath?: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecent(entry: Omit<RecentEntry, "ts">): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put({ ...entry, ts: Date.now() } as RecentEntry));
  } catch (e) {
    console.warn("saveRecent failed:", e);
  }
}

export async function listRecents(): Promise<RecentEntry[]> {
  try {
    const all = await tx<RecentEntry[]>("readonly", (s) => s.getAll() as IDBRequest<RecentEntry[]>);
    return all.sort((a, b) => b.ts - a.ts).slice(0, 10);
  } catch {
    return [];
  }
}

export async function removeRecent(key: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(key));
  } catch {
    /* ignore */
  }
}
