import { IngredientCategoriesManager } from "@/components/catalog/IngredientCategoriesManager";
import { IngredientsManager } from "@/components/catalog/IngredientsManager";
import { ViewSwitch } from "@/components/dashboard/ViewSwitch";
import { loadIngredientCategories, loadIngredients } from "@/lib/catalog-admin";
import { createClient } from "@/lib/supabase/server";

export default async function IngredientesPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  const showCategories = vista === "categorias";
  const supabase = await createClient();
  const [ingredients, categories, { data: recipe }, { data: builder }] = await Promise.all([
    loadIngredients(),
    loadIngredientCategories(),
    supabase.from("recipe_items").select("ingredient_id"),
    supabase.from("builder_options").select("ingredient_id"),
  ]);

  const switcher = (
    <ViewSwitch
      items={[
        { href: "/admin/catalogo/ingredientes", label: "Ingredientes", active: !showCategories, count: ingredients.length },
        { href: "/admin/catalogo/ingredientes?vista=categorias", label: "Categorías", active: showCategories, count: categories.length },
      ]}
    />
  );

  if (showCategories) {
    const perCategory: Record<string, number> = {};
    for (const i of ingredients) perCategory[i.category] = (perCategory[i.category] ?? 0) + 1;
    return (
      <>
        {switcher}
        <IngredientCategoriesManager categories={categories.map((c) => ({ ...c, ingredients: perCategory[c.id] ?? 0 }))} />
      </>
    );
  }

  const usage: Record<string, number> = {};
  for (const r of [...(recipe ?? []), ...(builder ?? [])]) {
    if (r.ingredient_id) usage[r.ingredient_id] = (usage[r.ingredient_id] ?? 0) + 1;
  }
  return (
    <>
      {switcher}
      <IngredientsManager ingredients={ingredients} usage={usage} categories={categories} />
    </>
  );
}
