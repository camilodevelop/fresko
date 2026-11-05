"use client";

import { toast } from "sonner";

export type Result = { ok?: string; error?: string } | null | undefined | void;

/**
 * Muestra el resultado de una acción como toast.
 * - Si trae `error`, toast de error.
 * - Si trae `ok`, toast de éxito con ese texto (o `success` si se pasa).
 */
export function notify(result: Result, success?: string) {
  if (result && result.error) {
    toast.error(result.error);
    return false;
  }
  const message = (result && result.ok) || success;
  if (message) toast.success(message);
  return true;
}

/** Ejecuta una acción que puede lanzar error (p. ej. interruptores) y avisa con toast. */
export async function run<T>(fn: () => Promise<T>, success?: string, failure = "No se pudo guardar. Intenta de nuevo.") {
  try {
    const value = await fn();
    if (value && typeof value === "object" && "error" in value && (value as { error?: string }).error) {
      toast.error((value as { error: string }).error);
      return null;
    }
    if (success) toast.success(success);
    return value;
  } catch (e) {
    // Las redirecciones de Next.js no son errores reales.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    toast.error(e instanceof Error && e.message && !e.message.includes("Server Components") ? e.message : failure);
    return null;
  }
}

export { toast };
