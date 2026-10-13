import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { AssessmentBoard, type BoardItem } from "@/components/cb/assessment-board";

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
  if (!can(session.user, "certify:operate") && !can(session.user, "products:read")) notFound();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      company: { include: { clientAccount: { include: { organization: true } } } },
      standardLinks: { include: { standardVersion: { include: { standard: true } } } },
      applications: {
        include: {
          organization: true,
          coc: true,
          assessmentItems: { include: { evidence: true }, orderBy: { sortOrder: "asc" } },
          testDossier: true,
          dossierAttachments: { orderBy: { uploadedAt: "asc" } },
        },
      },
    },
  });
  if (!product) notFound();

  const client = product.company.clientAccount.organization;
  const own = session.user.memberships.find((m) => m.organization.type === "CB")?.organization.id;
  const application = product.applications[0];
  if (!can(session.user, "cb:write")) {
    if (!application || application.organizationId !== own) notFound();
    if (client.servicingCbId && client.servicingCbId !== own) notFound();
  }
  if (!application) notFound();

  const standard = product.standardLinks[0]?.standardVersion.standard;
  const items: BoardItem[] = application.assessmentItems.map((item) => ({
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
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/cb#products`}>
          Certification
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {standard ? (
            <Link className="text-[var(--accent)] underline" href={`/${locale}/cb/standards/${standard.id}`}>
              {standard.designation} — {standard.titleEn}
            </Link>
          ) : (
            "No standard linked"
          )}
          {application.organization ? ` · ${application.organization.name}` : ""}
        </p>
      </div>
      <AssessmentBoard
        locale={locale}
        applicationId={application.id}
        items={items}
        dossier={
          application.testDossier
            ? {
                laboratoryName: application.testDossier.laboratoryName,
                accreditationRef: application.testDossier.accreditationRef,
                reportNo: application.testDossier.reportNo,
                sampleCode: application.testDossier.sampleCode,
                batchOrLot: application.testDossier.batchOrLot,
                sampleDescription: application.testDossier.sampleDescription,
                sampledAt: dayInput(application.testDossier.sampledAt),
                testedAt: dayInput(application.testDossier.testedAt),
              }
            : null
        }
        attachments={application.dossierAttachments.map((file) => ({
          id: file.id,
          kind: file.kind,
          annexCode: file.annexCode,
          title: file.title,
          filename: file.filename,
        }))}
        certificateNo={application.coc?.certificateNo ?? null}
      />
    </main>
  );
}
