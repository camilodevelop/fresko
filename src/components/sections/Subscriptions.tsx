"use client";

import { motion } from "framer-motion";
import { CalendarRange, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import type { PublicPlan } from "@/lib/data/catalog";
import { cn, formatPrice } from "@/lib/utils";

function validityLabel(days: number) {
  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }
  return `${days} días`;
}

function PlanCard({ plan, index }: { plan: PublicPlan; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative flex flex-col rounded-3xl border-2 bg-white p-6 shadow-lg transition-shadow sm:p-8",
        plan.featured ? "border-[#8BC34A] shadow-[#8BC34A]/20" : "border-transparent shadow-[#1F4D36]/5"
      )}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#8BC34A] px-4 py-1 text-xs font-bold text-[#1F4D36]">
          <Sparkles className="h-3 w-3" />
          Más popular
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-[#1F4D36]">{plan.name}</h3>
          <p className="mt-1 text-sm text-[#1B1B1B]/60">{plan.portions} platos a tu elección</p>
        </div>
        {plan.discount > 0 && (
          <span className="shrink-0 rounded-full bg-[#E8F3DC] px-3 py-1 text-xs font-bold text-[#2E6B1F]">
            −{Math.round(plan.discount * 100)}%
          </span>
        )}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[#1B1B1B]/40">Desde</p>
      <p className="font-display text-4xl font-bold text-[#1F4D36]">{formatPrice(plan.fromPrice)}</p>
      <p className="mt-1 text-sm text-[#1B1B1B]/55">
        {formatPrice(Math.round(plan.fromPrice / plan.portions))} por plato
      </p>
      {plan.description && <p className="mt-3 text-sm text-[#1B1B1B]/60">{plan.description}</p>}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-[#1B1B1B]/50">
        <CalendarRange className="h-3.5 w-3.5" /> {validityLabel(plan.validityDays)} para programar tus platos
      </p>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm text-[#1B1B1B]/70">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8BC34A]" />
            {benefit}
          </li>
        ))}
      </ul>

      <Button className="mt-8 w-full" variant={plan.featured ? "default" : "secondary"} asChild>
        <a href="#suscripciones">Elegir plan</a>
      </Button>
    </motion.article>
  );
}

export function Subscriptions({ plans }: { plans: PublicPlan[] }) {
  if (plans.length === 0) return null;
  return (
    <section id="suscripciones" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Ahorra en cada plato"
          title="Planes de suscripción"
          description="Elige cuántos platos quieres y arma tu calendario con ensaladas y bowls. Los platos premium suman su diferencia y el descuento del plan aplica sobre todo. Domicilio incluido."
        />

        <div
          className={cn(
            "mt-12 grid gap-6",
            plans.length === 1 ? "mx-auto max-w-md" : plans.length === 2 ? "mx-auto max-w-3xl md:grid-cols-2" : "md:grid-cols-3"
          )}
        >
          {plans.map((plan, i) => (
            <PlanCard key={plan.slug} plan={plan} index={i} />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-[#1B1B1B]/45">
          El precio “desde” es con todos los platos al valor base. Los platos de mayor valor suman la diferencia.
        </p>
      </div>
    </section>
  );
}
