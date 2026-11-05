import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { UpcomingDelivery } from "@/lib/account";

function dayParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { ...o, timeZone: "UTC" }).format(date).replace(".", "");
  return { weekday: f({ weekday: "short" }), day: d, month: f({ month: "short" }) };
}

export function DeliveryRow({ delivery }: { delivery: UpcomingDelivery }) {
  const day = dayParts(delivery.date);
  return (
    <li>
      <Link href={`/cuenta/pedidos/${delivery.code}`} className="flex items-center gap-4 py-4 transition-colors hover:bg-[#F8F7F2]/60">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-[#F4F8F2] py-2 text-[#1F4D36]">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{day.weekday}</span>
          <span className="font-display text-xl font-bold leading-none">{day.day}</span>
          <span className="text-[10px] font-semibold uppercase opacity-60">{day.month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#1F4D36]">{delivery.slot}</p>
            <OrderStatusBadge status={delivery.status} />
          </div>
          <p className="mt-1 truncate text-sm text-[#1B1B1B]/55">{delivery.summary}</p>
          <p className="text-xs text-[#1B1B1B]/40">{delivery.code}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#1B1B1B]/25" />
      </Link>
    </li>
  );
}
