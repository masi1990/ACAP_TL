"use client";

import Link from "next/link";
import { formatCents } from "@/lib/utils";
import { scopePreviewBlurb } from "@/lib/scope-text";
import { StoreClient } from "./store-client";

export function StoreCatalogItem({
  locale,
  catalogItemId,
  editionLabel,
  coverTitle,
  scopeEn,
  priceCents,
  currency,
  pesapalReady,
}: {
  locale: string;
  catalogItemId: string;
  editionLabel: string;
  coverTitle: string;
  scopeEn: string;
  priceCents: number;
  currency: string;
  pesapalReady: boolean;
}) {
  const previewHref = `/${locale}/store?preview=${encodeURIComponent(catalogItemId)}`;
  const scopeBlurb = scopePreviewBlurb(scopeEn);

  return (
    <article className="panel overflow-hidden">
      <Link
        href={previewHref}
        className="hero-plane block min-h-40 w-full px-5 py-6 transition-opacity hover:opacity-95"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">African Standard · tap to preview</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white">{editionLabel}</h2>
        <p className="mt-1 text-sm text-white/80">{coverTitle}</p>
      </Link>
      <div className="space-y-3 p-5">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">1 Scope: </span>
          {scopeBlurb}
        </p>
        <p className="text-lg font-semibold">{formatCents(priceCents, currency)}</p>
        <StoreClient
          locale={locale}
          catalogItemId={catalogItemId}
          designation={editionLabel}
          title={coverTitle}
          previewHref={previewHref}
          pesapalReady={pesapalReady}
        />
      </div>
    </article>
  );
}
