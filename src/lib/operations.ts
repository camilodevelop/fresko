import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Unit } from "@/lib/pricing";
import { incidentLabel } from "@/lib/incidents";
import { haversine, SAFETY_SECONDS } from "@/lib/routing";

export type KitchenRow = { id: string; name: string; address: string; lat: number; lng: number; active: boolean };

export async function loadKitchens(): Promise<KitchenRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("kitchens").select("id, name, address, lat, lng, active").order("name");
  return data ?? [];
}

/** Franjas de las zonas que atiende la cocina, en orden de hora. */
export async function loadKitchenSlots(kitchenId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("delivery_slots")
    .select("id, start_time, end_time, zones!inner(id, name, kitchen_id)")
    .eq("zones.kitchen_id", kitchenId)
    .eq("active", true)
    .order("start_time");
  return (data ?? []).map((s) => ({
    id: s.id,
    start: s.start_time.slice(0, 5),
    end: s.end_time.slice(0, 5),
    zoneName: s.zones.name,
  }));
}

export type RecipeLine = { name: string; quantity: number; unit: Unit };

export type BoardItem = {
  orderItemId: string;
  orderCode: string;
  quantity: number;
  /** Opciones del armador (nombres). */
  options: string[];
  /** Unidades de esta línea con una novedad de cocina abierta (faltantes por preparar). */
  shortage: number;
};

export type BoardGroup = {
  /** "lote" agrupa platos iguales; "armado" es un bowl personalizado. */
  kind: "lote" | "armado";
  key: string;
  productId: string | null;
  name: string;
  image: string | null;
  quantity: number;
  orders: number;
  items: BoardItem[];
  recipe: RecipeLine[];
};

export type BoardBatch = {
  id: string;
  name: string;
  kind: "lote" | "armado";
  quantity: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  /** Cocinero que inició la tanda. */
  cook: string | null;
  productId: string | null;
  image: string | null;
  recipe: RecipeLine[];
  items: BoardItem[];
};

export type BoardSlot = {
  slotId: string;
  label: string;
  zoneName: string;
  pending: BoardGroup[];
  active: BoardBatch[];
  done: BoardBatch[];
  ordersTotal: number;
  ordersReady: number;
};

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  options: { id: string; name: string }[];
  product_id: string | null;
  prepared_qty: number;
  prepared_at: string | null;
  products: { image_url: string | null; kind: string } | null;
};

/** Producción del día: pendientes agrupados por plato (armados al final), tandas activas y listas. */
export async function loadKitchenBoard(kitchenId: string, date: string) {
  const supabase = await createClient();
  const slots = await loadKitchenSlots(kitchenId);
  const [{ data: orders }, { data: batches }, { data: stats }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, code, slot_id, status, prepared_at, on_hold, zones!inner(kitchen_id), order_items(id, name, quantity, prepared_qty, options, product_id, prepared_at, products(image_url, kind))")
      .eq("zones.kitchen_id", kitchenId)
      .eq("delivery_date", date)
      .in("status", ["confirmado", "en_preparacion", "en_camino", "entregado"]),
    supabase
      .from("prep_batches")
      .select("id, slot_id, product_id, name, kind, quantity, status, started_at, finished_at, duration_seconds, started_by, prep_batch_items(order_item_id, quantity)")
      .eq("kitchen_id", kitchenId)
      .eq("delivery_date", date)
      .neq("status", "cancelado")
      .order("started_at"),
    supabase.from("prep_stats").select("product_id, kind, seconds_per_unit"),
  ]);

  // Recetas de los productos del día y de las opciones del armador.
  const items = (orders ?? []).flatMap((o) =>
    (o.order_items as unknown as ItemRow[]).map((i) => ({ ...i, orderCode: o.code, slotId: o.slot_id, orderStatus: o.status, onHold: o.on_hold }))
  );
  const itemOf = new Map(items.map((i) => [i.id, i]));
  const cookIds = [...new Set((batches ?? []).map((b) => b.started_by).filter((x): x is string => Boolean(x)))];
  const { data: cooks } = cookIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", cookIds) : { data: [] };
  const cookOf = new Map((cooks ?? []).map((c) => [c.id, c.full_name || c.email]));
  // Unidades en tandas en curso y faltantes con novedad de cocina abierta, por línea.
  const inProgress = new Map<string, number>();
  for (const b of batches ?? []) {
    if (b.status !== "en_preparacion") continue;
    for (const l of b.prep_batch_items) inProgress.set(l.order_item_id, (inProgress.get(l.order_item_id) ?? 0) + l.quantity);
  }
  const { data: openIncidents } = items.length
    ? await supabase.from("order_incidents").select("order_item_id, quantity").eq("stage", "cocina").is("resolution", null).in("order_item_id", items.map((i) => i.id))
    : { data: [] as { order_item_id: string | null; quantity: number | null }[] };
  const shortageOf = new Map<string, number>();
  for (const n of openIncidents ?? []) if (n.order_item_id) shortageOf.set(n.order_item_id, (shortageOf.get(n.order_item_id) ?? 0) + (n.quantity ?? 0));
  const productIds = [...new Set(items.map((i) => i.product_id).filter((x): x is string => Boolean(x)))];
  const optionIds = [...new Set(items.flatMap((i) => (Array.isArray(i.options) ? i.options.map((o) => o.id) : [])))];
  const [{ data: recipes }, { data: options }] = await Promise.all([
    productIds.length
      ? supabase.from("recipe_items").select("product_id, quantity, ingredients(name, unit)").in("product_id", productIds)
      : Promise.resolve({ data: [] as { product_id: string; quantity: number; ingredients: { name: string; unit: string } | null }[] }),
    optionIds.length
      ? supabase.from("builder_options").select("id, name, quantity, ingredients(name, unit)").in("id", optionIds)
      : Promise.resolve({ data: [] as { id: string; name: string; quantity: number; ingredients: { name: string; unit: string } | null }[] }),
  ]);
  const recipeOf = new Map<string, RecipeLine[]>();
  for (const r of recipes ?? []) {
    if (!r.ingredients) continue;
    const list = recipeOf.get(r.product_id) ?? [];
    list.push({ name: r.ingredients.name, quantity: Number(r.quantity), unit: r.ingredients.unit as Unit });
    recipeOf.set(r.product_id, list);
  }
  const optionOf = new Map((options ?? []).map((o) => [o.id, o]));
  const builderRecipe = (opts: { id: string; name: string }[], times: number): RecipeLine[] =>
    opts.map((o) => {
      const opt = optionOf.get(o.id);
      return opt?.ingredients
        ? { name: opt.ingredients.name, quantity: Number(opt.quantity) * times, unit: opt.ingredients.unit as Unit }
        : { name: o.name, quantity: times, unit: "un" as Unit };
    });
  const scale = (lines: RecipeLine[], times: number) => lines.map((l) => ({ ...l, quantity: l.quantity * times }));
  const statOf = new Map((stats ?? []).map((s) => [`${s.kind}:${s.product_id}`, s.seconds_per_unit]));
  const imageOf = new Map(items.filter((i) => i.product_id).map((i) => [i.product_id as string, i.products?.image_url ?? null]));

  const toBoardItem = (i: (typeof items)[number], quantity: number): BoardItem => ({
    orderItemId: i.id,
    orderCode: i.orderCode,
    quantity,
    options: Array.isArray(i.options) ? i.options.map((o) => o.name) : [],
    shortage: shortageOf.get(i.id) ?? 0,
  });
  // Unidades de la línea que faltan por preparar (ni listas ni en una tanda en curso).
  const pendingQty = (i: (typeof items)[number]) => Math.max(0, i.quantity - i.prepared_qty - (inProgress.get(i.id) ?? 0));

  const result: BoardSlot[] = slots.map((slot) => {
    const slotItems = items.filter((i) => i.slotId === slot.id);
    // Los pedidos en espera por una novedad no se preparan hasta que se liberen.
    const pendingItems = slotItems.filter((i) => !i.onHold && (i.orderStatus === "confirmado" || i.orderStatus === "en_preparacion") && pendingQty(i) > 0);

    const fixed = new Map<string, BoardGroup>();
    const built: BoardGroup[] = [];
    for (const i of pendingItems) {
      const isBuilt = Array.isArray(i.options) && i.options.length > 0;
      if (isBuilt) {
        built.push({
          kind: "armado",
          key: i.id,
          productId: i.product_id,
          name: i.name,
          image: i.products?.image_url ?? null,
          quantity: pendingQty(i),
          orders: 1,
          items: [toBoardItem(i, pendingQty(i))],
          recipe: builderRecipe(i.options, pendingQty(i)),
        });
        continue;
      }
      const key = i.product_id ?? i.name;
      const g = fixed.get(key) ?? {
        kind: "lote" as const,
        key,
        productId: i.product_id,
        name: i.name,
        image: i.products?.image_url ?? null,
        quantity: 0,
        orders: 0,
        items: [],
        recipe: [],
      };
      g.quantity += pendingQty(i);
      g.items.push(toBoardItem(i, pendingQty(i)));
      g.orders = new Set(g.items.map((x) => x.orderCode)).size;
      fixed.set(key, g);
    }
    // Prioridad: los platos con más unidades primero; los armados al final, uno a uno.
    const pending = [
      ...[...fixed.values()]
        .map((g) => ({ ...g, recipe: scale(recipeOf.get(g.productId ?? "") ?? [], g.quantity) }))
        .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)),
      ...built,
    ];

    const slotBatches = (batches ?? []).filter((b) => b.slot_id === slot.id);
    const batchView = (b: (typeof slotBatches)[number]): BoardBatch => {
      const its = b.prep_batch_items.flatMap((l) => {
        const i = itemOf.get(l.order_item_id);
        return i ? [{ item: i, quantity: l.quantity }] : [];
      });
      const recipe =
        b.kind === "armado"
          ? builderRecipe(its[0]?.item.options ?? [], b.quantity)
          : scale(recipeOf.get(b.product_id ?? "") ?? [], b.quantity);
      return {
        id: b.id,
        name: b.name,
        kind: b.kind as "lote" | "armado",
        quantity: b.quantity,
        status: b.status,
        startedAt: b.started_at,
        finishedAt: b.finished_at,
        durationSeconds: b.duration_seconds,
        cook: b.started_by ? (cookOf.get(b.started_by) ?? null) : null,
        productId: b.product_id,
        image: b.product_id ? (imageOf.get(b.product_id) ?? null) : null,
        recipe,
        items: its.map((x) => toBoardItem(x.item, x.quantity)),
      };
    };

    const slotOrders = (orders ?? []).filter((o) => o.slot_id === slot.id && !o.on_hold);
    return {
      slotId: slot.id,
      label: `${slot.start} – ${slot.end}`,
      zoneName: slot.zoneName,
      pending,
      active: slotBatches.filter((b) => b.status === "en_preparacion").map(batchView),
      done: slotBatches.filter((b) => b.status === "listo").map(batchView).reverse(),
      ordersTotal: slotOrders.length,
      ordersReady: slotOrders.filter((o) => o.prepared_at).length,
    };
  });

  return { slots: result, avgSeconds: Object.fromEntries(statOf) as Record<string, number | null> };
}

export type RouteStopView = {
  orderId: string;
  code: string;
  position: number;
  eta: string | null;
  status: string;
  prepared: boolean;
  packed: boolean;
  customer: string;
  phone: string;
  address: string;
  details: string;
  label: string;
  lat: number;
  lng: number;
  notes: string;
  dishes: string[];
  /** Platos con sus opciones (armados), para la lista de chequeo del empaque. */
  items: { quantity: number; name: string; options: string[] }[];
  photoPath: string | null;
  deliveredAt: string | null;
  /** El domiciliario revisó que el pedido alistado está correcto. */
  verified: boolean;
  /** Pedido que llegó tarde y se agregó a una canasta ya alistada. */
  addedLate: boolean;
  /** El domiciliario avisó que llegó (empieza la espera). */
  arrivedAt: string | null;
  /** Novedad de entrega (no se pudo entregar), si la hubo. */
  deliveryIncident: { reason: string; note: string; at: string; photoPath: string | null } | null;
  /** Novedad de cocina abierta (faltantes por preparar), p. ej. "Faltan 2 × FRESKO Pollo · Falta de insumo". */
  kitchenIssue: string | null;
};

export type RouteView = {
  id: string;
  slotId: string;
  slotLabel: string;
  courierId: string | null;
  courierName: string;
  status: string;
  method: string;
  distanceM: number;
  durationS: number;
  /** Trazado por las calles (Google), si existe. */
  polyline: string | null;
  startedAt: string | null;
  /** Última parada resuelta (entregada o no entregada). */
  completedAt: string | null;
  /** El domiciliario registró que llegó a la cocina: queda disponible. */
  returnedAt: string | null;
  /** Alguien empezó a alistar la canasta: queda fija (recalcular no la toca). */
  packingStarted: boolean;
  /** Pedidos de la canasta que cocina aún no termina. */
  kitchenPending: number;
  /** Pedidos de toda la franja (en canastas por salir) que cocina aún no termina, sin contar los que tienen novedad: mientras haya, no se alista. */
  slotKitchenPending: number;
  /** Pedidos de esta canasta sin preparar y sin novedad de cocina (los que bloquean). */
  kitchenBlocking: number;
  /** Hora estimada de la última entrega. */
  lastEta: string | null;
  /** Fin de la franja (ISO). */
  slotEnd: string | null;
  kitchen: { name: string; lat: number; lng: number } | null;
  stops: RouteStopView[];
};

const ROUTE_SELECT =
  "id, slot_id, delivery_date, courier_id, status, method, distance_m, duration_s, polyline, started_at, completed_at, returned_at, packing_started_at, kitchens(name, lat, lng), delivery_slots(start_time, end_time), profiles!delivery_routes_courier_id_fkey(full_name, email), route_stops(position, seq, eta, verified_at, added_late, arrived_at, orders(id, code, status, prepared_at, packed_at, contact_name, contact_phone, address_snapshot, notes, delivery_photo_path, delivered_at, order_items(name, quantity, options), order_incidents(stage, quantity, item_name, reason, resolution, note, created_at, photo_path)))";

type RouteRow = {
  id: string;
  slot_id: string;
  delivery_date: string;
  courier_id: string | null;
  status: string;
  method: string;
  distance_m: number;
  duration_s: number;
  polyline: string | null;
  started_at: string | null;
  completed_at: string | null;
  returned_at: string | null;
  packing_started_at: string | null;
  kitchens: { name: string; lat: number; lng: number } | null;
  delivery_slots: { start_time: string; end_time: string } | null;
  profiles: { full_name: string; email: string } | null;
  route_stops: {
    position: number;
    seq: number;
    eta: string | null;
    verified_at: string | null;
    added_late: boolean;
    arrived_at: string | null;
    orders: {
      id: string;
      code: string;
      status: string;
      prepared_at: string | null;
      packed_at: string | null;
      contact_name: string;
      contact_phone: string;
      address_snapshot: { label?: string; address?: string; details?: string; lat?: number; lng?: number };
      notes: string;
      delivery_photo_path: string | null;
      delivered_at: string | null;
      order_items: { name: string; quantity: number; options: { name: string }[] }[];
      order_incidents: {
        stage: string;
        quantity: number | null;
        item_name: string | null;
        reason: string;
        resolution: string | null;
        note: string;
        created_at: string;
        photo_path: string | null;
      }[];
    } | null;
  }[];
};

function toRouteView(r: RouteRow): RouteView {
  return {
    id: r.id,
    slotId: r.slot_id,
    slotLabel: r.delivery_slots ? `${r.delivery_slots.start_time.slice(0, 5)} – ${r.delivery_slots.end_time.slice(0, 5)}` : "",
    courierId: r.courier_id,
    courierName: r.profiles?.full_name || r.profiles?.email || "Sin domiciliario",
    status: r.status,
    method: r.method,
    distanceM: r.distance_m,
    durationS: r.duration_s,
    polyline: r.polyline,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    returnedAt: r.returned_at,
    packingStarted: Boolean(r.packing_started_at),
    lastEta: r.route_stops.reduce<string | null>((m, s) => (s.eta && (!m || s.eta > m) ? s.eta : m), null),
    slotEnd: r.delivery_slots ? new Date(`${r.delivery_date}T${r.delivery_slots.end_time.slice(0, 8)}-05:00`).toISOString() : null,
    kitchenPending: r.route_stops.filter((s) => s.orders && !s.orders.prepared_at && s.orders.status !== "cancelado").length,
    slotKitchenPending: 0,
    kitchenBlocking: r.route_stops.filter(
      (s) => s.orders && !s.orders.prepared_at && s.orders.status !== "cancelado" && !s.orders.order_incidents.some((n) => n.stage === "cocina" && !n.resolution)
    ).length,
    kitchen: r.kitchens,
    stops: r.route_stops
      .filter((s) => s.orders)
      // Orden real de entrega (seq); position es el número impreso en la etiqueta.
      .sort((a, b) => Number(a.seq) - Number(b.seq))
      .map((s) => {
        const o = s.orders!;
        const a = o.address_snapshot ?? {};
        return {
          orderId: o.id,
          code: o.code,
          position: s.position,
          eta: s.eta,
          status: o.status,
          prepared: Boolean(o.prepared_at),
          packed: Boolean(o.packed_at),
          customer: o.contact_name || "Cliente",
          phone: o.contact_phone,
          address: a.address ?? "",
          details: a.details ?? "",
          label: a.label ?? "",
          lat: Number(a.lat),
          lng: Number(a.lng),
          notes: o.notes,
          dishes: o.order_items.map((i) => `${i.quantity}× ${i.name}`),
          items: o.order_items.map((i) => ({ quantity: i.quantity, name: i.name, options: Array.isArray(i.options) ? i.options.map((x) => x.name) : [] })),
          photoPath: o.delivery_photo_path,
          deliveredAt: o.delivered_at,
          verified: Boolean(s.verified_at),
          deliveryIncident:
            o.order_incidents
              .filter((n) => n.stage === "entrega")
              .sort((x, y) => y.created_at.localeCompare(x.created_at))
              .map((n) => ({ reason: n.reason, note: n.note, at: n.created_at, photoPath: n.photo_path }))[0] ?? null,
          arrivedAt: s.arrived_at,
          addedLate: s.added_late,
          kitchenIssue:
            o.order_incidents
              .filter((n) => n.stage === "cocina" && !n.resolution)
              .map((n) => `Faltan ${n.quantity ?? ""} × ${n.item_name ?? "plato"} · ${incidentLabel(n.reason)}`)
              .join(" · ") || null,
        };
      }),
  };
}

export async function loadRoutes(kitchenId: string, date: string): Promise<RouteView[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("delivery_routes").select(ROUTE_SELECT).eq("kitchen_id", kitchenId).eq("delivery_date", date).order("created_at");
  const routes = ((data ?? []) as unknown as RouteRow[]).map(toRouteView);
  // Las canastas se alistan por franja: cuántos pedidos le faltan a cocina en toda la franja.
  const pendingBySlot = new Map<string, number>();
  for (const r of routes) if (r.status === "planificada") pendingBySlot.set(r.slotId, (pendingBySlot.get(r.slotId) ?? 0) + r.kitchenBlocking);
  return routes.map((r) => ({ ...r, slotKitchenPending: pendingBySlot.get(r.slotId) ?? 0 }));
}

export async function loadMyRoutes(userId: string, date: string): Promise<RouteView[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("delivery_routes").select(ROUTE_SELECT).eq("courier_id", userId).eq("delivery_date", date).order("created_at");
  return ((data ?? []) as unknown as RouteRow[]).map(toRouteView);
}

/** Pedidos de la franja que todavía no tienen ruta (para avisar que hay que recalcular). */
export async function countUnrouted(kitchenId: string, date: string) {
  const supabase = await createClient();
  const [{ data: orders }, { data: stops }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, slot_id, zones!inner(kitchen_id), order_incidents(stage, resolution)")
      .eq("zones.kitchen_id", kitchenId)
      .eq("delivery_date", date)
      .eq("on_hold", false)
      .in("status", ["confirmado", "en_preparacion"]),
    supabase.from("delivery_routes").select("route_stops(order_id)").eq("kitchen_id", kitchenId).eq("delivery_date", date),
  ]);
  const routed = new Set((stops ?? []).flatMap((r) => r.route_stops.map((s) => s.order_id)));
  const bySlot: Record<string, number> = {};
  // Sin canasta y sin novedad de cocina abierta (esos no van en canastas hasta prepararse).
  for (const o of orders ?? [])
    if (!routed.has(o.id) && !o.order_incidents.some((n) => n.stage === "cocina" && !n.resolution)) bySlot[o.slot_id] = (bySlot[o.slot_id] ?? 0) + 1;
  return bySlot;
}

export type IncidentView = {
  id: string;
  orderId: string;
  code: string;
  customer: string;
  slotLabel: string;
  slotId: string;
  stage: "cocina" | "alistamiento" | "entrega";
  kitchenName: string | null;
  itemName: string | null;
  quantity: number | null;
  /** Foto de evidencia (entregas), enlace firmado por 1 hora. */
  photoUrl: string | null;
  courier: string | null;
  /** Estado para mostrar: en_espera (alistamiento), por_preparar (cocina), solucionado, liberado o cancelado. */
  state: "en_espera" | "por_preparar" | "solucionado" | "liberado" | "cancelado";
  reason: string;
  note: string;
  resolution: string | null;
  createdAt: string;
  createdBy: string | null;
};

/** Novedades (cocina y alistamiento) de una cocina en un día de entrega. */
/** kitchenId null = todas las cocinas. El día es el de entrega del pedido. */
export async function loadIncidents(kitchenId: string | null, date: string): Promise<IncidentView[]> {
  const supabase = await createClient();
  let query = supabase
    .from("order_incidents")
    .select(
      "id, stage, item_name, quantity, reason, note, resolution, photo_path, created_at, created_by, delivery_routes(profiles!delivery_routes_courier_id_fkey(full_name)), orders!inner(id, code, status, contact_name, slot_id, slot_label, delivery_date, zones!inner(kitchen_id, kitchens(name)))"
    )
    .eq("orders.delivery_date", date)
    .order("created_at", { ascending: false });
  if (kitchenId) query = query.eq("orders.zones.kitchen_id", kitchenId);
  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string;
    stage: "cocina" | "alistamiento" | "entrega";
    item_name: string | null;
    quantity: number | null;
    photo_path: string | null;
    delivery_routes: { profiles: { full_name: string } | null } | null;
    reason: string;
    note: string;
    resolution: string | null;
    created_at: string;
    created_by: string | null;
    orders: { id: string; code: string; status: string; contact_name: string; slot_id: string; slot_label: string; zones: { kitchens: { name: string } | null } | null };
  }[];
  const authors = [...new Set(rows.map((r) => r.created_by).filter((x): x is string => Boolean(x)))];
  const { data: people } = authors.length ? await supabase.from("profiles").select("id, full_name").in("id", authors) : { data: [] };
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const photos = rows.filter((r) => r.photo_path).map((r) => r.photo_path as string);
  const { data: signed } = photos.length ? await supabase.storage.from("delivery-proofs").createSignedUrls(photos, 3600) : { data: [] };
  const urlOf = new Map((signed ?? []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]));
  return rows.map((r) => ({
    id: r.id,
    orderId: r.orders.id,
    code: r.orders.code,
    customer: r.orders.contact_name,
    slotLabel: r.orders.slot_label,
    slotId: r.orders.slot_id,
    kitchenName: r.orders.zones?.kitchens?.name ?? null,
    stage: r.stage,
    itemName: r.item_name,
    quantity: r.quantity,
    photoUrl: r.photo_path ? (urlOf.get(r.photo_path) ?? null) : null,
    courier: r.delivery_routes?.profiles?.full_name ?? null,
    state: (r.resolution ?? (r.orders.status === "cancelado" ? "cancelado" : r.stage === "cocina" ? "por_preparar" : "en_espera")) as IncidentView["state"],
    reason: r.reason,
    note: r.note,
    resolution: r.resolution,
    createdAt: r.created_at,
    createdBy: r.created_by ? (nameOf.get(r.created_by) ?? null) : null,
  }));
}

// ---------------------------------------------------------------------------
// Pedidos que llegan después de alistar
// ---------------------------------------------------------------------------

export type LateOption = {
  routeId: string;
  courierName: string;
  /** Se entrega después de esta posición en el orden de entrega (0 = de primero). */
  afterSeq: number;
  extraMeters: number;
  extraSeconds: number;
  eta: string | null;
  /** Parada que tendrá en el orden de entrega (las siguientes se corren una). */
  labelPosition: number;
  /** Dónde va la bolsa en la canasta (la última entrega va al fondo). */
  placement: string;
  /** La canasta sigue terminando dentro de la franja (con el colchón de 10 min). */
  feasible: boolean;
  /** Hora estimada de la última entrega de la canasta con este pedido. */
  finishEta: string | null;
};

export type LateOrder = { orderId: string; code: string; prepared: boolean; options: LateOption[] };

export type LateSlot = {
  /** Domiciliarios de la franja que aún no tienen canasta alistada: los pedidos nuevos van con ellos. */
  freeCouriers: string[];
  orders: LateOrder[];
  /** Canastas alistadas que ya tienen el máximo de pedidos. */
  fullBaskets: number;
  maxPerBasket: number;
};

// Misma estimación que el cálculo de canastas: calles ≈ 1,35 × línea recta, 22 km/h × la velocidad aprendida de Google.
const roadMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => haversine(a, b) * 1.35;

/**
 * Por franja: pedidos sin canasta, domiciliarios libres y, si no hay libres, la mejor forma de
 * intercalar cada pedido en una canasta ya alistada (la que menos alarga el recorrido).
 */
export async function loadLateOrders(kitchenId: string, date: string): Promise<Record<string, LateSlot>> {
  const supabase = await createClient();
  const [{ data: kitchen }, { data: orders }, { data: routes }, { data: learned }, { data: slotRows }] = await Promise.all([
    supabase.from("kitchens").select("lat, lng").eq("id", kitchenId).single(),
    supabase
      .from("orders")
      .select("id, code, slot_id, zone_id, prepared_at, address_snapshot, route_stops(route_id), order_incidents(stage, resolution), zones!inner(kitchen_id)")
      .eq("zones.kitchen_id", kitchenId)
      .eq("delivery_date", date)
      .eq("on_hold", false)
      .in("status", ["confirmado", "en_preparacion"]),
    supabase
      .from("delivery_routes")
      .select("id, slot_id, courier_id, status, packing_started_at, returned_at, profiles!delivery_routes_courier_id_fkey(full_name, email), route_stops(position, seq, eta, orders(code, address_snapshot, packed_at))")
      .eq("kitchen_id", kitchenId)
      .eq("delivery_date", date),
    supabase.from("settings").select("key, value").in("key", ["routing_speed_factor", "delivery_wait_minutes", "basket_max_orders"]),
    supabase.from("delivery_slots").select("id, end_time"),
  ]);
  if (!kitchen) return {};
  const setting = (k: string) => Number(learned?.find((x) => x.key === k)?.value);
  const factor = setting("routing_speed_factor") > 0 ? setting("routing_speed_factor") : 1.6;
  const SERVICE = (setting("delivery_wait_minutes") > 0 ? setting("delivery_wait_minutes") : 5) * 60;
  const CAP = setting("basket_max_orders") > 0 ? setting("basket_max_orders") : 12;
  const roadSeconds = (m: number) => (m / (22 / 3.6)) * factor;
  const endOf = new Map((slotRows ?? []).map((x) => [x.id, new Date(`${date}T${x.end_time.slice(0, 8)}-05:00`).getTime() - SAFETY_SECONDS * 1000]));
  // Pedidos nuevos sin canasta (los que tienen novedad de cocina abierta no se pueden agregar).
  const late = (orders ?? []).filter((o) => o.route_stops.length === 0 && !o.order_incidents.some((n) => n.stage === "cocina" && !n.resolution));
  if (late.length === 0) return {};

  type RouteRow = {
    id: string;
    slot_id: string;
    courier_id: string | null;
    status: string;
    packing_started_at: string | null;
    returned_at: string | null;
    profiles: { full_name: string; email: string } | null;
    route_stops: { position: number; seq: number; eta: string | null; orders: { code: string; packed_at: string | null; address_snapshot: { lat?: number; lng?: number } } | null }[];
  };
  const allRoutes = (routes ?? []) as unknown as RouteRow[];
  const zoneOf = new Map(late.map((o) => [o.slot_id, o.zone_id]));
  const result: Record<string, LateSlot> = {};

  for (const [slotId, zoneId] of zoneOf) {
    const slotRoutes = allRoutes.filter((r) => r.slot_id === slotId);
    // Ocupados: canasta alistada o en ruta y aún no regresan a la cocina.
    const fixed = new Set(slotRoutes.filter((r) => (r.status !== "planificada" || r.packing_started_at) && !r.returned_at).map((r) => r.courier_id));
    const { data: assigned } = await supabase
      .from("courier_assignments")
      .select("user_id, profiles!inner(full_name, email, active)")
      .eq("zone_id", zoneId)
      .eq("active", true)
      .eq("profiles.active", true)
      .or(`slot_id.is.null,slot_id.eq.${slotId}`);
    const free = new Map<string, string>();
    for (const a of (assigned ?? []) as unknown as { user_id: string; profiles: { full_name: string; email: string } | null }[]) {
      if (!fixed.has(a.user_id)) free.set(a.user_id, a.profiles?.full_name || a.profiles?.email || "Domiciliario");
    }

    // Canastas que ya se están alistando, con cupo y que aún no están listas para salir (todo empacado).
    const readyToLeave = (r: (typeof slotRoutes)[number]) => r.route_stops.length > 0 && r.route_stops.every((s) => s.orders?.packed_at);
    const candidates = slotRoutes.filter((r) => r.status === "planificada" && r.packing_started_at && r.route_stops.length < CAP && !readyToLeave(r));
    const full = slotRoutes.filter((r) => r.status === "planificada" && r.packing_started_at && (r.route_stops.length >= CAP || readyToLeave(r))).length;
    const slotOrders = late.filter((o) => o.slot_id === slotId).map((o) => {
      const a = o.address_snapshot as { lat?: number; lng?: number };
      const point = { lat: Number(a.lat), lng: Number(a.lng) };
      const options: LateOption[] = [];
      if (Number.isFinite(point.lat)) {
        for (const r of candidates) {
          const stops = [...r.route_stops]
            .filter((s) => s.orders)
            .sort((x, y) => Number(x.seq) - Number(y.seq))
            .map((s) => ({ ...s, lat: Number(s.orders!.address_snapshot?.lat), lng: Number(s.orders!.address_snapshot?.lng) }));
          const path = [{ lat: kitchen.lat, lng: kitchen.lng }, ...stops, { lat: kitchen.lat, lng: kitchen.lng }];
          let best: LateOption | null = null;
          for (let i = 0; i < path.length - 1; i++) {
            const extra = roadMeters(path[i], point) + roadMeters(point, path[i + 1]) - roadMeters(path[i], path[i + 1]);
            if (best && extra >= best.extraMeters) continue;
            const prev = i > 0 ? stops[i - 1] : null;
            const next = stops[i] ?? null;
            const legS = roadSeconds(roadMeters(path[i], point));
            const eta = prev?.eta ? new Date(new Date(prev.eta).getTime() + (SERVICE + legS) * 1000).toISOString() : (next?.eta ?? null);
            const extraS = Math.round(roadSeconds(extra) + SERVICE);
            const lastEta = stops[stops.length - 1]?.eta;
            // Si va de último, su llegada es el final; si no, las paradas siguientes se corren extraS.
            const finish = !next ? (eta ? new Date(eta).getTime() : null) : lastEta ? new Date(lastEta).getTime() + extraS * 1000 : null;
            best = {
              routeId: r.id,
              courierName: r.profiles?.full_name || r.profiles?.email || "Domiciliario",
              afterSeq: prev ? Number(prev.seq) : 0,
              extraMeters: Math.round(extra),
              extraSeconds: extraS,
              eta,
              feasible: finish === null || finish <= (endOf.get(slotId) ?? Infinity),
              finishEta: finish ? new Date(finish).toISOString() : null,
              labelPosition: i + 1,
              placement: !prev
                ? "Encima de todo (se entrega de primero)"
                : !next
                  ? `Al fondo, debajo de ${prev.orders!.code} (se entrega de último)`
                  : `Debajo de ${prev.orders!.code} y encima de ${next.orders!.code}`,
            };
          }
          if (best) options.push(best);
        }
        // Primero las que no se pasan de la franja; entre ellas, la que menos alarga el recorrido.
        options.sort((x, y) => Number(y.feasible) - Number(x.feasible) || x.extraSeconds - y.extraSeconds);
      }
      return { orderId: o.id, code: o.code, prepared: Boolean(o.prepared_at), options: options.slice(0, 3) };
    });
    result[slotId] = { freeCouriers: [...free.values()], orders: slotOrders, fullBaskets: full, maxPerBasket: CAP };
  }
  return result;
}

export type SlotCourier = { id: string; name: string };

/** Domiciliarios que pueden llevar canastas en cada franja de la cocina (asignados a la franja o a todas). */
export async function loadSlotCouriers(kitchenId: string): Promise<Record<string, SlotCourier[]>> {
  const supabase = await createClient();
  const { data: slots } = await supabase.from("delivery_slots").select("id, zone_id, zones!inner(kitchen_id)").eq("zones.kitchen_id", kitchenId);
  const zoneIds = [...new Set((slots ?? []).map((x) => x.zone_id))];
  const { data: assigned } = zoneIds.length
    ? await supabase
        .from("courier_assignments")
        .select("user_id, zone_id, slot_id, profiles!inner(full_name, email, active)")
        .in("zone_id", zoneIds)
        .eq("active", true)
        .eq("profiles.active", true)
    : { data: [] };
  const out: Record<string, SlotCourier[]> = {};
  for (const sl of slots ?? []) {
    const list = new Map<string, string>();
    for (const a of (assigned ?? []) as unknown as { user_id: string; zone_id: string; slot_id: string | null; profiles: { full_name: string; email: string } | null }[]) {
      if (a.zone_id === sl.zone_id && (!a.slot_id || a.slot_id === sl.id)) list.set(a.user_id, a.profiles?.full_name || a.profiles?.email || "Domiciliario");
    }
    out[sl.id] = [...list].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name));
  }
  return out;
}

export type SlotKitchenState = {
  /** Pedidos sin preparar y sin novedad: bloquean calcular y alistar. */
  blocking: number;
  /** Pedidos con novedad de cocina abierta: no bloquean y no entran a canastas hasta prepararse. */
  withIncident: number;
};

/** Por franja: pedidos que cocina aún no termina, separando los que tienen novedad registrada. */
export async function countSlotUnprepared(kitchenId: string, date: string): Promise<Record<string, SlotKitchenState>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, slot_id, zones!inner(kitchen_id), order_incidents(stage, resolution)")
    .eq("zones.kitchen_id", kitchenId)
    .eq("delivery_date", date)
    .eq("on_hold", false)
    .is("prepared_at", null)
    .in("status", ["confirmado", "en_preparacion"]);
  const out: Record<string, SlotKitchenState> = {};
  for (const o of (data ?? []) as unknown as { slot_id: string; order_incidents: { stage: string; resolution: string | null }[] }[]) {
    const st = (out[o.slot_id] ??= { blocking: 0, withIncident: 0 });
    if (o.order_incidents.some((n) => n.stage === "cocina" && !n.resolution)) st.withIncident++;
    else st.blocking++;
  }
  return out;
}
