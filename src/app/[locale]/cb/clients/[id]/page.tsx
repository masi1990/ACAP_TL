import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { countryName, countryOptions } from "@/lib/countries";
import { originSummary } from "@/lib/origin-claim";
import { productFormFields } from "@/lib/product-form";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { CertificateDownloadLink } from "@/components/certificate-actions";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function ClientProductsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/cb/clients/${id}`} />;

  const user = session.user;
  if (!can(user, "products:write") && !can(user, "certify:operate") && !can(user, "clients:write")) notFound();

  const client = await prisma.organization.findUnique({
    where: { id },
    include: {
      servicingCb: true,
      clientAccounts: {
        include: {
          companies: {
            include: {
              products: {
                include: {
                  standardLinks: { include: { standardVersion: { include: { standard: true } } } },
                  applications: { include: { coc: true } },
                },
                orderBy: { name: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!client || (client.type !== "MANUFACTURER" && client.type !== "IMPORTER")) notFound();

  const isAdmin = can(user, "cb:write");
  const own = user.memberships.find((m) => m.organization.type === "CB")?.organization.id;
  if (!isAdmin && client.servicingCbId !== own) notFound();

  const [versions, tariffs, bodies] = await Promise.all([
    prisma.standardVersion.findMany({
      include: { standard: true },
      orderBy: { standard: { designation: "asc" } },
    }),
    prisma.tariffLine.findMany({
      include: { rec: true },
      orderBy: { codeDisplay: "asc" },
      take: 500,
    }),
    prisma.organization.findMany({ where: { type: "CB" }, orderBy: { name: "asc" } }),
  ]);
  const products = client.clientAccounts.flatMap((account) => account.companies.flatMap((company) => company.products));
  const country = client.clientAccounts.flatMap((account) => account.companies)[0]?.countryIso2 || "";
  const countries = countryOptions();

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/cb`}>
          Certification desk
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {client.type === "IMPORTER" ? "Importer" : "Manufacturer"}
          {country ? ` · ${countryName(country)} (${country})` : ""}
          {client.servicingCb ? ` · served by ${client.servicingCb.name}` : ""}
        </p>
      </div>

      {can(user, "clients:write") && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <DeleteButton action={`/api/cb/client/${client.id}`} label="Delete manufacturer or importer" />
          </div>
          <CrudForm
            idPrefix="client-"
            method="PATCH"
            action={`/api/cb/client/${client.id}`}
            submitLabel="Save manufacturer or importer"
            fields={[
              { name: "name", label: "Manufacturer or importer", required: true, defaultValue: client.name },
              {
                name: "type",
                label: "Kind",
                type: "select",
                required: true,
                defaultValue: client.type,
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
                defaultValue: country,
              },
              ...(isAdmin
                ? [
                    {
                      name: "cbOrganizationId",
                      label: "Certification body",
                      type: "select" as const,
                      required: true,
                      options: bodies.map((body) => ({ value: body.id, label: body.name })),
                      defaultValue: client.servicingCbId || "",
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}

      {can(user, "products:write") && versions.length > 0 && (
        <CrudForm
          idPrefix="product-"
          action="/api/cb/products"
          submitLabel="Add certified product"
          fields={productFormFields({
            organizationId: client.id,
            versions: versions.map((version) => ({
              value: version.id,
              label: `${version.standard.designation} — ${version.standard.titleEn}`,
            })),
            tariffs: tariffs.map((line) => ({
              value: line.id,
              label: `${line.codeDisplay}${line.rec ? ` · ${line.rec.code}` : ""}`,
            })),
            countries: countryOptions(),
          })}
        />
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Standard</th>
              <th className="px-4 py-2">Origin</th>
              <th className="px-4 py-2">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
                  No products certified for this client yet.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const link = product.standardLinks[0];
              const coc = product.applications[0]?.coc;
              return (
                <tr key={product.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-[var(--accent)] underline" href={`/${locale}/cb/products/${product.id}`}>
                      {product.name}
                    </Link>
                    <div className="text-xs text-[var(--accent)]">Open certification</div>
                    <div className="text-xs text-[var(--muted)]">{product.commodity}</div>
                  </td>
                  <td className="px-4 py-3">{link?.standardVersion.standard.designation ?? "—"}</td>
                  <td className="px-4 py-3">{originSummary(product.originClaimJson)}</td>
                  <td className="px-4 py-3">
                    {coc ? (
                      <CertificateDownloadLink href={`/${locale}/certificates/${coc.certificateNo}`}>
                        {coc.certificateNo}
                      </CertificateDownloadLink>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
