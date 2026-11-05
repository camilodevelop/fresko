"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, PackageCheck, Truck, XCircle } from "lucide-react";
import { setOrderStatus } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useFormValidation } from "@/hooks/use-form-validation";
import { notify } from "@/lib/notify";
import { rules } from "@/lib/validation";

const NEXT: Record<string, { status: string; label: string; icon: typeof ChefHat } | undefined> = {
  confirmado: { status: "en_preparacion", label: "Empezar a preparar", icon: ChefHat },
  en_preparacion: { status: "en_camino", label: "Enviar a domicilio", icon: Truck },
  en_camino: { status: "entregado", label: "Marcar como entregado", icon: PackageCheck },
};

const CANCELLABLE = ["pendiente_pago", "confirmado", "en_preparacion"];

export function OrderStatusActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const next = NEXT[status];

  const v = useFormValidation(
    () => ({ reason: rules.minLength(reason, 5, "Escribe el motivo (se lo enviamos al cliente).") }),
    () => ({ reason }),
    "cancel"
  );

  const change = (to: string, note = "") =>
    start(async () => {
      if (notify(await setOrderStatus(orderId, to, note))) {
        setCancelling(false);
        setReason("");
        v.reset();
        router.refresh();
      }
    });

  if (!next && !CANCELLABLE.includes(status)) {
    return <p className="text-sm text-[#1B1B1B]/50">Este pedido ya está cerrado.</p>;
  }

  return (
    <div className="space-y-3">
      {next && (
        <Button className="w-full" size="lg" type="button" disabled={pending} onClick={() => change(next.status)}>
          <next.icon className="h-4 w-4" /> {next.label}
        </Button>
      )}
      {CANCELLABLE.includes(status) &&
        (cancelling ? (
          <form {...v.formProps(() => change("cancelado", reason))} className="space-y-2 rounded-2xl bg-red-50 p-3">
            <label htmlFor={v.idFor("reason")} className="text-xs font-semibold text-red-800">
              Motivo de la cancelación
            </label>
            <textarea
              {...v.field("reason")}
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-16 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Sin ingredientes, dirección errada, pedido del cliente…"
            />
            <FieldError name={v.idFor("reason")} error={v.error("reason")} />
            <div className="flex gap-2">
              <Button size="sm" type="submit" className="bg-red-600 hover:bg-red-700" disabled={pending}>
                Cancelar pedido
              </Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => setCancelling(false)}>
                Volver
              </Button>
            </div>
            {status !== "pendiente_pago" && (
              <p className="text-[11px] text-red-800/70">El pedido ya está pagado: el reembolso se gestionará con la pasarela de pago.</p>
            )}
          </form>
        ) : (
          <Button variant="ghost" className="w-full text-red-700 hover:bg-red-50" type="button" onClick={() => setCancelling(true)}>
            <XCircle className="h-4 w-4" /> Cancelar pedido
          </Button>
        ))}
    </div>
  );
}
