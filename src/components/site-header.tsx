"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { FontSizeControl } from "@/components/font-size-control";
import { useStoreCart } from "@/lib/store-cart";

export type HeaderLink = { id: string; href: string; label: string };
export type HeaderGroup = { id: string; label: string; links: HeaderLink[] };

function linkActive(pathname: string, link: HeaderLink, homeHref: string) {
  if (link.href === homeHref) return pathname === link.href || pathname === `${link.href}/`;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

/** Flat links. Each destination is visible; nothing in the bar opens a menu. */
export function SiteHeader({
  locale,
  signedIn = false,
  countryLabel = "",
  groups,
}: {
  locale: Locale;
  signedIn?: boolean;
  countryLabel?: string;
  groups: HeaderGroup[];
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cartCount = useStoreCart().length;
  const base = pathname.replace(/^\/(en|fr|pt|ar)/, "") || "";
  const homeHref = `/${locale}`;
  const flat = groups.flatMap((group) => group.links);
  const activeHref = flat
    .filter((link) => linkActive(pathname, link, homeHref))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setBusy(false);
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white">
      <div className="shell flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <Link href={`/${locale}`} className="group shrink-0">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
            {t(locale, "brand")}
          </span>
        </Link>
        <nav aria-label="Sections" className="flex min-w-0 flex-wrap items-center gap-1">
          {flat.map((link) => {
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-2 py-1.5 text-base",
                  active ? "bg-[var(--ink)] font-semibold text-white" : "text-[var(--ink)] hover:bg-[var(--surface-2)]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {signedIn && countryLabel ? (
            <span className="max-w-[12rem] truncate text-base text-[var(--ink)]" title={`${t(locale, "country")}: ${countryLabel}`}>
              {countryLabel}
            </span>
          ) : null}
          <Link
            href={`/${locale}/store/cart`}
            className="rounded-md border border-[var(--ink)] bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
          >
            Cart{cartCount > 0 ? ` (${cartCount})` : ""}
          </Link>
          <FontSizeControl />
          <nav aria-label="Language" className="flex items-center gap-1">
            {locales.map((code) => {
              const selected = code === locale;
              return (
                <Link
                  key={code}
                  href={`/${code}${base}`}
                  hrefLang={code}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "rounded-md px-1.5 py-1 text-base uppercase",
                    selected ? "font-semibold text-[var(--ink)] underline" : "text-[var(--ink)] hover:underline",
                  )}
                >
                  {code}
                </Link>
              );
            })}
          </nav>
          {signedIn ? (
            <button
              type="button"
              onClick={signOut}
              disabled={busy}
              className="rounded-md border border-[var(--ink)] bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
            >
              {busy ? "…" : t(locale, "logout")}
            </button>
          ) : (
            <Link href={`/${locale}/login`} className="rounded-md bg-[var(--ink)] px-3 py-2 text-base font-semibold text-white">
              {t(locale, "login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
