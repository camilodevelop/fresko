"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

/** true si hay sesión (para mostrar "Mi cuenta" en vez de "Iniciar sesión"). */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session))
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}
