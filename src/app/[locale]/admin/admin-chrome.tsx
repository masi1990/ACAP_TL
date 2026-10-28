import Link from "next/link";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { authorityOwnerStateIds, can, roleLabel } from "@/lib/rbac";
import { canOpenAdmin } from "@/lib/navigation";
import { t, type Locale } from "@/lib/i18n";
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

  const systemAdmin = canOpenAdmin(session.user);
  const ownsInstitution = authorityOwnerStateIds(session.user).length > 0;
  const pathname = (await headers()).get("x-pathname") || "";
  const onInstitutions = pathname.includes("/admin/institutions");
  if (!systemAdmin && !(ownsInstitution && onInstitutions)) {
    return (
      <ClientRedirect
        href={ownsInstitution ? `/${locale}/admin/institutions` : `/${locale}/dashboard`}
      />
    );
  }

  const nav = [
    { href: `/${locale}/admin`, label: t(locale, "Overview"), show: systemAdmin },
    { href: `/${locale}/admin/recs`, label: t(locale, "RECs"), show: systemAdmin && can(session.user, "recs:read") },
    { href: `/${locale}/admin/tariffs`, label: t(locale, "Tariff codes"), show: systemAdmin && can(session.user, "tariffs:read") },
    { href: `/${locale}/admin/sectors`, label: t(locale, "Sectors"), show: systemAdmin && can(session.user, "standards:read") },
    { href: `/${locale}/admin/standards`, label: t(locale, "Standards"), show: systemAdmin && can(session.user, "standards:read") },
    { href: `/${locale}/admin/prices`, label: t(locale, "Prices"), show: systemAdmin && can(session.user, "standards:read") },
    {
      href: `/${locale}/admin/library`,
      label: "Library",
      show: can(session.user, "institutions:write") || can(session.user, "audit:read"),
    },
    {
      href: `/${locale}/admin/standards/import`,
      label: t(locale, "Import PDF/Word"),
      show: systemAdmin && can(session.user, "standards:import"),
    },
    { href: `/${locale}/admin/imported-marks`, label: "Copied marks", show: systemAdmin && (can(session.user, "products:read") || can(session.user, "portal:operate")) },
    {
      href: `/${locale}/admin/institutions`,
      label: t(locale, "Institutions"),
      show: can(session.user, "institutions:read") || ownsInstitution,
    },
    {
      href: `/${locale}/admin/manufacturers`,
      label: t(locale, "Manufacturer / importer"),
      show: systemAdmin && can(session.user, "manufacturer:read"),
    },
    {
      href: `/${locale}/admin/roles`,
      label: t(locale, "Roles & RBAC"),
      show: systemAdmin && can(session.user, "roles:read"),
    },
    {
      href: `/${locale}/admin/orders`,
      label: t(locale, "Orders"),
      show: systemAdmin && can(session.user, "audit:read"),
    },
    {
      href: `/${locale}/admin/audit`,
      label: t(locale, "Audit"),
      show: systemAdmin && can(session.user, "audit:read"),
    },
  ].filter((n) => n.show);

  return (
    <div className="shell py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {systemAdmin ? t(locale, "System admin") : t(locale, "Institutions")}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
            {systemAdmin ? t(locale, "Catalogue & organisations") : t(locale, "Your country's institutions")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Signed in as {session.user.email}
            {assignedRoleLabels(session.user).length > 0 ? ` · ${assignedRoleLabels(session.user).join(", ")}` : ""}.
            {systemAdmin
              ? " Enter data in tab order: REC, tariff code, standard, price, institution, then manufacturer."
              : " You manage the institutions for your country. Catalogue administration stays with the system admin."}
          </p>
        </div>
        <Link href={`/${locale}/dashboard`} className="text-sm text-[var(--accent)] underline">
          {t(locale, "Back to dashboard")}
        </Link>
      </div>
      <NavTabs items={nav.map((item) => ({ href: item.href, label: item.label }))} />
      {children}
    </div>
  );
}
