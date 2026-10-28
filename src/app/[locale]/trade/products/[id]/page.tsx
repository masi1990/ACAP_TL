import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { isTradeOrgType } from "@/lib/rbac";
import { countryOptions } from "@/lib/countries";
import { customsDeskProduct } from "@/lib/customs-desk";
import { withDecisionActors } from "@/lib/line-actor";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { CustomsDesk } from "../../../customs/customs-desk";

export default async function TradeProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/trade/products/${id}`} />;

  const orgIds = session.user.memberships
    .filter((membership) => isTradeOrgType(membership.organization.type))
    .map((membership) => membership.organization.id);
  if (!orgIds.length) notFound();

  const product = await prisma.product.findFirst({
    where: { id, company: { clientAccount: { organizationId: { in: orgIds } } } },
    include: {
      company: { include: { clientAccount: { include: { organization: true } } } },
      standardLinks: { include: { standardVersion: { include: { standard: true } } } },
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          organization: true,
          recordedBy: { select: { name: true, email: true } },
          coc: true,
          standardVersion: { include: { standard: true } },
          testDossier: true,
          assessmentItems: {
            include: { evidence: true, recordedBy: { select: { name: true, email: true } } },
            orderBy: { sortOrder: "asc" },
          },
          dossierAttachments: { orderBy: { uploadedAt: "asc" } },
        },
      },
      inspections: { orderBy: { inspectedAt: "desc" } },
      clearances: { orderBy: { decidedAt: "desc" } },
    },
  });
  if (!product) notFound();

  const [shaped] = (await withDecisionActors([product])).map(customsDeskProduct);

  return (
    <main className="shell space-y-6 py-10">
      <div>
        <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/trade`}>
          My products
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">View only</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{product.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          The certificate of conformity, the requirements of the standard, and the documents. Nothing here can be
          edited.
        </p>
      </div>
      <CustomsDesk locale={locale} products={[shaped]} countries={countryOptions()} mode="view" />
    </main>
  );
}
