import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { standardKindOrNull } from "@/lib/standard-kinds";
import { SectorBoard, type SectorBoardCommittee } from "./sector-board";

export default async function AdminSectorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/sectors`} />;
  if (!can(session.user, "standards:read")) notFound();

  const [rows, countries, groups] = await Promise.all([
    prisma.sector.findMany({
      orderBy: { code: "asc" },
      include: {
        committees: {
          orderBy: { code: "asc" },
          include: { secretariat: { select: { id: true, iso2: true, name: true } } },
        },
      },
    }),
    prisma.memberState.findMany({ orderBy: { name: "asc" }, select: { id: true, iso2: true, name: true } }),
    prisma.standard.groupBy({
      by: ["technicalCommitteeId", "kind"],
      _count: { _all: true },
    }),
  ]);

  const sectors = rows.map((sector) => ({
    id: sector.id,
    code: sector.code,
    name: sector.name,
    committees: sector.committees.map((committee): SectorBoardCommittee => {
      const matches = groups.filter((group) => group.technicalCommitteeId === committee.id);
      const byKind = new Map<string, number>();
      for (const group of matches) {
        const kind = standardKindOrNull(group.kind) || group.kind || "PRODUCT";
        byKind.set(kind, (byKind.get(kind) || 0) + group._count._all);
      }
      return {
        id: committee.id,
        code: committee.code,
        name: committee.name,
        scope: committee.scope,
        sectorId: committee.sectorId,
        standardCount: matches.reduce((sum, group) => sum + group._count._all, 0),
        byKind: [...byKind.entries()].map(([kind, count]) => ({ kind, count })),
        secretariat: committee.secretariat,
      };
    }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Sectors and technical committees</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Open a sector to see its technical committees, their scope, and the African country that holds the secretariat.
        </p>
      </div>
      <SectorBoard
        locale={locale}
        sectors={sectors}
        countries={countries}
        canWrite={can(session.user, "standards:write")}
        canDelete={can(session.user, "standards:delete")}
      />
    </div>
  );
}
