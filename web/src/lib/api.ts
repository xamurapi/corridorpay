// Shared API client for browser. SSR-safe (returns null when no token).

export const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8000';

export type ApiError = { code: string; message: string; details?: unknown };

function readToken(kind: 'access' | 'refresh' | 'admin'): string | null {
  if (typeof window === 'undefined') return null;
  const key = kind === 'admin' ? 'cp_admin_access' : kind === 'refresh' ? 'cp_refresh' : 'cp_access';
  return window.localStorage.getItem(key);
}

export function setTokens(opts: { access?: string; refresh?: string; admin?: boolean }) {
  if (typeof window === 'undefined') return;
  if (opts.access) {
    window.localStorage.setItem(opts.admin ? 'cp_admin_access' : 'cp_access', opts.access);
  }
  if (opts.refresh && !opts.admin) {
    window.localStorage.setItem('cp_refresh', opts.refresh);
  }
}

// Revoke the refresh session server-side (best-effort), then clear local tokens.
export async function revokeSession(kind: 'user' | 'admin' = 'user') {
  // Only the user flow stores a refresh token (cp_refresh). Never send it when
  // logging out of the admin panel — that would revoke the separate user session.
  const rt = kind === 'user' ? readToken('refresh') : null;
  if (rt) {
    try {
      await fetch(`${API_BASE}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
        cache: 'no-store',
      });
    } catch {
      // ignore network failure — local tokens are cleared regardless
    }
  }
  clearTokens(kind);
}

export function clearTokens(kind: 'user' | 'admin' = 'user') {
  if (typeof window === 'undefined') return;
  if (kind === 'admin') {
    window.localStorage.removeItem('cp_admin_access');
  } else {
    window.localStorage.removeItem('cp_access');
    window.localStorage.removeItem('cp_refresh');
  }
}

let refreshInFlight: Promise<boolean> | null = null;

// Exchange the stored refresh token for a fresh access/refresh pair.
// Deduplicated so concurrent 401s trigger only one refresh call.
async function tryRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (refreshInFlight) return refreshInFlight;
  const rt = readToken('refresh');
  if (!rt) return false;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
        cache: 'no-store',
      });
      if (!res.ok) {
        clearTokens('user');
        return false;
      }
      const data = (await res.json()) as { access_token?: string; refresh_token?: string };
      if (!data.access_token) return false;
      setTokens({ access: data.access_token, refresh: data.refresh_token });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: 'user' | 'admin' | 'none'; adminReason?: string; _retried?: boolean } = {},
): Promise<T> {
  const { auth = 'none', adminReason, headers, _retried, ...rest } = options;
  const h = new Headers(headers || {});
  h.set('Content-Type', 'application/json');
  h.set('Accept', 'application/json');
  if (auth === 'user') {
    const t = readToken('access');
    if (t) h.set('Authorization', `Bearer ${t}`);
  } else if (auth === 'admin') {
    const t = readToken('admin');
    if (t) h.set('Authorization', `Bearer ${t}`);
    // HTTP header values must be ISO-8859-1; URL-encode so Cyrillic reasons
    // survive. The backend URL-decodes this for audit logs.
    if (adminReason) h.set('X-Admin-Reason', encodeURIComponent(adminReason));
  }
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { ...rest, headers: h, cache: 'no-store' });

  // Transparently refresh an expired user session once, then retry.
  if (res.status === 401 && auth === 'user' && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON body (e.g. nginx HTML 502/504) — surface as a structured error.
      data = null;
    }
  }
  if (!res.ok) {
    const d = data as { detail?: { error?: ApiError }; error?: ApiError } | null;
    const err: ApiError =
      (d && (d.detail?.error || d.error)) || { code: 'http_error', message: res.statusText || `HTTP ${res.status}` };
    const e = new Error(err.message) as Error & { api?: ApiError };
    e.api = err;
    throw e;
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string, opts?: Parameters<typeof apiFetch>[1]) => apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T,>(path: string, body?: unknown, opts?: Parameters<typeof apiFetch>[1]) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T,>(path: string, body?: unknown, opts?: Parameters<typeof apiFetch>[1]) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T,>(path: string, opts?: Parameters<typeof apiFetch>[1]) => apiFetch<T>(path, { ...opts, method: 'DELETE' }),
};
