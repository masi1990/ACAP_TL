-- A cart can buy several standards in the same language, so the download
-- row is unique per order, standard, and language.

DROP INDEX IF EXISTS "StandardEntitlement_orderId_editionLocale_key";

CREATE UNIQUE INDEX "StandardEntitlement_orderId_catalogItemId_editionLocale_key"
  ON "StandardEntitlement"("orderId", "catalogItemId", "editionLocale");
