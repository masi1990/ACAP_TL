/**
 * PDF → machine-readable conversion fidelity rules (ACAP–TL).
 *
 * Standards can affect public health, safety, and the environment.
 * Conversion from the authoritative PDF into machine form (JSON/XML)
 * MUST NOT omit normative content. The published PDF remains the legal
 * source of truth until ARSO formally adopts the machine form.
 */

export const FIDELITY_PRINCIPLES = [
  "No omission of normative clauses, requirements, limits, units, or test methods.",
  "Preserve Table / figure / annex content that carries requirements (e.g. Table 1 grades).",
  "Preserve packaging, labelling, hygiene, contaminants, and sampling provisions.",
  "Record content_hash over the full machine document for integrity checks.",
  "Flag translationLocale gaps; never silently drop non-authoritative locales.",
  "Public preview may show title + TOC + Clause 1 Scope only — that is access control, not omission from the stored machine pack.",
] as const;

/** Domains that require heightened completeness review before publish */
export const CRITICAL_IMPACT_DOMAINS = [
  "public_health",
  "food_safety",
  "occupational_safety",
  "environment",
  "consumer_protection",
] as const;

export type CompletenessCheck = {
  id: string;
  label: string;
  required: boolean;
  present: boolean;
  notes?: string;
};

/** Validate that a machine pack carries the mandatory ARS 464 pilot slices */
export function assessMachinePackCompleteness(machine: {
  scope?: unknown;
  normativeReferences?: unknown[];
  requirements?: unknown[];
  packaging?: unknown;
  labelling?: unknown;
  sampling?: unknown;
  contentHash?: string;
}): { ok: boolean; checks: CompletenessCheck[] } {
  const checks: CompletenessCheck[] = [
    {
      id: "scope",
      label: "Clause 1 Scope present",
      required: true,
      present: Boolean(machine.scope),
    },
    {
      id: "normative_refs",
      label: "Normative references retained",
      required: true,
      present: Array.isArray(machine.normativeReferences) && machine.normativeReferences.length > 0,
    },
    {
      id: "requirements",
      label: "Requirements / Table 1 (or equivalent) retained",
      required: true,
      present: Array.isArray(machine.requirements) && machine.requirements.length > 0,
    },
    {
      id: "packaging",
      label: "Packaging provisions retained",
      required: true,
      present: Boolean(machine.packaging),
    },
    {
      id: "labelling",
      label: "Labelling provisions retained",
      required: true,
      present: Boolean(machine.labelling),
    },
    {
      id: "sampling",
      label: "Sampling method retained",
      required: true,
      present: Boolean(machine.sampling),
    },
    {
      id: "content_hash",
      label: "Integrity content hash present",
      required: true,
      present: Boolean(machine.contentHash && !String(machine.contentHash).includes("00000000")),
      notes: "Hash must cover the full machine document, not the public preview slice.",
    },
  ];
  const ok = checks.every((c) => !c.required || c.present);
  return { ok, checks };
}

/**
 * Domain model note (locked):
 * - StandardVersion is independent of TariffLine.
 * - StandardTariffMap links many tariff lines (per REC / digit length) to one standard.
 * - REC codes for the same commodity may differ (HS6 vs HS8 vs HS10); each is its own TariffLine row.
 */
export const TARIFF_STANDARD_RELATION =
  "Standard ⟷ TariffLine is many-to-many via StandardTariffMap; the standard does not own a single tariff code.";
