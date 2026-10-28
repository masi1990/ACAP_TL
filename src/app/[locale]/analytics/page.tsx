import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { operationsAnalytics, pipelineAnalytics, publicAnalytics } from "@/lib/analytics";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { canOpenHubTools } from "@/lib/navigation";
import { AnalyticsPanel } from "./analytics-panel";

export default async function AnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  const hub = Boolean(session && canOpenHubTools(session.user));
  const initial = {
    public: await publicAnalytics(),
    ...(session ? { pipeline: await pipelineAnalytics() } : {}),
    ...(hub ? { operations: await operationsAnalytics() } : {}),
  };

  return (
    <div className="shell py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{t(locale, "analyticsTitle")}</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">{t(locale, "analyticsHint")}</p>
      <div className="mt-8">
        <AnalyticsPanel locale={locale} signedIn={Boolean(session)} hub={hub} initial={initial} />
      </div>
    </div>
  );
}
