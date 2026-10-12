import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";

export default async function AdminCbPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session || !can(session.user, "cb:read")) notFound();

  const [rows, states] = await Promise.all([
    prisma.organization.findMany({
      where: { type: "CB" },
      include: {
        memberState: true,
        cbLicenses: true,
        memberships: { include: { user: { select: { email: true } } } },
        _count: { select: { applications: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.memberState.findMany({ orderBy: { name: "asc" } }),
  ]);
  const canWrite = can(session.user, "cb:write");
  const canDelete = can(session.user, "cb:delete");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Certification bodies</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Only ARSO hub roles may create CBs. CB primary admins receive an org-scoped role (no global
          catalogue delete).
        </p>
      </div>

      {canWrite && (
        <CrudForm
          action="/api/admin/organizations"
          submitLabel="Add certification body"
          fields={[
            { name: "type", label: "Type", type: "select", required: true, defaultValue: "CB", options: [{ value: "CB", label: "Certification Body" }] },
            { name: "name", label: "CB name", required: true, placeholder: "KEBS Certification Body" },
            {
              name: "memberStateId",
              label: "Member state",
              type: "select",
              options: states.map((s) => ({ value: s.id, label: `${s.name} (${s.iso2})` })),
            },
            { name: "adminEmail", label: "Primary admin email", required: true },
            { name: "adminName", label: "Primary admin name" },
            {
              name: "adminPassword",
              label: "Temp password",
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
              <th className="px-4 py-2">State</th>
              <th className="px-4 py-2">Licences</th>
              <th className="px-4 py-2">Apps</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  No certification bodies yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)]/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {r.memberships.map((m) => m.user.email).join(", ")}
                  </div>
                </td>
                <td className="px-4 py-3">{r.memberState?.iso2 || "—"}</td>
                <td className="px-4 py-3">
                  <Badge>{r.cbLicenses.length}</Badge>
                </td>
                <td className="px-4 py-3">{r._count.applications}</td>
                <td className="px-4 py-3 text-right">
                  {canDelete && <DeleteButton action={`/api/admin/organizations/${r.id}`} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted)]">/{locale}/admin/certification-bodies</p>
    </div>
  );
}
