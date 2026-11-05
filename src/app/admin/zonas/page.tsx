import Link from "next/link";
import { Building2, Clock, Globe2, MapPinned, Plus } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ActiveToggle, CityForm, CountryForm } from "./LocationForms";

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default async function ZonasPage() {
  await requirePermission("zones.manage");
  const supabase = await createClient();
  const { data: countries } = await supabase
    .from("countries")
    .select(
      "id, code, name, currency, active, cities(id, name, timezone, active, zones(id, name, color, active, cutoff_time, delivery_days, polygon, delivery_slots(start_time, end_time, active)))"
    )
    .order("name");

  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Cobertura"
        description="País → ciudad → zona. Cada zona tiene su polígono en el mapa, su hora de corte, sus días y sus franjas."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {(countries ?? []).map((country) => (
            <Panel
              key={country.id}
              icon={Globe2}
              title={
                <span className="flex items-center gap-2">
                  {country.name}
                  <StatusBadge tone="gray" dot={false}>{country.code} · {country.currency}</StatusBadge>
                </span>
              }
              description={`${country.cities.length} ${country.cities.length === 1 ? "ciudad" : "ciudades"}`}
              actions={<ActiveToggle table="countries" id={country.id} active={country.active} />}
            >
              <div className="space-y-5">
                {country.cities.map((city) => (
                  <div key={city.id} className="rounded-2xl bg-[#F8F7F2] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-[#1F4D36]/50" />
                        <p className="font-display font-bold text-[#1F4D36]">{city.name}</p>
                        <span className="text-xs text-[#1B1B1B]/40">{city.timezone}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <ActiveToggle table="cities" id={city.id} active={city.active} />
                        <Button size="sm" asChild>
                          <Link href={`/admin/zonas/nueva?ciudad=${city.id}`}>
                            <Plus className="h-3.5 w-3.5" /> Nueva zona
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {city.zones.length > 0 ? (
                      <ul className="mt-4 grid gap-3 md:grid-cols-2">
                        {city.zones.map((zone) => {
                          const slots = zone.delivery_slots
                            .filter((s) => s.active)
                            .sort((a, b) => a.start_time.localeCompare(b.start_time));
                          const points = Array.isArray(zone.polygon) ? zone.polygon.length : 0;
                          return (
                            <li key={zone.id}>
                              <Link
                                href={`/admin/zonas/${zone.id}`}
                                className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-[#1F4D36]/[0.07] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F4D36]/5"
                              >
                                <div className="h-1.5" style={{ background: zone.color }} />
                                <div className="p-4">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-display text-lg font-bold text-[#1F4D36]">{zone.name}</p>
                                    {zone.active ? (
                                      <StatusBadge tone="green">Activa</StatusBadge>
                                    ) : (
                                      <StatusBadge tone="gray">Inactiva</StatusBadge>
                                    )}
                                  </div>
                                  <div className="mt-3 flex gap-1">
                                    {DAYS.map((d, i) => (
                                      <span
                                        key={d}
                                        className={cn(
                                          "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold",
                                          zone.delivery_days.includes(i + 1)
                                            ? "bg-[#1F4D36] text-white"
                                            : "bg-[#F4F8F2] text-[#1B1B1B]/30"
                                        )}
                                      >
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {slots.map((s) => (
                                      <span key={s.start_time} className="rounded-full bg-[#E8F3DC] px-2.5 py-1 text-[11px] font-semibold text-[#1F4D36]">
                                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                                      </span>
                                    ))}
                                    {slots.length === 0 && <span className="text-xs text-red-700">Sin franjas</span>}
                                  </div>
                                  <div className="mt-4 flex items-center gap-4 border-t border-[#1F4D36]/[0.06] pt-3 text-xs text-[#1B1B1B]/50">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5" /> Corte {zone.cutoff_time.slice(0, 5)}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <MapPinned className="h-3.5 w-3.5" /> {points} puntos
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-4 rounded-2xl border border-dashed border-[#1F4D36]/15 px-4 py-6 text-center text-sm text-[#1B1B1B]/45">
                        Esta ciudad aún no tiene zonas.
                      </p>
                    )}
                  </div>
                ))}
                {country.cities.length === 0 && (
                  <EmptyState icon={Building2} title="Sin ciudades" description="Agrega la primera ciudad desde el panel lateral." />
                )}
              </div>
            </Panel>
          ))}
        </div>

        <div className="space-y-6">
          <Panel title="Agregar ciudad" icon={Building2}>
            <CityForm countries={(countries ?? []).map((c) => ({ id: c.id, name: c.name }))} />
          </Panel>
          <Panel title="Agregar país" icon={Globe2}>
            <CountryForm />
          </Panel>
        </div>
      </div>
    </div>
  );
}
