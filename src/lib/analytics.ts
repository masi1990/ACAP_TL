import { prisma } from "@/lib/db";
import { AFRICA_REGIONS, countryByIso2 } from "@/lib/africa-regions";

export type AnalyticsPayload = {
  public: {
    certified: number;
    quality: number;
    eco: number;
    both: number;
    regions: Array<{ id: string; label: string; products: number }>;
  };
  pipeline?: {
    rows: Array<{ status: string; markScheme: string; count: number }>;
  };
  operations?: {
    standards: number;
    maps: number;
    certificates: number;
    pins: number;
    orders: number;
    outbox: number;
    audits: number;
  };
};

export async function publicAnalytics(): Promise<AnalyticsPayload["public"]> {
  const cocs = await prisma.coC.findMany({
    where: { status: "certified" },
    select: {
      markScheme: true,
      application: {
        select: {
          productId: true,
          product: { select: { company: { select: { countryIso2: true } } } },
        },
      },
    },
  });
  const byProduct = new Map<string, { marks: Set<string>; country: string }>();
  for (const coc of cocs) {
    const id = coc.application.productId;
    const row = byProduct.get(id) || {
      marks: new Set<string>(),
      country: coc.application.product.company.countryIso2,
    };
    if (coc.markScheme === "QUALITY" || coc.markScheme === "ECO") row.marks.add(coc.markScheme);
    byProduct.set(id, row);
  }
  const products = [...byProduct.values()];
  const regionCounts = new Map<string, number>();
  for (const product of products) {
    const region = countryByIso2(product.country)?.region || "OTHER";
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
  }
  return {
    certified: products.length,
    quality: products.filter((product) => product.marks.has("QUALITY")).length,
    eco: products.filter((product) => product.marks.has("ECO")).length,
    both: products.filter((product) => product.marks.has("QUALITY") && product.marks.has("ECO")).length,
    regions: [
      ...AFRICA_REGIONS.map((region) => ({
        id: region.id,
        label: region.label,
        products: regionCounts.get(region.id) || 0,
      })),
      ...(regionCounts.get("OTHER")
        ? [{ id: "OTHER", label: "Other", products: regionCounts.get("OTHER") || 0 }]
        : []),
    ],
  };
}

export async function pipelineAnalytics() {
  const rows = await prisma.certificationApplication.groupBy({
    by: ["status", "markScheme"],
    _count: { _all: true },
  });
  return {
    rows: rows.map((row) => ({
      status: row.status,
      markScheme: row.markScheme,
      count: row._count._all,
    })),
  };
}

export async function operationsAnalytics() {
  const [standards, maps, certificates, pins, orders, outbox, audits] = await Promise.all([
    prisma.standardVersion.count(),
    prisma.standardTariffMap.count(),
    prisma.coC.count(),
    prisma.productPin.count(),
    prisma.order.count({ where: { status: "FULFILLED" } }),
    prisma.webhookOutbox.count(),
    prisma.auditEvent.count(),
  ]);
  return { standards, maps, certificates, pins, orders, outbox, audits };
}
