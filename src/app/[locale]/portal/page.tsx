import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { PortalActions } from "./portal-actions";

export default async function PortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();

  const [licenses, apps, pins, invitations, products, reminders, audits] = await Promise.all([
    prisma.cbLicense.findMany({ include: { organization: true }, orderBy: { createdAt: "desc" } }),
    prisma.certificationApplication.findMany({
      include: {
        product: { include: { company: true, variants: true } },
        organization: true,
        labResults: true,
        coc: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productPin.findMany({
      include: { variant: { include: { product: true } }, coc: true },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.invitation.findMany({ where: { acceptedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({
      include: { company: true, variants: true, tariffLine: true },
    }),
    prisma.notificationJob.findMany({
      where: { kind: "EXPIRY_REMINDER" },
      include: { coc: true },
      orderBy: { scheduledFor: "asc" },
      take: 10,
    }),
    prisma.auditEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 8 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            {t(locale, "portalTitle")}
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Unified certification, IAM, licences, and PIN registry for the ARSO hub pilot.
          </p>
        </div>
        {session ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span>
              Signed in as <span className="text-[var(--ink)]">{session.user.email}</span>
              {session.impersonatorId ? (
                <Badge tone="warn" className="ml-2">
                  Impersonating
                </Badge>
              ) : null}
            </span>
            <Link
              href={`/${locale}/admin`}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-fg)]"
            >
              Open admin CRUD
            </Link>
          </div>
        ) : (
          <Link href={`/${locale}/login`} className="text-sm text-[var(--accent)] underline">
            {t(locale, "login")} to run protected actions
          </Link>
        )}
      </div>

      <div className="panel mt-6 p-4 text-sm text-[var(--muted)]">
        Catalogue seed data has been cleared. Use{" "}
        <Link href={`/${locale}/admin`} className="text-[var(--accent)] underline">
          Admin
        </Link>{" "}
        to add standards, RECs, tariff codes, manufacturers/importers, and certification bodies under
        role-based least privilege.
      </div>

      <PortalActions locale={locale} applications={apps.map((a) => ({ id: a.id, status: a.status, product: a.product.name }))} />

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">CB licences (Type 1 / Type 2)</h2>
          <ul className="mt-4 space-y-3">
            {licenses.map((l) => (
              <li key={l.id} className="rounded-lg bg-[var(--surface-2)] p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.licenseNumber}</span>
                  <Badge tone={l.status === "APPROVED" ? "ok" : "warn"}>{l.status}</Badge>
                  <Badge>{l.licenseType}</Badge>
                </div>
                <p className="mt-1 text-[var(--muted)]">
                  {l.organization.name} · {l.markScheme}
                  {l.approvalMode ? ` · Type2 mode ${l.approvalMode}` : ""}
                  {l.graceUntil ? ` · grace to ${l.graceUntil.toISOString().slice(0, 10)}` : ""}
                </p>
                {l.pdfUri ? (
                  <a className="mt-1 inline-block text-[var(--accent)] underline" href={l.pdfUri}>
                    Licence PDF
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Org invitations</h2>
          {invitations.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No pending invitations.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {invitations.map((i) => (
                <li key={i.id} className="rounded-lg bg-[var(--surface-2)] p-3 text-sm">
                  <p className="font-medium">{i.email}</p>
                  <p className="text-[var(--muted)]">
                    Role {i.role} · token {i.token}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-[var(--muted)]">
            Kenya entry point stub: Namanga (KE-NAMANGA) — see seed data / adapters.
          </p>
        </div>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Client → company → product → variant</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="py-2 pr-3">Company</th>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Variants</th>
                <th className="py-2">Origin claim</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--line)]/50 align-top">
                  <td className="py-2 pr-3">{p.company.legalName}</td>
                  <td className="py-2 pr-3">
                    {p.name}
                    <div className="text-xs text-[var(--muted)]">{p.tariffLine?.codeDisplay}</div>
                  </td>
                  <td className="py-2 pr-3">
                    {p.variants.map((v) => (
                      <div key={v.id}>
                        {v.label} ({v.sku})
                      </div>
                    ))}
                  </td>
                  <td className="py-2 font-mono text-xs">
                    {p.originClaimJson
                      ? JSON.stringify(JSON.parse(p.originClaimJson), null, 0).slice(0, 80) + "…"
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Certification applications & lab results</h2>
          <ul className="mt-4 space-y-3">
            {apps.map((a) => (
              <li key={a.id} className="rounded-lg bg-[var(--surface-2)] p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="font-medium">{a.product.name}</span>
                  <Badge>{a.status}</Badge>
                  <Badge tone="info">{a.markScheme}</Badge>
                </div>
                <p className="mt-1 text-[var(--muted)]">
                  CB: {a.organization.name} · labs: {a.labResults.length}
                  {a.coc ? ` · CoC ${a.coc.certificateNo}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Product PINs</h2>
          {pins.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              No PINs yet — issue a CoC from portal actions to mint per-variant PINs.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pins.map((p) => (
                <li key={p.id} className="rounded-lg bg-[var(--surface-2)] p-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <span className="font-mono">{p.pinCode}</span>
                    <Badge
                      tone={
                        p.status === "certified" ? "ok" : p.status === "suspended" ? "bad" : "warn"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[var(--muted)]">{p.variant.product.name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Expiry reminders (6/4/3/2/1 mo)</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {reminders.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 border-b border-[var(--line)]/40 py-2">
                <span>
                  {r.coc.certificateNo} · T-{r.monthsOut}m
                </span>
                <span className="text-[var(--muted)]">
                  {r.scheduledFor.toISOString().slice(0, 10)} · {r.status}
                </span>
              </li>
            ))}
            {reminders.length === 0 && (
              <li className="text-[var(--muted)]">Scheduled when a CoC is issued.</li>
            )}
          </ul>
        </div>
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Append-only audit</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {audits.map((a) => (
              <li key={a.id} className="border-b border-[var(--line)]/40 py-2">
                <span className="font-medium">{a.action}</span>
                <span className="text-[var(--muted)]">
                  {" "}
                  · {a.entityType} · {a.eventHash.slice(0, 10)}…
                </span>
              </li>
            ))}
            {audits.length === 0 && <li className="text-[var(--muted)]">No events yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
