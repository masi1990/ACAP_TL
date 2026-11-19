import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { issueCertificateOfConformity } from "@/lib/coc";
import { certificationBodyIds, hasGlobalPermission } from "@/lib/rbac";
import { requirePermission, type AuthedSession } from "@/lib/require-auth";
import { isCountryCode } from "@/lib/countries";
import { originClaimFromBody } from "@/lib/origin-claim";
import {
  assertCanManageTradeOrg,
  createTradeProduct,
  ecoTrackFromBody,
  ensureCompany,
  ProductRecordError,
  resolveCertifyingCb,
  resolveTariffLineId,
  submittedApplicationStatus,
} from "@/lib/product-record";
import {
  notifyAfterCommit,
  queueComplaintEmails,
  queueCustomsDecision,
  queueInspectionNonConform,
  queueSurveillanceOpened,
} from "@/lib/notifications";
import { ComplaintTargetError, resolveComplaintTarget } from "@/lib/complaint-target";
import { ComplaintPhotoError, storeComplaintPhoto } from "@/lib/complaint-photos";
import { listCertifiedProducts } from "@/lib/registry";
type Ctx = { params: Promise<{ action: string }> };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function membershipOrgId(session: AuthedSession, types: string[]) {
  return (
    session.user.memberships.find((m) => types.includes(m.organization.type))?.organization.id ?? null
  );
}

function iso2(value: unknown, label: string) {
  const code = String(value || "").trim().toUpperCase();
  if (!isCountryCode(code)) {
    throw new Error(`${label} must be a country`);
  }
  return code;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;
  if (action !== "certified-products") return fail("Unknown action", 404);
  const sp = req.nextUrl.searchParams;
  const data = await listCertifiedProducts({
    q: sp.get("q") || undefined,
    status: "certified",
    page: Number(sp.get("page") || 1) || 1,
    pageSize: Math.min(20, Number(sp.get("pageSize") || 20) || 20),
  });
  return NextResponse.json({
    ok: true,
    products: data.products.map((p) => ({
      id: p.id,
      productName: p.productName,
      brand: p.brand || p.productName,
      manufacturer: p.companyName,
      pinCode: p.pinCode,
      pinCodes: p.pinCodes || [],
      cbName: p.cbName,
      countryIso2: p.countryIso2,
      countryName: p.countryName,
      status: p.status,
    })),
    total: data.total,
    page: data.page,
    pageCount: data.pageCount,
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;

  if (action === "complaints") {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);
      if (!form) return fail("Invalid form data");
      return fileComplaint(Object.fromEntries(form.entries()), {
        labelPhoto: form.get("labelPhoto"),
        markPhoto: form.get("markPhoto"),
        receiptPhoto: form.get("receiptPhoto"),
      });
    }
    const body = await req.json().catch(() => ({}));
    return fileComplaint(body);
  }

  const body = await req.json().catch(() => ({}));

  const permission =
    action === "products"
      ? "products:write"
      : action === "tests" || action === "certificates"
        ? "certify:operate"
        : action === "customs"
          ? "customs:decide"
          : action === "inspections"
            ? "inspect:write"
            : action === "surveillance"
              ? "surveillance:operate"
              : null;
  if (!permission) return fail("Unknown action", 404);

  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;
  const session = auth.session!;

  try {
    if (action === "products") return await registerProduct(session, body);
    if (action === "tests") return await recordTest();
    if (action === "certificates") return await issueCertificate(session, body);
    if (action === "customs") return await decideCustoms(session, body);
    if (action === "inspections") return await recordInspection(session, body);
    return await openSurveillance(session, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = err instanceof ProductRecordError ? err.status : 400;
    return fail(message, status);
  }
}

async function registerProduct(session: AuthedSession, body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const commodity = String(body.commodity || "").trim();
  const organizationId = String(body.organizationId || "").trim();
  const standardVersionId = String(body.standardVersionId || "").trim();
  if (!name || !commodity || !organizationId || !standardVersionId) {
    return fail("Name, commodity, manufacturer, and standard are required");
  }

  const [organization, version] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberState: true,
        clientAccounts: { include: { companies: true } },
      },
    }),
    prisma.standardVersion.findUnique({ where: { id: standardVersionId } }),
  ]);
  if (!organization) return fail("Manufacturer or importer not found");
  if (!version) return fail("Standard not found");

  try {
    assertCanManageTradeOrg(session, organization);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Request failed", err instanceof ProductRecordError ? err.status : 400);
  }

  const claim = originClaimFromBody(body, { importer: organization.type === "IMPORTER" });
  const companyId = await ensureCompany(organization, claim.originIso2);
  const marks = await ecoTrackFromBody(body);
  const certifyingCbId = await resolveCertifyingCb(body.certifyingCbId, organization.servicingCbId);
  const applicationStatus = submittedApplicationStatus(session, certifyingCbId);
  const product = await createTradeProduct({
    companyId,
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
    applicationStatus,
  });

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "PRODUCT_REGISTER",
    entityType: "Product",
    entityId: product.id,
    organizationId: organization.id,
    after: { name, standardVersionId },
  });

  return NextResponse.json({ ok: true, id: product.id }, { status: 201 });
}

async function recordTest() {
  return fail("Record the laboratory, the sample, and each requirement on the product in the certification desk");
}

async function issueCertificate(session: AuthedSession, body: Record<string, unknown>) {
  const applicationId = String(body.applicationId || "").trim();
  if (!applicationId) return fail("Application is required");

  const application = await prisma.certificationApplication.findUnique({
    where: { id: applicationId },
    include: { labResults: true },
  });
  if (!application) return fail("Application not found");

  const ownIds = certificationBodyIds(session.user);
  if (
    !hasGlobalPermission(session.user, "cb:write") &&
    !ownIds.includes(application.organizationId)
  ) {
    return fail("You can only issue a certificate for your certification body");
  }

  try {
    const result = await issueCertificateOfConformity({
      applicationId,
      actorUserId: session.userId,
    });
    return NextResponse.json({
      ok: true,
      certificateNo: result.coc.certificateNo,
      reused: result.reused,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Certificate could not be issued");
  }
}

async function decideCustoms(session: AuthedSession, body: Record<string, unknown>) {
  const productId = String(body.productId || "").trim();
  const decision = String(body.decision || "").trim().toUpperCase();
  const reason = String(body.reason || "").trim();
  if (!productId) return fail("Product is required");
  if (!["ALLOW", "REFUSE", "HOLD"].includes(decision)) {
    return fail("Decision must be allow, refuse, or hold");
  }
  let originIso2: string;
  let destinationIso2: string;
  try {
    originIso2 = iso2(body.originIso2, "Origin country");
    destinationIso2 = iso2(body.destinationIso2, "Destination country");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Country code is invalid");
  }
  if (originIso2 === destinationIso2) {
    return fail("Origin and destination must be different countries");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      applications: { include: { coc: true } },
    },
  });
  if (!product) return fail("Product not found");
  const certified = product.applications.find((a) => a.coc && a.coc.status === "certified");
  if (decision === "ALLOW" && !certified?.coc) {
    return fail("Customs can allow entry only after the one certificate has been issued");
  }

  const row = await prisma.customsClearance.create({
    data: {
      productId,
      cocId: certified?.coc?.id,
      organizationId: membershipOrgId(session, ["CUSTOMS"]),
      officerUserId: session.userId,
      originIso2,
      destinationIso2,
      decision,
      reason,
    },
  });

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "CUSTOMS_DECISION",
    entityType: "CustomsClearance",
    entityId: row.id,
    organizationId: row.organizationId,
    after: { productId, decision, originIso2, destinationIso2 },
  });

  await queueCustomsDecision({ clearanceId: row.id, productId, decision, reason });
  await notifyAfterCommit();

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

async function recordInspection(session: AuthedSession, body: Record<string, unknown>) {
  const productId = String(body.productId || "").trim();
  const result = String(body.result || "").trim().toUpperCase();
  const findings = String(body.findings || "").trim();
  if (!productId) return fail("Product is required");
  if (!["CONFORM", "NON_CONFORM"].includes(result)) {
    return fail("Result must be conform or non-conform");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { standardLinks: true },
  });
  if (!product) return fail("Product not found");
  const qualityLink =
    product.standardLinks.find((link) => link.markScheme === "QUALITY") || product.standardLinks[0];
  if (!qualityLink) return fail("The product must be linked to a standard");
  const requestedStandard = String(body.standardVersionId || "").trim();
  const standardVersionId = requestedStandard || qualityLink.standardVersionId;
  if (!product.standardLinks.some((link) => link.standardVersionId === standardVersionId)) {
    return fail("Choose one of the standards this product is certified against");
  }

  const row = await prisma.conformityInspection.create({
    data: {
      productId,
      standardVersionId,
      organizationId: membershipOrgId(session, ["NSB"]),
      inspectorUserId: session.userId,
      result,
      findings,
    },
  });

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "INSPECTION_RECORD",
    entityType: "ConformityInspection",
    entityId: row.id,
    organizationId: row.organizationId,
    after: { productId, result },
  });

  if (result === "NON_CONFORM") {
    await queueInspectionNonConform({ inspectionId: row.id, productId, findings });
    await notifyAfterCommit();
  }

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

async function openSurveillance(session: AuthedSession, body: Record<string, unknown>) {
  const title = String(body.title || "").trim();
  const summary = String(body.summary || "").trim();
  const pinCode = String(body.pinCode || "").trim();
  if (!title || !summary) return fail("Title and summary are required");

  const pin = pinCode
    ? await prisma.productPin.findUnique({
        where: { pinCode },
        include: { coc: { include: { application: true } } },
      })
    : null;
  if (pinCode && !pin) return fail("PIN not found");

  const row = await prisma.surveillanceCase.create({
    data: {
      pinId: pin?.id,
      title,
      summary,
      status: "OPEN",
    },
  });

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "SURVEILLANCE_CASE",
    entityType: "SurveillanceCase",
    entityId: row.id,
    organizationId: membershipOrgId(session, ["MARKET_SURVEILLANCE"]),
    after: { title, pinCode: pin?.pinCode ?? null },
  });

  await queueSurveillanceOpened({
    caseId: row.id,
    title,
    pinCode: pin?.pinCode,
    cbOrgId: pin?.coc?.application.organizationId ?? null,
  });
  await notifyAfterCommit();

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

function optionalDate(value: unknown): Date | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("Enter valid manufacture or expiry dates");
  return d;
}

async function fileComplaint(
  body: Record<string, unknown>,
  files?: { labelPhoto: FormDataEntryValue | null; markPhoto: FormDataEntryValue | null; receiptPhoto: FormDataEntryValue | null },
) {
  try {
    const email = String(body.complainantEmail || "").trim().toLowerCase();
    const subject = String(body.subject || "").trim();
    const text = String(body.body || "").trim();
    const originCountryIso2 = iso2(body.originCountryIso2, "Country of origin");
    const manufactureCountryIso2 = iso2(body.manufactureCountryIso2, "Country of manufacture");
    if (!email || !email.includes("@")) return fail("A contact email is required");
    if (!subject || !text) return fail("Subject and details are required");

    const target = await resolveComplaintTarget({
      registryKey: String(body.registryKey || body.productId || "").trim(),
      productId: String(body.productId || "").trim(),
      pinCode: String(body.pinCode || "").trim(),
    });

    const labelPhotoUri = await storeComplaintPhoto(
      files?.labelPhoto instanceof File ? files.labelPhoto : null,
      "label",
    );
    const markPhotoUri = await storeComplaintPhoto(
      files?.markPhoto instanceof File ? files.markPhoto : null,
      "mark",
    );
    const receiptPhotoUri = await storeComplaintPhoto(
      files?.receiptPhoto instanceof File ? files.receiptPhoto : null,
      "receipt",
    );

    const complaint = await prisma.consumerComplaint.create({
      data: {
        pinId: target.pinId,
        productId: target.productId,
        registryKey: target.registryKey,
        brand: target.brand,
        manufacturer: target.manufacturer,
        originCountryIso2,
        manufactureCountryIso2,
        purchasePlace: String(body.purchasePlace || "").trim(),
        quantity: String(body.quantity || "").trim(),
        flavour: String(body.flavour || "").trim(),
        manufacturedOn: optionalDate(body.manufacturedOn),
        expiresOn: optionalDate(body.expiresOn),
        labelPhotoUri,
        markPhotoUri,
        receiptPhotoUri,
        complainantEmail: email,
        subject,
        body: text,
        status: "OPEN",
        routedCbId: target.routedCbId,
      },
    });

    await appendAuditEvent({
      action: "CONSUMER_COMPLAINT",
      entityType: "ConsumerComplaint",
      entityId: complaint.id,
      organizationId: target.routedCbId,
    });

    await queueComplaintEmails({
      complaintId: complaint.id,
      email,
      subject,
      body: text,
      brand: target.brand,
      manufacturer: target.manufacturer,
      originCountryIso2,
      manufactureCountryIso2,
      purchasePlace: String(body.purchasePlace || "").trim(),
      quantity: String(body.quantity || "").trim(),
      flavour: String(body.flavour || "").trim(),
      pinCode: target.pinCode,
      cbName: target.cbName,
      routedCbId: target.routedCbId,
    });
    await notifyAfterCommit();

    return NextResponse.json({
      ok: true,
      id: complaint.id,
      message: `Complaint filed and routed to ${target.cbName}`,
    });
  } catch (err) {
    if (err instanceof ComplaintTargetError || err instanceof ComplaintPhotoError) {
      return fail(err.message);
    }
    const message = err instanceof Error ? err.message : "Request failed";
    return fail(message);
  }
}
