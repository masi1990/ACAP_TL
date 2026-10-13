import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { SiteHeader } from "@/components/site-header";
import { CrudNotice } from "@/components/ui/crud-notice";
import { getSessionUser } from "@/lib/auth";
import { dirFor, isLocale, t, type Locale } from "@/lib/i18n";
import { publicNav, workNav } from "@/lib/navigation";

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
        publicLinks={publicNav(locale)}
        workLinks={session ? workNav(session.user, locale) : []}
      />
      <CrudNotice />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--line)]/70 px-4 py-6 text-sm text-[var(--muted)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t(locale, "brand")} · {t(locale, "brandSub")}
          </span>
          <span>{t(locale, "idleWarn")}</span>
        </div>
      </footer>
    </div>
  );
}
