"use client";

import type { ReactNode } from "react";
import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";
import type { Locale } from "@/lib/i18n";
import { LibraryActivityPanel } from "./library-activity-panel";
import { LibraryHoldings } from "./library-standard-browser";
import { LibraryOptionsBrowser } from "./library-options-browser";

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
  holdingsCount,
  accessMessage,
  activity,
  signedIn,
  requestForm,
}: {
  locale: Locale;
  /** How many standards are released to the user (rows load by page); null or 0 falls back to the public catalogue. */
  holdingsCount: number | null;
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
          {holdingsCount ? (
            <LibraryHoldings locale={locale} />
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
