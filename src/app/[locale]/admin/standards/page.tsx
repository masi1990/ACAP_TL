import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { Badge } from "@/components/ui/badge";
import { AUTHORITATIVE_LOCALES, PUBLICATION_STATUSES } from "@/lib/publication";
import { adoptionRate, LANGUAGE_FILE_FIELDS, publishedLocales, STANDARD_KINDS, standardKindLabel } from "@/lib/standard-kinds";
import { webstoreListingLabel } from "@/lib/catalog-access";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { extractAssessmentDrafts, type AssessmentDraft } from "@/lib/standard-assessment";
import { DeskTabs } from "../../cb/desk-tabs";
import { StandardRequirements } from "./standard-requirements";

function draftsForVersion(machineDocJson: string, requirementsJson: string, designation: string) {
  let machine: {
    fullText?: string;
    requirements?: Array<{ id?: string; clause?: string; text?: string }>;
    clauses?: Array<{ number?: string; title?: string; body?: string }>;
    standard?: { designation?: string };
  } = {};
  try {
    machine = JSON.parse(machineDocJson);
  } catch {
    machine = {};
  }
  if (!machine.standard?.designation) machine.standard = { designation };
  if (!machine.requirements?.length && requirementsJson) {
    try {
      const parsed = JSON.parse(requirementsJson) as Array<{ id?: string; clause?: string; text?: string }>;
      if (Array.isArray(parsed)) machine.requirements = parsed;
    } catch {
      /* stored requirements are not JSON */
    }
  }
  return extractAssessmentDrafts(machine);
}

function groupDrafts(items: AssessmentDraft[]) {
  const groups: { section: string; items: AssessmentDraft[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || last.section !== item.section) groups.push({ section: item.section || "Requirements", items: [item] });
    else last.items.push(item);
  }
  return groups;
}

export default async function AdminStandardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/standards`} />;
  if (!can(session.user, "standards:read")) notFound();

  const total = await prisma.standard.count();
  const listing = listPage((await searchParams).page, total);
  const [rows, tariffs, requirementStandards, sectors, memberStates, memberStateTotal] = await Promise.all([
    prisma.standard.findMany({
      include: {
        technicalCommittee: { include: { sector: true } },
        adoptions: { include: { memberState: true } },
        versions: {
          orderBy: { year: "desc" },
          include: {
            catalogItem: true,
            languageFiles: true,
            tariffMaps: { include: { tariffLine: { include: { rec: true } } } },
            _count: { select: { tariffMaps: true } },
          },
        },
      },
      orderBy: { designation: "asc" },
      skip: listing.skip,
      take: listing.take,
    }),
    prisma.tariffLine.findMany({
      include: { rec: true },
      orderBy: [{ codeNormalized: "asc" }],
      take: 500,
    }),
    prisma.standard.findMany({
      orderBy: { designation: "asc" },
      select: {
        id: true,
        designation: true,
        titleEn: true,
        versions: {
          orderBy: { year: "desc" },
          take: 1,
          select: { machineDocJson: true, requirementsJson: true },
        },
      },
    }),
    prisma.sector.findMany({
      include: { committees: { orderBy: { code: "asc" } } },
      orderBy: { code: "asc" },
    }),
    prisma.memberState.findMany({ orderBy: { name: "asc" } }),
    prisma.memberState.count(),
  ]);

  const canWrite = can(session.user, "standards:write");
  const canDelete = can(session.user, "standards:delete");
  const canImport = can(session.user, "standards:import");
  const canFullPreview = can(session.user, "standards:preview_full");

  const committeeOptions = sectors.flatMap((sector) =>
    sector.committees.map((committee) => ({
      value: committee.id,
      label: `${sector.code} · ${committee.code} — ${committee.name}`,
    })),
  );
  const countryOptions = memberStates.map((state) => ({
    value: state.id,
    label: `${state.name} (${state.iso2})`,
  }));
  const languageFileFields = LANGUAGE_FILE_FIELDS.map((item) => ({
    name: item.field,
    label: item.label,
    type: "file" as const,
    help: "Optional PDF for this language. Buyers preview and purchase the language they choose.",
  }));
  const tariffOptions = tariffs.map((t) => ({
    value: t.id,
    label: `${t.codeDisplay} · ${t.rec.code} — ${t.description.slice(0, 80)}${t.description.length > 80 ? "…" : ""}`,
  }));

  const requirementSets = requirementStandards.map((standard) => {
    const version = standard.versions[0];
    const drafts = version
      ? draftsForVersion(version.machineDocJson, version.requirementsJson, standard.designation)
      : [];
    return {
      id: standard.id,
      label: `${standard.designation} — ${standard.titleEn}`,
      groups: groupDrafts(drafts).map((group) => ({
        section: group.section,
        items: group.items.map((item) => ({
          itemKey: item.itemKey,
          clause: item.clause,
          heading: item.heading,
          text: item.text,
          testMethod: item.testMethod,
          kind: item.kind,
        })),
      })),
    };
  });

  return (
    <DeskTabs
      tabs={[
        {
          id: "standards",
          label: "Standards",
          content: (
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
              {
                name: "kind",
                label: "Category",
                type: "select",
                required: true,
                defaultValue: "PRODUCT",
                options: STANDARD_KINDS.map((kind) => ({ value: kind.value, label: kind.label })),
              },
              {
                name: "technicalCommitteeId",
                label: "Technical committee",
                type: "select",
                required: true,
                options: committeeOptions,
                help: committeeOptions.length ? undefined : "Create a sector and technical committee first.",
              },
              { name: "year", label: "Year", type: "number", defaultValue: new Date().getFullYear() },
              { name: "editionLabel", label: "Edition label", placeholder: "ARS 464:2026" },
              {
                name: "publicationStatus",
                label: "Publication status",
                type: "select",
                required: true,
                defaultValue: "DRAFT",
                options: PUBLICATION_STATUSES.map((s) => ({ value: s.value, label: s.label })),
              },
              {
                name: "authoritativeLocale",
                label: "Authoritative language",
                type: "select",
                required: true,
                defaultValue: "en",
                options: AUTHORITATIVE_LOCALES.map((s) => ({ value: s.value, label: s.label })),
              },
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
              {
                name: "memberStateIds",
                label: "Adopting countries",
                type: "multiselect",
                options: countryOptions,
                help: "Select every African Union member state that has adopted this standard.",
              },
              ...languageFileFields,
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
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Committee</th>
              <th className="px-4 py-2">Adoption</th>
              <th className="px-4 py-2">Languages</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Tariff lines</th>
              <th className="px-4 py-2">Store</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[var(--muted)]">
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
                  <td className="px-4 py-3">{standardKindLabel(r.kind, locale)}</td>
                  <td className="px-4 py-3">
                    {r.technicalCommittee ? (
                      <>
                        <div>{r.technicalCommittee.sector.name}</div>
                        <div className="text-[var(--muted)]">
                          {r.technicalCommittee.code} — {r.technicalCommittee.name}
                        </div>
                      </>
                    ) : (
                      <span className="text-[var(--muted)]">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const rate = adoptionRate(r.adoptions.length, memberStateTotal);
                      return `${rate.adopted} of ${rate.total} · ${rate.percent}%`;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {v
                      ? publishedLocales(v.languageFiles, v.authoritativeLocale, v.sourcePdfUri)
                          .map((code) => code.toUpperCase())
                          .join(", ") || "—"
                      : "—"}
                  </td>
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
                    <span>{webstoreListingLabel(v?.catalogItem)}</span>
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
                    <td colSpan={10} className="bg-[var(--surface-2)]/40 px-4 py-3">
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
                                name: "kind",
                                label: "Category",
                                type: "select",
                                required: true,
                                defaultValue: r.kind,
                                options: STANDARD_KINDS.map((kind) => ({ value: kind.value, label: kind.label })),
                              },
                              {
                                name: "technicalCommitteeId",
                                label: "Technical committee",
                                type: "select",
                                required: true,
                                defaultValue: r.technicalCommitteeId ?? "",
                                options: committeeOptions,
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
                                type: "select",
                                required: true,
                                defaultValue: v?.publicationStatus ?? "DRAFT",
                                options: PUBLICATION_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                              },
                              {
                                name: "authoritativeLocale",
                                label: "Authoritative language",
                                type: "select",
                                required: true,
                                defaultValue: v?.authoritativeLocale ?? "en",
                                options: AUTHORITATIVE_LOCALES.map((s) => ({ value: s.value, label: s.label })),
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
                              {
                                name: "memberStateIds",
                                label: "Adopting countries",
                                type: "multiselect",
                                options: countryOptions,
                                defaultValue: r.adoptions.map((adoption) => adoption.memberStateId),
                                help: "Select every African Union member state that has adopted this standard.",
                              },
                              ...languageFileFields,
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
      <LinePager
        page={listing.page}
        pageCount={listing.pageCount}
        prevHref={listHref(`/${locale}/admin/standards`, listing.page - 1)}
        nextHref={listHref(`/${locale}/admin/standards`, listing.page + 1)}
      />
    </div>
          ),
        },
        {
          id: "requirements",
          label: "Requirements",
          content: (
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold">Requirements</h2>
                <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
                  The same rows the certification desk loads from each standard: clause text, limits, and test methods.
                </p>
              </div>
              <StandardRequirements sets={requirementSets} canPreview={canFullPreview} canWrite={canWrite} />
            </section>
          ),
        },
      ]}
    />
  );
}
