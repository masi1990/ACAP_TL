-- Certification body profile used by the admin form.
ALTER TABLE "Organization" ADD COLUMN "accreditationBody" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "accreditationRef" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "contactEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "addressLine" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "website" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- African Union member states. Reference data so organisation dropdowns are never empty.
INSERT INTO "MemberState" ("id", "iso2", "name") VALUES
  ('ms-dz', 'DZ', 'Algeria'),
  ('ms-ao', 'AO', 'Angola'),
  ('ms-bj', 'BJ', 'Benin'),
  ('ms-bw', 'BW', 'Botswana'),
  ('ms-bf', 'BF', 'Burkina Faso'),
  ('ms-bi', 'BI', 'Burundi'),
  ('ms-cv', 'CV', 'Cabo Verde'),
  ('ms-cm', 'CM', 'Cameroon'),
  ('ms-cf', 'CF', 'Central African Republic'),
  ('ms-td', 'TD', 'Chad'),
  ('ms-km', 'KM', 'Comoros'),
  ('ms-cg', 'CG', 'Congo'),
  ('ms-ci', 'CI', 'Côte d''Ivoire'),
  ('ms-cd', 'CD', 'Democratic Republic of the Congo'),
  ('ms-dj', 'DJ', 'Djibouti'),
  ('ms-eg', 'EG', 'Egypt'),
  ('ms-gq', 'GQ', 'Equatorial Guinea'),
  ('ms-er', 'ER', 'Eritrea'),
  ('ms-sz', 'SZ', 'Eswatini'),
  ('ms-et', 'ET', 'Ethiopia'),
  ('ms-ga', 'GA', 'Gabon'),
  ('ms-gm', 'GM', 'Gambia'),
  ('ms-gh', 'GH', 'Ghana'),
  ('ms-gn', 'GN', 'Guinea'),
  ('ms-gw', 'GW', 'Guinea-Bissau'),
  ('ms-ke', 'KE', 'Kenya'),
  ('ms-ls', 'LS', 'Lesotho'),
  ('ms-lr', 'LR', 'Liberia'),
  ('ms-ly', 'LY', 'Libya'),
  ('ms-mg', 'MG', 'Madagascar'),
  ('ms-mw', 'MW', 'Malawi'),
  ('ms-ml', 'ML', 'Mali'),
  ('ms-mr', 'MR', 'Mauritania'),
  ('ms-mu', 'MU', 'Mauritius'),
  ('ms-ma', 'MA', 'Morocco'),
  ('ms-mz', 'MZ', 'Mozambique'),
  ('ms-na', 'NA', 'Namibia'),
  ('ms-ne', 'NE', 'Niger'),
  ('ms-ng', 'NG', 'Nigeria'),
  ('ms-rw', 'RW', 'Rwanda'),
  ('ms-st', 'ST', 'Sao Tome and Principe'),
  ('ms-sn', 'SN', 'Senegal'),
  ('ms-sc', 'SC', 'Seychelles'),
  ('ms-sl', 'SL', 'Sierra Leone'),
  ('ms-so', 'SO', 'Somalia'),
  ('ms-za', 'ZA', 'South Africa'),
  ('ms-ss', 'SS', 'South Sudan'),
  ('ms-sd', 'SD', 'Sudan'),
  ('ms-tz', 'TZ', 'Tanzania'),
  ('ms-tg', 'TG', 'Togo'),
  ('ms-tn', 'TN', 'Tunisia'),
  ('ms-ug', 'UG', 'Uganda'),
  ('ms-zm', 'ZM', 'Zambia'),
  ('ms-zw', 'ZW', 'Zimbabwe')
ON CONFLICT ("iso2") DO NOTHING;
