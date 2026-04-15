import { API_BASE } from './config';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body !== undefined && options.body !== null && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(apiUrl(path), { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || 'Invalid response' };
  }
  if (!res.ok) {
    let msg = data?.message || res.statusText;
    if (res.status === 403 && !data?.message) {
      msg =
        'Request blocked (403). If the API uses CLIENT_URL, add your exact app URL (try http://localhost:5173 and http://127.0.0.1:5173), or leave CLIENT_URL empty for local dev.';
    }
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
