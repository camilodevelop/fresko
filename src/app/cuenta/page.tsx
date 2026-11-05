import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin, Package, Repeat, ShoppingBag, Sparkles } from "lucide-react";
import { DeliveryRow } from "@/components/account/DeliveryRow";
import { EmptyState, Panel, StatCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { loadUpcomingDeliveries } from "@/lib/account";
import { formatDeliveryDate } from "@/lib/delivery";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function CuentaHomePage() {
  const session = await requireSession();
  const name = session.fullName.split(" ")[0] || "Cliente";
  const supabase = await createClient();
  const [upcoming, { count: delivered }, { count: addresses }, { data: pending }] = await Promise.all([
    loadUpcomingDeliveries(session.userId, 5),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", session.userId).eq("status", "entregado"),
    supabase.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", session.userId),
    supabase.from("orders").select("id, code").eq("user_id", session.userId).eq("status", "pendiente_pago").order("created_at", { ascending: false }).limit(1),
  ]);
  const next = upcoming[0];
  const unpaid = pending?.[0];

  return (
    <div>
      {/* Bienvenida */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#1F4D36] px-6 py-7 text-white sm:px-8 sm:py-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8BC34A]/20 blur-3xl" />
        <Image src="/images/bowl.png" alt="" width={320} height={220} className="pointer-events-none absolute -bottom-10 right-0 hidden w-72 opacity-95 md:block" />
        <div className="relative max-w-lg">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C5E1A5]">Mi cuenta</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight">Hola, {name}</h1>
          <p className="mt-2 text-sm text-white/70">
            {next ? (
              <>
                Tu próxima entrega es el <span className="font-semibold text-white">{formatDeliveryDate(next.date)}</span> entre {next.slot}.
              </>
            ) : (
              "¿Qué se te antoja? Pide hoy y recíbelo en la franja que elijas."
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {next ? (
              <Button variant="fresh" size="sm" asChild>
                <Link href={`/cuenta/pedidos/${next.code}`}>
                  <CalendarClock className="h-4 w-4" /> Ver mi entrega
                </Link>
              </Button>
            ) : (
              <Button variant="fresh" size="sm" asChild>
                <Link href="/menu">
                  <ShoppingBag className="h-4 w-4" /> Hacer un pedido
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/arma-tu-bowl">Arma tu bowl</Link>
            </Button>
          </div>
        </div>
      </section>

      {unpaid && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <span>
            Tu pedido <strong>{unpaid.code}</strong> está pendiente de pago.
          </span>
          <Button size="sm" asChild>
            <Link href={`/pago/${unpaid.id}`}>Pagar ahora</Link>
          </Button>
        </div>
      )}

      {/* Indicadores */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Próxima entrega"
          value={next ? formatDeliveryDate(next.date, { day: "numeric", month: "short" }) : "—"}
          hint={next ? next.slot : "Sin entregas programadas"}
          tone="fresh"
        />
        <StatCard icon={Package} label="Entregas pendientes" value={upcoming.length} hint="Pedidos pagados por recibir" />
        <StatCard icon={ShoppingBag} label="Pedidos entregados" value={delivered ?? 0} />
        <StatCard icon={MapPin} label="Direcciones" value={addresses ?? 0} hint={addresses ? "Guardadas en tu cuenta" : "Agrega una al pedir"} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Próximas entregas"
          description="Toca una entrega para ver el detalle y su estado."
          actions={
            <Link href="/cuenta/pedidos" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1F4D36] hover:underline">
              Mis pedidos <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {upcoming.length > 0 ? (
            <ul className="divide-y divide-[#1F4D36]/[0.06]">
              {upcoming.map((d) => (
                <DeliveryRow key={d.id} delivery={d} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="No tienes entregas programadas"
              description="Cuando pagues un pedido, aquí verás cuándo llega."
              action={
                <Button size="sm" asChild>
                  <Link href="/menu">Ver menú</Link>
                </Button>
              }
            />
          )}
        </Panel>

        <Panel title="Ahorra con un plan" icon={Repeat}>
          <p className="text-sm text-[#1B1B1B]/60">
            Compra tus platos del mes con descuento y programa tu calendario de entregas.
          </p>
          <div className="mt-4 rounded-2xl bg-[#F8F7F2] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#1F4D36]">
              <Sparkles className="h-4 w-4 text-amber-500" /> Hasta 20% de descuento
            </p>
            <p className="mt-1 text-xs text-[#1B1B1B]/50">Domicilio incluido en todos los planes.</p>
            <Button size="sm" className="mt-3 w-full" asChild>
              <Link href="/#suscripciones">Ver planes</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
