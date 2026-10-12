import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function CertificationDeskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/cb`} />;

  const user = session.user;
  const allowed = can(user, "clients:write") || can(user, "certify:operate") || can(user, "products:write");
  if (!allowed) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Certification desk</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This desk is for users assigned the CB officer role.
        </p>
      </main>
    );
  }

  const own = user.memberships.find((m) => m.organization.type === "CB")?.organization;
  const isAdmin = can(user, "cb:write");
  const cbId = isAdmin ? undefined : own?.id;

  const [clients, bodies, standards] = await Promise.all([
    prisma.organization.findMany({
      where: {
        type: { in: ["MANUFACTURER", "IMPORTER"] },
        ...(cbId ? { servicingCbId: cbId } : { servicingCbId: { not: null } }),
      },
      include: {
        servicingCb: true,
        clientAccounts: { include: { companies: { include: { products: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findMany({ where: { type: "CB" }, orderBy: { name: "asc" } }),
    prisma.standardVersion.count(),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Certification desk</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          A certification body registers the manufacturers and importers it serves, then the products
          it certifies for them.
        </p>
      </div>

      {bodies.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          Create a certification body under{" "}
          <Link className="text-[var(--accent)] underline" href={`/${locale}/admin/certification-bodies`}>
            certification bodies
          </Link>{" "}
          and assign the CB officer role before clients can be added.
        </p>
      )}

      {can(user, "clients:write") && bodies.length > 0 && (
        <CrudForm
          idPrefix="client-"
          action="/api/cb/clients"
          submitLabel="Add client"
          fields={[
            { name: "name", label: "Manufacturer or importer", required: true },
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
            { name: "countryIso2", label: "Country", required: true, placeholder: "KE" },
            ...(isAdmin
              ? [
                  {
                    name: "cbOrganizationId",
                    label: "Certification body",
                    type: "select" as const,
                    required: true,
                    options: bodies.map((b) => ({ value: b.id, label: b.name })),
                  },
                ]
              : [{ name: "cbOrganizationId", label: "Certification body", defaultValue: own?.id || "", hidden: true }]),
          ]}
        />
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">Certification body</th>
              <th className="px-4 py-2">Products</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
                  No clients yet.
                </td>
              </tr>
            )}
            {clients.map((client) => {
              const count = client.clientAccounts.reduce(
                (n, account) => n + account.companies.reduce((m, company) => m + company.products.length, 0),
                0,
              );
              return (
                <tr key={client.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-[var(--accent)] underline" href={`/${locale}/cb/clients/${client.id}`}>
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{client.type === "IMPORTER" ? "Importer" : "Manufacturer"}</td>
                  <td className="px-4 py-3">{client.servicingCb?.name ?? "—"}</td>
                  <td className="px-4 py-3">{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {standards === 0 && (
        <p className="text-sm text-[var(--muted)]">Import a standard before a product can be certified against it.</p>
      )}
    </main>
  );
}
