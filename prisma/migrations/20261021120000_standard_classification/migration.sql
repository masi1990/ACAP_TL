-- Standard kind, sector, technical committee, African adoption, and language PDFs.

CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sector_code_key" ON "Sector"("code");

CREATE TABLE "TechnicalCommittee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalCommittee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TechnicalCommittee_code_key" ON "TechnicalCommittee"("code");
CREATE INDEX "TechnicalCommittee_sectorId_idx" ON "TechnicalCommittee"("sectorId");

ALTER TABLE "TechnicalCommittee"
  ADD CONSTRAINT "TechnicalCommittee_sectorId_fkey"
  FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Standard" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "Standard" ADD COLUMN "technicalCommitteeId" TEXT;

CREATE INDEX "Standard_kind_idx" ON "Standard"("kind");
CREATE INDEX "Standard_technicalCommitteeId_idx" ON "Standard"("technicalCommitteeId");

ALTER TABLE "Standard"
  ADD CONSTRAINT "Standard_technicalCommitteeId_fkey"
  FOREIGN KEY ("technicalCommitteeId") REFERENCES "TechnicalCommittee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StandardAdoption" (
    "standardId" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,

    CONSTRAINT "StandardAdoption_pkey" PRIMARY KEY ("standardId","memberStateId")
);

CREATE INDEX "StandardAdoption_memberStateId_idx" ON "StandardAdoption"("memberStateId");

ALTER TABLE "StandardAdoption"
  ADD CONSTRAINT "StandardAdoption_standardId_fkey"
  FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StandardAdoption"
  ADD CONSTRAINT "StandardAdoption_memberStateId_fkey"
  FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StandardLanguageFile" (
    "id" TEXT NOT NULL,
    "standardVersionId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "sourcePdfUri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandardLanguageFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StandardLanguageFile_standardVersionId_locale_key"
  ON "StandardLanguageFile"("standardVersionId", "locale");
CREATE INDEX "StandardLanguageFile_standardVersionId_idx"
  ON "StandardLanguageFile"("standardVersionId");

ALTER TABLE "StandardLanguageFile"
  ADD CONSTRAINT "StandardLanguageFile_standardVersionId_fkey"
  FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StandardLanguageFile" ("id", "standardVersionId", "locale", "sourcePdfUri", "createdAt")
SELECT
  'slf-' || "id",
  "id",
  "authoritativeLocale",
  "sourcePdfUri",
  CURRENT_TIMESTAMP
FROM "StandardVersion"
WHERE "sourcePdfUri" IS NOT NULL AND "sourcePdfUri" <> '';

ALTER TABLE "OrderLine" ADD COLUMN "editionLocale" TEXT NOT NULL DEFAULT 'en';
