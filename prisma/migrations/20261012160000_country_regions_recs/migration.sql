ALTER TABLE "MemberState" ADD COLUMN "region" TEXT NOT NULL DEFAULT '';

UPDATE "MemberState" SET "region" = 'NORTH' WHERE "iso2" IN ('DZ', 'EG', 'LY', 'MA', 'SD', 'TN');
UPDATE "MemberState" SET "region" = 'WEST' WHERE "iso2" IN ('BJ', 'BF', 'CV', 'CI', 'GM', 'GH', 'GN', 'GW', 'LR', 'ML', 'MR', 'NE', 'NG', 'SN', 'SL', 'TG');
UPDATE "MemberState" SET "region" = 'CENTRAL' WHERE "iso2" IN ('CM', 'CF', 'TD', 'CG', 'CD', 'GQ', 'GA', 'ST');
UPDATE "MemberState" SET "region" = 'EAST' WHERE "iso2" IN ('BI', 'KM', 'DJ', 'ER', 'ET', 'KE', 'MG', 'MW', 'MU', 'RW', 'SC', 'SO', 'SS', 'TZ', 'UG');
UPDATE "MemberState" SET "region" = 'SOUTHERN' WHERE "iso2" IN ('AO', 'BW', 'SZ', 'LS', 'MZ', 'NA', 'ZA', 'ZM', 'ZW');

CREATE TABLE "MemberStateRec" (
    "memberStateId" TEXT NOT NULL,
    "recId" TEXT NOT NULL,

    CONSTRAINT "MemberStateRec_pkey" PRIMARY KEY ("memberStateId","recId")
);

ALTER TABLE "MemberStateRec" ADD CONSTRAINT "MemberStateRec_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberStateRec" ADD CONSTRAINT "MemberStateRec_recId_fkey" FOREIGN KEY ("recId") REFERENCES "Rec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
