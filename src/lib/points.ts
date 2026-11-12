import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CashSessionView, CashTotals } from "@/lib/counter";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/product-image";

export type LoadStatus = "planeada" | "en_produccion" | "despachada" | "en_venta" | "cerrada" | "cancelada";

export type PointProduct = { id: string; name: string; price: number; image: string; shelfLife: number };

export type PointRow = {
  id: string;
  kitchenId: string;
  name: string;
  address: string;
  schedule: string;
  active: boolean;
  vendors: { id: string; name: string }[];
  /** Código del enlace público (QR). */
  publicCode: string;
};

export type LoadLine = {
  productId: string;
  name: string;
  planned: number;
  toProduce: number;
  produced: number;
  dispatched: number;
  received: number;
  sold: number;
  /** En el punto ahora. */
  atPoint: number;
};

export type LoadView = {
  id: string;
  status: LoadStatus;
  date: string;
  notes: string;
  transportCost: number;
  transportFromCash: boolean;
  missing: number;
  staff: number;
  donated: number;
  lost: number;
  returned: number;
  lines: LoadLine[];
};

export type DishLotView = {
  lotId: string;
  productId: string;
  name: string;
  quantity: number;
  producedAt: string;
  expiresAt: string;
  unitCost: number;
  /** Volvió de un punto. */
  returned: boolean;
};

/** Ajustes de vida útil (horas). */
export async function loadShelfSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value").in("key", ["shelf_life_hours", "near_expiry_hours"]);
  const get = (k: string, d: number) => Number(data?.find((r) => r.key === k)?.value ?? d) || d;
  return { shelfLife: get("shelf_life_hours", 24), nearExpiry: get("near_expiry_hours", 8) };
}

/** Platos que se pueden llevar a puntos, con el precio de ese canal. */
export async function loadPointProducts(): Promise<PointProduct[]> {
  const supabase = await createClient();
  const [{ data: products }, { data: prices }, shelf] = await Promise.all([
    supabase.from("products").select("id, name, price, image_url, shelf_life_hours, sort, product_categories(sort)").eq("active", true).eq("sold_at_points", true),
    supabase.from("product_channel_prices").select("product_id, price").eq("channel", "punto"),
    loadShelfSettings(),
  ]);
  return (products ?? [])
    .sort((a, b) => (a.product_categories?.sort ?? 0) - (b.product_categories?.sort ?? 0) || a.sort - b.sort)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: prices?.find((x) => x.product_id === p.id)?.price ?? p.price,
      image: p.image_url || FALLBACK_PRODUCT_IMAGE,
      shelfLife: p.shelf_life_hours ?? shelf.shelfLife,
    }));
}

export async function loadPoints(kitchenId: string | null): Promise<PointRow[]> {
  const supabase = await createClient();
  let q = supabase.from("sale_points").select("id, kitchen_id, name, address, schedule, active, public_code, sale_point_users(user_id, profiles(full_name, email))").order("name");
  if (kitchenId) q = q.eq("kitchen_id", kitchenId);
  const { data } = await q;
  return (data ?? []).map((p) => ({
    id: p.id,
    kitchenId: p.kitchen_id,
    name: p.name,
    address: p.address,
    schedule: p.schedule,
    active: p.active,
    vendors: p.sale_point_users.map((u) => ({ id: u.user_id, name: u.profiles?.full_name || u.profiles?.email || "Vendedor" })),
    publicCode: p.public_code,
  }));
}

/** Vendedores (rol "Vendedor de punto") de una cocina, para asignarlos a sus puntos. */
export async function loadKitchenVendors(kitchenId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("user_id, roles!inner(key), profiles!inner(full_name, email, active, user_kitchens!inner(kitchen_id))")
    .eq("roles.key", "vendedor")
    .eq("profiles.user_kitchens.kitchen_id", kitchenId);
  return (data ?? [])
    .filter((r) => r.profiles?.active !== false)
    .map((r) => ({ id: r.user_id, name: r.profiles?.full_name || r.profiles?.email || "Vendedor" }));
}

type MovementRow = { kind: string; location: string; quantity: number; dish_lots: { product_id: string } | null };

/** Carga de un punto en un día, con lo vendido y lo que queda. */
export async function loadPointLoad(pointId: string, date: string, names: Map<string, string>): Promise<LoadView | null> {
  const supabase = await createClient();
  const { data: ld } = await supabase
    .from("point_loads")
    .select("id, status, load_date, notes, transport_cost, transport_from_cash, point_load_items(product_id, planned, to_produce, produced, dispatched, received)")
    .eq("point_id", pointId)
    .eq("load_date", date)
    .maybeSingle();
  if (!ld) return null;
  const [{ data: moves }, { data: stock }, { data: sales }] = await Promise.all([
    supabase.from("dish_movements").select("kind, location, quantity, dish_lots(product_id)").eq("load_id", ld.id),
    supabase.from("dish_stock").select("product_id, quantity").eq("location", "punto").eq("point_id", pointId),
    supabase
      .from("order_items")
      .select("product_id, quantity, orders!inner(point_id, delivery_date, status)")
      .eq("orders.point_id", pointId)
      .eq("orders.delivery_date", date)
      .eq("orders.status", "entregado"),
  ]);
  const sum = (kind: string, pid?: string) =>
    ((moves ?? []) as unknown as MovementRow[])
      .filter((m) => m.kind === kind && m.quantity < 0 && (!pid || m.dish_lots?.product_id === pid))
      .reduce((s, m) => s - m.quantity, 0);
  const lines = ld.point_load_items.map((i) => ({
    productId: i.product_id,
    name: names.get(i.product_id) ?? "Plato",
    planned: i.planned,
    toProduce: i.to_produce,
    produced: i.produced,
    dispatched: i.dispatched,
    received: i.received,
    sold: (sales ?? []).filter((s) => s.product_id === i.product_id).reduce((a, s) => a + s.quantity, 0),
    atPoint: (stock ?? []).filter((s) => s.product_id === i.product_id).reduce((a, s) => a + (s.quantity ?? 0), 0),
  }));
  return {
    id: ld.id,
    status: ld.status as LoadStatus,
    date: ld.load_date,
    notes: ld.notes,
    transportCost: ld.transport_cost,
    transportFromCash: ld.transport_from_cash,
    missing: sum("faltante"),
    staff: sum("equipo"),
    donated: sum("donacion"),
    lost: sum("perdida"),
    returned: ((moves ?? []) as unknown as MovementRow[]).filter((m) => m.kind === "devolucion" && m.location === "cocina").reduce((s, m) => s + m.quantity, 0),
    lines: lines.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Platos listos guardados en la cocina, por lote (vence primero, arriba). */
export async function loadKitchenDishes(kitchenId: string): Promise<DishLotView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dish_stock")
    .select("lot_id, product_id, quantity, produced_at, expires_at, unit_cost, load_id")
    .eq("kitchen_id", kitchenId)
    .eq("location", "cocina")
    .order("expires_at");
  const ids = [...new Set((data ?? []).map((d) => d.product_id).filter((x): x is string => Boolean(x)))];
  const lotIds = (data ?? []).map((d) => d.lot_id).filter((x): x is string => Boolean(x));
  const [{ data: products }, { data: back }] = await Promise.all([
    ids.length ? supabase.from("products").select("id, name").in("id", ids) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    lotIds.length
      ? supabase.from("dish_movements").select("lot_id").eq("kind", "devolucion").eq("location", "cocina").in("lot_id", lotIds)
      : Promise.resolve({ data: [] as { lot_id: string }[] }),
  ]);
  const returned = new Set((back ?? []).map((b) => b.lot_id));
  return (data ?? []).map((d) => ({
    lotId: d.lot_id as string,
    productId: d.product_id as string,
    name: products?.find((p) => p.id === d.product_id)?.name ?? "Plato",
    quantity: d.quantity ?? 0,
    producedAt: d.produced_at as string,
    expiresAt: d.expires_at as string,
    unitCost: Number(d.unit_cost ?? 0),
    returned: returned.has(d.lot_id as string),
  }));
}

// ---------------------------------------------------------------------------
// Vendedor
// ---------------------------------------------------------------------------

export type PointStockLine = {
  productId: string;
  name: string;
  price: number;
  image: string;
  /** Vigentes (se pueden vender). */
  available: number;
  expired: number;
  /** Primer vencimiento de lo vigente. */
  nextExpiry: string | null;
  /** Vigentes que aún pueden volver a cocina (les quedan más horas que "próximo a vencer"). */
  returnable: number;
};

export type PointSale = { id: string; code: string; total: number; method: string | null; at: string; status: string; items: string };

export async function loadMyPoints(userId: string, isManager: boolean) {
  const supabase = await createClient();
  const { data } = await supabase.from("sale_points").select("id, name, address, schedule, kitchen_id, sale_point_users(user_id)").eq("active", true).order("name");
  return (data ?? [])
    .filter((p) => isManager || p.sale_point_users.some((u) => u.user_id === userId))
    .map((p) => ({ id: p.id, name: p.name, address: p.address, schedule: p.schedule, kitchenId: p.kitchen_id }));
}

export async function loadPointStock(pointId: string, products: PointProduct[], nearExpiry: number): Promise<PointStockLine[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("dish_stock").select("product_id, quantity, expires_at").eq("location", "punto").eq("point_id", pointId);
  const now = Date.now();
  const lines = new Map<string, PointStockLine>();
  for (const s of data ?? []) {
    const p = products.find((x) => x.id === s.product_id);
    const line = lines.get(s.product_id as string) ?? {
      productId: s.product_id as string,
      name: p?.name ?? "Plato",
      price: p?.price ?? 0,
      image: p?.image ?? FALLBACK_PRODUCT_IMAGE,
      available: 0,
      expired: 0,
      nextExpiry: null,
      returnable: 0,
    };
    const exp = new Date(s.expires_at as string).getTime();
    if (exp > now) {
      line.available += s.quantity ?? 0;
      if (!line.nextExpiry || exp < new Date(line.nextExpiry).getTime()) line.nextExpiry = s.expires_at as string;
      if (exp > now + nearExpiry * 3_600_000) line.returnable += s.quantity ?? 0;
    } else line.expired += s.quantity ?? 0;
    lines.set(line.productId, line);
  }
  return [...lines.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Carga activa del punto: la de hoy o una anterior que no se cerró. */
export async function loadActiveLoad(pointId: string, today: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("point_loads")
    .select("id, load_date, status")
    .eq("point_id", pointId)
    .lte("load_date", today)
    .in("status", ["despachada", "en_venta"])
    .order("load_date")
    .limit(1)
    .maybeSingle();
  return data;
}

export async function loadPointCash(pointId: string, userId: string): Promise<(CashSessionView & { cashOut: number }) | null> {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("cash_sessions")
    .select("id, opened_at, opening_amount, cash_out")
    .eq("point_id", pointId)
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
    cashOut: s.cash_out,
    totals: list,
    expectedCash: s.opening_amount - s.cash_out + list.filter((t) => t.kind === "efectivo").reduce((sum, t) => sum + t.net, 0),
  };
}

export async function loadPointSales(pointId: string, date: string): Promise<PointSale[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, code, total, status, paid_at, payments(method_name, status), order_items(name, quantity)")
    .eq("point_id", pointId)
    .eq("channel", "punto")
    .eq("delivery_date", date)
    .order("created_at", { ascending: false });
  return (data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    total: o.total,
    status: o.status,
    at: o.paid_at ?? "",
    method: o.payments.find((p) => p.status === "aprobado")?.method_name ?? null,
    items: o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", "),
  }));
}

// ---------------------------------------------------------------------------
// Resultados por punto (Productividad)
// ---------------------------------------------------------------------------

export type PointResult = {
  pointId: string;
  name: string;
  kitchenId: string;
  days: number;
  received: number;
  sold: number;
  /** % de lo recibido que se vendió. */
  sellThrough: number | null;
  returned: number;
  staff: number;
  donated: number;
  lost: number;
  missing: number;
  /** % de lo recibido que terminó en equipo, donación, pérdida o faltante. */
  wastePct: number | null;
  netSales: number;
  costSold: number;
  wasteCost: number;
  transport: number;
  vendorPay: number;
  profit: number;
  /** Platos vendidos por hora de caja abierta. */
  perHour: number | null;
};

/** Venta real, merma, ventas por hora y ganancia de cada punto en el período. */
export async function loadPointResults(period: { from: string; to: string }, kitchenId: string | null, payByUser: Record<string, number>): Promise<PointResult[]> {
  const supabase = await createClient();
  let pq = supabase.from("sale_points").select("id, name, kitchen_id, sale_point_users(user_id)");
  if (kitchenId) pq = pq.eq("kitchen_id", kitchenId);
  const { data: points } = await pq;
  if (!points?.length) return [];
  const ids = points.map((p) => p.id);
  const fromTs = `${period.from}T00:00:00-05:00`;
  const toDate = new Date(`${period.to}T12:00:00Z`);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  const toTs = `${toDate.toISOString().slice(0, 10)}T00:00:00-05:00`;
  const [{ data: loads }, { data: orders }, { data: sessions }] = await Promise.all([
    supabase.from("point_loads").select("id, point_id, load_date, transport_cost").in("point_id", ids).gte("load_date", period.from).lte("load_date", period.to).neq("status", "cancelada"),
    supabase
      .from("orders")
      .select("id, point_id, total, tax_amount, order_items(quantity)")
      .eq("channel", "punto")
      .eq("status", "entregado")
      .in("point_id", ids)
      .gte("delivery_date", period.from)
      .lte("delivery_date", period.to),
    supabase.from("cash_sessions").select("point_id, opened_at, closed_at").in("point_id", ids).gte("opened_at", fromTs).lt("opened_at", toTs),
  ]);
  const loadIds = (loads ?? []).map((l) => l.id);
  const orderIds = (orders ?? []).map((o) => o.id);
  const [{ data: moves }, { data: costs }] = await Promise.all([
    loadIds.length
      ? supabase.from("dish_movements").select("load_id, kind, location, quantity, dish_lots(unit_cost)").in("load_id", loadIds)
      : Promise.resolve({ data: [] as { load_id: string | null; kind: string; location: string; quantity: number; dish_lots: { unit_cost: number } | null }[] }),
    orderIds.length ? supabase.from("order_food_costs").select("order_id, food_cost").in("order_id", orderIds) : Promise.resolve({ data: [] as { order_id: string | null; food_cost: number | null }[] }),
  ]);
  // Un vendedor con varios puntos reparte su pago entre ellos.
  const pointsOf = new Map<string, number>();
  for (const p of points) for (const u of p.sale_point_users) pointsOf.set(u.user_id, (pointsOf.get(u.user_id) ?? 0) + 1);

  return points
    .map((p) => {
      const pl = (loads ?? []).filter((l) => l.point_id === p.id);
      const lids = new Set(pl.map((l) => l.id));
      const pm = (moves ?? []).filter((m) => m.load_id && lids.has(m.load_id));
      const out = (kind: string) => pm.filter((m) => m.kind === kind && m.quantity < 0).reduce((n, m) => n - m.quantity, 0);
      const outCost = (kind: string) => pm.filter((m) => m.kind === kind && m.quantity < 0).reduce((n, m) => n - m.quantity * Number(m.dish_lots?.unit_cost ?? 0), 0);
      const received = pm.filter((m) => m.kind === "recepcion" && m.location === "punto").reduce((n, m) => n + m.quantity, 0);
      const po = (orders ?? []).filter((o) => o.point_id === p.id);
      const sold = po.reduce((n, o) => n + o.order_items.reduce((a, i) => a + i.quantity, 0), 0);
      const netSales = po.reduce((n, o) => n + o.total - o.tax_amount, 0);
      const costSold = po.reduce((n, o) => n + Number((costs ?? []).find((c) => c.order_id === o.id)?.food_cost ?? 0), 0);
      const staff = out("equipo");
      const donated = out("donacion");
      const lost = out("perdida");
      const missing = out("faltante");
      const wasteCost = outCost("equipo") + outCost("donacion") + outCost("perdida") + outCost("faltante");
      const transport = pl.reduce((n, l) => n + l.transport_cost, 0);
      const vendorPay = p.sale_point_users.reduce((n, u) => n + (payByUser[u.user_id] ?? 0) / (pointsOf.get(u.user_id) ?? 1), 0);
      const hours = (sessions ?? [])
        .filter((s) => s.point_id === p.id && s.closed_at)
        .reduce((n, s) => n + (new Date(s.closed_at as string).getTime() - new Date(s.opened_at).getTime()) / 3_600_000, 0);
      return {
        pointId: p.id,
        name: p.name,
        kitchenId: p.kitchen_id,
        days: pl.length,
        received,
        sold,
        sellThrough: received ? sold / received : null,
        returned: out("devolucion"),
        staff,
        donated,
        lost,
        missing,
        wastePct: received ? (staff + donated + lost + missing) / received : null,
        netSales,
        costSold,
        wasteCost,
        transport,
        vendorPay,
        profit: netSales - costSold - wasteCost - transport - vendorPay,
        perHour: hours >= 0.25 ? sold / hours : null,
      };
    })
    .filter((r) => r.days > 0 || r.sold > 0);
}
