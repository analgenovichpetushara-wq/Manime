import http from 'node:http';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { AddressInfo } from 'node:net';

const GATEWAY = path.join(__dirname, '..', 'server', 'kodik-gateway.mjs');

jest.setTimeout(60_000);

/** Plain node HTTP client — the jest environment polyfills global fetch. */
function httpGet(url: string): Promise<{ status: number; body: unknown; raw: string }> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        response.destroy();
        let body: unknown = raw;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          body = raw;
        }
        resolve({ status: response.statusCode ?? 0, body, raw });
      });
    });
    request.on('error', reject);
  });
}

interface UpstreamCall {
  url: string;
  query: URLSearchParams;
}

/** Stands in for https://kodik-api.com so the gateway can be driven offline. */
function startFakeKodik(): Promise<{
  origin: string;
  calls: UpstreamCall[];
  close: () => Promise<void>;
  behaviour: { mode: 'ok' | 'token' | 'slow'; delayMs: number };
}> {
  const calls: UpstreamCall[] = [];
  const behaviour = { mode: 'ok' as 'ok' | 'token' | 'slow', delayMs: 0 };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    calls.push({ url: req.url ?? '', query: url.searchParams });
    const finish = () => {
      if (behaviour.mode === 'token') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Отсутствует или неверный токен' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ time: '2ms', total: 1, results: [{ id: 'serial-1', title: 'Тест' }] }));
    };
    if (behaviour.delayMs) setTimeout(finish, behaviour.delayMs);
    else finish();
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        calls,
        behaviour,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

function startGateway(port: number, env: Record<string, string>): Promise<{ close: () => void; child: ChildProcessWithoutNullStreams }> {
  const child = spawn(process.execPath, [GATEWAY], {
    env: { ...process.env, ...env, PORT: String(port), HOST: '127.0.0.1' },
  }) as ChildProcessWithoutNullStreams;
  child.stdout.resume();
  child.stderr.resume();
  const close = () => {
    child.kill('SIGKILL');
  };
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 8000;
    const probe = () => {
      const request = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 500 }, (response) => {
        response.resume();
        response.destroy();
        request.destroy();
        resolve({ close, child });
      });
      request.on('error', () => {
        if (Date.now() > deadline) reject(new Error('gateway did not start'));
        else setTimeout(probe, 100);
      });
      request.on('timeout', () => request.destroy());
    };
    probe();
  });
}

describe('Kodik gateway (real process)', () => {
  let kodik: Awaited<ReturnType<typeof startFakeKodik>>;
  let gateway: { origin: string; close: () => void };
  const gatewayPort = 8991;

  beforeAll(async () => {
    kodik = await startFakeKodik();
    const started = await startGateway(gatewayPort, {
      KODIK_API_TOKEN: 'super-secret-token',
      KODIK_API_BASE: kodik.origin,
      RATE_LIMIT_PER_MIN: '40',
      KODIK_TIMEOUT_MS: '500',
    });
    gateway = { origin: `http://127.0.0.1:${gatewayPort}`, close: started.close };
  });

  afterAll(async () => {
    gateway.close();
    await kodik.close();
  });

  it('injects the token server-side and never echoes it', async () => {
    kodik.calls.length = 0;
    const response = await httpGet(`${gateway.origin}/search?title=naruto&limit=5`);
    const body = response.body as { results: unknown[] };

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(kodik.calls[0]?.query.get('token')).toBe('super-secret-token');
    expect(kodik.calls[0]?.url).toContain('/search?');
    expect(response.raw).not.toContain('super-secret-token');
  });

  it('whitelists parameters and rejects junk routes', async () => {
    kodik.calls.length = 0;
    await httpGet(`${gateway.origin}/search?title=naruto&limit=9999&token=leak&evil=1`);
    const forwarded = kodik.calls[0]?.query;
    expect(forwarded?.get('limit')).toBe('100');
    expect(forwarded?.has('evil')).toBe(false);
    expect(forwarded?.get('token')).toBe('super-secret-token');

    expect((await httpGet(`${gateway.origin}/search?limit=5`)).status).toBe(400);
    expect((await httpGet(`${gateway.origin}/download?url=http://example.invalid`)).status).toBe(404);

    // /get-player is reachable, but only with a target, and only its own params.
    kodik.calls.length = 0;
    expect((await httpGet(`${gateway.origin}/get-player`)).status).toBe(400);
    const player = await httpGet(`${gateway.origin}/get-player?ID=serial-42758&hasPlayer=true&token=leak`);
    expect(player.status).toBe(200);
    expect(kodik.calls[0]?.url).toContain('/get-player?');
    expect(kodik.calls[0]?.query.get('ID')).toBe('serial-42758');
    expect(kodik.calls[0]?.query.get('hasPlayer')).toBe('true');
    expect(kodik.calls[0]?.query.get('token')).toBe('super-secret-token');
  });

  it('maps a Kodik token failure onto 401 AUTHENTICATION_REQUIRED', async () => {
    kodik.behaviour.mode = 'token';
    const response = await httpGet(`${gateway.origin}/material?id=serial-42758`);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Отсутствует или неверный токен' },
    });
    kodik.behaviour.mode = 'ok';
  });

  it('answers 504 when Kodik is too slow and 429 when flooded', async () => {
    kodik.behaviour.delayMs = 2000;
    expect((await httpGet(`${gateway.origin}/search?title=x`)).status).toBe(504);
    kodik.behaviour.delayMs = 0;

    const limited = await startGateway(8992, {
      KODIK_API_TOKEN: 'tok',
      KODIK_API_BASE: kodik.origin,
      RATE_LIMIT_PER_MIN: '2',
    });
    const origin = 'http://127.0.0.1:8992';
    expect((await httpGet(`${origin}/search?title=x`)).status).toBe(200);
    expect((await httpGet(`${origin}/search?title=x`)).status).toBe(200);
    expect((await httpGet(`${origin}/search?title=x`)).status).toBe(429);
    limited.close();
  });

  it('refuses to serve anything without a configured token', async () => {
    const unconfigured = await startGateway(8993, { KODIK_API_TOKEN: '', KODIK_API_BASE: kodik.origin });
    const origin = 'http://127.0.0.1:8993';
    const response = await httpGet(`${origin}/search?title=x`);
    expect(response.status).toBe(503);
    expect((response.body as { error: { code: string } }).error.code).toBe('AUTHENTICATION_REQUIRED');
    // /health still answers, but reports the missing credential honestly.
    const health = (await httpGet(`${origin}/health`)).body;
    expect(health).toMatchObject({ configured: false });
    unconfigured.close();
  });
});
