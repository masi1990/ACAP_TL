import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";

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
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;

  let artifactUri = sp.artifact?.trim() || null;
  let orderId = sp.orderId?.trim() || null;
  const status = (sp.status || "").toUpperCase();
  const error = sp.error?.trim() || null;

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
            ? "Your payment was confirmed. Download the standard in the same format that was uploaded. A license mark is added in the margin of PDF pages; the standard text is unchanged."
            : `Pesapal reported status “${status || "PENDING"}”. If you completed payment, refresh in a moment or check your email.`}
      </p>
      {orderId && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Order <span className="font-mono text-[var(--ink)]">{orderId}</span>
        </p>
      )}
      {artifactUri && (
        <div className="mt-6 space-y-3">
          <a
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white"
            href={orderId ? `/${locale}/api/store/download?order=${encodeURIComponent(orderId)}` : artifactUri}
            target="_blank"
            rel="noreferrer"
          >
            Download standard
          </a>
          <p className="text-sm text-[var(--muted)]">
            {isMailConfigured()
              ? "The same download link was sent to the email address on this order."
              : "Mail is not configured on this server, so the download link stays here until email can be sent."}
          </p>
        </div>
      )}
      <p className="mt-8">
        <Link href={`/${locale}/store`} className="text-sm text-[var(--accent)] underline">
          Back to store
        </Link>
      </p>
    </div>
  );
}
