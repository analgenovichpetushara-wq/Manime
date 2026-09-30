import { titleCache } from '@/services/titleCache';
import { TtlCache } from '@/core/cache/cache';
import { clearNamespace } from '@/core/storage/storage';

const auxiliaryCaches: TtlCache<unknown>[] = [];

export function registerAuxiliaryCache(cache: TtlCache<unknown>): void {
  auxiliaryCaches.push(cache);
}

export async function cacheStats(): Promise<{ titles: number; auxiliary: number }> {
  const titles = await titleCache.size();
  let auxiliary = 0;
  for (const cache of auxiliaryCaches) auxiliary += await cache.size();
  return { titles, auxiliary };
}

export async function pruneCaches(): Promise<number> {
  let removed = await titleCache.prune();
  for (const cache of auxiliaryCaches) removed += await cache.prune();
  return removed;
}

/** Full reset used by Settings → Clear cache. Preserves user data (lists, progress). */
export async function clearCaches(): Promise<void> {
  await titleCache.clear();
  for (const cache of auxiliaryCaches) await cache.clear();
  await clearNamespace('cache:title');
  await clearNamespace('cache:search');
}
