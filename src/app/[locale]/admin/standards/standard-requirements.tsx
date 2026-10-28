"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FullPreviewViewer } from "@/components/admin/full-preview-viewer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import type { AdminFullStandardPreview } from "@/lib/admin-standard-preview";
import { clauseInsertIndex } from "@/lib/standard-assessment";

type RequirementItem = {
  itemKey: string;
  clause: string;
  heading: string;
  text: string;
  testMethod: string;
  kind: "clause" | "table";
};

type RequirementGroup = {
  section: string;
  items: RequirementItem[];
};

type AddedRequirement = RequirementItem & { section: string };

export type StandardRequirementSet = {
  id: string;
  label: string;
  groups: RequirementGroup[];
};

const emptyClause = { clause: "", heading: "", requirement: "", limit: "", testMethod: "" };

export function StandardRequirements({
  sets,
  canPreview,
  canWrite,
}: {
  sets: StandardRequirementSet[];
  canPreview: boolean;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [standardId, setStandardId] = useState(sets[0]?.id ?? "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [clauseForm, setClauseForm] = useState(emptyClause);
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [added, setAdded] = useState<Record<string, AddedRequirement[]>>({});
  const [preview, setPreview] = useState<AdminFullStandardPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const loadedId = useRef<string | null>(null);
  const current = sets.find((set) => set.id === standardId) ?? sets[0];

  useEffect(() => {
    if (!previewOpen || !canPreview || !current) return;
    if (loadedId.current === current.id) return;
    const id = current.id;
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    setPreviewBusy(true);
    fetch(`/api/admin/standards/${id}/preview`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "The standard could not be opened");
        return body as AdminFullStandardPreview;
      })
      .then((data) => {
        if (!cancelled) {
          loadedId.current = data.standardId;
          setPreview(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setPreviewError(err instanceof Error ? err.message : "The standard could not be opened");
      })
      .finally(() => {
        if (!cancelled) setPreviewBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewOpen, canPreview, current]);

  function groupsFor(set: StandardRequirementSet) {
    const extras = (added[set.id] || []).filter(
      (item) => !set.groups.some((group) => group.items.some((row) => row.itemKey === item.itemKey)),
    );
    if (!extras.length) return set.groups;
    const groups = set.groups.map((group) => ({ ...group, items: [...group.items] }));
    const pending = [...extras].sort((a, b) => {
      if (clauseInsertIndex([b.clause], a.clause) === 0) return -1;
      if (clauseInsertIndex([a.clause], b.clause) === 0) return 1;
      return a.clause.localeCompare(b.clause);
    });
    for (const item of pending) {
      const title = item.heading || item.text;
      const section =
        item.section && item.section !== "Added manually"
          ? item.section
          : `${item.clause} ${title}`.replace(/\s+/g, " ").trim();
      const idx = clauseInsertIndex(
        groups.map((group) => group.items[0]?.clause || ""),
        item.clause,
      );
      groups.splice(idx, 0, { section, items: [item] });
    }
    return groups;
  }

  async function saveClause() {
    if (!current) return;
    setAddError(null);
    setAddBusy(true);
    try {
      const res = await fetch(`/api/admin/standards/${current.id}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clauseForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "The clause could not be saved");
      const item = body.item as AddedRequirement;
      setAdded((prev) => ({ ...prev, [current.id]: [...(prev[current.id] || []), item] }));
      setClauseForm(emptyClause);
      setAddOpen(false);
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "The clause could not be saved");
    } finally {
      setAddBusy(false);
    }
  }

  if (!current) {
    return <p className="text-sm text-[var(--muted)]">No standards yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex max-w-3xl flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1 space-y-1">
          <label htmlFor="requirement-standard" className="text-sm font-medium">
            Standard
          </label>
          <SearchSelect
            id="requirement-standard"
            value={current.id}
            onChange={setStandardId}
            options={sets.map((set) => ({ value: set.id, label: set.label }))}
            placeholder="Select a standard"
            searchPlaceholder="Search standards"
          />
        </div>
        {canPreview && (
          <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
            Preview standard
          </Button>
        )}
        {canWrite && (
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add missing clause
          </Button>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          aria-describedby="standard-preview-desc"
          className="h-[min(92vh,960px)] w-[min(1200px,calc(100vw-1.5rem))]"
        >
          <DialogHeader>
            <DialogTitle>Standard preview</DialogTitle>
            <p id="standard-preview-desc" className="mt-1 text-sm text-[var(--muted)]">
              {current.label}
            </p>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            {previewBusy && <p className="px-5 py-4 text-sm text-[var(--muted)]">Opening the standard…</p>}
            {previewError && <p className="px-5 py-4 text-sm text-rose-700">{previewError}</p>}
            {preview && <FullPreviewViewer data={preview} closeHref="#requirements" showBack={false} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent aria-describedby="add-clause-desc" className="max-h-[92vh] w-[min(640px,calc(100vw-1.5rem))]">
          <DialogHeader>
            <DialogTitle>Add missing clause</DialogTitle>
            <p id="add-clause-desc" className="mt-1 text-sm text-[var(--muted)]">
              Enter a clause from this standard that the machine pack missed. It is listed with the other clauses, in clause-number order.
            </p>
          </DialogHeader>
          <form
            className="space-y-3 overflow-y-auto px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveClause();
            }}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Clause</span>
              <Input
                value={clauseForm.clause}
                onChange={(event) => setClauseForm({ ...clauseForm, clause: event.target.value })}
                placeholder="4.1.10"
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Heading</span>
              <Input
                value={clauseForm.heading}
                onChange={(event) => setClauseForm({ ...clauseForm, heading: event.target.value })}
                placeholder="Optional short title"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Requirement</span>
              <textarea
                value={clauseForm.requirement}
                onChange={(event) => setClauseForm({ ...clauseForm, requirement: event.target.value })}
                placeholder="The clause text the pack missed"
                required
                rows={4}
                className="flex w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Limit</span>
                <Input
                  value={clauseForm.limit}
                  onChange={(event) => setClauseForm({ ...clauseForm, limit: event.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Test method</span>
                <Input
                  value={clauseForm.testMethod}
                  onChange={(event) => setClauseForm({ ...clauseForm, testMethod: event.target.value })}
                  placeholder="Optional, e.g. ISO 1234"
                />
              </label>
            </div>
            {addError && <p className="text-sm text-rose-700">{addError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)} disabled={addBusy}>
                Cancel
              </Button>
              <Button type="submit" disabled={addBusy}>
                {addBusy ? "Saving…" : "Save clause"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {groupsFor(current).length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No requirements stored for this standard.</p>
      ) : (
        groupsFor(current).map((group, index) => (
          <section key={`${index}-${group.section}`} className="space-y-2">
            <h3 className="text-sm font-semibold">{group.section}</h3>
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                    <th className="px-3 py-2">Clause</th>
                    <th className="px-3 py-2">Requirement</th>
                    <th className="px-3 py-2">Limit</th>
                    <th className="px-3 py-2">Test method</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.itemKey} className="border-b border-[var(--line)] align-top">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{item.clause || "—"}</td>
                      <td className="px-3 py-2">
                        {item.heading && <div className="font-medium">{item.heading}</div>}
                        {item.kind === "clause" && <div className="text-[var(--muted)]">{item.text}</div>}
                      </td>
                      <td className="px-3 py-2">{item.kind === "table" ? item.text : "—"}</td>
                      <td className="px-3 py-2">{item.testMethod || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
