"use client";

import { DELIVERY_SLOTS } from "@/lib/data/delivery";
import { cn } from "@/lib/utils";

type DeliveryPickerProps = {
  date?: string;
  slotId?: string;
  minDate: string;
  onDate: (date: string) => void;
  onSlot: (slotId: string) => void;
};

export function DeliveryPicker({
  date,
  slotId,
  minDate,
  onDate,
  onSlot,
}: DeliveryPickerProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1F4D36]/60">
        Fecha de entrega
        <input
          type="date"
          min={minDate}
          value={date ?? ""}
          onChange={(e) => onDate(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm text-[#1B1B1B]"
        />
      </label>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1F4D36]/60">
          Franja horaria
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {DELIVERY_SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSlot(slot.id)}
              className={cn(
                "rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                slotId === slot.id
                  ? "bg-[#1F4D36] text-white"
                  : "bg-[#F4F8F2] text-[#1F4D36] hover:bg-[#C5E1A5]/50"
              )}
            >
              {slot.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
