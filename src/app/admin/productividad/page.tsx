import Link from "next/link";
import { AlertTriangle, Bike, ChefHat, Clock, Gauge, Salad, Store, Truck } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/ui";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { addDays, daysBetween } from "@/lib/finance";
import { loadKitchens } from "@/lib/operations";
import { loadProductivity } from "@/lib/productivity";
import { loadPointResults } from "@/lib/points";
import { requirePermission } from "@/lib/supabase/auth";
import { todayBogota } from "@/lib/subscriptions";
import { cn, formatPrice } from "@/lib/utils";

const money = (n: number | null | undefined) => (n === null || n === undefined ? "—" : formatPrice(Math.round(n)));
const num = (n: number, d = 1) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);
const perDish = (s: number) => (s >= 60 ? `${num(s / 60)} min` : `${Math.round(s)} s`);
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);
/** Tasas por hora: "—" si no hay tiempos confiables. */
const rate = (x: number) => (x > 0 ? num(x) : "—");

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Gauge; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1B1B1B]/55">
        <Icon className="h-4 w-4 text-[#7CB342]" /> {label}
      </p>
      <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-[#1F4D36]">{value}</p>
      {hint && <p className="text-[11px] text-[#1B1B1B]/50">{hint}</p>}
    </div>
  );
}

const th = "px-3 py-3 text-right font-bold";
const td = "px-3 py-3 text-right tabular-nums";

export default async function ProductividadPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; cocina?: string }> }) {
  const session = await requirePermission("reports.view");
  const { desde, hasta, cocina } = await searchParams;
  const today = todayBogota();
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  let from = valid(desde) ?? `${today.slice(0, 8)}01`;
  const to = valid(hasta) ?? today;
  if (from > to) from = to;
  if (daysBetween(from, to) > 366) from = addDays(to, -365);
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const kitchen = kitchens.find((k) => k.id === cocina) ?? null;
  const r = await loadProductivity({ from, to }, kitchen?.id ?? null);
  const pointResults = await loadPointResults({ from, to }, kitchen?.id ?? null, r.payByUser);
  const kname = (id: string) => kitchens.find((k) => k.id === id)?.name ?? "Cocina";
  const canSeeUsers = session.permissions.has("users.manage");
  const person = (id: string, name: string) =>
    canSeeUsers ? (
      <Link href={`/admin/usuarios/${id}`} className="font-semibold text-[#1F4D36] hover:underline">
        {name}
      </Link>
    ) : (
      <span className="font-semibold text-[#1F4D36]">{name}</span>
    );
  const t = r.total;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Negocio"
        title="Productividad"
        description="Cómo rinde el equipo y cuánto cuesta de verdad cada plato: ingredientes y empaque, preparación y domicilio."
      />
      <FinanceFilters
        base="/admin/productividad"
        exportable={false}
        from={from}
        to={to}
        today={today}
        kitchenId={kitchen?.id ?? null}
        kitchens={kitchens.map((k) => ({ id: k.id, name: k.name }))}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ChefHat} label="Costo de preparación por plato" value={money(t.prepPerDish)} hint={`Cocina y alistamiento · ${num(t.dishesMade, 0)} platos`} />
        <Kpi
          icon={Truck}
          label="Costo de domicilio por pedido"
          value={money(t.deliveryPerOrder)}
          hint={`${money(t.deliveryPerDish)} por plato · ${num(t.deliveries, 0)} entregas`}
        />
        <Kpi icon={Gauge} label="Platos por hora en cocina" value={rate(t.perHour)} hint={t.cookSeconds ? `${dur(t.cookSeconds)} preparando` : "Sin tiempos registrados"} />
        <Kpi icon={Bike} label="Entregas por hora en ruta" value={rate(t.deliveriesPerHour)} hint={`${pct(t.failedPct)} no entregados`} />
      </div>

      {r.unpaid.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sin pago registrado en Cuentas → Nómina: <strong>{r.unpaid.join(", ")}</strong>. Su trabajo cuenta en la productividad, pero no suma al costo de preparación ni de
            domicilio.
          </span>
        </p>
      )}

      {/* Cocineros */}
      <Panel
        icon={ChefHat}
        title="Cocineros"
        description="Tandas terminadas en el período. Ritmo: frente al tiempo promedio real de cada plato en las últimas 4 semanas (más de 100 % es más rápido)."
        bodyClassName="p-0"
      >
        {r.cooks.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
                  <th className="px-6 py-3 text-left font-bold">Persona</th>
                  <th className={th}>Días</th>
                  <th className={th}>Platos</th>
                  <th className={th}>Platos / hora</th>
                  <th className={th}>Tiempo por plato</th>
                  <th className={th}>Ritmo</th>
                  <th className={th}>Novedades</th>
                  <th className={th}>Costo</th>
                  <th className="px-6 py-3 text-right font-bold">Costo por plato</th>
                </tr>
              </thead>
              <tbody>
                {r.cooks.map((c) => (
                  <tr key={c.userId} className="border-b border-[#1F4D36]/[0.05] last:border-0">
                    <td className="px-6 py-3">
                      {person(c.userId, c.name)}
                      <p className="text-xs text-[#1B1B1B]/45">
                        {c.batches} {c.batches === 1 ? "tanda" : "tandas"}{c.activeSeconds ? ` · ${dur(c.activeSeconds)} preparando` : ""}
                      </p>
                    </td>
                    <td className={td}>{c.days}</td>
                    <td className={cn(td, "font-semibold text-[#1F4D36]")}>{c.dishes}</td>
                    <td className={td}>{rate(c.perHour)}</td>
                    <td className={td}>{c.secPerDish ? perDish(c.secPerDish) : "—"}</td>
                    <td className={cn(td, "font-semibold", c.efficiency === null ? "text-[#1B1B1B]/40" : c.efficiency >= 1 ? "text-[#2E6B1F]" : c.efficiency < 0.8 ? "text-red-700" : "text-amber-700")}>
                      {pct(c.efficiency)}
                    </td>
                    <td className={cn(td, c.incidents ? "text-amber-700" : "text-[#1B1B1B]/40")}>{c.incidents}</td>
                    <td className={td}>{c.cost === null ? <span className="text-xs text-[#1B1B1B]/40">{kitchen ? "Sin pago aquí" : "Sin pago"}</span> : money(c.cost)}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums text-[#1F4D36]">{money(c.costPerDish)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState icon={ChefHat} title="Sin tandas en el período" />
          </div>
        )}
      </Panel>

      {/* Domiciliarios */}
      <Panel
        icon={Truck}
        title="Domiciliarios"
        description="Canastas que salieron en el período. El tiempo va de la salida al regreso a la cocina; la desviación compara con la ruta calculada."
        bodyClassName="p-0"
      >
        {r.couriers.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
                  <th className="px-6 py-3 text-left font-bold">Persona</th>
                  <th className={th}>Días</th>
                  <th className={th}>Entregas</th>
                  <th className={th}>No entregados</th>
                  <th className={th}>Entregas / hora</th>
                  <th className={th}>Min por entrega</th>
                  <th className={th}>Espera prom.</th>
                  <th className={th}>Vs. ruta</th>
                  <th className={th}>Costo por entrega</th>
                  <th className="px-6 py-3 text-right font-bold">Costo por plato</th>
                </tr>
              </thead>
              <tbody>
                {r.couriers.map((c) => (
                  <tr key={c.userId} className="border-b border-[#1F4D36]/[0.05] last:border-0">
                    <td className="px-6 py-3">
                      {person(c.userId, c.name)}
                      <p className="text-xs text-[#1B1B1B]/45">
                        {c.routes} {c.routes === 1 ? "canasta" : "canastas"} · {num(c.km)} km{c.activeSeconds ? ` · ${dur(c.activeSeconds)} en ruta` : ""}
                      </p>
                    </td>
                    <td className={td}>{c.days}</td>
                    <td className={cn(td, "font-semibold text-[#1F4D36]")}>{c.delivered}</td>
                    <td className={cn(td, c.failed ? "font-semibold text-red-700" : "text-[#1B1B1B]/40")}>
                      {c.failed}
                      {c.stops ? <span className="ml-1 text-xs font-normal text-[#1B1B1B]/45">({pct(c.failed / c.stops)})</span> : null}
                    </td>
                    <td className={td}>{rate(c.perHour)}</td>
                    <td className={td}>{c.minPerDelivery === null ? "—" : `${num(c.minPerDelivery)} min`}</td>
                    <td className={td}>{c.avgWaitMin === null ? "—" : `${num(c.avgWaitMin)} min`}</td>
                    <td className={cn(td, c.drift === null ? "text-[#1B1B1B]/40" : c.drift <= 1.1 ? "text-[#2E6B1F]" : c.drift > 1.3 ? "text-red-700" : "text-amber-700")}>
                      {c.drift === null ? "—" : `${c.drift >= 1 ? "+" : "−"}${Math.abs(Math.round((c.drift - 1) * 100))} %`}
                    </td>
                    <td className={td}>{c.cost === null ? <span className="text-xs text-[#1B1B1B]/40">{kitchen ? "Sin pago aquí" : "Sin pago"}</span> : money(c.costPerDelivery)}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums text-[#1F4D36]">{money(c.costPerDish)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState icon={Truck} title="Sin rutas en el período" />
          </div>
        )}
      </Panel>

      {/* Costo real por plato */}
      <Panel
        icon={Salad}
        title="Costo real por plato"
        description="Ingredientes y empaque (costo real de las tandas) + preparación (tiempo real del plato × costo de cocina por minuto) + domicilio (promedio por plato), frente al precio de venta."
        bodyClassName="p-0"
      >
        {r.products.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
                  <th className="px-6 py-3 text-left font-bold">Plato</th>
                  <th className={th}>Platos</th>
                  <th className={th}>Precio</th>
                  <th className={th}>Ingredientes y empaque</th>
                  <th className={th}>Preparación</th>
                  <th className={th}>Domicilio</th>
                  <th className={th}>Costo total</th>
                  <th className="px-6 py-3 text-right font-bold">Margen</th>
                </tr>
              </thead>
              <tbody>
                {r.products.map((p) => {
                  const m = p.price ? p.margin / p.price : null;
                  return (
                    <tr key={p.name} className="border-b border-[#1F4D36]/[0.05] last:border-0">
                      <td className="px-6 py-3">
                        <span className="font-semibold text-[#1F4D36]">{p.name}</span>
                        <p className="text-xs text-[#1B1B1B]/45">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {perDish(p.secPerDish)} por plato
                        </p>
                      </td>
                      <td className={td}>{p.units}</td>
                      <td className={td}>{money(p.price)}</td>
                      <td className={td}>{money(p.ingredients)}</td>
                      <td className={td}>{money(p.labor)}</td>
                      <td className={td}>{money(p.delivery)}</td>
                      <td className={cn(td, "font-semibold")}>{money(p.total)}</td>
                      <td className={cn("px-6 py-3 text-right font-bold tabular-nums", p.margin < 0 ? "text-red-700" : "text-[#1F4D36]")}>
                        {money(p.margin)}
                        {m !== null && <span className="ml-1 text-xs font-normal text-[#1B1B1B]/45">{pct(m)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState icon={Salad} title="Sin platos preparados en el período" />
          </div>
        )}
      </Panel>

      {/* Puntos de venta */}
      {pointResults.length > 0 && (
        <Panel
          icon={Store}
          title="Puntos de venta"
          description="Venta real (lo vendido sobre lo recibido), merma (equipo, donación, pérdida y faltantes) y ganancia: ventas netas − costo de lo vendido − merma − transporte − pago del vendedor."
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
                  <th className="px-6 py-3 text-left font-bold">Punto</th>
                  <th className={th}>Días</th>
                  <th className={th}>Recibidos</th>
                  <th className={th}>Vendidos</th>
                  <th className={th}>Venta real</th>
                  <th className={th}>Volvieron</th>
                  <th className={th}>Merma</th>
                  <th className={th}>Por hora</th>
                  <th className={th}>Ventas netas</th>
                  <th className={th}>Costos</th>
                  <th className="px-6 py-3 text-right font-bold">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {pointResults.map((p) => (
                  <tr key={p.pointId} className="border-b border-[#1F4D36]/[0.05] align-top last:border-0">
                    <td className="px-6 py-3">
                      <p className="font-semibold text-[#1F4D36]">{p.name}</p>
                      {!kitchen && <p className="text-xs text-[#1B1B1B]/45">{kname(p.kitchenId)}</p>}
                    </td>
                    <td className={td}>{p.days}</td>
                    <td className={td}>{p.received}</td>
                    <td className={td}>{p.sold}</td>
                    <td className={td}>{pct(p.sellThrough)}</td>
                    <td className={td}>{p.returned || "—"}</td>
                    <td className={td}>
                      {pct(p.wastePct)}
                      <span className="block text-[11px] text-[#1B1B1B]/45">
                        {[p.staff && `equipo ${p.staff}`, p.donated && `donación ${p.donated}`, p.lost && `pérdida ${p.lost}`, p.missing && `faltan ${p.missing}`].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td className={td}>{p.perHour === null ? "—" : num(p.perHour)}</td>
                    <td className={td}>{money(p.netSales)}</td>
                    <td className={td}>
                      {money(p.costSold + p.wasteCost + p.transport + p.vendorPay)}
                      <span className="block text-[11px] text-[#1B1B1B]/45">
                        comida {money(p.costSold)} · merma {money(p.wasteCost)} · transporte {money(p.transport)} · vendedor {money(p.vendorPay)}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-right font-bold tabular-nums ${p.profit < 0 ? "text-red-700" : "text-[#1F4D36]"}`}>{money(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Por cocina */}
      {!kitchen && r.kitchens.length > 1 && (
        <Panel icon={Store} title="Por cocina" description="Para comparar cómo funciona el modelo en cada cocina." bodyClassName="p-0">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
                  <th className="px-6 py-3 text-left font-bold">Cocina</th>
                  <th className={th}>Platos</th>
                  <th className={th}>Platos / hora</th>
                  <th className={th}>Preparación por plato</th>
                  <th className={th}>Entregas</th>
                  <th className={th}>Entregas / hora</th>
                  <th className={th}>No entregados</th>
                  <th className={th}>Domicilio por pedido</th>
                  <th className="px-6 py-3 text-right font-bold">Domicilio por plato</th>
                </tr>
              </thead>
              <tbody>
                {[...r.kitchens]
                  .sort((a, b) => kname(a.kitchenId).localeCompare(kname(b.kitchenId)))
                  .map((k) => (
                    <tr key={k.kitchenId} className="border-b border-[#1F4D36]/[0.05] last:border-0">
                      <td className="px-6 py-3 font-semibold text-[#1F4D36]">{kname(k.kitchenId)}</td>
                      <td className={td}>{k.dishesMade}</td>
                      <td className={td}>{rate(k.perHour)}</td>
                      <td className={td}>{money(k.prepPerDish)}</td>
                      <td className={td}>{k.deliveries}</td>
                      <td className={td}>{rate(k.deliveriesPerHour)}</td>
                      <td className={td}>{pct(k.failedPct)}</td>
                      <td className={td}>{money(k.deliveryPerOrder)}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{money(k.deliveryPerDish)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
