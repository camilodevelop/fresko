import Link from "next/link";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/dashboard/ui";
import { PointsManager } from "@/components/points/PointsManager";
import { loadKitchens } from "@/lib/operations";
import { loadKitchenVendors, loadPoints } from "@/lib/points";
import { requirePermission } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

/** Puntos de venta de cada cocina: datos, vendedores y QR. */
export default async function OperacionPuntosPage({ searchParams }: { searchParams: Promise<{ cocina?: string }> }) {
  await requirePermission("points.manage");
  const { cocina } = await searchParams;
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const kitchen = kitchens.find((k) => k.id === cocina) ?? kitchens[0];
  if (!kitchen) return <EmptyState icon={MapPin} title="No hay cocinas activas" />;
  const [points, vendors] = await Promise.all([loadPoints(kitchen.id), loadKitchenVendors(kitchen.id)]);
  return (
    <div>
      {kitchens.length > 1 && (
        <nav className="mb-5 flex flex-wrap gap-2" aria-label="Cocinas">
          {kitchens.map((k) => (
            <Link
              key={k.id}
              href={`/admin/operacion/puntos?cocina=${k.id}`}
              className={cn("rounded-full px-4 py-2 text-sm font-semibold", k.id === kitchen.id ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36] hover:bg-[#E8F3DC]")}
            >
              {k.name}
            </Link>
          ))}
        </nav>
      )}
      <PointsManager key={kitchen.id} kitchenId={kitchen.id} points={points} vendors={vendors} />
    </div>
  );
}
