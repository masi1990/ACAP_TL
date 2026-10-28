import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadLibraryInstitutions } from "@/lib/library";

const PAGE = 30;
const NUMBER_LIMIT = 100;

function publishedWhere(q: string) {
  return {
    versions: { some: { publicationStatus: "PUBLISHED" } },
    OR: [
      { designation: { contains: q, mode: "insensitive" as const } },
      { titleEn: { contains: q, mode: "insensitive" as const } },
      { titleFr: { contains: q, mode: "insensitive" as const } },
      { titlePt: { contains: q, mode: "insensitive" as const } },
      { titleAr: { contains: q, mode: "insensitive" as const } },
      { technicalCommittee: { code: { contains: q, mode: "insensitive" as const } } },
      { technicalCommittee: { name: { contains: q, mode: "insensitive" as const } } },
    ],
  };
}

/** Institutions, plus a searched page of published standards. The full catalogue is not sent. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const numbers = [
    ...new Set(
      (req.nextUrl.searchParams.get("numbers") || "")
        .split(/[\n,;]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ].slice(0, NUMBER_LIMIT);

  const [institutions, standardCount, searched, numbered] = await Promise.all([
    loadLibraryInstitutions(),
    prisma.standard.count({ where: { versions: { some: { publicationStatus: "PUBLISHED" } } } }),
    q.length >= 2
      ? Promise.all([
          prisma.standard.findMany({
            where: publishedWhere(q),
            orderBy: { designation: "asc" },
            take: PAGE,
            select: {
              id: true,
              designation: true,
              titleEn: true,
              technicalCommittee: { select: { code: true } },
            },
          }),
          prisma.standard.count({ where: publishedWhere(q) }),
        ])
      : Promise.resolve([[], 0] as const),
    numbers.length
      ? prisma.standard.findMany({
          where: {
            versions: { some: { publicationStatus: "PUBLISHED" } },
            OR: numbers.map((designation) => ({ designation: { equals: designation, mode: "insensitive" as const } })),
          },
          orderBy: { designation: "asc" },
          select: {
            id: true,
            designation: true,
            titleEn: true,
            technicalCommittee: { select: { code: true } },
          },
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
    standards: standards.map(shape),
    numbered: numbered.map(shape),
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

function shape(standard: {
  id: string;
  designation: string;
  titleEn: string;
  technicalCommittee: { code: string } | null;
}) {
  return {
    id: standard.id,
    designation: standard.designation,
    titleEn: standard.titleEn,
    committee: standard.technicalCommittee?.code || "",
  };
}
