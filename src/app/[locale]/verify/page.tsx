import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { VerifyForm } from "./verify-form";

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ pin?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const pinCode = (sp.pin || "").trim();

  let data: {
    ok: boolean;
    error?: string;
    pin?: {
      pinCode: string;
      status: string;
      issuedAt?: string;
      expiresAt?: string;
      product?: string;
      company?: string;
      certificateNo?: string;
      markScheme?: string;
      ledger?: { payloadHash: string; blockRef: string | null };
    };
  } | null = null;

  if (pinCode) {
    const rl = await checkRateLimit(`verify-page:global`, 120, 60_000);
    if (!rl.allowed) {
      data = { ok: false, error: "Rate limit exceeded" };
    } else {
      const pin = await prisma.productPin.findUnique({
        where: { pinCode },
        include: {
          variant: { include: { product: { include: { company: true } } } },
          coc: { include: { ledgerAnchors: { orderBy: { anchoredAt: "desc" }, take: 1 } } },
        },
      });
      if (!pin) {
        data = { ok: false, error: "PIN not found" };
      } else {
        const ledger = pin.coc?.ledgerAnchors[0];
        data = {
          ok: true,
          pin: {
            pinCode: pin.pinCode,
            status: pin.status,
            issuedAt: pin.issuedAt?.toISOString(),
            expiresAt: pin.expiresAt?.toISOString(),
            product: pin.variant.product.name,
            company: pin.variant.product.company.legalName,
            certificateNo: pin.coc?.certificateNo,
            markScheme: pin.coc?.markScheme,
            ledger: ledger
              ? { payloadHash: ledger.payloadHash, blockRef: ledger.blockRef }
              : undefined,
          },
        };
      }
    }
  }

  const qrDataUrl =
    data?.ok && data.pin
      ? await QRCode.toDataURL(
          JSON.stringify({
            pin: data.pin.pinCode,
            verify: `http://127.0.0.1:43123/${locale}/verify?pin=${data.pin.pinCode}`,
          }),
          { margin: 1, width: 180 },
        )
      : null;

  const tone =
    data?.pin?.status === "certified"
      ? "ok"
      : data?.pin?.status === "suspended" || data?.pin?.status === "withdrawn"
        ? "bad"
        : "warn";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="rise font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        {t(locale, "verifyTitle")}
      </h1>
      <p className="rise-delay mt-2 text-[var(--muted)]">{t(locale, "verifyHint")}</p>

      <VerifyForm locale={locale} initialPin={pinCode} />

      <div className="mt-6">
        {!data && (
          <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-[var(--muted)]">
            Enter a PIN to see certification status.
          </p>
        )}
        {data && !data.ok && (
          <p className="rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-6 text-rose-900">
            {data.error || "PIN not found"}
          </p>
        )}
        {data?.ok && data.pin && (
          <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR for ${data.pin.pinCode}`}
                className="h-[180px] w-[180px] rounded-md border border-[var(--line)] bg-white p-2"
              />
            ) : null}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg">{data.pin.pinCode}</span>
                <Badge tone={tone}>{data.pin.status}</Badge>
              </div>
              <p className="text-sm">
                <span className="text-[var(--muted)]">Product:</span> {data.pin.product}
              </p>
              <p className="text-sm">
                <span className="text-[var(--muted)]">Company:</span> {data.pin.company}
              </p>
              <p className="text-sm">
                <span className="text-[var(--muted)]">CoC:</span> {data.pin.certificateNo} ·{" "}
                {data.pin.markScheme}
              </p>
              {data.pin.ledger && (
                <p className="font-mono text-xs text-[var(--muted)]">
                  Ledger stub: {data.pin.ledger.payloadHash.slice(0, 16)}… /{" "}
                  {data.pin.ledger.blockRef}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
