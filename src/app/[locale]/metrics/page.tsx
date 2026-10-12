import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n";

export default async function MetricsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();

  const [standards, maps, cocs, pins, orders, outbox, audits, snapshots] = await Promise.all([
    prisma.standardVersion.count(),
    prisma.standardTariffMap.count(),
    prisma.coC.count(),
    prisma.productPin.count(),
    prisma.order.count({ where: { status: "FULFILLED" } }),
    prisma.webhookOutbox.count(),
    prisma.auditEvent.count(),
    prisma.metricSnapshot.findMany({ orderBy: { takenAt: "desc" }, take: 12 }),
  ]);

  const cards = [
    { label: "Standard versions", value: standards },
    { label: "Tariff maps", value: maps },
    { label: "Certificates (CoC)", value: cocs },
    { label: "Active PINs", value: pins },
    { label: "Fulfilled store orders", value: orders },
    { label: "Webhook outbox", value: outbox },
    { label: "Audit events", value: audits },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Hub metrics</h1>
      <p className="mt-2 text-[var(--muted)]">
        Basic operational dashboard for the ACAP–TL pilot. Rate limits protect public verify.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <p className="text-sm text-[var(--muted)]">{c.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="panel mt-8 p-5">
        <h2 className="font-semibold">Seed snapshots</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {snapshots.map((s) => (
            <li key={s.id} className="flex justify-between border-b border-[var(--line)]/40 py-2">
              <span>{s.key}</span>
              <span className="font-mono">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
