import type { ProviderHealth, ProviderStatus } from '@/providers/types';

export interface HealthThresholds {
  degradedLatencyMs: number;
  failureCountForDown: number;
}

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  degradedLatencyMs: 2500,
  failureCountForDown: 3,
};

export interface HealthRecord extends ProviderHealth {
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export function createHealthRecord(providerId: string): HealthRecord {
  return {
    providerId,
    status: 'unknown',
    checkedAt: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
  };
}

export function classifyHealth(
  probe: { ok: boolean; latencyMs: number; errorCode?: string; errorMessage?: string; status?: number },
  previous: HealthRecord,
  thresholds: HealthThresholds = DEFAULT_HEALTH_THRESHOLDS,
): HealthRecord {
  if (probe.ok) {
    const status: ProviderStatus = probe.latencyMs > thresholds.degradedLatencyMs ? 'degraded' : 'healthy';
    return {
      ...previous,
      status,
      checkedAt: Date.now(),
      latencyMs: probe.latencyMs,
      consecutiveFailures: 0,
      consecutiveSuccesses: previous.consecutiveSuccesses + 1,
      errorCode: undefined,
      errorMessage: undefined,
    };
  }
  const failures = previous.consecutiveFailures + 1;
  const status: ProviderStatus = failures >= thresholds.failureCountForDown ? 'down' : 'degraded';
  return {
    ...previous,
    status,
    checkedAt: Date.now(),
    latencyMs: probe.latencyMs,
    consecutiveFailures: failures,
    consecutiveSuccesses: 0,
    errorCode: probe.errorCode,
    errorMessage: probe.errorMessage,
    details: probe.status ? { httpStatus: probe.status } : previous.details,
  };
}

export function isUsable(status: ProviderStatus): boolean {
  return status === 'healthy' || status === 'degraded' || status === 'unknown';
}

export function statusPriority(status: ProviderStatus): number {
  switch (status) {
    case 'healthy':
      return 0;
    case 'unknown':
      return 1;
    case 'degraded':
      return 2;
    case 'down':
      return 3;
    case 'disabled':
      return 4;
    default:
      return 5;
  }
}
