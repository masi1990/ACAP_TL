import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string; certificateNo: string }>;
}) {
  const { locale: raw, certificateNo } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const coc = await prisma.coC.findUnique({
    where: { certificateNo },
    include: {
      pins: true,
      application: {
        include: {
          organization: true,
          standardVersion: { include: { standard: true } },
          assessmentItems: { orderBy: { sortOrder: "asc" } },
          product: {
            include: {
              company: { include: { clientAccount: { include: { organization: true } } } },
            },
          },
        },
      },
    },
  });
  if (!coc) notFound();

  const product = coc.application.product;
  const client = product.company.clientAccount.organization;
  const standard = coc.application.standardVersion.standard;
  const cb = coc.application.organization;
  const pin = coc.pins[0]?.pinCode;
  const national = coc.application.assessmentItems.filter((item) => item.source === "NATIONAL");
  const other = coc.application.assessmentItems.filter((item) => item.source === "OTHER");
  const issued = coc.issuedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const expires = coc.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <article className="bg-[#f7f1e4] px-8 py-10 text-[#1c1915] shadow-sm print:shadow-none sm:px-12">
        <div className="border-[6px] border-double border-[#1f4d3a] px-6 py-8 sm:px-10">
          <p className="text-center text-xs uppercase tracking-[0.28em] text-[#1f4d3a]">
            African Organisation for Standardisation
          </p>
          <h1 className="mt-3 text-center font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Certificate of Conformity
          </h1>
          <p className="mt-2 text-center text-sm text-[#5c5348]">ARSO Conformity Assessment Programme</p>

          <dl className="mt-8 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Certificate number</dt>
              <dd className="font-medium">{coc.certificateNo}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Status</dt>
              <dd className="font-medium capitalize">{coc.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Issued</dt>
              <dd>{issued}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Valid until</dt>
              <dd>{expires}</dd>
            </div>
          </dl>

          <p className="mt-8 text-sm leading-relaxed">
            {cb.name} certifies that the product named below, placed on the market by {client.name}, conforms to{" "}
            {standard.designation}
            {standard.titleEn ? ` — ${standard.titleEn}` : ""}.
          </p>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Product</dt>
              <dd className="font-medium">{product.name}</dd>
              <dd className="text-[#5c5348]">{product.commodity}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">
                {client.type === "IMPORTER" ? "Importer" : "Manufacturer"}
              </dt>
              <dd>
                {client.name}
                {product.company.countryIso2 ? ` · ${product.company.countryIso2}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Standard</dt>
              <dd>
                {standard.designation}
                {standard.titleEn ? ` — ${standard.titleEn}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Certification body</dt>
              <dd>{cb.name}</dd>
            </div>
            {pin && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Product identification number</dt>
                <dd className="font-mono">{pin}</dd>
              </div>
            )}
          </dl>

          {national.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs uppercase tracking-wide text-[#5c5348]">National regulations</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {national.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{item.heading}</span>
                    {item.countryIso2 ? ` (${item.countryIso2})` : ""}
                    <span className="block text-[#5c5348]">{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {other.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs uppercase tracking-wide text-[#5c5348]">Other requirements</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {other.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{item.heading}</span>
                    <span className="block text-[#5c5348]">{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-10 text-center text-xs text-[#5c5348]">
            Verify this certificate with the product identification number.
          </p>
          {pin && (
            <p className="mt-2 text-center text-sm">
              <Link className="underline" href={`/${locale}/verify?pin=${encodeURIComponent(pin)}`}>
                Open verification
              </Link>
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
