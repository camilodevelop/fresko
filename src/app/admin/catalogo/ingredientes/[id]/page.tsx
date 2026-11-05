import { notFound } from "next/navigation";
import { IngredientEditor } from "@/components/catalog/IngredientEditor";
import { loadIngredientCategories, loadIngredients } from "@/lib/catalog-admin";
import { ingredientToInput } from "@/lib/ingredient-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditarIngredientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [ingredients, categories, { count: recipes }, { count: options }] = await Promise.all([
    loadIngredients(),
    loadIngredientCategories(),
    supabase.from("recipe_items").select("product_id", { count: "exact", head: true }).eq("ingredient_id", id),
    supabase.from("builder_options").select("id", { count: "exact", head: true }).eq("ingredient_id", id),
  ]);
  const ingredient = ingredients.find((i) => i.id === id);
  if (!ingredient) notFound();

  return (
    <IngredientEditor
      initial={ingredientToInput(ingredient)}
      categories={categories}
      names={ingredients.map(({ id, name }) => ({ id, name }))}
      stock={{ stock: ingredient.stock, minStock: ingredient.min_stock, unit: ingredient.unit }}
      usage={(recipes ?? 0) + (options ?? 0)}
    />
  );
}
