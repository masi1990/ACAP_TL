import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { countryOptions } from "@/lib/countries";
import { loadCustomsDeskPage, type CustomsDeskSearchParams } from "@/lib/customs-desk-list";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { CustomsDesk } from "../customs/customs-desk";

export default async function InspectionDeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CustomsDeskSearchParams>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/inspect`} />;
  if (!can(session.user, "inspect:write")) return <ClientRedirect href={`/${locale}/dashboard`} />;

  const desk = await loadCustomsDeskPage(await searchParams);

  return (
    <main className="shell space-y-6 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Inspection desk</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{t(locale, "Inspection")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Choose a product, then use the tabs for the inspection, the certificate, the certification record, documents,
          and the standard. The customs decision for that product is on the Decision tab. Documents and the standard
          open for viewing only.
        </p>
      </div>
      {!desk.anyProducts ? (
        <p className="text-sm text-[var(--muted)]">No products to inspect yet.</p>
      ) : (
        <CustomsDesk
          locale={locale}
          mode="inspect"
          products={desk.products}
          list={{
            pathname: `/${locale}/inspect`,
            q: desk.q,
            page: desk.listing.page,
            pageCount: desk.listing.pageCount,
            from: desk.listing.from,
            to: desk.listing.to,
            total: desk.listing.total,
          }}
          initialProductId={desk.selectedId}
          countries={countryOptions()}
        />
      )}
    </main>
  );
}
