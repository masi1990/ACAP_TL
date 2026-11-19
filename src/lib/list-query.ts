export function normalizeListQuery(q: string | null | undefined): string {
  return String(q ?? "").trim();
}

export function rowMatchesQuery(
  row: Record<string, unknown> | object,
  q: string,
  fields: string[],
): boolean {
  const needle = normalizeListQuery(q).toLowerCase();
  if (!needle) return true;
  const record = row as Record<string, unknown>;
  return fields.some((field) => {
    const value = record[field];
    if (value == null) return false;
    return String(value).toLowerCase().includes(needle);
  });
}
