import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Cuentas: ventas, costos, pérdidas, gastos y utilidad real de un período, por cocina o consolidado.
 *  · Ventas cuando se cobran: pedidos el día de su pago; planes el día del pago del plan (sus pedidos no se
 *    vuelven a contar). Precios con impuesto incluido: ventas netas = cobrado − impuesto.
 *  · Costo de ingredientes y empaques: lo que se consumió al preparar (al costo de ese momento).
 *  · Pérdidas: inventario (caducidad, daño, desfases del conteo), platos dañados en cocina y comida de
 *    pedidos no entregados o cancelados después de prepararse (no se reembolsan: el cobro se mantiene).
 *  · Gastos: fijos recurrentes (mensuales, prorrateados por día), imprevistos y nómina.
 * Lo que no pertenece a una cocina (gastos generales, solo del superadministrador) cuenta en el consolidado como "General".
 */

export { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance-categories";

export type Period = { from: string; to: string };
/** Clave de cocina en los desgloses: id de la cocina o "general". */
export type KitchenKey = string;

export type Statement = {
  // Ventas
  ordersCount: number;
  plansCount: number;
  salesOrders: number;
  salesPlans: number;
  deliveryFees: number;
  grossSales: number;
  taxes: number;
  netSales: number;
  // Costos y pérdidas
  foodCost: number;
  dishesMade: number;
  grossProfit: number;
  lossInventory: number;
  lossKitchen: number;
  lossOrders: number;
  losses: number;
  // Gastos e ingresos
  payroll: number;
  fixedExpenses: number;
  otherExpenses: number;
  otherIncome: number;
  expenses: number;
  // Resultado
  profit: number;
};

const ZERO: Statement = {
  ordersCount: 0,
  plansCount: 0,
  salesOrders: 0,
  salesPlans: 0,
  deliveryFees: 0,
  grossSales: 0,
  taxes: 0,
  netSales: 0,
  foodCost: 0,
  dishesMade: 0,
  grossProfit: 0,
  lossInventory: 0,
  lossKitchen: 0,
  lossOrders: 0,
  losses: 0,
  payroll: 0,
  fixedExpenses: 0,
  otherExpenses: 0,
  otherIncome: 0,
  expenses: 0,
  profit: 0,
};

/** Totales derivados a partir de los componentes. */
function finish(s: Statement): Statement {
  const grossSales = s.salesOrders + s.salesPlans;
  const netSales = grossSales - s.taxes;
  const grossProfit = netSales - s.foodCost;
  const losses = s.lossInventory + s.lossKitchen + s.lossOrders;
  const expenses = s.payroll + s.fixedExpenses + s.otherExpenses;
  return { ...s, grossSales, netSales, grossProfit, losses, expenses, profit: grossProfit - losses - expenses + s.otherIncome };
}

const add = (a: Statement, b: Partial<Statement>): Statement => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) (out as Record<string, number>)[k] += v as number;
  return out;
};

// ---------- Fechas (hora de Bogotá) ----------

/** Inicio del día en Bogotá como ISO (UTC−5, sin horario de verano). */
const startOf = (d: string) => `${d}T00:00:00-05:00`;
export const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
export const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000) + 1;
const bogotaDate = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
const daysInMonth = (d: string) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0)).getUTCDate();

/** Monto mensual prorrateado a los días de [from, to] (mes a mes, según los días de cada mes). */
function prorate(monthly: number, from: string, to: string) {
  let total = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) total += monthly / daysInMonth(d);
  return total;
}

/** Período anterior de la misma duración (para comparar). */
export function previousPeriod(p: Period): Period {
  const len = daysBetween(p.from, p.to);
  return { from: addDays(p.from, -len), to: addDays(p.from, -1) };
}

// ---------- Cálculo ----------

export type FinanceReport = {
  period: Period;
  /** Por cocina (id) y "general" (lo que no es de una cocina). */
  byKitchen: Record<KitchenKey, Statement>;
  total: Statement;
  daily: { date: string; netSales: number; foodCost: number; grossProfit: number; orders: number }[];
  topProducts: { name: string; units: number; sales: number }[];
  lossDetail: { label: string; amount: number; kitchen: KitchenKey }[];
  payrollDetail: { userId: string; name: string; kitchen: KitchenKey; payType: "diario" | "mensual"; amount: number; days: number; cost: number }[];
};

export async function loadFinance(period: Period): Promise<FinanceReport> {
  const supabase = await createClient();
  const fromTs = startOf(period.from);
  const toTs = startOf(addDays(period.to, 1));

  const [orders, planPays, batches, movements, kitchenIncidents, lostOrders, entries, pay, items] = await Promise.all([
    // Pedidos normales cobrados en el período
    supabase
      .from("orders")
      .select("id, total, delivery_fee, tax_amount, paid_at, zones(kitchen_id)")
      .eq("kind", "pedido")
      .gte("paid_at", fromTs)
      .lt("paid_at", toTs),
    // Pagos de planes (compra y diferencias)
    supabase.from("subscription_payments").select("subscription_id, amount, tax_amount, created_at, kind").eq("status", "aprobado").gte("created_at", fromTs).lt("created_at", toTs),
    // Tandas terminadas (costo real de lo producido)
    supabase.from("prep_batches").select("kitchen_id, quantity, total_cost, finished_at").eq("status", "listo").gte("finished_at", fromTs).lt("finished_at", toTs),
    // Pérdidas y desfases de inventario
    supabase
      .from("inventory_movements")
      .select("kitchen_id, kind, quantity, unit_cost, reason, created_at, ingredients(name)")
      .in("kind", ["perdida", "ajuste"])
      .gte("created_at", fromTs)
      .lt("created_at", toTs),
    // Platos dañados en cocina (ya preparados)
    supabase
      .from("order_incidents")
      .select("cost, item_name, created_at, orders!inner(code, zones(kitchen_id))")
      .eq("stage", "cocina")
      .gt("cost", 0)
      .gte("created_at", fromTs)
      .lt("created_at", toTs),
    // Pedidos que no llegaron al cliente (cancelados o no entregados) del período
    supabase
      .from("orders")
      .select("id, code, status, delivery_date, zones(kitchen_id)")
      .in("status", ["cancelado", "no_entregado"])
      .gte("delivery_date", period.from)
      .lte("delivery_date", period.to),
    // Gastos e ingresos manuales que tocan el período
    supabase.from("finance_entries").select("kitchen_id, kind, category, description, amount, entry_date, recurring, ends_on").lte("entry_date", period.to),
    supabase.from("employee_pay").select("user_id, kitchen_id, pay_type, amount, active, starts_on, profiles(full_name, email)").eq("active", true).lte("starts_on", period.to),
    // Productos vendidos (pedidos normales)
    supabase
      .from("order_items")
      .select("name, quantity, line_total, orders!inner(kind, paid_at)")
      .eq("orders.kind", "pedido")
      .gte("orders.paid_at", fromTs)
      .lt("orders.paid_at", toTs),
  ]);

  const byKitchen: Record<KitchenKey, Statement> = {};
  const bump = (k: string | null | undefined, part: Partial<Statement>) => {
    const key = k ?? "general";
    byKitchen[key] = add(byKitchen[key] ?? ZERO, part);
  };
  const daily = new Map<string, { netSales: number; foodCost: number; orders: number }>();
  const day = (d: string) => {
    const x = daily.get(d) ?? { netSales: 0, foodCost: 0, orders: 0 };
    daily.set(d, x);
    return x;
  };

  // Ventas de pedidos
  for (const o of (orders.data ?? []) as unknown as { total: number; delivery_fee: number; tax_amount: number; paid_at: string; zones: { kitchen_id: string | null } | null }[]) {
    bump(o.zones?.kitchen_id, { ordersCount: 1, salesOrders: o.total, deliveryFees: o.delivery_fee, taxes: o.tax_amount });
    const d = day(bogotaDate(o.paid_at));
    d.netSales += o.total - o.tax_amount;
    d.orders += 1;
  }

  // Ventas de planes: la cocina es la de la zona de sus entregas.
  const subIds = [...new Set((planPays.data ?? []).map((p) => p.subscription_id))];
  const { data: subOrders } = subIds.length
    ? await supabase.from("orders").select("subscription_id, created_at, zones(kitchen_id)").in("subscription_id", subIds).order("created_at")
    : { data: [] };
  const kitchenOfSub = new Map<string, string | null>();
  for (const o of (subOrders ?? []) as unknown as { subscription_id: string; zones: { kitchen_id: string | null } | null }[]) {
    if (!kitchenOfSub.has(o.subscription_id)) kitchenOfSub.set(o.subscription_id, o.zones?.kitchen_id ?? null);
  }
  for (const p of planPays.data ?? []) {
    bump(kitchenOfSub.get(p.subscription_id), { plansCount: p.kind === "compra" ? 1 : 0, salesPlans: p.amount, taxes: p.tax_amount });
    day(bogotaDate(p.created_at)).netSales += p.amount - p.tax_amount;
  }

  // Costo de lo producido (lo que termina en pérdida se reclasifica más abajo)
  for (const b of batches.data ?? []) {
    bump(b.kitchen_id, { foodCost: Number(b.total_cost), dishesMade: b.quantity });
    day(bogotaDate(b.finished_at as string)).foodCost += Number(b.total_cost);
  }

  // Pérdidas y desfases de inventario de cada cocina
  const lossDetail: FinanceReport["lossDetail"] = [];
  const REASON: Record<string, string> = { caducidad: "Caducidad", dano: "Daño", otro: "Otra pérdida" };
  for (const m of (movements.data ?? []) as unknown as { kitchen_id: string; kind: string; quantity: number; unit_cost: number | null; reason: string | null; ingredients: { name: string } | null }[]) {
    const value = -Number(m.quantity) * Number(m.unit_cost ?? 0); // pérdida (+) o sobrante de conteo (−)
    bump(m.kitchen_id, { lossInventory: value });
    lossDetail.push({ label: `${m.kind === "ajuste" ? "Desfase de conteo" : (REASON[m.reason ?? "otro"] ?? "Pérdida")} · ${m.ingredients?.name ?? ""}`, amount: value, kitchen: m.kitchen_id });
  }
  // Platos dañados en cocina
  for (const n of (kitchenIncidents.data ?? []) as unknown as { cost: number; item_name: string | null; orders: { code: string; zones: { kitchen_id: string | null } | null } }[]) {
    // Su costo ya está en lo producido: pasa de costo de ingredientes a pérdida (no se cuenta dos veces).
    bump(n.orders.zones?.kitchen_id, { lossKitchen: Number(n.cost), foodCost: -Number(n.cost) });
    lossDetail.push({ label: `Plato dañado en cocina · ${n.item_name ?? ""} (${n.orders.code})`, amount: Number(n.cost), kitchen: n.orders.zones?.kitchen_id ?? "general" });
  }
  // Comida de pedidos no entregados o cancelados después de prepararse
  const lost = (lostOrders.data ?? []) as unknown as { id: string; code: string; status: string; zones: { kitchen_id: string | null } | null }[];
  const { data: lostCosts } = lost.length ? await supabase.from("order_food_costs").select("order_id, food_cost").in("order_id", lost.map((o) => o.id)) : { data: [] };
  const costOf = new Map((lostCosts ?? []).map((c) => [c.order_id, Number(c.food_cost)]));
  // Lo que ya se contó como plato dañado de ese pedido no se vuelve a contar.
  const { data: lostIncidents } = lost.length
    ? await supabase.from("order_incidents").select("order_id, cost").eq("stage", "cocina").in("order_id", lost.map((o) => o.id))
    : { data: [] };
  const damagedOf = new Map<string, number>();
  for (const n of lostIncidents ?? []) damagedOf.set(n.order_id, (damagedOf.get(n.order_id) ?? 0) + Number(n.cost));
  for (const o of lost) {
    const c = (costOf.get(o.id) ?? 0) - (damagedOf.get(o.id) ?? 0);
    if (c <= 0) continue;
    bump(o.zones?.kitchen_id, { lossOrders: c, foodCost: -c });
    lossDetail.push({ label: `${o.status === "no_entregado" ? "No entregado" : "Cancelado ya preparado"} · ${o.code}`, amount: c, kitchen: o.zones?.kitchen_id ?? "general" });
  }

  // Gastos e ingresos manuales (recurrentes prorrateados por día)
  for (const e of entries.data ?? []) {
    let amount = 0;
    if (e.recurring) {
      const from = e.entry_date > period.from ? e.entry_date : period.from;
      const to = e.ends_on && e.ends_on < period.to ? e.ends_on : period.to;
      if (from <= to) amount = prorate(e.amount, from, to);
    } else if (e.entry_date >= period.from) {
      amount = e.amount;
    }
    if (!amount) continue;
    if (e.kind === "ingreso") bump(e.kitchen_id, { otherIncome: amount });
    else bump(e.kitchen_id, e.recurring ? { fixedExpenses: amount } : { otherExpenses: amount });
  }

  // Nómina: mensual prorrateada; por día × días con actividad en el período.
  const payroll = (pay.data ?? []) as unknown as {
    user_id: string;
    kitchen_id: string | null;
    pay_type: "diario" | "mensual";
    amount: number;
    starts_on: string;
    profiles: { full_name: string; email: string } | null;
  }[];
  const daily_ = payroll.filter((p) => p.pay_type === "diario").map((p) => p.user_id);
  const worked = new Map<string, Set<string>>();
  if (daily_.length) {
    const [cooks1, cooks2, packers, couriers] = await Promise.all([
      supabase.from("prep_batches").select("started_by, started_at").in("started_by", daily_).gte("started_at", fromTs).lt("started_at", toTs),
      supabase.from("prep_batches").select("finished_by, finished_at").in("finished_by", daily_).gte("finished_at", fromTs).lt("finished_at", toTs),
      supabase.from("orders").select("packed_by, packed_at").in("packed_by", daily_).gte("packed_at", fromTs).lt("packed_at", toTs),
      supabase.from("delivery_routes").select("courier_id, started_at").in("courier_id", daily_).gte("started_at", fromTs).lt("started_at", toTs),
    ]);
    const mark = (u: string | null, at: string | null) => {
      if (!u || !at) return;
      const s = worked.get(u) ?? new Set<string>();
      s.add(bogotaDate(at));
      worked.set(u, s);
    };
    for (const r of cooks1.data ?? []) mark(r.started_by, r.started_at);
    for (const r of cooks2.data ?? []) mark(r.finished_by, r.finished_at);
    for (const r of packers.data ?? []) mark(r.packed_by, r.packed_at);
    for (const r of couriers.data ?? []) mark(r.courier_id, r.started_at);
  }
  const payrollDetail: FinanceReport["payrollDetail"] = payroll.map((p) => {
    // Solo desde que empezó a regir el pago.
    const from = p.starts_on > period.from ? p.starts_on : period.from;
    const days = p.pay_type === "diario" ? [...(worked.get(p.user_id) ?? [])].filter((d) => d >= from).length : daysBetween(from, period.to);
    const cost = p.pay_type === "diario" ? p.amount * days : prorate(p.amount, from, period.to);
    bump(p.kitchen_id, { payroll: cost });
    return { userId: p.user_id, name: p.profiles?.full_name || p.profiles?.email || "Empleado", kitchen: p.kitchen_id ?? "general", payType: p.pay_type, amount: p.amount, days, cost };
  });

  // Totales
  for (const k of Object.keys(byKitchen)) byKitchen[k] = finish(byKitchen[k]);
  const total = finish(Object.values(byKitchen).reduce((acc, s) => add(acc, s), ZERO));

  const series: FinanceReport["daily"] = [];
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) {
    const x = daily.get(d) ?? { netSales: 0, foodCost: 0, orders: 0 };
    series.push({ date: d, ...x, grossProfit: x.netSales - x.foodCost });
  }

  const products = new Map<string, { units: number; sales: number }>();
  for (const i of items.data ?? []) {
    const p = products.get(i.name) ?? { units: 0, sales: 0 };
    p.units += i.quantity;
    p.sales += i.line_total;
    products.set(i.name, p);
  }
  const topProducts = [...products].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales).slice(0, 8);

  return { period, byKitchen, total, daily: series, topProducts, lossDetail: lossDetail.sort((a, b) => b.amount - a.amount), payrollDetail };
}

/** Estado de resultados de una cocina (id) o del consolidado (null). */
export function statementFor(report: FinanceReport, kitchenId: string | null): Statement {
  return kitchenId ? (report.byKitchen[kitchenId] ?? finish(ZERO)) : report.total;
}
