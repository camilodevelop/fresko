import Link from "next/link";
import { Store } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { PointSeller } from "@/components/points/PointSeller";
import { loadPaymentMethods } from "@/lib/counter";
import { loadActiveLoad, loadMyPoints, loadPointCash, loadPointLoad, loadPointProducts, loadPointSales, loadPointStock, loadShelfSettings } from "@/lib/points";
import { requirePermission } from "@/lib/supabase/auth";
import { todayBogota } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

/** Pantalla del vendedor (celular): recibir la carga, vender, transporte y cierre. */
export default async function MiPuntoPage({ searchParams }: { searchParams: Promise<{ punto?: string }> }) {
  const session = await requirePermission("points.sell");
  const { punto } = await searchParams;
  const today = todayBogota();
  const points = await loadMyPoints(session.userId, session.permissions.has("points.manage"));
  const point = points.find((p) => p.id === punto) ?? points[0];

  if (!point) {
    return (
      <div>
        <PageHeader eyebrow="Operación" title="Mi punto" />
        <EmptyState icon={Store} title="No tienes un punto asignado" description="Pide al administrador de tu cocina que te asigne a un punto de venta." />
      </div>
    );
  }

  const [products, shelf, methods, active] = await Promise.all([loadPointProducts(), loadShelfSettings(), loadPaymentMethods(), loadActiveLoad(point.id, today)]);
  const names = new Map(products.map((p) => [p.id, p.name]));
  const loadDate = active?.load_date ?? today;
  const [load, stock, cash, sales] = await Promise.all([
    loadPointLoad(point.id, loadDate, names),
    loadPointStock(point.id, products, shelf.nearExpiry),
    loadPointCash(point.id, session.userId),
    loadPointSales(point.id, today),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      {points.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-2" aria-label="Puntos">
          {points.map((p) => (
            <Link
              key={p.id}
              href={`/admin/punto?punto=${p.id}`}
              className={cn("rounded-full px-4 py-2 text-sm font-semibold", p.id === point.id ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36] hover:bg-[#E8F3DC]")}
            >
              {p.name}
            </Link>
          ))}
        </nav>
      )}
      <PointSeller
        key={point.id}
        point={point}
        load={load}
        stock={stock}
        session={cash}
        sales={sales}
        methods={methods}
        nearExpiry={shelf.nearExpiry}
        // eslint-disable-next-line react-hooks/purity -- hora de la consulta en el servidor
        now={Date.now()}
      />
    </div>
  );
}
