"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { rules } from "@/lib/validation";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const update = (patch: Partial<ZoneInput>) => setZone((z) => ({ ...z, ...patch }));

  const v = useFormValidation(
    () => {
      const errors: Record<string, string | null> = {
        name: rules.required(zone.name, "Escribe el nombre de la zona."),
        cityId: rules.required(zone.cityId, "Elige la ciudad."),
        cutoffTime: rules.pattern(zone.cutoffTime, /^\d{2}:\d{2}$/, "Elige la hora de corte."),
        polygon: zone.polygon.length < 3 ? "Dibuja la zona con al menos 3 puntos en el mapa." : null,
        days: zone.deliveryDays.length === 0 ? "Elige al menos un día de entrega." : null,
        slots: zone.slots.length === 0 ? "Agrega al menos una franja de entrega." : null,
      };
      const starts = new Map<string, number>();
      zone.slots.forEach((slot, i) => {
        if (!slot.start || !slot.end) errors[`slot-${i}`] = "Completa la hora de inicio y de fin.";
        else if (slot.end <= slot.start) errors[`slot-${i}`] = "La franja debe terminar después de empezar.";
        else if (starts.has(slot.start)) errors[`slot-${i}`] = `Ya hay una franja que empieza a las ${slot.start}.`;
        starts.set(slot.start, i);
      });
      return errors;
    },
    () => zone,
    "zone"
  );

  const submit = () => {
    startTransition(async () => {
      if (notify(await saveZone(zone))) router.push("/admin/zonas");
    });
  };

  const cardClass = "rounded-3xl border border-[#1F4D36]/[0.07] bg-white shadow-[0_1px_2px_rgba(31,77,54,0.04)]";

  return (
    <form {...v.formProps(submit)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className={cn(cardClass, "p-4", v.error("polygon") && "border-red-300 ring-2 ring-red-200")}>
        <div tabIndex={-1} aria-invalid={v.error("polygon") ? true : undefined} aria-describedby={v.error("polygon") ? v.idFor("polygon") + "-error" : undefined} className="outline-none">
          <ZoneMapEditor
            points={zone.polygon}
            color={zone.color}
            others={others}
            onChange={(polygon) => {
              update({ polygon });
              if (v.error("polygon")) requestAnimationFrame(v.revalidate);
            }}
          />
        </div>
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
        <FieldError name={v.idFor("polygon")} error={v.error("polygon")} />
      </div>

      <div className={cn(cardClass, "h-fit space-y-5 p-6 xl:sticky xl:top-24")}>
        <Field label="Nombre" name={v.idFor("name")} error={v.error("name")}>
          <Input {...v.field("name")} value={zone.name} onChange={(e) => update({ name: e.target.value })} placeholder="Kennedy" />
        </Field>
        <Field label="Ciudad" name={v.idFor("cityId")} error={v.error("cityId")}>
          <select
            {...v.field("cityId")}
            className="h-12 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 text-sm text-[#1B1B1B]"
            value={zone.cityId}
            onChange={(e) => update({ cityId: e.target.value })}
          >
            {!zone.cityId && <option value="">Elige…</option>}
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Hora de corte"
            name={v.idFor("cutoffTime")}
            error={v.error("cutoffTime")}
            className="col-span-1"
          >
            <Input {...v.field("cutoffTime")} type="time" value={zone.cutoffTime} onChange={(e) => update({ cutoffTime: e.target.value })} />
          </Field>
          <Field label="Color" name={v.idFor("color")}>
            <input
              id={v.idFor("color")}
              type="color"
              className="h-12 w-full cursor-pointer rounded-2xl border border-[#1F4D36]/15 bg-white px-2"
              value={zone.color}
              onChange={(e) => update({ color: e.target.value })}
            />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-[#1B1B1B]/45">
          Hasta esa hora (hora local) se puede pedir o cambiar la entrega del mismo día.
        </p>

        <div>
          <p className={label}>Días de entrega</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Días de entrega">
            {DAYS.map(([day, name], i) => {
              const on = zone.deliveryDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  aria-invalid={i === 0 && v.error("days") ? true : undefined}
                  aria-describedby={v.error("days") ? v.idFor("days") + "-error" : undefined}
                  onClick={() => {
                    update({
                      deliveryDays: on ? zone.deliveryDays.filter((d) => d !== day) : [...zone.deliveryDays, day],
                    });
                    if (v.error("days")) requestAnimationFrame(v.revalidate);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#8BC34A]",
                    on ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36]",
                    v.error("days") && !on && "ring-1 ring-red-300"
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <FieldError name={v.idFor("days")} error={v.error("days")} />
        </div>

        <div>
          <p className={label}>Franjas de entrega</p>
          <div className="mt-1.5 space-y-2">
            {zone.slots.map((slot, index) => (
              <div key={slot.id ?? `new-${index}`}>
                <div className="flex items-center gap-2">
                  <Input
                    {...v.field(`slot-${index}`)}
                    aria-label={`Inicio franja ${index + 1}`}
                    type="time"
                    value={slot.start}
                    onChange={(e) =>
                      update({ slots: zone.slots.map((s, i) => (i === index ? { ...s, start: e.target.value } : s)) })
                    }
                  />
                  <span className="text-[#1B1B1B]/40">–</span>
                  <Input
                    name={`slot-${index}`}
                    aria-label={`Fin franja ${index + 1}`}
                    aria-invalid={v.error(`slot-${index}`) ? true : undefined}
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
                <FieldError name={v.idFor(`slot-${index}`)} error={v.error(`slot-${index}`)} />
              </div>
            ))}
            <FieldError name={v.idFor("slots")} error={v.error("slots")} />
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

        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar zona"}
        </Button>
      </div>
    </form>
  );
}
