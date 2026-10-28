"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetForm() {
  const params = useParams();
  const search = useSearchParams();
  const raw = String(params.locale || "en");
  const locale: Locale = isLocale(raw) ? raw : "en";
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "This link is no longer valid");
      return;
    }
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Set a new password</h1>
      {done ? (
        <p className="mt-4 text-sm">
          Password saved.{" "}
          <Link className="text-[var(--accent)] underline" href={`/${locale}/login`}>
            Sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="panel mt-6 space-y-4 p-5">
          {!token && <p className="text-sm text-rose-700">Open the link from the email.</p>}
          <div className="grid gap-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-sm text-[var(--muted)]">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
