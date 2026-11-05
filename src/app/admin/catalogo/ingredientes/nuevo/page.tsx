import { IngredientEditor } from "@/components/catalog/IngredientEditor";
import { loadIngredientCategories, loadIngredients } from "@/lib/catalog-admin";
import { EMPTY_INGREDIENT } from "@/lib/ingredient-form";

export default async function NuevoIngredientePage() {
  const [ingredients, categories] = await Promise.all([loadIngredients(), loadIngredientCategories()]);
  return (
    <IngredientEditor
      initial={{ ...EMPTY_INGREDIENT, categoryId: categories.find((c) => c.active)?.id ?? "" }}
      categories={categories}
      names={ingredients.map(({ id, name }) => ({ id, name }))}
      stock={null}
      usage={0}
    />
  );
}
