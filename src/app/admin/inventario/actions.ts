"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { unitFactor, type Unit } from "@/lib/pricing";

export type MovementState = { ok?: string; error?: string };

/**
 * Registra un movimiento. Las cantidades llegan en la unidad de presentación (kg, L, un):
 * - entrada: cantidad comprada (+), costo total opcional → recalcula el costo promedio
 * - perdida: cantidad perdida (−) con motivo
 * - ajuste: stock contado físicamente; se guarda la diferencia con el sistema
 */
export async function registerMovement(_prev: MovementState, formData: FormData): Promise<MovementState> {
  const session = await requirePermission("inventory.manage");
  const ingredientId = String(formData.get("ingredient_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const qty = Number(String(formData.get("quantity") ?? "").replace(",", "."));
  const totalCost = Number(String(formData.get("total_cost") ?? "").replace(/\D/g, "") || 0);
  const reason = String(formData.get("reason") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  if (!ingredientId) return { error: "Elige el ingrediente." };
  if (!["entrada", "perdida", "ajuste"].includes(kind)) return { error: "Tipo de movimiento inválido." };
  if (!Number.isFinite(qty) || qty < 0 || (kind !== "ajuste" && qty === 0)) return { error: "Escribe una cantidad válida." };
  if (kind === "perdida" && !["caducidad", "dano", "otro"].includes(reason ?? "")) return { error: "Elige el motivo de la pérdida." };

  const supabase = await createClient();
  const { data: ing } = await supabase.from("ingredients").select("unit, stock, name").eq("id", ingredientId).single();
  if (!ing) return { error: "Ingrediente no encontrado." };
  const factor = unitFactor(ing.unit as Unit);
  const base = Math.round(qty * factor * 100) / 100;

  let quantity = base;
  if (kind === "perdida") quantity = -base;
  if (kind === "ajuste") {
    quantity = Math.round((base - Number(ing.stock)) * 100) / 100;
    if (quantity === 0) return { ok: `El stock de ${ing.name} ya coincide con el conteo.` };
  }
  if (kind === "perdida" && base > Number(ing.stock)) {
    return { error: "La pérdida es mayor que el stock actual. Usa un ajuste por conteo." };
  }

  const { error } = await supabase.from("inventory_movements").insert({
    ingredient_id: ingredientId,
    kind,
    quantity,
    unit_cost: kind === "entrada" && totalCost > 0 ? Math.round((totalCost / base) * 10000) / 10000 : null,
    reason: kind === "perdida" ? reason : null,
    note,
    created_by: session.userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo", "layout");
  const verb = kind === "entrada" ? "Entrada registrada" : kind === "perdida" ? "Pérdida registrada" : "Ajuste registrado";
  return { ok: `${verb}: ${ing.name}.` };
}
