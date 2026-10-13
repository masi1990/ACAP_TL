import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ALL_PERMISSIONS, can, isArsoAdmin } from "@/lib/rbac";
import { ensureSystemRoles } from "@/lib/system-roles";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { RolesAdminClient } from "./roles-admin-client";

export default async function AdminRolesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  void locale;

  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/roles`} />;
  if (!can(session.user, "roles:read")) notFound();

  await ensureSystemRoles();

  const [roles, assignments, users, organizations] = await Promise.all([
    prisma.roleDefinition.findMany({
      orderBy: [{ scope: "asc" }, { code: "asc" }],
      include: { _count: { select: { assignments: true } } },
    }),
    prisma.userRoleAssignment.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { code: true, name: true, scope: true } },
      },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.userAccount.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        rolesGlobal: true,
        memberships: {
          include: { organization: { select: { id: true, name: true, type: true } } },
        },
      },
      orderBy: { email: "asc" },
    }),
    prisma.organization.findMany({
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Roles &amp; permissions</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Role-based access control with the principle of least privilege. System roles ship with
          curated permission sets; assign the narrowest role that still lets someone do their job.
          Prefer <span className="font-mono text-xs">ARSO_AUDITOR</span> /{" "}
          <span className="font-mono text-xs">ARSO_CATALOGUE_EDITOR</span> over{" "}
          <span className="font-mono text-xs">ARSO_ADMIN</span> for day-to-day work.
        </p>
      </div>
      <RolesAdminClient
        initialRoles={roles}
        initialAssignments={assignments.map((a) => ({
          ...a,
          grantedAt: a.grantedAt.toISOString(),
        }))}
        users={users}
        organizations={organizations}
        assignAnyOrganization={isArsoAdmin(session.user)}
        allPermissions={ALL_PERMISSIONS}
        canWrite={can(session.user, "roles:write")}
        canAssign={can(session.user, "roles:assign")}
      />
    </div>
  );
}
