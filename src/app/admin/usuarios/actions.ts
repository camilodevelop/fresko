"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function setUserRole(userId: string, roleId: string, enabled: boolean): Promise<{ ok?: string; error?: string }> {
  const session = await requirePermission("users.manage");
  const supabase = await createClient();

  const [{ data: role }, { data: profile }] = await Promise.all([
    supabase.from("roles").select("key, name").eq("id", roleId).single(),
    supabase.from("profiles").select("full_name, email").eq("id", userId).single(),
  ]);
  if (!enabled && userId === session.userId && role?.key === "admin") {
    return { error: "No puedes quitarte tu propio rol de Superadministrador." };
  }

  const { error } = enabled
    ? await supabase.from("user_roles").insert({ user_id: userId, role_id: roleId })
    : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_id", roleId);
  if (error && error.code !== "23505") {
    return { error: error.code === "42501" ? "Solo el superadministrador puede cambiar ese rol." : "No se pudo actualizar el rol." };
  }
  revalidatePath("/admin/usuarios");
  const who = profile?.full_name || profile?.email || "Usuario";
  return { ok: enabled ? `${who} ahora es ${role?.name ?? "parte del rol"}.` : `${who} ya no es ${role?.name ?? "parte del rol"}.` };
}

/** Activa o inactiva la cuenta (inactivar exige motivo, bloquea el ingreso y cierra sus sesiones). */
export async function setUserActive(userId: string, active: boolean, reason = ""): Promise<{ ok?: string; error?: string }> {
  await requirePermission("users.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", { p_user_id: userId, p_active: active, p_reason: reason.trim() });
  if (error) return { error: error.hint || "No se pudo actualizar el usuario." };
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: active ? "Usuario activado: ya puede volver a ingresar." : "Usuario inactivado: se cerraron sus sesiones y no puede ingresar." };
}

/** Cocinas en las que trabaja la persona (solo ve la información de esas cocinas). */
export async function setUserKitchens(userId: string, kitchenIds: string[]): Promise<{ ok?: string; error?: string }> {
  await requirePermission("users.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_kitchens", { p_user_id: userId, p_kitchen_ids: kitchenIds });
  if (error) return { error: error.hint || "No se pudieron guardar las cocinas." };
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: kitchenIds.length ? "Cocinas actualizadas." : "Quedó sin cocina: no verá información de ninguna." };
}

/** Sumar al equipo de una cocina a alguien que ya tiene cuenta (por su correo). */
export async function addTeamMember(email: string, roleId: string, kitchenId: string): Promise<{ ok?: string; error?: string; userId?: string }> {
  await requirePermission("users.manage");
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { error: "Escribe un correo válido." };
  if (!roleId || !kitchenId) return { error: "Elige el rol y la cocina." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_team_member", { p_email: email.trim(), p_role_id: roleId, p_kitchen_id: kitchenId });
  if (error) return { error: error.hint || "No se pudo agregar al equipo." };
  revalidatePath("/admin/usuarios");
  return { ok: "Agregado al equipo.", userId: data ?? undefined };
}
