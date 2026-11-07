"use client";

import { useState } from "react";
import { cn, formatPrice } from "@/lib/utils";

type Day = { date: string; netSales: number; foodCost: number; grossProfit: number; orders: number };

const BAR = "#5E9E32"; // un solo color (una sola serie): validado contra la superficie clara
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", timeZone: "UTC" });

/** Ventas netas por día (columnas) con tooltip al pasar el cursor y vista de tabla. */
export function DailyChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...days.map((d) => d.netSales));
  const peak = days.reduce((best, d, i) => (d.netSales > (days[best]?.netSales ?? -1) ? i : best), 0);
  const H = 160;
  const ticks = [0, 0.5, 1].map((f) => Math.round((max * f) / 1000) * 1000);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => setTable((t) => !t)} className="text-xs font-semibold text-[#1F4D36]/70 hover:text-[#1F4D36]">
          {table ? "Ver gráfica" : "Ver tabla"}
        </button>
      </div>
      {table ? (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wider text-[#1B1B1B]/40">
              <tr>
                <th className="py-2">Día</th>
                <th className="py-2 text-right">Pedidos</th>
                <th className="py-2 text-right">Ventas netas</th>
                <th className="py-2 text-right">Costo comida</th>
                <th className="py-2 text-right">Utilidad bruta</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-[#1F4D36]/[0.06]">
                  <td className="py-1.5 text-[#1B1B1B]/70">
                    {weekday(d.date)} {dayLabel(d.date)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPrice(d.netSales)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPrice(Math.round(d.foodCost))}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-[#1F4D36]">{formatPrice(Math.round(d.grossProfit))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex gap-2">
          {/* Eje Y (recesivo) */}
          <div className="relative w-14 shrink-0 text-right text-[10px] tabular-nums text-[#1B1B1B]/40" style={{ height: H }}>
            {ticks.map((t, i) => (
              <span key={i} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
                {t >= 1_000_000 ? `${(t / 1_000_000).toFixed(1)} M` : `${Math.round(t / 1000)} mil`}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: H }} onMouseLeave={() => setHover(null)}>
              {ticks.map((t, i) => (
                <div key={i} className="absolute inset-x-0 border-t border-[#1F4D36]/[0.08]" style={{ bottom: `${(t / max) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end gap-[2px]">
                {days.map((d, i) => (
                  <div
                    key={d.date}
                    className="flex h-full flex-1 cursor-default items-end justify-center"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={0}
                    aria-label={`${dayLabel(d.date)}: ${formatPrice(d.netSales)} en ventas netas`}
                  >
                    <div
                      className={cn("w-full max-w-[24px] rounded-t transition-opacity", hover !== null && hover !== i && "opacity-40")}
                      style={{ height: `${(d.netSales / max) * 100}%`, minHeight: d.netSales > 0 ? 2 : 0, background: BAR }}
                    />
                  </div>
                ))}
              </div>
              {/* Etiqueta solo en el día más alto */}
              {days[peak]?.netSales > 0 && hover === null && (
                <span
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-full pb-1 text-[11px] font-semibold tabular-nums text-[#1F4D36]"
                  style={{ left: `${((peak + 0.5) / days.length) * 100}%`, bottom: `${(days[peak].netSales / max) * 100}%` }}
                >
                  {formatPrice(days[peak].netSales)}
                </span>
              )}
              {hover !== null && days[hover] && (
                <div
                  className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl bg-white p-2.5 text-xs shadow-lg ring-1 ring-[#1F4D36]/10"
                  style={{ left: `${Math.min(88, Math.max(12, ((hover + 0.5) / days.length) * 100))}%` }}
                >
                  <p className="font-semibold text-[#1F4D36]">
                    {weekday(days[hover].date)} {dayLabel(days[hover].date)}
                  </p>
                  <p className="mt-1 flex justify-between text-[#1B1B1B]/70">
                    Ventas netas <span className="font-semibold tabular-nums text-[#1B1B1B]">{formatPrice(days[hover].netSales)}</span>
                  </p>
                  <p className="flex justify-between text-[#1B1B1B]/70">
                    Costo comida <span className="tabular-nums">{formatPrice(Math.round(days[hover].foodCost))}</span>
                  </p>
                  <p className="flex justify-between text-[#1B1B1B]/70">
                    Utilidad bruta <span className="tabular-nums">{formatPrice(Math.round(days[hover].grossProfit))}</span>
                  </p>
                  <p className="flex justify-between text-[#1B1B1B]/70">
                    Pedidos <span className="tabular-nums">{days[hover].orders}</span>
                  </p>
                </div>
              )}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#1B1B1B]/40">
              <span>{dayLabel(days[0].date)}</span>
              {days.length > 2 && <span>{dayLabel(days[Math.floor(days.length / 2)].date)}</span>}
              <span>{dayLabel(days[days.length - 1].date)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
