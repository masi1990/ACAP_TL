import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { isDistribution } from "@/lib/catalog-access";
import { PriceTable, type PriceRow } from "./price-table";

export default async function AdminPricesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/prices`} />;
  if (!can(session.user, "standards:read")) notFound();

  const versions = await prisma.standardVersion.findMany({
    include: {
      standard: true,
      catalogItem: true,
      tariffMaps: { include: { tariffLine: { include: { rec: true } } } },
    },
    orderBy: { standard: { designation: "asc" } },
  });

  const listing = listPage((await searchParams).page, versions.length);
  const rows: PriceRow[] = versions.slice(listing.skip, listing.skip + listing.take).map((version) => ({
    versionId: version.id,
    designation: version.standard.designation,
    title: version.standard.titleEn,
    edition: version.editionLabel,
    amount: version.catalogItem ? (version.catalogItem.priceCents / 100).toFixed(2) : "",
    currency: version.catalogItem?.currency || "USD",
    active: Boolean(version.catalogItem?.active),
    distribution: isDistribution(version.catalogItem?.distribution || "")
      ? (version.catalogItem!.distribution as PriceRow["distribution"])
      : "PAID",
    tariffs: version.tariffMaps.map((map) => ({
      id: map.id,
      code: map.tariffLine.codeDisplay,
      description: map.tariffLine.description,
      recCode: map.tariffLine.rec.code,
      recName: map.tariffLine.rec.name,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--ink)]">Price table</h2>
        <p className="mt-1 max-w-3xl text-base text-[var(--ink)]">
          List a standard as priced, free to read on screen with no download, or free to read and download.
          A standard stays off the webstore until it is listed. Hover a tariff line to see its description and
          the community it applies in, such as EAC.
        </p>
      </div>
      <PriceTable rows={rows} canWrite={can(session.user, "standards:write")} />
      <LinePager
        page={listing.page}
        pageCount={listing.pageCount}
        prevHref={listHref(`/${locale}/admin/prices`, listing.page - 1)}
        nextHref={listHref(`/${locale}/admin/prices`, listing.page + 1)}
      />
      <p className="text-sm text-[var(--ink)]">/{locale}/admin/prices</p>
    </div>
  );
}
