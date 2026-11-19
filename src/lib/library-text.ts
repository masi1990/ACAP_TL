export function standardVersionHasText(version: {
  sourcePdfUri?: string | null;
  languageFiles?: Array<{ sourcePdfUri?: string | null }>;
}): boolean {
  if (version.sourcePdfUri?.trim()) return true;
  return (version.languageFiles || []).some((file) => Boolean(file.sourcePdfUri?.trim()));
}
