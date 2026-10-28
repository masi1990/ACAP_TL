import { Fragment } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { Badge } from "@/components/ui/badge";

export default async function AdminSectorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/sectors`} />;
  if (!can(session.user, "standards:read")) notFound();

  const rows = await prisma.sector.findMany({
    include: {
      committees: {
        include: { _count: { select: { standards: true } } },
        orderBy: { code: "asc" },
      },
    },
    orderBy: { code: "asc" },
  });
  const canWrite = can(session.user, "standards:write");
  const canDelete = can(session.user, "standards:delete");
  const sectorOptions = rows.map((row) => ({ value: row.id, label: `${row.code} — ${row.name}` }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Sectors and technical committees</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          A sector has many technical committees. Each standard belongs to one committee.
        </p>
      </div>

      {canWrite && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Add sector</h3>
            <CrudForm
              action="/api/admin/sectors"
              submitLabel="Add sector"
              fields={[
                { name: "code", label: "Sector code", required: true, placeholder: "FOOD" },
                { name: "name", label: "Sector name", required: true, placeholder: "Food and agriculture" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Add technical committee</h3>
            <CrudForm
              action="/api/admin/committees"
              submitLabel="Add committee"
              fields={[
                {
                  name: "sectorId",
                  label: "Sector",
                  type: "select",
                  required: true,
                  options: sectorOptions,
                },
                { name: "code", label: "Committee code", required: true, placeholder: "TC-01" },
                { name: "name", label: "Committee name", required: true, placeholder: "Cereals and pulses" },
              ]}
            />
          </div>
        </div>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Sector</th>
              <th className="px-4 py-2">Committee</th>
              <th className="px-4 py-2">Standards</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                  No sectors yet. Add a sector, then add its technical committees.
                </td>
              </tr>
            )}
            {rows.map((sector) => (
              <Fragment key={sector.id}>
                <tr className="border-b border-[var(--line)]/50 align-top">
                  <td className="px-4 py-3">
                    <div className="font-mono font-medium">{sector.code}</div>
                    <div>{sector.name}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {sector.committees.length} committee{sector.committees.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{sector.committees.reduce((sum, committee) => sum + committee._count.standards, 0)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canDelete && <DeleteButton action={`/api/admin/sectors/${sector.id}`} />}
                  </td>
                </tr>
                {canWrite && (
                  <tr className="border-b border-[var(--line)]/50">
                    <td colSpan={4} className="bg-[var(--surface-2)]/40 px-4 py-3">
                      <CrudForm
                        action={`/api/admin/sectors/${sector.id}`}
                        method="PATCH"
                        idPrefix={`${sector.id}-`}
                        submitLabel="Save sector"
                        fields={[
                          { name: "code", label: "Sector code", required: true, defaultValue: sector.code },
                          { name: "name", label: "Sector name", required: true, defaultValue: sector.name },
                        ]}
                      />
                    </td>
                  </tr>
                )}
                {sector.committees.map((committee) => (
                  <Fragment key={committee.id}>
                    <tr className="border-b border-[var(--line)]/50">
                      <td className="px-4 py-3 text-[var(--muted)]">{sector.code}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium">{committee.code}</span>
                        <span className="text-[var(--muted)]"> — {committee.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{committee._count.standards}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && <DeleteButton action={`/api/admin/committees/${committee.id}`} />}
                      </td>
                    </tr>
                    {canWrite && (
                      <tr className="border-b border-[var(--line)]/50">
                        <td colSpan={4} className="px-4 py-3">
                          <CrudForm
                            action={`/api/admin/committees/${committee.id}`}
                            method="PATCH"
                            idPrefix={`${committee.id}-`}
                            submitLabel="Save committee"
                            fields={[
                              {
                                name: "sectorId",
                                label: "Sector",
                                type: "select",
                                required: true,
                                defaultValue: committee.sectorId,
                                options: sectorOptions,
                              },
                              { name: "code", label: "Committee code", required: true, defaultValue: committee.code },
                              { name: "name", label: "Committee name", required: true, defaultValue: committee.name },
                            ]}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
