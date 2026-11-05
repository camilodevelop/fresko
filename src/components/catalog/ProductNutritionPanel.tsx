"use client";

import { Calculator, PencilLine, Wand2 } from "lucide-react";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AllergenList, MacroRing } from "@/components/menu/NutritionFacts";
import { DIETARY_TAGS, formatGrams, type Nutrition } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

const FIELDS: { key: keyof Nutrition; label: string; unit: string }[] = [
  { key: "kcal", label: "Calorías", unit: "kcal" },
  { key: "protein", label: "Proteína", unit: "g" },
  { key: "carbs", label: "Carbohidratos", unit: "g" },
  { key: "fat", label: "Grasas", unit: "g" },
  { key: "fiber", label: "Fibra", unit: "g" },
  { key: "weight", label: "Porción", unit: "g" },
];

/** Etiquetas que se deducen de la nutrición y los alérgenos (el admin decide si las usa). */
function suggestTags(n: Nutrition, allergens: string[], current: string[]) {
  const tags = new Set(current);
  const set = (id: string, on: boolean) => (on ? tags.add(id) : tags.delete(id));
  set("alto_proteina", n.protein >= 25);
  set("bajo_calorias", n.kcal > 0 && n.kcal <= 350);
  set("bajo_carbohidratos", n.kcal > 0 && n.carbs <= 15);
  set("sin_gluten", !allergens.includes("gluten"));
  set("sin_lacteos", !allergens.includes("lacteos"));
  return DIETARY_TAGS.map((t) => t.id).filter((id) => tags.has(id));
}

export function ProductNutritionPanel({
  mode,
  auto,
  manual,
  allergens,
  tags,
  isBuilder,
  onChange,
}: {
  mode: "auto" | "manual";
  auto: Nutrition;
  manual: Nutrition;
  allergens: string[];
  tags: string[];
  isBuilder: boolean;
  onChange: (patch: { nutritionMode?: "auto" | "manual"; nutritionManual?: Nutrition; dietaryTags?: string[] }) => void;
}) {
  const shown = mode === "manual" ? manual : auto;
  const empty = shown.kcal <= 0 && shown.protein + shown.carbs + shown.fat <= 0;

  return (
    <Panel
      title="Información nutricional"
      description={
        isBuilder
          ? "En el armador se calcula en vivo con lo que elija el cliente."
          : "Por porción. Se muestra en la ficha del producto en el menú."
      }
    >
      {!isBuilder && (
        <>
          <div className="mb-5 inline-flex rounded-2xl bg-[#F4F8F2] p-1 text-sm font-semibold">
            {(
              [
                { id: "auto", label: "Desde la receta", icon: Calculator },
                { id: "manual", label: "Manual", icon: PencilLine },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() =>
                  onChange(
                    o.id === "manual" && manual.kcal <= 0
                      ? { nutritionMode: "manual", nutritionManual: { ...auto } }
                      : { nutritionMode: o.id }
                  )
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors",
                  mode === o.id ? "bg-white text-[#1F4D36] shadow-sm" : "text-[#1B1B1B]/50 hover:text-[#1F4D36]"
                )}
              >
                <o.icon className="h-3.5 w-3.5" />
                {o.label}
              </button>
            ))}
          </div>

          <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex justify-center">
              {empty ? (
                <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-[14px] border-[#EEF3EA] text-center text-[11px] text-[#1B1B1B]/40">
                  Sin datos
                </div>
              ) : (
                <MacroRing nutrition={shown} />
              )}
            </div>
            {mode === "manual" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FIELDS.map((f) => (
                  <label key={f.key} className="text-xs font-semibold text-[#1B1B1B]/55">
                    {f.label}
                    <span className="relative mt-1 block">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        className="h-10 pr-11"
                        value={manual[f.key] || ""}
                        onChange={(e) => onChange({ nutritionManual: { ...manual, [f.key]: Math.max(0, Number(e.target.value) || 0) } })}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#1B1B1B]/40">{f.unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FIELDS.map((f) => (
                  <div key={f.key} className="rounded-2xl bg-[#F8F7F2] px-3 py-2.5">
                    <dt className="text-[11px] text-[#1B1B1B]/50">{f.label}</dt>
                    <dd className="font-display text-base font-bold text-[#1F4D36]">
                      {f.key === "kcal" ? Math.round(auto.kcal) : auto[f.key] ? formatGrams(auto[f.key]) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {mode === "auto" && (
            <p className="mt-3 text-[11px] leading-snug text-[#1B1B1B]/40">
              Se suma con los valores de cada ingrediente (Catálogo → Ingredientes) y se actualiza solo al cambiar la receta.
            </p>
          )}

          <div className="mt-6">
            <p className="text-xs font-semibold text-[#1B1B1B]/55">Alérgenos (según los ingredientes)</p>
            <div className="mt-2">
              <AllergenList allergens={allergens} />
            </div>
          </div>
        </>
      )}

      <div className={cn(!isBuilder && "mt-6")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[#1B1B1B]/55">Etiquetas de dieta</p>
          {!isBuilder && (
            <Button type="button" size="sm" variant="ghost" disabled={empty} onClick={() => onChange({ dietaryTags: suggestTags(shown, allergens, tags) })}>
              <Wand2 className="h-3.5 w-3.5" /> Sugerir
            </Button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIETARY_TAGS.map((t) => {
            const on = tags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ dietaryTags: on ? tags.filter((x) => x !== t.id) : [...tags, t.id] })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  on ? "border-[#1F4D36] bg-[#1F4D36] text-white" : "border-[#1F4D36]/15 bg-white text-[#1B1B1B]/60 hover:border-[#8BC34A]"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
