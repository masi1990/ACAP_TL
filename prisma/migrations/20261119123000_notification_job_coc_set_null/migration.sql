-- Align NotificationJob.cocId FK with Prisma schema (optional relation → ON DELETE SET NULL).
ALTER TABLE "NotificationJob" DROP CONSTRAINT "NotificationJob_cocId_fkey";

ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES "CoC"("id") ON DELETE SET NULL ON UPDATE CASCADE;
