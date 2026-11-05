/** Cálculos de precio compartidos entre servidor y cliente. */

export type Unit = "g" | "ml" | "un";

export type PricingSettings = {
  targetMargin: number; // 0.65 = 65% del precio de venta es margen
  rounding: number; // redondeo del precio sugerido
  planBaseValue: number; // valor mínimo que cuenta cada porción de un plan
};

export type CategoryPricing = { id: string; slug: string; name: string; active: boolean };

export const DEFAULT_PRICING: PricingSettings = {
  targetMargin: 0.65,
  rounding: 100,
  planBaseValue: 9900,
};

/** Precio que deja el margen objetivo sobre el costo: costo / (1 − margen), redondeado hacia arriba. */
export function suggestedPrice(cost: number, margin: number, rounding: number) {
  if (cost <= 0 || margin >= 1) return 0;
  const step = Math.max(1, rounding);
  return Math.ceil(cost / (1 - margin) / step) * step;
}

/** Margen real sobre el precio de venta (0–1). */
export function realMargin(price: number, cost: number) {
  if (price <= 0) return 0;
  return (price - cost) / price;
}

// ---------------------------------------------------------------------------
// Planes de suscripción
//   Cada porción cuenta máx(precio del plato, valor base).
//   Total = suma de porciones × (1 − descuento del plan). El descuento aplica sobre todo.
// ---------------------------------------------------------------------------

/** Redondeo de precios de planes al múltiplo de 100 más cercano. */
export function roundPlan(value: number) {
  return Math.round(value / 100) * 100;
}

/** Lo que cuenta un plato dentro de un plan (antes del descuento). */
export function planDishValue(price: number, base: number) {
  return Math.max(price, base);
}

/** Lo que un plato suma por encima del valor base (0 si es igual o más barato). */
export function planExtra(price: number, base: number) {
  return Math.max(0, price - base);
}

/** Precio "desde" de un plan: todas las porciones al valor base, con descuento. */
export function planFromPrice(portions: number, base: number, discount: number) {
  return roundPlan(portions * base * (1 - discount));
}

/** Total de un plan con los platos elegidos (precios de venta). */
export function planTotal(dishPrices: number[], base: number, discount: number) {
  const subtotal = dishPrices.reduce((s, p) => s + planDishValue(p, base), 0);
  return { subtotal, discount: roundPlan(subtotal * discount), total: roundPlan(subtotal * (1 - discount)) };
}

/** Valor base recomendado: el plato de receta fija activo más económico. */
export function recommendedBaseValue(prices: number[]) {
  const valid = prices.filter((p) => p > 0);
  return valid.length ? Math.min(...valid) : 0;
}

/** Unidad de presentación para costos y stock (kg, L, un). */
export function displayUnit(unit: Unit) {
  return unit === "g" ? "kg" : unit === "ml" ? "L" : "un";
}

/** Factor entre unidad base y unidad de presentación. */
export function unitFactor(unit: Unit) {
  return unit === "un" ? 1 : 1000;
}

const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** 1500 g → "1,5 kg"; 300 g → "300 g"; 12 un → "12 un". */
export function formatQty(qty: number, unit: Unit) {
  if (unit !== "un" && Math.abs(qty) >= 1000) return `${numberFormat.format(qty / 1000)} ${displayUnit(unit)}`;
  return `${numberFormat.format(qty)} ${unit}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function parseSettings(rows: { key: string; value: unknown }[] | null): PricingSettings {
  const map = new Map((rows ?? []).map((r) => [r.key, r.value]));
  return {
    targetMargin: Number(map.get("target_margin") ?? DEFAULT_PRICING.targetMargin),
    rounding: Number(map.get("price_rounding") ?? DEFAULT_PRICING.rounding),
    planBaseValue: Number(map.get("plan_base_value") ?? DEFAULT_PRICING.planBaseValue),
  };
}

/** Categoría de ingrediente (editable en Catálogo → Ingredientes → Categorías). */
export type IngredientCategory = { id: string; slug: string; name: string; active: boolean; sort: number };
