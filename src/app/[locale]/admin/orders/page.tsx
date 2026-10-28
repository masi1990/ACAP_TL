import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { Badge } from "@/components/ui/badge";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { formatStamp } from "@/lib/utils";
import { CopyLink } from "./copy-link";

const STATUSES = ["CHECKOUT", "PAID", "FULFILLED", "FAILED"] as const;

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function statusTone(status: string): "ok" | "info" | "warn" | "bad" | "default" {
  if (status === "FULFILLED") return "ok";
  if (status === "PAID") return "info";
  if (status === "FAILED") return "bad";
  if (status === "CHECKOUT" || status === "CART") return "warn";
  return "default";
}

function downloadHref(orderLocale: string, orderId: string, catalogItemId: string, lang: string) {
  const base = (process.env.APP_BASE_URL?.trim() || "").replace(/\/$/, "");
  const path = `/${orderLocale || "en"}/api/store/download?order=${encodeURIComponent(orderId)}&item=${encodeURIComponent(catalogItemId)}&lang=${encodeURIComponent(lang)}`;
  return base ? `${base}${path}` : path;
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/orders`} />;
  if (!can(session.user, "audit:read")) notFound();

  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status! : "";
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { buyerEmail: { contains: q, mode: "insensitive" } },
            { buyerName: { contains: q, mode: "insensitive" } },
            { buyerPhone: { contains: q, mode: "insensitive" } },
            { lines: { some: { catalogItem: { coverTitle: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
  const total = await prisma.order.count({ where });
  const listing = listPage(sp.page, total);

  const orders = await prisma.order.findMany({
    where,
    include: {
      lines: { include: { catalogItem: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      entitlements: { orderBy: { grantedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    skip: listing.skip,
    take: listing.take,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Webstore orders</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Purchases from the public store. After a successful payment the watermarked standard is ready,
          and the download link can be copied and sent again if a buyer asks for it.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, email, phone, order, or standard"
            className="h-10 w-72 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3"
          />
        </label>
        <label className="grid gap-1">
          Status
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3"
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-[var(--accent)] px-3 font-medium text-[var(--accent-fg)]">
          Filter
        </button>
        <Link href={`/${locale}/admin/orders`} className="text-[var(--accent)] underline">
          Clear
        </Link>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Buyer</th>
              <th className="px-4 py-2">Standard</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                  No orders match this filter.
                </td>
              </tr>
            )}
            {orders.map((order) => {
              const payment = order.payments[0];
              const entitlement = order.entitlements.find((item) => item.artifactUri);
              const titles = order.lines.map((line) => line.catalogItem.coverTitle).filter(Boolean);
              return (
                <tr key={order.id} className="border-b border-[var(--line)]/50 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>{formatStamp(order.createdAt)}</div>
                    <div className="mt-1 font-mono text-xs text-[var(--muted)]">{order.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{order.buyerName}</div>
                    <div className="text-xs text-[var(--muted)]">{order.buyerEmail}</div>
                    {order.buyerPhone && <div className="text-xs text-[var(--muted)]">{order.buyerPhone}</div>}
                  </td>
                  <td className="px-4 py-3">{titles.length > 0 ? titles.join(", ") : "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(order.totalCents, order.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {payment ? (
                      <>
                        <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                        {payment.paymentMethod && (
                          <div className="mt-1 text-xs text-[var(--muted)]">{payment.paymentMethod}</div>
                        )}
                        {payment.confirmationCode && (
                          <div className="mt-1 font-mono text-xs text-[var(--muted)]">{payment.confirmationCode}</div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {entitlement?.artifactUri ? (
                      <div className="space-y-2">
                        {order.lines.map((line) => (
                          <div key={line.id}>
                            {order.lines.length > 1 ? (
                              <p className="text-xs text-[var(--muted)]">{line.catalogItem.coverTitle}</p>
                            ) : null}
                            <CopyLink
                              href={downloadHref(order.locale, order.id, line.catalogItemId, line.editionLocale)}
                            />
                          </div>
                        ))}
                        {entitlement.watermarkText && (
                          <p className="max-w-xs text-xs text-[var(--muted)]">{entitlement.watermarkText}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">Not ready</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {listing.total === 0
          ? "No matching orders."
          : `Showing ${listing.from}–${listing.to} of ${listing.total}.`}
      </p>
      <LinePager
        page={listing.page}
        pageCount={listing.pageCount}
        prevHref={listHref(`/${locale}/admin/orders`, listing.page - 1, { q, status })}
        nextHref={listHref(`/${locale}/admin/orders`, listing.page + 1, { q, status })}
      />
    </div>
  );
}
