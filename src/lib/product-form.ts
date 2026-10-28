import type { Field } from "@/components/admin/crud-form";
import { ORIGIN_CRITERIA, ORIGIN_REGIMES, type OriginClaim } from "@/lib/origin-claim";

export function productFormFields(input: {
  traders?: { value: string; label: string }[];
  organizationId?: string;
  versions: { value: string; label: string }[];
  tariffs: { value: string; label: string }[];
  countries: { value: string; label: string }[];
  marks?: { value: string; label: string }[];
  bodies?: { value: string; label: string }[];
  lockStandard?: boolean;
  certificateStatuses?: { value: string; label: string }[];
  defaults?: {
    name?: string;
    commodity?: string;
    organizationId?: string;
    standardVersionId?: string;
    tariffLineId?: string;
    markScheme?: string;
    markCoverage?: string;
    ecoStandardVersionId?: string;
    ecoCertificateStatus?: string;
    certificateStatus?: string;
    certifyingCbId?: string;
    origin?: OriginClaim | null;
  };
}): Field[] {
  const origin = input.defaults?.origin;
  const fields: Field[] = [];
  if (input.traders) {
    fields.push({
      name: "organizationId",
      label: "Manufacturer or importer",
      type: "select",
      required: true,
      options: input.traders,
      defaultValue: input.defaults?.organizationId,
    });
  } else if (input.organizationId) {
    fields.push({
      name: "organizationId",
      label: "Manufacturer or importer",
      hidden: true,
      defaultValue: input.organizationId,
    });
  }
  fields.push(
    { name: "name", label: "Product", required: true, defaultValue: input.defaults?.name },
    { name: "commodity", label: "Commodity", required: true, defaultValue: input.defaults?.commodity },
    input.lockStandard
      ? {
          name: "standardVersionId",
          label: "Quality standard",
          hidden: true,
          defaultValue: input.defaults?.standardVersionId,
        }
      : {
          name: "standardVersionId",
          label: "Quality standard",
          type: "select",
          required: true,
          options: input.versions,
          defaultValue: input.defaults?.standardVersionId,
          help: "The standard the Quality Mark is certified against.",
        },
    ...(input.marks
      ? [
          {
            name: "markCoverage",
            label: "Marks",
            type: "select" as const,
            required: true,
            options: input.marks,
            defaultValue: input.defaults?.markCoverage || (input.defaults?.markScheme === "ECO" ? "BOTH" : "QUALITY"),
            help: "Eco Mark Africa is certified with the Quality Mark, against its own standard.",
          },
          input.lockStandard
            ? {
                name: "ecoStandardVersionId",
                label: "Eco standard",
                hidden: true,
                defaultValue: input.defaults?.ecoStandardVersionId,
              }
            : {
                name: "ecoStandardVersionId",
                label: "Eco standard",
                type: "select" as const,
                required: true,
                options: input.versions,
                defaultValue: input.defaults?.ecoStandardVersionId,
                showWhen: { field: "markCoverage", equals: "BOTH" },
                help: "Usually a different standard from the Quality Mark. The same standard can still be chosen.",
              },
        ]
      : []),
    ...(input.certificateStatuses
      ? [
          {
            name: "certificateStatus",
            label: "Quality certificate status",
            type: "select" as const,
            required: true,
            options: input.certificateStatuses,
            defaultValue: input.defaults?.certificateStatus || "certified",
          },
          ...(input.defaults?.markCoverage === "BOTH" || input.defaults?.ecoStandardVersionId
            ? [
                {
                  name: "ecoCertificateStatus",
                  label: "Eco certificate status",
                  type: "select" as const,
                  required: true,
                  options: input.certificateStatuses,
                  defaultValue: input.defaults?.ecoCertificateStatus || "certified",
                },
              ]
            : []),
        ]
      : []),
    ...(input.bodies
      ? [
          {
            name: "certifyingCbId",
            label: "Certification body",
            type: "select" as const,
            required: true,
            options: input.bodies,
            defaultValue: input.defaults?.certifyingCbId,
            help: "The body that certifies this product. Another product can use a different body.",
          },
        ]
      : []),
    {
      name: "tariffLineId",
      label: "Tariff line",
      type: "select",
      options: input.tariffs,
      defaultValue: input.defaults?.tariffLineId,
      help: "Leave blank to use the tariff line mapped to the standard.",
    },
    {
      name: "originIso2",
      label: "Country of origin",
      type: "select",
      required: true,
      options: input.countries,
      defaultValue: origin?.originIso2,
      help: "Where the product was wholly obtained or last substantially transformed.",
    },
    {
      name: "criterion",
      label: "Origin criterion",
      type: "select",
      required: true,
      defaultValue: origin?.criterion || "WHOLLY_OBTAINED",
      options: [...ORIGIN_CRITERIA],
    },
    {
      name: "regime",
      label: "Origin regime",
      type: "select",
      required: true,
      defaultValue: origin?.regime || "AFCFTA",
      options: [...ORIGIN_REGIMES],
    },
    {
      name: "producerName",
      label: "Producer",
      defaultValue: origin?.producerName,
      help: "Required for an importer: the manufacturer that made the product.",
    },
    {
      name: "producerCountryIso2",
      label: "Producer country",
      type: "select",
      options: input.countries,
      defaultValue: origin?.producerCountryIso2,
    },
    {
      name: "certificateOfOriginNo",
      label: "Certificate of origin number",
      defaultValue: origin?.certificateOfOriginNo,
    },
    {
      name: "localContentPercent",
      label: "Local content %",
      type: "number",
      defaultValue: origin?.localContentPercent,
      help: "Required for value added and cumulation.",
    },
    {
      name: "originNotes",
      label: "Origin notes",
      type: "textarea",
      defaultValue: origin?.notes,
    },
  );
  return fields;
}
