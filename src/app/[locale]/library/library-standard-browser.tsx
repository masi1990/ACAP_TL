"use client";

import type { ComponentProps } from "react";
import type { Locale } from "@/lib/i18n";
import { LibraryCatalogue } from "./library-catalogue";
import { LibraryOptionsBrowser } from "./library-options-browser";

export { LibraryCatalogue } from "./library-catalogue";
export type { LibraryCommitteeFacet, LibraryFacet, LibraryFilter, LibraryStandardRow } from "./library-types";

/** Compatibility wrapper for the request form (Task 9 switches it to `LibraryCatalogue`). */
export function LibraryStandardBrowser(props: Omit<ComponentProps<typeof LibraryCatalogue>, "mode">) {
  return <LibraryCatalogue {...props} mode={props.action ? "add" : "browse"} />;
}

/** Standards released to the user, paged 20 at a time from the options API. */
export function LibraryHoldings({ locale }: { locale: Locale }) {
  return (
    <LibraryOptionsBrowser
      locale={locale}
      holdings
      emptyLabel="No standards are released to you in this selection."
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
