import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm } from "@/components/admin/crud-form";
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

  const own = user.memberships.find((m) => m.organization.type === "CB")?.organization.id;
  if (!can(user, "cb:write") && client.servicingCbId !== own) notFound();

  const versions = await prisma.standardVersion.findMany({
    include: { standard: true },
    orderBy: { standard: { designation: "asc" } },
  });
  const products = client.clientAccounts.flatMap((account) => account.companies.flatMap((company) => company.products));

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/cb`}>
          Certification desk
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {client.type === "IMPORTER" ? "Importer" : "Manufacturer"}
          {client.servicingCb ? ` · served by ${client.servicingCb.name}` : ""}
        </p>
      </div>

      {can(user, "products:write") && versions.length > 0 && (
        <CrudForm
          idPrefix="product-"
          action="/api/cb/products"
          submitLabel="Add certified product"
          fields={[
            { name: "organizationId", label: "Client", defaultValue: client.id, hidden: true },
            { name: "name", label: "Product", required: true },
            { name: "commodity", label: "Commodity", required: true },
            {
              name: "standardVersionId",
              label: "Standard",
              type: "select",
              required: true,
              options: versions.map((v) => ({
                value: v.id,
                label: `${v.standard.designation} — ${v.standard.titleEn}`,
              })),
            },
          ]}
        />
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Standard</th>
              <th className="px-4 py-2">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={3}>
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
                    <div className="text-xs text-[var(--muted)]">{product.commodity}</div>
                  </td>
                  <td className="px-4 py-3">{link?.standardVersion.standard.designation ?? "—"}</td>
                  <td className="px-4 py-3">
                    {coc ? (
                      <Link className="text-[var(--accent)] underline" href={`/${locale}/certificates/${coc.certificateNo}`}>
                        {coc.certificateNo}
                      </Link>
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
