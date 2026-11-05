"use server";

import { revalidatePath } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { isValidPhoneNumber } from "libphonenumber-js";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok?: string; error?: string };

function refresh() {
  revalidatePath("/cuenta", "layout");
  revalidatePath("/admin", "layout");
}

export async function updateContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone_e164") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!fullName) return { error: "Escribe tu nombre." };
  if (!phone) return { error: "Escribe un celular válido para el país elegido." };
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || !isValidPhoneNumber(phone)) return { error: "Ese celular no es válido." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El correo no es válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
    .eq("id", session.userId);
  if (error) return { error: "No se pudo guardar. Intenta de nuevo." };

  if (email !== (session.email ?? "").toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) {
      return {
        error: emailError.message.includes("already")
          ? "Ese correo ya está en uso por otra cuenta."
          : "Guardamos tus datos, pero no pudimos cambiar el correo.",
      };
    }
    refresh();
    return { ok: "Datos guardados. Para cambiar el correo, confirma con los enlaces que enviamos a tu correo actual y al nuevo." };
  }

  refresh();
  return { ok: "Datos guardados." };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (next !== confirm) return { error: "Las contraseñas no coinciden." };

  if (session.hasPassword) {
    if (!current) return { error: "Escribe tu contraseña actual." };
    // Verifica la contraseña actual sin tocar la sesión del navegador.
    const verifier = createPlainClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error } = await verifier.auth.signInWithPassword({ email: session.email ?? "", password: current });
    if (error) return { error: "La contraseña actual no es correcta." };
    await verifier.auth.signOut({ scope: "local" });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return {
      error: error.message.includes("different")
        ? "La nueva contraseña debe ser distinta a la actual."
        : "No se pudo cambiar la contraseña.",
    };
  }
  refresh();
  return { ok: session.hasPassword ? "Contraseña actualizada." : "Contraseña creada. Ya puedes entrar también con tu correo." };
}

/** Guarda la URL de la foto ya subida a Storage (o null para quitarla) y limpia las anteriores. */
export async function setAvatar(path: string | null): Promise<ActionState> {
  const session = await requireSession();
  if (path !== null && !path.startsWith(`${session.userId}/`)) return { error: "Archivo inválido." };

  const supabase = await createClient();
  const avatarUrl = path ? supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl : null;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", session.userId);
  if (error) return { error: "No se pudo guardar la foto." };

  const { data: files } = await supabase.storage.from("avatars").list(session.userId);
  const stale = (files ?? [])
    .map((f) => `${session.userId}/${f.name}`)
    .filter((p) => p !== path);
  if (stale.length) await supabase.storage.from("avatars").remove(stale);

  refresh();
  return { ok: path ? "Foto actualizada." : "Foto eliminada." };
}
