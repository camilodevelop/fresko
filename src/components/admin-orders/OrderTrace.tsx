import { BellRing, Camera, CheckCircle2, ChefHat, CircleDollarSign, Clock, Package, PackageX, ShoppingBag, Truck, Wallet } from "lucide-react";
import { Panel } from "@/components/dashboard/ui";
import { incidentLabel } from "@/lib/incidents";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPrice } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
const when = (iso: string | null | undefined) => (iso ? fmt.format(new Date(iso)) : null);
const mins = (a: string | null | undefined, b: string | null | undefined) => (a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)) : null);
const dur = (s: number | null | undefined) => (s == null ? "" : s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

type Line = { label: string; value?: string | null; tone?: "bad" | "muted" };

/** Etapa del recorrido: encabezado con estado y sus datos. */
function Stage({ icon: Icon, title, status, done, bad, lines, children }: { icon: typeof Clock; title: string; status: string; done: boolean; bad?: boolean; lines: Line[]; children?: React.ReactNode }) {
  return (
    <section className="relative pl-12">
      <span
        className={cn(
          "absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-xl",
          bad ? "bg-red-50 text-red-700" : done ? "bg-[#E8F3DC] text-[#2E6B1F]" : "bg-[#F4F4F1] text-[#1B1B1B]/35"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display font-bold text-[#1F4D36]">{title}</span>
        <span className={cn("text-xs font-semibold", bad ? "text-red-700" : done ? "text-[#2E6B1F]" : "text-[#1B1B1B]/40")}>{status}</span>
      </p>
      {lines.length > 0 && (
        <dl className="mt-1.5 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {lines
            .filter((l) => l.value)
            .map((l) => (
              <div key={l.label} className="flex justify-between gap-3 border-b border-dashed border-[#1F4D36]/10 py-0.5">
                <dt className="text-[#1B1B1B]/50">{l.label}</dt>
                <dd className={cn("text-right", l.tone === "bad" ? "font-semibold text-red-700" : l.tone === "muted" ? "text-[#1B1B1B]/50" : "text-[#1B1B1B]/80")}>{l.value}</dd>
              </div>
            ))}
        </dl>
      )}
      {children}
    </section>
  );
}

/**
 * Recorrido completo del pedido para el administrador: compra, cocina, alistamiento y domicilio,
 * con horas, responsables, novedades y fotos; y, si puede ver cuentas, su costo y utilidad.
 */
export async function OrderTrace({
  order,
  showMoney,
}: {
  order: {
    id: string;
    code: string;
    kind: string;
    total: number;
    paid_at: string | null;
    status: string;
    delivered_at: string | null;
    created_at: string;
    payment_status: string;
    channel: string;
    source: string;
  };
  showMoney: boolean;
}) {
  const supabase = await createClient();
  const [{ data: row }, { data: items }, { data: stop }, { data: cost }, { data: incidents }, { data: pays }] = await Promise.all([
    supabase.from("orders").select("prepared_at, packed_at, packed_by, delivered_by, created_by, tax_amount, tax_name, delivery_photo_path").eq("id", order.id).single(),
    supabase
      .from("order_items")
      .select("id, name, quantity, prepared_qty, options, prep_batch_items(quantity, prep_batches(name, kind, status, started_at, finished_at, duration_seconds, started_by))")
      .eq("order_id", order.id),
    supabase
      .from("route_stops")
      .select("route_id, position, arrived_at, verified_at, added_late, delivery_routes(courier_id, started_at, completed_at, returned_at, status, packing_started_at)")
      .eq("order_id", order.id)
      .maybeSingle(),
    supabase.from("order_food_costs").select("food_cost").eq("order_id", order.id).maybeSingle(),
    supabase.from("order_incidents").select("stage, reason, note, item_name, quantity, resolution, photo_path, created_at, created_by").eq("order_id", order.id).order("created_at"),
    supabase.from("payments").select("status, reference, provider, created_at, created_by, method_name, received_amount, change_amount").eq("order_id", order.id).order("created_at"),
  ]);
  type Item = {
    id: string;
    name: string;
    quantity: number;
    prepared_qty: number;
    options: { name: string }[] | null;
    prep_batch_items: { quantity: number; prep_batches: { name: string; kind: string; status: string; started_at: string; finished_at: string | null; duration_seconds: number | null; started_by: string | null } | null }[];
  };
  const list = (items ?? []) as unknown as Item[];
  type Stop = {
    route_id: string;
    position: number;
    arrived_at: string | null;
    verified_at: string | null;
    added_late: boolean;
    delivery_routes: { courier_id: string | null; started_at: string | null; completed_at: string | null; returned_at: string | null; status: string; packing_started_at: string | null } | null;
  };
  const st = (stop as unknown as Stop | null) ?? null;
  const route = st?.delivery_routes ?? null;
  const { count: stopsInRoute } = st ? await supabase.from("route_stops").select("order_id", { count: "exact", head: true }).eq("route_id", st.route_id) : { count: null };

  const ids = [
    ...new Set(
      [row?.packed_by, row?.delivered_by, row?.created_by, ...(pays ?? []).map((p) => p.created_by), route?.courier_id, ...(incidents ?? []).map((n) => n.created_by), ...list.flatMap((i) => i.prep_batch_items.map((l) => l.prep_batches?.started_by))].filter(
        (x): x is string => Boolean(x)
      )
    ),
  ];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const who = (id: string | null | undefined) => (id ? people?.find((p) => p.id === id)?.full_name || people?.find((p) => p.id === id)?.email || "—" : null);

  // Fotos (bucket privado): entrega y novedades de entrega.
  const photoPaths = [row?.delivery_photo_path, ...(incidents ?? []).map((n) => n.photo_path)].filter((x): x is string => Boolean(x));
  const { data: signed } = photoPaths.length ? await supabase.storage.from("delivery-proofs").createSignedUrls(photoPaths, 3600) : { data: [] };
  const urlOf = (p: string | null | undefined) => (p ? (signed ?? []).find((s) => s.path === p)?.signedUrl ?? undefined : undefined);

  const byStage = (s: string) => (incidents ?? []).filter((n) => n.stage === s);
  const delivered = order.status === "entregado";
  const failed = order.status === "no_entregado";
  const deliveryIncident = byStage("entrega").at(-1);
  const units = list.reduce((s, i) => s + i.quantity, 0);
  const preparedUnits = list.reduce((s, i) => s + Math.min(i.quantity, i.prepared_qty), 0);
  const approved = (pays ?? []).find((p) => p.status === "aprobado");
  const refund = (pays ?? []).find((p) => p.status === "reembolsado");
  const counter = order.channel !== "domicilio";
  const point = order.channel === "punto";
  const tax = row?.tax_amount ?? 0;
  const foodCost = Number(cost?.food_cost ?? 0);
  const net = order.total - tax;

  const incidentNotes = (stage: string) =>
    byStage(stage).length ? (
      <ul className="mt-2 space-y-1.5">
        {byStage(stage).map((n, i) => (
          <li key={i} className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>{incidentLabel(n.reason)}</strong>
            {n.item_name && ` · ${n.quantity ? `${n.quantity} × ` : ""}${n.item_name}`} · {n.note}
            <span className="block text-amber-900/60">
              {when(n.created_at)}
              {n.created_by ? ` · ${who(n.created_by)}` : ""} · {n.resolution === "solucionado" ? "Solucionada" : n.resolution === "liberado" ? "Liberado" : n.resolution === "cancelado" ? "Cancelado" : "Abierta"}
            </span>
            {urlOf(n.photo_path) && (
              <a href={urlOf(n.photo_path)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold underline">
                <Camera className="h-3 w-3" /> Ver foto
              </a>
            )}
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <Panel
      icon={Clock}
      title="Recorrido del pedido"
      description={
        point
          ? "Venta en un punto: plato preparado antes en la cocina y vendido por el vendedor."
          : counter
            ? "Venta en mostrador: cobro, cocina y entrega, cada paso con su hora y responsable."
            : "Compra, cocina, alistamiento y domicilio: cada paso con su hora y responsable."
      }
    >
      <div className="relative mt-4 space-y-6 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-[#1F4D36]/10">
        {/* 1. Compra */}
        <Stage
          icon={ShoppingBag}
          title={point ? "Venta en el punto" : counter ? "Compra en mostrador" : "Compra"}
          done={Boolean(order.paid_at)}
          bad={Boolean(refund)}
          status={refund ? "Devuelto" : order.kind === "suscripcion" ? "Entrega de un plan" : order.paid_at ? "Pagado" : "Sin pagar"}
          lines={[
            { label: "Pedido creado", value: when(order.created_at) },
            {
              label: "Origen",
              value: point ? `Vendedor · ${who(row?.created_by) ?? ""}` : counter ? (order.source === "autoservicio" ? "Pantalla de autoservicio" : `Caja · ${who(row?.created_by) ?? ""}`) : null,
            },
            { label: "Cobró", value: counter && approved ? who(approved.created_by) : null },
            { label: "Método", value: approved?.method_name ?? null },
            {
              label: "Recibido",
              value: approved?.received_amount && approved.change_amount ? `${formatPrice(approved.received_amount)} · vuelto ${formatPrice(approved.change_amount)}` : null,
              tone: "muted",
            },
            { label: "Devolución", value: refund ? `${when(refund.created_at)} · ${who(refund.created_by)}` : null, tone: "bad" },
            { label: order.kind === "suscripcion" ? "Cobrado en el plan" : "Pago", value: order.kind === "suscripcion" ? "Sí" : when(order.paid_at) ?? "Pendiente" },
            { label: "Referencia", value: approved ? `${approved.reference} · ${approved.provider}` : null, tone: "muted" },
            { label: order.kind === "suscripcion" ? "Valor en el plan" : "Valor", value: formatPrice(order.total) },
            { label: row?.tax_name && tax ? row.tax_name : "Impuesto", value: tax ? formatPrice(tax) : null },
          ]}
        />

        {/* 2. Cocina */}
        <Stage
          icon={ChefHat}
          title="Cocina"
          done={Boolean(row?.prepared_at)}
          bad={byStage("cocina").some((n) => !n.resolution)}
          status={row?.prepared_at ? `Preparado · ${when(row.prepared_at)}` : `${preparedUnits}/${units} platos listos`}
          lines={[]}
        >
          <ul className="mt-1.5 space-y-1.5 text-sm">
            {list.map((i) => (
              <li key={i.id} className="rounded-xl bg-[#F8F7F2] px-3 py-2">
                <p className="flex justify-between gap-3">
                  <span className="font-semibold text-[#1F4D36]">
                    {i.quantity}× {i.name}
                  </span>
                  <span className={cn("text-xs font-semibold", i.prepared_qty >= i.quantity ? "text-[#2E6B1F]" : "text-amber-700")}>
                    {Math.min(i.prepared_qty, i.quantity)}/{i.quantity} listos
                  </span>
                </p>
                {i.options && i.options.length > 0 && <p className="text-xs text-[#1B1B1B]/50">{i.options.map((o) => o.name).join(", ")}</p>}
                {i.prep_batch_items
                  .filter((l) => l.prep_batches && l.prep_batches.status !== "cancelado")
                  .map((l, k) => (
                    <p key={k} className="text-xs text-[#1B1B1B]/60">
                      {l.quantity}u · {l.prep_batches!.kind === "armado" ? "armado" : `tanda de ${l.prep_batches!.name}`}
                      {l.prep_batches!.started_by ? ` · ${who(l.prep_batches!.started_by)}` : ""} · {when(l.prep_batches!.started_at)}
                      {l.prep_batches!.status === "listo"
                        ? ` → ${when(l.prep_batches!.finished_at)} (${dur(l.prep_batches!.duration_seconds)})`
                        : " · en preparación"}
                    </p>
                  ))}
              </li>
            ))}
          </ul>
          {incidentNotes("cocina")}
        </Stage>

        {/* 3. Alistamiento (solo domicilio) */}
        {!counter && (
        <Stage
          icon={Package}
          title="Alistamiento"
          done={Boolean(row?.packed_at)}
          bad={byStage("alistamiento").some((n) => !n.resolution)}
          status={row?.packed_at ? `Empacado · ${when(row.packed_at)}` : st ? "Por empacar" : "Sin canasta"}
          lines={[
            { label: "Empacado por", value: who(row?.packed_by) },
            { label: "Canasta de", value: st ? (who(route?.courier_id) ?? "Sin domiciliario") : null },
            { label: "Parada", value: st ? `${st.position} de ${stopsInRoute ?? "?"}${st.added_late ? " · agregado tarde" : ""}` : null },
            { label: "Revisado por el domiciliario", value: st ? (st.verified_at ? when(st.verified_at) : "Aún no") : null, tone: st && !st.verified_at ? "muted" : undefined },
          ]}
        >
          {incidentNotes("alistamiento")}
        </Stage>
        )}

        {/* 4. Entrega en mostrador */}
        {counter && (
          <Stage
            icon={CheckCircle2}
            title={point ? "Entregado en el punto" : "Entrega en mostrador"}
            done={delivered}
            bad={order.status === "cancelado"}
            status={delivered ? `Entregado · ${when(order.delivered_at)}` : order.status === "cancelado" ? "Cancelado" : row?.prepared_at ? "Listo, por entregar" : "En espera"}
            lines={[
              { label: "Entregado por", value: delivered ? who(row?.delivered_by) : null },
              {
                label: "Desde el pago",
                value: (() => {
                  const m = mins(order.paid_at, order.delivered_at);
                  return m == null ? null : `${m} min`;
                })(),
              },
            ]}
          />
        )}

        {/* 4. Domicilio */}
        {!counter && (
        <Stage
          icon={failed ? PackageX : delivered ? CheckCircle2 : Truck}
          title="Domicilio"
          done={delivered}
          bad={failed}
          status={delivered ? `Entregado · ${when(order.delivered_at)}` : failed ? "No entregado" : route?.started_at ? "En camino" : "Aún no sale"}
          lines={[
            { label: "Domiciliario", value: who(route?.courier_id) },
            { label: "Salió a ruta", value: when(route?.started_at) },
            { label: "Llegó y avisó al cliente", value: when(st?.arrived_at) },
            {
              label: "Esperó",
              value: (() => {
                const m = mins(st?.arrived_at, order.delivered_at ?? deliveryIncident?.created_at);
                return m == null ? null : `${m} min`;
              })(),
            },
            { label: "Entregado por", value: delivered ? who(row?.delivered_by) : null },
            { label: "Regresó a la cocina", value: when(route?.returned_at) },
          ]}
        >
          {urlOf(row?.delivery_photo_path) && (
            <a href={urlOf(row?.delivery_photo_path)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-3 rounded-2xl bg-[#F4F8F2] p-2 pr-4 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado temporal */}
              <img src={urlOf(row?.delivery_photo_path)} alt="Foto de la entrega" className="h-14 w-14 rounded-xl object-cover" />
              <span className="font-semibold text-[#1F4D36]">Foto de la entrega</span>
            </a>
          )}
          {incidentNotes("entrega")}
        </Stage>
        )}
      </div>

      {showMoney && (order.paid_at || order.kind === "suscripcion") && !refund && (
        <dl className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#F8F7F2] p-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1 text-[11px] text-[#1B1B1B]/50">
              <CircleDollarSign className="h-3 w-3" /> {order.kind === "suscripcion" ? "Valor en el plan" : "Cobrado"}
            </dt>
            <dd className="font-semibold tabular-nums">{formatPrice(order.total)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#1B1B1B]/50">Venta neta</dt>
            <dd className="tabular-nums">{order.kind === "suscripcion" ? "En el plan" : formatPrice(net)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#1B1B1B]/50">Costo de la comida</dt>
            <dd className="tabular-nums">{formatPrice(Math.round(foodCost))}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[11px] text-[#1B1B1B]/50">
              <Wallet className="h-3 w-3" /> Utilidad bruta
            </dt>
            <dd className={cn("font-bold tabular-nums", net - foodCost < 0 ? "text-red-700" : "text-[#1F4D36]")}>
              {order.kind === "suscripcion" ? "En el plan" : formatPrice(Math.round(net - foodCost))}
            </dd>
          </div>
        </dl>
      )}
      {!delivered && !failed && route?.status === "en_camino" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[#1B1B1B]/50">
          <BellRing className="h-3.5 w-3.5" /> El pedido va en camino; esta página se actualiza sola.
        </p>
      )}
    </Panel>
  );
}
