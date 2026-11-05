import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CoverageZone, LatLng } from "./coverage";

/** Zonas activas (lectura pública, sin cookies: no vuelve dinámica la página). */
export async function getActiveZones(): Promise<CoverageZone[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  const supabase = createSupabase<Database>(url, key, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from("zones")
    .select("id, name, color, polygon, cities!inner(name, active, countries!inner(active))")
    .eq("active", true)
    .eq("cities.active", true)
    .eq("cities.countries.active", true)
    .order("name");

  if (error || !data) return [];
  return data.map((z) => ({
    id: z.id,
    name: z.name,
    color: z.color,
    cityName: z.cities.name,
    polygon: (z.polygon as LatLng[]) ?? [],
  }));
}
