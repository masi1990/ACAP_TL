import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { countryOptions } from "@/lib/countries";
import { CrudForm } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function CustomsDeskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/customs`} />;
  if (!can(session.user, "customs:decide")) return <ClientRedirect href={`/${locale}/dashboard`} />;

  const products = await prisma.product.findMany({
    include: {
      standardLinks: { include: { standardVersion: { include: { standard: true } } } },
      company: { include: { clientAccount: { include: { organization: true } } } },
    },
    orderBy: { name: "asc" },
  });
  const countries = countryOptions();
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
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Border desk</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Customs</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Allow is accepted only when that product already has its one certificate. Entry is from one
          country into another.
        </p>
      </div>
      {productOptions.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No products to decide yet.</p>
      ) : (
        <CrudForm
          idPrefix="customs-"
          action="/api/chain/customs"
          submitLabel="Record border decision"
          fields={[
            { name: "productId", label: "Product", type: "select", required: true, options: productOptions },
            { name: "originIso2", label: "Origin country", type: "select", required: true, options: countries },
            { name: "destinationIso2", label: "Destination country", type: "select", required: true, options: countries },
            {
              name: "decision",
              label: "Decision",
              type: "select",
              required: true,
              defaultValue: "HOLD",
              options: [
                { value: "ALLOW", label: "Allow entry" },
                { value: "HOLD", label: "Hold" },
                { value: "REFUSE", label: "Refuse entry" },
              ],
            },
            { name: "reason", label: "Reason", type: "textarea" },
          ]}
        />
      )}
    </main>
  );
}
