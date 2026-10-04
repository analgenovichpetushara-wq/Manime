#!/usr/bin/env node
/**
 * AnimAlc Kodik gateway.
 *
 * Kodik is a credential-based API. A partner token must never ship inside an
 * Android/iOS bundle, so the mobile app talks to this gateway instead and the
 * token stays server-side.
 *
 * It is NOT an open proxy:
 *   · only the documented Kodik endpoints AnimAlc uses are reachable
 *     (/search, /list, /get-player),
 *   · query parameters are whitelisted and validated,
 *   · the token is injected server-side and never echoed,
 *   · per-client rate limiting is enforced,
 *   · no media, player or download endpoints are exposed — Kodik does not
 *     publish media URLs, and AnimAlc never extracts them around its player.
 *
 * Usage: KODIK_API_TOKEN=… npm run server:kodik
 * Env:   PORT (8790) · HOST (0.0.0.0) · KODIK_API_TOKEN (required) ·
 *        KODIK_API_BASE (https://kodik-api.com) · ALLOWED_ORIGINS ("") ·
 *        RATE_LIMIT_PER_MIN (30) · KODIK_TIMEOUT_MS (12000)
 */
import { createServer } from 'node:http';

export const DEFAULT_KODIK_BASE = 'https://kodik-api.com';

/** Parameters AnimAlc is allowed to forward, per endpoint. */
const PARAM_WHITELIST = {
  '/search': [
    'title',
    'title_orig',
    'id',
    'shikimori_id',
    'kinopoisk_id',
    'imdb_id',
    'mdl_id',
    'types',
    'anime_kind',
    'anime_status',
    'year',
    'genres',
    'anime_genres',
    'translation_id',
    'translation_type',
    'season',
    'limit',
    'with_material_data',
    'with_seasons',
    'with_episodes',
    'with_episodes_data',
  ],
  '/get-player': ['title', 'ID', 'url', 'hasPlayer'],
  // Documented catalogue endpoints — they take no forwarded parameters.
  '/genres': [],
  '/countries': [],
  '/years': [],
  '/translations/v2': [],
  '/qualities/v2': [],
  '/list': ['types', 'year', 'anime_kind', 'anime_status', 'genres', 'anime_genres', 'sort', 'order', 'limit', 'with_material_data', 'with_seasons', 'with_episodes', 'with_episodes_data'],
};

/**
 * Catalogue endpoints from the documented Kodik API (`/genres`, `/countries`,
 * `/years`, `/translations/v2`, `/qualities/v2`). They are proxied as-is; the
 * gateway only injects the token.
 */
const CATALOGUE_ROUTES = new Set(['/genres', '/countries', '/years', '/translations/v2', '/qualities/v2']);

const MAX_LIMIT = 100;

/** Maps a Kodik `{"error": "…"}` message onto an HTTP status. */
export function classifyKodikError(message) {
  const lower = String(message ?? '').toLowerCase();
  if (lower.includes('токен') || lower.includes('token') || lower.includes('авториз') || lower.includes('доступ')) {
    return { status: 401, code: 'AUTHENTICATION_REQUIRED' };
  }
  if (lower.includes('лимит') || lower.includes('limit') || lower.includes('rate') || lower.includes('часто')) {
    return { status: 429, code: 'RATE_LIMITED' };
  }
  if (lower.includes('не найден') || lower.includes('not found')) {
    return { status: 404, code: 'NOT_FOUND' };
  }
  return { status: 502, code: 'INVALID_PAYLOAD' };
}

export function sanitizeQuery(searchParams, endpoint) {
  const allowed = PARAM_WHITELIST[endpoint] ?? [];
  const out = new URLSearchParams();
  for (const key of allowed) {
    if (!searchParams.has(key)) continue;
    const raw = searchParams.get(key) ?? '';
    if (key === 'limit') {
      const value = Number.parseInt(raw, 10);
      if (Number.isFinite(value)) out.set(key, String(Math.min(Math.max(value, 1), MAX_LIMIT)));
      continue;
    }
    if (key === 'year' || key === 'season') {
      const value = Number.parseInt(raw, 10);
      if (Number.isFinite(value)) out.set(key, String(value));
      continue;
    }
    if (key === 'hasPlayer') {
      out.set(key, raw === 'true' || raw === '1' ? 'true' : 'false');
      continue;
    }
    if (key.startsWith('with_')) {
      out.set(key, raw === 'true' || raw === '1' ? 'true' : 'false');
      continue;
    }
    const value = raw.trim();
    if (!value || value.length > 240) continue;
    out.set(key, value);
  }
  return out;
}

function createRateLimiter(perMinute) {
  /** @type {Map<string, {tokens: number, updatedAt: number}>} */
  const buckets = new Map();
  return {
    take(key, now = Date.now()) {
      const bucket = buckets.get(key) ?? { tokens: perMinute, updatedAt: now };
      const elapsedMin = (now - bucket.updatedAt) / 60_000;
      bucket.tokens = Math.min(perMinute, bucket.tokens + elapsedMin * perMinute);
      bucket.updatedAt = now;
      if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        return false;
      }
      bucket.tokens -= 1;
      buckets.set(key, bucket);
      return true;
    },
    reset() {
      buckets.clear();
    },
  };
}

/**
 * Builds the request handler. `fetchImpl` is injectable so the suite can drive
 * the gateway without touching the network.
 */
export function createKodikGateway(options = {}) {
  const config = {
    token: options.token ?? process.env.KODIK_API_TOKEN ?? '',
    baseUrl: (options.baseUrl ?? process.env.KODIK_API_BASE ?? DEFAULT_KODIK_BASE).replace(/\/+$/, ''),
    allowedOrigins: (options.allowedOrigins ?? process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    rateLimitPerMinute: Number.parseInt(String(options.rateLimitPerMinute ?? process.env.RATE_LIMIT_PER_MIN ?? '30'), 10),
    fetchImpl: options.fetchImpl ?? ((...args) => fetch(...args)),
    timeoutMs: options.timeoutMs ?? Number.parseInt(process.env.KODIK_TIMEOUT_MS ?? '12000', 10),
  };
  const rateLimiter = createRateLimiter(config.rateLimitPerMinute);

  async function upstream(path, params) {
    const query = new URLSearchParams(params);
    query.set('token', config.token);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await config.fetchImpl(`${config.baseUrl}${path}?${query.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const text = await response.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        return { status: 502, body: { error: { code: 'INVALID_JSON', message: 'Kodik returned non-JSON data' } } };
      }
      if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
        const mapped = classifyKodikError(payload.error);
        return { status: mapped.status, body: { error: { code: mapped.code, message: payload.error } } };
      }
      if (!response.ok) {
        return { status: 502, body: { error: { code: 'UPSTREAM_ERROR', message: `Kodik answered ${response.status}` } } };
      }
      return { status: 200, body: payload };
    } catch (error) {
      const timeout = error?.name === 'AbortError';
      return {
        status: timeout ? 504 : 502,
        body: { error: { code: timeout ? 'TIMEOUT' : 'NETWORK_ERROR', message: timeout ? 'Kodik timed out' : 'Kodik is unreachable' } },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function handle(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const origin = req.headers.origin;
    if (config.allowedOrigins.length && origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Cache-Control', 'no-store');

    const clientKey = req.socket?.remoteAddress ?? 'unknown';
    if (url.pathname !== '/health' && !rateLimiter.take(clientKey)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }));
      return;
    }

    if (url.pathname === '/health') {
      const started = Date.now();
      const probe = await upstream('/list', sanitizeQuery(new URLSearchParams('limit=1'), '/list'));
      res.writeHead(probe.status === 200 ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: probe.status === 200,
          configured: config.token.length > 0,
          latencyMs: Date.now() - started,
          upstream: probe.body?.error ?? null,
        }),
      );
      return;
    }

    if (!config.token) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'KODIK_API_TOKEN is not configured' } }));
      return;
    }

    const search = sanitizeQuery(url.searchParams, url.pathname);
    if (url.pathname === '/search' || url.pathname === '/list') {
      if (url.pathname === '/search' && !search.has('title') && !search.has('id') && !search.has('shikimori_id')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'search needs title, id or shikimori_id' } }));
        return;
      }
      const result = await upstream(url.pathname, search);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
      return;
    }

    if (url.pathname === '/get-player') {
      const hasTarget = url.searchParams.has('title') || url.searchParams.has('ID') || url.searchParams.has('url');
      if (!hasTarget) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'get-player needs title, ID or url' } }));
        return;
      }
      const result = await upstream('/get-player', search);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
      return;
    }

    if (CATALOGUE_ROUTES.has(url.pathname)) {
      const result = await upstream(url.pathname, sanitizeQuery(url.searchParams, url.pathname));
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
      return;
    }

    if (url.pathname === '/material' || url.pathname === '/translations') {
      const id = (url.searchParams.get('id') ?? '').trim();
      if (!id || id.length > 64) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'id is required' } }));
        return;
      }
      const params = new URLSearchParams({ id, limit: '100' });
      if (url.pathname === '/material') {
        params.set('with_episodes', 'true');
        params.set('with_episodes_data', 'true');
        params.set('with_material_data', 'true');
      }
      const result = await upstream('/search', sanitizeQuery(params, '/search'));
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Unknown gateway route' } }));
  }

  return { config, handle, resetRateLimiter: rateLimiter.reset };
}

export function startKodikGateway(options = {}) {
  const gateway = createKodikGateway(options);
  const port = Number.parseInt(options.port ?? process.env.PORT ?? '8790', 10);
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';
  const server = createServer((req, res) => {
    gateway.handle(req, res).catch(() => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'INTERNAL', message: 'Gateway failure' } }));
    });
  });
  server.listen(port, host, () => {
    // eslint-disable-next-line no-console -- server bootstrap banner
    console.log(`[AnimAlc] Kodik gateway listening on http://${host}:${port} (configured=${gateway.config.token.length > 0})`);
  });
  return server;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[/\\]/, ''));
if (isMain) {
  if (!process.env.KODIK_API_TOKEN) {
    console.error('[AnimAlc] KODIK_API_TOKEN is not set — the gateway will answer 503 until it is.');
  }
  startKodikGateway();
}
