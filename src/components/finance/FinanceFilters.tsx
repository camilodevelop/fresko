"use client";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return iso(t);
};

/** Rangos rápidos calculados sobre "hoy" en Bogotá. */
function presets(today: string) {
  const first = `${today.slice(0, 8)}01`;
  const prevLast = shift(first, -1);
  return [
    { key: "hoy", label: "Hoy", from: today, to: today },
    { key: "ayer", label: "Ayer", from: shift(today, -1), to: shift(today, -1) },
    { key: "7d", label: "Últimos 7 días", from: shift(today, -6), to: today },
    { key: "30d", label: "Últimos 30 días", from: shift(today, -29), to: today },
    { key: "mes", label: "Este mes", from: first, to: today },
    { key: "mes-ant", label: "Mes pasado", from: `${prevLast.slice(0, 8)}01`, to: prevLast },
  ];
}

/** Período (rangos rápidos o personalizado) y cocina, en la URL. Una sola fila sobre los datos. */
export function FinanceFilters({
  from,
  to,
  today,
  kitchenId,
  kitchens,
  base = "/admin/cuentas",
  exportable = true,
}: {
  from: string;
  to: string;
  today: string;
  kitchenId: string | null;
  kitchens: { id: string; name: string }[];
  base?: string;
  exportable?: boolean;
}) {
  const router = useRouter();
  const options = presets(today);
  const active = options.find((p) => p.from === from && p.to === to)?.key ?? "custom";
  const go = (f: string, t: string, k = kitchenId) => router.push(`${base}?desde=${f}&hasta=${t}${k ? `&cocina=${k}` : ""}`);
  const exportUrl = `/api/cuentas/exportar?desde=${from}&hasta=${to}${kitchenId ? `&cocina=${kitchenId}` : ""}`;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 ring-1 ring-[#1F4D36]/[0.08]">
          {options.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => go(p.from, p.to)}
              aria-pressed={active === p.key}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active === p.key ? "bg-[#1F4D36] text-white" : "text-[#1F4D36]/70 hover:bg-[#F4F8F2]"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <DateRangePicker from={from} to={to} max={today} active={active === "custom"} onChange={(f, t) => go(f, t)} />
        {exportable && (
          <Button size="sm" variant="ghost" className="ml-auto" asChild>
            <a href={exportUrl}>
              <Download className="h-4 w-4" /> Exportar a Excel
            </a>
          </Button>
        )}
      </div>
      {kitchens.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {[{ id: null as string | null, name: "Consolidado" }, ...kitchens].map((k) => (
            <button
              key={k.id ?? "all"}
              type="button"
              onClick={() => go(from, to, k.id)}
              aria-pressed={kitchenId === k.id}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                kitchenId === k.id ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36]/70 ring-1 ring-[#1F4D36]/[0.08]"
              )}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
