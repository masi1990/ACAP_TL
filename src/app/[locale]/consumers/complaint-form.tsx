"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { notifyCrud } from "@/components/ui/crud-notice";
import { withBasePath } from "@/lib/base-path";

type Hit = {
  id: string;
  productName: string;
  brand: string;
  manufacturer: string;
  pinCode: string | null;
  cbName: string;
  countryName: string;
};

export function ComplaintForm({
  countryOptions,
}: {
  countryOptions: { value: string; label: string }[];
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (selected) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          withBasePath(`/api/chain/certified-products?q=${encodeURIComponent(term)}&pageSize=20`),
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setHits(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, selected]);

  const hitOptions = useMemo(
    () =>
      hits.map((hit) => ({
        value: hit.id,
        label: `${hit.brand || hit.productName} · ${hit.manufacturer}${hit.pinCode ? ` · PIN ${hit.pinCode}` : ""} · ${hit.cbName}`,
      })),
    [hits],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      setError("Search and confirm a certified product first");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    data.set("registryKey", selected.id);
    data.set("productId", selected.id.startsWith("live-") ? "" : selected.id);
    data.set("pinCode", selected.pinCode || "");
    data.set("brand", selected.brand || selected.productName);
    data.set("manufacturer", selected.manufacturer);

    try {
      const res = await fetch(withBasePath("/api/chain/complaints"), { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = body.error || "Could not submit complaint";
        setError(message);
        notifyCrud("error", message);
        setBusy(false);
        return;
      }
      setMsg(body.message || "Complaint filed");
      notifyCrud("created", "Complaint filed");
      setSelected(null);
      setQ("");
      setHits([]);
      setFormKey((n) => n + 1);
      formEl.reset();
    } catch {
      setError("Could not submit complaint");
      notifyCrud("error", "Could not submit complaint");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="panel grid max-w-2xl gap-4 p-4" autoComplete="off">
      <div className="grid gap-1">
        <Label htmlFor="product-search">Certified product</Label>
        <p className="text-xs text-[var(--muted)]">
          Search by PIN, brand, or manufacturer, then confirm the product so the complaint reaches the CB that
          certified it.
        </p>
        {!selected ? (
          <>
            <Input
              id="product-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type PIN, brand, or manufacturer"
            />
            {searching ? <p className="text-xs text-[var(--muted)]">Searching…</p> : null}
            {hitOptions.length > 0 ? (
              <SearchSelect
                id="product-pick"
                value=""
                onChange={(id) => {
                  const hit = hits.find((row) => row.id === id) || null;
                  setSelected(hit);
                  setQ("");
                  setHits([]);
                }}
                placeholder="Confirm a certified product…"
                searchPlaceholder="Filter results"
                options={hitOptions}
              />
            ) : q.trim().length >= 2 && !searching ? (
              <p className="text-xs text-[var(--muted)]">No certified products match that search.</p>
            ) : null}
          </>
        ) : (
          <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm">
            <p className="font-medium">{selected.brand || selected.productName}</p>
            <p className="text-[var(--muted)]">Manufacturer: {selected.manufacturer}</p>
            {selected.pinCode ? <p className="text-[var(--muted)]">PIN: {selected.pinCode}</p> : null}
            <p className="text-[var(--muted)]">Certifying CB: {selected.cbName}</p>
            <button
              type="button"
              className="mt-2 text-sm text-[var(--accent)] underline"
              onClick={() => setSelected(null)}
            >
              Change product
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="complainantEmail">Your email</Label>
        <Input id="complainantEmail" name="complainantEmail" type="email" required placeholder="name@example.com" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="body">What you found</Label>
        <textarea
          id="body"
          name="body"
          required
          className="min-h-24 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="manufactureCountryIso2">Country of manufacture</Label>
          <select
            id="manufactureCountryIso2"
            name="manufactureCountryIso2"
            required
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {countryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="originCountryIso2">Country of origin</Label>
          <select
            id="originCountryIso2"
            name="originCountryIso2"
            required
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {countryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="purchasePlace">Where the product was bought (optional)</Label>
        <Input id="purchasePlace" name="purchasePlace" placeholder="Shop, market, gift, online seller…" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="quantity">Quantity (optional)</Label>
          <Input id="quantity" name="quantity" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="flavour">Flavour (optional, for food)</Label>
          <Input id="flavour" name="flavour" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="manufacturedOn">Date of manufacture (optional)</Label>
          <Input id="manufacturedOn" name="manufacturedOn" type="date" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expiresOn">Expiry date (optional)</Label>
          <Input id="expiresOn" name="expiresOn" type="date" />
        </div>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="labelPhoto">Photo 1 — product label visible (optional)</Label>
        <p className="text-xs text-[var(--muted)]">Ensure the product label is clear and readable.</p>
        <Input id="labelPhoto" name="labelPhoto" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="markPhoto">Photo 2 — ARSO quality mark on the product (optional)</Label>
        <p className="text-xs text-[var(--muted)]">Show where the ARSO quality mark is placed on the product.</p>
        <Input id="markPhoto" name="markPhoto" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="receiptPhoto">Photo 3 — receipt (optional)</Label>
        <p className="text-xs text-[var(--muted)]">
          Attach a receipt if you have one. Otherwise describe where it was purchased above.
        </p>
        <Input id="receiptPhoto" name="receiptPhoto" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {msg ? <p className="text-sm text-green-800">{msg}</p> : null}
      <Button type="submit" disabled={busy || !selected}>
        {busy ? "Submitting…" : "Submit complaint"}
      </Button>
    </form>
  );
}
