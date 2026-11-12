"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Panel, StatusBadge, fieldLabelClass } from "@/components/dashboard/ui";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { PointRow } from "@/lib/points";
import { savePoint } from "@/app/admin/puntos/actions";
import { PointQrSheet } from "@/components/points/PointQrSheet";

/** Puntos de venta de la cocina y sus vendedores. */
export function PointsManager({ kitchenId, points, vendors }: { kitchenId: string; points: PointRow[]; vendors: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<PointRow | "new" | null>(null);
  const [qr, setQr] = useState<PointRow | null>(null);
  return (
    <div className="space-y-5">
      <Panel
        title="Puntos de venta"
        description="Lugares donde se llevan platos preparados cada día (oficinas, edificios…)."
        icon={MapPin}
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="h-3.5 w-3.5" /> Nuevo punto
          </Button>
        }
        bodyClassName="p-0 sm:p-0"
      >
        {points.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[#1B1B1B]/50 sm:px-6">Aún no hay puntos en esta cocina.</p>
        ) : (
          <ul className="divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
            {points.map((p) => (
              <li key={p.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6", !p.active && "opacity-55")}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-[#1F4D36]">
                    {p.name}
                    {!p.active && <StatusBadge>Inactivo</StatusBadge>}
                  </p>
                  <p className="text-sm text-[#1B1B1B]/55">{[p.address, p.schedule].filter(Boolean).join(" · ") || "Sin dirección"}</p>
                  <p className={cn("text-xs", p.vendors.length ? "text-[#1B1B1B]/55" : "font-semibold text-amber-700")}>
                    {p.vendors.length ? `Vendedores: ${p.vendors.map((v) => v.name).join(", ")}` : "Sin vendedor asignado"}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setQr(p)}>
                  <QrCode className="h-3.5 w-3.5" /> QR
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {vendors.length === 0 && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Para asignar vendedores, dale a la persona el rol <strong>Vendedor de punto</strong> y esta cocina en Usuarios.
        </p>
      )}
      {qr && <PointQrSheet point={qr} onClose={() => setQr(null)} />}
      {editing && <PointSheet kitchenId={kitchenId} point={editing === "new" ? null : editing} vendors={vendors} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PointSheet({ kitchenId, point, vendors, onClose }: { kitchenId: string; point: PointRow | null; vendors: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(point?.name ?? "");
  const [address, setAddress] = useState(point?.address ?? "");
  const [schedule, setSchedule] = useState(point?.schedule ?? "");
  const [active, setActive] = useState(point?.active ?? true);
  const [picked, setPicked] = useState<string[]>(point?.vendors.map((v) => v.id) ?? []);
  const all = [...vendors, ...(point?.vendors ?? []).filter((v) => !vendors.some((x) => x.id === v.id))];
  return (
    <Sheet
      title={point ? `Editar ${point.name}` : "Nuevo punto de venta"}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || name.trim().length < 2}
          onClick={() =>
            start(async () => {
              if (notify(await savePoint({ id: point?.id, kitchenId, name, address, schedule, active, vendorIds: picked }))) {
                onClose();
                router.refresh();
              }
            })
          }
        >
          Guardar punto
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="pt-name" className={fieldLabelClass}>
            Nombre
          </label>
          <Input id="pt-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ej. Torre Calle 100" />
        </div>
        <div>
          <label htmlFor="pt-address" className={fieldLabelClass}>
            Dirección o referencia
          </label>
          <Input id="pt-address" className="mt-1.5" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Ej. Cra. 7 # 99-53, lobby" />
        </div>
        <div>
          <label htmlFor="pt-schedule" className={fieldLabelClass}>
            Días y horario
          </label>
          <Input id="pt-schedule" className="mt-1.5" value={schedule} onChange={(e) => setSchedule(e.target.value)} maxLength={120} placeholder="Ej. Lunes a viernes · 11:30 a. m. – 2:30 p. m." />
        </div>
        <div>
          <p className={fieldLabelClass}>Vendedores</p>
          {all.length === 0 ? (
            <p className="mt-1.5 text-sm text-[#1B1B1B]/50">No hay vendedores en esta cocina.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {all.map((v) => {
                const on = picked.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked(on ? picked.filter((x) => x !== v.id) : [...picked, v.id])}
                    className={cn("rounded-full px-4 py-2 text-sm font-semibold", on ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36]")}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-[#F4F8F2] px-4 py-3">
          <span className="text-sm font-semibold text-[#1F4D36]">Activo</span>
          <Switch label="Activo" checked={active} onChange={setActive} />
        </div>
      </div>
    </Sheet>
  );
}
