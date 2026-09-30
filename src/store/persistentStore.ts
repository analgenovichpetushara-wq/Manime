import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { readJson, storageKey, writeJson } from '@/core/storage/storage';
import { createLogger } from '@/core/logging/logger';

const log = createLogger('store');

export interface PersistedStoreOptions<T> {
  namespace: string;
  version: number;
  /** Only these keys are written to disk. */
  partialize?: (state: T) => Partial<T>;
  /** Called after a document from an older schema version is loaded. */
  migrate?: (state: Record<string, unknown>, fromVersion: number) => Partial<T>;
  debounceMs?: number;
}

interface PersistedDocument<T> {
  version: number;
  savedAt: number;
  state: Partial<T>;
}

export interface PersistedStore<T extends object> {
  store: UseBoundStore<StoreApi<T>>;
  hydrate: () => Promise<void>;
  flush: () => Promise<void>;
  reset: () => Promise<void>;
}

const registry: { hydrate: () => Promise<void>; flush: () => Promise<void> }[] = [];

/** Flushes every persisted store; used by tests and by app background handling. */
export async function flushAllPersistedStores(): Promise<void> {
  await Promise.all(registry.map((entry) => entry.flush()));
}

export async function hydrateAllPersistedStores(): Promise<void> {
  await Promise.all(registry.map((entry) => entry.hydrate()));
}

export function createPersistedStore<T extends object>(
  defaults: T,
  options: PersistedStoreOptions<T>,
): PersistedStore<T> {
  const key = storageKey(options.namespace);
  const store = create<T>()(() => ({ ...defaults }));
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let hydrating = false;

  const serialize = (state: T): Partial<T> =>
    options.partialize ? options.partialize(state) : (state as unknown as Partial<T>);

  const persist = async () => {
    if (hydrating) return;
    try {
      const document: PersistedDocument<T> = {
        version: options.version,
        savedAt: Date.now(),
        state: serialize(store.getState()),
      };
      await writeJson(key, document);
    } catch (error) {
      log.warn('persist failed', { namespace: options.namespace, error: String(error) });
    }
  };

  const schedule = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void persist();
    }, options.debounceMs ?? 250);
  };

  store.subscribe(schedule);

  const hydrate = async () => {
    hydrating = true;
    try {
      const document = await readJson<PersistedDocument<T> | null>(key, null);
      if (!document || typeof document !== 'object' || !document.state) return;
      let restored = document.state as Partial<T>;
      if (document.version !== options.version && options.migrate) {
        restored = options.migrate(document.state as Record<string, unknown>, document.version);
      } else if (document.version !== options.version) {
        // Unknown schema version without a migration: keep defaults (self-healing).
        log.warn('dropping incompatible state', {
          namespace: options.namespace,
          version: document.version,
        });
        return;
      }
      store.setState({ ...defaults, ...restored } as T);
    } catch (error) {
      log.warn('hydrate failed, using defaults', { namespace: options.namespace, error: String(error) });
    } finally {
      hydrating = false;
    }
  };

  const flush = async () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await persist();
  };

  const reset = async () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    store.setState({ ...defaults } as T);
    await writeJson(key, { version: options.version, savedAt: Date.now(), state: serialize(defaults) });
  };

  registry.push({ hydrate, flush });

  return { store, hydrate, flush, reset };
}
