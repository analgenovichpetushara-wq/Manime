import { PersistentMap } from '@/core/storage/storage';
import { createLogger } from '@/core/logging/logger';

const log = createLogger('cache');

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttlMs: number;
  namespace: string;
  maxEntries?: number;
}

/**
 * Two-layer cache (memory + persistent) with TTL.
 * Stale entries are ignored and pruned, so the app never serves ancient data forever.
 */
export class TtlCache<T> {
  private readonly memory = new Map<string, CacheEntry<T>>();
  private readonly persistent: PersistentMap<CacheEntry<T>>;
  private hydrated = false;

  constructor(private readonly options: CacheOptions) {
    this.persistent = new PersistentMap<CacheEntry<T>>(options.namespace, options.maxEntries ?? 400);
  }

  private isFresh(entry: CacheEntry<T> | undefined, now: number): entry is CacheEntry<T> {
    return !!entry && entry.expiresAt > now;
  }

  async get(key: string): Promise<T | undefined> {
    const now = Date.now();
    const inMemory = this.memory.get(key);
    if (this.isFresh(inMemory, now)) return inMemory.value;
    if (!this.hydrated) {
      this.hydrated = true;
      const all = await this.persistent.getAll();
      for (const [id, entry] of all) {
        if (this.isFresh(entry, now)) this.memory.set(id, entry);
        else void this.persistent.delete(id);
      }
      const fromDisk = this.memory.get(key);
      if (this.isFresh(fromDisk, now)) return fromDisk.value;
    }
    return undefined;
  }

  /** Returns stale data as a fallback when the network is unavailable. */
  async getStale(key: string): Promise<T | undefined> {
    const fresh = await this.get(key);
    if (fresh !== undefined) return fresh;
    const entry = this.memory.get(key) ?? (await this.persistent.get(key));
    return entry?.value;
  }

  async set(key: string, value: T, ttlMs = this.options.ttlMs): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = { value, createdAt: now, expiresAt: now + ttlMs };
    this.memory.set(key, entry);
    this.hydrated = true;
    try {
      await this.persistent.set(key, entry);
    } catch (error) {
      log.warn('cache persist failed', { key, error: String(error) });
    }
  }

  async invalidate(key: string): Promise<void> {
    this.memory.delete(key);
    await this.persistent.delete(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of [...this.memory.keys()]) if (key.startsWith(prefix)) this.memory.delete(key);
    const all = await this.persistent.getAll();
    for (const key of all.keys()) if (key.startsWith(prefix)) await this.persistent.delete(key);
  }

  async clear(): Promise<void> {
    this.memory.clear();
    await this.persistent.clear();
  }

  async size(): Promise<number> {
    const all = await this.persistent.getAll();
    return all.size;
  }

  /** Removes expired entries; called by the settings screen cache manager. */
  async prune(): Promise<number> {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of [...this.memory.entries()]) {
      if (entry.expiresAt <= now) {
        this.memory.delete(key);
        await this.persistent.delete(key);
        removed += 1;
      }
    }
    const all = await this.persistent.getAll();
    for (const [key, entry] of all.entries()) {
      if (entry.expiresAt <= now) {
        await this.persistent.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

export const CacheTtl = {
  search: 5 * 60 * 1000,
  title: 6 * 60 * 60 * 1000,
  episodes: 30 * 60 * 1000,
  catalog: 10 * 60 * 1000,
  genres: 24 * 60 * 60 * 1000,
  schedule: 60 * 60 * 1000,
  health: 2 * 60 * 1000,
  streams: 20 * 60 * 1000,
} as const;
