import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOpenCertification } from "@/lib/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { countryName, countryOptions } from "@/lib/countries";
import { originSummary, parseOriginClaim } from "@/lib/origin-claim";
import { productFormFields } from "@/lib/product-form";
import { dayInput } from "@/lib/cb-profile";
import { CrudForm, DeleteButton, type Field } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { AssessmentBoard, type BoardItem } from "@/components/cb/assessment-board";
import { CertificateDownloadLink } from "@/components/certificate-actions";
import { DeskTabs } from "./desk-tabs";

function clientFields(
  countries: { value: string; label: string }[],
  bodies: { value: string; label: string }[],
  isAdmin: boolean,
  ownCbId: string,
  defaults?: { name?: string; type?: string; countryIso2?: string; cbOrganizationId?: string },
): Field[] {
  return [
    { name: "name", label: "Manufacturer or importer", required: true, defaultValue: defaults?.name },
    {
      name: "type",
      label: "Kind",
      type: "select",
      required: true,
      defaultValue: defaults?.type || "MANUFACTURER",
      options: [
        { value: "MANUFACTURER", label: "Manufacturer" },
        { value: "IMPORTER", label: "Importer" },
      ],
    },
    {
      name: "countryIso2",
      label: "Country",
      type: "select",
      required: true,
      options: countries,
      defaultValue: defaults?.countryIso2,
      help: "Any country, so an importer outside a member state can be registered.",
    },
    ...(isAdmin
      ? [
          {
            name: "cbOrganizationId",
            label: "Certification body",
            type: "select" as const,
            required: true,
            options: bodies,
            defaultValue: defaults?.cbOrganizationId,
          },
        ]
      : [
          {
            name: "cbOrganizationId",
            label: "Certification body",
            defaultValue: ownCbId,
            hidden: true,
          },
        ]),
  ];
}

function certificationLabel(status: string | undefined, certified: boolean) {
  if (certified) return "Certified";
  if (!status) return "Not started";
  if (status === "EVALUATION") return "In certification";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function CertificationDeskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/cb`} />;

  const user = session.user;
  if (!canOpenCertification(user)) return <ClientRedirect href={`/${locale}/dashboard`} />;
  const canWriteClients = can(user, "clients:write");
  const canWriteProducts = can(user, "products:write");
  const isAdmin = can(user, "cb:write");
  const own = user.memberships.find((membership) => membership.organization.type === "CB")?.organization;
  const ownCbId = isAdmin ? undefined : own?.id;

  const [clients, bodies, products, versions, tariffs] = await Promise.all([
    prisma.organization.findMany({
      where: {
        type: { in: ["MANUFACTURER", "IMPORTER"] },
        ...(ownCbId ? { servicingCbId: ownCbId } : {}),
      },
      include: {
        servicingCb: true,
        clientAccounts: { include: { companies: { include: { products: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findMany({ where: { type: "CB" }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: ownCbId
        ? { company: { clientAccount: { organization: { servicingCbId: ownCbId } } } }
        : undefined,
      include: {
        company: { include: { clientAccount: { include: { organization: true } } } },
        standardLinks: { include: { standardVersion: { include: { standard: true } } } },
        applications: {
          include: {
            coc: true,
            labResults: true,
            organization: true,
            assessmentItems: { include: { evidence: true }, orderBy: { sortOrder: "asc" } },
            testDossier: true,
            dossierAttachments: { orderBy: { uploadedAt: "asc" } },
          },
        },
        variants: { include: { pin: true } },
        clearances: { orderBy: { decidedAt: "desc" }, take: 1 },
        inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.standardVersion.findMany({
      include: { standard: true },
      orderBy: { standard: { designation: "asc" } },
    }),
    prisma.tariffLine.findMany({
      include: { rec: true },
      orderBy: { codeDisplay: "asc" },
      take: 500,
    }),
  ]);

  const countries = countryOptions();
  const bodyOptions = bodies.map((body) => ({ value: body.id, label: body.name }));
  const versionOptions = versions.map((version) => ({
    value: version.id,
    label: `${version.standard.designation} — ${version.standard.titleEn}`,
  }));
  const tariffOptions = tariffs.map((line) => ({
    value: line.id,
    label: `${line.codeDisplay}${line.rec ? ` · ${line.rec.code}` : ""}`,
  }));
  const traderOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.name} · ${client.type === "IMPORTER" ? "Importer" : "Manufacturer"}`,
  }));
  const columns = 7 + (canWriteProducts ? 1 : 0);
  const markOptions = [
    { value: "QUALITY", label: "Quality Mark" },
    { value: "ECO", label: "Eco Mark Africa" },
  ];
  const certificateStatuses = [
    { value: "certified", label: "Certified" },
    { value: "expired", label: "Expired" },
    { value: "suspended", label: "Suspended" },
    { value: "withdrawn", label: "Withdrawn" },
  ];
  const openProducts = products.filter((product) => {
    const application = product.applications[0];
    return !application?.coc && !product.variants.some((variant) => variant.pin);
  });
  const certifiedProducts = products.filter((product) => !openProducts.includes(product));

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">One standard · one test · one certificate · one product</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Certification</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Register the manufacturer or importer, add the product and its rules of origin, then record the
          laboratory, each requirement, and the certificate. Customs, inspection, and market surveillance
          each have their own desk.
        </p>
      </div>

      <DeskTabs
        tabs={[
          {
            id: "clients",
            label: "Clients",
            content: (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Manufacturers and importers</h2>
        {bodies.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Create a certification body under{" "}
            <Link className="text-[var(--accent)] underline" href={`/${locale}/admin/institutions`}>
              institutions
            </Link>{" "}
            before a client can be added.
          </p>
        )}
        {canWriteClients && bodies.length > 0 && (
          <CrudForm
            idPrefix="client-"
            action="/api/cb/clients"
            submitLabel="Add manufacturer or importer"
            fields={clientFields(countries, bodyOptions, isAdmin, own?.id || "")}
          />
        )}
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2">Certification body</th>
                <th className="px-4 py-2">Products</th>
                {canWriteClients && <th className="px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-[var(--muted)]" colSpan={canWriteClients ? 6 : 5}>
                    No manufacturers or importers yet.
                  </td>
                </tr>
              )}
              {clients.map((client) => {
                const count = client.clientAccounts.reduce(
                  (total, account) => total + account.companies.reduce((inner, company) => inner + company.products.length, 0),
                  0,
                );
                const country = client.clientAccounts.flatMap((account) => account.companies)[0]?.countryIso2;
                return (
                  <Fragment key={client.id}>
                    <tr className="border-b border-[var(--line)]">
                      <td className="px-4 py-3">
                        <Link className="font-medium text-[var(--accent)] underline" href={`/${locale}/cb/clients/${client.id}`}>
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{client.type === "IMPORTER" ? "Importer" : "Manufacturer"}</td>
                      <td className="px-4 py-3">{country ? `${countryName(country)} (${country})` : "—"}</td>
                      <td className="px-4 py-3">{client.servicingCb?.name ?? "—"}</td>
                      <td className="px-4 py-3">{count}</td>
                      {canWriteClients && (
                        <td className="px-4 py-3">
                          <DeleteButton action={`/api/cb/client/${client.id}`} />
                        </td>
                      )}
                    </tr>
                    {canWriteClients && (
                      <tr className="border-b border-[var(--line)]">
                        <td colSpan={6} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit manufacturer or importer</summary>
                            <div className="mt-3">
                              <CrudForm
                                key={`${client.id}-${client.name}-${country ?? ""}-${client.type}`}
                                idPrefix={`client-${client.id}-`}
                                method="PATCH"
                                action={`/api/cb/client/${client.id}`}
                                submitLabel="Save manufacturer or importer"
                                fields={clientFields(countries, bodyOptions, isAdmin, own?.id || "", {
                                  name: client.name,
                                  type: client.type,
                                  countryIso2: country,
                                  cbOrganizationId: client.servicingCbId || "",
                                })}
                              />
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
            ),
          },
          {
            id: "products",
            label: "Products",
            content: (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Products and certification</h2>
        <p className="text-sm text-[var(--muted)]">
          Add the product under its manufacturer or importer, including the rules of origin. The
          certification process opens on that product: laboratory, sample, every requirement, then one
          certificate.
        </p>
        {canWriteProducts && traderOptions.length > 0 && versionOptions.length > 0 && (
          <CrudForm
            idPrefix="product-"
            action="/api/chain/products"
            submitLabel="Add product"
            fields={productFormFields({
              traders: traderOptions,
              versions: versionOptions,
              tariffs: tariffOptions,
              countries,
              marks: markOptions,
            })}
          />
        )}
        {canWriteProducts && traderOptions.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Add a manufacturer or importer before registering a product.</p>
        )}
        {canWriteProducts && traderOptions.length > 0 && versionOptions.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Import a standard before a product can be certified against it.</p>
        )}
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Standard</th>
                <th className="px-4 py-2">Origin</th>
                <th className="px-4 py-2">Certification</th>
                <th className="px-4 py-2">Certificate</th>
                <th className="px-4 py-2">Border</th>
                <th className="px-4 py-2">Inspection</th>
                {canWriteProducts && <th className="px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {openProducts.length === 0 && (
                <tr>
                  <td colSpan={columns} className="px-4 py-8 text-center text-[var(--muted)]">
                    No products waiting for certification.
                  </td>
                </tr>
              )}
              {openProducts.map((product) => {
                const link = product.standardLinks[0];
                const application = product.applications[0];
                const test = application?.labResults[0];
                const pin = product.variants.map((variant) => variant.pin?.pinCode).find(Boolean);
                const certified = Boolean(application?.coc || pin);
                const owner = product.company.clientAccount.organization;
                const items: BoardItem[] = (application?.assessmentItems || []).map((item) => ({
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
                  <Fragment key={product.id}>
                    <tr className="border-b border-[var(--line)]/50">
                      <td className="px-4 py-3">
                        <Link className="font-medium text-[var(--accent)] underline" href={`/${locale}/cb/products/${product.id}`}>
                          {product.name}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">
                          {owner.name}
                          {owner.type === "IMPORTER" ? " · Importer" : " · Manufacturer"}
                          {pin ? ` · PIN ${pin}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {link ? (
                          <Link
                            className="text-[var(--accent)] underline"
                            href={`/${locale}/cb/standards/${link.standardVersion.standard.id}`}
                          >
                            {link.standardVersion.standard.designation}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{originSummary(product.originClaimJson)}</td>
                      <td className="px-4 py-3">
                        <div>{certificationLabel(application?.status, certified)}</div>
                        {test ? <Badge tone={test.pass ? "ok" : "warn"}>{test.pass ? "Pass" : "Fail"}</Badge> : null}
                      </td>
                      <td className="px-4 py-3">
                        {application?.coc ? (
                          <CertificateDownloadLink href={`/${locale}/certificates/${application.coc.certificateNo}`}>
                            {application.coc.certificateNo}
                          </CertificateDownloadLink>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{product.clearances[0]?.decision ?? "—"}</td>
                      <td className="px-4 py-3">{product.inspections[0]?.result ?? "—"}</td>
                      {canWriteProducts && (
                        <td className="px-4 py-3">
                          {certified ? "Certified" : <DeleteButton action={`/api/chain/product/${product.id}`} />}
                        </td>
                      )}
                    </tr>
                    {canWriteProducts && !certified && (
                      <tr className="border-b border-[var(--line)]/50">
                        <td colSpan={columns} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit product and rules of origin</summary>
                            <div className="mt-3">
                              <CrudForm
                                key={`${product.id}-${product.originClaimJson ?? ""}`}
                                idPrefix={`product-${product.id}-`}
                                method="PATCH"
                                action={`/api/chain/product/${product.id}`}
                                submitLabel="Save product"
                                fields={productFormFields({
                                  traders: traderOptions,
                                  versions: versionOptions,
                                  tariffs: tariffOptions,
                                  countries,
                                  marks: markOptions,
                                  defaults: {
                                    name: product.name,
                                    commodity: product.commodity,
                                    organizationId: owner.id,
                                    standardVersionId: link?.standardVersionId,
                                    tariffLineId: product.tariffLineId ?? "",
                                    origin: parseOriginClaim(product.originClaimJson),
                                  },
                                })}
                              />
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-[var(--line)]">
                      <td colSpan={columns} className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-sm text-[var(--accent)]">
                            Certification process
                          </summary>
                          <div className="mt-3">
                            {application ? (
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
                            ) : (
                              <p className="text-sm text-[var(--muted)]">
                                Choose a certification body for {owner.name} before this product can be certified.
                              </p>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
            ),
          },
          {
            id: "certified",
            label: "Certified products",
            content: (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Certified products</h2>
        <p className="text-sm text-[var(--muted)]">
          Update the product, its mark, or the certificate status, or remove the certificate and the product.
          The standard stays the one the certificate was issued against. Open every page of that standard from
          the designation.
        </p>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Standard</th>
                <th className="px-4 py-2">Mark</th>
                <th className="px-4 py-2">Certificate</th>
                <th className="px-4 py-2">Status</th>
                {canWriteProducts && <th className="px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {certifiedProducts.length === 0 && (
                <tr>
                  <td colSpan={canWriteProducts ? 6 : 5} className="px-4 py-8 text-center text-[var(--muted)]">
                    No certified products yet.
                  </td>
                </tr>
              )}
              {certifiedProducts.map((product) => {
                const link = product.standardLinks[0];
                const application = product.applications[0];
                const owner = product.company.clientAccount.organization;
                const standard = link?.standardVersion.standard;
                return (
                  <Fragment key={product.id}>
                    <tr className="border-b border-[var(--line)]/50">
                      <td className="px-4 py-3">
                        <Link className="font-medium text-[var(--accent)] underline" href={`/${locale}/cb/products/${product.id}`}>
                          {product.name}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">
                          {owner.name}
                          {owner.type === "IMPORTER" ? " · Importer" : " · Manufacturer"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {standard ? (
                          <Link className="text-[var(--accent)] underline" href={`/${locale}/cb/standards/${standard.id}`}>
                            {standard.designation}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{application?.coc?.markScheme ?? application?.markScheme ?? "—"}</td>
                      <td className="px-4 py-3">
                        {application?.coc ? (
                          <CertificateDownloadLink href={`/${locale}/certificates/${application.coc.certificateNo}`}>
                            {application.coc.certificateNo}
                          </CertificateDownloadLink>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{application?.coc?.status ?? "certified"}</td>
                      {canWriteProducts && (
                        <td className="px-4 py-3">
                          <DeleteButton action={`/api/chain/product/${product.id}`} />
                        </td>
                      )}
                    </tr>
                    {canWriteProducts && (
                      <tr className="border-b border-[var(--line)]">
                        <td colSpan={6} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit certified product</summary>
                            <div className="mt-3">
                              <CrudForm
                                key={`${product.id}-certified-${application?.coc?.status ?? ""}-${application?.markScheme ?? ""}`}
                                idPrefix={`certified-${product.id}-`}
                                method="PATCH"
                                action={`/api/chain/product/${product.id}`}
                                submitLabel="Save certified product"
                                fields={productFormFields({
                                  traders: traderOptions,
                                  versions: versionOptions,
                                  tariffs: tariffOptions,
                                  countries,
                                  marks: markOptions,
                                  lockStandard: true,
                                  certificateStatuses,
                                  defaults: {
                                    name: product.name,
                                    commodity: product.commodity,
                                    organizationId: owner.id,
                                    standardVersionId: link?.standardVersionId,
                                    tariffLineId: product.tariffLineId ?? "",
                                    markScheme: application?.coc?.markScheme || application?.markScheme || "QUALITY",
                                    certificateStatus: application?.coc?.status || "certified",
                                    origin: parseOriginClaim(product.originClaimJson),
                                  },
                                })}
                              />
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
            ),
          },
        ]}
      />
    </main>
  );
}
