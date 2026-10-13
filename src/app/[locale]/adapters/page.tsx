import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { isLocale, type Locale } from "@/lib/i18n";
import { canOpenHubTools } from "@/lib/navigation";
import { resolveTariffStandardsPack } from "@/lib/tariff";
import { Badge } from "@/components/ui/badge";
import { AdaptersClient } from "./adapters-client";

const SUPPORTED = ["EAC", "ECOWAS", "COMESA"] as const;

export default async function AdaptersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ rec?: string; tariff?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/adapters`} />;
  if (!canOpenHubTools(session.user)) return <ClientRedirect href={`/${locale}/dashboard`} />;
  const sp = await searchParams;
  const rec = (sp.rec || "EAC").toUpperCase();
  const tariff = sp.tariff || (rec === "ECOWAS" ? "1006.30.00" : "1006.30");

  const outbox = await prisma.webhookOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const offline = await prisma.offlineCacheProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const entryPoints = await prisma.entryPoint.findMany({ take: 5 });

  const pending = await prisma.webhookOutbox.findMany({
    where: { OR: [{ targetHint: rec }, { targetHint: null }], status: "PENDING" },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const adapterJson = !SUPPORTED.includes(rec as (typeof SUPPORTED)[number])
    ? { error: `Adapter stub supports ${SUPPORTED.join(", ")} only` }
    : {
        adapter: rec,
        mode: "reference_stub",
        mapping: "WCO-DM-inspired conformity information utility block",
        tariffLookup: await resolveTariffStandardsPack(
          rec,
          rec === "ECOWAS" && tariff === "1006.30" ? "1006.30.00" : tariff,
        ),
        outboxPreview: pending.map((p) => ({
          id: p.id,
          eventType: p.eventType,
          createdAt: p.createdAt,
        })),
        notes:
          "Does not replace national single windows. Hub remains authoritative; adapter translates events outbound.",
      };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        Single-window adapters
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Reference stubs for EAC, ECOWAS and COMESA. Hub stays authoritative; adapters translate
        verify/lookup and drain the webhook outbox. Offline border profiles are HMAC-signed.
      </p>

      <AdaptersClient locale={locale} initialRec={rec} initialTariff={tariff} />

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-semibold">Adapter response ({rec})</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-[var(--surface-2)] p-3 text-xs leading-relaxed">
            {JSON.stringify(adapterJson, null, 2)}
          </pre>
        </div>
        <div className="space-y-6">
          <div className="panel p-5">
            <h2 className="font-semibold">Webhook outbox</h2>
            {outbox.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Empty — issue a CoC or sanction to enqueue.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {outbox.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)]/40 py-2">
                    <span>
                      {o.eventType} · {o.targetHint || "any"}
                    </span>
                    <Badge tone={o.status === "DELIVERED" ? "ok" : "info"}>{o.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="panel p-5">
            <h2 className="font-semibold">Offline border cache</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Entry points: {entryPoints.map((e) => e.code).join(", ") || "none"}
            </p>
            {offline.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No signed profiles yet — create one below.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {offline.map((o) => (
                  <li key={o.id} className="rounded-lg bg-[var(--surface-2)] p-3 font-mono text-xs">
                    {o.entryPointCode} · {o.pinCode} · asOf {o.asOf.toISOString().slice(0, 19)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
