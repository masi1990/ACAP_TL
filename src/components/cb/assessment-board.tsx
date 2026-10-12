"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrudForm } from "@/components/admin/crud-form";
import { notifyCrud } from "@/components/ui/crud-notice";

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
  certificateNo,
}: {
  locale: string;
  applicationId: string;
  items: BoardItem[];
  certificateNo: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const standard = items.filter((i) => i.source === "STANDARD");
  const national = items.filter((i) => i.source === "NATIONAL");
  const other = items.filter((i) => i.source === "OTHER");

  async function save(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    const data = new FormData(form);
    const rows = standard.concat(national, other).map((item) => ({
      id: item.id,
      pass: String(data.get(`pass-${item.id}`) ?? ""),
      measuredValue: String(data.get(`measured-${item.id}`) ?? ""),
      unit: String(data.get(`unit-${item.id}`) ?? ""),
      notes: String(data.get(`notes-${item.id}`) ?? ""),
    }));
    const res = await fetch("/api/cb/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "save", applicationId, items: rows }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = body.error || "Could not save the results";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    notifyCrud("updated", "Pass and fail saved");
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
      const message = body.error || "Could not attach the laboratory file";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    notifyCrud("created", "Laboratory file attached");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-700">{error}</p>}

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

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          void save(e.currentTarget);
        }}
      >
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
                      <td className="px-3 py-2">{item.testMethod || "—"}</td>
                      <td className="px-3 py-2">
                        <Input name={`measured-${item.id}`} defaultValue={item.measuredValue} />
                      </td>
                      <td className="px-3 py-2">
                        <Input name={`unit-${item.id}`} defaultValue={item.unit} className="w-20" />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          name={`pass-${item.id}`}
                          defaultValue={item.pass === true ? "true" : item.pass === false ? "false" : ""}
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
                            if (file) void attach(item.id, file);
                          }}
                        />
                        <Input name={`notes-${item.id}`} defaultValue={item.notes} placeholder="Notes" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <ExtraTable title="National regulations" items={national} onAttach={attach} />
        <ExtraTable title="Other requirements" items={other} onAttach={attach} />

        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save pass and fail"}
        </Button>
      </form>

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
              { name: "countryIso2", label: "Country", required: true, placeholder: "KE" },
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

      <div className="space-y-2">
        <h3 className="font-semibold">Certificate of conformity</h3>
        {certificateNo ? (
          <a className="text-[var(--accent)] underline" href={`/${locale}/certificates/${certificateNo}`}>
            {certificateNo}
          </a>
        ) : (
          <CrudForm
            idPrefix="issue-"
            action="/api/cb/certificate"
            submitLabel="Issue certificate of conformity"
            fields={[{ name: "applicationId", label: "Application", defaultValue: applicationId, hidden: true }]}
          />
        )}
      </div>
    </div>
  );
}

function ExtraTable({
  title,
  items,
  onAttach,
}: {
  title: string;
  items: BoardItem[];
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
                    name={`pass-${item.id}`}
                    defaultValue={item.pass === true ? "true" : item.pass === false ? "false" : ""}
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
                      if (file) onAttach(item.id, file);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input name={`notes-${item.id}`} defaultValue={item.notes} />
                  <input type="hidden" name={`measured-${item.id}`} defaultValue={item.measuredValue} />
                  <input type="hidden" name={`unit-${item.id}`} defaultValue={item.unit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
