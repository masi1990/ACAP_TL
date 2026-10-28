import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { SiteHeader } from "@/components/site-header";
import { CrudNotice } from "@/components/ui/crud-notice";
import { getSessionUser } from "@/lib/auth";
import { dirFor, isLocale, t, type Locale } from "@/lib/i18n";
import { membershipCountryLabel } from "@/lib/countries";
import { siteNav } from "@/lib/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return {
    title: `${t(locale, "brand")} — ${t(locale, "brandSub")}`,
    description: `${t(locale, "tagline")}. ${t(locale, "motto")}`,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  return (
    <div dir={dirFor(locale)} lang={locale} className="relative z-10 flex min-h-screen flex-col">
      <SiteHeader
        locale={locale}
        signedIn={Boolean(session)}
        countryLabel={session ? membershipCountryLabel(session.user.memberships) : ""}
        groups={siteNav(session?.user ?? null, locale)}
      />
      <CrudNotice />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--line)]/70 py-6 text-base text-[var(--ink)]">
        <div className="shell flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t(locale, "brand")} · {t(locale, "brandSub")}
          </span>
          <span>{t(locale, "idleWarn")}</span>
        </div>
      </footer>
    </div>
  );
}
