"use client";

import type { ReactNode } from "react";
import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";
import type { Locale } from "@/lib/i18n";
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
            content: (
              <section>
                <h2 className="text-lg font-semibold">Your activity</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {activity.map((row) => (
                    <li key={row.id} className="rounded-md border border-[var(--line)] px-3 py-2">
                      {row.at} · {row.action}
                      {row.roleCode ? ` · ${row.roleCode}` : ""}
                      {row.designation ? ` · ${row.designation}` : ""}
                      {row.language ? ` · ${row.language}` : ""}
                      {row.posting ? ` · ${row.posting}` : ""}
                    </li>
                  ))}
                  {activity.length === 0 ? <li className="text-[var(--muted)]">No library activity yet.</li> : null}
                </ul>
              </section>
            ),
          },
        ]
      : []),
  ];

  return <DeskTabs tabs={tabs} />;
}
