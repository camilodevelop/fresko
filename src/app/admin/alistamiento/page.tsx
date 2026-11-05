import { Truck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { DayPicker } from "@/components/operations/DayPicker";
import { PackingBoard } from "@/components/operations/PackingBoard";
import { countUnrouted, loadIncidents, loadKitchenSlots, loadKitchens, loadLateOrders, loadRoutes, loadSlotCouriers } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { todayBogota } from "@/lib/subscriptions";

export default async function AlistamientoPage({ searchParams }: { searchParams: Promise<{ fecha?: string; cocina?: string }> }) {
  await requirePermission("kitchen.prepare");
  const { fecha, cocina } = await searchParams;
  const today = todayBogota();
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : today;
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const kitchen = kitchens.find((k) => k.id === cocina) ?? kitchens[0];

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Alistamiento"
        description="Alista la canasta de cada domiciliario cuando cocina termine sus pedidos: imprime sus etiquetas, arma cada pedido y márcalo empacado. La última entrega va al fondo y la primera arriba."
      />
      {!kitchen ? (
        <EmptyState icon={Truck} title="No hay cocinas activas" description="Crea una en Configuración → Operación." />
      ) : (
        <>
          <DayPicker base="/admin/alistamiento" date={date} today={today} kitchens={kitchens} kitchenId={kitchen.id} />
          <PackingBoard
            kitchen={{ id: kitchen.id, name: kitchen.name, lat: kitchen.lat, lng: kitchen.lng }}
            date={date}
            slots={await loadKitchenSlots(kitchen.id)}
            routes={await loadRoutes(kitchen.id, date)}
            unrouted={await countUnrouted(kitchen.id, date)}
            late={await loadLateOrders(kitchen.id, date)}
            couriers={await loadSlotCouriers(kitchen.id)}
            incidents={await loadIncidents(kitchen.id, date)}
          />
        </>
      )}
    </div>
  );
}
