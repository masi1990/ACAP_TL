import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  tone = "default",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "ok" | "warn" | "bad" | "info";
}) {
  const tones = {
    default: "bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line)]",
    ok: "bg-emerald-500/15 text-emerald-900 border-emerald-700/20",
    warn: "bg-amber-500/15 text-amber-950 border-amber-700/20",
    bad: "bg-rose-500/15 text-rose-950 border-rose-700/20",
    info: "bg-sky-500/15 text-sky-950 border-sky-700/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
