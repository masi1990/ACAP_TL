-- A product keeps one Quality track and, when selected, one Eco track.
-- Each track has its own standard. Existing rows keep the mark already on the application.

ALTER TABLE "ProductStandardLink" ADD COLUMN "markScheme" TEXT;

UPDATE "ProductStandardLink" AS link
SET "markScheme" = COALESCE(
  (
    SELECT app."markScheme"
    FROM "CertificationApplication" AS app
    WHERE app."productId" = link."productId"
      AND app."markScheme" IN ('QUALITY', 'ECO')
    ORDER BY CASE WHEN app."markScheme" = 'QUALITY' THEN 0 ELSE 1 END, app."createdAt" ASC
    LIMIT 1
  ),
  'QUALITY'
);

ALTER TABLE "ProductStandardLink" ALTER COLUMN "markScheme" SET NOT NULL;

DROP INDEX "ProductStandardLink_productId_key";

CREATE UNIQUE INDEX "ProductStandardLink_productId_markScheme_key"
  ON "ProductStandardLink"("productId", "markScheme");

DROP INDEX "CertificationApplication_productId_standardVersionId_key";

CREATE UNIQUE INDEX "CertificationApplication_productId_markScheme_key"
  ON "CertificationApplication"("productId", "markScheme");
