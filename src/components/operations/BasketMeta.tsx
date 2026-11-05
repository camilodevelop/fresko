"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRouteCourier } from "@/app/actions/operations";
import { notify } from "@/lib/notify";
import type { RouteView, SlotCourier } from "@/lib/operations";
import { cn } from "@/lib/utils";
import { fmtClock } from "./PackingBoard";

/** Domiciliario de la canasta: lo asigna el sistema y quien alista lo puede cambiar. */
export function CourierPicker({ route: r, couriers, taken }: { route: RouteView; couriers: SlotCourier[]; taken: string[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const busyIds = new Set(taken);
  const list = r.courierId && !couriers.some((c) => c.id === r.courierId) ? [{ id: r.courierId, name: r.courierName }, ...couriers] : couriers;
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
        r.courierId ? "border-[#1F4D36]/10 text-[#1F4D36]" : "border-red-300 bg-red-50 text-red-700"
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
  const m = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
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
            · regresó {fmtClock(r.returnedAt)} · <span className="tabular-nums">{span(r.startedAt, r.returnedAt)}</span>
            <span className="font-normal text-[#1B1B1B]/45"> (estimado {planned >= 60 ? `${Math.floor(planned / 60)} h ${planned % 60} min` : `${planned} min`})</span>
          </>
        ) : r.completedAt ? (
          <span className="text-amber-700"> · regresando</span>
        ) : null}
      </span>
    );
  }
  return <PlannedFinish route={r} />;
}

/** Estado de cada domiciliario de la franja: disponible, alistando, en ruta o regresando. */
export function CourierBoard({ couriers, routes }: { couriers: SlotCourier[]; routes: RouteView[] }) {
  const stateOf = (id: string) => {
    const open = routes.find((r) => r.courierId === id && !r.returnedAt);
    if (!open) return { label: routes.some((r) => r.courierId === id) ? "Disponible · ya hizo una ruta" : "Disponible", tone: "green" as const };
    if (open.status === "planificada") return { label: open.packingStarted ? "Alistando su canasta" : "Con canasta por alistar", tone: "gray" as const };
    if (open.status === "en_camino") return { label: `En ruta · salió ${fmtClock(open.startedAt)}`, tone: "blue" as const };
    return { label: `Regresando · última parada ${fmtClock(open.completedAt)}`, tone: "amber" as const };
  };
  const tones = { green: "bg-[#E8F3DC] text-[#2E6B1F]", gray: "bg-[#F4F4F1] text-[#1B1B1B]/60", blue: "bg-sky-50 text-sky-800", amber: "bg-amber-50 text-amber-900" };
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">Domiciliarios</span>
      {couriers.map((c) => {
        const st = stateOf(c.id);
        return (
          <span key={c.id} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tones[st.tone])}>
            {c.name} · <span className="font-normal">{st.label}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Última entrega estimada y cuánto margen queda antes de que termine la franja. */
function PlannedFinish({ route: r }: { route: RouteView }) {
  if (!r.lastEta || !r.slotEnd) return null;
  const margin = Math.round((new Date(r.slotEnd).getTime() - new Date(r.lastEta).getTime()) / 60000);
  return (
    <span className={cn("font-semibold", margin < 0 ? "text-red-700" : margin < 10 ? "text-amber-700" : "text-[#2E6B1F]")}>
      última entrega ≈ {fmtClock(r.lastEta)} ({margin < 0 ? `se pasa ${-margin} min` : `margen ${margin} min`})
    </span>
  );
}
