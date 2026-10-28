import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { adoptionRate, LANGUAGE_FILE_FIELDS, publishedLocales, STANDARD_KINDS, standardKindLabel } from "@/lib/standard-kinds";
import { getPesapalConfig } from "@/lib/pesapal";
import { getCatalogPreviewPayload } from "@/lib/store-preview-server";
import { webstoreListingLabel } from "@/lib/catalog-access";
import { StoreCatalogItem } from "./store-catalog-item";
import { StorePreviewOverlay } from "./store-preview-overlay";

function titleFor(
  standard: { titleEn: string; titleFr: string | null; titlePt: string | null; titleAr: string | null },
  locale: Locale,
) {
  if (locale === "fr" && standard.titleFr) return standard.titleFr;
  if (locale === "pt" && standard.titlePt) return standard.titlePt;
  if (locale === "ar" && standard.titleAr) return standard.titleAr;
  return standard.titleEn;
}

export async function CatalogueView({
  locale,
  sp,
  mode,
}: {
  locale: Locale;
  sp: { preview?: string; payError?: string; lang?: string; q?: string; sector?: string; committee?: string; kind?: string };
  mode: "catalogue" | "store";
}) {
  const previewId = sp.preview?.trim();
  const payError = sp.payError?.trim().slice(0, 180) || "";
  const q = sp.q?.trim() || "";
  const sectorId = sp.sector?.trim() || "";
  const committeeId = sp.committee?.trim() || "";
  const kind = STANDARD_KINDS.some((item) => item.value === sp.kind) ? sp.kind! : "";

  const pesapal = getPesapalConfig();
  const pesapalReady = pesapal.configured && pesapal.appBaseUrl.startsWith("https://");

  const [standards, memberStateTotal, sectors] = await Promise.all([
    prisma.standard.findMany({
      where: {
        versions: { some: { publicationStatus: "PUBLISHED" } },
        ...(kind ? { kind } : {}),
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
                { ics: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        technicalCommittee: { include: { sector: true } },
        adoptions: { include: { memberState: true } },
        versions: {
          where: { publicationStatus: "PUBLISHED" },
          orderBy: { year: "desc" },
          take: 1,
          include: { catalogItem: true, languageFiles: true },
        },
      },
      orderBy: { designation: "asc" },
    }),
    prisma.memberState.count(),
    prisma.sector.findMany({
      include: { committees: { orderBy: { code: "asc" } } },
      orderBy: { code: "asc" },
    }),
  ]);

  const previewPayload = previewId ? await getCatalogPreviewPayload(previewId, sp.lang) : null;
  const languageName = (code: string) =>
    t(locale, code === "fr" ? "French" : code === "pt" ? "Portuguese" : code === "ar" ? "Arabic" : "English");

  type StandardRow = (typeof standards)[number];
  const committeesForSector = sectorId
    ? sectors.find((sector) => sector.id === sectorId)?.committees || []
    : sectors.flatMap((sector) => sector.committees);

  const groups = new Map<
    string,
    {
      code: string;
      name: string;
      count: number;
      committees: Map<string, { code: string; name: string; rows: StandardRow[] }>;
    }
  >();

  for (const standard of standards) {
    const version = standard.versions[0];
    if (!version) continue;
    if (mode === "store" && !version.catalogItem?.active) continue;
    const committee = standard.technicalCommittee;
    const sectorKey = committee?.sector.id || "unassigned";
    const sectorCode = committee?.sector.code || "";
    const sectorName = committee ? committee.sector.name : "Not yet classified";
    const committeeKey = committee?.id || "unassigned";
    let sectorGroup = groups.get(sectorKey);
    if (!sectorGroup) {
      sectorGroup = { code: sectorCode, name: sectorName, count: 0, committees: new Map() };
      groups.set(sectorKey, sectorGroup);
    }
    let committeeGroup = sectorGroup.committees.get(committeeKey);
    if (!committeeGroup) {
      committeeGroup = {
        code: committee?.code || "",
        name: committee?.name || "Not yet classified",
        rows: [],
      };
      sectorGroup.committees.set(committeeKey, committeeGroup);
    }
    committeeGroup.rows.push(standard);
    sectorGroup.count += 1;
  }

  const orderedGroups = [...groups.entries()].sort((a, b) => {
    if (a[0] === "unassigned") return 1;
    if (b[0] === "unassigned") return -1;
    return a[1].code.localeCompare(b[1].code) || a[1].name.localeCompare(b[1].name);
  });

  return (
    <div className="shell py-10">
      {previewPayload ? (
        <StorePreviewOverlay locale={locale} data={previewPayload} />
      ) : previewId ? (
        <div className="mb-4 rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Preview not found for that catalog item. Choose a standard below.
        </div>
      ) : null}
      {payError ? (
        <div className="mb-4 rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {payError}
        </div>
      ) : null}

      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        {t(locale, mode === "catalogue" ? "catalogueTitle" : "storeTitle")}
      </h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        {mode === "catalogue"
          ? "Published standards, grouped by sector and then by technical committee."
          : "Add published standards to your cart, then pay for them together. A standard is listed here only after it is published to the webstore."}
      </p>
      <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" method="get" action={`/${locale}/${mode === "catalogue" ? "catalogue" : "store"}`}>
        <label className="grid gap-1 text-sm">
          <span>Search</span>
          <input name="q" defaultValue={q} placeholder="Designation, title, or ICS" className="rounded-md border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Sector</span>
          <select name="sector" defaultValue={sectorId} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
            <option value="">All sectors</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.code} — {sector.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Technical committee</span>
          <select name="committee" defaultValue={committeeId} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
            <option value="">All committees</option>
            {committeesForSector.map((committee) => (
              <option key={committee.id} value={committee.id}>
                {committee.code} — {committee.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Kind</span>
          <select name="kind" defaultValue={kind} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
            <option value="">All kinds</option>
            {STANDARD_KINDS.map((item) => (
              <option key={item.value} value={item.value}>
                {standardKindLabel(item.value, locale)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white sm:col-span-2 lg:col-span-1">
          Apply
        </button>
      </form>

      {mode === "store" ? (
        <p className="mt-6 max-w-2xl rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          {pesapalReady
            ? `Choose a language and add each priced standard to the cart. Cart checkout is paid with Pesapal (${pesapal.env}). On the next page press Proceed and approve the M-Pesa prompt, or pay by card. Each file is released after Pesapal confirms payment. A free standard opens on screen, and a download is offered only when that standard is marked free to download.`
            : "Pesapal is not ready on this server yet. Add the merchant key and secret and a public https address, then restart. You can still collect priced standards in the cart, but payment cannot start. Free standards can still be opened from this page."}
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
          {orderedGroups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-[var(--muted)]">
              {mode === "store"
                ? "No standards are for sale with those filters. Publish a standard to the webstore to list it here."
                : "No published standards match those filters."}
            </p>
          ) : (
            orderedGroups.map(([sectorKey, sector]) => (
              <section key={sectorKey} className="space-y-4">
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  {sector.code ? `${sector.code} — ${sector.name}` : sector.name}
                  <span className="ml-2 text-base text-[var(--muted)]">
                    {sector.count} standard{sector.count === 1 ? "" : "s"}
                  </span>
                </h2>
                {[...sector.committees.values()]
                  .sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name))
                  .map((committee) => (
                    <div key={`${sectorKey}-${committee.code}-${committee.name}`} className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {committee.code ? `${committee.code} — ${committee.name}` : committee.name}
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {committee.rows.map((standard) => {
                        const version = standard.versions[0];
                        const item = mode === "store" && version.catalogItem?.active ? version.catalogItem : null;
                        const rate = adoptionRate(standard.adoptions.length, memberStateTotal);
                        const title = titleFor(standard, locale);
                        if (!item) {
                          return (
                            <article key={standard.id} className="rounded-xl border border-[var(--line)] p-4">
                              <p className="font-mono text-sm">{standard.designation}</p>
                              <h4 className="mt-1 font-medium">{title}</h4>
                              <p className="mt-1 text-sm text-[var(--muted)]">
                                {version.editionLabel} · ICS {standard.ics} · {standardKindLabel(standard.kind, locale)} · adopted by {rate.adopted} of {rate.total} ({rate.percent}%)
                              </p>
                            </article>
                          );
                        }
                        const published = new Set(
                          publishedLocales(version.languageFiles, version.authoritativeLocale, version.sourcePdfUri),
                        );
                        const languages = LANGUAGE_FILE_FIELDS.map((language) => ({
                          locale: language.locale,
                          label: languageName(language.locale),
                          published: published.has(language.locale),
                        }));
                        return (
                          <StoreCatalogItem
                            key={standard.id}
                            locale={locale}
                            catalogItemId={item.id}
                            editionLabel={version.editionLabel}
                            coverTitle={title}
                            scopeEn={version.scopeEn}
                            priceLabel={webstoreListingLabel(item)}
                            priceCents={item.priceCents}
                            currency={item.currency}
                            distribution={item.distribution}
                            languages={languages}
                            kindLabel={standardKindLabel(standard.kind, locale)}
                            sectorName={standard.technicalCommittee?.sector.name ?? null}
                            committeeName={
                              standard.technicalCommittee
                                ? `${standard.technicalCommittee.code} — ${standard.technicalCommittee.name}`
                                : null
                            }
                            adopted={rate.adopted}
                            adoptionTotal={rate.total}
                            adoptionPercent={rate.percent}
                            adoptingCountries={standard.adoptions.map((adoption) => adoption.memberState.name)}
                          />
                        );
                      })}
                      </div>
                    </div>
                  ))}
              </section>
            ))
          )}
      </div>
    </div>
  );
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ preview?: string; payError?: string; lang?: string; q?: string; sector?: string; committee?: string; kind?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <CatalogueView locale={raw} sp={await searchParams} mode="store" />;
}
