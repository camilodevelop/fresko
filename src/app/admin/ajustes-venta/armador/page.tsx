import { BuilderManager } from "@/components/catalog/BuilderManager";
import { loadIngredients, loadPricingSettings } from "@/lib/catalog-admin";
import { createClient } from "@/lib/supabase/server";
import type { BuilderOptionInput } from "@/app/admin/catalogo/actions";

export default async function ArmadorPage() {
  const supabase = await createClient();
  const [{ data: options }, ingredients, settings] = await Promise.all([
    supabase.from("builder_options").select("id, step, name, emoji, ingredient_id, quantity, price, active").order("sort").order("name"),
    loadIngredients(),
    loadPricingSettings(),
  ]);

  return (
    <BuilderManager
      settings={settings}
      ingredients={ingredients.filter((i) => i.active).map(({ id, name, unit, cost_per_unit, image_url }) => ({ id, name, unit, cost_per_unit, image: image_url }))}
      options={(options ?? []).map((o) => ({
        id: o.id,
        step: o.step as BuilderOptionInput["step"],
        name: o.name,
        emoji: o.emoji,
        ingredientId: o.ingredient_id,
        quantity: Number(o.quantity),
        price: o.price,
        active: o.active,
      }))}
    />
  );
}
