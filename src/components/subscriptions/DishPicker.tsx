"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { BowlPreview } from "@/components/bowl-builder/BowlPreview";
import { Button } from "@/components/ui/button";
import { BUILDER_STEPS, type BuilderOption, type BuilderStep } from "@/lib/data/builder";
import type { MenuItem } from "@/lib/data/products";
import { isCutoutImage } from "@/lib/product-image";
import { roundPlan } from "@/lib/pricing";
import type { PlanDish, PlanTerms } from "@/lib/subscriptions";
import { cn, formatPrice } from "@/lib/utils";

export type BuilderSetup = { slug: string; name: string; price: number; options: Record<BuilderStep, BuilderOption[]> } | null;

/** "Incluido" si el plato no supera el valor base; si no, lo que suma con el descuento del plan. */
export function PlanPriceTag({ price, terms, className }: { price: number; terms: PlanTerms; className?: string }) {
  const extra = roundPlan(Math.max(0, price - terms.baseValue) * (1 - terms.discount));
  return extra > 0 ? (
    <span className={cn("text-[11px] font-semibold text-amber-700", className)}>+{formatPrice(extra)}</span>
  ) : (
    <span className={cn("text-[11px] font-semibold text-[#2E6B1F]", className)}>Incluido</span>
  );
}

const newKey = () => Math.random().toString(36).slice(2, 10);

/** Menú para elegir platos del plan. "Arma tu bowl" abre el armador compacto. */
export function DishPicker({
  products,
  builder,
  terms,
  onPick,
  remaining,
}: {
  products: MenuItem[];
  builder: BuilderSetup;
  terms: PlanTerms;
  onPick: (dish: PlanDish) => void;
  /** Porciones que aún se pueden agregar. */
  remaining: number;
}) {
  const [building, setBuilding] = useState(false);
  const fixed = products.filter((p) => !p.builder);

  if (building && builder) {
    return (
      <CompactBuilder
        builder={builder}
        terms={terms}
        onCancel={() => setBuilding(false)}
        onDone={(dish) => {
          onPick(dish);
          setBuilding(false);
        }}
      />
    );
  }

  const disabled = remaining <= 0;
  return (
    <div>
      {disabled && (
        <p className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Ya usaste todos los platos de tu plan.</p>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {builder && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setBuilding(true)}
            className="group flex flex-col overflow-hidden rounded-2xl border-2 border-dashed border-[#8BC34A]/60 bg-[#F4F8F2] text-left transition hover:border-[#8BC34A] disabled:opacity-40"
          >
            <span className="flex aspect-[4/3] items-center justify-center text-[#1F4D36]">
              <Sparkles className="h-7 w-7" />
            </span>
            <span className="px-3 pb-3">
              <span className="block text-sm font-semibold leading-tight text-[#1F4D36]">{builder.name}</span>
              <span className="text-[11px] text-[#1B1B1B]/50">Elige tus ingredientes</span>
            </span>
          </button>
        )}
        {fixed.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick({ key: newKey(), slug: p.id, name: p.name, image: p.image, price: p.price, quantity: 1 })}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[#1F4D36]/10 bg-white text-left transition hover:border-[#8BC34A] hover:shadow-md disabled:opacity-40"
          >
            <span className="relative block aspect-[4/3] bg-[#F4F8F2]">
              <Image src={p.image} alt="" fill sizes="(max-width: 640px) 45vw, 200px" className={isCutoutImage(p.image) ? "object-contain p-2" : "object-cover"} />
              <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#1F4D36] shadow-sm transition group-hover:bg-[#1F4D36] group-hover:text-white">
                <Plus className="h-4 w-4" />
              </span>
            </span>
            <span className="flex flex-1 flex-col px-3 py-2.5">
              <span className="text-sm font-semibold leading-tight text-[#1F4D36]">{p.name}</span>
              <span className="mt-auto flex items-center justify-between gap-1 pt-1 text-[11px] text-[#1B1B1B]/45">
                {p.nutrition ? `${Math.round(p.nutrition.kcal)} kcal` : p.categoryName}
                <PlanPriceTag price={p.price} terms={terms} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Armador en una sola columna para usar dentro del panel del plan. */
function CompactBuilder({
  builder,
  terms,
  onDone,
  onCancel,
}: {
  builder: NonNullable<BuilderSetup>;
  terms: PlanTerms;
  onDone: (dish: PlanDish) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<Record<BuilderStep, string[]>>({ base: [], vegetables: [], proteins: [], toppings: [], sauce: [] });

  const parts = useMemo(() => {
    const out = {} as Record<BuilderStep, BuilderOption[]>;
    for (const s of BUILDER_STEPS) out[s.id] = picked[s.id].map((id) => builder.options[s.id].find((o) => o.id === id)).filter((o): o is BuilderOption => Boolean(o));
    return out;
  }, [picked, builder.options]);
  const chosen = BUILDER_STEPS.flatMap((s) => parts[s.id]);
  const price = builder.price + chosen.reduce((s, o) => s + o.price, 0);

  const toggle = (step: BuilderStep, id: string, max: number) =>
    setPicked((prev) => {
      const cur = prev[step];
      if (cur.includes(id)) return { ...prev, [step]: cur.filter((x) => x !== id) };
      if (max === 1) return { ...prev, [step]: [id] };
      return cur.length >= max ? prev : { ...prev, [step]: [...cur, id] };
    });

  return (
    <div>
      <div className="mx-auto w-full max-w-[220px]">
        <BowlPreview parts={parts} />
      </div>
      <div className="mt-6 space-y-5">
        {BUILDER_STEPS.map((step) => {
          const max = step.max ?? 1;
          return (
            <section key={step.id}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">
                {step.label} <span className="font-medium normal-case tracking-normal">· máx. {max}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {builder.options[step.id].map((o) => {
                  const on = picked[step.id].includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(step.id, o.id, max)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition",
                        on ? "border-[#8BC34A] bg-[#E8F3DC] text-[#1F4D36]" : "border-[#1F4D36]/12 bg-white text-[#1B1B1B]/70 hover:border-[#8BC34A]"
                      )}
                    >
                      <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#F4F8F2] text-sm">
                        {o.image ? <Image src={o.image} alt="" fill sizes="28px" className="object-cover" /> : o.emoji}
                        {on && (
                          <span className="absolute inset-0 flex items-center justify-center bg-[#1F4D36]/55 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                      {o.name}
                      {o.price > 0 && <span className="font-medium text-[#1B1B1B]/40">+{formatPrice(o.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[#F8F7F2] px-4 py-3">
        <div>
          <p className="font-display text-lg font-bold text-[#1F4D36]">{formatPrice(price)}</p>
          <PlanPriceTag price={price} terms={terms} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Volver
          </Button>
          <Button
            type="button"
            disabled={parts.base.length === 0}
            onClick={() =>
              onDone({
                key: newKey(),
                slug: builder.slug,
                name: builder.name,
                image: chosen.find((o) => o.image)?.image ?? "/images/bowl.png",
                price,
                quantity: 1,
                options: chosen.map((o) => o.id),
                details: chosen.map((o) => o.name).join(", "),
              })
            }
          >
            {parts.base.length === 0 ? "Elige una base" : "Agregar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
