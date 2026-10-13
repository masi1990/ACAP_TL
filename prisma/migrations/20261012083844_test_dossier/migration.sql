-- CreateTable
CREATE TABLE "TestDossier" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "laboratoryName" TEXT NOT NULL DEFAULT '',
    "accreditationRef" TEXT NOT NULL DEFAULT '',
    "reportNo" TEXT NOT NULL DEFAULT '',
    "sampleCode" TEXT NOT NULL DEFAULT '',
    "batchOrLot" TEXT NOT NULL DEFAULT '',
    "sampleDescription" TEXT NOT NULL DEFAULT '',
    "sampledAt" TIMESTAMP(3),
    "testedAt" TIMESTAMP(3),

    CONSTRAINT "TestDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierAttachment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "annexCode" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "storageUri" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DossierAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestDossier_applicationId_key" ON "TestDossier"("applicationId");

-- CreateIndex
CREATE INDEX "DossierAttachment_applicationId_idx" ON "DossierAttachment"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "DossierAttachment_applicationId_annexCode_key" ON "DossierAttachment"("applicationId", "annexCode");

-- AddForeignKey
ALTER TABLE "TestDossier" ADD CONSTRAINT "TestDossier_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CertificationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierAttachment" ADD CONSTRAINT "DossierAttachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CertificationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
