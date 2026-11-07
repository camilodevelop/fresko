import { AlertTriangle, ChefHat, Receipt, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { Panel } from "@/components/dashboard/ui";
import { DailyChart } from "@/components/finance/DailyChart";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { addDays, daysBetween, loadFinance, previousPeriod, statementFor, type Statement } from "@/lib/finance";
import { loadKitchens } from "@/lib/operations";
import { todayBogota } from "@/lib/subscriptions";
import { cn, formatPrice } from "@/lib/utils";

const money = (n: number) => formatPrice(Math.round(n));
const pct = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1).replace(".", ",")} %` : "—");

/** Variación frente al período anterior (sube bien / sube mal según el concepto). */
function Delta({ now, before, goodWhenUp = true }: { now: number; before: number; goodWhenUp?: boolean }) {
  if (!before) return <span className="text-[11px] text-[#1B1B1B]/40">sin período anterior</span>;
  const change = (now - before) / Math.abs(before);
  const up = change >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={cn("text-[11px] font-semibold", Math.abs(change) < 0.005 ? "text-[#1B1B1B]/45" : good ? "text-[#2E6B1F]" : "text-red-700")}>
      {up ? "▲" : "▼"} {Math.abs(change * 100).toFixed(0)} % vs. período anterior
    </span>
  );
}

function Kpi({ icon: Icon, label, value, hint, children, tone }: { icon: typeof Wallet; label: string; value: string; hint?: string; children?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1B1B1B]/55">
        <Icon className="h-4 w-4 text-[#7CB342]" /> {label}
      </p>
      <p className={cn("mt-1.5 font-display text-2xl font-bold tabular-nums", tone === "bad" ? "text-red-700" : "text-[#1F4D36]")}>{value}</p>
      {hint && <p className="text-[11px] text-[#1B1B1B]/50">{hint}</p>}
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

/** Estado de resultados: cada línea con su % sobre ventas netas y el período anterior. */
function StatementTable({ s, prev }: { s: Statement; prev: Statement }) {
  type Row = { label: string; value: number; before: number; kind?: "minus" | "total" | "result" | "sub"; goodWhenUp?: boolean };
  const rows: Row[] = [
    { label: "Ventas de pedidos", value: s.salesOrders, before: prev.salesOrders, kind: "sub" },
    { label: "Ventas de planes", value: s.salesPlans, before: prev.salesPlans, kind: "sub" },
    { label: "Ventas cobradas", value: s.grossSales, before: prev.grossSales },
    { label: "Impuestos incluidos", value: -s.taxes, before: -prev.taxes, kind: "minus" },
    { label: "Ventas netas", value: s.netSales, before: prev.netSales, kind: "total" },
    { label: "Costo de ingredientes y empaques", value: -s.foodCost, before: -prev.foodCost, kind: "minus" },
    { label: "Utilidad bruta", value: s.grossProfit, before: prev.grossProfit, kind: "total" },
    { label: "Pérdidas de inventario", value: -s.lossInventory, before: -prev.lossInventory, kind: "minus" },
    { label: "Platos dañados en cocina", value: -s.lossKitchen, before: -prev.lossKitchen, kind: "minus" },
    { label: "Pedidos no entregados o cancelados", value: -s.lossOrders, before: -prev.lossOrders, kind: "minus" },
    { label: "Nómina", value: -s.payroll, before: -prev.payroll, kind: "minus" },
    { label: "Gastos fijos", value: -s.fixedExpenses, before: -prev.fixedExpenses, kind: "minus" },
    { label: "Otros gastos e imprevistos", value: -s.otherExpenses, before: -prev.otherExpenses, kind: "minus" },
    { label: "Otros ingresos", value: s.otherIncome, before: prev.otherIncome },
    { label: "Utilidad real", value: s.profit, before: prev.profit, kind: "result" },
  ];
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
        <tr>
          <th className="pb-2 font-semibold">Concepto</th>
          <th className="pb-2 text-right font-semibold">Valor</th>
          <th className="hidden pb-2 text-right font-semibold sm:table-cell">% ventas netas</th>
          <th className="hidden pb-2 text-right font-semibold md:table-cell">Período anterior</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.label}
            className={cn(
              "border-t border-[#1F4D36]/[0.06]",
              r.kind === "total" && "bg-[#F8F7F2] font-semibold",
              r.kind === "result" && "border-t-2 border-[#1F4D36]/20 bg-[#E8F3DC] font-bold"
            )}
          >
            <td className={cn("py-2 pr-2", r.kind === "sub" && "pl-4 text-[#1B1B1B]/60", r.kind === "minus" && "text-[#1B1B1B]/70")}>{r.label}</td>
            <td className={cn("py-2 text-right tabular-nums", r.value < 0 && "text-[#1B1B1B]/70", r.kind === "result" && (r.value < 0 ? "text-red-700" : "text-[#1F4D36]"))}>
              {money(r.value)}
            </td>
            <td className="hidden py-2 text-right tabular-nums text-[#1B1B1B]/50 sm:table-cell">{pct(Math.abs(r.value), s.netSales)}</td>
            <td className="hidden py-2 text-right tabular-nums text-[#1B1B1B]/50 md:table-cell">{money(r.before)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function CuentasPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; cocina?: string }> }) {
  const { desde, hasta, cocina } = await searchParams;
  const today = todayBogota();
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  // Por defecto: este mes hasta hoy. Máximo 366 días por consulta.
  let from = valid(desde) ?? `${today.slice(0, 8)}01`;
  const to = valid(hasta) ?? today;
  if (from > to) from = to;
  if (daysBetween(from, to) > 366) from = addDays(to, -365);
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const kitchen = kitchens.find((k) => k.id === cocina) ?? null;

  const period = { from, to };
  const [report, before] = await Promise.all([loadFinance(period), loadFinance(previousPeriod(period))]);
  const s = statementFor(report, kitchen?.id ?? null);
  const p = statementFor(before, kitchen?.id ?? null);
  const nameOf = new Map(kitchens.map((k) => [k.id, k.name]));
  const scoped = <T extends { kitchen: string }>(rows: T[]) => (kitchen ? rows.filter((r) => r.kitchen === kitchen.id) : rows);
  const losses = scoped(report.lossDetail);
  const payroll = scoped(report.payrollDetail);

  return (
    <div className="space-y-6">
      <FinanceFilters from={from} to={to} today={today} kitchenId={kitchen?.id ?? null} kitchens={kitchens.map((k) => ({ id: k.id, name: k.name }))} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={TrendingUp} label="Ventas netas" value={money(s.netSales)} hint={`${s.ordersCount} pedidos · ${s.plansCount} planes${s.taxes ? ` · ${money(s.taxes)} impuestos` : ""}`}>
          <Delta now={s.netSales} before={p.netSales} />
        </Kpi>
        <Kpi icon={ChefHat} label="Costo de ingredientes y empaques" value={money(s.foodCost)} hint={`${pct(s.foodCost, s.netSales)} de las ventas · ${s.dishesMade} platos producidos`}>
          <Delta now={s.foodCost} before={p.foodCost} goodWhenUp={false} />
        </Kpi>
        <Kpi icon={AlertTriangle} label="Pérdidas" value={money(s.losses)} hint={`${pct(s.losses, s.netSales)} de las ventas`} tone={s.losses > 0 ? "bad" : undefined}>
          <Delta now={s.losses} before={p.losses} goodWhenUp={false} />
        </Kpi>
        <Kpi icon={Wallet} label="Utilidad real" value={money(s.profit)} hint={`Margen ${pct(s.profit, s.netSales)}`} tone={s.profit < 0 ? "bad" : "good"}>
          <Delta now={s.profit} before={p.profit} />
        </Kpi>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel icon={Receipt} title="Estado de resultados" description={`Del ${from} al ${to}${kitchen ? ` · ${kitchen.name}` : " · todas las cocinas"}. Ventas según cuándo se cobraron.`}>
          <div className="mt-3 overflow-x-auto">
            <StatementTable s={s} prev={p} />
          </div>
          {!kitchen && report.byKitchen.general && (
            <p className="mt-3 text-xs text-[#1B1B1B]/50">
              Incluye los gastos generales (los que no son de una cocina). En la vista de cada cocina solo se ve lo suyo.
            </p>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel icon={TrendingUp} title="Ventas netas por día" description="Pasa el cursor sobre un día para ver su detalle.">
            <div className="mt-3">
              <DailyChart days={report.daily} />
            </div>
          </Panel>
          <Panel icon={ShoppingBag} title="Lo más vendido" description="Pedidos cobrados en el período (sin planes).">
            {report.topProducts.length ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {report.topProducts.map((t) => (
                  <li key={t.name} className="flex justify-between gap-3">
                    <span className="text-[#1B1B1B]/70">
                      {t.name} <span className="text-xs text-[#1B1B1B]/40">· {t.units} u.</span>
                    </span>
                    <span className="font-semibold tabular-nums text-[#1F4D36]">{money(t.sales)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#1B1B1B]/50">Sin ventas en el período.</p>
            )}
          </Panel>
        </div>
      </div>

      {!kitchen && kitchens.length > 1 && (
        <Panel icon={ChefHat} title="Por cocina" description="Cómo funciona el modelo en cada cocina.">
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
                <tr>
                  <th className="pb-2">Cocina</th>
                  <th className="pb-2 text-right">Ventas netas</th>
                  <th className="pb-2 text-right">Costo comida</th>
                  <th className="pb-2 text-right">Utilidad bruta</th>
                  <th className="pb-2 text-right">Pérdidas</th>
                  <th className="pb-2 text-right">Gastos y nómina</th>
                  <th className="pb-2 text-right">Utilidad real</th>
                </tr>
              </thead>
              <tbody>
                {[...kitchens.map((k) => k.id), "general"]
                  .filter((k) => report.byKitchen[k])
                  .map((k) => {
                    const x = report.byKitchen[k];
                    return (
                      <tr key={k} className="border-t border-[#1F4D36]/[0.06]">
                        <td className="py-2 font-semibold text-[#1F4D36]">{k === "general" ? "General (sin cocina)" : nameOf.get(k)}</td>
                        <td className="py-2 text-right tabular-nums">{money(x.netSales)}</td>
                        <td className="py-2 text-right tabular-nums">{money(x.foodCost)}</td>
                        <td className="py-2 text-right tabular-nums">
                          {money(x.grossProfit)} <span className="text-[11px] text-[#1B1B1B]/40">{pct(x.grossProfit, x.netSales)}</span>
                        </td>
                        <td className="py-2 text-right tabular-nums">{money(x.losses)}</td>
                        <td className="py-2 text-right tabular-nums">{money(x.expenses - x.otherIncome)}</td>
                        <td className={cn("py-2 text-right font-semibold tabular-nums", x.profit < 0 ? "text-red-700" : "text-[#1F4D36]")}>{money(x.profit)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel icon={AlertTriangle} title="Detalle de pérdidas" description="Valorizadas al costo real. Los desfases de conteo positivos (sobrantes) restan.">
          {losses.length ? (
            <ul className="mt-3 max-h-80 space-y-1.5 overflow-y-auto text-sm">
              {losses.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-[#1B1B1B]/70">{l.label}</span>
                  <span className={cn("shrink-0 tabular-nums", l.amount < 0 ? "text-[#2E6B1F]" : "text-red-700")}>{money(l.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#1B1B1B]/50">Sin pérdidas en el período.</p>
          )}
        </Panel>
        <Panel icon={Wallet} title="Nómina del período" description="Pago por día × días con actividad, o mensual prorrateado.">
          {payroll.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {payroll.map((e, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-[#1B1B1B]/70">
                    {e.name}{" "}
                    <span className="text-xs text-[#1B1B1B]/40">
                      · {e.payType === "diario" ? `${e.days} ${e.days === 1 ? "día" : "días"} × ${money(e.amount)}` : `mensual ${money(e.amount)}`}
                      {!kitchen && e.kitchen !== "general" ? ` · ${nameOf.get(e.kitchen) ?? ""}` : ""}
                    </span>
                  </span>
                  <span className="tabular-nums text-[#1B1B1B]">{money(e.cost)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#1B1B1B]/50">Aún no hay pagos registrados. Configúralos en la pestaña Nómina.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
