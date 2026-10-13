import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { Badge } from "@/components/ui/badge";

export default async function AdminRecsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/recs`} />;
  if (!can(session.user, "recs:read")) notFound();

  const rows = await prisma.rec.findMany({
    include: { _count: { select: { tariffLines: true } } },
    orderBy: { code: "asc" },
  });
  const canWrite = can(session.user, "recs:write");
  const canDelete = can(session.user, "recs:delete");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Regional Economic Communities</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create RECs before tariff lines. Codes are unique (e.g. EAC, ECOWAS).
        </p>
      </div>

      {canWrite && (
        <CrudForm
          action="/api/admin/recs"
          submitLabel="Add REC"
          fields={[
            { name: "code", label: "REC code", required: true, placeholder: "EAC" },
            { name: "name", label: "Name", required: true, placeholder: "East African Community" },
          ]}
        />
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Tariff lines</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                  No RECs yet — add one to begin tariff mapping.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)]/50">
                <td className="px-4 py-3 font-mono font-medium">{r.code}</td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">
                  <Badge>{r._count.tariffLines}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {canDelete && <DeleteButton action={`/api/admin/recs/${r.id}`} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted)]">Locale context: /{locale}/admin/recs</p>
    </div>
  );
}
