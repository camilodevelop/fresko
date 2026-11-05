"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isValidPhoneNumber } from "libphonenumber-js";
import { dbError } from "@/lib/orders";

export type PlaceOrderInput = {
  /** Celular en E.164 si el cliente aún no tenía uno guardado. */
  phone?: string | null;
  addressId: string;
  date: string;
  slotId: string;
  notes: string;
  items: { slug: string; quantity: number; options?: string[] }[];
};

export async function placeOrder(input: PlaceOrderInput): Promise<{ ok?: string; error?: string; orderId?: string; code?: string }> {
  const session = await requireSession("/carrito");
  if (session.needsConsent) return { error: "Antes de pedir, acepta los términos y la política de datos vigentes." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Elige la fecha de entrega." };
  const supabase = await createClient();
  if (input.phone) {
    if (!/^\+[1-9]\d{7,14}$/.test(input.phone) || !isValidPhoneNumber(input.phone)) return { error: "Ese celular no es válido." };
    const { error: phoneError } = await supabase.from("profiles").update({ phone: input.phone }).eq("id", session.userId);
    if (phoneError) return { error: "No se pudo guardar tu celular." };
  }
  const { data, error } = await supabase.rpc("place_order", {
    p_address_id: input.addressId,
    p_date: input.date,
    p_slot_id: input.slotId,
    p_items: input.items.map((i) => ({ slug: i.slug, quantity: i.quantity, options: i.options ?? [] })),
    p_notes: input.notes.slice(0, 300),
  });
  if (error || !data?.[0]) return { error: dbError(error, "No se pudo crear el pedido.") };
  revalidatePath("/cuenta", "layout");
  revalidatePath("/admin/pedidos");
  return { ok: `Pedido ${data[0].order_code} creado.`, orderId: data[0].order_id, code: data[0].order_code };
}

export async function payOrder(orderId: string, approve: boolean): Promise<{ ok?: string; error?: string; status?: string }> {
  await requireSession("/cuenta/pedidos");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pay_order_simulated", { p_order_id: orderId, p_approve: approve });
  if (error) return { error: dbError(error, "No se pudo procesar el pago.") };
  revalidatePath("/cuenta", "layout");
  revalidatePath("/admin/pedidos", "layout");
  return data === "aprobado"
    ? { ok: "Pago aprobado. ¡Tu pedido está confirmado!", status: data }
    : { error: "El pago fue rechazado. Intenta de nuevo.", status: data ?? "rechazado" };
}

export async function cancelMyOrder(orderId: string): Promise<{ ok?: string; error?: string }> {
  await requireSession("/cuenta/pedidos");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) return { error: dbError(error, "No se pudo cancelar el pedido.") };
  revalidatePath("/cuenta", "layout");
  revalidatePath("/admin/pedidos", "layout");
  return { ok: "Pedido cancelado." };
}

const STATUS_DONE: Record<string, string> = {
  en_preparacion: "Pedido en preparación.",
  en_camino: "Pedido en camino.",
  entregado: "Pedido entregado.",
  cancelado: "Pedido cancelado.",
};

export async function setOrderStatus(orderId: string, status: string, note = ""): Promise<{ ok?: string; error?: string }> {
  await requirePermission("orders.manage");
  if (status === "cancelado" && !note.trim()) return { error: "Escribe el motivo de la cancelación." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", { p_order_id: orderId, p_status: status, p_note: note });
  if (error) return { error: dbError(error, "No se pudo cambiar el estado.") };
  revalidatePath("/admin/pedidos", "layout");
  revalidatePath("/cuenta", "layout");
  return { ok: STATUS_DONE[status] ?? "Estado actualizado." };
}
