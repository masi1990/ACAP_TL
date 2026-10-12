import { type Locale } from "@/lib/i18n";

/** Native GET form — works without client hydration */
export function VerifyForm({ locale, initialPin }: { locale: Locale; initialPin: string }) {
  return (
    <form
      method="get"
      action={`/${locale}/verify`}
      className="panel rise-delay-2 mt-8 grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="grid gap-2">
        <label htmlFor="pin" className="text-sm font-medium text-[var(--ink)]">
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          defaultValue={initialPin}
          placeholder="PIN-XXXXXXXX"
          required
          className="flex h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] shadow-sm hover:brightness-110"
      >
        Verify
      </button>
    </form>
  );
}
