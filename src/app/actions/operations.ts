"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/orders";
import { planMinimalRoutes, SAFETY_SECONDS, type Stop } from "@/lib/routing";

type Result = { ok?: string; error?: string };

function refreshOps() {
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/alistamiento");
  revalidatePath("/admin/rutas");
  revalidatePath("/admin/novedades");
  revalidatePath("/admin/pedidos", "layout");
  revalidatePath("/cuenta", "layout");
}

// ---------------------------------------------------------------------------
// Cocina
// ---------------------------------------------------------------------------

export async function startBatch(input: { kitchenId: string; date: string; slotId: string; productId: string | null; orderItemId?: string | null }): Promise<Result & { batchId?: string }> {
  await requirePermission("kitchen.prepare");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_prep_batch", {
    p_kitchen_id: input.kitchenId,
    p_date: input.date,
    p_slot_id: input.slotId,
    p_product_id: input.productId as string,
    p_order_item_id: (input.orderItemId ?? null) as string,
  });
  if (error || !data) return { error: dbError(error, "No se pudo iniciar la preparación.") };
  refreshOps();
  return { ok: "Preparación iniciada.", batchId: data };
}

export async function finishBatch(batchId: string): Promise<Result & { seconds?: number }> {
  await requirePermission("kitchen.prepare");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finish_prep_batch", { p_batch_id: batchId });
  if (error) return { error: dbError(error, "No se pudo terminar la preparación.") };
  refreshOps();
  return { ok: "¡Listo! Imprime las etiquetas.", seconds: data ?? 0 };
}

export async function cancelBatch(batchId: string): Promise<Result> {
  await requirePermission("kitchen.prepare");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_prep_batch", { p_batch_id: batchId });
  if (error) return { error: dbError(error, "No se pudo cancelar.") };
  refreshOps();
  return { ok: "Preparación cancelada: los platos volvieron a pendientes." };
}

// ---------------------------------------------------------------------------
// Empaque (alistamiento)
// ---------------------------------------------------------------------------

export async function packOrder(orderId: string, packed = true): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("pack_order", { p_order_id: orderId, p_packed: packed });
  if (error) return { error: dbError(error, "No se pudo marcar el pedido.") };
  refreshOps();
  return { ok: packed ? "Pedido empacado." : "Empaque deshecho." };
}

/** Novedad: el pedido no se pudo empacar; sale de la ruta y queda en espera. */
export async function reportIncident(orderId: string, reason: string, note: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_packing_incident", { p_order_id: orderId, p_reason: reason, p_note: note.trim() });
  if (error) return { error: dbError(error, "No se pudo registrar la novedad.") };
  refreshOps();
  return { ok: "Novedad registrada." };
}

/** Novedad en cocina: unidades que no se pudieron preparar; vuelven a pendientes y la cocina sigue. */
export async function reportKitchenIncident(orderItemId: string, quantity: number, reason: string, note: string): Promise<Result> {
  await requirePermission("kitchen.prepare");
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_kitchen_incident", { p_order_item_id: orderItemId, p_quantity: quantity, p_reason: reason, p_note: note.trim() });
  if (error) return { error: dbError(error, "No se pudo registrar la novedad.") };
  refreshOps();
  return { ok: "Novedad registrada." };
}

/** Cocina cierra la franja sin terminar: los pedidos con platos faltantes quedan en espera. */
export async function closeKitchenSlot(kitchenId: string, date: string, slotId: string, reason: string, note: string): Promise<Result & { count?: number }> {
  await requirePermission("kitchen.prepare");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_kitchen_slot", { p_kitchen_id: kitchenId, p_date: date, p_slot_id: slotId, p_reason: reason, p_note: note.trim() });
  if (error) return { error: dbError(error, "No se pudo cerrar la preparación.") };
  refreshOps();
  const n = data ?? 0;
  return { ok: n ? `Preparación cerrada: ${n} ${n === 1 ? "pedido quedó" : "pedidos quedaron"} en espera con su novedad.` : "Preparación cerrada.", count: n };
}

/** El equipo de pedidos libera el pedido para una nueva ruta o lo cancela. */
export async function resolveIncident(orderId: string, resolution: "liberado" | "cancelado", note = ""): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_order_incident", { p_order_id: orderId, p_resolution: resolution, p_note: note });
  if (error) return { error: dbError(error, "No se pudo resolver la novedad.") };
  refreshOps();
  return { ok: resolution === "liberado" ? "Pedido liberado: aparece en Alistamiento como pedido sin canasta." : "Pedido cancelado." };
}

export async function packRoute(routeId: string): Promise<Result & { count?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pack_route_orders", { p_route_id: routeId });
  if (error) return { error: dbError(error, "No se pudo empacar la canasta.") };
  refreshOps();
  return { ok: `${data ?? 0} ${data === 1 ? "pedido empacado" : "pedidos empacados"}.`, count: data ?? 0 };
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

/**
 * Calcula las canastas de una franja: solo las necesarias para entregar todo dentro de la franja
 * (trayecto óptimo + 5 min por entrega) y les asigna domiciliario. Los demás quedan libres para
 * pedidos nuevos. Las canastas ya alistadas o en camino no se tocan.
 */
export async function planSlotRoutes(kitchenId: string, date: string, slotId: string): Promise<Result & { method?: string }> {
  const session = await getSession();
  if (!session || !(session.permissions.has("kitchen.prepare") || session.permissions.has("orders.manage"))) {
    return { error: "No tienes permiso para planear rutas." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha inválida." };
  const supabase = await createClient();

  const [{ data: kitchen }, { data: slot }, { data: orders }, { data: existing }] = await Promise.all([
    supabase.from("kitchens").select("id, lat, lng").eq("id", kitchenId).single(),
    supabase.from("delivery_slots").select("id, zone_id, start_time, end_time").eq("id", slotId).single(),
    supabase
      .from("orders")
      .select("id, zone_id, address_snapshot, zones!inner(kitchen_id)")
      .eq("zones.kitchen_id", kitchenId)
      .eq("delivery_date", date)
      .eq("slot_id", slotId)
      .eq("on_hold", false)
      .in("status", ["confirmado", "en_preparacion"]),
    supabase
      .from("delivery_routes")
      .select("courier_id, status, packing_started_at, returned_at, created_at, route_stops(order_id)")
      .eq("kitchen_id", kitchenId)
      .eq("delivery_date", date)
      .eq("slot_id", slotId)
      .order("created_at"),
  ]);
  if (!kitchen || !slot) return { error: "Cocina o franja no encontrada." };

  // Canastas fijas: ya salieron o alguien empezó a alistarlas. Sus pedidos y su domiciliario no se tocan.
  const fixed = (existing ?? []).filter((r) => r.status !== "planificada" || r.packing_started_at);
  const taken = new Set(fixed.flatMap((r) => r.route_stops.map((x) => x.order_id)));
  const stops: Stop[] = (orders ?? [])
    .filter((o) => !taken.has(o.id))
    .map((o) => {
      const a = o.address_snapshot as { lat: number; lng: number };
      return { id: o.id, lat: Number(a.lat), lng: Number(a.lng) };
    })
    .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
  if (stops.length === 0) return { error: "No hay pedidos nuevos para armar canastas en esta franja." };

  // Ventana: sale al inicio de la franja (o en 10 min si ya empezó) y la última entrega llega antes del fin.
  const slotStart = new Date(`${date}T${slot.start_time.slice(0, 8)}-05:00`).getTime();
  const slotEnd = new Date(`${date}T${slot.end_time.slice(0, 8)}-05:00`).getTime();
  const departure = Math.max(slotStart, Date.now() + 10 * 60_000);
  // Colchón de 10 min por imprevistos: la última entrega debe llegar antes de eso.
  const windowSeconds = Math.round((slotEnd - departure) / 1000) - SAFETY_SECONDS;
  if (windowSeconds <= 0) return { error: "Esta franja ya terminó: no se pueden armar canastas nuevas." };

  // Domiciliarios libres: asignados a la zona (a esta franja o a todas) y sin canasta fija en la franja.
  const { data: couriers } = await supabase
    .from("courier_assignments")
    .select("user_id, slot_id, profiles!inner(full_name, email, active)")
    .eq("zone_id", slot.zone_id)
    .eq("active", true)
    .eq("profiles.active", true)
    .or(`slot_id.is.null,slot_id.eq.${slotId}`);
  // Ocupados: tienen canasta alistada o en ruta y no han regresado a la cocina.
  const busy = new Set(fixed.filter((r) => !r.returned_at).map((r) => r.courier_id).filter(Boolean));
  // Primero los que ya tenían canasta sin alistar (respeta lo que se eligió a mano), luego los de esta franja y luego los de todas.
  const previous = (existing ?? []).filter((r) => r.status === "planificada" && !r.packing_started_at).map((r) => r.courier_id);
  const nameOf = new Map((couriers ?? []).map((c) => [c.user_id, (c.profiles as { full_name: string; email: string } | null)?.full_name || "Domiciliario"]));
  const free = [...new Set([...previous.filter((id): id is string => Boolean(id) && nameOf.has(id as string)), ...(couriers ?? []).sort((x, y) => Number(!x.slot_id) - Number(!y.slot_id)).map((c) => c.user_id)])].filter(
    (id) => !busy.has(id)
  );

  const { data: cfg } = await supabase.from("settings").select("key, value").in("key", ["routing_speed_factor", "delivery_wait_minutes"]);
  const setting = (k: string) => Number(cfg?.find((x) => x.key === k)?.value);
  const learnedFactor = setting("routing_speed_factor") > 0 ? setting("routing_speed_factor") : 1.6;
  // Cada parada cuenta con los minutos de espera configurados.
  const svc = (setting("delivery_wait_minutes") > 0 ? setting("delivery_wait_minutes") : 5) * 60;
  const plan = await planMinimalRoutes({ lat: kitchen.lat, lng: kitchen.lng }, stops, windowSeconds, process.env.GOOGLE_MAPS_API_KEY, learnedFactor, svc);
  if (plan.measured) await supabase.rpc("record_routing_factor", { p_measured: plan.measured });
  // Las canastas más largas primero, para los primeros domiciliarios.
  const order = plan.routes.map((r, i) => ({ r, finish: plan.finishSeconds[i] })).sort((x, y) => y.r.stops.length - x.r.stops.length);

  const payload = order.map(({ r }, i) => {
    let t = departure;
    return {
      courier_id: free[i] ?? "",
      method: r.method,
      distance_m: r.distanceMeters,
      duration_s: r.durationSeconds + r.stops.length * svc,
      polyline: r.polyline ?? "",
      stops: r.stops.map((x, k) => {
        t += (x.legSeconds + (k > 0 ? svc : 0)) * 1000;
        return { order_id: x.id, eta: new Date(t).toISOString() };
      }),
    };
  });

  const { error } = await supabase.rpc("save_delivery_routes", { p_kitchen_id: kitchenId, p_date: date, p_slot_id: slotId, p_routes: payload });
  if (error) return { error: dbError(error, "No se pudieron guardar las canastas.") };
  refreshOps();

  const n = payload.length;
  const unassigned = Math.max(0, n - free.length);
  const left = free.slice(n).map((id) => nameOf.get(id) ?? "Domiciliario");
  const late = order.filter((x) => x.finish > windowSeconds).length;
  const method = plan.routes.every((r) => r.method === "google") ? "google" : plan.routes.some((r) => r.method === "google") ? "mixto" : "local";
  const parts = [
    `${stops.length} ${stops.length === 1 ? "pedido" : "pedidos"} en ${n} ${n === 1 ? "canasta" : "canastas"}`,
    unassigned ? `faltan ${unassigned} ${unassigned === 1 ? "domiciliario" : "domiciliarios"}: asígnalos en cada canasta` : left.length ? `libres: ${left.join(", ")}` : "",
    late ? `${late} ${late === 1 ? "pedido no alcanza" : "pedidos no alcanzan"} a llegar en la franja (muy lejos)` : "",
  ].filter(Boolean);
  return { ok: `${parts.join(" · ")}.`, method };
}

/** Cambia el domiciliario de una canasta que aún no sale. */
export async function setRouteCourier(routeId: string, courierId: string | null): Promise<Result & { reprint?: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_route_courier", { p_route_id: routeId, p_courier_id: courierId as string });
  if (error) return { error: dbError(error, "No se pudo cambiar el domiciliario.") };
  refreshOps();
  return data
    ? { ok: "Domiciliario cambiado. Las etiquetas de esta canasta ya estaban impresas: vuelve a imprimirlas.", reprint: true }
    : { ok: courierId ? "Domiciliario asignado." : "Canasta sin domiciliario." };
}

/** Agrega un pedido tardío a una canasta ya alistada sin mover las demás paradas. */
export async function addLateOrder(input: { routeId: string; orderId: string; afterSeq: number; extraMeters: number; extraSeconds: number; eta: string | null }): Promise<Result & { position?: number }> {
  await requirePermission("kitchen.prepare");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_order_to_route", {
    p_route_id: input.routeId,
    p_order_id: input.orderId,
    p_after_seq: input.afterSeq,
    p_extra_m: input.extraMeters,
    p_extra_s: input.extraSeconds,
    p_eta: input.eta as string,
  });
  if (error) return { error: dbError(error, "No se pudo agregar el pedido a la canasta.") };
  refreshOps();
  return { ok: `Agregado como parada ${data}. Imprime su etiqueta y ponlo en la canasta.`, position: data ?? undefined };
}

/** El domiciliario confirma (o quita) que el pedido alistado está correcto. */
export async function verifyStop(orderId: string, ok: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_route_stop", { p_order_id: orderId, p_ok: ok });
  if (error) return { error: dbError(error, "No se pudo verificar.") };
  revalidatePath("/admin/rutas");
  revalidatePath("/admin/alistamiento");
  return { ok: ok ? "Verificado." : "Verificación quitada." };
}

/** El domiciliario confirma de una vez todos los pedidos alistados de su canasta. */
export async function verifyRouteAll(routeId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_route_all", { p_route_id: routeId });
  if (error) return { error: dbError(error, "No se pudo verificar.") };
  revalidatePath("/admin/rutas");
  revalidatePath("/admin/alistamiento");
  const n = data ?? 0;
  return { ok: n ? `${n} ${n === 1 ? "pedido revisado" : "pedidos revisados"}.` : "Ya estaba todo revisado." };
}

export async function startRoute(routeId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_delivery_route", { p_route_id: routeId });
  if (error) return { error: dbError(error, "No se pudo iniciar la ruta.") };
  refreshOps();
  return { ok: "¡En ruta! Los clientes ya saben que su pedido va en camino." };
}

/** El domiciliario no pudo entregar: el pedido queda "no entregado" y en espera; sigue su ruta. */
export async function reportDeliveryIncident(orderId: string, reason: string, note: string, photoPath: string | null): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_delivery_incident", { p_order_id: orderId, p_reason: reason, p_note: note.trim(), p_photo_path: photoPath as string });
  if (error) return { error: dbError(error, "No se pudo registrar la novedad.") };
  refreshOps();
  revalidatePath("/admin/novedades");
  return { ok: "Novedad registrada. Sigue con tu ruta y regresa el pedido a la cocina." };
}

/** El domiciliario llegó: se notifica al cliente y empieza la espera. */
export async function markArrived(orderId: string): Promise<Result & { arrivedAt?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_arrived", { p_order_id: orderId });
  if (error) return { error: dbError(error, "No se pudo avisar al cliente.") };
  revalidatePath("/admin/rutas");
  return { ok: "Le avisamos al cliente que llegaste.", arrivedAt: data ?? undefined };
}

/** El domiciliario llegó a la cocina: cierra la ruta y queda disponible para otra canasta. */
export async function returnToKitchen(routeId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_to_kitchen", { p_route_id: routeId });
  if (error) return { error: dbError(error, "No se pudo registrar el regreso.") };
  refreshOps();
  return { ok: "Regreso registrado: quedas disponible para otra canasta." };
}

/** Minutos de espera en la entrega (Configuración → Operación). */
export async function setDeliveryWait(minutes: number): Promise<Result> {
  await requirePermission("zones.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_delivery_wait_minutes", { p_minutes: Math.round(minutes) });
  if (error) return { error: dbError(error, "No se pudo guardar.") };
  revalidatePath("/admin/operacion");
  revalidatePath("/admin/rutas");
  return { ok: `Espera en la entrega: ${Math.round(minutes)} min.` };
}

export async function deliverOrder(orderId: string, photoPath: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("deliver_order", { p_order_id: orderId, p_photo_path: photoPath });
  if (error) return { error: dbError(error, "No se pudo marcar la entrega.") };
  refreshOps();
  return { ok: "Pedido entregado." };
}

// ---------------------------------------------------------------------------
// Configuración: cocinas y domiciliarios
// ---------------------------------------------------------------------------

export type KitchenInput = { id?: string; name: string; address: string; lat: number; lng: number; active: boolean };

export async function saveKitchen(input: KitchenInput): Promise<Result> {
  await requirePermission("zones.manage");
  const name = input.name.trim();
  if (name.length < 3) return { error: "Escribe el nombre de la cocina." };
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return { error: "Ubica la cocina en el mapa." };
  const supabase = await createClient();
  const row = { name, address: input.address.trim(), lat: input.lat, lng: input.lng, active: input.active, updated_at: new Date().toISOString() };
  const { error } = input.id ? await supabase.from("kitchens").update(row).eq("id", input.id) : await supabase.from("kitchens").insert(row);
  if (error) return { error: error.code === "23505" ? "Ya existe una cocina con ese nombre." : "No se pudo guardar la cocina." };
  revalidatePath("/admin/operacion");
  return { ok: input.id ? "Cocina actualizada." : "Cocina creada." };
}

export async function setZoneKitchen(zoneId: string, kitchenId: string | null): Promise<Result> {
  await requirePermission("zones.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("zones").update({ kitchen_id: kitchenId }).eq("id", zoneId);
  if (error) return { error: "No se pudo asignar la cocina." };
  revalidatePath("/admin/operacion");
  return { ok: "Zona asignada." };
}

/** Activa o quita un domiciliario de una zona/franja (slotId null = todas las franjas). */
export async function setCourierAssignment(userId: string, zoneId: string, slotId: string | null, assigned: boolean): Promise<Result> {
  await requirePermission("zones.manage");
  const supabase = await createClient();
  let query = supabase.from("courier_assignments").delete().eq("user_id", userId).eq("zone_id", zoneId);
  query = slotId ? query.eq("slot_id", slotId) : query.is("slot_id", null);
  const { error: delError } = await query;
  if (delError) return { error: "No se pudo actualizar." };
  if (assigned) {
    const { error } = await supabase.from("courier_assignments").insert({ user_id: userId, zone_id: zoneId, slot_id: slotId });
    if (error) return { error: "No se pudo asignar." };
  }
  revalidatePath("/admin/operacion");
  return { ok: assigned ? "Domiciliario asignado." : "Asignación quitada." };
}
