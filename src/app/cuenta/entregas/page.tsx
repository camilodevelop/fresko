import { Clock, Info } from "lucide-react";
import { DeliveryRow } from "@/components/account/DeliveryRow";
import { PageHeader, Panel, PreviewNotice } from "@/components/dashboard/ui";
import { PREVIEW_DELIVERIES } from "@/lib/data/account-preview";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Mini calendario del mes con los días que tienen entrega. */
function MonthCalendar({ year, month, marked, today }: { year: number; month: number; marked: Set<number>; today: number }) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const raw = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(first);
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <div>
      <p className="mb-4 font-display text-base font-bold text-[#1F4D36]">{title}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-2 text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/35">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          const sunday = i % 7 === 6;
          return (
            <span
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-sm",
                !day && "invisible",
                day && marked.has(day) && "bg-[#1F4D36] font-bold text-white",
                day && !marked.has(day) && day < today && "text-[#1B1B1B]/25",
                day && !marked.has(day) && day >= today && !sunday && "bg-[#F8F7F2] text-[#1F4D36]",
                day && sunday && !marked.has(day) && "text-[#1B1B1B]/25 line-through",
                day === today && "ring-2 ring-[#8BC34A] ring-offset-1"
              )}
            >
              {day}
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#1B1B1B]/50">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#1F4D36]" /> Con entrega</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#F8F7F2]" /> Disponible</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-[#8BC34A]" /> Hoy</span>
      </div>
    </div>
  );
}

export default function EntregasPage() {
  const marked = new Set(PREVIEW_DELIVERIES.map((d) => Number(d.date.slice(8))));

  return (
    <div>
      <PreviewNotice>Vista previa con datos de ejemplo. El calendario editable llega con las suscripciones (fase 4).</PreviewNotice>
      <PageHeader
        eyebrow="Entregas"
        title="Mi calendario"
        description="Una entrega por día, en la franja que elijas. Puedes cambiar platos o franja hasta las 7:00 a. m. del mismo día."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[360px_1fr]">
        <Panel>
          <MonthCalendar year={2026} month={10} marked={marked} today={4} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Próximas entregas" description={`${PREVIEW_DELIVERIES.length} programadas este mes`}>
            <ul className="divide-y divide-[#1F4D36]/[0.06]">
              {PREVIEW_DELIVERIES.map((d) => (
                <DeliveryRow key={d.date} delivery={d} />
              ))}
            </ul>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3 rounded-3xl bg-[#E8F3DC] p-5">
              <Clock className="h-5 w-5 shrink-0 text-[#1F4D36]" />
              <div>
                <p className="text-sm font-bold text-[#1F4D36]">Franjas de entrega</p>
                <p className="mt-1 text-sm text-[#1F4D36]/70">11:00 – 13:00 y 13:00 – 15:00</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-3xl bg-white p-5 ring-1 ring-[#1F4D36]/[0.07]">
              <Info className="h-5 w-5 shrink-0 text-[#1F4D36]" />
              <div>
                <p className="text-sm font-bold text-[#1F4D36]">Hora de corte</p>
                <p className="mt-1 text-sm text-[#1B1B1B]/55">Después de las 7:00 a. m. la entrega del día queda cerrada.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
