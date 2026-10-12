import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function ChainPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) {
    return <ClientRedirect href={`/${locale}/login?next=/${locale}/chain`} />;
  }

  const user = session.user;
  const canWriteProducts = can(user, "products:write");
  const canCertify = can(user, "certify:operate");
  const canCustoms = can(user, "customs:decide");
  const canInspect = can(user, "inspect:write");
  const canSurveillance = can(user, "surveillance:operate");
  const canSee =
    can(user, "products:read") || canWriteProducts || canCertify || canCustoms || canInspect || canSurveillance;

  const [products, cases] = await Promise.all([
    prisma.product.findMany({
      include: {
        company: { include: { clientAccount: { include: { organization: true } } } },
        standardLinks: { include: { standardVersion: { include: { standard: true } } } },
        applications: { include: { coc: true, labResults: true, organization: true } },
        variants: { include: { pin: true } },
        clearances: { orderBy: { decidedAt: "desc" }, take: 1 },
        inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.surveillanceCase.findMany({
      include: { pin: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const productOptions = products.map((p) => {
    const std = p.standardLinks[0]?.standardVersion.standard.designation ?? "no standard";
    return {
      value: p.id,
      label: `${p.name} · ${std} · ${p.company.clientAccount.organization.name}`,
    };
  });
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">One standard · one test · one certificate · one product</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Conformity chain</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          A manufacturer or importer registers one product against one African Standard. The certification
          body records one test and issues one certificate. Customs then allows or refuses entry from one
          country into another. Inspectors check conformity, market surveillance follows the product on the
          market, and consumers can report what they find.
        </p>
      </div>

      {!canSee && (
        <div className="panel p-5 text-sm text-[var(--muted)]">
          This account cannot operate the conformity chain. An ARSO administrator can add your organisation
          under manufacturers, certification bodies, customs, inspectors, or market surveillance.
        </div>
      )}

      <section id="products" className="space-y-4">
        <h2 className="text-xl font-semibold">Products — manufacturer / importer</h2>
        <p className="text-sm text-[var(--muted)]">
          The certification body registers each manufacturer or importer as its client, then adds the
          products it certifies for them.{" "}
          <Link className="text-[var(--accent)] underline" href={`/${locale}/cb`}>
            Open the certification desk
          </Link>
          .
        </p>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Standard</th>
                <th className="px-4 py-2">Test</th>
                <th className="px-4 py-2">Certificate</th>
                <th className="px-4 py-2">Border</th>
                <th className="px-4 py-2">Inspection</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                    No products registered yet.
                  </td>
                </tr>
              )}
              {products.map((p) => {
                const link = p.standardLinks[0];
                const app = p.applications[0];
                const test = app?.labResults[0];
                const pin = p.variants.map((v) => v.pin?.pinCode).find(Boolean);
                return (
                  <tr key={p.id} className="border-b border-[var(--line)]/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {p.company.clientAccount.organization.name}
                        {pin ? ` · PIN ${pin}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{link?.standardVersion.standard.designation ?? "—"}</td>
                    <td className="px-4 py-3">
                      {test ? <Badge tone={test.pass ? "ok" : "warn"}>{test.pass ? "Pass" : "Fail"}</Badge> : "—"}
                    </td>
                    <td className="px-4 py-3">{app?.coc?.certificateNo ?? "—"}</td>
                    <td className="px-4 py-3">{p.clearances[0]?.decision ?? "—"}</td>
                    <td className="px-4 py-3">{p.inspections[0]?.result ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="certification" className="space-y-4">
        <h2 className="text-xl font-semibold">Certification body</h2>
        <p className="text-sm text-[var(--muted)]">
          Officers with the CB officer role record every requirement and test from the standard, attach
          the laboratory file, add national regulations, and issue one certificate.
        </p>
        {canCertify && (
          <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/cb`}>
            Certification desk
          </Link>
        )}
      </section>

      <section id="customs" className="space-y-4">
        <h2 className="text-xl font-semibold">Customs — entry from one country into another</h2>
        <p className="text-sm text-[var(--muted)]">
          Allow is accepted only when that product already has its one certificate.
        </p>
        {canCustoms && productOptions.length > 0 && (
          <CrudForm
            idPrefix="customs-"
            action="/api/chain/customs"
            submitLabel="Record border decision"
            fields={[
              { name: "productId", label: "Product", type: "select", required: true, options: productOptions },
              { name: "originIso2", label: "Origin country", required: true, placeholder: "KE" },
              { name: "destinationIso2", label: "Destination country", required: true, placeholder: "UG" },
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
      </section>

      <section id="inspectors" className="space-y-4">
        <h2 className="text-xl font-semibold">Inspectors — conformity to the linked standard</h2>
        {canInspect && productOptions.length > 0 && (
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
      </section>

      <section id="surveillance" className="space-y-4">
        <h2 className="text-xl font-semibold">Market surveillance</h2>
        {canSurveillance && (
          <CrudForm
            idPrefix="surv-"
            action="/api/chain/surveillance"
            submitLabel="Open case"
            fields={[
              { name: "title", label: "Case title", required: true },
              { name: "pinCode", label: "PIN (optional)" },
              { name: "summary", label: "Summary", type: "textarea", required: true },
            ]}
          />
        )}
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                <th className="px-4 py-2">Case</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">PIN</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--muted)]">
                    No surveillance cases yet.
                  </td>
                </tr>
              )}
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)]/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-[var(--muted)]">{c.summary}</div>
                  </td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3">{c.pin?.pinCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-[var(--muted)]">
          The surveillance desk is also at{" "}
          <Link className="text-[var(--accent)] underline" href={`/${locale}/surveillance`}>
            market surveillance
          </Link>
          .
        </p>
      </section>

      <section id="consumers" className="space-y-2">
        <h2 className="text-xl font-semibold">Consumers</h2>
        <p className="text-sm text-[var(--muted)]">
          Anyone can file a complaint without an account. It is routed to the certification body when the
          PIN is on a certified product.
        </p>
        <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/consumers`}>
          Open the consumer complaint form
        </Link>
      </section>
    </div>
  );
}
