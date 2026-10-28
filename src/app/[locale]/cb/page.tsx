import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { certificationDeskClientWhere, certificationDeskProductWhere, visibleClientProducts } from "@/lib/cb-scope";
import { can, certificationBodyIds, hasGlobalPermission } from "@/lib/rbac";
import { canOpenCertification } from "@/lib/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { countryName, countryOptions } from "@/lib/countries";
import { originSummary, parseOriginClaim } from "@/lib/origin-claim";
import { productFormFields } from "@/lib/product-form";
import { dayInput } from "@/lib/cb-profile";
import { CrudForm, DeleteButton, type Field } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { MarkCertificateTabs } from "@/components/cb/mark-certificate-tabs";
import { StandardViewButton } from "@/components/cb/standard-view-button";
import { CertificateDownloadLink } from "@/components/certificate-actions";
import { DeskTabs } from "./desk-tabs";
import { latestActors } from "@/lib/line-actor";
import { ActorNote } from "@/components/actor-note";
import { ApprovalActions } from "@/components/cb/approval-actions";

function orderedByMark<T extends { markScheme: string }>(rows: T[]) {
  return [...rows].sort((a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"));
}

function markWord(mark: string) {
  return mark === "ECO" ? "Eco Mark" : "Quality Mark";
}

function clientFields(
  countries: { value: string; label: string }[],
  bodies: { value: string; label: string }[],
  isAdmin: boolean,
  ownCbId: string,
  defaults?: { name?: string; type?: string; countryIso2?: string; cbOrganizationId?: string },
): Field[] {
  return [
    { name: "name", label: "Manufacturer or importer", required: true, defaultValue: defaults?.name },
    ...(defaults
      ? []
      : [
          {
            name: "email",
            label: "Account email",
            required: true,
            help: "They set a password from the link before the first sign-in.",
          },
        ]),
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
  if (status === "PENDING_APPROVAL") return "Pending acceptance";
  if (status === "REJECTED") return "Rejected";
  if (status === "EVALUATION") return "In certification";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function companyStatusLabel(status: string) {
  if (status === "PENDING") return "Pending acceptance";
  if (status === "REJECTED") return "Rejected";
  if (status === "SUSPENDED") return "Suspended";
  return "Active";
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
  const canCertify = can(user, "certify:operate");
  const hub = hasGlobalPermission(user, "cb:write");
  const cbIds = certificationBodyIds(user);
  const bodyRows = hub ? undefined : cbIds;

  const [clients, bodies, products, versions, tariffs] = await Promise.all([
    prisma.organization.findMany({
      where: hub ? { type: { in: ["MANUFACTURER", "IMPORTER"] } } : certificationDeskClientWhere(cbIds),
      include: {
        servicingCb: true,
        clientAccounts: {
          include: {
            companies: {
              include: {
                products: {
                  include: {
                    certifyingCb: { select: { id: true, name: true } },
                    applications: { select: { organizationId: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findMany({
      where: { type: "CB", ...(bodyRows ? { id: { in: bodyRows } } : {}) },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: hub ? undefined : certificationDeskProductWhere(cbIds),
      include: {
        company: { include: { clientAccount: { include: { organization: true } } } },
        standardLinks: { include: { standardVersion: { include: { standard: true } } } },
        applications: {
          include: {
            coc: true,
            labResults: true,
            organization: true,
            standardVersion: { include: { standard: true } },
            assessmentItems: { include: { evidence: true }, orderBy: { sortOrder: "asc" } },
            testDossier: true,
            dossierAttachments: { orderBy: { uploadedAt: "asc" } },
          },
        },
        variants: { include: { pin: true } },
        clearances: { orderBy: { decidedAt: "desc" } },
        inspections: { orderBy: { inspectedAt: "desc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.standardVersion.findMany({
      where: { standard: { kind: "PRODUCT" } },
      include: { standard: true },
      orderBy: { standard: { designation: "asc" } },
    }),
    prisma.tariffLine.findMany({
      include: { rec: true },
      orderBy: { codeDisplay: "asc" },
      take: 500,
    }),
  ]);

  const linkedMarks = clients.length
    ? await prisma.importedCertifiedMark.findMany({
        where: { manufacturerOrgId: { in: clients.map((client) => client.id) } },
        select: { manufacturerOrgId: true, liveProductId: true },
      })
    : [];
  const importedProductsByOrg = new Map<string, Set<string>>();
  for (const mark of linkedMarks) {
    if (!mark.manufacturerOrgId) continue;
    const bucket = importedProductsByOrg.get(mark.manufacturerOrgId) ?? new Set<string>();
    bucket.add(mark.liveProductId);
    importedProductsByOrg.set(mark.manufacturerOrgId, bucket);
  }

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
  const servedClients = hub
    ? clients
    : clients.filter((client) => client.servicingCbId && cbIds.includes(client.servicingCbId));
  const activeTraderOptions = servedClients
    .filter((client) => client.status === "ACTIVE")
    .map((client) => ({
      value: client.id,
      label: `${client.name} · ${client.type === "IMPORTER" ? "Importer" : "Manufacturer"}`,
    }));
  const pickBody = hub || cbIds.length > 1;
  const soleCbId = cbIds.length === 1 ? cbIds[0] : "";
  const [clientActors, productActors] = await Promise.all([
    latestActors("Organization", clients.map((client) => client.id)),
    latestActors("Product", products.map((product) => product.id)),
  ]);
  const columns = 8 + (canWriteProducts ? 1 : 0);
  const markOptions = [
    { value: "QUALITY", label: "Quality Mark" },
    { value: "BOTH", label: "Quality Mark and Eco Mark Africa" },
  ];
  const certificateStatuses = [
    { value: "certified", label: "Certified" },
    { value: "expired", label: "Expired" },
    { value: "suspended", label: "Suspended" },
    { value: "withdrawn", label: "Withdrawn" },
  ];
  const fullyCertified = (product: (typeof products)[number]) =>
    product.applications.length > 0 && product.applications.every((application) => application.coc);
  const openProducts = products.filter((product) => !fullyCertified(product));
  const certifiedProducts = products.filter((product) => fullyCertified(product));

  return (
    <main className="shell space-y-10 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">One standard · one test · one certificate · one product</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{t(locale, "Certification")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          {hub
            ? "Showing clients and products for every certification body."
            : "Showing the clients and products of your certification body."}{" "}
          Register the manufacturer or importer, add the product and its rules of origin, then record the
          laboratory and requirements for the Quality Mark. Eco Mark Africa, when selected, uses its own
          standard and its own certificate. A product the manufacturer submits stays pending until you accept
          it. A product you add is accepted immediately.
        </p>
        <p className="mt-2 text-sm">
          <Link href={`/${locale}/cb/imported-marks`} className="underline">
            Products ARSO removed from the public registry
          </Link>
        </p>
      </div>

      <DeskTabs
        tabs={[
          {
            id: "clients",
            label: t(locale, "Clients"),
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
            searchable
            idPrefix="client-"
            action="/api/cb/clients"
            submitLabel="Add manufacturer or importer"
            fields={clientFields(countries, bodyOptions, pickBody, soleCbId)}
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
                <th className="px-4 py-2">Recorded by</th>
                {canWriteClients && <th className="px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-[var(--muted)]" colSpan={canWriteClients ? 7 : 6}>
                    No manufacturers or importers yet.
                  </td>
                </tr>
              )}
              {clients.map((client) => {
                const ownedProducts = client.clientAccounts.flatMap((account) =>
                  account.companies.flatMap((company) => company.products),
                );
                const visibleProducts = visibleClientProducts(ownedProducts, cbIds, client.servicingCbId, hub);
                const count = visibleProducts.length + (importedProductsByOrg.get(client.id)?.size ?? 0);
                const serves = hub || Boolean(client.servicingCbId && cbIds.includes(client.servicingCbId));
                const bodyNames = new Set<string>();
                if (serves && client.servicingCb) bodyNames.add(client.servicingCb.name);
                for (const product of visibleProducts) {
                  if (product.certifyingCb?.name) bodyNames.add(product.certifyingCb.name);
                }
                const country = client.clientAccounts.flatMap((account) => account.companies)[0]?.countryIso2;
                return (
                  <Fragment key={client.id}>
                    <tr className="border-b border-[var(--line)]">
                      <td className="px-4 py-3">
                        <Link className="font-medium text-[var(--accent)] underline" href={`/${locale}/cb/clients/${client.id}`}>
                          {client.name}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">{companyStatusLabel(client.status)}</div>
                      </td>
                      <td className="px-4 py-3">{client.type === "IMPORTER" ? "Importer" : "Manufacturer"}</td>
                      <td className="px-4 py-3">{country ? `${countryName(country)} (${country})` : "—"}</td>
                      <td className="px-4 py-3">{[...bodyNames].join(", ") || "—"}</td>
                      <td className="px-4 py-3">{count}</td>
                      <td className="px-4 py-3">
                        <ActorNote actor={clientActors.get(client.id)} />
                      </td>
                      {canWriteClients && (
                        <td className="px-4 py-3">
                          {serves && (
                            <div className="flex flex-wrap items-center gap-2">
                              {canCertify && client.status === "PENDING" && (
                                <ApprovalActions kind="client" id={client.id} />
                              )}
                              <DeleteButton action={`/api/cb/client/${client.id}`} />
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                    {canWriteClients && serves && (
                      <tr className="border-b border-[var(--line)]">
                        <td colSpan={7} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit manufacturer or importer</summary>
                            <div className="mt-3">
                              <CrudForm
            searchable
                                key={`${client.id}-${client.name}-${country ?? ""}-${client.type}`}
                                idPrefix={`client-${client.id}-`}
                                method="PATCH"
                                action={`/api/cb/client/${client.id}`}
                                submitLabel="Save manufacturer or importer"
                                fields={clientFields(countries, bodyOptions, pickBody, soleCbId, {
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
            label: t(locale, "Products"),
            content: (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Products and certification</h2>
        <p className="text-sm text-[var(--muted)]">
          Add the product under its manufacturer or importer, including the rules of origin. Quality Mark and
          Eco Mark Africa are separate: each has its own standard, assessment, and certificate.
        </p>
        {canWriteProducts && activeTraderOptions.length > 0 && versionOptions.length > 0 && (
          <CrudForm
            searchable
            idPrefix="product-"
            action="/api/chain/products"
            submitLabel="Add product"
            fields={productFormFields({
              traders: activeTraderOptions,
              versions: versionOptions,
              tariffs: tariffOptions,
              countries,
              marks: markOptions,
              ...(pickBody ? { bodies: bodyOptions } : {}),
              defaults: { certifyingCbId: soleCbId },
            })}
          />
        )}
        {canWriteProducts && clients.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Add a manufacturer or importer before registering a product.</p>
        )}
        {canWriteProducts && activeTraderOptions.length > 0 && versionOptions.length === 0 && (
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
                <th className="px-4 py-2">Recorded by</th>
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
                const applications = orderedByMark(product.applications);
                const links = orderedByMark(product.standardLinks);
                const application = applications.find((row) => row.status === "PENDING_APPROVAL") || applications[0];
                const qualityLink = links.find((row) => row.markScheme === "QUALITY");
                const ecoLink = links.find((row) => row.markScheme === "ECO");
                const pin = product.variants.map((variant) => variant.pin?.pinCode).find(Boolean);
                const certified = applications.length > 0 && applications.every((row) => row.coc);
                const pending = applications.some((row) => row.status === "PENDING_APPROVAL");
                const rejected = applications.length > 0 && applications.every((row) => row.status === "REJECTED");
                const owner = product.company.clientAccount.organization;
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
                        {links.length === 0 && "—"}
                        <ul className="space-y-1">
                          {links.map((row) => (
                            <li key={row.id}>
                              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{markWord(row.markScheme)}</span>
                              <div>
                                <StandardViewButton
                                  standardId={row.standardVersion.standard.id}
                                  label={row.standardVersion.standard.designation}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3">{originSummary(product.originClaimJson)}</td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1">
                          {applications.map((row) => (
                            <li key={row.id}>
                              {markWord(row.markScheme)} · {certificationLabel(row.status, Boolean(row.coc))}
                            </li>
                          ))}
                          {applications.length === 0 && "—"}
                        </ul>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1">
                          {applications.map((row) => (
                            <li key={row.id}>
                              {row.coc ? (
                                <CertificateDownloadLink href={`/${locale}/certificates/${row.coc.certificateNo}`}>
                                  {markWord(row.markScheme)} · {row.coc.certificateNo}
                                </CertificateDownloadLink>
                              ) : (
                                <span className="text-[var(--muted)]">{markWord(row.markScheme)} · not issued</span>
                              )}
                            </li>
                          ))}
                          {applications.length === 0 && "—"}
                        </ul>
                      </td>
                      <td className="px-4 py-3">
                        {product.clearances.length === 0 ? (
                          "—"
                        ) : (
                          <ul className="space-y-1">
                            {product.clearances.map((row) => (
                              <li key={row.id}>
                                {row.decision === "ALLOW"
                                  ? "Allow entry"
                                  : row.decision === "REFUSE"
                                    ? "Refuse entry"
                                    : row.decision === "HOLD"
                                      ? "Hold"
                                      : row.decision}
                                {` · ${row.originIso2} to ${row.destinationIso2}`}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {product.inspections.length === 0 ? (
                          "—"
                        ) : (
                          <ul className="space-y-1">
                            {product.inspections.map((row) => (
                              <li key={row.id}>
                                {row.result === "CONFORM"
                                  ? "Conform"
                                  : row.result === "NON_CONFORM"
                                    ? "Non-conform"
                                    : row.result}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ActorNote actor={productActors.get(product.id)} />
                      </td>
                      {canWriteProducts && (
                        <td className="px-4 py-3">
                          {pending && application && canCertify ? (
                            owner.status === "ACTIVE" ? (
                              <ApprovalActions kind="product" id={application.id} />
                            ) : (
                              <span className="text-xs text-[var(--muted)]">Accept the company first</span>
                            )
                          ) : certified ? (
                            "Certified"
                          ) : (
                            <DeleteButton action={`/api/chain/product/${product.id}`} />
                          )}
                        </td>
                      )}
                    </tr>
                    {canWriteProducts && !certified && !pending && !rejected && (
                      <tr className="border-b border-[var(--line)]/50">
                        <td colSpan={columns} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit product and rules of origin</summary>
                            <div className="mt-3">
                              <CrudForm
            searchable
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
                                  ...(pickBody ? { bodies: bodyOptions } : {}),
                                  defaults: {
                                    name: product.name,
                                    commodity: product.commodity,
                                    organizationId: owner.id,
                                    standardVersionId: qualityLink?.standardVersionId,
                                    ecoStandardVersionId: ecoLink?.standardVersionId,
                                    markCoverage: ecoLink ? "BOTH" : "QUALITY",
                                    tariffLineId: product.tariffLineId ?? "",
                                    certifyingCbId: product.certifyingCbId || owner.servicingCbId || "",
                                    origin: parseOriginClaim(product.originClaimJson),
                                  },
                                })}
                              />
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                    {!pending && !rejected && (
                    <tr className="border-b border-[var(--line)]">
                      <td colSpan={columns} className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-sm text-[var(--accent)]">
                            Certification process
                          </summary>
                          <div className="mt-3">
                            {applications.length === 0 ? (
                              <p className="text-sm text-[var(--muted)]">
                                Choose a certification body for {owner.name} before this product can be certified.
                              </p>
                            ) : (
                              <MarkCertificateTabs
                                locale={locale}
                                tracks={applications.map((row) => ({
                                  id: row.id,
                                  markScheme: row.markScheme,
                                  standardLabel: row.standardVersion?.standard?.designation || "",
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
            id: "certified",
            label: t(locale, "Certified products"),
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
                <th className="px-4 py-2">Recorded by</th>
                {canWriteProducts && <th className="px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {certifiedProducts.length === 0 && (
                <tr>
                  <td colSpan={canWriteProducts ? 7 : 6} className="px-4 py-8 text-center text-[var(--muted)]">
                    No certified products yet.
                  </td>
                </tr>
              )}
              {certifiedProducts.map((product) => {
                const applications = orderedByMark(product.applications);
                const links = orderedByMark(product.standardLinks);
                const qualityLink = links.find((row) => row.markScheme === "QUALITY");
                const ecoLink = links.find((row) => row.markScheme === "ECO");
                const qualityApp = applications.find((row) => row.markScheme === "QUALITY");
                const ecoApp = applications.find((row) => row.markScheme === "ECO");
                const owner = product.company.clientAccount.organization;
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
                        <ul className="space-y-1">
                          {links.map((row) => (
                            <li key={row.id}>
                              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{markWord(row.markScheme)}</span>
                              <div>
                                <StandardViewButton
                                  standardId={row.standardVersion.standard.id}
                                  label={row.standardVersion.standard.designation}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3">{links.map((row) => markWord(row.markScheme)).join(" · ") || "—"}</td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1">
                          {applications.map((row) => (
                            <li key={row.id}>
                              {row.coc ? (
                                <CertificateDownloadLink href={`/${locale}/certificates/${row.coc.certificateNo}`}>
                                  {markWord(row.markScheme)} · {row.coc.certificateNo}
                                </CertificateDownloadLink>
                              ) : (
                                "—"
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3">
                        {applications.map((row) => `${markWord(row.markScheme)} ${row.coc?.status ?? "certified"}`).join(" · ")}
                      </td>
                      <td className="px-4 py-3">
                        <ActorNote actor={productActors.get(product.id)} />
                      </td>
                      {canWriteProducts && (
                        <td className="px-4 py-3">
                          <DeleteButton action={`/api/chain/product/${product.id}`} />
                        </td>
                      )}
                    </tr>
                    {canWriteProducts && (
                      <tr className="border-b border-[var(--line)]">
                        <td colSpan={canWriteProducts ? 7 : 6} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit certified product</summary>
                            <div className="mt-3">
                              <CrudForm
            searchable
                                key={`${product.id}-certified-${qualityApp?.coc?.status ?? ""}-${ecoApp?.coc?.status ?? ""}`}
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
                                  bodies: bodyOptions,
                                  lockStandard: true,
                                  certificateStatuses,
                                  defaults: {
                                    name: product.name,
                                    commodity: product.commodity,
                                    organizationId: owner.id,
                                    standardVersionId: qualityLink?.standardVersionId,
                                    ecoStandardVersionId: ecoLink?.standardVersionId,
                                    markCoverage: ecoLink ? "BOTH" : "QUALITY",
                                    tariffLineId: product.tariffLineId ?? "",
                                    certifyingCbId: product.certifyingCbId || owner.servicingCbId || "",
                                    certificateStatus: qualityApp?.coc?.status || ecoApp?.coc?.status || "certified",
                                    ecoCertificateStatus: ecoApp?.coc?.status || "certified",
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
