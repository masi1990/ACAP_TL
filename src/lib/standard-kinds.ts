import { t, type Locale } from "@/lib/i18n";
import { authoritativeLocaleOrNull } from "@/lib/publication";

export const STANDARD_KINDS = [
  { value: "PRODUCT", label: "Products (Goods)" },
  { value: "SERVICE", label: "Services" },
  { value: "TESTING", label: "Tests, analysis, sampling" },
  { value: "REFERENCE", label: "Codes, glossaries, units" },
] as const;

const KIND_VALUES = new Set<string>(STANDARD_KINDS.map((kind) => kind.value));
const LEGACY_KINDS: Record<string, string> = {
  TEST: "TESTING",
  ANALYSIS: "TESTING",
  SAMPLING: "TESTING",
  CODE: "REFERENCE",
  GLOSSARY: "REFERENCE",
  UNIT: "REFERENCE",
};
export const PRODUCT_STANDARD_KIND = "PRODUCT";

export const LANGUAGE_FILE_FIELDS = [
  { field: "pdfEn", locale: "en", label: "English PDF" },
  { field: "pdfFr", locale: "fr", label: "French PDF" },
  { field: "pdfPt", locale: "pt", label: "Portuguese PDF" },
  { field: "pdfAr", locale: "ar", label: "Arabic PDF" },
] as const;

export type LanguageCode = (typeof LANGUAGE_FILE_FIELDS)[number]["locale"];

export function standardKindOrNull(raw: unknown): string | null {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return null;
  const mapped = LEGACY_KINDS[value] || value;
  return KIND_VALUES.has(mapped) ? mapped : null;
}

export function standardKindLabel(kind: string, locale: Locale = "en"): string {
  const mapped = LEGACY_KINDS[kind] || kind;
  const match = STANDARD_KINDS.find((item) => item.value === mapped);
  return t(locale, match?.label || kind);
}

/** Published languages, with the buyer's choice first when it is one of them. */
export function downloadLocaleOrder(published: readonly string[], preferred: string) {
  const list = published.length ? [...published] : [preferred];
  if (!list.includes(preferred)) return list;
  return [preferred, ...list.filter((locale) => locale !== preferred)];
}

export function adoptionRate(adopted: number, total: number) {
  const percent = total > 0 ? Math.round((adopted / total) * 100) : 0;
  return { adopted, total, percent };
}

export function parseIdList(raw: unknown): string[] {
  if (Array.isArray(raw)) return [...new Set(raw.map((value) => String(value).trim()).filter(Boolean))];
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown[];
      if (Array.isArray(parsed)) return parseIdList(parsed);
    } catch {
      return [text];
    }
  }
  return [...new Set(text.split(",").map((value) => value.trim()).filter(Boolean))];
}

export function publishedLocales(
  files: Array<{ locale: string }>,
  authoritativeLocale: string,
  sourcePdfUri: string | null | undefined,
) {
  const locales = new Set(files.map((file) => file.locale));
  if (sourcePdfUri) locales.add(authoritativeLocaleOrNull(authoritativeLocale) || "en");
  return LANGUAGE_FILE_FIELDS.map((item) => item.locale).filter((locale) => locales.has(locale));
}
