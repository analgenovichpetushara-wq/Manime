import type { AnimeTitle, Paged } from '@/data/models/anime';
import { createLogger } from '@/core/logging/logger';
import { EMPTY_FILTERS } from '@/data/models/anime';
import { AnilibriaApi } from '@/providers/implementations/anilibria/api';
import { mapRelease } from '@/providers/implementations/anilibria/mapper';
import { CvhApi, CVH_ID, parseCvhReference } from '@/providers/implementations/cvh/api';
import { ShikimoriProvider } from '@/providers/implementations/shikimori/provider';
import { SHIKIMORI_ID } from '@/providers/implementations/shikimori/mapper';
import { bestMatch, bestNameSimilarity, matchTargetOf, type MatchCandidate, type MatchTarget } from '@/providers/matching/titleMatch';
import { cvhMappingActions, readCvhMapping, type CvhMapping } from '@/store/cvhMappingStore';

const log = createLogger('cvh-link');

export interface CvhResolution {
  cvhId: string;
  origin: CvhMapping['origin'];
  score?: number;
  sourceUrl?: string;
}

const CACHE_TTL_MS = 10 * 60_000;
/** A playlist name this different from the title is a different release. */
const PLAYLIST_NAME_MIN = 0.5;
const cache = new Map<string, { value: CvhResolution | null; at: number }>();

export interface CvhLookupDeps {
  api?: Pick<AnilibriaApi, 'search'>;
  shikimori?: Pick<ShikimoriProvider, 'search'>;
  playlistTitle?: (cvhId: string) => Promise<string | null>;
}

function remember(titleId: string, value: CvhResolution | null): CvhResolution | null {
  cache.set(titleId, { value, at: Date.now() });
  return value;
}

function store(title: AnimeTitle, resolution: CvhResolution): CvhResolution {
  cvhMappingActions.set(title.id, {
    cvhId: resolution.cvhId,
    origin: resolution.origin,
    score: resolution.score,
    sourceUrl: resolution.sourceUrl,
    addedAt: Date.now(),
  });
  return resolution;
}

/** Clears resolved ids (after a mapping change or a provider failure). */
export function clearCvhCache(titleId?: string): void {
  if (titleId) cache.delete(titleId);
  else cache.clear();
}

/**
 * Candidate CdnVideoHub ids for a title, in the order they are tried.
 *
 * CdnVideoHub publishes no catalogue and no search (its `/player/sv/search`
 * route answers 404), so an id can only come from somewhere that already
 * numbers the same release: a release whose `external_player` points at the
 * CdnVideoHub player, or the Shikimori id the release is filed under — that
 * numbering is what the player uses for its playlists. Every candidate is
 * checked against the playlist's own title before it is accepted.
 */
function shikimoriIdOf(title: AnimeTitle): string | undefined {
  const ref = title.providerRefs.find((item) => item.providerId === SHIKIMORI_ID);
  return ref && /^\d+$/.test(ref.refId) ? ref.refId : undefined;
}

async function findThroughAnilibria(
  target: MatchTarget,
  title: AnimeTitle,
  api: Pick<AnilibriaApi, 'search'>,
): Promise<{ cvhId?: string; shikimoriId?: string; score: number; sourceUrl?: string } | undefined> {
  const names = [title.title, title.titleEn, title.titleOriginal].filter((name): name is string => Boolean(name?.trim()));
  for (const name of names.slice(0, 2)) {
    try {
      const releases = await api.search(name, 20);
      const candidates: MatchCandidate[] = releases.map((release) => ({ title: mapRelease(release) }));
      const match = bestMatch(target, candidates);
      if (!match) continue;
      const matched = match.candidate.title;
      return {
        cvhId: matched.providerRefs.find((ref) => ref.providerId === CVH_ID)?.refId,
        shikimoriId: matched.providerRefs.find((ref) => ref.providerId === SHIKIMORI_ID)?.refId,
        score: Number(match.score.toFixed(3)),
        sourceUrl: matched.externalPlayerUrl,
      };
    } catch (error) {
      log.warn('cvh lookup failed', { error: String(error) });
    }
  }
  return undefined;
}

async function findThroughShikimori(
  target: MatchTarget,
  title: AnimeTitle,
  shikimori: Pick<ShikimoriProvider, 'search'>,
): Promise<{ shikimoriId: string; score: number } | undefined> {
  const names = [title.title, title.titleEn, title.titleOriginal].filter((name): name is string => Boolean(name?.trim()));
  for (const name of names.slice(0, 2)) {
    try {
      const found: Paged<AnimeTitle> = await shikimori.search(name, { ...EMPTY_FILTERS, query: name }, 1);
      const candidates: MatchCandidate[] = found.items.map((item) => ({ title: item }));
      const match = bestMatch(target, candidates);
      if (match && /^\d+$/.test(match.candidate.title.refId)) {
        return { shikimoriId: match.candidate.title.refId, score: Number(match.score.toFixed(3)) };
      }
    } catch (error) {
      log.warn('cvh lookup failed', { error: String(error) });
    }
  }
  return undefined;
}

/**
 * Finds the CdnVideoHub media id for a title, or `null` when it cannot be
 * established. Nothing is guessed: an id is only accepted when the playlist
 * behind it names the same release.
 */
export async function resolveCvhId(
  title: AnimeTitle,
  options: CvhLookupDeps & { lookup?: boolean } = {},
): Promise<CvhResolution | null> {
  const cached = cache.get(title.id);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  // Local first: nothing is requested until a lookup is asked for, so opening a
  // title dialog never fires background traffic.
  const stored = readCvhMapping(title.id);
  if (stored) {
    return remember(title.id, { cvhId: stored.cvhId, origin: stored.origin, score: stored.score, sourceUrl: stored.sourceUrl });
  }

  const ownRef = title.providerRefs.find((ref) => ref.providerId === CVH_ID);
  if (ownRef) return remember(title.id, { cvhId: ownRef.refId, origin: 'title' });

  // A negative local answer is not cached: the lookup below may still find one.
  if (options.lookup === false) return null;

  const target = matchTargetOf(title);
  const playlistTitle = options.playlistTitle ?? defaultPlaylistTitle;
  const confirms = async (cvhId: string): Promise<boolean> => {
    try {
      const name = await playlistTitle(cvhId);
      return Boolean(name && bestNameSimilarity(target.names, name) >= PLAYLIST_NAME_MIN);
    } catch (error) {
      log.warn('cvh playlist check failed', { error: String(error) });
      return false;
    }
  };

  const api = options.api ?? new AnilibriaApi();
  const throughAnilibria = await findThroughAnilibria(target, title, api);

  // A release that points at the CdnVideoHub player states the id outright.
  if (throughAnilibria?.cvhId) {
    return remember(
      title.id,
      store(title, {
        cvhId: throughAnilibria.cvhId,
        origin: 'anilibria',
        score: throughAnilibria.score,
        sourceUrl: throughAnilibria.sourceUrl,
      }),
    );
  }

  const candidates: { cvhId: string; origin: CvhMapping['origin']; score?: number }[] = [];
  const shikimoriRef = shikimoriIdOf(title);
  if (shikimoriRef) candidates.push({ cvhId: shikimoriRef, origin: 'shikimori' });
  if (throughAnilibria?.shikimoriId) candidates.push({ cvhId: throughAnilibria.shikimoriId, origin: 'shikimori', score: throughAnilibria.score });

  if (!candidates.length) {
    const shikimori = options.shikimori ?? new ShikimoriProvider();
    const found = await findThroughShikimori(target, title, shikimori);
    if (found) candidates.push({ cvhId: found.shikimoriId, origin: 'shikimori', score: found.score });
  }

  for (const candidate of candidates) {
    if (await confirms(candidate.cvhId)) {
      return remember(title.id, store(title, { cvhId: candidate.cvhId, origin: candidate.origin, score: candidate.score }));
    }
  }

  return remember(title.id, null);
}

async function defaultPlaylistTitle(cvhId: string): Promise<string | null> {
  const playlist = await new CvhApi().playlist(cvhId);
  return playlist.titleName ?? null;
}

/**
 * Stores a CdnVideoHub reference supplied by the user for a title. Only values
 * that parse as a real CVH reference are accepted.
 */
export function attachCvhReference(title: AnimeTitle, input: string): CvhResolution | null {
  const parsed = parseCvhReference(input);
  if (!parsed) return null;
  const resolution: CvhResolution = { cvhId: parsed.id, origin: 'manual', sourceUrl: input.trim() };
  store(title, resolution);
  clearCvhCache(title.id);
  return resolution;
}

export function detachCvhReference(title: AnimeTitle): void {
  cvhMappingActions.remove(title.id);
  clearCvhCache(title.id);
}

/** The title as the CVH provider sees it, ready for the player. */
export function asCvhTitle(title: AnimeTitle, resolution: CvhResolution): AnimeTitle {
  return {
    ...title,
    id: `${CVH_ID}:${resolution.cvhId}`,
    providerId: CVH_ID,
    refId: resolution.cvhId,
    providerRefs: [{ providerId: CVH_ID, refId: resolution.cvhId }],
    externalPlayerUrl: undefined,
  };
}
