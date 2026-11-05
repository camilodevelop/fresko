"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Lock, MapPin, Pencil, Plus, Sparkles } from "lucide-react";
import { purchaseSubscription } from "@/app/actions/subscriptions";
import { AddressForm } from "@/components/address/AddressForm";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import type { CoverageZone } from "@/lib/data/coverage";
import type { MenuItem } from "@/lib/data/products";
import { availableDates, formatDeliveryDate, formatTime12, type ZoneDelivery } from "@/lib/delivery";
import { notify } from "@/lib/notify";
import { DEFAULT_PHONE_COUNTRY, isValidPhone, toE164, type PhoneValue } from "@/lib/phone";
import { isCutoutImage } from "@/lib/product-image";
import { addDaysIso, planPurchaseTotal, todayBogota, type PlanDelivery, type PlanTerms } from "@/lib/subscriptions";
import { cn, formatPrice } from "@/lib/utils";
import { DayEditor, type PlanAddress } from "./DayEditor";
import type { BuilderSetup } from "./DishPicker";
import { PlanCalendar } from "./PlanCalendar";

export type PlannerPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  portions: number;
  discount: number;
  validityDays: number;
  benefits: string[];
};

type Address = PlanAddress & { details: string; is_default: boolean; zoneName: string | null };

const draftKey = (slug: string) => `fresko_plan_${slug}`;

function loadDraft(slug: string): Record<string, PlanDelivery> {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    const parsed = raw ? (JSON.parse(raw) as Record<string, PlanDelivery>) : {};
    const today = todayBogota();
    // Los días que ya pasaron se descartan.
    return Object.fromEntries(Object.entries(parsed).filter(([date]) => date >= today));
  } catch {
    return {};
  }
}

/** Compra de un plan: dirección, calendario con los platos de cada día y pago. */
export function SubscriptionPlanner({
  plan,
  baseValue,
  products,
  builder,
  addresses,
  deliveryZones,
  coverageZones,
  hasPhone,
}: {
  plan: PlannerPlan;
  baseValue: number;
  products: MenuItem[];
  builder: BuilderSetup;
  addresses: Address[];
  deliveryZones: ZoneDelivery[];
  coverageZones: CoverageZone[];
  hasPhone: boolean;
}) {
  const router = useRouter();
  const terms: PlanTerms = { portions: plan.portions, discount: plan.discount, baseValue, validityDays: plan.validityDays };
  const today = todayBogota();
  const lastDay = addDaysIso(today, plan.validityDays);

  // Este componente solo se monta en el navegador: el borrador se lee de una vez.
  const [deliveries, setDeliveries] = useState<Record<string, PlanDelivery>>(() => loadDraft(plan.slug));
  const [addressId, setAddressId] = useState(addresses.find((a) => a.is_default && a.zone_id)?.id ?? addresses.find((a) => a.zone_id)?.id ?? "");
  const [slotId, setSlotId] = useState("");
  const [adding, setAdding] = useState(addresses.length === 0);
  const [editing, setEditing] = useState<string | null>(null);
  const [phone, setPhone] = useState<PhoneValue>({ country: DEFAULT_PHONE_COUNTRY, number: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    window.localStorage.setItem(draftKey(plan.slug), JSON.stringify(deliveries));
  }, [deliveries, plan.slug]);

  const address = addresses.find((a) => a.id === addressId);
  const zone = deliveryZones.find((z) => z.id === address?.zone_id);
  const effectiveSlot = zone?.slots.some((s) => s.id === slotId) ? slotId : (zone?.slots[0]?.id ?? "");
  const openDays = useMemo(
    () => new Set(zone ? availableDates(zone, 400, new Date(), plan.validityDays).map((d) => d.date).filter((d) => d <= lastDay) : []),
    [zone, plan.validityDays, lastDay]
  );

  const list = Object.values(deliveries).sort((a, b) => a.date.localeCompare(b.date));
  const totals = planPurchaseTotal(list, terms);
  const over = totals.used > plan.portions;
  const calendarDays = Object.fromEntries(
    list.map((d) => [d.date, { count: d.dishes.reduce((s, x) => s + x.quantity, 0), image: d.dishes[0]?.image }])
  );

  const editingDelivery = editing ? (deliveries[editing] ?? { date: editing, slotId: effectiveSlot, addressId, notes: "", dishes: [] }) : null;
  const usedElsewhere = editing ? totals.used - (deliveries[editing]?.dishes.reduce((s, x) => s + x.quantity, 0) ?? 0) : totals.used;

  const submit = () => {
    setError(null);
    if (!address || !zone) return setError("Elige una dirección con cobertura.");
    if (over) return setError(`Programaste ${totals.used} platos y el plan tiene ${plan.portions}.`);
    if (!hasPhone && !isValidPhone(phone)) return setError("Escribe un celular válido para coordinar las entregas.");
    start(async () => {
      const r = await purchaseSubscription({
        planId: plan.id,
        phone: hasPhone ? null : toE164(phone),
        deliveries: list.map((d) => ({
          date: d.date,
          slotId: d.slotId,
          addressId: d.addressId,
          notes: d.notes,
          items: d.dishes.map((x) => ({ slug: x.slug, quantity: x.quantity, options: x.options })),
        })),
      });
      if (notify(r) && r.subscriptionId) {
        window.localStorage.removeItem(draftKey(plan.slug));
        router.push(`/pago/suscripcion/${r.subscriptionId}`);
      } else if (r.error) setError(r.error);
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <Link href="/#suscripciones" className="text-xs font-semibold text-[#1F4D36]/60 hover:text-[#1F4D36]">
        ← Ver todos los planes
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold text-[#1F4D36] sm:text-4xl">Arma tu {plan.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#1B1B1B]/60">
        {plan.portions} platos con {Math.round(plan.discount * 100)}% de descuento. Elige los días y los platos que quieres; lo que no programes ahora
        lo programas después, hasta el {formatDeliveryDate(lastDay, { day: "numeric", month: "long" })}.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel title="¿Dónde te entregamos?" icon={MapPin} description="Se usa en cada entrega nueva. Puedes cambiarla en un día específico.">
            {addresses.length > 0 && !adding && (
              <div className="grid gap-2 sm:grid-cols-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={!a.zone_id}
                    onClick={() => setAddressId(a.id)}
                    className={cn(
                      "rounded-2xl border-2 p-3 text-left text-sm transition disabled:opacity-45",
                      addressId === a.id ? "border-[#8BC34A] bg-[#F4F8F2]" : "border-[#1F4D36]/10 hover:border-[#1F4D36]/25"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold text-[#1F4D36]">
                      {a.label}
                      {addressId === a.id && <Check className="h-4 w-4 text-[#7CB342]" />}
                    </span>
                    <span className="block truncate text-xs text-[#1B1B1B]/55">{a.address}</span>
                    <span className={cn("text-[11px] font-medium", a.zone_id ? "text-[#2E6B1F]" : "text-red-600")}>
                      {a.zone_id ? `Cobertura · ${a.zoneName}` : "Sin cobertura"}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#1F4D36]/15 p-3 text-sm font-semibold text-[#1F4D36] hover:border-[#8BC34A]"
                >
                  <Plus className="h-4 w-4" /> Nueva dirección
                </button>
              </div>
            )}
            {adding && (
              <AddressForm
                zones={coverageZones}
                initial={{ isDefault: addresses.length === 0 }}
                submitLabel="Guardar y usar esta dirección"
                onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
                onSaved={(id) => {
                  setAddressId(id);
                  setAdding(false);
                  router.refresh();
                }}
              />
            )}
            {zone && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Franja habitual</p>
                <div className="flex flex-wrap gap-2">
                  {zone.slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={effectiveSlot === s.id}
                      onClick={() => setSlotId(s.id)}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                        effectiveSlot === s.id ? "border-[#1F4D36] bg-[#1F4D36] text-white" : "border-[#1F4D36]/15 text-[#1F4D36] hover:border-[#8BC34A]"
                      )}
                    >
                      {formatTime12(s.start)} – {formatTime12(s.end)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[#1B1B1B]/45">
                  Pedidos y cambios hasta las {formatTime12(zone.cutoffTime)} del día de la entrega.
                </p>
              </div>
            )}
          </Panel>

          <Panel
            title="Tu calendario"
            icon={CalendarDays}
            description="Toca un día para elegir tus platos. Puedes pedir varios el mismo día."
          >
            {zone ? (
              <PlanCalendar from={today} to={lastDay} today={today} isAvailable={(d) => openDays.has(d)} days={calendarDays} onSelect={setEditing} />
            ) : (
              <p className="rounded-2xl bg-[#F8F7F2] p-4 text-sm text-[#1B1B1B]/55">Primero elige o agrega una dirección con cobertura.</p>
            )}
          </Panel>
        </div>

        {/* Resumen */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <Panel title={plan.name} icon={Sparkles} description={`${plan.portions} platos · −${Math.round(plan.discount * 100)}% en todo`}>
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-[#1F4D36]">
                  {totals.used} de {plan.portions} platos programados
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF3EA]">
                <div
                  className={cn("h-full rounded-full transition-all", over ? "bg-red-500" : "bg-[#8BC34A]")}
                  style={{ width: `${Math.min(100, (totals.used / plan.portions) * 100)}%` }}
                />
              </div>
              {totals.free > 0 && (
                <p className="mt-2 text-[11px] text-[#1B1B1B]/50">
                  Los {totals.free} platos que no programes ahora quedan disponibles hasta el {formatDeliveryDate(lastDay, { day: "numeric", month: "short" })}.
                </p>
              )}
            </div>

            {list.length > 0 && (
              <ul className="mt-4 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {list.map((d) => (
                  <li key={d.date}>
                    <button
                      type="button"
                      onClick={() => setEditing(d.date)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-[#F4F8F2]"
                    >
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#F4F8F2]">
                        <Image src={d.dishes[0]?.image ?? "/images/bowl.png"} alt="" fill sizes="36px" className={isCutoutImage(d.dishes[0]?.image) ? "object-contain" : "object-cover"} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#1F4D36]">{formatDeliveryDate(d.date, { weekday: "short", day: "numeric", month: "short" }, true)}</span>
                        <span className="block truncate text-[11px] text-[#1B1B1B]/45">{d.dishes.map((x) => `${x.quantity}× ${x.name}`).join(", ")}</span>
                      </span>
                      <Pencil className="h-3.5 w-3.5 shrink-0 text-[#1F4D36]/40" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-4 space-y-1.5 border-t border-[#1F4D36]/[0.06] pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">{plan.portions} platos × {formatPrice(baseValue)}</dt>
                <dd>{formatPrice(plan.portions * baseValue)}</dd>
              </div>
              {totals.extras > 0 && (
                <div className="flex justify-between">
                  <dt className="text-[#1B1B1B]/55">Platos premium</dt>
                  <dd>+{formatPrice(totals.extras)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">Descuento {Math.round(plan.discount * 100)}%</dt>
                <dd className="text-[#2E6B1F]">−{formatPrice(totals.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">Domicilios</dt>
                <dd className="text-[#2E6B1F]">Incluidos</dd>
              </div>
              <div className="flex justify-between pt-1 font-display text-xl font-bold text-[#1F4D36]">
                <dt>Total</dt>
                <dd>{formatPrice(totals.total)}</dd>
              </div>
            </dl>

            {!hasPhone && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Tu celular</p>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button className="mt-4 hidden w-full lg:flex" size="lg" type="button" disabled={pending || over} onClick={submit}>
              <Lock className="h-4 w-4" /> {pending ? "Creando tu plan…" : "Continuar al pago"}
            </Button>
            <p className="mt-3 text-center text-[11px] leading-snug text-[#1B1B1B]/40">
              Al continuar aceptas los <Link href="/legal/terminos" className="underline">Términos y condiciones</Link>. Los platos sin usar al terminar la vigencia se pierden.
            </p>
          </Panel>
        </div>
      </div>

      {/* Barra fija en móvil */}
      <div className="h-20 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1F4D36]/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(31,77,54,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-[#1F4D36]">{formatPrice(totals.total)}</p>
            <p className="truncate text-[11px] text-[#1B1B1B]/50">
              {totals.used} de {plan.portions} platos programados
            </p>
          </div>
          <Button type="button" disabled={pending || over} onClick={submit}>
            <Lock className="h-4 w-4" /> {pending ? "Creando…" : "Pagar"}
          </Button>
        </div>
      </div>

      {editingDelivery && (
        <DayEditor
          key={editingDelivery.date}
          date={editingDelivery.date}
          initial={editingDelivery}
          addresses={addresses}
          zones={deliveryZones}
          products={products}
          builder={builder}
          terms={terms}
          available={plan.portions - usedElsewhere}
          maxAhead={plan.validityDays}
          onClose={() => setEditing(null)}
          onRemove={
            deliveries[editingDelivery.date]
              ? () => {
                  setDeliveries((all) => {
                    const next = { ...all };
                    delete next[editingDelivery.date];
                    return next;
                  });
                  setEditing(null);
                }
              : undefined
          }
          onSave={(d) => {
            setDeliveries((all) => ({ ...all, [d.date]: d }));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
