"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  AVG_BOWL_PRICE,
  AVG_SALAD_PRICE,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_TABS,
  type SubscriptionCategory,
  type SubscriptionPlan,
} from "@/lib/data/subscriptions";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

function PlanCard({
  plan,
  index,
}: {
  plan: SubscriptionPlan;
  index: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
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
        {plan.servingsPerMonth} {plan.servingLabel} / mes
      </p>

      <p className="mt-6 font-display text-4xl font-bold text-[#1F4D36]">
        {formatPrice(plan.price)}
        <span className="text-sm font-normal text-[#1B1B1B]/50"> /mes</span>
      </p>
      <p className="mt-1 text-sm text-[#1B1B1B]/40 line-through">
        {formatPrice(plan.listPrice)}
      </p>
      <p className="mt-2 text-sm font-medium text-[#8BC34A]">
        {plan.discountPercent}% de descuento · ahorras {formatPrice(plan.savings)}
      </p>
      <p className="text-xs text-[#1B1B1B]/50">
        {formatPrice(plan.pricePerServing)} por{" "}
        {plan.servingLabel === "bowls" ? "bowl" : "ensalada"}{" "}
        <span className="text-[#1B1B1B]/35">
          (promedio{" "}
          {formatPrice(
            plan.servingLabel === "bowls" ? AVG_BOWL_PRICE : AVG_SALAD_PRICE
          )}
          )
        </span>
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
  );
}

export function Subscriptions() {
  const [category, setCategory] = useState<SubscriptionCategory>("ensaladas");

  const plans = useMemo(
    () => SUBSCRIPTION_PLANS.filter((plan) => plan.category === category),
    [category]
  );

  return (
    <section id="suscripciones" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Ahorra cada semana"
          title="Planes de suscripción"
          description="Elige entre planes de ensaladas o bowls. Comida recurrente con entrega programada."
        />

        <div
          className="mx-auto mt-10 flex w-fit gap-2 rounded-full bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Tipo de plan"
        >
          {SUBSCRIPTION_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              onClick={() => setCategory(tab.id)}
              className={cn(
                "rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                category === tab.id
                  ? "bg-[#1F4D36] text-white shadow-md"
                  : "text-[#1F4D36]/70 hover:bg-[#1F4D36]/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-12 grid gap-6 md:grid-cols-3"
          >
            {plans.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
