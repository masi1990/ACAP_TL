"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StoreClient({
  locale,
  catalogItemId,
  designation,
  title,
  previewHref,
  pesapalReady,
}: {
  locale: string;
  catalogItemId: string;
  designation: string;
  title: string;
  previewHref: string;
  pesapalReady: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function checkout() {
    setBusy(true);
    setMsg(null);
    setArtifact(null);
    const res = await fetch("/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogItemId,
        buyerEmail: email,
        buyerName: name,
        buyerPhone: phone,
        provider: "PESAPAL",
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Checkout failed");
      return;
    }
    if (data.redirectUrl) {
      setMsg("Redirecting to Pesapal…");
      window.location.assign(data.redirectUrl);
      return;
    }
    setMsg(data.message);
    setArtifact(data.artifactUri || null);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Buyer name" />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Buyer email" />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (for M-Pesa / STK)"
          className="sm:col-span-2"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Native GET — opens preview overlay without relying on client onClick */}
        <form method="get" action={`/${locale}/store`} className="inline">
          <input type="hidden" name="preview" value={catalogItemId} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-3)] disabled:opacity-50"
          >
            Preview cover + Scope
          </button>
        </form>
        <a
          href={previewHref}
          className="inline-flex h-10 items-center justify-center rounded-md border border-transparent px-3 text-sm text-[var(--accent)] underline sm:hidden"
        >
          Open preview
        </a>
        <Button disabled={busy || !pesapalReady} onClick={() => checkout()}>
          Pay with Pesapal
        </Button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Purchasing {designation} — {title}
      </p>
      {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}
      {artifact && (
        <a className="text-sm text-[var(--accent)] underline" href={artifact} target="_blank">
          Download watermarked PDF
        </a>
      )}
    </div>
  );
}
