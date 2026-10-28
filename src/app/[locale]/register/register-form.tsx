"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";

export function RegisterForm({
  locale,
  countries,
  bodies,
}: {
  locale: string;
  countries: { value: string; label: string }[];
  bodies: { value: string; label: string }[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [type, setType] = useState("MANUFACTURER");
  const [countryIso2, setCountryIso2] = useState("");
  const [certifyingCbId, setCertifyingCbId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!countryIso2) {
      setError("Choose a country");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, organizationName, type, countryIso2, certifyingCbId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Account could not be created");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Account created</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Sign in with the email and password you chose.</p>
        <Link className="mt-6 inline-block text-sm text-[var(--accent)] underline" href={`/${locale}/login`}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Create account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        A manufacturer or importer account. You can open Home, the webstore, tariff lookup, certified products, PIN
        verify, and consumers without extra roles. An institution admin can assign further roles later.
      </p>
      <form onSubmit={onSubmit} className="panel mt-6 grid gap-4 p-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="reg-name">Your name</Label>
          <Input id="reg-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input id="reg-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-org">Organisation</Label>
          <Input
            id="reg-org"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-type">Kind</Label>
          <SearchSelect
            id="reg-type"
            value={type}
            onChange={setType}
            searchPlaceholder="Search kind"
            options={[
              { value: "MANUFACTURER", label: "Manufacturer" },
              { value: "IMPORTER", label: "Importer" },
            ]}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-country">Country</Label>
          <SearchSelect
            id="reg-country"
            value={countryIso2}
            onChange={setCountryIso2}
            placeholder="Select…"
            searchPlaceholder="Search countries"
            options={countries}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-cb">Preferred certification body</Label>
          <SearchSelect
            id="reg-cb"
            value={certifyingCbId}
            onChange={setCertifyingCbId}
            placeholder="Select…"
            searchPlaceholder="Search certification bodies"
            options={bodies}
          />
          <p className="text-xs text-[var(--muted)]">Suggested for new products. Each product can use another body.</p>
        </div>
        {error && <p className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
        <Button type="submit" className="sm:col-span-2" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already registered?{" "}
        <Link className="text-[var(--accent)] underline" href={`/${locale}/login`}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
