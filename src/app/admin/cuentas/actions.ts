"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance-categories";

type Result = { ok?: string; error?: string };
const refresh = () => revalidatePath("/admin/cuentas", "layout");

// ---------- Gastos e ingresos ----------

export type EntryInput = {
  id?: string;
  kitchenId: string | null;
  kind: "egreso" | "ingreso";
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  recurring: boolean;
  endsOn: string | null;
};

export async function saveEntry(input: EntryInput): Promise<Result> {
  await requirePermission("finance.manage");
  const description = input.description.trim();
  if (description.length < 2) return { error: "Escribe una descripción." };
  if (!(input.category in EXPENSE_CATEGORIES)) return { error: "Elige una categoría." };
  if (input.kind === "ingreso" && input.category !== "otros_ingresos") return { error: "Los ingresos van en la categoría Otros ingresos." };
  if (!Number.isInteger(input.amount) || input.amount <= 0) return { error: "Escribe un valor mayor que cero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Elige la fecha." };
  if (input.endsOn && input.endsOn < input.date) return { error: "La fecha de fin debe ser posterior al inicio." };
  const supabase = await createClient();
  const row = {
    kitchen_id: input.kitchenId,
    kind: input.kind,
    category: input.category,
    description,
    amount: input.amount,
    entry_date: input.date,
    recurring: input.recurring,
    ends_on: input.recurring ? input.endsOn : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id ? await supabase.from("finance_entries").update(row).eq("id", input.id) : await supabase.from("finance_entries").insert(row);
  if (error) return { error: "No se pudo guardar." };
  refresh();
  return { ok: input.id ? "Movimiento actualizado." : input.kind === "ingreso" ? "Ingreso registrado." : "Gasto registrado." };
}

export async function deleteEntry(id: string): Promise<Result> {
  await requirePermission("finance.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("finance_entries").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar." };
  refresh();
  return { ok: "Movimiento eliminado." };
}

/** Termina un gasto recurrente (deja de contar desde el mes siguiente a la fecha dada). */
export async function endRecurring(id: string, endsOn: string): Promise<Result> {
  await requirePermission("finance.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("finance_entries").update({ ends_on: endsOn, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "No se pudo actualizar." };
  refresh();
  return { ok: "Gasto recurrente terminado." };
}

// ---------- Nómina ----------

export async function savePay(input: { userId: string; kitchenId: string | null; payType: "diario" | "mensual"; amount: number; active: boolean; startsOn: string }): Promise<Result> {
  await requirePermission("finance.manage");
  if (!Number.isInteger(input.amount) || input.amount <= 0) return { error: "Escribe el pago." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn)) return { error: "Elige desde cuándo aplica." };
  const supabase = await createClient();
  const { error } = await supabase.from("employee_pay").upsert({
    user_id: input.userId,
    kitchen_id: input.kitchenId,
    pay_type: input.payType,
    amount: input.amount,
    active: input.active,
    starts_on: input.startsOn,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "No se pudo guardar el pago." };
  refresh();
  return { ok: "Pago guardado." };
}

export async function removePay(userId: string): Promise<Result> {
  await requirePermission("finance.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("employee_pay").delete().eq("user_id", userId);
  if (error) return { error: "No se pudo quitar." };
  refresh();
  return { ok: "Quitado de la nómina." };
}
