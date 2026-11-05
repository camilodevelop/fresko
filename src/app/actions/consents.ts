"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { LEGAL_VERSIONS } from "@/lib/legal";

async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null;
  return { ip, user_agent: (h.get("user-agent") ?? "").slice(0, 300) || null };
}

/** Aceptación de términos y autorización de datos (p. ej. tras entrar con Google o al cambiar las versiones). */
export async function acceptLegal(input: { terms: boolean; privacy: boolean; marketing: boolean }): Promise<{ ok?: string; error?: string }> {
  const session = await requireSession("/legal/aceptar");
  if (!input.terms || !input.privacy) {
    return { error: "Para usar FRESKO debes aceptar los términos y autorizar el tratamiento de tus datos." };
  }
  const supabase = await createClient();
  const meta = await requestMeta();
  const { error } = await supabase.from("user_consents").insert([
    { user_id: session.userId, document: "terminos", version: LEGAL_VERSIONS.terminos, accepted: true, method: "aceptacion", ...meta },
    { user_id: session.userId, document: "privacidad", version: LEGAL_VERSIONS.privacidad, accepted: true, method: "aceptacion", ...meta },
    { user_id: session.userId, document: "comunicaciones", version: LEGAL_VERSIONS.privacidad, accepted: input.marketing, method: "aceptacion", ...meta },
  ]);
  if (error) return { error: "No se pudo guardar tu aceptación. Intenta de nuevo." };
  revalidatePath("/", "layout");
  return { ok: "¡Gracias! Ya puedes continuar." };
}

/** Activa o revoca la autorización de comunicaciones comerciales (derecho del titular). */
export async function setMarketingConsent(accepted: boolean): Promise<{ ok?: string; error?: string }> {
  const session = await requireSession("/cuenta/perfil");
  const supabase = await createClient();
  const meta = await requestMeta();
  const { error } = await supabase.from("user_consents").insert({
    user_id: session.userId,
    document: "comunicaciones",
    version: LEGAL_VERSIONS.privacidad,
    accepted,
    method: "perfil",
    ...meta,
  });
  if (error) return { error: "No se pudo actualizar tu preferencia." };
  revalidatePath("/cuenta", "layout");
  revalidatePath("/admin", "layout");
  return { ok: accepted ? "Recibirás novedades y promociones." : "Ya no te enviaremos mensajes comerciales." };
}
