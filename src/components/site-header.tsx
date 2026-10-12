"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, t, type Locale, isLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Public nav always; Dashboard appears when signed in (auth-gated). */
export function SiteHeader({ locale, signedIn = false }: { locale: Locale; signedIn?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const base = pathname?.replace(/^\/(en|fr|pt|ar)/, "") || "";

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setBusy(false);
    router.push(`/${locale}/login`);
    router.refresh();
  }

  const links = [
    { href: `/${locale}`, label: t(locale, "navHome") },
    { href: `/${locale}/lookup`, label: t(locale, "navLookup") },
    { href: `/${locale}/verify`, label: t(locale, "navVerify") },
    { href: `/${locale}/registry`, label: t(locale, "navRegistry") },
    { href: `/${locale}/store`, label: t(locale, "navStore") },
    { href: `/${locale}/chain`, label: t(locale, "navChain") },
    { href: `/${locale}/cb`, label: t(locale, "navCertification") },
    { href: `/${locale}/surveillance`, label: t(locale, "navSurveillance") },
    { href: `/${locale}/consumers`, label: t(locale, "navConsumers") },
    ...(signedIn
      ? [{ href: `/${locale}/dashboard`, label: t(locale, "navDashboard") }]
      : []),
  ];

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
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]",
                pathname === l.href && "bg-[var(--surface-2)] text-[var(--ink)]",
              )}
            >
              {l.label}
            </Link>
          ))}
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
          <Link
            href={signedIn ? `/${locale}/dashboard` : `/${locale}/login`}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-fg)]"
          >
            {signedIn ? t(locale, "navDashboard") : t(locale, "login")}
          </Link>
          {signedIn && (
            <button
              type="button"
              onClick={signOut}
              disabled={busy}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
            >
              {busy ? "…" : t(locale, "logout")}
            </button>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-[var(--line)]/60 px-4 py-2 md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--muted)]"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
