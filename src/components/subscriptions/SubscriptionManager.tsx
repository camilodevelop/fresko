"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, CreditCard, Lock, Pencil } from "lucide-react";
import { quoteDelivery, scheduleDelivery, unscheduleDelivery, updateDelivery, type DeliveryInput } from "@/app/actions/subscriptions";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { MenuItem } from "@/lib/data/products";
import { availableDates, formatDeliveryDate, type ZoneDelivery } from "@/lib/delivery";
import { notify } from "@/lib/notify";
import { isCutoutImage } from "@/lib/product-image";
import { daysBetween, todayBogota, type PlanDelivery, type PlanTerms } from "@/lib/subscriptions";
import type { SubscriptionDetail } from "@/lib/subscriptions-data";
import { cn, formatPrice } from "@/lib/utils";
import { DayEditor, type PlanAddress } from "./DayEditor";
import type { BuilderSetup } from "./DishPicker";
import { PlanCalendar } from "./PlanCalendar";

type Address = PlanAddress & { is_default: boolean };
type Pending = { delivery: PlanDelivery; orderId: string | null; charge: number };

const toInput = (d: PlanDelivery): DeliveryInput => ({
  date: d.date,
  slotId: d.slotId,
  addressId: d.addressId,
  notes: d.notes,
  items: d.dishes.map((x) => ({ slug: x.slug, quantity: x.quantity, options: x.options })),
});

/** Plan activo: calendario, entregas, cambios (con diferencia) y platos por programar. */
export function SubscriptionManager({
  sub,
  products,
  builder,
  addresses,
  deliveryZones,
}: {
  sub: SubscriptionDetail;
  products: MenuItem[];
  builder: BuilderSetup;
  addresses: Address[];
  deliveryZones: ZoneDelivery[];
}) {
  const router = useRouter();
  const today = todayBogota();
  const terms: PlanTerms = { portions: sub.portions, discount: sub.discount, baseValue: sub.baseValue, validityDays: sub.validityDays };
  const active = sub.state === "activa";
  const available = sub.portions - sub.used;
  const daysLeft = daysBetween(today, sub.expiresOn);
  const maxAhead = Math.max(0, daysLeft);

  const defaultAddress = addresses.find((a) => a.is_default && a.zone_id) ?? addresses.find((a) => a.zone_id);
  const zoneOf = (addressId: string | null) => deliveryZones.find((z) => z.id === addresses.find((a) => a.id === addressId)?.zone_id);
  const defaultZone = zoneOf(defaultAddress?.id ?? null);
  const openDays = new Set(
    defaultZone ? availableDates(defaultZone, 400, new Date(), maxAhead).map((d) => d.date).filter((d) => d <= sub.expiresOn) : []
  );

  const byDate = new Map(sub.deliveries.map((d) => [d.date, d]));
  const editable = (d: SubscriptionDetail["deliveries"][number]) => {
    if (!active || d.status !== "confirmado") return false;
    const zone = zoneOf(d.addressId) ?? defaultZone;
    return zone ? availableDates(zone, 400, new Date(), maxAhead).some((x) => x.date === d.date) : false;
  };
  const calendarDays = Object.fromEntries(
    sub.deliveries.map((d) => [
      d.date,
      { count: d.dishes.reduce((s, x) => s + x.quantity, 0), image: d.dishes[0]?.image, locked: !editable(d), delivered: d.status === "entregado" },
    ])
  );

  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [pending, start] = useTransition();
  const current = open ? byDate.get(open) : undefined;

  const finish = (ok: boolean) => {
    if (ok) {
      setOpen(null);
      setConfirm(null);
      router.refresh();
    }
  };

  const save = (delivery: PlanDelivery, orderId: string | null, pay: boolean) =>
    start(async () => {
      const r = orderId ? await updateDelivery(orderId, sub.code, toInput(delivery), pay) : await scheduleDelivery(sub.id, sub.code, toInput(delivery), pay);
      finish(notify(r));
    });

  /** Primero cotiza: si hay diferencia, pide confirmar el pago. */
  const requestSave = (delivery: PlanDelivery, orderId: string | null) =>
    start(async () => {
      const q = await quoteDelivery(sub.id, orderId, toInput(delivery).items);
      if (q.error) return void notify(q);
      if ((q.charge ?? 0) > 0) setConfirm({ delivery, orderId, charge: q.charge ?? 0 });
      else {
        const r = orderId ? await updateDelivery(orderId, sub.code, toInput(delivery), false) : await scheduleDelivery(sub.id, sub.code, toInput(delivery), false);
        finish(notify(r));
      }
    });

  const remove = (orderId: string) =>
    start(async () => {
      finish(notify(await unscheduleDelivery(orderId, sub.code)));
    });

  const upcoming = sub.deliveries.filter((d) => d.date >= today && d.status !== "entregado");
  const past = sub.deliveries.filter((d) => d.date < today || d.status === "entregado");

  return (
    <div className="space-y-6">
      {sub.state === "pendiente_pago" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Este plan está pendiente de pago. Las entregas se confirman cuando pagues.</p>
          <Button size="sm" asChild>
            <Link href={`/pago/suscripcion/${sub.id}`}>
              <CreditCard className="h-4 w-4" /> Pagar {formatPrice(sub.total)}
            </Link>
          </Button>
        </div>
      )}
      {sub.state === "vencida" && (
        <div className="flex items-start gap-3 rounded-3xl border border-[#1F4D36]/10 bg-white p-4 text-sm text-[#1B1B1B]/70">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Este plan venció el {formatDeliveryDate(sub.expiresOn, { day: "numeric", month: "long" })}. Los platos sin programar ya no se pueden usar.{" "}
            <Link href="/#suscripciones" className="font-semibold text-[#1F4D36] underline">
              Compra un plan nuevo
            </Link>
          </p>
        </div>
      )}
      {active && daysLeft <= 7 && available > 0 && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Te quedan <strong>{available} platos</strong> y el plan vence en {daysLeft === 0 ? "hoy" : `${daysLeft} ${daysLeft === 1 ? "día" : "días"}`}. Prográmalos para no
            perderlos.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          { label: "Por programar", value: active ? available : 0, tone: "bg-[#1F4D36] text-white" },
          { label: "Programados", value: sub.used - sub.delivered, tone: "bg-[#E8F3DC] text-[#1F4D36]" },
          { label: "Entregados", value: sub.delivered, tone: "bg-white text-[#1F4D36] ring-1 ring-[#1F4D36]/[0.07]" },
          {
            label: sub.state === "vencida" ? "Venció" : "Vence",
            value: formatDeliveryDate(sub.expiresOn, { day: "numeric", month: "short" }),
            tone: "bg-white text-[#1F4D36] ring-1 ring-[#1F4D36]/[0.07]",
          },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-3xl p-4 sm:p-5", s.tone)}>
            <p className="text-xs font-semibold opacity-70">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Calendario"
          icon={CalendarDays}
          description={active ? "Toca un día libre para programar platos, o una entrega para cambiarla (hasta la hora de corte)." : undefined}
        >
          {defaultZone || sub.deliveries.length ? (
            <PlanCalendar
              from={sub.startsOn > today ? sub.startsOn : today}
              to={sub.expiresOn < today ? today : sub.expiresOn}
              today={today}
              isAvailable={(d) => active && available > 0 && openDays.has(d)}
              days={calendarDays}
              onSelect={setOpen}
            />
          ) : (
            <p className="rounded-2xl bg-[#F8F7F2] p-4 text-sm text-[#1B1B1B]/55">
              Agrega una dirección con cobertura en{" "}
              <Link href="/cuenta/direcciones" className="font-semibold text-[#1F4D36] underline">
                Direcciones
              </Link>{" "}
              para programar tus platos.
            </p>
          )}
        </Panel>

        <div className="space-y-4 xl:sticky xl:top-24">
          <Panel title="Próximas entregas" bodyClassName="p-0">
            {upcoming.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-[#1B1B1B]/50 sm:px-6">{active ? "Aún no tienes entregas programadas." : "Sin entregas pendientes."}</p>
            ) : (
              <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
                {upcoming.map((d) => (
                  <DeliveryRow key={d.orderId} d={d} canEdit={editable(d)} onOpen={() => setOpen(d.date)} />
                ))}
              </ul>
            )}
          </Panel>
          {past.length > 0 && (
            <Panel title="Entregadas" bodyClassName="p-0">
              <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
                {past.map((d) => (
                  <DeliveryRow key={d.orderId} d={d} canEdit={false} onOpen={() => setOpen(d.date)} />
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {/* Día: nuevo, editable o solo lectura */}
      {open && !confirm && (current && !editable(current) ? (
        <Sheet
          title={formatDeliveryDate(open, { weekday: "long", day: "numeric", month: "long" }, true)}
          description={<OrderStatusBadge status={current.status} />}
          onClose={() => setOpen(null)}
          footer={
            <div className="flex justify-end">
              <Button variant="secondary" asChild>
                <Link href={`/cuenta/pedidos/${current.code}`}>Ver seguimiento</Link>
              </Button>
            </div>
          }
        >
          <DishList dishes={current.dishes} />
          <p className="mt-4 flex items-center gap-1.5 text-xs text-[#1B1B1B]/50">
            <Lock className="h-3.5 w-3.5" /> {current.slotLabel} · {current.addressLabel}. Esta entrega ya no se puede cambiar.
          </p>
        </Sheet>
      ) : (
        <DayEditor
          key={open}
          date={open}
          title={current ? `Cambiar entrega · ${formatDeliveryDate(open, { weekday: "short", day: "numeric", month: "short" }, true)}` : undefined}
          initial={
            current
              ? { date: current.date, slotId: current.slotId, addressId: current.addressId ?? defaultAddress?.id ?? "", notes: current.notes, dishes: current.dishes }
              : { date: open, slotId: defaultZone?.slots[0]?.id ?? "", addressId: defaultAddress?.id ?? "", notes: "", dishes: [] }
          }
          addresses={addresses}
          zones={deliveryZones}
          products={products}
          builder={builder}
          terms={terms}
          available={available + (current?.dishes.reduce((s, x) => s + x.quantity, 0) ?? 0)}
          maxAhead={maxAhead}
          saveLabel={current ? "Guardar cambios" : "Programar entrega"}
          pending={pending}
          footerNote={() => (
            <p className="text-[11px] leading-snug text-[#1B1B1B]/45">
              Si eliges platos más caros pagas solo la diferencia, con tu descuento. Si son más económicos no hay reembolso.
            </p>
          )}
          onClose={() => setOpen(null)}
          onRemove={current ? () => remove(current.orderId) : undefined}
          onSave={(d) => requestSave(d, current?.orderId ?? null)}
        />
      ))}

      {confirm && (
        <Sheet
          title="Pagar la diferencia"
          onClose={() => setConfirm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={pending} onClick={() => setConfirm(null)}>
                Volver
              </Button>
              <Button disabled={pending} onClick={() => save(confirm.delivery, confirm.orderId, true)}>
                <CreditCard className="h-4 w-4" /> {pending ? "Procesando…" : `Pagar ${formatPrice(confirm.charge)} y guardar`}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-[#1B1B1B]/70">
            Elegiste platos que superan el valor de tu plan. Con tu descuento del {Math.round(sub.discount * 100)}%, la diferencia es:
          </p>
          <p className="mt-3 font-display text-3xl font-bold text-[#1F4D36]">{formatPrice(confirm.charge)}</p>
          <DishList dishes={confirm.delivery.dishes} className="mt-4" />
          <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">Modo de prueba: no se cobra dinero real.</p>
        </Sheet>
      )}
    </div>
  );
}

function DeliveryRow({ d, canEdit, onOpen }: { d: SubscriptionDetail["deliveries"][number]; canEdit: boolean; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#F8F7F2]/70 sm:px-6">
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#F4F8F2]">
          <Image src={d.dishes[0]?.image ?? "/images/bowl.png"} alt="" fill sizes="40px" className={isCutoutImage(d.dishes[0]?.image) ? "object-contain" : "object-cover"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#1F4D36]">
            {formatDeliveryDate(d.date, { weekday: "short", day: "numeric", month: "short" }, true)}
            <span className="ml-1.5 font-normal text-[#1B1B1B]/45">{d.slotLabel}</span>
          </span>
          <span className="block truncate text-xs text-[#1B1B1B]/50">{d.dishes.map((x) => `${x.quantity}× ${x.name}`).join(", ")}</span>
        </span>
        {canEdit ? <Pencil className="h-4 w-4 shrink-0 text-[#1F4D36]/40" /> : <OrderStatusBadge status={d.status} />}
      </button>
    </li>
  );
}

function DishList({ dishes, className }: { dishes: PlanDelivery["dishes"]; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {dishes.map((x) => (
        <li key={x.key} className="flex items-center gap-3 text-sm">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#F4F8F2]">
            <Image src={x.image} alt="" fill sizes="40px" className={isCutoutImage(x.image) ? "object-contain p-1" : "object-cover"} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-[#1F4D36]">
              {x.quantity}× {x.name}
            </span>
            {x.details && <span className="block truncate text-xs text-[#1B1B1B]/45">{x.details}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
