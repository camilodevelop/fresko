import { PageHeader } from "@/components/dashboard/ui";
import { CourierRoutes } from "@/components/operations/CourierRoutes";
import { DayPicker } from "@/components/operations/DayPicker";
import { loadMyRoutes } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { todayBogota } from "@/lib/subscriptions";

export default async function RutasPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const session = await requirePermission("delivery.deliver");
  const { fecha } = await searchParams;
  const today = todayBogota();
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : today;
  const routes = await loadMyRoutes(session.userId, date);
  const supabase = await createClient();
  const { data: wait } = await supabase.from("settings").select("value").eq("key", "delivery_wait_minutes").maybeSingle();
  const waitMinutes = Number(wait?.value) > 0 ? Number(wait?.value) : 5;

  return (
    <div>
      <PageHeader eyebrow="Operación" title="Mis rutas" description="Tus entregas en orden. Al llegar, avisa al cliente; entrega con foto o, si no sale después de la espera, reporta la novedad." />
      <DayPicker base="/admin/rutas" date={date} today={today} kitchens={[]} kitchenId="" />
      <CourierRoutes routes={routes} waitMinutes={waitMinutes} />
    </div>
  );
}
