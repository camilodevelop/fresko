"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChefHat, Clock, Lock, Play, Sparkles, Timer, X } from "lucide-react";
import { cancelBatch, finishBatch, startBatch } from "@/app/actions/operations";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatTime12 } from "@/lib/delivery";
import { notify } from "@/lib/notify";
import type { BoardBatch, BoardGroup, BoardItem, BoardSlot, IncidentView, RecipeLine } from "@/lib/operations";
import { formatQty } from "@/lib/pricing";
import { isCutoutImage } from "@/lib/product-image";
import { cn } from "@/lib/utils";
import { IncidentsPanel } from "./IncidentsPanel";
import { KitchenIncidentSheet } from "./KitchenIncidentSheet";
import { KitchenCloseSheet } from "./KitchenCloseSheet";

export const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m}:${String(sec).padStart(2, "0")}`;
};

/** Cronómetro en vivo desde que empezó la tanda. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums" suppressHydrationWarning>
      {fmtDuration(Math.max(0, Math.round((now - new Date(since).getTime()) / 1000)))}
    </span>
  );
}

function Recipe({ lines }: { lines: RecipeLine[] }) {
  if (!lines.length) return <p className="text-xs text-[#1B1B1B]/45">Este plato no tiene receta registrada.</p>;
  return (
    <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-3 border-b border-dashed border-[#1F4D36]/10 py-1">
          <span className="text-[#1B1B1B]/70">{l.name}</span>
          <span className="font-semibold tabular-nums text-[#1F4D36]">{formatQty(Math.round(l.quantity * 10) / 10, l.unit)}</span>
        </li>
      ))}
    </ul>
  );
}

const thumb = (src: string | null, size = 48) => (
  <span className="relative shrink-0 overflow-hidden rounded-2xl bg-[#F4F8F2]" style={{ width: size, height: size }}>
    {src ? (
      <Image src={src} alt="" fill sizes={`${size}px`} className={isCutoutImage(src) ? "object-contain p-1" : "object-cover"} />
    ) : (
      <Sparkles className="m-auto h-full w-5 text-[#1F4D36]/40" />
    )}
  </span>
);

/** Producción del día: tandas por franja y plato, cronómetro, receta y etiquetas. */
export function KitchenBoard({
  kitchenId,
  date,
  slots,
  avgSeconds,
  incidents,
}: {
  kitchenId: string;
  date: string;
  slots: BoardSlot[];
  avgSeconds: Record<string, number | null>;
  incidents: IncidentView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ name: string; items: BoardItem[] } | null>(null);
  const [closing, setClosing] = useState<BoardSlot | null>(null);

  // Varios cocineros a la vez: cada uno ve lo que inician los demás sin recargar.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  const begin = (slotId: string, g: BoardGroup) =>
    start(async () => {
      setBusy(g.key);
      notify(await startBatch({ kitchenId, date, slotId, productId: g.kind === "lote" ? g.productId : null, orderItemId: g.kind === "armado" ? g.key : null }));
      setBusy(null);
      router.refresh();
    });

  const finish = (b: BoardBatch) =>
    start(async () => {
      setBusy(b.id);
      notify(await finishBatch(b.id));
      setBusy(null);
      router.refresh();
    });

  const cancel = (b: BoardBatch) =>
    start(async () => {
      setBusy(b.id);
      notify(await cancelBatch(b.id));
      setBusy(null);
      router.refresh();
    });

  const nothing = slots.every((s) => s.pending.length === 0 && s.active.length === 0 && s.done.length === 0);
  const panel = (
    <IncidentsPanel
      incidents={incidents}
      description="Platos o pedidos que no se pudieron preparar o empacar. Quedan en espera hasta que el equipo de pedidos los libere o los cancele."
    />
  );
  const closeSheet = closing && (
    <KitchenCloseSheet
      kitchenId={kitchenId}
      date={date}
      slotId={closing.slotId}
      slotLabel={closing.label
        .split(" – ")
        .map((t) => formatTime12(t))
        .join(" – ")}
      pending={closing.pending}
      onClose={() => setClosing(null)}
      onDone={() => {
        setClosing(null);
        router.refresh();
      }}
    />
  );
  const sheet = reporting && (
    <KitchenIncidentSheet
      name={reporting.name}
      items={reporting.items}
      onClose={() => setReporting(null)}
      onDone={() => {
        setReporting(null);
        router.refresh();
      }}
    />
  );
  if (nothing) {
    return (
      <div className="space-y-8">
        <Panel>
          <p className="py-10 text-center text-sm text-[#1B1B1B]/50">No hay pedidos para preparar este día.</p>
        </Panel>
        {panel}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {slots.map((slot) => {
        const [startT, endT] = slot.label.split(" – ");
        const units = slot.pending.reduce((s, g) => s + g.quantity, 0);
        return (
          <section key={slot.slotId}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7CB342]">Franja · {slot.zoneName}</p>
                <h2 className="font-display text-xl font-bold text-[#1F4D36]">
                  {formatTime12(startT)} – {formatTime12(endT)}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge tone={units ? "amber" : "green"}>{units ? `${units} platos por preparar` : "Todo preparado"}</StatusBadge>
                {units > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-800 hover:bg-amber-50"
                    disabled={pending || slot.active.length > 0}
                    title={slot.active.length ? "Termina o reporta las tandas en curso primero" : "Lo pendiente queda como novedad y alistamiento puede salir"}
                    onClick={() => setClosing(slot)}
                  >
                    <Lock className="h-3.5 w-3.5" /> Cerrar con novedades
                  </Button>
                )}
                <StatusBadge tone="gray" dot={false}>
                  {slot.ordersReady}/{slot.ordersTotal} pedidos listos
                </StatusBadge>
              </div>
            </div>

            {/* En preparación */}
            {slot.active.map((b) => (
              <div key={b.id} className="mb-4 rounded-3xl border-2 border-[#8BC34A] bg-white p-5 shadow-lg shadow-[#8BC34A]/10 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  {thumb(b.image, 64)}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7CB342]">
                      <ChefHat className="h-3.5 w-3.5" /> Preparando
                      {b.cook && <span className="font-semibold normal-case tracking-normal text-[#1B1B1B]/50">· {b.cook}</span>}
                    </p>
                    <p className="font-display text-2xl font-bold text-[#1F4D36]">
                      {b.quantity}× {b.name}
                    </p>
                    {b.kind === "armado" && b.items[0]?.options.length ? (
                      <p className="mt-0.5 text-sm text-[#1B1B1B]/60">{b.items[0].options.join(", ")}</p>
                    ) : null}
                    {b.kind === "armado" ? (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#E8F3DC] px-3 py-1.5 text-sm text-[#1F4D36] ring-1 ring-[#8BC34A]/50">
                        Va para el pedido <strong className="font-display">{b.items[0]?.orderCode}</strong>: déjalo marcado en su puesto.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[#1B1B1B]/45">Pedidos: {[...new Set(b.items.map((i) => i.orderCode))].join(", ")}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1.5 font-display text-3xl font-bold text-[#1F4D36]">
                      <Timer className="h-6 w-6 text-[#7CB342]" />
                      <Elapsed since={b.startedAt} />
                    </p>
                    {avgSeconds[`${b.kind}:${b.productId}`] ? (
                      <p className="text-[11px] text-[#1B1B1B]/45">
                        Promedio: {fmtDuration((avgSeconds[`${b.kind}:${b.productId}`] ?? 0) * b.quantity)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-[#F8F7F2] p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Receta para {b.quantity}</p>
                  <Recipe lines={b.recipe} />
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" className="mr-auto text-amber-800 hover:bg-amber-50" disabled={pending} onClick={() => setReporting({ name: b.name, items: b.items })}>
                    <AlertTriangle className="h-4 w-4" /> No se pudo preparar
                  </Button>
                  <Button variant="ghost" disabled={pending} onClick={() => cancel(b)}>
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button size="lg" disabled={pending} onClick={() => finish(b)}>
                    <CheckCircle2 className="h-4 w-4" /> {busy === b.id ? "Terminando…" : `Terminar ${b.quantity} ${b.quantity === 1 ? "plato" : "platos"}`}
                  </Button>
                </div>
              </div>
            ))}

            {/* Por preparar, en orden de prioridad */}
            {slot.pending.length > 0 && (
              <ol className="space-y-2">
                {slot.pending.map((g, i) => {
                  const avg = avgSeconds[`${g.kind}:${g.productId}`];
                  return (
                    <li
                      key={g.key}
                      className={cn(
                        "flex flex-wrap items-center gap-4 rounded-3xl border bg-white p-4",
                        g.kind === "armado" ? "border-dashed border-[#8BC34A]/60" : "border-[#1F4D36]/[0.08]"
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F8F2] text-xs font-bold text-[#1F4D36]">{i + 1}</span>
                      {thumb(g.image)}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#1F4D36]">
                          <span className="font-display text-lg">{g.quantity}×</span> {g.name}
                          {g.kind === "armado" && <StatusBadge tone="blue" dot={false} className="ml-2 align-middle">Armado</StatusBadge>}
                        </p>
                        <p className="truncate text-xs text-[#1B1B1B]/50">
                          {g.kind === "armado" ? g.items[0]?.options.join(", ") : `${g.orders} ${g.orders === 1 ? "pedido" : "pedidos"}: ${[...new Set(g.items.map((x) => x.orderCode))].join(", ")}`}
                        </p>
                        {g.items.some((x) => x.shortage > 0) && (
                          <p className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                            <AlertTriangle className="h-3 w-3" /> Faltantes por novedad: {g.items.reduce((s, x) => s + Math.min(x.shortage, x.quantity), 0)}. Al prepararlos se soluciona.
                          </p>
                        )}
                      </div>
                      {avg ? (
                        <span className="flex items-center gap-1 text-xs text-[#1B1B1B]/45">
                          <Clock className="h-3.5 w-3.5" /> ≈ {fmtDuration(avg * g.quantity)}
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-amber-700 hover:bg-amber-50"
                        disabled={pending}
                        onClick={() => setReporting({ name: g.name, items: g.items })}
                        title="No se puede preparar: registrar novedad"
                        aria-label={`Registrar novedad en ${g.name}`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                      <Button disabled={pending} onClick={() => begin(slot.slotId, g)}>
                        <Play className="h-4 w-4" /> {busy === g.key ? "Iniciando…" : "Iniciar"}
                      </Button>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Listas */}
            {slot.done.length > 0 && (
              <details className="mt-3 rounded-3xl border border-[#1F4D36]/[0.06] bg-white/60 px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#1F4D36]">
                  <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-[#7CB342]" />
                  {slot.done.length} {slot.done.length === 1 ? "tanda lista" : "tandas listas"}
                </summary>
                <ul className="mt-3 divide-y divide-[#1F4D36]/[0.06]">
                  {slot.done.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                      <span className="min-w-0 flex-1 font-medium text-[#1F4D36]">
                        {b.quantity}× {b.name}
                        <span className="ml-2 text-xs font-normal text-[#1B1B1B]/45">
                          {[...new Set(b.items.map((i) => i.orderCode))].join(", ")}
                          {b.cook ? ` · ${b.cook}` : ""}
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-[#1B1B1B]/55">
                        {fmtDuration(b.durationSeconds ?? 0)}
                        {b.quantity > 1 && ` · ${fmtDuration(Math.round((b.durationSeconds ?? 0) / b.quantity))} c/u`}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
      {panel}
      {sheet}
      {closeSheet}
    </div>
  );
}
