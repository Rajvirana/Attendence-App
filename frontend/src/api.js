import { API_BASE } from './config';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

const RETRYABLE = new Set([502, 503, 504]);
const MAX_RETRIES = 4;

async function rawFetch(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { res, text };
}

async function fetchWithRetry(url, options) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { res, text } = await rawFetch(url, options);
      if (RETRYABLE.has(res.status) && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      return { res, text };
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  return rawFetch(url, options);
}

export async function wakeUpApi() {
  try {
    await fetchWithRetry(apiUrl('/api/health'), { method: 'GET' });
  } catch {
    // swallow — the real call will surface the error
  }
}

export async function apiFetch(path, options = {}) {
  if (import.meta.env.PROD && !API_BASE && String(path).startsWith('/api')) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Add it in Vercel → Settings → Environment Variables → VITE_API_BASE_URL = https://attendence-app-jlgs.onrender.com then Redeploy.'
    );
  }

  const headers = new Headers(options.headers);
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (
    options.body !== undefined &&
    options.body !== null &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  let res;
  let text;
  try {
    ({ res, text } = await fetchWithRetry(apiUrl(path), { ...options, headers }));
  } catch (e) {
    const isCors = e?.name === 'TypeError';
    throw new Error(
      isCors
        ? 'Network / CORS error — the API may be waking up (Render free tier). Wait ~30s and refresh.'
        : e?.message || 'Request failed'
    );
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const looksLikeHtml = text && /^\s*</.test(text);
    data = {
      message: looksLikeHtml
        ? 'API returned HTML — VITE_API_BASE_URL may be wrong or the API is down.'
        : text || 'Invalid response',
    };
  }

  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
