"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveZone, type ZoneInput } from "@/app/admin/zonas/actions";
import type { ReferenceZone } from "./ZoneMapEditor";
import { cn } from "@/lib/utils";

const ZoneMapEditor = dynamic(() => import("./ZoneMapEditor").then((m) => m.ZoneMapEditor), {
  ssr: false,
  loading: () => <div className="h-[460px] animate-pulse rounded-2xl bg-[#F4F8F2]" />,
});

const DAYS = [
  [1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [7, "Dom"],
] as const;

const label = "block text-xs font-semibold text-[#1B1B1B]/60";

export function ZoneEditor({
  initial,
  cities,
  others,
}: {
  initial: ZoneInput;
  cities: { id: string; label: string }[];
  others: ReferenceZone[];
}) {
  const [zone, setZone] = useState<ZoneInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (patch: Partial<ZoneInput>) => setZone((z) => ({ ...z, ...patch }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveZone(zone);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white shadow-[0_1px_2px_rgba(31,77,54,0.04)] p-4">
        <ZoneMapEditor
          points={zone.polygon}
          color={zone.color}
          others={others}
          onChange={(polygon) => update({ polygon })}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={zone.polygon.length === 0}
            onClick={() => update({ polygon: zone.polygon.slice(0, -1) })}
          >
            <Undo2 className="h-3.5 w-3.5" /> Deshacer punto
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={zone.polygon.length === 0}
            onClick={() => update({ polygon: [] })}
          >
            <Trash2 className="h-3.5 w-3.5" /> Borrar polígono
          </Button>
          <p className="text-xs text-[#1B1B1B]/50">
            Clic en el mapa para agregar puntos · arrastra para mover · doble clic en un punto para quitarlo ·
            {" "}{zone.polygon.length} puntos
          </p>
        </div>
      </div>

      <div className="h-fit space-y-5 rounded-3xl border border-[#1F4D36]/[0.07] bg-white shadow-[0_1px_2px_rgba(31,77,54,0.04)] p-6 xl:sticky xl:top-6">
        <label className={label}>
          Nombre
          <Input className="mt-1.5" value={zone.name} onChange={(e) => update({ name: e.target.value })} />
        </label>
        <label className={label}>
          Ciudad
          <select
            className="mt-1.5 h-12 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 text-sm text-[#1B1B1B]"
            value={zone.cityId}
            onChange={(e) => update({ cityId: e.target.value })}
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Hora de corte
            <Input
              type="time"
              className="mt-1.5"
              value={zone.cutoffTime}
              onChange={(e) => update({ cutoffTime: e.target.value })}
            />
          </label>
          <label className={label}>
            Color
            <input
              type="color"
              className="mt-1.5 h-12 w-full cursor-pointer rounded-2xl border border-[#1F4D36]/15 bg-white px-2"
              value={zone.color}
              onChange={(e) => update({ color: e.target.value })}
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-[#1B1B1B]/45">
          Hasta esa hora (hora local) se puede pedir o cambiar la entrega del mismo día.
        </p>

        <div>
          <p className={label}>Días de entrega</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {DAYS.map(([day, name]) => {
              const on = zone.deliveryDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    update({
                      deliveryDays: on
                        ? zone.deliveryDays.filter((d) => d !== day)
                        : [...zone.deliveryDays, day],
                    })
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    on ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36]"
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={label}>Franjas de entrega</p>
          <div className="mt-1.5 space-y-2">
            {zone.slots.map((slot, index) => (
              <div key={slot.id ?? `new-${index}`} className="flex items-center gap-2">
                <Input
                  type="time"
                  value={slot.start}
                  onChange={(e) =>
                    update({ slots: zone.slots.map((s, i) => (i === index ? { ...s, start: e.target.value } : s)) })
                  }
                />
                <span className="text-[#1B1B1B]/40">–</span>
                <Input
                  type="time"
                  value={slot.end}
                  onChange={(e) =>
                    update({ slots: zone.slots.map((s, i) => (i === index ? { ...s, end: e.target.value } : s)) })
                  }
                />
                <button
                  type="button"
                  aria-label="Quitar franja"
                  className="text-[#1F4D36]/40 hover:text-red-600"
                  onClick={() => update({ slots: zone.slots.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => update({ slots: [...zone.slots, { start: "15:00", end: "17:00" }] })}
            >
              <Plus className="h-3.5 w-3.5" /> Agregar franja
            </Button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-[#1F4D36]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#1F4D36]"
            checked={zone.active}
            onChange={(e) => update({ active: e.target.checked })}
          />
          Zona activa (visible para clientes)
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button className="w-full" type="button" disabled={pending} onClick={submit}>
          {pending ? "Guardando…" : "Guardar zona"}
        </Button>
      </div>
    </div>
  );
}
