import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";
import { AssessmentBoard, type BoardItem, type DossierFields } from "@/components/cb/assessment-board";
import { t, type Locale } from "@/lib/i18n";

export type MarkCertificateTrack = {
  id: string;
  markScheme: string;
  standardLabel: string;
  items: BoardItem[];
  dossier: DossierFields | null;
  attachments: Array<{
    id: string;
    kind: string;
    annexCode: string | null;
    title: string;
    filename: string;
  }>;
  certificateNo: string | null;
};

function TrackBoard({ locale, track }: { locale: Locale; track: MarkCertificateTrack }) {
  return (
    <div className="space-y-3">
      {track.standardLabel ? (
        <p className="text-sm text-[var(--muted)]">
          {track.markScheme === "ECO" ? t(locale, "Eco standard") : t(locale, "Quality standard")}
          {" · "}
          {track.standardLabel}
        </p>
      ) : null}
      <AssessmentBoard
        locale={locale}
        applicationId={track.id}
        items={track.items}
        dossier={track.dossier}
        attachments={track.attachments}
        certificateNo={track.certificateNo}
      />
    </div>
  );
}

/** Quality and Eco each keep their own assessment and certificate of conformity. */
export function MarkCertificateTabs({ locale, tracks }: { locale: Locale; tracks: MarkCertificateTrack[] }) {
  const quality = tracks.find((track) => track.markScheme === "QUALITY");
  const eco = tracks.find((track) => track.markScheme === "ECO");

  return (
    <DeskTabs
      syncHash={false}
      tabs={[
        {
          id: "quality-coc",
          label: t(locale, "Quality Mark"),
          content: quality ? (
            <TrackBoard locale={locale} track={quality} />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              This product has no Quality Mark application.
            </p>
          ),
        },
        {
          id: "eco-coc",
          label: t(locale, "Eco Mark"),
          content: eco ? (
            <TrackBoard locale={locale} track={eco} />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Eco Mark Africa is not selected. Choose both marks and an Eco standard to issue that
              certificate of conformity.
            </p>
          ),
        },
      ]}
    />
  );
}
