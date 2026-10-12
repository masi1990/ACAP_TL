import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();

  const [standards, priced, recs, tariffs, cbs, manufacturers, roles] = await Promise.all([
    prisma.standard.count(),
    prisma.catalogItem.count({ where: { active: true, priceCents: { gt: 0 } } }),
    prisma.rec.count(),
    prisma.tariffLine.count(),
    prisma.organization.count({ where: { type: "CB" } }),
    prisma.organization.count({
      where: { type: { in: ["MANUFACTURER", "IMPORTER", "CLIENT"] } },
    }),
    prisma.roleDefinition.count(),
  ]);

  const cards = [
    {
      title: "Standards",
      count: standards,
      href: `/${locale}/admin/standards`,
      blurb: "One standard → many tariff lines. Import PDF/Word into a full machine pack; admin full preview is auth-only.",
      show: session && can(session.user, "standards:read"),
    },
    {
      title: "Price table",
      count: priced,
      href: `/${locale}/admin/prices`,
      blurb: "Set a webstore price and currency for each uploaded standard.",
      show: session && can(session.user, "standards:read"),
    },
    {
      title: "RECs",
      count: recs,
      href: `/${locale}/admin/recs`,
      blurb: "Regional Economic Communities (EAC, ECOWAS, COMESA, SADC, …).",
      show: session && can(session.user, "recs:read"),
    },
    {
      title: "Tariff codes",
      count: tariffs,
      href: `/${locale}/admin/tariffs`,
      blurb: "HS lines per REC — map many codes to one standard version.",
      show: session && can(session.user, "tariffs:read"),
    },
    {
      title: "Manufacturer / importer",
      count: manufacturers,
      href: `/${locale}/admin/manufacturers`,
      blurb: "Trade organisations that hold products and origin claims.",
      show: session && can(session.user, "manufacturer:read"),
    },
    {
      title: "Certification bodies",
      count: cbs,
      href: `/${locale}/admin/certification-bodies`,
      blurb: "Accredited CBs that evaluate and issue CoCs.",
      show: session && can(session.user, "cb:read"),
    },
    {
      title: "Roles & RBAC",
      count: roles,
      href: `/${locale}/admin/roles`,
      blurb: "Least-privilege role catalogue, assignments, and permission matrix.",
      show: session && can(session.user, "roles:read"),
    },
  ].filter((c) => c.show);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        Demo catalogue data has been removed. Use these screens to add RECs, tariff lines, standards
        (including PDF/Word import with fidelity checks), manufacturers/importers, and certification
        bodies. Writes are audited and gated by role.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="panel block p-5 transition hover:bg-[var(--surface-2)]">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold text-[var(--ink)]">{c.title}</h2>
              <span className="font-mono text-2xl text-[var(--accent)]">{c.count}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{c.blurb}</p>
          </Link>
        ))}
      </div>
      {session && can(session.user, "standards:import") && (
        <Link
          href={`/${locale}/admin/standards/import`}
          className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)]"
        >
          Import standard from PDF or Word
        </Link>
      )}
    </div>
  );
}
