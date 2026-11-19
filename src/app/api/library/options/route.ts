import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth";
import { loadLibraryInstitutions, userLibraryView } from "@/lib/library";
import { standardVersionHasText } from "@/lib/library-text";
import { publishedLocales, standardKindOrNull, standardKindQuery } from "@/lib/standard-kinds";

/** Default and maximum rows per response; callers that page pass `page` + `pageSize`. */
const PAGE = 200;
const NUMBER_LIMIT = 100;

const published = { versions: { some: { publicationStatus: "PUBLISHED" as const } } };

const standardSelect = {
  id: true,
  designation: true,
  titleEn: true,
  titleFr: true,
  titlePt: true,
  titleAr: true,
  kind: true,
  technicalCommittee: {
    select: {
      id: true,
      code: true,
      name: true,
      sector: { select: { id: true, code: true, name: true } },
    },
  },
  versions: {
    where: { publicationStatus: "PUBLISHED" as const },
    orderBy: { year: "desc" as const },
    take: 1,
    select: {
      sourcePdfUri: true,
      authoritativeLocale: true,
      languageFiles: { select: { locale: true, sourcePdfUri: true } },
    },
  },
} as const;

function textMatch(q: string) {
  return {
    OR: [
      { designation: { contains: q, mode: "insensitive" as const } },
      { titleEn: { contains: q, mode: "insensitive" as const } },
      { titleFr: { contains: q, mode: "insensitive" as const } },
      { titlePt: { contains: q, mode: "insensitive" as const } },
      { titleAr: { contains: q, mode: "insensitive" as const } },
      { technicalCommittee: { code: { contains: q, mode: "insensitive" as const } } },
      { technicalCommittee: { name: { contains: q, mode: "insensitive" as const } } },
      { technicalCommittee: { scope: { contains: q, mode: "insensitive" as const } } },
    ],
  };
}

function listingWhere(opts: { q: string; sectorId: string; committeeId: string; kind: string; scope: object }) {
  const unassigned = opts.sectorId === "unassigned" || opts.committeeId === "unassigned";
  return {
    ...opts.scope,
    ...(opts.kind ? { kind: { in: standardKindQuery(opts.kind) } } : {}),
    ...(unassigned
      ? { technicalCommitteeId: null }
      : opts.committeeId
        ? { technicalCommitteeId: opts.committeeId }
        : opts.sectorId
          ? { technicalCommittee: { sectorId: opts.sectorId } }
          : {}),
    ...(opts.q.length >= 2 ? textMatch(opts.q) : {}),
  };
}

/** Institutions, catalogue facets, and a page of published standards. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const sectorId = req.nextUrl.searchParams.get("sector")?.trim() || "";
  const committeeId = req.nextUrl.searchParams.get("committee")?.trim() || "";
  const kindValues = standardKindQuery(req.nextUrl.searchParams.get("kind"));
  const kind = kindValues[0] || "";
  const browse = req.nextUrl.searchParams.get("browse") === "1" || q.length >= 2 || Boolean(sectorId || committeeId || kind);
  const page = Math.max(1, Math.floor(Number(req.nextUrl.searchParams.get("page"))) || 1);
  const pageSize = Math.min(PAGE, Math.max(1, Math.floor(Number(req.nextUrl.searchParams.get("pageSize"))) || PAGE));
  const lang = req.nextUrl.searchParams.get("lang") || "en";
  const locale: Locale = isLocale(lang) ? lang : "en";
  const numbers = [
    ...new Set(
      (req.nextUrl.searchParams.get("numbers") || "")
        .split(/[\n,;]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ].slice(0, NUMBER_LIMIT);

  // `holdings=1`: only what the signed-in library user may download (full access, or released standards).
  let scope: object = published;
  const holdings = req.nextUrl.searchParams.get("holdings") === "1";
  if (holdings) {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Sign in to view your holdings" }, { status: 401 });
    const view = await userLibraryView(session.userId);
    if (!view.access.length) return NextResponse.json({ error: "No library access" }, { status: 403 });
    if (!view.full) scope = { ...published, id: { in: view.releasedIds } };
  }

  const [institutions, standardCount, sectorRows, committees, kindGroups, searched, numbered] = await Promise.all([
    holdings ? Promise.resolve([]) : loadLibraryInstitutions(),
    prisma.standard.count({ where: scope }),
    prisma.sector.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.technicalCommittee.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        scope: true,
        secretariat: { select: { iso2: true, name: true } },
        sector: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.standard.groupBy({
      by: ["technicalCommitteeId", "kind"],
      where: scope,
      _count: { _all: true },
    }),
    browse
      ? Promise.all([
          prisma.standard.findMany({
            where: listingWhere({ q, sectorId, committeeId, kind, scope }),
            orderBy: { designation: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: standardSelect,
          }),
          prisma.standard.count({ where: listingWhere({ q, sectorId, committeeId, kind, scope }) }),
        ])
      : Promise.resolve([[], 0] as const),
    numbers.length
      ? prisma.standard.findMany({
          where: {
            ...published,
            OR: numbers.map((designation) => ({ designation: { equals: designation, mode: "insensitive" as const } })),
          },
          orderBy: { designation: "asc" },
          select: standardSelect,
        })
      : Promise.resolve([]),
  ]);

  const found = new Set(numbered.map((standard) => standard.designation.toLowerCase()));
  const missing = numbers.filter((number) => !found.has(number.toLowerCase()));
  const [standards, matchCount] = searched;

  return NextResponse.json({
    standardCount,
    matchCount,
    missing,
    facets: buildFacets(sectorRows, committees, kindGroups),
    standards: standards.map((standard) => shape(standard, locale, holdings)),
    page,
    pageSize,
    numbered: numbered.map((standard) => shape(standard, locale, false)),
    institutions: institutions.map((org) => ({
      id: org.id,
      name: org.name,
      countries:
        org.backing === "PRIVATE"
          ? org.operatingCountries.map((row) => ({ id: row.memberState.id, name: row.memberState.name }))
          : org.memberState
            ? [{ id: org.memberState.id, name: org.memberState.name }]
            : [],
    })),
  });
}

function buildFacets(
  sectorRows: Array<{ id: string; code: string; name: string }>,
  committees: Array<{
    id: string;
    code: string;
    name: string;
    scope: string;
    secretariat: { iso2: string; name: string } | null;
    sector: { id: string; code: string; name: string };
  }>,
  groups: Array<{ technicalCommitteeId: string | null; kind: string; _count: { _all: number } }>,
) {
  const byCommittee = new Map(committees.map((committee) => [committee.id, committee]));
  const sectors = new Map(sectorRows.map((sector) => [sector.id, sector]));
  const usedCommittees = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      sectorId: string;
      scope: string;
      secretariatName: string;
      secretariatIso2: string;
    }
  >();
  for (const committee of committees) {
    sectors.set(committee.sector.id, committee.sector);
    usedCommittees.set(committee.id, {
      id: committee.id,
      code: committee.code,
      name: committee.name,
      sectorId: committee.sector.id,
      scope: committee.scope,
      secretariatName: committee.secretariat?.name || "",
      secretariatIso2: committee.secretariat?.iso2 || "",
    });
  }
  const counts = new Map<string, { sectorId: string; committeeId: string; kind: string; count: number }>();

  for (const group of groups) {
    const committee = group.technicalCommitteeId ? byCommittee.get(group.technicalCommitteeId) : undefined;
    const sectorId = committee?.sector.id || "unassigned";
    const committeeId = committee?.id || "unassigned";
    const kind = standardKindOrNull(group.kind) || group.kind || "PRODUCT";
    const key = `${sectorId}|${committeeId}|${kind}`;
    const existing = counts.get(key);
    if (existing) existing.count += group._count._all;
    else counts.set(key, { sectorId, committeeId, kind, count: group._count._all });
  }

  const countRows = [...counts.values()];

  if (countRows.some((row) => row.sectorId === "unassigned")) {
    sectors.set("unassigned", { id: "unassigned", code: "", name: "Not yet classified" });
    usedCommittees.set("unassigned", {
      id: "unassigned",
      code: "",
      name: "Not yet classified",
      sectorId: "unassigned",
      scope: "",
      secretariatName: "",
      secretariatIso2: "",
    });
  }

  const byCode = (a: { code: string; name: string }, b: { code: string; name: string }) => {
    if (!a.code && b.code) return 1;
    if (a.code && !b.code) return -1;
    return a.code.localeCompare(b.code) || a.name.localeCompare(b.name);
  };

  return {
    sectors: [...sectors.values()].sort(byCode),
    committees: [...usedCommittees.values()].sort(byCode),
    counts: countRows,
  };
}

function titleFor(
  standard: { titleEn: string; titleFr: string | null; titlePt: string | null; titleAr: string | null },
  locale: Locale,
) {
  if (locale === "fr" && standard.titleFr) return standard.titleFr;
  if (locale === "pt" && standard.titlePt) return standard.titlePt;
  if (locale === "ar" && standard.titleAr) return standard.titleAr;
  return standard.titleEn;
}

function shape(
  standard: {
    id: string;
    designation: string;
    titleEn: string;
    titleFr: string | null;
    titlePt: string | null;
    titleAr: string | null;
    kind: string;
    technicalCommittee: {
      id: string;
      code: string;
      name: string;
      sector: { id: string; code: string; name: string };
    } | null;
    versions: Array<{
      sourcePdfUri: string | null;
      authoritativeLocale: string;
      languageFiles: Array<{ locale: string; sourcePdfUri: string | null }>;
    }>;
  },
  locale: Locale,
  withLanguages: boolean,
) {
  const committee = standard.technicalCommittee;
  return {
    id: standard.id,
    designation: standard.designation,
    titleEn: titleFor(standard, locale),
    title: titleFor(standard, locale),
    committee: committee?.code || "",
    kind: standardKindOrNull(standard.kind) || standard.kind || "PRODUCT",
    sectorId: committee?.sector.id || "unassigned",
    sectorCode: committee?.sector.code || "",
    sectorName: committee?.sector.name || "Not yet classified",
    committeeId: committee?.id || "unassigned",
    committeeCode: committee?.code || "",
    committeeName: committee?.name || "Not yet classified",
    hasText: standardVersionHasText(standard.versions[0] || {}),
    ...(withLanguages && standard.versions[0]
      ? {
          languages: publishedLocales(
            standard.versions[0].languageFiles,
            standard.versions[0].authoritativeLocale,
            standard.versions[0].sourcePdfUri,
          ).map((code) => ({ code, href: `/api/library/standards/${standard.id}/file?lang=${code}` })),
        }
      : {}),
  };
}
