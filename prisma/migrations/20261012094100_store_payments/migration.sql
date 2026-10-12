-- Store the buyer phone and the Pesapal confirmation on the order.
ALTER TABLE "Order" ADD COLUMN "buyerPhone" TEXT;

ALTER TABLE "PaymentAttempt" ADD COLUMN "confirmationCode" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN "statusDetail" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN "rawJson" TEXT;

CREATE INDEX "PaymentAttempt_providerRef_idx" ON "PaymentAttempt"("providerRef");

CREATE TABLE "PesapalNotification" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "notificationUrl" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PesapalNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PesapalNotification_environment_notificationUrl_key" ON "PesapalNotification"("environment", "notificationUrl");
