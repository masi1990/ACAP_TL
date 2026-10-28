-- Institution backing, operating countries, library access, releases, duty stations, and activity.

ALTER TABLE "Organization" ADD COLUMN "backing" TEXT NOT NULL DEFAULT 'GOVERNMENT';
ALTER TABLE "Organization" ADD COLUMN "alsoCertifies" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "OrganizationCountry" (
    "organizationId" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    CONSTRAINT "OrganizationCountry_pkey" PRIMARY KEY ("organizationId","memberStateId")
);

CREATE INDEX "OrganizationCountry_memberStateId_idx" ON "OrganizationCountry"("memberStateId");

ALTER TABLE "OrganizationCountry"
  ADD CONSTRAINT "OrganizationCountry_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationCountry"
  ADD CONSTRAINT "OrganizationCountry_memberStateId_fkey"
  FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CompanyCountry" (
    "companyId" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    CONSTRAINT "CompanyCountry_pkey" PRIMARY KEY ("companyId","memberStateId")
);

CREATE INDEX "CompanyCountry_memberStateId_idx" ON "CompanyCountry"("memberStateId");

ALTER TABLE "CompanyCountry"
  ADD CONSTRAINT "CompanyCountry_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyCountry"
  ADD CONSTRAINT "CompanyCountry_memberStateId_fkey"
  FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LibraryAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LibraryAccess_userId_organizationId_memberStateId_key" ON "LibraryAccess"("userId", "organizationId", "memberStateId");
CREATE INDEX "LibraryAccess_userId_idx" ON "LibraryAccess"("userId");
CREATE INDEX "LibraryAccess_organizationId_idx" ON "LibraryAccess"("organizationId");

ALTER TABLE "LibraryAccess"
  ADD CONSTRAINT "LibraryAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryAccess"
  ADD CONSTRAINT "LibraryAccess_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryAccess"
  ADD CONSTRAINT "LibraryAccess_memberStateId_fkey"
  FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LibraryAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryAccessRequest_userId_status_idx" ON "LibraryAccessRequest"("userId", "status");
CREATE INDEX "LibraryAccessRequest_status_idx" ON "LibraryAccessRequest"("status");

ALTER TABLE "LibraryAccessRequest"
  ADD CONSTRAINT "LibraryAccessRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryAccessRequest"
  ADD CONSTRAINT "LibraryAccessRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryAccessRequest"
  ADD CONSTRAINT "LibraryAccessRequest_memberStateId_fkey"
  FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LibraryStandardRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryStandardRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryStandardRequest_status_idx" ON "LibraryStandardRequest"("status");
CREATE INDEX "LibraryStandardRequest_email_idx" ON "LibraryStandardRequest"("email");

ALTER TABLE "LibraryStandardRequest"
  ADD CONSTRAINT "LibraryStandardRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryStandardRequest"
  ADD CONSTRAINT "LibraryStandardRequest_memberStateId_fkey"
  FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LibraryStandardRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    CONSTRAINT "LibraryStandardRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LibraryStandardRequestItem_requestId_standardId_key" ON "LibraryStandardRequestItem"("requestId", "standardId");

ALTER TABLE "LibraryStandardRequestItem"
  ADD CONSTRAINT "LibraryStandardRequestItem_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "LibraryStandardRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryStandardRequestItem"
  ADD CONSTRAINT "LibraryStandardRequestItem_standardId_fkey"
  FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LibraryRelease" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    "userId" TEXT,
    "requestId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryRelease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LibraryRelease_token_key" ON "LibraryRelease"("token");
CREATE INDEX "LibraryRelease_email_idx" ON "LibraryRelease"("email");
CREATE INDEX "LibraryRelease_userId_idx" ON "LibraryRelease"("userId");

ALTER TABLE "LibraryRelease"
  ADD CONSTRAINT "LibraryRelease_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryRelease"
  ADD CONSTRAINT "LibraryRelease_memberStateId_fkey"
  FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryRelease"
  ADD CONSTRAINT "LibraryRelease_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryRelease"
  ADD CONSTRAINT "LibraryRelease_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "LibraryStandardRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LibraryReleaseItem" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    CONSTRAINT "LibraryReleaseItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LibraryReleaseItem_releaseId_standardId_key" ON "LibraryReleaseItem"("releaseId", "standardId");

ALTER TABLE "LibraryReleaseItem"
  ADD CONSTRAINT "LibraryReleaseItem_releaseId_fkey"
  FOREIGN KEY ("releaseId") REFERENCES "LibraryRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryReleaseItem"
  ADD CONSTRAINT "LibraryReleaseItem_standardId_fkey"
  FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StaffPosting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "officeName" TEXT NOT NULL DEFAULT '',
    "entryPointId" TEXT,
    "countryIso2" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffPosting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffPosting_userId_organizationId_idx" ON "StaffPosting"("userId", "organizationId");
CREATE INDEX "StaffPosting_entryPointId_idx" ON "StaffPosting"("entryPointId");

ALTER TABLE "StaffPosting"
  ADD CONSTRAINT "StaffPosting_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffPosting"
  ADD CONSTRAINT "StaffPosting_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffPosting"
  ADD CONSTRAINT "StaffPosting_entryPointId_fkey"
  FOREIGN KEY ("entryPointId") REFERENCES "EntryPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LibraryActivity" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "roleCode" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT,
    "memberStateId" TEXT,
    "postingId" TEXT,
    "action" TEXT NOT NULL,
    "standardId" TEXT,
    "language" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "LibraryActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryActivity_userId_occurredAt_idx" ON "LibraryActivity"("userId", "occurredAt");
CREATE INDEX "LibraryActivity_action_idx" ON "LibraryActivity"("action");
CREATE INDEX "LibraryActivity_organizationId_idx" ON "LibraryActivity"("organizationId");

ALTER TABLE "LibraryActivity"
  ADD CONSTRAINT "LibraryActivity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryActivity"
  ADD CONSTRAINT "LibraryActivity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryActivity"
  ADD CONSTRAINT "LibraryActivity_postingId_fkey"
  FOREIGN KEY ("postingId") REFERENCES "StaffPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryActivity"
  ADD CONSTRAINT "LibraryActivity_standardId_fkey"
  FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
