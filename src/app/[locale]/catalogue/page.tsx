import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n";
import { listPublicCatalogue } from "@/lib/catalogue-list";
import { ScopeReveal } from "@/components/scope-reveal";
export default async function CataloguePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; sector?: string; committee?: string; tariff?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const [rows, sectors] = await Promise.all([
    listPublicCatalogue(locale, sp),
    prisma.sector.findMany({ include: { committees: { orderBy: { code: "asc" } } }, orderBy: { code: "asc" } }),
  ]);
  const sectorId = sp.sector?.trim() || "";
  const committees = sectorId
    ? sectors.find((sector) => sector.id === sectorId)?.committees || []
    : sectors.flatMap((sector) => sector.committees);
  const query = new URLSearchParams();
  if (sp.q) query.set("q", sp.q);
  if (sp.sector) query.set("sector", sp.sector);
  if (sp.committee) query.set("committee", sp.committee);
  if (sp.tariff) query.set("tariff", sp.tariff);
  query.set("locale", locale);
  const exportQuery = query.toString();

  return (
    <div className="shell py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Catalogue of African standards</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Published standards. This list shows the number, name, scope, sector, technical committee, and tariff lines.
      </p>
      <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="grid gap-1 text-sm">
          <span>Search</span>
          <input name="q" defaultValue={sp.q || ""} placeholder="Number, name, or scope" className="rounded-md border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Sector</span>
          <select name="sector" defaultValue={sectorId} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
            <option value="">All sectors</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.code} — {sector.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Technical committee</span>
          <select name="committee" defaultValue={sp.committee || ""} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
            <option value="">All committees</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.id}>{committee.code} — {committee.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Tariff line</span>
          <input name="tariff" defaultValue={sp.tariff || ""} placeholder="Code or description" className="rounded-md border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <button type="submit" className="self-end rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">Apply</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <a className="underline" href={`/api/catalogue/export?format=csv&${exportQuery}`}>Download CSV</a>
        <a className="underline" href={`/api/catalogue/export?format=pdf&${exportQuery}`}>Download PDF</a>
        <span className="text-[var(--muted)]">{rows.length} standard{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Scope</th>
              <th className="px-3 py-2">Sector</th>
              <th className="px-3 py-2">Technical committee</th>
              <th className="px-3 py-2">Tariff lines</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">No published standards match those filters.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)] align-top">
                  <td className="px-3 py-2 font-mono">{row.number}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2"><ScopeReveal text={row.scope} /></td>
                  <td className="px-3 py-2">{row.sector}</td>
                  <td className="px-3 py-2">{row.committee}</td>
                  <td className="px-3 py-2">{row.tariffLines}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        To buy a copy, use the <Link className="underline" href={`/${locale}/store`}>webstore</Link>.
      </p>
    </div>
  );
}
