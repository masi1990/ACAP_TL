import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { can, permissionsForUser } from "@/lib/rbac";
import type { Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";

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

  const perms = permissionsForUser(session.user);
  const canAdmin =
    perms.has("standards:write") ||
    perms.has("recs:write") ||
    perms.has("tariffs:write") ||
    perms.has("cb:write") ||
    perms.has("manufacturer:write") ||
    perms.has("standards:read") ||
    perms.has("roles:read");

  if (!canAdmin) {
    return <ClientRedirect href={`/${locale}/dashboard`} />;
  }

  const nav = [
    { href: `/${locale}/admin`, label: "Overview", show: true },
    { href: `/${locale}/admin/standards`, label: "Standards", show: can(session.user, "standards:read") },
    { href: `/${locale}/admin/prices`, label: "Price table", show: can(session.user, "standards:read") },
    {
      href: `/${locale}/admin/standards/import`,
      label: "Import PDF/Word",
      show: can(session.user, "standards:import"),
    },
    { href: `/${locale}/admin/recs`, label: "RECs", show: can(session.user, "recs:read") },
    { href: `/${locale}/admin/tariffs`, label: "Tariff codes", show: can(session.user, "tariffs:read") },
    {
      href: `/${locale}/admin/manufacturers`,
      label: "Manufacturer / importer",
      show: can(session.user, "manufacturer:read"),
    },
    {
      href: `/${locale}/admin/certification-bodies`,
      label: "Certification bodies",
      show: can(session.user, "cb:read"),
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
          <p className="mt-1 text-sm text-[var(--muted)]">
            Signed in as {session.user.email}
            {session.user.rolesGlobal ? ` · ${session.user.rolesGlobal}` : ""} — least-privilege RBAC
          </p>
        </div>
        <Link href={`/${locale}/dashboard`} className="text-sm text-[var(--accent)] underline">
          Back to dashboard
        </Link>
      </div>
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
