import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { standardVersionHasText } from "@/lib/library-text";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { LinePager } from "@/components/line-pager";
import { UrlListSearch } from "@/components/admin/url-list-search";
import { listHref, listPage } from "@/lib/list-page";
import { normalizeListQuery, rowMatchesQuery } from "@/lib/list-query";

const SEARCH_FIELDS = ["designation", "title", "sector", "tc"];

export default async function AdminLibraryReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string; rq?: string; rpage?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/library/reports`} />;
  if (!can(session.user, "institutions:write") && !can(session.user, "audit:read")) {
    return <ClientRedirect href={`/${locale}/dashboard`} />;
  }

  const published = await prisma.standard.findMany({
    where: { versions: { some: { publicationStatus: "PUBLISHED" } } },
    include: {
      technicalCommittee: { include: { sector: true } },
      versions: {
        where: { publicationStatus: "PUBLISHED" },
        orderBy: { year: "desc" },
        take: 1,
        include: { languageFiles: true },
      },
      libraryRequestItems: { select: { id: true, request: { select: { createdAt: true } } } },
    },
    orderBy: { designation: "asc" },
  });

  const sp = await searchParams;
  const q = normalizeListQuery(sp.q);
  const rq = normalizeListQuery(sp.rq);
  const listPath = `/${locale}/admin/library/reports`;
  const flat = (s: (typeof published)[number]) => ({
    designation: s.designation,
    title: s.titleEn,
    sector: s.technicalCommittee?.sector.name,
    tc: s.technicalCommittee?.code,
  });

  const noTextAll = published.filter((s) => !standardVersionHasText(s.versions[0] || {}));
  const noText = noTextAll.filter((s) => rowMatchesQuery(flat(s), q, SEARCH_FIELDS));
  const noTextListing = listPage(sp.page, noText.length);
  const noTextPage = noText.slice(noTextListing.skip, noTextListing.skip + noTextListing.take);
  const noTextRequestedAll = noTextAll
    .map((s) => ({
      standard: s,
      requestCount: s.libraryRequestItems.length,
      latestRequestAt: s.libraryRequestItems.reduce<Date | null>(
        (max, item) => (!max || item.request.createdAt > max ? item.request.createdAt : max),
        null,
      ),
    }))
    .filter((row) => row.requestCount > 0)
    .sort((a, b) => b.requestCount - a.requestCount);
  const noTextRequested = noTextRequestedAll.filter((row) => rowMatchesQuery(flat(row.standard), rq, SEARCH_FIELDS));
  const requestedListing = listPage(sp.rpage, noTextRequested.length);
  const requestedPage = noTextRequested.slice(requestedListing.skip, requestedListing.skip + requestedListing.take);

  const head = (cols: string[]) => (
    <thead>
      <tr className="border-b border-[var(--line)] text-left">
        {cols.map((c) => (
          <th key={c} className="px-3 py-2 font-medium">{c}</th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Library reports</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Published standards that do not yet have a PDF in the library.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Standards with no text ({noTextAll.length})</h2>
        <UrlListSearch
          pathname={listPath}
          initial={q}
          placeholder="Search designation, title, sector, or TC"
          keep={{ rq, rpage: sp.rpage }}
          from={noTextListing.from}
          to={noTextListing.to}
          total={noTextListing.total}
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            {head(["Designation", "Title", "Sector", "TC"])}
            <tbody>
              {noTextPage.map((s) => (
                <tr key={s.id} className="border-b border-[var(--line)]">
                  <td className="px-3 py-2">{s.designation}</td>
                  <td className="px-3 py-2">{s.titleEn}</td>
                  <td className="px-3 py-2">{s.technicalCommittee?.sector.name || "-"}</td>
                  <td className="px-3 py-2">{s.technicalCommittee?.code || "-"}</td>
                </tr>
              ))}
              {noText.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-2 text-[var(--muted)]">{q ? "No standards match this search." : "Every published standard has text."}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <LinePager
            page={noTextListing.page}
            pageCount={noTextListing.pageCount}
            prevHref={listHref(listPath, noTextListing.page - 1, { q, rq, rpage: sp.rpage })}
            nextHref={listHref(listPath, noTextListing.page + 1, { q, rq, rpage: sp.rpage })}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Requested standards with no text ({noTextRequestedAll.length})</h2>
        <UrlListSearch
          pathname={listPath}
          param="rq"
          pageParam="rpage"
          initial={rq}
          placeholder="Search designation, title, sector, or TC"
          keep={{ q, page: sp.page }}
          from={requestedListing.from}
          to={requestedListing.to}
          total={requestedListing.total}
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            {head(["Designation", "Title", "Sector", "TC", "Requests", "Latest request"])}
            <tbody>
              {requestedPage.map(({ standard: s, requestCount, latestRequestAt }) => (
                <tr key={s.id} className="border-b border-[var(--line)]">
                  <td className="px-3 py-2">{s.designation}</td>
                  <td className="px-3 py-2">{s.titleEn}</td>
                  <td className="px-3 py-2">{s.technicalCommittee?.sector.name || "-"}</td>
                  <td className="px-3 py-2">{s.technicalCommittee?.code || "-"}</td>
                  <td className="px-3 py-2">{requestCount}</td>
                  <td className="px-3 py-2">{latestRequestAt ? latestRequestAt.toISOString().slice(0, 10) : "-"}</td>
                </tr>
              ))}
              {noTextRequested.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-2 text-[var(--muted)]">{rq ? "No standards match this search." : "No requests for standards without text."}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <LinePager
            page={requestedListing.page}
            pageCount={requestedListing.pageCount}
            prevHref={listHref(listPath, requestedListing.page - 1, { q, page: sp.page, rq }, "rpage")}
            nextHref={listHref(listPath, requestedListing.page + 1, { q, page: sp.page, rq }, "rpage")}
          />
        </div>
      </section>
    </div>
  );
}
