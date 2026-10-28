"use client";

import Link from "next/link";
import { addStoreCartLine, useStoreCart } from "@/lib/store-cart";

/**
 * Paid standards go into the cart. Checkout is a normal form POST on the cart page.
 * The server answers with a redirect to Pesapal, which phone browsers follow.
 */
export function StoreClient({
  locale,
  catalogItemId,
  designation,
  title,
  previewHref,
  languageReady,
  editionLocale,
  previewLocale,
  languageLabel,
  priceCents,
  currency,
  distribution = "PAID",
}: {
  locale: string;
  catalogItemId: string;
  designation: string;
  title: string;
  previewHref: string;
  languageReady: boolean;
  editionLocale: string;
  previewLocale: string;
  languageLabel: string;
  priceCents: number;
  currency: string;
  distribution?: string;
}) {
  const cart = useStoreCart();
  const inCart = cart.some(
    (line) => line.catalogItemId === catalogItemId && line.editionLocale === editionLocale,
  );

  if (distribution === "FREE_VIEW" || distribution === "FREE_DOWNLOAD") {
    const downloadHref = `/api/store/free?item=${encodeURIComponent(catalogItemId)}&lang=${encodeURIComponent(editionLocale)}`;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <a
            href={previewHref}
            className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--ink)] px-4 text-base font-medium text-white"
          >
            Read the standard
          </a>
          {distribution === "FREE_DOWNLOAD" ? (
            <a
              href={languageReady ? downloadHref : undefined}
              aria-disabled={!languageReady}
              className={`inline-flex h-12 items-center justify-center rounded-md border border-[var(--ink)] bg-white px-4 text-base font-medium text-[var(--ink)] ${languageReady ? "" : "pointer-events-none opacity-50"}`}
            >
              Download
            </a>
          ) : null}
        </div>
        <p className="text-base text-[var(--ink)]">
          {distribution === "FREE_VIEW"
            ? `${designation} is free to read on screen. It cannot be downloaded.`
            : `Choose a language, then download ${designation}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!languageReady || inCart}
          onClick={() => {
            if (!languageReady) return;
            addStoreCartLine({
              catalogItemId,
              editionLocale,
              designation,
              title,
              languageLabel: languageLabel || editionLocale,
              priceCents,
              currency,
            });
          }}
          className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-base font-medium text-[var(--accent-fg)] disabled:opacity-50"
        >
          {inCart ? "In cart" : "Add to cart"}
        </button>
        <Link
          href={`/${locale}/store/cart`}
          className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-base font-medium text-[var(--ink)]"
        >
          {cart.length > 0 ? `View cart (${cart.length})` : "View cart"}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <form method="get" action={`/${locale}/store`} className="inline">
          <input type="hidden" name="preview" value={catalogItemId} />
          <input type="hidden" name="lang" value={previewLocale} />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-base font-medium text-[var(--ink)]"
          >
            Preview cover + Scope
          </button>
        </form>
        <a
          href={previewHref}
          className="inline-flex h-12 items-center justify-center rounded-md px-3 text-base text-[var(--accent)] underline sm:hidden"
        >
          Open preview
        </a>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {languageReady
          ? inCart
            ? `${designation} in ${languageLabel} is in your cart.`
            : `Add ${designation} in ${languageLabel}, then pay from the cart.`
          : "Choose a language, then add this standard to the cart."}
      </p>
    </div>
  );
}
