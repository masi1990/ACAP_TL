"use client";

import type { ReactNode } from "react";
import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";
import type { Locale } from "@/lib/i18n";
import { LibraryActivityPanel } from "./library-activity-panel";
import { LibraryHoldings } from "./library-standard-browser";
import { LibraryOptionsBrowser } from "./library-options-browser";
import type { LibraryStandardRow } from "./library-types";

export type LibraryActivityItem = {
  id: string;
  at: string;
  action: string;
  roleCode?: string;
  designation?: string;
  language?: string;
  posting?: string;
};

export function LibraryPageShell({
  locale,
  holdingsRows,
  accessMessage,
  activity,
  signedIn,
  requestForm,
}: {
  locale: Locale;
  /** Holdings released to the user; null or empty falls back to the read-only public catalogue. */
  holdingsRows: LibraryStandardRow[] | null;
  accessMessage?: ReactNode;
  activity: LibraryActivityItem[];
  signedIn: boolean;
  requestForm: ReactNode;
}) {
  const tabs = [
    {
      id: "catalogue",
      label: "Catalogue",
      content: (
        <div className="grid gap-4">
          {accessMessage}
          {holdingsRows && holdingsRows.length > 0 ? (
            <LibraryHoldings locale={locale} rows={holdingsRows} />
          ) : (
            <LibraryOptionsBrowser locale={locale} />
          )}
        </div>
      ),
    },
    { id: "request", label: "Request", content: requestForm },
    ...(signedIn
      ? [
          {
            id: "activity",
            label: "Activity",
            content: <LibraryActivityPanel activity={activity} />,
          },
        ]
      : []),
  ];

  return <DeskTabs tabs={tabs} keepMounted />;
}
