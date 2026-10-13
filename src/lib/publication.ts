export const PUBLICATION_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "DRAFT_IMPORT", label: "Draft import" },
  { value: "PUBLISHED", label: "Published" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "SUPERSEDED", label: "Superseded" },
] as const;

export const AUTHORITATIVE_LOCALES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
] as const;

const STATUS_VALUES = new Set<string>(PUBLICATION_STATUSES.map((s) => s.value));
const LOCALE_VALUES = new Set<string>(AUTHORITATIVE_LOCALES.map((s) => s.value));

export function publicationStatusOrNull(raw: unknown): string | null {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return null;
  return STATUS_VALUES.has(value) ? value : null;
}

export function authoritativeLocaleOrNull(raw: unknown): string | null {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  return LOCALE_VALUES.has(value) ? value : null;
}
