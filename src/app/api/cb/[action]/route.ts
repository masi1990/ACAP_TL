import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { issueCertificateOfConformity } from "@/lib/coc";
import { can } from "@/lib/rbac";
import { requirePermission, type AuthedSession } from "@/lib/require-auth";
import { annexTitle, INTERNAL_CERTIFICATE_KIND, isAnnexCode } from "@/lib/dossier";
import { removeDossierFile, storeDossierFile } from "@/lib/dossier-files";
import { isCountryCode } from "@/lib/countries";
import { originClaimFromBody } from "@/lib/origin-claim";
import { createTradeProduct, materializeStandardItems, resolveTariffLineId } from "@/lib/product-record";
import { requestedClientMark } from "@/lib/cb-licenses";

type Ctx = { params: Promise<{ action: string }> };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function actingCbId(session: AuthedSession, requested?: string) {
  const own = session.user.memberships.find((m) => m.organization.type === "CB")?.organization.id;
  if (own && !can(session.user, "cb:write")) return own;
  return String(requested || own || "");
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;
  if (action === "evidence") return uploadEvidence(req);

  const permission = action === "clients" ? "clients:write" : "certify:operate";
  if (!["clients", "products", "assessment", "certificate"].includes(action)) {
    return fail("Unknown action", 404);
  }
  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;
  const session = auth.session!;
  const body = await req.json().catch(() => ({}));

  try {
    if (action === "clients") return await addClient(session, body);
    if (action === "products") return await addProduct(session, body);
    if (action === "assessment") return await saveAssessment(session, body);
    return await issue(session, body);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Request failed");
  }
}

async function addClient(session: AuthedSession, body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const type = String(body.type || "MANUFACTURER").toUpperCase();
  const countryIso2 = String(body.countryIso2 || "").trim().toUpperCase();
  const cbId = actingCbId(session, String(body.cbOrganizationId || ""));
  if (!name) return fail("Client name is required");
  if (type !== "MANUFACTURER" && type !== "IMPORTER") {
    return fail("Client must be a manufacturer or an importer");
  }
  if (!isCountryCode(countryIso2)) return fail("Choose a country");
  const cb = cbId ? await prisma.organization.findUnique({ where: { id: cbId } }) : null;
  if (!cb || cb.type !== "CB") return fail("Choose the certification body that serves this client");

  const org = await prisma.organization.create({
    data: { name, type, servicingCbId: cb.id },
  });
  const account = await prisma.clientAccount.create({
    data: { organizationId: org.id, displayName: name },
  });
  await prisma.company.create({
    data: { clientAccountId: account.id, legalName: name, countryIso2 },
  });

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "CB_CLIENT_CREATE",
    entityType: "Organization",
    entityId: org.id,
    organizationId: cb.id,
    after: { name, type },
  });
  return NextResponse.json({ ok: true, id: org.id }, { status: 201 });
}

async function addProduct(session: AuthedSession, body: Record<string, unknown>) {
  const clientId = String(body.organizationId || "").trim();
  const name = String(body.name || "").trim();
  const commodity = String(body.commodity || "").trim();
  const standardVersionId = String(body.standardVersionId || "").trim();
  if (!clientId || !name || !commodity || !standardVersionId) {
    return fail("Client, product, commodity, and standard are required");
  }

  const client = await prisma.organization.findUnique({
    where: { id: clientId },
    include: { clientAccounts: { include: { companies: true } }, servicingCb: true },
  });
  if (!client || (client.type !== "MANUFACTURER" && client.type !== "IMPORTER")) {
    return fail("Choose a manufacturer or importer client");
  }
  const cbId = actingCbId(session, client.servicingCbId || "");
  if (!client.servicingCbId || client.servicingCbId !== cbId) {
    return fail("This client belongs to another certification body");
  }

  const version = await prisma.standardVersion.findUnique({ where: { id: standardVersionId } });
  if (!version) return fail("Standard not found");

  const company = client.clientAccounts.flatMap((a) => a.companies)[0];
  if (!company) return fail("This client has no company record");

  const claim = originClaimFromBody(body, { importer: client.type === "IMPORTER" });
  let markScheme: "QUALITY" | "ECO" = "QUALITY";
  try {
    markScheme = requestedClientMark(body.markScheme);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Choose a mark");
  }
  const product = await createTradeProduct({
    companyId: company.id,
    name,
    commodity,
    standardVersionId,
    machineDocJson: version.machineDocJson,
    originClaimJson: JSON.stringify(claim),
    tariffLineId: await resolveTariffLineId(standardVersionId, body.tariffLineId),
    servicingCbId: cbId,
    markScheme,
  });

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "CB_PRODUCT_CREATE",
    entityType: "Product",
    entityId: product.id,
    organizationId: cbId,
    after: { name, standardVersionId },
  });
  return NextResponse.json({ ok: true, id: product.id }, { status: 201 });
}


async function saveAssessment(session: AuthedSession, body: Record<string, unknown>) {
  const mode = String(body.mode || "save");
  const applicationId = String(body.applicationId || "").trim();
  if (!applicationId) return fail("Application is required");
  const application = await prisma.certificationApplication.findUnique({ where: { id: applicationId } });
  if (!application) return fail("Application not found");
  const cbId = actingCbId(session, application.organizationId);
  if (application.organizationId !== cbId && !can(session.user, "cb:write")) {
    return fail("You can only record results for your certification body");
  }

  if (mode === "dossier") return saveDossier(session, application, body);

  if (mode === "load") {
    const version = await prisma.standardVersion.findUnique({ where: { id: application.standardVersionId } });
    if (!version) return fail("Standard not found");
    await materializeStandardItems(application.id, version.machineDocJson);
    return NextResponse.json({ ok: true });
  }

  if (mode === "add") {
    const source = String(body.source || "").toUpperCase();
    const heading = String(body.heading || "").trim();
    const text = String(body.text || "").trim();
    const countryIso2 = String(body.countryIso2 || "").trim().toUpperCase();
    if (source !== "NATIONAL" && source !== "OTHER") return fail("Add a national regulation or an other item");
    if (!heading || !text) return fail("Name and description are required");
    if (source === "NATIONAL" && !/^[A-Z]{2}$/.test(countryIso2)) {
      return fail("National regulations need a 2-letter country code");
    }
    const count = await prisma.assessmentItem.count({ where: { applicationId, source } });
    await prisma.assessmentItem.create({
      data: {
        applicationId,
        source,
        kind: "clause",
        itemKey: `${source.toLowerCase()}:${count + 1}:${randomBytes(3).toString("hex")}`,
        section: source === "NATIONAL" ? "National regulations" : "Other requirements",
        clause: source === "NATIONAL" ? countryIso2 : "",
        heading,
        text,
        countryIso2: source === "NATIONAL" ? countryIso2 : null,
        sortOrder: 1000 + count,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const rows = Array.isArray(body.items) ? body.items : [];
  for (const row of rows) {
    const id = String(row.id || "");
    if (!id) continue;
    const passRaw = row.pass;
    const pass = passRaw === true || passRaw === "true" ? true : passRaw === false || passRaw === "false" ? false : null;
    await prisma.assessmentItem.updateMany({
      where: { id, applicationId },
      data: {
        pass,
        measuredValue: String(row.measuredValue || ""),
        unit: String(row.unit || ""),
        notes: String(row.notes || ""),
        testMethod: String(row.testMethod || ""),
      },
    });
  }
  return NextResponse.json({ ok: true });
}

function dayOrNull(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("Use a date in the form YYYY-MM-DD");
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Use a valid date");
  return date;
}

async function saveDossier(
  session: AuthedSession,
  application: { id: string; organizationId: string },
  body: Record<string, unknown>,
) {
  const laboratoryName = String(body.laboratoryName || "").trim();
  const accreditationRef = String(body.accreditationRef || "").trim();
  const reportNo = String(body.reportNo || "").trim();
  const sampleCode = String(body.sampleCode || "").trim();
  const batchOrLot = String(body.batchOrLot || "").trim();
  const sampleDescription = String(body.sampleDescription || "").trim();
  const sampledAt = dayOrNull(body.sampledAt);
  const testedAt = dayOrNull(body.testedAt);
  const data = {
    laboratoryName,
    accreditationRef,
    reportNo,
    sampleCode,
    batchOrLot,
    sampleDescription,
    sampledAt,
    testedAt,
  };
  const dossier = await prisma.testDossier.upsert({
    where: { applicationId: application.id },
    create: { applicationId: application.id, ...data },
    update: data,
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "TEST_DOSSIER_SAVE",
    entityType: "TestDossier",
    entityId: dossier.id,
    organizationId: application.organizationId,
    after: { laboratoryName, reportNo, sampleCode },
  });
  return NextResponse.json({ ok: true, id: dossier.id });
}

async function issue(session: AuthedSession, body: Record<string, unknown>) {
  const applicationId = String(body.applicationId || "").trim();
  if (!applicationId) return fail("Application is required");
  const application = await prisma.certificationApplication.findUnique({ where: { id: applicationId } });
  if (!application) return fail("Application not found");
  const cbId = actingCbId(session, application.organizationId);
  if (application.organizationId !== cbId && !can(session.user, "cb:write")) {
    return fail("You can only issue a certificate for your certification body");
  }
  try {
    const result = await issueCertificateOfConformity({ applicationId, actorUserId: session.userId });
    return NextResponse.json({ ok: true, certificateNo: result.coc.certificateNo, reused: result.reused });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Certificate could not be issued");
  }
}

function ownsApplication(session: AuthedSession, organizationId: string) {
  const cbId = actingCbId(session, organizationId);
  return organizationId === cbId || can(session.user, "cb:write");
}

async function uploadEvidence(req: NextRequest) {
  const auth = await requirePermission("certify:operate");
  if (auth.error) return auth.error;
  const session = auth.session!;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to attach");

  const itemId = String(form.get("assessmentItemId") || "");
  if (itemId) return attachLaboratoryFile(session, itemId, file);

  const applicationId = String(form.get("applicationId") || "");
  const annexCode = String(form.get("annexCode") || "");
  const title = String(form.get("title") || "").trim();
  const kind = String(form.get("kind") || "");
  if (applicationId && kind === INTERNAL_CERTIFICATE_KIND) {
    return attachInternalCertificate(session, applicationId, file);
  }
  if (applicationId && annexCode) return attachAnnex(session, applicationId, annexCode, file);
  if (applicationId && title) return attachOther(session, applicationId, title, file);
  return fail("Choose a requirement, an annex, or a title for the other document");
}

async function attachLaboratoryFile(session: AuthedSession, itemId: string, file: File) {
  const item = await prisma.assessmentItem.findUnique({
    where: { id: itemId },
    include: { application: true },
  });
  if (!item) return fail("Requirement not found");
  if (!ownsApplication(session, item.application.organizationId)) {
    return fail("You can only attach evidence for your certification body");
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "result";
  const stored = `${item.id}-${randomBytes(4).toString("hex")}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "lab");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));

  const evidence = await prisma.labEvidence.create({
    data: {
      assessmentItemId: item.id,
      filename: file.name || safeName,
      contentType: file.type || "application/octet-stream",
      storageUri: `/uploads/lab/${stored}`,
    },
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "LAB_EVIDENCE_UPLOAD",
    entityType: "LabEvidence",
    entityId: evidence.id,
    organizationId: item.application.organizationId,
    after: { filename: evidence.filename, itemId: item.id },
  });
  return NextResponse.json(
    { ok: true, id: evidence.id, filename: evidence.filename, storageUri: evidence.storageUri },
    { status: 201 },
  );
}

async function loadOwnedApplication(session: AuthedSession, applicationId: string) {
  const application = await prisma.certificationApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { error: fail("Application not found") };
  if (!ownsApplication(session, application.organizationId)) {
    return { error: fail("You can only attach files for your certification body") };
  }
  return { application };
}

async function attachAnnex(session: AuthedSession, applicationId: string, annexCode: string, file: File) {
  if (!isAnnexCode(annexCode)) return fail("Unknown annex");
  const owned = await loadOwnedApplication(session, applicationId);
  if (owned.error) return owned.error;
  const stored = await storeDossierFile(file);
  const existing = await prisma.dossierAttachment.findFirst({
    where: { applicationId, annexCode, kind: "ANNEX" },
  });
  const attachment = existing
    ? await prisma.dossierAttachment.update({
        where: { id: existing.id },
        data: {
          title: annexTitle(annexCode),
          filename: stored.filename,
          contentType: stored.contentType,
          storageUri: stored.storageUri,
          uploadedAt: new Date(),
        },
      })
    : await prisma.dossierAttachment.create({
        data: {
          applicationId,
          kind: "ANNEX",
          annexCode,
          title: annexTitle(annexCode),
          filename: stored.filename,
          contentType: stored.contentType,
          storageUri: stored.storageUri,
        },
      });
  if (existing && existing.storageUri !== stored.storageUri) await removeDossierFile(existing.storageUri);
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "DOSSIER_ANNEX_UPLOAD",
    entityType: "DossierAttachment",
    entityId: attachment.id,
    organizationId: owned.application!.organizationId,
    after: { annexCode, filename: attachment.filename },
  });
  return NextResponse.json(
    { ok: true, id: attachment.id, filename: attachment.filename, annexCode, title: attachment.title },
    { status: existing ? 200 : 201 },
  );
}

async function attachInternalCertificate(session: AuthedSession, applicationId: string, file: File) {
  const allowed =
    file.type === "application/pdf" ||
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp" ||
    /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
  if (!allowed) return fail("Upload a PDF or an image of the scanned certificate");
  if (file.size > 15 * 1024 * 1024) return fail("The scanned certificate must be 15 MB or smaller");
  const owned = await loadOwnedApplication(session, applicationId);
  if (owned.error) return owned.error;
  const stored = await storeDossierFile(file);
  const existing = await prisma.dossierAttachment.findFirst({
    where: { applicationId, kind: INTERNAL_CERTIFICATE_KIND },
  });
  const attachment = existing
    ? await prisma.dossierAttachment.update({
        where: { id: existing.id },
        data: {
          title: "Internal certificate",
          filename: stored.filename,
          contentType: stored.contentType,
          storageUri: stored.storageUri,
          uploadedAt: new Date(),
          annexCode: INTERNAL_CERTIFICATE_KIND,
        },
      })
    : await prisma.dossierAttachment.create({
        data: {
          applicationId,
          kind: INTERNAL_CERTIFICATE_KIND,
          annexCode: INTERNAL_CERTIFICATE_KIND,
          title: "Internal certificate",
          filename: stored.filename,
          contentType: stored.contentType,
          storageUri: stored.storageUri,
        },
      });
  if (existing && existing.storageUri !== stored.storageUri) await removeDossierFile(existing.storageUri);
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "INTERNAL_CERTIFICATE_UPLOAD",
    entityType: "DossierAttachment",
    entityId: attachment.id,
    organizationId: owned.application!.organizationId,
    after: { filename: attachment.filename },
  });
  return NextResponse.json(
    { ok: true, id: attachment.id, filename: attachment.filename, kind: INTERNAL_CERTIFICATE_KIND },
    { status: existing ? 200 : 201 },
  );
}

async function attachOther(session: AuthedSession, applicationId: string, title: string, file: File) {
  const owned = await loadOwnedApplication(session, applicationId);
  if (owned.error) return owned.error;
  const stored = await storeDossierFile(file);
  const attachment = await prisma.dossierAttachment.create({
    data: {
      applicationId,
      kind: "OTHER",
      title,
      filename: stored.filename,
      contentType: stored.contentType,
      storageUri: stored.storageUri,
    },
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "DOSSIER_OTHER_UPLOAD",
    entityType: "DossierAttachment",
    entityId: attachment.id,
    organizationId: owned.application!.organizationId,
    after: { title, filename: attachment.filename },
  });
  return NextResponse.json(
    { ok: true, id: attachment.id, filename: attachment.filename, title: attachment.title },
    { status: 201 },
  );
}
