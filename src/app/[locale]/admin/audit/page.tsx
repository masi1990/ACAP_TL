import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { formatStamp } from "@/lib/utils";

function clip(value: string | null, max = 280) {
  if (!value) return "";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/audit`} />;
  if (!can(session.user, "audit:read")) notFound();

  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const matchedUsers = q
    ? await prisma.userAccount.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true },
        take: 50,
      })
    : [];
  const actorIds = matchedUsers.map((user) => user.id);

  const where: Prisma.AuditEventWhereInput | undefined = q
    ? {
        OR: [
          { action: { contains: q, mode: "insensitive" } },
          { entityType: { contains: q, mode: "insensitive" } },
          { entityId: { contains: q, mode: "insensitive" } },
          { reason: { contains: q, mode: "insensitive" } },
          ...(actorIds.length > 0
            ? [{ actorUserId: { in: actorIds } }, { impersonatorId: { in: actorIds } }]
            : []),
        ],
      }
    : undefined;
  const total = await prisma.auditEvent.count({ where });
  const listing = listPage(sp.page, total);
  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    skip: listing.skip,
    take: listing.take,
  });

  const userIds = [
    ...new Set(
      events.flatMap((event) => [event.actorUserId, event.impersonatorId].filter((id): id is string => Boolean(id))),
    ),
  ];
  const users = userIds.length
    ? await prisma.userAccount.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const byId = new Map(users.map((user) => [user.id, user]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Audit trail</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Record of catalogue changes, role assignments, and store fulfilment. Each row keeps the actor,
          the record that changed, and a short before/after snapshot.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Action, entity, reason, or person"
            className="h-10 w-72 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3"
          />
        </label>
        <button type="submit" className="h-10 rounded-md bg-[var(--accent)] px-3 font-medium text-[var(--accent-fg)]">
          Filter
        </button>
        <Link href={`/${locale}/admin/audit`} className="text-[var(--accent)] underline">
          Clear
        </Link>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Record</th>
              <th className="px-4 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  No audit events match this filter.
                </td>
              </tr>
            )}
            {events.map((event) => {
              const actor = event.actorUserId ? byId.get(event.actorUserId) : undefined;
              const impersonator = event.impersonatorId ? byId.get(event.impersonatorId) : undefined;
              const after = clip(event.afterJson);
              const before = clip(event.beforeJson);
              return (
                <tr key={event.id} className="border-b border-[var(--line)]/50 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatStamp(event.occurredAt)}</td>
                  <td className="px-4 py-3">
                    <div>{actor ? actor.name : event.actorUserId || "System"}</div>
                    {actor && <div className="text-xs text-[var(--muted)]">{actor.email}</div>}
                    {impersonator && (
                      <div className="mt-1 text-xs text-[var(--muted)]">As {impersonator.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{event.action}</td>
                  <td className="px-4 py-3">
                    <div>{event.entityType}</div>
                    <div className="mt-1 break-all font-mono text-xs text-[var(--muted)]">{event.entityId}</div>
                  </td>
                  <td className="px-4 py-3">
                    {event.reason && <p className="mb-1">{event.reason}</p>}
                    {before && (
                      <p className="max-w-md text-xs text-[var(--muted)]">
                        <span className="font-medium">Before </span>
                        {before}
                      </p>
                    )}
                    {after && (
                      <p className="max-w-md text-xs text-[var(--muted)]">
                        <span className="font-medium">After </span>
                        {after}
                      </p>
                    )}
                    {!event.reason && !before && !after && <span className="text-[var(--muted)]">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {listing.total === 0
          ? "No matching audit events."
          : `Showing ${listing.from}–${listing.to} of ${listing.total}.`}
      </p>
      <LinePager
        page={listing.page}
        pageCount={listing.pageCount}
        prevHref={listHref(`/${locale}/admin/audit`, listing.page - 1, { q })}
        nextHref={listHref(`/${locale}/admin/audit`, listing.page + 1, { q })}
      />
    </div>
  );
}
