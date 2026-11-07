"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Percent, Trash2 } from "lucide-react";
import { addTaxRate, deleteTaxRate } from "@/app/admin/cuentas/actions";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

type Rate = { id: string; name: string; rate: number; valid_from: string };
const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const pctLabel = (r: number) => `${(r * 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} %`;

/**
 * Impuesto sobre las ventas, con historial. Los precios lo incluyen: cada cobro guarda el impuesto
 * vigente ese día, así un cambio futuro no altera los meses anteriores.
 */
export function TaxManager({ rates, today }: { rates: Rate[]; today: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [name, setName] = useState("Impuesto al consumo");
  const [rate, setRate] = useState("8");
  const [from, setFrom] = useState(today);
  const current = rates.find((r) => r.valid_from <= today);
  const r = Number(rate.replace(",", "."));
  const control = "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/50";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Panel icon={Percent} title="Impuesto vigente" description="Los precios de venta ya lo incluyen. Los reportes muestran ventas netas sin impuesto." bodyClassName="p-0">
        <div className="px-5 pb-2 pt-3 sm:px-6">
          <p className="font-display text-3xl font-bold text-[#1F4D36]">{current ? pctLabel(current.rate) : "0 %"}</p>
          <p className="text-sm text-[#1B1B1B]/60">{current?.name ?? "Sin impuesto"}</p>
        </div>
        <ul className="mt-3 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
          {rates.map((x) => {
            const future = x.valid_from > today;
            return (
              <li key={x.id} className="flex items-center gap-3 px-5 py-3 text-sm sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1F4D36]">
                    {x.name} · {pctLabel(x.rate)}
                  </p>
                  <p className="text-xs text-[#1B1B1B]/50">Desde el {fmtDate(x.valid_from)}</p>
                </div>
                {future ? <StatusBadge tone="blue">Programado</StatusBadge> : x === current ? <StatusBadge tone="green">Vigente</StatusBadge> : <StatusBadge tone="gray">Anterior</StatusBadge>}
                {future && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-700 hover:bg-red-50"
                    aria-label="Quitar cambio programado"
                    disabled={busy}
                    onClick={() =>
                      start(async () => {
                        notify(await deleteTaxRate(x.id));
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Programar un cambio" description="Rige desde la fecha indicada (hoy o futura). Para quitar el impuesto, programa 0 %.">
        <form
          className="mt-3 space-y-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              notify(await addTaxRate({ name, ratePercent: r, validFrom: from }));
              router.refresh();
            });
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">Nombre</span>
            <input className={control} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Impuesto al consumo, IVA" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">Porcentaje</span>
              <input className={control} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">Desde</span>
              <input type="date" className={control} value={from} min={today} onChange={(e) => setFrom(e.target.value)} />
            </label>
          </div>
          {Number.isFinite(r) && r >= 0 && r < 100 && (
            <p className="rounded-xl bg-[#F4F8F2] px-3 py-2 text-xs text-[#1F4D36]">
              Ejemplo: en una venta de $30.000 se reportan {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.round(30000 - 30000 / (1 + r / 100)))} de impuesto y el resto como venta neta.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy || !name.trim() || !Number.isFinite(r) || r < 0 || r >= 100}>
            {busy ? "Guardando…" : "Programar impuesto"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
