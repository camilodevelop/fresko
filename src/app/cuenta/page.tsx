import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, Package, Repeat, Salad, Sparkles } from "lucide-react";
import { DeliveryRow } from "@/components/account/DeliveryRow";
import { Panel, PreviewNotice, StatCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { PREVIEW_DELIVERIES, PREVIEW_PLAN, formatLongDate, formatShortDate } from "@/lib/data/account-preview";
import { requireSession } from "@/lib/supabase/auth";

export default async function CuentaHomePage() {
  const session = await requireSession();
  const name = session.fullName.split(" ")[0] || "Cliente";
  const plan = PREVIEW_PLAN;
  const available = plan.total - plan.used - plan.scheduled;
  const next = PREVIEW_DELIVERIES[0];
  const usedPct = Math.round((plan.used / plan.total) * 100);
  const scheduledPct = Math.round((plan.scheduled / plan.total) * 100);

  return (
    <div>
      <PreviewNotice>
        Vista previa: el plan, las entregas y los pedidos son datos de ejemplo hasta que activemos
        suscripciones y pedidos en las próximas fases.
      </PreviewNotice>

      {/* Bienvenida */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#1F4D36] px-6 py-7 text-white sm:px-8 sm:py-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8BC34A]/20 blur-3xl" />
        <Image
          src="/images/bowl.png"
          alt=""
          width={320}
          height={220}
          className="pointer-events-none absolute -bottom-10 right-0 hidden w-72 opacity-95 md:block"
        />
        <div className="relative max-w-lg">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C5E1A5]">Mi cuenta</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight">Hola, {name}</h1>
          <p className="mt-2 text-sm text-white/70">
            Tu próxima entrega es el <span className="font-semibold text-white">{formatLongDate(next.date)}</span>{" "}
            entre {next.slot}.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="fresh" size="sm" asChild>
              <Link href="/cuenta/entregas">
                <CalendarClock className="h-4 w-4" /> Ver mi calendario
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/menu">Pedir algo extra</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Repeat} label="Plan activo" value={plan.name} hint={plan.category} tone="fresh" />
        <StatCard icon={Salad} label="Porciones sin programar" value={available} hint={`de ${plan.total} del mes`} />
        <StatCard icon={CalendarClock} label="Entregas programadas" value={plan.scheduled} hint="Puedes cambiarlas hasta las 7:00 a. m." />
        <StatCard icon={Package} label="Plan vigente hasta" value={formatShortDate(plan.endsOn)} hint="Renuévalo antes para no perder tu calendario" />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <Panel
          title="Próximas entregas"
          description="Cambia los platos o la franja de cada día hasta la hora de corte."
          actions={
            <Link href="/cuenta/entregas" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1F4D36] hover:underline">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="divide-y divide-[#1F4D36]/[0.06]">
            {PREVIEW_DELIVERIES.slice(0, 4).map((d) => (
              <DeliveryRow key={d.date} delivery={d} />
            ))}
          </ul>
        </Panel>

        <Panel title="Uso del plan" description={`${formatShortDate(plan.startsOn)} – ${formatShortDate(plan.endsOn)}`}>
          <div className="flex h-3 overflow-hidden rounded-full bg-[#F4F8F2]">
            <div className="bg-[#1F4D36]" style={{ width: `${usedPct}%` }} />
            <div className="bg-[#8BC34A]" style={{ width: `${scheduledPct}%` }} />
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            {[
              ["bg-[#1F4D36]", "Entregadas", plan.used],
              ["bg-[#8BC34A]", "Programadas", plan.scheduled],
              ["bg-[#E5EDE0]", "Sin programar", available],
            ].map(([color, label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-[#1B1B1B]/60">
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {label}
                </dt>
                <dd className="font-semibold text-[#1F4D36]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 rounded-2xl bg-[#F8F7F2] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#1F4D36]">
              <Sparkles className="h-4 w-4 text-amber-500" /> Tienes {available} porciones libres
            </p>
            <p className="mt-1 text-xs text-[#1B1B1B]/50">Prográmalas antes del {formatShortDate(plan.endsOn)}.</p>
            <Button size="sm" className="mt-3 w-full" asChild>
              <Link href="/cuenta/entregas">Programar entregas</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
