import "server-only";
import { createClient } from "@/lib/supabase/server";

export type UpcomingDelivery = {
  id: string;
  code: string;
  date: string;
  slot: string;
  status: string;
  summary: string;
  total: number;
};

/** Fecha de hoy en Bogotá (YYYY-MM-DD). */
export function todayBogota() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

/** Pedidos pagados que aún no se entregan (de hoy en adelante). */
export async function loadUpcomingDeliveries(userId: string, limit = 20): Promise<UpcomingDelivery[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, code, delivery_date, slot_label, status, total, order_items(name, quantity)")
    .eq("user_id", userId)
    .in("status", ["confirmado", "en_preparacion", "en_camino", "no_entregado"])
    .gte("delivery_date", todayBogota())
    .order("delivery_date")
    .limit(limit);
  return (data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    date: o.delivery_date,
    slot: o.slot_label,
    status: o.status,
    total: o.total,
    summary: o.order_items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(" · "),
  }));
}
