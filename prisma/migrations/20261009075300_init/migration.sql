-- CreateTable
CREATE TABLE "MemberState" (
    "id" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MemberState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rec" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Rec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "memberStateId" TEXT,
    "primaryAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "rolesGlobal" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL,
    "permissionsJson" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "organizationId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "impersonatorId" TEXT,
    "impersonationReason" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    "organizationId" TEXT,
    "locationNote" TEXT,

    CONSTRAINT "EntryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standard" (
    "id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT,
    "titlePt" TEXT,
    "titleAr" TEXT,
    "ics" TEXT NOT NULL,
    "publisher" TEXT NOT NULL DEFAULT 'ARSO',

    CONSTRAINT "Standard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardVersion" (
    "id" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "editionLabel" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "publicationStatus" TEXT NOT NULL,
    "authoritativeLocale" TEXT NOT NULL DEFAULT 'en',
    "sourcePdfUri" TEXT,
    "contentHash" TEXT NOT NULL,
    "scopeEn" TEXT NOT NULL,
    "machineDocJson" TEXT NOT NULL,
    "requirementsJson" TEXT NOT NULL,
    "normativeRefsJson" TEXT NOT NULL,
    "packagingJson" TEXT,
    "labellingJson" TEXT,
    "samplingJson" TEXT,

    CONSTRAINT "StandardVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffLine" (
    "id" TEXT NOT NULL,
    "recId" TEXT NOT NULL,
    "codeDisplay" TEXT NOT NULL,
    "codeNormalized" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL,
    "parentTariffLineId" TEXT,
    "hsHeading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "TariffLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardTariffMap" (
    "id" TEXT NOT NULL,
    "standardVersionId" TEXT NOT NULL,
    "tariffLineId" TEXT NOT NULL,
    "mappingEffect" TEXT NOT NULL DEFAULT 'include',
    "overrideMode" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "StandardTariffMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NationalRule" (
    "id" TEXT NOT NULL,
    "memberStateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NationalRuleLink" (
    "id" TEXT NOT NULL,
    "nationalRuleId" TEXT NOT NULL,
    "standardVersionId" TEXT NOT NULL,

    CONSTRAINT "NationalRuleLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbLicense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "markScheme" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approvalMode" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "graceUntil" TIMESTAMP(3),
    "parentLicenseId" TEXT,
    "pdfUri" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CbLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkSublicense" (
    "id" TEXT NOT NULL,
    "cbLicenseId" TEXT NOT NULL,
    "issuerOrgId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "markScheme" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approvalMode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "pdfUri" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarkSublicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,

    CONSTRAINT "ClientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "countryIso2" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "tariffLineId" TEXT,
    "originClaimJson" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStandardLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "standardVersionId" TEXT NOT NULL,

    CONSTRAINT "ProductStandardLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "grade" TEXT,
    "label" TEXT NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPin" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cocId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ProductPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationApplication" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "standardVersionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markScheme" TEXT NOT NULL,
    "qualityApprovedAt" TIMESTAMP(3),
    "ecoApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT,

    CONSTRAINT "CertificationApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "measuredValue" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "pass" BOOLEAN NOT NULL,
    "labName" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "storageUri" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoC" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "markScheme" TEXT NOT NULL,

    CONSTRAINT "CoC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkGrant" (
    "id" TEXT NOT NULL,
    "cocId" TEXT NOT NULL,
    "markScheme" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAnchor" (
    "id" TEXT NOT NULL,
    "cocId" TEXT,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "chainId" TEXT NOT NULL DEFAULT 'stub-acap-ledger',
    "blockRef" TEXT,
    "anchoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityRef" TEXT,

    CONSTRAINT "LedgerAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeEvent" (
    "id" TEXT NOT NULL,
    "cocId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" TEXT NOT NULL,
    "cocId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "monthsOut" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "impersonatorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "organizationId" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "reason" TEXT,
    "ipHint" TEXT,
    "prevHash" TEXT,
    "eventHash" TEXT NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "standardVersionId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "coverTitle" TEXT NOT NULL,
    "previewScopeOnly" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardEntitlement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artifactUri" TEXT,
    "watermarkText" TEXT,

    CONSTRAINT "StandardEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookOutbox" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "targetHint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebhookOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineCacheProfile" (
    "id" TEXT NOT NULL,
    "entryPointCode" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "statusJson" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineCacheProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveillanceCase" (
    "id" TEXT NOT NULL,
    "pinId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveillanceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sanction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "cascadesTo" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "Sanction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerComplaint" (
    "id" TEXT NOT NULL,
    "pinId" TEXT,
    "complainantEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "routedCbId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudAlert" (
    "id" TEXT NOT NULL,
    "pinId" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "labelsJson" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioTransfer" (
    "id" TEXT NOT NULL,
    "fromClientId" TEXT NOT NULL,
    "toClientId" TEXT NOT NULL,
    "productIdsJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STUB_PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberState_iso2_key" ON "MemberState"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "Rec_code_key" ON "Rec"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_code_key" ON "RoleDefinition"("code");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_idx" ON "UserRoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_roleCode_idx" ON "UserRoleAssignment"("roleCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_roleCode_organizationId_key" ON "UserRoleAssignment"("userId", "roleCode", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EntryPoint_code_key" ON "EntryPoint"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Standard_designation_key" ON "Standard"("designation");

-- CreateIndex
CREATE UNIQUE INDEX "TariffLine_recId_codeNormalized_effectiveFrom_key" ON "TariffLine"("recId", "codeNormalized", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "StandardTariffMap_standardVersionId_tariffLineId_key" ON "StandardTariffMap"("standardVersionId", "tariffLineId");

-- CreateIndex
CREATE UNIQUE INDEX "CbLicense_licenseNumber_key" ON "CbLicense"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MarkSublicense_licenseNumber_key" ON "MarkSublicense"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPin_variantId_key" ON "ProductPin"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPin_pinCode_key" ON "ProductPin"("pinCode");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationApplication_idempotencyKey_key" ON "CertificationApplication"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CoC_applicationId_key" ON "CoC"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CoC_certificateNo_key" ON "CoC"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_standardVersionId_key" ON "CatalogItem"("standardVersionId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "RoleDefinition"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryPoint" ADD CONSTRAINT "EntryPoint_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryPoint" ADD CONSTRAINT "EntryPoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardVersion" ADD CONSTRAINT "StandardVersion_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffLine" ADD CONSTRAINT "TariffLine_recId_fkey" FOREIGN KEY ("recId") REFERENCES "Rec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffLine" ADD CONSTRAINT "TariffLine_parentTariffLineId_fkey" FOREIGN KEY ("parentTariffLineId") REFERENCES "TariffLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardTariffMap" ADD CONSTRAINT "StandardTariffMap_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardTariffMap" ADD CONSTRAINT "StandardTariffMap_tariffLineId_fkey" FOREIGN KEY ("tariffLineId") REFERENCES "TariffLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalRule" ADD CONSTRAINT "NationalRule_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES "MemberState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalRuleLink" ADD CONSTRAINT "NationalRuleLink_nationalRuleId_fkey" FOREIGN KEY ("nationalRuleId") REFERENCES "NationalRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalRuleLink" ADD CONSTRAINT "NationalRuleLink_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbLicense" ADD CONSTRAINT "CbLicense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbLicense" ADD CONSTRAINT "CbLicense_parentLicenseId_fkey" FOREIGN KEY ("parentLicenseId") REFERENCES "CbLicense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkSublicense" ADD CONSTRAINT "MarkSublicense_cbLicenseId_fkey" FOREIGN KEY ("cbLicenseId") REFERENCES "CbLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkSublicense" ADD CONSTRAINT "MarkSublicense_issuerOrgId_fkey" FOREIGN KEY ("issuerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccount" ADD CONSTRAINT "ClientAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tariffLineId_fkey" FOREIGN KEY ("tariffLineId") REFERENCES "TariffLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStandardLink" ADD CONSTRAINT "ProductStandardLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStandardLink" ADD CONSTRAINT "ProductStandardLink_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPin" ADD CONSTRAINT "ProductPin_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPin" ADD CONSTRAINT "ProductPin_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES "CoC"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationApplication" ADD CONSTRAINT "CertificationApplication_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationApplication" ADD CONSTRAINT "CertificationApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationApplication" ADD CONSTRAINT "CertificationApplication_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CertificationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CertificationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoC" ADD CONSTRAINT "CoC_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CertificationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkGrant" ADD CONSTRAINT "MarkGrant_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES "CoC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAnchor" ADD CONSTRAINT "LedgerAnchor_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES "CoC"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEvent" ADD CONSTRAINT "FeeEvent_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES "CoC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES "CoC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES "StandardVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardEntitlement" ADD CONSTRAINT "StandardEntitlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveillanceCase" ADD CONSTRAINT "SurveillanceCase_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "ProductPin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SurveillanceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerComplaint" ADD CONSTRAINT "ConsumerComplaint_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "ProductPin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerComplaint" ADD CONSTRAINT "ConsumerComplaint_routedCbId_fkey" FOREIGN KEY ("routedCbId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "ProductPin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

