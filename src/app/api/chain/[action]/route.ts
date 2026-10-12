import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { issueCertificateOfConformity } from "@/lib/coc";
import { can } from "@/lib/rbac";
import { requirePermission, type AuthedSession } from "@/lib/require-auth";

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
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error(`${label} must be a 2-letter country code`);
  }
  return code;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (action === "complaints") return fileComplaint(body);

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
    if (action === "tests") return await recordTest(session, body);
    if (action === "certificates") return await issueCertificate(session, body);
    if (action === "customs") return await decideCustoms(session, body);
    if (action === "inspections") return await recordInspection(session, body);
    return await openSurveillance(session, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return fail(message);
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

  const tradeTypes = ["MANUFACTURER", "IMPORTER", "CLIENT"];
  if (!tradeTypes.includes(organization.type)) {
    return fail("Products belong to a manufacturer or importer");
  }
  const ownTrade = session.user.memberships
    .filter((m) => tradeTypes.includes(m.organization.type))
    .map((m) => m.organization.id);
  if (ownTrade.length && !can(session.user, "manufacturer:write")) {
    if (!ownTrade.includes(organization.id)) {
      return fail("You can only register products for your own organisation");
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    let companyId = organization.clientAccounts.flatMap((a) => a.companies)[0]?.id;
    if (!companyId) {
      const account = await tx.clientAccount.create({
        data: { organizationId: organization.id, displayName: organization.name },
      });
      const company = await tx.company.create({
        data: {
          clientAccountId: account.id,
          legalName: organization.name,
          countryIso2: organization.memberState?.iso2 || "KE",
        },
      });
      companyId = company.id;
    }
    const created = await tx.product.create({
      data: {
        companyId,
        name,
        commodity,
      },
    });
    const tariff = await tx.standardTariffMap.findFirst({
      where: { standardVersionId },
      select: { tariffLineId: true },
    });
    if (tariff) {
      await tx.product.update({
        where: { id: created.id },
        data: { tariffLineId: tariff.tariffLineId },
      });
    }
    await tx.productStandardLink.create({
      data: { productId: created.id, standardVersionId },
    });
    await tx.productVariant.create({
      data: {
        productId: created.id,
        sku: `SKU-${created.id.slice(-8).toUpperCase()}`,
        label: name,
      },
    });
    return created;
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

async function recordTest(session: AuthedSession, body: Record<string, unknown>) {
  const productId = String(body.productId || "").trim();
  const labName = String(body.labName || "").trim();
  const measuredValue = String(body.measuredValue || "").trim();
  const unit = String(body.unit || "").trim();
  const notes = String(body.notes || "").trim();
  const pass = body.pass === true || body.pass === "true" || body.pass === "pass";
  if (!productId || !labName || !measuredValue || !unit) {
    return fail("Product, laboratory, measured value, and unit are required");
  }

  const ownCb = membershipOrgId(session, ["CB"]);
  const cbOrganizationId = String(body.cbOrganizationId || ownCb || "").trim();
  if (!cbOrganizationId) return fail("Certification body is required");
  if (ownCb && cbOrganizationId !== ownCb && !can(session.user, "cb:write")) {
    return fail("You can only record a test for your certification body");
  }

  const [product, cb] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: { standardLinks: true, applications: { include: { labResults: true } } },
    }),
    prisma.organization.findUnique({ where: { id: cbOrganizationId } }),
  ]);
  if (!product) return fail("Product not found");
  if (product.standardLinks.length !== 1) {
    return fail("The product must be linked to exactly one standard");
  }
  if (!cb || cb.type !== "CB") return fail("Certification body not found");

  const standardVersionId = product.standardLinks[0].standardVersionId;
  const existing = product.applications.find((a) => a.standardVersionId === standardVersionId);
  if (existing?.labResults.length) {
    return fail("One test is already recorded for this product and standard");
  }
  if (existing && existing.organizationId !== cb.id) {
    return fail("This product is already with another certification body");
  }

  const application =
    existing ??
    (await prisma.certificationApplication.create({
      data: {
        productId,
        organizationId: cb.id,
        standardVersionId,
        status: "EVALUATION",
        markScheme: "QUALITY",
      },
    }));

  const lab = await prisma.labResult.create({
    data: {
      applicationId: application.id,
      requirementId: "product-conformity",
      measuredValue,
      unit,
      pass,
      labName,
      testedAt: new Date(),
      notes: notes || null,
    },
  });

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "TEST_RECORD",
    entityType: "LabResult",
    entityId: lab.id,
    organizationId: cb.id,
    after: { productId, pass, labName },
  });

  return NextResponse.json({ ok: true, applicationId: application.id, id: lab.id }, { status: 201 });
}

async function issueCertificate(session: AuthedSession, body: Record<string, unknown>) {
  const applicationId = String(body.applicationId || "").trim();
  if (!applicationId) return fail("Application is required");

  const application = await prisma.certificationApplication.findUnique({
    where: { id: applicationId },
    include: { labResults: true },
  });
  if (!application) return fail("Application not found");

  const ownCb = membershipOrgId(session, ["CB"]);
  if (ownCb && application.organizationId !== ownCb && !can(session.user, "cb:write")) {
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
  if (product.standardLinks.length !== 1) {
    return fail("The product must be linked to exactly one standard");
  }

  const row = await prisma.conformityInspection.create({
    data: {
      productId,
      standardVersionId: product.standardLinks[0].standardVersionId,
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

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

async function openSurveillance(session: AuthedSession, body: Record<string, unknown>) {
  const title = String(body.title || "").trim();
  const summary = String(body.summary || "").trim();
  const pinCode = String(body.pinCode || "").trim();
  if (!title || !summary) return fail("Title and summary are required");

  const pin = pinCode
    ? await prisma.productPin.findUnique({ where: { pinCode } })
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

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

async function fileComplaint(body: Record<string, unknown>) {
  const email = String(body.complainantEmail || "").trim().toLowerCase();
  const subject = String(body.subject || "").trim();
  const text = String(body.body || "").trim();
  const pinCode = String(body.pinCode || "").trim();
  if (!email || !email.includes("@")) return fail("A contact email is required");
  if (!subject || !text) return fail("Subject and details are required");

  const pin = pinCode
    ? await prisma.productPin.findUnique({
        where: { pinCode },
        include: { coc: { include: { application: true } } },
      })
    : null;
  if (pinCode && !pin) return fail("PIN not found");

  const routedCbId = pin?.coc?.application.organizationId ?? null;
  const complaint = await prisma.consumerComplaint.create({
    data: {
      pinId: pin?.id,
      complainantEmail: email,
      subject,
      body: text,
      status: "OPEN",
      routedCbId,
    },
  });

  await appendAuditEvent({
    action: "CONSUMER_COMPLAINT",
    entityType: "ConsumerComplaint",
    entityId: complaint.id,
    organizationId: routedCbId,
  });

  return NextResponse.json({
    ok: true,
    message: routedCbId
      ? "Complaint filed and routed to the certification body"
      : "Complaint filed",
  });
}
