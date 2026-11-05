"use client";

import { toast } from "@/lib/notify";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { BowlPreview } from "@/components/bowl-builder/BowlPreview";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import {
  BUILDER_STEPS,
  type BuilderOption,
  type BuilderStep,
} from "@/lib/data/builder";
import { formatPrice, cn } from "@/lib/utils";
import { allergenLabel, formatGrams, sumNutrition } from "@/lib/nutrition";

type Selections = Record<BuilderStep, string[]>;

const initialSelections: Selections = {
  base: [],
  vegetables: [],
  proteins: [],
  toppings: [],
  sauce: [],
};

export function BowlBuilderContent({
  options: BUILDER_OPTIONS,
  basePrice: BASE_BOWL_PRICE,
  productSlug,
  productName,
}: {
  options: Record<BuilderStep, BuilderOption[]>;
  basePrice: number;
  productSlug: string;
  productName: string;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [activeStep, setActiveStep] = useState<BuilderStep>("base");
  const [selections, setSelections] = useState<Selections>(initialSelections);

  const toggleOption = useCallback((step: BuilderStep, optionId: string) => {
    const stepConfig = BUILDER_STEPS.find((s) => s.id === step)!;
    const max = stepConfig.max ?? 1;

    setSelections((prev) => {
      const current = prev[step];
      const isSelected = current.includes(optionId);

      if (isSelected) {
        return { ...prev, [step]: current.filter((id) => id !== optionId) };
      }

      if (max === 1) {
        return { ...prev, [step]: [optionId] };
      }

      if (current.length >= max) return prev;
      return { ...prev, [step]: [...current, optionId] };
    });
  }, []);

  const selectedOptions = useMemo(() => {
    const options: BuilderOption[] = [];
    for (const step of BUILDER_STEPS) {
      for (const id of selections[step.id]) {
        const opt = BUILDER_OPTIONS[step.id].find((o) => o.id === id);
        if (opt) options.push(opt);
      }
    }
    return options;
  }, [selections, BUILDER_OPTIONS]);

  const parts = useMemo(() => {
    const result = {} as Record<BuilderStep, BuilderOption[]>;
    for (const step of BUILDER_STEPS) {
      result[step.id] = selections[step.id]
        .map((id) => BUILDER_OPTIONS[step.id].find((o) => o.id === id))
        .filter((o): o is BuilderOption => Boolean(o));
    }
    return result;
  }, [selections, BUILDER_OPTIONS]);

  const totalPrice = useMemo(() => {
    const extras = selectedOptions.reduce((sum, o) => sum + o.price, 0);
    return BASE_BOWL_PRICE + extras;
  }, [selectedOptions, BASE_BOWL_PRICE]);

  const nutrition = useMemo(() => sumNutrition(selectedOptions.map((o) => o.nutrition)), [selectedOptions]);
  const allergens = useMemo(() => [...new Set(selectedOptions.flatMap((o) => o.allergens))], [selectedOptions]);

  const summaryItems = useMemo(() => {
    return BUILDER_STEPS.flatMap((step) =>
      selections[step.id].map((id) => {
        const opt = BUILDER_OPTIONS[step.id].find((o) => o.id === id);
        return opt ? { step: step.label, name: opt.name, price: opt.price } : null;
      })
    ).filter(Boolean) as { step: string; name: string; price: number }[];
  }, [selections, BUILDER_OPTIONS]);

  const addCustomBowlToCart = () => {
    if (selections.base.length === 0) return;
    addItem({
      id: productSlug,
      name: `${productName} (personalizado)`,
      price: totalPrice,
      image: "/images/bowl.png",
      details: summaryItems.map((item) => item.name).join(", "),
      options: selectedOptions.map((o) => o.id),
      unique: true,
    });
    toast.success(`${productName} agregado al carrito`, { description: summaryItems.map((item) => item.name).join(", ") });
    router.push("/carrito");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="mx-auto w-full max-w-[280px] sm:max-w-[340px] lg:col-span-4 lg:sticky lg:top-32 lg:max-w-none lg:self-start">
        <BowlPreview parts={parts} />
      </div>

      <div className="lg:col-span-5">
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {BUILDER_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all",
                activeStep === step.id
                  ? "bg-[#1F4D36] text-white shadow-md"
                  : "bg-white text-[#1F4D36]/70 hover:bg-[#1F4D36]/5"
              )}
            >
              {step.label.split(" ").slice(-1)[0] || step.label}
            </button>
          ))}
        </div>

        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white p-5 shadow-lg shadow-[#1F4D36]/5 sm:p-6"
        >
          <h3 className="font-display text-lg font-bold text-[#1F4D36]">
            {BUILDER_STEPS.find((s) => s.id === activeStep)?.label}
          </h3>
          <p className="mt-1 text-sm text-[#1B1B1B]/50">
            Máx. {BUILDER_STEPS.find((s) => s.id === activeStep)?.max}{" "}
            selección(es)
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BUILDER_OPTIONS[activeStep].map((option) => {
              const selected = selections[activeStep].includes(option.id);
              return (
                <motion.button
                  key={option.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleOption(activeStep, option.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                    selected
                      ? "border-[#8BC34A] bg-[#C5E1A5]/30 shadow-md"
                      : "border-transparent bg-[#F8F7F2] hover:border-[#1F4D36]/15"
                  )}
                >
                  {option.image ? (
                    <span className="relative h-14 w-14 overflow-hidden rounded-full shadow-sm ring-2 ring-white">
                      <Image src={option.image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">{option.emoji}</span>
                  )}
                  <span className="text-center text-xs font-semibold text-[#1F4D36]">
                    {option.name}
                  </span>
                  <span className="text-[10px] text-[#1B1B1B]/50">
                    {[option.nutrition ? `${Math.round(option.nutrition.kcal)} kcal` : null, option.price > 0 ? `+${formatPrice(option.price)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="lg:col-span-3 lg:sticky lg:top-32 lg:self-start">
        <div className="rounded-3xl bg-[#1F4D36] p-6 text-white shadow-xl">
          <h3 className="font-display text-lg font-bold">Tu resumen</h3>
          <ul className="scroll-dark -mr-3 mt-4 max-h-52 space-y-2 overflow-y-auto pr-3 text-sm [mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)] [&>li:last-child]:mb-4">
            {summaryItems.length === 0 ? (
              <li className="text-white/50">Aún no has seleccionado nada</li>
            ) : (
              summaryItems.map((item, i) => (
                <li
                  key={`${item.name}-${i}`}
                  className="flex justify-between gap-2 border-b border-white/10 pb-2"
                >
                  <span>{item.name}</span>
                  {item.price > 0 && (
                    <span className="text-white/60">
                      +{formatPrice(item.price)}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
          {nutrition.kcal > 0 && (
            <div className="mt-5 rounded-2xl bg-white/[0.07] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/55">Nutrición aprox.</span>
                <span className="font-display text-xl font-bold">
                  {Math.round(nutrition.kcal)} <span className="text-xs font-semibold text-white/60">kcal</span>
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ["Proteína", nutrition.protein, "bg-[#C5E1A5]"],
                    ["Carbos", nutrition.carbs, "bg-[#8BC34A]"],
                    ["Grasas", nutrition.fat, "bg-[#F2B84B]"],
                  ] as const
                ).map(([label, value, dot]) => (
                  <div key={label}>
                    <dd className="font-display text-sm font-bold">{formatGrams(value)}</dd>
                    <dt className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-white/55">
                      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
              {allergens.length > 0 && (
                <p className="mt-3 text-[11px] text-amber-200/90">Contiene: {allergens.map(allergenLabel).join(", ")}</p>
              )}
            </div>
          )}
          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
            <span className="font-medium">Total</span>
            <span className="font-display text-2xl font-bold">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <Button
            variant="fresh"
            size="lg"
            className="mt-6 w-full"
            disabled={selections.base.length === 0}
            type="button"
            onClick={addCustomBowlToCart}
          >
            <ShoppingCart className="h-5 w-5" />
            Agregar al carrito
          </Button>
          {selections.base.length === 0 && (
            <p className="mt-2 text-center text-xs text-white/50">
              Elige una base para continuar
            </p>
          )}
        </div>
      </div>
      {/* Barra fija en móvil: total y botón siempre a mano */}
      <div className="h-20 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1F4D36]/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(31,77,54,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-[#1F4D36]">{formatPrice(totalPrice)}</p>
            <p className="truncate text-[11px] text-[#1B1B1B]/50">
              {selections.base.length === 0
                ? "Elige una base para continuar"
                : `${summaryItems.length} ingrediente${summaryItems.length === 1 ? "" : "s"}${nutrition.kcal > 0 ? ` · ${Math.round(nutrition.kcal)} kcal` : ""}`}
            </p>
          </div>
          <Button variant="fresh" disabled={selections.base.length === 0} type="button" onClick={addCustomBowlToCart}>
            <ShoppingCart className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
