import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, loadFinance, type Period } from "@/lib/finance";

/**
 * Productividad y costo real por plato.
 *  · Cocina: lo que mide cada tanda (quién la hizo, cuántos platos y cuánto tardó).
 *    El tiempo estándar de cada producto es el promedio real de las últimas 4 semanas.
 *  · Domicilios: cada canasta (salida → regreso), sus paradas, entregas, novedades y espera.
 *  · Costos: la nómina del período (Cuentas, en la cocina del pago) se reparte entre cocina y
 *    domicilios según los días que cada persona trabajó en cada cosa.
 */

const STANDARD_DAYS = 28;
/** Registros demasiado cortos (se marcaron después) no cuentan para los tiempos, sí para las cantidades. */
const MIN_BATCH_SECONDS = 10;
const MIN_ROUTE_SECONDS = 120;
const MIN_SECONDS_PER_DISH = 5;
/** Segundos confiables de una tanda (0 si se marcó tan rápido que no refleja la preparación). */
const timedSecs = (b: { duration_seconds: number | null; quantity: number }) => {
  const s = b.duration_seconds ?? 0;
  return s >= MIN_BATCH_SECONDS && b.quantity > 0 && s / b.quantity >= MIN_SECONDS_PER_DISH ? s : 0;
};
const bogotaDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const startOf = (d: string) => `${d}T00:00:00-05:00`;

export type CookRow = {
  userId: string;
  name: string;
  days: number;
  batches: number;
  dishes: number;
  activeSeconds: number;
  /** Platos por hora de preparación. */
  perHour: number;
  secPerDish: number;
  /** Tiempo estándar ÷ tiempo real (100 % = al ritmo del promedio; más es más rápido). */
  efficiency: number | null;
  incidents: number;
  cost: number | null;
  costPerDish: number | null;
};

export type CourierRow = {
  userId: string;
  name: string;
  days: number;
  routes: number;
  stops: number;
  delivered: number;
  failed: number;
  dishes: number;
  km: number;
  activeSeconds: number;
  perHour: number;
  minPerDelivery: number | null;
  avgWaitMin: number | null;
  /** Tiempo real ÷ estimado de la ruta (1 = como se calculó). */
  drift: number | null;
  cost: number | null;
  costPerDelivery: number | null;
  costPerDish: number | null;
};

export type ProductRow = {
  name: string;
  units: number;
  secPerDish: number;
  price: number;
  ingredients: number;
  labor: number;
  delivery: number;
  total: number;
  margin: number;
};

export type KitchenRow = {
  kitchenId: string;
  dishesMade: number;
  cookSeconds: number;
  cookCost: number;
  prepPerDish: number | null;
  perHour: number;
  deliveries: number;
  dishesDelivered: number;
  courierCost: number;
  deliveryPerOrder: number | null;
  deliveryPerDish: number | null;
  deliveriesPerHour: number;
  failedPct: number | null;
};

export type ProductivityReport = {
  cooks: CookRow[];
  couriers: CourierRow[];
  products: ProductRow[];
  kitchens: KitchenRow[];
  total: Omit<KitchenRow, "kitchenId">;
  /** Personas con actividad pero sin pago registrado en Cuentas → Nómina. */
  unpaid: string[];
};

export async function loadProductivity(period: Period, kitchenId: string | null): Promise<ProductivityReport> {
  const supabase = await createClient();
  const fromTs = startOf(period.from);
  const toTs = startOf(addDays(period.to, 1));
  const stdFrom = startOf(addDays(period.to, -STANDARD_DAYS + 1));

  let batchQ = supabase
    .from("prep_batches")
    .select("id, kitchen_id, product_id, name, quantity, duration_seconds, started_by, finished_at, total_cost, prep_batch_items(quantity, order_items(unit_price))")
    .eq("status", "listo")
    .gte("finished_at", fromTs)
    .lt("finished_at", toTs);
  let routeQ = supabase
    .from("delivery_routes")
    .select("id, kitchen_id, courier_id, started_at, completed_at, returned_at, distance_m, duration_s, route_stops(arrived_at, orders(status, delivered_at, order_items(quantity)))")
    .not("started_at", "is", null)
    .gte("started_at", fromTs)
    .lt("started_at", toTs);
  let packQ = supabase.from("orders").select("packed_by, packed_at, kitchen_id").not("packed_by", "is", null).gte("packed_at", fromTs).lt("packed_at", toTs);
  if (kitchenId) {
    batchQ = batchQ.eq("kitchen_id", kitchenId);
    routeQ = routeQ.eq("kitchen_id", kitchenId);
    packQ = packQ.eq("kitchen_id", kitchenId);
  }

  const [{ data: batchData }, { data: stdData }, { data: routeData }, { data: incData }, { data: packData }, finance] = await Promise.all([
    batchQ,
    // Tiempo estándar: promedio real de las últimas semanas (todas las cocinas que ve el usuario).
    supabase.from("prep_batches").select("product_id, quantity, duration_seconds").eq("status", "listo").gt("duration_seconds", 0).gte("finished_at", stdFrom).lt("finished_at", toTs),
    routeQ,
    supabase.from("order_incidents").select("created_by, stage, orders!inner(kitchen_id)").eq("stage", "cocina").gte("created_at", fromTs).lt("created_at", toTs),
    packQ,
    loadFinance(period),
  ]);

  type Batch = {
    id: string;
    kitchen_id: string;
    product_id: string | null;
    name: string;
    quantity: number;
    duration_seconds: number | null;
    started_by: string | null;
    finished_at: string;
    total_cost: number;
    prep_batch_items: { quantity: number; order_items: { unit_price: number } | null }[];
  };
  type Route = {
    id: string;
    kitchen_id: string;
    courier_id: string | null;
    started_at: string;
    completed_at: string | null;
    returned_at: string | null;
    distance_m: number;
    duration_s: number;
    route_stops: { arrived_at: string | null; orders: { status: string; delivered_at: string | null; order_items: { quantity: number }[] } | null }[];
  };
  const batches = (batchData ?? []) as unknown as Batch[];
  /** Duración útil de una canasta (salida → regreso o fin); 0 si no es confiable. */
  const routeSeconds = (r: Route) => {
    const end = r.returned_at ?? r.completed_at;
    if (!end) return 0;
    const secs = (new Date(end).getTime() - new Date(r.started_at).getTime()) / 1000;
    return secs >= MIN_ROUTE_SECONDS ? secs : 0;
  };
  const routes = (routeData ?? []) as unknown as Route[];

  // Estándar por producto: segundos por plato.
  const stdAcc = new Map<string, { s: number; q: number }>();
  for (const b of stdData ?? []) {
    if (!b.product_id || !timedSecs(b)) continue;
    const a = stdAcc.get(b.product_id) ?? { s: 0, q: 0 };
    a.s += timedSecs(b);
    a.q += b.quantity;
    stdAcc.set(b.product_id, a);
  }
  const standard = (pid: string | null) => {
    const a = pid ? stdAcc.get(pid) : undefined;
    return a && a.q ? a.s / a.q : null;
  };

  // ---------- Días de actividad por persona, rol y cocina (para repartir la nómina) ----------
  const activity = new Map<string, Set<string>>(); // userId → "fecha|rol|cocina"
  const mark = (u: string | null, at: string | null, role: "cook" | "courier", k: string) => {
    if (!u || !at) return;
    const s = activity.get(u) ?? new Set<string>();
    s.add(`${bogotaDate(at)}|${role}|${k}`);
    activity.set(u, s);
  };
  for (const b of batches) mark(b.started_by, b.finished_at, "cook", b.kitchen_id);
  for (const r of routes) mark(r.courier_id, r.started_at, "courier", r.kitchen_id);
  // Alistar (empacar) es trabajo de cocina: cuenta como día de cocina.
  for (const o of packData ?? []) if (o.kitchen_id) mark(o.packed_by, o.packed_at, "cook", o.kitchen_id);

  // Nómina del período (la misma de Cuentas): cada pago pertenece a una cocina.
  const payOf = new Map<string, number>();
  const payKitchen = new Map<string, string>();
  for (const p of finance.payrollDetail) {
    payOf.set(p.userId, (payOf.get(p.userId) ?? 0) + p.cost);
    payKitchen.set(p.userId, p.kitchen);
  }
  /** Parte del pago que corresponde a cocina o a domicilios, según los días trabajados en cada cosa. */
  const share = (u: string, role: "cook" | "courier") => {
    const pay = payOf.get(u);
    if (pay === undefined) return null;
    const all = [...(activity.get(u) ?? [])];
    if (!all.length) return 0;
    return (pay * all.filter((x) => x.split("|")[1] === role).length) / all.length;
  };
  /** En la vista de una cocina, solo el costo de quien tiene su pago en esa cocina. */
  const costIn = (u: string, role: "cook" | "courier") => (!kitchenId || payKitchen.get(u) === kitchenId ? share(u, role) : null);
  const daysAs = (u: string, role: string) => new Set([...(activity.get(u) ?? [])].filter((x) => x.split("|")[1] === role).map((x) => x.split("|")[0])).size;

  // ---------- Cocineros ----------
  const cookAcc = new Map<string, { batches: number; dishes: number; secs: number; timedDishes: number; expected: number; timed: number }>();
  for (const b of batches) {
    if (!b.started_by) continue;
    const a = cookAcc.get(b.started_by) ?? { batches: 0, dishes: 0, secs: 0, timedDishes: 0, expected: 0, timed: 0 };
    a.batches += 1;
    a.dishes += b.quantity;
    const secs = timedSecs(b);
    a.secs += secs;
    if (secs) a.timedDishes += b.quantity;
    const std = standard(b.product_id);
    if (std && secs > 0) {
      a.expected += std * b.quantity;
      a.timed += secs;
    }
    cookAcc.set(b.started_by, a);
  }
  const incidentsBy = new Map<string, number>();
  for (const n of (incData ?? []) as unknown as { created_by: string | null; orders: { kitchen_id: string | null } }[]) {
    if (!n.created_by || (kitchenId && n.orders.kitchen_id !== kitchenId)) continue;
    incidentsBy.set(n.created_by, (incidentsBy.get(n.created_by) ?? 0) + 1);
  }

  // ---------- Domiciliarios ----------
  const courierAcc = new Map<string, { routes: number; stops: number; delivered: number; failed: number; dishes: number; meters: number; secs: number; timedDelivered: number; est: number; real: number; waits: number[] }>();
  for (const r of routes) {
    if (!r.courier_id) continue;
    const a = courierAcc.get(r.courier_id) ?? { routes: 0, stops: 0, delivered: 0, failed: 0, dishes: 0, meters: 0, secs: 0, timedDelivered: 0, est: 0, real: 0, waits: [] };
    a.routes += 1;
    a.meters += r.distance_m;
    const secs = routeSeconds(r);
    if (secs) {
      a.secs += secs;
      a.timedDelivered += r.route_stops.filter((s) => s.orders?.status === "entregado").length;
      if (r.returned_at && r.duration_s > 0) {
        a.est += r.duration_s;
        a.real += secs;
      }
    }
    for (const s of r.route_stops) {
      const o = s.orders;
      if (!o) continue;
      a.stops += 1;
      if (o.status === "entregado") {
        a.delivered += 1;
        a.dishes += o.order_items.reduce((x, i) => x + i.quantity, 0);
        if (s.arrived_at && o.delivered_at) a.waits.push(Math.max(0, (new Date(o.delivered_at).getTime() - new Date(s.arrived_at).getTime()) / 60000));
      } else if (o.status === "no_entregado") a.failed += 1;
    }
    courierAcc.set(r.courier_id, a);
  }

  // Nombres
  const ids = [...new Set([...cookAcc.keys(), ...courierAcc.keys()])];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const nameOf = (id: string) => {
    const p = people?.find((x) => x.id === id);
    return p?.full_name || p?.email || "Persona del equipo";
  };

  const cooks: CookRow[] = [...cookAcc].map(([u, a]) => {
    const cost = costIn(u, "cook");
    return {
      userId: u,
      name: nameOf(u),
      days: daysAs(u, "cook"),
      batches: a.batches,
      dishes: a.dishes,
      activeSeconds: a.secs,
      perHour: a.secs ? a.timedDishes / (a.secs / 3600) : 0,
      secPerDish: a.timedDishes ? a.secs / a.timedDishes : 0,
      efficiency: a.timed ? a.expected / a.timed : null,
      incidents: incidentsBy.get(u) ?? 0,
      cost,
      costPerDish: cost !== null && a.dishes ? cost / a.dishes : null,
    };
  });
  cooks.sort((x, y) => y.dishes - x.dishes);

  const couriers: CourierRow[] = [...courierAcc].map(([u, a]) => {
    const cost = costIn(u, "courier");
    return {
      userId: u,
      name: nameOf(u),
      days: daysAs(u, "courier"),
      routes: a.routes,
      stops: a.stops,
      delivered: a.delivered,
      failed: a.failed,
      dishes: a.dishes,
      km: a.meters / 1000,
      activeSeconds: a.secs,
      perHour: a.secs ? a.timedDelivered / (a.secs / 3600) : 0,
      minPerDelivery: a.timedDelivered && a.secs ? a.secs / 60 / a.timedDelivered : null,
      avgWaitMin: a.waits.length ? a.waits.reduce((x, y) => x + y, 0) / a.waits.length : null,
      drift: a.est ? a.real / a.est : null,
      cost,
      costPerDelivery: cost !== null && a.delivered ? cost / a.delivered : null,
      costPerDish: cost !== null && a.dishes ? cost / a.dishes : null,
    };
  });
  couriers.sort((x, y) => y.delivered - x.delivered);

  // ---------- Por cocina ----------
  const kAcc = new Map<string, { dishes: number; secs: number; timedDishes: number; cookCost: number; deliveries: number; dishesDelivered: number; courierCost: number; courierSecs: number; timedDeliveries: number; stops: number; failed: number }>();
  const k = (id: string) => {
    const v = kAcc.get(id) ?? { dishes: 0, secs: 0, timedDishes: 0, cookCost: 0, deliveries: 0, dishesDelivered: 0, courierCost: 0, courierSecs: 0, timedDeliveries: 0, stops: 0, failed: 0 };
    kAcc.set(id, v);
    return v;
  };
  for (const b of batches) {
    const v = k(b.kitchen_id);
    v.dishes += b.quantity;
    if (timedSecs(b)) {
      v.secs += timedSecs(b);
      v.timedDishes += b.quantity;
    }
  }
  for (const r of routes) {
    const v = k(r.kitchen_id);
    const secs = routeSeconds(r);
    if (secs) {
      v.courierSecs += secs;
      v.timedDeliveries += r.route_stops.filter((s) => s.orders?.status === "entregado").length;
    }
    for (const s of r.route_stops) {
      if (!s.orders) continue;
      v.stops += 1;
      if (s.orders.status === "entregado") {
        v.deliveries += 1;
        v.dishesDelivered += s.orders.order_items.reduce((x, i) => x + i.quantity, 0);
      } else if (s.orders.status === "no_entregado") v.failed += 1;
    }
  }
  // El costo va a la cocina donde está registrado el pago (como en Cuentas).
  for (const [u, kid] of payKitchen) {
    if (kid === "general" || (kitchenId && kid !== kitchenId)) continue;
    k(kid).cookCost += share(u, "cook") ?? 0;
    k(kid).courierCost += share(u, "courier") ?? 0;
  }
  const finishK = (v: ReturnType<typeof k>) => ({
    dishesMade: v.dishes,
    cookSeconds: v.secs,
    cookCost: v.cookCost,
    prepPerDish: v.dishes ? v.cookCost / v.dishes : null,
    perHour: v.secs ? v.timedDishes / (v.secs / 3600) : 0,
    deliveries: v.deliveries,
    dishesDelivered: v.dishesDelivered,
    courierCost: v.courierCost,
    deliveryPerOrder: v.deliveries ? v.courierCost / v.deliveries : null,
    deliveryPerDish: v.dishesDelivered ? v.courierCost / v.dishesDelivered : null,
    deliveriesPerHour: v.courierSecs ? v.timedDeliveries / (v.courierSecs / 3600) : 0,
    failedPct: v.stops ? v.failed / v.stops : null,
  });
  const kitchens: KitchenRow[] = [...kAcc].map(([id, v]) => ({ kitchenId: id, ...finishK(v) }));
  const sum = [...kAcc.values()].reduce(
    (a, v) => ({
      dishes: a.dishes + v.dishes,
      secs: a.secs + v.secs,
      timedDishes: a.timedDishes + v.timedDishes,
      timedDeliveries: a.timedDeliveries + v.timedDeliveries,
      cookCost: a.cookCost + v.cookCost,
      deliveries: a.deliveries + v.deliveries,
      dishesDelivered: a.dishesDelivered + v.dishesDelivered,
      courierCost: a.courierCost + v.courierCost,
      courierSecs: a.courierSecs + v.courierSecs,
      stops: a.stops + v.stops,
      failed: a.failed + v.failed,
    }),
    { dishes: 0, secs: 0, timedDishes: 0, cookCost: 0, deliveries: 0, dishesDelivered: 0, courierCost: 0, courierSecs: 0, timedDeliveries: 0, stops: 0, failed: 0 }
  );
  const total = finishK(sum);

  // ---------- Costo real por plato ----------
  // Mano de obra: costo por segundo de cocina × segundos reales del plato. Domicilio: promedio por plato.
  // Costo de cocina por segundo, repartido sobre todos los platos (también los sin tiempo, al tiempo promedio).
  const avgSec = sum.timedDishes ? sum.secs / sum.timedDishes : 0;
  const costPerSec = avgSec && sum.dishes ? sum.cookCost / (avgSec * sum.dishes) : 0;
  const pAcc = new Map<string, { units: number; cost: number; secs: number; timedUnits: number; priceSum: number; priceUnits: number }>();
  for (const b of batches) {
    const a = pAcc.get(b.name) ?? { units: 0, cost: 0, secs: 0, timedUnits: 0, priceSum: 0, priceUnits: 0 };
    a.units += b.quantity;
    a.cost += Number(b.total_cost);
    if (timedSecs(b)) {
      a.secs += timedSecs(b);
      a.timedUnits += b.quantity;
    }
    for (const l of b.prep_batch_items) {
      if (!l.order_items) continue;
      a.priceSum += l.order_items.unit_price * l.quantity;
      a.priceUnits += l.quantity;
    }
    pAcc.set(b.name, a);
  }
  const products: ProductRow[] = [...pAcc]
    .filter(([, a]) => a.units > 0)
    .map(([name, a]) => {
      const ingredients = a.cost / a.units;
      // Sin tiempos confiables, se usa el promedio de cocina por plato.
      const secPerDish = a.timedUnits ? a.secs / a.timedUnits : sum.timedDishes ? sum.secs / sum.timedDishes : 0;
      const labor = secPerDish * costPerSec;
      const delivery = total.deliveryPerDish ?? 0;
      const price = a.priceUnits ? a.priceSum / a.priceUnits : 0;
      const totalCost = ingredients + labor + delivery;
      return { name, units: a.units, secPerDish, price, ingredients, labor, delivery, total: totalCost, margin: price - totalCost };
    })
    .sort((x, y) => y.units - x.units);

  const unpaid = ids.filter((u) => !payOf.has(u)).map(nameOf);

  return { cooks, couriers, products, kitchens, total, unpaid };
}
