"use server";

import { revalidatePath } from "next/cache";
import { isValidPhoneNumber } from "libphonenumber-js";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/orders";

type Result = { ok?: string; error?: string };

/** Entrega tal como la recibe la base de datos. */
export type DeliveryInput = {
  date: string;
  slotId: string;
  addressId: string;
  notes: string;
  items: { slug: string; quantity: number; options?: string[] }[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toDb(d: DeliveryInput) {
  return {
    date: d.date,
    slot_id: d.slotId,
    address_id: d.addressId,
    notes: (d.notes ?? "").slice(0, 300),
    items: d.items.map((i) => ({ slug: i.slug, quantity: i.quantity, options: i.options ?? [] })),
  };
}

function validDeliveries(list: DeliveryInput[]) {
  return list.every((d) => ISO_DATE.test(d.date) && d.slotId && d.addressId && d.items.length > 0);
}

function refresh(code?: string) {
  revalidatePath("/cuenta", "layout");
  revalidatePath("/admin/pedidos", "layout");
  revalidatePath("/admin/suscripciones", "layout");
  if (code) revalidatePath(`/cuenta/suscripcion/${code}`);
}

export async function purchaseSubscription(input: {
  planId: string;
  phone?: string | null;
  deliveries: DeliveryInput[];
}): Promise<Result & { subscriptionId?: string; code?: string }> {
  const session = await requireSession("/#suscripciones");
  if (session.needsConsent) return { error: "Antes de comprar, acepta los términos y la política de datos vigentes." };
  if (!validDeliveries(input.deliveries)) return { error: "Revisa el calendario: cada entrega necesita fecha, franja, dirección y platos." };
  const supabase = await createClient();
  if (input.phone) {
    if (!/^\+[1-9]\d{7,14}$/.test(input.phone) || !isValidPhoneNumber(input.phone)) return { error: "Ese celular no es válido." };
    const { error } = await supabase.from("profiles").update({ phone: input.phone }).eq("id", session.userId);
    if (error) return { error: "No se pudo guardar tu celular." };
  }
  const { data, error } = await supabase.rpc("purchase_subscription", {
    p_plan_id: input.planId,
    p_deliveries: input.deliveries.map(toDb),
  });
  if (error || !data?.[0]) return { error: dbError(error, "No se pudo crear la suscripción.") };
  refresh();
  return { ok: `Plan ${data[0].subscription_code} creado.`, subscriptionId: data[0].subscription_id, code: data[0].subscription_code };
}

export async function paySubscription(subscriptionId: string, approve: boolean): Promise<Result & { status?: string }> {
  await requireSession("/cuenta/suscripcion");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pay_subscription_simulated", { p_subscription_id: subscriptionId, p_approve: approve });
  if (error) return { error: dbError(error, "No se pudo procesar el pago.") };
  refresh();
  return data === "aprobado"
    ? { ok: "Pago aprobado. ¡Tu plan está activo!", status: data }
    : { error: "El pago fue rechazado. Intenta de nuevo.", status: data ?? "rechazado" };
}

export async function cancelPendingSubscription(subscriptionId: string): Promise<Result> {
  await requireSession("/cuenta/suscripcion");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_subscription", { p_subscription_id: subscriptionId });
  if (error) return { error: dbError(error, "No se pudo descartar la compra.") };
  refresh();
  return { ok: "Compra descartada." };
}

/** Cuánto cuesta programar (orderId null) o cambiar una entrega. */
export async function quoteDelivery(subscriptionId: string, orderId: string | null, items: DeliveryInput["items"]): Promise<Result & { charge?: number }> {
  await requireSession("/cuenta/suscripcion");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("subscription_change_quote", {
    p_subscription_id: subscriptionId,
    p_order_id: orderId as string,
    p_items: items.map((i) => ({ slug: i.slug, quantity: i.quantity, options: i.options ?? [] })),
  });
  if (error) return { error: dbError(error, "No se pudo calcular el valor.") };
  return { charge: data ?? 0 };
}

export async function scheduleDelivery(subscriptionId: string, code: string, delivery: DeliveryInput, pay: boolean): Promise<Result & { charge?: number }> {
  await requireSession("/cuenta/suscripcion");
  if (!validDeliveries([delivery])) return { error: "La entrega necesita fecha, franja, dirección y platos." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("schedule_subscription_delivery", {
    p_subscription_id: subscriptionId,
    p_delivery: toDb(delivery),
    p_pay: pay,
  });
  if (error || !data?.[0]) return { error: dbError(error, "No se pudo programar la entrega.") };
  refresh(code);
  return { ok: `Entrega ${data[0].order_code} programada.`, charge: data[0].charged };
}

export async function updateDelivery(orderId: string, code: string, delivery: DeliveryInput, pay: boolean): Promise<Result & { charge?: number }> {
  await requireSession("/cuenta/suscripcion");
  if (!validDeliveries([delivery])) return { error: "La entrega necesita fecha, franja, dirección y platos." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_subscription_delivery", { p_order_id: orderId, p_delivery: toDb(delivery), p_pay: pay });
  if (error) return { error: dbError(error, "No se pudo cambiar la entrega.") };
  refresh(code);
  return { ok: data ? "Entrega actualizada y diferencia pagada." : "Entrega actualizada.", charge: data ?? 0 };
}

export async function unscheduleDelivery(orderId: string, code: string): Promise<Result> {
  await requireSession("/cuenta/suscripcion");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_subscription_delivery", { p_order_id: orderId });
  if (error) return { error: dbError(error, "No se pudo quitar la entrega.") };
  refresh(code);
  return { ok: "Entrega quitada: los platos volvieron a tu plan." };
}
