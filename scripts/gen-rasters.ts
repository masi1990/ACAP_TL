import { PrismaClient } from "@prisma/client";
import { ensureStandardPreviewRasters } from "../src/lib/preview-raster";

const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.standardVersion.findMany({ include: { standard: true } });
  for (const r of rows) {
    console.log("raster", r.standard.designation, r.id, r.sourcePdfUri);
    try {
      const res = await ensureStandardPreviewRasters({
        standardVersionId: r.id,
        sourcePdfUri: r.sourcePdfUri,
      });
      console.log(" ->", res ? `${res.manifest.pages.length} pages @ ${res.baseUrl}` : "null");
      if (res) console.log("    labels", res.manifest.pages.slice(0, 8).map((p) => `${p.access}:${p.label}`));
    } catch (e) {
      console.error(" fail", e);
    }
  }
}
main().finally(() => prisma.$disconnect());
