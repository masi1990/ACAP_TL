"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RegistryProduct } from "@/lib/registry";

type CountryGroup = {
  id: string;
  label: string;
  countries: Array<{ iso2: string; name: string }>;
};

type RegistryResponse = {
  ok: boolean;
  total: number;
  page: number;
  pageCount: number;
  products: RegistryProduct[];
  countries: CountryGroup[];
  counts: { certified: number; quality: number; eco: number; both: number };
};

const MARK_TABS = [
  { id: "ALL", label: "All certified products" },
  { id: "ECO", label: "Eco Mark only" },
  { id: "QUALITY", label: "Quality Mark only" },
  { id: "BOTH", label: "Both marks" },
] as const;

export function RegistryClient({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const mark = (searchParams.get("mark") || "ALL").toUpperCase();
  const country = (searchParams.get("country") || "").toUpperCase();
  const region = (searchParams.get("region") || "").toUpperCase();
  const q = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || 1) || 1;
  const designation = searchParams.get("designation") || "";

  const [queryDraft, setQueryDraft] = useState(q);
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setQueryDraft(q);
  }, [q]);

  useEffect(() => {
    const ac = new AbortController();
    const params = new URLSearchParams();
    if (mark && mark !== "ALL") params.set("mark", mark);
    if (country) params.set("country", country);
    if (region) params.set("region", region);
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    if (designation) params.set("designation", designation);
    params.set("pageSize", "12");

    setError(null);
    fetch(`/api/registry/products?${params}`, { signal: ac.signal })
      .then(async (res) => {
        const json = (await res.json()) as RegistryResponse & { error?: string };
        if (!res.ok) throw new Error(json.error || "Failed to load registry");
        setData(json);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load registry");
      });
    return () => ac.abort();
  }, [mark, country, region, q, page, designation]);

  const groupedProducts = useMemo(() => {
    if (!data?.products.length) return [];
    const map = new Map<string, { regionLabel: string; countries: Map<string, RegistryProduct[]> }>();
    for (const p of data.products) {
      const rid = p.regionId || "OTHER";
      const rlabel = p.regionLabel || "Other";
      if (!map.has(rid)) map.set(rid, { regionLabel: rlabel, countries: new Map() });
      const regionBucket = map.get(rid)!;
      const list = regionBucket.countries.get(p.countryName) || [];
      list.push(p);
      regionBucket.countries.set(p.countryName, list);
    }
    return [...map.entries()].map(([regionId, bucket]) => ({
      regionId,
      regionLabel: bucket.regionLabel,
      countries: [...bucket.countries.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([countryName, products]) => ({ countryName, products })),
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {designation && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm">
          <span className="text-[var(--muted)]">
            Filtered by standard <strong className="font-mono text-[var(--ink)]">{designation}</strong>
          </span>
          <button
            type="button"
            className="text-[var(--accent)] underline"
            onClick={() => setParams({ designation: null })}
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: queryDraft.trim() || null });
          }}
        >
          <Input
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            placeholder="Search product, company, certificate, standard…"
            aria-label="Search certified products"
          />
          <Button type="submit" disabled={pending}>
            Search
          </Button>
        </form>

        <select
          className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
          value={region}
          onChange={(e) => setParams({ region: e.target.value || null, country: null })}
          aria-label="Filter by region"
        >
          <option value="">All regions</option>
          {(data?.countries || []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
          value={country}
          onChange={(e) => setParams({ country: e.target.value || null })}
          aria-label="Filter by country"
        >
          <option value="">All countries</option>
          {(data?.countries || []).map((r) => (
            <optgroup key={r.id} label={r.label}>
              {r.countries.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {MARK_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams({ mark: t.id === "ALL" ? null : t.id })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              mark === t.id
                ? "bg-[var(--ink)] text-[var(--bg)]"
                : "border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
            )}
          >
            {t.label}
            {data?.counts && t.id === "ECO" ? ` (${data.counts.eco})` : ""}
            {data?.counts && t.id === "QUALITY" ? ` (${data.counts.quality})` : ""}
            {data?.counts && t.id === "BOTH" ? ` (${data.counts.both})` : ""}
            {data?.counts && t.id === "ALL" ? ` (${data.total})` : ""}
          </button>
        ))}
      </div>

      {data && (
        <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
          <span>
            Total listed: <strong className="text-[var(--ink)]">{data.total}</strong>
          </span>
          <span>
            Currently certified: <strong className="text-[var(--ink)]">{data.counts.certified}</strong>
          </span>
          {pending && <span>Updating…</span>}
        </div>
      )}

      {error && <p className="text-sm text-rose-700">{error}</p>}

      {!data && !error && <p className="text-sm text-[var(--muted)]">Loading products…</p>}

      {data && data.products.length === 0 && (
        <div className="panel p-8 text-center text-sm text-[var(--muted)]">
          No certified products match these filters. Certification bodies publish products here once a
          CoC is issued against an African Standard.
        </div>
      )}

      {groupedProducts.map((regionBucket) => (
        <section key={regionBucket.regionId} className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">{regionBucket.regionLabel}</h2>
          {regionBucket.countries.map((c) => (
            <div key={c.countryName} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {c.countryName}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {c.products.map((p) => (
                  <li key={p.id} className="panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{p.productName}</p>
                        <p className="text-sm text-[var(--muted)]">{p.companyName}</p>
                      </div>
                      <Badge
                        tone={
                          p.status === "certified"
                            ? "ok"
                            : p.status === "suspended" || p.status === "withdrawn"
                              ? "bad"
                              : "warn"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.marks.includes("QUALITY") && <Badge tone="info">Quality Mark</Badge>}
                      {p.marks.includes("ECO") && <Badge tone="ok">Eco Mark Africa</Badge>}
                    </div>
                    <dl className="mt-3 grid gap-1 text-xs text-[var(--muted)]">
                      <div>
                        <span className="font-medium text-[var(--ink)]">Standard: </span>
                        {p.standard.editionLabel} — {p.standard.titleEn}
                      </div>
                      {p.tariff && (
                        <div>
                          <span className="font-medium text-[var(--ink)]">Tariff: </span>
                          <span className="font-mono">{p.tariff.codeDisplay}</span> · {p.tariff.rec} —{" "}
                          {p.tariff.description}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-[var(--ink)]">Certificate: </span>
                        <span className="font-mono">{p.certificateNo}</span>
                      </div>
                      <div>
                        <span className="font-medium text-[var(--ink)]">CB: </span>
                        {p.cbName}
                      </div>
                      <div>
                        Valid {p.issuedAt.slice(0, 10)} → {p.expiresAt.slice(0, 10)}
                      </div>
                    </dl>
                    {p.pinCode && (
                      <div className="mt-3 text-sm">
                        <Link
                          href={`/${locale}/verify?pin=${encodeURIComponent(p.pinCode)}`}
                          className="text-[var(--accent)] underline"
                        >
                          Verify PIN
                        </Link>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={data.page <= 1}
            onClick={() => setParams({ page: String(data.page - 1) })}
          >
            Prev
          </Button>
          <p className="text-sm text-[var(--muted)]">
            Page {data.page} of {data.pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={data.page >= data.pageCount}
            onClick={() => setParams({ page: String(data.page + 1) })}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
