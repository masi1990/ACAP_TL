import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { Badge } from "@/components/ui/badge";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { normalizeListQuery } from "@/lib/list-query";
import { UrlListSearch } from "@/components/admin/url-list-search";
import { withBasePath } from "@/lib/base-path";

export default async function AdminTariffsPage({
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
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/tariffs`} />;
  if (!can(session.user, "tariffs:read")) notFound();

  const sp = await searchParams;
  const q = normalizeListQuery(sp.q);
  const compactQ = q.replace(/[^0-9a-z]/gi, "");
  const where = q
    ? {
        OR: [
          { codeDisplay: { contains: q, mode: "insensitive" as const } },
          ...(compactQ ? [{ codeNormalized: { contains: compactQ, mode: "insensitive" as const } }] : []),
          { description: { contains: q, mode: "insensitive" as const } },
          { rec: { code: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};
  const listPath = `/${locale}/admin/tariffs`;
  const total = await prisma.tariffLine.count({ where });
  const listing = listPage(sp.page, total);
  const [rows, recs] = await Promise.all([
    prisma.tariffLine.findMany({
      where,
      include: { rec: true },
      orderBy: [{ codeLength: "asc" }, { codeNormalized: "asc" }],
      skip: listing.skip,
      take: listing.take,
    }),
    prisma.rec.findMany({ orderBy: { code: "asc" } }),
  ]);
  const canWrite = can(session.user, "tariffs:write");
  const canDelete = can(session.user, "tariffs:delete");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Tariff codes</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          HS lines are REC-specific. Create the REC first, then add codes (HS6 / HS8 / HS10).
        </p>
      </div>

      {canWrite && (
        <CrudForm
          action={withBasePath("/api/admin/tariffs")}
          submitLabel="Add tariff line"
          fields={[
            {
              name: "recCode",
              label: "REC",
              type: "select",
              required: true,
              options: recs.map((r) => ({ value: r.code, label: `${r.code} — ${r.name}` })),
            },
            { name: "codeDisplay", label: "Tariff code", required: true, placeholder: "1006.30" },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              required: true,
              placeholder: "Semi-milled or wholly milled rice…",
            },
          ]}
        />
      )}

      {recs.length === 0 && (
        <p className="rounded-md border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No RECs exist yet. Add a REC before creating tariff codes.
        </p>
      )}

      <UrlListSearch
        pathname={listPath}
        initial={q}
        placeholder="Search code, description, or REC"
        from={listing.from}
        to={listing.to}
        total={listing.total}
      />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">REC</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">HS</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  {q ? "No tariff lines match this search." : "No tariff lines yet."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)]/50 align-top">
                <td className="px-4 py-3">
                  <Badge tone="info">{r.rec.code}</Badge>
                </td>
                <td className="px-4 py-3 font-mono font-medium">{r.codeDisplay}</td>
                <td className="px-4 py-3">HS{r.codeLength}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{r.description}</td>
                <td className="px-4 py-3 text-right">
                  {canDelete && <DeleteButton action={withBasePath(`/api/admin/tariffs/${r.id}`)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LinePager
        page={listing.page}
        pageCount={listing.pageCount}
        prevHref={listHref(listPath, listing.page - 1, { q })}
        nextHref={listHref(listPath, listing.page + 1, { q })}
      />
      <p className="text-xs text-[var(--muted)]">/{locale}/admin/tariffs</p>
    </div>
  );
}
