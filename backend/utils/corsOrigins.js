/**
 * Parse CLIENT_URL and mirror localhost ↔ 127.0.0.1 so dev works whether you open
 * http://localhost:5173 or http://127.0.0.1:5173 (different Origin header).
 */
export function resolveAllowedOrigins(clientUrlEnv) {
  const raw = clientUrlEnv || "";
  if (!raw.trim()) {
    return null;
  }
  const set = new Set();
  for (const piece of raw.split(",")) {
    const s = piece.trim();
    if (!s) continue;
    set.add(s);
    try {
      const u = new URL(s);
      const portPart = u.port ? `:${u.port}` : "";
      if (u.hostname === "localhost") {
        set.add(`${u.protocol}//127.0.0.1${portPart}`);
      } else if (u.hostname === "127.0.0.1") {
        set.add(`${u.protocol}//localhost${portPart}`);
      }
    } catch {
      // ignore invalid URLs
    }
  }
  return [...set];
}
