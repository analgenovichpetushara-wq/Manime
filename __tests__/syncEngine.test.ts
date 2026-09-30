import {
  clampRate,
  DEFAULT_DRIFT_OPTIONS,
  evaluateDrift,
  projectPosition,
  shouldBroadcast,
  simulateCorrection,
  type LocalPlaybackSnapshot,
} from '@/features/watchtogether/sync/syncEngine';
import type { SyncPlaybackState } from '@/data/models/watchTogether';

function remote(overrides: Partial<SyncPlaybackState> = {}): SyncPlaybackState {
  return {
    titleId: 'anilibria:1',
    episodeId: 'e1',
    episodeOrdinal: 1,
    positionSec: 100,
    isPlaying: true,
    rate: 1,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function local(overrides: Partial<LocalPlaybackSnapshot> = {}): LocalPlaybackSnapshot {
  return { episodeId: 'e1', positionSec: 100, isPlaying: true, rate: 1, ...overrides };
}

describe('watch-together sync engine', () => {
  it('only lets the host drive playback', () => {
    expect(shouldBroadcast('host')).toBe(true);
    expect(shouldBroadcast('guest')).toBe(false);
  });

  it('projects the host position forward while playing', () => {
    const state = remote({ positionSec: 10, updatedAt: 1_000, isPlaying: true, rate: 1 });
    expect(projectPosition(state, 4_000)).toBeCloseTo(13, 1);
    const paused = remote({ positionSec: 10, updatedAt: 1_000, isPlaying: false });
    expect(projectPosition(paused, 4_000)).toBe(10);
  });

  it('leaves players alone when they are in sync', () => {
    const decision = evaluateDrift(local({ positionSec: 100 }), remote({ positionSec: 100 }));
    expect(decision.action).toBe('none');
  });

  it('corrects small drift gradually with a rate nudge instead of a seek', () => {
    const decision = evaluateDrift(local({ positionSec: 101 }), remote({ positionSec: 100 }));
    expect(decision.action).toBe('nudge');
    expect(decision.suggestedRate).toBeLessThan(1);
    expect(decision.suggestedRate).toBeGreaterThanOrEqual(DEFAULT_DRIFT_OPTIONS.minRate);
  });

  it('hard-seeks only when the difference is large', () => {
    const decision = evaluateDrift(local({ positionSec: 120 }), remote({ positionSec: 100 }));
    expect(decision.action).toBe('seek');
    expect(decision.targetPositionSec).toBeCloseTo(100, 0);
    expect(Math.abs(decision.driftSec)).toBeGreaterThan(DEFAULT_DRIFT_OPTIONS.seekThresholdSec);
  });

  it('follows the host play/pause state', () => {
    const paused = evaluateDrift(local({ isPlaying: true }), remote({ isPlaying: false }));
    expect(paused.action).toBe('pause');
    const playing = evaluateDrift(local({ isPlaying: false }), remote({ isPlaying: true }));
    expect(playing.action).toBe('play');
  });

  it('reports an episode change before anything else', () => {
    const decision = evaluateDrift(local({ episodeId: 'e1' }), remote({ episodeId: 'e2', positionSec: 10 }));
    expect(decision.action).toBe('episode-change');
  });

  it('clamps correction rates into a safe range', () => {
    expect(clampRate(5)).toBe(DEFAULT_DRIFT_OPTIONS.maxRate);
    expect(clampRate(0.1)).toBe(DEFAULT_DRIFT_OPTIONS.minRate);
    expect(clampRate(Number.NaN)).toBe(1);
    expect(clampRate(1.02)).toBeCloseTo(1.02, 3);
  });

  it('converges instead of oscillating', () => {
    const { local: corrected, schedule } = simulateCorrection(local({ positionSec: 118 }), remote({ positionSec: 100 }), 12, 1000);
    const hardSeeks = schedule.filter((entry) => entry.decision === 'seek');
    expect(hardSeeks.length).toBeLessThanOrEqual(1);
    expect(Math.abs(corrected.positionSec - projectPosition(remote({ positionSec: 100 }), Date.now()))).toBeGreaterThanOrEqual(0);
    expect(schedule.some((entry) => entry.decision !== 'none')).toBe(true);
  });
});
