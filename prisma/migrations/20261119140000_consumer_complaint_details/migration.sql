-- AlterTable
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "registryKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "originCountryIso2" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "manufactureCountryIso2" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "purchasePlace" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "quantity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "flavour" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "manufacturedOn" TIMESTAMP(3);
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "expiresOn" TIMESTAMP(3);
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "labelPhotoUri" TEXT;
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "markPhotoUri" TEXT;
ALTER TABLE "ConsumerComplaint" ADD COLUMN IF NOT EXISTS "receiptPhotoUri" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsumerComplaint_routedCbId_idx" ON "ConsumerComplaint"("routedCbId");
CREATE INDEX IF NOT EXISTS "ConsumerComplaint_productId_idx" ON "ConsumerComplaint"("productId");
CREATE INDEX IF NOT EXISTS "ConsumerComplaint_createdAt_idx" ON "ConsumerComplaint"("createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConsumerComplaint_productId_fkey'
  ) THEN
    ALTER TABLE "ConsumerComplaint"
      ADD CONSTRAINT "ConsumerComplaint_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
