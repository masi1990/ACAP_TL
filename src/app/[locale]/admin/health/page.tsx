import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOpenAdmin } from "@/lib/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { HealthClient } from "./health-client";

export default async function AdminHealthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/health`} />;
  if (!canOpenAdmin(session.user) || !can(session.user, "audit:read")) notFound();
  return (
    <div>
      <p className="text-sm text-[var(--muted)]">Host diagnostics for this ACAP Trade node (uptime, services, disk, CPU, API path).</p>
      <div className="mt-6">
        <HealthClient />
      </div>
    </div>
  );
}
