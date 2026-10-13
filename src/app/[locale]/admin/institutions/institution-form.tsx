"use client";

import { useState } from "react";
import { CrudForm, type Field } from "@/components/admin/crud-form";
import { AUTHORITY_LABELS, AUTHORITY_TYPES } from "@/lib/rbac";
import { CLIENT_MARK_GRANTS, LICENSE_STATUSES, ORG_STATUSES } from "@/lib/cb-profile";

export function InstitutionForm({
  states,
  action,
  method = "POST",
  idPrefix,
  submitLabel,
  defaults,
}: {
  states: { id: string; name: string; iso2: string }[];
  action: string;
  method?: "POST" | "PATCH";
  idPrefix: string;
  submitLabel: string;
  defaults?: {
    type?: string;
    name?: string;
    memberStateId?: string | null;
    accreditationBody?: string;
    accreditationRef?: string;
    contactEmail?: string;
    contactPhone?: string;
    addressLine?: string;
    website?: string;
    status?: string;
    clientMarks?: string;
    licenseStatus?: string;
    licenseNumber?: string;
    issuedAt?: string;
    expiresAt?: string;
  };
}) {
  const [type, setType] = useState(defaults?.type || "CB");
  const stateOptions = states.map((state) => ({ value: state.id, label: `${state.name} (${state.iso2})` }));
  const fields: Field[] = [
    { name: "type", label: "Type", hidden: true, defaultValue: type },
    { name: "name", label: "Authority name", required: true, defaultValue: defaults?.name },
    {
      name: "memberStateId",
      label: "Country",
      type: "select",
      required: true,
      options: stateOptions,
      defaultValue: defaults?.memberStateId || "",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      defaultValue: defaults?.status || "ACTIVE",
      options: ORG_STATUSES.map((item) => ({ value: item.value, label: item.label })),
    },
    { name: "accreditationBody", label: "Accreditation body", defaultValue: defaults?.accreditationBody },
    { name: "accreditationRef", label: "Accreditation reference", defaultValue: defaults?.accreditationRef },
    { name: "contactEmail", label: "Contact email", defaultValue: defaults?.contactEmail },
    { name: "contactPhone", label: "Contact phone", defaultValue: defaults?.contactPhone },
    { name: "addressLine", label: "Address", defaultValue: defaults?.addressLine },
    { name: "website", label: "Website", defaultValue: defaults?.website },
  ];
  if (method === "POST") {
    fields.push(
      { name: "adminEmail", label: "Main account email", required: true },
      { name: "adminName", label: "Main account name" },
      { name: "adminPassword", label: "Temporary password", defaultValue: "ChangeMe!ACAP" },
    );
  }
  if (type === "CB") {
    fields.push(
      {
        name: "clientMarks",
        label: "Marks this body may grant to clients",
        type: "select",
        required: true,
        defaultValue: defaults?.clientMarks || "QUALITY",
        options: CLIENT_MARK_GRANTS.map((item) => ({ value: item.value, label: item.label })),
        help: "The Eco Mark can be granted only after this body is licensed for the Quality Mark.",
      },
      {
        name: "licenseStatus",
        label: "Licence status",
        type: "select",
        required: true,
        defaultValue: defaults?.licenseStatus || "APPROVED",
        options: LICENSE_STATUSES.map((item) => ({ value: item.value, label: item.label })),
      },
      { name: "licenseNumber", label: "Licence number", defaultValue: defaults?.licenseNumber },
      { name: "issuedAt", label: "Licence issued", type: "date", defaultValue: defaults?.issuedAt },
      { name: "expiresAt", label: "Licence expires", type: "date", defaultValue: defaults?.expiresAt },
    );
  }

  return (
    <div className="space-y-3">
      <label className="grid max-w-sm gap-1 text-sm">
        Authority
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3"
        >
          {AUTHORITY_TYPES.map((value) => (
            <option key={value} value={value}>
              {AUTHORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <CrudForm
        key={`${idPrefix}${type}`}
        idPrefix={idPrefix}
        action={action}
        method={method}
        submitLabel={submitLabel}
        fields={fields}
      />
    </div>
  );
}
