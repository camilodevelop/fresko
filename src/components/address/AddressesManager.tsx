"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { deleteAddress, setDefaultAddress } from "@/app/actions/addresses";
import { EmptyState, Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import type { CoverageZone } from "@/lib/data/coverage";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { AddressForm } from "./AddressForm";

export type ManagedAddress = {
  id: string;
  label: string;
  address: string;
  details: string;
  lat: number;
  lng: number;
  is_default: boolean;
  zone_id: string | null;
  zoneName: string | null;
};

const ICON: Record<string, typeof Home> = { Casa: Home, Oficina: Building2 };

export function AddressesManager({ addresses, zones }: { addresses: ManagedAddress[]; zones: CoverageZone[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ManagedAddress | "new" | null>(addresses.length === 0 ? "new" : null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const done = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {editing ? (
        <Panel title={editing === "new" ? "Nueva dirección" : `Editar “${editing.label}”`} description="Solo entregamos en direcciones dentro de una zona de cobertura.">
          <AddressForm
            key={editing === "new" ? "new" : editing.id}
            zones={zones}
            initial={
              editing === "new"
                ? { isDefault: addresses.length === 0 }
                : { id: editing.id, label: editing.label, address: editing.address, details: editing.details, lat: editing.lat, lng: editing.lng, isDefault: editing.is_default }
            }
            onSaved={done}
            onCancel={addresses.length > 0 ? () => setEditing(null) : undefined}
          />
        </Panel>
      ) : (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Agregar dirección
          </Button>
        </div>
      )}

      {addresses.length === 0 && !editing && (
        <EmptyState icon={MapPin} title="Aún no tienes direcciones" description="Agrega dónde quieres recibir tus pedidos." />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => {
          const Icon = ICON[a.label] ?? MapPin;
          return (
            <article
              key={a.id}
              className={cn("flex flex-col rounded-3xl bg-white p-6", a.is_default ? "ring-2 ring-[#8BC34A]" : "ring-1 ring-[#1F4D36]/[0.07]")}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
                  <Icon className="h-5 w-5" />
                </span>
                {a.is_default && (
                  <StatusBadge tone="green" dot={false}>
                    <Star className="h-3 w-3" /> Principal
                  </StatusBadge>
                )}
              </div>
              <p className="mt-4 font-display text-lg font-bold text-[#1F4D36]">{a.label}</p>
              <p className="text-sm text-[#1B1B1B]/70">{a.address}</p>
              {a.details && <p className="text-sm text-[#1B1B1B]/45">{a.details}</p>}
              <p className={cn("mt-3 flex items-center gap-2 text-xs", a.zone_id ? "text-[#1B1B1B]/50" : "text-red-600")}>
                <span className={cn("h-2 w-2 rounded-full", a.zone_id ? "bg-[#8BC34A]" : "bg-red-500")} />
                {a.zone_id ? `En cobertura · ${a.zoneName}` : "Ya no tiene cobertura"}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-[#1F4D36]/[0.06] pt-4">
                <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(a)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                {!a.is_default && (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => void (notify(await setDefaultAddress(a.id)) && router.refresh()))}
                  >
                    <Star className="h-3.5 w-3.5" /> Hacer principal
                  </Button>
                )}
                {confirmDelete === a.id ? (
                  <span className="ml-auto flex items-center gap-1 text-xs text-red-700">
                    ¿Eliminar?
                    <Button
                      size="sm"
                      type="button"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          if (notify(await deleteAddress(a.id))) router.refresh();
                          setConfirmDelete(null);
                        })
                      }
                    >
                      Sí
                    </Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmDelete(null)}>
                      No
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" type="button" className="ml-auto text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
