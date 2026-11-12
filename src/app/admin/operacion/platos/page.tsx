import { ShelfLifeManager } from "@/components/catalog/ShelfLifeManager";
import { loadShelfSettings } from "@/lib/points";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/** Vida útil de los platos preparados y cuáles se llevan a los puntos de venta. */
export default async function PlatosPreparadosPage() {
  await requirePermission("catalog.manage");
  const supabase = await createClient();
  const [shelf, { data: products }] = await Promise.all([
    loadShelfSettings(),
    supabase.from("products").select("id, name, kind, active, sort, sold_at_points, shelf_life_hours, product_categories(name, sort)").order("sort"),
  ]);
  const rows = (products ?? [])
    .sort((a, b) => (a.product_categories?.sort ?? 0) - (b.product_categories?.sort ?? 0) || a.sort - b.sort)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.product_categories?.name ?? "",
      builder: p.kind === "builder",
      active: p.active,
      soldAtPoints: p.sold_at_points,
      shelfLife: p.shelf_life_hours,
    }));
  return <ShelfLifeManager shelfLife={shelf.shelfLife} nearExpiry={shelf.nearExpiry} rows={rows} />;
}
