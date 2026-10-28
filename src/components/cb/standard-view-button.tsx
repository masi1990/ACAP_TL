"use client";

import { useState } from "react";
import { FullPreviewViewer } from "@/components/admin/full-preview-viewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AdminFullStandardPreview } from "@/lib/admin-standard-preview";

export function StandardViewButton({ standardId, label }: { standardId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<AdminFullStandardPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openStandard() {
    setOpen(true);
    if (preview?.standardId === standardId) return;
    setPreview(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/cb/standards/${standardId}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "The standard could not be opened");
      setPreview(body as AdminFullStandardPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The standard could not be opened");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="text-left text-[var(--accent)] underline" onClick={() => void openStandard()}>
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(1100px,calc(100vw-1.5rem))]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{preview ? `${preview.designation} — ${preview.titleOnly}` : label}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden" style={{ height: "min(78vh, 820px)" }}>
            {busy && <p className="px-5 py-4 text-sm text-[var(--muted)]">Opening the standard…</p>}
            {error && <p className="px-5 py-4 text-sm text-rose-700">{error}</p>}
            {preview && (
              <FullPreviewViewer data={preview} closeHref="#products" viewOnly showBack={false} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
