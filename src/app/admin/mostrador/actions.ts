"use server";

import { revalidatePath } from "next/cache";
import { getSession, requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

type Result = { ok?: string; error?: string };

export type CounterLine = { slug: string; quantity: number; options?: string[]; /** De la vitrina (ya preparado). */ stock?: boolean };

function refresh() {
  revalidatePath("/admin/mostrador");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/pedidos", "layout");
}

export async function openCash(kitchenId: string, opening: number): Promise<Result> {
  await requirePermission("counter.sell");
  if (!Number.isFinite(opening) || opening < 0) return { error: "Escribe la base con la que abres la caja." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_cash_session", { p_kitchen_id: kitchenId, p_opening: Math.round(opening) });
  if (error) return { error: dbError(error, "No se pudo abrir la caja.") };
  refresh();
  return { ok: "Caja abierta." };
}

export async function closeCash(sessionId: string, counted: number, note: string): Promise<Result & { difference?: number }> {
  await requirePermission("counter.sell");
  if (!Number.isFinite(counted) || counted < 0) return { error: "Escribe el efectivo que contaste." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_cash_session", { p_session_id: sessionId, p_counted: Math.round(counted), p_note: note.slice(0, 300) });
  if (error) return { error: dbError(error, "No se pudo cerrar la caja.") };
  refresh();
  revalidatePath("/admin/cuentas", "layout");
  const diff = data ?? 0;
  return {
    ok: diff === 0 ? "Caja cerrada: cuadra exacto." : diff > 0 ? `Caja cerrada con sobrante de ${formatPrice(diff)}.` : `Caja cerrada con faltante de ${formatPrice(-diff)}.`,
    difference: diff,
  };
}

/** Crea el pedido en caja y, si se indica el método, lo cobra de una vez. */
export async function sellAtCounter(input: {
  kitchenId: string;
  items: CounterLine[];
  name: string;
  phone: string;
  notes: string;
  methodId?: string | null;
  received?: number | null;
  reference?: string;
}): Promise<Result & { code?: string; orderId?: string; change?: number }> {
  await requirePermission("counter.sell");
  if (!input.items.length) return { error: "Agrega al menos un producto." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("counter_create_order", {
    p_kitchen_id: input.kitchenId,
    p_items: input.items.map((i) => ({ slug: i.slug, quantity: i.quantity, options: i.options ?? [], stock: Boolean(i.stock) })),
    p_name: input.name,
    p_phone: input.phone,
    p_notes: input.notes,
    p_source: "caja",
  });
  if (error || !data?.[0]) return { error: dbError(error, "No se pudo crear el pedido.") };
  const { order_id, order_code } = data[0];
  if (!input.methodId) {
    refresh();
    return { ok: `Pedido ${order_code} creado: queda por cobrar.`, code: order_code, orderId: order_id };
  }
  const charged = await chargeOrder(order_id, input.methodId, input.received ?? null, input.reference ?? "");
  if (charged.error) {
    refresh();
    return { error: `Pedido ${order_code} creado, pero no se cobró: ${charged.error}`, code: order_code, orderId: order_id };
  }
  return { ...charged, code: order_code, orderId: order_id };
}

export async function chargeOrder(orderId: string, methodId: string, received: number | null, reference: string): Promise<Result & { change?: number }> {
  await requirePermission("counter.sell");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("counter_charge", {
    p_order_id: orderId,
    p_method_id: methodId,
    p_received: (received === null ? null : Math.round(received)) as number,
    p_reference: reference.slice(0, 60),
  });
  if (error) return { error: dbError(error, "No se pudo cobrar.") };
  const { data: pay } = await supabase.from("payments").select("change_amount").eq("order_id", orderId).eq("status", "aprobado").maybeSingle();
  refresh();
  const change = pay?.change_amount ?? 0;
  return { ok: change > 0 ? `${data} cobrado. Vuelto: ${formatPrice(change)}.` : `${data} cobrado: pasa a cocina.`, change };
}

export async function deliverCounterOrder(orderId: string): Promise<Result> {
  await requirePermission("counter.sell");
  const supabase = await createClient();
  const { error } = await supabase.rpc("counter_deliver", { p_order_id: orderId });
  if (error) return { error: dbError(error, "No se pudo marcar como entregado.") };
  refresh();
  return { ok: "Pedido entregado." };
}

export async function cancelCounterOrder(orderId: string, note: string): Promise<Result> {
  await requirePermission("counter.sell");
  const supabase = await createClient();
  const { error } = await supabase.rpc("counter_cancel", { p_order_id: orderId, p_note: note.slice(0, 250) });
  if (error) return { error: dbError(error, "No se pudo anular.") };
  refresh();
  return { ok: "Pedido anulado." };
}

/** Pantalla de autoservicio: el cliente arma su pedido y paga en caja. */
export async function placeKioskOrder(input: { kitchenId: string; items: CounterLine[]; name: string }): Promise<Result & { code?: string }> {
  const session = await getSession();
  if (!session || !(session.permissions.has("counter.kiosk") || session.permissions.has("counter.sell"))) {
    return { error: "Esta pantalla no está habilitada para pedidos." };
  }
  if (!input.items.length) return { error: "Agrega al menos un producto." };
  if (input.name.trim().length < 2) return { error: "Escribe tu nombre para llamarte cuando esté listo." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("counter_create_order", {
    p_kitchen_id: input.kitchenId,
    p_items: input.items.map((i) => ({ slug: i.slug, quantity: i.quantity, options: i.options ?? [] })),
    p_name: input.name,
    p_phone: "",
    p_notes: "",
    p_source: "autoservicio",
  });
  if (error || !data?.[0]) return { error: dbError(error, "No se pudo enviar el pedido.") };
  revalidatePath("/admin/mostrador");
  return { ok: "Pedido enviado.", code: data[0].order_code };
}
