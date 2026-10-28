-- CreateTable
CREATE TABLE "InstitutionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstitutionRequest_userId_status_idx" ON "InstitutionRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "InstitutionRequest" ADD CONSTRAINT "InstitutionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionRequest" ADD CONSTRAINT "InstitutionRequest_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
