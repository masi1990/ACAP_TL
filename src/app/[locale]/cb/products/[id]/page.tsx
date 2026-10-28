import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { productAssignedToBodies } from "@/lib/cb-scope";
import { can, certificationBodyIds, hasGlobalPermission } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { MarkCertificateTabs } from "@/components/cb/mark-certificate-tabs";

function dayInput(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function ProductAssessmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/cb/products/${id}`} />;
  if (!can(session.user, "certify:operate")) notFound();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      company: { include: { clientAccount: { include: { organization: true } } } },
      standardLinks: { include: { standardVersion: { include: { standard: true } } } },
      applications: {
        include: {
          organization: true,
          coc: true,
          standardVersion: { include: { standard: true } },
          assessmentItems: { include: { evidence: true }, orderBy: { sortOrder: "asc" } },
          testDossier: true,
          dossierAttachments: { orderBy: { uploadedAt: "asc" } },
        },
      },
    },
  });
  if (!product) notFound();

  const client = product.company.clientAccount.organization;
  const cbIds = certificationBodyIds(session.user);
  const applications = [...product.applications].sort(
    (a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"),
  );
  const application = applications[0];
  if (!hasGlobalPermission(session.user, "cb:write")) {
    const assigned = productAssignedToBodies(
      { certifyingCbId: product.certifyingCbId, applications },
      cbIds,
    );
    const unassignedClient =
      !product.certifyingCbId &&
      applications.length === 0 &&
      client.servicingCbId != null &&
      cbIds.includes(client.servicingCbId);
    if (!assigned && !unassignedClient) notFound();
  }
  if (!application) notFound();
  const blocked = applications.every(
    (row) => row.status === "PENDING_APPROVAL" || row.status === "REJECTED",
  );

  return (
    <main className="shell space-y-6 py-10">
      <div>
        <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/cb#products`}>
          Certification
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
        <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
          {applications.map((row) => {
            const standard = row.standardVersion?.standard;
            return (
              <li key={row.id}>
                <span className="font-medium text-[var(--ink)]">
                  {row.markScheme === "ECO" ? "Eco Mark" : "Quality Mark"}
                </span>
                {standard ? (
                  <>
                    {" · "}
                    <Link className="text-[var(--accent)] underline" href={`/${locale}/cb/standards/${standard.id}`}>
                      {standard.designation} — {standard.titleEn}
                    </Link>
                  </>
                ) : (
                  " · No standard linked"
                )}
                {row.coc ? ` · ${row.coc.certificateNo}` : ""}
              </li>
            );
          })}
        </ul>
      </div>
      {blocked ? (
        <p className="text-sm text-[var(--muted)]">
          {applications.every((row) => row.status === "REJECTED")
            ? "This product was rejected."
            : "Accept this product before certification can start."}
        </p>
      ) : (
        <MarkCertificateTabs
          locale={locale}
          tracks={applications
            .filter((row) => row.status !== "PENDING_APPROVAL" && row.status !== "REJECTED")
            .map((row) => ({
              id: row.id,
              markScheme: row.markScheme,
              standardLabel: row.standardVersion?.standard
                ? `${row.standardVersion.standard.designation} — ${row.standardVersion.standard.titleEn}`
                : "",
              certificateNo: row.coc?.certificateNo ?? null,
              items: row.assessmentItems.map((item) => ({
                id: item.id,
                source: item.source,
                kind: item.kind,
                section: item.section,
                clause: item.clause,
                heading: item.heading,
                text: item.text,
                testMethod: item.testMethod,
                countryIso2: item.countryIso2,
                pass: item.pass,
                measuredValue: item.measuredValue,
                unit: item.unit,
                notes: item.notes,
                evidence: item.evidence.map((file) => ({
                  id: file.id,
                  filename: file.filename,
                  storageUri: file.storageUri,
                })),
              })),
              dossier: row.testDossier
                ? {
                    laboratoryName: row.testDossier.laboratoryName,
                    accreditationRef: row.testDossier.accreditationRef,
                    reportNo: row.testDossier.reportNo,
                    sampleCode: row.testDossier.sampleCode,
                    batchOrLot: row.testDossier.batchOrLot,
                    sampleDescription: row.testDossier.sampleDescription,
                    sampledAt: dayInput(row.testDossier.sampledAt),
                    testedAt: dayInput(row.testDossier.testedAt),
                  }
                : null,
              attachments: row.dossierAttachments.map((file) => ({
                id: file.id,
                kind: file.kind,
                annexCode: file.annexCode,
                title: file.title,
                filename: file.filename,
              })),
            }))}
        />
      )}
    </main>
  );
}
