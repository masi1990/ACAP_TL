import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { isCountryCode } from "@/lib/countries";
import { replaceOrgRole } from "@/lib/org-accounts";
import { isTradeOrgType } from "@/lib/rbac";
import { saveCompanyCountries } from "@/lib/institution-shape";
import { requireSession } from "@/lib/require-auth";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** A manufacturer organisation admin registers another company. The chosen certification body must accept it. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const session = auth.session!;
  const admin = session.user.memberships.some(
    (membership) =>
      isTradeOrgType(membership.organization.type) &&
      (membership.role === "PRIMARY_ADMIN" || membership.role === "ORG_ADMIN"),
  );
  if (!admin) return fail("Only an organisation admin can add a company", 403);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const type = String(body.type || "MANUFACTURER").toUpperCase();
  const countryIso2 = String(body.countryIso2 || "").trim().toUpperCase();
  const cbId = String(body.cbOrganizationId || "").trim();
  if (!name) return fail("Company name is required");
  if (type !== "MANUFACTURER" && type !== "IMPORTER") return fail("Choose a manufacturer or an importer");
  if (!isCountryCode(countryIso2)) return fail("Choose a country");
  const cb = cbId ? await prisma.organization.findUnique({ where: { id: cbId } }) : null;
  if (!cb || cb.type !== "CB" || cb.status === "SUSPENDED") {
    return fail("Choose an active certification body");
  }

  const org = await prisma.organization.create({
    data: { name, type, servicingCbId: cb.id, status: "PENDING" },
  });
  const account = await prisma.clientAccount.create({
    data: { organizationId: org.id, displayName: name },
  });
  const company = await prisma.company.create({
    data: { clientAccountId: account.id, legalName: name, countryIso2 },
  });
  if (Array.isArray(body.operatingCountryIds)) {
    await saveCompanyCountries(
      company.id,
      body.operatingCountryIds.map((id: unknown) => String(id)),
    );
  }
  await replaceOrgRole({
    userId: session.userId,
    organizationId: org.id,
    roleCode: "PRIMARY_ADMIN",
    grantedById: session.userId,
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "TRADE_COMPANY_SUBMIT",
    entityType: "Organization",
    entityId: org.id,
    organizationId: cb.id,
    after: { name, type, status: "PENDING" },
  });
  return NextResponse.json({ ok: true, id: org.id }, { status: 201 });
}
