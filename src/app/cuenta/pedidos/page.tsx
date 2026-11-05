import Link from "next/link";
import { Receipt } from "lucide-react";
import { PageHeader, Panel, PreviewNotice, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { PREVIEW_ORDERS, formatShortDate } from "@/lib/data/account-preview";
import { formatPrice } from "@/lib/utils";

export default function PedidosPage() {
  return (
    <div>
      <PreviewNotice>Vista previa con datos de ejemplo. El historial real llega con los pedidos en línea (fase 3).</PreviewNotice>
      <PageHeader
        eyebrow="Historial"
        title="Mis pedidos"
        description="Tus compras sueltas, tus planes y cada entrega de tu suscripción."
        actions={
          <Button size="sm" asChild>
            <Link href="/menu">Hacer un pedido</Link>
          </Button>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1F4D36]/[0.06] text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                <th className="px-6 py-4">Pedido</th>
                <th className="px-4 py-4">Detalle</th>
                <th className="px-4 py-4">Tipo</th>
                <th className="px-4 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_ORDERS.map((order) => (
                <tr key={order.id} className="border-b border-[#1F4D36]/[0.05] transition-colors last:border-0 hover:bg-[#F8F7F2]/70">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F8F2] text-[#1F4D36]">
                        <Receipt className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-[#1F4D36]">{order.id}</p>
                        <p className="text-xs text-[#1B1B1B]/45">{formatShortDate(order.date)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-4 text-[#1B1B1B]/65">{order.summary}</td>
                  <td className="px-4 py-4 text-[#1B1B1B]/55">{order.kind}</td>
                  <td className="px-4 py-4">
                    <StatusBadge tone={order.status.tone}>{order.status.label}</StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-[#1F4D36]">
                    {order.total ? formatPrice(order.total) : <span className="font-normal text-[#1B1B1B]/40">Incluido</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
