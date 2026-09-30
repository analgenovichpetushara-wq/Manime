/* Minimal structured logger. Never logs tokens or user content. */
type Level = 'debug' | 'info' | 'warn' | 'error';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const REDACT_KEYS = ['token', 'authorization', 'password', 'secret', 'apikey', 'api_key'];

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3 || value == null) return value;
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACT_KEYS.includes(key.toLowerCase()) ? '[redacted]' : redact(val, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level: Level, scope: string, message: string, meta?: unknown) {
  if (!isDev && (level === 'debug' || level === 'info')) return;
  const payload = meta === undefined ? '' : ` ${JSON.stringify(redact(meta))}`;
  const line = `[AnimAlc][${scope}] ${message}${payload}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console
  else if (isDev) console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: unknown) => emit('debug', scope, message, meta),
    info: (message: string, meta?: unknown) => emit('info', scope, message, meta),
    warn: (message: string, meta?: unknown) => emit('warn', scope, message, meta),
    error: (message: string, meta?: unknown) => emit('error', scope, message, meta),
  };
}

export const appLogger = createLogger('app');
