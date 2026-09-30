import type { SyncPlaybackState } from '@/data/models/watchTogether';

/**
 * Pure drift-correction logic. Kept free of timers and sockets so the rules can
 * be unit tested and reused by the client and by the player hook.
 */
export interface DriftOptions {
  /** Above this difference the player is hard-seeked. */
  seekThresholdSec: number;
  /** Above this difference the playback rate is nudged. */
  nudgeThresholdSec: number;
  /** Differences below this are treated as in-sync. */
  toleranceSec: number;
  nudgeRateDelta: number;
  maxRate: number;
  minRate: number;
}

export const DEFAULT_DRIFT_OPTIONS: DriftOptions = {
  seekThresholdSec: 2.5,
  nudgeThresholdSec: 0.35,
  toleranceSec: 0.12,
  nudgeRateDelta: 0.05,
  maxRate: 1.15,
  minRate: 0.85,
};

export type DriftAction = 'none' | 'nudge' | 'seek' | 'play' | 'pause' | 'episode-change';

export interface DriftDecision {
  action: DriftAction;
  /** Where the local player should be, projected to "now". */
  targetPositionSec: number;
  /** Rate to apply when the action is a nudge. */
  suggestedRate?: number;
  driftSec: number;
  reason: string;
}

export interface LocalPlaybackSnapshot {
  episodeId: string;
  positionSec: number;
  isPlaying: boolean;
  rate: number;
}

/** Projects the host state to the current moment (remote state is timestamped). */
export function projectPosition(state: SyncPlaybackState, now = Date.now()): number {
  if (!state.isPlaying) return state.positionSec;
  const elapsed = Math.max(0, (now - state.updatedAt) / 1000);
  return state.positionSec + elapsed * (state.rate || 1);
}

export function evaluateDrift(
  local: LocalPlaybackSnapshot,
  remote: SyncPlaybackState,
  now = Date.now(),
  options: DriftOptions = DEFAULT_DRIFT_OPTIONS,
): DriftDecision {
  const target = projectPosition(remote, now);
  const drift = local.positionSec - target;
  const base = { targetPositionSec: target, driftSec: drift };

  if (remote.episodeId && local.episodeId && remote.episodeId !== local.episodeId) {
    return { ...base, action: 'episode-change', reason: 'remote episode differs' };
  }

  const absolute = Math.abs(drift);
  if (absolute >= options.seekThresholdSec) {
    return { ...base, action: 'seek', reason: `drift ${drift.toFixed(2)}s exceeds seek threshold` };
  }

  if (remote.isPlaying !== local.isPlaying) {
    // Small drift while paused is not worth restarting playback.
    if (!remote.isPlaying && absolute < options.seekThresholdSec) {
      return { ...base, action: 'pause', reason: 'remote is paused' };
    }
    if (remote.isPlaying && absolute < options.seekThresholdSec) {
      return { ...base, action: 'play', reason: 'remote is playing' };
    }
  }

  if (absolute >= options.nudgeThresholdSec) {
    const direction = drift > 0 ? -1 : 1;
    const suggestedRate = clampRate((remote.rate || 1) + direction * options.nudgeRateDelta, options);
    return {
      ...base,
      action: 'nudge',
      suggestedRate,
      reason: `gradual correction of ${drift.toFixed(2)}s`,
    };
  }

  return { ...base, action: 'none', reason: 'in sync' };
}

export function clampRate(rate: number, options: DriftOptions = DEFAULT_DRIFT_OPTIONS): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.min(options.maxRate, Math.max(options.minRate, Number(rate.toFixed(3))));
}

/** Only the host may drive playback; guests are read-only apart from chat. */
export function shouldBroadcast(role: 'host' | 'guest'): boolean {
  return role === 'host';
}

export interface SyncScheduleEntry {
  at: number;
  decision: DriftAction;
  driftSec: number;
}

/**
 * Simulates the correction loop for tests and diagnostics: it applies the same
 * decisions the runtime takes until the two players agree.
 */
export function simulateCorrection(
  localStart: LocalPlaybackSnapshot,
  remote: SyncPlaybackState,
  samples = 40,
  stepMs = 1000,
  options: DriftOptions = DEFAULT_DRIFT_OPTIONS,
): { schedule: SyncScheduleEntry[]; local: LocalPlaybackSnapshot } {
  let local: LocalPlaybackSnapshot = { ...localStart };
  const schedule: SyncScheduleEntry[] = [];
  let now = Date.now();

  for (let index = 0; index < samples; index += 1) {
    const decision = evaluateDrift(local, remote, now, options);
    schedule.push({ at: now, decision: decision.action, driftSec: decision.driftSec });
    if (decision.action === 'seek') {
      local = { ...local, positionSec: decision.targetPositionSec, rate: 1 };
    } else if (decision.action === 'play') {
      local = { ...local, isPlaying: true };
    } else if (decision.action === 'pause') {
      local = { ...local, isPlaying: false };
    } else if (decision.action === 'nudge' && decision.suggestedRate) {
      local = { ...local, rate: decision.suggestedRate };
    } else {
      local = { ...local, rate: remote.rate || 1 };
    }
    if (local.isPlaying) local = { ...local, positionSec: local.positionSec + local.rate * (stepMs / 1000) };
    now += stepMs;
  }

  return { schedule, local };
}
