import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { CrudForm } from "@/components/admin/crud-form";
import { Badge } from "@/components/ui/badge";
import { portalStatusByPin } from "@/lib/imported-marks";
import { withBasePath } from "@/lib/base-path";
import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";
import { UrlListSearch } from "@/components/admin/url-list-search";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { normalizeListQuery } from "@/lib/list-query";

export default async function ImportedMarksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/imported-marks`} />;
  if (!can(session.user, "products:read") && !can(session.user, "portal:operate")) notFound();

  const query = await searchParams;
  const q = normalizeListQuery(query.q);
  const where: Prisma.ImportedCertifiedMarkWhereInput = q
    ? {
        OR: [
          { productName: { contains: q, mode: "insensitive" } },
          { certificationId: { contains: q, mode: "insensitive" } },
          { pinText: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { cbName: { contains: q, mode: "insensitive" } },
          { country: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const total = await prisma.importedCertifiedMark.count({ where });
  const listing = listPage(query.page, total);
  const listPath = `/${locale}/admin/imported-marks`;

  const [marks, requests, versions, manufacturers, bodies] = await Promise.all([
    prisma.importedCertifiedMark.findMany({
      where,
      include: {
        standardVersion: { include: { standard: true } },
        manufacturerOrg: true,
        certificationBodyOrg: true,
      },
      orderBy: [{ cbName: "asc" }, { productName: "asc" }, { id: "asc" }],
      skip: listing.skip,
      take: listing.take,
    }),
    prisma.portalRelistRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.standardVersion.findMany({
      include: { standard: true },
      orderBy: { editionLabel: "asc" },
    }),
    prisma.organization.findMany({
      where: { type: { in: ["MANUFACTURER", "IMPORTER", "CLIENT"] } },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findMany({
      where: { type: "CB" },
      orderBy: { name: "asc" },
    }),
  ]);
  const portals = await portalStatusByPin(marks.map((mark) => mark.pinText));
  const versionOptions = versions.map((version) => ({
    value: version.id,
    label: `${version.standard.designation} — ${version.editionLabel}`,
  }));
  const manufacturerOptions = manufacturers.map((org) => ({
    value: org.id,
    label: `${org.name} · ${org.type === "IMPORTER" ? "Importer" : org.type === "CLIENT" ? "Client" : "Manufacturer"}`,
  }));
  const bodyOptions = bodies.map((org) => ({ value: org.id, label: org.name }));
  const canDecide = can(session.user, "portal:operate");
  const canLink = can(session.user, "standards:write") || can(session.user, "products:write") || canDecide;
  const groups = new Map<string, typeof marks>();
  for (const mark of marks) {
    const key = mark.cbName || "Certification body not recorded";
    const list = groups.get(key) || [];
    list.push(mark);
    groups.set(key, list);
  }

  const tabs = [
    {
      id: "marks",
      label: "Marks",
      content: (
        <div className="space-y-6">
          <UrlListSearch
            pathname={listPath}
            hash="marks"
            initial={q}
            placeholder="Search product, certificate, PIN, company, brand, or body"
            from={listing.from}
            to={listing.to}
            total={listing.total}
          />
          {marks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-sm text-[var(--muted)]">
              {q ? "No copied marks match your search." : "No certified products have been copied yet."}
            </p>
          ) : (
            [...groups.entries()].map(([cbName, rows]) => (
              <section key={cbName} className="space-y-3">
                <h3 className="font-semibold">{cbName}</h3>
                <div className="space-y-3">
                  {rows.map((mark) => {
                    const removed = portals.status.get(mark.pinText) === "removed";
                    const reason = portals.reason.get(mark.pinText) || "";
                    const gaps = [
                      mark.standardVersionId ? null : "Standard not linked",
                      mark.manufacturerOrgId ? null : "Manufacturer not linked",
                      mark.certificationBodyOrgId ? null : "Certification body not linked",
                    ].filter(Boolean);
                    return (
                      <article key={mark.id} className="rounded-xl border border-[var(--line)] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{mark.productName}</span>
                          <Badge>{mark.markType === "eco" ? "Eco" : "Quality"}</Badge>
                          <Badge tone={removed ? "bad" : "ok"}>{removed ? "Removed by ARSO" : "Listed"}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {mark.certificationId} · <span className="font-mono">{mark.pinText}</span> ·{" "}
                          {mark.companyName || "Company not recorded"}
                          {mark.country ? ` · ${mark.country}` : ""}
                        </p>
                        <p className="mt-1 text-sm">Brand: {mark.brand || "none recorded"}</p>
                        <p className="mt-1 text-sm">
                          Copied company: {mark.companyName || "none recorded"}. Manufacturer here:{" "}
                          {mark.manufacturerOrg?.name || "not linked"}.
                        </p>
                        <p className="mt-1 text-sm">
                          Copied certification body: {mark.cbName || "none recorded"}. Certification body here:{" "}
                          {mark.certificationBodyOrg?.name || "not linked"}.
                        </p>
                        <p className="mt-1 text-sm">
                          Standard on the live record: {mark.sourceStandardText || "none recorded"}. Linked here:{" "}
                          {mark.standardVersion
                            ? `${mark.standardVersion.standard.designation} — ${mark.standardVersion.editionLabel}`
                            : "not linked"}
                        </p>
                        {gaps.length > 0 && (
                          <p className="mt-1 text-sm text-amber-800">Still to complete: {gaps.join(", ")}.</p>
                        )}
                        {removed && reason && <p className="mt-1 text-sm">Removal reason: {reason}</p>}
                        {canLink && (
                          <div className="mt-3">
                            <CrudForm
                              action={withBasePath("/api/admin/imported-marks/standard")}
                              submitLabel="Save links"
                              idPrefix={`${mark.id}-std-`}
                              fields={[
                                { name: "pinText", label: "PIN", hidden: true, defaultValue: mark.pinText },
                                {
                                  name: "manufacturerOrgId",
                                  label: "Manufacturer",
                                  type: "select",
                                  options: [{ value: "", label: "Leave unlinked" }, ...manufacturerOptions],
                                  defaultValue: mark.manufacturerOrgId || "",
                                },
                                {
                                  name: "certificationBodyOrgId",
                                  label: "Certification body",
                                  type: "select",
                                  options: [{ value: "", label: "Leave unlinked" }, ...bodyOptions],
                                  defaultValue: mark.certificationBodyOrgId || "",
                                },
                                {
                                  name: "standardVersionId",
                                  label: "Standard edition",
                                  type: "select",
                                  options: [{ value: "", label: "Leave unlinked" }, ...versionOptions],
                                  defaultValue: mark.standardVersionId || "",
                                },
                              ]}
                            />
                          </div>
                        )}
                        {canDecide && (
                          <div className="mt-3">
                            {removed ? (
                              <CrudForm
                                action={withBasePath("/api/admin/imported-marks/decision")}
                                submitLabel="List on the public registry"
                                idPrefix={`${mark.id}-list-`}
                                fields={[
                                  { name: "pinText", label: "PIN", hidden: true, defaultValue: mark.pinText },
                                  { name: "status", label: "Decision", hidden: true, defaultValue: "listed" },
                                  { name: "reason", label: "Note", type: "textarea" },
                                ]}
                              />
                            ) : (
                              <CrudForm
                                action={withBasePath("/api/admin/imported-marks/decision")}
                                submitLabel="Remove from the public registry"
                                idPrefix={`${mark.id}-remove-`}
                                fields={[
                                  { name: "pinText", label: "PIN", hidden: true, defaultValue: mark.pinText },
                                  { name: "status", label: "Decision", hidden: true, defaultValue: "removed" },
                                  { name: "reason", label: "Reason", type: "textarea", required: true },
                                ]}
                              />
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
          <LinePager
            page={listing.page}
            pageCount={listing.pageCount}
            prevHref={`${listHref(listPath, listing.page - 1, { q })}#marks`}
            nextHref={`${listHref(listPath, listing.page + 1, { q })}#marks`}
          />
        </div>
      ),
    },
    ...(canDecide
      ? [
          {
            id: "relist",
            label: "Relist",
            content: (
              <section className="space-y-3">
                <h3 className="font-semibold">Requests to return a product</h3>
                {requests.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No requests yet.</p>
                ) : (
                  requests.map((request) => (
                    <article key={request.id} className="rounded-xl border border-[var(--line)] p-4 text-sm">
                      <p>
                        <span className="font-mono">{request.pinText}</span> · {request.cbName} · {request.status}
                      </p>
                      <p className="mt-1">{request.reason}</p>
                      {request.arsoNote && <p className="mt-1 text-[var(--muted)]">ARSO note: {request.arsoNote}</p>}
                      {request.status === "pending" && (
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <CrudForm
                            action={withBasePath("/api/admin/imported-marks/relist")}
                            submitLabel="Approve and list again"
                            idPrefix={`${request.id}-yes-`}
                            fields={[
                              { name: "id", label: "Request", hidden: true, defaultValue: request.id },
                              { name: "status", label: "Decision", hidden: true, defaultValue: "approved" },
                              { name: "arsoNote", label: "Note to the certification body", type: "textarea" },
                            ]}
                          />
                          <CrudForm
                            action={withBasePath("/api/admin/imported-marks/relist")}
                            submitLabel="Reject request"
                            idPrefix={`${request.id}-no-`}
                            fields={[
                              { name: "id", label: "Request", hidden: true, defaultValue: request.id },
                              { name: "status", label: "Decision", hidden: true, defaultValue: "rejected" },
                              {
                                name: "arsoNote",
                                label: "Note to the certification body",
                                type: "textarea",
                                required: true,
                              },
                            ]}
                          />
                        </div>
                      )}
                    </article>
                  ))
                )}
              </section>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Copied certified products</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          These marks are kept in this hub. The product number and PIN stay as they were copied. Link a manufacturer, a
          certification body, and a standard here. Removing a product hides it from this hub&apos;s registry and makes a
          PIN lookup say the product is currently under review.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {total} copied marks{q ? " match your search" : ""}.
        </p>
      </div>

      <DeskTabs tabs={tabs} keepMounted />

      <p className="text-sm">
        <Link href={`/${locale}/registry`} className="underline">
          Open the public registry
        </Link>
      </p>
    </div>
  );
}
