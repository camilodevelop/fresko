"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { reportIncident } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { PACKING_REASONS } from "@/lib/incidents";
import { notify, toast } from "@/lib/notify";
import type { RouteStopView } from "@/lib/operations";
import { cn } from "@/lib/utils";

type Draft = { reason: string; note: string };

/**
 * Registro de novedades: uno o varios pedidos que no se pudieron empacar.
 * Cada uno necesita un motivo y una explicación; salen de la ruta y quedan en espera.
 */
export function IncidentSheet({ stops, courier, onClose, onDone }: { stops: RouteStopView[]; courier: string; onClose: () => void; onDone: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    // Si cocina ya reportó faltantes, se propone ese motivo y la explicación (se puede editar).
    Object.fromEntries(stops.map((s) => [s.orderId, s.kitchenIssue ? { reason: "sin_preparar", note: `Novedad de cocina: ${s.kitchenIssue}.` } : { reason: "", note: "" }]))
  );
  const [pending, start] = useTransition();
  const set = (id: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const ready = stops.every((s) => drafts[s.orderId]?.reason && drafts[s.orderId].note.trim().length >= 3);
  const first = drafts[stops[0]?.orderId];

  const submit = () =>
    start(async () => {
      let ok = 0;
      for (const s of stops) {
        const d = drafts[s.orderId];
        const r = await reportIncident(s.orderId, d.reason, d.note);
        if (r.error) toast.error(`${s.code}: ${r.error}`);
        else ok++;
      }
      if (ok) {
        notify({ ok: ok === 1 ? `Novedad registrada: ${stops[0].code} salió de la ruta.` : `${ok} novedades registradas: los pedidos salieron de la ruta.` });
        onDone();
      }
    });

  return (
    <Sheet
      title={stops.length === 1 ? `Novedad en ${stops[0].code}` : `Cerrar canasta de ${courier}`}
      description={
        stops.length === 1
          ? "El pedido sale de la ruta y queda en espera para que el equipo de pedidos decida."
          : `${stops.length} pedidos no se pudieron empacar. Salen de la ruta y quedan en espera; la canasta puede salir con el resto.`
      }
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#1B1B1B]/50">{ready ? "Listo para registrar." : "Elige el motivo y explica qué pasó en cada pedido."}</p>
          <Button disabled={!ready || pending} onClick={submit}>
            <AlertTriangle className="h-4 w-4" /> {pending ? "Registrando…" : stops.length === 1 ? "Registrar novedad" : `Registrar ${stops.length} novedades`}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {stops.map((s, idx) => {
          const d = drafts[s.orderId];
          return (
            <section key={s.orderId} className="rounded-2xl border border-[#1F4D36]/[0.08] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-[#E8F3DC] px-2 py-0.5 font-display text-sm font-bold text-[#1F4D36] ring-1 ring-[#8BC34A]/50">{s.code}</span>
                <span className="text-sm text-[#1B1B1B]/60">
                  Parada {s.position} · {s.customer}
                </span>
                {!s.prepared && <span className="text-xs font-semibold text-amber-700">En cocina</span>}
              </div>
              <p className="mt-1 text-xs text-[#1B1B1B]/45">{s.dishes.join(", ")}</p>

              <p className="mb-1.5 mt-3 text-xs font-semibold text-[#1B1B1B]/60">Motivo</p>
              <div className="flex flex-wrap gap-1.5">
                {PACKING_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={d.reason === r.id}
                    onClick={() => set(s.orderId, { reason: r.id })}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      d.reason === r.id ? "border-amber-400 bg-amber-50 text-amber-900" : "border-[#1F4D36]/15 text-[#1B1B1B]/60 hover:border-amber-300"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">¿Qué pasó?</span>
                <textarea
                  value={d.note}
                  maxLength={500}
                  onChange={(e) => set(s.orderId, { note: e.target.value })}
                  placeholder="Ej.: se acabó el salmón, se avisó a cocina."
                  className="min-h-20 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
                />
              </label>
              {idx === 0 && stops.length > 1 && first?.reason && first.note.trim().length >= 3 && (
                <button
                  type="button"
                  onClick={() => setDrafts((all) => Object.fromEntries(Object.keys(all).map((k) => [k, { ...first }])))}
                  className="mt-1 text-xs font-semibold text-[#1F4D36]/70 hover:text-[#1F4D36]"
                >
                  Usar el mismo motivo y explicación en todos
                </button>
              )}
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}
