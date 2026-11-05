import { PageHeader } from "@/components/dashboard/ui";
import { notFound } from "next/navigation";
import { ZoneEditor } from "@/components/admin/ZoneEditor";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { LatLng } from "@/lib/data/coverage";
import { loadZoneContext } from "../loadZoneContext";

export default async function EditarZonaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("zones.manage");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: zone }, { cities, others }] = await Promise.all([
    supabase
      .from("zones")
      .select("id, city_id, name, color, cutoff_time, delivery_days, active, polygon, delivery_slots(id, start_time, end_time, active)")
      .eq("id", id)
      .maybeSingle(),
    loadZoneContext(id),
  ]);
  if (!zone) notFound();

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/zonas", label: "Cobertura" }}
        eyebrow="Zona de cobertura"
        title={zone.name}
        description="Dibuja el área en el mapa y define cuándo se entrega."
      />
      <ZoneEditor
        cities={cities}
        others={others}
        initial={{
          id: zone.id,
          cityId: zone.city_id,
          name: zone.name,
          color: zone.color,
          cutoffTime: zone.cutoff_time.slice(0, 5),
          deliveryDays: zone.delivery_days,
          active: zone.active,
          polygon: (zone.polygon as LatLng[]) ?? [],
          slots: zone.delivery_slots
            .filter((s) => s.active)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map((s) => ({ id: s.id, start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) })),
        }}
      />
    </div>
  );
}
