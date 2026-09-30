/**
 * Centralised, user-safe error model.
 * Technical details are kept for logging but never surfaced to the UI verbatim.
 */
export type AppErrorCode =
  | 'NETWORK_UNAVAILABLE'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'INVALID_JSON'
  | 'INVALID_PAYLOAD'
  | 'NOT_FOUND'
  | 'MISSING_EPISODE'
  | 'STREAM_UNAVAILABLE'
  | 'UNSUPPORTED_MEDIA'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_DISABLED'
  | 'CACHE_CORRUPTED'
  | 'STORAGE_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

export interface AppErrorInit {
  code: AppErrorCode;
  message: string;
  providerId?: string;
  status?: number;
  url?: string;
  cause?: unknown;
  retryable?: boolean;
}

const RETRYABLE: Record<AppErrorCode, boolean> = {
  NETWORK_UNAVAILABLE: true,
  TIMEOUT: true,
  HTTP_ERROR: true,
  INVALID_JSON: true,
  INVALID_PAYLOAD: true,
  NOT_FOUND: false,
  MISSING_EPISODE: false,
  STREAM_UNAVAILABLE: true,
  UNSUPPORTED_MEDIA: false,
  PROVIDER_UNAVAILABLE: true,
  PROVIDER_DISABLED: false,
  CACHE_CORRUPTED: false,
  STORAGE_ERROR: true,
  PERMISSION_DENIED: false,
  UNKNOWN: true,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly providerId?: string;
  readonly status?: number;
  readonly url?: string;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(init: AppErrorInit) {
    super(init.message);
    this.name = 'AppError';
    this.code = init.code;
    this.providerId = init.providerId;
    this.status = init.status;
    this.url = init.url;
    this.retryable = init.retryable ?? RETRYABLE[init.code];
    this.cause = init.cause;
  }

  /** Stable, translatable message key for the UI layer. */
  get messageKey(): string {
    return `errors.${this.code.toLowerCase()}`;
  }

  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      providerId: this.providerId,
      status: this.status,
      url: this.url,
      retryable: this.retryable,
    };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function toAppError(value: unknown, fallbackCode: AppErrorCode = 'UNKNOWN'): AppError {
  if (isAppError(value)) return value;
  if (value instanceof Error) {
    if (value.name === 'AbortError') {
      return new AppError({ code: 'TIMEOUT', message: 'Request aborted', cause: value });
    }
    return new AppError({ code: fallbackCode, message: value.message, cause: value });
  }
  return new AppError({ code: fallbackCode, message: String(value), cause: value });
}
