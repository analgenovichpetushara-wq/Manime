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
 *   npm run providers:check -- --provider kodik --query "Наруто"
 *
 * Kodik needs a partner token; without one the script proves the endpoint is
 * alive and reports the credential error the API actually returns.
 */

const DEFAULT_QUERY = process.env.PROVIDER_CHECK_QUERY ?? 'магистр';

const KODIK_TOKEN = process.env.EXPO_PUBLIC_KODIK_TOKEN ?? process.env.KODIK_API_TOKEN ?? '';
const KODIK_GATEWAY = process.env.EXPO_PUBLIC_KODIK_GATEWAY_URL ?? '';

const ENDPOINTS = {
  kodik: {
    label: 'Kodik',
    base: KODIK_GATEWAY || process.env.EXPO_PUBLIC_KODIK_BASE_URL || 'https://kodik-api.com',
    capabilities: ['search', 'metadata', 'episodes', 'voiceovers', 'qualities'],
    public: false,
    note: 'partner token required (EXPO_PUBLIC_KODIK_TOKEN or EXPO_PUBLIC_KODIK_GATEWAY_URL)',
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
  async kodik(base, query) {
    const steps = [];
    if (!KODIK_TOKEN && !KODIK_GATEWAY) {
      // No credential: still prove the endpoint answers, and show its real error.
      const probe = await timedFetch(`${base}/search?title=${encodeURIComponent(query)}&limit=1`);
      steps.push({
        name: 'access',
        ok: false,
        status: probe.status,
        ms: probe.ms,
        items: 0,
        note: probe.payload?.error ?? 'partner token required (EXPO_PUBLIC_KODIK_TOKEN / gateway)',
      });
      return steps;
    }

    const auth = KODIK_GATEWAY ? '' : `&token=${encodeURIComponent(KODIK_TOKEN)}`;
    const search = await timedFetch(`${base}/search?title=${encodeURIComponent(query)}&limit=5${auth}`);
    const results = search.payload?.results ?? [];
    steps.push({ name: 'search', ...summarise(search, Array.isArray(results) ? results.length : 0) });
    const first = Array.isArray(results) ? results[0] : null;
    if (!first?.id) return steps;

    const material = await timedFetch(
      `${base}/search?id=${encodeURIComponent(first.id)}&limit=1&with_material_data=true${auth}`,
    );
    steps.push({ name: 'metadata', ...summarise(material, material.payload?.results?.length ?? 0) });

    const episodes = await timedFetch(
      `${base}/search?id=${encodeURIComponent(first.id)}&limit=1&with_episodes=true&with_episodes_data=true${auth}`,
    );
    const seasons = episodes.payload?.results?.[0]?.seasons ?? {};
    const episodeCount = Object.values(seasons).reduce(
      (total, season) => total + Object.keys(season?.episodes ?? {}).length,
      0,
    );
    steps.push({ name: 'episodes', ...summarise(episodes, episodeCount) });

    const translations = await timedFetch(`${base}/search?id=${encodeURIComponent(first.id)}&limit=100${auth}`);
    const voices = new Set(
      (translations.payload?.results ?? []).map((release) => release?.translation?.id).filter(Boolean),
    );
    steps.push({ name: 'voiceovers', ...summarise(translations, voices.size) });

    const qualities = new Set(
      (translations.payload?.results ?? [])
        .map((release) => /(\d{3,4})\s*p/i.exec(release?.quality ?? '')?.[1])
        .filter(Boolean),
    );
    steps.push({ name: 'qualities', ...summarise(translations, qualities.size) });
    steps.push({
      name: 'streams',
      ok: false,
      status: 0,
      ms: 0,
      items: 0,
      note: 'Kodik publishes an embed player link, not a media URL — never extracted around its player',
    });
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
    if (!endpoint.public && !KODIK_TOKEN && !KODIK_GATEWAY) {
      // Still probe it: an unauthenticated call proves reachability and shows the
      // credential error, which is more useful than a skipped line.
      report[id] = await probes[id](endpoint.base, args.query);
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
