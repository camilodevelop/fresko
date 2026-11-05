import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BowlBuilderContent } from "@/components/bowl-builder/BowlBuilderContent";
import { getBuilderConfig } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Arma tu bowl | FRESKO — Personaliza tu ensalada en Bogotá",
  description:
    "Crea tu bowl ideal: elige base, vegetales, proteínas, toppings y salsa. Vista previa en tiempo real y pedido por WhatsApp.",
};

export default async function ArmaTuBowlPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string }>;
}) {
  const { producto } = await searchParams;
  const config = await getBuilderConfig(producto);
  const title = config.product?.name ?? "Arma tu bowl";
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#C5E1A5]/25 via-transparent to-transparent" />

        <section className="relative border-b border-[#1F4D36]/8 pt-24 pb-10 sm:pt-28 sm:pb-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-[#8BC34A]">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Experiencia interactiva
              </span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#1F4D36] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#1B1B1B]/70 sm:text-lg">
              Selecciona base, vegetales, proteínas, toppings y salsa. Tu bowl se
              arma en tiempo real mientras eliges.
            </p>
          </div>
        </section>

        <section className="relative py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {config.products.length > 1 && (
              <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="¿Qué quieres armar?">
                {config.products.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/arma-tu-bowl?producto=${p.slug}`}
                    role="tab"
                    aria-selected={p.slug === config.product?.slug}
                    className={cn(
                      "rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                      p.slug === config.product?.slug
                        ? "bg-[#1F4D36] text-white shadow-md"
                        : "bg-white text-[#1F4D36]/70 hover:bg-[#1F4D36]/5"
                    )}
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            )}
            {config.product ? (
              <BowlBuilderContent
                key={config.product.slug}
                options={config.options}
                basePrice={config.product.price}
                productSlug={config.product.slug}
                productName={config.product.name}
              />
            ) : (
              <p className="rounded-3xl bg-white p-10 text-center text-[#1B1B1B]/60">El armador no está disponible por ahora.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
