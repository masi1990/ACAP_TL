"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ReleaseAccountPage() {
  const params = useParams<{ locale: string; token: string }>();
  const router = useRouter();
  const locale = params.locale || "en";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/library/release/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), password: form.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create the account");
      return;
    }
    router.push(`/${locale}${data.next || "/library/request"}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Standards from ARSO</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        This link does not download the file. Create an account with the email ARSO wrote to. You will then request the standards officer role. If you already have an account, sign in instead.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm">Name<input name="name" required className="rounded-md border border-[var(--line)] px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Password<input name="password" type="password" minLength={8} required className="rounded-md border border-[var(--line)] px-3 py-2" /></label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button disabled={busy} className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">{busy ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-4 text-sm">
        <Link className="underline" href={`/${locale}/login?next=/${locale}/library`}>I already have an account</Link>
      </p>
    </div>
  );
}
