import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { authorityOwnerStateIds, can } from "@/lib/rbac";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();

  const [standards, priced, recs, tariffs, sectors, cbs, manufacturers, roles, orders, audits, copiedMarks] = await Promise.all([
    prisma.standard.count(),
    prisma.catalogItem.count({ where: { active: true } }),
    prisma.rec.count(),
    prisma.tariffLine.count(),
    prisma.sector.count(),
    prisma.organization.count({
      where: { type: { in: ["CB", "NSB", "REGULATOR", "CUSTOMS", "MARKET_SURVEILLANCE", "ENTRY_POINT_OP"] } },
    }),
    prisma.organization.count({
      where: { type: { in: ["MANUFACTURER", "IMPORTER", "CLIENT"] } },
    }),
    prisma.roleDefinition.count(),
    prisma.order.count(),
    prisma.auditEvent.count(),
    prisma.importedCertifiedMark.count(),
  ]);

  const cards = [
    {
      title: "Copied marks",
      count: copiedMarks,
      href: `/${locale}/admin/imported-marks`,
      blurb: "Certified products held in this hub. Link the manufacturer, certification body, and standard.",
      show: session && (can(session.user, "products:read") || can(session.user, "portal:operate")),
    },
    {
      title: "1. RECs",
      count: recs,
      href: `/${locale}/admin/recs`,
      blurb: "Regional Economic Communities (EAC, ECOWAS, COMESA, SADC). Tariff codes belong to a REC.",
      show: session && can(session.user, "recs:read"),
    },
    {
      title: "2. Tariff codes",
      count: tariffs,
      href: `/${locale}/admin/tariffs`,
      blurb: "HS lines for each REC. A standard is mapped to these lines next.",
      show: session && can(session.user, "tariffs:read"),
    },
    {
      title: "Sectors & committees",
      count: sectors,
      href: `/${locale}/admin/sectors`,
      blurb: "A sector has many technical committees. Each standard belongs to one committee.",
      show: session && can(session.user, "standards:read"),
    },
    {
      title: "3. Standards",
      count: standards,
      href: `/${locale}/admin/standards`,
      blurb: "Create or import the African Standard, set its publication status, and map it to tariff lines.",
      show: session && can(session.user, "standards:read"),
    },
    {
      title: "4. Price table",
      count: priced,
      href: `/${locale}/admin/prices`,
      blurb: "Price a standard, or list it free to read only, or free to read and download.",
      show: session && can(session.user, "standards:read"),
    },
    {
      title: "Library",
      count: null,
      href: `/${locale}/admin/library`,
      blurb: "Standards officers, role requests, and the standards emailed for harmonisation and adoption.",
      show: session && (can(session.user, "institutions:write") || can(session.user, "audit:read")),
    },
    {
      title: "5. Institutions",
      count: cbs,
      href: `/${locale}/admin/institutions`,
      blurb: "Authorities grouped by country. Each office keeps its own main account.",
      show:
        session &&
        (can(session.user, "institutions:read") || authorityOwnerStateIds(session.user).length > 0),
    },
    {
      title: "6. Manufacturer / importer",
      count: manufacturers,
      href: `/${locale}/admin/manufacturers`,
      blurb: "The company that will place a product on the market, linked to its certification body.",
      show: session && can(session.user, "manufacturer:read"),
    },
    {
      title: "7. Roles & RBAC",
      count: roles,
      href: `/${locale}/admin/roles`,
      blurb: "Who may edit the catalogue, operate a certification body, or work the later desks.",
      show: session && can(session.user, "roles:read"),
    },
    {
      title: "Webstore orders",
      count: orders,
      href: `/${locale}/admin/orders`,
      blurb: "Track store purchases and copy the watermarked download link when a buyer asks for it again.",
      show: session && can(session.user, "audit:read"),
    },
    {
      title: "Audit trail",
      count: audits,
      href: `/${locale}/admin/audit`,
      blurb: "Who changed a record, including catalogue edits and completed store purchases.",
      show: session && can(session.user, "audit:read"),
    },
  ].filter((c) => c.show);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        Follow the numbered steps. A tariff code needs a REC, a standard needs tariff lines, a
        manufacturer needs a certification body, and the public pages then show that same record.
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
