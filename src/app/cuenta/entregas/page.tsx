import Link from "next/link";
import { CalendarClock, Clock, Info } from "lucide-react";
import { DeliveryRow } from "@/components/account/DeliveryRow";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { loadUpcomingDeliveries, todayBogota } from "@/lib/account";
import { formatTime12 } from "@/lib/delivery";
import { loadDeliveryZones } from "@/lib/orders";
import { requireSession } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function MonthCalendar({ year, month, marked, today }: { year: number; month: number; marked: Set<string>; today: string }) {
  const first = new Date(Date.UTC(year, month, 1, 12));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const raw = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div>
      <p className="mb-4 font-display text-base font-bold text-[#1F4D36]">{title}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-2 text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/35">{d}</span>
        ))}
        {cells.map((day, i) => {
          const date = day ? iso(day) : "";
          const has = day && marked.has(date);
          return (
            <span
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-sm",
                !day && "invisible",
                has && "bg-[#1F4D36] font-bold text-white",
                day && !has && date < today && "text-[#1B1B1B]/25",
                day && !has && date >= today && "bg-[#F8F7F2] text-[#1F4D36]",
                date === today && "ring-2 ring-[#8BC34A] ring-offset-1"
              )}
            >
              {day}
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#1B1B1B]/50">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#1F4D36]" /> Con entrega</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-[#8BC34A]" /> Hoy</span>
      </div>
    </div>
  );
}

export default async function EntregasPage() {
  const session = await requireSession("/cuenta/entregas");
  const [deliveries, zones] = await Promise.all([loadUpcomingDeliveries(session.userId), loadDeliveryZones()]);
  const today = todayBogota();
  const [y, m] = today.split("-").map(Number);
  const marked = new Set(deliveries.map((d) => d.date));
  const zone = zones[0];

  return (
    <div>
      <PageHeader
        eyebrow="Entregas"
        title="Mis entregas"
        description="Tus pedidos pagados por recibir. Con un plan de suscripción podrás armar aquí tu calendario del mes."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel>
          <MonthCalendar year={y} month={m - 1} marked={marked} today={today} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Próximas entregas" description={deliveries.length ? `${deliveries.length} por recibir` : undefined}>
            {deliveries.length > 0 ? (
              <ul className="divide-y divide-[#1F4D36]/[0.06]">
                {deliveries.map((d) => (
                  <DeliveryRow key={d.id} delivery={d} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Sin entregas programadas"
                action={
                  <Button size="sm" asChild>
                    <Link href="/menu">Hacer un pedido</Link>
                  </Button>
                }
              />
            )}
          </Panel>

          {zone && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3 rounded-3xl bg-[#E8F3DC] p-5">
                <Clock className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                <div>
                  <p className="text-sm font-bold text-[#1F4D36]">Franjas de entrega</p>
                  <p className="mt-1 text-sm text-[#1F4D36]/70">{zone.slots.map((s) => s.label).join(" y ")}</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-3xl bg-white p-5 ring-1 ring-[#1F4D36]/[0.07]">
                <Info className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                <div>
                  <p className="text-sm font-bold text-[#1F4D36]">Hora de corte</p>
                  <p className="mt-1 text-sm text-[#1B1B1B]/55">
                    Para recibir el mismo día, pide antes de las {formatTime12(zone.cutoffTime)}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
