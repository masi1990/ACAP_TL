import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { getAdminFullStandardPreview } from "@/lib/admin-standard-preview";
import { FullPreviewViewer } from "@/components/admin/full-preview-viewer";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function CbStandardPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/cb/standards/${id}`} />;
  const allowed =
    can(session.user, "certify:operate") ||
    can(session.user, "products:read") ||
    can(session.user, "standards:read");
  if (!allowed) notFound();

  const data = await getAdminFullStandardPreview(id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link className="text-sm text-[var(--accent)] underline" href={`/${locale}/cb#products`}>
            Certification
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {data.designation} — {data.titleOnly}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Every page of this standard.</p>
        </div>
      </div>
      <div
        className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]"
        style={{ height: "min(78vh, 900px)" }}
      >
        <FullPreviewViewer data={data} closeHref={`/${locale}/cb#products`} />
      </div>
    </main>
  );
}
