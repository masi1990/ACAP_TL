import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { UrlListSearch } from "@/components/admin/url-list-search";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { normalizeListQuery } from "@/lib/list-query";
import { canAccessComplaintsInbox, complaintListWhere } from "@/lib/complaint-access";
import { withBasePath } from "@/lib/base-path";

function photoHref(uri: string | null | undefined) {
  if (!uri) return null;
  if (uri.startsWith("/uploads/")) return withBasePath(`/api/uploads/${uri.slice("/uploads/".length)}`);
  return withBasePath(uri);
}

export default async function ComplaintsInboxPage({
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
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/complaints`} />;
  if (!canAccessComplaintsInbox(session.user)) {
    return <ClientRedirect href={`/${locale}/dashboard`} />;
  }

  const scope = complaintListWhere(session.user);
  if (!scope) return <ClientRedirect href={`/${locale}/dashboard`} />;

  const sp = await searchParams;
  const q = normalizeListQuery(sp.q);
  const where: Prisma.ConsumerComplaintWhereInput = {
    AND: [
      scope,
      q
        ? {
            OR: [
              { subject: { contains: q, mode: "insensitive" } },
              { status: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { manufacturer: { contains: q, mode: "insensitive" } },
              { complainantEmail: { contains: q, mode: "insensitive" } },
              { pin: { is: { pinCode: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {},
    ],
  };

  const listPath = `/${locale}/complaints`;
  const total = await prisma.consumerComplaint.count({ where });
  const listing = listPage(sp.page, total);
  const complaints = await prisma.consumerComplaint.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: listing.skip,
    take: listing.take,
    include: {
      routedCb: { select: { id: true, name: true } },
      pin: { select: { pinCode: true } },
      product: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="shell space-y-6 py-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Complaints</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Consumer reports about certified products. Certification bodies only see complaints routed to products
          they certified. Public filing stays on{" "}
          <Link className="text-[var(--accent)] underline" href={`/${locale}/consumers`}>
            Consumers
          </Link>
          .
        </p>
      </div>

      <UrlListSearch
        pathname={listPath}
        initial={q}
        placeholder="Search subject, status, brand, manufacturer, email, or PIN"
        from={listing.from}
        to={listing.to}
        total={listing.total}
      />

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Routed CB</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Filed</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  {q ? "No complaints match this search." : "No complaints filed yet."}
                </td>
              </tr>
            ) : (
              complaints.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)]/50 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.subject}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{c.complainantEmail}</p>
                    <p className="mt-2 max-w-md text-[var(--muted)]">{c.body}</p>
                    <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      <p>
                        Origin {c.originCountryIso2 || "—"} · Manufactured {c.manufactureCountryIso2 || "—"}
                      </p>
                      {c.purchasePlace ? <p>Bought: {c.purchasePlace}</p> : null}
                      {c.quantity ? <p>Qty: {c.quantity}</p> : null}
                      {c.flavour ? <p>Flavour: {c.flavour}</p> : null}
                      {c.manufacturedOn ? <p>Made: {c.manufacturedOn.toISOString().slice(0, 10)}</p> : null}
                      {c.expiresOn ? <p>Expires: {c.expiresOn.toISOString().slice(0, 10)}</p> : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {photoHref(c.labelPhotoUri) ? (
                          <a className="underline text-[var(--accent)]" href={photoHref(c.labelPhotoUri)!}>
                            Label photo
                          </a>
                        ) : null}
                        {photoHref(c.markPhotoUri) ? (
                          <a className="underline text-[var(--accent)]" href={photoHref(c.markPhotoUri)!}>
                            Mark photo
                          </a>
                        ) : null}
                        {photoHref(c.receiptPhotoUri) ? (
                          <a className="underline text-[var(--accent)]" href={photoHref(c.receiptPhotoUri)!}>
                            Receipt
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p>{c.brand || c.product?.name || "—"}</p>
                    <p className="text-[var(--muted)]">{c.manufacturer || "—"}</p>
                    {c.pin?.pinCode ? (
                      <p className="font-mono text-xs text-[var(--muted)]">{c.pin.pinCode}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{c.routedCb?.name || "Unassigned"}</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{c.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LinePager
        page={listing.page}
        pageCount={listing.pageCount}
        prevHref={listHref(listPath, listing.page - 1, { q })}
        nextHref={listHref(listPath, listing.page + 1, { q })}
      />
    </div>
  );
}
