"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const params = useParams();
  const raw = String(params.locale || "en");
  const locale: Locale = isLocale(raw) ? raw : "en";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setMessage(data.message || "If that email is registered, a reset link is on its way.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Reset password</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">We email a link if the account exists. The reply is the same either way.</p>
      <form onSubmit={onSubmit} className="panel mt-6 space-y-4 p-5">
        <div className="grid gap-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <Link className="text-[var(--accent)] underline" href={`/${locale}/login`}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
