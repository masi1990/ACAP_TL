"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type TariffOption = {
  id: string;
  rec: string;
  codeDisplay: string;
  codeNormalized: string;
  codeLength: number;
  description: string;
};

export type LookupRec = { code: string; name: string };

/** Searchable tariff-code dropdown + Search submit (GET) */
export function LookupForm({
  locale,
  initialRec,
  initialCode,
  options,
  recs,
}: {
  locale: Locale;
  initialRec: string;
  initialCode: string;
  options: TariffOption[];
  recs: LookupRec[];
}) {
  const router = useRouter();
  const [rec, setRec] = useState(initialRec);
  const [code, setCode] = useState(initialCode);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const forRec = useMemo(
    () => options.filter((o) => o.rec === rec),
    [options, rec],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s/g, "");
    if (!q) return forRec;
    return forRec.filter((o) => {
      const hay = `${o.codeDisplay}${o.codeNormalized}${o.description}`.toLowerCase().replace(/\s/g, "");
      return hay.includes(q) || hay.replace(/\./g, "").includes(q.replace(/\./g, ""));
    });
  }, [forRec, query]);

  const selected = forRec.find((o) => o.codeDisplay === code) || forRec[0] || null;

  function selectCode(next: string) {
    setCode(next);
    setOpen(false);
    setQuery("");
  }

  function onRecChange(next: string) {
    setRec(next);
    const first = options.find((o) => o.rec === next);
    setCode(first?.codeDisplay || "");
    setQuery("");
    setOpen(false);
  }

  function submit(e?: React.FormEvent, codeOverride?: string) {
    e?.preventDefault();
    const chosen = codeOverride || code || selected?.codeDisplay;
    if (!chosen) return;
    setCode(chosen);
    const qs = new URLSearchParams({ rec, code: chosen });
    router.push(`/${locale}/lookup?${qs.toString()}`);
  }

  return (
    <form
      method="get"
      action={`/${locale}/lookup`}
      onSubmit={submit}
      className="panel rise-delay grid gap-4 p-5 lg:grid-cols-[minmax(140px,0.7fr)_minmax(280px,1.4fr)_auto] lg:items-end"
    >
      <div className="grid gap-2">
        <label htmlFor="rec" className="text-sm font-medium text-[var(--ink)]">
          REC
        </label>
        <select
          id="rec"
          name="rec"
          value={rec}
          onChange={(e) => onRecChange(e.target.value)}
          className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
        >
          {recs.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name ? `${item.code} — ${item.name}` : item.code}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="tariff-trigger" className="text-sm font-medium text-[var(--ink)]">
          Tariff code
        </label>
        <div className="relative" ref={panelRef}>
          {/* Hidden field submitted with the form */}
          <input type="hidden" name="code" value={code} />

          <button
            id="tariff-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-left text-sm hover:bg-[var(--surface-2)]"
          >
            <span className="truncate">
              {selected ? (
                <>
                  <span className="font-mono font-medium">{selected.codeDisplay}</span>
                  <span className="ml-2 text-[var(--muted)]">HS{selected.codeLength}</span>
                </>
              ) : (
                <span className="text-[var(--muted)]">Select a tariff code</span>
              )}
            </span>
            <span className="text-[var(--muted)]" aria-hidden>
              ▾
            </span>
          </button>

          {open && (
            <div
              className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)] shadow-xl"
              role="listbox"
            >
              <div className="flex gap-2 border-b border-[var(--line)] p-2">
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search code or description…"
                  className="h-9 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (filtered[0]) selectCode(filtered[0].codeDisplay);
                      else submit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-[var(--accent-fg)]"
                  onClick={() => {
                    const chosen =
                      query.trim() && filtered[0]
                        ? filtered[0].codeDisplay
                        : code || selected?.codeDisplay;
                    if (!chosen) return;
                    setQuery("");
                    setOpen(false);
                    submit(undefined, chosen);
                  }}
                >
                  Search
                </button>
              </div>

              <ul className="max-h-64 overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <li className="px-3 py-4 text-sm text-[var(--muted)]">No tariff codes match.</li>
                )}
                {filtered.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={o.codeDisplay === code}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)]",
                        o.codeDisplay === code && "bg-[var(--surface-2)]",
                      )}
                      onClick={() => selectCode(o.codeDisplay)}
                    >
                      <span>
                        <span className="font-mono font-medium">{o.codeDisplay}</span>
                        <span className="ml-2 text-xs text-[var(--muted)]">HS{o.codeLength}</span>
                      </span>
                      <span className="line-clamp-2 text-xs text-[var(--muted)]">{o.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {selected && (
          <p className="line-clamp-2 text-xs text-[var(--muted)]">{selected.description}</p>
        )}
      </div>

      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-fg)] shadow-sm hover:brightness-110"
      >
        Search by tariff
      </button>
      <span className="sr-only">{t(locale, "lookupHint")}</span>
    </form>
  );
}
