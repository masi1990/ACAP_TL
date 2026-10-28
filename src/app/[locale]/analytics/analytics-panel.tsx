"use client";

import { useEffect, useState } from "react";
import { DeskTabs } from "../cb/desk-tabs";
import type { AnalyticsPayload } from "@/lib/analytics";
import { t, type Locale } from "@/lib/i18n";

const POLL_MS = 5000;

function Cards({ items }: { items: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="panel p-5">
          <p className="text-sm text-[var(--muted)]">{item.label}</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPanel({
  locale,
  signedIn,
  hub,
  initial,
}: {
  locale: Locale;
  signedIn: boolean;
  hub: boolean;
  initial: AnalyticsPayload;
}) {
  const [data, setData] = useState(initial);
  const [updated, setUpdated] = useState<string>("");

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        const json = (await res.json()) as AnalyticsPayload & { ok?: boolean };
        if (!stop && json.public) {
          setData(json);
          setUpdated(new Date().toLocaleTimeString());
        }
      } catch {
        /* keep the last figures */
      }
    }
    const timer = setInterval(load, POLL_MS);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  const qualityOnly = Math.max(0, data.public.quality - data.public.both);
  const ecoOnly = Math.max(0, data.public.eco - data.public.both);
  const tabs = [
    {
      id: "overview",
      label: t(locale, "Overview"),
      content: (
        <div className="space-y-6">
          <Cards
            items={[
              { label: t(locale, "Certified products"), value: data.public.certified },
              { label: t(locale, "Quality Mark"), value: data.public.quality },
              { label: t(locale, "Eco Mark Africa"), value: data.public.eco },
              { label: t(locale, "Both marks"), value: data.public.both },
            ]}
          />
          <RegionList locale={locale} regions={data.public.regions} />
        </div>
      ),
    },
    {
      id: "quality",
      label: t(locale, "Quality Mark"),
      content: (
        <div className="space-y-6">
          <Cards
            items={[
              { label: "Products with the Quality Mark", value: data.public.quality },
              { label: "Quality Mark only", value: qualityOnly },
              { label: "Also Eco Mark Africa", value: data.public.both },
            ]}
          />
          <RegionList locale={locale} regions={data.public.regions} />
        </div>
      ),
    },
    {
      id: "eco",
      label: t(locale, "Eco Mark"),
      content: (
        <div className="space-y-6">
          <Cards
            items={[
              { label: "Products with Eco Mark Africa", value: data.public.eco },
              { label: "Eco Mark only", value: ecoOnly },
              { label: "Also the Quality Mark", value: data.public.both },
            ]}
          />
          <RegionList locale={locale} regions={data.public.regions} />
        </div>
      ),
    },
  ];
  if (signedIn && data.pipeline) {
    const rows = data.pipeline.rows;
    const count = (status: string, mark?: string) =>
      rows
        .filter((row) => row.status === status && (!mark || row.markScheme === mark))
        .reduce((sum, row) => sum + row.count, 0);
    tabs.push({
      id: "pipeline",
      label: t(locale, "Pipeline"),
      content: (
        <div className="space-y-6">
          <Cards
            items={[
              { label: "Waiting for acceptance", value: count("PENDING_APPROVAL") },
              { label: "In assessment", value: count("EVALUATION") + count("REVIEW") + count("DECISION") },
              { label: "Certified", value: count("CERTIFIED") },
              { label: "Rejected", value: count("REJECTED") },
              { label: "Quality in assessment", value: count("EVALUATION", "QUALITY") },
              { label: "Eco in assessment", value: count("EVALUATION", "ECO") },
            ]}
          />
        </div>
      ),
    });
  }
  if (hub && data.operations) {
    const ops = data.operations;
    tabs.push({
      id: "operations",
      label: t(locale, "Operations"),
      content: (
        <Cards
          items={[
            { label: "Standard versions", value: ops.standards },
            { label: "Tariff maps", value: ops.maps },
            { label: "Certificates", value: ops.certificates },
            { label: "PINs", value: ops.pins },
            { label: "Fulfilled store orders", value: ops.orders },
            { label: "Webhook outbox", value: ops.outbox },
            { label: "Audit events", value: ops.audits },
          ]}
        />
      ),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        {t(locale, "Figures refresh every few seconds")}
        {updated ? ` · ${updated}` : ""}.
      </p>
      <DeskTabs tabs={tabs} />
    </div>
  );
}

function RegionList({ locale, regions }: { locale: Locale; regions: AnalyticsPayload["public"]["regions"] }) {
  return (
    <div className="panel p-5">
      <h2 className="font-semibold">{t(locale, "Certified products by region")}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {regions.map((region) => (
          <li key={region.id} className="flex justify-between border-b border-[var(--line)]/40 py-2">
            <span>{region.label}</span>
            <span className="font-mono">{region.products}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
