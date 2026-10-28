import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { fulfillByPesapalTrackingId } from "@/lib/store-fulfillment";
import { downloadLocaleOrder, publishedLocales } from "@/lib/standard-kinds";
import { PaymentWait } from "../payment-wait";
import { ClearPurchasedCart } from "../clear-purchased-cart";

export default async function StoreReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    OrderTrackingId?: string;
    orderId?: string;
    status?: string;
    artifact?: string;
    error?: string;
    wait?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;

  let artifactUri = sp.artifact?.trim() || null;
  let orderId = sp.orderId?.trim() || null;
  let status = (sp.status || "").toUpperCase();
  const error = sp.error?.trim() || null;
  const wait = Number(sp.wait || "0") || 0;
  const trackingId = sp.OrderTrackingId?.trim() || "";

  if (trackingId && !artifactUri && !error) {
    try {
      const outcome = await fulfillByPesapalTrackingId(trackingId);
      status = outcome.status.toUpperCase();
      orderId = outcome.orderId || orderId;
      artifactUri = outcome.result?.artifactUri || artifactUri;
    } catch {
      status = status || "PENDING";
    }
  }

  if (!artifactUri && orderId) {
    const entitlement = await prisma.standardEntitlement.findFirst({
      where: { orderId },
    });
    artifactUri = entitlement?.artifactUri || null;
  }

  if (!orderId && sp.OrderTrackingId) {
    const payment = await prisma.paymentAttempt.findFirst({
      where: { provider: "PESAPAL", providerRef: sp.OrderTrackingId },
    });
    orderId = payment?.orderId || null;
    if (orderId && !artifactUri) {
      const entitlement = await prisma.standardEntitlement.findFirst({
        where: { orderId },
      });
      artifactUri = entitlement?.artifactUri || null;
    }
  }

  const completed = status === "COMPLETED" || Boolean(artifactUri);

  const languageName = (code: string) =>
    t(locale, code === "fr" ? "French" : code === "pt" ? "Portuguese" : code === "ar" ? "Arabic" : "English");
  const downloads: {
    catalogItemId: string;
    title: string;
    preferredLocale: string;
    languages: { locale: string; label: string }[];
  }[] = [];
  if (completed && orderId) {
    const paid = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            catalogItem: {
              include: { standardVersion: { include: { languageFiles: true } } },
            },
          },
        },
      },
    });
    for (const line of paid?.lines || []) {
      const version = line.catalogItem.standardVersion;
      const chosen = line.editionLocale || version.authoritativeLocale || "en";
      const codes = downloadLocaleOrder(
        publishedLocales(version.languageFiles, version.authoritativeLocale, version.sourcePdfUri),
        chosen,
      );
      downloads.push({
        catalogItemId: line.catalogItemId,
        title: line.catalogItem.coverTitle || version.editionLabel,
        preferredLocale: codes[0] || chosen,
        languages: codes.map((code) => ({ locale: code, label: languageName(code) })),
      });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        {error ? "Payment issue" : completed ? "Payment confirmed" : "Payment pending"}
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        {error
          ? error === "missing_tracking"
            ? "Pesapal did not return a tracking id. Return to the store and try again."
            : error
          : completed
            ? "Your payment was confirmed. Choose a language for each standard. A license mark is added in the margin of PDF pages; the standard text is unchanged."
            : `Pesapal status is ${status || "PENDING"}. Approve the prompt on your phone. This page picks up the payment as soon as Pesapal confirms it.`}
      </p>
      {!error && !completed && status !== "FAILED" && <PaymentWait wait={wait} />}
      {orderId && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Order <span className="font-mono text-[var(--ink)]">{orderId}</span>
        </p>
      )}
      {completed && downloads.length > 0 ? (
        <ClearPurchasedCart catalogItemIds={downloads.map((item) => item.catalogItemId).join(",")} />
      ) : null}
      {orderId && downloads.length > 0 ? (
        <div className="mt-6 space-y-6">
          {downloads.map((item) => (
            <form key={item.catalogItemId} method="get" action={`/${locale}/api/store/download`} className="space-y-3">
              <input type="hidden" name="order" value={orderId} />
              <input type="hidden" name="item" value={item.catalogItemId} />
              <p className="font-medium">{item.title}</p>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">{t(locale, "Language")}</span>
                <select
                  name="lang"
                  defaultValue={item.preferredLocale}
                  className="h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base"
                >
                  {item.languages.map((language) => (
                    <option key={language.locale} value={language.locale}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white"
              >
                Download standard
              </button>
            </form>
          ))}
          <p className="text-sm text-[var(--muted)]">
            {isMailConfigured()
              ? "The same download links were sent to the email address on this order."
              : "Mail is not configured on this server, so the download stays here until email can be sent."}
          </p>
        </div>
      ) : artifactUri ? (
        <div className="mt-6 space-y-3">
          <a
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white"
            href={orderId ? `/${locale}/api/store/download?order=${encodeURIComponent(orderId)}` : artifactUri}
          >
            Download standard
          </a>
          <p className="text-sm text-[var(--muted)]">
            {isMailConfigured()
              ? "The same download link was sent to the email address on this order."
              : "Mail is not configured on this server, so the download link stays here until email can be sent."}
          </p>
        </div>
      ) : null}
      <p className="mt-8">
        <Link href={`/${locale}/store`} className="text-sm text-[var(--accent)] underline">
          Back to store
        </Link>
      </p>
    </div>
  );
}
