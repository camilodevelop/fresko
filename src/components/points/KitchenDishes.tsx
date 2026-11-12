"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Refrigerator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Panel, StatusBadge, fieldLabelClass } from "@/components/dashboard/ui";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";
import type { DishLotView } from "@/lib/points";
import { writeOffDishes } from "@/app/admin/puntos/actions";

const KINDS = [
  { id: "equipo", label: "Alimentación del equipo" },
  { id: "donacion", label: "Donación" },
  { id: "perdida", label: "Pérdida (dañado o vencido)" },
] as const;

const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

/** Platos listos guardados en la cocina (vitrina): sirven para el mostrador o la próxima carga. */
export function KitchenDishes({ lots, nearExpiry, now }: { lots: DishLotView[]; nearExpiry: number; now: number }) {
  const [writing, setWriting] = useState<DishLotView | null>(null);
  return (
    <Panel
      title="Platos listos en la cocina"
      description={`Se venden en el mostrador (vitrina) o salen en la próxima carga. Lo que esté por vencer (menos de ${nearExpiry} h) o vencido se da de baja aquí.`}
      icon={Refrigerator}
      bodyClassName="p-0 sm:p-0"
    >
      {lots.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-[#1B1B1B]/50 sm:px-6">No hay platos guardados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2] text-left text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
              <tr>
                <th className="px-5 py-2.5 sm:px-6">Plato</th>
                <th className="px-3 py-2.5 text-right">Unidades</th>
                <th className="px-3 py-2.5">Preparado</th>
                <th className="px-3 py-2.5">Vence</th>
                <th className="px-5 py-2.5 text-right sm:px-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F4D36]/[0.06]">
              {lots.map((l) => {
                const hours = (new Date(l.expiresAt).getTime() - now) / 3_600_000;
                return (
                  <tr key={l.lotId}>
                    <td className="px-5 py-2.5 sm:px-6">
                      <p className="font-semibold text-[#1F4D36]">{l.name}</p>
                      <p className="text-xs text-[#1B1B1B]/45">
                        Costo {formatPrice(Math.round(l.unitCost))} c/u{l.returned ? " · volvió de un punto" : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2.5 text-[#1B1B1B]/60">{fmt.format(new Date(l.producedAt))}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={hours <= 0 ? "red" : hours < nearExpiry ? "amber" : "green"}>
                        {hours <= 0 ? "Vencido" : hours < 1 ? `En ${Math.round(hours * 60)} min` : `En ${Math.floor(hours)} h`}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-2.5 text-right sm:px-6">
                      <Button size="sm" variant={hours < nearExpiry ? "secondary" : "ghost"} onClick={() => setWriting(l)}>
                        Dar de baja
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {writing && <WriteOffSheet lot={writing} onClose={() => setWriting(null)} />}
    </Panel>
  );
}

function WriteOffSheet({ lot, onClose }: { lot: DishLotView; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("equipo");
  const [qty, setQty] = useState(lot.quantity);
  const [note, setNote] = useState("");
  return (
    <Sheet
      title={`Dar de baja: ${lot.name}`}
      description={`${lot.quantity} unidades en la cocina.`}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || qty < 1}
          onClick={() =>
            start(async () => {
              if (notify(await writeOffDishes(lot.lotId, kind, qty, note))) {
                onClose();
                router.refresh();
              }
            })
          }
        >
          Registrar {qty} {qty === 1 ? "unidad" : "unidades"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={kind === k.id}
              className={cn("rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold", kind === k.id ? "border-[#1F4D36] bg-[#F4F8F2] text-[#1F4D36]" : "border-[#1F4D36]/10")}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="wo-qty" className={fieldLabelClass}>
            Unidades
          </label>
          <Input id="wo-qty" inputMode="numeric" className="mt-1.5 w-28" value={qty || ""} onChange={(e) => setQty(Math.min(lot.quantity, Number(e.target.value.replace(/\D/g, "") || 0)))} />
        </div>
        <div>
          <label htmlFor="wo-note" className={fieldLabelClass}>
            Nota (opcional)
          </label>
          <Input id="wo-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ej. donado a la fundación del barrio" />
        </div>
      </div>
    </Sheet>
  );
}
