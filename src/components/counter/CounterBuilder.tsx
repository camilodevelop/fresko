"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILDER_STEPS, type BuilderOption, type BuilderStep } from "@/lib/data/builder";
import { cn, formatPrice } from "@/lib/utils";

export type BuiltBowl = { optionIds: string[]; names: string[]; price: number };

/** Armador compacto para caja y autoservicio: mismas reglas que la web (una base y los máximos por paso). */
export function CounterBuilder({
  options,
  basePrice,
  onDone,
  big = false,
}: {
  options: Record<BuilderStep, BuilderOption[]>;
  basePrice: number;
  onDone: (bowl: BuiltBowl) => void;
  /** Botones grandes para pantalla táctil (autoservicio). */
  big?: boolean;
}) {
  const [step, setStep] = useState<BuilderStep>("base");
  const [picked, setPicked] = useState<Record<BuilderStep, string[]>>({ base: [], vegetables: [], proteins: [], toppings: [], sauce: [] });

  const selected = useMemo(
    () => BUILDER_STEPS.flatMap((s) => picked[s.id].map((id) => options[s.id].find((o) => o.id === id)).filter((o): o is BuilderOption => Boolean(o))),
    [picked, options]
  );
  const price = basePrice + selected.reduce((s, o) => s + o.price, 0);
  const current = BUILDER_STEPS.find((s) => s.id === step)!;
  const stepIndex = BUILDER_STEPS.findIndex((s) => s.id === step);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const list = prev[step];
      const max = current.max ?? 1;
      if (list.includes(id)) return { ...prev, [step]: list.filter((x) => x !== id) };
      if (max === 1) return { ...prev, [step]: [id] };
      if (list.length >= max) return prev;
      return { ...prev, [step]: [...list, id] };
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {BUILDER_STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition",
              big && "px-5 py-3 text-sm",
              step === s.id ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36] hover:bg-[#E8F3DC]"
            )}
          >
            {s.label}
            {picked[s.id].length > 0 && <span className="ml-1.5 opacity-70">· {picked[s.id].length}</span>}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#1B1B1B]/55">
        {step === "base" ? "Elige 1 base (obligatoria)." : `Hasta ${current.max} — opcional.`}
      </p>
      <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", big && "gap-3 md:grid-cols-4")}>
        {options[step].map((o) => {
          const on = picked[step].includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              aria-pressed={on}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition",
                big && "p-4",
                on ? "border-[#8BC34A] bg-[#C5E1A5]/30" : "border-transparent bg-[#F8F7F2] hover:border-[#1F4D36]/15"
              )}
            >
              {on && <Check className="absolute right-2 top-2 h-4 w-4 text-[#558B2F]" />}
              {o.image ? (
                <span className={cn("relative h-11 w-11 overflow-hidden rounded-full", big && "h-16 w-16")}>
                  <Image src={o.image} alt="" fill sizes="64px" className="object-cover" />
                </span>
              ) : (
                <span className={cn("text-2xl", big && "text-4xl")}>{o.emoji}</span>
              )}
              <span className={cn("text-xs font-semibold text-[#1F4D36]", big && "text-sm")}>{o.name}</span>
              {o.price > 0 && <span className="text-[11px] text-[#1B1B1B]/50">+{formatPrice(o.price)}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1F4D36]/[0.07] pt-4">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-[#1F4D36]">{formatPrice(price)}</p>
          <p className="truncate text-xs text-[#1B1B1B]/55">{selected.map((o) => o.name).join(", ") || "Sin ingredientes aún"}</p>
        </div>
        <div className="flex gap-2">
          {stepIndex < BUILDER_STEPS.length - 1 && (
            <Button type="button" variant="secondary" size={big ? "lg" : "default"} onClick={() => setStep(BUILDER_STEPS[stepIndex + 1].id)}>
              Siguiente
            </Button>
          )}
          <Button
            type="button"
            variant="fresh"
            size={big ? "lg" : "default"}
            disabled={picked.base.length === 0}
            onClick={() => onDone({ optionIds: selected.map((o) => o.id), names: selected.map((o) => o.name), price })}
          >
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
