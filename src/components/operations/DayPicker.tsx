import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDeliveryDate } from "@/lib/delivery";
import { addDaysIso } from "@/lib/subscriptions";
import type { KitchenRow } from "@/lib/operations";
import { cn } from "@/lib/utils";

/** Selector de día (anterior / hoy / siguiente) y de cocina, por URL. */
export function DayPicker({
  base,
  date,
  today,
  kitchens,
  kitchenId,
  allowAll = false,
}: {
  base: string;
  date: string;
  today: string;
  kitchens: KitchenRow[];
  /** "todas" cuando allowAll y no hay una cocina elegida. */
  kitchenId: string;
  /** Mostrar la opción "Todas las cocinas". */
  allowAll?: boolean;
}) {
  const href = (d: string, k = kitchenId) => `${base}?fecha=${d}${kitchens.length > 1 ? `&cocina=${k}` : ""}`;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-[#1F4D36]/[0.08]">
        <Link href={href(addDaysIso(date, -1))} aria-label="Día anterior" className="rounded-full p-2 text-[#1F4D36] hover:bg-[#F4F8F2]">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="min-w-[150px] px-2 text-center text-sm font-semibold text-[#1F4D36]">
          {date === today ? "Hoy · " : ""}
          {formatDeliveryDate(date, { weekday: "short", day: "numeric", month: "short" }, true)}
        </span>
        <Link href={href(addDaysIso(date, 1))} aria-label="Día siguiente" className="rounded-full p-2 text-[#1F4D36] hover:bg-[#F4F8F2]">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {date !== today && (
        <Link href={href(today)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#1F4D36]/70 hover:bg-white">
          Ir a hoy
        </Link>
      )}
      {kitchens.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {allowAll && (
            <Link
              href={href(date, "todas")}
              className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", kitchenId === "todas" ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36]/70 ring-1 ring-[#1F4D36]/[0.08]")}
            >
              Todas las cocinas
            </Link>
          )}
          {kitchens.map((k) => (
            <Link
              key={k.id}
              href={href(date, k.id)}
              className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", k.id === kitchenId ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36]/70 ring-1 ring-[#1F4D36]/[0.08]")}
            >
              {k.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
