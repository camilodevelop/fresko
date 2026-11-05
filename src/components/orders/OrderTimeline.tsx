import { Check, ChefHat, CircleCheck, PackageCheck, Truck, XCircle } from "lucide-react";
import { ORDER_FLOW } from "@/lib/delivery";
import { cn } from "@/lib/utils";

const STEPS: Record<(typeof ORDER_FLOW)[number], { label: string; icon: typeof Check }> = {
  confirmado: { label: "Confirmado", icon: CircleCheck },
  en_preparacion: { label: "En preparación", icon: ChefHat },
  en_camino: { label: "En camino", icon: Truck },
  entregado: { label: "Entregado", icon: PackageCheck },
};

/** Línea de tiempo del pedido: confirmado → preparación → en camino → entregado. */
export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelado") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
        <XCircle className="h-5 w-5" /> Este pedido fue cancelado.
      </div>
    );
  }
  if (status === "no_entregado") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
        <XCircle className="h-5 w-5" /> No pudimos entregar este pedido. Te contactaremos para coordinar la entrega.
      </div>
    );
  }
  if (status === "pendiente_pago") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        <CircleCheck className="h-5 w-5" /> Falta el pago para confirmar el pedido.
      </div>
    );
  }
  const current = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Estado del pedido">
      {ORDER_FLOW.map((step, i) => {
        const done = i <= current;
        const Icon = STEPS[step].icon;
        return (
          <li key={step} className="flex flex-col items-center text-center" aria-current={i === current ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-[#1F4D36]" : "bg-[#1F4D36]/10")} />
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36]/35",
                  i === current && "ring-4 ring-[#8BC34A]/30"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={cn("h-0.5 flex-1", i === ORDER_FLOW.length - 1 ? "bg-transparent" : i < current ? "bg-[#1F4D36]" : "bg-[#1F4D36]/10")} />
            </div>
            <span className={cn("mt-2 text-xs font-semibold", done ? "text-[#1F4D36]" : "text-[#1B1B1B]/35")}>{STEPS[step].label}</span>
          </li>
        );
      })}
    </ol>
  );
}
