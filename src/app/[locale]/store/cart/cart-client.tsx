"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";
import { removeStoreCartLine, useStoreCart, type StoreCartLine } from "@/lib/store-cart";

type QuoteLine = {
  catalogItemId: string;
  editionLocale: string;
  unitPriceCents: number;
  currency: string;
  coverTitle: string;
  editionLabel: string;
};

type Quote = {
  lines: QuoteLine[];
  problems: { catalogItemId: string; editionLocale: string; message: string }[];
  currencyError: string | null;
  totalCents: number;
  currency: string;
  payable: boolean;
};

const field =
  "flex h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] placeholder:text-[var(--muted)]";

function lineKey(catalogItemId: string, editionLocale: string) {
  return `${catalogItemId}:${editionLocale}`;
}

export function CartClient({
  locale,
  pesapalReady,
  payError,
}: {
  locale: string;
  pesapalReady: boolean;
  payError: string;
}) {
  const saved = useStoreCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checking, setChecking] = useState(false);

  const cartKey = saved.map((line) => `${line.catalogItemId}:${line.editionLocale}`).join(",");
  useEffect(() => {
    if (!cartKey) {
      setQuote(null);
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setChecking(true);
    fetch(`/api/store/cart?items=${encodeURIComponent(cartKey)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("quote failed");
        return (await response.json()) as Quote;
      })
      .then((body) => {
        if (!cancelled) setQuote(body);
      })
      .catch((err: unknown) => {
        if (cancelled || (err as { name?: string }).name === "AbortError") return;
        setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cartKey]);

  const quotedByKey = new Map((quote?.lines || []).map((line) => [lineKey(line.catalogItemId, line.editionLocale), line]));
  const problemByKey = new Map(
    (quote?.problems || [])
      .filter((problem) => problem.catalogItemId)
      .map((problem) => [lineKey(problem.catalogItemId, problem.editionLocale), problem.message]),
  );
  const payableLines = quote?.payable ? quote.lines : [];
  const totalLabel = quote
    ? formatCents(quote.totalCents, quote.currency)
    : saved.length > 0
      ? formatCents(
          saved.reduce((sum, line) => sum + line.priceCents, 0),
          saved[0]?.currency || "USD",
        )
      : "";

  return (
    <div className="shell max-w-3xl py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-[var(--muted)]">
        Review the standards you added, then pay once. Each standard is released after Pesapal confirms the payment.
      </p>
      {payError ? (
        <div className="mt-4 rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-900">{payError}</div>
      ) : null}

      {saved.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center">
          <p className="text-[var(--muted)]">Your cart is empty.</p>
          <Link href={`/${locale}/store`} className="mt-3 inline-block text-[var(--accent)] underline">
            Browse the webstore
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {saved.map((line) => (
              <CartRow
                key={lineKey(line.catalogItemId, line.editionLocale)}
                line={line}
                quoted={quotedByKey.get(lineKey(line.catalogItemId, line.editionLocale))}
                problem={problemByKey.get(lineKey(line.catalogItemId, line.editionLocale))}
              />
            ))}
          </ul>
          <p className="mt-4 text-right text-xl font-semibold">
            {checking && !quote ? "Checking prices…" : `Total ${totalLabel}`}
          </p>
          {quote?.currencyError ? <p className="mt-2 text-sm text-rose-700">{quote.currencyError}</p> : null}
          {quote && !quote.payable && quote.problems.some((problem) => !problem.catalogItemId) ? (
            <p className="mt-2 text-sm text-rose-700">{quote.problems.find((problem) => !problem.catalogItemId)?.message}</p>
          ) : null}

          <form method="post" action="/api/store/checkout" className="mt-8 space-y-3">
            <input type="hidden" name="provider" value="PESAPAL" />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="next" value="cart" />
            {(payableLines.length > 0 ? payableLines : saved).map((line) => (
              <span key={lineKey(line.catalogItemId, line.editionLocale)}>
                <input type="hidden" name="catalogItemId" value={line.catalogItemId} />
                <input type="hidden" name="editionLocale" value={line.editionLocale} />
              </span>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="buyerName" required autoComplete="name" placeholder="Buyer name" className={field} />
              <input
                name="buyerEmail"
                type="email"
                inputMode="email"
                required
                autoComplete="email"
                placeholder="Buyer email"
                className={field}
              />
              <input
                name="buyerPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="Phone, for example 0712345678"
                className={`${field} sm:col-span-2`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                name="channel"
                value="MPESA"
                disabled={!pesapalReady || checking || (quote ? !quote.payable : saved.length === 0)}
                className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-base font-medium text-[var(--accent-fg)] disabled:opacity-50"
              >
                Pay with M-Pesa
              </button>
              <button
                type="submit"
                name="channel"
                value="CARD"
                disabled={!pesapalReady || checking || (quote ? !quote.payable : saved.length === 0)}
                className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-base font-medium text-[var(--ink)] disabled:opacity-50"
              >
                Pay with card
              </button>
            </div>
            {!pesapalReady ? (
              <p className="text-sm text-rose-700">Pesapal is not ready on this server, so payment cannot start.</p>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                You will continue to Pesapal. Press Proceed, then approve M-Pesa on your phone or pay by card.
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}

function CartRow({
  line,
  quoted,
  problem,
}: {
  line: StoreCartLine;
  quoted?: QuoteLine;
  problem?: string;
}) {
  const price = quoted ? formatCents(quoted.unitPriceCents, quoted.currency) : formatCents(line.priceCents, line.currency);
  const title = quoted?.coverTitle || line.title;
  const designation = quoted?.editionLabel || line.designation;
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
      <div>
        <p className="font-mono text-sm">{designation}</p>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-[var(--muted)]">{line.languageLabel}</p>
        {problem ? <p className="mt-1 text-sm text-rose-700">{problem}</p> : null}
      </div>
      <div className="text-right">
        <p className="font-semibold">{price}</p>
        <button
          type="button"
          onClick={() => removeStoreCartLine(line.catalogItemId, line.editionLocale)}
          className="mt-1 text-sm text-[var(--accent)] underline"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
