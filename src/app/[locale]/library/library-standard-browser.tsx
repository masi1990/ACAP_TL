"use client";

import type { ComponentProps } from "react";
import type { Locale } from "@/lib/i18n";
import { LibraryCatalogue } from "./library-catalogue";
import type { LibraryStandardRow } from "./library-types";

export { LibraryCatalogue } from "./library-catalogue";
export type { LibraryCommitteeFacet, LibraryFacet, LibraryFilter, LibraryStandardRow } from "./library-types";

/** Compatibility wrapper for the request form (Task 9 switches it to `LibraryCatalogue`). */
export function LibraryStandardBrowser(props: Omit<ComponentProps<typeof LibraryCatalogue>, "mode">) {
  return <LibraryCatalogue {...props} mode={props.action ? "add" : "browse"} />;
}

export function LibraryHoldings({ rows, locale }: { rows: LibraryStandardRow[]; locale: Locale }) {
  return (
    <LibraryCatalogue
      rows={rows}
      locale={locale}
      mode="browse"
      emptyLabel="No standards are released to you in this technical committee."
      action={(row) => (
        <div className="flex flex-wrap justify-end gap-1">
          {(row.languages || []).map((language) => (
            <a key={language.code} href={language.href} className="rounded-md px-2 py-1 text-xs text-white" style={{ background: "#1f6b54" }}>
              {language.code.toUpperCase()}
            </a>
          ))}
        </div>
      )}
    />
  );
}
