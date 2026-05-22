import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BowlBuilderContent } from "@/components/bowl-builder/BowlBuilderContent";

export const metadata: Metadata = {
  title: "Arma tu bowl | FRESKO — Personaliza tu ensalada en Bogotá",
  description:
    "Crea tu bowl ideal: elige base, vegetales, proteínas, toppings y salsa. Vista previa en tiempo real y pedido por WhatsApp.",
};

export default function ArmaTuBowlPage() {
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
              Arma tu bowl
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#1B1B1B]/70 sm:text-lg">
              Selecciona base, vegetales, proteínas, toppings y salsa. Tu bowl se
              arma en tiempo real mientras eliges.
            </p>
          </div>
        </section>

        <section className="relative py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <BowlBuilderContent />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
