/**
 * Async key-value store interface. Both backing implementations
 * (IndexedDbStore, MemoryStore) honor this contract so callers can swap freely.
 */
export interface KvStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
