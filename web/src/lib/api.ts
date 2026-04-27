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

export function clearTokens(kind: 'user' | 'admin' = 'user') {
  if (typeof window === 'undefined') return;
  if (kind === 'admin') {
    window.localStorage.removeItem('cp_admin_access');
  } else {
    window.localStorage.removeItem('cp_access');
    window.localStorage.removeItem('cp_refresh');
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: 'user' | 'admin' | 'none'; adminReason?: string } = {},
): Promise<T> {
  const { auth = 'none', adminReason, headers, ...rest } = options;
  const h = new Headers(headers || {});
  h.set('Content-Type', 'application/json');
  h.set('Accept', 'application/json');
  if (auth === 'user') {
    const t = readToken('access');
    if (t) h.set('Authorization', `Bearer ${t}`);
  } else if (auth === 'admin') {
    const t = readToken('admin');
    if (t) h.set('Authorization', `Bearer ${t}`);
    if (adminReason) h.set('X-Admin-Reason', adminReason);
  }
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { ...rest, headers: h, cache: 'no-store' });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = (data && (data.detail?.error || data.error)) || { code: 'http_error', message: res.statusText };
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
