/** Must match `basePath` in next.config.mjs (build-time). */
export const BASE_PATH = "/arso";

/** Prefix an app-absolute path with basePath (idempotent). */
export function withBasePath(path: string): string {
  if (!path) return BASE_PATH || "/";
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith("/")) return path;
  if (BASE_PATH && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`))) return path;
  return `${BASE_PATH}${path}`;
}

/** fetch() that applies basePath to app-absolute URLs. */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(withBasePath(input), {
    credentials: "same-origin",
    ...init,
  });
}
