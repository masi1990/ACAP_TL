import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { PriceTable, type PriceRow } from "./price-table";

export default async function AdminPricesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/prices`} />;
  if (!can(session.user, "standards:read")) notFound();

  const versions = await prisma.standardVersion.findMany({
    include: { standard: true, catalogItem: true },
    orderBy: { standard: { designation: "asc" } },
  });

  const rows: PriceRow[] = versions.map((version) => ({
    versionId: version.id,
    designation: version.standard.designation,
    title: version.standard.titleEn,
    edition: version.editionLabel,
    amount: version.catalogItem ? (version.catalogItem.priceCents / 100).toFixed(2) : "",
    currency: version.catalogItem?.currency || "USD",
    active: Boolean(version.catalogItem?.active),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Price table</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Each uploaded standard has its own webstore price. Enter the amount and currency, then list it.
          Standards stay off the webstore until a price is saved here.
        </p>
      </div>
      <PriceTable rows={rows} canWrite={can(session.user, "standards:write")} />
      <p className="text-xs text-[var(--muted)]">/{locale}/admin/prices</p>
    </div>
  );
}
