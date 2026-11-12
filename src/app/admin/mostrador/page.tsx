import Link from "next/link";
import { Store } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { CounterPOS } from "@/components/counter/CounterPOS";
import { loadCounterCatalog, loadCounterOrders, loadMyCashSession, loadPaymentMethods, openSessionElsewhere } from "@/lib/counter";
import { loadKitchens } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { todayBogota } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

export default async function MostradorPage({ searchParams }: { searchParams: Promise<{ cocina?: string }> }) {
  const session = await requirePermission("counter.sell");
  const { cocina } = await searchParams;
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const kitchen = kitchens.find((k) => k.id === cocina) ?? kitchens[0];
  const today = todayBogota();

  if (!kitchen) {
    return (
      <div>
        <PageHeader eyebrow="Operación" title="Mostrador" />
        <EmptyState icon={Store} title="No tienes una cocina asignada" description="Pide al administrador que te asigne a la cocina donde vendes." />
      </div>
    );
  }

  const [catalog, methods, cash, orders, elsewhere] = await Promise.all([
    loadCounterCatalog("mostrador", kitchen.id),
    loadPaymentMethods(),
    loadMyCashSession(kitchen.id, session.userId),
    loadCounterOrders(kitchen.id, today),
    openSessionElsewhere(kitchen.id, session.userId),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Mostrador"
        description="Vende en la cocina: arma el pedido, cobra y pasa a cocina. Aquí también llegan los pedidos de la pantalla de autoservicio para cobrarlos."
      />
      {kitchens.length > 1 && (
        <nav className="mb-5 flex flex-wrap gap-2" aria-label="Cocinas">
          {kitchens.map((k) => (
            <Link
              key={k.id}
              href={`/admin/mostrador?cocina=${k.id}`}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                k.id === kitchen.id ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36] hover:bg-[#E8F3DC]"
              )}
            >
              {k.name}
            </Link>
          ))}
        </nav>
      )}
      <CounterPOS
        key={kitchen.id}
        kitchenId={kitchen.id}
        kitchenName={kitchen.name}
        catalog={catalog}
        methods={methods}
        session={cash}
        orders={orders}
        elsewhere={elsewhere}
      />
    </div>
  );
}
