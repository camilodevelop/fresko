"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Camera,
  ChefHat,
  ChevronDown,
  ChevronRight,
  History as HistoryIcon,
  ShoppingBasket,
  Warehouse,
  CheckCircle2,
  ClipboardCheck,
  MapPinned,
  MessageCircle,
  Navigation,
  PackageX,
  Phone,
  Play,
  Route,
  Truck,
} from "lucide-react";
import {
  deliverOrder,
  markArrived,
  returnToKitchen,
  startRoute,
  verifyRouteAll,
  verifyStop,
} from "@/app/actions/operations";
import { EmptyState, Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatTime12 } from "@/lib/delivery";
import { notify, toast } from "@/lib/notify";
import type { RouteStopView, RouteView } from "@/lib/operations";
import { formatPhone, whatsappDigits } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import { decodePolyline } from "@/lib/polyline";
import { cn } from "@/lib/utils";
import { DeliveryIncidentSheet } from "./DeliveryIncidentSheet";
import { StopDetailSheet } from "./StopDetailSheet";
import { compressPhoto } from "./photo";
import { fmtClock, fmtKm, fmtMin } from "./PackingBoard";

const RouteMap = dynamic(() => import("./RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] animate-pulse rounded-2xl bg-[#F4F8F2]" />
  ),
});

const gmapsTo = (s: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`;
const wazeTo = (s: { lat: number; lng: number }) =>
  `https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`;

/** Ruta completa en Google Maps (máx. 9 paradas intermedias en el enlace). */
function fullRouteUrl(route: RouteView) {
  const pending = route.stops.filter(
    (s) =>
      !["entregado", "no_entregado", "cancelado"].includes(s.status) &&
      Number.isFinite(s.lat),
  );
  if (!pending.length) return null;
  const origin = route.kitchen
    ? `${route.kitchen.lat},${route.kitchen.lng}`
    : "";
  const last = pending[pending.length - 1];
  const waypoints = pending
    .slice(0, -1)
    .slice(0, 9)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");
  return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ""}&destination=${last.lat},${last.lng}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
}

/**
 * Vista del domiciliario. La canasta activa (la que está alistando, en ruta o de regreso) se ve
 * completa; las siguientes aparecen compactas y las terminadas quedan como historial por franja.
 */
export function CourierRoutes({
  routes,
  waitMinutes = 5,
}: {
  routes: RouteView[];
  waitMinutes?: number;
}) {
  if (routes.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No tienes rutas este día"
        description="Cuando la cocina calcule las rutas de tu franja, aparecen aquí."
      />
    );
  }
  // Orden del día: por franja y, dentro de la franja, en el orden en que se crearon.
  const ordered = [...routes].sort((x, y) =>
    x.slotLabel.localeCompare(y.slotLabel),
  );
  const number = new Map(ordered.map((r, i) => [r.id, i + 1]));
  const finished = ordered.filter((r) => r.returnedAt);
  const open = ordered.filter((r) => !r.returnedAt);
  // Activa: la que va en camino o de regreso; si no hay, la próxima por salir.
  const active = open.find((r) => r.status !== "planificada") ?? open[0];
  const upcoming = open.filter((r) => r !== active);

  return (
    <div className="space-y-8">
      <DaySummary routes={ordered} />
      {active ? (
        <ActiveRoute
          route={active}
          number={number.get(active.id) ?? 1}
          total={ordered.length}
          waitMinutes={waitMinutes}
        />
      ) : (
        <Panel>
          <p className="flex items-center gap-2 py-4 text-sm text-[#1F4D36]">
            <CheckCircle2 className="h-5 w-5 text-[#7CB342]" /> Terminaste todas
            tus canastas de este día. ¡Buen trabajo!
          </p>
        </Panel>
      )}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">
            Siguientes canastas
          </h2>
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#1F4D36]/[0.08] bg-white px-4 py-3 text-sm"
              >
                <BasketTag n={number.get(r.id) ?? 0} />
                <span className="min-w-0 flex-1 text-[#1B1B1B]/70">
                  Franja {slotText(r.slotLabel)} · {r.stops.length} paradas ·{" "}
                  {fmtKm(r.distanceM)}
                </span>
                <StatusBadge tone="gray">
                  {r.packingStarted ? "Alistando" : "Por alistar"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      )}
      {finished.length > 0 && <History routes={finished} number={number} />}
    </div>
  );
}

const slotText = (label: string) => {
  const [a, b] = label.split(" – ");
  return `${formatTime12(a)} – ${formatTime12(b)}`;
};

function BasketTag({ n }: { n: number }) {
  return (
    <span className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-[#1F4D36]/[0.06] px-2.5 text-xs font-bold text-[#1F4D36]">
      <ShoppingBasket className="h-4 w-4" /> {n}
    </span>
  );
}

/** Resumen del día del domiciliario. */
function DaySummary({ routes }: { routes: RouteView[] }) {
  const stops = routes.flatMap((r) => r.stops);
  const delivered = stops.filter((s) => s.status === "entregado").length;
  const failed = stops.filter((s) => s.status === "no_entregado").length;
  const minutes = routes.reduce(
    (t, r) =>
      t +
      (r.startedAt && r.returnedAt
        ? (new Date(r.returnedAt).getTime() - new Date(r.startedAt).getTime()) /
          60000
        : 0),
    0,
  );
  const items = [
    {
      label: routes.length === 1 ? "canasta" : "canastas",
      value: routes.length,
    },
    {
      label: delivered === 1 ? "entregado" : "entregados",
      value: `${delivered}/${stops.length}`,
    },
    ...(failed
      ? [
          {
            label: failed === 1 ? "no entregado" : "no entregados",
            value: failed,
          },
        ]
      : []),
    { label: "en ruta", value: minutes ? fmtSpanMin(minutes) : "—" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((x) => (
        <div
          key={x.label}
          className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#1F4D36]/[0.06]"
        >
          <p className="font-display text-xl font-bold tabular-nums text-[#1F4D36]">
            {x.value}
          </p>
          <p className="text-xs text-[#1B1B1B]/50">{x.label}</p>
        </div>
      ))}
    </div>
  );
}

const fmtSpanMin = (m: number) =>
  m >= 60
    ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`
    : `${Math.round(m)} min`;

/** Canastas terminadas, agrupadas por franja; cada una se despliega para ver sus paradas. */
function History({
  routes,
  number,
}: {
  routes: RouteView[];
  number: Map<string, number>;
}) {
  const [detail, setDetail] = useState<RouteStopView | null>(null);
  const slots = [...new Set(routes.map((r) => r.slotLabel))];
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">
        <HistoryIcon className="h-4 w-4" /> Historial del día
      </h2>
      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot}>
            <p className="mb-1.5 text-sm font-semibold text-[#1F4D36]">
              Franja {slotText(slot)}
            </p>
            <ul className="space-y-2">
              {routes
                .filter((r) => r.slotLabel === slot)
                .map((r) => {
                  const delivered = r.stops.filter(
                    (s) => s.status === "entregado",
                  ).length;
                  const failed = r.stops.filter(
                    (s) => s.status === "no_entregado",
                  ).length;
                  return (
                    <li key={r.id}>
                      <details className="group rounded-2xl border border-[#1F4D36]/[0.08] bg-white">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm">
                          <BasketTag n={number.get(r.id) ?? 0} />
                          <span className="min-w-0 flex-1">
                            <span className="font-semibold text-[#1F4D36]">
                              {delivered}/{r.stops.length} entregados
                              {failed > 0 && (
                                <span className="text-red-700">
                                  {" "}
                                  · {failed} no{" "}
                                  {failed === 1 ? "entregado" : "entregados"}
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-[#1B1B1B]/50">
                              Salió {fmtClock(r.startedAt)} · regresó{" "}
                              {fmtClock(r.returnedAt)} ·{" "}
                              {fmtSpan(r.startedAt, r.returnedAt)} ·{" "}
                              {fmtKm(r.distanceM)}
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 text-[#1B1B1B]/40 transition group-open:rotate-180" />
                        </summary>
                        <ol className="divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
                          {r.stops.map((s) => (
                            <li key={s.orderId}>
                              <button
                                type="button"
                                onClick={() => setDetail(s)}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#F8F7F2]"
                              >
                                <span className="w-6 text-center text-xs font-bold text-[#1B1B1B]/40">
                                  {s.position}
                                </span>
                                <span className="w-20 font-display font-bold text-[#1F4D36]">
                                  {s.code}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[#1B1B1B]/60">
                                  {s.customer} · {s.address}
                                </span>
                                {s.status === "entregado" ? (
                                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#2E6B1F]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                    {fmtClock(s.deliveredAt)}
                                  </span>
                                ) : s.status === "no_entregado" ? (
                                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-red-700">
                                    <PackageX className="h-3.5 w-3.5" /> No
                                    entregado
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-xs text-[#1B1B1B]/45">
                                    Cancelado
                                  </span>
                                )}
                                <ChevronRight className="h-4 w-4 shrink-0 text-[#1B1B1B]/30" />
                              </button>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      {detail && (
        <StopDetailSheet stop={detail} onClose={() => setDetail(null)} />
      )}
    </section>
  );
}

/** La canasta en curso, completa: mapa, revisión, salida, paradas y regreso. */
function ActiveRoute({
  route,
  number,
  total,
  waitMinutes,
}: {
  route: RouteView;
  number: number;
  total: number;
  waitMinutes: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [startT, endT] = route.slotLabel.split(" – ");
  const done = route.stops.filter((s) => s.status === "entregado").length;
  const failed = route.stops.filter((s) => s.status === "no_entregado").length;
  const notReady = route.stops.filter(
    (s) => !s.packed && s.status !== "cancelado",
  ).length;
  const unchecked = route.stops.filter(
    (s) => !s.verified && s.status !== "cancelado",
  ).length;
  const next = route.stops.find(
    (s) => !["entregado", "no_entregado", "cancelado"].includes(s.status),
  );
  const url = fullRouteUrl(route);
  return (
    <section className="space-y-3">
      <Panel
        icon={Route}
        title={`${total > 1 ? `Canasta ${number} de ${total} · ` : ""}Franja ${formatTime12(startT)} – ${formatTime12(endT)}`}
        description={`${route.stops.length} paradas · ${fmtKm(route.distanceM)} · ${fmtMin(route.durationS)} · ${done}/${route.stops.length} entregados${failed ? ` · ${failed} no ${failed === 1 ? "entregado" : "entregados"}` : ""}`}
        actions={
          <StatusBadge
            tone={
              route.returnedAt
                ? "green"
                : route.status === "completada"
                  ? "amber"
                  : route.status === "en_camino"
                    ? "blue"
                    : "gray"
            }
          >
            {route.returnedAt
              ? "Terminada"
              : route.status === "completada"
                ? "Regresa a la cocina"
                : route.status === "en_camino"
                  ? "En camino"
                  : "Por salir"}
          </StatusBadge>
        }
      >
        {route.kitchen && route.status !== "completada" && (
          <div className="mb-4">
            <RouteMap
              height={280}
              kitchen={route.kitchen}
              routes={[
                {
                  id: route.id,
                  color: "#2E7D32",
                  path: route.polyline
                    ? decodePolyline(route.polyline)
                    : undefined,
                  stops: route.stops
                    .filter((s) => Number.isFinite(s.lat))
                    .map((s) => ({
                      lat: s.lat,
                      lng: s.lng,
                      position: s.position,
                      code: s.code,
                      done:
                        s.status === "entregado" || s.status === "no_entregado",
                    })),
                },
              ]}
            />
            <p className="mt-1.5 text-[11px] text-[#1B1B1B]/45">
              {route.polyline
                ? "Recorrido sugerido por Google Maps."
                : "Orden calculado por el sistema (líneas rectas de referencia)."}{" "}
              Sales de {route.kitchen.name} y vuelves al terminar.
            </p>
          </div>
        )}
        {route.status === "planificada" && <CourierCheck route={route} />}
        {route.status === "completada" && (
          <ReturnBlock route={route} failed={failed} />
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {route.status === "planificada" && (
            <Button
              disabled={pending || notReady > 0 || unchecked > 0}
              onClick={() =>
                start(async () => {
                  notify(await startRoute(route.id));
                  router.refresh();
                })
              }
            >
              <Play className="h-4 w-4" />{" "}
              {notReady > 0
                ? `Esperando ${notReady} ${notReady === 1 ? "pedido" : "pedidos"} por alistar`
                : unchecked > 0
                  ? `Revisa ${unchecked} ${unchecked === 1 ? "pedido" : "pedidos"} para salir`
                  : "Salir a ruta"}
            </Button>
          )}
          {url && route.status !== "completada" && (
            <Button variant="secondary" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <MapPinned className="h-4 w-4" /> Ruta completa en Google Maps
              </a>
            </Button>
          )}
        </div>
      </Panel>

      <ol className="space-y-3">
        {route.stops.map((s) => (
          <StopCard
            key={s.orderId}
            stop={s}
            isNext={s.orderId === next?.orderId && route.status === "en_camino"}
            canDeliver={route.status === "en_camino"}
            waitMinutes={waitMinutes}
          />
        ))}
      </ol>
    </section>
  );
}

function StopCard({
  stop: s,
  isNext,
  canDeliver,
  waitMinutes,
}: {
  stop: RouteStopView;
  isNext: boolean;
  canDeliver: boolean;
  waitMinutes: number;
}) {
  const router = useRouter();
  const [arrivedAt, setArrivedAt] = useState<string | null>(s.arrivedAt);
  const [arriving, startArriving] = useTransition();
  // Reloj de la espera: solo en el navegador (evita diferencias con el render del servidor).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!arrivedAt) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [arrivedAt]);
  const waitLeft =
    arrivedAt && now !== null
      ? Math.max(
          0,
          Math.ceil(
            (new Date(arrivedAt).getTime() + waitMinutes * 60_000 - now) / 1000,
          ),
        )
      : null;
  const canReport = waitLeft === 0;
  const clock = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const arrive = () =>
    startArriving(async () => {
      const r = await markArrived(s.orderId);
      if (notify(r) && r.arrivedAt) setArrivedAt(r.arrivedAt);
    });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const failed = s.status === "no_entregado";
  // Parada cerrada: entregada o no entregada (ya no se trabaja en ella).
  const delivered = s.status === "entregado" || failed;

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressPhoto(file);
      const path = `${s.orderId}/${Date.now()}.jpg`;
      const { error } = await createClient()
        .storage.from("delivery-proofs")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      if (notify(await deliverOrder(s.orderId, path))) router.refresh();
    } catch {
      toast.error("No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <li
      className={cn(
        "rounded-3xl border bg-white p-4 sm:p-5",
        delivered
          ? "border-[#1F4D36]/[0.06] opacity-60"
          : isNext
            ? "border-2 border-[#8BC34A] shadow-lg shadow-[#8BC34A]/10"
            : "border-[#1F4D36]/[0.08]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl text-white",
            delivered ? "bg-[#9CA3AF]" : "bg-[#1F4D36]",
          )}
        >
          <span className="text-[8px] font-semibold leading-none opacity-80">
            PARADA
          </span>
          <span className="font-display text-lg font-bold leading-none">
            {s.position}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          {/* El consecutivo es lo que el domiciliario busca en la etiqueta del empaque. */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-lg px-2 py-0.5 font-display text-base font-bold leading-tight tabular-nums",
                delivered
                  ? "bg-[#1B1B1B]/[0.06] text-[#1B1B1B]/45"
                  : "bg-[#E8F3DC] text-[#1F4D36] ring-1 ring-[#8BC34A]/50",
              )}
            >
              {s.code}
            </span>
            {isNext && <StatusBadge tone="green">Siguiente</StatusBadge>}
          </div>
          <p className="mt-1 text-sm font-semibold text-[#1F4D36]">
            {s.customer}
          </p>
          <p className="text-sm text-[#1B1B1B]/75">{s.address}</p>
          {s.details && (
            <p className="text-xs text-[#1B1B1B]/55">{s.details}</p>
          )}
          {s.notes && (
            <p className="mt-1 rounded-xl bg-amber-50 px-2 py-1 text-xs text-amber-900">
              Nota: {s.notes}
            </p>
          )}
          <p className="mt-1 text-xs text-[#1B1B1B]/45">
            {s.dishes.join(", ")}
          </p>
        </div>
        <span className="shrink-0 text-right text-xs text-[#1B1B1B]/45">
          {failed ? (
            <span className="flex items-center gap-1 font-semibold text-red-700">
              <PackageX className="h-4 w-4" /> No entregado
            </span>
          ) : delivered ? (
            <span className="flex items-center gap-1 font-semibold text-[#2E6B1F]">
              <CheckCircle2 className="h-4 w-4" /> {fmtClock(s.deliveredAt)}
            </span>
          ) : (
            s.eta && <>≈ {fmtClock(s.eta)}</>
          )}
        </span>
      </div>

      {!delivered && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {s.phone && (
            <Button variant="secondary" size="sm" asChild>
              <a href={`tel:${s.phone}`}>
                <Phone className="h-4 w-4" /> {formatPhone(s.phone)}
              </a>
            </Button>
          )}
          {s.phone && (
            <Button variant="secondary" size="sm" asChild>
              <a
                href={`https://wa.me/${whatsappDigits(s.phone)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          )}
          {Number.isFinite(s.lat) && (
            <Button variant="secondary" size="sm" asChild>
              <a href={gmapsTo(s)} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" /> Google Maps
              </a>
            </Button>
          )}
          {Number.isFinite(s.lat) && (
            <Button variant="secondary" size="sm" asChild>
              <a href={wazeTo(s)} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" /> Waze
              </a>
            </Button>
          )}
        </div>
      )}

      {canDeliver && !delivered && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              onPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {/* Llegada: avisa al cliente y arranca la espera; al terminar se habilita "no se pudo entregar". */}
          {!arrivedAt ? (
            <Button
              variant="secondary"
              className="mt-3 w-full"
              disabled={arriving}
              onClick={arrive}
            >
              <BellRing className="h-4 w-4" />{" "}
              {arriving ? "Avisando…" : "Llegué: avisar al cliente"}
            </Button>
          ) : (
            <div
              className={cn(
                "mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-2 text-sm",
                canReport
                  ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  : "bg-[#F4F8F2] text-[#1F4D36]",
              )}
            >
              <BellRing className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                Avisaste a las {fmtClock(arrivedAt)} ·{" "}
                {waitLeft === null ? (
                  "esperando al cliente"
                ) : canReport ? (
                  <strong>ya pasaron {waitMinutes} min</strong>
                ) : (
                  <>
                    esperando al cliente{" "}
                    <strong className="tabular-nums">{clock(waitLeft)}</strong>
                  </>
                )}
              </span>
              {s.phone && (
                <a
                  href={`https://wa.me/${whatsappDigits(s.phone)}?text=${encodeURIComponent(`Hola ${s.customer.split(" ")[0]}, soy tu domiciliario de FRESKO. Ya estoy en la entrada con tu pedido ${s.code}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold underline-offset-2 hover:underline"
                >
                  Escribirle por WhatsApp
                </a>
              )}
            </div>
          )}
          {/* Entregar es la acción principal (ocupa casi todo); la novedad va al lado, secundaria. */}
          <div className="mt-3 flex gap-2">
            <Button
              className="min-w-0 flex-1"
              size="lg"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-5 w-5 shrink-0" />{" "}
              <span className="truncate">
                {uploading ? (
                  "Subiendo foto…"
                ) : (
                  <>
                    <span className="sm:hidden">Entregar con foto</span>
                    <span className="hidden sm:inline">
                      Tomar foto y marcar entregado
                    </span>
                  </>
                )}
              </span>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              disabled={uploading}
              onClick={() => setReporting(true)}
              title="No se pudo entregar: reportar novedad"
              aria-label="No se pudo entregar: reportar novedad"
              className="shrink-0 border-red-200 px-3 text-red-700 hover:border-red-300 hover:bg-red-50 sm:px-4"
            >
              <PackageX className="h-5 w-5" />
              <span className="sm:hidden">Novedad</span>
              <span className="hidden sm:inline">No se pudo entregar</span>
            </Button>
          </div>
          {reporting && (
            <DeliveryIncidentSheet
              orderId={s.orderId}
              code={s.code}
              waitMinutes={waitMinutes}
              waitLeft={
                !arrivedAt
                  ? null
                  : canReport
                    ? 0
                    : (waitLeft ?? waitMinutes * 60)
              }
              waitLabel={
                !arrivedAt
                  ? "Avisa que llegaste"
                  : waitLeft
                    ? `Disponible en ${clock(waitLeft)}`
                    : ""
              }
              onClose={() => setReporting(false)}
              onDone={() => {
                setReporting(false);
                router.refresh();
              }}
            />
          )}
        </>
      )}
      {failed && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900">
          Novedad registrada. Regresa este pedido a la cocina al terminar la
          ruta.
        </p>
      )}
    </li>
  );
}

/**
 * El alistamiento lo hace Alistamiento; el domiciliario revisa que cada pedido de su canasta
 * esté completo y bien etiquetado antes de salir.
 */
function CourierCheck({ route }: { route: RouteView }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const order = [...route.stops].reverse();
  const packed = route.stops.filter((s) => s.packed).length;
  const verified = route.stops.filter((s) => s.verified).length;

  if (packed === 0) {
    return (
      <p className="mb-2 flex items-start gap-2 rounded-2xl bg-[#F4F8F2] px-3 py-2.5 text-sm text-[#1F4D36]">
        <ChefHat className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {route.kitchenPending > 0
            ? `Cocina aún prepara ${route.kitchenPending} ${route.kitchenPending === 1 ? "pedido" : "pedidos"} de tu canasta.`
            : "Tu canasta está lista para alistar."}{" "}
          Cuando Alistamiento la arme, revisa aquí cada pedido.
        </span>
      </p>
    );
  }

  const toggle = (s: RouteStopView) =>
    start(async () => {
      notify(await verifyStop(s.orderId, !s.verified));
      router.refresh();
    });

  // Pedidos alistados que aún no ha revisado: los que marca "Revisar todo".
  const toCheck = route.stops.filter((s) => s.packed && !s.verified).length;
  const checkAll = () =>
    start(async () => {
      notify(await verifyRouteAll(route.id));
      router.refresh();
    });

  return (
    <div className="rounded-2xl bg-[#F4F8F2] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 font-display font-bold text-[#1F4D36]">
          <ClipboardCheck className="mr-1.5 inline h-4 w-4 text-[#7CB342]" />
          Revisa tu canasta · {verified}/{route.stops.length}
        </p>
        {toCheck > 1 && (
          <Button size="sm" disabled={busy} onClick={checkAll}>
            <CheckCircle2 className="h-4 w-4" />{" "}
            {busy ? "Revisando…" : `Revisar todo (${toCheck})`}
          </Button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-[#1F4D36]/70">
        Confirma que cada bolsa tiene su etiqueta y los platos completos. Si
        algo está mal, avísale a quien alista.
      </p>
      <ul className="mt-3 space-y-2">
        {order.map((s) => (
          <li
            key={s.orderId}
            className={cn(
              "rounded-xl bg-white p-3 ring-1",
              s.verified ? "ring-[#8BC34A]/50" : "ring-[#1F4D36]/10",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1F4D36] font-display text-sm font-bold text-white">
                {s.position}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-[#1F4D36]">
                  {s.code}
                  {s.addedLate && (
                    <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                      Nuevo
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#1B1B1B]/60">
                  {s.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </p>
              </div>
              {!s.packed ? (
                <StatusBadge tone="amber">Por alistar</StatusBadge>
              ) : (
                <Button
                  size="sm"
                  variant={s.verified ? "ghost" : "default"}
                  disabled={busy}
                  onClick={() => toggle(s)}
                >
                  {s.verified ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-[#2E6B1F]" />{" "}
                      Correcto
                    </>
                  ) : (
                    "Revisar ✓"
                  )}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const fmtSpan = (from: string | null, to: string | null) => {
  if (!from || !to) return "";
  const m = Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000),
  );
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

/** Al terminar las paradas: registrar la llegada a la cocina (queda disponible) y ver los tiempos. */
function ReturnBlock({ route, failed }: { route: RouteView; failed: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  if (route.returnedAt) {
    return (
      <div className="rounded-2xl bg-[#E8F3DC] px-4 py-3 text-sm text-[#1F4D36]">
        <p className="flex items-center gap-2 font-semibold">
          <Warehouse className="h-4 w-4" /> Regresaste a la cocina a las{" "}
          {fmtClock(route.returnedAt)}. Ya estás disponible.
        </p>
        <p className="mt-1 text-xs text-[#1F4D36]/75">
          Salida {fmtClock(route.startedAt)} · última parada{" "}
          {fmtClock(route.completedAt)} · regreso {fmtClock(route.returnedAt)} ·
          ruta de {fmtSpan(route.startedAt, route.returnedAt)}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="font-display font-bold text-amber-900">
        Terminaste tus paradas
      </p>
      <p className="mt-0.5 text-sm text-amber-900/80">
        Cuando llegues a la cocina regístralo para quedar disponible.
        {failed > 0 && (
          <strong>
            {" "}
            Entrega{" "}
            {failed === 1
              ? "el pedido no entregado"
              : `los ${failed} pedidos no entregados`}{" "}
            en la cocina.
          </strong>
        )}
      </p>
      <Button
        size="lg"
        className="mt-3 w-full"
        disabled={busy}
        onClick={() =>
          start(async () => {
            notify(await returnToKitchen(route.id));
            router.refresh();
          })
        }
      >
        <Warehouse className="h-5 w-5" />{" "}
        {busy ? "Registrando…" : "Llegué a la cocina"}
      </Button>
    </div>
  );
}
