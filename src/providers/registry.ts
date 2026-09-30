import type { ProviderDescriptor } from '@/providers/types';
import { AnilibriaProvider } from '@/providers/implementations/anilibria/provider';
import { Anime365Provider } from '@/providers/implementations/anime365/provider';
import { ShikimoriProvider } from '@/providers/implementations/shikimori/provider';
import { AniDubProvider } from '@/providers/implementations/anidub/provider';
import { ProviderManager } from '@/providers/manager';

/**
 * Provider catalogue.
 *
 * Verified live (see docs/PROVIDERS.md and scripts/live-provider-check.mjs):
 *  - anilibria  → full pipeline (catalogue, episodes, HLS 480/720/1080, skip timecodes)
 *  - anime365   → catalogue, episodes and Russian voiceover list (streams require auth, disabled honestly)
 *  - shikimori  → metadata enrichment (Russian titles, genres, scores)
 *  - anidub     → probed, requires a personal bearer token → registered but reported unavailable, never faked
 */
export const PROVIDER_DESCRIPTORS: ProviderDescriptor[] = [
  {
    id: 'anilibria',
    name: 'AniLibria',
    descriptionKey: 'providers.anilibria.description',
    capabilities: {
      search: true,
      metadata: true,
      episodes: true,
      streams: true,
      voiceovers: true,
      qualities: true,
      schedule: true,
      publicApi: true,
    },
    homepage: 'https://aniliberty.top',
    enabledByDefault: true,
  },
  {
    id: 'anime365',
    name: 'Anime 365 (Smotret-Anime)',
    descriptionKey: 'providers.anime365.description',
    unavailableReasonKey: 'providers.anime365.streamsRequireAuth',
    capabilities: {
      search: true,
      metadata: true,
      episodes: true,
      streams: false,
      voiceovers: true,
      qualities: false,
      schedule: false,
      publicApi: true,
    },
    homepage: 'https://smotret-anime.online',
    enabledByDefault: true,
  },
  {
    id: 'shikimori',
    name: 'Shikimori',
    descriptionKey: 'providers.shikimori.description',
    capabilities: {
      search: true,
      metadata: true,
      episodes: false,
      streams: false,
      voiceovers: false,
      qualities: false,
      schedule: false,
      publicApi: true,
    },
    homepage: 'https://shikimori.io',
    enabledByDefault: true,
  },
  {
    id: 'anidub',
    name: 'AniDUB / AniBoom',
    descriptionKey: 'providers.anidub.description',
    unavailableReasonKey: 'providers.anidub.requiresToken',
    capabilities: {
      search: false,
      metadata: false,
      episodes: false,
      streams: false,
      voiceovers: false,
      qualities: false,
      schedule: false,
      publicApi: false,
    },
    homepage: 'https://aniboom.one',
    enabledByDefault: false,
  },
];

export function createProviderManager(): ProviderManager {
  const manager = new ProviderManager();
  manager.register(new AnilibriaProvider());
  manager.register(new Anime365Provider());
  manager.register(new ShikimoriProvider());
  manager.register(new AniDubProvider());
  const disabled = PROVIDER_DESCRIPTORS.filter((descriptor) => !descriptor.enabledByDefault).map(
    (descriptor) => descriptor.id,
  );
  manager.setDisabled(disabled);
  return manager;
}

export function descriptorFor(providerId: string): ProviderDescriptor | undefined {
  return PROVIDER_DESCRIPTORS.find((descriptor) => descriptor.id === providerId);
}
