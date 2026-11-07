"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  CheckCircle2,
  ChefHat,
  Map as MapIcon,
  PackageCheck,
  Printer,
  Route,
  Truck,
  Undo2,
} from "lucide-react";
import { packOrder, packRoute, planSlotRoutes } from "@/app/actions/operations";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatTime12 } from "@/lib/delivery";
import { notify, toast } from "@/lib/notify";
import type {
  SlotKitchenState,
  IncidentView,
  LateSlot,
  RouteStopView,
  RouteView,
  SlotCourier,
} from "@/lib/operations";
import {
  BasketMap,
  CourierPicker,
  DepartedBaskets,
  FinishLine,
} from "./BasketMeta";
import { LateOrders } from "./LateOrders";
import { IncidentsList } from "./IncidentsPanel";
import { Sheet } from "@/components/ui/sheet";
import { IncidentSheet } from "./IncidentSheet";
import { cn } from "@/lib/utils";

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
 * Se alista lo que ya está preparado: toda canasta por salir se puede alistar (a las canastas solo
 * entran pedidos preparados; cada pedido se empaca solo si está listo).
 */
export const routeReady = (r: RouteView) => r.status === "planificada";

/**
 * Alistamiento rápido: se imprimen todas las etiquetas de la franja en el orden de empaque y
 * luego cada pedido se marca con un toque o con Enter.
 */
export function PackingBoard({
  kitchen,
  date,
  slots,
  routes,
  unrouted,
  unprepared = {},
  late = {},
  couriers = {},
  incidents = [],
}: {
  kitchen: { id: string; name: string; lat: number; lng: number };
  date: string;
  slots: { id: string; start: string; end: string; zoneName: string }[];
  routes: RouteView[];
  unrouted: Record<string, number>;
  /** Por franja: pedidos que cocina no termina (bloquean) y con novedad (no bloquean ni entran a canastas). */
  unprepared?: Record<string, SlotKitchenState>;
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

  const plan = (slotId: string) =>
    start(async () => {
      setPlanning(slotId);
      notify(await planSlotRoutes(kitchen.id, date, slotId));
      setPlanning(null);
      router.refresh();
    });

  // Datos de cada franja para las pestañas.
  const slotInfo = slots.map((slot) => {
    const slotRoutes = routes.filter((r) => r.slotId === slot.id);
    const toLeave = slotRoutes.filter((r) => r.status === "planificada");
    const departed = slotRoutes.filter((r) => r.status !== "planificada");
    const missing = unrouted[slot.id] ?? 0;
    return { slot, slotRoutes, toLeave, departed, missing };
  });
  const firstBusy =
    slotInfo.find((x) => x.toLeave.length > 0 || x.missing > 0) ??
    slotInfo.find((x) => x.slotRoutes.length > 0) ??
    slotInfo[0];
  const [slotId, setSlotId] = useState<string | undefined>(firstBusy?.slot.id);
  const current = slotInfo.find((x) => x.slot.id === slotId) ?? firstBusy;
  const [views, setViews] = useState<Record<string, "salir" | "salieron">>({});
  // Canastas colapsadas (se conserva al refrescar la pantalla).
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const view = current
    ? (views[current.slot.id] ??
      (current.toLeave.length || !current.departed.length
        ? "salir"
        : "salieron"))
    : "salir";
  const setView = (v: "salir" | "salieron") =>
    current && setViews((x) => ({ ...x, [current.slot.id]: v }));
  // Color fijo por canasta dentro de su franja (el mismo en la lista y en su mapa).
  const colorOf = (r: RouteView) => {
    const list = routes.filter((x) => x.slotId === r.slotId);
    return ROUTE_COLORS[Math.max(0, list.indexOf(r)) % ROUTE_COLORS.length];
  };
  const [incidentsOf, setIncidentsOf] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Franjas: una a la vez; cada pestaña muestra dónde hay trabajo. */}
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Franjas">
        {slotInfo.map(({ slot, toLeave, departed, missing }) => {
          const on = current?.slot.id === slot.id;
          const onRoute = departed.filter((r) => !r.returnedAt).length;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSlotId(slot.id)}
              aria-current={on ? "true" : undefined}
              className={cn(
                "relative min-w-[190px] shrink-0 rounded-2xl border px-4 py-3 text-left transition",
                on
                  ? "border-[#1F4D36] bg-[#1F4D36] text-white shadow-lg shadow-[#1F4D36]/15"
                  : "border-[#1F4D36]/10 bg-white text-[#1F4D36] hover:border-[#8BC34A]",
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  on ? "text-white/60" : "text-[#7CB342]",
                )}
              >
                Franja · {slot.zoneName}
              </p>
              <p className="font-display text-base font-bold">
                {formatTime12(slot.start)} – {formatTime12(slot.end)}
              </p>
              <p
                className={cn(
                  "mt-1 flex flex-wrap gap-x-2 text-[11px]",
                  on ? "text-white/75" : "text-[#1B1B1B]/55",
                )}
              >
                {toLeave.length + departed.length === 0 ? (
                  <span>
                    {missing
                      ? `${missing} ${missing === 1 ? "pedido" : "pedidos"} sin canasta`
                      : "Sin pedidos"}
                  </span>
                ) : (
                  <>
                    <span>{toLeave.length} por salir</span>
                    {onRoute > 0 && <span>· {onRoute} en ruta</span>}
                    {departed.length - onRoute > 0 && (
                      <span>· {departed.length - onRoute} terminadas</span>
                    )}
                  </>
                )}
              </p>
              {missing > 0 && (
                <span
                  className="absolute right-2 top-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950"
                  title="Pedidos sin canasta"
                >
                  +{missing}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {current &&
        (() => {
          const { slot, slotRoutes, toLeave, departed, missing } = current;
          // Recalcular solo mueve canastas que nadie ha empezado a alistar.
          const canReplan = slotRoutes.some(
            (r) => r.status === "planificada" && !r.packingStarted,
          );
          // Pedidos de la franja que cocina no ha terminado (con y sin novedad).
          const cooking = unprepared[slot.id]?.blocking ?? 0;
          const slotIncidents = incidents.filter((n) => n.slotId === slot.id);
          const openIncidentsCount = slotIncidents.filter(
            (n) => n.state === "en_espera" || n.state === "por_preparar",
          ).length;
          const withIncident = unprepared[slot.id]?.withIncident ?? 0;
          const orders = slotRoutes.reduce((n, r) => n + r.stops.length, 0);
          const noCourier = toLeave.filter((r) => !r.courierId).length;
          return (
            <section className="space-y-4">
              {/* Encabezado de la franja: métricas clave y acciones (el horario ya está en la pestaña) */}
              <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-[#1F4D36]/[0.07] bg-white px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
                  {slotRoutes.length ? (
                    <>
                      <Metric>
                        <strong>{orders}</strong>{" "}
                        {orders === 1 ? "pedido" : "pedidos"} en{" "}
                        <strong>{slotRoutes.length}</strong>{" "}
                        {slotRoutes.length === 1 ? "canasta" : "canastas"}
                      </Metric>
                      {toLeave.length > 0 && (
                        <Metric>
                          <strong>
                            {
                              toLeave.filter(
                                (r) =>
                                  r.stops.length > 0 && r.stops.every(isPacked),
                              ).length
                            }
                            /{toLeave.length}
                          </strong>{" "}
                          {toLeave.length === 1
                            ? "canasta empacada"
                            : "canastas empacadas"}
                        </Metric>
                      )}
                    </>
                  ) : (
                    <Metric>
                      {missing
                        ? `${missing} ${missing === 1 ? "pedido" : "pedidos"} por organizar en canastas`
                        : cooking + withIncident > 0
                          ? `${cooking + withIncident} ${cooking + withIncident === 1 ? "pedido" : "pedidos"} en cocina`
                          : "Sin pedidos"}
                    </Metric>
                  )}
                  {slotIncidents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIncidentsOf(slot.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                        openIncidentsCount
                          ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                          : "bg-[#F4F8F2] text-[#1F4D36] hover:bg-[#E8F3DC]",
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" /> Novedades (
                      {slotIncidents.length})
                    </button>
                  )}
                  {noCourier > 0 && (
                    <Metric tone="bad">{noCourier} sin domiciliario</Metric>
                  )}
                </div>
                {(missing > 0 || canReplan || !slotRoutes.length) && (
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
                        ? "Recalcular canastas"
                        : "Calcular canastas"}
                  </Button>
                )}
              </div>

              {cooking > 0 && slotRoutes.length > 0 && (
                <p className="flex items-start gap-2 rounded-2xl bg-[#F4F8F2] px-4 py-3 text-sm text-[#1F4D36] ring-1 ring-[#1F4D36]/10">
                  <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-[#7CB342]" />
                  <span>
                    <strong>
                      {cooking}{" "}
                      {cooking === 1 ? "pedido sigue" : "pedidos siguen"} en
                      cocina
                    </strong>
                    : ya {cooking === 1 ? "está" : "están"} en su canasta y se
                    empaca{cooking === 1 ? "" : "n"} cuando cocina{" "}
                    {cooking === 1 ? "lo termine" : "los termine"}.
                  </span>
                </p>
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
                  <p className="py-6 text-center text-sm text-[#1B1B1B]/50">
                    {missing
                      ? "Calcula las canastas para saber en qué orden empacar."
                      : "No hay pedidos para esta franja."}
                  </p>
                </Panel>
              ) : (
                <>
                  {/* Por salir / Salieron, y colapsar o expandir todas las canastas */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-1 gap-1 rounded-full bg-white p-1 ring-1 ring-[#1F4D36]/[0.08] sm:flex-none">
                      {(
                        [
                          {
                            key: "salir",
                            label: "Por salir",
                            count: toLeave.length,
                          },
                          {
                            key: "salieron",
                            label: "Salieron",
                            count: departed.length,
                          },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setView(t.key)}
                          aria-pressed={view === t.key}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none",
                            view === t.key
                              ? "bg-[#1F4D36] text-white"
                              : "text-[#1F4D36]/70 hover:bg-[#F4F8F2]",
                          )}
                        >
                          {t.label}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs tabular-nums",
                              view === t.key ? "bg-white/15" : "bg-[#F4F8F2]",
                            )}
                          >
                            {t.count}
                          </span>
                        </button>
                      ))}
                    </div>
                    {view === "salir" && toLeave.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => {
                          const allCollapsed = toLeave.every(
                            (r) => collapsed[r.id],
                          );
                          setCollapsed((c) => ({
                            ...c,
                            ...Object.fromEntries(
                              toLeave.map((r) => [r.id, !allCollapsed]),
                            ),
                          }));
                        }}
                      >
                        {toLeave.every((r) => collapsed[r.id]) ? (
                          <>
                            <ChevronsUpDown className="h-4 w-4" /> Expandir
                            todas
                          </>
                        ) : (
                          <>
                            <ChevronsDownUp className="h-4 w-4" /> Colapsar
                            todas
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {view === "salir" ? (
                    toLeave.length === 0 ? (
                      <p className="rounded-3xl border border-dashed border-[#1F4D36]/15 bg-white/60 px-4 py-8 text-center text-sm text-[#1B1B1B]/55">
                        Todas las canastas de esta franja ya salieron.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {toLeave.map((r) => (
                          <PackingRoute
                            key={r.id}
                            route={r}
                            kitchen={kitchen}
                            couriers={couriers[slot.id] ?? []}
                            taken={slotRoutes
                              .filter((x) => x.id !== r.id && !x.returnedAt)
                              .map((x) => x.courierId ?? "")}
                            color={colorOf(r)}
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
                            onReport={(stops) =>
                              setReporting({ route: r, stops })
                            }
                            collapsed={Boolean(collapsed[r.id])}
                            onToggle={() =>
                              setCollapsed((c) => ({ ...c, [r.id]: !c[r.id] }))
                            }
                          />
                        ))}
                      </div>
                    )
                  ) : departed.length === 0 ? (
                    <p className="rounded-3xl border border-dashed border-[#1F4D36]/15 bg-white/60 px-4 py-8 text-center text-sm text-[#1B1B1B]/55">
                      Ninguna canasta de esta franja ha salido todavía.
                    </p>
                  ) : (
                    <DepartedBaskets
                      kitchen={kitchen}
                      routes={departed.map((r) => ({
                        route: r,
                        color: colorOf(r),
                      }))}
                    />
                  )}
                </>
              )}
            </section>
          );
        })()}

      {incidentsOf && (
        <Sheet
          title="Novedades de la franja"
          description="Lo que no se pudo preparar, empacar o entregar en esta franja."
          onClose={() => setIncidentsOf(null)}
        >
          <IncidentsList
            incidents={incidents.filter((n) => n.slotId === incidentsOf)}
          />
          <a
            href={`/admin/novedades?fecha=${date}&cocina=${kitchen.id}`}
            className="mt-4 inline-block text-sm font-semibold text-[#1F4D36] hover:underline"
          >
            Ver todas en Novedades →
          </a>
        </Sheet>
      )}

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
  kitchen,
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
  collapsed,
  onToggle,
}: {
  route: RouteView;
  /** Canasta colapsada: solo encabezado y barra de avance. */
  collapsed: boolean;
  onToggle: () => void;
  kitchen: { name: string; lat: number; lng: number };
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
  const [showMap, setShowMap] = useState(false);
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? `Expandir la canasta de ${r.courierName}`
              : `Colapsar la canasta de ${r.courierName}`
          }
          title={collapsed ? "Expandir" : "Colapsar"}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#1F4D36]/60 transition hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
        >
          <ChevronDown
            className={cn("h-5 w-5 transition", collapsed ? "" : "rotate-180")}
          />
        </button>
      </div>
      {!collapsed && r.status === "planificada" && !ready && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          <ChefHat className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Cocina aún no termina{" "}
            <strong>
              {r.slotKitchenPending}{" "}
              {r.slotKitchenPending === 1 ? "pedido" : "pedidos"}
            </strong>{" "}
            de la franja
            {r.kitchenPending > 0
              ? ` (${r.kitchenPending} de esta canasta)`
              : ""}
            . Las canastas se alistan cuando toda la franja esté lista o cocina
            la cierre con novedades.
          </span>
        </p>
      )}

      <div
        className={cn(
          "mt-3 flex items-center gap-3",
          collapsed && "cursor-pointer",
        )}
        onClick={collapsed ? onToggle : undefined}
      >
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
      {!collapsed && (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            {/* Las etiquetas se imprimen por canasta, en orden de empaque (la última entrega primero). */}
            {ready ? (
              <Button
                size="sm"
                variant="secondary"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={labelUrl(order.map((s) => s.orderId))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir {r.stops.length}{" "}
                  {r.stops.length === 1 ? "etiqueta" : "etiquetas"}
                </a>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled
                title="Se imprimen cuando cocina termine los pedidos de esta canasta"
              >
                <Printer className="h-3.5 w-3.5" /> Etiquetas cuando cocina
                termine
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={showMap}
              onClick={(e) => {
                e.stopPropagation();
                setShowMap((v) => !v);
              }}
            >
              <MapIcon className="h-3.5 w-3.5" />{" "}
              {showMap ? "Ocultar ruta" : "Ver ruta"}
            </Button>
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

          {showMap && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
              <BasketMap route={r} kitchen={kitchen} color={color} />
            </div>
          )}
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
                          p
                            ? "text-[#1B1B1B]/35 line-through"
                            : "text-[#1F4D36]",
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
        </>
      )}
    </section>
  );
}

/** Ficha de métrica en el encabezado de la franja. */
function Metric({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "bad";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1.5 text-sm",
        tone === "bad"
          ? "bg-red-50 font-semibold text-red-700"
          : "bg-[#F4F8F2] text-[#1F4D36]",
      )}
    >
      {children}
    </span>
  );
}
