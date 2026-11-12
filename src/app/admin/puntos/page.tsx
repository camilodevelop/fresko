import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { MapPin } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { DayPicker } from "@/components/operations/DayPicker";
import { KitchenDishes } from "@/components/points/KitchenDishes";
import { PointsDay, type Suggestion } from "@/components/points/PointsDay";
import { loadKitchens } from "@/lib/operations";
import { loadKitchenDishes, loadPointLoad, loadPointProducts, loadPoints, loadShelfSettings, type LoadView } from "@/lib/points";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { todayBogota } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "dia", label: "Cargas del día" },
  { id: "platos", label: "Platos listos en cocina" },
] as const;

export default async function PuntosPage({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string; cocina?: string }> }) {
  await requirePermission("points.manage");
  const { vista = "dia", fecha, cocina } = await searchParams;
  // Los puntos y sus vendedores se configuran en Configuración → Operación.
  if (vista === "puntos") redirect(`/admin/operacion/puntos${cocina ? `?cocina=${cocina}` : ""}`);
  const today = todayBogota();
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : today;
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const kitchen = kitchens.find((k) => k.id === cocina) ?? kitchens[0];
  const tab = TABS.find((t) => t.id === vista)?.id ?? "dia";

  const header = (
    <PageHeader
      eyebrow="Operación"
      title="Puntos de venta"
      description="Planea qué se lleva a cada punto, la cocina lo prepara, se despacha y el vendedor lo vende desde su celular. Al cierre, lo vigente vuelve a la cocina."
      actions={
        <Link
          href="/admin/operacion/puntos"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1F4D36] ring-1 ring-[#1F4D36]/10 hover:bg-[#F4F8F2]"
        >
          <Settings2 className="h-4 w-4" /> Configurar puntos
        </Link>
      }
    />
  );
  if (!kitchen) {
    return (
      <div>
        {header}
        <EmptyState icon={MapPin} title="No hay cocinas activas" />
      </div>
    );
  }

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ vista: tab, fecha: date, cocina: kitchen.id, ...patch });
    return `/admin/puntos?${p.toString()}`;
  };

  let body: React.ReactNode = null;
  if (tab === "platos") {
    const [lots, shelf] = await Promise.all([loadKitchenDishes(kitchen.id), loadShelfSettings()]);
    // eslint-disable-next-line react-hooks/purity -- hora de la consulta en el servidor
    body = <KitchenDishes lots={lots} nearExpiry={shelf.nearExpiry} now={Date.now()} />;
  } else {
    const supabase = await createClient();
    const [points, products, lots] = await Promise.all([loadPoints(kitchen.id), loadPointProducts(), loadKitchenDishes(kitchen.id)]);
    const active = points.filter((p) => p.active);
    const names = new Map(products.map((p) => [p.id, p.name]));
    const loads: Record<string, LoadView | null> = {};
    const suggestions: Record<string, Suggestion[]> = {};
    await Promise.all(
      active.map(async (p) => {
        const [ld, { data: sug }] = await Promise.all([loadPointLoad(p.id, date, names), supabase.rpc("point_suggestions", { p_point_id: p.id, p_date: date })]);
        loads[p.id] = ld;
        suggestions[p.id] = (sug ?? []).map((s) => ({ productId: s.product_id, avgSold: Number(s.avg_sold), loads: s.loads, kitchenStock: s.kitchen_stock }));
      })
    );
    const now = new Date().getTime();
    const kitchenStock: Record<string, number> = {};
    for (const l of lots) if (new Date(l.expiresAt).getTime() > now) kitchenStock[l.productId] = (kitchenStock[l.productId] ?? 0) + l.quantity;
    body = (
      <>
        <DayPicker base="/admin/puntos" date={date} today={today} kitchens={kitchens} kitchenId={kitchen.id} />
        <PointsDay date={date} points={active} loads={loads} products={products} suggestions={suggestions} kitchenStock={kitchenStock} editable={date >= today} />
      </>
    );
  }

  return (
    <div>
      {header}
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-[#1F4D36]/10" aria-label="Secciones">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={link({ vista: t.id })}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold",
              t.id === tab ? "border-[#1F4D36] text-[#1F4D36]" : "border-transparent text-[#1B1B1B]/50 hover:text-[#1F4D36]"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab !== "dia" && kitchens.length > 1 && (
        <nav className="mb-5 flex flex-wrap gap-2" aria-label="Cocinas">
          {kitchens.map((k) => (
            <Link
              key={k.id}
              href={link({ cocina: k.id })}
              className={cn("rounded-full px-4 py-2 text-sm font-semibold", k.id === kitchen.id ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36] hover:bg-[#E8F3DC]")}
            >
              {k.name}
            </Link>
          ))}
        </nav>
      )}
      {body}
    </div>
  );
}
