"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarCheck, Gift, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Gift,
    title: "Suscríbete y ahorra",
    text: "Planes semanales con beneficios exclusivos.",
  },
  {
    icon: CalendarCheck,
    title: "Come sin complicarte",
    text: "Simplifica tus comidas: pide, programa y listo.",
  },
  {
    icon: Heart,
    title: "Cuida tu salud",
    text: "Comida saludable que se adapta a tu estilo de vida.",
  },
];

export function PromoBenefitsBar() {
  return (
    <section
      className="relative z-20 bg-[#F8F7F2] pb-4 sm:pb-6"
      aria-label="Beneficios FRESKO"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="relative isolate flex flex-col gap-4 rounded-2xl bg-[#1F4D36] px-4 py-4 text-white shadow-lg shadow-[#1F4D36]/20 sm:rounded-3xl sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:gap-6 lg:py-4 lg:pr-5"
        >
          <div className="grid flex-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {benefits.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-2.5 sm:gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <item.icon className="h-4 w-4 text-[#C5E1A5]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold leading-tight">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-white/65">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex shrink-0 justify-center lg:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-[#8BC34A] bg-transparent px-5 text-xs text-[#C5E1A5] shadow-[0_0_16px_rgba(139,195,74,0.2)] hover:bg-[#8BC34A]/15 hover:text-white"
              asChild
            >
              <Link href="/#suscripciones">Conocer los planes</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
