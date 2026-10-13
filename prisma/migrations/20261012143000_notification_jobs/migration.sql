-- Generalize reminder rows so any workflow can queue mail.
ALTER TABLE "NotificationJob" ALTER COLUMN "cocId" DROP NOT NULL;
ALTER TABLE "NotificationJob" ALTER COLUMN "monthsOut" DROP NOT NULL;

ALTER TABLE "NotificationJob" ADD COLUMN "entityType" TEXT;
ALTER TABLE "NotificationJob" ADD COLUMN "entityId" TEXT;
ALTER TABLE "NotificationJob" ADD COLUMN "payloadJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "NotificationJob" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NotificationJob" ADD COLUMN "lastError" TEXT;
ALTER TABLE "NotificationJob" ADD COLUMN "dedupeKey" TEXT;

UPDATE "NotificationJob"
SET "dedupeKey" = "kind" || ':' || "cocId" || ':' || "monthsOut"::text
WHERE "dedupeKey" IS NULL;

ALTER TABLE "NotificationJob" ALTER COLUMN "dedupeKey" SET NOT NULL;

CREATE UNIQUE INDEX "NotificationJob_dedupeKey_key" ON "NotificationJob"("dedupeKey");
CREATE INDEX "NotificationJob_status_scheduledFor_idx" ON "NotificationJob"("status", "scheduledFor");
