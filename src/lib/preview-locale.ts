/** Clause 1 headings as published in ARSO editions. */
export type PreviewEditionLocale = "en" | "fr" | "pt" | "ar";

const CLAUSE1: Record<
  PreviewEditionLocale,
  { numberTitle: string; title: string; endBanner: string; previewEndsAt: string }
> = {
  en: {
    numberTitle: "1 Scope",
    title: "Scope",
    endBanner: "— End of free readable content (Clause 1 Scope only) —",
    previewEndsAt: "Clause 1 — Scope only",
  },
  fr: {
    numberTitle: "1 Champ d'application",
    title: "Champ d'application",
    endBanner: "— Fin du contenu libre (Champ d'application — Clause 1 uniquement) —",
    previewEndsAt: "Clause 1 — Champ d'application uniquement",
  },
  pt: {
    numberTitle: "1 Campo de aplicação",
    title: "Campo de aplicação",
    endBanner: "— Fim do conteúdo livre (Campo de aplicação — Cláusula 1 apenas) —",
    previewEndsAt: "Cláusula 1 — Campo de aplicação apenas",
  },
  ar: {
    numberTitle: "1 نطاق التطبيق",
    title: "نطاق التطبيق",
    endBanner: "— نهاية المحتوى المجاني (نطاق التطبيق — البند 1 فقط) —",
    previewEndsAt: "البند 1 — نطاق التطبيق فقط",
  },
};

export function previewEditionLocale(raw: string | null | undefined): PreviewEditionLocale {
  const value = String(raw || "en").toLowerCase();
  if (value === "fr" || value === "pt" || value === "ar") return value;
  return "en";
}

export function clause1Labels(locale: string | null | undefined) {
  return CLAUSE1[previewEditionLocale(locale)];
}
