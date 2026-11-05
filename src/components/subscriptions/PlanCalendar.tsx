"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarDay = {
  /** Platos programados ese día. */
  count: number;
  image?: string;
  /** Ya no se puede cambiar (pasó la hora de corte, en preparación o entregada). */
  locked?: boolean;
  delivered?: boolean;
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out: { year: number; month: number }[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push({ year: y, month: m });
    if (m === 12) {
      y += 1;
      m = 1;
    } else m += 1;
  }
  return out;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Calendario de la vigencia del plan. Los días con reparto se pueden tocar; los que tienen
 * entrega muestran cuántos platos llevan.
 */
export function PlanCalendar({
  from,
  to,
  today,
  isAvailable,
  days,
  onSelect,
}: {
  from: string;
  to: string;
  today: string;
  isAvailable: (date: string) => boolean;
  days: Record<string, CalendarDay>;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="space-y-6">
      {monthsBetween(from, to).map(({ year, month }) => {
        const first = new Date(Date.UTC(year, month - 1, 1));
        const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
        const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const raw = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
        const title = raw.charAt(0).toUpperCase() + raw.slice(1);
        return (
          <section key={`${year}-${month}`}>
            <p className="mb-2 font-display text-base font-bold text-[#1F4D36]">{title}</p>
            <div className="grid max-w-[520px] grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="pb-1 text-center text-[10px] font-bold uppercase text-[#1B1B1B]/35">
                  {w}
                </span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {Array.from({ length: total }, (_, i) => {
                const date = iso(year, month, i + 1);
                const info = days[date];
                const inRange = date >= from && date <= to;
                const open = inRange && isAvailable(date);
                const clickable = Boolean(info) || open;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!clickable}
                    onClick={() => onSelect(date)}
                    aria-label={`${i + 1}${info ? `, ${info.count} platos` : ""}`}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl text-xs font-semibold transition sm:rounded-2xl sm:text-sm",
                      info
                        ? info.delivered
                          ? "bg-[#1F4D36]/80 text-white"
                          : "bg-[#1F4D36] text-white shadow-sm hover:bg-[#2B6448]"
                        : open
                          ? "bg-[#F4F8F2] text-[#1F4D36] ring-1 ring-[#1F4D36]/10 hover:bg-[#E8F3DC] hover:ring-[#8BC34A]"
                          : "text-[#1B1B1B]/20",
                      date === today && "ring-2 ring-[#8BC34A]"
                    )}
                  >
                    {info?.image && (
                      <Image src={info.image} alt="" fill sizes="56px" className="object-cover opacity-35" />
                    )}
                    <span className="relative">{i + 1}</span>
                    {info && (
                      <span className="relative mt-0.5 flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 text-[9px] font-bold leading-4 text-[#1F4D36] sm:text-[10px]">
                        {info.locked && <Lock className="h-2.5 w-2.5" />}
                        {info.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#1B1B1B]/50">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#F4F8F2] ring-1 ring-[#1F4D36]/10" /> Día con reparto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#1F4D36]" /> Con entrega (n.º de platos)
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Ya no se puede cambiar
        </span>
      </div>
    </div>
  );
}
