"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { unitFactor, type Unit } from "@/lib/pricing";
import { ALLERGENS, DIETARY_TAGS, type Nutrition } from "@/lib/nutrition";

export type ActionState = { ok?: string; error?: string };

function refreshCatalog() {
  revalidatePath("/admin/catalogo", "layout");
  revalidatePath("/admin/ajustes-venta", "layout");
  revalidatePath("/admin/inventario");
  revalidatePath("/menu");
  revalidatePath("/arma-tu-bowl");
  revalidatePath("/");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export type ProductInput = {
  id?: string;
  name: string;
  categoryId: string;
  kind: "fixed" | "builder";
  description: string;
  tag: string;
  imageUrl: string | null;
  price: number;
  targetMargin: number | null; // 0–1, null = usa el global
  featured: boolean;
  active: boolean;
  recipe: { ingredientId: string; quantity: number }[];
  nutritionMode: "auto" | "manual";
  nutritionManual: Nutrition;
  dietaryTags: string[];
};

const NUTRIENT_KEYS = ["kcal", "protein", "carbs", "fat", "fiber", "weight"] as const;

export async function saveProduct(input: ProductInput): Promise<ActionState> {
  await requirePermission("catalog.manage");

  const name = input.name.trim();
  if (!name) return { error: "Escribe el nombre del producto." };
  if (!input.categoryId) return { error: "Elige la categoría." };
  if (!Number.isInteger(input.price) || input.price < 0) return { error: "El precio debe ser un número entero en pesos." };
  if (input.targetMargin !== null && (input.targetMargin < 0 || input.targetMargin >= 1)) {
    return { error: "El margen debe estar entre 0% y 99%." };
  }
  // Los productos de tipo armador no usan receta, pero no se borra la que tengan:
  // si se vuelven a "Receta fija" la recuperan.
  const recipe = input.recipe.filter((r) => r.ingredientId);
  if (new Set(recipe.map((r) => r.ingredientId)).size !== recipe.length) {
    return { error: "Hay un ingrediente repetido en la receta." };
  }
  if (recipe.some((r) => !(r.quantity > 0))) return { error: "Cada ingrediente necesita una cantidad mayor a 0." };

  if (!["auto", "manual"].includes(input.nutritionMode)) return { error: "Modo de nutrición inválido." };
  const manual: Record<string, number> = {};
  for (const k of NUTRIENT_KEYS) {
    const value = Number(input.nutritionManual?.[k] ?? 0);
    if (!Number.isFinite(value) || value < 0 || value > 10000) return { error: "Revisa los valores nutricionales." };
    manual[k] = Math.round(value * 10) / 10;
  }
  const validTags: string[] = DIETARY_TAGS.map((t) => t.id);
  const dietaryTags = [...new Set(input.dietaryTags)].filter((t) => validTags.includes(t));

  const supabase = await createClient();
  const row = {
    name,
    nutrition_mode: input.nutritionMode,
    nutrition_manual: manual,
    dietary_tags: dietaryTags,
    category_id: input.categoryId,
    kind: input.kind,
    description: input.description.trim(),
    tag: input.tag.trim() || null,
    image_url: input.imageUrl,
    price: input.price,
    target_margin: input.targetMargin,
    featured: input.featured,
    active: input.active,
    updated_at: new Date().toISOString(),
  };

  let productId = input.id;
  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) return { error: error.message };
  } else {
    const base = slugify(name) || "producto";
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${i}`;
    }
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, slug, sort: 100 })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "No se pudo crear el producto." };
    productId = data.id;
  }

  // Receta: ingredientes y empaques (en los productos armables, solo los empaques).
  const { error: delError } = await supabase.from("recipe_items").delete().eq("product_id", productId);
  if (delError) return { error: delError.message };
  if (recipe.length) {
    const { error: recError } = await supabase.from("recipe_items").insert(
      recipe.map((r) => ({ product_id: productId!, ingredient_id: r.ingredientId, quantity: r.quantity }))
    );
    if (recError) return { error: recError.message };
  }

  refreshCatalog();
  return { ok: input.id ? `“${name}” actualizado.` : `“${name}” creado.` };
}

export async function setProductFlag(id: string, flag: "active" | "featured", value: boolean): Promise<ActionState> {
  await requirePermission("catalog.manage");
  if (flag !== "active" && flag !== "featured") return { error: "Campo inválido." };
  const supabase = await createClient();
  const patch = flag === "active" ? { active: value } : { featured: value };
  const { data, error } = await supabase.from("products").update(patch).eq("id", id).select("name").single();
  if (error) return { error: "No se pudo actualizar el producto." };
  refreshCatalog();
  const name = data?.name ?? "Producto";
  if (flag === "active") return { ok: value ? `“${name}” visible en el menú.` : `“${name}” oculto del menú.` };
  return { ok: value ? `“${name}” en Más pedidos.` : `“${name}” fuera de Más pedidos.` };
}

// ---------------------------------------------------------------------------
// Ingredientes
// ---------------------------------------------------------------------------

export type IngredientInput = {
  id?: string;
  name: string;
  categoryId: string;
  unit: Unit;
  costPerDisplayUnit: number; // por kg, L o unidad
  minStockDisplay: number; // en kg, L o unidad
  active: boolean;
  imageUrl: string | null;
  /** Por 100 g / 100 ml, o por unidad. */
  nutrition: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
  allergens: string[];
};

export async function saveIngredient(input: IngredientInput): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const name = input.name.trim();
  if (!name) return { error: "Escribe el nombre del ingrediente." };
  if (!input.categoryId) return { error: "Elige la categoría." };
  if (!["g", "ml", "un"].includes(input.unit)) return { error: "Unidad inválida." };
  if (!(input.costPerDisplayUnit >= 0)) return { error: "El costo no puede ser negativo." };
  if (!(input.minStockDisplay >= 0)) return { error: "El stock mínimo no puede ser negativo." };

  const n = input.nutrition;
  const values = [n.kcal, n.protein, n.carbs, n.fat, n.fiber];
  if (values.some((x) => !Number.isFinite(x) || x < 0 || x > 9999)) return { error: "Revisa los valores nutricionales." };
  if (n.protein + n.carbs + n.fat > 100 && input.unit !== "un") {
    return { error: "Proteína, carbohidratos y grasas no pueden sumar más de 100 g por cada 100." };
  }
  const validAllergens: string[] = ALLERGENS.map((a) => a.id);
  const r1 = (x: number) => Math.round(x * 10) / 10;

  const factor = unitFactor(input.unit);
  const row = {
    image_url: input.imageUrl || null,
    kcal: r1(n.kcal),
    protein: r1(n.protein),
    carbs: r1(n.carbs),
    fat: r1(n.fat),
    fiber: r1(n.fiber),
    allergens: [...new Set(input.allergens)].filter((a) => validAllergens.includes(a)),
    name,
    category_id: input.categoryId,
    unit: input.unit,
    cost_per_unit: Math.round((input.costPerDisplayUnit / factor) * 10000) / 10000,
    min_stock: Math.round(input.minStockDisplay * factor * 100) / 100,
    active: input.active,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  if (input.id) {
    const { data: current } = await supabase.from("ingredients").select("unit").eq("id", input.id).single();
    if (current && current.unit !== input.unit) {
      const { count } = await supabase
        .from("inventory_movements")
        .select("id", { count: "exact", head: true })
        .eq("ingredient_id", input.id);
      if (count) return { error: "No puedes cambiar la unidad de un ingrediente que ya tiene movimientos de inventario." };
    }
  }
  const { error } = input.id
    ? await supabase.from("ingredients").update(row).eq("id", input.id)
    : await supabase.from("ingredients").insert(row);
  if (error) return { error: error.code === "23505" ? "Ya existe un ingrediente con ese nombre." : error.message };

  refreshCatalog();
  return { ok: input.id ? "Ingrediente actualizado." : "Ingrediente creado." };
}

// ---------------------------------------------------------------------------
// Armador
// ---------------------------------------------------------------------------

export type BuilderOptionInput = {
  id?: string;
  step: "base" | "vegetables" | "proteins" | "toppings" | "sauce";
  name: string;
  emoji: string;
  ingredientId: string | null;
  quantity: number;
  price: number;
  active: boolean;
  /** Imagen recortada para el bowl realista. */
  bowlImage: string | null;
};


export async function saveBuilderOption(input: BuilderOptionInput): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const name = input.name.trim();
  if (!name) return { error: "Escribe el nombre de la opción." };
  if (!Number.isInteger(input.price) || input.price < 0) return { error: "El valor extra debe ser un entero en pesos." };
  if (!(input.quantity >= 0)) return { error: "La cantidad no puede ser negativa." };

  const supabase = await createClient();
  const row = {
    step: input.step,
    name,
    emoji: input.emoji.trim() || "🥗",
    ingredient_id: input.ingredientId,
    quantity: input.quantity,
    price: input.price,
    active: input.active,
    bowl_image: input.bowlImage,
  };
  const { error } = input.id
    ? await supabase.from("builder_options").update(row).eq("id", input.id)
    : await supabase.from("builder_options").insert({ ...row, sort: 100 });
  if (error) return { error: error.code === "23505" ? "Ya existe una opción con ese nombre en este paso." : error.message };

  refreshCatalog();
  return { ok: `Opción “${name}” guardada.` };
}

// ---------------------------------------------------------------------------
// Ajustes de precios
// ---------------------------------------------------------------------------

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const margin = Number(String(formData.get("target_margin") ?? "").replace(",", ".")) / 100;
  const rounding = Number(formData.get("price_rounding"));

  if (!(margin >= 0 && margin < 0.95)) return { error: "El margen objetivo debe estar entre 0% y 95%." };
  if (![1, 10, 50, 100, 500, 1000].includes(rounding)) return { error: "Redondeo inválido." };

  const supabase = await createClient();
  for (const [key, value] of Object.entries({ target_margin: margin, price_rounding: rounding })) {
    const { error } = await supabase
      .from("settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) return { error: error.message };
  }
  refreshCatalog();
  return { ok: "Ajustes guardados." };
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export type CategoryInput = {
  id?: string;
  name: string;
  description: string;
  imageUrl: string | null;
  sort: number;
  active: boolean;
};

export async function saveCategory(input: CategoryInput): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const name = input.name.trim();
  if (!name) return { error: "Escribe el nombre de la categoría." };
  if (!Number.isInteger(input.sort)) return { error: "El orden debe ser un número entero." };

  const supabase = await createClient();
  const row = {
    name,
    description: input.description.trim(),
    image_url: input.imageUrl,
    sort: input.sort,
    active: input.active,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("product_categories").update(row).eq("id", input.id);
    if (error) return { error: error.code === "23505" ? "Ya existe una categoría con ese nombre." : error.message };
  } else {
    // El slug se fija al crear (es la URL del menú: /menu?categoria=slug) y no cambia después.
    const base = slugify(name) || "categoria";
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data } = await supabase.from("product_categories").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${i}`;
    }
    const { error } = await supabase.from("product_categories").insert({ ...row, slug });
    if (error) return { error: error.code === "23505" ? "Ya existe una categoría con ese nombre." : error.message };
  }

  refreshCatalog();
  return { ok: input.id ? "Categoría actualizada." : "Categoría creada." };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const supabase = await createClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) return { error: "La categoría tiene productos. Muévelos a otra o desactívala." };
  const { error } = await supabase.from("product_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  refreshCatalog();
  return { ok: "Categoría eliminada." };
}

// ---------------------------------------------------------------------------
// Planes de suscripción
// ---------------------------------------------------------------------------

function refreshPlans() {
  revalidatePath("/admin/ajustes-venta", "layout");
  revalidatePath("/admin/catalogo", "layout");
  revalidatePath("/");
}

export async function savePlanBaseValue(value: number): Promise<ActionState> {
  await requirePermission("catalog.manage");
  if (!Number.isInteger(value) || value <= 0) return { error: "El valor base debe ser un entero en pesos mayor a 0." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", "plan_base_value");
  if (error) return { error: error.message };
  refreshPlans();
  return { ok: "Valor base guardado." };
}

export type PlanInput = {
  id?: string;
  name: string;
  description: string;
  portions: number;
  discount: number; // 0–1
  validityDays: number;
  benefits: string[];
  featured: boolean;
  active: boolean;
  sort: number;
};

export async function savePlan(input: PlanInput): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const name = input.name.trim();
  if (!name) return { error: "Escribe el nombre del plan." };
  if (!Number.isInteger(input.portions) || input.portions < 1 || input.portions > 200) {
    return { error: "Las porciones deben ser un número entre 1 y 200." };
  }
  if (!(input.discount >= 0 && input.discount < 0.9)) return { error: "El descuento debe estar entre 0% y 89%." };
  if (!Number.isInteger(input.validityDays) || input.validityDays < 1 || input.validityDays > 365) {
    return { error: "La vigencia debe estar entre 1 y 365 días." };
  }

  const supabase = await createClient();
  const row = {
    name,
    description: input.description.trim(),
    portions: input.portions,
    discount: Math.round(input.discount * 1000) / 1000,
    validity_days: input.validityDays,
    benefits: input.benefits.map((b) => b.trim()).filter(Boolean).slice(0, 10),
    featured: input.featured,
    active: input.active,
    sort: input.sort,
    updated_at: new Date().toISOString(),
  };

  // Solo un plan destacado a la vez ("Más popular").
  if (input.featured) {
    await supabase.from("subscription_plans").update({ featured: false }).neq("id", input.id ?? "00000000-0000-0000-0000-000000000000");
  }

  if (input.id) {
    const { error } = await supabase.from("subscription_plans").update(row).eq("id", input.id);
    if (error) return { error: error.code === "23505" ? "Ya existe un plan con ese nombre." : error.message };
  } else {
    const base = slugify(name.replace(/^plan\s+/i, "")) || "plan";
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data } = await supabase.from("subscription_plans").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${i}`;
    }
    const { error } = await supabase.from("subscription_plans").insert({ ...row, slug });
    if (error) return { error: error.code === "23505" ? "Ya existe un plan con ese nombre." : error.message };
  }

  refreshPlans();
  return { ok: input.id ? "Plan actualizado." : "Plan creado." };
}

export async function deletePlan(id: string): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const supabase = await createClient();
  // Cuando existan suscripciones (fase 4), un plan vendido se desactiva en vez de borrarse.
  const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
  if (error) return { error: error.code === "23503" ? "El plan ya tiene suscripciones; desactívalo en lugar de borrarlo." : error.message };
  refreshPlans();
  return { ok: "Plan eliminado." };
}

// ---------------------------------------------------------------------------
// Categorías de ingredientes
// ---------------------------------------------------------------------------

export type IngredientCategoryInput = { id?: string; name: string; active: boolean; sort: number };

export async function saveIngredientCategory(input: IngredientCategoryInput): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const name = input.name.trim();
  if (!name) return { error: "Escribe el nombre de la categoría." };
  const supabase = await createClient();
  const row = { name, active: input.active, sort: input.sort };
  if (input.id) {
    const { error } = await supabase.from("ingredient_categories").update(row).eq("id", input.id);
    if (error) return { error: error.code === "23505" ? "Ya existe una categoría con ese nombre." : error.message };
  } else {
    const base = slugify(name) || "categoria";
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data } = await supabase.from("ingredient_categories").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${i}`;
    }
    const { error } = await supabase.from("ingredient_categories").insert({ ...row, slug });
    if (error) return { error: error.code === "23505" ? "Ya existe una categoría con ese nombre." : error.message };
  }
  refreshCatalog();
  return { ok: input.id ? "Categoría actualizada." : "Categoría creada." };
}

export async function deleteIngredientCategory(id: string): Promise<ActionState> {
  await requirePermission("catalog.manage");
  const supabase = await createClient();
  const { count } = await supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) return { error: "La categoría tiene ingredientes. Muévelos a otra o desactívala." };
  const { error } = await supabase.from("ingredient_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  refreshCatalog();
  return { ok: "Categoría eliminada." };
}
