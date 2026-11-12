import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseConfigured } from "@/lib/supabase/env";
import { planFromPrice } from "@/lib/pricing";
import { effectiveNutrition, parseNutrition } from "@/lib/nutrition";
import type { BuilderOption, BuilderStep } from "./builder";
import type { MenuCategory, MenuItem } from "./products";

import { FALLBACK_PRODUCT_IMAGE as FALLBACK_IMAGE } from "@/lib/product-image";

/** Cliente público sin cookies: lectura de catálogo activo sin volver dinámica la página. */
function publicClient() {
  return createSupabase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Categorías activas que tienen al menos un producto visible. */
export async function getCategories(): Promise<MenuCategory[]> {
  if (!supabaseConfigured) return [];
  const { data } = await publicClient()
    .from("product_categories")
    .select("slug, name, description, image_url, products!inner(id)")
    .eq("active", true)
    .eq("products.active", true)
    .order("sort")
    .order("name");
  return (data ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    image: c.image_url || FALLBACK_IMAGE,
  }));
}

export async function getMenuItems(opts: { featuredOnly?: boolean } = {}): Promise<MenuItem[]> {
  if (!supabaseConfigured) return [];
  let query = publicClient()
    .from("products")
    .select(
      "slug, name, description, price, image_url, tag, kind, sort, nutrition_mode, nutrition, nutrition_manual, allergens, dietary_tags, product_categories!inner(slug, name, sort, active)"
    )
    .eq("active", true)
    .eq("product_categories.active", true)
    .order("sort")
    .order("name");
  if (opts.featuredOnly) query = query.eq("featured", true);
  const { data } = await query;
  return (data ?? [])
    .sort((a, b) => a.product_categories.sort - b.product_categories.sort || a.sort - b.sort)
    .map((p) => ({
      id: p.slug,
      name: p.name,
      ingredients: p.description,
      price: p.price,
      image: p.image_url || FALLBACK_IMAGE,
      category: p.product_categories.slug,
      categoryName: p.product_categories.name,
      tag: p.tag ?? undefined,
      builder: p.kind === "builder",
      nutrition: p.kind === "builder" ? null : effectiveNutrition(p.nutrition_mode, p.nutrition, p.nutrition_manual),
      allergens: p.allergens,
      dietaryTags: p.dietary_tags,
    }));
}

export type BuilderProduct = { slug: string; name: string; price: number; categoryName: string };

export type BuilderConfig = {
  /** Producto "Arma tu…" elegido: su precio es la base. */
  product: BuilderProduct | null;
  /** Todos los productos de tipo armador (para cambiar entre "Arma tu bowl / ensalada / …"). */
  products: BuilderProduct[];
  options: Record<BuilderStep, BuilderOption[]>;
};

export async function getBuilderConfig(slug?: string): Promise<BuilderConfig> {
  const options: BuilderConfig["options"] = { base: [], vegetables: [], proteins: [], toppings: [], sauce: [] };
  if (!supabaseConfigured) return { product: null, products: [], options };

  const supabase = publicClient();
  const [{ data: rows }, { data: builders }] = await Promise.all([
    supabase.from("builder_options").select("id, step, name, emoji, price, nutrition, allergens, image_url").eq("active", true).order("sort"),
    supabase
      .from("products")
      .select("slug, name, price, sort, product_categories!inner(name, sort, active)")
      .eq("kind", "builder")
      .eq("active", true)
      .eq("product_categories.active", true),
  ]);

  for (const o of rows ?? []) {
    options[o.step as BuilderStep].push({
      id: o.id,
      name: o.name,
      emoji: o.emoji,
      price: o.price,
      image: o.image_url,
      nutrition: parseNutrition(o.nutrition),
      allergens: o.allergens,
    });
  }
  const products = (builders ?? [])
    .sort((a, b) => a.product_categories.sort - b.product_categories.sort || a.sort - b.sort)
    .map((b) => ({ slug: b.slug, name: b.name, price: b.price, categoryName: b.product_categories.name }));
  // Por defecto "Arma tu bowl", para que el enlace /arma-tu-bowl siga igual.
  const product = products.find((p) => p.slug === slug) ?? products.find((p) => p.slug === "arma-tu-bowl") ?? products[0] ?? null;
  return { product, products, options };
}

export type PublicPlan = {
  slug: string;
  name: string;
  description: string;
  portions: number;
  discount: number;
  validityDays: number;
  benefits: string[];
  featured: boolean;
  fromPrice: number;
};

/** Planes activos con su precio "desde" (porciones × valor base − descuento). */
export async function getPlans(): Promise<{ plans: PublicPlan[]; baseValue: number }> {
  if (!supabaseConfigured) return { plans: [], baseValue: 0 };
  const supabase = publicClient();
  const [{ data: rows }, { data: setting }] = await Promise.all([
    supabase
      .from("subscription_plans")
      .select("slug, name, description, portions, discount, validity_days, benefits, featured, sort")
      .eq("active", true)
      .order("sort")
      .order("portions"),
    supabase.from("settings").select("value").eq("key", "plan_base_value").maybeSingle(),
  ]);
  const baseValue = Number(setting?.value ?? 0);
  return {
    baseValue,
    plans: (rows ?? []).map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      portions: p.portions,
      discount: Number(p.discount),
      validityDays: p.validity_days,
      benefits: p.benefits,
      featured: p.featured,
      fromPrice: planFromPrice(p.portions, baseValue, Number(p.discount)),
    })),
  };
}

export type PublicPointMenu = {
  name: string;
  address: string;
  schedule: string;
  /** Hay una carga recibida y sin cerrar (el vendedor está vendiendo). */
  selling: boolean;
  items: (MenuItem & { available: number })[];
};

/** Página pública del QR de un punto: sus platos (con el precio del punto) y cuántos hay hoy. */
export async function getPublicPointMenu(code: string): Promise<PublicPointMenu | null> {
  if (!supabaseConfigured || !/^[a-z0-9]{6,16}$/i.test(code)) return null;
  const supabase = publicClient();
  const [{ data }, items, { data: prices }] = await Promise.all([
    supabase.rpc("public_point_menu", { p_code: code }),
    getMenuItems(),
    supabase.from("product_channel_prices").select("price, products(slug)").eq("channel", "punto"),
  ]);
  const menu = data as { name: string; address: string; schedule: string; selling: boolean; items: { slug: string; available: number }[] } | null;
  if (!menu) return null;
  const priceOf = new Map((prices ?? []).map((p) => [p.products?.slug ?? "", p.price]));
  return {
    name: menu.name,
    address: menu.address,
    schedule: menu.schedule,
    selling: menu.selling,
    items: menu.items.flatMap((x) => {
      const item = items.find((i) => i.id === x.slug);
      return item ? [{ ...item, price: priceOf.get(item.id) ?? item.price, available: x.available }] : [];
    }),
  };
}
