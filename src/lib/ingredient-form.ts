import type { IngredientInput } from "@/app/admin/catalogo/actions";
import type { IngredientRow } from "@/lib/catalog-admin";
import { unitFactor } from "@/lib/pricing";

export const EMPTY_INGREDIENT: IngredientInput = {
  name: "",
  categoryId: "",
  unit: "g",
  costPerDisplayUnit: 0,
  minStockDisplay: 0,
  active: true,
  imageUrl: null,
  nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  allergens: [],
};

/** Fila de la base de datos → valores del formulario (costo por kg/L/unidad). */
export function ingredientToInput(i: IngredientRow): IngredientInput {
  const f = unitFactor(i.unit);
  return {
    id: i.id,
    name: i.name,
    categoryId: i.category,
    unit: i.unit,
    costPerDisplayUnit: Math.round(i.cost_per_unit * f),
    minStockDisplay: i.min_stock / f,
    active: i.active,
    imageUrl: i.image_url,
    nutrition: { ...i.nutrition },
    allergens: [...i.allergens],
  };
}
