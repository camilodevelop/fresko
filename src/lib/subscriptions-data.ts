import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/product-image";
import { subscriptionState, todayBogota, type PlanDish } from "@/lib/subscriptions";

export type SubscriptionSummary = {
  id: string;
  code: string;
  planName: string;
  portions: number;
  discount: number;
  baseValue: number;
  validityDays: number;
  /** pendiente_pago | activa | vencida | cancelada */
  state: string;
  total: number;
  startsOn: string;
  expiresOn: string;
  createdAt: string;
  used: number;
  delivered: number;
  nextDelivery: { date: string; slot: string } | null;
};

export type SubscriptionDelivery = {
  orderId: string;
  code: string;
  date: string;
  slotId: string;
  slotLabel: string;
  addressId: string | null;
  addressLabel: string;
  notes: string;
  status: string;
  dishes: (PlanDish & { planValue: number })[];
};

const SUMMARY_SELECT =
  "id, code, plan_name, portions, discount, base_value, validity_days, status, total, starts_on, expires_on, created_at, orders(id, status, delivery_date, slot_label, order_items(quantity))";

type SummaryRow = {
  id: string;
  code: string;
  plan_name: string;
  portions: number;
  discount: number | string;
  base_value: number;
  validity_days: number;
  status: string;
  total: number;
  starts_on: string;
  expires_on: string;
  created_at: string;
  orders: { id: string; status: string; delivery_date: string; slot_label: string; order_items: { quantity: number }[] }[];
};

function toSummary(s: SummaryRow, today: string): SubscriptionSummary {
  const live = s.orders.filter((o) => o.status !== "cancelado");
  const qty = (o: SummaryRow["orders"][number]) => o.order_items.reduce((x, i) => x + i.quantity, 0);
  const next = live
    .filter((o) => o.delivery_date >= today && o.status !== "entregado")
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))[0];
  return {
    id: s.id,
    code: s.code,
    planName: s.plan_name,
    portions: s.portions,
    discount: Number(s.discount),
    baseValue: s.base_value,
    validityDays: s.validity_days,
    state: subscriptionState(s.status, s.expires_on, today),
    total: s.total,
    startsOn: s.starts_on,
    expiresOn: s.expires_on,
    createdAt: s.created_at,
    used: live.reduce((x, o) => x + qty(o), 0),
    delivered: live.filter((o) => o.status === "entregado").reduce((x, o) => x + qty(o), 0),
    nextDelivery: next ? { date: next.delivery_date, slot: next.slot_label } : null,
  };
}

export async function loadMySubscriptions(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("subscriptions").select(SUMMARY_SELECT).eq("user_id", userId).neq("status", "cancelada").order("created_at", { ascending: false });
  const today = todayBogota();
  return ((data ?? []) as SummaryRow[]).map((s) => toSummary(s, today));
}

/** Detalle con sus entregas. Si `userId` va, solo devuelve la suscripción si es de esa persona. */
export async function loadSubscriptionDetail(code: string, userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("subscriptions")
    .select(
      "id, code, plan_name, portions, discount, base_value, validity_days, status, total, starts_on, expires_on, created_at, user_id, profiles(full_name, email, phone), subscription_payments(kind, amount, status, created_at), orders(id, code, status, delivery_date, slot_id, slot_label, address_id, address_snapshot, notes, order_items(id, name, quantity, plan_value, options, products(slug, image_url)))"
    )
    .eq("code", code);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  const row = data as unknown as Omit<SummaryRow, "orders"> & {
    user_id: string;
    profiles: { full_name: string; email: string; phone: string | null } | null;
    subscription_payments: { kind: string; amount: number; status: string; created_at: string }[];
    orders: {
      id: string;
      status: string;
      delivery_date: string;
      slot_label: string;
      code: string;
      slot_id: string;
      address_id: string | null;
      address_snapshot: { label?: string; address?: string };
      notes: string;
      order_items: {
        id: string;
        name: string;
        quantity: number;
        plan_value: number | null;
        options: { id: string; name: string }[];
        products: { slug: string; image_url: string | null } | null;
      }[];
    }[];
  };
  const summary = toSummary(row, todayBogota());
  const deliveries: SubscriptionDelivery[] = row.orders
    .filter((o) => o.status !== "cancelado")
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
    .map((o) => ({
      orderId: o.id,
      code: o.code,
      date: o.delivery_date,
      slotId: o.slot_id,
      slotLabel: o.slot_label,
      addressId: o.address_id,
      addressLabel: o.address_snapshot?.label ?? "",
      notes: o.notes,
      status: o.status,
      dishes: o.order_items.map((i) => {
        const value = i.plan_value ?? row.base_value;
        const opts = Array.isArray(i.options) ? i.options : [];
        return {
          key: i.id,
          slug: i.products?.slug ?? "",
          name: i.name,
          image: i.products?.image_url || FALLBACK_PRODUCT_IMAGE,
          // El valor del plan ya es máx(precio, base): sirve para mostrar el extra.
          price: value,
          planValue: value,
          quantity: i.quantity,
          options: opts.length ? opts.map((x) => x.id) : undefined,
          details: opts.length ? opts.map((x) => x.name).join(", ") : undefined,
        };
      }),
    }));
  return {
    ...summary,
    userId: row.user_id,
    customer: row.profiles,
    payments: [...row.subscription_payments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    deliveries,
  };
}

export type SubscriptionDetail = NonNullable<Awaited<ReturnType<typeof loadSubscriptionDetail>>>;

/** Panel: todas las suscripciones (sin las compras descartadas), con su cliente. */
export async function loadAllSubscriptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(`${SUMMARY_SELECT}, profiles(full_name, email)`)
    .neq("status", "cancelada")
    .order("created_at", { ascending: false })
    .limit(500);
  const today = todayBogota();
  return ((data ?? []) as unknown as (SummaryRow & { profiles: { full_name: string; email: string } | null })[]).map((s) => ({
    ...toSummary(s, today),
    customer: s.profiles,
  }));
}
