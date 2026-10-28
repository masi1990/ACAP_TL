import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db";
import { extractClause1ScopeOnly } from "@/lib/scope-text";
import type { Locale } from "@/lib/i18n";

export type CatalogueFilters = {
  q?: string;
  sector?: string;
  committee?: string;
  tariff?: string;
};

export type CatalogueRow = {
  id: string;
  number: string;
  name: string;
  scope: string;
  sector: string;
  committee: string;
  tariffLines: string;
};

function titleFor(
  standard: { titleEn: string; titleFr: string | null; titlePt: string | null; titleAr: string | null },
  locale: Locale,
) {
  if (locale === "fr" && standard.titleFr) return standard.titleFr;
  if (locale === "pt" && standard.titlePt) return standard.titlePt;
  if (locale === "ar" && standard.titleAr) return standard.titleAr;
  return standard.titleEn;
}

export async function listPublicCatalogue(locale: Locale, filters: CatalogueFilters): Promise<CatalogueRow[]> {
  const q = filters.q?.trim() || "";
  const sectorId = filters.sector?.trim() || "";
  const committeeId = filters.committee?.trim() || "";
  const tariff = filters.tariff?.trim() || "";

  const standards = await prisma.standard.findMany({
    where: {
      versions: { some: { publicationStatus: "PUBLISHED" } },
      ...(committeeId ? { technicalCommitteeId: committeeId } : {}),
      ...(sectorId ? { technicalCommittee: { sectorId } } : {}),
      ...(q
        ? {
            OR: [
              { designation: { contains: q, mode: "insensitive" } },
              { titleEn: { contains: q, mode: "insensitive" } },
              { titleFr: { contains: q, mode: "insensitive" } },
              { titlePt: { contains: q, mode: "insensitive" } },
              { titleAr: { contains: q, mode: "insensitive" } },
              { versions: { some: { publicationStatus: "PUBLISHED", scopeEn: { contains: q, mode: "insensitive" } } } },
              {
                versions: {
                  some: {
                    publicationStatus: "PUBLISHED",
                    tariffMaps: {
                      some: {
                        OR: [
                          { tariffLine: { codeDisplay: { contains: q, mode: "insensitive" } } },
                          { tariffLine: { description: { contains: q, mode: "insensitive" } } },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      technicalCommittee: { include: { sector: true } },
      versions: {
        where: { publicationStatus: "PUBLISHED" },
        orderBy: { year: "desc" },
        take: 1,
        include: { tariffMaps: { include: { tariffLine: true } } },
      },
    },
    orderBy: { designation: "asc" },
  });

  const needle = tariff.toLowerCase();
  return standards.flatMap((standard) => {
    const version = standard.versions[0];
    if (!version) return [];
    const lines = version.tariffMaps.map((map) => map.tariffLine.codeDisplay);
    const descriptions = version.tariffMaps.map((map) => map.tariffLine.description);
    if (
      needle &&
      !lines.some((line) => line.toLowerCase().includes(needle)) &&
      !descriptions.some((line) => line.toLowerCase().includes(needle))
    ) {
      return [];
    }
    const committee = standard.technicalCommittee;
    return [
      {
        id: standard.id,
        number: standard.designation,
        name: titleFor(standard, locale),
        scope: extractClause1ScopeOnly(version.scopeEn),
        sector: committee ? `${committee.sector.code} — ${committee.sector.name}` : "",
        committee: committee ? `${committee.code} — ${committee.name}` : "",
        tariffLines: lines.join("; "),
      },
    ];
  });
}

export function catalogueCsv(rows: CatalogueRow[]) {
  const header = ["Number", "Name", "Scope", "Sector", "Technical committee", "Tariff lines"];
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [header, ...rows.map((row) => [row.number, row.name, row.scope, row.sector, row.committee, row.tariffLines])]
    .map((line) => line.map(cell).join(","))
    .join("\n");
}

function ascii(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

/** A table of the public list. This is not a standard document. */
export async function cataloguePdf(rows: CatalogueRow[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([842, 595]);
  let y = 555;
  const line = (text: string, size: number, useBold = false) => {
    if (y < 36) {
      page = doc.addPage([842, 595]);
      y = 555;
    }
    page.drawText(ascii(text).slice(0, 170), {
      x: 28,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.12, 0.12),
    });
    y -= size + 5;
  };
  line("Catalogue of African standards", 14, true);
  y -= 4;
  for (const row of rows) {
    line(`${row.number} — ${row.name}`, 9, true);
    line(`Sector: ${row.sector || "—"}   Technical committee: ${row.committee || "—"}`, 8);
    line(`Tariff lines: ${row.tariffLines || "—"}`, 8);
    line(`Scope: ${row.scope || "—"}`, 8);
    y -= 4;
  }
  return Buffer.from(await doc.save());
}
