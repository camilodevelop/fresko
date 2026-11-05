import Link from "next/link";
import { ArrowRight, CalendarDays, Plus, Sparkles } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { getPlans } from "@/lib/data/catalog";
import { formatDeliveryDate } from "@/lib/delivery";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { daysBetween, SUBSCRIPTION_STATUS, todayBogota } from "@/lib/subscriptions";
import { loadMySubscriptions } from "@/lib/subscriptions-data";
import { cn, formatPrice } from "@/lib/utils";

export default async function MisSuscripcionesPage() {
  const session = await requireConsentedSession("/cuenta/suscripcion");
  const [subs, { plans }] = await Promise.all([loadMySubscriptions(session.userId), getPlans()]);
  const today = todayBogota();
  const order = { activa: 0, pendiente_pago: 1, vencida: 2 } as Record<string, number>;
  const sorted = [...subs].sort((a, b) => (order[a.state] ?? 3) - (order[b.state] ?? 3));

  return (
    <div>
      <PageHeader
        eyebrow="Suscripción"
        title="Mis planes"
        description="Programa tus platos en el calendario y cámbialos hasta la hora de corte del día de la entrega."
        actions={
          <Button size="sm" asChild>
            <Link href="/#suscripciones">
              <Plus className="h-4 w-4" /> Comprar un plan
            </Link>
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <div className="space-y-6">
          <EmptyState icon={Sparkles} title="Aún no tienes un plan" description="Elige un plan, arma tu calendario y ahorra en cada plato." />
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((p) => (
              <Link
                key={p.slug}
                href={`/suscripcion/${p.slug}`}
                className={cn("rounded-3xl border bg-white p-5 transition hover:shadow-lg", p.featured ? "border-[#8BC34A]" : "border-[#1F4D36]/[0.08]")}
              >
                <p className="font-display text-lg font-bold text-[#1F4D36]">{p.name}</p>
                <p className="text-sm text-[#1B1B1B]/55">
                  {p.portions} platos · −{Math.round(p.discount * 100)}%
                </p>
                <p className="mt-3 text-xs text-[#1B1B1B]/45">Desde</p>
                <p className="font-display text-2xl font-bold text-[#1F4D36]">{formatPrice(p.fromPrice)}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1F4D36]">
                  Armar mi plan <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((s) => {
            const status = SUBSCRIPTION_STATUS[s.state] ?? SUBSCRIPTION_STATUS.activa;
            const free = s.portions - s.used;
            const left = daysBetween(today, s.expiresOn);
            return (
              <Link
                key={s.id}
                href={s.state === "pendiente_pago" ? `/pago/suscripcion/${s.id}` : `/cuenta/suscripcion/${s.code}`}
                className={cn(
                  "block rounded-3xl border bg-white p-5 transition hover:shadow-lg sm:p-6",
                  s.state === "activa" ? "border-[#8BC34A]/60" : "border-[#1F4D36]/[0.08]",
                  s.state === "vencida" && "opacity-70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7CB342]">{s.code}</p>
                    <p className="font-display text-xl font-bold text-[#1F4D36]">{s.planName}</p>
                  </div>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[#1B1B1B]/55">
                    <span>
                      {s.used} de {s.portions} platos usados
                    </span>
                    <span>{s.delivered} entregados</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EEF3EA]">
                    <div className="h-full rounded-full bg-[#8BC34A]" style={{ width: `${Math.min(100, (s.used / s.portions) * 100)}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                  {s.state === "pendiente_pago" ? (
                    <span className="font-semibold text-amber-800">Pagar {formatPrice(s.total)} →</span>
                  ) : s.state === "vencida" ? (
                    <span className="text-[#1B1B1B]/55">Venció el {formatDeliveryDate(s.expiresOn, { day: "numeric", month: "long" })}</span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 text-[#1B1B1B]/60">
                        <CalendarDays className="h-4 w-4 text-[#7CB342]" />
                        {s.nextDelivery
                          ? `Próxima: ${formatDeliveryDate(s.nextDelivery.date, { weekday: "short", day: "numeric", month: "short" })}`
                          : "Sin entregas programadas"}
                      </span>
                      <span className={cn("text-xs font-semibold", left <= 7 && free > 0 ? "text-amber-700" : "text-[#1B1B1B]/45")}>
                        {free > 0 ? `${free} por programar · ` : ""}vence en {left} {left === 1 ? "día" : "días"}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
