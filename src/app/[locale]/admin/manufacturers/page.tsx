import { Fragment } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { countryOptions } from "@/lib/countries";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";
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
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/manufacturers`} />;
  if (!can(session.user, "manufacturer:read")) notFound();

  const [rows, states, bodies] = await Promise.all([
    prisma.organization.findMany({
      where: {
        type: { in: ["MANUFACTURER", "IMPORTER", "CLIENT"] },
      },
      include: {
        memberState: true,
        clientAccounts: { include: { companies: true } },
        memberships: { include: { user: { select: { email: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.memberState.findMany({ orderBy: { name: "asc" } }),
    prisma.organization.findMany({ where: { type: "CB" }, orderBy: { name: "asc" } }),
  ]);
  const canWrite = can(session.user, "manufacturer:write");
  const canDelete = can(session.user, "manufacturer:delete");
  const countries = countryOptions();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Chain organisations</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Add the certification body on the institution directory first. A manufacturer or importer
          then chooses that body, which tests the product and issues the certificate.
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
              ],
            },
            { name: "name", label: "Organisation name", required: true },
            { name: "legalName", label: "Legal company name", placeholder: "Same as organisation if blank" },
            {
              name: "memberStateId",
              label: "Member state",
              type: "select",
              required: true,
              options: states.map((s) => ({ value: s.id, label: `${s.name} (${s.iso2})` })),
            },
            {
              name: "servicingCbId",
              label: "Certification body",
              type: "select",
              options: bodies.map((b) => ({ value: b.id, label: b.name })),
              help: bodies.length
                ? "The body that will certify this manufacturer or importer."
                : "Add a certification body first.",
            },
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
            {rows.map((r) => {
              const company = r.clientAccounts.flatMap((account) => account.companies)[0];
              const trade = r.type === "MANUFACTURER" || r.type === "IMPORTER" || r.type === "CLIENT";
              return (
                <Fragment key={r.id}>
                  <tr className="border-b border-[var(--line)]/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {r.memberships.map((m) => m.user.email).join(", ") || "No users"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{r.type}</Badge>
                    </td>
                    <td className="px-4 py-3">{company?.countryIso2 || r.memberState?.iso2 || "—"}</td>
                    <td className="px-4 py-3">{company?.legalName || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {canDelete && <DeleteButton action={`/api/admin/organizations/${r.id}`} />}
                    </td>
                  </tr>
                  {canWrite && (
                    <tr className="border-b border-[var(--line)]/50">
                      <td colSpan={5} className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit organisation</summary>
                          <div className="mt-3">
                            <CrudForm
                              key={`${r.id}-${r.name}-${company?.countryIso2 ?? ""}`}
                              idPrefix={`org-${r.id}-`}
                              method="PATCH"
                              action={`/api/admin/organizations/${r.id}`}
                              submitLabel="Save organisation"
                              fields={[
                                { name: "name", label: "Organisation name", required: true, defaultValue: r.name },
                                {
                                  name: "type",
                                  label: "Type",
                                  type: "select",
                                  required: true,
                                  defaultValue: r.type,
                                  options: [
                                    { value: "MANUFACTURER", label: "Manufacturer" },
                                    { value: "IMPORTER", label: "Importer" },
                                  ],
                                },
                                {
                                  name: "legalName",
                                  label: "Legal company name",
                                  defaultValue: company?.legalName || r.name,
                                },
                                {
                                  name: "countryIso2",
                                  label: "Country",
                                  type: "select",
                                  required: trade,
                                  options: countries,
                                  defaultValue: company?.countryIso2 || r.memberState?.iso2 || "",
                                  help: "Any country. An importer does not have to be in a member state.",
                                },
                                {
                                  name: "memberStateId",
                                  label: "Member state",
                                  type: "select",
                                  options: states.map((state) => ({ value: state.id, label: `${state.name} (${state.iso2})` })),
                                  defaultValue: r.memberStateId || "",
                                },
                                {
                                  name: "servicingCbId",
                                  label: "Certification body",
                                  type: "select",
                                  options: bodies.map((body) => ({ value: body.id, label: body.name })),
                                  defaultValue: r.servicingCbId || "",
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
      <p className="text-xs text-[var(--muted)]">/{locale}/admin/manufacturers</p>
    </div>
  );
}
