"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Panel, fieldLabelClass } from "@/components/dashboard/ui";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { saveShelfSettings, setProductPointSettings } from "@/app/admin/ajustes-venta/actions";

type Row = { id: string; name: string; category: string; builder: boolean; active: boolean; soldAtPoints: boolean; shelfLife: number | null };

const hours = (v: string) => Number(v.replace(/\D/g, "") || 0);

/** Vida útil de los platos preparados y cuáles se llevan a los puntos de venta. */
export function ShelfLifeManager({ shelfLife, nearExpiry, rows }: { shelfLife: number; nearExpiry: number; rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [life, setLife] = useState(String(shelfLife));
  const [near, setNear] = useState(String(nearExpiry));
  return (
    <div className="space-y-5">
      <Panel title="Vida útil" description="Cuánto dura un plato preparado (el aderezo va aparte). Con esto se calcula el vencimiento de cada lote." icon={Clock}>
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              notify(await saveShelfSettings(hours(life), hours(near)));
              router.refresh();
            });
          }}
        >
          <div>
            <label htmlFor="life" className={fieldLabelClass}>
              Vida útil por defecto (horas)
            </label>
            <Input id="life" inputMode="numeric" className="mt-1.5" value={life} onChange={(e) => setLife(e.target.value.replace(/\D/g, ""))} />
            <p className="mt-1 text-xs text-[#1B1B1B]/45">Se usa si el plato no tiene una propia.</p>
          </div>
          <div>
            <label htmlFor="near" className={fieldLabelClass}>
              Próximo a vencer (horas)
            </label>
            <Input id="near" inputMode="numeric" className="mt-1.5" value={near} onChange={(e) => setNear(e.target.value.replace(/\D/g, ""))} />
            <p className="mt-1 text-xs text-[#1B1B1B]/45">Al cerrar un punto, lo que tenga menos horas ya no vuelve a cocina.</p>
          </div>
          <Button type="submit" disabled={pending}>
            Guardar
          </Button>
        </form>
      </Panel>

      <Panel title="Platos en puntos de venta" description="Activa los que se pueden llevar a los puntos y, si alguno dura distinto, escribe su vida útil." icon={Store} bodyClassName="p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2] text-left text-xs text-[#1B1B1B]/50">
              <tr>
                <th className="px-5 py-2.5 font-semibold sm:px-6">Plato</th>
                <th className="px-3 py-2.5 font-semibold">Se lleva a puntos</th>
                <th className="px-5 py-2.5 font-semibold sm:px-6">Vida útil propia (h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F4D36]/[0.06]">
              {rows.map((r) => (
                <ProductRow key={r.id} row={r} fallback={shelfLife} />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ProductRow({ row, fallback }: { row: Row; fallback: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [life, setLife] = useState(row.shelfLife ? String(row.shelfLife) : "");
  const save = (sold: boolean, value: string) =>
    start(async () => {
      notify(await setProductPointSettings(row.id, sold, value ? hours(value) : null));
      router.refresh();
    });
  return (
    <tr className={cn(!row.active && "opacity-50")}>
      <td className="px-5 py-2.5 sm:px-6">
        <p className="font-semibold text-[#1F4D36]">{row.name}</p>
        <p className="text-xs text-[#1B1B1B]/45">
          {row.category}
          {row.builder && " · se arma al momento"}
          {!row.active && " · inactivo"}
        </p>
      </td>
      <td className="px-3 py-2.5">
        <Switch size="sm" label={`Llevar ${row.name} a puntos`} checked={row.soldAtPoints && !row.builder} disabled={pending || row.builder} onChange={(v) => save(v, life)} />
      </td>
      <td className="px-5 py-2.5 sm:px-6">
        <Input
          aria-label={`Vida útil de ${row.name}`}
          inputMode="numeric"
          disabled={pending || row.builder}
          className="h-9 w-24"
          placeholder={String(fallback)}
          value={life}
          onChange={(e) => setLife(e.target.value.replace(/\D/g, ""))}
          onBlur={() => (life ? Number(life) : null) !== row.shelfLife && save(row.soldAtPoints, life)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </td>
    </tr>
  );
}
