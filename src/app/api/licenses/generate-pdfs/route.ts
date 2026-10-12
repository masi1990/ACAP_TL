import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generateLicencePdf } from "@/lib/pdf";
import { appendAuditEvent } from "@/lib/audit";

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const licenses = await prisma.cbLicense.findMany({ include: { organization: true } });
  let count = 0;
  for (const lic of licenses) {
    if (!lic.issuedAt || !lic.expiresAt) continue;
    const uri = await generateLicencePdf({
      title: `${lic.licenseType} — ${lic.markScheme} Mark Licence`,
      licenseNumber: lic.licenseNumber,
      holder: lic.organization.name,
      scheme: lic.markScheme,
      issuedAt: lic.issuedAt,
      expiresAt: lic.expiresAt,
      filename: `${lic.licenseNumber}.pdf`,
    });
    await prisma.cbLicense.update({ where: { id: lic.id }, data: { pdfUri: uri } });
    count += 1;
  }

  // Also generate a Type 2 sublicence PDF stub
  const existing = await prisma.markSublicense.findFirst();
  if (!existing) {
    const type2 = licenses.find((l) => l.licenseType === "TYPE2");
    if (type2) {
      const num = "ARSO-SUB-Q-MWEA-001";
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const uri = await generateLicencePdf({
        title: "Type 2 Mark Sublicence",
        licenseNumber: num,
        holder: "Mwea Rice Mills Ltd",
        scheme: "QUALITY",
        issuedAt,
        expiresAt,
        filename: `${num}.pdf`,
      });
      await prisma.markSublicense.create({
        data: {
          cbLicenseId: type2.id,
          issuerOrgId: type2.organizationId,
          clientName: "Mwea Rice Mills Ltd",
          markScheme: "QUALITY",
          status: "APPROVED",
          approvalMode: type2.approvalMode || "MANUAL",
          issuedAt,
          expiresAt,
          pdfUri: uri,
          licenseNumber: num,
        },
      });
      count += 1;
    }
  }

  await appendAuditEvent({
    actorUserId: session.userId,
    action: "LICENCE_PDFS_GENERATED",
    entityType: "CbLicense",
    entityId: "batch",
    after: { count },
  });
  return NextResponse.json({ message: `Generated/updated ${count} licence PDF(s)` });
}
