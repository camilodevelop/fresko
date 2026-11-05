import { PageHeader } from "@/components/dashboard/ui";
import { OperationsSettings } from "@/components/operations/OperationsSettings";
import { getActiveZones } from "@/lib/data/zones";
import { loadKitchens } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function OperacionPage() {
  await requirePermission("zones.manage");
  const supabase = await createClient();
  const [kitchens, coverage, { data: zones }, { data: role }, { data: assignments }] = await Promise.all([
    loadKitchens(),
    getActiveZones(),
    supabase.from("zones").select("id, name, kitchen_id, delivery_slots(id, start_time, end_time, active)").order("name"),
    supabase.from("roles").select("id").eq("key", "domiciliario").maybeSingle(),
    supabase.from("courier_assignments").select("user_id, zone_id, slot_id").eq("active", true),
  ]);
  const { data: wait } = await supabase.from("settings").select("value").eq("key", "delivery_wait_minutes").maybeSingle();
  const { data: people } = role
    ? await supabase.from("user_roles").select("profiles(id, full_name, email)").eq("role_id", role.id)
    : { data: [] as { profiles: { id: string; full_name: string; email: string } | null }[] };

  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Operación"
        description="Cocinas y domiciliarios. Con esto se arman la producción de cada cocina y las rutas de cada franja."
      />
      <OperationsSettings
        waitMinutes={Number(wait?.value) > 0 ? Number(wait?.value) : 5}
        kitchens={kitchens}
        coverage={coverage}
        zones={(zones ?? []).map((z) => ({
          id: z.id,
          name: z.name,
          kitchenId: z.kitchen_id,
          slots: z.delivery_slots
            .filter((s) => s.active)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map((s) => ({ id: s.id, start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) })),
        }))}
        couriers={(people ?? [])
          .map((p) => p.profiles)
          .filter((p): p is { id: string; full_name: string; email: string } => Boolean(p))
          .map((p) => ({
            id: p.id,
            name: p.full_name,
            email: p.email,
            assignments: (assignments ?? []).filter((a) => a.user_id === p.id).map((a) => ({ zoneId: a.zone_id, slotId: a.slot_id })),
          }))}
      />
    </div>
  );
}
