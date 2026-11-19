import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { logLibraryActivity, userLibraryView } from "@/lib/library";
import { standardVersionHasText } from "@/lib/library-text";
import { standardKindOrNull, publishedLocales } from "@/lib/standard-kinds";
import { LibraryPageShell } from "./library-page-shell";
import type { LibraryStandardRow } from "./library-types";
import { StandardRequestForm } from "./standard-request-form";

function titleFor(
  standard: { titleEn: string; titleFr: string | null; titlePt: string | null; titleAr: string | null },
  locale: Locale,
) {
  if (locale === "fr" && standard.titleFr) return standard.titleFr;
  if (locale === "pt" && standard.titlePt) return standard.titlePt;
  if (locale === "ar" && standard.titleAr) return standard.titleAr;
  return standard.titleEn;
}

function libraryRow(standard: {
  id: string;
  designation: string;
  titleEn: string;
  titleFr: string | null;
  titlePt: string | null;
  titleAr: string | null;
  kind: string;
  technicalCommittee: {
    id: string;
    code: string;
    name: string;
    scope: string;
    secretariat: { iso2: string; name: string } | null;
    sector: { id: string; code: string; name: string };
  } | null;
  versions: Array<{ languageFiles: Array<{ locale: string; sourcePdfUri: string }>; authoritativeLocale: string; sourcePdfUri: string | null }>;
}, locale: Locale): LibraryStandardRow[] {
  const version = standard.versions[0];
  if (!version) return [];
  const committee = standard.technicalCommittee;
  return [
    {
      id: standard.id,
      designation: standard.designation,
      title: titleFor(standard, locale),
      kind: standardKindOrNull(standard.kind) || standard.kind || "PRODUCT",
      sectorId: committee?.sector.id || "unassigned",
      sectorCode: committee?.sector.code || "",
      sectorName: committee?.sector.name || "Not yet classified",
      committeeId: committee?.id || "unassigned",
      committeeCode: committee?.code || "",
      committeeName: committee?.name || "Not yet classified",
      committeeScope: committee?.scope || "",
      secretariatName: committee?.secretariat?.name || "",
      secretariatIso2: committee?.secretariat?.iso2 || "",
      languages: publishedLocales(version.languageFiles, version.authoritativeLocale, version.sourcePdfUri).map((code) => ({
        code,
        href: `/api/library/standards/${standard.id}/file?lang=${code}`,
      })),
      hasText: standardVersionHasText(version),
    },
  ];
}

export default async function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();

  if (!session) {
    return (
      <div className="shell py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Library of African Standards</h1>
        <p className="mt-3 text-[var(--muted)]">
          Standards officers download the original standard, without a store watermark, for harmonisation and adoption.
          Certification officers certify products and do not receive this library through that role.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href={`/${locale}/library/register`} className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">Create a login</Link>
          <Link href={`/${locale}/login?next=/${locale}/library`} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm">Sign in</Link>
        </div>
        <div className="mt-8">
          <LibraryPageShell
            locale={locale}
            holdingsRows={null}
            activity={[]}
            signedIn={false}
            requestForm={<StandardRequestForm locale={locale} />}
          />
        </div>
      </div>
    );
  }

  const [view, pending, activity, published] = await Promise.all([
    userLibraryView(session.userId),
    prisma.libraryAccessRequest.findFirst({
      where: { userId: session.userId, status: "PENDING" },
      include: { organization: true, memberState: true },
    }),
    prisma.libraryActivity.findMany({
      where: { userId: session.userId },
      orderBy: { occurredAt: "desc" },
      take: 20,
      include: { standard: true, posting: true },
    }),
    prisma.standard.findMany({
      where: { versions: { some: { publicationStatus: "PUBLISHED" } } },
      orderBy: { designation: "asc" },
      include: {
        technicalCommittee: { include: { sector: true, secretariat: true } },
        versions: {
          where: { publicationStatus: "PUBLISHED" },
          orderBy: { year: "desc" },
          take: 1,
          include: { languageFiles: true },
        },
      },
    }),
  ]);

  const visible = view.full ? published : published.filter((standard) => view.releasedIds.includes(standard.id));
  if (view.access.length) {
    await logLibraryActivity({
      userId: session.userId,
      organizationId: view.access[0].organizationId,
      memberStateId: view.access[0].memberStateId,
      action: "LIBRARY_OPENED",
    });
  }

  return (
    <div className="shell py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Library of African Standards</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
        Harmonisation and adoption. Downloads are the original file.{" "}
        <Link className="underline" href={`/${locale}/library/request`}>Request the standards officer role</Link>
      </p>
      {pending ? (
        <p className="mt-4 rounded-lg border border-[var(--line)] p-4 text-sm">
          Waiting for ARSO to decide your request for {pending.organization.name}, {pending.memberState.name}.
        </p>
      ) : null}
      <div className="mt-6">
        <LibraryPageShell
          locale={locale}
          holdingsRows={view.access.length ? visible.flatMap((standard) => libraryRow(standard, locale)) : null}
          accessMessage={
            !view.access.length ? (
              <p className="text-sm text-[var(--muted)]">You do not have library access yet. You can still browse the catalogue below.</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No standards are released to you yet. You can still browse the catalogue below.</p>
            ) : null
          }
          signedIn
          activity={activity.map((row) => ({
            id: row.id,
            at: row.occurredAt.toISOString().slice(0, 16).replace("T", " "),
            action: row.action,
            roleCode: row.roleCode || undefined,
            designation: row.standard?.designation,
            language: row.language || undefined,
            posting: row.posting ? `${row.posting.kind} ${row.posting.countryIso2}` : undefined,
          }))}
          requestForm={<StandardRequestForm locale={locale} signedInEmail={session.user.email} signedInName={session.user.name} />}
        />
      </div>
    </div>
  );
}
