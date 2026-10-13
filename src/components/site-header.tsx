"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, t, type Locale, isLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type HeaderLink = { id: string; href: string; label: string };

function linkActive(pathname: string, link: HeaderLink, homeHref: string) {
  if (link.href === homeHref) return pathname === link.href || pathname === `${link.href}/`;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

/** Public path always. Signed-in desks appear only when this session can open them. */
export function SiteHeader({
  locale,
  signedIn = false,
  publicLinks,
  workLinks = [],
}: {
  locale: Locale;
  signedIn?: boolean;
  publicLinks: HeaderLink[];
  workLinks?: HeaderLink[];
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const base = pathname.replace(/^\/(en|fr|pt|ar)/, "") || "";
  const homeHref = `/${locale}`;

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setBusy(false);
    router.push(`/${locale}/login`);
    router.refresh();
  }

  function renderLinks(links: HeaderLink[], compact = false) {
    return links.map((link) => {
      const active = linkActive(pathname, link, homeHref);
      return (
        <Link
          key={link.href}
          href={link.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            compact
              ? "shrink-0 rounded-md px-2 py-1 text-xs"
              : "rounded-md px-2.5 py-1.5 text-sm",
            active
              ? "bg-[var(--surface-2)] text-[var(--ink)]"
              : "text-[var(--muted)] hover:text-[var(--ink)]",
          )}
        >
          {link.label}
        </Link>
      );
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)]/80 bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
            {t(locale, "brand")}
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-[var(--muted)] sm:inline">
            {t(locale, "brandSub")}
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {renderLinks(publicLinks)}
          {workLinks.length > 0 && <span className="mx-1 h-4 w-px bg-[var(--line)]" aria-hidden />}
          {renderLinks(workLinks)}
        </nav>
        <div className="flex items-center gap-2">
          <select
            aria-label="Language"
            className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-sm"
            value={locale}
            onChange={(e) => {
              const next = e.target.value;
              if (isLocale(next)) router.push(`/${next}${base}`);
            }}
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          {signedIn ? (
            <button
              type="button"
              onClick={signOut}
              disabled={busy}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
            >
              {busy ? "…" : t(locale, "logout")}
            </button>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-fg)]"
            >
              {t(locale, "login")}
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-[var(--line)]/60 px-4 py-2 md:hidden">
        {renderLinks(publicLinks, true)}
        {renderLinks(workLinks, true)}
      </nav>
    </header>
  );
}
