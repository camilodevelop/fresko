"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

type Result = { ok?: string; error?: string };

function refresh() {
  revalidatePath("/admin/punto");
  revalidatePath("/admin/puntos");
  revalidatePath("/admin/cuentas", "layout");
}

export async function receiveLoad(loadId: string, items: { productId: string; quantity: number }[]): Promise<Result> {
  await requirePermission("points.sell");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("receive_point_load", {
    p_load_id: loadId,
    p_items: items.map((i) => ({ product_id: i.productId, quantity: Math.max(0, Math.round(i.quantity)) })),
  });
  if (error) return { error: dbError(error, "No se pudo recibir la carga.") };
  refresh();
  return { ok: data ? `Carga recibida. Quedó registrado que faltaron ${data} platos.` : "Carga recibida completa." };
}

export async function setTransport(loadId: string, amount: number, fromCash: boolean, note: string): Promise<Result> {
  await requirePermission("points.sell");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_point_transport", { p_load_id: loadId, p_amount: Math.round(amount), p_from_cash: fromCash, p_note: note.slice(0, 80) });
  if (error) return { error: dbError(error, "No se pudo guardar el transporte.") };
  refresh();
  return { ok: amount > 0 ? `Transporte de ${formatPrice(amount)} registrado en gastos.` : "Transporte quitado." };
}

export async function openPointCash(pointId: string, opening: number): Promise<Result> {
  await requirePermission("points.sell");
  if (!Number.isFinite(opening) || opening < 0) return { error: "Escribe la base con la que abres la caja." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_point_cash", { p_point_id: pointId, p_opening: Math.round(opening) });
  if (error) return { error: dbError(error, "No se pudo abrir la caja.") };
  refresh();
  return { ok: "Caja abierta." };
}

export async function sellAtPoint(input: {
  pointId: string;
  items: { productId: string; quantity: number }[];
  methodId: string;
  received: number | null;
  reference: string;
}): Promise<Result & { change?: number }> {
  await requirePermission("points.sell");
  if (!input.items.length) return { error: "Elige al menos un plato." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("point_sell", {
    p_point_id: input.pointId,
    p_items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_method_id: input.methodId,
    p_received: (input.received === null ? null : Math.round(input.received)) as number,
    p_reference: input.reference.slice(0, 60),
  });
  if (error || !data) return { error: dbError(error, "No se pudo registrar la venta.") };
  const { data: pay } = await supabase.from("payments").select("change_amount, orders!inner(code)").eq("orders.code", data).eq("status", "aprobado").maybeSingle();
  refresh();
  const change = pay?.change_amount ?? 0;
  return { ok: change > 0 ? `Venta ${data}. Vuelto: ${formatPrice(change)}.` : `Venta ${data} registrada.`, change };
}

export async function cancelPointSale(orderId: string, note: string): Promise<Result> {
  await requirePermission("points.sell");
  const supabase = await createClient();
  const { error } = await supabase.rpc("point_cancel_sale", { p_order_id: orderId, p_note: note });
  if (error) return { error: dbError(error, "No se pudo anular.") };
  refresh();
  return { ok: "Venta anulada: los platos volvieron al punto." };
}

export async function closeLoad(loadId: string, items: { productId: string; returned: number; staff: number; donated: number; lost: number }[]): Promise<Result> {
  await requirePermission("points.sell");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_point_load", {
    p_load_id: loadId,
    p_items: items.map((i) => ({ product_id: i.productId, returned: i.returned, staff: i.staff, donated: i.donated, lost: i.lost })),
  });
  if (error) return { error: dbError(error, "No se pudo cerrar el punto.") };
  refresh();
  revalidatePath("/admin/mostrador");
  return { ok: data ? `Punto cerrado. Faltaron ${data} platos en el conteo.` : "Punto cerrado. Ahora cierra la caja." };
}

export async function closePointCash(sessionId: string, counted: number, note: string): Promise<Result> {
  await requirePermission("points.sell");
  if (!Number.isFinite(counted) || counted < 0) return { error: "Escribe el efectivo que contaste." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_cash_session", { p_session_id: sessionId, p_counted: Math.round(counted), p_note: note.slice(0, 300) });
  if (error) return { error: dbError(error, "No se pudo cerrar la caja.") };
  refresh();
  const diff = data ?? 0;
  return { ok: diff === 0 ? "Caja cerrada: cuadra exacto." : diff > 0 ? `Caja cerrada con sobrante de ${formatPrice(diff)}.` : `Caja cerrada con faltante de ${formatPrice(-diff)}.` };
}
