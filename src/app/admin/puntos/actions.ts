"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/orders";

type Result = { ok?: string; error?: string };

function refresh() {
  revalidatePath("/admin/operacion", "layout");
  revalidatePath("/admin/puntos");
  revalidatePath("/admin/punto");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/mostrador");
}

export type PointInput = { id?: string; kitchenId: string; name: string; address: string; schedule: string; active: boolean; vendorIds: string[] };

export async function savePoint(input: PointInput): Promise<Result> {
  await requirePermission("points.manage");
  const name = input.name.trim();
  if (name.length < 2) return { error: "Escribe el nombre del punto." };
  const supabase = await createClient();
  const row = { kitchen_id: input.kitchenId, name: name.slice(0, 80), address: input.address.trim().slice(0, 200), schedule: input.schedule.trim().slice(0, 120), active: input.active, updated_at: new Date().toISOString() };
  const { data, error } = input.id
    ? await supabase.from("sale_points").update(row).eq("id", input.id).select("id").single()
    : await supabase.from("sale_points").insert(row).select("id").single();
  if (error || !data) return { error: "No se pudo guardar el punto." };
  // Vendedores: se reemplaza la lista.
  const { data: current } = await supabase.from("sale_point_users").select("user_id").eq("point_id", data.id);
  const now = new Set((current ?? []).map((c) => c.user_id));
  const next = new Set(input.vendorIds);
  const remove = [...now].filter((id) => !next.has(id));
  const add = [...next].filter((id) => !now.has(id));
  if (remove.length) await supabase.from("sale_point_users").delete().eq("point_id", data.id).in("user_id", remove);
  if (add.length) {
    const { error: e2 } = await supabase.from("sale_point_users").insert(add.map((user_id) => ({ point_id: data.id, user_id })));
    if (e2) return { error: "El punto se guardó, pero no se pudieron asignar los vendedores." };
  }
  refresh();
  return { ok: input.id ? "Punto actualizado." : `${name} creado.` };
}

export type PlanLine = { productId: string; planned: number; toProduce: number };

export async function savePlan(pointId: string, date: string, lines: PlanLine[], notes: string, send: boolean): Promise<Result> {
  await requirePermission("points.manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_point_plan", {
    p_point_id: pointId,
    p_date: date,
    p_items: lines.map((l) => ({ product_id: l.productId, planned: Math.max(0, Math.round(l.planned)), to_produce: Math.max(0, Math.round(l.toProduce)) })),
    p_notes: notes,
  });
  if (error || !data) return { error: dbError(error, "No se pudo guardar el plan.") };
  if (send) {
    const { error: e2 } = await supabase.rpc("send_point_load", { p_load_id: data });
    if (e2) return { error: dbError(e2, "El plan se guardó, pero no se pudo enviar a cocina.") };
  }
  refresh();
  return { ok: send ? "Plan enviado a cocina." : "Plan guardado." };
}

export async function sendLoad(loadId: string): Promise<Result> {
  await requirePermission("points.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_point_load", { p_load_id: loadId });
  if (error) return { error: dbError(error, "No se pudo enviar a cocina.") };
  refresh();
  return { ok: "Enviado a cocina." };
}

export async function cancelLoad(loadId: string): Promise<Result> {
  await requirePermission("points.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_point_load", { p_load_id: loadId });
  if (error) return { error: dbError(error, "No se pudo cancelar.") };
  refresh();
  return { ok: "Carga cancelada. Lo ya preparado queda en la vitrina de la cocina." };
}

export async function dispatchLoad(loadId: string, items: { productId: string; quantity: number }[]): Promise<Result> {
  await requirePermission("points.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("dispatch_point_load", {
    p_load_id: loadId,
    p_items: items.map((i) => ({ product_id: i.productId, quantity: Math.max(0, Math.round(i.quantity)) })),
  });
  if (error) return { error: dbError(error, "No se pudo despachar.") };
  refresh();
  return { ok: "Carga despachada: el vendedor la recibe en su celular." };
}

export async function writeOffDishes(lotId: string, kind: "equipo" | "donacion" | "perdida", quantity: number, note: string): Promise<Result> {
  await requirePermission("points.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("write_off_kitchen_dishes", { p_lot_id: lotId, p_kind: kind, p_quantity: Math.round(quantity), p_note: note });
  if (error) return { error: dbError(error, "No se pudo registrar.") };
  refresh();
  revalidatePath("/admin/cuentas", "layout");
  return { ok: "Registrado." };
}
