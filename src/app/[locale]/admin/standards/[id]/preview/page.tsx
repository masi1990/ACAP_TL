import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { getAdminFullStandardPreview } from "@/lib/admin-standard-preview";
import { FullPreviewViewer } from "@/components/admin/full-preview-viewer";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function AdminStandardFullPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await getSessionUser();
  if (!session) {
    return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/standards/${id}/preview`} />;
  }
  if (!can(session.user, "standards:preview_full") && !can(session.user, "standards:read")) {
    return <ClientRedirect href={`/${locale}/admin/standards`} />;
  }
  // Least privilege: full unlock requires preview_full
  if (!can(session.user, "standards:preview_full")) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-lg font-semibold">Full preview not permitted</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your role can list standards but lacks <code className="font-mono">standards:preview_full</code>.
          Ask an ARSO administrator to assign a catalogue or auditor role.
        </p>
        <Link href={`/${locale}/admin/standards`} className="mt-4 inline-block text-[var(--accent)] underline">
          Back to standards
        </Link>
      </div>
    );
  }

  const data = await getAdminFullStandardPreview(id);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Admin · full standard</p>
          <h2 className="text-xl font-semibold">
            {data.designation} — {data.titleOnly}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            All clauses visible. Public store/lookup still show Clause 1 Scope only.
          </p>
        </div>
        <Link
          href={`/${locale}/admin/standards`}
          className="text-sm text-[var(--accent)] underline"
        >
          ← Standards list
        </Link>
      </div>
      <div
        className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]"
        style={{ height: "min(78vh, 900px)" }}
      >
        <FullPreviewViewer data={data} closeHref={`/${locale}/admin/standards`} />
      </div>
    </div>
  );
}
