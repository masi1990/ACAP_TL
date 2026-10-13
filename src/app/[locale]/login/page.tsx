"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const params = useParams();
  const search = useSearchParams();
  const raw = String(params.locale || "en");
  const locale: Locale = isLocale(raw) ? raw : "en";
  const nextPath = search.get("next");
  const safeNext =
    nextPath && nextPath.startsWith(`/${locale}/`) && !nextPath.startsWith("//")
      ? nextPath
      : `/${locale}/dashboard`;
  const [email, setEmail] = useState("admin@arso-oran.org");
  const [password, setPassword] = useState("ChangeMe!ACAP");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function doLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Sign-in failed");
      return;
    }
    window.location.assign(safeNext);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">{t(locale, "login")}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        After sign-in you land on your dashboard with assigned roles. Bootstrap:
        admin@arso-oran.org (ARSO_ADMIN) · password ChangeMe!ACAP.
      </p>
      <form onSubmit={doLogin} className="panel mt-6 space-y-4 p-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t(locale, "loading") : t(locale, "login")}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-sm text-[var(--muted)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
