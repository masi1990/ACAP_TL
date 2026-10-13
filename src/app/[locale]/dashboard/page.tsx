import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { permissionsForUser, roleLabel, SYSTEM_ROLE_DEFS } from "@/lib/rbac";
import { publicNav, workNav } from "@/lib/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { DashboardLogout } from "./dashboard-logout";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await getSessionUser();
  if (!session) {
    return <ClientRedirect href={`/${locale}/login?next=/${locale}/dashboard`} />;
  }

  const user = session.user;
  const assignments = user.roleAssignments || [];
  const perms = [...permissionsForUser(user)].sort();

  const roleCards = assignments.map((a) => {
    const def =
      a.role ||
      SYSTEM_ROLE_DEFS.find((r) => r.code === a.roleCode) ||
      null;
    let permissions: string[] = [];
    if (a.role?.permissionsJson) {
      try {
        permissions = JSON.parse(a.role.permissionsJson) as string[];
      } catch {
        permissions = [];
      }
    } else {
      const builtIn = SYSTEM_ROLE_DEFS.find((r) => r.code === a.roleCode);
      permissions = builtIn?.permissions ?? [];
    }
    const name =
      ("name" in (def || {}) && (def as { name?: string }).name) ||
      SYSTEM_ROLE_DEFS.find((r) => r.code === a.roleCode)?.name ||
      a.roleCode;
    const description =
      ("description" in (def || {}) && (def as { description?: string }).description) ||
      SYSTEM_ROLE_DEFS.find((r) => r.code === a.roleCode)?.description ||
      "";
    const scope =
      ("scope" in (def || {}) && (def as { scope?: string }).scope) ||
      SYSTEM_ROLE_DEFS.find((r) => r.code === a.roleCode)?.scope ||
      "GLOBAL";

    return {
      id: a.id,
      code: a.roleCode,
      name,
      description,
      scope,
      organizationId: a.organizationId,
      grantedAt: a.grantedAt,
      permissions: permissions.sort(),
    };
  });

  // Surface legacy global roles that somehow lack an assignment row
  const assignedCodes = new Set(roleCards.map((r) => r.code));
  for (const code of user.rolesGlobal.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (assignedCodes.has(code)) continue;
    const builtIn = SYSTEM_ROLE_DEFS.find((r) => r.code === code);
    roleCards.push({
      id: `legacy-${code}`,
      code,
      name: builtIn?.name || code,
      description: builtIn?.description || "Legacy global role (not yet in UserRoleAssignment)",
      scope: builtIn?.scope || "GLOBAL",
      organizationId: null,
      grantedAt: user.createdAt,
      permissions: [...(builtIn?.permissions || [])].sort(),
    });
  }

  const workLinks = workNav(user, locale).filter((link) => link.id !== "dashboard");
  const publicLinks = publicNav(locale).filter((link) => link.id !== "home");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Signed-in dashboard</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Welcome, {user.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {user.email}
            {session.impersonatorId ? (
              <Badge tone="warn" className="ml-2">
                Impersonating
              </Badge>
            ) : null}
          </p>
        </div>
        <DashboardLogout locale={locale} />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Your assigned roles</h2>
          <p className="text-xs text-[var(--muted)]">
            Principle of least privilege — only the permissions below apply to this session
          </p>
        </div>

        {roleCards.length === 0 ? (
          <div className="panel mt-4 p-5 text-sm text-[var(--muted)]">
            No roles assigned yet. Ask an ARSO administrator to grant a role under{" "}
            <Link href={`/${locale}/admin/roles`} className="text-[var(--accent)] underline">
              Roles &amp; RBAC
            </Link>
            .
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {roleCards.map((r) => (
              <article key={r.id} className="panel space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--ink)]">{r.name}</h3>
                    <p className="font-mono text-xs text-[var(--muted)]">{r.code}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone="info">{r.scope}</Badge>
                    {SYSTEM_ROLE_DEFS.some((s) => s.code === r.code) && (
                      <Badge tone="ok">system</Badge>
                    )}
                  </div>
                </div>
                {r.description && (
                  <p className="text-sm text-[var(--muted)]">{r.description}</p>
                )}
                {r.organizationId && (
                  <p className="text-xs text-[var(--muted)]">
                    Org scope: <span className="font-mono">{r.organizationId}</span>
                  </p>
                )}
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Granted {new Date(r.grantedAt).toLocaleString()}
                </p>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Permissions ({r.permissions.length})
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {r.permissions.length === 0 && (
                      <li className="text-xs text-[var(--muted)]">None</li>
                    )}
                    {r.permissions.map((p) => (
                      <li
                        key={p}
                        className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px]"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Organisation memberships</h2>
          {user.memberships.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No organisation memberships.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {user.memberships.map((m) => (
                <li
                  key={`${m.organization.id}-${m.role}`}
                  className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm"
                >
                  <div className="font-medium">{m.organization.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {m.organization.type} · {roleLabel(m.role)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Effective permissions</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Union of all assigned roles and org memberships ({perms.length})
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {perms.length === 0 && (
              <li className="text-sm text-[var(--muted)]">No permissions resolved.</li>
            )}
            {perms.map((p) => (
              <li
                key={p}
                className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[11px]"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Your work</h2>
        {workLinks.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No desks are open for the roles on this account.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="panel block p-4 transition hover:bg-[var(--surface-2)]"
              >
                <h3 className="font-medium text-[var(--ink)]">{link.label}</h3>
                {link.blurb && <p className="mt-1 text-sm text-[var(--muted)]">{link.blurb}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Public path</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="panel block p-4 transition hover:bg-[var(--surface-2)]"
            >
              <h3 className="font-medium text-[var(--ink)]">{link.label}</h3>
              {link.blurb && <p className="mt-1 text-sm text-[var(--muted)]">{link.blurb}</p>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
