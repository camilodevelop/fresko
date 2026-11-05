import Link from "next/link";
import { ChevronRight, Receipt, ShoppingBag } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/ui";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { formatDeliveryDate } from "@/lib/delivery";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function PedidosPage() {
  const session = await requireSession("/cuenta/pedidos");
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, code, status, total, delivery_date, slot_label, created_at, order_items(name, quantity)")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader
        eyebrow="Historial"
        title="Mis pedidos"
        description="Tus compras y el estado de cada entrega."
        actions={
          <Button size="sm" asChild>
            <Link href="/menu">Hacer un pedido</Link>
          </Button>
        }
      />

      {orders && orders.length > 0 ? (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-[#1F4D36]/[0.06]">
            {orders.map((o) => {
              const summary = o.order_items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(", ");
              return (
                <li key={o.id}>
                  <Link href={`/cuenta/pedidos/${o.code}`} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#F8F7F2]/70">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
                      <Receipt className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#1F4D36]">{o.code}</p>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-[#1B1B1B]/55">{summary}</p>
                      <p className="text-xs text-[#1B1B1B]/40">
                        Entrega el {formatDeliveryDate(o.delivery_date, { weekday: "long", day: "numeric", month: "short" })} · {o.slot_label}
                      </p>
                    </div>
                    <p className="shrink-0 font-display font-bold text-[#1F4D36]">{formatPrice(o.total)}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#1B1B1B]/25" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : (
        <EmptyState
          icon={ShoppingBag}
          title="Aún no tienes pedidos"
          description="Elige tus ensaladas y bowls favoritos y prográmalos para el día que quieras."
          action={
            <Button asChild>
              <Link href="/menu">Ver menú</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
