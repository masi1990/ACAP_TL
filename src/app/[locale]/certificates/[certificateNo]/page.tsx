import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateToolbar } from "@/components/certificate-actions";
import { prisma } from "@/lib/db";
import { annexTitle, INTERNAL_CERTIFICATE_KIND } from "@/lib/dossier";
import { isLocale, type Locale } from "@/lib/i18n";

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
          testDossier: true,
          dossierAttachments: { orderBy: { uploadedAt: "asc" } },
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
  const measured = coc.application.assessmentItems.filter(
    (item) => item.kind === "table" || item.measuredValue.trim().length > 0,
  );
  const dossier = coc.application.testDossier;
  const scanned = coc.application.dossierAttachments.some((file) => file.kind === INTERNAL_CERTIFICATE_KIND);
  const filed = coc.application.dossierAttachments
    .filter((file) => file.kind !== INTERNAL_CERTIFICATE_KIND)
    .map((file) => (file.kind === "ANNEX" && file.annexCode ? annexTitle(file.annexCode) : file.title));
  const issued = formatDay(coc.issuedAt);
  const expires = formatDay(coc.expiresAt);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <CertificateToolbar
        fallbackHref={`/${locale}/registry`}
        fileHref={scanned ? `/api/certificates/${encodeURIComponent(coc.certificateNo)}/file` : null}
      />
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
            {dossier && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Testing</dt>
                <dd>
                  {dossier.laboratoryName}
                  {dossier.accreditationRef ? ` · ${dossier.accreditationRef}` : ""}
                </dd>
                <dd className="text-[#5c5348]">
                  Report {dossier.reportNo}
                  {dossier.sampleCode ? ` · Sample ${dossier.sampleCode}` : ""}
                  {dossier.batchOrLot ? ` · Batch ${dossier.batchOrLot}` : ""}
                </dd>
                <dd className="text-[#5c5348]">
                  {dossier.sampledAt ? `Sampled ${formatDay(dossier.sampledAt)}` : ""}
                  {dossier.sampledAt && dossier.testedAt ? " · " : ""}
                  {dossier.testedAt ? `Tested ${formatDay(dossier.testedAt)}` : ""}
                </dd>
                {dossier.sampleDescription ? <dd className="text-[#5c5348]">{dossier.sampleDescription}</dd> : null}
              </div>
            )}
            {pin && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[#5c5348]">Product identification number</dt>
                <dd className="font-mono">{pin}</dd>
              </div>
            )}
          </dl>

          {measured.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs uppercase tracking-wide text-[#5c5348]">Measured tests</h2>
              <table className="mt-2 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[#5c5348]">
                    <th className="py-1 pr-2 font-normal">Parameter</th>
                    <th className="py-1 pr-2 font-normal">Method</th>
                    <th className="py-1 pr-2 font-normal">Limit</th>
                    <th className="py-1 pr-2 font-normal">Measured</th>
                    <th className="py-1 font-normal">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {measured.map((item) => (
                    <tr key={item.id} className="border-t border-[#1f4d3a]/20 align-top">
                      <td className="py-1 pr-2">{item.heading || item.clause || "Requirement"}</td>
                      <td className="py-1 pr-2">{item.testMethod || "—"}</td>
                      <td className="py-1 pr-2">{item.kind === "table" ? item.text : "—"}</td>
                      <td className="py-1 pr-2">
                        {item.measuredValue || "—"}
                        {item.unit ? ` ${item.unit}` : ""}
                      </td>
                      <td className="py-1">{item.pass === true ? "Pass" : item.pass === false ? "Fail" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {filed.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs uppercase tracking-wide text-[#5c5348]">Documents on file</h2>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {filed.map((name, index) => (
                  <li key={`${name}-${index}`}>{name}</li>
                ))}
              </ul>
            </section>
          )}

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
