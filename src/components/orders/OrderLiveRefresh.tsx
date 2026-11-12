"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarga la vista cuando el pedido cambia de estado (tiempo real). */
export function OrderLiveRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    // El cliente de Supabase se carga aparte, después de mostrar la página.
    import("@/lib/supabase/client").then(async ({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      const channel = supabase
        .channel(`order:${orderId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => router.refresh())
        .subscribe();
      stop = () => supabase.removeChannel(channel);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [orderId, router]);
  return null;
}
