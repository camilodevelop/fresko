"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { unitFactor, type Unit } from "@/lib/pricing";

export type MovementState = { ok?: string; error?: string };

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));

/**
 * Registra un movimiento en el inventario de una cocina. Las cantidades llegan en la unidad de
 * presentación (kg, L, un):
 * - entrada: cantidad comprada (+), costo total opcional → recalcula el costo promedio de esa cocina
 * - perdida: cantidad perdida (−) con motivo
 * - ajuste: stock contado físicamente; se guarda la diferencia con el sistema
 * - traslado: sale de esta cocina y entra a otra, con su costo
 */
export async function registerMovement(_prev: MovementState, formData: FormData): Promise<MovementState> {
  const session = await requirePermission("inventory.manage");
  const kitchenId = String(formData.get("kitchen_id") ?? "");
  const ingredientId = String(formData.get("ingredient_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const qty = num(formData.get("quantity"));
  const totalCost = Number(String(formData.get("total_cost") ?? "").replace(/\D/g, "") || 0);
  const reason = String(formData.get("reason") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const toKitchen = String(formData.get("to_kitchen_id") ?? "");

  if (!kitchenId) return { error: "Elige la cocina." };
  if (!ingredientId) return { error: "Elige el ingrediente." };
  if (!["entrada", "perdida", "ajuste", "traslado"].includes(kind)) return { error: "Tipo de movimiento inválido." };
  if (!Number.isFinite(qty) || qty < 0 || (kind !== "ajuste" && qty === 0)) return { error: "Escribe una cantidad válida." };
  if (kind === "perdida" && !["caducidad", "dano", "otro"].includes(reason ?? "")) return { error: "Elige el motivo de la pérdida." };
  if (kind === "traslado" && (!toKitchen || toKitchen === kitchenId)) return { error: "Elige la cocina de destino." };

  const supabase = await createClient();
  const [{ data: ing }, { data: ks }] = await Promise.all([
    supabase.from("ingredients").select("unit, name").eq("id", ingredientId).single(),
    supabase.from("kitchen_stock").select("stock").eq("kitchen_id", kitchenId).eq("ingredient_id", ingredientId).maybeSingle(),
  ]);
  if (!ing) return { error: "Ingrediente no encontrado." };
  if (!ks) return { error: "No tienes acceso al inventario de esa cocina." };
  const stock = Number(ks.stock);
  const factor = unitFactor(ing.unit as Unit);
  const base = Math.round(qty * factor * 100) / 100;

  if (kind === "traslado") {
    if (base > stock) return { error: "No hay suficiente stock en esta cocina para trasladar." };
    const { error } = await supabase.rpc("transfer_stock", { p_from: kitchenId, p_to: toKitchen, p_ingredient_id: ingredientId, p_quantity: base, p_note: note });
    if (error) return { error: error.hint || "No se pudo registrar el traslado." };
    revalidatePath("/admin/inventario");
    return { ok: `Traslado registrado: ${ing.name}.` };
  }

  let quantity = base;
  if (kind === "perdida") quantity = -base;
  if (kind === "ajuste") {
    quantity = Math.round((base - stock) * 100) / 100;
    if (quantity === 0) return { ok: `El stock de ${ing.name} ya coincide con el conteo.` };
  }
  if (kind === "perdida" && base > stock) {
    return { error: "La pérdida es mayor que el stock actual. Usa un ajuste por conteo." };
  }

  const { error } = await supabase.from("inventory_movements").insert({
    kitchen_id: kitchenId,
    ingredient_id: ingredientId,
    kind,
    quantity,
    unit_cost: kind === "entrada" && totalCost > 0 ? Math.round((totalCost / base) * 10000) / 10000 : null,
    reason: kind === "perdida" ? reason : null,
    note,
    created_by: session.userId,
  });
  if (error) return { error: error.hint || "No se pudo registrar el movimiento." };

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo", "layout");
  const verb = kind === "entrada" ? "Entrada registrada" : kind === "perdida" ? "Pérdida registrada" : "Ajuste registrado";
  return { ok: `${verb}: ${ing.name}.` };
}

/** Mínimo de un ingrediente en una cocina (en la unidad de presentación). */
export async function setKitchenMin(kitchenId: string, ingredientId: string, value: number): Promise<MovementState> {
  await requirePermission("inventory.manage");
  const supabase = await createClient();
  const { data: ing } = await supabase.from("ingredients").select("unit, name").eq("id", ingredientId).single();
  if (!ing) return { error: "Ingrediente no encontrado." };
  if (!Number.isFinite(value) || value < 0) return { error: "Escribe un mínimo válido." };
  const { error } = await supabase.rpc("set_kitchen_min_stock", {
    p_kitchen_id: kitchenId,
    p_ingredient_id: ingredientId,
    p_min: Math.round(value * unitFactor(ing.unit as Unit) * 100) / 100,
  });
  if (error) return { error: error.hint || "No se pudo guardar el mínimo." };
  revalidatePath("/admin/inventario");
  return { ok: `Mínimo de ${ing.name} actualizado.` };
}
