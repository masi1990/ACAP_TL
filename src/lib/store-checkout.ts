import { prisma } from "@/lib/db";
import { authoritativeLocaleOrNull } from "@/lib/publication";

export const MAX_CART_LINES = 12;

export type CheckoutLineInput = {
  catalogItemId: string;
  editionLocale: string;
};

export type ResolvedCheckoutLine = {
  catalogItemId: string;
  editionLocale: string;
  unitPriceCents: number;
  currency: string;
  coverTitle: string;
  editionLabel: string;
};

export type CartQuote = {
  lines: ResolvedCheckoutLine[];
  problems: { catalogItemId: string; editionLocale: string; message: string }[];
  currencyError: string | null;
  totalCents: number;
  currency: string;
  payable: boolean;
};

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  return text ? [text] : [];
}

export function parseCheckoutLines(body: {
  catalogItemId?: unknown;
  editionLocale?: unknown;
  lines?: unknown;
}): CheckoutLineInput[] {
  if (Array.isArray(body.lines)) {
    return body.lines.flatMap((line) => {
      const row = line as { catalogItemId?: unknown; editionLocale?: unknown };
      const catalogItemId = String(row?.catalogItemId || "").trim();
      if (!catalogItemId) return [];
      return [{ catalogItemId, editionLocale: String(row?.editionLocale || "").trim() }];
    });
  }
  const ids = toList(body.catalogItemId);
  const locales = toList(body.editionLocale);
  return ids.map((catalogItemId, index) => ({
    catalogItemId,
    editionLocale: locales[index] || "",
  }));
}

export async function quoteCartLines(inputs: CheckoutLineInput[]): Promise<CartQuote> {
  const empty: CartQuote = {
    lines: [],
    problems: [],
    currencyError: null,
    totalCents: 0,
    currency: "USD",
    payable: false,
  };
  if (inputs.length === 0) {
    return { ...empty, problems: [{ catalogItemId: "", editionLocale: "", message: "Add at least one standard" }] };
  }
  if (inputs.length > MAX_CART_LINES) {
    return {
      ...empty,
      problems: [{ catalogItemId: "", editionLocale: "", message: `A cart can hold ${MAX_CART_LINES} standards` }],
    };
  }

  const items = await prisma.catalogItem.findMany({
    where: { id: { in: inputs.map((line) => line.catalogItemId) } },
    include: { standardVersion: { include: { languageFiles: true } } },
  });
  const byId = new Map(items.map((item) => [item.id, item]));
  const lines: ResolvedCheckoutLine[] = [];
  const problems: CartQuote["problems"] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const editionLocale = authoritativeLocaleOrNull(input.editionLocale);
    if (!editionLocale) {
      problems.push({
        catalogItemId: input.catalogItemId,
        editionLocale: input.editionLocale,
        message: "Choose a language for each standard",
      });
      continue;
    }
    const key = `${input.catalogItemId}:${editionLocale}`;
    if (seen.has(key)) {
      problems.push({
        catalogItemId: input.catalogItemId,
        editionLocale,
        message: "Each standard and language can be added once",
      });
      continue;
    }
    seen.add(key);

    const item = byId.get(input.catalogItemId);
    if (!item || !item.active || item.standardVersion.publicationStatus !== "PUBLISHED") {
      problems.push({
        catalogItemId: input.catalogItemId,
        editionLocale,
        message: "This standard is no longer for sale",
      });
      continue;
    }
    if (item.distribution !== "PAID" || item.priceCents <= 0) {
      problems.push({
        catalogItemId: input.catalogItemId,
        editionLocale,
        message: "This standard is not sold",
      });
      continue;
    }
    const available = new Set(item.standardVersion.languageFiles.map((file) => file.locale));
    if (item.standardVersion.sourcePdfUri) available.add(item.standardVersion.authoritativeLocale);
    if (available.size > 0 && !available.has(editionLocale)) {
      problems.push({
        catalogItemId: input.catalogItemId,
        editionLocale,
        message: "That language is not published for this standard",
      });
      continue;
    }
    lines.push({
      catalogItemId: item.id,
      editionLocale,
      unitPriceCents: item.priceCents,
      currency: item.currency,
      coverTitle: item.coverTitle,
      editionLabel: item.standardVersion.editionLabel,
    });
  }

  const currency = lines[0]?.currency || "USD";
  const currencyError = lines.some((line) => line.currency !== currency)
    ? "These standards use different currencies. Remove one currency before paying."
    : null;
  const totalCents = currencyError ? 0 : lines.reduce((sum, line) => sum + line.unitPriceCents, 0);
  return {
    lines,
    problems,
    currencyError,
    totalCents,
    currency,
    payable: lines.length > 0 && problems.length === 0 && !currencyError,
  };
}

export function checkoutDescription(lines: ResolvedCheckoutLine[]) {
  if (lines.length === 1) {
    return `${lines[0].editionLabel} - ${lines[0].coverTitle}`.replace(/\s+/g, " ").slice(0, 100);
  }
  const joined = lines.map((line) => line.editionLabel).join(", ").replace(/\s+/g, " ");
  return (joined || "ARSO standards").slice(0, 100);
}
