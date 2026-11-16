-- Scope and secretariat country for a technical committee.

ALTER TABLE "TechnicalCommittee" ADD COLUMN "scope" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TechnicalCommittee" ADD COLUMN "secretariatMemberStateId" TEXT;

CREATE INDEX "TechnicalCommittee_secretariatMemberStateId_idx" ON "TechnicalCommittee"("secretariatMemberStateId");

ALTER TABLE "TechnicalCommittee"
  ADD CONSTRAINT "TechnicalCommittee_secretariatMemberStateId_fkey"
  FOREIGN KEY ("secretariatMemberStateId") REFERENCES "MemberState"("id") ON DELETE SET NULL ON UPDATE CASCADE;
