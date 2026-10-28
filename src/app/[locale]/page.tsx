import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AfricaTradeSketch } from "@/components/africa-trade-sketch";
import { siteNav } from "@/lib/navigation";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="atmosphere">
      <section className="hero-plane relative min-h-[calc(100vh-7rem)] w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(196,165,116,0.25),transparent_45%)]" />
        <div className="shell relative grid min-h-[calc(100vh-7rem)] items-center gap-8 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="rise mb-3 text-xs uppercase tracking-[0.28em] text-[color-mix(in_oklab,#f4fff9_70%,#c4a574)]">
            {t(locale, "brandSub")}
          </p>
          <h1 className="rise-delay font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            {t(locale, "brand")}
          </h1>
          <p className="rise-delay mt-4 max-w-xl text-lg text-[color-mix(in_oklab,#f4fff9_88%,transparent)] sm:text-xl">
            {t(locale, "tagline")}
          </p>
          <p className="rise-delay-2 mt-6 flex max-w-xl flex-wrap items-center gap-x-2 gap-y-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[#f4fff9] sm:text-3xl">
            {t(locale, "motto")
              .split(" — ")
              .map((part, index, parts) => (
                <span key={part} className="inline-flex items-center gap-2">
                  {part}
                  {index < parts.length - 1 ? (
                    <span className="text-[#e7c98a]" aria-hidden>
                      —
                    </span>
                  ) : null}
                </span>
              ))}
          </p>
          <div className="rise-delay-2 mt-8 flex flex-wrap gap-2">
            {siteNav(null, locale).map((group) => (
              <div key={group.id} className="flex flex-wrap items-center gap-2">
                {group.links.map((link, index) => (
                  <Button
                    key={link.href}
                    asChild
                    size="lg"
                    variant={group.id === "standards" && index === 0 ? "default" : "outline"}
                    className={group.id === "standards" && index === 0 ? undefined : "border-white/35 text-white hover:bg-white/10"}
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </div>
            ))}
          </div>
          </div>
          <AfricaTradeSketch />
        </div>
      </section>
    </div>
  );
}
