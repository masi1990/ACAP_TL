import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_PATH_SUFFIXES } from "@/lib/rbac";

const LOCALES = new Set(["en", "fr", "pt", "ar"]);
const SESSION_COOKIE = "acap_session";

/** Public API prefixes (no session). Everything else under /api requires auth. */
const PUBLIC_API_PREFIXES = [
  "/api/lookup",
  "/api/verify",
  "/api/tariff-lines",
  "/api/store/preview",
  "/api/store/preview-data",
  "/api/store/checkout",
  "/api/store/download",
  "/api/store/pesapal",
  "/api/registry",
  "/api/certificates",
  "/api/auth/login",
  "/api/chain/complaints",
  "/api/auth/accept-invite",
  "/api/jobs/dispatch",
];

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicLocalePath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return true;
  const locale = parts[0];
  if (!LOCALES.has(locale)) return false;
  const rest = parts.slice(1).join("/");
  const suffix = rest ? `/${rest}` : "";
  if (suffix === "/certificates" || suffix.startsWith("/certificates/")) return true;
  if (suffix === "/invite" || suffix.startsWith("/invite/")) return true;
  if (suffix === "/api/store/download") return true;
  // Exact public page match (no nested public paths except store query overlays)
  return (PUBLIC_PATH_SUFFIXES as readonly string[]).some((p) => {
    if (p === "") return suffix === "";
    return suffix === p || suffix.startsWith(`${p}?`);
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static / Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/standards/") ||
    pathname.startsWith("/uploads/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname) || pathname === "/api/auth/logout") {
      return NextResponse.next();
    }
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Root redirect handled by app/page — treat as public
  if (pathname === "/") return NextResponse.next();

  if (isPublicLocalePath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const locale = pathname.split("/").filter(Boolean)[0] || "en";
    const login = new URL(`/${LOCALES.has(locale) ? locale : "en"}/login`, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
