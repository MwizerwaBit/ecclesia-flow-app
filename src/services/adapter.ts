/**
 * @file adapter.ts
 * @description The swap-point between mock data and the real API, and the
 * one HTTP client every service uses in REST mode.
 *
 * Mode: `VITE_API_MODE=rest` talks to the FastAPI backend at `VITE_API_URL`;
 * anything else (the default) uses the in-browser mock layer.
 *
 * Security model of the REST client:
 *   - The access token (15 min) lives only in this module's memory — never in
 *     localStorage — so an XSS payload can't lift it from storage, and it is
 *     gone when the tab closes.
 *   - The refresh token is an httpOnly, SameSite=Strict cookie scoped to
 *     /api/v1/auth. This code never sees it; it only asks the server to rotate it.
 *   - Every request carries `X-Requested-With`, which the server requires for
 *     cookie-authenticated calls (CSRF defence alongside SameSite).
 *   - Expired or out-of-date access tokens are refreshed once, transparently,
 *     with concurrent requests sharing a single refresh; if that fails the
 *     session-expired handler runs.
 *
 * The backend speaks snake_case and the app camelCase; keys are converted
 * here, at the boundary, so neither side has to know about the other.
 */

export const API_MODE: 'mock' | 'rest' = import.meta.env.VITE_API_MODE === 'rest' ? 'rest' : 'mock';
export const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

/** Simulate network delay in mock mode (ms) */
const MOCK_LATENCY = { min: 150, max: 400 };

function randomLatency(): number {
  return Math.random() * (MOCK_LATENCY.max - MOCK_LATENCY.min) + MOCK_LATENCY.min;
}

/**
 * Mock adapter — returns typed data after a simulated delay.
 * In 'rest' mode this is bypassed; real fetch calls happen in service files.
 */
export async function mockResponse<T>(data: T, latencyMs?: number): Promise<T> {
  const delay = latencyMs ?? randomLatency();
  await new Promise((resolve) => setTimeout(resolve, delay));
  return structuredClone(data) as T;
}

// ─── Errors ────────────────────────────────────────────────────────────────

/** A failed API call, with the server's machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: unknown;
  readonly lockedUntil?: string;

  constructor(status: number, code: string, message: string, extra?: { fields?: unknown; lockedUntil?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = extra?.fields;
    this.lockedUntil = extra?.lockedUntil;
  }
}

// ─── Key casing ────────────────────────────────────────────────────────────

const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Keys that are data rather than field names (ids, "members:read", dates) are left alone. */
const isFieldName = (key: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(key);

function convertKeys(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => convertKeys(item, convert));
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        isFieldName(k) ? convert(k) : k,
        convertKeys(v, convert),
      ]),
    );
  }
  return value;
}

export const toSnakeCase = <T>(value: T) => convertKeys(value, toSnake);
export const toCamelCase = <T>(value: unknown) => convertKeys(value, toCamel) as T;

// ─── Tokens (memory only) ──────────────────────────────────────────────────

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let stepUp: { token: string; expiresAt: number } | null = null;

export function setAccessToken(token: string | null, expiresAt = 0): void {
  accessToken = token || null;
  accessTokenExpiresAt = token ? expiresAt : 0;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

/** A just-verified MFA step-up, sent with the next sensitive call(s) until it lapses. */
export function setStepUpToken(token: string, expiresInSeconds: number): void {
  stepUp = { token, expiresAt: Date.now() + expiresInSeconds * 1000 };
}

interface AuthHandlers {
  /** Rotate the refresh cookie and install a new access token. Resolves false when there is no session. */
  refresh: () => Promise<boolean>;
  /** The session is over (revoked, expired, suspended). */
  expired: (reason: string) => void;
}

let handlers: AuthHandlers | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function registerAuthHandlers(next: AuthHandlers): void {
  handlers = next;
}

/** One refresh at a time; concurrent callers share it. */
export function refreshAccessToken(): Promise<boolean> {
  if (!handlers) return Promise.resolve(false);
  refreshInFlight ??= handlers.refresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// ─── The request function ─────────────────────────────────────────────────

export interface ApiRequestOptions extends RequestInit {
  /** Public/auth endpoints: no bearer token, no refresh-and-retry. */
  skipAuth?: boolean;
  /** Send the body as-is (e.g. FormData uploads). */
  rawBody?: boolean;
}

/** Codes after which refreshing cannot help — the session itself is gone. */
const TERMINAL_CODES = new Set(['session_revoked', 'no_session']);

function withSnakeQuery(path: string): string {
  const [base, query] = path.split('?');
  if (!query) return path;
  const params = new URLSearchParams(query);
  const out = new URLSearchParams();
  params.forEach((value, key) => {
    if (value !== '' && value !== 'undefined') out.append(isFieldName(key) ? toSnake(key) : key, value);
  });
  const qs = out.toString();
  return qs ? `${base}?${qs}` : base;
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const { skipAuth, rawBody, headers, body, ...init } = options;
  let payload = body;
  if (!rawBody && typeof body === 'string' && body) {
    try {
      payload = JSON.stringify(toSnakeCase(JSON.parse(body)));
    } catch {
      payload = body;
    }
  }
  const finalHeaders: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(rawBody ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string> | undefined),
  };
  if (!skipAuth && accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;
  if (!skipAuth && stepUp && stepUp.expiresAt > Date.now()) finalHeaders['X-Step-Up-Token'] = stepUp.token;

  return fetch(`${BASE_URL}${withSnakeQuery(path)}`, {
    ...init,
    body: payload,
    headers: finalHeaders,
    credentials: 'include', // the refresh cookie rides only to /auth endpoints (cookie path)
    cache: 'no-store',
  });
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; lockedUntil?: string }; fields?: unknown }
    | null;
  return new ApiError(
    res.status,
    body?.error?.code ?? `http_${res.status}`,
    body?.error?.message ?? res.statusText ?? 'Request failed',
    { fields: body?.fields, lockedUntil: body?.error?.lockedUntil },
  );
}

/**
 * Real API call — JSON in and out, camelCase on this side, snake_case on the
 * wire. Only used when API_MODE = 'rest'.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!options.skipAuth && handlers) {
    // No token yet (fresh tab) or about to expire: refresh first rather than
    // spend a request on a guaranteed 401.
    if (!accessToken || accessTokenExpiresAt - Date.now() < 30_000) await refreshAccessToken();
  }

  let res = await send(path, options);

  if (res.status === 401 && !options.skipAuth) {
    const error = await toApiError(res);
    if (TERMINAL_CODES.has(error.code) || !(await refreshAccessToken())) {
      handlers?.expired(error.code);
      throw error;
    }
    res = await send(path, options); // once, with the fresh token
    if (res.status === 401) {
      const again = await toApiError(res);
      handlers?.expired(again.code);
      throw again;
    }
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? toCamelCase<T>(JSON.parse(text)) : undefined) as T;
}

/**
 * Binary downloads (e.g. a church's certificate). Same auth, refresh and
 * error handling as apiRequest, but returns the body as a Blob.
 */
export async function apiBlob(path: string): Promise<Blob> {
  if (handlers && (!accessToken || accessTokenExpiresAt - Date.now() < 30_000)) await refreshAccessToken();
  let res = await send(path, { method: 'GET' });
  if (res.status === 401 && (await refreshAccessToken())) res = await send(path, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return res.blob();
}

/**
 * Features built on the real API only (registration lifecycle, billing,
 * leadership, group invitations, event review). In demo mode they explain
 * themselves instead of pretending.
 */
export function requireApi(feature: string): void {
  if (API_MODE !== 'rest') {
    throw new ApiError(
      501,
      'requires_api',
      `${feature} needs the EcclesiaFlow API. Start the backend and set VITE_API_MODE=rest (see .env.example).`,
    );
  }
}
