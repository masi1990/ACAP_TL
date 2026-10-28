"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { notifyCrud } from "@/components/ui/crud-notice";
import { AUTHORITATIVE_LOCALES } from "@/lib/publication";
import { LANGUAGE_FILE_FIELDS, STANDARD_KINDS } from "@/lib/standard-kinds";

type Check = { id: string; label: string; required: boolean; present: boolean; notes?: string };
type TariffOpt = { id: string; label: string };
type CommitteeOpt = { id: string; label: string };
type CountryOpt = { id: string; label: string };

export default function StandardImportPage() {
  const params = useParams();
  const raw = String(params.locale || "en");
  const locale: Locale = isLocale(raw) ? raw : "en";

  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [designation, setDesignation] = useState("");
  const [title, setTitle] = useState("");
  const [ics, setIcs] = useState("67.060");
  const [tariffOptions, setTariffOptions] = useState<TariffOpt[]>([]);
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([]);
  const [committees, setCommittees] = useState<CommitteeOpt[]>([]);
  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [kind, setKind] = useState("PRODUCT");
  const [technicalCommitteeId, setTechnicalCommitteeId] = useState("");
  const [authoritativeLocale, setAuthoritativeLocale] = useState("en");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [languageFiles, setLanguageFiles] = useState<Partial<Record<string, File>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/sectors")
      .then((r) => r.json())
      .then((data) => {
        const sectors = (data.rows || []) as Array<{
          code: string;
          committees: Array<{ id: string; code: string; name: string }>;
        }>;
        setCommittees(
          sectors.flatMap((sector) =>
            sector.committees.map((committee) => ({
              id: committee.id,
              label: `${sector.code} · ${committee.code} — ${committee.name}`,
            })),
          ),
        );
        const states = (data.memberStates || []) as Array<{ id: string; iso2: string; name: string }>;
        setCountries(states.map((state) => ({ id: state.id, label: `${state.name} (${state.iso2})` })));
      })
      .catch(() => undefined);
    void fetch("/api/admin/tariffs")
      .then((r) => r.json())
      .then((data) => {
        const rows = (data.rows || data.tariffs || []) as Array<{
          id: string;
          codeDisplay: string;
          description: string;
          rec?: { code: string };
        }>;
        setTariffOptions(
          rows.map((t) => ({
            id: t.id,
            label: `${t.codeDisplay} · ${t.rec?.code || "?"} — ${t.description.slice(0, 72)}`,
          })),
        );
      })
      .catch(() => undefined);
  }, []);
  const [preview, setPreview] = useState<{
    packPreview: Record<string, unknown>;
    checks: Check[];
    completeness: { ok: boolean };
  } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function run(commit: boolean) {
    if (!file) {
      setError("Choose a PDF or Word (.docx) file");
      return;
    }
    if (commit && !technicalCommitteeId) {
      setError("Choose a technical committee. Create a sector and committee first.");
      return;
    }
    setBusy(true);
    setError(null);
    setSavedId(null);
    const form = new FormData();
    form.set("file", file);
    form.set("commit", commit ? "1" : "0");
    form.set("publishToStore", "0");
    form.set("ics", ics);
    form.set("kind", kind);
    form.set("authoritativeLocale", authoritativeLocale);
    if (technicalCommitteeId) form.set("technicalCommitteeId", technicalCommitteeId);
    if (designation.trim()) form.set("designation", designation.trim());
    if (title.trim()) form.set("title", title.trim());
    if (selectedTariffs.length) form.set("tariffLineIds", JSON.stringify(selectedTariffs));
    if (selectedCountries.length) form.set("memberStateIds", JSON.stringify(selectedCountries));
    for (const item of LANGUAGE_FILE_FIELDS) {
      const extra = languageFiles[item.field];
      if (extra && item.locale !== authoritativeLocale) form.set(item.field, extra);
    }

    const res = await fetch("/api/admin/standards/import", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Import failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    if (commit) {
      setSavedId(data.standard?.id || "saved");
      setFile(null);
      setFileKey((n) => n + 1);
      setDesignation("");
      setTitle("");
      setIcs("");
      setSelectedTariffs([]);
      setSelectedCountries([]);
      setLanguageFiles({});
      setTechnicalCommitteeId("");
      notifyCrud("created", data.standard?.designation || "Standard imported");
      setPreview({
        packPreview: {
          designation: data.standard?.designation,
          title: data.standard?.titleEn,
          contentHash: data.standard?.versions?.[0]?.contentHash,
          sourceUri: data.sourceUri,
          fidelity: data.fidelity,
        },
        checks: data.completeness?.checks || [],
        completeness: data.completeness || { ok: false },
      });
    } else {
      setPreview({
        packPreview: data.packPreview,
        checks: data.checks || data.completeness?.checks || [],
        completeness: data.completeness || { ok: false },
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Import standard (PDF / Word)</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Standards can affect <strong className="font-medium text-[var(--ink)]">people, animals, and the
          environment</strong>. Conversion extracts the full text into a machine pack and runs
          completeness checks. Normative content must not be omitted — incomplete packs stay in{" "}
          <span className="font-mono">DRAFT_IMPORT</span> for human review before relying on them for
          certification.
        </p>
      </div>

      <form
        className="panel grid gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run(false);
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="file">Source document</Label>
          <Input
            key={fileKey}
            id="file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          <p className="text-xs text-[var(--muted)]">PDF (PyMuPDF text extract) or Word .docx (mammoth).</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="designation">Designation override (optional)</Label>
            <Input
              id="designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="ARS 464:2022"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ics">ICS</Label>
            <Input id="ics" value={ics} onChange={(e) => setIcs(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Title override (optional)</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="kind">Category</Label>
            <select
              id="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
            >
              {STANDARD_KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="locale">Authoritative language</Label>
            <select
              id="locale"
              value={authoritativeLocale}
              onChange={(e) => setAuthoritativeLocale(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
            >
              {AUTHORITATIVE_LOCALES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="committee">Technical committee</Label>
          <select
            id="committee"
            value={technicalCommitteeId}
            onChange={(e) => setTechnicalCommitteeId(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
          >
            <option value="">{committees.length === 0 ? "Create a sector and committee first" : "Select…"}</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.id}>
                {committee.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Other language PDFs</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {LANGUAGE_FILE_FIELDS.filter((item) => item.locale !== authoritativeLocale).map((item) => (
              <div key={item.field} className="grid gap-1">
                <Label htmlFor={item.field}>{item.label}</Label>
                <Input
                  key={`${item.field}-${fileKey}`}
                  id={item.field}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    setLanguageFiles((prev) => {
                      const copy = { ...prev };
                      if (next) copy[item.field] = next;
                      else delete copy[item.field];
                      return copy;
                    });
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">
            The source document is the authoritative language. Add PDFs for the other languages buyers can preview and purchase.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Adopting countries</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-2">
            {countries.length === 0 && (
              <p className="px-2 py-2 text-sm text-[var(--muted)]">No member states loaded.</p>
            )}
            {countries.map((country) => {
              const checked = selectedCountries.includes(country.id);
              return (
                <label
                  key={country.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() =>
                      setSelectedCountries((prev) =>
                        checked ? prev.filter((id) => id !== country.id) : [...prev, country.id],
                      )
                    }
                  />
                  <span className="leading-snug">{country.label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-[var(--muted)]">{selectedCountries.length} adopting country(ies) selected</p>
        </div>
        <p className="text-sm text-[var(--muted)]">
          The webstore price is set afterwards on the Price table tab. This upload does not assign a price.
        </p>

        <div className="grid gap-2">
          <Label>Tariff lines (multi-select — one standard can address many)</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-2">
            {tariffOptions.length === 0 && (
              <p className="px-2 py-2 text-sm text-[var(--muted)]">
                No tariff lines yet — add RECs and tariff codes first (optional for import).
              </p>
            )}
            {tariffOptions.map((t) => {
              const checked = selectedTariffs.includes(t.id);
              return (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() =>
                      setSelectedTariffs((prev) =>
                        checked ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                      )
                    }
                  />
                  <span className="leading-snug">{t.label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-[var(--muted)]">{selectedTariffs.length} tariff line(s) selected</p>
        </div>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy} variant="secondary">
            {busy ? "Converting…" : "Convert & review (dry-run)"}
          </Button>
          <Button type="button" disabled={busy || !preview} onClick={() => void run(true)}>
            Commit machine pack
          </Button>
          <Link
            href={`/${locale}/admin/standards`}
            className="inline-flex h-10 items-center px-3 text-sm text-[var(--muted)] underline"
          >
            Back to standards
          </Link>
        </div>
      </form>

      {preview && (
        <div className="panel space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Conversion result</h3>
            <Badge tone={preview.completeness.ok ? "ok" : "warn"}>
              {preview.completeness.ok ? "Completeness OK" : "Needs human review"}
            </Badge>
            {savedId && <Badge tone="info">Saved</Badge>}
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(preview.packPreview).map(([k, v]) => (
              <div key={k} className="rounded-md bg-[var(--surface-2)] p-2">
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{k}</dt>
                <dd className="mt-0.5 break-words font-mono text-xs">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <h4 className="text-sm font-semibold">Fidelity checks</h4>
            <ul className="mt-2 space-y-1 text-sm">
              {preview.checks.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span>{c.present ? "✓" : c.required ? "✗" : "·"}</span>
                  <span className={c.present ? "" : c.required ? "text-rose-800" : "text-[var(--muted)]"}>
                    {c.label}
                    {c.notes ? ` — ${c.notes}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
