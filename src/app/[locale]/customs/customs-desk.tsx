"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DeskTabs } from "../cb/desk-tabs";
import { FullPreviewViewer } from "@/components/admin/full-preview-viewer";
import { PreviewViewer } from "../store/preview-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { notifyCrud } from "@/components/ui/crud-notice";
import type { AdminFullStandardPreview } from "@/lib/admin-standard-preview";
import type { BuiltStandardPreview } from "@/lib/standard-preview";

type ScopeStandardPreview = BuiltStandardPreview & {
  mode: "scope";
  catalogItemId: string | null;
  standardVersionId?: string;
};

type StandardPreview = AdminFullStandardPreview | ScopeStandardPreview;
import type { CustomsDeskProduct, CustomsRequirement, DeskActor } from "@/lib/customs-desk";
import { annexTitle, DOSSIER_ANNEXES, INTERNAL_CERTIFICATE_KIND } from "@/lib/dossier";

type OpenFile = {
  kind: "dossier" | "evidence";
  id: string;
  title: string;
  contentType: string;
};

function resultLabel(pass: boolean | null) {
  if (pass === true) return "Pass";
  if (pass === false) return "Fail";
  return "—";
}

function groupsOf(items: CustomsRequirement[]) {
  const groups: { section: string; items: CustomsRequirement[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || last.section !== item.section) groups.push({ section: item.section || "Requirements", items: [item] });
    else last.items.push(item);
  }
  return groups;
}

function ViewOnlyFrame({ file }: { file: OpenFile }) {
  const src = `/api/customs/files/${file.kind}/${file.id}`;
  const image = file.contentType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.title);
  return (
    <div
      className="overflow-hidden rounded-md border border-[var(--line)] bg-white"
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="border-b border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
        View only · {file.title}
      </p>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={file.title} draggable={false} className="mx-auto max-h-[70vh] w-full object-contain" />
      ) : (
        <iframe
          title={file.title}
          src={`${src}#toolbar=0&navpanes=0`}
          className="h-[70vh] w-full bg-white"
        />
      )}
    </div>
  );
}

function FileButton({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="block text-left text-sm text-[var(--accent)] underline" onClick={onOpen}>
      View {label}
    </button>
  );
}

function decisionWord(code: string) {
  if (code === "ALLOW") return "Allow entry";
  if (code === "REFUSE") return "Refuse entry";
  if (code === "HOLD") return "Hold";
  if (code === "CONFORM") return "Conform";
  if (code === "NON_CONFORM") return "Non-conform";
  return code || "—";
}

function CertificatePane({
  locale,
  track,
  empty,
}: {
  locale: string;
  track?: { markScheme: string; standardLabel: string; certificateNo: string | null; certificateStatus: string | null };
  empty: string;
}) {
  if (!track) return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        {track.markScheme === "ECO" ? "Eco Mark" : "Quality Mark"} certificate of conformity
        {" · "}
        {track.certificateNo ? `${track.certificateNo} · ${track.certificateStatus}` : "Not issued"}
        {track.standardLabel ? ` · ${track.standardLabel}` : ""}
      </p>
      {track.certificateNo ? (
        <iframe
          title={`Certificate ${track.certificateNo}`}
          src={`/${locale}/certificates/${encodeURIComponent(track.certificateNo)}?embed=1`}
          sandbox="allow-scripts allow-same-origin"
          className="h-[560px] w-full rounded-md border border-[var(--line)] bg-[#f7f1e4]"
        />
      ) : null}
    </div>
  );
}

function ActorLine({ actor }: { actor: DeskActor | null }) {
  if (!actor) return null;
  return (
    <p className="text-sm">
      <span className="font-medium">{actor.name}</span>
      <span className="mt-0.5 block text-xs text-[var(--muted)]">
        {actor.email}
        {actor.organization ? ` · ${actor.organization}` : ""}
      </span>
    </p>
  );
}

function DecisionHistory({ product }: { product: CustomsDeskProduct | null }) {
  return (
    <>
      <section className="panel space-y-2 p-4 text-sm">
        <h2 className="font-semibold">Inspection decisions</h2>
        {!product || product.inspections.length === 0 ? (
          <p className="text-[var(--muted)]">No inspection for this product yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {product.inspections.map((row) => (
              <li key={row.id} className="space-y-1 py-2">
                <p>
                  {decisionWord(row.result)}
                  {row.inspectedAt ? ` · ${row.inspectedAt}` : ""}
                </p>
                <p>{row.findings || "No findings recorded."}</p>
                <ActorLine actor={row.actor} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel space-y-2 p-4 text-sm">
        <h2 className="font-semibold">Customs decisions</h2>
        {!product || product.clearances.length === 0 ? (
          <p className="text-[var(--muted)]">No customs decision for this product yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {product.clearances.map((row) => (
              <li key={row.id} className="space-y-1 py-2">
                <p>
                  {decisionWord(row.decision)} · {row.originIso2} to {row.destinationIso2}
                  {row.decidedAt ? ` · ${row.decidedAt}` : ""}
                </p>
                <p>{row.reason || "No reason recorded."}</p>
                <ActorLine actor={row.actor} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function CustomsDesk({
  locale,
  products,
  countries,
  mode = "customs",
}: {
  locale: string;
  products: CustomsDeskProduct[];
  countries: { value: string; label: string }[];
  mode?: "customs" | "inspect" | "view";
}) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [originIso2, setOriginIso2] = useState("");
  const [destinationIso2, setDestinationIso2] = useState("");
  const [decision, setDecision] = useState("HOLD");
  const [reason, setReason] = useState("");
  const [inspectResult, setInspectResult] = useState("CONFORM");
  const [findings, setFindings] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(mode === "view" ? "certificate" : "decision");
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [standard, setStandard] = useState<StandardPreview | null>(null);
  const [standardError, setStandardError] = useState<string | null>(null);
  const [standardBusy, setStandardBusy] = useState(false);

  const product = useMemo(
    () => products.find((row) => row.id === productId) ?? null,
    [products, productId],
  );

  function chooseProduct(id: string) {
    const next = products.find((row) => row.id === id) ?? null;
    setProductId(id);
    setOriginIso2(next?.originIso2 ?? "");
    setOpenFile(null);
    setStandard(null);
    setStandardError(null);
  }

  useEffect(() => {
    if (mode !== "view" || productId || products.length === 0) return;
    chooseProduct(products[0].id);
  }, [mode, productId, products]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (
      hash === "decision" ||
      hash === "certificate" ||
      hash === "laboratory" ||
      hash === "certification" ||
      hash === "documents" ||
      hash === "standard"
    ) {
      setTab(hash);
    }
  }, []);

  useEffect(() => {
    if (!product?.standardId) {
      setStandard(null);
      setStandardError(null);
      setStandardBusy(false);
      return;
    }
    const standardId = product.standardId;
    let cancelled = false;
    setStandard(null);
    setStandardError(null);
    setStandardBusy(true);
    fetch(`/api/customs/standards/${standardId}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "The standard could not be opened");
        return body as StandardPreview;
      })
      .then((data) => {
        if (!cancelled) setStandard(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setStandardError(err instanceof Error ? err.message : "The standard could not be opened");
      })
      .finally(() => {
        if (!cancelled) setStandardBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product?.standardId]);

  const standardItems = product?.items.filter((item) => item.source === "STANDARD") ?? [];
  const laboratoryItems = standardItems.filter((item) => item.kind === "table");
  const clauseItems = standardItems.filter((item) => item.kind !== "table");
  const national = product?.items.filter((item) => item.source === "NATIONAL") ?? [];
  const other = product?.items.filter((item) => item.source === "OTHER") ?? [];
  const scans = product?.files.filter((file) => file.kind === INTERNAL_CERTIFICATE_KIND) ?? [];

  function openAttachment(file: OpenFile) {
    setOpenFile(file);
    setTab("documents");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!productId) {
      const message = "Choose a product";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    if (mode === "customs" && (!originIso2 || !destinationIso2)) {
      const message = "Choose a product, an origin country, and a destination country";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    if (mode === "inspect" && !findings.trim()) {
      const message = "Findings are required";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch(mode === "inspect" ? "/api/chain/inspections" : "/api/chain/customs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "inspect"
          ? { productId, result: inspectResult, findings }
          : { productId, originIso2, destinationIso2, decision, reason },
      ),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Request failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    if (mode === "inspect") {
      setFindings("");
      setMsg("Inspection recorded");
      notifyCrud("created", "Inspection recorded");
    } else {
      setReason("");
      setMsg("Border decision recorded");
      notifyCrud("created", "Border decision recorded");
    }
    router.refresh();
  }

  const originLabel = countries.find((country) => country.value === originIso2)?.label || originIso2 || "—";
  const evidenceFiles = (product?.items ?? []).flatMap((item) =>
    item.evidence.map((file) => ({
      ...file,
      context: item.heading || item.clause || "Requirement",
    })),
  );

  return (
    <div className="space-y-6">
      <div className="panel space-y-3 p-4">
        {mode !== "view" && (
        <div className="grid gap-1">
          <Label htmlFor={mode === "inspect" ? "inspect-productId" : "customs-productId"}>Product</Label>
          <SearchSelect
            id={mode === "inspect" ? "inspect-productId" : "customs-productId"}
            value={productId}
            onChange={chooseProduct}
            placeholder="Select…"
            searchPlaceholder="Search products"
            options={products.map((row) => ({ value: row.id, label: row.label }))}
          />
        </div>
        )}
        {product && (
          <dl className="grid gap-3 border-t border-[var(--line)] pt-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Origin</dt>
              <dd>{originLabel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Certification body</dt>
              <dd>{product.certificationBody || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Standard</dt>
              <dd>{product.standardLabel || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Certificate</dt>
              <dd>{product.certificateNo || "Not issued"}</dd>
            </div>
          </dl>
        )}
        {product && product.tracks.length > 0 && (
          <ul className="space-y-1 border-t border-[var(--line)] pt-3 text-sm">
            {product.tracks.map((track) => (
              <li key={`${track.markScheme}-${track.certificateNo || track.standardLabel}`}>
                <span className="font-medium">{track.markScheme === "ECO" ? "Eco Mark" : "Quality Mark"}</span>
                {" · "}
                {track.standardLabel || "No standard"}
                {" · "}
                {track.certificateNo ? `${track.certificateNo} (${track.certificateStatus})` : "Certificate not issued"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DeskTabs
        activeId={tab}
        onSelect={setTab}
        tabs={[
          {
            id: "decision",
            label: mode === "view" ? "Record" : "Decision",
            content: (
      <div className="space-y-4">
      {mode !== "view" && (
      <form onSubmit={onSubmit} autoComplete="off" className="panel grid gap-3 p-4 sm:grid-cols-2">
        {mode === "inspect" ? (
          <>
            <div className="grid gap-1">
              <Label htmlFor="inspect-result">Result</Label>
              <SearchSelect
                id="inspect-result"
                value={inspectResult}
                onChange={setInspectResult}
                searchPlaceholder="Search results"
                options={[
                  { value: "CONFORM", label: "Conform" },
                  { value: "NON_CONFORM", label: "Non-conform" },
                ]}
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="inspect-findings">Findings</Label>
              <textarea
                id="inspect-findings"
                value={findings}
                onChange={(event) => setFindings(event.target.value)}
                className="min-h-24 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : (
          <>
        <div className="grid gap-1">
          <Label htmlFor="customs-originIso2">Origin country</Label>
          <SearchSelect
            id="customs-originIso2"
            value={originIso2}
            onChange={setOriginIso2}
            placeholder="Select…"
            searchPlaceholder="Search countries"
            options={countries}
          />
          <p className="text-xs text-[var(--muted)]">Filled from the product’s country of origin.</p>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="customs-destinationIso2">Destination country</Label>
          <SearchSelect
            id="customs-destinationIso2"
            value={destinationIso2}
            onChange={setDestinationIso2}
            placeholder="Select…"
            searchPlaceholder="Search countries"
            options={countries}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="customs-body">Certification body</Label>
          <Input id="customs-body" readOnly value={product?.certificationBody ?? ""} placeholder="Select a product" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="customs-standard">Standard</Label>
          <Input id="customs-standard" readOnly value={product?.standardLabel ?? ""} placeholder="Select a product" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="customs-decision">Decision</Label>
          <SearchSelect
            id="customs-decision"
            value={decision}
            onChange={setDecision}
            searchPlaceholder="Search decisions"
            options={[
              { value: "ALLOW", label: "Allow entry" },
              { value: "HOLD", label: "Hold" },
              { value: "REFUSE", label: "Refuse entry" },
            ]}
          />
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor="customs-reason">Reason</Label>
          <textarea
            id="customs-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-24 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </div>
          </>
        )}
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={busy || !product}>
            {busy ? "Saving…" : mode === "inspect" ? "Record inspection" : "Record border decision"}
          </Button>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {msg && <p className="text-sm text-emerald-800">{msg}</p>}
        </div>
      </form>
      )}
      <DecisionHistory product={product} />
      </div>
            ),
          },
          {
            id: "certificate",
            label: "Certificate",
            content: !product ? (
              <p className="text-sm text-[var(--muted)]">Choose a product above.</p>
            ) : (
              <section className="space-y-3">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Certifying body</dt>
                    <dd>{product.certificationBody || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Recorded by</dt>
                    <dd>{product.recorderLabel || "Not recorded yet"}</dd>
                  </div>
                </dl>
                <DeskTabs
                  syncHash={false}
                  tabs={[
                    {
                      id: "quality-coc",
                      label: "Quality Mark",
                      content: (
                        <CertificatePane
                          locale={locale}
                          track={product.tracks.find((track) => track.markScheme === "QUALITY")}
                          empty="This product has no Quality Mark certificate of conformity."
                        />
                      ),
                    },
                    {
                      id: "eco-coc",
                      label: "Eco Mark",
                      content: (
                        <CertificatePane
                          locale={locale}
                          track={product.tracks.find((track) => track.markScheme === "ECO")}
                          empty="Eco Mark Africa is not selected for this product."
                        />
                      ),
                    },
                  ]}
                />
                {mode !== "view" &&
                  scans.map((file) => (
                    <ViewOnlyFrame
                      key={file.id}
                      file={{
                        kind: "dossier",
                        id: file.id,
                        title: file.filename || "Scanned certificate",
                        contentType: file.contentType,
                      }}
                    />
                  ))}
              </section>
            ),
          },
          {
            id: "laboratory",
            label: mode === "view" ? "Scanned certificate" : "Laboratory results",
            content: !product ? (
              <p className="text-sm text-[var(--muted)]">Choose a product above.</p>
            ) : mode === "view" ? (
              <section className="space-y-3">
                <p className="text-sm font-medium">Scanned internal certificate</p>
                <p className="text-sm text-[var(--muted)]">
                  Optional. A PDF or image of the certificate the certification body issued, if it keeps one. View only.
                </p>
                {scans.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No scanned certificate has been filed.</p>
                ) : (
                  scans.map((file) => (
                    <ViewOnlyFrame
                      key={file.id}
                      file={{
                        kind: "dossier",
                        id: file.id,
                        title: file.markScheme
                          ? `${file.markScheme === "ECO" ? "Eco Mark" : "Quality Mark"} · ${file.filename}`
                          : file.filename || "Scanned certificate",
                        contentType: file.contentType,
                      }}
                    />
                  ))
                )}
              </section>
            ) : (
              <section className="space-y-4">
                <p className="text-sm text-[var(--muted)]">
                  Laboratory and sample, and each test from the standard tables. The certificate of conformity stays on
                  the Certificate tab.
                </p>
                {product.dossier ? (
                  <dl className="panel grid gap-3 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Laboratory</dt>
                      <dd>{product.dossier.laboratoryName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Accreditation</dt>
                      <dd>{product.dossier.accreditationRef || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Report</dt>
                      <dd>{product.dossier.reportNo || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Sample</dt>
                      <dd>
                        {product.dossier.sampleCode || "—"}
                        {product.dossier.batchOrLot ? ` · Batch ${product.dossier.batchOrLot}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Sampled</dt>
                      <dd>{product.dossier.sampledAt || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Tested</dt>
                      <dd>{product.dossier.testedAt || "—"}</dd>
                    </div>
                    {product.dossier.sampleDescription ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Sample description</dt>
                        <dd>{product.dossier.sampleDescription}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No laboratory record yet.</p>
                )}
                {laboratoryItems.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No table tests recorded yet.</p>
                ) : (
                  groupsOf(laboratoryItems).map((group) => (
                    <div key={group.section} className="space-y-2">
                      <h3 className="font-semibold">{group.section}</h3>
                      <RequirementTable items={group.items} onOpen={openAttachment} />
                    </div>
                  ))
                )}
              </section>
            ),
          },
          {
            id: "certification",
            label: "Certification",
            content: !product ? (
              <p className="text-sm text-[var(--muted)]">Choose a product above.</p>
            ) : (
          <section className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              {mode === "view"
                ? `${[product.name, product.commodity, product.standardLabel].filter(Boolean).join(" · ")}. The scanned certificate is on its own tab. Files open on the Documents tab and are not downloaded.`
                : `${[product.name, product.commodity, product.standardLabel].filter(Boolean).join(" · ")}. Laboratory tests are on their own tab. Files open on the Documents tab and are not downloaded.`}
            </p>
            <dl className="panel grid gap-3 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Certifying body</dt>
                <dd>{product.certificationBody || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Recorded by</dt>
                <dd>{product.recorderLabel || "Not recorded yet"}</dd>
              </div>
            </dl>

            {groupsOf(clauseItems).map((group) => (
              <div key={group.section} className="space-y-2">
                <h3 className="font-semibold">{group.section}</h3>
                <RequirementTable items={group.items} onOpen={openAttachment} />
              </div>
            ))}
            {mode === "view" &&
              groupsOf(laboratoryItems).map((group) => (
                <div key={`lab-${group.section}`} className="space-y-2">
                  <h3 className="font-semibold">{group.section}</h3>
                  <RequirementTable items={group.items} onOpen={openAttachment} />
                </div>
              ))}
            {national.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">National regulations</h3>
                <RequirementTable items={national} onOpen={openAttachment} />
              </div>
            )}
            {other.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Other requirements</h3>
                <RequirementTable items={other} onOpen={openAttachment} />
              </div>
            )}
          </section>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            content: !product ? (
              <p className="text-sm text-[var(--muted)]">Choose a product above.</p>
            ) : (
              <section className="space-y-4">
                <p className="text-sm text-[var(--muted)]">View only. These files stay on this page.</p>
                {openFile && <ViewOnlyFrame file={openFile} />}
                <ul className="space-y-2 text-sm">
                  {DOSSIER_ANNEXES.map((annex) => {
                    const current = product.files.find((file) => file.kind === "ANNEX" && file.annexCode === annex.code);
                    return (
                      <li key={annex.code} className="border-b border-[var(--line)] py-2">
                        <div className="font-medium">{annex.title}</div>
                        {current ? (
                          <FileButton
                            label={current.filename}
                            onOpen={() =>
                              openAttachment({
                                kind: "dossier",
                                id: current.id,
                                title: current.filename,
                                contentType: current.contentType,
                              })
                            }
                          />
                        ) : (
                          <p className="text-[var(--muted)]">Not filed</p>
                        )}
                      </li>
                    );
                  })}
                  {product.files
                    .filter((file) => file.kind === "OTHER")
                    .map((file) => (
                      <li key={file.id} className="border-b border-[var(--line)] py-2">
                        <span className="font-medium">{file.title || annexTitle(file.annexCode || "")}</span>
                        {" · "}
                        <FileButton
                          label={file.filename}
                          onOpen={() =>
                            openAttachment({
                              kind: "dossier",
                              id: file.id,
                              title: file.filename,
                              contentType: file.contentType,
                            })
                          }
                        />
                      </li>
                    ))}
                  {evidenceFiles.map((file) => (
                    <li key={file.id} className="border-b border-[var(--line)] py-2">
                      <span className="font-medium">{file.context}</span>
                      {" · "}
                      <FileButton
                        label={file.filename}
                        onOpen={() =>
                          openAttachment({
                            kind: "evidence",
                            id: file.id,
                            title: file.filename,
                            contentType: file.contentType,
                          })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ),
          },
          {
            id: "standard",
            label: "Standard",
            content: !product ? (
              <p className="text-sm text-[var(--muted)]">Choose a product above.</p>
            ) : (
          <section className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              {product.standardLabel || "No standard is linked to this product."} View only.
            </p>
            {standardBusy && <p className="text-sm text-[var(--muted)]">Opening the standard…</p>}
            {standardError && <p className="text-sm text-rose-700">{standardError}</p>}
            {standard && (
              <div
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]"
                style={{ height: "min(78vh, 900px)" }}
              >
                {standard.mode === "full" ? (
                  <FullPreviewViewer
                    data={standard}
                    closeHref={`/${locale}/${mode === "inspect" ? "inspect" : "customs"}`}
                    viewOnly
                    showBack={false}
                  />
                ) : (
                  <PreviewViewer data={standard} closeHref={mode === "view" ? `/${locale}/trade` : `/${locale}/customs`} />
                )}
              </div>
            )}
          </section>
            ),
          },
        ]}
      />
    </div>
  );
}

function RequirementTable({
  items,
  onOpen,
}: {
  items: CustomsRequirement[];
  onOpen: (file: OpenFile) => void;
}) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
            <th className="px-3 py-2">Clause</th>
            <th className="px-3 py-2">Requirement</th>
            <th className="px-3 py-2">Method</th>
            <th className="px-3 py-2">Measured</th>
            <th className="px-3 py-2">Result</th>
            <th className="px-3 py-2">Recorded by</th>
            <th className="px-3 py-2">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[var(--line)] align-top">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{item.clause || item.countryIso2 || "—"}</td>
              <td className="px-3 py-2">
                {item.heading && <div className="font-medium">{item.heading}</div>}
                {item.text ? <div className="text-[var(--muted)]">{item.text}</div> : null}
                {item.notes ? <div className="mt-1 text-xs text-[var(--muted)]">{item.notes}</div> : null}
              </td>
              <td className="px-3 py-2">{item.testMethod || "—"}</td>
              <td className="px-3 py-2">
                {item.measuredValue || "—"}
                {item.unit ? ` ${item.unit}` : ""}
              </td>
              <td className="px-3 py-2">{resultLabel(item.pass)}</td>
              <td className="px-3 py-2">{item.recorder || "—"}</td>
              <td className="space-y-1 px-3 py-2">
                {item.evidence.length === 0
                  ? "—"
                  : item.evidence.map((file) => (
                      <FileButton
                        key={file.id}
                        label={file.filename}
                        onOpen={() =>
                          onOpen({
                            kind: "evidence",
                            id: file.id,
                            title: file.filename,
                            contentType: file.contentType,
                          })
                        }
                      />
                    ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
