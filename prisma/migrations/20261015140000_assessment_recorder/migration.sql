-- AlterTable
ALTER TABLE "CertificationApplication" ADD COLUMN "recordedById" TEXT;

-- AlterTable
ALTER TABLE "AssessmentItem" ADD COLUMN "recordedById" TEXT;

-- AddForeignKey
ALTER TABLE "CertificationApplication" ADD CONSTRAINT "CertificationApplication_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentItem" ADD CONSTRAINT "AssessmentItem_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
