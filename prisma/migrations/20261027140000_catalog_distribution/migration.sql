-- How a listed standard is offered: priced, free to read on screen, or free to download.

ALTER TABLE "CatalogItem" ADD COLUMN "distribution" TEXT NOT NULL DEFAULT 'PAID';
