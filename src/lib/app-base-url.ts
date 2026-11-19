import { BASE_PATH } from "@/lib/base-path";

const LOCALES = new Set(["en", "fr", "pt", "ar"]);

/**
 * Public site origin including Next basePath (/arso), without a locale segment.
 * Accepts mistaken values like https://host/arso/en and normalizes them.
 */
export function normalizeAppBaseUrl(raw?: string | null): string {
  const fallback = `http://127.0.0.1:43123${BASE_PATH || ""}`;
  let value = String(raw || fallback).trim().replace(/\/+$/, "");
  if (!value) value = fallback;

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length && LOCALES.has(parts[parts.length - 1]!)) {
      parts.pop();
    }
    // Ensure /arso basePath is present for production hosts that omit it.
    if (BASE_PATH) {
      const base = BASE_PATH.replace(/^\//, "");
      if (parts[0] !== base) parts.unshift(base);
    }
    url.pathname = parts.length ? `/${parts.join("/")}` : "/";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return value.replace(/\/(en|fr|pt|ar)$/i, "").replace(/\/+$/, "") || fallback;
  }
}

export function appBaseUrl() {
  return normalizeAppBaseUrl(process.env.APP_BASE_URL);
}

/** Join app base with an absolute app path (e.g. /en/store or /api/...). */
export function appAbsoluteUrl(pathname: string) {
  const base = appBaseUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (BASE_PATH && path === BASE_PATH) return base;
  if (BASE_PATH && path.startsWith(`${BASE_PATH}/`)) {
    return `${base}${path.slice(BASE_PATH.length)}`;
  }
  return `${base}${path}`;
}
