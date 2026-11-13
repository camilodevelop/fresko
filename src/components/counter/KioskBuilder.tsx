"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BowlPreview, usePreloadBowl } from "@/components/bowl-builder/BowlPreview";
import { BUILDER_STEPS, type BuilderOption, type BuilderStep } from "@/lib/data/builder";
import { allergenLabel, formatGrams, sumNutrition } from "@/lib/nutrition";
import { cn, formatPrice } from "@/lib/utils";
import type { BuiltBowl } from "@/components/counter/CounterBuilder";

/** Qué se le pide al cliente en cada paso. */
const STEP_COPY: Record<BuilderStep, { title: string; hint: (max: number) => string }> = {
  base: { title: "¿Sobre qué base?", hint: () => "Elige 1 · obligatorio" },
  vegetables: { title: "Agrega vegetales", hint: (m) => `Hasta ${m} · opcional` },
  proteins: { title: "Elige tu proteína", hint: (m) => `Hasta ${m} · opcional` },
  toppings: { title: "Dale crocancia con toppings", hint: (m) => `Hasta ${m} · opcional` },
  sauce: { title: "Termina con una salsa", hint: () => "Elige 1 · opcional (va aparte)" },
};

const SHORT: Record<BuilderStep, string> = { base: "Base", vegetables: "Vegetales", proteins: "Proteínas", toppings: "Toppings", sauce: "Salsa" };

type Picked = Record<BuilderStep, string[]>;
const EMPTY: Picked = { base: [], vegetables: [], proteins: [], toppings: [], sauce: [] };

/**
 * Armador guiado a pantalla completa para el autoservicio: un paso a la vez, el bowl se arma en vivo,
 * los pasos de una sola opción avanzan solos y al final se revisa todo antes de agregarlo.
 */
export function KioskBuilder({
  name,
  options,
  basePrice,
  onDone,
  onClose,
}: {
  name: string;
  options: Record<BuilderStep, BuilderOption[]>;
  basePrice: number;
  onDone: (bowl: BuiltBowl) => void;
  onClose: () => void;
}) {
  // Paso actual; BUILDER_STEPS.length = revisión final.
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Picked>(EMPTY);
  usePreloadBowl(options);
  const reviewing = index >= BUILDER_STEPS.length;
  const step = BUILDER_STEPS[Math.min(index, BUILDER_STEPS.length - 1)];
  const max = step.max ?? 1;

  const parts = useMemo(() => {
    const out = {} as Record<BuilderStep, BuilderOption[]>;
    for (const s of BUILDER_STEPS) out[s.id] = picked[s.id].map((id) => options[s.id].find((o) => o.id === id)).filter((o): o is BuilderOption => Boolean(o));
    return out;
  }, [picked, options]);
  const selected = BUILDER_STEPS.flatMap((s) => parts[s.id]);
  const price = basePrice + selected.reduce((s, o) => s + o.price, 0);
  const nutrition = sumNutrition(selected.map((o) => o.nutrition));
  const allergens = [...new Set(selected.flatMap((o) => o.allergens))];
  const hasBase = picked.base.length > 0;

  const go = (i: number) => setIndex(Math.max(0, Math.min(BUILDER_STEPS.length, i)));
  const toggle = (id: string) => {
    const list = picked[step.id];
    if (list.includes(id)) {
      setPicked({ ...picked, [step.id]: list.filter((x) => x !== id) });
      return;
    }
    if (max === 1) {
      setPicked({ ...picked, [step.id]: [id] });
      // Una sola opción: pasa solo al siguiente paso.
      setTimeout(() => go(index + 1), 350);
      return;
    }
    if (list.length >= max) return;
    setPicked({ ...picked, [step.id]: [...list, id] });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F7F2]" role="dialog" aria-modal="true" aria-label={name}>
      {/* Encabezado y progreso */}
      <header className="border-b border-[#1F4D36]/[0.07] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-4">
          <p className="font-display text-xl font-bold text-[#1F4D36]">{name}</p>
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#1B1B1B]/55 hover:bg-[#F4F8F2]">
            <X className="h-5 w-5" /> Cancelar
          </button>
        </div>
        <ol className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-4">
          {BUILDER_STEPS.map((s, i) => {
            const done = picked[s.id].length > 0;
            const on = i === index;
            const reachable = i === 0 || hasBase;
            return (
              <li key={s.id} className="min-w-[120px] flex-1">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => go(i)}
                  className={cn(
                    "w-full rounded-2xl border-2 px-3 py-2 text-left transition disabled:opacity-40",
                    on ? "border-[#1F4D36] bg-[#1F4D36] text-white" : done ? "border-[#8BC34A] bg-[#F1F8E9] text-[#1F4D36]" : "border-transparent bg-[#F4F8F2] text-[#1F4D36]"
                  )}
                >
                  <span className={cn("flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider", on ? "text-white/70" : "text-[#7CB342]")}>
                    {done && !on ? <Check className="h-3.5 w-3.5" /> : null}Paso {i + 1}
                  </span>
                  <span className="block truncate text-sm font-semibold">{SHORT[s.id]}</span>
                </button>
              </li>
            );
          })}
          <li className="min-w-[120px] flex-1">
            <button
              type="button"
              disabled={!hasBase}
              onClick={() => go(BUILDER_STEPS.length)}
              className={cn(
                "w-full rounded-2xl border-2 px-3 py-2 text-left transition disabled:opacity-40",
                reviewing ? "border-[#1F4D36] bg-[#1F4D36] text-white" : "border-transparent bg-[#F4F8F2] text-[#1F4D36]"
              )}
            >
              <span className={cn("text-[11px] font-bold uppercase tracking-wider", reviewing ? "text-white/70" : "text-[#7CB342]")}>Listo</span>
              <span className="block text-sm font-semibold">Revisar</span>
            </button>
          </li>
        </ol>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-6 overflow-y-auto px-5 py-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        {/* Bowl en vivo */}
        <aside className="hidden lg:block">
          <div className="sticky top-0 space-y-4">
            <BowlPreview parts={parts} />
            <div className="rounded-3xl bg-white p-4 text-sm shadow-sm">
              <p className="flex items-baseline justify-between">
                <span className="text-[#1B1B1B]/55">Tu bowl</span>
                <span className="font-display text-2xl font-bold text-[#1F4D36]">{formatPrice(price)}</span>
              </p>
              {nutrition.kcal > 0 && (
                <p className="mt-1 text-xs text-[#1B1B1B]/55">
                  {Math.round(nutrition.kcal)} kcal · {formatGrams(nutrition.protein)} proteína · {formatGrams(nutrition.carbs)} carbos · {formatGrams(nutrition.fat)} grasas
                </p>
              )}
            </div>
          </div>
        </aside>

        <AnimatePresence mode="wait">
          {!reviewing ? (
            <m.section key={step.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                {/* En pantallas angostas el bowl en vivo va junto al título. */}
                <div className="mb-4 flex basis-full justify-center lg:hidden">
                  <div className="w-64">
                    <BowlPreview parts={parts} compact />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-3xl font-bold text-[#1F4D36]">{STEP_COPY[step.id].title}</h2>
                  <p className="mt-1 text-base text-[#1B1B1B]/55">{STEP_COPY[step.id].hint(max)}</p>
                </div>
                {max > 1 && (
                  <span className={cn("rounded-full px-4 py-2 text-sm font-bold", picked[step.id].length >= max ? "bg-amber-100 text-amber-900" : "bg-[#E8F3DC] text-[#2E6B1F]")}>
                    {picked[step.id].length} de {max}
                    {picked[step.id].length >= max && " · máximo"}
                  </span>
                )}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {options[step.id].map((o) => {
                  const on = picked[step.id].includes(o.id);
                  const full = !on && max > 1 && picked[step.id].length >= max;
                  return (
                    <m.button
                      key={o.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggle(o.id)}
                      disabled={full}
                      aria-pressed={on}
                      className={cn(
                        "relative flex flex-col items-center rounded-3xl border-[3px] bg-white p-4 text-center shadow-sm transition disabled:opacity-40",
                        on ? "border-[#8BC34A] bg-[#F1F8E9]" : "border-transparent"
                      )}
                    >
                      {on && (
                        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#8BC34A] text-[#1F4D36]">
                          <Check className="h-5 w-5" />
                        </span>
                      )}
                      {o.image ? (
                        <span className="relative h-24 w-24 overflow-hidden rounded-full shadow ring-4 ring-white">
                          <Image src={o.image} alt="" fill sizes="96px" className="object-cover" />
                        </span>
                      ) : (
                        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F4F8F2] text-5xl">{o.emoji}</span>
                      )}
                      <span className="mt-3 font-display text-lg font-bold leading-tight text-[#1F4D36]">{o.name}</span>
                      <span className="mt-1 text-sm text-[#1B1B1B]/55">
                        {[o.price > 0 ? `+${formatPrice(o.price)}` : "Incluido", o.nutrition ? `${Math.round(o.nutrition.kcal)} kcal` : null].filter(Boolean).join(" · ")}
                      </span>
                    </m.button>
                  );
                })}
              </div>
            </m.section>
          ) : (
            <m.section key="review" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <h2 className="font-display text-3xl font-bold text-[#1F4D36]">Así quedó tu bowl</h2>
              <p className="mt-1 text-base text-[#1B1B1B]/55">Revisa y toca un paso para cambiarlo.</p>
              <div className="mx-auto mt-5 max-w-[360px] lg:hidden">
                <BowlPreview parts={parts} />
              </div>
              <ul className="mt-5 space-y-3">
                {BUILDER_STEPS.map((s, i) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => go(i)} className="flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm hover:ring-2 hover:ring-[#8BC34A]">
                      <span className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-[#7CB342]">{SHORT[s.id]}</span>
                      <span className={cn("flex-1 text-base", parts[s.id].length ? "font-semibold text-[#1F4D36]" : "text-[#1B1B1B]/40")}>
                        {parts[s.id].length ? parts[s.id].map((o) => o.name).join(", ") : "Sin elegir"}
                      </span>
                      <Pencil className="h-4 w-4 text-[#1B1B1B]/35" />
                    </button>
                  </li>
                ))}
              </ul>
              {nutrition.kcal > 0 && (
                <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[#1B1B1B]/65">
                  <strong className="text-[#1F4D36]">{Math.round(nutrition.kcal)} kcal</strong> · {formatGrams(nutrition.protein)} proteína · {formatGrams(nutrition.carbs)} carbos · {formatGrams(nutrition.fat)} grasas
                </p>
              )}
              {allergens.length > 0 && <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Contiene: {allergens.map(allergenLabel).join(", ")}</p>}
            </m.section>
          )}
        </AnimatePresence>
      </div>

      {/* Navegación */}
      <footer className="border-t border-[#1F4D36]/10 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-3xl font-bold text-[#1F4D36]">{formatPrice(price)}</p>
            <p className="truncate text-sm text-[#1B1B1B]/55">{selected.map((o) => o.name).join(", ") || "Empieza eligiendo la base"}</p>
          </div>
          <div className="flex shrink-0 gap-3">
            {index > 0 && (
              <Button variant="secondary" size="lg" className="h-14 px-6 text-base" onClick={() => go(index - 1)}>
                <ArrowLeft className="h-5 w-5" /> Atrás
              </Button>
            )}
            {reviewing ? (
              <Button
                variant="fresh"
                size="lg"
                className="h-14 px-8 text-lg"
                onClick={() => onDone({ optionIds: selected.map((o) => o.id), names: selected.map((o) => o.name), price })}
              >
                <Check className="h-5 w-5" /> Agregar a mi pedido
              </Button>
            ) : (
              <Button size="lg" className="h-14 px-8 text-lg" disabled={step.id === "base" && !hasBase} onClick={() => go(index + 1)}>
                {step.id !== "base" && picked[step.id].length === 0 ? "Saltar" : index === BUILDER_STEPS.length - 1 ? "Revisar" : "Siguiente"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
