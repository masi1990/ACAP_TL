import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function InspectionDeskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/inspect`} />;
  if (!can(session.user, "inspect:write")) return <ClientRedirect href={`/${locale}/dashboard`} />;

  const products = await prisma.product.findMany({
    include: {
      standardLinks: { include: { standardVersion: { include: { standard: true } } } },
      company: { include: { clientAccount: { include: { organization: true } } } },
    },
    orderBy: { name: "asc" },
  });
  const productOptions = products.map((product) => {
    const designation = product.standardLinks[0]?.standardVersion.standard.designation ?? "no standard";
    return {
      value: product.id,
      label: `${product.name} · ${designation} · ${product.company.clientAccount.organization.name}`,
    };
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Inspection desk</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Inspection</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Check the product against the one standard linked to its certificate.
        </p>
      </div>
      {productOptions.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No products to inspect yet.</p>
      ) : (
        <CrudForm
          idPrefix="inspect-"
          action="/api/chain/inspections"
          submitLabel="Record inspection"
          fields={[
            { name: "productId", label: "Product", type: "select", required: true, options: productOptions },
            {
              name: "result",
              label: "Result",
              type: "select",
              required: true,
              defaultValue: "CONFORM",
              options: [
                { value: "CONFORM", label: "Conform" },
                { value: "NON_CONFORM", label: "Non-conform" },
              ],
            },
            { name: "findings", label: "Findings", type: "textarea", required: true },
          ]}
        />
      )}
    </main>
  );
}
