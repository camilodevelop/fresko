import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { DayPicker } from "@/components/operations/DayPicker";
import { KitchenBoard } from "@/components/operations/KitchenBoard";
import { loadIncidents, loadKitchenBoard, loadKitchens } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { todayBogota } from "@/lib/subscriptions";
import { ChefHat } from "lucide-react";

export default async function CocinaPage({ searchParams }: { searchParams: Promise<{ fecha?: string; cocina?: string }> }) {
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
        title="Cocina"
        description="Prepara por franja y por tipo de plato: primero la franja más temprana, los platos iguales juntos y los armados uno a uno. Los pedidos se arman y etiquetan después, en Alistamiento."
      />
      {!kitchen ? (
        <EmptyState icon={ChefHat} title="No hay cocinas activas" description="Crea una en Configuración → Operación." />
      ) : (
        <>
          <DayPicker base="/admin/cocina" date={date} today={today} kitchens={kitchens} kitchenId={kitchen.id} />
          <KitchenBoard kitchenId={kitchen.id} date={date} {...await loadKitchenBoard(kitchen.id, date)} incidents={await loadIncidents(kitchen.id, date)} />
        </>
      )}
    </div>
  );
}
