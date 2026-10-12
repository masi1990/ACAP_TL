import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { AssessmentBoard, type BoardItem } from "@/components/cb/assessment-board";

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
        <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/cb/clients/${client.id}`}>
          {client.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {standard ? `${standard.designation} — ${standard.titleEn}` : "No standard linked"}
          {application.organization ? ` · ${application.organization.name}` : ""}
        </p>
      </div>
      <AssessmentBoard
        locale={locale}
        applicationId={application.id}
        items={items}
        certificateNo={application.coc?.certificateNo ?? null}
      />
    </main>
  );
}
