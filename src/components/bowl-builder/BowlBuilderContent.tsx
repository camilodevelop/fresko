"use client";

import { toast } from "@/lib/notify";

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

  const totalPrice = useMemo(() => {
    const extras = selectedOptions.reduce((sum, o) => sum + o.price, 0);
    return BASE_BOWL_PRICE + extras;
  }, [selectedOptions, BASE_BOWL_PRICE]);

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
      unique: true,
    });
    toast.success(`${productName} agregado al carrito`, { description: summaryItems.map((item) => item.name).join(", ") });
    router.push("/carrito");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
        <BowlPreview layers={selectedOptions} />
      </div>

      <div className="lg:col-span-5">
        <div className="mb-6 flex flex-wrap gap-2">
          {BUILDER_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all",
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
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-center text-xs font-semibold text-[#1F4D36]">
                    {option.name}
                  </span>
                  {option.price > 0 && (
                    <span className="text-[10px] text-[#1B1B1B]/50">
                      +{formatPrice(option.price)}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="lg:col-span-3 lg:sticky lg:top-32 lg:self-start">
        <div className="rounded-3xl bg-[#1F4D36] p-6 text-white shadow-xl">
          <h3 className="font-display text-lg font-bold">Tu resumen</h3>
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
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
    </div>
  );
}
