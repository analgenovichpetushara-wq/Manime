import { AppError } from '@/core/errors/AppError';
import { appLogger } from '@/core/logging/logger';
import { APP_USER_AGENT } from '@/core/config/env';
import { retry, withTimeout } from '@/core/utils/async';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  timeoutMs?: number;
  attempts?: number;
  providerId?: string;
  cacheBust?: boolean;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  url: string;
  fromCache?: boolean;
}

const DEFAULT_TIMEOUT = 12_000;

export function buildUrl(base: string, path: string, query?: HttpRequestOptions['query']): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBase}${normalizedPath}`;
  if (!query) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const queryString = search.toString();
  if (!queryString) return url;
  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
}

class HttpError extends Error {
  constructor(
    readonly kind: 'network' | 'timeout' | 'http' | 'json' | 'unsupported',
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * JSON HTTP client used by every provider.
 * - applies timeouts, limited retries and a descriptive User-Agent
 * - maps every failure to an AppError with a stable code (never leaks stack traces to UI)
 */
export async function httpJson<T>(base: string, path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
  const url = buildUrl(base, path, options.query);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const log = appLogger;
  let lastStatus: number | undefined;

  const run = async (attempt: number): Promise<HttpResponse<T>> => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const abortTimer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await withTimeout(
        fetch(url, {
          method: options.method ?? 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': APP_USER_AGENT,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller?.signal,
        }),
        timeoutMs + 500,
        () => controller?.abort(),
      );
      lastStatus = response.status;
      if (!response.ok) {
        throw new HttpError('http', `HTTP ${response.status} for ${url}`, response.status);
      }
      const text = await response.text();
      if (!text) {
        return { data: {} as T, status: response.status, url };
      }
      try {
        const data = JSON.parse(text) as T;
        return { data, status: response.status, url };
      } catch {
        throw new HttpError('json', `Invalid JSON from ${url}`);
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      const name = (error as { name?: string } | undefined)?.name;
      if (name === 'AbortError') throw new HttpError('timeout', `Timeout after ${timeoutMs}ms for ${url}`);
      if ((error as Error)?.message === 'timeout') throw new HttpError('timeout', `Timeout after ${timeoutMs}ms for ${url}`);
      throw new HttpError('network', (error as Error)?.message ?? 'Network request failed');
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
      void attempt;
    }
  };

  try {
    return await retry(run, {
      attempts: options.attempts ?? 2,
      baseDelayMs: 400,
      shouldRetry: (error) => {
        if (!(error instanceof HttpError)) return false;
        if (error.kind === 'network' || error.kind === 'timeout') return true;
        if (error.kind === 'http') {
          const status = error.status ?? 0;
          return status >= 500 || status === 429;
        }
        return false;
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      const status = error.status ?? lastStatus;
      const code =
        error.kind === 'timeout'
          ? 'TIMEOUT'
          : error.kind === 'json'
            ? 'INVALID_JSON'
            : error.kind === 'http'
              ? status === 404
                ? 'NOT_FOUND'
                : 'HTTP_ERROR'
              : 'NETWORK_UNAVAILABLE';
      log.warn('request failed', { url, code, status });
      throw new AppError({
        code,
        message: error.message,
        status,
        url,
        providerId: options.providerId,
        cause: error,
      });
    }
    throw new AppError({
      code: 'UNKNOWN',
      message: (error as Error)?.message ?? 'unknown error',
      url,
      providerId: options.providerId,
      cause: error,
    });
  }
}

export interface ProbeResult {
  ok: boolean;
  status?: number;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
}

/** Lightweight reachability probe used by provider health checks. */
export async function probeJson(base: string, path: string, timeoutMs = 8000): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const response = await httpJson<unknown>(base, path, { timeoutMs, attempts: 1 });
    return { ok: true, status: response.status, latencyMs: Date.now() - started };
  } catch (error) {
    const appError = error instanceof AppError ? error : undefined;
    return {
      ok: false,
      status: appError?.status,
      latencyMs: Date.now() - started,
      errorCode: appError?.code ?? 'UNKNOWN',
      errorMessage: appError?.message,
    };
  }
}
