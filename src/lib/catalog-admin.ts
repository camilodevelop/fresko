import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseSettings, type CategoryPricing, type IngredientCategory, type Unit } from "@/lib/pricing";

export async function loadPricingSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");
  return parseSettings(data);
}

/** Todas las categorías (también las inactivas), en orden. */
export async function loadCategories(): Promise<CategoryPricing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, slug, name, active")
    .order("sort")
    .order("name");
  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    active: c.active,
  }));
}

export type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  portions: number;
  discount: number;
  validity_days: number;
  benefits: string[];
  featured: boolean;
  active: boolean;
  sort: number;
};

export async function loadPlans(): Promise<PlanRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, slug, name, description, portions, discount, validity_days, benefits, featured, active, sort")
    .order("sort")
    .order("portions");
  return (data ?? []).map((p) => ({ ...p, discount: Number(p.discount) }));
}

export async function loadIngredientCategories(): Promise<IngredientCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ingredient_categories")
    .select("id, slug, name, active, sort")
    .order("sort")
    .order("name");
  return data ?? [];
}

export type IngredientRow = {
  id: string;
  name: string;
  /** id de la categoría */
  category: string;
  categoryName: string;
  categorySort: number;
  unit: Unit;
  cost_per_unit: number;
  stock: number;
  min_stock: number;
  active: boolean;
};

export async function loadIngredients(): Promise<IngredientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ingredients")
    .select("id, name, category_id, unit, cost_per_unit, stock, min_stock, active, ingredient_categories(name, sort)")
    .order("name");
  return (data ?? [])
    .map(({ category_id, ingredient_categories, ...i }) => ({
      ...i,
      category: category_id,
      categoryName: ingredient_categories?.name ?? "",
      categorySort: ingredient_categories?.sort ?? 0,
      unit: i.unit as Unit,
    cost_per_unit: Number(i.cost_per_unit),
    stock: Number(i.stock),
      min_stock: Number(i.min_stock),
    }))
    .sort((a, b) => a.categorySort - b.categorySort || a.name.localeCompare(b.name, "es"));
}
