import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { loadLibraryInstitutions } from "@/lib/library";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { LibraryAdminClient } from "./library-admin-client";

export default async function AdminLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ person?: string; action?: string; role?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/library`} />;
  if (!can(session.user, "institutions:write") && !can(session.user, "audit:read")) {
    return <ClientRedirect href={`/${locale}/dashboard`} />;
  }
  const sp = await searchParams;
  const institutions = await loadLibraryInstitutions();
  const [requests, standardRequests, standards, entryPoints, activity, audits] = await Promise.all([
    prisma.libraryAccessRequest.findMany({
      where: { status: "PENDING" },
      include: { user: true, organization: true, memberState: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.libraryStandardRequest.findMany({
      where: { status: "PENDING" },
      include: { items: { include: { standard: true } }, organization: true, memberState: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.standard.findMany({
      where: { versions: { some: { publicationStatus: "PUBLISHED" } } },
      orderBy: { designation: "asc" },
      select: { id: true, designation: true, titleEn: true },
    }),
    prisma.entryPoint.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, organizationId: true } }),
    prisma.libraryActivity.findMany({
      where: {
        ...(sp.action ? { action: sp.action } : {}),
        ...(sp.role ? { roleCode: sp.role } : {}),
        ...(sp.person
          ? { user: { OR: [{ email: { contains: sp.person, mode: "insensitive" } }, { name: { contains: sp.person, mode: "insensitive" } }] } }
          : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
      include: { user: true, organization: true, standard: true, posting: true },
    }),
    (async () => {
      const people = sp.person
        ? await prisma.userAccount.findMany({
            where: {
              OR: [
                { email: { contains: sp.person, mode: "insensitive" } },
                { name: { contains: sp.person, mode: "insensitive" } },
              ],
            },
            select: { id: true, email: true },
          })
        : [];
      const rows = await prisma.auditEvent.findMany({
        where: sp.person ? { actorUserId: { in: people.map((person) => person.id) } } : undefined,
        orderBy: { occurredAt: "desc" },
        take: 50,
      });
      const ids = [...new Set(rows.map((row) => row.actorUserId).filter((id): id is string => Boolean(id)))];
      const actors = await prisma.userAccount.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } });
      const emailById = new Map(actors.map((actor) => [actor.id, actor.email]));
      return rows.map((row) => ({ ...row, email: row.actorUserId ? emailById.get(row.actorUserId) || "" : "" }));
    })(),
  ]);

  return (
      <LibraryAdminClient
        canWrite={can(session.user, "institutions:write")}
        institutions={institutions.map((org) => ({
          id: org.id,
          name: org.name,
          countries:
            org.backing === "PRIVATE"
              ? org.operatingCountries.map((row) => ({ id: row.memberState.id, name: row.memberState.name }))
              : org.memberState
                ? [{ id: org.memberState.id, name: org.memberState.name }]
                : [],
        }))}
        entryPoints={entryPoints}
        standards={standards}
        requests={requests.map((row) => ({
          id: row.id,
          email: row.user.email,
          name: row.user.name,
          organization: row.organization.name,
          country: row.memberState.name,
        }))}
        standardRequests={standardRequests.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          organizationId: row.organizationId,
          memberStateId: row.memberStateId,
          organization: row.organization.name,
          country: row.memberState.name,
          note: row.note,
          standardIds: row.items.map((item) => item.standardId),
        }))}
        activity={activity.map((row) => ({
          id: row.id,
          at: row.occurredAt.toISOString(),
          action: row.action,
          role: row.roleCode,
          person: row.user?.email || "",
          organization: row.organization?.name || "",
          standard: row.standard?.designation || "",
          language: row.language,
          posting: row.posting ? `${row.posting.kind} ${row.posting.countryIso2} ${row.posting.officeName}` : "",
        }))}
        audits={audits.map((row) => ({
          id: row.id,
          at: row.occurredAt.toISOString(),
          action: row.action,
          person: row.email,
        }))}
        filters={sp}
      />
  );
}
