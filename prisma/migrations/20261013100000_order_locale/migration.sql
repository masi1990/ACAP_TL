-- Store the buyer's locale so the download email matches the store they used.
ALTER TABLE "Order" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
