"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function setUserRole(userId: string, roleId: string, enabled: boolean) {
  const session = await requirePermission("users.manage");
  const supabase = await createClient();

  if (!enabled && userId === session.userId) {
    const { data: role } = await supabase.from("roles").select("key").eq("id", roleId).single();
    if (role?.key === "admin") throw new Error("No puedes quitarte tu propio rol de Administrador.");
  }

  const { error } = enabled
    ? await supabase.from("user_roles").insert({ user_id: userId, role_id: roleId })
    : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_id", roleId);
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}
