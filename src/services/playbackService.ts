import type { AnimeTitle, Episode, StreamBundle, StreamSource, Voiceover } from '@/data/models/anime';
import type { CompletionEvent } from '@/core/stats/watchStats';
import { isNightTime } from '@/core/stats/watchStats';
import { progressActions, useProgressStore } from '@/store/progressStore';
import { useListsStore, listsActions } from '@/store/listsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { syncAchievements } from '@/services/achievementService';
import { fetchQualities, fetchStream } from '@/services/providerService';
import { AppError } from '@/core/errors/AppError';

export interface PlaybackPlan {
  bundle: StreamBundle;
  source: StreamSource;
  qualities: { id: string; label: string; height?: number }[];
  skipIntro?: { start: number; end: number };
  skipOutro?: { start: number; end: number };
}

function pickSource(bundle: StreamBundle, preferredQuality?: string, settingsHeight?: number): StreamSource {
  const sources = bundle.sources;
  if (preferredQuality) {
    const exact = sources.find((source) => source.qualityId === preferredQuality);
    if (exact) return exact;
  }
  if (settingsHeight) {
    const byHeight = sources.find((source) => source.height === settingsHeight);
    if (byHeight) return byHeight;
  }
  const preferred = sources.find((source) => source.isDefault);
  return preferred ?? sources[0]!;
}

/** Resolves everything the player needs for one episode, with quality fallback. */
export async function preparePlayback(
  title: AnimeTitle,
  episode: Episode,
  options: { voiceoverId?: string; qualityId?: string; preferredProviderId?: string } = {},
): Promise<PlaybackPlan> {
  const settings = useSettingsStore.getState();
  const bundle = await fetchStream(title, episode, {
    voiceoverId: options.voiceoverId,
    qualityId: options.qualityId,
    preferredProviderId: options.preferredProviderId,
  });
  if (!bundle.sources.length) {
    throw new AppError({ code: 'STREAM_UNAVAILABLE', providerId: bundle.providerId, message: 'bundle without sources' });
  }

  const settingsHeight =
    settings.defaultQuality === 'auto' ? settings.preferredQualityHeight : Number.parseInt(settings.defaultQuality, 10);
  const source = pickSource(bundle, options.qualityId, Number.isFinite(settingsHeight) ? settingsHeight : undefined);

  let qualities: { id: string; label: string; height?: number }[] = bundle.sources.map((item) => ({
    id: item.qualityId,
    label: item.label,
    height: item.height,
  }));
  try {
    const variants = await fetchQualities(title, episode, options.voiceoverId);
    if (variants.length) {
      qualities = variants.map((variant) => ({ id: variant.id, label: variant.label, height: variant.height }));
    }
  } catch {
    // quality listing is optional — the stream bundle already carries labels
  }

  return {
    bundle,
    source,
    qualities,
    skipIntro: episode.introSkip,
    skipOutro: episode.outroSkip,
  };
}

export interface ProgressSnapshotInput {
  title: AnimeTitle;
  episode: Episode;
  providerId: string;
  positionSec: number;
  durationSec: number;
  voiceoverId?: string;
  qualityId?: string;
  completed: boolean;
}

/** Persists watch progress (continue-watching) without touching statistics. */
export function persistProgress(input: ProgressSnapshotInput): void {
  progressActions.saveProgress({
    titleId: input.title.id,
    titleName: input.title.title,
    poster: input.title.poster,
    providerId: input.providerId,
    episodeId: input.episode.id,
    episodeOrdinal: input.episode.ordinal,
    episodeName: input.episode.name,
    positionSec: Math.max(0, Math.round(input.positionSec)),
    durationSec: Math.max(1, Math.round(input.durationSec)),
    completed: input.completed,
    updatedAt: Date.now(),
    voiceoverId: input.voiceoverId,
    qualityId: input.qualityId,
  });
}

function isLastEpisode(title: AnimeTitle, episode: Episode, episodes: Episode[]): boolean {
  if (!episodes.length) return Boolean(title.episodesTotal && episode.ordinal >= title.episodesTotal);
  const maxOrdinal = Math.max(...episodes.map((item) => item.ordinal));
  return episode.ordinal >= maxOrdinal;
}

/**
 * Records a completed episode: updates statistics, watchlists and achievements.
 * Statistics are derived from this real data — never fabricated.
 */
export function recordEpisodeCompleted(
  input: ProgressSnapshotInput & { episodes: Episode[]; voiceoverKind?: string; subtitles?: boolean; withFriend?: boolean },
): { newlyUnlocked: string[]; titleCompleted: boolean } {
  const titleCompleted = isLastEpisode(input.title, input.episode, input.episodes);
  const watchedSeconds = input.durationSec > 0 ? input.durationSec : (input.episode.durationSec ?? 0);

  const event: CompletionEvent = {
    providerId: input.providerId,
    voiceoverKind: input.voiceoverKind,
    genres: input.title.genres,
    completedAt: Date.now(),
    watchedSeconds,
    nightWatch: isNightTime(Date.now()),
    subtitles: input.subtitles,
    withFriend: input.withFriend,
    episodeDurationSec: input.episode.durationSec,
  };

  progressActions.completeEpisode(
    {
      titleId: input.title.id,
      titleName: input.title.title,
      poster: input.title.poster,
      providerId: input.providerId,
      episodeId: input.episode.id,
      episodeOrdinal: input.episode.ordinal,
      episodeName: input.episode.name,
      positionSec: Math.round(input.durationSec),
      durationSec: Math.max(1, Math.round(input.durationSec)),
      completed: true,
      updatedAt: Date.now(),
      voiceoverId: input.voiceoverId,
      qualityId: input.qualityId,
    },
    event,
    titleCompleted,
  );

  // Watchlist housekeeping: keep the progress category in sync with reality.
  const lists = useListsStore.getState();
  const entry = lists.entries[input.title.id];
  if (entry) {
    const watched = (entry.episodesWatched ?? 0) + 1;
    listsActions.setCategory(input.title, titleCompleted ? 'completed' : 'watching', true);
    useListsStore.setState((state) => ({
      entries: {
        ...state.entries,
        [input.title.id]: {
          ...(state.entries[input.title.id] ?? entry),
          episodesWatched: watched,
          episodesTotal: input.title.episodesTotal ?? entry.episodesTotal,
          updatedAt: Date.now(),
        },
      },
    }));
  }

  const newlyUnlocked = syncAchievements();
  return { newlyUnlocked, titleCompleted };
}

export function resumePositionFor(titleId: string, episodeId: string): number {
  const entry = useProgressStore.getState().entries[titleId];
  if (!entry || entry.episodeId !== episodeId) return 0;
  return entry.positionSec;
}

export function skipIntroDecision(
  plan: PlaybackPlan,
  currentPositionSec: number,
  skipIntroEnabled: boolean,
): number | null {
  if (!skipIntroEnabled || !plan.skipIntro) return null;
  const { start, end } = plan.skipIntro;
  if (currentPositionSec >= start && currentPositionSec < end) return end;
  return null;
}

export function voiceoverKindLabel(voiceover?: Voiceover): string {
  return voiceover?.kind ?? 'voice';
}
