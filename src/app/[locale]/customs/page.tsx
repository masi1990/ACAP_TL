import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { countryOptions } from "@/lib/countries";
import { customsDeskProduct } from "@/lib/customs-desk";
import { withDecisionActors } from "@/lib/line-actor";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { CustomsDesk } from "./customs-desk";

export default async function CustomsDeskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/customs`} />;
  if (!can(session.user, "customs:decide")) return <ClientRedirect href={`/${locale}/dashboard`} />;

  const products = await prisma.product.findMany({
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
    orderBy: { name: "asc" },
  });

  return (
    <main className="shell space-y-6 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Border desk</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{t(locale, "Customs")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Choose a product, then use the tabs for the border decision, the certificate, the certification record,
          documents, and the standard. Documents and the standard open for viewing only.
        </p>
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No products to decide yet.</p>
      ) : (
        <CustomsDesk
          locale={locale}
          products={(await withDecisionActors(products)).map(customsDeskProduct)}
          countries={countryOptions()}
        />
      )}
    </main>
  );
}
