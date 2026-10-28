import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { AUTHORITY_LABELS, AUTHORITY_TYPES, can, isTradeOrgType } from "@/lib/rbac";
import { countryOptions } from "@/lib/countries";
import { parseOriginClaim } from "@/lib/origin-claim";
import { PRODUCT_COVERAGE } from "@/lib/cb-profile";
import { productFormFields } from "@/lib/product-form";
import { listHref, listPage } from "@/lib/list-page";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { LinePager } from "@/components/line-pager";
import { groupImportedMarks, portalStatusByPin } from "@/lib/imported-marks";
import { DeskTabs } from "../cb/desk-tabs";
import { TradeInvite } from "./trade-invite";

function certificationLabel(status: string | undefined, certified: boolean) {
  if (certified) return "Certified";
  if (!status) return "Not started";
  if (status === "PENDING_APPROVAL") return "Pending acceptance";
  if (status === "REJECTED") return "Rejected";
  if (status === "EVALUATION") return "In certification";
  return status;
}

function companyStatus(status: string) {
  if (status === "PENDING") return "Pending acceptance by the certification body";
  if (status === "REJECTED") return "Rejected by the certification body";
  if (status === "SUSPENDED") return "Suspended";
  return "Active";
}

const EDITABLE = new Set(["PENDING_APPROVAL", "REJECTED", "DRAFT"]);

export default async function TradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ clientsPage?: string; productsPage?: string }>;
}) {
  const { locale: raw } = await params;
  const query = await searchParams;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/trade`} />;

  const orgs = session.user.memberships.filter((membership) => isTradeOrgType(membership.organization.type));
  if (!orgs.length) return <ClientRedirect href={`/${locale}/dashboard`} />;
  const orgIds = orgs.map((membership) => membership.organization.id);
  const orgAdmin = orgs.some((membership) => membership.role === "PRIMARY_ADMIN" || membership.role === "ORG_ADMIN");
  const canAddProducts = can(session.user, "products:write");
  const roleByOrg = new Map(orgs.map((membership) => [membership.organization.id, membership.role]));

  const [products, versions, tariffs, bodies, states, pendingRequest, orgRows, importedMarks] = await Promise.all([
    prisma.product.findMany({
      where: { company: { clientAccount: { organizationId: { in: orgIds } } } },
      include: {
        certifyingCb: true,
        company: { include: { clientAccount: { include: { organization: true } } } },
        standardLinks: { include: { standardVersion: { include: { standard: true } } } },
        applications: {
          orderBy: { createdAt: "desc" },
          include: { coc: true, organization: true, assessmentItems: true },
        },
        inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
        clearances: { orderBy: { decidedAt: "desc" }, take: 3 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.standardVersion.findMany({
      where: { standard: { kind: "PRODUCT" } },
      include: { standard: true },
      orderBy: { standard: { designation: "asc" } },
    }),
    prisma.tariffLine.findMany({ include: { rec: true }, orderBy: { codeDisplay: "asc" }, take: 500 }),
    prisma.organization.findMany({
      where: { type: "CB", status: { not: "SUSPENDED" } },
      orderBy: { name: "asc" },
    }),
    prisma.memberState.findMany({ orderBy: { name: "asc" } }),
    prisma.institutionRequest.findFirst({
      where: { userId: session.userId, status: "PENDING" },
    }),
    prisma.organization.findMany({
      where: { id: { in: orgIds } },
      include: { servicingCb: true, clientAccounts: { include: { companies: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.importedCertifiedMark.findMany({
      where: { manufacturerOrgId: { in: orgIds } },
      include: {
        standardVersion: { include: { standard: true } },
        manufacturerOrg: true,
        certificationBodyOrg: true,
      },
      orderBy: [{ productName: "asc" }, { markType: "asc" }],
    }),
  ]);
  const importedPortals = await portalStatusByPin(importedMarks.map((mark) => mark.pinText));
  const importedGroups = groupImportedMarks(importedMarks);

  const statusByOrg = new Map(orgRows.map((row) => [row.id, row.status]));
  const openOrgs = orgs.filter((membership) => statusByOrg.get(membership.organization.id) !== "REJECTED");
  const countries = countryOptions();
  const versionOptions = versions.map((version) => ({
    value: version.id,
    label: `${version.standard.designation} — ${version.standard.titleEn}`,
  }));
  const tariffOptions = tariffs.map((line) => ({
    value: line.id,
    label: `${line.codeDisplay}${line.rec ? ` · ${line.rec.code}` : ""}`,
  }));
  const bodyOptions = bodies.map((body) => ({ value: body.id, label: body.name }));
  const companyOptions = openOrgs.map((membership) => ({
    value: membership.organization.id,
    label: membership.organization.name,
  }));

  function owns(organizationId: string) {
    const role = roleByOrg.get(organizationId);
    return role === "PRIMARY_ADMIN" || role === "ORG_ADMIN";
  }

  function lockedCompany(organizationId: string) {
    return products.some(
      (product) =>
        product.company.clientAccount.organizationId === organizationId &&
        product.applications.some(
          (application) => application.coc || !EDITABLE.has(application.status),
        ),
    );
  }

  function editableProduct(product: (typeof products)[number]) {
    if (product.applications.some((application) => application.coc)) return false;
    if (product.applications.length === 0) return true;
    return product.applications.every((application) => EDITABLE.has(application.status));
  }

  const certified = products.filter((product) => product.applications.some((application) => application.coc));

  function clientDeletable(organizationId: string, status: string) {
    if (!owns(organizationId)) return false;
    if (orgs.length < 2) return false;
    if (status === "ACTIVE" || status === "SUSPENDED") return false;
    return !lockedCompany(organizationId);
  }

  function addClientForm(prefix: string) {
    if (!orgAdmin || bodies.length === 0) return null;
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Add a client</h2>
        <CrudForm
          searchable
          idPrefix={prefix}
          action="/api/trade/companies"
          submitLabel="Submit client"
          fields={[
            { name: "name", label: "Client", required: true },
            {
              name: "type",
              label: "Kind",
              type: "select",
              required: true,
              defaultValue: "MANUFACTURER",
              options: [
                { value: "MANUFACTURER", label: "Manufacturer" },
                { value: "IMPORTER", label: "Importer" },
              ],
            },
            { name: "countryIso2", label: "Country", type: "select", required: true, options: countries },
            {
              name: "cbOrganizationId",
              label: "Certification body",
              type: "select",
              required: true,
              options: bodyOptions,
            },
          ]}
        />
      </section>
    );
  }

  const clientListing = listPage(query.clientsPage, orgRows.length);
  const clientPageRows = orgRows.slice(clientListing.skip, clientListing.skip + clientListing.take);
  const productListing = listPage(query.productsPage, products.length);
  const productPageRows = products.slice(productListing.skip, productListing.skip + productListing.take);

  function tabHref(which: "clients" | "products", page: number) {
    return (
      listHref(`/${locale}/trade`, 1, {
        clientsPage: which === "clients" ? (page > 1 ? String(page) : undefined) : query.clientsPage,
        productsPage: which === "products" ? (page > 1 ? String(page) : undefined) : query.productsPage,
      }) + `#${which}`
    );
  }

  function countryLabel(iso2: string) {
    return countries.find((item) => item.value === iso2)?.label || iso2 || "—";
  }

  const clients = (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-[var(--muted)]">
        Add a client below. Open a line to edit it. Products are added on the Products tab. Once the certification
        body accepts the client, that record cannot be deleted.
      </p>
      {addClientForm("clients-company-")}
      {orgRows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No clients yet.</p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2">Certification body</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {clientPageRows.map((organization) => {
                const status = organization.status || "ACTIVE";
                const country = organization.clientAccounts[0]?.companies[0]?.countryIso2 || "";
                const admin = owns(organization.id);
                return (
                  <Fragment key={organization.id}>
                    <tr className="border-b border-[var(--line)]/60">
                      <td className="px-4 py-3 font-medium">{organization.name}</td>
                      <td className="px-4 py-3">{organization.type === "IMPORTER" ? "Importer" : "Manufacturer"}</td>
                      <td className="px-4 py-3">{countryLabel(country)}</td>
                      <td className="px-4 py-3">{organization.servicingCb?.name || "—"}</td>
                      <td className="px-4 py-3">{companyStatus(status)}</td>
                      <td className="px-4 py-3 text-right">
                        {clientDeletable(organization.id, status) && (
                          <DeleteButton action={`/api/trade/companies/${organization.id}`} />
                        )}
                      </td>
                    </tr>
                    {admin && (
                      <tr className="border-b border-[var(--line)]">
                        <td colSpan={6} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit {organization.name}</summary>
                            <div className="mt-3 space-y-4">
                              {roleByOrg.get(organization.id) === "PRIMARY_ADMIN" && status === "ACTIVE" && (
                                <TradeInvite organizationId={organization.id} />
                              )}
                              {(status === "ACTIVE" || status === "SUSPENDED") && (
                                <p className="text-sm text-[var(--muted)]">
                                  The certification body has accepted this client. It cannot be deleted.
                                </p>
                              )}
                              <CrudForm
                                searchable
                                method="PATCH"
                                idPrefix={`clients-company-${organization.id}-`}
                                action={`/api/trade/companies/${organization.id}`}
                                submitLabel="Save client"
                                fields={[
                                  { name: "name", label: "Client", required: true, defaultValue: organization.name },
                                  {
                                    name: "type",
                                    label: "Kind",
                                    type: "select",
                                    required: true,
                                    defaultValue: organization.type,
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
                                    defaultValue: country,
                                    options: countries,
                                  },
                                  {
                                    name: "cbOrganizationId",
                                    label: "Certification body",
                                    type: "select",
                                    required: true,
                                    defaultValue: organization.servicingCbId || "",
                                    options: bodyOptions,
                                  },
                                ]}
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
      )}
      <LinePager
        page={clientListing.page}
        pageCount={clientListing.pageCount}
        prevHref={tabHref("clients", clientListing.page - 1)}
        nextHref={tabHref("clients", clientListing.page + 1)}
      />
    </div>
  );

  const productList = (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-[var(--muted)]">
        Add a product and choose which client it belongs to. A product can be changed or removed only while the
        certification body has not accepted it. Accepted and certified products stay on this list as view only.
      </p>
      {canAddProducts && companyOptions.length > 0 && versionOptions.length > 0 && bodyOptions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Add a product</h2>
          <CrudForm
            searchable
            idPrefix="products-add-"
            action="/api/trade/products"
            submitLabel="Submit product"
            fields={productFormFields({
              traders: companyOptions,
              versions: versionOptions,
              tariffs: tariffOptions,
              countries,
              bodies: bodyOptions,
              marks: [...PRODUCT_COVERAGE],
            })}
          />
        </section>
      ) : companyOptions.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Add a client on the Clients tab before you add a product.</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          A certification body and a standard are needed before a product can be added.
        </p>
      )}
      {products.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No products yet.</p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Standard</th>
                <th className="px-4 py-2">Certification body</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {productPageRows.map((product) => {
                const organization = product.company.clientAccount.organization;
                const applications = [...product.applications].sort(
                  (a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"),
                );
                const links = [...product.standardLinks].sort(
                  (a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"),
                );
                const application = applications[0];
                const certifiedProduct = product.applications.some((row) => row.coc);
                const qualityLink = links.find((row) => row.markScheme === "QUALITY");
                const ecoLink = links.find((row) => row.markScheme === "ECO");
                const canEdit = canAddProducts && editableProduct(product);
                return (
                  <Fragment key={product.id}>
                    <tr className="border-b border-[var(--line)]/60">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-[var(--muted)]">{product.commodity}</div>
                      </td>
                      <td className="px-4 py-3">{organization.name}</td>
                      <td className="px-4 py-3">
                        {links.length === 0 && "—"}
                        {links.map((row) => (
                          <div key={row.id}>
                            {row.markScheme === "ECO" ? "Eco" : "Quality"} · {row.standardVersion.standard.designation}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3">{product.certifyingCb?.name || application?.organization.name || "—"}</td>
                      <td className="px-4 py-3">
                        {applications.map((row) => certificationLabel(row.status, Boolean(row.coc))).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link className="text-[var(--accent)] underline" href={`/${locale}/trade/products/${product.id}`}>
                          {applications.some((row) => row.coc)
                            ? applications
                                .filter((row) => row.coc)
                                .map((row) => row.coc?.certificateNo)
                                .join(", ")
                            : "View"}
                        </Link>
                        {canEdit && (
                          <span className="ml-3 inline-block align-middle">
                            <DeleteButton action={`/api/trade/products/${product.id}`} />
                          </span>
                        )}
                      </td>
                    </tr>
                    {canEdit && (
                      <tr className="border-b border-[var(--line)]">
                        <td colSpan={6} className="px-4 py-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit {product.name}</summary>
                            <div className="mt-3">
                              <CrudForm
                                searchable
                                method="PATCH"
                                idPrefix={`products-edit-${product.id}-`}
                                action={`/api/trade/products/${product.id}`}
                                submitLabel="Save product"
                                fields={productFormFields({
                                  traders: companyOptions,
                                  versions: versionOptions,
                                  tariffs: tariffOptions,
                                  countries,
                                  bodies: bodyOptions,
                                  marks: [...PRODUCT_COVERAGE],
                                  defaults: {
                                    name: product.name,
                                    commodity: product.commodity,
                                    organizationId: organization.id,
                                    standardVersionId: qualityLink?.standardVersionId || "",
                                    ecoStandardVersionId: ecoLink?.standardVersionId || "",
                                    markCoverage: ecoLink ? "BOTH" : "QUALITY",
                                    tariffLineId: product.tariffLineId || "",
                                    certifyingCbId: product.certifyingCbId || organization.servicingCbId || "",
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
      )}
      <LinePager
        page={productListing.page}
        pageCount={productListing.pageCount}
        prevHref={tabHref("products", productListing.page - 1)}
        nextHref={tabHref("products", productListing.page + 1)}
      />
    </div>
  );

  const certifiedList = (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm text-[var(--muted)]">
        Certified products are view only. Open a product certified in this hub to see the certificate of conformity,
        the requirements as filled by the certification body, the person who recorded them, and the certifying body.
        A product copied from the printing system appears here once it is linked to your organisation.
      </p>
      {certified.length === 0 && importedGroups.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No certified products yet.</p>
      ) : (
        certified.map((product) => {
          const applications = [...product.applications].sort(
            (a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"),
          );
          const links = [...product.standardLinks].sort(
            (a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"),
          );
          return (
            <article key={product.id} className="panel p-4">
              <h2 className="font-medium">{product.name}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {product.company.clientAccount.organization.name}
                {applications[0]?.organization.name ? ` · ${applications[0].organization.name}` : ""}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {links.map((link) => {
                  const application = applications.find((row) => row.markScheme === link.markScheme);
                  const passed = application?.assessmentItems.filter((item) => item.pass === true).length ?? 0;
                  const total = application?.assessmentItems.length ?? 0;
                  return (
                    <li key={link.id}>
                      {link.markScheme === "ECO" ? "Eco Mark" : "Quality Mark"} · {link.standardVersion.standard.designation}
                      {application?.coc ? ` · ${application.coc.certificateNo}` : ""}
                      {total ? ` · ${passed} of ${total} requirements passed` : ""}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-sm">
                <Link className="text-[var(--accent)] underline" href={`/${locale}/trade/products/${product.id}`}>
                  View record
                </Link>
              </p>
            </article>
          );
        })
      )}
      {importedGroups.map((marks) => {
        const primary = marks[0];
        const company = primary.manufacturerOrg?.name || primary.companyName;
        const body = primary.certificationBodyOrg?.name || primary.cbName;
        return (
          <article key={primary.liveProductId} className="panel p-4">
            <h2 className="font-medium">{primary.productName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {company}
              {body ? ` · ${body}` : ""}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
              {marks.map((mark) => {
                const standard = mark.standardVersion?.standard.designation || mark.sourceStandardText || "Standard not linked";
                const removed = importedPortals.status.get(mark.pinText) === "removed";
                return (
                  <li key={mark.id}>
                    {mark.markType === "eco" ? "Eco Mark" : "Quality Mark"} · {standard} · {mark.certificationId}
                    {" · "}
                    <span className="font-mono">{mark.pinText}</span>
                    {removed ? " · Under review on the public registry" : ""}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm">
              <Link
                className="text-[var(--accent)] underline"
                href={`/${locale}/verify?pin=${encodeURIComponent(primary.pinText)}`}
              >
                Check PIN
              </Link>
            </p>
          </article>
        );
      })}
    </div>
  );

  const institution = (
    <section className="space-y-3">
      <p className="max-w-3xl text-sm text-[var(--muted)]">
        This keeps your manufacturer company. When the system admin approves, the same login also becomes the
        organisation admin of the new institution. The system admin can also create that institution directly and
        use your existing email.
      </p>
      {pendingRequest ? (
        <p className="text-sm text-[var(--muted)]">
          {pendingRequest.name} ({AUTHORITY_LABELS[pendingRequest.type as keyof typeof AUTHORITY_LABELS] || pendingRequest.type}) is waiting for the system admin.
        </p>
      ) : (
        <CrudForm
          searchable
          idPrefix="institution-request-"
          action="/api/institution-requests"
          submitLabel="Submit request"
          fields={[
            { name: "name", label: "Institution name", required: true },
            {
              name: "type",
              label: "Type",
              type: "select",
              required: true,
              defaultValue: "CB",
              options: AUTHORITY_TYPES.map((value) => ({ value, label: AUTHORITY_LABELS[value] })),
            },
            {
              name: "memberStateId",
              label: "Country",
              type: "select",
              required: true,
              options: states.map((state) => ({ value: state.id, label: `${state.name} (${state.iso2})` })),
            },
          ]}
        />
      )}
    </section>
  );

  const tabs = [
    { id: "clients", label: "Clients", content: clients },
    { id: "products", label: "Products", content: productList },
    { id: "certified", label: "Certified products", content: certifiedList },
    ...(orgAdmin ? [{ id: "institution", label: "Institution request", content: institution }] : []),
  ];

  return (
    <main className="shell space-y-8 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          {orgAdmin ? "Organisation admin" : "Manufacturer"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{t(locale, "My products")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Clients, their products, and the certificates already issued. You add the records. The certification body
          accepts them and carries out certification.
        </p>
      </div>
      <DeskTabs tabs={tabs} />
    </main>
  );
}
