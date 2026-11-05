import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LEGAL_VERSIONS } from "@/lib/legal";

export type ConsentRow = { document: string; version: string; accepted: boolean; method: string; created_at: string };

/** Últimas decisiones del usuario por documento. */
export async function loadMyConsents(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_consents")
    .select("document, version, accepted, method, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const latest = new Map<string, ConsentRow>();
  for (const row of data ?? []) if (!latest.has(row.document)) latest.set(row.document, row);
  return latest;
}

/** ¿Le falta aceptar la versión vigente de términos o de tratamiento de datos? */
export async function needsLegalConsent(userId: string) {
  const latest = await loadMyConsents(userId);
  const terms = latest.get("terminos");
  const privacy = latest.get("privacidad");
  return !(terms?.accepted && terms.version === LEGAL_VERSIONS.terminos && privacy?.accepted && privacy.version === LEGAL_VERSIONS.privacidad);
}
