import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { resolveTariffStandardsPack } from "@/lib/tariff";
import { extractClause1ScopeOnly } from "@/lib/scope-text";
import { adoptionRate, standardKindLabel } from "@/lib/standard-kinds";
import { Badge } from "@/components/ui/badge";
import { importedProductCountsByStandard } from "@/lib/imported-marks";
import { ScopeReveal } from "@/components/scope-reveal";
import { LookupForm, type LookupRec } from "./lookup-form";

const PAGE_SIZE = 8;

export default async function LookupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ rec?: string; code?: string; page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const requestedRec = (sp.rec || "").toUpperCase();
  const code = (sp.code || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const searching = Boolean(code);

  const [recRows, tariffRows, standardsTotal] = await Promise.all([
    prisma.rec.findMany({ orderBy: { code: "asc" } }),
    prisma.tariffLine.findMany({
      include: { rec: true },
      orderBy: [{ codeLength: "asc" }, { codeNormalized: "asc" }],
    }),
    prisma.standard.count(),
  ]);
  const recs: LookupRec[] = recRows.map((row) => ({ code: row.code, name: row.name }));
  const rec = recs.some((row) => row.code === requestedRec) ? requestedRec : recs[0]?.code || "";
  const tariffResult =
    searching && rec ? await resolveTariffStandardsPack(rec, code, { publicView: true }) : null;

  // Always list standards (paginated). Tariff search narrows to applicable packs.
  type ListedTariff = {
    rec: string;
    codeDisplay: string;
    description: string;
  };
  type ListedStandard = {
    key: string;
    designation: string;
    editionLabel: string;
    titleEn: string;
    ics: string;
    scopeEn: string;
    catalogItemId: string | null;
    standardVersionId: string;
    tariffLines: ListedTariff[];
    certifiedCount?: number;
    kindLabel: string;
    sectorName: string | null;
    committeeName: string | null;
    adopted: number;
    adoptionTotal: number;
    adoptionPercent: number;
    adoptingCountries: string[];
  };

  let listed: ListedStandard[] = [];
  let listTotal = 0;
  let listPageCount = 1;
  let tariffPanel: ReactNode = null;

  if (searching && tariffResult?.ok) {
    listed = tariffResult.packs.map((p) => ({
      key: p.mapId,
      designation: p.standard.designation,
      editionLabel: p.standard.editionLabel,
      titleEn: p.standard.titleEn,
      ics: p.standard.ics,
      scopeEn: extractClause1ScopeOnly(p.standard.scopeEn),
      catalogItemId: p.standard.catalogItemId,
      standardVersionId: p.standard.standardVersionId,
      tariffLines: tariffResult.relatedTariffLines
        .filter((tl) => tl.standardVersionId === p.standard.standardVersionId)
        .map((tl) => ({
          rec: tl.rec,
          codeDisplay: tl.codeDisplay,
          description: tl.description,
        })),
      kindLabel: "",
      sectorName: null,
      committeeName: null,
      adopted: 0,
      adoptionTotal: 0,
      adoptionPercent: 0,
      adoptingCountries: [],
    }));
    listTotal = listed.length;
    listPageCount = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    listed = listed.slice(start, start + PAGE_SIZE);

    tariffPanel = (
      <div className="panel mb-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{tariffResult.rec.code}</Badge>
          <Badge>{tariffResult.matchedLine.codeDisplay}</Badge>
          <Badge tone="ok">HS{tariffResult.matchedLine.codeLength}</Badge>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{tariffResult.matchedLine.description}</p>
        {tariffResult.matchedLine.parentWalked.length > 0 && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Resolved via parent: {tariffResult.matchedLine.parentWalked.join(" → ")}
          </p>
        )}
        {tariffResult.relatedTariffLines.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Linked tariff lines (all RECs) for the same standard(s)
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {tariffResult.relatedTariffLines.map((tl) => (
                <li key={`${tl.rec}-${tl.codeDisplay}-${tl.standardVersionId}`}>
                  <Badge>
                    {tl.rec} {tl.codeDisplay}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  } else if (searching && tariffResult && !tariffResult.ok) {
    tariffPanel = (
      <p className="mb-6 rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-6 text-rose-900">
        {"error" in tariffResult ? tariffResult.error : t(locale, "lookupError")}
      </p>
    );
  } else {
    listTotal = standardsTotal;
    listPageCount = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
    const rows = await prisma.standard.findMany({
      include: {
        versions: {
          orderBy: { year: "desc" },
          take: 1,
          include: {
            catalogItem: true,
            tariffMaps: { include: { tariffLine: { include: { rec: true } } } },
          },
        },
      },
      orderBy: { designation: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    listed = rows.map((r) => {
      const v = r.versions[0];
      return {
        key: r.id,
        designation: r.designation,
        editionLabel: v?.editionLabel || r.designation,
        titleEn: r.titleEn,
        ics: r.ics,
        scopeEn: extractClause1ScopeOnly(v?.scopeEn || ""),
        catalogItemId: v?.catalogItem?.id ?? null,
        standardVersionId: v?.id || "",
        tariffLines: (v?.tariffMaps ?? []).map((m) => ({
          rec: m.tariffLine.rec.code,
          codeDisplay: m.tariffLine.codeDisplay,
          description: m.tariffLine.description,
        })),
        kindLabel: "",
        sectorName: null,
        committeeName: null,
        adopted: 0,
        adoptionTotal: 0,
        adoptionPercent: 0,
        adoptingCountries: [],
      };
    });
  }

  const designations = [...new Set(listed.map((item) => item.designation))];
  const [adoptionRows, memberStateTotal] = await Promise.all([
    designations.length
      ? prisma.standard.findMany({
          where: { designation: { in: designations } },
          include: {
            technicalCommittee: { include: { sector: true } },
            adoptions: { include: { memberState: true }, orderBy: { memberState: { name: "asc" } } },
          },
        })
      : Promise.resolve([]),
    prisma.memberState.count(),
  ]);
  const adoptionByDesignation = new Map(adoptionRows.map((row) => [row.designation, row]));
  listed = listed.map((item) => {
    const row = adoptionByDesignation.get(item.designation);
    const rate = adoptionRate(row?.adoptions.length ?? 0, memberStateTotal);
    return {
      ...item,
      kindLabel: standardKindLabel(row?.kind || "PRODUCT", locale),
      sectorName: row?.technicalCommittee?.sector.name ?? null,
      committeeName: row?.technicalCommittee
        ? `${row.technicalCommittee.code} — ${row.technicalCommittee.name}`
        : null,
      adopted: rate.adopted,
      adoptionTotal: rate.total,
      adoptionPercent: rate.percent,
      adoptingCountries: row?.adoptions.map((adoption) => adoption.memberState.name) ?? [],
    };
  });

  const versionIds = listed.map((s) => s.standardVersionId).filter(Boolean);
  const certGroups = versionIds.length
    ? await prisma.certificationApplication.groupBy({
        by: ["standardVersionId"],
        where: { standardVersionId: { in: versionIds }, coc: { isNot: null } },
        _count: { _all: true },
      })
    : [];
  const certifiedByVersion = new Map(certGroups.map((g) => [g.standardVersionId, g._count._all]));
  const importedCounts = await importedProductCountsByStandard(versionIds);
  listed = listed.map((s) => ({
    ...s,
    certifiedCount:
      (certifiedByVersion.get(s.standardVersionId) ?? 0) + (importedCounts.get(s.standardVersionId) ?? 0),
  }));

  const options = tariffRows.map((l) => ({
    id: l.id,
    rec: l.rec.code,
    codeDisplay: l.codeDisplay,
    codeNormalized: l.codeNormalized,
    codeLength: l.codeLength,
    description: l.description,
  }));

  const defaultCode =
    code ||
    options.find((o) => o.rec === rec)?.codeDisplay ||
    options[0]?.codeDisplay ||
    "";

  function pageHref(nextPage: number) {
    const qs = new URLSearchParams();
    qs.set("rec", rec);
    if (code) qs.set("code", code);
    if (nextPage > 1) qs.set("page", String(nextPage));
    return `/${locale}/lookup?${qs.toString()}`;
  }

  return (
    <div className="shell py-10">
      <div className="rise mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Public customs portal</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
          {t(locale, "lookupTitle")}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{t(locale, "lookupHint")}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Browse African Standards below (name and Scope). Use the tariff dropdown to{" "}
          <strong className="font-medium text-[var(--ink)]">search</strong> which standards apply to a
          given REC / HS line.
        </p>
      </div>

      <LookupForm locale={locale} initialRec={rec} initialCode={defaultCode} options={options} recs={recs} />

      <div className="mt-8">
        {tariffPanel}

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            {searching ? "Applicable standards" : "African Standards"}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {listTotal} standard{listTotal === 1 ? "" : "s"}
            {listPageCount > 1 ? ` · page ${page} of ${listPageCount}` : ""}
          </p>
        </div>

        {listed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-[var(--muted)]">
            {searching
              ? t(locale, "lookupError")
              : "No standards in the catalogue yet. Administrators can import or create them under Admin."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((std) => {
              const previewHref = std.catalogItemId
                ? `/${locale}/store?preview=${encodeURIComponent(std.catalogItemId)}`
                : null;
              return (
                <article key={std.key} className="panel overflow-hidden">
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-4">
                    <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      African Standard · ICS {std.ics}
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                      {std.editionLabel}
                    </h3>
                    <p className="mt-1 text-[var(--ink)]">{std.titleEn}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {t(locale, "Category")}: {std.kindLabel}
                      {std.sectorName ? ` · ${t(locale, "Sector")}: ${std.sectorName}` : ""}
                      {std.committeeName ? ` · ${t(locale, "Technical committee")}: ${std.committeeName}` : ""}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">{t(locale, "Adopted by")} </span>
                      {std.adopted} {t(locale, "of")} {std.adoptionTotal} · {std.adoptionPercent}%
                      <span className="text-[var(--muted)]"> {t(locale, "African Union member states")}</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {std.adoptingCountries.length
                        ? std.adoptingCountries.join(", ")
                        : t(locale, "No adopting countries recorded")}
                    </p>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Tariff line
                      </p>
                      {std.tariffLines.length === 0 ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">No tariff line mapped</p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {std.tariffLines.map((tl) => (
                            <li key={`${std.key}-${tl.rec}-${tl.codeDisplay}`} className="text-sm">
                              <span className="font-mono font-medium">{tl.codeDisplay}</span>
                              <span className="text-[var(--muted)]"> · {tl.rec}</span>
                              {tl.description ? (
                                <span className="text-[var(--muted)]"> — {tl.description}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    </div>
                    <p className="shrink-0 text-right">
                      <span className="block font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--ink)]">
                        {std.certifiedCount ?? 0}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        certified product{(std.certifiedCount ?? 0) === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--muted)]">1 Scope</h4>
                      <div className="mt-2">
                        <ScopeReveal text={std.scopeEn} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {previewHref ? (
                        <Link
                          href={previewHref}
                          className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)]"
                        >
                          View title, contents &amp; Scope
                        </Link>
                      ) : null}
                      <Link
                        href={`/${locale}/registry?designation=${encodeURIComponent(std.designation)}`}
                        className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm"
                      >
                        View certified products
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {listPageCount > 1 && (
          <div className="mt-8 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm"
              >
                Prev
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center px-4 text-sm text-[var(--muted)]">Prev</span>
            )}
            <p className="text-sm text-[var(--muted)]">
              Page {page} of {listPageCount}
            </p>
            {page < listPageCount ? (
              <Link
                href={pageHref(page + 1)}
                className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm"
              >
                Next
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center px-4 text-sm text-[var(--muted)]">Next</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
