import { Lock, Pencil, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/ui";
import { DELIVERY_STATUS, dayParts, type PreviewDelivery } from "@/lib/data/account-preview";

export function DeliveryRow({ delivery }: { delivery: PreviewDelivery }) {
  const day = dayParts(delivery.date);
  const status = DELIVERY_STATUS[delivery.status];
  return (
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-[#F4F8F2] py-2 text-[#1F4D36]">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{day.weekday}</span>
        <span className="font-display text-xl font-bold leading-none">{day.day}</span>
        <span className="text-[10px] font-semibold uppercase opacity-60">{day.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#1F4D36]">{delivery.slot}</p>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <p className="mt-1 truncate text-sm text-[#1B1B1B]/55">
          {delivery.items.map((item, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {item.qty > 1 && `${item.qty}× `}
              {item.name}
              {item.premium && <Sparkles className="ml-1 inline h-3 w-3 text-amber-500" aria-label="Premium" />}
            </span>
          ))}
        </p>
      </div>
      {delivery.editable ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#1F4D36]/15 px-3 py-1.5 text-xs font-semibold text-[#1F4D36]">
          <Pencil className="h-3 w-3" /> Cambiar
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[#1B1B1B]/40" title="Pasó la hora de corte">
          <Lock className="h-3 w-3" /> Cerrada
        </span>
      )}
    </li>
  );
}
