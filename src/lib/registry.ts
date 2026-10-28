/**
 * Public certified-products registry.
 * A product is certified against a standard (via CertificationApplication → CoC).
 * Standards may map to many tariff lines (StandardTariffMap).
 */
import { prisma } from "@/lib/db";
import { countryByIso2, countriesGroupedByRegion } from "@/lib/africa-regions";
import { importedRegistryRows } from "@/lib/imported-marks";

export type MarkFilter = "ALL" | "QUALITY" | "ECO" | "BOTH";
export type StatusFilter = "ALL" | "certified" | "expired" | "suspended" | "withdrawn";

export type RegistryProduct = {
  id: string;
  productName: string;
  commodity: string;
  companyName: string;
  countryIso2: string;
  countryName: string;
  regionId: string | null;
  regionLabel: string | null;
  certificateNo: string;
  status: string;
  markScheme: string; // QUALITY | ECO | BOTH (when dual grants)
  marks: Array<"QUALITY" | "ECO">;
  issuedAt: string;
  expiresAt: string;
  certificates: Array<{
    certificateNo: string;
    status: string;
    markScheme: "QUALITY" | "ECO";
    issuedAt: string;
    expiresAt: string;
    standard: {
      designation: string;
      editionLabel: string;
      titleEn: string;
      standardVersionId: string;
    };
  }>;
  standard: {
    designation: string;
    editionLabel: string;
    titleEn: string;
    standardVersionId: string;
  };
  tariff: {
    codeDisplay: string;
    description: string;
    rec: string;
  } | null;
  cbName: string;
  pinCode: string | null;
  pinCodes?: string[];
  brand?: string;
};

function markListFromCoc(markScheme: string, grants: Array<{ markScheme: string; status: string }>) {
  const marks = new Set<"QUALITY" | "ECO">();
  if (markScheme === "QUALITY" || markScheme === "ECO") marks.add(markScheme);
  if (markScheme === "BOTH") {
    marks.add("QUALITY");
    marks.add("ECO");
  }
  for (const g of grants) {
    if ((g.markScheme === "QUALITY" || g.markScheme === "ECO") && g.status === "granted") {
      marks.add(g.markScheme);
    }
  }
  return [...marks];
}

export async function listCertifiedProducts(opts: {
  q?: string;
  mark?: MarkFilter;
  status?: StatusFilter;
  country?: string;
  region?: string;
  rec?: string;
  standardVersionId?: string;
  designation?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize || 12));
  const status = opts.status && opts.status !== "ALL" ? opts.status : undefined;
  const country = opts.country?.toUpperCase();
  const rec = opts.rec?.toUpperCase();

  const cocs = await prisma.coC.findMany({
    where: {
      ...(country ? { application: { product: { company: { countryIso2: country } } } } : {}),
    },
    include: {
      markGrants: true,
      pins: { take: 1, orderBy: { issuedAt: "desc" } },
      application: {
        include: {
          organization: true,
          standardVersion: {
            include: {
              standard: true,
              tariffMaps: { include: { tariffLine: { include: { rec: true } } }, take: 3 },
            },
          },
          product: {
            include: {
              company: true,
              tariffLine: { include: { rec: true } },
            },
          },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  const regionGroups = countriesGroupedByRegion();
  const regionLabel = (id: string | null) =>
    id ? regionGroups.find((r) => r.id === id)?.label || id : null;

  const grouped = new Map<string, typeof cocs>();
  for (const coc of cocs) {
    const productId = coc.application.product.id;
    const list = grouped.get(productId) || [];
    list.push(coc);
    grouped.set(productId, list);
  }

  let rows: RegistryProduct[] = [...grouped.values()].map((group) => {
    const ordered = [...group].sort((a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"));
    const primary = ordered.find((row) => row.markScheme === "QUALITY") || ordered[0];
    const product = primary.application.product;
    const company = product.company;
    const countryMeta = countryByIso2(company.countryIso2);
    const marks = new Set<"QUALITY" | "ECO">();
    for (const coc of ordered) {
      for (const mark of markListFromCoc(coc.markScheme, coc.markGrants)) marks.add(mark);
    }
    const markList = [...marks];
    const markScheme = markList.includes("QUALITY") && markList.includes("ECO") ? "BOTH" : markList[0] || primary.markScheme;
    const certificates = ordered.map((coc) => {
      const sv = coc.application.standardVersion;
      const mark = coc.markScheme === "ECO" ? "ECO" : "QUALITY";
      return {
        certificateNo: coc.certificateNo,
        status: coc.status,
        markScheme: mark as "QUALITY" | "ECO",
        issuedAt: coc.issuedAt.toISOString(),
        expiresAt: coc.expiresAt.toISOString(),
        standard: {
          designation: sv.standard.designation,
          editionLabel: sv.editionLabel,
          titleEn: sv.standard.titleEn,
          standardVersionId: sv.id,
        },
      };
    });
    const tariffFromProduct = product.tariffLine;
    const tariffFromMap = ordered.map((coc) => coc.application.standardVersion.tariffMaps[0]?.tariffLine).find(Boolean);
    const tariff = tariffFromProduct || tariffFromMap || null;
    return {
      id: product.id,
      productName: product.name,
      commodity: product.commodity,
      companyName: company.legalName,
      countryIso2: company.countryIso2,
      countryName: countryMeta?.name || company.countryIso2,
      regionId: countryMeta?.region || null,
      regionLabel: regionLabel(countryMeta?.region || null),
      certificateNo: primary.certificateNo,
      status: primary.status,
      markScheme,
      marks: markList,
      issuedAt: primary.issuedAt.toISOString(),
      expiresAt: primary.expiresAt.toISOString(),
      certificates,
      standard: certificates[0].standard,
      tariff: tariff
        ? {
            codeDisplay: tariff.codeDisplay,
            description: tariff.description,
            rec: tariff.rec.code,
          }
        : null,
      cbName: primary.application.organization.name,
      pinCode: ordered.map((coc) => coc.pins[0]?.pinCode).find(Boolean) || null,
      pinCodes: ordered.map((coc) => coc.pins[0]?.pinCode).filter((code): code is string => Boolean(code)),
    };
  });

  rows.push(...(await importedRegistryRows()));

  if (opts.region) {
    const rid = opts.region.toUpperCase();
    rows = rows.filter((r) => r.regionId === rid);
  }

  if (opts.mark && opts.mark !== "ALL") {
    if (opts.mark === "BOTH") {
      rows = rows.filter((r) => r.marks.includes("QUALITY") && r.marks.includes("ECO"));
    } else {
      rows = rows.filter((r) => r.marks.includes(opts.mark as "QUALITY" | "ECO"));
    }
  }

  if (status) {
    rows = rows.filter((r) => r.certificates.some((certificate) => certificate.status === status));
  }
  if (opts.standardVersionId) {
    rows = rows.filter((r) =>
      r.certificates.some((certificate) => certificate.standard.standardVersionId === opts.standardVersionId),
    );
  }
  if (opts.designation) {
    rows = rows.filter((r) =>
      r.certificates.some((certificate) => certificate.standard.designation === opts.designation),
    );
  }
  if (rec) {
    rows = rows.filter((r) => r.tariff?.rec === rec);
  }

  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    rows = rows.filter((r) => {
      const hay = [
        r.productName,
        r.companyName,
        r.commodity,
        r.certificateNo,
        ...r.certificates.flatMap((certificate) => [
          certificate.certificateNo,
          certificate.standard.designation,
          certificate.standard.titleEn,
        ]),
        r.standard.designation,
        r.standard.titleEn,
        r.countryName,
        r.tariff?.codeDisplay,
        r.pinCode,
        r.brand,
        ...(r.pinCodes || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  // Group display order: region order, then country A–Z, then product name
  const regionOrder = Object.fromEntries(regionGroups.map((r, i) => [r.id, i]));
  rows.sort((a, b) => {
    const ra = a.regionId ? regionOrder[a.regionId] ?? 99 : 99;
    const rb = b.regionId ? regionOrder[b.regionId] ?? 99 : 99;
    if (ra !== rb) return ra - rb;
    const cn = a.countryName.localeCompare(b.countryName);
    if (cn !== 0) return cn;
    return a.productName.localeCompare(b.productName);
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    products: pageRows,
    countries: countriesGroupedByRegion(),
    counts: {
      certified: rows.filter((r) => r.status === "certified").length,
      quality: rows.filter((r) => r.marks.includes("QUALITY")).length,
      eco: rows.filter((r) => r.marks.includes("ECO")).length,
      both: rows.filter((r) => r.marks.includes("QUALITY") && r.marks.includes("ECO")).length,
    },
  };
}
