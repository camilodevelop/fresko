"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPendingSubscription } from "@/app/actions/subscriptions";
import { notify } from "@/lib/notify";

/** Descarta una compra de plan que no se pagó (pide confirmar con un segundo clic). */
export function DiscardSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        start(async () => {
          if (notify(await cancelPendingSubscription(subscriptionId))) router.push("/cuenta/suscripcion");
        });
      }}
      className="text-red-700/70 underline hover:text-red-700"
    >
      {pending ? "Descartando…" : confirming ? "¿Seguro? Toca para descartar" : "Descartar compra"}
    </button>
  );
}
