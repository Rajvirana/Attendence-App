const raw = import.meta.env.VITE_API_BASE_URL;

/** Base URL for REST + Socket.IO (empty = same origin, use Vite proxy in dev) */
export const API_BASE = typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
