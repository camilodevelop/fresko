"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bus, ChefHat, ClipboardList, Send, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Panel, StatusBadge, fieldLabelClass } from "@/components/dashboard/ui";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";
import type { LoadView, PointProduct, PointRow } from "@/lib/points";
import { LOAD_STATUS_UI } from "@/components/points/status";
import { cancelLoad, dispatchLoad, savePlan, sendLoad } from "@/app/admin/puntos/actions";

export type Suggestion = { productId: string; avgSold: number; loads: number; kitchenStock: number };

const num = (v: string) => Math.max(0, Math.min(500, Number(v.replace(/\D/g, "") || 0)));

/** Plan del día por punto: qué se lleva, qué prepara la cocina, despacho y resultado. */
export function PointsDay({
  date,
  points,
  loads,
  products,
  suggestions,
  kitchenStock,
  editable,
}: {
  date: string;
  points: PointRow[];
  loads: Record<string, LoadView | null>;
  products: PointProduct[];
  suggestions: Record<string, Suggestion[]>;
  kitchenStock: Record<string, number>;
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [planning, setPlanning] = useState<PointRow | null>(null);
  const [dispatching, setDispatching] = useState<{ point: PointRow; load: LoadView } | null>(null);
  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => {
      notify(await fn());
      router.refresh();
    });

  if (points.length === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-[#1B1B1B]/50">No hay puntos activos en esta cocina. Créalos en Configuración → Operación → Puntos de venta.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      {points.map((p) => {
        const ld = loads[p.id];
        const st = ld ? LOAD_STATUS_UI[ld.status] : null;
        const sold = ld?.lines.reduce((s, l) => s + l.sold, 0) ?? 0;
        const sent = ld?.lines.reduce((s, l) => s + l.received, 0) ?? 0;
        return (
          <Panel
            key={p.id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {p.name}
                {st && <StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
              </span>
            }
            description={[p.schedule, p.vendors.map((v) => v.name).join(", ") || "Sin vendedor asignado"].filter(Boolean).join(" · ")}
            actions={
              editable && (
                <>
                  {(!ld || ld.status === "planeada" || ld.status === "en_produccion") && (
                    <Button size="sm" variant="secondary" onClick={() => setPlanning(p)}>
                      <ClipboardList className="h-3.5 w-3.5" /> {ld ? "Editar plan" : "Planear carga"}
                    </Button>
                  )}
                  {ld?.status === "planeada" && (
                    <Button size="sm" disabled={pending} onClick={() => run(() => sendLoad(ld.id))}>
                      <Send className="h-3.5 w-3.5" /> Enviar a cocina
                    </Button>
                  )}
                  {(ld?.status === "en_produccion" || ld?.status === "planeada") && (
                    <Button size="sm" variant="fresh" disabled={pending} onClick={() => setDispatching({ point: p, load: ld })}>
                      <Truck className="h-3.5 w-3.5" /> Despachar
                    </Button>
                  )}
                  {(ld?.status === "en_produccion" || ld?.status === "planeada") && (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelLoad(ld.id))}>
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  )}
                </>
              )
            }
            bodyClassName="p-0 sm:p-0"
          >
            {!ld ? (
              <p className="px-5 pb-5 text-sm text-[#1B1B1B]/50 sm:px-6">Sin plan para este día.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2] text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                      <tr>
                        <th className="px-5 py-2.5 text-left sm:px-6">Plato</th>
                        <th className="px-3 py-2.5 text-right">Plan</th>
                        <th className="px-3 py-2.5 text-right">A preparar</th>
                        <th className="px-3 py-2.5 text-right">Preparado</th>
                        <th className="px-3 py-2.5 text-right">Despachado</th>
                        <th className="px-3 py-2.5 text-right">Recibido</th>
                        <th className="px-3 py-2.5 text-right">Vendido</th>
                        <th className="px-5 py-2.5 text-right sm:px-6">En el punto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F4D36]/[0.06]">
                      {ld.lines.map((l) => (
                        <tr key={l.productId}>
                          <td className="px-5 py-2.5 font-semibold text-[#1F4D36] sm:px-6">{l.name}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{l.planned}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{l.toProduce}</td>
                          <td className={cn("px-3 py-2.5 text-right tabular-nums", l.produced < l.toProduce && "text-amber-700")}>{l.produced}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{l.dispatched || "—"}</td>
                          <td className={cn("px-3 py-2.5 text-right tabular-nums", l.received < l.dispatched && ld.status !== "despachada" && "text-red-700")}>
                            {ld.status === "en_venta" || ld.status === "cerrada" ? l.received : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{l.sold || "—"}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums sm:px-6">{l.atPoint || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2 px-5 py-4 text-xs sm:px-6">
                  {ld.status === "en_produccion" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-amber-900">
                      <ChefHat className="h-3.5 w-3.5" /> La cocina lo ve en su tablero
                    </span>
                  )}
                  {(ld.status === "en_venta" || ld.status === "cerrada") && sent > 0 && (
                    <span className="rounded-full bg-[#E8F3DC] px-3 py-1.5 text-[#2E6B1F]">
                      Venta real <strong>{Math.round((sold / sent) * 100)} %</strong>
                    </span>
                  )}
                  {ld.transportCost > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F8F2] px-3 py-1.5 text-[#1F4D36]">
                      <Bus className="h-3.5 w-3.5" /> Transporte {formatPrice(ld.transportCost)}
                    </span>
                  )}
                  {ld.status === "cerrada" && (
                    <>
                      {ld.returned > 0 && <span className="rounded-full bg-[#F4F8F2] px-3 py-1.5">Volvieron a cocina {ld.returned}</span>}
                      {ld.staff > 0 && <span className="rounded-full bg-[#F4F8F2] px-3 py-1.5">Equipo {ld.staff}</span>}
                      {ld.donated > 0 && <span className="rounded-full bg-[#F4F8F2] px-3 py-1.5">Donación {ld.donated}</span>}
                      {ld.lost > 0 && <span className="rounded-full bg-red-50 px-3 py-1.5 text-red-700">Pérdida {ld.lost}</span>}
                    </>
                  )}
                  {ld.missing > 0 && <span className="rounded-full bg-red-50 px-3 py-1.5 font-semibold text-red-700">Faltantes {ld.missing}</span>}
                  {ld.notes && <span className="italic text-[#1B1B1B]/55">“{ld.notes}”</span>}
                </div>
              </>
            )}
          </Panel>
        );
      })}

      {planning && (
        <PlanSheet
          point={planning}
          date={date}
          load={loads[planning.id] ?? null}
          products={products}
          suggestions={suggestions[planning.id] ?? []}
          onClose={() => setPlanning(null)}
          onDone={() => {
            setPlanning(null);
            router.refresh();
          }}
        />
      )}
      {dispatching && (
        <DispatchSheet
          point={dispatching.point}
          load={dispatching.load}
          kitchenStock={kitchenStock}
          onClose={() => setDispatching(null)}
          onDone={() => {
            setDispatching(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function PlanSheet({
  point,
  date,
  load,
  products,
  suggestions,
  onClose,
  onDone,
}: {
  point: PointRow;
  date: string;
  load: LoadView | null;
  products: PointProduct[];
  suggestions: Suggestion[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const sug = (pid: string) => suggestions.find((s) => s.productId === pid);
  const hasHistory = suggestions.some((s) => s.loads > 0);
  const [rows, setRows] = useState(
    products.map((p) => {
      const line = load?.lines.find((l) => l.productId === p.id);
      const s = sug(p.id);
      const planned = line?.planned ?? (s && s.loads > 0 ? Math.round(s.avgSold) : 0);
      return { productId: p.id, name: p.name, planned, toProduce: line?.toProduce ?? Math.max(0, planned - (s?.kitchenStock ?? 0)), produced: line?.produced ?? 0 };
    })
  );
  const [notes, setNotes] = useState(load?.notes ?? "");
  const set = (pid: string, patch: Partial<(typeof rows)[number]>) => setRows(rows.map((r) => (r.productId === pid ? { ...r, ...patch } : r)));
  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const totalProduce = rows.reduce((s, r) => s + r.toProduce, 0);
  const save = (send: boolean) =>
    start(async () => {
      if (notify(await savePlan(point.id, date, rows.map((r) => ({ productId: r.productId, planned: r.planned, toProduce: r.toProduce })), notes, send))) onDone();
    });

  return (
    <Sheet
      title={`Plan para ${point.name}`}
      description={
        hasHistory
          ? "La sugerencia es el promedio vendido los últimos 4 días iguales. “Preparar” descuenta lo que ya hay listo en la cocina."
          : "Aún no hay historial de ventas de este punto: escribe cuánto llevar. “Preparar” descuenta lo que ya hay listo en la cocina."
      }
      onClose={onClose}
      className="md:w-[min(760px,calc(100%-3rem))]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#1B1B1B]/60">
            Llevar <strong className="text-[#1F4D36]">{totalPlanned}</strong> · preparar <strong className="text-[#1F4D36]">{totalProduce}</strong>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={pending} onClick={() => save(false)}>
              Guardar
            </Button>
            {(!load || load.status === "planeada") && (
              <Button disabled={pending || totalPlanned === 0} onClick={() => save(true)}>
                <Send className="h-4 w-4" /> Guardar y enviar a cocina
              </Button>
            )}
          </div>
        </div>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[#1B1B1B]/50">
          <tr>
            <th className="pb-2 font-semibold">Plato</th>
            <th className="pb-2 text-right font-semibold">Sugerido</th>
            <th className="pb-2 text-right font-semibold">Listos en cocina</th>
            <th className="pb-2 text-right font-semibold">Llevar</th>
            <th className="pb-2 text-right font-semibold">Preparar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1F4D36]/[0.06]">
          {rows.map((r) => {
            const s = sug(r.productId);
            return (
              <tr key={r.productId}>
                <td className="py-2 font-semibold text-[#1F4D36]">{r.name}</td>
                <td className="py-2 text-right text-[#1B1B1B]/60">{s && s.loads > 0 ? s.avgSold.toLocaleString("es-CO") : "—"}</td>
                <td className="py-2 text-right text-[#1B1B1B]/60">{s?.kitchenStock || "—"}</td>
                <td className="py-2 text-right">
                  <Input
                    aria-label={`Llevar ${r.name}`}
                    inputMode="numeric"
                    className="ml-auto h-9 w-16 text-right"
                    value={r.planned || ""}
                    placeholder="0"
                    onChange={(e) => {
                      const planned = num(e.target.value);
                      set(r.productId, { planned, toProduce: Math.max(r.produced, planned - (s?.kitchenStock ?? 0)) });
                    }}
                  />
                </td>
                <td className="py-2 text-right">
                  <Input
                    aria-label={`Preparar ${r.name}`}
                    inputMode="numeric"
                    className="ml-auto h-9 w-16 text-right"
                    value={r.toProduce || ""}
                    placeholder="0"
                    onChange={(e) => set(r.productId, { toProduce: Math.max(r.produced, num(e.target.value)) })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label htmlFor="plan-notes" className={cn(fieldLabelClass, "mt-4")}>
        Nota (opcional)
      </label>
      <Input id="plan-notes" className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Ej. evento en la torre, llevar más" />
    </Sheet>
  );
}

function DispatchSheet({ point, load, kitchenStock, onClose, onDone }: { point: PointRow; load: LoadView; kitchenStock: Record<string, number>; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [qty, setQty] = useState<Record<string, number>>(
    Object.fromEntries(load.lines.map((l) => [l.productId, Math.min(l.planned, kitchenStock[l.productId] ?? 0)]))
  );
  const total = Object.values(qty).reduce((s, n) => s + n, 0);
  return (
    <Sheet
      title={`Despachar a ${point.name}`}
      description="Sale de la vitrina de la cocina lo que vence primero. El vendedor confirma al recibir."
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || total === 0}
          onClick={() =>
            start(async () => {
              if (notify(await dispatchLoad(load.id, Object.entries(qty).map(([productId, quantity]) => ({ productId, quantity }))))) onDone();
            })
          }
        >
          <Truck className="h-4 w-4" /> Despachar {total} platos
        </Button>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[#1B1B1B]/50">
          <tr>
            <th className="pb-2 font-semibold">Plato</th>
            <th className="pb-2 text-right font-semibold">Plan</th>
            <th className="pb-2 text-right font-semibold">Listos en cocina</th>
            <th className="pb-2 text-right font-semibold">Despachar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1F4D36]/[0.06]">
          {load.lines.map((l) => {
            const avail = kitchenStock[l.productId] ?? 0;
            return (
              <tr key={l.productId}>
                <td className="py-2 font-semibold text-[#1F4D36]">{l.name}</td>
                <td className="py-2 text-right">{l.planned}</td>
                <td className={cn("py-2 text-right", avail < l.planned && "font-semibold text-amber-700")}>{avail}</td>
                <td className="py-2 text-right">
                  <Input
                    aria-label={`Despachar ${l.name}`}
                    inputMode="numeric"
                    className="ml-auto h-9 w-16 text-right"
                    value={qty[l.productId] || ""}
                    placeholder="0"
                    onChange={(e) => setQty({ ...qty, [l.productId]: Math.min(avail, num(e.target.value)) })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {load.lines.some((l) => (kitchenStock[l.productId] ?? 0) < l.planned) && (
        <p className="mt-3 text-sm text-amber-800">Hay platos con menos unidades listas que el plan: la cocina aún no los termina o puedes despachar lo que hay.</p>
      )}
    </Sheet>
  );
}
