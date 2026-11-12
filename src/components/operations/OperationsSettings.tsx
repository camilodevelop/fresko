"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, ChefHat, Clock, MapPin, Pencil, Plus, X } from "lucide-react";
import { saveKitchen, setBasketMax, setCourierAssignment, setDeliveryWait, setZoneKitchen, type KitchenInput } from "@/app/actions/operations";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { CoverageZone } from "@/lib/data/coverage";
import { formatTime12 } from "@/lib/delivery";
import { notify } from "@/lib/notify";
import type { KitchenRow } from "@/lib/operations";
import { cn } from "@/lib/utils";

const CoverageMap = dynamic(() => import("@/components/coverage/CoverageMap").then((m) => m.CoverageMap), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-2xl bg-[#F4F8F2]" />,
});

export type OpsZone = { id: string; name: string; kitchenId: string | null; slots: { id: string; start: string; end: string }[] };
export type OpsCourier = { id: string; name: string; email: string; assignments: { zoneId: string; slotId: string | null }[] };

/** Cocinas (ubicación y zonas que atienden) y domiciliarios por zona y franja. */
export function OperationsSettings({
  kitchens,
  zones,
  coverage,
  couriers,
  waitMinutes,
  basketMax,
  section,
}: {
  /** Qué parte mostrar: cocinas (ubicación y zonas que atienden) o domicilios (reparto y domiciliarios). */
  section: "cocinas" | "domicilios";
  kitchens: KitchenRow[];
  zones: OpsZone[];
  coverage: CoverageZone[];
  couriers: OpsCourier[];
  waitMinutes: number;
  basketMax: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<KitchenInput | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      if (notify(await fn())) after?.();
      router.refresh();
    });

  const assigned = (c: OpsCourier, zoneId: string, slotId: string | null) => c.assignments.some((a) => a.zoneId === zoneId && a.slotId === slotId);

  return (
    <div className="space-y-6">
      {section === "domicilios" && <DeliveryRules wait={waitMinutes} max={basketMax} />}
      {section === "cocinas" && (
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel
          title="Cocinas"
          icon={ChefHat}
          description="Desde dónde salen los pedidos. Cada zona de cobertura se atiende desde una cocina."
          actions={
            <Button size="sm" onClick={() => setForm({ name: "", address: "", lat: kitchens[0]?.lat ?? 4.6237, lng: kitchens[0]?.lng ?? -74.1588, active: true })}>
              <Plus className="h-4 w-4" /> Nueva cocina
            </Button>
          }
        >
          <ul className="space-y-3">
            {kitchens.map((k) => {
              const served = zones.filter((z) => z.kitchenId === k.id);
              return (
                <li key={k.id} className={cn("rounded-2xl border p-4", form?.id === k.id ? "border-[#8BC34A] bg-[#F4F8F2]" : "border-[#1F4D36]/[0.08]", !k.active && "opacity-55")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-[#1F4D36]">
                        {k.name} {!k.active && <StatusBadge tone="gray" dot={false}>Inactiva</StatusBadge>}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-[#1B1B1B]/50">
                        <MapPin className="h-3 w-3" /> {k.address || `${k.lat.toFixed(4)}, ${k.lng.toFixed(4)}`}
                      </p>
                      <p className="mt-1 text-xs text-[#1B1B1B]/55">{served.length ? `Atiende: ${served.map((z) => z.name).join(", ")}` : "Sin zonas asignadas"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ id: k.id, name: k.name, address: k.address, lat: k.lat, lng: k.lng, active: k.active })}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1F4D36]/70 hover:bg-white hover:text-[#1F4D36]"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Zona → cocina</p>
            <ul className="divide-y divide-[#1F4D36]/[0.06] rounded-2xl border border-[#1F4D36]/[0.08]">
              {zones.map((z) => (
                <li key={z.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-[#1F4D36]">{z.name}</span>
                  <select
                    aria-label={`Cocina de ${z.name}`}
                    value={z.kitchenId ?? ""}
                    disabled={pending}
                    onChange={(e) => run(() => setZoneKitchen(z.id, e.target.value || null))}
                    className="h-9 rounded-xl border border-[#1F4D36]/15 bg-white px-2 text-sm"
                  >
                    <option value="">Sin cocina</option>
                    {kitchens.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {form && (
          <Panel
            title={form.id ? "Editar cocina" : "Nueva cocina"}
            actions={
              <button type="button" aria-label="Cerrar" onClick={() => setForm(null)} className="rounded-lg p-1 text-[#1B1B1B]/40 hover:bg-[#F4F8F2]">
                <X className="h-4 w-4" />
              </button>
            }
          >
            <div className="space-y-4">
              <Field label="Nombre" name="kitchen-name">
                <Input id="kitchen-name" className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cocina Kennedy" />
              </Field>
              <Field label="Dirección" name="kitchen-address" optional>
                <Input id="kitchen-address" className="h-11" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle 38 Sur # 78-20" />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Ubicación (toca el mapa)</p>
                <div className="h-[280px] overflow-hidden rounded-2xl ring-1 ring-[#1F4D36]/10">
                  <CoverageMap zones={coverage} marker={{ lat: form.lat, lng: form.lng }} covered={true} onMapClick={(p) => setForm({ ...form, lat: p.lat, lng: p.lng })} />
                </div>
                <p className="mt-1 text-[11px] text-[#1B1B1B]/45">
                  {form.lat.toFixed(5)}, {form.lng.toFixed(5)} · las rutas salen y vuelven a este punto.
                </p>
              </div>
              <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                <Switch size="sm" label="Activa" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
                Activa
              </label>
              <Button className="w-full" disabled={pending} onClick={() => run(() => saveKitchen(form), () => setForm(null))}>
                {pending ? "Guardando…" : "Guardar cocina"}
              </Button>
            </div>
          </Panel>
        )}
      </div>
      )}

      {section === "domicilios" && (
      <Panel
        title="Domiciliarios"
        icon={Bike}
        description="Asigna cada domiciliario a las zonas y franjas donde reparte. Si hay varios en una misma franja, el sistema reparte los pedidos entre ellos por cercanía."
      >
        {couriers.length === 0 ? (
          <p className="text-sm text-[#1B1B1B]/50">No hay personas con el rol Domiciliario. Asígnalo en Configuración → Usuarios.</p>
        ) : (
          <div className="space-y-4">
            {couriers.map((c) => (
              <div key={c.id} className="rounded-2xl border border-[#1F4D36]/[0.08] p-4">
                <p className="font-semibold text-[#1F4D36]">
                  {c.name || c.email} <span className="text-xs font-normal text-[#1B1B1B]/45">{c.email}</span>
                </p>
                <div className="mt-3 space-y-3">
                  {zones.map((z) => {
                    const all = assigned(c, z.id, null);
                    return (
                      <div key={z.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="w-28 shrink-0 font-medium text-[#1B1B1B]/70">{z.name}</span>
                        <ToggleChip on={all} disabled={pending} onClick={() => run(() => setCourierAssignment(c.id, z.id, null, !all))}>
                          Todas las franjas
                        </ToggleChip>
                        {!all &&
                          z.slots.map((s) => {
                            const on = assigned(c, z.id, s.id);
                            return (
                              <ToggleChip key={s.id} on={on} disabled={pending} onClick={() => run(() => setCourierAssignment(c.id, z.id, s.id, !on))}>
                                {formatTime12(s.start)} – {formatTime12(s.end)}
                              </ToggleChip>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      )}
    </div>
  );
}

function ToggleChip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
        on ? "border-[#1F4D36] bg-[#1F4D36] text-white" : "border-[#1F4D36]/15 text-[#1F4D36]/70 hover:border-[#8BC34A]"
      )}
    >
      {children}
    </button>
  );
}

/** Ajustes de reparto: minutos de espera por entrega y pedidos máximos por canasta. */
function DeliveryRules({ wait, max }: { wait: number; max: number }) {
  return (
    <Panel title="Reparto" icon={Clock} description="Con estos valores se arman las canastas de cada franja y se controla la espera en cada entrega.">
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <NumberSetting
          label="Minutos de espera en la entrega"
          hint="Al llegar, el domiciliario avisa y espera este tiempo antes de poder reportar que el cliente no salió. También es el tiempo por parada al calcular canastas. Entre 1 y 30."
          initial={wait}
          min={1}
          max={30}
          save={setDeliveryWait}
        />
        <NumberSetting
          label="Pedidos máximos por canasta"
          hint="Cada canasta se llena con su ruta óptima hasta este número (o hasta donde alcance la franja) y se abre otra. Los pedidos nuevos no entran a canastas llenas. Entre 1 y 50."
          initial={max}
          min={1}
          max={50}
          save={setBasketMax}
        />
      </div>
    </Panel>
  );
}

function NumberSetting({
  label,
  hint,
  initial,
  min,
  max,
  save,
}: {
  label: string;
  hint: string;
  initial: number;
  min: number;
  max: number;
  save: (n: number) => Promise<{ ok?: string; error?: string }>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(initial));
  const [pending, start] = useTransition();
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= min && n <= max;
  return (
    <form
      className="flex items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        start(async () => {
          notify(await save(n));
          router.refresh();
        });
      }}
    >
      <Field label={label} hint={hint} error={valid ? undefined : `Escribe un número entre ${min} y ${max}.`} className="flex-1">
        <Input type="number" min={min} max={max} step={1} value={value} onChange={(e) => setValue(e.target.value)} className="w-32" />
      </Field>
      <Button type="submit" disabled={pending || !valid || n === initial}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
