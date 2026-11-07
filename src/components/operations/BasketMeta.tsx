"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { setRouteCourier } from "@/app/actions/operations";
import { notify } from "@/lib/notify";
import type { RouteView, SlotCourier } from "@/lib/operations";
import { cn } from "@/lib/utils";
import { decodePolyline } from "@/lib/polyline";
import { fmtClock } from "./PackingBoard";

const RouteMap = dynamic(() => import("./RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] animate-pulse rounded-2xl bg-[#F4F8F2]" />
  ),
});

/** Mapa con la ruta de una sola canasta (sale de la cocina y vuelve). */
export function BasketMap({
  route: r,
  kitchen,
  color,
  height = 260,
}: {
  route: RouteView;
  kitchen: { name: string; lat: number; lng: number };
  color: string;
  height?: number;
}) {
  return (
    <div>
      <RouteMap
        height={height}
        kitchen={kitchen}
        routes={[
          {
            id: r.id,
            color,
            path: r.polyline ? decodePolyline(r.polyline) : undefined,
            stops: r.stops
              .filter((s) => Number.isFinite(s.lat))
              .map((s) => ({
                lat: s.lat,
                lng: s.lng,
                position: s.position,
                code: s.code,
                done: s.status === "entregado" || s.status === "no_entregado",
              })),
          },
        ]}
      />
      <p className="mt-1 text-[11px] text-[#1B1B1B]/45">
        {r.polyline
          ? "Recorrido por las calles (Google Maps)."
          : "Orden de las paradas (líneas rectas de referencia)."}{" "}
        Sale de {kitchen.name}.
      </p>
    </div>
  );
}

/** Domiciliario de la canasta: lo asigna el sistema y quien alista lo puede cambiar. */
export function CourierPicker({
  route: r,
  couriers,
  taken,
}: {
  route: RouteView;
  couriers: SlotCourier[];
  taken: string[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const busyIds = new Set(taken);
  const list =
    r.courierId && !couriers.some((c) => c.id === r.courierId)
      ? [{ id: r.courierId, name: r.courierName }, ...couriers]
      : couriers;
  return (
    <select
      value={r.courierId ?? ""}
      disabled={busy}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) =>
        start(async () => {
          notify(await setRouteCourier(r.id, e.target.value || null));
          router.refresh();
        })
      }
      aria-label="Domiciliario de la canasta"
      className={cn(
        "max-w-full truncate rounded-xl border bg-white py-1 pl-2 pr-7 font-display font-bold outline-none focus:ring-2 focus:ring-[#8BC34A]/50",
        r.courierId
          ? "border-[#1F4D36]/10 text-[#1F4D36]"
          : "border-red-300 bg-red-50 text-red-700",
      )}
    >
      <option value="">Sin domiciliario</option>
      {list.map((c) => (
        <option key={c.id} value={c.id} disabled={busyIds.has(c.id)}>
          {c.name}
          {busyIds.has(c.id) ? " (tiene otra canasta)" : ""}
        </option>
      ))}
    </select>
  );
}

const span = (from: string | null, to: string | null) => {
  if (!from || !to) return "";
  const m = Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000),
  );
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

/**
 * Tiempos de la canasta. Antes de salir: última entrega estimada y margen. En ruta y al volver:
 * horas reales de salida, última parada y regreso, y la duración real frente a la estimada.
 */
export function FinishLine({ route: r }: { route: RouteView }) {
  if (r.startedAt) {
    const planned = Math.round(r.durationS / 60);
    return (
      <span className="font-semibold text-[#1F4D36]">
        salió {fmtClock(r.startedAt)}
        {r.completedAt && <> · última parada {fmtClock(r.completedAt)}</>}
        {r.returnedAt ? (
          <>
            {" "}
            · regresó {fmtClock(r.returnedAt)} ·{" "}
            <span className="tabular-nums">
              {span(r.startedAt, r.returnedAt)}
            </span>
            <span className="font-normal text-[#1B1B1B]/45">
              {" "}
              (estimado{" "}
              {planned >= 60
                ? `${Math.floor(planned / 60)} h ${planned % 60} min`
                : `${planned} min`}
              )
            </span>
          </>
        ) : r.completedAt ? (
          <span className="text-amber-700"> · regresando</span>
        ) : null}
      </span>
    );
  }
  return <PlannedFinish route={r} />;
}

/** Domiciliarios de la franja agrupados por estado: disponibles, con canasta, en ruta y regresando. */
export function CourierBoard({
  couriers,
  routes,
}: {
  couriers: SlotCourier[];
  routes: RouteView[];
}) {
  const groups: { key: string; label: string; dot: string; names: string[] }[] =
    [
      { key: "libre", label: "Disponibles", dot: "bg-[#7CB342]", names: [] },
      {
        key: "canasta",
        label: "Con canasta",
        dot: "bg-[#1B1B1B]/30",
        names: [],
      },
      { key: "ruta", label: "En ruta", dot: "bg-sky-500", names: [] },
      { key: "regreso", label: "Regresando", dot: "bg-amber-500", names: [] },
    ];
  const add = (key: string, name: string) =>
    groups.find((g) => g.key === key)!.names.push(name);
  for (const c of couriers) {
    const open = routes.find((r) => r.courierId === c.id && !r.returnedAt);
    if (!open) add("libre", c.name);
    else if (open.status === "planificada") add("canasta", c.name);
    else if (open.status === "en_camino")
      add("ruta", `${c.name} (salió ${fmtClock(open.startedAt)})`);
    else add("regreso", c.name);
  }
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-2xl bg-white/70 px-4 py-2.5 text-xs ring-1 ring-[#1F4D36]/[0.06]">
      <span className="font-bold uppercase tracking-wider text-[#1B1B1B]/40">
        Domiciliarios
      </span>
      {groups
        .filter((g) => g.names.length)
        .map((g) => (
          <span key={g.key} className="flex min-w-0 items-center gap-1.5">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", g.dot)} />
            <span className="font-semibold text-[#1F4D36]">
              {g.label} ({g.names.length}):
            </span>
            <span className="text-[#1B1B1B]/60">{g.names.join(", ")}</span>
          </span>
        ))}
    </div>
  );
}

/** Última entrega estimada y cuánto margen queda antes de que termine la franja. */
function PlannedFinish({ route: r }: { route: RouteView }) {
  if (!r.lastEta || !r.slotEnd) return null;
  const margin = Math.round(
    (new Date(r.slotEnd).getTime() - new Date(r.lastEta).getTime()) / 60000,
  );
  return (
    <span
      className={cn(
        "font-semibold",
        margin < 0
          ? "text-red-700"
          : margin < 10
            ? "text-amber-700"
            : "text-[#2E6B1F]",
      )}
    >
      última entrega ≈ {fmtClock(r.lastEta)} (
      {margin < 0 ? `se pasa ${-margin} min` : `margen ${margin} min`})
    </span>
  );
}

const STOP_STATE: Record<string, { label: string; cls: string }> = {
  entregado: { label: "Entregado", cls: "text-[#2E6B1F]" },
  no_entregado: { label: "No entregado", cls: "text-red-700" },
  cancelado: { label: "Cancelado", cls: "text-[#1B1B1B]/45" },
  en_camino: { label: "En camino", cls: "text-sky-700" },
};

/** Historial de la franja en Alistamiento: canastas que ya salieron, compactas y desplegables. */
export function DepartedBaskets({
  routes,
  kitchen,
}: {
  routes: { route: RouteView; color: string }[];
  kitchen: { name: string; lat: number; lng: number };
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">
        Canastas que salieron ({routes.length})
      </h3>
      {routes.map(({ route: r, color }) => (
        <DepartedBasket key={r.id} route={r} color={color} kitchen={kitchen} />
      ))}
    </section>
  );
}

function DepartedBasket({
  route: r,
  color,
  kitchen,
}: {
  route: RouteView;
  color: string;
  kitchen: { name: string; lat: number; lng: number };
}) {
  // El mapa solo se monta al abrir la canasta.
  const [open, setOpen] = useState(false);
  {
    const delivered = r.stops.filter((s) => s.status === "entregado").length;
    const failed = r.stops.filter((s) => s.status === "no_entregado").length;
    const state = r.returnedAt
      ? { label: "Terminada", cls: "bg-[#E8F3DC] text-[#2E6B1F]" }
      : r.status === "completada"
        ? { label: "Regresando", cls: "bg-amber-50 text-amber-900" }
        : { label: "En ruta", cls: "bg-sky-50 text-sky-800" };
    return (
      <details
        className="group rounded-2xl border border-[#1F4D36]/[0.08] bg-white"
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <span
            className="h-8 w-1.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-[#1F4D36]">
              {r.courierName}
            </span>
            <span className="ml-2 text-xs text-[#1B1B1B]/55">
              {delivered}/{r.stops.length} entregados
              {failed > 0 && (
                <span className="text-red-700"> · {failed} no entregados</span>
              )}
            </span>
            <span className="block text-xs text-[#1B1B1B]/50">
              <FinishLine route={r} />
            </span>
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              state.cls,
            )}
          >
            {state.label}
          </span>
          <ChevronDown className="h-4 w-4 text-[#1B1B1B]/40 transition group-open:rotate-180" />
        </summary>
        {open && (
          <div className="border-t border-[#1F4D36]/[0.06] p-3">
            <BasketMap route={r} kitchen={kitchen} color={color} height={220} />
          </div>
        )}
        <ol className="divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
          {r.stops.map((s) => {
            const st = STOP_STATE[s.status] ?? {
              label: s.status,
              cls: "text-[#1B1B1B]/45",
            };
            return (
              <li
                key={s.orderId}
                className="flex items-center gap-3 px-4 py-2 text-sm"
              >
                <span className="w-6 text-center text-xs font-bold text-[#1B1B1B]/40">
                  {s.position}
                </span>
                <span className="w-20 font-display font-bold text-[#1F4D36]">
                  {s.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-[#1B1B1B]/60">
                  {s.customer} · {s.dishes.join(", ")}
                </span>
                <span className={cn("shrink-0 text-xs font-semibold", st.cls)}>
                  {st.label}
                  {s.status === "entregado" && s.deliveredAt
                    ? ` · ${fmtClock(s.deliveredAt)}`
                    : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </details>
    );
  }
}
