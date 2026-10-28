import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { loadLibraryInstitutions } from "@/lib/library";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { RoleRequestForm } from "./role-request-form";

export default async function LibraryRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ organizationId?: string; memberStateId?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/library/request`} />;
  const sp = await searchParams;
  const [institutions, pending] = await Promise.all([
    loadLibraryInstitutions(),
    prisma.libraryAccessRequest.findFirst({
      where: { userId: session.userId, status: "PENDING" },
      include: { organization: true, memberState: true },
    }),
  ]);

  return (
    <div className="shell py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Request the standards officer role</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        A standards officer works on harmonisation and adoption of African standards. This is not product certification.
      </p>
      {pending ? (
        <p className="mt-6 rounded-lg border border-[var(--line)] p-4 text-sm">
          Your request to be a standards officer at {pending.organization.name} for {pending.memberState.name} is waiting for ARSO.
        </p>
      ) : (
        <RoleRequestForm
          institutions={institutions.map((org) => ({
            id: org.id,
            name: org.name,
            type: org.type,
            backing: org.backing,
            alsoCertifies: org.alsoCertifies,
            homeCountryId: org.memberStateId,
            homeCountryName: org.memberState?.name || "",
            countries:
              org.backing === "PRIVATE"
                ? org.operatingCountries.map((row) => ({ id: row.memberState.id, name: row.memberState.name }))
                : org.memberState
                  ? [{ id: org.memberState.id, name: org.memberState.name }]
                  : [],
          }))}
          organizationId={sp.organizationId || ""}
          memberStateId={sp.memberStateId || ""}
        />
      )}
      <p className="mt-6 text-sm">
        <Link className="underline" href={`/${locale}/library`}>Back to the library</Link>
      </p>
    </div>
  );
}
