"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { closeKitchenSlot } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { INCIDENT_REASONS } from "@/lib/incidents";
import { notify } from "@/lib/notify";
import type { BoardGroup } from "@/lib/operations";
import { cn } from "@/lib/utils";

const KITCHEN_REASONS = INCIDENT_REASONS.filter((r) => ["falta_insumo", "sin_preparar", "plato_danado", "otro"].includes(r.id));

/**
 * Cerrar la preparación de una franja sin terminar: lo pendiente queda como novedad, esos
 * pedidos salen de la ruta (en espera) y alistamiento puede salir con el resto.
 */
export function KitchenCloseSheet({
  kitchenId,
  date,
  slotId,
  slotLabel,
  pending,
  onClose,
  onDone,
}: {
  kitchenId: string;
  date: string;
  slotId: string;
  slotLabel: string;
  pending: BoardGroup[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();
  const orders = [...new Set(pending.flatMap((g) => g.items.map((i) => i.orderCode)))];
  const ready = reason && note.trim().length >= 3;

  const submit = () =>
    start(async () => {
      if (notify(await closeKitchenSlot(kitchenId, date, slotId, reason, note))) onDone();
    });

  return (
    <Sheet
      title={`Cerrar preparación · ${slotLabel}`}
      description={`Lo que falta no se va a preparar. ${orders.length} ${orders.length === 1 ? "pedido sale" : "pedidos salen"} de la ruta y ${orders.length === 1 ? "queda" : "quedan"} en espera para que el equipo de pedidos decida; el resto ya se puede alistar.`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#1B1B1B]/50">{ready ? "Listo para cerrar." : "Elige el motivo y explica qué pasó."}</p>
          <Button disabled={!ready || busy} onClick={submit}>
            <Lock className="h-4 w-4" /> {busy ? "Cerrando…" : "Cerrar con novedades"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Queda sin preparar</p>
          <ul className="divide-y divide-[#1F4D36]/[0.06] rounded-2xl border border-[#1F4D36]/10">
            {pending.map((g) => (
              <li key={g.key} className="flex items-baseline gap-3 px-3 py-2 text-sm">
                <span className="font-display font-bold tabular-nums text-[#1F4D36]">{g.quantity}×</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-[#1F4D36]">{g.name}</span>
                  <span className="block truncate text-xs text-[#1B1B1B]/50">{[...new Set(g.items.map((i) => i.orderCode))].join(", ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Motivo</p>
          <div className="flex flex-wrap gap-1.5">
            {KITCHEN_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={reason === r.id}
                onClick={() => setReason(r.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  reason === r.id ? "border-amber-400 bg-amber-50 text-amber-900" : "border-[#1F4D36]/15 text-[#1B1B1B]/60 hover:border-amber-300"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">¿Qué pasó?</span>
            <textarea
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej.: no llegó la pechuga a tiempo para la franja."
              className="min-h-20 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
            />
          </label>
        </section>
      </div>
    </Sheet>
  );
}
