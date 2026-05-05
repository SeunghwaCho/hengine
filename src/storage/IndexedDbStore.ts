import type { KvStore } from "./KvStore.js";
import { MemoryStore } from "./MemoryStore.js";

export interface IndexedDbStoreOptions {
  dbName: string;
  /** Store name. Default "kv". */
  storeName?: string;
  /** Schema version. Increment when changing the store. Default 1. */
  version?: number;
}

type Backing =
  | { kind: "idb"; db: IDBDatabase }
  | { kind: "mem"; store: MemoryStore };

/**
 * IndexedDB-backed KvStore with automatic in-memory fallback when:
 *   - IndexedDB is unavailable (private browsing, hostile env)
 *   - Open fails (corrupt db, blocked)
 *   - A read/write transaction throws (e.g., quota exceeded)
 *
 * Usage:
 *   const store = new IndexedDbStore({ dbName: "mygame" });
 *   await store.init();
 *   await store.set("save", { ...gameState });
 */
export class IndexedDbStore implements KvStore {
  private backing: Backing | null = null;
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly version: number;

  constructor(options: IndexedDbStoreOptions) {
    this.dbName = options.dbName;
    this.storeName = options.storeName ?? "kv";
    this.version = options.version ?? 1;
  }

  /** Open the database. Falls back to in-memory on any error. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.backing) return;
    try {
      const db = await this.openDb();
      this.backing = { kind: "idb", db };
    } catch (err) {
      console.warn("[hengine] IndexedDB unavailable, using memory fallback:", err);
      this.backing = { kind: "mem", store: new MemoryStore() };
    }
  }

  isUsingFallback(): boolean {
    return this.backing?.kind === "mem";
  }

  private async ensure(): Promise<Backing> {
    if (!this.backing) await this.init();
    return this.backing!;
  }

  private demoteToFallback(): MemoryStore {
    if (this.backing?.kind === "mem") return this.backing.store;
    console.warn("[hengine] IndexedDB read/write failed — demoting to memory fallback");
    const store = new MemoryStore();
    this.backing = { kind: "mem", store };
    return store;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("indexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (): void => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = (): void => resolve(req.result);
      req.onerror = (): void => reject(req.error ?? new Error("idb open failed"));
      req.onblocked = (): void => reject(new Error("idb open blocked"));
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const b = await this.ensure();
    if (b.kind === "mem") return b.store.get<T>(key);
    return new Promise((resolve) => {
      try {
        const tx = b.db.transaction(this.storeName, "readonly");
        const req = tx.objectStore(this.storeName).get(key);
        req.onsuccess = (): void => resolve(req.result as T | undefined);
        req.onerror = (): void => {
          this.demoteToFallback();
          resolve(undefined);
        };
      } catch {
        this.demoteToFallback();
        resolve(undefined);
      }
    });
  }

  async set(key: string, value: unknown): Promise<void> {
    const b = await this.ensure();
    if (b.kind === "mem") return b.store.set(key, value);
    return new Promise((resolve) => {
      try {
        const tx = b.db.transaction(this.storeName, "readwrite");
        const req = tx.objectStore(this.storeName).put(value, key);
        req.onsuccess = (): void => resolve();
        req.onerror = (): void => {
          const fb = this.demoteToFallback();
          fb.set(key, value).then(() => resolve());
        };
      } catch {
        const fb = this.demoteToFallback();
        fb.set(key, value).then(() => resolve());
      }
    });
  }

  async delete(key: string): Promise<void> {
    const b = await this.ensure();
    if (b.kind === "mem") return b.store.delete(key);
    return new Promise((resolve) => {
      try {
        const tx = b.db.transaction(this.storeName, "readwrite");
        const req = tx.objectStore(this.storeName).delete(key);
        req.onsuccess = (): void => resolve();
        req.onerror = (): void => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clear(): Promise<void> {
    const b = await this.ensure();
    if (b.kind === "mem") return b.store.clear();
    return new Promise((resolve) => {
      try {
        const tx = b.db.transaction(this.storeName, "readwrite");
        const req = tx.objectStore(this.storeName).clear();
        req.onsuccess = (): void => resolve();
        req.onerror = (): void => resolve();
      } catch {
        resolve();
      }
    });
  }

  async keys(): Promise<string[]> {
    const b = await this.ensure();
    if (b.kind === "mem") return b.store.keys();
    return new Promise((resolve) => {
      try {
        const tx = b.db.transaction(this.storeName, "readonly");
        const req = tx.objectStore(this.storeName).getAllKeys();
        req.onsuccess = (): void => resolve((req.result as IDBValidKey[]).map(String));
        req.onerror = (): void => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
}
