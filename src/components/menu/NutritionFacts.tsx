import { Scale, Wheat } from "lucide-react";
import { allergenLabel, ALLERGENS, formatGrams, macroSplit, type Nutrition } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

const MACROS = [
  { key: "protein", label: "Proteína", color: "#1F4D36", soft: "bg-[#1F4D36]" },
  { key: "carbs", label: "Carbohidratos", color: "#8BC34A", soft: "bg-[#8BC34A]" },
  { key: "fat", label: "Grasas", color: "#F2B84B", soft: "bg-[#F2B84B]" },
] as const;

/** Anillo con la proporción de calorías de cada macro y las kcal en el centro. */
export function MacroRing({ nutrition, size = 132, className }: { nutrition: Nutrition; size?: number; className?: string }) {
  const split = macroSplit(nutrition);
  const stroke = size * 0.11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = split.protein && split.carbs && split.fat ? 0.012 : 0;
  const segments = MACROS.map((m, i) => ({
    ...m,
    part: split[m.key],
    start: MACROS.slice(0, i).reduce((sum, prev) => sum + split[prev.key], 0),
  })).filter((m) => m.part > 0);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF3EA" strokeWidth={stroke} />
        {segments.map((m) => (
          <circle
            key={m.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={m.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, m.part - gap) * c} ${c}`}
            strokeDashoffset={-m.start * c}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold leading-none text-[#1F4D36]" style={{ fontSize: Math.round(size * 0.23) }}>
          {Math.round(nutrition.kcal)}
        </span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#1B1B1B]/45">kcal</span>
      </div>
    </div>
  );
}

/** Tabla nutricional corta: anillo de macros, gramos por macro, fibra y peso. */
export function NutritionFacts({ nutrition, className }: { nutrition: Nutrition; className?: string }) {
  const split = macroSplit(nutrition);
  return (
    <div className={cn("rounded-3xl border border-[#1F4D36]/10 bg-[#F8FAF5] p-4 sm:p-5", className)}>
      <div className="flex items-center gap-4 sm:gap-5">
        <MacroRing nutrition={nutrition} size={112} className="sm:hidden" />
        <MacroRing nutrition={nutrition} className="hidden sm:block" />
        <ul className="min-w-0 flex-1 space-y-3">
          {MACROS.map((m) => (
            <li key={m.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 truncate font-medium text-[#1B1B1B]/70">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", m.soft)} />
                  {m.label}
                </span>
                <span className="shrink-0 font-display font-bold text-[#1F4D36]">{formatGrams(nutrition[m.key])}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E6ECE1]">
                <div className={cn("h-full rounded-full", m.soft)} style={{ width: `${Math.round(split[m.key] * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-center">
        <Fact icon={<Wheat className="h-4 w-4" />} label="Fibra" value={formatGrams(nutrition.fiber)} />
        <Fact icon={<Scale className="h-4 w-4" />} label="Porción" value={nutrition.weight ? formatGrams(nutrition.weight) : "—"} />
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-[#1B1B1B]/40">
        Valores aproximados por porción, calculados con tablas de referencia. Pueden variar según el tamaño de los ingredientes.
      </p>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-2 py-3 shadow-sm shadow-[#1F4D36]/5">
      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF5E6] text-[#1F4D36]">{icon}</span>
      <p className="mt-1.5 font-display text-base font-bold text-[#1F4D36]">{value}</p>
      <p className="text-[11px] text-[#1B1B1B]/45">{label}</p>
    </div>
  );
}

export function AllergenList({ allergens }: { allergens: string[] }) {
  if (allergens.length === 0) {
    return <p className="text-sm text-[#1B1B1B]/55">No contiene los alérgenos principales.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {allergens.map((a) => (
        <li key={a} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <span aria-hidden>{ALLERGENS.find((x) => x.id === a)?.emoji}</span>
          {allergenLabel(a)}
        </li>
      ))}
    </ul>
  );
}
