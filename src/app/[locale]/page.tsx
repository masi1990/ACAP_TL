import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="atmosphere">
      <section className="hero-plane relative min-h-[calc(100vh-7rem)] w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(196,165,116,0.25),transparent_45%)]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col justify-end px-4 pb-16 pt-24 sm:pb-20">
          <p className="rise mb-3 text-xs uppercase tracking-[0.28em] text-[color-mix(in_oklab,#f4fff9_70%,#c4a574)]">
            {t(locale, "brandSub")}
          </p>
          <h1 className="rise-delay font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            {t(locale, "brand")}
          </h1>
          <p className="rise-delay mt-4 max-w-xl text-lg text-[color-mix(in_oklab,#f4fff9_88%,transparent)] sm:text-xl">
            {t(locale, "tagline")}
          </p>
          <p className="rise-delay-2 mt-3 max-w-lg text-sm leading-relaxed text-[color-mix(in_oklab,#f4fff9_72%,transparent)] sm:text-base">
            {t(locale, "heroSupport")} Look up tariffs, browse certified Quality / Eco Mark products,
            and preview standards (Clause 1 Scope on the public store).
          </p>
          <div className="rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/${locale}/lookup`}>{t(locale, "ctaLookup")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href={`/${locale}/registry`}>{t(locale, "navRegistry")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/35 text-white hover:bg-white/10"
            >
              <Link href={`/${locale}/verify`}>{t(locale, "ctaVerify")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/35 text-white hover:bg-white/10"
            >
              <Link href={`/${locale}/store`}>{t(locale, "navStore")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
