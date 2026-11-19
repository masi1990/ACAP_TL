-- The original unique constraint was created as a unique index.
DROP INDEX IF EXISTS "LibraryStandardRequestItem_requestId_standardId_key";
ALTER TABLE "LibraryStandardRequestItem" DROP CONSTRAINT IF EXISTS "LibraryStandardRequestItem_requestId_standardId_key";
ALTER TABLE "LibraryStandardRequestItem" ALTER COLUMN "standardId" DROP NOT NULL;
ALTER TABLE "LibraryStandardRequestItem" ADD COLUMN IF NOT EXISTS "designationText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibraryStandardRequestItem" ADD COLUMN IF NOT EXISTS "titleText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibraryStandardRequestItem" ADD COLUMN IF NOT EXISTS "missingText" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "LibraryStandardRequestItem_requestId_idx" ON "LibraryStandardRequestItem"("requestId");
CREATE INDEX IF NOT EXISTS "LibraryStandardRequestItem_standardId_idx" ON "LibraryStandardRequestItem"("standardId");

-- One catalogue standard per request; free-text "Other" rows (standardId NULL) are unrestricted.
CREATE UNIQUE INDEX IF NOT EXISTS "LibraryStandardRequestItem_requestId_standardId_uidx"
  ON "LibraryStandardRequestItem"("requestId", "standardId")
  WHERE "standardId" IS NOT NULL;
