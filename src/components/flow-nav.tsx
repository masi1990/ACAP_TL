import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { PUBLIC_FLOW } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export { PUBLIC_FLOW };

export function FlowNav({ locale, current }: { locale: Locale; current: (typeof PUBLIC_FLOW)[number]["id"] }) {
  return (
    <nav aria-label="Product path" className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {PUBLIC_FLOW.map((step, index) => {
        const active = step.id === current;
        return (
          <Link
            key={step.id}
            href={`/${locale}${step.path}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs",
              active
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            {index + 1}. {t(locale, step.label)}
          </Link>
        );
      })}
    </nav>
  );
}
