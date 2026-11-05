import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ZoneDelivery } from "@/lib/delivery";

/** Zonas activas con sus franjas y zona horaria (para elegir fecha y franja). */
export async function loadDeliveryZones(): Promise<ZoneDelivery[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zones")
    .select("id, name, cutoff_time, delivery_days, cities(timezone), delivery_slots(id, start_time, end_time, active)")
    .eq("active", true);
  return (data ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    timezone: z.cities?.timezone ?? "America/Bogota",
    cutoffTime: z.cutoff_time.slice(0, 5),
    deliveryDays: z.delivery_days,
    slots: z.delivery_slots
      .filter((s) => s.active)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((s) => ({
        id: s.id,
        start: s.start_time.slice(0, 5),
        end: s.end_time.slice(0, 5),
        label: `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`,
      })),
  }));
}

export type AddressRow = {
  id: string;
  label: string;
  address: string;
  details: string;
  lat: number;
  lng: number;
  zone_id: string | null;
  is_default: boolean;
  zoneName: string | null;
};

export async function loadMyAddresses(userId: string): Promise<AddressRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("id, label, address, details, lat, lng, zone_id, is_default, zones(name)")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at");
  return (data ?? []).map(({ zones, ...a }) => ({ ...a, zoneName: zones?.name ?? null }));
}

/** Traduce los errores de las funciones de la base (hint) a un mensaje para el usuario. */
export function dbError(error: { message?: string; hint?: string | null } | null, fallback = "No se pudo completar. Intenta de nuevo.") {
  if (!error) return fallback;
  return error.hint || fallback;
}
