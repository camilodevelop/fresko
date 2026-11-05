"use client";

import { motion } from "framer-motion";
import { CalendarClock, ChefHat, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { WHATSAPP_URL } from "@/lib/constants";

const steps = [
  {
    icon: CalendarClock,
    title: "Elige y programa",
    description:
      "Escoge tu bowl o ensalada y programa el día y la franja horaria de entrega.",
  },
  {
    icon: ChefHat,
    title: "Armamos",
    description: "Preparamos tu pedido el día de la entrega, con ingredientes del día.",
  },
  {
    icon: Leaf,
    title: "Recibe fresco",
    description: "Lo recibes fresco y con envío gratis",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Envío programado"
          title="Cómo funciona"
          description="Pides, programas tu entrega y lo recibes fresco. En tres pasos."
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
