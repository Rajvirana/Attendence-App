/**
 * STEP 3 — API base URL (set on Vercel as VITE_API_BASE_URL = your Render API URL, no trailing slash)
 *
 * Equivalent register call (what the app builds internally via apiFetch):
 *
 *   fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ name, email, password, role }),
 *   })
 *
 * AuthContext.register() uses apiFetch('/api/auth/register', ...) → same URL as above.
 * If VITE_API_BASE_URL is empty, base is '' → browser calls /api/... on the same host (Vite dev proxy → backend).
 */
const raw = import.meta.env.VITE_API_BASE_URL;

/** Normalized base: no trailing slash; empty string = same-origin / proxy */
export const API_BASE = typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
