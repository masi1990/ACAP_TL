import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getStandardPreviewByVersionId } from "@/lib/store-preview-server";
import { StorePreviewOverlay } from "../../store/store-preview-overlay";

export default async function PublicStandardPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const { version } = await searchParams;
  if (!version) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[var(--muted)]">Missing standard version id.</p>
        <Link href={`/${locale}/lookup`} className="mt-4 inline-block text-[var(--accent)] underline">
          Back to tariff lookup
        </Link>
      </div>
    );
  }

  const data = await getStandardPreviewByVersionId(version);
  if (!data) notFound();

  // Reuse overlay; close returns to lookup
  return (
    <div className="min-h-[60vh]">
      <StorePreviewOverlay
        locale={locale}
        data={{ ...data, catalogItemId: data.catalogItemId }}
        closeHref={`/${locale}/lookup`}
      />
      <div className="shell py-20 text-center text-sm text-[var(--muted)]">
        Loading standard preview…
      </div>
    </div>
  );
}
