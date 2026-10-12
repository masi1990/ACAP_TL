import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { issueCertificateOfConformity } from "@/lib/coc";
import { can } from "@/lib/rbac";
import { requirePermission, type AuthedSession } from "@/lib/require-auth";
import { extractAssessmentDrafts } from "@/lib/standard-assessment";

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
  if (!/^[A-Z]{2}$/.test(countryIso2)) return fail("Country must be a 2-letter code");
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

  const product = await prisma.product.create({
    data: { companyId: company.id, name, commodity },
  });
  await prisma.productStandardLink.create({
    data: { productId: product.id, standardVersionId },
  });
  await prisma.productVariant.create({
    data: { productId: product.id, sku: `SKU-${product.id.slice(-8).toUpperCase()}`, label: name },
  });
  const application = await prisma.certificationApplication.create({
    data: {
      productId: product.id,
      organizationId: cbId,
      standardVersionId,
      status: "EVALUATION",
      markScheme: "QUALITY",
    },
  });
  await materialize(application.id, version.machineDocJson);

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

async function materialize(applicationId: string, machineDocJson: string) {
  const existing = await prisma.assessmentItem.count({ where: { applicationId, source: "STANDARD" } });
  if (existing) return;
  let machine: Parameters<typeof extractAssessmentDrafts>[0] = {};
  try {
    machine = JSON.parse(machineDocJson);
  } catch {
    machine = {};
  }
  const drafts = extractAssessmentDrafts(machine);
  if (!drafts.length) return;
  await prisma.assessmentItem.createMany({
    data: drafts.map((d) => ({
      applicationId,
      source: "STANDARD",
      kind: d.kind,
      itemKey: d.itemKey,
      section: d.section,
      clause: d.clause,
      heading: d.heading,
      text: d.text,
      testMethod: d.testMethod,
      sortOrder: d.sortOrder,
    })),
  });
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

  if (mode === "load") {
    const version = await prisma.standardVersion.findUnique({ where: { id: application.standardVersionId } });
    if (!version) return fail("Standard not found");
    await materialize(application.id, version.machineDocJson);
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
      },
    });
  }
  return NextResponse.json({ ok: true });
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

async function uploadEvidence(req: NextRequest) {
  const auth = await requirePermission("certify:operate");
  if (auth.error) return auth.error;
  const session = auth.session!;
  const form = await req.formData();
  const itemId = String(form.get("assessmentItemId") || "");
  const file = form.get("file");
  if (!itemId || !(file instanceof File)) return fail("Choose a laboratory file to attach");
  const item = await prisma.assessmentItem.findUnique({
    where: { id: itemId },
    include: { application: true },
  });
  if (!item) return fail("Requirement not found");
  const cbId = actingCbId(session, item.application.organizationId);
  if (item.application.organizationId !== cbId && !can(session.user, "cb:write")) {
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
  return NextResponse.json({ ok: true, id: evidence.id }, { status: 201 });
}
