import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";

export default async function AdminStandardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session || !can(session.user, "standards:read")) notFound();

  const [rows, tariffs] = await Promise.all([
    prisma.standard.findMany({
      include: {
        versions: {
          orderBy: { year: "desc" },
          include: {
            catalogItem: true,
            tariffMaps: { include: { tariffLine: { include: { rec: true } } } },
            _count: { select: { tariffMaps: true } },
          },
        },
      },
      orderBy: { designation: "asc" },
    }),
    prisma.tariffLine.findMany({
      include: { rec: true },
      orderBy: [{ codeNormalized: "asc" }],
      take: 500,
    }),
  ]);

  const canWrite = can(session.user, "standards:write");
  const canDelete = can(session.user, "standards:delete");
  const canImport = can(session.user, "standards:import");
  const canFullPreview = can(session.user, "standards:preview_full");

  const tariffOptions = tariffs.map((t) => ({
    value: t.id,
    label: `${t.codeDisplay} · ${t.rec.code} — ${t.description.slice(0, 80)}${t.description.length > 80 ? "…" : ""}`,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Standards</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            One African Standard can address <strong className="font-medium text-[var(--ink)]">many tariff
            lines</strong>. Prefer{" "}
            <strong className="font-medium text-[var(--ink)]">PDF/Word import</strong> so Clause 1–n text
            is retained without omission. Admin preview shows the full standard; the public store shows
            Clause 1 only.
          </p>
        </div>
        {canImport && (
          <Link
            href={`/${locale}/admin/standards/import`}
            className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)]"
          >
            Import PDF / Word
          </Link>
        )}
      </div>

      {canWrite && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Manual create</h3>
          <CrudForm
            action="/api/admin/standards"
            submitLabel="Create standard"
            fields={[
              { name: "designation", label: "Designation", required: true, placeholder: "ARS 464" },
              { name: "titleEn", label: "Title (EN)", required: true, placeholder: "Milled rice — Specification" },
              { name: "year", label: "Year", type: "number", defaultValue: new Date().getFullYear() },
              { name: "ics", label: "ICS", placeholder: "67.060", defaultValue: "67.060" },
              {
                name: "scopeEn",
                label: "Clause 1 Scope (full text)",
                type: "textarea",
                required: true,
                placeholder: "This African Standard specifies…",
              },
              {
                name: "tariffLineIds",
                label: "Tariff lines (multi-select)",
                type: "multiselect",
                options: tariffOptions,
                help: "One standard may map to many HS / REC lines. Select all that apply.",
              },
            ]}
          />
          <p className="text-xs text-[var(--muted)]">
            Manual create stores scope now; use Import for full normative packaging/labelling/sampling
            extraction. Completeness is checked on import.
          </p>
        </div>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Designation</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Tariff lines</th>
              <th className="px-4 py-2">Store</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                  No standards yet — import a PDF/Word or create manually.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const v = r.versions[0];
              return (
                <Fragment key={r.id}>
                <tr className="border-b border-[var(--line)]/50 align-top">
                  <td className="px-4 py-3 font-mono font-medium">{r.designation}</td>
                  <td className="px-4 py-3">{r.titleEn}</td>
                  <td className="px-4 py-3">
                    {v ? (
                      <>
                        <div>{v.editionLabel}</div>
                        <Badge tone={v.publicationStatus.includes("DRAFT") ? "warn" : "ok"}>
                          {v.publicationStatus}
                        </Badge>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v && v.tariffMaps.length > 0 ? (
                      <ul className="max-w-[14rem] space-y-0.5 text-xs">
                        {v.tariffMaps.slice(0, 6).map((m) => (
                          <li key={m.id} className="font-mono">
                            {m.tariffLine.codeDisplay}
                            <span className="text-[var(--muted)]"> · {m.tariffLine.rec.code}</span>
                          </li>
                        ))}
                        {v.tariffMaps.length > 6 && (
                          <li className="text-[var(--muted)]">+{v.tariffMaps.length - 6} more</li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-[var(--muted)]">{v?._count.tariffMaps ?? 0}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v?.catalogItem?.active ? (
                      <span>{formatCents(v.catalogItem.priceCents, v.catalogItem.currency)}</span>
                    ) : (
                      <span className="text-[var(--muted)]">No price</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canFullPreview && (
                        <Link
                          href={`/${locale}/admin/standards/${r.id}/preview`}
                          className="text-sm text-[var(--accent)] underline"
                        >
                          Full preview
                        </Link>
                      )}
                      {canDelete && <DeleteButton action={`/api/admin/standards/${r.id}`} />}
                    </div>
                  </td>
                </tr>
                {canWrite && (
                  <tr key={`${r.id}-edit`} className="border-b border-[var(--line)]/50">
                    <td colSpan={6} className="bg-[var(--surface-2)]/40 px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-[var(--accent)]">
                          Edit {r.designation}
                        </summary>
                        <div className="mt-3">
                          <CrudForm
                            action={`/api/admin/standards/${r.id}`}
                            method="PATCH"
                            idPrefix={`${r.id}-`}
                            submitLabel="Save changes"
                            fields={[
                              {
                                name: "designation",
                                label: "Designation",
                                required: true,
                                defaultValue: r.designation,
                              },
                              {
                                name: "titleEn",
                                label: "Title (EN)",
                                required: true,
                                defaultValue: r.titleEn,
                              },
                              {
                                name: "year",
                                label: "Year",
                                type: "number",
                                defaultValue: v?.year ?? new Date().getFullYear(),
                              },
                              { name: "ics", label: "ICS", defaultValue: r.ics },
                              {
                                name: "editionLabel",
                                label: "Edition label",
                                defaultValue: v?.editionLabel ?? "",
                              },
                              {
                                name: "publicationStatus",
                                label: "Publication status",
                                defaultValue: v?.publicationStatus ?? "DRAFT",
                              },
                              {
                                name: "scopeEn",
                                label: "Clause 1 Scope (full text)",
                                type: "textarea",
                                required: true,
                                defaultValue: v?.scopeEn ?? "",
                              },
                              {
                                name: "publishToStore",
                                label: "Publish to webstore",
                                type: "checkbox",
                                placeholder: "Listed on the public webstore",
                                defaultValue: Boolean(v?.catalogItem?.active),
                              },
                              {
                                name: "tariffLineIds",
                                label: "Tariff lines (multi-select)",
                                type: "multiselect",
                                options: tariffOptions,
                                defaultValue: v?.tariffMaps.map((m) => m.tariffLineId) ?? [],
                                help: "One standard may map to many HS / REC lines.",
                              },
                            ]}
                          />
                        </div>
                      </details>
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
