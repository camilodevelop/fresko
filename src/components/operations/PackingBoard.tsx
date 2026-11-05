"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  CornerDownLeft,
  Map as MapIcon,
  PackageCheck,
  Printer,
  Route,
  ScanLine,
  Truck,
  Undo2,
} from "lucide-react";
import { packOrder, packRoute, planSlotRoutes } from "@/app/actions/operations";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatTime12 } from "@/lib/delivery";
import { notify, toast } from "@/lib/notify";
import type {
  IncidentView,
  LateSlot,
  RouteStopView,
  RouteView,
  SlotCourier,
} from "@/lib/operations";
import { CourierBoard, CourierPicker, FinishLine } from "./BasketMeta";
import { LateOrders } from "./LateOrders";
import { IncidentSheet } from "./IncidentSheet";
import { IncidentsPanel } from "./IncidentsPanel";
import { decodePolyline } from "@/lib/polyline";
import { cn } from "@/lib/utils";

const RouteMap = dynamic(() => import("./RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] animate-pulse rounded-2xl bg-[#F4F8F2]" />
  ),
});

export const ROUTE_COLORS = [
  "#2E7D32",
  "#1565C0",
  "#EF6C00",
  "#6A1B9A",
  "#C62828",
  "#00838F",
];

const ROUTE_STATUS: Record<
  string,
  { label: string; tone: "gray" | "blue" | "green" }
> = {
  planificada: { label: "Por salir", tone: "gray" },
  en_camino: { label: "En camino", tone: "blue" },
  completada: { label: "Completada", tone: "green" },
};

export const fmtKm = (m: number) =>
  `${(m / 1000).toFixed(1).replace(".", ",")} km`;
export const fmtMin = (s: number) => `${Math.round(s / 60)} min`;
/** Hora de Bogotá como "11:23 a. m." (mismo texto en servidor y navegador). */
export const fmtClock = (iso: string | null) => {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Bogota",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return formatTime12(`${get("hour")}:${get("minute")}`);
};

const labelUrl = (ids: string[]) =>
  `/api/etiquetas/pedidos?ids=${ids.join(",")}`;
/** Orden de empaque: la última parada va al fondo de la canasta. */
const packingOrder = (r: RouteView) => [...r.stops].reverse();
/**
 * Se puede alistar la canasta cuando cocina terminó todos sus pedidos (o cerró la franja con
 * novedades). Si ya se empezó a alistar, sigue abierta para terminarla.
 */
export const routeReady = (r: RouteView) =>
  r.status === "planificada" && (r.packingStarted || r.kitchenPending === 0);

/**
 * Alistamiento rápido: se imprimen todas las etiquetas de la franja en el orden de empaque y
 * luego cada pedido se marca con un toque, con Enter o escaneando el QR de su etiqueta.
 */
export function PackingBoard({
  kitchen,
  date,
  slots,
  routes,
  unrouted,
  late = {},
  couriers = {},
  incidents = [],
}: {
  kitchen: { id: string; name: string; lat: number; lng: number };
  date: string;
  slots: { id: string; start: string; end: string; zoneName: string }[];
  routes: RouteView[];
  unrouted: Record<string, number>;
  late?: Record<string, LateSlot>;
  couriers?: Record<string, SlotCourier[]>;
  incidents?: IncidentView[];
}) {
  const router = useRouter();
  const [reporting, setReporting] = useState<{
    route: RouteView;
    stops: RouteStopView[];
  } | null>(null);
  const [, start] = useTransition();
  const [planning, setPlanning] = useState<string | null>(null);
  // Cambios inmediatos en pantalla mientras el servidor confirma.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [scan, setScan] = useState("");

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  const isPacked = useCallback(
    (s: RouteStopView) => overrides[s.orderId] ?? s.packed,
    [overrides],
  );
  const nextOf = useCallback(
    (r: RouteView) =>
      routeReady(r)
        ? packingOrder(r).find((s) => s.prepared && !isPacked(s))
        : undefined,
    [isPacked],
  );
  /** Pedido elegido a mano en cada canasta (si no hay, se muestra el siguiente por empacar). */
  const [selected, setSelected] = useState<Record<string, string>>({});
  const shownOf = useCallback(
    (r: RouteView) =>
      r.stops.find((s) => s.orderId === selected[r.id]) ?? nextOf(r),
    [selected, nextOf],
  );
  const select = (routeId: string, orderId: string | null) =>
    setSelected((cur) => {
      const nextSel = { ...cur };
      if (orderId) nextSel[routeId] = orderId;
      else delete nextSel[routeId];
      return nextSel;
    });
  const active =
    routes.find((r) => r.id === activeRoute && shownOf(r)) ??
    routes.find((r) => nextOf(r));
  const canPack = (s?: RouteStopView): s is RouteStopView =>
    Boolean(s && s.prepared && !isPacked(s));

  const setPacked = useCallback(
    (s: RouteStopView, packed: boolean, quiet = false) => {
      setOverrides((o) => ({ ...o, [s.orderId]: packed }));
      start(async () => {
        const r = await packOrder(s.orderId, packed);
        if (r.error) {
          setOverrides((o) => ({ ...o, [s.orderId]: !packed }));
          toast.error(`${s.code}: ${r.error}`);
        } else if (!quiet)
          toast.success(
            packed
              ? `${s.code} empacado · parada ${s.position}`
              : `${s.code} vuelve a pendientes`,
          );
        router.refresh();
      });
    },
    [router],
  );

  const packAll = (r: RouteView) => {
    const ready = r.stops.filter((s) => s.prepared && !isPacked(s));
    setOverrides((o) => ({
      ...o,
      ...Object.fromEntries(ready.map((s) => [s.orderId, true])),
    }));
    start(async () => {
      const res = await packRoute(r.id);
      if (res.error)
        setOverrides((o) => ({
          ...o,
          ...Object.fromEntries(ready.map((s) => [s.orderId, false])),
        }));
      notify(res);
      router.refresh();
    });
  };

  // Enter (fuera de un campo) empaca el pedido resaltado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A"
      )
        return;
      const shown = active ? shownOf(active) : undefined;
      if (active && canPack(shown)) {
        e.preventDefault();
        setPacked(shown, true, true);
        select(active.id, null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** Lector de QR o número escrito: "FR-1016", "1016" o la URL del QR. */
  const onScan = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = scan.trim();
    setScan("");
    if (!raw) {
      const shown = active ? shownOf(active) : undefined;
      if (active && canPack(shown)) {
        setPacked(shown, true, true);
        select(active.id, null);
      }
      return;
    }
    const num = raw.match(/FR-?(\d+)/i)?.[1] ?? raw.match(/(\d{3,})\s*$/)?.[1];
    const code = num ? `FR-${num}` : raw.toUpperCase();
    for (const r of routes) {
      const s = r.stops.find((x) => x.code === code);
      if (!s) continue;
      setActiveRoute(r.id);
      if (r.status !== "planificada")
        return void toast.info(`${code} ya salió a ruta.`);
      if (!routeReady(r))
        return void toast.error(
          `La canasta de ${r.courierName} aún espera a cocina (${r.kitchenPending} ${r.kitchenPending === 1 ? "pedido" : "pedidos"}).`,
        );
      if (!s.prepared) return void toast.error(`${code} aún está en cocina.`);
      if (isPacked(s)) return void toast.info(`${code} ya estaba empacado.`);
      setPacked(s, true, true);
      toast.success(
        `${code} empacado · ${r.courierName} · parada ${s.position}`,
      );
      return;
    }
    toast.error(`No encontré ${code} en las rutas de este día.`);
  };

  const plan = (slotId: string) =>
    start(async () => {
      setPlanning(slotId);
      notify(await planSlotRoutes(kitchen.id, date, slotId));
      setPlanning(null);
      router.refresh();
    });

  const anyRoutes = routes.some((r) => r.status === "planificada");

  return (
    <div className="space-y-8">
      {anyRoutes && (
        <form
          onSubmit={onScan}
          className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-3xl border border-[#1F4D36]/10 bg-white/95 p-2 pl-4 shadow-lg shadow-[#1F4D36]/5 backdrop-blur"
        >
          <ScanLine className="h-5 w-5 shrink-0 text-[#7CB342]" />
          <input
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            placeholder="Escanea la etiqueta o escribe el número y Enter"
            aria-label="Escanear o escribir el número del pedido"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#1B1B1B]/35"
          />
          <span className="hidden items-center gap-1 pr-2 text-xs text-[#1B1B1B]/45 md:flex">
            <CornerDownLeft className="h-3.5 w-3.5" /> Enter vacío = empacar el
            resaltado
          </span>
        </form>
      )}

      {slots.map((slot) => {
        const slotRoutes = routes.filter((r) => r.slotId === slot.id);
        const missing = unrouted[slot.id] ?? 0;
        // Recalcular solo mueve canastas que nadie ha empezado a alistar.
        const canReplan = slotRoutes.some(
          (r) => r.status === "planificada" && !r.packingStarted,
        );
        const waiting = slotRoutes.filter(
          (r) => r.status === "planificada" && !routeReady(r),
        ).length;
        const allIds = slotRoutes
          .filter(routeReady)
          .flatMap((r) => packingOrder(r).map((s) => s.orderId));
        const packedCount = slotRoutes.reduce(
          (n, r) => n + r.stops.filter(isPacked).length,
          0,
        );
        return (
          <section key={slot.id}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7CB342]">
                  Franja · {slot.zoneName}
                </p>
                <h2 className="font-display text-xl font-bold text-[#1F4D36]">
                  {formatTime12(slot.start)} – {formatTime12(slot.end)}
                </h2>
                {slotRoutes.length > 0 &&
                  (() => {
                    const orders = slotRoutes.reduce(
                      (n, r) => n + r.stops.length,
                      0,
                    );
                    const noCourier = slotRoutes.filter(
                      (r) => !r.courierId,
                    ).length;
                    return (
                      <p className="text-xs text-[#1B1B1B]/50">
                        {orders} {orders === 1 ? "pedido" : "pedidos"} en{" "}
                        {slotRoutes.length}{" "}
                        {slotRoutes.length === 1 ? "canasta" : "canastas"} ·{" "}
                        {packedCount} empacados
                        {noCourier > 0 && (
                          <span className="font-semibold text-red-700">
                            {" "}
                            · {noCourier} sin domiciliario
                          </span>
                        )}
                      </p>
                    );
                  })()}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {missing > 0 && (
                  <StatusBadge tone="amber">
                    {missing}{" "}
                    {missing === 1 ? "pedido sin ruta" : "pedidos sin ruta"}
                  </StatusBadge>
                )}
                {allIds.length > 0 && (
                  <Button size="sm" asChild>
                    <a href={labelUrl(allIds)} target="_blank" rel="noreferrer">
                      <Printer className="h-4 w-4" /> Imprimir las{" "}
                      {allIds.length} etiquetas
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={slotRoutes.length ? "ghost" : "default"}
                  disabled={planning !== null || (!missing && !canReplan)}
                  title="Solo reparte entre domiciliarios que aún no han empezado a alistar"
                  onClick={() => plan(slot.id)}
                >
                  <Route className="h-4 w-4" />{" "}
                  {planning === slot.id
                    ? "Calculando…"
                    : slotRoutes.length
                      ? "Recalcular rutas"
                      : "Calcular rutas"}
                </Button>
              </div>
            </div>

            {(couriers[slot.id] ?? []).length > 0 && slotRoutes.length > 0 && (
              <CourierBoard couriers={couriers[slot.id]} routes={slotRoutes} />
            )}
            {slotRoutes.length > 0 && late[slot.id] && (
              <LateOrders
                late={late[slot.id]}
                planning={planning === slot.id}
                onPlan={() => plan(slot.id)}
              />
            )}
            {slotRoutes.length === 0 ? (
              <Panel>
                <p className="py-4 text-center text-sm text-[#1B1B1B]/50">
                  {missing
                    ? "Calcula las rutas para saber en qué orden empacar."
                    : "No hay pedidos para esta franja."}
                </p>
              </Panel>
            ) : (
              <div className="space-y-4">
                <p className="rounded-2xl bg-[#F4F8F2] px-4 py-2.5 text-xs text-[#1F4D36]/80">
                  <strong>Alista al salir:</strong> cuando cocina termina los
                  pedidos de una canasta, imprime sus etiquetas, pega cada una
                  en su bolsa y marca <strong>Empacado</strong> (un toque, Enter
                  o escaneando). Al empezar, la canasta queda fija: los pedidos
                  que lleguen después van con otro domiciliario.
                  {waiting > 0 && (
                    <span className="mt-1 block font-semibold text-amber-800">
                      {waiting}{" "}
                      {waiting === 1 ? "canasta espera" : "canastas esperan"} a
                      cocina.
                    </span>
                  )}
                </p>
                <div className="space-y-4">
                  {slotRoutes.map((r, i) => (
                    <PackingRoute
                      key={r.id}
                      route={r}
                      couriers={couriers[slot.id] ?? []}
                      taken={slotRoutes
                        .filter((x) => x.id !== r.id && !x.returnedAt)
                        .map((x) => x.courierId ?? "")}
                      color={ROUTE_COLORS[i % ROUTE_COLORS.length]}
                      highlighted={active?.id === r.id}
                      shown={shownOf(r)}
                      manual={Boolean(selected[r.id])}
                      isPacked={isPacked}
                      onActivate={() => setActiveRoute(r.id)}
                      onSelect={(orderId) => {
                        setActiveRoute(r.id);
                        select(r.id, orderId);
                      }}
                      onPack={(stop, packed) => {
                        setPacked(stop, packed);
                        if (packed) select(r.id, null);
                      }}
                      onPackAll={() => packAll(r)}
                      onReport={(stops) => setReporting({ route: r, stops })}
                    />
                  ))}
                </div>
                <details className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white px-4 py-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#1F4D36]">
                    <MapIcon className="h-4 w-4" /> Ver mapa de las rutas
                  </summary>
                  <div className="mt-3">
                    <RouteMap
                      height={300}
                      kitchen={kitchen}
                      routes={slotRoutes.map((r, i) => ({
                        id: r.id,
                        color: ROUTE_COLORS[i % ROUTE_COLORS.length],
                        path: r.polyline
                          ? decodePolyline(r.polyline)
                          : undefined,
                        stops: r.stops
                          .filter((s) => Number.isFinite(s.lat))
                          .map((s) => ({
                            lat: s.lat,
                            lng: s.lng,
                            position: s.position,
                            code: s.code,
                            done: s.status === "entregado",
                          })),
                      }))}
                    />
                  </div>
                </details>
              </div>
            )}
          </section>
        );
      })}
      <IncidentsPanel
        incidents={incidents}
        description="Pedidos que no se pudieron preparar o empacar. El equipo de pedidos los libera para una nueva ruta o los cancela."
      />

      {reporting && (
        <IncidentSheet
          stops={reporting.stops}
          courier={reporting.route.courierName}
          onClose={() => setReporting(null)}
          onDone={() => {
            setReporting(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Canasta de un domiciliario: el pedido siguiente en grande y el resto en una lista compacta. */
function PackingRoute({
  route: r,
  couriers,
  taken,
  color,
  highlighted,
  shown,
  manual,
  isPacked,
  onActivate,
  onSelect,
  onPack,
  onPackAll,
  onReport,
}: {
  route: RouteView;
  /** Domiciliarios de la franja y los que ya tienen otra canasta. */
  couriers: SlotCourier[];
  taken: string[];
  color: string;
  highlighted: boolean;
  /** Pedido que se muestra en grande: el elegido o el siguiente por empacar. */
  shown?: RouteStopView;
  /** El pedido mostrado lo eligió la persona (no es el siguiente automático). */
  manual: boolean;
  isPacked: (s: RouteStopView) => boolean;
  onActivate: () => void;
  onSelect: (orderId: string | null) => void;
  onPack: (s: RouteStopView, packed: boolean) => void;
  onPackAll: () => void;
  /** Registrar novedad de uno o varios pedidos que no se pudieron empacar. */
  onReport: (stops: RouteStopView[]) => void;
}) {
  const [confirmAll, setConfirmAll] = useState(false);
  const status = ROUTE_STATUS[r.status] ?? ROUTE_STATUS.planificada;
  const order = packingOrder(r);
  const packed = r.stops.filter(isPacked).length;
  const readyLeft = r.stops.filter((s) => s.prepared && !isPacked(s)).length;
  const inKitchen = r.stops.filter((s) => !s.prepared).length;
  const done = packed === r.stops.length;
  const ready = routeReady(r);
  const editable = ready;

  return (
    <section
      onClick={onActivate}
      className={cn(
        "rounded-3xl border bg-white p-4 transition sm:p-5",
        highlighted && editable && !done
          ? "border-2 border-[#8BC34A] shadow-lg shadow-[#8BC34A]/10"
          : "border-[#1F4D36]/[0.07]",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
          style={{ background: color }}
        >
          <Truck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          {r.status === "planificada" ? (
            <CourierPicker route={r} couriers={couriers} taken={taken} />
          ) : (
            <p className="truncate font-display font-bold text-[#1F4D36]">
              {r.courierName}
            </p>
          )}
          <p className="text-xs text-[#1B1B1B]/50">
            {r.stops.length} paradas · {fmtKm(r.distanceM)} ·{" "}
            <FinishLine route={r} />
          </p>
        </div>
        {r.status === "planificada" && !ready ? (
          <StatusBadge tone="amber">Esperando cocina</StatusBadge>
        ) : r.status === "planificada" && r.packingStarted ? (
          <StatusBadge tone="green">Alistando</StatusBadge>
        ) : r.status === "completada" && !r.returnedAt ? (
          <StatusBadge tone="amber">Regresando</StatusBadge>
        ) : (
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        )}
      </div>
      {r.status === "planificada" && !ready && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          <ChefHat className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Cocina aún no termina{" "}
            <strong>
              {r.kitchenPending} {r.kitchenPending === 1 ? "pedido" : "pedidos"}
            </strong>{" "}
            de esta canasta. Se alista cuando todo esté listo o cocina cierre la
            franja con novedades.
          </span>
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EEF3EA]">
          <div
            className="h-full rounded-full bg-[#8BC34A] transition-all"
            style={{
              width: `${(packed / Math.max(1, r.stops.length)) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-[#1F4D36]">
          {packed}/{r.stops.length}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(ready || r.status !== "planificada") && (
          <Button
            size="sm"
            variant="ghost"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={labelUrl(order.map((s) => s.orderId))}
              target="_blank"
              rel="noreferrer"
            >
              <Printer className="h-3.5 w-3.5" /> Etiquetas de la canasta
            </a>
          </Button>
        )}
        {editable && readyLeft > 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (!confirmAll) return setConfirmAll(true);
              setConfirmAll(false);
              onPackAll();
            }}
          >
            <PackageCheck className="h-3.5 w-3.5" />{" "}
            {confirmAll
              ? `¿Confirmas? Empacar ${readyLeft}`
              : `Empacar todo (${readyLeft})`}
          </Button>
        )}
        {editable && packed < r.stops.length && (
          <Button
            size="sm"
            variant="ghost"
            className="text-amber-800 hover:bg-amber-50"
            onClick={(e) => {
              e.stopPropagation();
              onReport(order.filter((x) => !isPacked(x)));
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Cerrar canasta con
            novedades ({r.stops.length - packed})
          </Button>
        )}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        <div>
          {/* Pedido en grande: el elegido en la lista o el siguiente por empacar */}
          {shown &&
            (() => {
              const p = isPacked(shown);
              return (
                <div
                  className={cn(
                    "rounded-2xl p-4 ring-1 sm:p-5",
                    p
                      ? "bg-[#F8FAF5] ring-[#1F4D36]/10"
                      : "bg-[#F4F8F2] ring-[#8BC34A]/40",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white"
                      style={{ background: p ? "#9CA3AF" : color }}
                    >
                      <span className="text-[8px] font-semibold leading-none opacity-80">
                        PARADA
                      </span>
                      <span className="font-display text-xl font-bold leading-none">
                        {shown.position}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-2xl font-bold text-[#1F4D36]">
                        {shown.code}
                        {shown.addedLate && (
                          <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 align-middle text-[11px] font-bold uppercase text-amber-900">
                            Nuevo
                          </span>
                        )}
                      </p>
                      <p className="truncate text-sm text-[#1B1B1B]/60">
                        {shown.customer}
                      </p>
                    </div>
                    <a
                      href={labelUrl([shown.orderId])}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={`Imprimir la etiqueta de ${shown.code}`}
                      aria-label={`Imprimir la etiqueta de ${shown.code}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1F4D36]/15 bg-white text-[#1F4D36] transition hover:border-[#8BC34A] hover:bg-[#F4F8F2]"
                    >
                      <Printer className="h-5 w-5" />
                    </a>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {shown.items.map((it, idx) => (
                      <li
                        key={idx}
                        className="text-lg leading-snug text-[#1B1B1B]/80"
                      >
                        <strong className="text-[#1F4D36]">
                          {it.quantity}×
                        </strong>{" "}
                        {it.name}
                        {it.options.length > 0 && (
                          <span className="block pl-6 text-xs text-[#1B1B1B]/50">
                            {it.options.join(", ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {shown.notes && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                      Nota: {shown.notes}
                    </p>
                  )}
                  {!editable ? null : p ? (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E8F3DC] py-2.5 text-sm font-semibold text-[#2E6B1F]">
                        <CheckCircle2 className="h-5 w-5" /> Empacado
                      </span>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPack(shown, false);
                        }}
                      >
                        <Undo2 className="h-4 w-4" /> Deshacer
                      </Button>
                    </div>
                  ) : !shown.prepared ? (
                    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-sm font-semibold text-amber-800">
                      <p className="flex items-center justify-center gap-2">
                        {shown.kitchenIssue ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <ChefHat className="h-5 w-5" />
                        )}
                        {shown.kitchenIssue
                          ? "Novedad en cocina"
                          : "Aún en cocina"}
                      </p>
                      {shown.kitchenIssue && (
                        <p className="mt-0.5 text-xs font-normal">
                          {shown.kitchenIssue}. Si se preparan, se puede
                          empacar; si no, ciérralo con novedad.
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      className="mt-3 w-full"
                      disabled={!editable}
                      title={
                        !editable ? "La canasta espera a cocina" : undefined
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onPack(shown, true);
                      }}
                    >
                      <CheckCircle2 className="h-5 w-5" /> Empacado
                      <span className="ml-1 hidden rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold sm:inline">
                        Enter
                      </span>
                    </Button>
                  )}
                  {editable && !p && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReport([shown]);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-amber-800/80 hover:text-amber-900"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> No se puede
                      empacar: reportar novedad
                    </button>
                  )}
                  {manual && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(null);
                      }}
                      className="mt-2 w-full text-center text-xs font-semibold text-[#1F4D36]/60 hover:text-[#1F4D36]"
                    >
                      Volver al siguiente por empacar
                    </button>
                  )}
                </div>
              );
            })()}
          {editable && !shown && !done && (
            <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800">
              <ChefHat className="h-4 w-4" /> Esperando {inKitchen}{" "}
              {inKitchen === 1 ? "pedido" : "pedidos"} de cocina.
            </p>
          )}
          {done && editable && !shown && (
            <p className="flex items-center gap-2 rounded-2xl bg-[#E8F3DC] px-3 py-3 text-sm font-semibold text-[#2E6B1F]">
              <CheckCircle2 className="h-4 w-4" /> Canasta lista para salir.
            </p>
          )}
          {!editable && r.status !== "planificada" && (
            <p className="rounded-2xl bg-[#F8F7F2] px-3 py-3 text-sm text-[#1B1B1B]/55">
              Esta canasta ya salió a ruta.
            </p>
          )}
        </div>

        {/* Toda la canasta, compacta: la primera fila va al fondo */}
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
            Canasta · de la primera fila (fondo) a la última (arriba)
          </p>
          <ol className="divide-y divide-[#1F4D36]/[0.06]">
            {order.map((s) => {
              const p = isPacked(s);
              return (
                <li
                  key={s.orderId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(s.orderId);
                  }}
                  className={cn(
                    "-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-[#F8F7F2]",
                    shown?.orderId === s.orderId &&
                      "bg-[#F4F8F2] font-semibold ring-1 ring-[#8BC34A]/40",
                  )}
                >
                  <span className="w-7 shrink-0 text-center text-[11px] font-bold tabular-nums text-[#1B1B1B]/40">
                    P{s.position}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-display text-sm font-bold",
                      p ? "text-[#1B1B1B]/35 line-through" : "text-[#1F4D36]",
                    )}
                  >
                    {s.code}
                  </span>
                  {s.addedLate && (
                    <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                      Nuevo
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-[#1B1B1B]/50">
                    {s.dishes.join(", ")}
                  </span>
                  {p ? (
                    editable ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPack(s, false);
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#2E6B1F] hover:bg-[#F4F8F2]"
                        title="Deshacer"
                        aria-label={`Deshacer el empaque de ${s.code}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <Undo2 className="h-3 w-3 opacity-50" />
                      </button>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2E6B1F]" />
                    )
                  ) : s.prepared ? (
                    editable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPack(s, true);
                        }}
                        className="shrink-0 rounded-lg border border-[#1F4D36]/15 px-2.5 py-1 text-xs font-semibold text-[#1F4D36] hover:border-[#8BC34A] hover:bg-[#F4F8F2]"
                      >
                        Empacar
                      </button>
                    )
                  ) : (
                    <StatusBadge tone="amber">
                      {s.kitchenIssue ? "Novedad" : "Cocina"}
                    </StatusBadge>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
