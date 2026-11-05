import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LatLng } from "@/lib/data/coverage";

/** Ciudades para el selector y zonas existentes como referencia en el mapa. */
export async function loadZoneContext(excludeZoneId?: string) {
  const supabase = await createClient();
  const [{ data: cities }, { data: zones }] = await Promise.all([
    supabase.from("cities").select("id, name, countries(name)").order("name"),
    supabase.from("zones").select("id, name, polygon"),
  ]);
  return {
    cities: (cities ?? []).map((c) => ({ id: c.id, label: `${c.name} · ${c.countries.name}` })),
    others: (zones ?? [])
      .filter((z) => z.id !== excludeZoneId)
      .map((z) => ({ id: z.id, name: z.name, polygon: (z.polygon as LatLng[]) ?? [] })),
  };
}
