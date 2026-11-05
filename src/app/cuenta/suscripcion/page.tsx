import Link from "next/link";
import { ArrowUpRight, CalendarCheck, CheckCircle2, RefreshCw, Salad, Sparkles } from "lucide-react";
import { PageHeader, Panel, PreviewNotice, StatCard, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { PREVIEW_PLAN, formatLongDate, formatShortDate } from "@/lib/data/account-preview";
import { formatPrice } from "@/lib/utils";

export default function SuscripcionPage() {
  const plan = PREVIEW_PLAN;
  const available = plan.total - plan.used - plan.scheduled;

  return (
    <div>
      <PreviewNotice>Vista previa con datos de ejemplo. La compra de planes llega en la fase 4.</PreviewNotice>
      <PageHeader
        eyebrow="Suscripción"
        title="Mi plan"
        description="Tu plan dura un mes desde la compra. Reparte tus porciones en el calendario, una entrega por día."
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/#suscripciones">Ver otros planes</Link>
          </Button>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative overflow-hidden rounded-[28px] border-2 border-[#8BC34A] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <StatusBadge tone="green">Activo</StatusBadge>
              <h2 className="mt-3 font-display text-3xl font-bold text-[#1F4D36]">{plan.name}</h2>
              <p className="text-sm text-[#1B1B1B]/55">{plan.category} · {plan.total} porciones al mes</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-[#1F4D36]">{formatPrice(plan.price)}</p>
              <p className="text-xs text-[#1B1B1B]/45">pagado el {formatShortDate(plan.startsOn)}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Entregadas", value: plan.used, tone: "bg-[#1F4D36] text-white" },
              { label: "Programadas", value: plan.scheduled, tone: "bg-[#E8F3DC] text-[#1F4D36]" },
              { label: "Sin programar", value: available, tone: "bg-[#F8F7F2] text-[#1F4D36]" },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl p-4 ${s.tone}`}>
                <p className="font-display text-3xl font-bold">{s.value}</p>
                <p className="text-xs font-medium opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          <ul className="mt-8 grid gap-3 text-sm text-[#1B1B1B]/70 sm:grid-cols-2">
            {[
              "Entrega programada a domicilio",
              "Bowls y ensaladas en el mismo plan",
              "Cambia tus platos hasta las 7:00 a. m. del día",
              "Productos premium con recargo al elegirlos",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8BC34A]" />
                {b}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <StatCard
            icon={CalendarCheck}
            label="Vigente hasta"
            value={formatShortDate(plan.endsOn)}
            hint={formatLongDate(plan.endsOn)}
            tone="dark"
          />
          <Panel title="Renovación" icon={RefreshCw}>
            <p className="text-sm text-[#1B1B1B]/60">
              El plan no se renueva solo. Renuévalo antes del vencimiento para seguir con tu calendario.
            </p>
            <Button className="mt-4 w-full" disabled>
              Renovar plan
            </Button>
          </Panel>
          <Panel title="Mejora tu plan" icon={Sparkles}>
            <p className="text-sm text-[#1B1B1B]/60">Con Plan Full tienes 28 porciones y 20% de descuento.</p>
            <Link
              href="/#suscripciones"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1F4D36] hover:underline"
            >
              Comparar planes <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Panel>
          <Panel title="¿Te sobran porciones?" icon={Salad}>
            <p className="text-sm text-[#1B1B1B]/60">
              Tienes {available} porciones sin programar.{" "}
              <Link href="/cuenta/entregas" className="font-semibold text-[#1F4D36] hover:underline">
                Prográmalas
              </Link>
              .
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
