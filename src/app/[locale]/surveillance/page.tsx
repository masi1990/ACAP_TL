import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { SurveillanceClient } from "./surveillance-client";

export default async function SurveillancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session || !can(session.user, "surveillance:operate")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Market surveillance</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This desk is for market surveillance officers. Consumers can file a report without an account.
        </p>
        <Link className="mt-4 inline-block text-sm text-[var(--accent)] underline" href={`/${locale}/consumers`}>
          Consumer complaints
        </Link>
      </div>
    );
  }

  const [cases, complaints, frauds] = await Promise.all([
    prisma.surveillanceCase.findMany({
      include: { sanctions: true, pin: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.consumerComplaint.findMany({
      include: { pin: true, routedCb: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.fraudAlert.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        Market surveillance & consumer
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        QR/PIN verify feeds complaints to the certifying CB; cascading sanctions can suspend PIN, CoC, and marks.
      </p>

      <SurveillanceClient locale={locale} />

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="font-semibold">Surveillance cases</h2>
          {cases.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No open cases.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {cases.map((c) => (
                <li key={c.id} className="rounded-lg bg-[var(--surface-2)] p-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="font-medium">{c.title}</span>
                    <Badge tone={c.status === "SANCTIONED" ? "bad" : "info"}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-[var(--muted)]">{c.summary}</p>
                  {c.sanctions.map((s) => (
                    <p key={s.id} className="mt-1 text-xs">
                      Sanction {s.level}
                      {s.cascadesTo ? ` → ${s.cascadesTo}` : ""}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="font-semibold">Consumer complaints</h2>
          {complaints.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No complaints filed.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {complaints.map((c) => (
                <li key={c.id} className="rounded-lg bg-[var(--surface-2)] p-3">
                  <p className="font-medium">{c.subject}</p>
                  <p className="text-[var(--muted)]">{c.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Routed to {c.routedCb?.name || "unassigned"} · {c.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="font-semibold">Fraud / mark-misuse</h2>
          {frauds.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No alerts.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {frauds.map((f) => (
                <li key={f.id} className="rounded-lg bg-[var(--surface-2)] p-3">
                  <Badge tone="bad">{f.kind}</Badge>
                  <p className="mt-2">{f.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
