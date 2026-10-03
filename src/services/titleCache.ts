import { TtlCache, CacheTtl } from '@/core/cache/cache';
import type { AnimeTitle, Episode, Voiceover } from '@/data/models/anime';

/**
 * Persistent catalogue cache.
 * Guarantees the Home/Search/Lists screens stay usable while providers are down.
 */
class TitleCacheService {
  private readonly titleCache = new TtlCache<AnimeTitle>({ namespace: 'cache:title', ttlMs: CacheTtl.title });
  private readonly searchCache = new TtlCache<{ ids: string[]; at: number }>({
    namespace: 'cache:search',
    ttlMs: CacheTtl.search,
  });
  private readonly episodeCache = new TtlCache<Episode[]>({
    namespace: 'cache:episodes',
    ttlMs: CacheTtl.episodes,
  });
  private readonly voiceoverCache = new TtlCache<Voiceover[]>({
    namespace: 'cache:voiceovers',
    ttlMs: CacheTtl.episodes,
  });
  private readonly index = new Map<string, AnimeTitle>();

  async remember(titles: AnimeTitle[]): Promise<void> {
    for (const title of titles) {
      this.index.set(title.id, title);
      await this.titleCache.set(title.id, title);
    }
  }

  async rememberSearch(key: string, titles: AnimeTitle[]): Promise<void> {
    await this.remember(titles);
    await this.searchCache.set(key, { ids: titles.map((title) => title.id), at: Date.now() });
  }

  async getSearch(key: string): Promise<AnimeTitle[] | undefined> {
    const cached = await this.searchCache.get(key);
    if (!cached) return undefined;
    const titles: AnimeTitle[] = [];
    for (const id of cached.ids) {
      const title = this.index.get(id) ?? (await this.titleCache.getStale(id));
      if (title) titles.push(title);
    }
    return titles.length ? titles : undefined;
  }

  async getTitle(titleId: string): Promise<AnimeTitle | undefined> {
    return this.index.get(titleId) ?? this.titleCache.getStale(titleId);
  }

  async rememberTitle(title: AnimeTitle): Promise<void> {
    this.index.set(title.id, title);
    await this.titleCache.set(title.id, title);
  }

  getTitleSync(titleId: string): AnimeTitle | undefined {
    return this.index.get(titleId);
  }

  /** Normalised episode lists (30 min TTL — short enough to pick up new episodes). */
  async rememberEpisodes(titleId: string, episodes: Episode[]): Promise<void> {
    await this.episodeCache.set(titleId, episodes);
  }

  async getEpisodes(titleId: string): Promise<Episode[] | undefined> {
    return this.episodeCache.get(titleId);
  }

  /** Translations/voiceovers a provider reports for a title. */
  async rememberVoiceovers(titleId: string, voiceovers: Voiceover[]): Promise<void> {
    await this.voiceoverCache.set(titleId, voiceovers);
  }

  async getVoiceovers(titleId: string): Promise<Voiceover[] | undefined> {
    return this.voiceoverCache.get(titleId);
  }

  async clear(): Promise<void> {
    this.index.clear();
    await this.titleCache.clear();
    await this.searchCache.clear();
    await this.episodeCache.clear();
    await this.voiceoverCache.clear();
  }

  async prune(): Promise<number> {
    return (
      (await this.titleCache.prune()) +
      (await this.searchCache.prune()) +
      (await this.episodeCache.prune()) +
      (await this.voiceoverCache.prune())
    );
  }

  async size(): Promise<number> {
    return (
      (await this.titleCache.size()) +
      (await this.searchCache.size()) +
      (await this.episodeCache.size()) +
      (await this.voiceoverCache.size())
    );
  }
}

export const titleCache = new TitleCacheService();
