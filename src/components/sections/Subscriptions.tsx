"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { SUBSCRIPTION_PLANS } from "@/lib/data/subscriptions";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Subscriptions() {
  return (
    <section id="suscripciones" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Ahorra cada semana"
          title="Planes de suscripción"
          description="Comida saludable recurrente con beneficios exclusivos y entrega programada."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan, i) => (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-3xl border-2 bg-white p-6 shadow-lg transition-shadow sm:p-8",
                plan.popular
                  ? "border-[#8BC34A] shadow-[#8BC34A]/20"
                  : "border-transparent shadow-[#1F4D36]/5"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#8BC34A] px-4 py-1 text-xs font-bold text-[#1F4D36]">
                  <Sparkles className="h-3 w-3" />
                  Más popular
                </span>
              )}

              <h3 className="font-display text-xl font-bold text-[#1F4D36]">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-[#1B1B1B]/60">
                {plan.bowlsPerWeek} bowls / semana
              </p>

              <p className="mt-6 font-display text-4xl font-bold text-[#1F4D36]">
                {formatPrice(plan.price)}
                <span className="text-sm font-normal text-[#1B1B1B]/50"> /mes</span>
              </p>

              <p className="mt-2 text-sm font-medium text-[#8BC34A]">
                Ahorras {formatPrice(plan.savings)}
              </p>
              <p className="text-xs text-[#1B1B1B]/50">
                {formatPrice(plan.pricePerBowl)} por bowl
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2 text-sm text-[#1B1B1B]/70"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8BC34A]" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 w-full"
                variant={plan.popular ? "default" : "secondary"}
                asChild
              >
                <a href="#suscripciones">Elegir plan</a>
              </Button>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button size="lg" variant="fresh" asChild>
            <a href="#suscripciones">Conocer planes</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
