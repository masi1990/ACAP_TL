import type { Field } from "@/components/admin/crud-form";
import { ORIGIN_CRITERIA, ORIGIN_REGIMES, type OriginClaim } from "@/lib/origin-claim";

export function productFormFields(input: {
  traders?: { value: string; label: string }[];
  organizationId?: string;
  versions: { value: string; label: string }[];
  tariffs: { value: string; label: string }[];
  countries: { value: string; label: string }[];
  marks?: { value: string; label: string }[];
  lockStandard?: boolean;
  certificateStatuses?: { value: string; label: string }[];
  defaults?: {
    name?: string;
    commodity?: string;
    organizationId?: string;
    standardVersionId?: string;
    tariffLineId?: string;
    markScheme?: string;
    certificateStatus?: string;
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
          label: "Standard",
          hidden: true,
          defaultValue: input.defaults?.standardVersionId,
        }
      : {
          name: "standardVersionId",
          label: "Standard",
          type: "select",
          required: true,
          options: input.versions,
          defaultValue: input.defaults?.standardVersionId,
        },
    ...(input.certificateStatuses
      ? [
          {
            name: "certificateStatus",
            label: "Certificate status",
            type: "select" as const,
            required: true,
            options: input.certificateStatuses,
            defaultValue: input.defaults?.certificateStatus || "certified",
          },
        ]
      : []),
    ...(input.marks
      ? [
          {
            name: "markScheme",
            label: "Mark",
            type: "select" as const,
            required: true,
            options: input.marks,
            defaultValue: input.defaults?.markScheme || "QUALITY",
            help: "Eco Mark Africa is available only when the certification body is also licensed for the Quality Mark.",
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
