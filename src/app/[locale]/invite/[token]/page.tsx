import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n";
import { roleLabel } from "@/lib/rbac";
import { AcceptInviteForm } from "./accept-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: raw, token } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const invite = await prisma.invitation.findUnique({ where: { token } });
  const [organization, roleDef] = invite
    ? await Promise.all([
        prisma.organization.findUnique({ where: { id: invite.organizationId }, select: { name: true } }),
        prisma.roleDefinition.findUnique({ where: { code: invite.role }, select: { name: true } }),
      ])
    : [null, null];

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Invitation</h1>
      {!invite || invite.acceptedAt ? (
        <p className="mt-4 text-sm text-[var(--muted)]">This invitation is no longer available.</p>
      ) : invite.expiresAt < new Date() ? (
        <p className="mt-4 text-sm text-[var(--muted)]">This invitation has expired.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Join {organization?.name || "this organization"} as {roleLabel(invite.role, roleDef?.name)}.
          </p>
          <AcceptInviteForm
            token={token}
            locale={locale}
            email={invite.email}
            needsAccount={!(await prisma.userAccount.findUnique({ where: { email: invite.email.toLowerCase() } }))}
          />
        </>
      )}
    </div>
  );
}
