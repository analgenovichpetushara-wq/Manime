import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError } from '@/core/errors/AppError';
import { createLogger } from '@/core/logging/logger';

const log = createLogger('storage');

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;
}

/** In-memory fallback used when the platform storage is unavailable (keeps the app alive). */
export class MemoryStorage implements KeyValueStorage {
  private readonly map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
  async multiRemove(keys: string[]) {
    keys.forEach((key) => this.map.delete(key));
  }
  keys(): string[] {
    return [...this.map.keys()];
  }
}

let activeStorage: KeyValueStorage = AsyncStorage as unknown as KeyValueStorage;

export function setActiveStorage(storage: KeyValueStorage) {
  activeStorage = storage;
}

export function getActiveStorage(): KeyValueStorage {
  return activeStorage;
}

export const STORAGE_PREFIX = 'animalc';

export function storageKey(namespace: string, key = 'state'): string {
  return `${STORAGE_PREFIX}:${namespace}:${key}`;
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await activeStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    log.warn('corrupted entry, resetting', { key });
    await safeRemove(key);
    if (error instanceof AppError) throw error;
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await activeStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    log.error('write failed', { key });
    throw new AppError({ code: 'STORAGE_ERROR', message: `failed to persist ${key}`, cause: error });
  }
}

export async function safeRemove(key: string): Promise<void> {
  try {
    await activeStorage.removeItem(key);
  } catch {
    log.warn('remove failed', { key });
  }
}

export async function clearNamespace(namespace: string): Promise<void> {
  try {
    const keys = await activeStorage.getItem(storageKey(namespace, 'index'));
    const parsed = keys ? (JSON.parse(keys) as string[]) : [];
    const full = parsed.map((key) => storageKey(namespace, key));
    if (activeStorage.multiRemove) await activeStorage.multiRemove(full);
    else for (const key of full) await activeStorage.removeItem(key);
    await activeStorage.removeItem(storageKey(namespace, 'index'));
  } catch (error) {
    log.warn('clear namespace failed', { namespace });
    throw new AppError({ code: 'STORAGE_ERROR', message: 'failed to clear namespace', cause: error });
  }
}

/** Persisted key-value store with corruption recovery, used by caches and settings. */
export class PersistentMap<V> {
  private memory = new Map<string, V>();
  private loaded = false;

  constructor(
    private readonly namespace: string,
    private readonly maxEntries = 500,
  ) {}

  private indexKey() {
    return storageKey(this.namespace, 'index');
  }

  private entryKey(id: string) {
    return storageKey(this.namespace, id);
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const rawIndex = await activeStorage.getItem(this.indexKey());
      const ids = rawIndex ? (JSON.parse(rawIndex) as string[]) : [];
      const entries = await Promise.all(
        ids.map(async (id) => {
          const raw = await activeStorage.getItem(this.entryKey(id));
          if (!raw) return null;
          try {
            return [id, JSON.parse(raw) as V] as const;
          } catch {
            await safeRemove(this.entryKey(id));
            return null;
          }
        }),
      );
      this.memory = new Map(entries.filter((entry): entry is readonly [string, V] => entry !== null));
    } catch {
      log.warn('index corrupted, rebuilding empty', { namespace: this.namespace });
      this.memory = new Map();
      await safeRemove(this.indexKey());
    }
  }

  async getAll(): Promise<Map<string, V>> {
    await this.ensureLoaded();
    return new Map(this.memory);
  }

  async get(id: string): Promise<V | undefined> {
    await this.ensureLoaded();
    return this.memory.get(id);
  }

  async set(id: string, value: V): Promise<void> {
    await this.ensureLoaded();
    this.memory.set(id, value);
    await writeJson(this.entryKey(id), value);
    await this.persistIndex();
  }

  async delete(id: string): Promise<void> {
    await this.ensureLoaded();
    this.memory.delete(id);
    await safeRemove(this.entryKey(id));
    await this.persistIndex();
  }

  async clear(): Promise<void> {
    await this.ensureLoaded();
    const ids = [...this.memory.keys()];
    this.memory.clear();
    for (const id of ids) await safeRemove(this.entryKey(id));
    await safeRemove(this.indexKey());
  }

  private async persistIndex(): Promise<void> {
    const ids = [...this.memory.keys()];
    if (ids.length > this.maxEntries) {
      const overflow = ids.slice(0, ids.length - this.maxEntries);
      for (const id of overflow) {
        this.memory.delete(id);
        await safeRemove(this.entryKey(id));
      }
    }
    await writeJson(this.indexKey(), [...this.memory.keys()]);
  }
}
