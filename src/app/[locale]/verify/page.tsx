import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { VerifyForm } from "./verify-form";
import { describeImportedPin, markSchemeLabel, normalizePinInput, registryStatus } from "@/lib/imported-marks";

function publicAppBase() {
  return (process.env.APP_BASE_URL?.trim() || "http://127.0.0.1:43123").replace(/\/$/, "");
}

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
  const pinCode = normalizePinInput(sp.pin || "");

  let data: {
    ok: boolean;
    error?: string;
    pin?: {
      pinCode: string;
      status: string;
      underReview?: boolean;
      issuedAt?: string;
      expiresAt?: string;
      product?: string;
      brand?: string;
      company?: string;
      certificateNo?: string;
      markScheme?: string;
      certificates?: Array<{
        certificateNo: string;
        markScheme: string;
        status: string;
        standard: string;
      }>;
      ledger?: { payloadHash: string; blockRef: string | null };
    };
  } | null = null;

  if (pinCode) {
    const rl = await checkRateLimit(`verify-page:global`, 120, 60_000);
    if (!rl.allowed) {
      data = { ok: false, error: "Rate limit exceeded" };
    } else {
      const imported = await describeImportedPin(pinCode);
      if (imported) {
        const { mark, removed } = imported;
        data = {
          ok: true,
          pin: {
            pinCode: mark.pinText,
            status: removed ? "under_review" : registryStatus(mark.markStatus),
            underReview: removed,
            issuedAt: mark.issuedAt?.toISOString(),
            expiresAt: mark.expiresAt?.toISOString(),
            product: mark.productName,
            brand: mark.brand.trim() || undefined,
            company: mark.companyName,
            certificateNo: mark.certificationId,
            markScheme: markSchemeLabel(mark.markType),
            certificates: removed
              ? []
              : [
                  {
                    certificateNo: mark.certificationId,
                    markScheme: markSchemeLabel(mark.markType),
                    status: registryStatus(mark.markStatus),
                    standard: mark.standardVersion?.standard.designation || mark.sourceStandardText || "Standard not linked yet",
                  },
                ],
          },
        };
      } else {
      const pin = await prisma.productPin.findUnique({
        where: { pinCode },
        include: {
          variant: {
            include: {
              product: {
                include: {
                  company: true,
                  applications: {
                    include: {
                      coc: true,
                      standardVersion: { include: { standard: true } },
                    },
                  },
                },
              },
            },
          },
          coc: { include: { ledgerAnchors: { orderBy: { anchoredAt: "desc" }, take: 1 } } },
        },
      });
      if (!pin) {
        data = { ok: false, error: "PIN not found" };
      } else {
        const ledger = pin.coc?.ledgerAnchors[0];
        const certificates = pin.variant.product.applications
          .filter((row) => row.coc)
          .sort((a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"))
          .map((row) => ({
            certificateNo: row.coc!.certificateNo,
            markScheme: row.markScheme,
            status: row.coc!.status,
            standard: row.standardVersion.standard.designation,
          }));
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
            certificates,
            ledger: ledger
              ? { payloadHash: ledger.payloadHash, blockRef: ledger.blockRef }
              : undefined,
          },
        };
      }
      }
    }
  }

  const qrDataUrl =
    data?.ok && data.pin && !data.pin.underReview
      ? await QRCode.toDataURL(
          `${publicAppBase()}/${locale}/verify?pin=${encodeURIComponent(data.pin.pinCode)}`,
          { margin: 1, width: 180 },
        )
      : null;

  const tone =
    data?.pin?.underReview
      ? "warn"
      : data?.pin?.status === "certified"
      ? "ok"
      : data?.pin?.status === "suspended" || data?.pin?.status === "withdrawn"
        ? "bad"
        : "warn";

  return (
    <div className="shell py-10">
      <h1 className="rise font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        {t(locale, "verifyTitle")}
      </h1>
      <p className="rise-delay mt-2 text-[var(--muted)]">{t(locale, "verifyHint")}</p>
      <VerifyForm locale={locale} initialPin={pinCode} />

      <div className="mt-6 max-w-[32rem]">
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
        {data?.ok && data.pin?.underReview && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-6 text-amber-950">
            <p className="font-mono text-lg">{data.pin.pinCode}</p>
            <p className="mt-2">This product is currently under review.</p>
          </div>
        )}
        {data?.ok && data.pin && !data.pin.underReview && (
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
              {data.pin.brand ? (
                <p className="text-sm">
                  <span className="text-[var(--muted)]">Brand:</span> {data.pin.brand}
                </p>
              ) : null}
              <p className="text-sm">
                <span className="text-[var(--muted)]">Company:</span> {data.pin.company}
              </p>
              {(data.pin.certificates?.length ? data.pin.certificates : []).map((certificate) => (
                <p key={certificate.certificateNo} className="text-sm">
                  <span className="text-[var(--muted)]">
                    {certificate.markScheme === "ECO" ? "Eco certificate:" : "Quality certificate:"}
                  </span>{" "}
                  {certificate.certificateNo} · {certificate.standard} · {certificate.status}
                </p>
              ))}
              {!data.pin.certificates?.length && (
                <p className="text-sm">
                  <span className="text-[var(--muted)]">CoC:</span> {data.pin.certificateNo} · {data.pin.markScheme}
                </p>
              )}
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
