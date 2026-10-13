import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { PUBLIC_FLOW } from "@/components/flow-nav";

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
            {t(locale, "heroSupport")} The public path runs from the standard in the webstore, through
            the tariff line, to the certified-product register and the consumer. Officers sign in for
            certification, the border, and surveillance.
          </p>
          <div className="rise-delay-2 mt-8 flex flex-wrap gap-3">
            {PUBLIC_FLOW.map((step, index) => (
              <Button
                key={step.id}
                asChild
                size="lg"
                variant={index === 0 ? "default" : "outline"}
                className={index === 0 ? undefined : "border-white/35 text-white hover:bg-white/10"}
              >
                <Link href={`/${locale}${step.path}`}>
                  {index + 1}. {t(locale, step.label)}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
