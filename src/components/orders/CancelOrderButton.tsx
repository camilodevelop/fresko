"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { cancelMyOrder } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" type="button" className="text-red-700 hover:bg-red-50" onClick={() => setConfirming(true)}>
        <XCircle className="h-4 w-4" /> Cancelar pedido
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
      ¿Cancelar este pedido?
      <Button
        size="sm"
        type="button"
        className="bg-red-600 hover:bg-red-700"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (notify(await cancelMyOrder(orderId))) router.refresh();
            setConfirming(false);
          })
        }
      >
        Sí, cancelar
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setConfirming(false)}>
        No
      </Button>
    </div>
  );
}
