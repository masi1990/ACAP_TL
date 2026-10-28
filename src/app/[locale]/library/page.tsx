import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { logLibraryActivity, userLibraryView } from "@/lib/library";
import { publishedLocales } from "@/lib/standard-kinds";
import { StandardRequestForm } from "./standard-request-form";

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
        <StandardRequestForm locale={locale} />
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
      {!view.access.length ? (
        <p className="mt-6 text-sm text-[var(--muted)]">You do not have library access yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((standard) => {
            const version = standard.versions[0];
            if (!version) return null;
            const languages = publishedLocales(version.languageFiles, version.authoritativeLocale, version.sourcePdfUri);
            return (
              <article key={standard.id} className="rounded-xl border border-[var(--line)] p-4">
                <p className="font-mono text-sm">{standard.designation}</p>
                <h2 className="font-medium">{standard.titleEn}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <a
                      key={lang}
                      className="rounded-md border border-[var(--line)] px-2 py-1 text-xs"
                      href={`/api/library/standards/${standard.id}/file?lang=${lang}`}
                    >
                      Download {lang.toUpperCase()}
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
          {visible.length === 0 ? <p className="text-sm text-[var(--muted)]">No standards are released to you yet.</p> : null}
        </div>
      )}
      <StandardRequestForm locale={locale} signedInEmail={session.user.email} signedInName={session.user.name} />
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Your activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {activity.map((row) => (
            <li key={row.id} className="rounded-md border border-[var(--line)] px-3 py-2">
              {row.occurredAt.toISOString().slice(0, 16).replace("T", " ")} · {row.action}
              {row.roleCode ? ` · ${row.roleCode}` : ""}
              {row.standard ? ` · ${row.standard.designation}` : ""}
              {row.language ? ` · ${row.language}` : ""}
              {row.posting ? ` · ${row.posting.kind} ${row.posting.countryIso2}` : ""}
            </li>
          ))}
          {activity.length === 0 ? <li className="text-[var(--muted)]">No library activity yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
