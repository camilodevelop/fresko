/** Información nutricional por porción (valores aproximados). */
export type Nutrition = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Peso aproximado de la porción en gramos (0 = desconocido). */
  weight: number;
};

export const EMPTY_NUTRITION: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, weight: 0 };

export const ALLERGENS = [
  { id: "gluten", label: "Gluten", emoji: "🌾" },
  { id: "lacteos", label: "Lácteos", emoji: "🥛" },
  { id: "huevo", label: "Huevo", emoji: "🥚" },
  { id: "pescado", label: "Pescado", emoji: "🐟" },
  { id: "mariscos", label: "Mariscos", emoji: "🦐" },
  { id: "frutos_secos", label: "Frutos secos", emoji: "🌰" },
  { id: "mani", label: "Maní", emoji: "🥜" },
  { id: "soya", label: "Soya", emoji: "🫘" },
  { id: "sesamo", label: "Sésamo", emoji: "⚪" },
] as const;

export type Allergen = (typeof ALLERGENS)[number]["id"];

export const DIETARY_TAGS = [
  { id: "vegetariano", label: "Vegetariano" },
  { id: "vegano", label: "Vegano" },
  { id: "sin_gluten", label: "Sin gluten" },
  { id: "sin_lacteos", label: "Sin lácteos" },
  { id: "alto_proteina", label: "Alto en proteína" },
  { id: "bajo_carbohidratos", label: "Bajo en carbohidratos" },
  { id: "keto", label: "Keto" },
  { id: "bajo_calorias", label: "Bajo en calorías" },
] as const;

export type DietaryTag = (typeof DIETARY_TAGS)[number]["id"];

export const allergenLabel = (id: string) => ALLERGENS.find((a) => a.id === id)?.label ?? id;
export const dietaryLabel = (id: string) => DIETARY_TAGS.find((t) => t.id === id)?.label ?? id;

/** Convierte el jsonb de la base de datos en Nutrition (tolerante a campos faltantes). */
export function parseNutrition(value: unknown): Nutrition | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const n = (k: keyof Nutrition) => {
    const x = Number(v[k]);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  const result: Nutrition = { kcal: n("kcal"), protein: n("protein"), carbs: n("carbs"), fat: n("fat"), fiber: n("fiber"), weight: n("weight") };
  return result.kcal > 0 || result.protein + result.carbs + result.fat > 0 ? result : null;
}

/** Nutrición que se muestra: manual si el producto lo pide, si no la calculada. */
export function effectiveNutrition(mode: string, auto: unknown, manual: unknown): Nutrition | null {
  return mode === "manual" ? parseNutrition(manual) : parseNutrition(auto);
}

/** Suma la nutrición de varias opciones (armador). */
export function sumNutrition(items: (Nutrition | null | undefined)[]): Nutrition {
  const total = { ...EMPTY_NUTRITION };
  for (const item of items) {
    if (!item) continue;
    for (const k of Object.keys(total) as (keyof Nutrition)[]) total[k] += item[k];
  }
  return total;
}

/** Calorías aportadas por cada macro (4/4/9 kcal por gramo) en porcentaje. */
export function macroSplit(n: Nutrition) {
  const p = n.protein * 4;
  const c = n.carbs * 4;
  const f = n.fat * 9;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: p / total, carbs: c / total, fat: f / total };
}

export const formatGrams = (g: number) => `${g >= 10 ? Math.round(g) : Math.round(g * 10) / 10} g`.replace(".", ",");
