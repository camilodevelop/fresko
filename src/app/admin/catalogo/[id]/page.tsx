import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/catalog/ProductEditor";
import { createClient } from "@/lib/supabase/server";
import { loadEditorData } from "../editor-data";

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: product }, { ingredients, settings, categories, ingredientCategories, plans }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category_id, kind, description, tag, image_url, price, target_margin, featured, active, recipe_items(ingredient_id, quantity)")
      .eq("id", id)
      .maybeSingle(),
    loadEditorData(),
  ]);
  if (!product) notFound();

  return (
    <ProductEditor
      ingredients={ingredients}
      settings={settings}
      categories={categories}
      ingredientCategories={ingredientCategories}
      plans={plans}
      initial={{
        id: product.id,
        name: product.name,
        categoryId: product.category_id,
        kind: product.kind as "fixed" | "builder",
        description: product.description,
        tag: product.tag ?? "",
        imageUrl: product.image_url,
        price: product.price,
        targetMargin: product.target_margin !== null ? Number(product.target_margin) : null,
        featured: product.featured,
        active: product.active,
        recipe: product.recipe_items.map((r) => ({ ingredientId: r.ingredient_id, quantity: Number(r.quantity) })),
      }}
    />
  );
}
