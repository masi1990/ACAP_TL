import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm } from "@/components/admin/crud-form";
import { FlowNav } from "@/components/flow-nav";

export default async function ConsumersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const complaints = await prisma.consumerComplaint.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, subject: true, status: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Consumers</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Report a product</h1>
        <FlowNav locale={locale} current="consumers" />
        <p className="mt-2 text-sm text-[var(--muted)]">
          If a product carries a PIN, include it so the complaint reaches the certification body that
          issued the certificate. You can also check a PIN on the{" "}
          <Link className="text-[var(--accent)] underline" href={`/${locale}/verify`}>
            public verify page
          </Link>
          .
        </p>
      </div>

      <CrudForm
        idPrefix="complaint-"
        action="/api/chain/complaints"
        submitLabel="Submit complaint"
        fields={[
          { name: "complainantEmail", label: "Your email", required: true, placeholder: "name@example.com" },
          { name: "pinCode", label: "Product PIN (optional)" },
          { name: "subject", label: "Subject", required: true },
          { name: "body", label: "What you found", type: "textarea", required: true },
        ]}
      />

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-[var(--muted)]">
                  No complaints filed yet.
                </td>
              </tr>
            )}
            {complaints.map((c) => (
              <tr key={c.id} className="border-b border-[var(--line)]/50">
                <td className="px-4 py-3">{c.subject}</td>
                <td className="px-4 py-3">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
