"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { reportKitchenIncident } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { INCIDENT_REASONS } from "@/lib/incidents";
import { notify, toast } from "@/lib/notify";
import type { BoardItem } from "@/lib/operations";
import { cn } from "@/lib/utils";

// En cocina aplican los motivos del plato, no los del cliente o la dirección.
const KITCHEN_REASONS = INCIDENT_REASONS.filter((r) => ["falta_insumo", "plato_danado", "sin_preparar", "otro"].includes(r.id));

/** Reparte `total` unidades desde el último pedido de la lista hacia el primero. */
function distribute(items: BoardItem[], total: number) {
  const out: Record<string, number> = Object.fromEntries(items.map((i) => [i.orderItemId, 0]));
  let left = total;
  for (const i of [...items].reverse()) {
    const take = Math.min(left, i.quantity);
    out[i.orderItemId] = take;
    left -= take;
  }
  return out;
}

function Stepper({ value, max, onChange, size = "sm" }: { value: number; max: number; onChange: (v: number) => void; size?: "sm" | "lg" }) {
  const btn = cn("flex items-center justify-center rounded-full border border-[#1F4D36]/15 text-[#1F4D36] disabled:opacity-30", size === "lg" ? "h-10 w-10" : "h-8 w-8");
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label="Menos">
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn("min-w-8 text-center font-display font-bold tabular-nums text-[#1F4D36]", size === "lg" ? "text-2xl" : "text-base")}>{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Más">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Novedad en cocina: cuántas unidades no se pudieron preparar y de qué pedidos. Esas unidades
 * vuelven a "por preparar"; si llega el insumo se preparan y la novedad queda solucionada.
 */
export function KitchenIncidentSheet({ name, items, onClose, onDone }: { name: string; items: BoardItem[]; onClose: () => void; onDone: () => void }) {
  const total = items.reduce((s, i) => s + i.quantity, 0);
  const [qty, setQty] = useState<Record<string, number>>(() => distribute(items, total === 1 ? 1 : 0));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const missing = Object.values(qty).reduce((s, n) => s + n, 0);
  const ready = missing > 0 && reason && note.trim().length >= 3;

  const submit = () =>
    start(async () => {
      let ok = 0;
      for (const it of items) {
        const n = qty[it.orderItemId] ?? 0;
        if (!n) continue;
        const r = await reportKitchenIncident(it.orderItemId, n, reason, note);
        if (r.error) toast.error(`${it.orderCode}: ${r.error}`);
        else ok++;
      }
      if (ok) {
        notify({ ok: `Novedad registrada: ${missing} ${missing === 1 ? "plato quedó" : "platos quedaron"} por preparar.` });
        onDone();
      }
    });

  return (
    <Sheet
      title={`Novedad en ${name}`}
      description="Los platos que falten vuelven a quedar por preparar con la novedad abierta. Si llega el insumo y se preparan antes de cerrar el alistamiento, la novedad se soluciona sola."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#1B1B1B]/50">{ready ? `${missing} de ${total} sin preparar.` : "Indica cuántos faltaron, el motivo y qué pasó."}</p>
          <Button disabled={!ready || pending} onClick={submit}>
            <AlertTriangle className="h-4 w-4" /> {pending ? "Registrando…" : "Registrar novedad"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <div>
            <p className="text-sm font-semibold text-amber-900">¿Cuántos platos no se pudieron preparar?</p>
            <p className="text-xs text-amber-900/70">
              De {total} {total === 1 ? "plato" : "platos"}. Se descuentan de los últimos pedidos; ajústalo abajo si fue otro.
            </p>
          </div>
          <Stepper size="lg" value={missing} max={total} onChange={(v) => setQty(distribute(items, v))} />
        </section>

        {items.length > 1 && (
          <section>
            <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Por pedido</p>
            <ul className="divide-y divide-[#1F4D36]/[0.06] rounded-2xl border border-[#1F4D36]/10">
              {items.map((it) => (
                <li key={it.orderItemId} className={cn("flex items-center gap-3 px-3 py-2 text-sm", qty[it.orderItemId] ? "bg-amber-50/60" : "")}>
                  <span className="font-display font-bold text-[#1F4D36]">{it.orderCode}</span>
                  <span className="min-w-0 flex-1 truncate text-[#1B1B1B]/55">
                    {it.quantity}× {name}
                    {it.options.length > 0 && ` · ${it.options.join(", ")}`}
                  </span>
                  <Stepper value={qty[it.orderItemId] ?? 0} max={it.quantity} onChange={(v) => setQty((q) => ({ ...q, [it.orderItemId]: v }))} />
                </li>
              ))}
            </ul>
          </section>
        )}

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
              placeholder="Ej.: se acabó la pechuga en la 8, ya se pidió al proveedor."
              className="min-h-20 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
            />
          </label>
        </section>
      </div>
    </Sheet>
  );
}
