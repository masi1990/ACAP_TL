--
-- PostgreSQL database dump
--

\restrict qIZ7gMxFggqfoi21y0aHfeRbFuHrVKWLf2k3o3NlQe0GKYJgfhS1APitPGT9pdj

-- Dumped from database version 18.6 (Postgres.app)
-- Dumped by pg_dump version 18.6 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AssessmentItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AssessmentItem" (
    id text NOT NULL,
    "applicationId" text NOT NULL,
    source text NOT NULL,
    kind text DEFAULT 'clause'::text NOT NULL,
    "itemKey" text NOT NULL,
    section text DEFAULT ''::text NOT NULL,
    clause text DEFAULT ''::text NOT NULL,
    heading text DEFAULT ''::text NOT NULL,
    text text NOT NULL,
    "testMethod" text DEFAULT ''::text NOT NULL,
    "countryIso2" text,
    pass boolean,
    "measuredValue" text DEFAULT ''::text NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: Attachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Attachment" (
    id text NOT NULL,
    "applicationId" text NOT NULL,
    filename text NOT NULL,
    "contentType" text NOT NULL,
    "storageUri" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditEvent" (
    id text NOT NULL,
    "occurredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actorUserId" text,
    "impersonatorId" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "organizationId" text,
    "beforeJson" text,
    "afterJson" text,
    reason text,
    "ipHint" text,
    "prevHash" text,
    "eventHash" text NOT NULL
);


--
-- Name: CatalogItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CatalogItem" (
    id text NOT NULL,
    "standardVersionId" text NOT NULL,
    "priceCents" integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "coverTitle" text NOT NULL,
    "previewScopeOnly" boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: CbLicense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CbLicense" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "licenseType" text NOT NULL,
    "markScheme" text NOT NULL,
    status text NOT NULL,
    "approvalMode" text,
    "issuedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "graceUntil" timestamp(3) without time zone,
    "parentLicenseId" text,
    "pdfUri" text,
    "licenseNumber" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CertificationApplication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CertificationApplication" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "organizationId" text NOT NULL,
    "standardVersionId" text NOT NULL,
    status text NOT NULL,
    "markScheme" text NOT NULL,
    "qualityApprovedAt" timestamp(3) without time zone,
    "ecoApprovedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "idempotencyKey" text
);


--
-- Name: ClientAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClientAccount" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "displayName" text NOT NULL
);


--
-- Name: CoC; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CoC" (
    id text NOT NULL,
    "applicationId" text NOT NULL,
    "certificateNo" text NOT NULL,
    status text NOT NULL,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "markScheme" text NOT NULL
);


--
-- Name: Company; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    "clientAccountId" text NOT NULL,
    "legalName" text NOT NULL,
    "countryIso2" text NOT NULL
);


--
-- Name: ConformityInspection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConformityInspection" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "standardVersionId" text NOT NULL,
    "organizationId" text,
    "inspectorUserId" text,
    result text NOT NULL,
    findings text DEFAULT ''::text NOT NULL,
    "inspectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ConsumerComplaint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConsumerComplaint" (
    id text NOT NULL,
    "pinId" text,
    "complainantEmail" text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "routedCbId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CustomsClearance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomsClearance" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "cocId" text,
    "organizationId" text,
    "officerUserId" text,
    "originIso2" text NOT NULL,
    "destinationIso2" text NOT NULL,
    decision text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    "decidedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EntryPoint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EntryPoint" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    kind text NOT NULL,
    "memberStateId" text NOT NULL,
    "organizationId" text,
    "locationNote" text
);


--
-- Name: FeeEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeeEvent" (
    id text NOT NULL,
    "cocId" text NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    kind text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FraudAlert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FraudAlert" (
    id text NOT NULL,
    "pinId" text,
    kind text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Invitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invitation" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    token text NOT NULL,
    "invitedById" text NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LabEvidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabEvidence" (
    id text NOT NULL,
    "assessmentItemId" text NOT NULL,
    filename text NOT NULL,
    "contentType" text NOT NULL,
    "storageUri" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LabResult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabResult" (
    id text NOT NULL,
    "applicationId" text NOT NULL,
    "requirementId" text NOT NULL,
    "measuredValue" text NOT NULL,
    unit text NOT NULL,
    pass boolean NOT NULL,
    "labName" text NOT NULL,
    "testedAt" timestamp(3) without time zone NOT NULL,
    notes text
);


--
-- Name: LedgerAnchor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LedgerAnchor" (
    id text NOT NULL,
    "cocId" text,
    "eventType" text NOT NULL,
    "payloadHash" text NOT NULL,
    "chainId" text DEFAULT 'stub-acap-ledger'::text NOT NULL,
    "blockRef" text,
    "anchoredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "entityRef" text
);


--
-- Name: MarkGrant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MarkGrant" (
    id text NOT NULL,
    "cocId" text NOT NULL,
    "markScheme" text NOT NULL,
    status text NOT NULL,
    "grantedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MarkSublicense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MarkSublicense" (
    id text NOT NULL,
    "cbLicenseId" text NOT NULL,
    "issuerOrgId" text NOT NULL,
    "clientName" text NOT NULL,
    "markScheme" text NOT NULL,
    status text NOT NULL,
    "approvalMode" text NOT NULL,
    "issuedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "pdfUri" text,
    "licenseNumber" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MemberState; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MemberState" (
    id text NOT NULL,
    iso2 text NOT NULL,
    name text NOT NULL
);


--
-- Name: MetricSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MetricSnapshot" (
    id text NOT NULL,
    key text NOT NULL,
    value double precision NOT NULL,
    "labelsJson" text,
    "takenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NationalRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NationalRule" (
    id text NOT NULL,
    "memberStateId" text NOT NULL,
    title text NOT NULL,
    reference text NOT NULL,
    summary text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL
);


--
-- Name: NationalRuleLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NationalRuleLink" (
    id text NOT NULL,
    "nationalRuleId" text NOT NULL,
    "standardVersionId" text NOT NULL
);


--
-- Name: NotificationJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationJob" (
    id text NOT NULL,
    "cocId" text NOT NULL,
    kind text NOT NULL,
    "monthsOut" integer NOT NULL,
    "scheduledFor" timestamp(3) without time zone NOT NULL,
    "sentAt" timestamp(3) without time zone,
    status text DEFAULT 'PENDING'::text NOT NULL
);


--
-- Name: OfflineCacheProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OfflineCacheProfile" (
    id text NOT NULL,
    "entryPointCode" text NOT NULL,
    "pinCode" text NOT NULL,
    "statusJson" text NOT NULL,
    "asOf" timestamp(3) without time zone NOT NULL,
    signature text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "buyerEmail" text NOT NULL,
    "buyerName" text NOT NULL,
    status text NOT NULL,
    "totalCents" integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "buyerPhone" text
);


--
-- Name: OrderLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderLine" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "catalogItemId" text NOT NULL,
    "unitPriceCents" integer NOT NULL,
    qty integer DEFAULT 1 NOT NULL
);


--
-- Name: Organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "memberStateId" text,
    "primaryAdminId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "servicingCbId" text
);


--
-- Name: OrganizationMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrganizationMembership" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL
);


--
-- Name: PaymentAttempt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentAttempt" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    provider text NOT NULL,
    "providerRef" text,
    "amountCents" integer NOT NULL,
    currency text NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "confirmedAt" timestamp(3) without time zone,
    "confirmationCode" text,
    "paymentMethod" text,
    "statusDetail" text,
    "rawJson" text
);


--
-- Name: PesapalNotification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PesapalNotification" (
    id text NOT NULL,
    environment text NOT NULL,
    "notificationUrl" text NOT NULL,
    "notificationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PortfolioTransfer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PortfolioTransfer" (
    id text NOT NULL,
    "fromClientId" text NOT NULL,
    "toClientId" text NOT NULL,
    "productIdsJson" text NOT NULL,
    status text DEFAULT 'STUB_PENDING'::text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    name text NOT NULL,
    commodity text NOT NULL,
    "tariffLineId" text,
    "originClaimJson" text
);


--
-- Name: ProductPin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductPin" (
    id text NOT NULL,
    "variantId" text NOT NULL,
    "pinCode" text NOT NULL,
    "qrPayload" text NOT NULL,
    status text NOT NULL,
    "cocId" text,
    "issuedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: ProductStandardLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductStandardLink" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "standardVersionId" text NOT NULL
);


--
-- Name: ProductVariant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    sku text NOT NULL,
    grade text,
    label text NOT NULL
);


--
-- Name: RateLimitBucket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RateLimitBucket" (
    id text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    "windowStart" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Rec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Rec" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: RoleDefinition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RoleDefinition" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    scope text NOT NULL,
    "permissionsJson" text NOT NULL,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Sanction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sanction" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    level text NOT NULL,
    "cascadesTo" text,
    "appliedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActivityAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "impersonatorId" text,
    "impersonationReason" text
);


--
-- Name: Standard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Standard" (
    id text NOT NULL,
    designation text NOT NULL,
    "titleEn" text NOT NULL,
    "titleFr" text,
    "titlePt" text,
    "titleAr" text,
    ics text NOT NULL,
    publisher text DEFAULT 'ARSO'::text NOT NULL
);


--
-- Name: StandardEntitlement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StandardEntitlement" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "buyerEmail" text NOT NULL,
    "catalogItemId" text NOT NULL,
    "grantedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "artifactUri" text,
    "watermarkText" text
);


--
-- Name: StandardTariffMap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StandardTariffMap" (
    id text NOT NULL,
    "standardVersionId" text NOT NULL,
    "tariffLineId" text NOT NULL,
    "mappingEffect" text DEFAULT 'include'::text NOT NULL,
    "overrideMode" text,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    notes text
);


--
-- Name: StandardVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StandardVersion" (
    id text NOT NULL,
    "standardId" text NOT NULL,
    "editionLabel" text NOT NULL,
    year integer NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "publicationStatus" text NOT NULL,
    "authoritativeLocale" text DEFAULT 'en'::text NOT NULL,
    "sourcePdfUri" text,
    "contentHash" text NOT NULL,
    "scopeEn" text NOT NULL,
    "machineDocJson" text NOT NULL,
    "requirementsJson" text NOT NULL,
    "normativeRefsJson" text NOT NULL,
    "packagingJson" text,
    "labellingJson" text,
    "samplingJson" text
);


--
-- Name: SurveillanceCase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurveillanceCase" (
    id text NOT NULL,
    "pinId" text,
    title text NOT NULL,
    status text NOT NULL,
    summary text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TariffLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TariffLine" (
    id text NOT NULL,
    "recId" text NOT NULL,
    "codeDisplay" text NOT NULL,
    "codeNormalized" text NOT NULL,
    "codeLength" integer NOT NULL,
    "parentTariffLineId" text,
    "hsHeading" text NOT NULL,
    description text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone
);


--
-- Name: UserAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserAccount" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    "rolesGlobal" text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserRoleAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRoleAssignment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleCode" text NOT NULL,
    "organizationId" text,
    "grantedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "grantedById" text
);


--
-- Name: WebhookOutbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WebhookOutbox" (
    id text NOT NULL,
    "eventType" text NOT NULL,
    "payloadJson" text NOT NULL,
    "targetHint" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deliveredAt" timestamp(3) without time zone,
    attempts integer DEFAULT 0 NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AssessmentItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AssessmentItem" (id, "applicationId", source, kind, "itemKey", section, clause, heading, text, "testMethod", "countryIso2", pass, "measuredValue", unit, notes, "sortOrder") FROM stdin;
cmv11ejsu000qu00ezy6v0ozh	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.1	4.1 Raw materials	4.1	Raw materials	The raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the relevant African standards.		\N	t				0
cmv11ejsu000ru00eg2ohna2b	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.2:a	4.2 General requirements	4.2(a)	General requirements	practically free from filth;		\N	t				1
cmv11ejsu000su00e6xyv86lg	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.2:b	4.2 General requirements	4.2(b)	General requirements	free of off flavours and odours:		\N	t				2
cmv11ejsu000tu00e949yli1i	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.2:c	4.2 General requirements	4.2(c)	General requirements	practically free from any living insects and foreign matter:		\N	t				3
cmv11ejsu000uu00eyf2irmnp	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.2:d	4.2 General requirements	4.2(d)	General requirements	safe and suitable for human consumption: and		\N	t				4
cmv11ejsu000vu00elkpow05u	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.2:e	4.2 General requirements	4.2(e)	General requirements	have colour characteristic of the variety. NOTE The colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in carotenes.		\N	t				5
cmv11ejsu001hu00e7bh0nos7	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:10	10 Sampling	10	Sampling	Sampling shall be done in accordance with ISO 24333. 5	ISO 24333	\N	t				27
cmv11ejsu000wu00ej9hnywud	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.3	4.3 Specific requirements	4.3	Specific requirements	Cassava flour shall comply with the specific requirements given in Table 1 when tested in accordance with the test methods specified therein. 3		\N	t				6
cmv11ejsu000xu00ety58g63e	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.4.1	4.4.1 Particle size	4.4.1	Particle size	Not less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 % shall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done in accordance with ISO 3588. Cassava flour intended for baking purposes shall have particle size of which not less than 90 % shall pass through a 250 µm sieve.	ISO 3588	\N	t				7
cmv11ejsu000yu00et812k9io	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:4.4.2	4.4.2 Hydrocyanic acid content	4.4.2	Hydrocyanic acid content	When tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour shall not exceed 10 mg/kg.	ARS 844:2016	\N	t				8
cmv11ejsu000zu00elxyapoab	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:5	5 Food additives	5	Food additives	Food additives may be used in the preparation of cassava flour in accordance with CXS 192. Cassava flour may be fortified with vitamins or micronutrients if so permitted.	CXS 192	\N	t				9
cmv11ejsu0010u00ecui2r4zq	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:6.1	6.1 Pesticide residues	6.1	Pesticide residues	Cassava flour shall conform to maximum residue limits for pesticide residues established by the Codex Alimentarius Commission for this commodity.		\N	t				10
cmv11ejsu0011u00e2iges2us	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:6.2	6.2 Heavy metals	6.2	Heavy metals	Cassava flour shall comply with those maximum levels for heavy metal contaminants established by the Codex Alimentarius Commission for this commodity.		\N	t				11
cmv11ejsu0012u00ermtbpfhs	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:6.3	6.3 Other contaminants	6.3	Other contaminants	Cassava flour shall comply with those maximum limits for other contaminants established in CXS 193.	CXS 193	\N	t				12
cmv11ejsu0013u00e8khljk8h	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:7	7 Hygiene	7	Hygiene	Cassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and shall comply with the microbiological limits given in Table 2. 4	ARS 53	\N	t				13
cmv11ejsu0014u00enwhtx1sw	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:8.1	8.1 Cassava flour shall be packaged in food grade material	8.1	8.1	Cassava flour shall be packaged in food grade material		\N	t				14
cmv11ejsu0015u00eqwdqjqc1	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:8.2	8.2 The net weight of the packages for cassava flour may be required to meet the relevant	8.2	The net weight of the packages for cassava flour may be required to meet the relevant	regulations of the destination country.		\N	t				15
cmv11ejsu0016u00el1y0331i	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:a	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(a)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance with 4.4, shall appear in close proximity to the name of the product;		\N	t				16
cmv11ejsu0017u00e2xxkah2e	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:b	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(b)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Name, location and address of the manufacturer and/or packer shall be declared and/or brand name / trade name.;		\N	t				17
cmv11ejsu0018u00enqpo8nti	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:c	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(c)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Date of manufacture;		\N	t				18
cmv11ejsu0019u00er19j9f3n	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:d	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(d)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Lot identification;		\N	t				19
cmv11ejsu001au00edqn86gac	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:e	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(e)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Best before date;		\N	t				20
cmv11ejsu001bu00ekls1lzvz	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:f	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(f)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Country of origin shall be declared;		\N	t				21
cmv11ejsu001cu00entoui989	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:g	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(g)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Net contents shall be declared by weight in metric (‘Systeme International’) units;		\N	t				22
cmv11ejsu001du00e7mcq4yxu	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:h	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(h)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	The statement ‘food for human consumption’;		\N	t				23
cmv11ejsu001eu00efytyngvo	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:i	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(i)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Storage instructions; and		\N	t				24
cmv11ejsu001fu00ecxlzlw6o	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.1:j	9.1 In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	9.1(j)	In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled	Instructions on disposal of used package.		\N	t				25
cmv11ejsu001gu00eh5v3jip0	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:9.2	9.2 When labelling non-retail packages, information for non-retail packages shall either be given	9.2	When labelling non-retail packages, information for non-retail packages shall either be given	on the packages or in accompanying documents, except that the name of the product, lot identification and the name and address of the manufacturer or packer shall appear on the packages.		\N	t				26
cmv11ejsu001iu00e9w27p6fi	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:Annex A	Annex A Annex A	Annex A	Annex A	Determination of acid insoluble ash		\N	t				28
cmv11ejsu001ju00egehsc9yb	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:A.2.1	A.2.1 Weigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.	A.2.1	Weigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.	Ignite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500 °C to 570 °C until grey ash results. Cool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water until the washings are free from chlorides as tested with silver nitrate solution and return the filter paper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h. Ignite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between two successive weighings is less than 1 mg. Note the lowest weight.		\N	t				29
cmv11ejsu001ku00e3k6eck5q	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:A.3.1	A.3.1 Acid insoluble ash, per cent by weight	A.3.1	Acid insoluble ash, per cent by weight	( ) M M M M − − = 1 2 100 where M2 is the lowest weight, in g, of the dish with the acid insoluble ash; M is the weight, in g, of the empty dish; and M1 is the weight, in g, of the dish with the dried product taken for the test. 6		\N	t				30
cmv11ejsu001lu00eo1tr6ouw	cmv11ejsm000pu00euj6ckqxf	STANDARD	clause	clause:Annex B	Annex B Annex B	Annex B	Annex B	Determination of total acidity (water extract method) Shake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at 40 C for 1 h (with the flask loosely stoppered). Filter and titrate 100 ml of the clear filtrate with 0.05 M NaOH solution with phenolphthalein indicator. The acidity of the water extract increases during storage. 1 ml of 0.1 M NaOH = 0.009 g CH2H6O3 (lactic acid). 7		\N	t				31
cmv11ejsv001mu00ev855uiwq	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:4.3:0:Moisture content, % by mass, max.	4.3 · Table 1 — Compositional requirements for cassava flour	4.3	Moisture content, % by mass, max.	13.0	ISO 712	\N	t				32
cmv11ejsv001nu00evfwrxnex	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:4.3:1:Acid insoluble ash, % m/m, dry matter ba	4.3 · Table 1 — Compositional requirements for cassava flour	4.3	Acid insoluble ash, % m/m, dry matter basis max.	0.60	Annex A	\N	t				33
cmv11ejsv001ou00en5slnecx	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:4.3:2:Starch (on dry basis), % by mass, Min	4.3 · Table 1 — Compositional requirements for cassava flour	4.3	Starch (on dry basis), % by mass, Min	60.0	ISO 15914	\N	t				34
cmv11ejsv001pu00edvsaek34	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:4.3:3:Hydrogen cyanide, mg/kg or ppm	4.3 · Table 1 — Compositional requirements for cassava flour	4.3	Hydrogen cyanide, mg/kg or ppm	10.0	ARS 844:2016	\N	t				35
cmv11ejsv001qu00e9jsgvrlf	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:4.3:4:Total acidity, % m/m, max	4.3 · Table 1 — Compositional requirements for cassava flour	4.3	Total acidity, % m/m, max	1.0	Annex B	\N	t				36
cmv11ejsv001ru00efwq9qbkj	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:7:0:Total viable count, cfu/g, max.	7 · Table 2 — Microbiological limits for cassava flour	7	Total viable count, cfu/g, max.	105	ISO 4833	\N	t				37
cmv11ejsv001su00es4b5kjgi	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:7:1:Escherichia coli, cfu/g, max.	7 · Table 2 — Microbiological limits for cassava flour	7	Escherichia coli, cfu/g, max.	Absent	ISO 7251	\N	t				38
cmv11ejsv001tu00eoy9ya7gi	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:7:2:Salmonella, 25 g, max.	7 · Table 2 — Microbiological limits for cassava flour	7	Salmonella, 25 g, max.	Absent	ISO 6579	\N	t				39
cmv11ejsv001uu00e1gisa2sc	cmv11ejsm000pu00euj6ckqxf	STANDARD	table	table:7:3:Yeasts and moulds, cfu/g, max.	7 · Table 2 — Microbiological limits for cassava flour	7	Yeasts and moulds, cfu/g, max.	103	ISO 21527-2	\N	t				40
cmv11fljp001xu00ewudvr3ov	cmv11ejsm000pu00euj6ckqxf	NATIONAL	clause	national:1:f7a90e	National regulations	UG	Uganda Food and Drugs Act	Food placed on the Uganda market shall meet the national food safety rules.		UG	t				1000
\.


--
-- Data for Name: Attachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attachment" (id, "applicationId", filename, "contentType", "storageUri", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: AuditEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditEvent" (id, "occurredAt", "actorUserId", "impersonatorId", action, "entityType", "entityId", "organizationId", "beforeJson", "afterJson", reason, "ipHint", "prevHash", "eventHash") FROM stdin;
cmv0wih4t0002u0vibii3wfbn	2026-10-09 11:47:52.254	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	GENESIS	9dd7d8719722c1a14ee122211af0fdee87bd5625558c6e9b3c60fbd2fba76325
cmv0yjltz0005u0vie3roo7ex	2026-10-09 12:44:44.231	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	9dd7d8719722c1a14ee122211af0fdee87bd5625558c6e9b3c60fbd2fba76325	8220618096b07aae7b0887c68c1151f2a5d88ecb86b68bd13e985a74912b2a71
cmv0ylbed000cu0viwv9l6ra0	2026-10-09 12:46:04.021	\N	\N	STORE_PURCHASE_FULFILLED	Order	cmv0ylbd80006u0vi5vg1449f	\N	\N	{"buyerEmail":"buyer@example.com","artifactUri":"/artifacts/purchased-cmv0ylbd80006u0vi5vg1449f.pdf","providerRef":"pesapal_mock_1791549963986"}	\N	\N	8220618096b07aae7b0887c68c1151f2a5d88ecb86b68bd13e985a74912b2a71	67a3333415c51a2401b390569ef69bb08d622aa51a7e30e01e1bad11ed11b4c3
cmv0yxpil000hu0vigr5fghdv	2026-10-09 12:55:42.189	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	67a3333415c51a2401b390569ef69bb08d622aa51a7e30e01e1bad11ed11b4c3	0f56e1937880f8fc60314696e4295f984bae484344108b0bf561e019ed55a5d7
cmv0yxpil000iu0vif5xoj64k	2026-10-09 12:55:42.19	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	67a3333415c51a2401b390569ef69bb08d622aa51a7e30e01e1bad11ed11b4c3	0f56e1937880f8fc60314696e4295f984bae484344108b0bf561e019ed55a5d7
cmv0z0626000ju0vi30rywf62	2026-10-09 12:57:36.942	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_CREATE	Standard	std-ars-9001-8bab	\N	\N	{"designation":"ARS 9001","completeness":{"ok":false,"checks":[{"id":"scope","label":"Clause 1 Scope present","required":true,"present":true},{"id":"normative_refs","label":"Normative references retained","required":true,"present":false},{"id":"requirements","label":"Requirements / Table 1 (or equivalent) retained","required":true,"present":true},{"id":"packaging","label":"Packaging provisions retained","required":true,"present":false},{"id":"labelling","label":"Labelling provisions retained","required":true,"present":false},{"id":"sampling","label":"Sampling method retained","required":true,"present":false},{"id":"content_hash","label":"Integrity content hash present","required":true,"present":true,"notes":"Hash must cover the full machine document, not the public preview slice."}]}}	\N	\N	0f56e1937880f8fc60314696e4295f984bae484344108b0bf561e019ed55a5d7	0aa71b9101dd89e9f1bac9c67deac7709feaa61880afc600f60113c8133acc95
cmv0z0mfm000ku0via81nm9c5	2026-10-09 12:57:58.162	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_DELETE	Standard	std-ars-9001-8bab	\N	{"designation":"ARS 9001"}	\N	\N	\N	0aa71b9101dd89e9f1bac9c67deac7709feaa61880afc600f60113c8133acc95	46cac7102ccf4e5209c7a7d6e6530b99190b8394cafd5f10635386c7ec696959
cmv0z3gli000nu0vijzo9pp4o	2026-10-09 13:00:10.566	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	46cac7102ccf4e5209c7a7d6e6530b99190b8394cafd5f10635386c7ec696959	44806832e67d62e920c19141bc6f08cda2469dc693a4b8673b8fbb736ecc6543
cmv0z3p18000ou0vistvr3wew	2026-10-09 13:00:21.5	cmv0sefg8000012mnqep5hc2k	\N	TARIFF_DELETE	TariffLine	tl-reg-sadc-0302	\N	{"id":"tl-reg-sadc-0302","recId":"rec-sadc","codeDisplay":"0302.89","codeNormalized":"030289","codeLength":6,"parentTariffLineId":null,"hsHeading":"0302","description":"Fresh or chilled fish (tilapia and similar)","effectiveFrom":"2020-01-01T00:00:00.000Z","effectiveTo":null,"_count":{"maps":0,"products":0,"children":0}}	\N	\N	\N	44806832e67d62e920c19141bc6f08cda2469dc693a4b8673b8fbb736ecc6543	0877d2f98b6a0164ed5c9649f799e9d193cf8cf0b1384389539a99b90a74e0a4
cmv0z3sij000pu0vijq1seh53	2026-10-09 13:00:26.011	cmv0sefg8000012mnqep5hc2k	\N	TARIFF_DELETE	TariffLine	tl-reg-eac-100630	\N	{"id":"tl-reg-eac-100630","recId":"rec-eac","codeDisplay":"1006.30","codeNormalized":"100630","codeLength":6,"parentTariffLineId":null,"hsHeading":"1006","description":"Semi-milled or wholly milled rice","effectiveFrom":"2020-01-01T00:00:00.000Z","effectiveTo":null,"_count":{"maps":0,"products":0,"children":0}}	\N	\N	\N	0877d2f98b6a0164ed5c9649f799e9d193cf8cf0b1384389539a99b90a74e0a4	bfe1a2f9416ea9b359fb66165bfebd09a50aee7313e2b14bd604dc6f1f19dbc7
cmv0z3urc000qu0vi41xnb2z4	2026-10-09 13:00:28.921	cmv0sefg8000012mnqep5hc2k	\N	TARIFF_DELETE	TariffLine	tl-reg-ecowas-090111	\N	{"id":"tl-reg-ecowas-090111","recId":"rec-ecowas","codeDisplay":"0901.11.00","codeNormalized":"09011100","codeLength":8,"parentTariffLineId":null,"hsHeading":"0901","description":"Coffee, not roasted, not decaffeinated","effectiveFrom":"2020-01-01T00:00:00.000Z","effectiveTo":null,"_count":{"maps":0,"products":0,"children":0}}	\N	\N	\N	bfe1a2f9416ea9b359fb66165bfebd09a50aee7313e2b14bd604dc6f1f19dbc7	7f9b14fb572932274fb85eed5233ab684d4c82005a6b61f3937f8171d6220551
cmv0z4lu3000ru0vitkhxalp8	2026-10-09 13:01:04.011	cmv0sefg8000012mnqep5hc2k	\N	MANUFACTURER_DELETE	Organization	org-reg-mfr-gh	\N	{"name":"Ashanti Coffee Growers","type":"MANUFACTURER"}	\N	\N	\N	7f9b14fb572932274fb85eed5233ab684d4c82005a6b61f3937f8171d6220551	33d30383f2a0c952e9f1adfb490c0569bfc0dcd6a8bd2a75cc1cd717e274816d
cmv0z4pab000su0viywxc98oe	2026-10-09 13:01:08.484	cmv0sefg8000012mnqep5hc2k	\N	MANUFACTURER_DELETE	Organization	org-reg-mfr-ng	\N	{"name":"Lagos Cereals Ltd","type":"MANUFACTURER"}	\N	\N	\N	33d30383f2a0c952e9f1adfb490c0569bfc0dcd6a8bd2a75cc1cd717e274816d	b48983d437b583fa490792ecc7a634f92c9de6e7adef98a8be2653043c7bee50
cmv0z4r14000tu0vi5x0rbc99	2026-10-09 13:01:10.744	cmv0sefg8000012mnqep5hc2k	\N	MANUFACTURER_DELETE	Organization	org-reg-mfr-tz	\N	{"name":"Dar Rice Processors","type":"MANUFACTURER"}	\N	\N	\N	b48983d437b583fa490792ecc7a634f92c9de6e7adef98a8be2653043c7bee50	45f82cb39070e8fc2690fa5e7bcb1057baa47b0cb9089862e0b0fdf7c72db0ac
cmv0z4sr9000uu0vixrnooqja	2026-10-09 13:01:12.981	cmv0sefg8000012mnqep5hc2k	\N	MANUFACTURER_DELETE	Organization	org-reg-mfr-za	\N	{"name":"Limpopo Aqua Farms","type":"MANUFACTURER"}	\N	\N	\N	45f82cb39070e8fc2690fa5e7bcb1057baa47b0cb9089862e0b0fdf7c72db0ac	13901fb32b5511d484c12f59e4f09dbfdfebb92171cf6b64258c7744ac0a1caf
cmv0z4vkh000vu0vi7rtswjrt	2026-10-09 13:01:16.626	cmv0sefg8000012mnqep5hc2k	\N	MANUFACTURER_DELETE	Organization	org-reg-mfr-ke	\N	{"name":"Nairobi Milling Co.","type":"MANUFACTURER"}	\N	\N	\N	13901fb32b5511d484c12f59e4f09dbfdfebb92171cf6b64258c7744ac0a1caf	e4147cc22d2c9f3aea6ab6fbba554c3d8044caf793e0225792a721ca28024012
cmv0zb0ky000wu0vis5rl3r0c	2026-10-09 13:06:03.058	cmv0sefg8000012mnqep5hc2k	\N	TARIFF_CREATE	TariffLine	tl-eac-11062020-7cb3	\N	\N	{"id":"tl-eac-11062020-7cb3","recId":"rec-eac","codeDisplay":"1106.20.20","codeNormalized":"11062020","codeLength":8,"parentTariffLineId":null,"hsHeading":"1106","description":"Flour, meal, or powder of dried cassava","effectiveFrom":"2026-10-09T13:06:03.055Z","effectiveTo":null}	\N	\N	e4147cc22d2c9f3aea6ab6fbba554c3d8044caf793e0225792a721ca28024012	385574d7ee0695874fd5f1b53c8dcb2c1be0e9908b25971e432f91fdebd132b8
cmv11ejt1001vu00ekj4dgvod	2026-10-09 14:04:47.173	cmv0sefg8000012mnqep5hc2k	\N	CB_PRODUCT_CREATE	Product	cmv11ejsi000ju00eblue174u	cmv11dffd0007u00ebqaqn9nt	\N	{"name":"Cassava flour","standardVersionId":"sv-d96bfa15"}	\N	\N	52a4706e2d0fedb525e5368adaf26c2438328f498eeddffae02bd0ff1e4f5e91	74c4668105ab1b6c455195c54c99883ed7766c202d471b3b2f28ba7244a6b060
cmv11h3s1002ju00ecwwzmm6b	2026-10-09 14:06:46.37	cmv0sefg8000012mnqep5hc2k	\N	COC_ISSUED	CoC	cmv11h3rs0021u00ek8fmydu5	\N	\N	{"certificateNo":"COC-QUALITY-2026-0DA647","status":"certified"}	\N	\N	74c4668105ab1b6c455195c54c99883ed7766c202d471b3b2f28ba7244a6b060	1cbb7fa37f04e29c40c4440a387d4d36adeceab65b37b2d1cb16999448bd6a33
cmv0zbqfm000yu0vib4cjogaa	2026-10-09 13:06:36.563	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_IMPORT	Standard	std-ars-838-a0a4	\N	\N	{"designation":"ARS 838","sourceUri":"/uploads/standards/1791551196536-fba61c-ARS_838-2025_Cassava_flour_-_Specification__1_.pdf","completeness":{"ok":true,"checks":[{"id":"scope","label":"Clause 1 Scope present","required":true,"present":true},{"id":"normative_refs","label":"Normative references retained","required":true,"present":true},{"id":"requirements","label":"Requirements / Table 1 (or equivalent) retained","required":true,"present":true},{"id":"packaging","label":"Packaging provisions retained","required":true,"present":true},{"id":"labelling","label":"Labelling provisions retained","required":true,"present":true},{"id":"sampling","label":"Sampling method retained","required":true,"present":true},{"id":"content_hash","label":"Integrity content hash present","required":true,"present":true,"notes":"Hash must cover the full machine document, not the public preview slice."}]},"contentHash":"sha256:fb29db3fb33c8607658e12f5d166839af8a72d90b40edbcc0e238648ee5919e8","omittedNormativeContent":false,"tariffLineIds":["tl-eac-11062020-7cb3"]}	\N	\N	385574d7ee0695874fd5f1b53c8dcb2c1be0e9908b25971e432f91fdebd132b8	04b9a264518eec0ad6cc9cb63dce260f8cb4b0cae8e797752a448e284ef6bc78
cmv0zcu990015u0viz8mqnw14	2026-10-09 13:07:28.174	\N	\N	STORE_PURCHASE_FULFILLED	Order	cmv0zcu6s000zu0vim3l9htmi	\N	\N	{"buyerEmail":"buyer@example.com","artifactUri":"/artifacts/purchased-cmv0zcu6s000zu0vim3l9htmi.pdf","providerRef":"pesapal_mock_1791551248087"}	\N	\N	04b9a264518eec0ad6cc9cb63dce260f8cb4b0cae8e797752a448e284ef6bc78	40d40cf7d9480cb2fff0800cc5d66ee035786936f0c4f8e505c94e7c4e211ed8
cmv0zqpfk001fu0vi1640hcya	2026-10-09 13:18:15.105	cmv0sefg8000012mnqep5hc2k	\N	MANUFACTURER_CREATE	Organization	cmv0zqpfe0018u0vi70bxbzv5	cmv0zqpfe0018u0vi70bxbzv5	\N	{"name":"Sweet Cassava Flour Limited","type":"MANUFACTURER"}	\N	\N	40d40cf7d9480cb2fff0800cc5d66ee035786936f0c4f8e505c94e7c4e211ed8	4e5cd4380a356194bf3f67a72cb2b32bb1c2a0f2bd3c30c0e79cf7e103baaaf3
cmv0zr9f4001iu0vifm54i9ss	2026-10-09 13:18:41.008	cmv0zqpfa0016u0vij3bqq6cg	\N	LOGIN	UserAccount	cmv0zqpfa0016u0vij3bqq6cg	\N	\N	\N	\N	\N	4e5cd4380a356194bf3f67a72cb2b32bb1c2a0f2bd3c30c0e79cf7e103baaaf3	0250bc0064bb151c12fed991cf4681049934e8c050fdf27a6134ecb96244738d
cmv10czhq001nu0viklyu1685	2026-10-09 13:35:34.575	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	0250bc0064bb151c12fed991cf4681049934e8c050fdf27a6134ecb96244738d	43028321bb5a6347fe411b6d1c8009a6486e472a5987faca3c0a9113030e4648
cmv10czhq001ou0vilrq3w9qb	2026-10-09 13:35:34.575	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	0250bc0064bb151c12fed991cf4681049934e8c050fdf27a6134ecb96244738d	43028321bb5a6347fe411b6d1c8009a6486e472a5987faca3c0a9113030e4648
cmv10eabd00073f0rgd7apbye	2026-10-09 13:36:35.257	cmv0sefg8000012mnqep5hc2k	\N	PRODUCT_REGISTER	Product	cmv10eab300023f0rtnvzl40t	cmv0zqpfe0018u0vi70bxbzv5	\N	{"name":"Verification cassava flour","standardVersionId":"sv-d96bfa15"}	\N	\N	43028321bb5a6347fe411b6d1c8009a6486e472a5987faca3c0a9113030e4648	7a67b0b5808170d078c3fc04891888df9eb33be06dd70b085fcf5d315c888cce
cmv10fl6t000c3f0r67ls5mgx	2026-10-09 13:37:36.006	cmv0sefg8000012mnqep5hc2k	\N	TEST_RECORD	LabResult	cmv10fl6r000b3f0rcyirtozr	org-reg-kebs	\N	{"productId":"cmv10eab300023f0rtnvzl40t","pass":true,"labName":"KEBS lab"}	\N	\N	7a67b0b5808170d078c3fc04891888df9eb33be06dd70b085fcf5d315c888cce	967aff72171e23877e0469428ea03b753b31bdbdfd77cb4ddc6442fd12807859
cmv10fxrb000x3f0rw6pofdbz	2026-10-09 13:37:52.295	cmv0sefg8000012mnqep5hc2k	\N	COC_ISSUED	CoC	cmv10fxqy000f3f0rp6ufgyo6	\N	\N	{"certificateNo":"COC-QUALITY-2026-4C9AB1","status":"certified"}	\N	\N	967aff72171e23877e0469428ea03b753b31bdbdfd77cb4ddc6442fd12807859	929eae356ee508158594b02d2fc91df696bcb8d78e63f188e6fdc2d5175d90e2
cmv10gu4i00103f0rltdis9l1	2026-10-09 13:38:34.242	cmv0sefg8000012mnqep5hc2k	\N	INSPECTION_RECORD	ConformityInspection	cmv10gu4f000z3f0rk4owkyxf	\N	\N	{"productId":"cmv10eab300023f0rtnvzl40t","result":"CONFORM"}	\N	\N	929eae356ee508158594b02d2fc91df696bcb8d78e63f188e6fdc2d5175d90e2	09f7b2360e2677e926820fa7bb16f57298cbe4b08a09b88fcbe3987cfec4de08
cmv10h29g00133f0rh374yp9w	2026-10-09 13:38:44.788	cmv0sefg8000012mnqep5hc2k	\N	CUSTOMS_DECISION	CustomsClearance	cmv10h29b00123f0rcd8qgbey	\N	\N	{"productId":"cmv10eab300023f0rtnvzl40t","decision":"ALLOW","originIso2":"KE","destinationIso2":"UG"}	\N	\N	09f7b2360e2677e926820fa7bb16f57298cbe4b08a09b88fcbe3987cfec4de08	8aa9272be4560074a2fc575d52d42d31a6bfcc0f2e21371569b8bdb022881118
cmv10i3xm00163f0r09i8vt65	2026-10-09 13:39:33.611	\N	\N	CONSUMER_COMPLAINT	ConsumerComplaint	cmv10i3xj00153f0rdb4r9j30	\N	\N	\N	\N	\N	8aa9272be4560074a2fc575d52d42d31a6bfcc0f2e21371569b8bdb022881118	6201919557585b5dfdcd7f0c8a07ac9ba42d79415daddf72b660a99be9d108a2
cmv10jn6j00193f0rliuoegbc	2026-10-09 13:40:45.212	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	6201919557585b5dfdcd7f0c8a07ac9ba42d79415daddf72b660a99be9d108a2	e57f9bc500a9434984a0c9d0f518d86fb033d9e3909bfe02b35c59b16cef3d11
cmv10jqrf001c3f0rjepo5cz3	2026-10-09 13:40:49.851	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	e57f9bc500a9434984a0c9d0f518d86fb033d9e3909bfe02b35c59b16cef3d11	a8ccf0a019f83949463a36e38216fbe4f3c26cd04f00917462404ab5e281b19a
cmv10jt9b001f3f0r669b7q4r	2026-10-09 13:40:53.087	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	a8ccf0a019f83949463a36e38216fbe4f3c26cd04f00917462404ab5e281b19a	6cc0b733f66eae3fdfc514d4e14996c076dbe9f0bab96b5d70cc5d1461eba49b
cmv10jxdb001i3f0rcpifk5e7	2026-10-09 13:40:58.415	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	6cc0b733f66eae3fdfc514d4e14996c076dbe9f0bab96b5d70cc5d1461eba49b	0f3110bb446f1dadd877248d6d6dc4ddfe0abccd83a0c9d97514b56725fe2ff9
cmv10k03h001l3f0rfspeqeb0	2026-10-09 13:41:01.95	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	0f3110bb446f1dadd877248d6d6dc4ddfe0abccd83a0c9d97514b56725fe2ff9	232b12c87d31a915e90fd6f016b6dc1fb15b2326f7cdbd08dde795f39cfbfbd5
cmv10k9lx001o3f0r20fhum1w	2026-10-09 13:41:14.277	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	232b12c87d31a915e90fd6f016b6dc1fb15b2326f7cdbd08dde795f39cfbfbd5	c90b3647bf43f2b2d6a628f172381ae7d9e6e0fa56bef59f63cdaddb60b27efc
cmv11cn2g0004u00e6cdyej6d	2026-10-09 14:03:18.089	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	c90b3647bf43f2b2d6a628f172381ae7d9e6e0fa56bef59f63cdaddb60b27efc	17733df7a380aa47fea2454567986f1bbc0663f9769589f68f03faba6f0fc2a6
cmv11cn2h0005u00e4o4z3pxo	2026-10-09 14:03:18.089	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	c90b3647bf43f2b2d6a628f172381ae7d9e6e0fa56bef59f63cdaddb60b27efc	17733df7a380aa47fea2454567986f1bbc0663f9769589f68f03faba6f0fc2a6
cmv11dffi000au00ezd3eij88	2026-10-09 14:03:54.847	cmv0sefg8000012mnqep5hc2k	\N	CB_CREATE	Organization	cmv11dffd0007u00ebqaqn9nt	cmv11dffd0007u00ebqaqn9nt	\N	{"name":"Kenya Bureau of Standards","type":"CB"}	\N	\N	17733df7a380aa47fea2454567986f1bbc0663f9769589f68f03faba6f0fc2a6	9187284cfe1e07964c50e68ba66b480e084da1557155d8fecb090821980129cb
cmv11dwuh000hu00erhl9g1jl	2026-10-09 14:04:17.417	cmv0sefg8000012mnqep5hc2k	\N	CB_CLIENT_CREATE	Organization	cmv11dwue000cu00elakmhq7h	cmv11dffd0007u00ebqaqn9nt	\N	{"name":"Lake Victoria Cassava Mill","type":"MANUFACTURER"}	\N	\N	9187284cfe1e07964c50e68ba66b480e084da1557155d8fecb090821980129cb	52a4706e2d0fedb525e5368adaf26c2438328f498eeddffae02bd0ff1e4f5e91
cmv4un2bo002mu00e12vb3p4l	2026-10-12 06:06:31.813	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	1cbb7fa37f04e29c40c4440a387d4d36adeceab65b37b2d1cb16999448bd6a33	3f7e2e6be88c8655d069dfa65799ad38f802849489d4c0db6ae4fabfed140eb6
cmv4unzev002nu00e2whdda8y	2026-10-12 06:07:14.696	cmv0sefg8000012mnqep5hc2k	\N	REC_CREATE	Rec	rec-sadc-f43d	\N	\N	{"id":"rec-sadc-f43d","code":"SADC","name":"SADC"}	\N	\N	3f7e2e6be88c8655d069dfa65799ad38f802849489d4c0db6ae4fabfed140eb6	65003542e7bcfb8db07ed5fafd46ab89dd68eece24b884ad0dd24bd312b0ab87
cmv4utc2p002ou00evkyuzdg9	2026-10-12 06:11:24.386	cmv0sefg8000012mnqep5hc2k	\N	TARIFF_CREATE	TariffLine	tl-sadc-04051010-ee89	\N	\N	{"id":"tl-sadc-04051010-ee89","recId":"rec-sadc-f43d","codeDisplay":"0405.10.10","codeNormalized":"04051010","codeLength":8,"parentTariffLineId":null,"hsHeading":"0405","description":"Salted / Natural Butter","effectiveFrom":"2026-10-12T06:11:24.382Z","effectiveTo":null}	\N	\N	65003542e7bcfb8db07ed5fafd46ab89dd68eece24b884ad0dd24bd312b0ab87	e679c34f9e20d96b5b00c504c3f2a5594c369540f04da8ce66f41952609bcd09
cmv4uty3r002qu00ebhw51x36	2026-10-12 06:11:52.935	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_IMPORT	Standard	std-ars-1093-451f	\N	\N	{"designation":"ARS 1093","sourceUri":"/uploads/standards/1791785512910-1289f5-ARS_1093_2025_Butter___Specification__1_.pdf","completeness":{"ok":true,"checks":[{"id":"scope","label":"Clause 1 Scope present","required":true,"present":true},{"id":"normative_refs","label":"Normative references retained","required":true,"present":true},{"id":"requirements","label":"Requirements / Table 1 (or equivalent) retained","required":true,"present":true},{"id":"packaging","label":"Packaging provisions retained","required":true,"present":true},{"id":"labelling","label":"Labelling provisions retained","required":true,"present":true},{"id":"sampling","label":"Sampling method retained","required":true,"present":true},{"id":"content_hash","label":"Integrity content hash present","required":true,"present":true,"notes":"Hash must cover the full machine document, not the public preview slice."}]},"contentHash":"sha256:8c46050dd341cb413f2f886aa91540e570631ae58c7afad99143ad446ffde34d","omittedNormativeContent":false,"tariffLineIds":["tl-sadc-04051010-ee89"]}	\N	\N	e679c34f9e20d96b5b00c504c3f2a5594c369540f04da8ce66f41952609bcd09	9cf9d56a781c582a2ca9b0a2baf372c727638f7bf0e057dacfb61f92361869ec
cmv4ux56t002xu00edrjwhkgs	2026-10-12 06:14:22.085	\N	\N	STORE_PURCHASE_FULFILLED	Order	cmv4ux542002ru00epd74xidp	\N	\N	{"buyerEmail":"buyer@example.com","artifactUri":"/artifacts/purchased-cmv4ux542002ru00epd74xidp.pdf","providerRef":"pesapal_mock_1791785661990"}	\N	\N	9cf9d56a781c582a2ca9b0a2baf372c727638f7bf0e057dacfb61f92361869ec	1f888b0f6c0da306020ea457635d7b860db27c60b43d133af11a1035d09a9cc1
cmv4v7kr1002yu00eykv8o0ub	2026-10-12 06:22:28.814	cmv0sefg8000012mnqep5hc2k	\N	TARIFF_CREATE	TariffLine	tl-eac-04051000-bdc5	\N	\N	{"id":"tl-eac-04051000-bdc5","recId":"rec-eac","codeDisplay":"0405.10.00","codeNormalized":"04051000","codeLength":8,"parentTariffLineId":null,"hsHeading":"0405","description":"Butter","effectiveFrom":"2026-10-12T06:22:28.810Z","effectiveTo":null}	\N	\N	1f888b0f6c0da306020ea457635d7b860db27c60b43d133af11a1035d09a9cc1	d9547705eca711b4b85efac2849ef669d8db3ef7e294442fd1f6f043775bdee4
cmv4v8086002zu00ez87e7zl7	2026-10-12 06:22:48.87	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_UPDATE	Standard	std-ars-1093-451f	\N	{"id":"std-ars-1093-451f","designation":"ARS 1093","titleEn":"Butter — Specification","titleFr":null,"titlePt":null,"titleAr":null,"ics":"67.060","publisher":"ARSO"}	{"id":"std-ars-1093-451f","designation":"ARS 1093","titleEn":"Butter — Specification","titleFr":null,"titlePt":null,"titleAr":null,"ics":"67.060","publisher":"ARSO"}	\N	\N	d9547705eca711b4b85efac2849ef669d8db3ef7e294442fd1f6f043775bdee4	e611889eb57dde5049a16dc6d18d2709e44cfc3243d811276c0610203f6552cd
cmv4vey370035u00ey6lwqovr	2026-10-12 06:28:12.691	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	e611889eb57dde5049a16dc6d18d2709e44cfc3243d811276c0610203f6552cd	c4b1866f651f738d17d4a0bae5c5fe34e976f4bca38802c44881d7d8c74a0d80
cmv4vey370034u00e8u7lu9hs	2026-10-12 06:28:12.691	cmv0sefg8000012mnqep5hc2k	\N	LOGIN	UserAccount	cmv0sefg8000012mnqep5hc2k	\N	\N	\N	\N	\N	e611889eb57dde5049a16dc6d18d2709e44cfc3243d811276c0610203f6552cd	c4b1866f651f738d17d4a0bae5c5fe34e976f4bca38802c44881d7d8c74a0d80
cmv4vfn7m003cu00e2ai2llq4	2026-10-12 06:28:45.251	cmv0sefg8000012mnqep5hc2k	\N	CB_CLIENT_CREATE	Organization	cmv4vfn7j0037u00ehbdtepm5	cmv11dffd0007u00ebqaqn9nt	\N	{"name":"Form Reset Check","type":"MANUFACTURER"}	\N	\N	c4b1866f651f738d17d4a0bae5c5fe34e976f4bca38802c44881d7d8c74a0d80	3e52b5f56765645567a4a4ae795ffbfbc88999f1886adf065832728b8600ff1b
cmv4vgqx4003ju00eywyimj28	2026-10-12 06:29:36.713	cmv0sefg8000012mnqep5hc2k	\N	CB_CLIENT_CREATE	Organization	cmv4vgqx0003eu00e78a58yqm	cmv11dffd0007u00ebqaqn9nt	\N	{"name":"Notice Check Mill","type":"MANUFACTURER"}	\N	\N	3e52b5f56765645567a4a4ae795ffbfbc88999f1886adf065832728b8600ff1b	c26a6d44aa9b5d58b08547170a19977502359de81fabc545388c68cdfbbe0835
cmv4vqm4n003ku00e52ttv5n1	2026-10-12 06:37:17.063	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_PRICE	StandardVersion	sv-d96bfa15	\N	\N	{"priceCents":6250,"currency":"USD","active":true,"designation":"ARS 838"}	\N	\N	c26a6d44aa9b5d58b08547170a19977502359de81fabc545388c68cdfbbe0835	08cdda6ad24113a3e5e666928b6fc7e061c002d793dfa41ec279fdf643767871
cmv4vqyig003lu00eezofz02z	2026-10-12 06:37:33.112	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_PRICE	StandardVersion	sv-d96bfa15	\N	\N	{"priceCents":4500,"currency":"USD","active":true,"designation":"ARS 838"}	\N	\N	08cdda6ad24113a3e5e666928b6fc7e061c002d793dfa41ec279fdf643767871	73099eeea7cd72b20b2526dee2ae5b660305d1955fac90a494126302e8287ec6
cmv4vsy8x003mu00ezndbizwj	2026-10-12 06:39:06.081	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_PRICE	StandardVersion	sv-c7820298	\N	\N	{"priceCents":100,"currency":"KES","active":true,"designation":"ARS 1093"}	\N	\N	73099eeea7cd72b20b2526dee2ae5b660305d1955fac90a494126302e8287ec6	59ca50e77b4ec1426e7294a40c1fb39a9f616c77b02c7a7d24f84207e923237f
cmv4vsz8i003nu00ebkpsnx2v	2026-10-12 06:39:07.363	cmv0sefg8000012mnqep5hc2k	\N	STANDARD_PRICE	StandardVersion	sv-d96bfa15	\N	\N	{"priceCents":100,"currency":"KES","active":true,"designation":"ARS 838"}	\N	\N	59ca50e77b4ec1426e7294a40c1fb39a9f616c77b02c7a7d24f84207e923237f	175326ca83dafe348a8e0bd1e12942e5f20b210b180d2a684430567130f54869
cmv4x2y32000hqqz5pb14fvgt	2026-10-12 07:14:52.046	\N	\N	STORE_PURCHASE_FULFILLED	Order	cmv4x283i000aqqz5mcoyxpf2	\N	\N	{"buyerEmail":"jerutom@arso-oran.org","artifactUri":"/artifacts/purchased-cmv4x283i000aqqz5mcoyxpf2.pdf","providerRef":"9428922b-1e4e-48aa-b3a3-d9cbd6543ed6"}	\N	\N	175326ca83dafe348a8e0bd1e12942e5f20b210b180d2a684430567130f54869	bb24e0ce2661b4625c8507dd89691af6235e3562c03f707f5fdb0bed9575b2bb
\.


--
-- Data for Name: CatalogItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CatalogItem" (id, "standardVersionId", "priceCents", currency, "coverTitle", "previewScopeOnly", active) FROM stdin;
cmv4uty3c002pu00eksmvuidu	sv-c7820298	100	KES	ARS 1093:1093 Butter — Specification	t	t
cmv0zbqf7000xu0vi9pxoxkg2	sv-d96bfa15	100	KES	ARS 838:2025 Cassava flour — Specification	t	t
\.


--
-- Data for Name: CbLicense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CbLicense" (id, "organizationId", "licenseType", "markScheme", status, "approvalMode", "issuedAt", "expiresAt", "graceUntil", "parentLicenseId", "pdfUri", "licenseNumber", "createdAt") FROM stdin;
\.


--
-- Data for Name: CertificationApplication; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CertificationApplication" (id, "productId", "organizationId", "standardVersionId", status, "markScheme", "qualityApprovedAt", "ecoApprovedAt", "createdAt", "idempotencyKey") FROM stdin;
cmv11ejsm000pu00euj6ckqxf	cmv11ejsi000ju00eblue174u	cmv11dffd0007u00ebqaqn9nt	sv-d96bfa15	CERTIFIED	QUALITY	\N	\N	2026-10-09 14:04:47.159	\N
\.


--
-- Data for Name: ClientAccount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClientAccount" (id, "organizationId", "displayName") FROM stdin;
cmv0zqpfh001cu0vi6iaxbbxf	cmv0zqpfe0018u0vi70bxbzv5	Sweet Cassava Flour Limited
cmv11dwue000eu00eyhfs0q0f	cmv11dwue000cu00elakmhq7h	Lake Victoria Cassava Mill
\.


--
-- Data for Name: CoC; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CoC" (id, "applicationId", "certificateNo", status, "issuedAt", "expiresAt", "markScheme") FROM stdin;
cmv11h3rs0021u00ek8fmydu5	cmv11ejsm000pu00euj6ckqxf	COC-QUALITY-2026-0DA647	certified	2026-10-09 14:06:46.359	2028-10-09 14:06:46.359	QUALITY
\.


--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Company" (id, "clientAccountId", "legalName", "countryIso2") FROM stdin;
cmv0zqpfi001eu0vinb0gmjui	cmv0zqpfh001cu0vi6iaxbbxf	ARSO	KE
cmv11dwuf000gu00elicgr4er	cmv11dwue000eu00eyhfs0q0f	Lake Victoria Cassava Mill	KE
\.


--
-- Data for Name: ConformityInspection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConformityInspection" (id, "productId", "standardVersionId", "organizationId", "inspectorUserId", result, findings, "inspectedAt") FROM stdin;
\.


--
-- Data for Name: ConsumerComplaint; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsumerComplaint" (id, "pinId", "complainantEmail", subject, body, status, "routedCbId", "createdAt") FROM stdin;
\.


--
-- Data for Name: CustomsClearance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CustomsClearance" (id, "productId", "cocId", "organizationId", "officerUserId", "originIso2", "destinationIso2", decision, reason, "decidedAt") FROM stdin;
\.


--
-- Data for Name: EntryPoint; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EntryPoint" (id, name, code, kind, "memberStateId", "organizationId", "locationNote") FROM stdin;
\.


--
-- Data for Name: FeeEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeeEvent" (id, "cocId", amount, currency, kind, "createdAt") FROM stdin;
\.


--
-- Data for Name: FraudAlert; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FraudAlert" (id, "pinId", kind, message, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Invitation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invitation" (id, "organizationId", email, role, token, "invitedById", "acceptedAt", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: LabEvidence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabEvidence" (id, "assessmentItemId", filename, "contentType", "storageUri", "uploadedAt") FROM stdin;
783683d852a543b3beb79b6a3306cfa9	cmv11ejsv001mu00ev855uiwq	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
2e41e5fa4dd7437f9c273f05ffb67a7e	cmv11ejsv001nu00evfwrxnex	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
3c023f558f7342b8944807e64cdb4450	cmv11ejsv001ou00en5slnecx	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
96264a57d8cd4c16ad0083c47e314fbe	cmv11ejsv001pu00edvsaek34	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
b443e9dda55e455090aa424acd285fa9	cmv11ejsv001qu00e9jsgvrlf	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
ba64876aa17e42b7bbcf3e0acbadcbf0	cmv11ejsv001ru00efwq9qbkj	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
a99f102fef524f179de779ebc55b07f1	cmv11ejsv001su00es4b5kjgi	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
757b645e66ca437ca0760242baf9286b	cmv11ejsv001tu00eoy9ya7gi	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
8390564566e14678988a90368529dab1	cmv11ejsv001uu00e1gisa2sc	ars838-lab.txt	text/plain	/uploads/lab/ars838-lab.txt	2026-10-09 17:06:37.89
\.


--
-- Data for Name: LabResult; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabResult" (id, "applicationId", "requirementId", "measuredValue", unit, pass, "labName", "testedAt", notes) FROM stdin;
\.


--
-- Data for Name: LedgerAnchor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LedgerAnchor" (id, "cocId", "eventType", "payloadHash", "chainId", "blockRef", "anchoredAt", "entityRef") FROM stdin;
cmv11h3rw0027u00edfrqvqmx	cmv11h3rs0021u00ek8fmydu5	COC_ISSUED	3013c7d4bd36585a9cea3ca54eb2e4193bb21ea8112623e9a5277538fa0654e1	stub-acap-ledger	stub-3013c7d4bd36	2026-10-09 14:06:46.364	COC-QUALITY-2026-0DA647
\.


--
-- Data for Name: MarkGrant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MarkGrant" (id, "cocId", "markScheme", status, "grantedAt") FROM stdin;
cmv11h3rt0023u00e37u5c09q	cmv11h3rs0021u00ek8fmydu5	QUALITY	ACTIVE	2026-10-09 14:06:46.359
\.


--
-- Data for Name: MarkSublicense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MarkSublicense" (id, "cbLicenseId", "issuerOrgId", "clientName", "markScheme", status, "approvalMode", "issuedAt", "expiresAt", "pdfUri", "licenseNumber", "createdAt") FROM stdin;
\.


--
-- Data for Name: MemberState; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MemberState" (id, iso2, name) FROM stdin;
ms-ke	KE	Kenya
ms-ng	NG	Nigeria
ms-za	ZA	South Africa
ms-sn	SN	Senegal
ms-gh	GH	Ghana
ms-tz	TZ	Tanzania
ms-ug	UG	Uganda
ms-rw	RW	Rwanda
\.


--
-- Data for Name: MetricSnapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MetricSnapshot" (id, key, value, "labelsJson", "takenAt") FROM stdin;
\.


--
-- Data for Name: NationalRule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NationalRule" (id, "memberStateId", title, reference, summary, "effectiveFrom") FROM stdin;
\.


--
-- Data for Name: NationalRuleLink; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NationalRuleLink" (id, "nationalRuleId", "standardVersionId") FROM stdin;
\.


--
-- Data for Name: NotificationJob; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NotificationJob" (id, "cocId", kind, "monthsOut", "scheduledFor", "sentAt", status) FROM stdin;
cmv11h3rx002au00egenc0wit	cmv11h3rs0021u00ek8fmydu5	EXPIRY_REMINDER	6	2028-04-09 14:06:46.359	\N	PENDING
cmv11h3ry002cu00e9y6fli0s	cmv11h3rs0021u00ek8fmydu5	EXPIRY_REMINDER	4	2028-06-09 14:06:46.359	\N	PENDING
cmv11h3rz002eu00e8q1su52a	cmv11h3rs0021u00ek8fmydu5	EXPIRY_REMINDER	3	2028-07-09 14:06:46.359	\N	PENDING
cmv11h3rz002gu00ego41jlp3	cmv11h3rs0021u00ek8fmydu5	EXPIRY_REMINDER	2	2028-08-09 14:06:46.359	\N	PENDING
cmv11h3rz002iu00e5maxbzp9	cmv11h3rs0021u00ek8fmydu5	EXPIRY_REMINDER	1	2028-09-09 14:06:46.359	\N	PENDING
\.


--
-- Data for Name: OfflineCacheProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OfflineCacheProfile" (id, "entryPointCode", "pinCode", "statusJson", "asOf", signature, "createdAt") FROM stdin;
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Order" (id, "buyerEmail", "buyerName", status, "totalCents", currency, "createdAt", "buyerPhone") FROM stdin;
cmv0zcu6s000zu0vim3l9htmi	buyer@example.com	Trade Buyer	FULFILLED	4500	USD	2026-10-09 13:07:28.084	\N
cmv4ux542002ru00epd74xidp	buyer@example.com	Trade Buyer	FULFILLED	4500	USD	2026-10-12 06:14:21.986	\N
cmv4wzhpn0000qqz5sq84w9mz	sandbox.buyer@example.com	Sandbox Buyer	CHECKOUT	100	KES	2026-10-12 07:12:10.859	+254712000111
cmv4x0aia0005qqz5z0pacou6	sandbox.buyer@example.com	Sandbox Buyer	CHECKOUT	100	KES	2026-10-12 07:12:48.179	+254712000222
cmv4x283i000aqqz5mcoyxpf2	jerutom@arso-oran.org	Jeruto Masiror	FULFILLED	100	KES	2026-10-12 07:14:18.366	+254726688456
\.


--
-- Data for Name: OrderLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderLine" (id, "orderId", "catalogItemId", "unitPriceCents", qty) FROM stdin;
cmv0zcu6s0011u0vi9q890s5h	cmv0zcu6s000zu0vim3l9htmi	cmv0zbqf7000xu0vi9pxoxkg2	4500	1
cmv4ux542002tu00epac74i40	cmv4ux542002ru00epd74xidp	cmv4uty3c002pu00eksmvuidu	4500	1
cmv4wzhpn0002qqz5s5r0w6ti	cmv4wzhpn0000qqz5sq84w9mz	cmv0zbqf7000xu0vi9pxoxkg2	100	1
cmv4x0aib0007qqz5md6z5b5s	cmv4x0aia0005qqz5z0pacou6	cmv4uty3c002pu00eksmvuidu	100	1
cmv4x283i000cqqz5lam123e8	cmv4x283i000aqqz5mcoyxpf2	cmv4uty3c002pu00eksmvuidu	100	1
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Organization" (id, name, type, "memberStateId", "primaryAdminId", "createdAt", "servicingCbId") FROM stdin;
org-arso	African Organisation for Standardisation (ARSO)	ARSO	\N	cmv0sefg8000012mnqep5hc2k	2026-10-09 09:52:44.988	\N
cmv0zqpfe0018u0vi70bxbzv5	Sweet Cassava Flour Limited	MANUFACTURER	ms-ke	cmv0zqpfa0016u0vij3bqq6cg	2026-10-09 13:18:15.099	\N
cmv11dffd0007u00ebqaqn9nt	Kenya Bureau of Standards	CB	ms-ke	cmv0sefv900002h7v8gw5apm3	2026-10-09 14:03:54.842	\N
cmv11dwue000cu00elakmhq7h	Lake Victoria Cassava Mill	MANUFACTURER	\N	\N	2026-10-09 14:04:17.414	cmv11dffd0007u00ebqaqn9nt
\.


--
-- Data for Name: OrganizationMembership; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrganizationMembership" (id, "organizationId", "userId", role) FROM stdin;
cmv0sefgd000512mn3cqjmrjc	org-arso	cmv0sefg8000012mnqep5hc2k	PRIMARY_ADMIN
cmv0sefgf000712mnpkh6xg1m	org-arso	cmv0sefga000112mnvkgwo6zl	ORG_USER
cmv0zqpfg001au0viegiis6oo	cmv0zqpfe0018u0vi70bxbzv5	cmv0zqpfa0016u0vij3bqq6cg	PRIMARY_ADMIN
cmv11dfff0009u00emodn1mfd	cmv11dffd0007u00ebqaqn9nt	cmv0sefv900002h7v8gw5apm3	CB_OFFICER
\.


--
-- Data for Name: PaymentAttempt; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaymentAttempt" (id, "orderId", provider, "providerRef", "amountCents", currency, status, "createdAt", "confirmedAt", "confirmationCode", "paymentMethod", "statusDetail", "rawJson") FROM stdin;
cmv0zcu6s0012u0viagl80ne2	cmv0zcu6s000zu0vim3l9htmi	PESAPAL	pesapal_mock_1791551248087	4500	USD	CONFIRMED	2026-10-09 13:07:28.084	2026-10-09 13:07:28.094	\N	\N	\N	\N
cmv4ux542002uu00es3z0kipu	cmv4ux542002ru00epd74xidp	PESAPAL	pesapal_mock_1791785661990	4500	USD	CONFIRMED	2026-10-12 06:14:21.986	2026-10-12 06:14:22	\N	\N	\N	\N
cmv4wzhpn0003qqz5d0rvgl5s	cmv4wzhpn0000qqz5sq84w9mz	PESAPAL	5b482f4d-de41-4a34-842d-d9cb7fceb85f	100	KES	INITIATED	2026-10-12 07:12:10.859	\N	\N	\N	REDIRECTED	{"order_tracking_id":"5b482f4d-de41-4a34-842d-d9cb7fceb85f","merchant_reference":"cmv4wzhpn0000qqz5sq84w9mz","redirect_url":"https://cybqa.pesapal.com/pesapaliframe/PesapalIframe3/Index?OrderTrackingId=5b482f4d-de41-4a34-842d-d9cb7fceb85f","error":null,"status":"200"}
cmv4x0aib0008qqz5zzpjx8iv	cmv4x0aia0005qqz5z0pacou6	PESAPAL	c10b5a88-4d75-4aa6-9456-d9cb3fd7a6b0	100	KES	INITIATED	2026-10-12 07:12:48.179	\N	\N	\N	REDIRECTED	{"order_tracking_id":"c10b5a88-4d75-4aa6-9456-d9cb3fd7a6b0","merchant_reference":"cmv4x0aia0005qqz5z0pacou6","redirect_url":"https://cybqa.pesapal.com/pesapaliframe/PesapalIframe3/Index?OrderTrackingId=c10b5a88-4d75-4aa6-9456-d9cb3fd7a6b0","error":null,"status":"200"}
cmv4x283i000dqqz5kdmxow71	cmv4x283i000aqqz5mcoyxpf2	PESAPAL	9428922b-1e4e-48aa-b3a3-d9cbd6543ed6	100	KES	CONFIRMED	2026-10-12 07:14:18.366	2026-10-12 07:14:51.959	UJC789YONK	MpesaKE	COMPLETED	{"payment_method":"MpesaKE","amount":1,"created_date":"2026-10-12T10:14:49.977","confirmation_code":"UJC789YONK","order_tracking_id":"9428922b-1e4e-48aa-b3a3-d9cbd6543ed6","payment_status_description":"Completed","description":null,"message":"Request processed successfully","payment_account":"2547xxx88456","call_back_url":"https://eau-involves-cod-back.trycloudflare.com/api/store/pesapal/callback?locale=en&OrderTrackingId=9428922b-1e4e-48aa-b3a3-d9cbd6543ed6&OrderMerchantReference=cmv4x283i000aqqz5mcoyxpf2","status_code":1,"merchant_reference":"cmv4x283i000aqqz5mcoyxpf2","account_number":"","payment_status_code":"","currency":"KES","error":{"error_type":null,"code":null,"message":null},"status":"200"}
\.


--
-- Data for Name: PesapalNotification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PesapalNotification" (id, environment, "notificationUrl", "notificationId", "createdAt", "updatedAt") FROM stdin;
cmv4wzizx0004qqz5xoczsakj	demo	https://eau-involves-cod-back.trycloudflare.com/api/store/pesapal/ipn	c1bff3a0-3df8-47a3-89d2-d9cb9968415c	2026-10-12 07:12:12.522	2026-10-12 07:14:19.183
\.


--
-- Data for Name: PortfolioTransfer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PortfolioTransfer" (id, "fromClientId", "toClientId", "productIdsJson", status, reason, "createdAt") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Product" (id, "companyId", name, commodity, "tariffLineId", "originClaimJson") FROM stdin;
cmv11ejsi000ju00eblue174u	cmv11dwuf000gu00elicgr4er	Cassava flour	Cassava flour	\N	\N
\.


--
-- Data for Name: ProductPin; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductPin" (id, "variantId", "pinCode", "qrPayload", status, "cocId", "issuedAt", "expiresAt") FROM stdin;
cmv11h3rv0025u00e07gt3hx3	cmv11ejsl000nu00e4ogw8obp	PIN-D5F291B5	{"pin":"PIN-D5F291B5","coc":"COC-QUALITY-2026-0DA647"}	certified	cmv11h3rs0021u00ek8fmydu5	2026-10-09 14:06:46.359	2028-10-09 14:06:46.359
\.


--
-- Data for Name: ProductStandardLink; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductStandardLink" (id, "productId", "standardVersionId") FROM stdin;
cmv11ejsk000lu00e7pqaa7so	cmv11ejsi000ju00eblue174u	sv-d96bfa15
\.


--
-- Data for Name: ProductVariant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductVariant" (id, "productId", sku, grade, label) FROM stdin;
cmv11ejsl000nu00e4ogw8obp	cmv11ejsi000ju00eblue174u	SKU-BLUE174U	\N	Cassava flour
\.


--
-- Data for Name: RateLimitBucket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RateLimitBucket" (id, count, "windowStart") FROM stdin;
verify-page:global	9	2026-10-12 06:27:08.972
\.


--
-- Data for Name: Rec; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Rec" (id, code, name) FROM stdin;
rec-eac	EAC	East African Community
rec-sadc-f43d	SADC	SADC
\.


--
-- Data for Name: RoleDefinition; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RoleDefinition" (id, code, name, description, scope, "permissionsJson", "isSystem", "createdAt", "updatedAt") FROM stdin;
role-arso_catalogue_editor	ARSO_CATALOGUE_EDITOR	Catalogue editor	Maintain standards, RECs, and tariff maps only — no org or role admin.	GLOBAL	["standards:read","standards:write","standards:import","standards:preview_full","recs:read","recs:write","tariffs:read","tariffs:write","audit:read"]	t	2026-10-09 09:52:44.871	2026-10-09 09:52:44.871
role-primary_admin	PRIMARY_ADMIN	Organisation primary admin	Owns an organisation; scoped by membership org type.	ORG	["portal:operate"]	t	2026-10-09 09:52:44.872	2026-10-09 09:52:44.872
role-org_admin	ORG_ADMIN	Organisation admin	Administers org users and records within one organisation.	ORG	["portal:operate"]	t	2026-10-09 09:52:44.872	2026-10-09 09:52:44.872
role-org_user	ORG_USER	Organisation user	Day-to-day org access without admin privileges.	ORG	["portal:operate"]	t	2026-10-09 09:52:44.873	2026-10-09 09:52:44.873
role-arso_admin	ARSO_ADMIN	ARSO Administrator	Full hub administration. Use sparingly — breaks least privilege if over-assigned.	GLOBAL	["standards:read","standards:write","standards:delete","standards:import","standards:preview_full","recs:read","recs:write","recs:delete","tariffs:read","tariffs:write","tariffs:delete","cb:read","cb:write","cb:delete","manufacturer:read","manufacturer:write","manufacturer:delete","portal:operate","products:read","products:write","certify:operate","customs:decide","inspect:write","surveillance:operate","impersonate","audit:read","roles:read","roles:write","roles:assign","users:read"]	t	2026-10-09 09:52:44.869	2026-10-09 09:52:44.869
role-arso_support	ARSO_SUPPORT	ARSO Support	Operate and assist; no destructive deletes; can impersonate with reason.	GLOBAL	["standards:read","standards:write","standards:import","standards:preview_full","recs:read","recs:write","tariffs:read","tariffs:write","cb:read","cb:write","manufacturer:read","manufacturer:write","products:read","products:write","certify:operate","customs:decide","inspect:write","surveillance:operate","portal:operate","impersonate","audit:read","roles:read","users:read"]	t	2026-10-09 09:52:44.871	2026-10-09 09:52:44.871
role-arso_auditor	ARSO_AUDITOR	Auditor (read-only)	Read catalogue, orgs, audit trail — no writes.	GLOBAL	["standards:read","standards:preview_full","recs:read","tariffs:read","cb:read","manufacturer:read","products:read","audit:read","roles:read","users:read"]	t	2026-10-09 09:52:44.872	2026-10-09 09:52:44.872
role-customs_officer	CUSTOMS_OFFICER	Customs officer	Border/customs verification — read tariffs and standards only.	ORG	["standards:read","recs:read","tariffs:read","products:read","customs:decide"]	t	2026-10-09 09:52:44.874	2026-10-09 09:52:44.874
role-cb_officer	CB_OFFICER	CB officer	Certification body officer. Registers client manufacturers and importers, the products certified for them, laboratory results against every requirement of the standard, and the certificate.	ORG	["standards:read","recs:read","tariffs:read","cb:read","products:read","products:write","clients:write","certify:operate","portal:operate"]	t	2026-10-09 09:52:44.873	2026-10-09 17:01:26.997
role-inspector	INSPECTOR	Conformity inspector	Checks a product against its one linked standard.	ORG	["standards:read","products:read","inspect:write"]	t	2026-10-09 17:01:26.997	2026-10-09 17:01:26.997
role-surveillance	SURVEILLANCE_OFFICER	Market surveillance officer	Opens market surveillance cases on certified products.	ORG	["standards:read","products:read","surveillance:operate"]	t	2026-10-09 17:01:26.997	2026-10-09 17:01:26.997
\.


--
-- Data for Name: Sanction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sanction" (id, "caseId", level, "cascadesTo", "appliedAt", notes) FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "userId", token, "createdAt", "lastActivityAt", "expiresAt", "impersonatorId", "impersonationReason") FROM stdin;
cmv11cn270003u00ewsvo765p	cmv0sefg8000012mnqep5hc2k	3736a07dfeac178bc31e7cd38d357d49600a28bc54e213911b3005f7f7e57976	2026-10-09 14:03:18.079	2026-10-09 14:03:18.078	2026-10-09 14:13:18.078	\N	\N
cmv0yjltq0004u0vi2fu3ptdn	cmv0sefg8000012mnqep5hc2k	6ad0aab3ba80265ac9d7c9cb9035d980f710d357cd7582e9e0bc753a2d9463bd	2026-10-09 12:44:44.223	2026-10-09 12:55:23.141	2026-10-09 13:05:23.141	\N	\N
cmv0yxpid000eu0vi0v2e8uls	cmv0sefg8000012mnqep5hc2k	dd330d0691624e0a134d7b2b5ab9369aaf54b226f72903948b83f27a981a9597	2026-10-09 12:55:42.181	2026-10-09 12:55:42.18	2026-10-09 13:05:42.18	\N	\N
cmv10jn6d00183f0ryj2yv3fo	cmv0sefg8000012mnqep5hc2k	39424f3287149972c43ab0449582ee50da4ff3dec5c8a7c29ab127aaeab26488	2026-10-09 13:40:45.205	2026-10-09 13:40:45.205	2026-10-09 13:50:45.205	\N	\N
cmv10jqrd001b3f0rx4cpbjba	cmv0sefg8000012mnqep5hc2k	81063474ae9aefca70bb2706635c8b72992e1d6e9488a9fa349f7aaf360ba704	2026-10-09 13:40:49.849	2026-10-09 13:40:49.848	2026-10-09 13:50:49.848	\N	\N
cmv10jt97001e3f0r1se9x3km	cmv0sefg8000012mnqep5hc2k	0cdf8292714c74908609beb8604efed5f48697ae14a2963bc94d2e51afb8b670	2026-10-09 13:40:53.084	2026-10-09 13:40:53.083	2026-10-09 13:50:53.083	\N	\N
cmv10czhh001ku0vix80fkfza	cmv0sefg8000012mnqep5hc2k	2bb183491e5e6a48749acf1f15fe16729fb8845228ef88fc98c30aebde155154	2026-10-09 13:35:34.566	2026-10-09 13:35:34.565	2026-10-09 13:45:34.565	\N	\N
cmv10k03e001k3f0rypftypzg	cmv0sefg8000012mnqep5hc2k	2709938d4bdada19c4a65209315d0de6d6965f0c868eaff5b5989ed4be3ae5b4	2026-10-09 13:41:01.946	2026-10-09 13:41:12.595	2026-10-09 13:51:12.595	\N	\N
cmv4vey320033u00eh0ewf4av	cmv0sefg8000012mnqep5hc2k	6e02496574571aa90a04b7265f4957480af0547f792d4656677b125109e143d2	2026-10-12 06:28:12.687	2026-10-12 06:28:12.686	2026-10-12 06:38:12.686	\N	\N
\.


--
-- Data for Name: Standard; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Standard" (id, designation, "titleEn", "titleFr", "titlePt", "titleAr", ics, publisher) FROM stdin;
std-ars-838-a0a4	ARS 838	Cassava flour — Specification	\N	\N	\N	67.060	ARSO
std-ars-1093-451f	ARS 1093	Butter — Specification	\N	\N	\N	67.060	ARSO
\.


--
-- Data for Name: StandardEntitlement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StandardEntitlement" (id, "orderId", "buyerEmail", "catalogItemId", "grantedAt", "artifactUri", "watermarkText") FROM stdin;
cmv0zcu970014u0viodukx0sr	cmv0zcu6s000zu0vim3l9htmi	buyer@example.com	cmv0zbqf7000xu0vi9pxoxkg2	2026-10-09 13:07:28.171	/artifacts/purchased-cmv0zcu6s000zu0vim3l9htmi.pdf	Licensed to Trade Buyer <buyer@example.com> · Order cmv0zcu6s000zu0vim3l9htmi
cmv4ux56o002wu00e4sazqz6t	cmv4ux542002ru00epd74xidp	buyer@example.com	cmv4uty3c002pu00eksmvuidu	2026-10-12 06:14:22.08	/artifacts/purchased-cmv4ux542002ru00epd74xidp.pdf	Licensed to Trade Buyer <buyer@example.com> · Order cmv4ux542002ru00epd74xidp
cmv4x2y2y000gqqz5xr0lxpe1	cmv4x283i000aqqz5mcoyxpf2	jerutom@arso-oran.org	cmv4uty3c002pu00eksmvuidu	2026-10-12 07:14:52.043	/artifacts/purchased-cmv4x283i000aqqz5mcoyxpf2.pdf	Licensed to Jeruto Masiror <jerutom@arso-oran.org> · Order cmv4x283i000aqqz5mcoyxpf2
\.


--
-- Data for Name: StandardTariffMap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StandardTariffMap" (id, "standardVersionId", "tariffLineId", "mappingEffect", "overrideMode", "effectiveFrom", notes) FROM stdin;
map-bd66a71c	sv-d96bfa15	tl-eac-11062020-7cb3	include	\N	2026-10-09 13:06:36.559	\N
map-eede955d	sv-c7820298	tl-sadc-04051010-ee89	include	\N	2026-10-12 06:22:48.867	\N
map-0fd014b7	sv-c7820298	tl-eac-04051000-bdc5	include	\N	2026-10-12 06:22:48.868	\N
\.


--
-- Data for Name: StandardVersion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StandardVersion" (id, "standardId", "editionLabel", year, "effectiveFrom", "publicationStatus", "authoritativeLocale", "sourcePdfUri", "contentHash", "scopeEn", "machineDocJson", "requirementsJson", "normativeRefsJson", "packagingJson", "labellingJson", "samplingJson") FROM stdin;
sv-d96bfa15	std-ars-838-a0a4	ARS 838:2025	2025	2026-10-09 00:00:00	PUBLISHED	en	/uploads/standards/1791551196536-fba61c-ARS_838-2025_Cassava_flour_-_Specification__1_.pdf	sha256:fb29db3fb33c8607658e12f5d166839af8a72d90b40edbcc0e238648ee5919e8	Scope\nThis African Standard specifies requirements, sampling and test methods for cassava flour,\nwhich is obtained from the processing of cassava (Manihot esculenta Crantz) intended for human\nconsumption.	{"standard":{"designation":"ARS 838","title":{"en":"Cassava flour — Specification"},"ics":["67.060"],"publisher":"ARSO"},"version":{"year":2025,"editionLabel":"ARS 838:2025","effectiveFrom":"2026-10-09","publicationStatus":"DRAFT_IMPORT","authoritativeLocale":"en","sourcePdfUri":"/uploads/standards/1791551196536-fba61c-ARS_838-2025_Cassava_flour_-_Specification__1_.pdf"},"scope":{"text":{"en":"Scope\\nThis African Standard specifies requirements, sampling and test methods for cassava flour,\\nwhich is obtained from the processing of cassava (Manihot esculenta Crantz) intended for human\\nconsumption."}},"normativeReferences":[{"designation":"Normative references","raw":"Normative references"},{"designation":"The following referenced documents referred to in the text in su","raw":"The following referenced documents referred to in the text in such a way that some or all of their"},{"designation":"content constitutes requirements of this document. For dated ref","raw":"content constitutes requirements of this document. For dated references, only the edition cited"},{"designation":"applies. For undated references, the latest edition of the refer","raw":"applies. For undated references, the latest edition of the referenced document (including any"},{"designation":"amendments) applies.","raw":"amendments) applies."},{"designation":"ARS 53","title":"General principles of food hygiene — Code of practice","raw":"ARS 53, General principles of food hygiene — Code of practice"},{"designation":"ARS 56","title":"Prepackaged foods — Labelling","raw":"ARS 56, Prepackaged foods — Labelling"},{"designation":"ARS 844","title":"2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic","raw":"ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic"},{"designation":"assay method","raw":"assay method"},{"designation":"CXS 192, General standard for food additives","raw":"CXS 192, General standard for food additives"},{"designation":"Codex general","title":"CXS 193,  standard for contaminants and toxins in food and feed","raw":"CXS 193, Codex general standard for contaminants and toxins in food and feed"},{"designation":"ISO 712","title":"Cereals and cereal products — Determination of moisture content — Reference method","raw":"ISO 712, Cereals and cereal products — Determination of moisture content — Reference method"},{"designation":"ISO 3588","title":"Spices and condiments — Determination of degree of fineness of grinding — Hand sieving","raw":"ISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving"},{"designation":"method (Reference method)","raw":"method (Reference method)"},{"designation":"ISO 6579","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the detection of","raw":"ISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of"},{"designation":"Salmonella spp.","raw":"Salmonella spp."},{"designation":"ISO 7251","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the detection and","raw":"ISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and"},{"designation":"enumeration","title":"of presumptive Escherichia coli — Most probable number technique","raw":"enumeration of presumptive Escherichia coli — Most probable number technique"},{"designation":"ISO 15914","title":"Animal feeding stuffs — Enzymatic determination of total starch content","raw":"ISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content"},{"designation":"ISO 24333","title":"Cereals and cereal products — Sampling","raw":"ISO 24333, Cereals and cereal products — Sampling"},{"designation":"ISO 21527-2","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the","raw":"ISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the"},{"designation":"enumeration","title":"of yeasts and moulds — Part 2: Colony count technique in products with water activity","raw":"enumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity"},{"designation":"less than or equal to 0.95","raw":"less than or equal to 0.95"},{"designation":"ISO 4833","title":"Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms","raw":"ISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms"},{"designation":"-- Part 1: Colony count at 30 degrees C by the pour plate techni","raw":"-- Part 1: Colony count at 30 degrees C by the pour plate technique"},{"designation":"ISO 7251","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the detection and","raw":"ISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and"},{"designation":"enumeration","title":"of presumptive Escherichia coli — Most probable number technique","raw":"enumeration of presumptive Escherichia coli — Most probable number technique"},{"designation":"Terms and definitions","raw":"Terms and definitions"},{"designation":"For the purpose of this document, the following terms and defini","raw":"For the purpose of this document, the following terms and definitions apply."},{"designation":"AFRICAN STANDARD","raw":"AFRICAN STANDARD"},{"designation":"ARS 838","title":"2025 (E)","raw":"ARS 838:2025 (E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"cassava flour","raw":"cassava flour"},{"designation":"product prepared from dried cassava chips or paste by pounding, ","raw":"product prepared from dried cassava chips or paste by pounding, grinding or milling followed by"},{"designation":"sifting to separate the fibre from the flour","raw":"sifting to separate the fibre from the flour"},{"designation":"detoxification","raw":"detoxification"},{"designation":"process of reducing cyanide on a fresh weight basis to acceptabl","raw":"process of reducing cyanide on a fresh weight basis to acceptable level described under 4.2"},{"designation":"filth","raw":"filth"},{"designation":"impurities of animal origin (including dead insects)","raw":"impurities of animal origin (including dead insects)"},{"designation":"food grade material","raw":"food grade material"},{"designation":"material which will safeguard the hygienic, nutritional, technol","raw":"material which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the"},{"designation":"product. Material that will not transfer non-food chemicals into","raw":"product. Material that will not transfer non-food chemicals into the food and contains no chemicals"},{"designation":"which would be hazardous to human health.","raw":"which would be hazardous to human health."},{"designation":"Packaging material made of substances which are safe and suitabl","raw":"Packaging material made of substances which are safe and suitable for the intended use and which"},{"designation":"will not impart any toxic substance or undesirable odour to the ","raw":"will not impart any toxic substance or undesirable odour to the product."},{"designation":"foreign matter","raw":"foreign matter"},{"designation":"all organic and inorganic materials (such as sand, soil, glass)","raw":"all organic and inorganic materials (such as sand, soil, glass)"},{"designation":"practically free","raw":"practically free"},{"designation":"product without defects in excess of those that can be expected ","raw":"product without defects in excess of those that can be expected to result from, and be consistent with"},{"designation":"good cultural and handling practices employed in the production ","raw":"good cultural and handling practices employed in the production and marketing of the fresh cassava"},{"designation":"Requirements","raw":"Requirements"},{"designation":"Raw materials","raw":"Raw materials"},{"designation":"The raw material shall be dried cassava chips, paste, crumbs or ","raw":"The raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the"},{"designation":"relevant African standards.","raw":"relevant African standards."},{"designation":"General requirements","raw":"General requirements"},{"designation":"Cassava flour shall be:","raw":"Cassava flour shall be:"},{"designation":"a) practically free from filth;","raw":"a) practically free from filth;"},{"designation":"b) free of off flavours and odours:","raw":"b) free of off flavours and odours:"},{"designation":"c) practically free from any living insects and foreign matter:","raw":"c) practically free from any living insects and foreign matter:"},{"designation":"d) safe and suitable for human consumption: and","raw":"d) safe and suitable for human consumption: and"},{"designation":"e) have colour characteristic of the variety.","raw":"e) have colour characteristic of the variety."},{"designation":"NOTE","raw":"NOTE"},{"designation":"The colour of cassava is usually white, creamy or yellow. The ye","raw":"The colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in"},{"designation":"carotenes.","raw":"carotenes."},{"designation":"Specific requirements","raw":"Specific requirements"},{"designation":"Cassava flour shall comply with the specific requirements given ","raw":"Cassava flour shall comply with the specific requirements given in Table 1 when tested in accordance"},{"designation":"with the test methods specified therein.","raw":"with the test methods specified therein."},{"designation":"ARS 838","title":"2025(E)","raw":"ARS 838:2025(E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Table 1 — Compositional requirements for cassava flour","raw":"Table 1 — Compositional requirements for cassava flour"},{"designation":"Parameter","raw":"Parameter"},{"designation":"Requirement","raw":"Requirement"},{"designation":"Test method","raw":"Test method"},{"designation":"Moisture content, % by mass, max.","raw":"Moisture content, % by mass, max."},{"designation":"13.0","raw":"13.0"},{"designation":"ISO 712","raw":"ISO 712"},{"designation":"Acid insoluble ash, % m/m, dry matter basis max.","raw":"Acid insoluble ash, % m/m, dry matter basis max."},{"designation":"0.60","raw":"0.60"},{"designation":"Annex A","raw":"Annex A"},{"designation":"iii.","raw":"iii."},{"designation":"Starch (on dry basis), % by mass, Min","raw":"Starch (on dry basis), % by mass, Min"},{"designation":"60.0","raw":"60.0"},{"designation":"ISO 15914","raw":"ISO 15914"},{"designation":"Hydrogen cyanide, mg/kg or ppm","raw":"Hydrogen cyanide, mg/kg or ppm"},{"designation":"10.0","raw":"10.0"},{"designation":"ARS 844","title":"2016","raw":"ARS 844:2016"},{"designation":"Total acidity, % m/m, max","raw":"Total acidity, % m/m, max"},{"designation":"Annex B","raw":"Annex B"},{"designation":"Specific quality factors","raw":"Specific quality factors"},{"designation":"4.4.1","raw":"4.4.1"},{"designation":"Particle size","raw":"Particle size"},{"designation":"Not less than 90 % shall pass through a 600 µm sieve for “fine c","raw":"Not less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %"},{"designation":"shall pass through a 1200 µm sieve for “coarse cassava flour”. T","raw":"shall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done"},{"designation":"ISO 3588.","title":"in accordance with","raw":"in accordance with ISO 3588."},{"designation":"Cassava flour intended for baking purposes shall have particle s","raw":"Cassava flour intended for baking purposes shall have particle size of which not less than 90 % shall"},{"designation":"pass through a 250 µm sieve.","raw":"pass through a 250 µm sieve."},{"designation":"4.4.2","raw":"4.4.2"},{"designation":"Hydrocyanic acid content","raw":"Hydrocyanic acid content"},{"designation":"ARS 844","title":"When tested in accordance with :2016, the total hydrocyanic acid content of cassava flour","raw":"When tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour"},{"designation":"shall not exceed 10 mg/kg.","raw":"shall not exceed 10 mg/kg."},{"designation":"Food additives","raw":"Food additives"},{"designation":"Food additives may be used in the preparation of cassava flour i","raw":"Food additives may be used in the preparation of cassava flour in accordance with CXS 192."},{"designation":"Cassava flour may be fortified with vitamins or micronutrients i","raw":"Cassava flour may be fortified with vitamins or micronutrients if so permitted."},{"designation":"Contaminants","raw":"Contaminants"},{"designation":"Pesticide residues","raw":"Pesticide residues"},{"designation":"Cassava flour shall conform to maximum residue limits for pestic","raw":"Cassava flour shall conform to maximum residue limits for pesticide residues established by the"},{"designation":"Codex Alimentarius","title":"Commission for this commodity.","raw":"Codex Alimentarius Commission for this commodity."},{"designation":"Heavy metals","raw":"Heavy metals"},{"designation":"Cassava flour shall comply with those maximum levels for heavy m","raw":"Cassava flour shall comply with those maximum levels for heavy metal contaminants established by"},{"designation":"Codex Alimentarius","title":"the  Commission for this commodity.","raw":"the Codex Alimentarius Commission for this commodity."},{"designation":"Other contaminants","raw":"Other contaminants"},{"designation":"Cassava flour shall comply with those maximum limits for other c","raw":"Cassava flour shall comply with those maximum limits for other contaminants established in CXS 193."},{"designation":"Hygiene","raw":"Hygiene"},{"designation":"ARS 53","title":"Cassava flour shall be prepared and handled in a hygienic manner in accordance with  and","raw":"Cassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and"},{"designation":"shall comply with the microbiological limits given in Table 2.","raw":"shall comply with the microbiological limits given in Table 2."},{"designation":"ARS 838","title":"2025 (E)","raw":"ARS 838:2025 (E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Table 2 — Microbiological limits for cassava flour","raw":"Table 2 — Microbiological limits for cassava flour"},{"designation":"Micro-organism","raw":"Micro-organism"},{"designation":"Requirement","raw":"Requirement"},{"designation":"Test method","raw":"Test method"},{"designation":"Total viable count, cfu/g, max.","raw":"Total viable count, cfu/g, max."},{"designation":"ISO 4833","raw":"ISO 4833"},{"designation":"Escherichia coli, cfu/g, max.","raw":"Escherichia coli, cfu/g, max."},{"designation":"Absent","raw":"Absent"},{"designation":"ISO 7251","raw":"ISO 7251"},{"designation":"iii.","raw":"iii."},{"designation":"Salmonella, 25 g, max.","raw":"Salmonella, 25 g, max."},{"designation":"Absent","raw":"Absent"},{"designation":"ISO 6579","raw":"ISO 6579"},{"designation":"Yeasts and moulds, cfu/g, max.","raw":"Yeasts and moulds, cfu/g, max."},{"designation":"ISO 21527-2","raw":"ISO 21527-2"},{"designation":"Packaging","raw":"Packaging"},{"designation":"Cassava flour shall be packaged in food grade material","raw":"Cassava flour shall be packaged in food grade material"},{"designation":"The net weight of the packages for cassava flour may be required","raw":"The net weight of the packages for cassava flour may be required to meet the relevant"},{"designation":"regulations of the destination country.","raw":"regulations of the destination country."},{"designation":"Marking and labelling","raw":"Marking and labelling"},{"designation":"ARS 56","title":"In addition to the requirements of , cassava flour shall be legibly and indelibly labelled","raw":"In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled"},{"designation":"with the following information:","raw":"with the following information:"},{"designation":"Name of the product shall be “Cassava flour” and the terms “Fine","raw":"Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance"},{"designation":"with 4.4, shall appear in close proximity to the name of the pro","raw":"with 4.4, shall appear in close proximity to the name of the product;"},{"designation":"Name, location and address of the manufacturer and/or packer sha","raw":"Name, location and address of the manufacturer and/or packer shall be declared and/or brand"},{"designation":"name / trade name.;","raw":"name / trade name.;"},{"designation":"Date of manufacture;","raw":"Date of manufacture;"},{"designation":"Lot identification;","raw":"Lot identification;"},{"designation":"Best before date;","raw":"Best before date;"},{"designation":"Country of origin shall be declared;","raw":"Country of origin shall be declared;"},{"designation":"Net contents shall be declared by weight in metric (‘Systeme Int","raw":"Net contents shall be declared by weight in metric (‘Systeme International’) units;"},{"designation":"The statement ‘food for human consumption’;","raw":"The statement ‘food for human consumption’;"},{"designation":"Storage instructions; and","raw":"Storage instructions; and"},{"designation":"Instructions on disposal of used package.","raw":"Instructions on disposal of used package."},{"designation":"When labelling non-retail packages, information for non-retail p","raw":"When labelling non-retail packages, information for non-retail packages shall either be given"},{"designation":"on the packages or in accompanying documents, except that the na","raw":"on the packages or in accompanying documents, except that the name of the product, lot"},{"designation":"identification and the name and address of the manufacturer or p","raw":"identification and the name and address of the manufacturer or packer shall appear on the packages."},{"designation":"Sampling","raw":"Sampling"},{"designation":"ISO 24333.","title":"Sampling shall be done in accordance with","raw":"Sampling shall be done in accordance with ISO 24333."},{"designation":"ARS 838","title":"2025(E)","raw":"ARS 838:2025(E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Annex A","raw":"Annex A"},{"designation":"(normative)","raw":"(normative)"},{"designation":"Determination of acid insoluble ash","raw":"Determination of acid insoluble ash"},{"designation":"Reagent","raw":"Reagent"},{"designation":"A.1.1","raw":"A.1.1"},{"designation":"Dilute hydrochloric acid, 1:1, prepared from concentrated hydroc","raw":"Dilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid"},{"designation":"Procedure","raw":"Procedure"},{"designation":"A.2.1","raw":"A.2.1"},{"designation":"Weigh accurately about 2 g of the dried material in a tared porc","raw":"Weigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish."},{"designation":"Ignite with a meker burner for about 1 h. Complete the Ignition ","raw":"Ignite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500"},{"designation":"°C to 570 °C until grey ash results.","raw":"°C to 570 °C until grey ash results."},{"designation":"Cool and filter through whatman filter paper No. 42 or its equiv","raw":"Cool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water"},{"designation":"until the washings are free from chlorides as tested with silver","raw":"until the washings are free from chlorides as tested with silver nitrate solution and return the filter"},{"designation":"paper and residue to the dish. Keep it in an electric air oven m","raw":"paper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h."},{"designation":"Ignite the dish again for about 30 min, cool and weigh. Repeat t","raw":"Ignite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between"},{"designation":"two successive weighings is less than 1 mg. Note the lowest weig","raw":"two successive weighings is less than 1 mg. Note the lowest weight."},{"designation":"Calculation","raw":"Calculation"},{"designation":"A.3.1","raw":"A.3.1"},{"designation":"Acid insoluble ash, per cent by weight","raw":"Acid insoluble ash, per cent by weight"},{"designation":"where","raw":"where"},{"designation":"is the lowest weight, in g, of the dish with the acid insoluble ","raw":"is the lowest weight, in g, of the dish with the acid insoluble ash;"},{"designation":"is the weight, in g, of the empty dish; and","raw":"is the weight, in g, of the empty dish; and"},{"designation":"is the weight, in g, of the dish with the dried product taken fo","raw":"is the weight, in g, of the dish with the dried product taken for the test."},{"designation":"ARS 838","title":"2025 (E)","raw":"ARS 838:2025 (E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Annex B","raw":"Annex B"},{"designation":"(normative)","raw":"(normative)"},{"designation":"Determination of total acidity (water extract method)","raw":"Determination of total acidity (water extract method)"},{"designation":"Shake 18 g of the sample with 200 ml of CO2 free water in a coni","raw":"Shake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"}],"requirements":[{"id":"FULL-BODY","clause":"body","text":"AFRICAN\\nSTANDARD\\nARS\\n838\\nSecond Edition 2025\\n\\nReference No. ARS 838:2025(E)\\nICS 67.080.20\\n\\n© ARSO 2025\\n\\nCassava flour — Specification\\n\\nARS 838:2025\\nii\\n© ARSO 2025 — All rights reserved\\n\\nTable of contents\\n\\n1\\nScope ............................................................................................................................................. 1\\n2\\nNormative references ..................................................................................................................... 1\\n3\\nTerms and definitions ................................................................................................................. 1\\n4\\nRequirements ................................................................................................................................. 2\\n4.1\\nRaw materials ........................................................................................................................ 2\\n4.2\\nGeneral requirements ............................................................................................................ 2\\n4.3\\nSpecific requirements ............................................................................................................ 2\\n4.4\\nSpecific quality factors ........................................................................................................... 3\\n5\\nFood additives ................................................................................................................................ 3\\n6\\nContaminants ................................................................................................................................. 3\\n6.1\\nPesticide residues .................................................................................................................. 3\\n6.2\\nHeavy metals ......................................................................................................................... 3\\n6.3\\nOther contaminants ............................................................................................................... 3\\n7\\nHygiene .......................................................................................................................................... 3\\n8\\nPackaging ....................................................................................................................................... 4\\n9\\nMarking and labelling ..................................................................................................................... 4\\n10\\nSampling .................................................................................................................................... 4\\nAnnex A (normative)  Determination of acid insoluble ash ..................................................................... 5\\nAnnex B (normative)  Determination of total acidity (water extract method) .......................................... 6\\nBibliography ............................................................................................................................................ 7\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved\\niii\\n\\nForeword\\n\\nThe African Organization for Standardization (ARS) is an African intergovernmental organization\\nmade up of the United Nations Economic Commission for Africa (UNECA) and the Organization of\\nAfrican Unity (AU). One of the fundamental mandates of ARSO is to develop and harmonize African\\nStandards (ARS) for the purpose of enhancing Africa’s internal trading capacity, increase Africa’s\\nproduct and service competitiveness globally and uplift the welfare of African communities. The work\\nof preparing African Standards is normally carried out through ARSO technical committees. Each\\nMember State interested in a subject for which a technical committee has been established has the\\nright to be represented on that committee. International organizations, Regional Economic\\nCommunities (RECs), governmental and non-governmental organizations, in liaison with ARSO, also\\ntake part in the work.\\n\\nARSO Standards are drafted in accordance with the rules given in the ISO/IEC Directives, Part 2.\\n\\nThe main task of technical committees is to prepare ARSO Standards. Draft ARSO Standards\\nadopted by the technical committees are circulated to the member bodies for voting. Publication as an\\nARSO Standard requires approval by at least 75 % of the member bodies casting a vote.\\n\\nAttention is drawn to the possibility that some of the elements of this document may be the subject of\\npatent rights. ARSO shall not be held responsible for identifying any or all such patent rights.\\n\\nThis African Standard was prepared by the ARSO Technical Harmonization Committee on Agriculture\\nand Food Products (ARSO/THC 02).\\n\\n© African Organisation for Standardisation 2025 — All rights reserved*\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP. O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel. +254-20-2224561, +254-20-311641, +254-20-311608\\nFax: +254-20-218792\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\n* © 2024 ARSO — All rights of exploitation reserved worldwide for African Member States’ NSBs.\\n\\nARS 838:2025\\niv\\n© ARSO 2025 — All rights reserved\\n\\nCopyright notice\\n\\nThis ARSO document is copyright-protected by ARSO. While the reproduction of this document\\nby participants in the ARSO standards development process is permitted without prior\\npermission from ARSO, neither this document nor any extract from it may be reproduced, stored\\nor transmitted in any form for any other purpose without prior written permission from ARSO.\\n\\nRequests for permission to reproduce this document for the purpose of selling it should be\\naddressed as shown below or to ARSO’s member body in the country of the requester:\\n\\n© African Organisation for Standardisation 2025 — All rights reserved\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP.O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel: +254-20-2224561, +254-20-311641, +254-20-311608\\nFax: +254-20-218792\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\nReproduction for sales purposes may be subject to royalty payments or a licensing agreement.\\nViolators may be prosecuted.\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved\\nv\\n\\nIntroduction\\n\\nThe development of this standard has been necessitated by the increasing role of cassava and\\ncassava products for food security and commercial concerns in Africa. The standard intends to\\nsafeguard the interests of the stakeholders and also guarantee enhanced safety of the consumers.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n1\\nCassava flour — Specification\\n1\\nScope\\nThis African Standard specifies requirements, sampling and test methods for cassava flour,\\nwhich is obtained from the processing of cassava (Manihot esculenta Crantz) intended for human\\nconsumption.\\n2\\nNormative references\\nThe following referenced documents referred to in the text in such a way that some or all of their\\ncontent constitutes requirements of this document. For dated references, only the edition cited\\napplies. For undated references, the latest edition of the referenced document (including any\\namendments) applies.\\nARS 53, General principles of food hygiene — Code of practice\\nARS 56, Prepackaged foods — Labelling\\n ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic\\nassay method\\nCXS 192, General standard for food additives\\nCXS 193, Codex general standard for contaminants and toxins in food and feed\\nISO 712, Cereals and cereal products — Determination of moisture content — Reference method\\nISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving\\nmethod (Reference method)\\nISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of\\nSalmonella spp.\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\nISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content\\nISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at\\n40 C for 1 h (with the flask loosely stoppered). Filter and titrate 100 ml of the clear filtrate with 0.05 M\\nNaOH solution with phenolphthalein indicator. The acidity of the water extract increases during\\nstorage. 1 ml of 0.1 M NaOH = 0.009 g CH2H6O3 (lactic acid).\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n7\\n\\nBibliography\\n\\nCODEX STAN 176:1989 (Rev. 1995), Standard for Edible Cassava Flour\\n\\nEAS 740:2010, Cassava flour — Specification\\n\\nNigerian Industrial Standard, NIS 344:2004, Standard for edible cassava flour\\n\\nMalawi Standard, MS 349:2002, Edible cassava flour\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved"}],"packaging":{"text":"Packaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"},"labelling":{"text":"ARS 56, Prepackaged foods — Labelling\\n ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic\\nassay method\\nCXS 192, General standard for food additives\\nCXS 193, Codex general standard for contaminants and toxins in food and feed\\nISO 712, Cereals and cereal products — Determination of moisture content — Reference method\\nISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving\\nmethod (Reference method)\\nISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of\\nSalmonella spp.\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\nISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content\\nISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"},"sampling":{"text":"ISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"},"contaminants":{"text":"CXS 193, Codex general standard for contaminants and toxins in food and feed\\nISO 712, Cereals and cereal products — Determination of moisture content — Reference method\\nISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving\\nmethod (Reference method)\\nISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of\\nSalmonella spp.\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\nISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content\\nISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"},"hygiene":{"text":"ARS 53, General principles of food hygiene — Code of practice\\nARS 56, Prepackaged foods — Labelling\\n ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic\\nassay method\\nCXS 192, General standard for food additives\\nCXS 193, Codex general standard for contaminants and toxins in food and feed\\nISO 712, Cereals and cereal products — Determination of moisture content — Reference method\\nISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving\\nmethod (Reference method)\\nISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of\\nSalmonella spp.\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\nISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content\\nISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"},"definitions":{"text":"Terms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"},"clauses":[{"number":"40","title":"C for 1 h (with the flask loosely stoppered). Filter and titrate 100 ml of the clear filtrate with 0.05 M","body":"NaOH solution with phenolphthalein indicator. The acidity of the water extract increases during\\nstorage. 1 ml of 0.1 M NaOH = 0.009 g CH2H6O3 (lactic acid).\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n7\\n\\nBibliography\\n\\nCODEX STAN 176:1989 (Rev. 1995), Standard for Edible Cassava Flour\\n\\nEAS 740:2010, Cassava flour — Specification\\n\\nNigerian Industrial Standard, NIS 344:2004, Standard for edible cassava flour\\n\\nMalawi Standard, MS 349:2002, Edible cassava flour\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved"}],"fullText":"AFRICAN\\nSTANDARD\\nARS\\n838\\nSecond Edition 2025\\n\\nReference No. ARS 838:2025(E)\\nICS 67.080.20\\n\\n© ARSO 2025\\n\\nCassava flour — Specification\\n\\nARS 838:2025\\nii\\n© ARSO 2025 — All rights reserved\\n\\nTable of contents\\n\\n1\\nScope ............................................................................................................................................. 1\\n2\\nNormative references ..................................................................................................................... 1\\n3\\nTerms and definitions ................................................................................................................. 1\\n4\\nRequirements ................................................................................................................................. 2\\n4.1\\nRaw materials ........................................................................................................................ 2\\n4.2\\nGeneral requirements ............................................................................................................ 2\\n4.3\\nSpecific requirements ............................................................................................................ 2\\n4.4\\nSpecific quality factors ........................................................................................................... 3\\n5\\nFood additives ................................................................................................................................ 3\\n6\\nContaminants ................................................................................................................................. 3\\n6.1\\nPesticide residues .................................................................................................................. 3\\n6.2\\nHeavy metals ......................................................................................................................... 3\\n6.3\\nOther contaminants ............................................................................................................... 3\\n7\\nHygiene .......................................................................................................................................... 3\\n8\\nPackaging ....................................................................................................................................... 4\\n9\\nMarking and labelling ..................................................................................................................... 4\\n10\\nSampling .................................................................................................................................... 4\\nAnnex A (normative)  Determination of acid insoluble ash ..................................................................... 5\\nAnnex B (normative)  Determination of total acidity (water extract method) .......................................... 6\\nBibliography ............................................................................................................................................ 7\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved\\niii\\n\\nForeword\\n\\nThe African Organization for Standardization (ARS) is an African intergovernmental organization\\nmade up of the United Nations Economic Commission for Africa (UNECA) and the Organization of\\nAfrican Unity (AU). One of the fundamental mandates of ARSO is to develop and harmonize African\\nStandards (ARS) for the purpose of enhancing Africa’s internal trading capacity, increase Africa’s\\nproduct and service competitiveness globally and uplift the welfare of African communities. The work\\nof preparing African Standards is normally carried out through ARSO technical committees. Each\\nMember State interested in a subject for which a technical committee has been established has the\\nright to be represented on that committee. International organizations, Regional Economic\\nCommunities (RECs), governmental and non-governmental organizations, in liaison with ARSO, also\\ntake part in the work.\\n\\nARSO Standards are drafted in accordance with the rules given in the ISO/IEC Directives, Part 2.\\n\\nThe main task of technical committees is to prepare ARSO Standards. Draft ARSO Standards\\nadopted by the technical committees are circulated to the member bodies for voting. Publication as an\\nARSO Standard requires approval by at least 75 % of the member bodies casting a vote.\\n\\nAttention is drawn to the possibility that some of the elements of this document may be the subject of\\npatent rights. ARSO shall not be held responsible for identifying any or all such patent rights.\\n\\nThis African Standard was prepared by the ARSO Technical Harmonization Committee on Agriculture\\nand Food Products (ARSO/THC 02).\\n\\n© African Organisation for Standardisation 2025 — All rights reserved*\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP. O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel. +254-20-2224561, +254-20-311641, +254-20-311608\\nFax: +254-20-218792\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\n* © 2024 ARSO — All rights of exploitation reserved worldwide for African Member States’ NSBs.\\n\\nARS 838:2025\\niv\\n© ARSO 2025 — All rights reserved\\n\\nCopyright notice\\n\\nThis ARSO document is copyright-protected by ARSO. While the reproduction of this document\\nby participants in the ARSO standards development process is permitted without prior\\npermission from ARSO, neither this document nor any extract from it may be reproduced, stored\\nor transmitted in any form for any other purpose without prior written permission from ARSO.\\n\\nRequests for permission to reproduce this document for the purpose of selling it should be\\naddressed as shown below or to ARSO’s member body in the country of the requester:\\n\\n© African Organisation for Standardisation 2025 — All rights reserved\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP.O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel: +254-20-2224561, +254-20-311641, +254-20-311608\\nFax: +254-20-218792\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\nReproduction for sales purposes may be subject to royalty payments or a licensing agreement.\\nViolators may be prosecuted.\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved\\nv\\n\\nIntroduction\\n\\nThe development of this standard has been necessitated by the increasing role of cassava and\\ncassava products for food security and commercial concerns in Africa. The standard intends to\\nsafeguard the interests of the stakeholders and also guarantee enhanced safety of the consumers.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n1\\nCassava flour — Specification\\n1\\nScope\\nThis African Standard specifies requirements, sampling and test methods for cassava flour,\\nwhich is obtained from the processing of cassava (Manihot esculenta Crantz) intended for human\\nconsumption.\\n2\\nNormative references\\nThe following referenced documents referred to in the text in such a way that some or all of their\\ncontent constitutes requirements of this document. For dated references, only the edition cited\\napplies. For undated references, the latest edition of the referenced document (including any\\namendments) applies.\\nARS 53, General principles of food hygiene — Code of practice\\nARS 56, Prepackaged foods — Labelling\\n ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic\\nassay method\\nCXS 192, General standard for food additives\\nCXS 193, Codex general standard for contaminants and toxins in food and feed\\nISO 712, Cereals and cereal products — Determination of moisture content — Reference method\\nISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving\\nmethod (Reference method)\\nISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of\\nSalmonella spp.\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\nISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content\\nISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at\\n40 C for 1 h (with the flask loosely stoppered). Filter and titrate 100 ml of the clear filtrate with 0.05 M\\nNaOH solution with phenolphthalein indicator. The acidity of the water extract increases during\\nstorage. 1 ml of 0.1 M NaOH = 0.009 g CH2H6O3 (lactic acid).\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n7\\n\\nBibliography\\n\\nCODEX STAN 176:1989 (Rev. 1995), Standard for Edible Cassava Flour\\n\\nEAS 740:2010, Cassava flour — Specification\\n\\nNigerian Industrial Standard, NIS 344:2004, Standard for edible cassava flour\\n\\nMalawi Standard, MS 349:2002, Edible cassava flour\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved","fidelity":{"principles":["No omission of normative clauses, requirements, limits, units, or test methods.","Preserve Table / figure / annex content that carries requirements (e.g. Table 1 grades).","Preserve packaging, labelling, hygiene, contaminants, and sampling provisions.","Record content_hash over the full machine document for integrity checks.","Flag translationLocale gaps; never silently drop non-authoritative locales.","Public preview may show title + TOC + Clause 1 Scope only — that is access control, not omission from the stored machine pack."],"criticalDomains":["public_health","food_safety","occupational_safety","environment","consumer_protection"],"extractionMethod":"pymupdf-text","omittedNormativeContent":false,"humanReviewRequired":true},"contentHash":"sha256:fb29db3fb33c8607658e12f5d166839af8a72d90b40edbcc0e238648ee5919e8"}	[{"id":"FULL-BODY","clause":"body","text":"AFRICAN\\nSTANDARD\\nARS\\n838\\nSecond Edition 2025\\n\\nReference No. ARS 838:2025(E)\\nICS 67.080.20\\n\\n© ARSO 2025\\n\\nCassava flour — Specification\\n\\nARS 838:2025\\nii\\n© ARSO 2025 — All rights reserved\\n\\nTable of contents\\n\\n1\\nScope ............................................................................................................................................. 1\\n2\\nNormative references ..................................................................................................................... 1\\n3\\nTerms and definitions ................................................................................................................. 1\\n4\\nRequirements ................................................................................................................................. 2\\n4.1\\nRaw materials ........................................................................................................................ 2\\n4.2\\nGeneral requirements ............................................................................................................ 2\\n4.3\\nSpecific requirements ............................................................................................................ 2\\n4.4\\nSpecific quality factors ........................................................................................................... 3\\n5\\nFood additives ................................................................................................................................ 3\\n6\\nContaminants ................................................................................................................................. 3\\n6.1\\nPesticide residues .................................................................................................................. 3\\n6.2\\nHeavy metals ......................................................................................................................... 3\\n6.3\\nOther contaminants ............................................................................................................... 3\\n7\\nHygiene .......................................................................................................................................... 3\\n8\\nPackaging ....................................................................................................................................... 4\\n9\\nMarking and labelling ..................................................................................................................... 4\\n10\\nSampling .................................................................................................................................... 4\\nAnnex A (normative)  Determination of acid insoluble ash ..................................................................... 5\\nAnnex B (normative)  Determination of total acidity (water extract method) .......................................... 6\\nBibliography ............................................................................................................................................ 7\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved\\niii\\n\\nForeword\\n\\nThe African Organization for Standardization (ARS) is an African intergovernmental organization\\nmade up of the United Nations Economic Commission for Africa (UNECA) and the Organization of\\nAfrican Unity (AU). One of the fundamental mandates of ARSO is to develop and harmonize African\\nStandards (ARS) for the purpose of enhancing Africa’s internal trading capacity, increase Africa’s\\nproduct and service competitiveness globally and uplift the welfare of African communities. The work\\nof preparing African Standards is normally carried out through ARSO technical committees. Each\\nMember State interested in a subject for which a technical committee has been established has the\\nright to be represented on that committee. International organizations, Regional Economic\\nCommunities (RECs), governmental and non-governmental organizations, in liaison with ARSO, also\\ntake part in the work.\\n\\nARSO Standards are drafted in accordance with the rules given in the ISO/IEC Directives, Part 2.\\n\\nThe main task of technical committees is to prepare ARSO Standards. Draft ARSO Standards\\nadopted by the technical committees are circulated to the member bodies for voting. Publication as an\\nARSO Standard requires approval by at least 75 % of the member bodies casting a vote.\\n\\nAttention is drawn to the possibility that some of the elements of this document may be the subject of\\npatent rights. ARSO shall not be held responsible for identifying any or all such patent rights.\\n\\nThis African Standard was prepared by the ARSO Technical Harmonization Committee on Agriculture\\nand Food Products (ARSO/THC 02).\\n\\n© African Organisation for Standardisation 2025 — All rights reserved*\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP. O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel. +254-20-2224561, +254-20-311641, +254-20-311608\\nFax: +254-20-218792\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\n* © 2024 ARSO — All rights of exploitation reserved worldwide for African Member States’ NSBs.\\n\\nARS 838:2025\\niv\\n© ARSO 2025 — All rights reserved\\n\\nCopyright notice\\n\\nThis ARSO document is copyright-protected by ARSO. While the reproduction of this document\\nby participants in the ARSO standards development process is permitted without prior\\npermission from ARSO, neither this document nor any extract from it may be reproduced, stored\\nor transmitted in any form for any other purpose without prior written permission from ARSO.\\n\\nRequests for permission to reproduce this document for the purpose of selling it should be\\naddressed as shown below or to ARSO’s member body in the country of the requester:\\n\\n© African Organisation for Standardisation 2025 — All rights reserved\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP.O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel: +254-20-2224561, +254-20-311641, +254-20-311608\\nFax: +254-20-218792\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\nReproduction for sales purposes may be subject to royalty payments or a licensing agreement.\\nViolators may be prosecuted.\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved\\nv\\n\\nIntroduction\\n\\nThe development of this standard has been necessitated by the increasing role of cassava and\\ncassava products for food security and commercial concerns in Africa. The standard intends to\\nsafeguard the interests of the stakeholders and also guarantee enhanced safety of the consumers.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n1\\nCassava flour — Specification\\n1\\nScope\\nThis African Standard specifies requirements, sampling and test methods for cassava flour,\\nwhich is obtained from the processing of cassava (Manihot esculenta Crantz) intended for human\\nconsumption.\\n2\\nNormative references\\nThe following referenced documents referred to in the text in such a way that some or all of their\\ncontent constitutes requirements of this document. For dated references, only the edition cited\\napplies. For undated references, the latest edition of the referenced document (including any\\namendments) applies.\\nARS 53, General principles of food hygiene — Code of practice\\nARS 56, Prepackaged foods — Labelling\\n ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic\\nassay method\\nCXS 192, General standard for food additives\\nCXS 193, Codex general standard for contaminants and toxins in food and feed\\nISO 712, Cereals and cereal products — Determination of moisture content — Reference method\\nISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving\\nmethod (Reference method)\\nISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of\\nSalmonella spp.\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\nISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content\\nISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at\\n40 C for 1 h (with the flask loosely stoppered). Filter and titrate 100 ml of the clear filtrate with 0.05 M\\nNaOH solution with phenolphthalein indicator. The acidity of the water extract increases during\\nstorage. 1 ml of 0.1 M NaOH = 0.009 g CH2H6O3 (lactic acid).\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n7\\n\\nBibliography\\n\\nCODEX STAN 176:1989 (Rev. 1995), Standard for Edible Cassava Flour\\n\\nEAS 740:2010, Cassava flour — Specification\\n\\nNigerian Industrial Standard, NIS 344:2004, Standard for edible cassava flour\\n\\nMalawi Standard, MS 349:2002, Edible cassava flour\\n\\nARS 838:2025\\n© ARSO 2025 — All rights reserved"}]	[{"designation":"Normative references","raw":"Normative references"},{"designation":"The following referenced documents referred to in the text in su","raw":"The following referenced documents referred to in the text in such a way that some or all of their"},{"designation":"content constitutes requirements of this document. For dated ref","raw":"content constitutes requirements of this document. For dated references, only the edition cited"},{"designation":"applies. For undated references, the latest edition of the refer","raw":"applies. For undated references, the latest edition of the referenced document (including any"},{"designation":"amendments) applies.","raw":"amendments) applies."},{"designation":"ARS 53","title":"General principles of food hygiene — Code of practice","raw":"ARS 53, General principles of food hygiene — Code of practice"},{"designation":"ARS 56","title":"Prepackaged foods — Labelling","raw":"ARS 56, Prepackaged foods — Labelling"},{"designation":"ARS 844","title":"2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic","raw":"ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic"},{"designation":"assay method","raw":"assay method"},{"designation":"CXS 192, General standard for food additives","raw":"CXS 192, General standard for food additives"},{"designation":"Codex general","title":"CXS 193,  standard for contaminants and toxins in food and feed","raw":"CXS 193, Codex general standard for contaminants and toxins in food and feed"},{"designation":"ISO 712","title":"Cereals and cereal products — Determination of moisture content — Reference method","raw":"ISO 712, Cereals and cereal products — Determination of moisture content — Reference method"},{"designation":"ISO 3588","title":"Spices and condiments — Determination of degree of fineness of grinding — Hand sieving","raw":"ISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving"},{"designation":"method (Reference method)","raw":"method (Reference method)"},{"designation":"ISO 6579","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the detection of","raw":"ISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of"},{"designation":"Salmonella spp.","raw":"Salmonella spp."},{"designation":"ISO 7251","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the detection and","raw":"ISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and"},{"designation":"enumeration","title":"of presumptive Escherichia coli — Most probable number technique","raw":"enumeration of presumptive Escherichia coli — Most probable number technique"},{"designation":"ISO 15914","title":"Animal feeding stuffs — Enzymatic determination of total starch content","raw":"ISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content"},{"designation":"ISO 24333","title":"Cereals and cereal products — Sampling","raw":"ISO 24333, Cereals and cereal products — Sampling"},{"designation":"ISO 21527-2","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the","raw":"ISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the"},{"designation":"enumeration","title":"of yeasts and moulds — Part 2: Colony count technique in products with water activity","raw":"enumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity"},{"designation":"less than or equal to 0.95","raw":"less than or equal to 0.95"},{"designation":"ISO 4833","title":"Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms","raw":"ISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms"},{"designation":"-- Part 1: Colony count at 30 degrees C by the pour plate techni","raw":"-- Part 1: Colony count at 30 degrees C by the pour plate technique"},{"designation":"ISO 7251","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the detection and","raw":"ISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and"},{"designation":"enumeration","title":"of presumptive Escherichia coli — Most probable number technique","raw":"enumeration of presumptive Escherichia coli — Most probable number technique"},{"designation":"Terms and definitions","raw":"Terms and definitions"},{"designation":"For the purpose of this document, the following terms and defini","raw":"For the purpose of this document, the following terms and definitions apply."},{"designation":"AFRICAN STANDARD","raw":"AFRICAN STANDARD"},{"designation":"ARS 838","title":"2025 (E)","raw":"ARS 838:2025 (E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"cassava flour","raw":"cassava flour"},{"designation":"product prepared from dried cassava chips or paste by pounding, ","raw":"product prepared from dried cassava chips or paste by pounding, grinding or milling followed by"},{"designation":"sifting to separate the fibre from the flour","raw":"sifting to separate the fibre from the flour"},{"designation":"detoxification","raw":"detoxification"},{"designation":"process of reducing cyanide on a fresh weight basis to acceptabl","raw":"process of reducing cyanide on a fresh weight basis to acceptable level described under 4.2"},{"designation":"filth","raw":"filth"},{"designation":"impurities of animal origin (including dead insects)","raw":"impurities of animal origin (including dead insects)"},{"designation":"food grade material","raw":"food grade material"},{"designation":"material which will safeguard the hygienic, nutritional, technol","raw":"material which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the"},{"designation":"product. Material that will not transfer non-food chemicals into","raw":"product. Material that will not transfer non-food chemicals into the food and contains no chemicals"},{"designation":"which would be hazardous to human health.","raw":"which would be hazardous to human health."},{"designation":"Packaging material made of substances which are safe and suitabl","raw":"Packaging material made of substances which are safe and suitable for the intended use and which"},{"designation":"will not impart any toxic substance or undesirable odour to the ","raw":"will not impart any toxic substance or undesirable odour to the product."},{"designation":"foreign matter","raw":"foreign matter"},{"designation":"all organic and inorganic materials (such as sand, soil, glass)","raw":"all organic and inorganic materials (such as sand, soil, glass)"},{"designation":"practically free","raw":"practically free"},{"designation":"product without defects in excess of those that can be expected ","raw":"product without defects in excess of those that can be expected to result from, and be consistent with"},{"designation":"good cultural and handling practices employed in the production ","raw":"good cultural and handling practices employed in the production and marketing of the fresh cassava"},{"designation":"Requirements","raw":"Requirements"},{"designation":"Raw materials","raw":"Raw materials"},{"designation":"The raw material shall be dried cassava chips, paste, crumbs or ","raw":"The raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the"},{"designation":"relevant African standards.","raw":"relevant African standards."},{"designation":"General requirements","raw":"General requirements"},{"designation":"Cassava flour shall be:","raw":"Cassava flour shall be:"},{"designation":"a) practically free from filth;","raw":"a) practically free from filth;"},{"designation":"b) free of off flavours and odours:","raw":"b) free of off flavours and odours:"},{"designation":"c) practically free from any living insects and foreign matter:","raw":"c) practically free from any living insects and foreign matter:"},{"designation":"d) safe and suitable for human consumption: and","raw":"d) safe and suitable for human consumption: and"},{"designation":"e) have colour characteristic of the variety.","raw":"e) have colour characteristic of the variety."},{"designation":"NOTE","raw":"NOTE"},{"designation":"The colour of cassava is usually white, creamy or yellow. The ye","raw":"The colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in"},{"designation":"carotenes.","raw":"carotenes."},{"designation":"Specific requirements","raw":"Specific requirements"},{"designation":"Cassava flour shall comply with the specific requirements given ","raw":"Cassava flour shall comply with the specific requirements given in Table 1 when tested in accordance"},{"designation":"with the test methods specified therein.","raw":"with the test methods specified therein."},{"designation":"ARS 838","title":"2025(E)","raw":"ARS 838:2025(E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Table 1 — Compositional requirements for cassava flour","raw":"Table 1 — Compositional requirements for cassava flour"},{"designation":"Parameter","raw":"Parameter"},{"designation":"Requirement","raw":"Requirement"},{"designation":"Test method","raw":"Test method"},{"designation":"Moisture content, % by mass, max.","raw":"Moisture content, % by mass, max."},{"designation":"13.0","raw":"13.0"},{"designation":"ISO 712","raw":"ISO 712"},{"designation":"Acid insoluble ash, % m/m, dry matter basis max.","raw":"Acid insoluble ash, % m/m, dry matter basis max."},{"designation":"0.60","raw":"0.60"},{"designation":"Annex A","raw":"Annex A"},{"designation":"iii.","raw":"iii."},{"designation":"Starch (on dry basis), % by mass, Min","raw":"Starch (on dry basis), % by mass, Min"},{"designation":"60.0","raw":"60.0"},{"designation":"ISO 15914","raw":"ISO 15914"},{"designation":"Hydrogen cyanide, mg/kg or ppm","raw":"Hydrogen cyanide, mg/kg or ppm"},{"designation":"10.0","raw":"10.0"},{"designation":"ARS 844","title":"2016","raw":"ARS 844:2016"},{"designation":"Total acidity, % m/m, max","raw":"Total acidity, % m/m, max"},{"designation":"Annex B","raw":"Annex B"},{"designation":"Specific quality factors","raw":"Specific quality factors"},{"designation":"4.4.1","raw":"4.4.1"},{"designation":"Particle size","raw":"Particle size"},{"designation":"Not less than 90 % shall pass through a 600 µm sieve for “fine c","raw":"Not less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %"},{"designation":"shall pass through a 1200 µm sieve for “coarse cassava flour”. T","raw":"shall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done"},{"designation":"ISO 3588.","title":"in accordance with","raw":"in accordance with ISO 3588."},{"designation":"Cassava flour intended for baking purposes shall have particle s","raw":"Cassava flour intended for baking purposes shall have particle size of which not less than 90 % shall"},{"designation":"pass through a 250 µm sieve.","raw":"pass through a 250 µm sieve."},{"designation":"4.4.2","raw":"4.4.2"},{"designation":"Hydrocyanic acid content","raw":"Hydrocyanic acid content"},{"designation":"ARS 844","title":"When tested in accordance with :2016, the total hydrocyanic acid content of cassava flour","raw":"When tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour"},{"designation":"shall not exceed 10 mg/kg.","raw":"shall not exceed 10 mg/kg."},{"designation":"Food additives","raw":"Food additives"},{"designation":"Food additives may be used in the preparation of cassava flour i","raw":"Food additives may be used in the preparation of cassava flour in accordance with CXS 192."},{"designation":"Cassava flour may be fortified with vitamins or micronutrients i","raw":"Cassava flour may be fortified with vitamins or micronutrients if so permitted."},{"designation":"Contaminants","raw":"Contaminants"},{"designation":"Pesticide residues","raw":"Pesticide residues"},{"designation":"Cassava flour shall conform to maximum residue limits for pestic","raw":"Cassava flour shall conform to maximum residue limits for pesticide residues established by the"},{"designation":"Codex Alimentarius","title":"Commission for this commodity.","raw":"Codex Alimentarius Commission for this commodity."},{"designation":"Heavy metals","raw":"Heavy metals"},{"designation":"Cassava flour shall comply with those maximum levels for heavy m","raw":"Cassava flour shall comply with those maximum levels for heavy metal contaminants established by"},{"designation":"Codex Alimentarius","title":"the  Commission for this commodity.","raw":"the Codex Alimentarius Commission for this commodity."},{"designation":"Other contaminants","raw":"Other contaminants"},{"designation":"Cassava flour shall comply with those maximum limits for other c","raw":"Cassava flour shall comply with those maximum limits for other contaminants established in CXS 193."},{"designation":"Hygiene","raw":"Hygiene"},{"designation":"ARS 53","title":"Cassava flour shall be prepared and handled in a hygienic manner in accordance with  and","raw":"Cassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and"},{"designation":"shall comply with the microbiological limits given in Table 2.","raw":"shall comply with the microbiological limits given in Table 2."},{"designation":"ARS 838","title":"2025 (E)","raw":"ARS 838:2025 (E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Table 2 — Microbiological limits for cassava flour","raw":"Table 2 — Microbiological limits for cassava flour"},{"designation":"Micro-organism","raw":"Micro-organism"},{"designation":"Requirement","raw":"Requirement"},{"designation":"Test method","raw":"Test method"},{"designation":"Total viable count, cfu/g, max.","raw":"Total viable count, cfu/g, max."},{"designation":"ISO 4833","raw":"ISO 4833"},{"designation":"Escherichia coli, cfu/g, max.","raw":"Escherichia coli, cfu/g, max."},{"designation":"Absent","raw":"Absent"},{"designation":"ISO 7251","raw":"ISO 7251"},{"designation":"iii.","raw":"iii."},{"designation":"Salmonella, 25 g, max.","raw":"Salmonella, 25 g, max."},{"designation":"Absent","raw":"Absent"},{"designation":"ISO 6579","raw":"ISO 6579"},{"designation":"Yeasts and moulds, cfu/g, max.","raw":"Yeasts and moulds, cfu/g, max."},{"designation":"ISO 21527-2","raw":"ISO 21527-2"},{"designation":"Packaging","raw":"Packaging"},{"designation":"Cassava flour shall be packaged in food grade material","raw":"Cassava flour shall be packaged in food grade material"},{"designation":"The net weight of the packages for cassava flour may be required","raw":"The net weight of the packages for cassava flour may be required to meet the relevant"},{"designation":"regulations of the destination country.","raw":"regulations of the destination country."},{"designation":"Marking and labelling","raw":"Marking and labelling"},{"designation":"ARS 56","title":"In addition to the requirements of , cassava flour shall be legibly and indelibly labelled","raw":"In addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled"},{"designation":"with the following information:","raw":"with the following information:"},{"designation":"Name of the product shall be “Cassava flour” and the terms “Fine","raw":"Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance"},{"designation":"with 4.4, shall appear in close proximity to the name of the pro","raw":"with 4.4, shall appear in close proximity to the name of the product;"},{"designation":"Name, location and address of the manufacturer and/or packer sha","raw":"Name, location and address of the manufacturer and/or packer shall be declared and/or brand"},{"designation":"name / trade name.;","raw":"name / trade name.;"},{"designation":"Date of manufacture;","raw":"Date of manufacture;"},{"designation":"Lot identification;","raw":"Lot identification;"},{"designation":"Best before date;","raw":"Best before date;"},{"designation":"Country of origin shall be declared;","raw":"Country of origin shall be declared;"},{"designation":"Net contents shall be declared by weight in metric (‘Systeme Int","raw":"Net contents shall be declared by weight in metric (‘Systeme International’) units;"},{"designation":"The statement ‘food for human consumption’;","raw":"The statement ‘food for human consumption’;"},{"designation":"Storage instructions; and","raw":"Storage instructions; and"},{"designation":"Instructions on disposal of used package.","raw":"Instructions on disposal of used package."},{"designation":"When labelling non-retail packages, information for non-retail p","raw":"When labelling non-retail packages, information for non-retail packages shall either be given"},{"designation":"on the packages or in accompanying documents, except that the na","raw":"on the packages or in accompanying documents, except that the name of the product, lot"},{"designation":"identification and the name and address of the manufacturer or p","raw":"identification and the name and address of the manufacturer or packer shall appear on the packages."},{"designation":"Sampling","raw":"Sampling"},{"designation":"ISO 24333.","title":"Sampling shall be done in accordance with","raw":"Sampling shall be done in accordance with ISO 24333."},{"designation":"ARS 838","title":"2025(E)","raw":"ARS 838:2025(E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Annex A","raw":"Annex A"},{"designation":"(normative)","raw":"(normative)"},{"designation":"Determination of acid insoluble ash","raw":"Determination of acid insoluble ash"},{"designation":"Reagent","raw":"Reagent"},{"designation":"A.1.1","raw":"A.1.1"},{"designation":"Dilute hydrochloric acid, 1:1, prepared from concentrated hydroc","raw":"Dilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid"},{"designation":"Procedure","raw":"Procedure"},{"designation":"A.2.1","raw":"A.2.1"},{"designation":"Weigh accurately about 2 g of the dried material in a tared porc","raw":"Weigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish."},{"designation":"Ignite with a meker burner for about 1 h. Complete the Ignition ","raw":"Ignite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500"},{"designation":"°C to 570 °C until grey ash results.","raw":"°C to 570 °C until grey ash results."},{"designation":"Cool and filter through whatman filter paper No. 42 or its equiv","raw":"Cool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water"},{"designation":"until the washings are free from chlorides as tested with silver","raw":"until the washings are free from chlorides as tested with silver nitrate solution and return the filter"},{"designation":"paper and residue to the dish. Keep it in an electric air oven m","raw":"paper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h."},{"designation":"Ignite the dish again for about 30 min, cool and weigh. Repeat t","raw":"Ignite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between"},{"designation":"two successive weighings is less than 1 mg. Note the lowest weig","raw":"two successive weighings is less than 1 mg. Note the lowest weight."},{"designation":"Calculation","raw":"Calculation"},{"designation":"A.3.1","raw":"A.3.1"},{"designation":"Acid insoluble ash, per cent by weight","raw":"Acid insoluble ash, per cent by weight"},{"designation":"where","raw":"where"},{"designation":"is the lowest weight, in g, of the dish with the acid insoluble ","raw":"is the lowest weight, in g, of the dish with the acid insoluble ash;"},{"designation":"is the weight, in g, of the empty dish; and","raw":"is the weight, in g, of the empty dish; and"},{"designation":"is the weight, in g, of the dish with the dried product taken fo","raw":"is the weight, in g, of the dish with the dried product taken for the test."},{"designation":"ARS 838","title":"2025 (E)","raw":"ARS 838:2025 (E)"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Annex B","raw":"Annex B"},{"designation":"(normative)","raw":"(normative)"},{"designation":"Determination of total acidity (water extract method)","raw":"Determination of total acidity (water extract method)"},{"designation":"Shake 18 g of the sample with 200 ml of CO2 free water in a coni","raw":"Shake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"}]	{"text":"Packaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"}	{"text":"ARS 56, Prepackaged foods — Labelling\\n ARS 844:2016, Cassava and cassava products — Determination of total cyanogens — Enzymatic\\nassay method\\nCXS 192, General standard for food additives\\nCXS 193, Codex general standard for contaminants and toxins in food and feed\\nISO 712, Cereals and cereal products — Determination of moisture content — Reference method\\nISO 3588, Spices and condiments — Determination of degree of fineness of grinding — Hand sieving\\nmethod (Reference method)\\nISO 6579, Microbiology of food and animal feeding stuffs — Horizontal method for the detection of\\nSalmonella spp.\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\nISO 15914, Animal feeding stuffs — Enzymatic determination of total starch content\\nISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"}	{"text":"ISO 24333, Cereals and cereal products — Sampling\\nISO 21527-2, Microbiology of food and animal feeding stuffs — Horizontal method for the\\nenumeration of yeasts and moulds — Part 2: Colony count technique in products with water activity\\nless than or equal to 0.95\\nISO 4833, Microbiology of the food chain -- Horizontal method for the enumeration of microorganisms\\n-- Part 1: Colony count at 30 degrees C by the pour plate technique\\nISO 7251, Microbiology of food and animal feeding stuffs — Horizontal method for the detection and\\nenumeration of presumptive Escherichia coli — Most probable number technique\\n3\\nTerms and definitions\\nFor the purpose of this document, the following terms and definitions apply.\\n3.1\\nAFRICAN STANDARD\\n\\nARS 838:2025 (E)\\n2\\n© ARSO 2025 — All rights reserved\\ncassava flour\\nproduct prepared from dried cassava chips or paste by pounding, grinding or milling followed by\\nsifting to separate the fibre from the flour\\n\\n3.2\\ndetoxification\\nprocess of reducing cyanide on a fresh weight basis to acceptable level described under 4.2\\n\\n3.3\\nfilth\\nimpurities of animal origin (including dead insects)\\n\\n3.4\\nfood grade material\\nmaterial which will safeguard the hygienic, nutritional, technological and organoleptic qualities of the\\nproduct. Material that will not transfer non-food chemicals into the food and contains no chemicals\\nwhich would be hazardous to human health.\\n\\nPackaging material made of substances which are safe and suitable for the intended use and which\\nwill not impart any toxic substance or undesirable odour to the product.\\n\\n3.5\\nforeign matter\\nall organic and inorganic materials (such as sand, soil, glass)\\n\\n3.6\\npractically free\\nproduct without defects in excess of those that can be expected to result from, and be consistent with\\ngood cultural and handling practices employed in the production and marketing of the fresh cassava\\n\\n4\\nRequirements\\n\\n4.1\\nRaw materials\\n\\nThe raw material shall be dried cassava chips, paste, crumbs or cassava roots conforming to the\\nrelevant African standards.\\n\\n4.2\\nGeneral requirements\\n\\nCassava flour shall be:\\n\\na) practically free from filth;\\n\\nb) free of off flavours and odours:\\n\\nc) practically free from any living insects and foreign matter:\\n\\nd) safe and suitable for human consumption: and\\n\\ne) have colour characteristic of the variety.\\n\\nNOTE\\nThe colour of cassava is usually white, creamy or yellow. The yellow coloured varieties are normally rich in\\ncarotenes.\\n\\n4.3\\nSpecific requirements\\n\\nCassava flour shall comply with the specific requirements given in Table 1 when tested in accordance\\nwith the test methods specified therein.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n3\\nTable 1 — Compositional requirements for cassava flour\\n\\nS/N\\nParameter\\nRequirement\\nTest method\\ni.\\n\\nMoisture content, % by mass, max.\\n13.0\\nISO 712\\nii.\\n\\nAcid insoluble ash, % m/m, dry matter basis max.\\n0.60\\nAnnex A\\niii.\\n\\nStarch (on dry basis), % by mass, Min\\n60.0\\nISO 15914\\niv.\\n\\nHydrogen cyanide, mg/kg or ppm\\n10.0\\nARS 844:2016\\nv.\\n\\nTotal acidity, % m/m, max\\n1.0\\nAnnex B\\n\\n4.4\\nSpecific quality factors\\n\\n4.4.1\\nParticle size\\n\\nNot less than 90 % shall pass through a 600 µm sieve for “fine cassava flour” and not less than 90 %\\nshall pass through a 1200 µm sieve for “coarse cassava flour”. Testing for particle size shall be done\\nin accordance with ISO 3588.\\n\\nCassava flour intended for baking purposes shall have particle size of which not less than 90 % shall\\npass through a 250 µm sieve.\\n\\n4.4.2\\nHydrocyanic acid content\\n\\nWhen tested in accordance with ARS 844:2016, the total hydrocyanic acid content of cassava flour\\nshall not exceed 10 mg/kg.\\n\\n5\\nFood additives\\n\\nFood additives may be used in the preparation of cassava flour in accordance with CXS 192.\\nCassava flour may be fortified with vitamins or micronutrients if so permitted.\\n\\n6\\nContaminants\\n\\n6.1\\nPesticide residues\\n\\nCassava flour shall conform to maximum residue limits for pesticide residues established by the\\nCodex Alimentarius Commission for this commodity.\\n\\n6.2\\nHeavy metals\\n\\nCassava flour shall comply with those maximum levels for heavy metal contaminants established by\\nthe Codex Alimentarius Commission for this commodity.\\n\\n6.3\\nOther contaminants\\n\\nCassava flour shall comply with those maximum limits for other contaminants established in CXS 193.\\n\\n7\\nHygiene\\n\\nCassava flour shall be prepared and handled in a hygienic manner in accordance with ARS 53 and\\nshall comply with the microbiological limits given in Table 2.\\n\\nARS 838:2025 (E)\\n4\\n© ARSO 2025 — All rights reserved\\nTable 2 — Microbiological limits for cassava flour\\n\\nS/N\\nMicro-organism\\nRequirement\\nTest method\\ni.\\n Total viable count, cfu/g, max.\\n105\\nISO 4833\\nii.\\n Escherichia coli, cfu/g, max.\\nAbsent\\nISO 7251\\niii.\\n Salmonella, 25 g, max.\\nAbsent\\nISO 6579\\niv.\\n Yeasts and moulds, cfu/g, max.\\n103\\nISO 21527-2\\n\\n8\\nPackaging\\n\\n8.1\\nCassava flour shall be packaged in food grade material\\n\\n8.2\\nThe net weight of the packages for cassava flour may be required to meet the relevant\\nregulations of the destination country.\\n\\n9\\nMarking and labelling\\n\\n9.1\\nIn addition to the requirements of ARS 56, cassava flour shall be legibly and indelibly labelled\\nwith the following information:\\n\\n(a)\\n Name of the product shall be “Cassava flour” and the terms “Fine” or “Coarse”, in accordance\\nwith 4.4, shall appear in close proximity to the name of the product;\\n\\n(b)\\nName, location and address of the manufacturer and/or packer shall be declared and/or brand\\nname / trade name.;\\n\\n(c)\\nDate of manufacture;\\n\\n(d)\\nLot identification;\\n\\n(e)\\nBest before date;\\n\\n(f)\\nCountry of origin shall be declared;\\n\\n(g)\\nNet contents shall be declared by weight in metric (‘Systeme International’) units;\\n\\n(h)\\nThe statement ‘food for human consumption’;\\n\\n(i)\\nStorage instructions; and\\n\\n(j)\\nInstructions on disposal of used package.\\n\\n9.2\\nWhen labelling non-retail packages, information for non-retail packages shall either be given\\non the packages or in accompanying documents, except that the name of the product, lot\\nidentification and the name and address of the manufacturer or packer shall appear on the packages.\\n\\n10\\nSampling\\n\\nSampling shall be done in accordance with ISO 24333.\\n\\nARS 838:2025(E)\\n© ARSO 2025 — All rights reserved\\n5\\n\\nAnnex A\\n(normative)\\n\\nDetermination of acid insoluble ash\\n\\nA.1\\nReagent\\n\\nA.1.1\\nDilute hydrochloric acid, 1:1, prepared from concentrated hydrochloric acid\\n\\nA.2\\nProcedure\\n\\nA.2.1\\nWeigh accurately about 2 g of the dried material in a tared porcelain, silica or platinum dish.\\nIgnite with a meker burner for about 1 h. Complete the Ignition by keeping in a muffle furnace at 500\\n°C to 570 °C until grey ash results.\\n\\nCool and filter through whatman filter paper No. 42 or its equivalent. Wash the residue with hot water\\nuntil the washings are free from chlorides as tested with silver nitrate solution and return the filter\\npaper and residue to the dish. Keep it in an electric air oven maintained at 135 ± 2 °C for about 3 h.\\nIgnite the dish again for about 30 min, cool and weigh. Repeat this process till the difference between\\ntwo successive weighings is less than 1 mg. Note the lowest weight.\\n\\nA.3\\nCalculation\\n\\nA.3.1\\nAcid insoluble ash, per cent by weight\\n\\n(\\n)\\nM\\nM\\nM\\nM\\n−\\n−\\n=\\n1\\n2\\n100\\n\\nwhere\\n\\nM2\\nis the lowest weight, in g, of the dish with the acid insoluble ash;\\n\\nM\\nis the weight, in g, of the empty dish; and\\n\\nM1\\nis the weight, in g, of the dish with the dried product taken for the test.\\n\\nARS 838:2025 (E)\\n6\\n© ARSO 2025 — All rights reserved\\n\\nAnnex B\\n(normative)\\n\\nDetermination of total acidity (water extract method)\\n\\nShake 18 g of the sample with 200 ml of CO2 free water in a conical flask and place in a water bath at"}
sv-c7820298	std-ars-1093-451f	ARS 1093:1093	1093	2026-10-12 00:00:00	PUBLISHED	en	/uploads/standards/1791785512910-1289f5-ARS_1093_2025_Butter___Specification__1_.pdf	sha256:8c46050dd341cb413f2f886aa91540e570631ae58c7afad99143ad446ffde34d	Scope\n\nThis African Standard specifies requirements, sampling and test methods for butter, intended for direct\nconsumption, or further processing.	{"standard":{"designation":"ARS 1093","title":{"en":"Butter — Specification"},"ics":["67.060"],"publisher":"ARSO"},"version":{"year":1093,"editionLabel":"ARS 1093:1093","effectiveFrom":"2026-10-12","publicationStatus":"DRAFT_IMPORT","authoritativeLocale":"en","sourcePdfUri":"/uploads/standards/1791785512910-1289f5-ARS_1093_2025_Butter___Specification__1_.pdf"},"scope":{"text":{"en":"Scope\\n\\nThis African Standard specifies requirements, sampling and test methods for butter, intended for direct\\nconsumption, or further processing."}},"normativeReferences":[{"designation":"Normative references","raw":"Normative references"},{"designation":"The following referenced documents are indispensable for the app","raw":"The following referenced documents are indispensable for the application of this Standard. For dated"},{"designation":"references, only the edition cited applies. For undated referenc","raw":"references, only the edition cited applies. For undated references, the latest edition of the referenced"},{"designation":"document (including any amendments) applies.","raw":"document (including any amendments) applies."},{"designation":"ARS 53","title":"General Principles of Food Hygiene – Code of practice","raw":"ARS 53, General Principles of Food Hygiene – Code of practice"},{"designation":"ARS 56","title":"Pre-packaged Foods – Labelling","raw":"ARS 56, Pre-packaged Foods – Labelling"},{"designation":"ARS 1034","title":"Dairy industry — Glossary of terms","raw":"ARS 1034, Dairy industry — Glossary of terms"},{"designation":"ARS 1036","title":"Code of Hygienic Practice for Milk and Milk Products","raw":"ARS 1036, Code of Hygienic Practice for Milk and Milk Products"},{"designation":"CXS 192, General Standard for Food Additives","raw":"CXS 192, General Standard for Food Additives"},{"designation":"CXS 193, General Standard for Contaminants and Toxins in Food an","raw":"CXS 193, General Standard for Contaminants and Toxins in Food and Feed"},{"designation":"CXS 234, Recommended methods of analysis and sampling","raw":"CXS 234, Recommended methods of analysis and sampling"},{"designation":"CXS 346, General Standard for Labelling of non-retail containers","raw":"CXS 346, General Standard for Labelling of non-retail containers of foods"},{"designation":"ISO 707","title":"Milk and milk products — Guidance on sampling","raw":"ISO 707, Milk and milk products — Guidance on sampling"},{"designation":"ISO 4833-1","title":"Microbiology of the food chain — Horizontal method for the enumeration of microorganisms","raw":"ISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms"},{"designation":"Part 1: Colony count at 30 °C by the pour plate technique","raw":"Part 1: Colony count at 30 °C by the pour plate technique"},{"designation":"ISO 6579-1","title":"Microbiology of the food chain — Horizontal method for the detection, enumeration and","raw":"ISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and"},{"designation":"serotyping of Salmonella — Part 1: Detection of Salmonella spp.","raw":"serotyping of Salmonella — Part 1: Detection of Salmonella spp."},{"designation":"ISO 6888-1","title":"Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive","raw":"ISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive"},{"designation":"staphylococci (Staphylococcus aureus and other species) — Part 1","raw":"staphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar"},{"designation":"medium","raw":"medium"},{"designation":"ISO 11290-1","title":"Microbiology of the food chain — Horizontal method for the detection and enumeration of","raw":"ISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of"},{"designation":"Listeria monocytogenes and of Listeria spp.  Part 1: Detection m","raw":"Listeria monocytogenes and of Listeria spp.  Part 1: Detection method"},{"designation":"ISO 14501","title":"Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity","raw":"ISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity"},{"designation":"chromatography and determination by high-performance liquid chro","raw":"chromatography and determination by high-performance liquid chromatography"},{"designation":"ISO 16649-1","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of","raw":"ISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of"},{"designation":"beta-glucuronidase-positive Escherichia coli — Part 1: Colony-co","raw":"beta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using"},{"designation":"membranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide","raw":"membranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide"},{"designation":"ISO 21528-2","title":"Microbiology of the food chain — Horizontal method for the detection and enumeration of","raw":"ISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of"},{"designation":"Enterobacteriaceae","title":"Part 2: Colony-count technique","raw":"Enterobacteriaceae Part 2: Colony-count technique"},{"designation":"AFRICAN STANDARD","raw":"AFRICAN STANDARD"},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Terms and definitions","raw":"Terms and definitions"},{"designation":"ARS 1034","title":"For the purposes of this document, the terms and definitions given in  and the following shall apply.","raw":"For the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply."},{"designation":"butter","raw":"butter"},{"designation":"fatty product derived exclusively from milk and/or products obta","raw":"fatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an"},{"designation":"emulsion of the type water-in-oil","raw":"emulsion of the type water-in-oil"},{"designation":"Composition and requirements","raw":"Composition and requirements"},{"designation":"Essential raw ingredients","raw":"Essential raw ingredients"},{"designation":"Milk and/or products obtained from milk","raw":"Milk and/or products obtained from milk"},{"designation":"Permitted ingredients","raw":"Permitted ingredients"},{"designation":"a) Potable water","raw":"a) Potable water"},{"designation":"b) Sodium chloride and/or other types of food grade salt","raw":"b) Sodium chloride and/or other types of food grade salt"},{"designation":"c) Starter cultures of harmless lactic acid and/or flavour produ","raw":"c) Starter cultures of harmless lactic acid and/or flavour producing bacteria"},{"designation":"Compositional requirements","raw":"Compositional requirements"},{"designation":"Butter shall meet the compositional requirements given in Table ","raw":"Butter shall meet the compositional requirements given in Table 1 when tested in accordance with the test"},{"designation":"methods specified therein. Butter may be classified as identifie","raw":"methods specified therein. Butter may be classified as identified in Table 1 and meet the compositional"},{"designation":"requirements, as shown.","raw":"requirements, as shown."},{"designation":"Table 1 — Compositional requirements for butter","raw":"Table 1 — Compositional requirements for butter"},{"designation":"Characteristics","raw":"Characteristics"},{"designation":"Permissible limit, % (m/m)","raw":"Permissible limit, % (m/m)"},{"designation":"Test method","raw":"Test method"},{"designation":"Milk fat content, min","raw":"Milk fat content, min"},{"designation":"80,0","raw":"80,0"},{"designation":"Refer to CXS 234","raw":"Refer to CXS 234"},{"designation":"Water content, max","raw":"Water content, max"},{"designation":"16,0","raw":"16,0"},{"designation":"Milk solids-not-fat content, max","raw":"Milk solids-not-fat content, max"},{"designation":"Food additives","raw":"Food additives"},{"designation":"Food additives may be used and only within the limits specified ","raw":"Food additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter)."},{"designation":"Contaminants","raw":"Contaminants"},{"designation":"Heavy metals","raw":"Heavy metals"},{"designation":"The products covered by this African Standard shall comply with ","raw":"The products covered by this African Standard shall comply with those maximum limits for metal contaminants"},{"designation":"specified in CXS 193.","raw":"specified in CXS 193."},{"designation":"Aflatoxins","raw":"Aflatoxins"},{"designation":"ISO 14501","title":"When tested in accordance with , the level of aflatoxin M1 shall not exceed 0.5 μg/kg.","raw":"When tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg."},{"designation":"Pesticide residues","raw":"Pesticide residues"},{"designation":"Codex Alimentarius","title":"Pesticide residue limits shall be in accordance with limits set by the  Commission for the","raw":"Pesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the"},{"designation":"product covered by this Standard.","raw":"product covered by this Standard."},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Veterinary drug residues","raw":"Veterinary drug residues"},{"designation":"Codex Alimentarius","title":"Veterinary drug residue limits shall be in accordance with limits set by the  Commission","raw":"Veterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission"},{"designation":"for the product covered by this Standard.","raw":"for the product covered by this Standard."},{"designation":"Hygiene","raw":"Hygiene"},{"designation":"The products covered by this African Standard shall be produced,","raw":"The products covered by this African Standard shall be produced, prepared and handled in accordance with"},{"designation":"ARS 53","title":"the provisions of the appropriate sections of  and ARS 1036.","raw":"the provisions of the appropriate sections of ARS 53 and ARS 1036."},{"designation":"Butter shall be free from microorganisms and products originatin","raw":"Butter shall be free from microorganisms and products originating from microorganisms in amounts which"},{"designation":"may represent a hazard to human health.","raw":"may represent a hazard to human health."},{"designation":"Butter shall comply with microbiological limits given in Table 3","raw":"Butter shall comply with microbiological limits given in Table 3 when tested in accordance with the test"},{"designation":"methods specified therein.","raw":"methods specified therein."},{"designation":"Table 3 – Microbiological limits for butter","raw":"Table 3 – Microbiological limits for butter"},{"designation":"Micro-organisms","raw":"Micro-organisms"},{"designation":"Sampling","raw":"Sampling"},{"designation":"plan","raw":"plan"},{"designation":"Limits","raw":"Limits"},{"designation":"Test method","raw":"Test method"},{"designation":"reference","raw":"reference"},{"designation":"The stage at","raw":"The stage at"},{"designation":"which the","raw":"which the"},{"designation":"parameter is","raw":"parameter is"},{"designation":"applied","raw":"applied"},{"designation":"Salmonella","raw":"Salmonella"},{"designation":"Absence in 25g","raw":"Absence in 25g"},{"designation":"ISO 6579-1","raw":"ISO 6579-1"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"Listeria","raw":"Listeria"},{"designation":"monocytogenes","raw":"monocytogenes"},{"designation":"Absence in 25g","raw":"Absence in 25g"},{"designation":"ISO 11290-1","raw":"ISO 11290-1"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"Coagulase-positive","raw":"Coagulase-positive"},{"designation":"Staphylococci","raw":"Staphylococci"},{"designation":"10 cfu/g","raw":"10 cfu/g"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"ISO 6888-1","raw":"ISO 6888-1"},{"designation":"ISO 6888-2","raw":"ISO 6888-2"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"E. Coli","raw":"E. Coli"},{"designation":"10 cfu/g","raw":"10 cfu/g"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"ISO 16649-1","title":"or -2","raw":"ISO 16649-1 or -2"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"Enterobacteriaceae","raw":"Enterobacteriaceae"},{"designation":"10 cfu/g","raw":"10 cfu/g"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"ISO 21528-2","raw":"ISO 21528-2"},{"designation":"process","raw":"process"},{"designation":"Total Aerobic","raw":"Total Aerobic"},{"designation":"mesophilic bacterial","raw":"mesophilic bacterial"},{"designation":"count","raw":"count"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"103 cfu/g","raw":"103 cfu/g"},{"designation":"ISO 4833-1","raw":"ISO 4833-1"},{"designation":"During the process","raw":"During the process"},{"designation":"Note:","raw":"Note:"},{"designation":"n = number of units comprising the sample;","raw":"n = number of units comprising the sample;"},{"designation":"c = number of sample units giving values between m and M;","raw":"c = number of sample units giving values between m and M;"},{"designation":"m= The level of the microbiological criterion required in the pr","raw":"m= The level of the microbiological criterion required in the product;"},{"designation":"M= Value or level of microbial limit not to be reached or greate","raw":"M= Value or level of microbial limit not to be reached or greater than in any unit of the sample."},{"designation":"Packaging","raw":"Packaging"},{"designation":"Butter shall be packaged in suitable food grade containers which","raw":"Butter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,"},{"designation":"technological, and organoleptic qualities of the product during ","raw":"technological, and organoleptic qualities of the product during dispatch, transport and use of the product until"},{"designation":"end","title":"the  of its shelf life.","raw":"the end of its shelf life."},{"designation":"Labelling","raw":"Labelling"},{"designation":"ARS 56","title":"In addition to the provisions of , the following specific provisions shall apply:","raw":"In addition to the provisions of ARS 56, the following specific provisions shall apply:"},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Name of the food","raw":"Name of the food"},{"designation":"The name of the food shall be “Butter”. The name “butter” with a","raw":"The name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be"},{"designation":"used for butter with more than 95% fat.","raw":"used for butter with more than 95% fat."},{"designation":"(ii)","raw":"(ii)"},{"designation":"Butter may be labelled to indicate whether it is salted or unsal","raw":"Butter may be labelled to indicate whether it is salted or unsalted according to national"},{"designation":"legislation.","raw":"legislation."},{"designation":"Declaration of total fat content","raw":"Declaration of total fat content"},{"designation":"If the consumer would be misled by the omission, the milkfat con","raw":"If the consumer would be misled by the omission, the milkfat content shall be declared in a manner found"},{"designation":"acceptable in the country of sale to the final consumer, either","raw":"acceptable in the country of sale to the final consumer, either"},{"designation":"as a percentage by mass, or","raw":"as a percentage by mass, or"},{"designation":"(ii)","raw":"(ii)"},{"designation":"in grams per serving as quantified in the label provided that th","raw":"in grams per serving as quantified in the label provided that the number of servings is stated."},{"designation":"Labelling of non-retail containers","raw":"Labelling of non-retail containers"},{"designation":"Information required in clause 8 of this Standard needed to be c","raw":"Information required in clause 8 of this Standard needed to be complied with the requirements mentioned in"},{"designation":"CXS 346.","raw":"CXS 346."},{"designation":"Methods of sampling","raw":"Methods of sampling"},{"designation":"ISO 707","title":"For checking the compliance with this standard, the methods sampling contained in , shall be used.","raw":"For checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used."},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Bibliography","raw":"Bibliography"},{"designation":"CXS 279-1971 Standard for butter","raw":"CXS 279-1971 Standard for butter"},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"}],"requirements":[{"id":"FULL-BODY","clause":"body","text":"AFRICAN\\nSTANDARD\\nARS\\n1093\\nFirst Edition 2025\\n\\nReference No. ARS 1093 2025(E)\\nICS 67.100.10\\n\\n© ARSO 2025\\n\\nButter — Specification\\n\\nARS 1093:2025\\nii\\n© ARSO 2025 — All rights reserved\\n\\nTable of Contents\\n1\\nScope ............................................................................................................................................. 1\\n2\\nNormative references ..................................................................................................................... 1\\n3\\nTerms and definitions ..................................................................................................................... 2\\n4\\nComposition and requirements ...................................................................................................... 2\\n4.1\\nEssential raw ingredients ....................................................................................................... 2\\n4.2\\nPermitted ingredients ............................................................................................................. 2\\n4.3\\nCompositional requirements .................................................................................................. 2\\n5\\nFood additives ................................................................................................................................ 2\\n6.1\\nHeavy metals ......................................................................................................................... 2\\n6.2\\nAflatoxins ............................................................................................................................... 2\\n6.3\\nPesticide residues .................................................................................................................. 2\\n6.4\\nVeterinary drug residues ........................................................................................................ 3\\n7\\nHygiene .......................................................................................................................................... 3\\n8\\nPackaging ....................................................................................................................................... 3\\n9\\nLabelling ......................................................................................................................................... 3\\n9.1\\nName of the food ................................................................................................................... 4\\n9.2\\nDeclaration of total fat content ............................................................................................... 4\\n9.3\\nLabelling of non-retail containers ........................................................................................... 4\\n10\\nMethods of sampling ...................................................................................................................... 4\\nBibliography ............................................................................................................................................ 5\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\niii\\nForeword\\n\\nThe African Organization for Standardization (ARSO) is an African intergovernmental organization\\nestablished by the United Nations Economic Commission for Africa (UNECA) and the Organization of\\nAfrican Unity (AU) in 1977. One of the fundamental mandates of ARSO is to develop and harmonize\\nAfrican Standards (ARS) for the purpose of enhancing Africa’s internal trading capacity, increase\\nAfrica’s product and service competitiveness globally and uplift the welfare of African communities. The\\nwork of preparing African Standards is normally carried out through ARSO technical committees. Each\\nMember State interested in a subject for which a technical committee has been established has the\\nright to be represented on that committee. International organizations, Regional Economic Communities\\n(RECs), governmental and non-governmental organizations, in liaison with ARSO, also take part in the\\nwork.\\n\\nARSO Standards are drafted in accordance with the rules given in the ISO/IEC Directives, Part 2.\\n\\nThe main task of technical committees is to prepare ARSO Standards. Draft ARSO Standards adopted\\nby the technical committees are circulated to the member bodies for voting. Publication as an ARSO\\nStandard requires approval by at least 75 % of the member bodies casting a vote.\\n\\nAttention is drawn to the possibility that some of the elements of this document may be the subject of\\npatent rights. ARSO shall not be held responsible for identifying any or all such patent rights.\\n\\nThis African Standard was prepared by ARSO Technical Committee on Milk and Milk Products\\n(ARSO/TC 04).\\n\\n© African Organisation for Standardisation 2025 — All rights reserved*\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP. O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel. +254-20-2224561, +254-20-3311641, +254-20-3311608\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\n* © 2025 ARSO — All rights of exploitation reserved worldwide for African Member States’ NSBs.\\n\\nARS 1093:2025\\niv\\n© ARSO 2025 — All rights reserved\\n\\nCopyright notice\\n\\nThis ARSO document is copyright-protected by ARSO. While the reproduction of this document\\nby participants in the ARSO standards development process is permitted without prior permission\\nfrom ARSO, neither this document nor any extract from it may be reproduced, stored or\\ntransmitted in any form for any other purpose without prior written permission from ARSO.\\n\\nRequests for permission to reproduce this document for the purpose of selling it should be\\naddressed as shown below or to ARSO’s member body in the country of the requester:\\n\\n© African Organisation for Standardisation 2025 — All rights reserved\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP.O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel: +254-20-2224561, +254-20-3311641, +254-20-3311608\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\nReproduction for sales purposes may be subject to royalty payments or a licensing agreement.\\nViolators may be prosecuted.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\nv\\nIntroduction\\n\\nButter is a fatty product derived exclusively from milk and/or products obtained from milk, principally in\\nthe form of an emulsion of the type water-in-oil.\\n\\nThis African Standard seeks to lay down requirements for the acceptable production of Butter in order\\nto ensure quality, consumer safety and promote fair trade practices.\\n\\nIn elaborating this Standard, references were made to inputs from Manufacturers, National and\\nInternational standards which are hereby duly acknowledged.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n1\\n\\nButter — Specification\\n\\n1\\nScope\\n\\nThis African Standard specifies requirements, sampling and test methods for butter, intended for direct\\nconsumption, or further processing.\\n\\n2\\nNormative references\\n\\nThe following referenced documents are indispensable for the application of this Standard. For dated\\nreferences, only the edition cited applies. For undated references, the latest edition of the referenced\\ndocument (including any amendments) applies.\\n\\nARS 53, General Principles of Food Hygiene – Code of practice\\n\\nARS 56, Pre-packaged Foods – Labelling\\n\\nARS 1034, Dairy industry — Glossary of terms\\n\\nARS 1036, Code of Hygienic Practice for Milk and Milk Products\\n\\nCXS 192, General Standard for Food Additives\\n\\nCXS 193, General Standard for Contaminants and Toxins in Food and Feed\\n\\nCXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"}],"packaging":{"text":"Packaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"},"labelling":{"text":"ARS 56, Pre-packaged Foods – Labelling\\n\\nARS 1034, Dairy industry — Glossary of terms\\n\\nARS 1036, Code of Hygienic Practice for Milk and Milk Products\\n\\nCXS 192, General Standard for Food Additives\\n\\nCXS 193, General Standard for Contaminants and Toxins in Food and Feed\\n\\nCXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"},"sampling":{"text":"CXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"},"contaminants":{"text":"CXS 193, General Standard for Contaminants and Toxins in Food and Feed\\n\\nCXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"},"hygiene":{"text":"ARS 53, General Principles of Food Hygiene – Code of practice\\n\\nARS 56, Pre-packaged Foods – Labelling\\n\\nARS 1034, Dairy industry — Glossary of terms\\n\\nARS 1036, Code of Hygienic Practice for Milk and Milk Products\\n\\nCXS 192, General Standard for Food Additives\\n\\nCXS 193, General Standard for Contaminants and Toxins in Food and Feed\\n\\nCXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"},"definitions":{"text":"Terms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"},"clauses":[{"number":"10","title":"cfu/g","body":""},{"number":"102","title":"cfu/g","body":"ISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2"},{"number":"10","title":"cfu/g","body":""},{"number":"102","title":"cfu/g","body":"ISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2"},{"number":"10","title":"cfu/g","body":""},{"number":"102","title":"cfu/g","body":"ISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1"},{"number":"102","title":"cfu/g","body":""},{"number":"103","title":"cfu/g","body":"ISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"}],"fullText":"AFRICAN\\nSTANDARD\\nARS\\n1093\\nFirst Edition 2025\\n\\nReference No. ARS 1093 2025(E)\\nICS 67.100.10\\n\\n© ARSO 2025\\n\\nButter — Specification\\n\\nARS 1093:2025\\nii\\n© ARSO 2025 — All rights reserved\\n\\nTable of Contents\\n1\\nScope ............................................................................................................................................. 1\\n2\\nNormative references ..................................................................................................................... 1\\n3\\nTerms and definitions ..................................................................................................................... 2\\n4\\nComposition and requirements ...................................................................................................... 2\\n4.1\\nEssential raw ingredients ....................................................................................................... 2\\n4.2\\nPermitted ingredients ............................................................................................................. 2\\n4.3\\nCompositional requirements .................................................................................................. 2\\n5\\nFood additives ................................................................................................................................ 2\\n6.1\\nHeavy metals ......................................................................................................................... 2\\n6.2\\nAflatoxins ............................................................................................................................... 2\\n6.3\\nPesticide residues .................................................................................................................. 2\\n6.4\\nVeterinary drug residues ........................................................................................................ 3\\n7\\nHygiene .......................................................................................................................................... 3\\n8\\nPackaging ....................................................................................................................................... 3\\n9\\nLabelling ......................................................................................................................................... 3\\n9.1\\nName of the food ................................................................................................................... 4\\n9.2\\nDeclaration of total fat content ............................................................................................... 4\\n9.3\\nLabelling of non-retail containers ........................................................................................... 4\\n10\\nMethods of sampling ...................................................................................................................... 4\\nBibliography ............................................................................................................................................ 5\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\niii\\nForeword\\n\\nThe African Organization for Standardization (ARSO) is an African intergovernmental organization\\nestablished by the United Nations Economic Commission for Africa (UNECA) and the Organization of\\nAfrican Unity (AU) in 1977. One of the fundamental mandates of ARSO is to develop and harmonize\\nAfrican Standards (ARS) for the purpose of enhancing Africa’s internal trading capacity, increase\\nAfrica’s product and service competitiveness globally and uplift the welfare of African communities. The\\nwork of preparing African Standards is normally carried out through ARSO technical committees. Each\\nMember State interested in a subject for which a technical committee has been established has the\\nright to be represented on that committee. International organizations, Regional Economic Communities\\n(RECs), governmental and non-governmental organizations, in liaison with ARSO, also take part in the\\nwork.\\n\\nARSO Standards are drafted in accordance with the rules given in the ISO/IEC Directives, Part 2.\\n\\nThe main task of technical committees is to prepare ARSO Standards. Draft ARSO Standards adopted\\nby the technical committees are circulated to the member bodies for voting. Publication as an ARSO\\nStandard requires approval by at least 75 % of the member bodies casting a vote.\\n\\nAttention is drawn to the possibility that some of the elements of this document may be the subject of\\npatent rights. ARSO shall not be held responsible for identifying any or all such patent rights.\\n\\nThis African Standard was prepared by ARSO Technical Committee on Milk and Milk Products\\n(ARSO/TC 04).\\n\\n© African Organisation for Standardisation 2025 — All rights reserved*\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP. O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel. +254-20-2224561, +254-20-3311641, +254-20-3311608\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\n* © 2025 ARSO — All rights of exploitation reserved worldwide for African Member States’ NSBs.\\n\\nARS 1093:2025\\niv\\n© ARSO 2025 — All rights reserved\\n\\nCopyright notice\\n\\nThis ARSO document is copyright-protected by ARSO. While the reproduction of this document\\nby participants in the ARSO standards development process is permitted without prior permission\\nfrom ARSO, neither this document nor any extract from it may be reproduced, stored or\\ntransmitted in any form for any other purpose without prior written permission from ARSO.\\n\\nRequests for permission to reproduce this document for the purpose of selling it should be\\naddressed as shown below or to ARSO’s member body in the country of the requester:\\n\\n© African Organisation for Standardisation 2025 — All rights reserved\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP.O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel: +254-20-2224561, +254-20-3311641, +254-20-3311608\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\nReproduction for sales purposes may be subject to royalty payments or a licensing agreement.\\nViolators may be prosecuted.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\nv\\nIntroduction\\n\\nButter is a fatty product derived exclusively from milk and/or products obtained from milk, principally in\\nthe form of an emulsion of the type water-in-oil.\\n\\nThis African Standard seeks to lay down requirements for the acceptable production of Butter in order\\nto ensure quality, consumer safety and promote fair trade practices.\\n\\nIn elaborating this Standard, references were made to inputs from Manufacturers, National and\\nInternational standards which are hereby duly acknowledged.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n1\\n\\nButter — Specification\\n\\n1\\nScope\\n\\nThis African Standard specifies requirements, sampling and test methods for butter, intended for direct\\nconsumption, or further processing.\\n\\n2\\nNormative references\\n\\nThe following referenced documents are indispensable for the application of this Standard. For dated\\nreferences, only the edition cited applies. For undated references, the latest edition of the referenced\\ndocument (including any amendments) applies.\\n\\nARS 53, General Principles of Food Hygiene – Code of practice\\n\\nARS 56, Pre-packaged Foods – Labelling\\n\\nARS 1034, Dairy industry — Glossary of terms\\n\\nARS 1036, Code of Hygienic Practice for Milk and Milk Products\\n\\nCXS 192, General Standard for Food Additives\\n\\nCXS 193, General Standard for Contaminants and Toxins in Food and Feed\\n\\nCXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved","fidelity":{"principles":["No omission of normative clauses, requirements, limits, units, or test methods.","Preserve Table / figure / annex content that carries requirements (e.g. Table 1 grades).","Preserve packaging, labelling, hygiene, contaminants, and sampling provisions.","Record content_hash over the full machine document for integrity checks.","Flag translationLocale gaps; never silently drop non-authoritative locales.","Public preview may show title + TOC + Clause 1 Scope only — that is access control, not omission from the stored machine pack."],"criticalDomains":["public_health","food_safety","occupational_safety","environment","consumer_protection"],"extractionMethod":"pymupdf-text","omittedNormativeContent":false,"humanReviewRequired":true},"contentHash":"sha256:8c46050dd341cb413f2f886aa91540e570631ae58c7afad99143ad446ffde34d"}	[{"id":"FULL-BODY","clause":"body","text":"AFRICAN\\nSTANDARD\\nARS\\n1093\\nFirst Edition 2025\\n\\nReference No. ARS 1093 2025(E)\\nICS 67.100.10\\n\\n© ARSO 2025\\n\\nButter — Specification\\n\\nARS 1093:2025\\nii\\n© ARSO 2025 — All rights reserved\\n\\nTable of Contents\\n1\\nScope ............................................................................................................................................. 1\\n2\\nNormative references ..................................................................................................................... 1\\n3\\nTerms and definitions ..................................................................................................................... 2\\n4\\nComposition and requirements ...................................................................................................... 2\\n4.1\\nEssential raw ingredients ....................................................................................................... 2\\n4.2\\nPermitted ingredients ............................................................................................................. 2\\n4.3\\nCompositional requirements .................................................................................................. 2\\n5\\nFood additives ................................................................................................................................ 2\\n6.1\\nHeavy metals ......................................................................................................................... 2\\n6.2\\nAflatoxins ............................................................................................................................... 2\\n6.3\\nPesticide residues .................................................................................................................. 2\\n6.4\\nVeterinary drug residues ........................................................................................................ 3\\n7\\nHygiene .......................................................................................................................................... 3\\n8\\nPackaging ....................................................................................................................................... 3\\n9\\nLabelling ......................................................................................................................................... 3\\n9.1\\nName of the food ................................................................................................................... 4\\n9.2\\nDeclaration of total fat content ............................................................................................... 4\\n9.3\\nLabelling of non-retail containers ........................................................................................... 4\\n10\\nMethods of sampling ...................................................................................................................... 4\\nBibliography ............................................................................................................................................ 5\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\niii\\nForeword\\n\\nThe African Organization for Standardization (ARSO) is an African intergovernmental organization\\nestablished by the United Nations Economic Commission for Africa (UNECA) and the Organization of\\nAfrican Unity (AU) in 1977. One of the fundamental mandates of ARSO is to develop and harmonize\\nAfrican Standards (ARS) for the purpose of enhancing Africa’s internal trading capacity, increase\\nAfrica’s product and service competitiveness globally and uplift the welfare of African communities. The\\nwork of preparing African Standards is normally carried out through ARSO technical committees. Each\\nMember State interested in a subject for which a technical committee has been established has the\\nright to be represented on that committee. International organizations, Regional Economic Communities\\n(RECs), governmental and non-governmental organizations, in liaison with ARSO, also take part in the\\nwork.\\n\\nARSO Standards are drafted in accordance with the rules given in the ISO/IEC Directives, Part 2.\\n\\nThe main task of technical committees is to prepare ARSO Standards. Draft ARSO Standards adopted\\nby the technical committees are circulated to the member bodies for voting. Publication as an ARSO\\nStandard requires approval by at least 75 % of the member bodies casting a vote.\\n\\nAttention is drawn to the possibility that some of the elements of this document may be the subject of\\npatent rights. ARSO shall not be held responsible for identifying any or all such patent rights.\\n\\nThis African Standard was prepared by ARSO Technical Committee on Milk and Milk Products\\n(ARSO/TC 04).\\n\\n© African Organisation for Standardisation 2025 — All rights reserved*\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP. O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel. +254-20-2224561, +254-20-3311641, +254-20-3311608\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\n* © 2025 ARSO — All rights of exploitation reserved worldwide for African Member States’ NSBs.\\n\\nARS 1093:2025\\niv\\n© ARSO 2025 — All rights reserved\\n\\nCopyright notice\\n\\nThis ARSO document is copyright-protected by ARSO. While the reproduction of this document\\nby participants in the ARSO standards development process is permitted without prior permission\\nfrom ARSO, neither this document nor any extract from it may be reproduced, stored or\\ntransmitted in any form for any other purpose without prior written permission from ARSO.\\n\\nRequests for permission to reproduce this document for the purpose of selling it should be\\naddressed as shown below or to ARSO’s member body in the country of the requester:\\n\\n© African Organisation for Standardisation 2025 — All rights reserved\\n\\nARSO Central Secretariat\\nInternational House 3rd Floor\\nP.O. Box 57363 — 00200 City Square\\nNAIROBI, KENYA\\n\\nTel: +254-20-2224561, +254-20-3311641, +254-20-3311608\\n\\nE-mail: arso@arso-oran.org\\nWeb: www.arso-oran.org\\n\\nReproduction for sales purposes may be subject to royalty payments or a licensing agreement.\\nViolators may be prosecuted.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\nv\\nIntroduction\\n\\nButter is a fatty product derived exclusively from milk and/or products obtained from milk, principally in\\nthe form of an emulsion of the type water-in-oil.\\n\\nThis African Standard seeks to lay down requirements for the acceptable production of Butter in order\\nto ensure quality, consumer safety and promote fair trade practices.\\n\\nIn elaborating this Standard, references were made to inputs from Manufacturers, National and\\nInternational standards which are hereby duly acknowledged.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n1\\n\\nButter — Specification\\n\\n1\\nScope\\n\\nThis African Standard specifies requirements, sampling and test methods for butter, intended for direct\\nconsumption, or further processing.\\n\\n2\\nNormative references\\n\\nThe following referenced documents are indispensable for the application of this Standard. For dated\\nreferences, only the edition cited applies. For undated references, the latest edition of the referenced\\ndocument (including any amendments) applies.\\n\\nARS 53, General Principles of Food Hygiene – Code of practice\\n\\nARS 56, Pre-packaged Foods – Labelling\\n\\nARS 1034, Dairy industry — Glossary of terms\\n\\nARS 1036, Code of Hygienic Practice for Milk and Milk Products\\n\\nCXS 192, General Standard for Food Additives\\n\\nCXS 193, General Standard for Contaminants and Toxins in Food and Feed\\n\\nCXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"}]	[{"designation":"Normative references","raw":"Normative references"},{"designation":"The following referenced documents are indispensable for the app","raw":"The following referenced documents are indispensable for the application of this Standard. For dated"},{"designation":"references, only the edition cited applies. For undated referenc","raw":"references, only the edition cited applies. For undated references, the latest edition of the referenced"},{"designation":"document (including any amendments) applies.","raw":"document (including any amendments) applies."},{"designation":"ARS 53","title":"General Principles of Food Hygiene – Code of practice","raw":"ARS 53, General Principles of Food Hygiene – Code of practice"},{"designation":"ARS 56","title":"Pre-packaged Foods – Labelling","raw":"ARS 56, Pre-packaged Foods – Labelling"},{"designation":"ARS 1034","title":"Dairy industry — Glossary of terms","raw":"ARS 1034, Dairy industry — Glossary of terms"},{"designation":"ARS 1036","title":"Code of Hygienic Practice for Milk and Milk Products","raw":"ARS 1036, Code of Hygienic Practice for Milk and Milk Products"},{"designation":"CXS 192, General Standard for Food Additives","raw":"CXS 192, General Standard for Food Additives"},{"designation":"CXS 193, General Standard for Contaminants and Toxins in Food an","raw":"CXS 193, General Standard for Contaminants and Toxins in Food and Feed"},{"designation":"CXS 234, Recommended methods of analysis and sampling","raw":"CXS 234, Recommended methods of analysis and sampling"},{"designation":"CXS 346, General Standard for Labelling of non-retail containers","raw":"CXS 346, General Standard for Labelling of non-retail containers of foods"},{"designation":"ISO 707","title":"Milk and milk products — Guidance on sampling","raw":"ISO 707, Milk and milk products — Guidance on sampling"},{"designation":"ISO 4833-1","title":"Microbiology of the food chain — Horizontal method for the enumeration of microorganisms","raw":"ISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms"},{"designation":"Part 1: Colony count at 30 °C by the pour plate technique","raw":"Part 1: Colony count at 30 °C by the pour plate technique"},{"designation":"ISO 6579-1","title":"Microbiology of the food chain — Horizontal method for the detection, enumeration and","raw":"ISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and"},{"designation":"serotyping of Salmonella — Part 1: Detection of Salmonella spp.","raw":"serotyping of Salmonella — Part 1: Detection of Salmonella spp."},{"designation":"ISO 6888-1","title":"Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive","raw":"ISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive"},{"designation":"staphylococci (Staphylococcus aureus and other species) — Part 1","raw":"staphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar"},{"designation":"medium","raw":"medium"},{"designation":"ISO 11290-1","title":"Microbiology of the food chain — Horizontal method for the detection and enumeration of","raw":"ISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of"},{"designation":"Listeria monocytogenes and of Listeria spp.  Part 1: Detection m","raw":"Listeria monocytogenes and of Listeria spp.  Part 1: Detection method"},{"designation":"ISO 14501","title":"Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity","raw":"ISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity"},{"designation":"chromatography and determination by high-performance liquid chro","raw":"chromatography and determination by high-performance liquid chromatography"},{"designation":"ISO 16649-1","title":"Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of","raw":"ISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of"},{"designation":"beta-glucuronidase-positive Escherichia coli — Part 1: Colony-co","raw":"beta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using"},{"designation":"membranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide","raw":"membranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide"},{"designation":"ISO 21528-2","title":"Microbiology of the food chain — Horizontal method for the detection and enumeration of","raw":"ISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of"},{"designation":"Enterobacteriaceae","title":"Part 2: Colony-count technique","raw":"Enterobacteriaceae Part 2: Colony-count technique"},{"designation":"AFRICAN STANDARD","raw":"AFRICAN STANDARD"},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Terms and definitions","raw":"Terms and definitions"},{"designation":"ARS 1034","title":"For the purposes of this document, the terms and definitions given in  and the following shall apply.","raw":"For the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply."},{"designation":"butter","raw":"butter"},{"designation":"fatty product derived exclusively from milk and/or products obta","raw":"fatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an"},{"designation":"emulsion of the type water-in-oil","raw":"emulsion of the type water-in-oil"},{"designation":"Composition and requirements","raw":"Composition and requirements"},{"designation":"Essential raw ingredients","raw":"Essential raw ingredients"},{"designation":"Milk and/or products obtained from milk","raw":"Milk and/or products obtained from milk"},{"designation":"Permitted ingredients","raw":"Permitted ingredients"},{"designation":"a) Potable water","raw":"a) Potable water"},{"designation":"b) Sodium chloride and/or other types of food grade salt","raw":"b) Sodium chloride and/or other types of food grade salt"},{"designation":"c) Starter cultures of harmless lactic acid and/or flavour produ","raw":"c) Starter cultures of harmless lactic acid and/or flavour producing bacteria"},{"designation":"Compositional requirements","raw":"Compositional requirements"},{"designation":"Butter shall meet the compositional requirements given in Table ","raw":"Butter shall meet the compositional requirements given in Table 1 when tested in accordance with the test"},{"designation":"methods specified therein. Butter may be classified as identifie","raw":"methods specified therein. Butter may be classified as identified in Table 1 and meet the compositional"},{"designation":"requirements, as shown.","raw":"requirements, as shown."},{"designation":"Table 1 — Compositional requirements for butter","raw":"Table 1 — Compositional requirements for butter"},{"designation":"Characteristics","raw":"Characteristics"},{"designation":"Permissible limit, % (m/m)","raw":"Permissible limit, % (m/m)"},{"designation":"Test method","raw":"Test method"},{"designation":"Milk fat content, min","raw":"Milk fat content, min"},{"designation":"80,0","raw":"80,0"},{"designation":"Refer to CXS 234","raw":"Refer to CXS 234"},{"designation":"Water content, max","raw":"Water content, max"},{"designation":"16,0","raw":"16,0"},{"designation":"Milk solids-not-fat content, max","raw":"Milk solids-not-fat content, max"},{"designation":"Food additives","raw":"Food additives"},{"designation":"Food additives may be used and only within the limits specified ","raw":"Food additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter)."},{"designation":"Contaminants","raw":"Contaminants"},{"designation":"Heavy metals","raw":"Heavy metals"},{"designation":"The products covered by this African Standard shall comply with ","raw":"The products covered by this African Standard shall comply with those maximum limits for metal contaminants"},{"designation":"specified in CXS 193.","raw":"specified in CXS 193."},{"designation":"Aflatoxins","raw":"Aflatoxins"},{"designation":"ISO 14501","title":"When tested in accordance with , the level of aflatoxin M1 shall not exceed 0.5 μg/kg.","raw":"When tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg."},{"designation":"Pesticide residues","raw":"Pesticide residues"},{"designation":"Codex Alimentarius","title":"Pesticide residue limits shall be in accordance with limits set by the  Commission for the","raw":"Pesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the"},{"designation":"product covered by this Standard.","raw":"product covered by this Standard."},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Veterinary drug residues","raw":"Veterinary drug residues"},{"designation":"Codex Alimentarius","title":"Veterinary drug residue limits shall be in accordance with limits set by the  Commission","raw":"Veterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission"},{"designation":"for the product covered by this Standard.","raw":"for the product covered by this Standard."},{"designation":"Hygiene","raw":"Hygiene"},{"designation":"The products covered by this African Standard shall be produced,","raw":"The products covered by this African Standard shall be produced, prepared and handled in accordance with"},{"designation":"ARS 53","title":"the provisions of the appropriate sections of  and ARS 1036.","raw":"the provisions of the appropriate sections of ARS 53 and ARS 1036."},{"designation":"Butter shall be free from microorganisms and products originatin","raw":"Butter shall be free from microorganisms and products originating from microorganisms in amounts which"},{"designation":"may represent a hazard to human health.","raw":"may represent a hazard to human health."},{"designation":"Butter shall comply with microbiological limits given in Table 3","raw":"Butter shall comply with microbiological limits given in Table 3 when tested in accordance with the test"},{"designation":"methods specified therein.","raw":"methods specified therein."},{"designation":"Table 3 – Microbiological limits for butter","raw":"Table 3 – Microbiological limits for butter"},{"designation":"Micro-organisms","raw":"Micro-organisms"},{"designation":"Sampling","raw":"Sampling"},{"designation":"plan","raw":"plan"},{"designation":"Limits","raw":"Limits"},{"designation":"Test method","raw":"Test method"},{"designation":"reference","raw":"reference"},{"designation":"The stage at","raw":"The stage at"},{"designation":"which the","raw":"which the"},{"designation":"parameter is","raw":"parameter is"},{"designation":"applied","raw":"applied"},{"designation":"Salmonella","raw":"Salmonella"},{"designation":"Absence in 25g","raw":"Absence in 25g"},{"designation":"ISO 6579-1","raw":"ISO 6579-1"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"Listeria","raw":"Listeria"},{"designation":"monocytogenes","raw":"monocytogenes"},{"designation":"Absence in 25g","raw":"Absence in 25g"},{"designation":"ISO 11290-1","raw":"ISO 11290-1"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"Coagulase-positive","raw":"Coagulase-positive"},{"designation":"Staphylococci","raw":"Staphylococci"},{"designation":"10 cfu/g","raw":"10 cfu/g"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"ISO 6888-1","raw":"ISO 6888-1"},{"designation":"ISO 6888-2","raw":"ISO 6888-2"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"E. Coli","raw":"E. Coli"},{"designation":"10 cfu/g","raw":"10 cfu/g"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"ISO 16649-1","title":"or -2","raw":"ISO 16649-1 or -2"},{"designation":"Final","raw":"Final"},{"designation":"product","raw":"product"},{"designation":"during shelf-life","raw":"during shelf-life"},{"designation":"Enterobacteriaceae","raw":"Enterobacteriaceae"},{"designation":"10 cfu/g","raw":"10 cfu/g"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"ISO 21528-2","raw":"ISO 21528-2"},{"designation":"process","raw":"process"},{"designation":"Total Aerobic","raw":"Total Aerobic"},{"designation":"mesophilic bacterial","raw":"mesophilic bacterial"},{"designation":"count","raw":"count"},{"designation":"102 cfu/g","raw":"102 cfu/g"},{"designation":"103 cfu/g","raw":"103 cfu/g"},{"designation":"ISO 4833-1","raw":"ISO 4833-1"},{"designation":"During the process","raw":"During the process"},{"designation":"Note:","raw":"Note:"},{"designation":"n = number of units comprising the sample;","raw":"n = number of units comprising the sample;"},{"designation":"c = number of sample units giving values between m and M;","raw":"c = number of sample units giving values between m and M;"},{"designation":"m= The level of the microbiological criterion required in the pr","raw":"m= The level of the microbiological criterion required in the product;"},{"designation":"M= Value or level of microbial limit not to be reached or greate","raw":"M= Value or level of microbial limit not to be reached or greater than in any unit of the sample."},{"designation":"Packaging","raw":"Packaging"},{"designation":"Butter shall be packaged in suitable food grade containers which","raw":"Butter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,"},{"designation":"technological, and organoleptic qualities of the product during ","raw":"technological, and organoleptic qualities of the product during dispatch, transport and use of the product until"},{"designation":"end","title":"the  of its shelf life.","raw":"the end of its shelf life."},{"designation":"Labelling","raw":"Labelling"},{"designation":"ARS 56","title":"In addition to the provisions of , the following specific provisions shall apply:","raw":"In addition to the provisions of ARS 56, the following specific provisions shall apply:"},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Name of the food","raw":"Name of the food"},{"designation":"The name of the food shall be “Butter”. The name “butter” with a","raw":"The name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be"},{"designation":"used for butter with more than 95% fat.","raw":"used for butter with more than 95% fat."},{"designation":"(ii)","raw":"(ii)"},{"designation":"Butter may be labelled to indicate whether it is salted or unsal","raw":"Butter may be labelled to indicate whether it is salted or unsalted according to national"},{"designation":"legislation.","raw":"legislation."},{"designation":"Declaration of total fat content","raw":"Declaration of total fat content"},{"designation":"If the consumer would be misled by the omission, the milkfat con","raw":"If the consumer would be misled by the omission, the milkfat content shall be declared in a manner found"},{"designation":"acceptable in the country of sale to the final consumer, either","raw":"acceptable in the country of sale to the final consumer, either"},{"designation":"as a percentage by mass, or","raw":"as a percentage by mass, or"},{"designation":"(ii)","raw":"(ii)"},{"designation":"in grams per serving as quantified in the label provided that th","raw":"in grams per serving as quantified in the label provided that the number of servings is stated."},{"designation":"Labelling of non-retail containers","raw":"Labelling of non-retail containers"},{"designation":"Information required in clause 8 of this Standard needed to be c","raw":"Information required in clause 8 of this Standard needed to be complied with the requirements mentioned in"},{"designation":"CXS 346.","raw":"CXS 346."},{"designation":"Methods of sampling","raw":"Methods of sampling"},{"designation":"ISO 707","title":"For checking the compliance with this standard, the methods sampling contained in , shall be used.","raw":"For checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used."},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"},{"designation":"Bibliography","raw":"Bibliography"},{"designation":"CXS 279-1971 Standard for butter","raw":"CXS 279-1971 Standard for butter"},{"designation":"ARS 1093","title":"2025","raw":"ARS 1093:2025"},{"designation":"ARSO","title":"©  2025 — All rights reserved","raw":"© ARSO 2025 — All rights reserved"}]	{"text":"Packaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"}	{"text":"ARS 56, Pre-packaged Foods – Labelling\\n\\nARS 1034, Dairy industry — Glossary of terms\\n\\nARS 1036, Code of Hygienic Practice for Milk and Milk Products\\n\\nCXS 192, General Standard for Food Additives\\n\\nCXS 193, General Standard for Contaminants and Toxins in Food and Feed\\n\\nCXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"}	{"text":"CXS 234, Recommended methods of analysis and sampling\\n\\nCXS 346, General Standard for Labelling of non-retail containers of foods\\n\\nISO 707, Milk and milk products — Guidance on sampling\\n\\nISO 4833-1, Microbiology of the food chain — Horizontal method for the enumeration of microorganisms\\nPart 1: Colony count at 30 °C by the pour plate technique\\n\\nISO 6579-1, Microbiology of the food chain — Horizontal method for the detection, enumeration and\\nserotyping of Salmonella — Part 1: Detection of Salmonella spp.\\n\\nISO 6888-1, Microbiology of the food chain — Horizontal method for the enumeration of coagulase-positive\\nstaphylococci (Staphylococcus aureus and other species) — Part 1: Method using Baird-Parker agar\\nmedium\\n\\nISO 11290-1, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nListeria monocytogenes and of Listeria spp.  Part 1: Detection method\\n\\nISO 14501, Milk and milk powder — Determination of aflatoxin M1 content — Clean-up by immunoaffinity\\nchromatography and determination by high-performance liquid chromatography\\n\\nISO 16649-1, Microbiology of food and animal feeding stuffs — Horizontal method for the enumeration of\\nbeta-glucuronidase-positive Escherichia coli — Part 1: Colony-count technique at 44 degrees C using\\nmembranes and 5-bromo-4-chloro-3-indolyl beta-D-glucuronide\\n\\nISO 21528-2, Microbiology of the food chain — Horizontal method for the detection and enumeration of\\nEnterobacteriaceae Part 2: Colony-count technique\\n\\nAFRICAN STANDARD\\n\\nARS 1093:2025\\n2\\n© ARSO 2025 — All rights reserved\\n\\n3\\nTerms and definitions\\n\\nFor the purposes of this document, the terms and definitions given in ARS 1034 and the following shall apply.\\n\\n3.1\\nbutter\\nfatty product derived exclusively from milk and/or products obtained from milk, principally in the form of an\\nemulsion of the type water-in-oil\\n\\n4\\nComposition and requirements\\n\\n4.1\\nEssential raw ingredients\\n\\nMilk and/or products obtained from milk\\n\\n4.2\\nPermitted ingredients\\n\\na) Potable water\\n\\nb) Sodium chloride and/or other types of food grade salt\\n\\nc) Starter cultures of harmless lactic acid and/or flavour producing bacteria\\n\\n4.3\\nCompositional requirements\\n\\nButter shall meet the compositional requirements given in Table 1 when tested in accordance with the test\\nmethods specified therein. Butter may be classified as identified in Table 1 and meet the compositional\\nrequirements, as shown.\\n\\nTable 1 — Compositional requirements for butter\\n\\nCharacteristics\\nPermissible limit, % (m/m)\\nTest method\\nMilk fat content, min\\n80,0\\nRefer to CXS 234\\nWater content, max\\n16,0\\nMilk solids-not-fat content, max\\n2,0\\n\\n5\\nFood additives\\n\\nFood additives may be used and only within the limits specified in CXS 192 - Category 02.2.1 (Butter).\\n\\n6\\nContaminants\\n\\n6.1\\nHeavy metals\\n\\nThe products covered by this African Standard shall comply with those maximum limits for metal contaminants\\nspecified in CXS 193.\\n\\n6.2\\nAflatoxins\\n\\nWhen tested in accordance with ISO 14501, the level of aflatoxin M1 shall not exceed 0.5 μg/kg.\\n\\n6.3\\nPesticide residues\\n\\nPesticide residue limits shall be in accordance with limits set by the Codex Alimentarius Commission for the\\nproduct covered by this Standard.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n3\\n\\n6.4\\nVeterinary drug residues\\n\\nVeterinary drug residue limits shall be in accordance with limits set by the Codex Alimentarius Commission\\nfor the product covered by this Standard.\\n\\n7\\nHygiene\\n\\nThe products covered by this African Standard shall be produced, prepared and handled in accordance with\\nthe provisions of the appropriate sections of ARS 53 and ARS 1036.\\n\\nButter shall be free from microorganisms and products originating from microorganisms in amounts which\\nmay represent a hazard to human health.\\n\\nButter shall comply with microbiological limits given in Table 3 when tested in accordance with the test\\nmethods specified therein.\\n\\nTable 3 – Microbiological limits for butter\\n\\nMicro-organisms\\nSampling\\nplan\\nLimits\\nTest method\\nreference\\nThe stage at\\nwhich the\\nparameter is\\napplied\\nn\\nc\\nm\\nM\\nSalmonella\\n5\\n0\\nAbsence in 25g\\nISO 6579-1\\n\\nFinal\\nproduct\\nduring shelf-life\\nListeria\\nmonocytogenes\\n5\\n0\\nAbsence in 25g\\nISO 11290-1\\nFinal\\nproduct\\nduring shelf-life\\nCoagulase-positive\\nStaphylococci\\n5\\n1\\n10 cfu/g\\n102 cfu/g\\nISO 6888-1\\nISO 6888-2\\nFinal\\nproduct\\nduring shelf-life\\nE. Coli\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 16649-1 or -2\\nFinal\\nproduct\\nduring shelf-life\\nEnterobacteriaceae\\n5\\n2\\n10 cfu/g\\n102 cfu/g\\nISO 21528-2\\nAt\\nthe\\nend\\nof\\nprocess\\nTotal Aerobic\\nmesophilic bacterial\\ncount\\n5\\n1\\n102 cfu/g\\n103 cfu/g\\nISO 4833-1\\nDuring the process\\nNote:\\nn = number of units comprising the sample;\\nc = number of sample units giving values between m and M;\\nm= The level of the microbiological criterion required in the product;\\nM= Value or level of microbial limit not to be reached or greater than in any unit of the sample.\\n\\n8\\nPackaging\\n\\nButter shall be packaged in suitable food grade containers which will safeguard the hygienic, nutritional,\\ntechnological, and organoleptic qualities of the product during dispatch, transport and use of the product until\\nthe end of its shelf life.\\n\\n9\\nLabelling\\n\\nIn addition to the provisions of ARS 56, the following specific provisions shall apply:\\n\\nARS 1093:2025\\n4\\n© ARSO 2025 — All rights reserved\\n9.1\\nName of the food\\n\\n(i)\\nThe name of the food shall be “Butter”. The name “butter” with a suitable qualification shall be\\nused for butter with more than 95% fat.\\n\\n(ii)\\nButter may be labelled to indicate whether it is salted or unsalted according to national\\nlegislation.\\n\\n9.2\\nDeclaration of total fat content\\n\\nIf the consumer would be misled by the omission, the milkfat content shall be declared in a manner found\\nacceptable in the country of sale to the final consumer, either\\n\\n(i)\\nas a percentage by mass, or\\n\\n(ii)\\nin grams per serving as quantified in the label provided that the number of servings is stated.\\n\\n9.3\\nLabelling of non-retail containers\\n\\nInformation required in clause 8 of this Standard needed to be complied with the requirements mentioned in\\nCXS 346.\\n\\n10\\nMethods of sampling\\n\\nFor checking the compliance with this standard, the methods sampling contained in ISO 707, shall be used.\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved\\n5\\nBibliography\\n\\nCXS 279-1971 Standard for butter\\n\\nARS 1093:2025\\n© ARSO 2025 — All rights reserved"}
\.


--
-- Data for Name: SurveillanceCase; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SurveillanceCase" (id, "pinId", title, status, summary, "createdAt") FROM stdin;
\.


--
-- Data for Name: TariffLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TariffLine" (id, "recId", "codeDisplay", "codeNormalized", "codeLength", "parentTariffLineId", "hsHeading", description, "effectiveFrom", "effectiveTo") FROM stdin;
tl-eac-11062020-7cb3	rec-eac	1106.20.20	11062020	8	\N	1106	Flour, meal, or powder of dried cassava	2026-10-09 13:06:03.055	\N
tl-sadc-04051010-ee89	rec-sadc-f43d	0405.10.10	04051010	8	\N	0405	Salted / Natural Butter	2026-10-12 06:11:24.382	\N
tl-eac-04051000-bdc5	rec-eac	0405.10.00	04051000	8	\N	0405	Butter	2026-10-12 06:22:28.81	\N
\.


--
-- Data for Name: UserAccount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserAccount" (id, email, name, "passwordHash", "emailVerified", locale, "rolesGlobal", "createdAt", "lastActiveAt") FROM stdin;
cmv0sefga000112mnvkgwo6zl	support@arso-oran.org	ARSO Support	$2b$10$lJBCDLA1mLmXr.V3JpcQE.58ucxcFy2rsIVocFaW3JKXCmPDwxHMe	t	en	ARSO_SUPPORT	2026-10-09 09:52:44.987	2026-10-09 09:52:44.987
cmv0sefgb000212mnpmb00pah	catalogue@arso-oran.org	Catalogue Editor	$2b$10$lJBCDLA1mLmXr.V3JpcQE.58ucxcFy2rsIVocFaW3JKXCmPDwxHMe	t	en	ARSO_CATALOGUE_EDITOR	2026-10-09 09:52:44.987	2026-10-09 09:52:44.987
cmv0sefgb000312mnlownug1i	auditor@arso-oran.org	ARSO Auditor	$2b$10$lJBCDLA1mLmXr.V3JpcQE.58ucxcFy2rsIVocFaW3JKXCmPDwxHMe	t	en	ARSO_AUDITOR	2026-10-09 09:52:44.988	2026-10-09 09:52:44.988
cmv0sefv900002h7v8gw5apm3	cb@kebs.org	KEBS CB Officer	$2b$10$P340O5eoly1DDU21Ma5nZOxA2B/oXaR/r7321SR27CRNxFAxugwfS	t	en		2026-10-09 09:52:45.525	2026-10-09 09:52:45.525
cmv0zqpfa0016u0vij3bqq6cg	jerutom@arso-oran.org	Sweet Cassava Flour Limited Admin	$2b$10$9h1BoqE0hw9mLA4zJK2Pz.Bdv93yBcdxxgi11lmhduVzjLlNgQFSG	t	en		2026-10-09 13:18:15.095	2026-10-09 13:19:06.854
cmv0sefg8000012mnqep5hc2k	admin@arso-oran.org	ARSO Hub Admin	$2b$10$lJBCDLA1mLmXr.V3JpcQE.58ucxcFy2rsIVocFaW3JKXCmPDwxHMe	t	en	ARSO_ADMIN	2026-10-09 09:52:44.985	2026-10-12 06:50:22.151
\.


--
-- Data for Name: UserRoleAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserRoleAssignment" (id, "userId", "roleCode", "organizationId", "grantedAt", "grantedById") FROM stdin;
ura-arso_admin	cmv0sefg8000012mnqep5hc2k	ARSO_ADMIN	\N	2026-10-09 09:52:44.992	cmv0sefg8000012mnqep5hc2k
ura-arso_support	cmv0sefga000112mnvkgwo6zl	ARSO_SUPPORT	\N	2026-10-09 09:52:44.993	cmv0sefg8000012mnqep5hc2k
ura-arso_catalogue_editor	cmv0sefgb000212mnpmb00pah	ARSO_CATALOGUE_EDITOR	\N	2026-10-09 09:52:44.993	cmv0sefg8000012mnqep5hc2k
ura-arso_auditor	cmv0sefgb000312mnlownug1i	ARSO_AUDITOR	\N	2026-10-09 09:52:44.994	cmv0sefg8000012mnqep5hc2k
\.


--
-- Data for Name: WebhookOutbox; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebhookOutbox" (id, "eventType", "payloadJson", "targetHint", status, "createdAt", "deliveredAt", attempts) FROM stdin;
cmv10fxr4000m3f0r36zjggyq	CertificateIssued	{"certificateNo":"COC-QUALITY-2026-4C9AB1","status":"certified","productId":"cmv10eab300023f0rtnvzl40t","markScheme":"QUALITY"}	EAC	PENDING	2026-10-09 13:37:52.288	\N	0
cmv11h3rw0028u00ebmdi0oru	CertificateIssued	{"certificateNo":"COC-QUALITY-2026-0DA647","status":"certified","productId":"cmv11ejsi000ju00eblue174u","markScheme":"QUALITY"}	EAC	PENDING	2026-10-09 14:06:46.365	\N	0
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
25851993-a8b5-404a-b970-0ed75bbea606	13cc307d684e6692afcbd15a8485d315e531d50d8ab024fe43f03e0d3795b293	2026-10-09 12:52:42.191725+03	20261009075300_init	\N	\N	2026-10-09 12:52:42.104265+03	1
581a059f-f74d-494c-93c8-27d1b46bf9e9	62d4abeb45dbf97bc1f8e0c97c9eb822c89ae6d46d9d324691d033e9b7d59bcf	2026-10-09 16:33:56.51224+03	20261009143000_conformity_chain	\N	\N	2026-10-09 16:33:56.498412+03	1
02429a79-da9a-49da-9a57-607fbbd0c128	aa3882a219f8f7c8537e1f779921691560775f9944f105afb820eef2c813720d	2026-10-09 17:01:27.009512+03	20261009170000_cb_assessment	\N	\N	2026-10-09 17:01:26.996053+03	1
a54d4c03-a7f6-4354-b4dc-7e727d3e282e	4655afa5a34ebbaa31748db864cae06b3c506a7586c0a530657c7f822d662019	2026-10-12 09:44:37.128066+03	20261012094100_store_payments	\N	\N	2026-10-12 09:44:37.118525+03	1
\.


--
-- Name: AssessmentItem AssessmentItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssessmentItem"
    ADD CONSTRAINT "AssessmentItem_pkey" PRIMARY KEY (id);


--
-- Name: Attachment Attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_pkey" PRIMARY KEY (id);


--
-- Name: AuditEvent AuditEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_pkey" PRIMARY KEY (id);


--
-- Name: CatalogItem CatalogItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CatalogItem"
    ADD CONSTRAINT "CatalogItem_pkey" PRIMARY KEY (id);


--
-- Name: CbLicense CbLicense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CbLicense"
    ADD CONSTRAINT "CbLicense_pkey" PRIMARY KEY (id);


--
-- Name: CertificationApplication CertificationApplication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CertificationApplication"
    ADD CONSTRAINT "CertificationApplication_pkey" PRIMARY KEY (id);


--
-- Name: ClientAccount ClientAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClientAccount"
    ADD CONSTRAINT "ClientAccount_pkey" PRIMARY KEY (id);


--
-- Name: CoC CoC_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CoC"
    ADD CONSTRAINT "CoC_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: ConformityInspection ConformityInspection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConformityInspection"
    ADD CONSTRAINT "ConformityInspection_pkey" PRIMARY KEY (id);


--
-- Name: ConsumerComplaint ConsumerComplaint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsumerComplaint"
    ADD CONSTRAINT "ConsumerComplaint_pkey" PRIMARY KEY (id);


--
-- Name: CustomsClearance CustomsClearance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomsClearance"
    ADD CONSTRAINT "CustomsClearance_pkey" PRIMARY KEY (id);


--
-- Name: EntryPoint EntryPoint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntryPoint"
    ADD CONSTRAINT "EntryPoint_pkey" PRIMARY KEY (id);


--
-- Name: FeeEvent FeeEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeeEvent"
    ADD CONSTRAINT "FeeEvent_pkey" PRIMARY KEY (id);


--
-- Name: FraudAlert FraudAlert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FraudAlert"
    ADD CONSTRAINT "FraudAlert_pkey" PRIMARY KEY (id);


--
-- Name: Invitation Invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invitation"
    ADD CONSTRAINT "Invitation_pkey" PRIMARY KEY (id);


--
-- Name: LabEvidence LabEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabEvidence"
    ADD CONSTRAINT "LabEvidence_pkey" PRIMARY KEY (id);


--
-- Name: LabResult LabResult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResult"
    ADD CONSTRAINT "LabResult_pkey" PRIMARY KEY (id);


--
-- Name: LedgerAnchor LedgerAnchor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LedgerAnchor"
    ADD CONSTRAINT "LedgerAnchor_pkey" PRIMARY KEY (id);


--
-- Name: MarkGrant MarkGrant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarkGrant"
    ADD CONSTRAINT "MarkGrant_pkey" PRIMARY KEY (id);


--
-- Name: MarkSublicense MarkSublicense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarkSublicense"
    ADD CONSTRAINT "MarkSublicense_pkey" PRIMARY KEY (id);


--
-- Name: MemberState MemberState_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MemberState"
    ADD CONSTRAINT "MemberState_pkey" PRIMARY KEY (id);


--
-- Name: MetricSnapshot MetricSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MetricSnapshot"
    ADD CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: NationalRuleLink NationalRuleLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NationalRuleLink"
    ADD CONSTRAINT "NationalRuleLink_pkey" PRIMARY KEY (id);


--
-- Name: NationalRule NationalRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NationalRule"
    ADD CONSTRAINT "NationalRule_pkey" PRIMARY KEY (id);


--
-- Name: NotificationJob NotificationJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationJob"
    ADD CONSTRAINT "NotificationJob_pkey" PRIMARY KEY (id);


--
-- Name: OfflineCacheProfile OfflineCacheProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OfflineCacheProfile"
    ADD CONSTRAINT "OfflineCacheProfile_pkey" PRIMARY KEY (id);


--
-- Name: OrderLine OrderLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderLine"
    ADD CONSTRAINT "OrderLine_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: OrganizationMembership OrganizationMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: PaymentAttempt PaymentAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentAttempt"
    ADD CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY (id);


--
-- Name: PesapalNotification PesapalNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PesapalNotification"
    ADD CONSTRAINT "PesapalNotification_pkey" PRIMARY KEY (id);


--
-- Name: PortfolioTransfer PortfolioTransfer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PortfolioTransfer"
    ADD CONSTRAINT "PortfolioTransfer_pkey" PRIMARY KEY (id);


--
-- Name: ProductPin ProductPin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductPin"
    ADD CONSTRAINT "ProductPin_pkey" PRIMARY KEY (id);


--
-- Name: ProductStandardLink ProductStandardLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStandardLink"
    ADD CONSTRAINT "ProductStandardLink_pkey" PRIMARY KEY (id);


--
-- Name: ProductVariant ProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: RateLimitBucket RateLimitBucket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RateLimitBucket"
    ADD CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY (id);


--
-- Name: Rec Rec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rec"
    ADD CONSTRAINT "Rec_pkey" PRIMARY KEY (id);


--
-- Name: RoleDefinition RoleDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoleDefinition"
    ADD CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY (id);


--
-- Name: Sanction Sanction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sanction"
    ADD CONSTRAINT "Sanction_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: StandardEntitlement StandardEntitlement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StandardEntitlement"
    ADD CONSTRAINT "StandardEntitlement_pkey" PRIMARY KEY (id);


--
-- Name: StandardTariffMap StandardTariffMap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StandardTariffMap"
    ADD CONSTRAINT "StandardTariffMap_pkey" PRIMARY KEY (id);


--
-- Name: StandardVersion StandardVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StandardVersion"
    ADD CONSTRAINT "StandardVersion_pkey" PRIMARY KEY (id);


--
-- Name: Standard Standard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Standard"
    ADD CONSTRAINT "Standard_pkey" PRIMARY KEY (id);


--
-- Name: SurveillanceCase SurveillanceCase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurveillanceCase"
    ADD CONSTRAINT "SurveillanceCase_pkey" PRIMARY KEY (id);


--
-- Name: TariffLine TariffLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TariffLine"
    ADD CONSTRAINT "TariffLine_pkey" PRIMARY KEY (id);


--
-- Name: UserAccount UserAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserAccount"
    ADD CONSTRAINT "UserAccount_pkey" PRIMARY KEY (id);


--
-- Name: UserRoleAssignment UserRoleAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRoleAssignment"
    ADD CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY (id);


--
-- Name: WebhookOutbox WebhookOutbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebhookOutbox"
    ADD CONSTRAINT "WebhookOutbox_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AssessmentItem_applicationId_itemKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AssessmentItem_applicationId_itemKey_key" ON public."AssessmentItem" USING btree ("applicationId", "itemKey");


--
-- Name: CatalogItem_standardVersionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CatalogItem_standardVersionId_key" ON public."CatalogItem" USING btree ("standardVersionId");


--
-- Name: CbLicense_licenseNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CbLicense_licenseNumber_key" ON public."CbLicense" USING btree ("licenseNumber");


--
-- Name: CertificationApplication_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CertificationApplication_idempotencyKey_key" ON public."CertificationApplication" USING btree ("idempotencyKey");


--
-- Name: CertificationApplication_productId_standardVersionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CertificationApplication_productId_standardVersionId_key" ON public."CertificationApplication" USING btree ("productId", "standardVersionId");


--
-- Name: CoC_applicationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CoC_applicationId_key" ON public."CoC" USING btree ("applicationId");


--
-- Name: CoC_certificateNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CoC_certificateNo_key" ON public."CoC" USING btree ("certificateNo");


--
-- Name: EntryPoint_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EntryPoint_code_key" ON public."EntryPoint" USING btree (code);


--
-- Name: Invitation_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invitation_token_key" ON public."Invitation" USING btree (token);


--
-- Name: LabResult_applicationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LabResult_applicationId_key" ON public."LabResult" USING btree ("applicationId");


--
-- Name: MarkSublicense_licenseNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MarkSublicense_licenseNumber_key" ON public."MarkSublicense" USING btree ("licenseNumber");


--
-- Name: MemberState_iso2_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MemberState_iso2_key" ON public."MemberState" USING btree (iso2);


--
-- Name: OrganizationMembership_organizationId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON public."OrganizationMembership" USING btree ("organizationId", "userId");


--
-- Name: PaymentAttempt_providerRef_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentAttempt_providerRef_idx" ON public."PaymentAttempt" USING btree ("providerRef");


--
-- Name: PesapalNotification_environment_notificationUrl_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PesapalNotification_environment_notificationUrl_key" ON public."PesapalNotification" USING btree (environment, "notificationUrl");


--
-- Name: ProductPin_pinCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductPin_pinCode_key" ON public."ProductPin" USING btree ("pinCode");


--
-- Name: ProductPin_variantId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductPin_variantId_key" ON public."ProductPin" USING btree ("variantId");


--
-- Name: ProductStandardLink_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductStandardLink_productId_key" ON public."ProductStandardLink" USING btree ("productId");


--
-- Name: Rec_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Rec_code_key" ON public."Rec" USING btree (code);


--
-- Name: RoleDefinition_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RoleDefinition_code_key" ON public."RoleDefinition" USING btree (code);


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: StandardTariffMap_standardVersionId_tariffLineId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StandardTariffMap_standardVersionId_tariffLineId_key" ON public."StandardTariffMap" USING btree ("standardVersionId", "tariffLineId");


--
-- Name: Standard_designation_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Standard_designation_key" ON public."Standard" USING btree (designation);


--
-- Name: TariffLine_recId_codeNormalized_effectiveFrom_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TariffLine_recId_codeNormalized_effectiveFrom_key" ON public."TariffLine" USING btree ("recId", "codeNormalized", "effectiveFrom");


--
-- Name: UserAccount_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserAccount_email_key" ON public."UserAccount" USING btree (email);


--
-- Name: UserRoleAssignment_roleCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserRoleAssignment_roleCode_idx" ON public."UserRoleAssignment" USING btree ("roleCode");


--
-- Name: UserRoleAssignment_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserRoleAssignment_userId_idx" ON public."UserRoleAssignment" USING btree ("userId");


--
-- Name: UserRoleAssignment_userId_roleCode_organizationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserRoleAssignment_userId_roleCode_organizationId_key" ON public."UserRoleAssignment" USING btree ("userId", "roleCode", "organizationId");


--
-- Name: AssessmentItem AssessmentItem_applicationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssessmentItem"
    ADD CONSTRAINT "AssessmentItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public."CertificationApplication"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attachment Attachment_applicationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public."CertificationApplication"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CatalogItem CatalogItem_standardVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CatalogItem"
    ADD CONSTRAINT "CatalogItem_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES public."StandardVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CbLicense CbLicense_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CbLicense"
    ADD CONSTRAINT "CbLicense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CbLicense CbLicense_parentLicenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CbLicense"
    ADD CONSTRAINT "CbLicense_parentLicenseId_fkey" FOREIGN KEY ("parentLicenseId") REFERENCES public."CbLicense"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CertificationApplication CertificationApplication_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CertificationApplication"
    ADD CONSTRAINT "CertificationApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CertificationApplication CertificationApplication_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CertificationApplication"
    ADD CONSTRAINT "CertificationApplication_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CertificationApplication CertificationApplication_standardVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CertificationApplication"
    ADD CONSTRAINT "CertificationApplication_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES public."StandardVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClientAccount ClientAccount_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClientAccount"
    ADD CONSTRAINT "ClientAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CoC CoC_applicationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CoC"
    ADD CONSTRAINT "CoC_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public."CertificationApplication"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Company Company_clientAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES public."ClientAccount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConformityInspection ConformityInspection_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConformityInspection"
    ADD CONSTRAINT "ConformityInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConformityInspection ConformityInspection_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConformityInspection"
    ADD CONSTRAINT "ConformityInspection_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConformityInspection ConformityInspection_standardVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConformityInspection"
    ADD CONSTRAINT "ConformityInspection_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES public."StandardVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConsumerComplaint ConsumerComplaint_pinId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsumerComplaint"
    ADD CONSTRAINT "ConsumerComplaint_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES public."ProductPin"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConsumerComplaint ConsumerComplaint_routedCbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsumerComplaint"
    ADD CONSTRAINT "ConsumerComplaint_routedCbId_fkey" FOREIGN KEY ("routedCbId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CustomsClearance CustomsClearance_cocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomsClearance"
    ADD CONSTRAINT "CustomsClearance_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES public."CoC"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CustomsClearance CustomsClearance_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomsClearance"
    ADD CONSTRAINT "CustomsClearance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CustomsClearance CustomsClearance_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomsClearance"
    ADD CONSTRAINT "CustomsClearance_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EntryPoint EntryPoint_memberStateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntryPoint"
    ADD CONSTRAINT "EntryPoint_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES public."MemberState"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EntryPoint EntryPoint_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntryPoint"
    ADD CONSTRAINT "EntryPoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FeeEvent FeeEvent_cocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeeEvent"
    ADD CONSTRAINT "FeeEvent_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES public."CoC"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FraudAlert FraudAlert_pinId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FraudAlert"
    ADD CONSTRAINT "FraudAlert_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES public."ProductPin"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invitation Invitation_invitedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invitation"
    ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES public."UserAccount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabEvidence LabEvidence_assessmentItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabEvidence"
    ADD CONSTRAINT "LabEvidence_assessmentItemId_fkey" FOREIGN KEY ("assessmentItemId") REFERENCES public."AssessmentItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LabResult LabResult_applicationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResult"
    ADD CONSTRAINT "LabResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public."CertificationApplication"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LedgerAnchor LedgerAnchor_cocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LedgerAnchor"
    ADD CONSTRAINT "LedgerAnchor_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES public."CoC"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarkGrant MarkGrant_cocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarkGrant"
    ADD CONSTRAINT "MarkGrant_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES public."CoC"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarkSublicense MarkSublicense_cbLicenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarkSublicense"
    ADD CONSTRAINT "MarkSublicense_cbLicenseId_fkey" FOREIGN KEY ("cbLicenseId") REFERENCES public."CbLicense"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarkSublicense MarkSublicense_issuerOrgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarkSublicense"
    ADD CONSTRAINT "MarkSublicense_issuerOrgId_fkey" FOREIGN KEY ("issuerOrgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NationalRuleLink NationalRuleLink_nationalRuleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NationalRuleLink"
    ADD CONSTRAINT "NationalRuleLink_nationalRuleId_fkey" FOREIGN KEY ("nationalRuleId") REFERENCES public."NationalRule"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NationalRuleLink NationalRuleLink_standardVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NationalRuleLink"
    ADD CONSTRAINT "NationalRuleLink_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES public."StandardVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NationalRule NationalRule_memberStateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NationalRule"
    ADD CONSTRAINT "NationalRule_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES public."MemberState"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NotificationJob NotificationJob_cocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationJob"
    ADD CONSTRAINT "NotificationJob_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES public."CoC"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderLine OrderLine_catalogItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderLine"
    ADD CONSTRAINT "OrderLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES public."CatalogItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderLine OrderLine_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderLine"
    ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrganizationMembership OrganizationMembership_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrganizationMembership OrganizationMembership_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."UserAccount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Organization Organization_memberStateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_memberStateId_fkey" FOREIGN KEY ("memberStateId") REFERENCES public."MemberState"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Organization Organization_servicingCbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_servicingCbId_fkey" FOREIGN KEY ("servicingCbId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentAttempt PaymentAttempt_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentAttempt"
    ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductPin ProductPin_cocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductPin"
    ADD CONSTRAINT "ProductPin_cocId_fkey" FOREIGN KEY ("cocId") REFERENCES public."CoC"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductPin ProductPin_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductPin"
    ADD CONSTRAINT "ProductPin_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductStandardLink ProductStandardLink_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStandardLink"
    ADD CONSTRAINT "ProductStandardLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductStandardLink ProductStandardLink_standardVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStandardLink"
    ADD CONSTRAINT "ProductStandardLink_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES public."StandardVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductVariant ProductVariant_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_tariffLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_tariffLineId_fkey" FOREIGN KEY ("tariffLineId") REFERENCES public."TariffLine"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sanction Sanction_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sanction"
    ADD CONSTRAINT "Sanction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."SurveillanceCase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."UserAccount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StandardEntitlement StandardEntitlement_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StandardEntitlement"
    ADD CONSTRAINT "StandardEntitlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StandardTariffMap StandardTariffMap_standardVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StandardTariffMap"
    ADD CONSTRAINT "StandardTariffMap_standardVersionId_fkey" FOREIGN KEY ("standardVersionId") REFERENCES public."StandardVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StandardTariffMap StandardTariffMap_tariffLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StandardTariffMap"
    ADD CONSTRAINT "StandardTariffMap_tariffLineId_fkey" FOREIGN KEY ("tariffLineId") REFERENCES public."TariffLine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StandardVersion StandardVersion_standardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StandardVersion"
    ADD CONSTRAINT "StandardVersion_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES public."Standard"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurveillanceCase SurveillanceCase_pinId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurveillanceCase"
    ADD CONSTRAINT "SurveillanceCase_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES public."ProductPin"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TariffLine TariffLine_parentTariffLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TariffLine"
    ADD CONSTRAINT "TariffLine_parentTariffLineId_fkey" FOREIGN KEY ("parentTariffLineId") REFERENCES public."TariffLine"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TariffLine TariffLine_recId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TariffLine"
    ADD CONSTRAINT "TariffLine_recId_fkey" FOREIGN KEY ("recId") REFERENCES public."Rec"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserRoleAssignment UserRoleAssignment_roleCode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRoleAssignment"
    ADD CONSTRAINT "UserRoleAssignment_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES public."RoleDefinition"(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserRoleAssignment UserRoleAssignment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRoleAssignment"
    ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."UserAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict qIZ7gMxFggqfoi21y0aHfeRbFuHrVKWLf2k3o3NlQe0GKYJgfhS1APitPGT9pdj

