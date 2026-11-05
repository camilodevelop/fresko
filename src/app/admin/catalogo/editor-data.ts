import "server-only";
import { loadCategories, loadIngredientCategories, loadIngredients, loadPlans, loadPricingSettings } from "@/lib/catalog-admin";

export async function loadEditorData() {
  const [ingredients, settings, categories, plans, ingredientCategories] = await Promise.all([
    loadIngredients(),
    loadPricingSettings(),
    loadCategories(),
    loadPlans(),
    loadIngredientCategories(),
  ]);
  return {
    settings,
    categories,
    ingredientCategories,
    plans: plans.filter((p) => p.active),
    ingredients: ingredients.map(({ id, name, category, unit, cost_per_unit, active }) => ({
      id,
      name,
      category,
      unit,
      cost_per_unit,
      active,
    })),
  };
}
