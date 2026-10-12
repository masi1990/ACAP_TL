import { PrismaClient } from "@prisma/client";
import { extractClause1ScopeOnly } from "../src/lib/scope-text";

const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.standardVersion.findMany();
  for (const r of rows) {
    const next = extractClause1ScopeOnly(r.scopeEn);
    console.log(r.editionLabel, "before", r.scopeEn.length, "after", next.length);
    console.log(" sample:", JSON.stringify(next.slice(0, 180)));
    let machine: Record<string, unknown> = {};
    try { machine = JSON.parse(r.machineDocJson); } catch { /* */ }
    const nextMachine = { ...machine, scope: { text: { en: next } } };
    await prisma.standardVersion.update({
      where: { id: r.id },
      data: { scopeEn: next, machineDocJson: JSON.stringify(nextMachine) },
    });
  }
}
main().finally(() => prisma.$disconnect());
