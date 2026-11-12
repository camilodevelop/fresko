"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { ok?: string; error?: string };

function refresh() {
  revalidatePath("/admin/operacion", "layout");
  revalidatePath("/admin/ajustes-venta", "layout");
  revalidatePath("/admin/mostrador");
  revalidatePath("/autoservicio");
}

export type PaymentMethodInput = { id?: string; name: string; kind: "efectivo" | "digital"; needsReference: boolean; active: boolean; sort: number };

export async function savePaymentMethod(input: PaymentMethodInput): Promise<Result> {
  await requirePermission("catalog.manage");
  const name = input.name.trim();
  if (name.length < 2 || name.length > 40) return { error: "Escribe el nombre del método (2 a 40 letras)." };
  const supabase = await createClient();
  const row = { name, kind: input.kind, needs_reference: input.needsReference, active: input.active, sort: Math.round(input.sort) || 0 };
  const { error } = input.id
    ? await supabase.from("payment_methods").update(row).eq("id", input.id)
    : await supabase.from("payment_methods").insert(row);
  if (error) return { error: error.code === "23505" ? "Ya existe un método con ese nombre." : "No se pudo guardar el método." };
  refresh();
  return { ok: input.id ? "Método actualizado." : `${name} agregado.` };
}

/** Precio de un producto en un canal; null = usa el precio de la web. */
export async function setChannelPrice(productId: string, channel: "mostrador" | "punto", price: number | null): Promise<Result> {
  await requirePermission("catalog.manage");
  const supabase = await createClient();
  if (price === null) {
    const { error } = await supabase.from("product_channel_prices").delete().eq("product_id", productId).eq("channel", channel);
    if (error) return { error: "No se pudo quitar el precio." };
  } else {
    if (!Number.isFinite(price) || price <= 0) return { error: "Escribe un precio válido." };
    const { error } = await supabase
      .from("product_channel_prices")
      .upsert({ product_id: productId, channel, price: Math.round(price), updated_at: new Date().toISOString() });
    if (error) return { error: "No se pudo guardar el precio." };
  }
  refresh();
  return { ok: price === null ? "Usará el precio de la web." : "Precio guardado." };
}

/** Vida útil por defecto y desde cuándo un plato ya no vuelve a cocina (horas). */
export async function saveShelfSettings(shelfLife: number, nearExpiry: number): Promise<Result> {
  await requirePermission("catalog.manage");
  if (!Number.isInteger(shelfLife) || shelfLife < 1 || shelfLife > 240) return { error: "La vida útil debe estar entre 1 y 240 horas." };
  if (!Number.isInteger(nearExpiry) || nearExpiry < 0 || nearExpiry >= shelfLife) return { error: "“Próximo a vencer” debe ser menor que la vida útil." };
  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert([
    { key: "shelf_life_hours", value: shelfLife, description: "Vida útil por defecto de un plato preparado (horas)", updated_at: new Date().toISOString() },
    { key: "near_expiry_hours", value: nearExpiry, description: "Si a un plato le quedan menos horas de vida útil, ya no vuelve a cocina al cerrar un punto", updated_at: new Date().toISOString() },
  ]);
  if (error) return { error: "No se pudo guardar." };
  refresh();
  revalidatePath("/admin/puntos");
  revalidatePath("/admin/punto");
  return { ok: "Vida útil guardada." };
}

/** Si el plato se lleva a puntos y su vida útil propia (null = la general). */
export async function setProductPointSettings(productId: string, soldAtPoints: boolean, shelfLife: number | null): Promise<Result> {
  await requirePermission("catalog.manage");
  if (shelfLife !== null && (!Number.isInteger(shelfLife) || shelfLife < 1 || shelfLife > 240)) return { error: "La vida útil debe estar entre 1 y 240 horas." };
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ sold_at_points: soldAtPoints, shelf_life_hours: shelfLife }).eq("id", productId);
  if (error) return { error: "No se pudo guardar." };
  refresh();
  revalidatePath("/admin/puntos");
  return { ok: "Guardado." };
}

/** Las tasas aplican a todas las cocinas: las cambia quien administra catálogo y cuentas de todas. */
async function requireTaxAdmin() {
  const session = await requirePermission("finance.manage");
  if (!session.permissions.has("catalog.manage") || !session.allKitchens) forbidden();
  return session;
}

function refreshTaxes() {
  revalidatePath("/admin/ajustes-venta", "layout");
  revalidatePath("/admin/cuentas", "layout");
}

// ---------- Impuestos (regla general del negocio: solo el superadministrador) ----------

export async function addTaxRate(input: { name: string; ratePercent: number; validFrom: string }): Promise<Result> {
  await requireTaxAdmin();
  const name = input.name.trim();
  if (name.length < 2) return { error: "Escribe el nombre del impuesto." };
  if (!Number.isFinite(input.ratePercent) || input.ratePercent < 0 || input.ratePercent >= 100) return { error: "El porcentaje debe estar entre 0 y 99,99." };
  const today = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validFrom) || input.validFrom < today) {
    return { error: "La fecha debe ser hoy o futura: los cobros anteriores conservan el impuesto con el que se hicieron." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("tax_rates").insert({ name, rate: Math.round(input.ratePercent * 100) / 10000, valid_from: input.validFrom });
  if (error) return { error: error.code === "23505" ? "Ya hay un cambio de impuesto para esa fecha." : "No se pudo guardar." };
  refreshTaxes();
  return { ok: "Impuesto programado." };
}

/** Solo se pueden quitar cambios que aún no empiezan a regir. */
export async function deleteTaxRate(id: string): Promise<Result> {
  await requireTaxAdmin();
  const supabase = await createClient();
  const today = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
  const { data } = await supabase.from("tax_rates").select("valid_from").eq("id", id).maybeSingle();
  if (!data) return { error: "No encontrado." };
  if (data.valid_from <= today) return { error: "Ese impuesto ya rige: para cambiarlo, programa uno nuevo desde una fecha." };
  const { error } = await supabase.from("tax_rates").delete().eq("id", id);
  if (error) return { error: "No se pudo quitar." };
  refreshTaxes();
  return { ok: "Cambio de impuesto quitado." };
}
