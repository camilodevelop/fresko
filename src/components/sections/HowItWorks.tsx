"use client";

import { motion } from "framer-motion";
import { ChefHat, MousePointerClick, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { WHATSAPP_URL } from "@/lib/constants";

const steps = [
  {
    icon: MousePointerClick,
    title: "Elige",
    description: "Selecciona tu bowl favorito o arma el tuyo con ingredientes frescos.",
  },
  {
    icon: ChefHat,
    title: "Armamos",
    description: "Preparamos tu pedido al momento con ingredientes del día.",
  },
  {
    icon: Truck,
    title: "Recibe",
    description: "Entrega rápida y segura directo a tu puerta en Bogotá.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Simple y rápido"
          title="Cómo funciona"
          description="De la pantalla a tu mesa en tres pasos."
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F4D36] text-white shadow-lg shadow-[#1F4D36]/20">
                <step.icon className="h-7 w-7" />
              </div>
              <span className="mt-6 inline-block font-display text-5xl font-bold text-[#C5E1A5]">
                {i + 1}
              </span>
              <h3 className="mt-2 font-display text-xl font-bold text-[#1F4D36]">
                {step.title}
              </h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1B1B1B]/60">
                {step.description}
              </p>
              {i < steps.length - 1 && (
                <div
                  className="absolute right-0 top-8 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-[#C5E1A5] to-transparent md:block"
                  aria-hidden
                />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Pedir ahora
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
