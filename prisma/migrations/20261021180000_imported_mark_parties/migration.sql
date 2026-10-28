ALTER TABLE "imported_certified_marks" ADD COLUMN "manufacturerOrgId" TEXT;
ALTER TABLE "imported_certified_marks" ADD COLUMN "certificationBodyOrgId" TEXT;

CREATE INDEX "imported_certified_marks_manufacturerOrgId_idx" ON "imported_certified_marks"("manufacturerOrgId");
CREATE INDEX "imported_certified_marks_certificationBodyOrgId_idx" ON "imported_certified_marks"("certificationBodyOrgId");

ALTER TABLE "imported_certified_marks" ADD CONSTRAINT "imported_certified_marks_manufacturerOrgId_fkey" FOREIGN KEY ("manufacturerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "imported_certified_marks" ADD CONSTRAINT "imported_certified_marks_certificationBodyOrgId_fkey" FOREIGN KEY ("certificationBodyOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
