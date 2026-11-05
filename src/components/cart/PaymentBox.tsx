"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FlaskConical } from "lucide-react";
import { payOrder } from "@/app/actions/orders";
import { paySubscription } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { formatPrice } from "@/lib/utils";

/**
 * Pasarela SIMULADA. Cuando se elija la pasarela real (Wompi, Mercado Pago…),
 * este componente redirige a su checkout y el webhook confirma el pago.
 */
export function PaymentBox({
  orderId,
  code,
  total,
  rejected,
  kind = "order",
}: {
  /** Id del pedido o de la suscripción. */
  orderId: string;
  code: string;
  total: number;
  rejected: boolean;
  kind?: "order" | "subscription";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const pay = (approve: boolean) =>
    start(async () => {
      const r = kind === "subscription" ? await paySubscription(orderId, approve) : await payOrder(orderId, approve);
      notify(r);
      if (r.status === "aprobado") router.push(kind === "subscription" ? `/cuenta/suscripcion/${code}?pagado=1` : `/cuenta/pedidos/${code}?pagado=1`);
      else router.refresh();
    });

  return (
    <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#1F4D36]/[0.07]">
      <div className="flex items-center gap-2 bg-amber-50 px-5 py-2.5 text-xs font-semibold text-amber-900">
        <FlaskConical className="h-4 w-4" /> Modo de prueba: no se cobra dinero real
      </div>
      <div className="p-6">
        <p className="text-xs text-[#1B1B1B]/50">Total a pagar</p>
        <p className="font-display text-3xl font-bold text-[#1F4D36]">{formatPrice(total)}</p>
        {rejected && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            El último intento de pago fue rechazado. Puedes intentarlo de nuevo.
          </p>
        )}
        <Button className="mt-5 w-full" size="lg" type="button" disabled={pending} onClick={() => pay(true)}>
          <CreditCard className="h-4 w-4" /> {pending ? "Procesando…" : `Pagar ${formatPrice(total)}`}
        </Button>
        <Button className="mt-2 w-full" variant="ghost" type="button" disabled={pending} onClick={() => pay(false)}>
          Simular pago rechazado
        </Button>
      </div>
    </section>
  );
}
