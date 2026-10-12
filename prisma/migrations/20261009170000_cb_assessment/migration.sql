-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "servicingCbId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentItem" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'clause',
    "itemKey" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "clause" TEXT NOT NULL DEFAULT '',
    "heading" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "testMethod" TEXT NOT NULL DEFAULT '',
    "countryIso2" TEXT,
    "pass" BOOLEAN,
    "measuredValue" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabEvidence" (
    "id" TEXT NOT NULL,
    "assessmentItemId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "storageUri" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentItem_applicationId_itemKey_key" ON "AssessmentItem"("applicationId", "itemKey");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_servicingCbId_fkey" FOREIGN KEY ("servicingCbId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentItem" ADD CONSTRAINT "AssessmentItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CertificationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabEvidence" ADD CONSTRAINT "LabEvidence_assessmentItemId_fkey" FOREIGN KEY ("assessmentItemId") REFERENCES "AssessmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "RoleDefinition"
SET "description" = 'Certification body officer. Registers client manufacturers and importers, the products certified for them, laboratory results against every requirement of the standard, and the certificate.',
    "permissionsJson" = '["standards:read","recs:read","tariffs:read","cb:read","products:read","products:write","clients:write","certify:operate","portal:operate"]',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'CB_OFFICER';

INSERT INTO "RoleDefinition" ("id", "code", "name", "description", "scope", "permissionsJson", "isSystem", "createdAt", "updatedAt")
SELECT 'role-inspector', 'INSPECTOR', 'Conformity inspector', 'Checks a product against its one linked standard.', 'ORG', '["standards:read","products:read","inspect:write"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RoleDefinition" WHERE "code" = 'INSPECTOR');

INSERT INTO "RoleDefinition" ("id", "code", "name", "description", "scope", "permissionsJson", "isSystem", "createdAt", "updatedAt")
SELECT 'role-surveillance', 'SURVEILLANCE_OFFICER', 'Market surveillance officer', 'Opens market surveillance cases on certified products.', 'ORG', '["standards:read","products:read","surveillance:operate"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RoleDefinition" WHERE "code" = 'SURVEILLANCE_OFFICER');
