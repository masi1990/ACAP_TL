"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CertificateDownloadLink } from "@/components/certificate-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrudForm } from "@/components/admin/crud-form";
import { notifyCrud } from "@/components/ui/crud-notice";
import { countryOptions } from "@/lib/countries";
import { ANNEX_SOURCES, DOSSIER_ANNEXES, dossierGaps, INTERNAL_CERTIFICATE_KIND } from "@/lib/dossier";

export type BoardItem = {
  id: string;
  source: string;
  kind: string;
  section: string;
  clause: string;
  heading: string;
  text: string;
  testMethod: string;
  countryIso2: string | null;
  pass: boolean | null;
  measuredValue: string;
  unit: string;
  notes: string;
  evidence: { id: string; filename: string; storageUri: string }[];
};

export type DossierFields = {
  laboratoryName: string;
  accreditationRef: string;
  reportNo: string;
  sampleCode: string;
  batchOrLot: string;
  sampleDescription: string;
  sampledAt: string;
  testedAt: string;
};

export type DossierFile = {
  id: string;
  kind: string;
  annexCode: string | null;
  title: string;
  filename: string;
};

const EMPTY_DOSSIER: DossierFields = {
  laboratoryName: "",
  accreditationRef: "",
  reportNo: "",
  sampleCode: "",
  batchOrLot: "",
  sampleDescription: "",
  sampledAt: "",
  testedAt: "",
};

function groupsOf(items: BoardItem[]) {
  const groups: { section: string; items: BoardItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || last.section !== item.section) groups.push({ section: item.section || "Requirements", items: [item] });
    else last.items.push(item);
  }
  return groups;
}

export function AssessmentBoard({
  locale,
  applicationId,
  items,
  dossier,
  attachments,
  certificateNo,
}: {
  locale: string;
  applicationId: string;
  items: BoardItem[];
  dossier: DossierFields | null;
  attachments: DossierFile[];
  certificateNo: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<DossierFields>(dossier ?? EMPTY_DOSSIER);
  const [rows, setRows] = useState(items);
  const [files, setFiles] = useState(attachments);
  const [otherTitle, setOtherTitle] = useState("");

  const evidenceKey = items.map((item) => `${item.id}:${item.evidence.map((file) => file.id).join(",")}`).join("|");
  const attachmentKey = attachments.map((file) => file.id).join(",");

  useEffect(() => {
    setRows((prev) =>
      items.map((item) => {
        const local = prev.find((row) => row.id === item.id);
        if (!local) return item;
        return {
          ...item,
          measuredValue: local.measuredValue,
          unit: local.unit,
          notes: local.notes,
          testMethod: local.testMethod,
          pass: local.pass,
          evidence: item.evidence,
        };
      }),
    );
    // Evidence and new rows arrive from the server. Typed values stay in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceKey]);

  useEffect(() => {
    setFiles(attachments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentKey]);

  const standard = rows.filter((item) => item.source === "STANDARD");
  const national = rows.filter((item) => item.source === "NATIONAL");
  const other = rows.filter((item) => item.source === "OTHER");
  const gaps = dossierGaps(
    fields,
    rows.map((item) => ({
      source: item.source,
      kind: item.kind,
      pass: item.pass,
      measuredValue: item.measuredValue,
      evidenceCount: item.evidence.length,
    })),
  );

  function patchRow(id: string, patch: Partial<BoardItem>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function fail(message: string) {
    setError(message);
    notifyCrud("error", message);
  }

  async function saveDossier() {
    const res = await fetch("/api/cb/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "dossier", applicationId, ...fields }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail(body.error || "Could not save the laboratory and sample");
      return false;
    }
    return true;
  }

  async function saveRows() {
    const res = await fetch("/api/cb/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "save",
        applicationId,
        items: rows.map((item) => ({
          id: item.id,
          pass: item.pass === true ? "true" : item.pass === false ? "false" : "",
          measuredValue: item.measuredValue,
          unit: item.unit,
          notes: item.notes,
          testMethod: item.testMethod,
        })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail(body.error || "Could not save the results");
      return false;
    }
    return true;
  }

  async function onSaveDossier() {
    setBusy(true);
    setError(null);
    const ok = await saveDossier();
    setBusy(false);
    if (!ok) return;
    notifyCrud("updated", "Laboratory and sample saved");
    router.refresh();
  }

  async function onSaveRows() {
    setBusy(true);
    setError(null);
    const ok = await saveRows();
    setBusy(false);
    if (!ok) return;
    notifyCrud("updated", "Results saved");
    router.refresh();
  }

  async function onIssue() {
    if (gaps.length) return;
    setBusy(true);
    setError(null);
    const dossierOk = await saveDossier();
    if (!dossierOk) {
      setBusy(false);
      return;
    }
    const rowsOk = await saveRows();
    if (!rowsOk) {
      setBusy(false);
      return;
    }
    const res = await fetch("/api/cb/certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      fail(body.error || "Certificate could not be issued");
      return;
    }
    notifyCrud("created", "Certificate issued");
    router.refresh();
  }

  async function attach(itemId: string, file: File) {
    setError(null);
    const data = new FormData();
    data.set("assessmentItemId", itemId);
    data.set("file", file);
    const res = await fetch("/api/cb/evidence", { method: "POST", body: data });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail(body.error || "Could not attach the laboratory file");
      return;
    }
    setRows((prev) =>
      prev.map((row) =>
        row.id === itemId
          ? {
              ...row,
              evidence: [...row.evidence, { id: body.id, filename: body.filename, storageUri: body.storageUri }],
            }
          : row,
      ),
    );
    notifyCrud("created", "Laboratory file attached");
    router.refresh();
  }

  async function uploadAnnex(code: string, file: File) {
    setError(null);
    const data = new FormData();
    data.set("applicationId", applicationId);
    data.set("annexCode", code);
    data.set("file", file);
    const res = await fetch("/api/cb/evidence", { method: "POST", body: data });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail(body.error || "Could not attach the annex");
      return;
    }
    setFiles((prev) => [
      ...prev.filter((item) => item.annexCode !== code),
      { id: body.id, kind: "ANNEX", annexCode: code, title: body.title, filename: body.filename },
    ]);
    notifyCrud("created", "Annex attached");
    router.refresh();
  }

  async function uploadInternalCertificate(file: File) {
    setError(null);
    const data = new FormData();
    data.set("applicationId", applicationId);
    data.set("kind", INTERNAL_CERTIFICATE_KIND);
    data.set("file", file);
    const res = await fetch("/api/cb/evidence", { method: "POST", body: data });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail(body.error || "Could not attach the scanned certificate");
      return;
    }
    setFiles((prev) => [
      ...prev.filter((item) => item.kind !== INTERNAL_CERTIFICATE_KIND),
      {
        id: body.id,
        kind: INTERNAL_CERTIFICATE_KIND,
        annexCode: INTERNAL_CERTIFICATE_KIND,
        title: "Internal certificate",
        filename: body.filename,
      },
    ]);
    notifyCrud("created", "Scanned certificate attached");
    router.refresh();
  }

  async function uploadOther(file: File) {
    const title = otherTitle.trim();
    if (!title) {
      fail("Give the other document a title");
      return;
    }
    setError(null);
    const data = new FormData();
    data.set("applicationId", applicationId);
    data.set("title", title);
    data.set("file", file);
    const res = await fetch("/api/cb/evidence", { method: "POST", body: data });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail(body.error || "Could not attach the document");
      return;
    }
    setFiles((prev) => [
      ...prev,
      { id: body.id, kind: "OTHER", annexCode: null, title: body.title || title, filename: body.filename },
    ]);
    setOtherTitle("");
    notifyCrud("created", "Document attached");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Laboratory and sample</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Laboratory name</span>
            <Input
              value={fields.laboratoryName}
              onChange={(e) => setFields({ ...fields, laboratoryName: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Accreditation reference</span>
            <Input
              value={fields.accreditationRef}
              onChange={(e) => setFields({ ...fields, accreditationRef: e.target.value })}
              placeholder="ISO/IEC 17025"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Test report number</span>
            <Input value={fields.reportNo} onChange={(e) => setFields({ ...fields, reportNo: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Sample code</span>
            <Input value={fields.sampleCode} onChange={(e) => setFields({ ...fields, sampleCode: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Batch or lot</span>
            <Input value={fields.batchOrLot} onChange={(e) => setFields({ ...fields, batchOrLot: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Date sampled</span>
            <Input
              type="date"
              value={fields.sampledAt}
              onChange={(e) => setFields({ ...fields, sampledAt: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Date tested</span>
            <Input
              type="date"
              value={fields.testedAt}
              onChange={(e) => setFields({ ...fields, testedAt: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Sample description</span>
            <Input
              value={fields.sampleDescription}
              onChange={(e) => setFields({ ...fields, sampleDescription: e.target.value })}
            />
          </label>
        </div>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void onSaveDossier()}>
          Save laboratory and sample
        </Button>
      </section>

      {standard.length === 0 && (
        <CrudForm
          idPrefix="load-"
          action="/api/cb/assessment"
          submitLabel="Load requirements from the standard"
          fields={[
            { name: "mode", label: "Mode", defaultValue: "load", hidden: true },
            { name: "applicationId", label: "Application", defaultValue: applicationId, hidden: true },
          ]}
        />
      )}

      <div className="space-y-8">
        {groupsOf(standard).map((group) => (
          <section key={group.section} className="space-y-2">
            <h3 className="font-semibold">{group.section}</h3>
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                    <th className="px-3 py-2">Clause</th>
                    <th className="px-3 py-2">Requirement</th>
                    <th className="px-3 py-2">Limit</th>
                    <th className="px-3 py-2">Test method</th>
                    <th className="px-3 py-2">Measured</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--line)] align-top">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{item.clause || "—"}</td>
                      <td className="px-3 py-2">
                        {item.heading && <div className="font-medium">{item.heading}</div>}
                        {item.kind === "clause" && <div className="text-[var(--muted)]">{item.text}</div>}
                      </td>
                      <td className="px-3 py-2">{item.kind === "table" ? item.text : "—"}</td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.testMethod}
                          onChange={(e) => patchRow(item.id, { testMethod: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.measuredValue}
                          onChange={(e) => patchRow(item.id, { measuredValue: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.unit}
                          className="w-20"
                          onChange={(e) => patchRow(item.id, { unit: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.pass === true ? "true" : item.pass === false ? "false" : ""}
                          onChange={(e) =>
                            patchRow(item.id, {
                              pass: e.target.value === "true" ? true : e.target.value === "false" ? false : null,
                            })
                          }
                          className="rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                        >
                          <option value="">—</option>
                          <option value="true">Pass</option>
                          <option value="false">Fail</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 space-y-1">
                        {item.evidence.map((file) => (
                          <a key={file.id} className="block text-[var(--accent)] underline" href={file.storageUri}>
                            {file.filename}
                          </a>
                        ))}
                        <input
                          type="file"
                          className="block max-w-[180px] text-xs"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) void attach(item.id, file);
                          }}
                        />
                        <Input
                          value={item.notes}
                          placeholder="Notes"
                          onChange={(e) => patchRow(item.id, { notes: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <ExtraTable title="National regulations" items={national} onPatch={patchRow} onAttach={attach} />
        <ExtraTable title="Other requirements" items={other} onPatch={patchRow} onAttach={attach} />

        {rows.length > 0 && (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void onSaveRows()}>
            Save results
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-semibold">Add a national regulation</h3>
          <p className="text-sm text-[var(--muted)]">
            Country rules differ. Add the name and description for the destination country.
          </p>
          <CrudForm
            idPrefix="nat-"
            action="/api/cb/assessment"
            submitLabel="Add national regulation"
            fields={[
              { name: "mode", label: "Mode", defaultValue: "add", hidden: true },
              { name: "source", label: "Source", defaultValue: "NATIONAL", hidden: true },
              { name: "applicationId", label: "Application", defaultValue: applicationId, hidden: true },
              {
                name: "countryIso2",
                label: "Country",
                type: "select",
                required: true,
                options: countryOptions(),
              },
              { name: "heading", label: "Name of the regulation", required: true },
              { name: "text", label: "Description", type: "textarea", required: true },
            ]}
          />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Add an other requirement</h3>
          <CrudForm
            idPrefix="other-"
            action="/api/cb/assessment"
            submitLabel="Add other requirement"
            fields={[
              { name: "mode", label: "Mode", defaultValue: "add", hidden: true },
              { name: "source", label: "Source", defaultValue: "OTHER", hidden: true },
              { name: "applicationId", label: "Application", defaultValue: applicationId, hidden: true },
              { name: "heading", label: "Name", required: true },
              { name: "text", label: "Description", type: "textarea", required: true },
            ]}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">ARSO-CERT annexes</h2>
        <p className="max-w-3xl text-sm text-[var(--muted)]">
          Optional. From the Constitution, Rules and Guide for ARSO-CERT. {ANNEX_SOURCES}
        </p>
        <ul className="space-y-3">
          {DOSSIER_ANNEXES.map((annex) => {
            const current = files.find((file) => file.kind === "ANNEX" && file.annexCode === annex.code);
            return (
              <li key={annex.code} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-2">
                <div>
                  <div className="text-sm font-medium">{annex.title}</div>
                  {current && (
                    <a className="text-sm text-[var(--accent)] underline" href={`/api/cb/files/${current.id}`}>
                      {current.filename}
                    </a>
                  )}
                </div>
                <input
                  type="file"
                  className="max-w-[220px] text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadAnnex(annex.code, file);
                  }}
                />
              </li>
            );
          })}
        </ul>

        <div className="space-y-2 pt-2">
          <h3 className="font-semibold">Other documents</h3>
          <p className="text-sm text-[var(--muted)]">Add any extra file. Each one needs a short title.</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 space-y-1 text-sm">
              <span>Title</span>
              <Input value={otherTitle} onChange={(e) => setOtherTitle(e.target.value)} />
            </label>
            <input
              type="file"
              className="max-w-[220px] text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadOther(file);
              }}
            />
          </div>
          <ul className="space-y-1 text-sm">
            {files
              .filter((file) => file.kind === "OTHER")
              .map((file) => (
                <li key={file.id}>
                  <span className="font-medium">{file.title}</span>
                  {" · "}
                  <a className="text-[var(--accent)] underline" href={`/api/cb/files/${file.id}`}>
                    {file.filename}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      </section>

      <div className="space-y-3">
        <h3 className="font-semibold">Certificate of conformity</h3>
        {certificateNo ? (
          <CertificateDownloadLink href={`/${locale}/certificates/${certificateNo}`}>
            {certificateNo}
          </CertificateDownloadLink>
        ) : (
          <div className="space-y-3">
            {gaps.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Still needed before a certificate can be issued</p>
                <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
                  {gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="button" disabled={busy || gaps.length > 0} onClick={() => void onIssue()}>
              {busy ? "Saving…" : "Issue certificate of conformity"}
            </Button>
          </div>
        )}
        <div className="space-y-2 rounded-md border border-dashed border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="text-sm font-medium">Scanned internal certificate</p>
          <p className="text-sm text-[var(--muted)]">
            Optional. Upload a PDF or image of the certificate your body issued, if you keep one.
          </p>
          {files
            .filter((file) => file.kind === INTERNAL_CERTIFICATE_KIND)
            .map((file) => (
              <a key={file.id} className="inline-flex text-sm text-[var(--accent)] underline" href={`/api/cb/files/${file.id}`}>
                {file.filename}
              </a>
            ))}
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
            className="block max-w-full text-xs"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadInternalCertificate(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ExtraTable({
  title,
  items,
  onPatch,
  onAttach,
}: {
  title: string;
  items: BoardItem[];
  onPatch: (id: string, patch: Partial<BoardItem>) => void;
  onAttach: (itemId: string, file: File) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--line)] align-top">
                <td className="px-3 py-2 font-medium">{item.heading}</td>
                <td className="px-3 py-2 text-[var(--muted)]">{item.text}</td>
                <td className="px-3 py-2">{item.countryIso2 || "—"}</td>
                <td className="px-3 py-2">
                  <select
                    value={item.pass === true ? "true" : item.pass === false ? "false" : ""}
                    onChange={(e) =>
                      onPatch(item.id, {
                        pass: e.target.value === "true" ? true : e.target.value === "false" ? false : null,
                      })
                    }
                    className="rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                  >
                    <option value="">—</option>
                    <option value="true">Pass</option>
                    <option value="false">Fail</option>
                  </select>
                </td>
                <td className="px-3 py-2 space-y-1">
                  {item.evidence.map((file) => (
                    <a key={file.id} className="block text-[var(--accent)] underline" href={file.storageUri}>
                      {file.filename}
                    </a>
                  ))}
                  <input
                    type="file"
                    className="block max-w-[180px] text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) onAttach(item.id, file);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input value={item.notes} onChange={(e) => onPatch(item.id, { notes: e.target.value })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
