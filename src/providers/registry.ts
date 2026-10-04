import type { ProviderDescriptor } from '@/providers/types';
import { env } from '@/core/config/env';
import { AnilibriaProvider } from '@/providers/implementations/anilibria/provider';
import { CvhProvider } from '@/providers/implementations/cvh/provider';
import { KodikProvider } from '@/providers/implementations/kodik/provider';
import { Anime365Provider } from '@/providers/implementations/anime365/provider';
import { ShikimoriProvider } from '@/providers/implementations/shikimori/provider';
import { ProviderManager } from '@/providers/manager';

/**
 * Provider catalogue.
 *
 * Live-audited endpoints (docs/PROVIDERS.md, scripts/live-provider-check.mjs):
 *  - anilibria → full pipeline without credentials: catalogue, episodes, Russian
 *                voiceover, HLS 480/720/1080 and opening/ending timecodes.
 *  - kodik     → /search and /list require a partner token; catalogue, material
 *                metadata, episode list, translations and qualities. No media
 *                URLs are published, so streams stay false and the official
 *                embed link is surfaced instead.
 *  - anime365  → catalogue, episodes and Russian voiceovers without credentials.
 *  - cvh       → open player API (no credentials): playlist of every episode and
 *                dub plus HLS/MP4 links. It has no catalogue, so it is resolved
 *                from a CVH link/id the user provides.
 *  - shikimori → public metadata enrichment (Russian titles, genres, scores).
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
    id: 'cvh',
    name: 'CVH (CdnVideoHub)',
    descriptionKey: 'providers.cvh.description',
    unavailableReasonKey: 'providers.cvh.noSearch',
    capabilities: {
      search: false,
      metadata: true,
      episodes: true,
      streams: true,
      voiceovers: true,
      qualities: true,
      schedule: false,
      publicApi: true,
    },
    homepage: 'https://cdnvideohub.com',
    enabledByDefault: true,
  },
  {
    id: 'kodik',
    name: 'Kodik',
    descriptionKey: 'providers.kodik.description',
    unavailableReasonKey: 'providers.kodik.requiresToken',
    capabilities: {
      search: true,
      metadata: true,
      episodes: true,
      streams: false,
      voiceovers: true,
      qualities: true,
      schedule: false,
      publicApi: false,
    },
    homepage: 'https://kodik.info',
    enabledByDefault: true,
    isConfigured: () => env.kodikToken.length > 0 || env.kodikGatewayUrl.length > 0,
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
];

export function createProviderManager(): ProviderManager {
  const manager = new ProviderManager();
  manager.register(new AnilibriaProvider());
  manager.register(new CvhProvider());
  manager.register(new KodikProvider());
  manager.register(new Anime365Provider());
  manager.register(new ShikimoriProvider());
  const disabled = PROVIDER_DESCRIPTORS.filter((descriptor) => !descriptor.enabledByDefault).map(
    (descriptor) => descriptor.id,
  );
  manager.setDisabled(disabled);
  return manager;
}

export function descriptorFor(providerId: string): ProviderDescriptor | undefined {
  return PROVIDER_DESCRIPTORS.find((descriptor) => descriptor.id === providerId);
}
