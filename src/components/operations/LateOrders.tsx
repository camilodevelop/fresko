"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ChefHat, PlusCircle, Printer, Route } from "lucide-react";
import { addLateOrder } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import type { LateOrder, LateSlot } from "@/lib/operations";
import { cn } from "@/lib/utils";
import { fmtClock } from "./PackingBoard";

const fmtExtra = (s: number) => `+${Math.max(1, Math.round(s / 60))} min`;

/**
 * Pedidos que llegaron después de alistar. Si hay domiciliario libre, se le calcula su canasta;
 * si no, se propone dónde intercalar cada uno en una canasta ya alistada sin mover las demás.
 */
export function LateOrders({ late, planning, onPlan }: { late: LateSlot; planning: boolean; onPlan: () => void }) {
  const n = late.orders.length;
  if (!n) return null;
  return (
    <div className="mb-4 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5">
      <p className="flex items-center gap-2 font-display font-bold text-amber-900">
        <BellRing className="h-5 w-5" /> {n} {n === 1 ? "pedido nuevo" : "pedidos nuevos"} sin canasta
      </p>
      {late.freeCouriers.length > 0 ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm text-amber-900/80">
              Hay domiciliarios libres (<strong>{late.freeCouriers.join(", ")}</strong>). Al calcular, los pedidos nuevos entran a las canastas que aún no se alistan o
              forman una canasta nueva, solo si hace falta.
            </p>
            <Button size="sm" disabled={planning} onClick={onPlan}>
              <Route className="h-4 w-4" /> {planning ? "Calculando…" : "Calcular canastas"}
            </Button>
          </div>
          {late.orders.some((o) => o.options.some((x) => x.feasible)) && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-amber-900">O agrégalos a una canasta ya alistada que todavía alcanza</summary>
              <ul className="mt-2 space-y-2">
                {late.orders
                  .filter((o) => o.options.some((x) => x.feasible))
                  .map((o) => (
                    <LateRow key={o.orderId} order={{ ...o, options: o.options.filter((x) => x.feasible) }} />
                  ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-amber-900/80">
            Todos los domiciliarios ya alistaron. Agrega cada pedido a la canasta donde menos alarga el recorrido: las paradas ya etiquetadas no cambian.
          </p>
          <ul className="mt-3 space-y-2">
            {late.orders.map((o) => (
              <LateRow key={o.orderId} order={o} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LateRow({ order: o }: { order: LateOrder }) {
  const router = useRouter();
  const [pick, setPick] = useState(0);
  const [busy, start] = useTransition();
  const [added, setAdded] = useState(false);
  const opt = o.options[pick];

  const add = () =>
    opt &&
    start(async () => {
      const r = await addLateOrder({ routeId: opt.routeId, orderId: o.orderId, afterSeq: opt.afterSeq, extraMeters: opt.extraMeters, extraSeconds: opt.extraSeconds, eta: opt.eta });
      if (notify(r)) {
        setAdded(true);
        router.refresh();
      }
    });

  return (
    <li className="rounded-2xl bg-white p-3 ring-1 ring-amber-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg font-bold text-[#1F4D36]">{o.code}</span>
        {!o.prepared && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
            <ChefHat className="h-3 w-3" /> Aún en cocina
          </span>
        )}
      </div>
      {!opt ? (
        <p className="mt-1 text-sm text-[#1B1B1B]/60">
          No hay canastas por salir para agregarlo. Asigna otro domiciliario en Configuración → Operación o espera a que uno regrese.
        </p>
      ) : (
        <>
          {o.options.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {o.options.map((x, i) => (
                <button
                  key={x.routeId}
                  type="button"
                  aria-pressed={pick === i}
                  onClick={() => setPick(i)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                    pick === i ? "border-[#8BC34A] bg-[#F4F8F2] text-[#1F4D36]" : "border-[#1F4D36]/15 text-[#1B1B1B]/60"
                  )}
                >
                  {x.courierName} · {fmtExtra(x.extraSeconds)}
                  {!x.feasible ? " · no alcanza" : i === 0 ? " · mejor" : ""}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-[#1B1B1B]/70">
              Canasta de <strong className="text-[#1F4D36]">{opt.courierName}</strong> como <strong>parada {opt.labelPosition}</strong> ({fmtExtra(opt.extraSeconds)},{" "}
              {opt.extraMeters < 1000 ? `${Math.round(opt.extraMeters / 10) * 10} m` : `${(opt.extraMeters / 1000).toFixed(1).replace(".", ",")} km`} más).
              <span className="block text-xs text-[#1B1B1B]/55">Bolsa: {opt.placement}.</span>
              {opt.finishEta && (
                <span className={cn("block text-xs font-semibold", opt.feasible ? "text-[#2E6B1F]" : "text-red-700")}>
                  {opt.feasible ? "La canasta sigue terminando a tiempo" : "Con este pedido la canasta se pasa de la franja"} (última entrega ≈ {fmtClock(opt.finishEta)}).
                </span>
              )}
            </p>
            {added ? (
              <Button size="sm" variant="secondary" asChild>
                <a href={`/api/etiquetas/pedidos?ids=${o.orderId}`} target="_blank" rel="noreferrer">
                  <Printer className="h-4 w-4" /> Etiqueta
                </a>
              </Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={add}>
                <PlusCircle className="h-4 w-4" /> {busy ? "Agregando…" : "Agregar a la canasta"}
              </Button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
