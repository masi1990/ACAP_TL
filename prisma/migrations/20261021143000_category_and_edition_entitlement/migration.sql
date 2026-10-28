-- Collapse eight standard kinds into four categories, and allow one download per language.

UPDATE "Standard" SET "kind" = 'TESTING' WHERE "kind" IN ('TEST', 'ANALYSIS', 'SAMPLING');
UPDATE "Standard" SET "kind" = 'REFERENCE' WHERE "kind" IN ('CODE', 'GLOSSARY', 'UNIT');

ALTER TABLE "StandardEntitlement" ADD COLUMN "editionLocale" TEXT NOT NULL DEFAULT 'en';

UPDATE "StandardEntitlement" AS e
SET "editionLocale" = l."editionLocale"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "editionLocale"
  FROM "OrderLine"
  ORDER BY "orderId", "id"
) AS l
WHERE l."orderId" = e."orderId";

CREATE UNIQUE INDEX "StandardEntitlement_orderId_editionLocale_key"
  ON "StandardEntitlement"("orderId", "editionLocale");
