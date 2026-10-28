import { parseOriginClaim } from "@/lib/origin-claim";

export type CustomsEvidence = {
  id: string;
  filename: string;
  contentType: string;
};

export type CustomsRequirement = {
  id: string;
  markScheme?: string;
  source: string;
  kind: string;
  section: string;
  clause: string;
  heading: string;
  text: string;
  testMethod: string;
  countryIso2: string | null;
  pass: boolean | null;
  measuredValue: string;
  unit: string;
  notes: string;
  recorder: string;
  evidence: CustomsEvidence[];
};

export type CustomsFile = {
  id: string;
  markScheme?: string;
  kind: string;
  annexCode: string | null;
  title: string;
  filename: string;
  contentType: string;
};

export type DeskActor = {
  name: string;
  email: string;
  organization: string;
};

export type DeskInspection = {
  id: string;
  result: string;
  findings: string;
  inspectedAt: string;
  actor: DeskActor | null;
};

export type DeskCustomsDecision = {
  id: string;
  decision: string;
  reason: string;
  originIso2: string;
  destinationIso2: string;
  decidedAt: string;
  actor: DeskActor | null;
};

export type CustomsDeskProduct = {
  id: string;
  name: string;
  commodity: string;
  label: string;
  originIso2: string;
  certificationBody: string;
  recorderLabel: string;
  standardId: string | null;
  standardLabel: string;
  certificateNo: string | null;
  certificateStatus: string | null;
  applicationStatus: string | null;
  markScheme: string | null;
  tracks: Array<{
    markScheme: string;
    standardLabel: string;
    certificateNo: string | null;
    certificateStatus: string | null;
  }>;
  inspections: DeskInspection[];
  clearances: DeskCustomsDecision[];
  latestInspection: DeskInspection | null;
  latestCustoms: DeskCustomsDecision | null;
  dossier: {
    laboratoryName: string;
    accreditationRef: string;
    reportNo: string;
    sampleCode: string;
    batchOrLot: string;
    sampleDescription: string;
    sampledAt: string;
    testedAt: string;
  } | null;
  items: CustomsRequirement[];
  files: CustomsFile[];
};

type StandardRef = { id: string; designation: string; titleEn: string };

type ApplicationInput = {
  status: string;
  markScheme: string;
    organization: { name: string };
    recordedBy?: { name: string; email: string } | null;
  coc: { certificateNo: string; status: string } | null;
  standardVersion: { standard: StandardRef };
  testDossier: {
    laboratoryName: string;
    accreditationRef: string;
    reportNo: string;
    sampleCode: string;
    batchOrLot: string;
    sampleDescription: string;
    sampledAt: Date | string | null;
    testedAt: Date | string | null;
  } | null;
  assessmentItems: Array<{
    id: string;
    source: string;
    kind: string;
    section: string;
    clause: string;
    heading: string;
    text: string;
    testMethod: string;
    countryIso2: string | null;
    pass: boolean | null;
    measuredValue: string;
    unit: string;
    notes: string;
    evidence: Array<{ id: string; filename: string; contentType: string }>;
    recordedBy?: { name: string; email: string } | null;
  }>;
  dossierAttachments: Array<{
    id: string;
    kind: string;
    annexCode: string | null;
    title: string;
    filename: string;
    contentType: string;
  }>;
};

export type CustomsProductInput = {
  id: string;
  name: string;
  commodity: string;
  originClaimJson: string | null;
  company: {
    countryIso2: string;
    clientAccount: { organization: { name: string } };
  };
  standardLinks: Array<{ standardVersion: { standard: StandardRef } }>;
  applications: ApplicationInput[];
  inspections?: Array<{
    id: string;
    result: string;
    findings: string;
    inspectedAt: Date | string;
    actor?: DeskActor | null;
  }>;
  clearances?: Array<{
    id: string;
    decision: string;
    reason: string;
    originIso2: string;
    destinationIso2: string;
    decidedAt: Date | string;
    actor?: DeskActor | null;
  }>;
};

function day(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function standardLabel(standard: StandardRef | null) {
  if (!standard) return "";
  return standard.titleEn ? `${standard.designation} — ${standard.titleEn}` : standard.designation;
}

function recorderText(person: { name: string; email: string } | null | undefined) {
  if (!person) return "";
  return `${person.name} · ${person.email}`;
}

/** Facts the border desk fills in when an officer picks a product. */
export function customsDeskProduct(product: CustomsProductInput): CustomsDeskProduct {
  const ordered = [...product.applications].sort(
    (a, b) => Number(a.markScheme === "ECO") - Number(b.markScheme === "ECO"),
  );
  const application =
    ordered.find((row) => row.markScheme === "QUALITY") ??
    ordered.find((row) => row.coc) ??
    ordered[0] ??
    null;
  const tracks = ordered.map((row) => ({
    markScheme: row.markScheme,
    standardLabel: standardLabel(row.standardVersion.standard),
    certificateNo: row.coc?.certificateNo ?? null,
    certificateStatus: row.coc?.status ?? null,
  }));
  const standard =
    application?.standardVersion.standard ?? product.standardLinks[0]?.standardVersion.standard ?? null;
  const origin = (parseOriginClaim(product.originClaimJson)?.originIso2 || product.company.countryIso2 || "")
    .trim()
    .toUpperCase();
  const inspections = (product.inspections ?? []).map((row) => ({
    id: row.id,
    result: row.result,
    findings: row.findings,
    inspectedAt: day(row.inspectedAt),
    actor: row.actor ?? null,
  }));
  const clearances = (product.clearances ?? []).map((row) => ({
    id: row.id,
    decision: row.decision,
    reason: row.reason,
    originIso2: row.originIso2,
    destinationIso2: row.destinationIso2,
    decidedAt: day(row.decidedAt),
    actor: row.actor ?? null,
  }));

  return {
    id: product.id,
    name: product.name,
    commodity: product.commodity,
    label: `${product.name} · ${standard?.designation ?? "no standard"} · ${product.company.clientAccount.organization.name}`,
    originIso2: origin,
    certificationBody: application?.organization.name ?? "",
    recorderLabel: recorderText(application?.recordedBy) || recorderText(
      application?.assessmentItems.find((item) => item.recordedBy)?.recordedBy,
    ),
    standardId: standard?.id ?? null,
    standardLabel: standardLabel(standard),
    certificateNo: application?.coc?.certificateNo ?? null,
    certificateStatus: application?.coc?.status ?? null,
    applicationStatus: application?.status ?? null,
    markScheme: application?.markScheme ?? null,
    tracks,
    inspections,
    clearances,
    latestInspection: inspections[0] ?? null,
    latestCustoms: clearances[0] ?? null,
    dossier: application?.testDossier
      ? {
          laboratoryName: application.testDossier.laboratoryName,
          accreditationRef: application.testDossier.accreditationRef,
          reportNo: application.testDossier.reportNo,
          sampleCode: application.testDossier.sampleCode,
          batchOrLot: application.testDossier.batchOrLot,
          sampleDescription: application.testDossier.sampleDescription,
          sampledAt: day(application.testDossier.sampledAt),
          testedAt: day(application.testDossier.testedAt),
        }
      : null,
    items: ordered.flatMap((row) =>
      row.assessmentItems.map((item) => ({
        markScheme: ordered.length > 1 ? row.markScheme : "",
        id: item.id,
        source: item.source,
        kind: item.kind,
        section: item.section,
        clause: item.clause,
        heading: item.heading,
        text: item.text,
        testMethod: item.testMethod,
        countryIso2: item.countryIso2,
        pass: item.pass,
        measuredValue: item.measuredValue,
        unit: item.unit,
        notes: item.notes,
        recorder: recorderText(item.recordedBy),
        evidence: item.evidence.map((file) => ({
          id: file.id,
          filename: file.filename,
          contentType: file.contentType,
        })),
      })),
    ),
    files: ordered.flatMap((row) =>
      row.dossierAttachments.map((file) => ({
        markScheme: ordered.length > 1 ? row.markScheme : "",
        id: file.id,
        kind: file.kind,
        annexCode: file.annexCode,
        title: file.title,
        filename: file.filename,
        contentType: file.contentType,
      })),
    ),
  };
}
