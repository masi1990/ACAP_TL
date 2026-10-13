import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { authorityOwnerStateIds, can, roleLabel } from "@/lib/rbac";
import { canOpenAdmin } from "@/lib/navigation";
import type { Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { NavTabs } from "@/components/nav-tabs";

function assignedRoleLabels(user: {
  rolesGlobal: string;
  memberships: Array<{ organizationId?: string; organization: { id: string; name: string } }>;
  roleAssignments: Array<{ roleCode: string; organizationId: string | null; role: { name: string } | null }>;
}) {
  const labels = user.roleAssignments.map((assignment) => {
    const name = roleLabel(assignment.roleCode, assignment.role?.name);
    if (!assignment.organizationId) return name;
    const membership = user.memberships.find(
      (item) => item.organization.id === assignment.organizationId || item.organizationId === assignment.organizationId,
    );
    return membership ? `${name} · ${membership.organization.name}` : name;
  });
  if (labels.length > 0) return labels;
  return user.rolesGlobal
    .split(",")
    .map((code) => roleLabel(code.trim()))
    .filter(Boolean);
}

/**
 * Auth + chrome for /admin. Kept out of layout.tsx so redirect() does not
 * abort the layout render and trip Next.js Performance.measure negative stamps.
 */
export async function AdminChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) {
    return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin`} />;
  }

  const ownsInstitution = authorityOwnerStateIds(session.user).length > 0;
  if (!canOpenAdmin(session.user)) {
    return <ClientRedirect href={`/${locale}/dashboard`} />;
  }

  const nav = [
    { href: `/${locale}/admin`, label: "Overview", show: true },
    { href: `/${locale}/admin/recs`, label: "RECs", show: can(session.user, "recs:read") },
    { href: `/${locale}/admin/tariffs`, label: "Tariff codes", show: can(session.user, "tariffs:read") },
    { href: `/${locale}/admin/standards`, label: "Standards", show: can(session.user, "standards:read") },
    {
      href: `/${locale}/admin/standards/import`,
      label: "Import PDF/Word",
      show: can(session.user, "standards:import"),
    },
    { href: `/${locale}/admin/prices`, label: "Price table", show: can(session.user, "standards:read") },
    {
      href: `/${locale}/admin/institutions`,
      label: "Institutions",
      show: can(session.user, "institutions:read") || ownsInstitution,
    },
    {
      href: `/${locale}/admin/manufacturers`,
      label: "Manufacturer / importer",
      show: can(session.user, "manufacturer:read"),
    },
    {
      href: `/${locale}/admin/roles`,
      label: "Roles & RBAC",
      show: can(session.user, "roles:read"),
    },
  ].filter((n) => n.show);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Hub administration</p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
            Catalogue &amp; organisations
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Signed in as {session.user.email}
            {assignedRoleLabels(session.user).length > 0 ? ` · ${assignedRoleLabels(session.user).join(", ")}` : ""}.
            Enter data in tab order: REC, tariff code, standard, price, institution, then manufacturer.
          </p>
        </div>
        <Link href={`/${locale}/dashboard`} className="text-sm text-[var(--accent)] underline">
          Back to dashboard
        </Link>
      </div>
      <NavTabs items={nav.map((item) => ({ href: item.href, label: item.label }))} />
      {children}
    </div>
  );
}
