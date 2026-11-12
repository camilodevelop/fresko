"use client";

import { useEffect, useState } from "react";

/** Cookie de sesión de Supabase (sb-<proyecto>-auth-token, a veces en partes .0, .1…). */
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

/**
 * true si hay sesión (para mostrar "Mi cuenta" en vez de "Iniciar sesión").
 * Solo mira si existe la cookie de sesión: así el sitio público no descarga la librería de Supabase.
 * Si la sesión venció, "Mi cuenta" lleva al login igual.
 */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const check = () => setSignedIn(SESSION_COOKIE.test(document.cookie));
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);
  return signedIn;
}
