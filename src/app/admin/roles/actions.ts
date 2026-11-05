"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { ok?: boolean; error?: string };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function createRole(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("roles.manage");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const key = slugify(name);
  if (!key) return { error: "Escribe un nombre para el rol." };

  const supabase = await createClient();
  const { error } = await supabase.from("roles").insert({ key, name, description });
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un rol con ese nombre." : error.message };
  }
  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function setRolePermission(roleId: string, permission: string, enabled: boolean) {
  await requirePermission("roles.manage");
  const supabase = await createClient();

  const { data: role } = await supabase.from("roles").select("key").eq("id", roleId).single();
  if (role?.key === "admin") throw new Error("El rol Administrador siempre tiene todos los permisos.");

  const { error } = enabled
    ? await supabase.from("role_permissions").insert({ role_id: roleId, permission_key: permission })
    : await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_key", permission);
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function deleteRole(roleId: string) {
  await requirePermission("roles.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
}
