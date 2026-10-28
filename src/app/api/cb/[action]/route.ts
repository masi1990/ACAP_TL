import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { issueCertificateOfConformity } from "@/lib/coc";
import { hasGlobalPermission, userServesCertificationBody } from "@/lib/rbac";
import { requirePermission, type AuthedSession } from "@/lib/require-auth";
import { annexTitle, INTERNAL_CERTIFICATE_KIND, isAnnexCode } from "@/lib/dossier";
import { removeDossierFile, storeDossierFile } from "@/lib/dossier-files";
import { isCountryCode } from "@/lib/countries";
import { originClaimFromBody } from "@/lib/origin-claim";
import { createTradeProduct, ecoTrackFromBody, materializeStandardItems, resolveCertifyingCb, resolveTariffLineId, assertApplicationAcceptsWork, ProductRecordError } from "@/lib/product-record";
import { hashPassword } from "@/lib/auth";
import { replaceOrgRole } from "@/lib/org-accounts";
import { issuePasswordReset } from "@/lib/password-reset";
import { notifyAfterCommit } from "@/lib/notifications";

type Ctx = { params: Promise<{ action: string }> };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function actingCbId(session: AuthedSession, requested?: string) {
  const ids = session.user.memberships
    .filter((membership) => membership.organization.type === "CB")
    .map((membership) => membership.organization.id);
  if (hasGlobalPermission(session.user, "cb:write")) return String(requested || ids[0] || "");
  const asked = String(requested || "");
  if (ids.length === 1) return ids[0];
  if (asked && ids.includes(asked)) return asked;
  return "";
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;
  if (action === "evidence") return uploadEvidence(req);

  const permission = action === "clients" ? "clients:write" : "certify:operate";
  if (!["clients", "products", "assessment", "certificate", "decision"].includes(action)) {
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
    if (action === "decision") return await decideSubmission(session, body);
    return await issue(session, body);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Request failed");
  }
}

async function decideSubmission(session: AuthedSession, body: Record<string, unknown>) {
  const kind = String(body.kind || "");
  const id = String(body.id || "").trim();
  const decision = String(body.decision || "");
  if (!id || (decision !== "accept" && decision !== "reject")) {
    return fail("Choose accept or reject");
  }
  if (kind === "client") return decideClient(session, id, decision);
  if (kind === "product") return decideProduct(session, id, decision);
  return fail("Choose a company or a product");
}

async function decideClient(session: AuthedSession, id: string, decision: "accept" | "reject") {
  const organization = await prisma.organization.findUnique({ where: { id } });
  if (!organization || (organization.type !== "MANUFACTURER" && organization.type !== "IMPORTER")) {
    return fail("Manufacturer or importer not found", 404);
  }
  if (!organization.servicingCbId || !userServesCertificationBody(session.user, organization.servicingCbId)) {
    return fail("You can only decide clients of your certification body", 403);
  }
  if (organization.status !== "PENDING") return fail("This company is not waiting for acceptance");

  if (decision === "accept") {
    await prisma.organization.update({ where: { id }, data: { status: "ACTIVE" } });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id }, data: { status: "REJECTED" } });
      await tx.certificationApplication.updateMany({
        where: {
          status: "PENDING_APPROVAL",
          product: { company: { clientAccount: { organizationId: id } } },
        },
        data: { status: "REJECTED" },
      });
    });
  }

  await appendAuditEvent({
    actorUserId: session.userId,
    action: decision === "accept" ? "CB_CLIENT_ACCEPT" : "CB_CLIENT_REJECT",
    entityType: "Organization",
    entityId: id,
    organizationId: organization.servicingCbId,
    after: { status: decision === "accept" ? "ACTIVE" : "REJECTED" },
  });
  return NextResponse.json({ ok: true });
}

async function decideProduct(session: AuthedSession, id: string, decision: "accept" | "reject") {
  const application = await prisma.certificationApplication.findUnique({
    where: { id },
    include: { product: { include: { company: { include: { clientAccount: { include: { organization: true } } } } } } },
  });
  if (!application) return fail("Product not found", 404);
  if (!userServesCertificationBody(session.user, application.organizationId)) {
    return fail("You can only decide products of your certification body", 403);
  }
  if (application.status !== "PENDING_APPROVAL") return fail("This product is not waiting for acceptance");
  const owner = application.product.company.clientAccount.organization;
  if (decision === "accept" && owner.status !== "ACTIVE") {
    return fail("Accept the company before accepting the product");
  }

  await prisma.certificationApplication.updateMany({
    where: { productId: application.productId, status: "PENDING_APPROVAL" },
    data: { status: decision === "accept" ? "EVALUATION" : "REJECTED" },
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: decision === "accept" ? "CB_PRODUCT_ACCEPT" : "CB_PRODUCT_REJECT",
    entityType: "CertificationApplication",
    entityId: id,
    organizationId: application.organizationId,
    after: { status: decision === "accept" ? "EVALUATION" : "REJECTED" },
  });
  return NextResponse.json({ ok: true });
}

async function addClient(session: AuthedSession, body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const type = String(body.type || "MANUFACTURER").toUpperCase();
  const countryIso2 = String(body.countryIso2 || "").trim().toUpperCase();
  const email = String(body.email || "").toLowerCase().trim();
  const cbId = actingCbId(session, String(body.cbOrganizationId || ""));
  if (!name) return fail("Client name is required");
  if (!email.includes("@")) return fail("Account email is required");
  if (type !== "MANUFACTURER" && type !== "IMPORTER") {
    return fail("Client must be a manufacturer or an importer");
  }
  if (!isCountryCode(countryIso2)) return fail("Choose a country");
  const cb = cbId ? await prisma.organization.findUnique({ where: { id: cbId } }) : null;
  if (!cb || cb.type !== "CB") return fail("Choose the certification body that serves this client");

  const org = await prisma.organization.create({
    data: { name, type, servicingCbId: cb.id, status: "ACTIVE" },
  });
  const account = await prisma.clientAccount.create({
    data: { organizationId: org.id, displayName: name },
  });
  await prisma.company.create({
    data: { clientAccountId: account.id, legalName: name, countryIso2 },
  });

  const existing = await prisma.userAccount.findUnique({ where: { email } });
  let setPasswordUrl = "";
  if (existing) {
    await replaceOrgRole({
      userId: existing.id,
      organizationId: org.id,
      roleCode: "PRIMARY_ADMIN",
      grantedById: session.userId,
    });
  } else {
    const user = await prisma.userAccount.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(randomBytes(24).toString("hex")),
        mustChangePassword: true,
      },
    });
    await replaceOrgRole({
      userId: user.id,
      organizationId: org.id,
      roleCode: "PRIMARY_ADMIN",
      grantedById: session.userId,
    });
    const issued = await issuePasswordReset(user);
    setPasswordUrl = issued.url;
    await notifyAfterCommit();
  }

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "CB_CLIENT_CREATE",
    entityType: "Organization",
    entityId: org.id,
    organizationId: cb.id,
    after: { name, type, email },
  });
  return NextResponse.json(
    {
      ok: true,
      id: org.id,
      ...(setPasswordUrl
        ? {
            setPasswordUrl,
            message: "Client created. They must set a password from this link before they can sign in.",
          }
        : { message: "Client created and linked to the existing account." }),
    },
    { status: 201 },
  );
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

  if (client.status !== "ACTIVE") {
    return fail("Accept this company before adding a product for it");
  }

  const version = await prisma.standardVersion.findUnique({ where: { id: standardVersionId } });
  if (!version) return fail("Standard not found");

  const company = client.clientAccounts.flatMap((a) => a.companies)[0];
  if (!company) return fail("This client has no company record");

  const claim = originClaimFromBody(body, { importer: client.type === "IMPORTER" });
  const marks = await ecoTrackFromBody(body);
  const certifyingCbId = await resolveCertifyingCb(body.certifyingCbId, cbId);
  const product = await createTradeProduct({
    companyId: company.id,
    name,
    commodity,
    standardVersionId,
    machineDocJson: version.machineDocJson,
    originClaimJson: JSON.stringify(claim),
    tariffLineId: await resolveTariffLineId(standardVersionId, body.tariffLineId),
    servicingCbId: certifyingCbId,
    coverage: marks.coverage,
    ecoStandardVersionId: marks.ecoStandardVersionId,
    ecoMachineDocJson: marks.ecoMachineDocJson,
    applicationStatus: "EVALUATION",
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
  if (!userServesCertificationBody(session.user, application.organizationId)) {
    return fail("You can only record results for your certification body");
  }
  try {
    assertApplicationAcceptsWork(application.status);
  } catch (err) {
    return fail(err instanceof ProductRecordError ? err.message : "This product is not in certification");
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
        recordedById: session.userId,
      },
    });
    await prisma.certificationApplication.update({
      where: { id: applicationId },
      data: { recordedById: session.userId },
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
        recordedById: session.userId,
      },
    });
  }
  await prisma.certificationApplication.update({
    where: { id: applicationId },
    data: { recordedById: session.userId },
  });
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
  await prisma.certificationApplication.update({
    where: { id: application.id },
    data: { recordedById: session.userId },
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
  if (!userServesCertificationBody(session.user, application.organizationId)) {
    return fail("You can only issue a certificate for your certification body");
  }
  try {
    assertApplicationAcceptsWork(application.status);
  } catch (err) {
    return fail(err instanceof ProductRecordError ? err.message : "This product is not in certification");
  }
  try {
    const result = await issueCertificateOfConformity({ applicationId, actorUserId: session.userId });
    return NextResponse.json({ ok: true, certificateNo: result.coc.certificateNo, reused: result.reused });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Certificate could not be issued");
  }
}

function ownsApplication(session: AuthedSession, organizationId: string) {
  return userServesCertificationBody(session.user, organizationId);
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
  try {
    assertApplicationAcceptsWork(item.application.status);
  } catch (err) {
    return fail(err instanceof ProductRecordError ? err.message : "This product is not in certification");
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
  await prisma.assessmentItem.update({
    where: { id: item.id },
    data: { recordedById: session.userId },
  });
  await prisma.certificationApplication.update({
    where: { id: item.application.id },
    data: { recordedById: session.userId },
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
  try {
    assertApplicationAcceptsWork(application.status);
  } catch (err) {
    return {
      error: fail(err instanceof ProductRecordError ? err.message : "This product is not in certification"),
    };
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
