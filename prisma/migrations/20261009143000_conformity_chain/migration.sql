-- Conformity chain: one product, one standard, one test, one certificate,
-- plus customs clearance and inspector checks.

CREATE TABLE "ConformityInspection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "standardVersionId" TEXT NOT NULL,
    "organizationId" TEXT,
    "inspectorUserId" TEXT,
    "result" TEXT NOT NULL,
    "findings" TEXT NOT NULL DEFAULT '',
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConformityInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomsClearance" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cocId" TEXT,
    "organizationId" TEXT,
    "officerUserId" TEXT,
    "originIso2" TEXT NOT NULL,
    "destinationIso2" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomsClearance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CertificationApplication_productId_standardVersionId_key" ON "CertificationApplication"("productId", "standardVersionId");

CREATE UNIQUE INDEX "LabResult_applicationId_key" ON "LabResult"("applicationId");

CREATE UNIQUE INDEX "ProductStandardLink_productId_key" ON "ProductStandardLink"("productId");

ALTER TABLE "ConformityInspection" ADD CONSTRAINT "ConformityInspection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConformityInspection" ADD CONSTRAINT "ConformityInspection_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConformityInspection" ADD CONSTRAINT "ConformityInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomsClearance" ADD CONSTRAINT "CustomsClearance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomsClearance" ADD CONSTRAINT "CustomsClearance_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES "CoC"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomsClearance" ADD CONSTRAINT "CustomsClearance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Align existing system roles with the chain permissions. No catalogue or demo rows.
UPDATE "RoleDefinition" SET "permissionsJson" = '["standards:read","standards:write","standards:delete","standards:import","standards:preview_full","recs:read","recs:write","recs:delete","tariffs:read","tariffs:write","tariffs:delete","cb:read","cb:write","cb:delete","manufacturer:read","manufacturer:write","manufacturer:delete","portal:operate","products:read","products:write","certify:operate","customs:decide","inspect:write","surveillance:operate","impersonate","audit:read","roles:read","roles:write","roles:assign","users:read"]' WHERE "code" = 'ARSO_ADMIN';
UPDATE "RoleDefinition" SET "permissionsJson" = '["standards:read","standards:write","standards:import","standards:preview_full","recs:read","recs:write","tariffs:read","tariffs:write","cb:read","cb:write","manufacturer:read","manufacturer:write","products:read","products:write","certify:operate","customs:decide","inspect:write","surveillance:operate","portal:operate","impersonate","audit:read","roles:read","users:read"]' WHERE "code" = 'ARSO_SUPPORT';
UPDATE "RoleDefinition" SET "permissionsJson" = '["standards:read","standards:preview_full","recs:read","tariffs:read","cb:read","manufacturer:read","products:read","audit:read","roles:read","users:read"]' WHERE "code" = 'ARSO_AUDITOR';
UPDATE "RoleDefinition" SET "permissionsJson" = '["standards:read","recs:read","tariffs:read","cb:read","products:read","certify:operate","portal:operate"]' WHERE "code" = 'CB_OFFICER';
UPDATE "RoleDefinition" SET "permissionsJson" = '["standards:read","recs:read","tariffs:read","products:read","customs:decide"]' WHERE "code" = 'CUSTOMS_OFFICER';
