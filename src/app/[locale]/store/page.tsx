import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { getPesapalConfig } from "@/lib/pesapal";
import { getCatalogPreviewPayload } from "@/lib/store-preview-server";
import { FlowNav } from "@/components/flow-nav";
import { StoreCatalogItem } from "./store-catalog-item";
import { StorePreviewOverlay } from "./store-preview-overlay";

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const previewId = sp.preview?.trim();

  const pesapal = getPesapalConfig();
  const pesapalReady = pesapal.configured && pesapal.appBaseUrl.startsWith("https://");

  const items = await prisma.catalogItem.findMany({
    where: { active: true },
    include: { standardVersion: { include: { standard: true } } },
  });

  const previewPayload = previewId ? await getCatalogPreviewPayload(previewId) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {previewPayload ? (
        <StorePreviewOverlay locale={locale} data={previewPayload} />
      ) : previewId ? (
        <div className="mb-4 rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Preview not found for that catalog item. Choose a standard below.
        </div>
      ) : null}

      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        {t(locale, "storeTitle")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Step 1. A published African Standard is bought or previewed here before a product is certified against it.
      </p>
      <FlowNav locale={locale} current="store" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-[var(--muted)]">
              No standards published yet. Import or create one in admin, then publish it to the webstore.
            </p>
          ) : (
            items.map((item) => (
              <StoreCatalogItem
                key={item.id}
                locale={locale}
                catalogItemId={item.id}
                editionLabel={item.standardVersion.editionLabel}
                coverTitle={item.coverTitle}
                scopeEn={item.standardVersion.scopeEn}
                priceCents={item.priceCents}
                currency={item.currency}
                pesapalReady={pesapalReady}
              />
            ))
          )}
        </div>
        <aside className="panel h-fit p-5">
          <h3 className="font-semibold">Payment</h3>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {pesapalReady
              ? `Pay with Pesapal (${pesapal.env}). The standard downloads after Pesapal confirms the payment. The order, confirmation code, and download are stored in the database.`
              : "Pesapal is not ready on this server yet. Add the merchant key and secret and a public https address, then restart. A standard is not released until Pesapal confirms payment."}
          </p>
        </aside>
      </div>
    </div>
  );
}
