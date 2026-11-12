import { Banknote, Scale, Store } from "lucide-react";
import { EmptyState, Panel, StatusBadge } from "@/components/dashboard/ui";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import type { CashTotals } from "@/lib/counter";
import { addDays, daysBetween } from "@/lib/finance";
import { loadKitchens } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { todayBogota } from "@/lib/subscriptions";
import { cn, formatPrice } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
const hour = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

/** Cierres de caja del mostrador: ventas por método, efectivo esperado vs. contado y diferencias. */
export default async function CajasPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; cocina?: string }> }) {
  await requirePermission("reports.view");
  const { desde, hasta, cocina } = await searchParams;
  const today = todayBogota();
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  let from = valid(desde) ?? `${today.slice(0, 8)}01`;
  const to = valid(hasta) ?? today;
  if (from > to) from = to;
  if (daysBetween(from, to) > 366) from = addDays(to, -365);
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const kitchen = kitchens.find((k) => k.id === cocina) ?? null;

  const supabase = await createClient();
  let query = supabase
    .from("cash_sessions")
    .select("id, kitchen_id, opened_at, closed_at, opening_amount, counted_cash, expected_cash, difference, totals, note, user_id, closed_by")
    .gte("opened_at", `${from}T00:00:00-05:00`)
    .lt("opened_at", `${addDays(to, 1)}T00:00:00-05:00`)
    .order("opened_at", { ascending: false })
    .limit(300);
  if (kitchen) query = query.eq("kitchen_id", kitchen.id);
  const { data: sessions } = await query;
  const ids = [...new Set((sessions ?? []).flatMap((s) => [s.user_id, s.closed_by]).filter((x): x is string => Boolean(x)))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const who = (id: string | null) => (id ? people?.find((p) => p.id === id)?.full_name || people?.find((p) => p.id === id)?.email || "—" : "—");
  const kname = (id: string) => kitchens.find((k) => k.id === id)?.name ?? "Cocina";

  const closed = (sessions ?? []).filter((s) => s.closed_at);
  const totalSales = closed.reduce((sum, s) => sum + ((s.totals as CashTotals | null) ?? []).reduce((a, t) => a + t.net, 0), 0);
  const shortages = closed.reduce((sum, s) => sum + Math.min(0, s.difference ?? 0), 0);
  const overages = closed.reduce((sum, s) => sum + Math.max(0, s.difference ?? 0), 0);

  return (
    <div className="space-y-5">
      <FinanceFilters from={from} to={to} today={today} kitchenId={kitchen?.id ?? null} kitchens={kitchens} base="/admin/cuentas/cajas" exportable={false} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Store, label: "Cajas cerradas", value: String(closed.length), hint: `${(sessions ?? []).length - closed.length} abiertas` },
          { icon: Banknote, label: "Vendido en caja (neto)", value: formatPrice(totalSales) },
          { icon: Scale, label: "Faltantes", value: formatPrice(Math.abs(shortages)), bad: shortages < 0 },
          { icon: Scale, label: "Sobrantes", value: formatPrice(overages) },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1B1B1B]/55">
              <k.icon className="h-4 w-4 text-[#7CB342]" /> {k.label}
            </p>
            <p className={cn("mt-1.5 font-display text-2xl font-bold tabular-nums", k.bad ? "text-red-700" : "text-[#1F4D36]")}>{k.value}</p>
            {k.hint && <p className="text-[11px] text-[#1B1B1B]/50">{k.hint}</p>}
          </div>
        ))}
      </div>

      {(sessions ?? []).length === 0 ? (
        <EmptyState icon={Store} title="Sin cajas en este período" description="Las cajas se abren y cierran en Operación → Mostrador." />
      ) : (
        <Panel title="Cierres de caja" description="El efectivo esperado es la base más el efectivo neto (ventas menos devoluciones)." bodyClassName="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2] text-left text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Caja</th>
                  <th className="px-3 py-3">Por método</th>
                  <th className="px-3 py-3 text-right">Base</th>
                  <th className="px-3 py-3 text-right">Esperado</th>
                  <th className="px-3 py-3 text-right">Contado</th>
                  <th className="px-5 py-3 text-right sm:px-6">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F4D36]/[0.06]">
                {(sessions ?? []).map((s) => {
                  const totals = (s.totals as CashTotals | null) ?? [];
                  return (
                    <tr key={s.id} className="align-top">
                      <td className="px-5 py-3 sm:px-6">
                        <p className="font-semibold text-[#1F4D36]">{who(s.user_id)}</p>
                        <p className="text-xs text-[#1B1B1B]/50">
                          {kname(s.kitchen_id)} · {fmt.format(new Date(s.opened_at))}
                          {s.closed_at ? ` → ${hour.format(new Date(s.closed_at))}` : ""}
                        </p>
                        {s.closed_by && s.closed_by !== s.user_id && <p className="text-xs text-[#1B1B1B]/50">Cerró {who(s.closed_by)}</p>}
                        {s.note && <p className="mt-1 max-w-xs text-xs italic text-amber-800">“{s.note}”</p>}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {!s.closed_at ? (
                          <StatusBadge tone="green">Abierta</StatusBadge>
                        ) : totals.length === 0 ? (
                          <span className="text-[#1B1B1B]/45">Sin ventas</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {totals.map((t) => (
                              <li key={t.method}>
                                <span className="font-semibold text-[#1F4D36]">{t.method}</span> {formatPrice(t.net)}
                                <span className="text-[#1B1B1B]/45">
                                  {" "}
                                  · {t.count} {t.count === 1 ? "venta" : "ventas"}
                                  {t.refunds ? ` · devoluciones ${formatPrice(t.refunds)}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatPrice(s.opening_amount)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{s.expected_cash === null ? "—" : formatPrice(s.expected_cash)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{s.counted_cash === null ? "—" : formatPrice(s.counted_cash)}</td>
                      <td
                        className={cn(
                          "px-5 py-3 text-right font-semibold tabular-nums sm:px-6",
                          s.difference === null ? "text-[#1B1B1B]/40" : s.difference < 0 ? "text-red-700" : s.difference > 0 ? "text-sky-800" : "text-[#2E6B1F]"
                        )}
                      >
                        {s.difference === null ? "—" : s.difference === 0 ? "Cuadra" : `${s.difference > 0 ? "+" : "−"}${formatPrice(Math.abs(s.difference))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
