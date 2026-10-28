export const LIST_PAGE_SIZE = 20;

export function listPage(raw: string | undefined, total: number, pageSize = LIST_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = Math.min(pageCount, Math.max(1, Number(raw) || 1));
  return {
    page,
    pageCount,
    skip: (page - 1) * pageSize,
    take: pageSize,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(total, page * pageSize),
    total,
  };
}

export function listHref(pathname: string, page: number, query: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
