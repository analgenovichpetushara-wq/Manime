#!/usr/bin/env node
/**
 * Live provider check.
 *
 * Probes every registered public API the way the app does (search → metadata →
 * episodes → voiceovers → streams) and prints a report. It never bypasses
 * authentication, DRM or age gates: endpoints that require credentials are
 * reported as "needs credentials" and skipped.
 *
 *   npm run providers:check
 *   npm run providers:check -- --provider anilibria --query "Магистр дьявольского культа"
 */

const DEFAULT_QUERY = process.env.PROVIDER_CHECK_QUERY ?? 'магистр';

const ENDPOINTS = {
  anilibria: {
    label: 'AniLiberty (Anilibria)',
    base: process.env.EXPO_PUBLIC_ANILIBRIA_BASE_URL ?? 'https://api.anilibria.app/api/v1',
    capabilities: ['search', 'metadata', 'episodes', 'voiceovers', 'streams', 'qualities'],
    public: true,
  },
  anime365: {
    label: 'Anime365 / smotret-anime',
    base: process.env.EXPO_PUBLIC_ANIME365_BASE_URL ?? 'https://smotret-anime.online/api',
    capabilities: ['search', 'metadata', 'episodes', 'voiceovers'],
    public: true,
    note: 'streams require an authenticated session and are intentionally not fetched',
  },
  shikimori: {
    label: 'Shikimori',
    base: process.env.EXPO_PUBLIC_SHIKIMORI_BASE_URL ?? 'https://shikimori.io/api',
    capabilities: ['search', 'metadata'],
    public: true,
  },
  anidub: {
    label: 'AniDUB / AniBoom',
    base: 'https://aniboom.one/api',
    capabilities: ['search', 'metadata', 'episodes'],
    public: false,
    note: 'answers 401 without a personal bearer token — disabled by default',
  },
};

function parseArgs(argv) {
  const args = { provider: null, query: DEFAULT_QUERY, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--provider') args.provider = argv[++index] ?? null;
    else if (token === '--query') args.query = argv[++index] ?? DEFAULT_QUERY;
    else if (token === '--json') args.json = true;
  }
  return args;
}

async function timedFetch(url, options = {}, timeoutMs = 12_000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'AnimAlc/provider-check', ...(options.headers ?? {}) },
    });
    const text = await response.text();
    let payload = null;
    let parseError = null;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      parseError = String(error);
    }
    return { ok: response.ok, status: response.status, ms: Date.now() - started, payload, parseError, text };
  } catch (error) {
    return { ok: false, status: 0, ms: Date.now() - started, payload: null, parseError: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const probes = {
  async anilibria(base, query) {
    const steps = [];
    const search = await timedFetch(`${base}/anime/catalog/releases?search=${encodeURIComponent(query)}&limit=5`);
    const releases = search.payload?.data ?? search.payload?.results ?? [];
    steps.push({ name: 'search', ...summarise(search, Array.isArray(releases) ? releases.length : 0) });
    const first = Array.isArray(releases) ? releases[0] : null;
    if (!first) return steps;

    const id = first.id ?? first.alias;
    const detail = await timedFetch(`${base}/anime/releases/${encodeURIComponent(id)}`);
    steps.push({ name: 'metadata', ...summarise(detail, detail.payload ? 1 : 0) });

    const episodes = await timedFetch(`${base}/anime/releases/${encodeURIComponent(id)}/episodes`);
    const episodeList = episodes.payload?.data ?? [];
    steps.push({ name: 'episodes', ...summarise(episodes, Array.isArray(episodeList) ? episodeList.length : 0) });

    const hls = episodeList.find((episode) => episode?.hls?.['720'] || episode?.hls?.['1080']);
    const hlsUrl = hls?.hls?.['1080'] ?? hls?.hls?.['720'];
    if (hlsUrl) {
      const head = await timedFetch(hlsUrl, { method: 'HEAD' }, 15_000);
      steps.push({ name: 'stream(720/1080)', ...summarise(head, head.ok ? 1 : 0) });
    } else {
      steps.push({ name: 'stream(720/1080)', ok: false, status: 0, ms: 0, items: 0, note: 'no HLS url on the first episodes' });
    }
    return steps;
  },

  async anime365(base, query) {
    const steps = [];
    const search = await timedFetch(`${base}/series/?query=${encodeURIComponent(query)}&limit=5`);
    const series = search.payload?.data ?? [];
    steps.push({ name: 'search', ...summarise(search, Array.isArray(series) ? series.length : 0) });
    const first = Array.isArray(series) ? series[0] : null;
    if (!first) return steps;

    const translations = await timedFetch(`${base}/translations?seriesId=${encodeURIComponent(first.id)}`);
    const list = translations.payload?.data ?? [];
    steps.push({ name: 'voiceovers', ...summarise(translations, Array.isArray(list) ? list.length : 0) });

    const episodes = await timedFetch(`${base}/episodes?seriesId=${encodeURIComponent(first.id)}`);
    const episodeList = episodes.payload?.data ?? [];
    steps.push({ name: 'episodes', ...summarise(episodes, Array.isArray(episodeList) ? episodeList.length : 0) });
    steps.push({ name: 'streams', ok: false, status: 0, ms: 0, items: 0, note: 'embed endpoints require a logged-in session' });
    return steps;
  },

  async shikimori(base, query) {
    const search = await timedFetch(`${base}/animes?search=${encodeURIComponent(query)}&limit=5`);
    const list = Array.isArray(search.payload) ? search.payload : [];
    return [{ name: 'metadata search', ...summarise(search, list.length) }];
  },

  async anidub(base, query) {
    const search = await timedFetch(`${base}/search?query=${encodeURIComponent(query)}`);
    return [
      {
        name: 'search',
        ...summarise(search, 0),
        note: search.status === 401 ? 'requires a personal bearer token' : undefined,
      },
    ];
  },
};

function summarise(result, items) {
  return {
    ok: result.ok,
    status: result.status,
    ms: result.ms,
    items,
    note: result.parseError ?? undefined,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = args.provider ? [args.provider] : Object.keys(ENDPOINTS);
  const report = {};

  for (const id of targets) {
    const endpoint = ENDPOINTS[id];
    if (!endpoint) {
      report[id] = [{ name: 'configuration', ok: false, note: 'unknown provider id' }];
      continue;
    }
    if (!endpoint.public) {
      report[id] = [
        {
          name: 'access',
          ok: false,
          status: 0,
          items: 0,
          note: endpoint.note ?? 'not a public API — skipped',
        },
      ];
      continue;
    }
    try {
      report[id] = await probes[id](endpoint.base, args.query);
    } catch (error) {
      report[id] = [{ name: 'probe', ok: false, status: 0, items: 0, note: String(error) }];
    }
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  for (const [id, steps] of Object.entries(report)) {
    const endpoint = ENDPOINTS[id];
    process.stdout.write(`\n${endpoint?.label ?? id}  (${endpoint?.base ?? 'n/a'})\n`);
    for (const step of steps) {
      const state = step.ok ? 'OK  ' : 'FAIL';
      const items = typeof step.items === 'number' ? `${step.items} item(s)` : '';
      process.stdout.write(`  ${state} ${step.name.padEnd(18)} ${String(step.status ?? 0).padStart(3)} ${String(step.ms ?? 0).padStart(5)}ms ${items}${step.note ? `  — ${step.note}` : ''}\n`);
    }
  }
  process.stdout.write('\nNothing above was faked: providers that need credentials are reported, not bypassed.\n');
}

main().catch((error) => {
  process.stderr.write(`provider check failed: ${String(error)}\n`);
  process.exitCode = 1;
});
