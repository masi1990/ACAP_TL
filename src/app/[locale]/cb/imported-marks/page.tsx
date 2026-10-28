import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOpenCertification } from "@/lib/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { CrudForm } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";
import { portalStatusByPin } from "@/lib/imported-marks";

export default async function CbImportedMarksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/cb/imported-marks`} />;
  if (!canOpenCertification(session.user)) notFound();

  const cbMemberships = (session.user.memberships ?? []).filter((membership) => membership.organization.type === "CB");
  const names = cbMemberships.map((membership) => membership.organization.name.trim().toLowerCase());
  const cbIds = new Set(cbMemberships.map((membership) => membership.organization.id));
  const hub = can(session.user, "portal:operate");
  const marks = await prisma.importedCertifiedMark.findMany({ orderBy: { productName: "asc" } });
  const visible = marks.filter(
    (mark) => hub || names.includes(mark.cbName.trim().toLowerCase()) || (mark.certificationBodyOrgId && cbIds.has(mark.certificationBodyOrgId)),
  );
  const portals = await portalStatusByPin(visible.map((mark) => mark.pinText));
  const removed = visible.filter((mark) => portals.status.get(mark.pinText) === "removed");
  const requests = await prisma.portalRelistRequest.findMany({
    where: { pinText: { in: removed.map((mark) => mark.pinText) } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="shell space-y-6 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Copied marks</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Products removed by ARSO</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          ARSO can take a copied product off this hub&apos;s public registry. You can see the reason. You cannot put it back.
          Ask ARSO to return it, and only ARSO can approve that request.
        </p>
        <p className="mt-2 text-sm">
          <Link href={`/${locale}/cb`} className="underline">
            Back to the certification desk
          </Link>
        </p>
      </div>
      {removed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-sm text-[var(--muted)]">
          None of your copied products have been removed.
        </p>
      ) : (
        removed.map((mark) => {
          const pending = requests.find((request) => request.pinText === mark.pinText && request.status === "pending");
          const latest = requests.find((request) => request.pinText === mark.pinText);
          return (
            <article key={mark.id} className="rounded-xl border border-[var(--line)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{mark.productName}</span>
                <Badge tone="bad">Removed by ARSO</Badge>
              </div>
              <p className="mt-2 text-sm">
                {mark.certificationId} · <span className="font-mono">{mark.pinText}</span>
              </p>
              {mark.brand ? <p className="mt-1 text-sm">Brand: {mark.brand}</p> : null}
              <p className="mt-1 text-sm">Reason: {portals.reason.get(mark.pinText) || "No reason recorded"}</p>
              {latest?.status === "rejected" && latest.arsoNote && (
                <p className="mt-1 text-sm">ARSO declined the last request: {latest.arsoNote}</p>
              )}
              {pending ? (
                <p className="mt-3 text-sm text-[var(--muted)]">A return request is waiting for ARSO.</p>
              ) : (
                (names.includes(mark.cbName.trim().toLowerCase()) || (mark.certificationBodyOrgId && cbIds.has(mark.certificationBodyOrgId))) && (
                  <div className="mt-3">
                    <CrudForm
                      action="/api/cb/imported-marks/relist"
                      submitLabel="Ask ARSO to return this product"
                      idPrefix={`${mark.id}-ask-`}
                      fields={[
                        { name: "pinText", label: "PIN", hidden: true, defaultValue: mark.pinText },
                        { name: "reason", label: "Why it should be listed again", type: "textarea", required: true },
                      ]}
                    />
                  </div>
                )
              )}
            </article>
          );
        })
      )}
    </main>
  );
}
