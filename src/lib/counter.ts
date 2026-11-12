import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getBuilderConfig, getMenuItems } from "@/lib/data/catalog";
import type { BuilderOption, BuilderStep } from "@/lib/data/builder";
import type { Nutrition } from "@/lib/nutrition";

/** Producto para vender en mostrador, con el precio de ese canal. */
export type CounterProduct = {
  slug: string;
  name: string;
  price: number;
  image: string;
  category: string;
  categoryName: string;
  builder: boolean;
  description: string;
  tag?: string;
  nutrition: Nutrition | null;
  allergens: string[];
  dietaryTags: string[];
  /** Platos ya preparados en la vitrina de la cocina (vigentes). */
  inStock: number;
};

export type CounterCatalog = {
  products: CounterProduct[];
  /** Opciones del armador (mismas de la web). */
  builderOptions: Record<BuilderStep, BuilderOption[]>;
};

export type PaymentMethod = { id: string; name: string; kind: "efectivo" | "digital"; needsReference: boolean };

export type CashTotals = { method: string; kind: "efectivo" | "digital"; sales: number; refunds: number; net: number; count: number }[];

export type CashSessionView = {
  id: string;
  openedAt: string;
  openingAmount: number;
  totals: CashTotals;
  /** Base + efectivo neto: lo que debería haber en el cajón. */
  expectedCash: number;
};

export type CounterOrder = {
  id: string;
  code: string;
  status: string;
  paymentStatus: string;
  source: "caja" | "autoservicio" | "web";
  total: number;
  customer: string;
  notes: string;
  createdAt: string;
  paidAt: string | null;
  preparedAt: string | null;
  deliveredAt: string | null;
  method: string | null;
  /** true si la cocina ya lo empezó (ya no se puede anular desde caja). */
  inKitchen: boolean;
  items: { name: string; quantity: number; options: string[] }[];
};

/** Catálogo activo con el precio de mostrador (si no hay precio propio, el de la web). */
export async function loadCounterCatalog(channel: "mostrador" | "punto" = "mostrador", kitchenId?: string): Promise<CounterCatalog> {
  const supabase = await createClient();
  const [items, builder, { data: overrides }, { data: ids }, { data: stock }] = await Promise.all([
    getMenuItems(),
    getBuilderConfig(),
    supabase.from("product_channel_prices").select("price, products(slug)").eq("channel", channel),
    supabase.from("products").select("id, slug").eq("active", true),
    kitchenId
      ? supabase.from("dish_stock").select("product_id, quantity").eq("kitchen_id", kitchenId).eq("location", "cocina").gt("expires_at", new Date().toISOString())
      : Promise.resolve({ data: [] as { product_id: string | null; quantity: number | null }[] }),
  ]);
  const idOf = new Map((ids ?? []).map((p) => [p.slug, p.id]));
  const stockOf = (slug: string) => (stock ?? []).filter((x) => x.product_id === idOf.get(slug)).reduce((n, x) => n + (x.quantity ?? 0), 0);
  const priceOf = new Map((overrides ?? []).map((o) => [o.products?.slug ?? "", o.price]));
  const active = new Set((ids ?? []).map((p) => p.slug));
  return {
    products: items
      .filter((i) => active.has(i.id))
      .map((i) => ({
        slug: i.id,
        name: i.name,
        price: priceOf.get(i.id) ?? i.price,
        image: i.image,
        category: i.category,
        categoryName: i.categoryName,
        builder: Boolean(i.builder),
        description: i.ingredients,
        tag: i.tag,
        nutrition: i.nutrition,
        allergens: i.allergens,
        dietaryTags: i.dietaryTags,
        inStock: i.builder ? 0 : stockOf(i.id),
      })),
    builderOptions: builder.options,
  };
}

export async function loadPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("payment_methods").select("id, name, kind, needs_reference").eq("active", true).order("sort").order("name");
  return (data ?? []).map((m) => ({ id: m.id, name: m.name, kind: m.kind as PaymentMethod["kind"], needsReference: m.needs_reference }));
}

/** Caja abierta del usuario en esa cocina, con su resumen por método. */
export async function loadMyCashSession(kitchenId: string, userId: string): Promise<CashSessionView | null> {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("cash_sessions")
    .select("id, opened_at, opening_amount")
    .eq("kitchen_id", kitchenId)
    .eq("user_id", userId)
    .is("closed_at", null)
    .maybeSingle();
  if (!s) return null;
  const { data: totals } = await supabase.rpc("cash_session_totals", { p_session_id: s.id });
  const list = (Array.isArray(totals) ? totals : []) as CashTotals;
  return {
    id: s.id,
    openedAt: s.opened_at,
    openingAmount: s.opening_amount,
    totals: list,
    expectedCash: s.opening_amount + list.filter((t) => t.kind === "efectivo").reduce((sum, t) => sum + t.net, 0),
  };
}

/** ¿Tiene el usuario una caja abierta en otra cocina? (solo puede tener una a la vez). */
export async function openSessionElsewhere(kitchenId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_sessions")
    .select("kitchen_id, kitchens(name)")
    .eq("user_id", userId)
    .is("closed_at", null)
    .neq("kitchen_id", kitchenId)
    .maybeSingle();
  return data ? { kitchenId: data.kitchen_id, name: data.kitchens?.name ?? "otra cocina" } : null;
}

/** Pedidos de mostrador del día en la cocina (por cobrar, en cocina, listos y entregados). */
export async function loadCounterOrders(kitchenId: string, date: string): Promise<CounterOrder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, code, status, payment_status, source, total, contact_name, notes, created_at, paid_at, prepared_at, delivered_at, payments(method_name, status), order_items(name, quantity, options)"
    )
    .eq("kitchen_id", kitchenId)
    .eq("channel", "mostrador")
    .eq("delivery_date", date)
    .order("created_at", { ascending: false });
  return (data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    paymentStatus: o.payment_status,
    source: o.source as CounterOrder["source"],
    total: o.total,
    customer: o.contact_name,
    notes: o.notes,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    preparedAt: o.prepared_at,
    deliveredAt: o.delivered_at,
    method: o.payments.find((p) => p.status === "aprobado")?.method_name ?? null,
    // Al iniciar la primera tanda el pedido pasa a "en preparación".
    inKitchen: o.status === "en_preparacion",
    items: o.order_items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      options: Array.isArray(i.options) ? (i.options as { name: string }[]).map((x) => x.name) : [],
    })),
  }));
}
