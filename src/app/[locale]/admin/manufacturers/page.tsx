import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";

export default async function AdminManufacturersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session || !can(session.user, "manufacturer:read")) notFound();

  const [rows, states] = await Promise.all([
    prisma.organization.findMany({
      where: {
        type: { in: ["MANUFACTURER", "IMPORTER", "CLIENT", "CUSTOMS", "NSB", "MARKET_SURVEILLANCE"] },
      },
      include: {
        memberState: true,
        clientAccounts: { include: { companies: true } },
        memberships: { include: { user: { select: { email: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.memberState.findMany({ orderBy: { name: "asc" } }),
  ]);
  const canWrite = can(session.user, "manufacturer:write");
  const canDelete = can(session.user, "manufacturer:delete");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Chain organisations</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manufacturers and importers register products. Customs authorities, inspectorates, and
          market surveillance authorities use the conformity chain. A primary login is optional and
          stays limited to that organisation.
        </p>
      </div>

      {canWrite && (
        <CrudForm
          action="/api/admin/organizations"
          submitLabel="Add organisation"
          fields={[
            {
              name: "type",
              label: "Type",
              type: "select",
              required: true,
              defaultValue: "MANUFACTURER",
              options: [
                { value: "MANUFACTURER", label: "Manufacturer" },
                { value: "IMPORTER", label: "Importer" },
                { value: "CUSTOMS", label: "Customs authority" },
                { value: "NSB", label: "Inspectorate" },
                { value: "MARKET_SURVEILLANCE", label: "Market surveillance" },
              ],
            },
            { name: "name", label: "Organisation name", required: true },
            { name: "legalName", label: "Legal company name", placeholder: "Same as org if blank" },
            {
              name: "memberStateId",
              label: "Member state",
              type: "select",
              options: states.map((s) => ({ value: s.id, label: `${s.name} (${s.iso2})` })),
            },
            { name: "countryIso2", label: "Company country ISO2", defaultValue: "KE", placeholder: "KE" },
            { name: "adminEmail", label: "Primary admin email (optional)" },
            { name: "adminName", label: "Primary admin name" },
            {
              name: "adminPassword",
              label: "Temp password",
              placeholder: "ChangeMe!ACAP",
              defaultValue: "ChangeMe!ACAP",
            },
          ]}
        />
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">State</th>
              <th className="px-4 py-2">Companies</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  No organisations yet. Add a manufacturer or importer before registering a product.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)]/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {r.memberships.map((m) => m.user.email).join(", ") || "No users"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge>{r.type}</Badge>
                </td>
                <td className="px-4 py-3">{r.memberState?.iso2 || "—"}</td>
                <td className="px-4 py-3">
                  {r.clientAccounts.flatMap((c) => c.companies.map((co) => co.legalName)).join(", ") ||
                    "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {canDelete && <DeleteButton action={`/api/admin/organizations/${r.id}`} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted)]">/{locale}/admin/manufacturers</p>
    </div>
  );
}
