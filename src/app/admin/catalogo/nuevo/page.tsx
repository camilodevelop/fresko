import { ProductEditor } from "@/components/catalog/ProductEditor";
import { loadEditorData } from "../editor-data";

export default async function NuevoProductoPage() {
  const { ingredients, settings, categories, ingredientCategories, plans } = await loadEditorData();
  return (
    <ProductEditor
      ingredients={ingredients}
      settings={settings}
      categories={categories}
      ingredientCategories={ingredientCategories}
      plans={plans}
      initial={{
        name: "",
        categoryId: categories.find((c) => c.active)?.id ?? "",
        kind: "fixed",
        description: "",
        tag: "",
        imageUrl: null,
        price: 0,
        targetMargin: null,
        featured: false,
        active: true,
        recipe: [],
      }}
    />
  );
}
