CREATE TABLE "imported_certified_marks" (
    "id" TEXT NOT NULL,
    "liveProductId" TEXT NOT NULL,
    "livePinId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "pinText" TEXT NOT NULL,
    "shortId" TEXT,
    "qrUrl" TEXT NOT NULL,
    "markType" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "cbName" TEXT NOT NULL DEFAULT '',
    "markStatus" TEXT NOT NULL,
    "sourceStandardText" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "standardVersionId" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_certified_marks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "imported_certified_marks_livePinId_key" ON "imported_certified_marks"("livePinId");
CREATE UNIQUE INDEX "imported_certified_marks_pinText_key" ON "imported_certified_marks"("pinText");
CREATE UNIQUE INDEX "imported_certified_marks_shortId_key" ON "imported_certified_marks"("shortId");
CREATE INDEX "imported_certified_marks_liveProductId_idx" ON "imported_certified_marks"("liveProductId");
CREATE INDEX "imported_certified_marks_cbName_idx" ON "imported_certified_marks"("cbName");
CREATE INDEX "imported_certified_marks_standardVersionId_idx" ON "imported_certified_marks"("standardVersionId");

ALTER TABLE "imported_certified_marks" ADD CONSTRAINT "imported_certified_marks_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "product_portal_decisions" (
    "id" TEXT NOT NULL,
    "pinText" TEXT NOT NULL,
    "liveProductId" TEXT NOT NULL,
    "cbName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_portal_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_portal_decisions_pinText_decidedAt_idx" ON "product_portal_decisions"("pinText", "decidedAt");

ALTER TABLE "product_portal_decisions" ADD CONSTRAINT "product_portal_decisions_pinText_fkey" FOREIGN KEY ("pinText") REFERENCES "imported_certified_marks"("pinText") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "portal_relist_requests" (
    "id" TEXT NOT NULL,
    "pinText" TEXT NOT NULL,
    "cbName" TEXT NOT NULL DEFAULT '',
    "requesterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "arsoNote" TEXT NOT NULL DEFAULT '',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_relist_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "portal_relist_requests_pinText_status_idx" ON "portal_relist_requests"("pinText", "status");

ALTER TABLE "portal_relist_requests" ADD CONSTRAINT "portal_relist_requests_pinText_fkey" FOREIGN KEY ("pinText") REFERENCES "imported_certified_marks"("pinText") ON DELETE CASCADE ON UPDATE CASCADE;
