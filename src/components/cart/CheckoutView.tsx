"use client";

import Image from "next/image";
import { isCutoutImage } from "@/lib/product-image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Lock, MapPin, Minus, Plus, ShoppingBag, Star, Trash2, Truck } from "lucide-react";
import { placeOrder } from "@/app/actions/orders";
import { AddressForm } from "@/components/address/AddressForm";
import { useCart } from "@/components/cart/CartProvider";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { DEFAULT_PHONE_COUNTRY, isValidPhone, toE164, type PhoneValue } from "@/lib/phone";
import { useFormValidation } from "@/hooks/use-form-validation";
import type { CoverageZone } from "@/lib/data/coverage";
import { availableDates, formatDeliveryDate, formatTime12, type ZoneDelivery } from "@/lib/delivery";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";

type Address = {
  id: string;
  label: string;
  address: string;
  details: string;
  zone_id: string | null;
  is_default: boolean;
  zoneName: string | null;
};

export function CheckoutView({
  signedIn,
  isStaff,
  hasPhone,
  addresses,
  deliveryZones,
  coverageZones,
}: {
  signedIn: boolean;
  isStaff: boolean;
  hasPhone: boolean;
  addresses: Address[];
  deliveryZones: ZoneDelivery[];
  coverageZones: CoverageZone[];
}) {
  const router = useRouter();
  const { lines, total, count, ready, setQuantity, removeItem, clear } = useCart();
  const [addressId, setAddressId] = useState(addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? "");
  const [adding, setAdding] = useState(addresses.length === 0);
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState<PhoneValue>({ country: DEFAULT_PHONE_COUNTRY, number: "" });
  const [pending, start] = useTransition();

  const address = addresses.find((a) => a.id === addressId);
  const zone = deliveryZones.find((z) => z.id === address?.zone_id);
  const dates = useMemo(() => (zone ? availableDates(zone, 10) : []), [zone]);
  const effectiveDate = dates.some((d) => d.date === date) ? date : "";
  const effectiveSlot = zone?.slots.some((s) => s.id === slotId) ? slotId : "";

  const v = useFormValidation(
    () => ({
      items: lines.length === 0 ? "Tu carrito está vacío." : null,
      phone: hasPhone
        ? null
        : !phone.number.trim()
          ? "Escribe tu celular para coordinar la entrega."
          : !isValidPhone(phone)
            ? "Ese número no es válido para el país elegido."
            : null,
      address: !addressId ? "Elige o agrega una dirección de entrega." : !zone ? "Esa dirección ya no tiene cobertura. Elige otra." : null,
      date: zone && !effectiveDate ? "Elige el día de entrega." : null,
      slot: zone && !effectiveSlot ? "Elige la franja horaria." : null,
    }),
    () => ({ lines, addressId, zone, effectiveDate, effectiveSlot, phone }),
    "checkout"
  );

  const submit = () =>
    start(async () => {
      const r = await placeOrder({
        phone: hasPhone ? null : toE164(phone),
        addressId,
        date: effectiveDate,
        slotId: effectiveSlot,
        notes,
        items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity, options: l.options })),
      });
      if (notify(r) && r.orderId) {
        clear();
        router.push(`/pago/${r.orderId}`);
      }
    });

  if (!ready) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-[#1B1B1B]/40 sm:px-6">Cargando tu carrito…</div>;
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-[#1F4D36] sm:text-4xl">Tu pedido</h1>
        <div className="mt-8 flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <p className="mt-4 font-display text-lg font-bold text-[#1F4D36]">Tu carrito está vacío</p>
          <p className="mt-1 text-sm text-[#1B1B1B]/55">Agrega ensaladas o bowls del menú, o arma el tuyo.</p>
          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link href="/menu">Ver menú</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/arma-tu-bowl">Arma tu bowl</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-[#1F4D36] sm:text-4xl">Tu pedido</h1>
      <p className="mt-2 text-sm text-[#1B1B1B]/60">Revisa tus productos, elige dónde y cuándo lo recibes, y paga en línea.</p>

      <div {...v.containerProps()} className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Productos */}
          <Panel title={`Productos (${count})`} icon={ShoppingBag}>
            <ul className="divide-y divide-[#1F4D36]/[0.06]">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#F4F8F2]">
                    <Image src={line.image} alt="" fill sizes="64px" className={isCutoutImage(line.image) ? "object-contain p-1.5" : "object-cover"} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-bold text-[#1F4D36]">{line.name}</p>
                        {line.details && <p className="mt-0.5 text-xs leading-relaxed text-[#1B1B1B]/50">{line.details}</p>}
                      </div>
                      <p className="shrink-0 font-semibold text-[#1F4D36]">{formatPrice(line.price * line.quantity)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-full bg-[#F8F7F2] p-1">
                        <button
                          type="button"
                          aria-label={`Quitar uno de ${line.name}`}
                          onClick={() => setQuantity(line.key, line.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#1F4D36] hover:bg-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Agregar uno de ${line.name}`}
                          disabled={line.quantity >= 50}
                          onClick={() => setQuantity(line.key, line.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#1F4D36] hover:bg-white disabled:opacity-30"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(line.key)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1B1B1B]/45 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Quitar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2 border-t border-[#1F4D36]/[0.06] pt-4">
              <Button size="sm" variant="ghost" asChild>
                <Link href="/menu">
                  <Plus className="h-4 w-4" /> Agregar más
                </Link>
              </Button>
            </div>
          </Panel>

          {/* Entrega */}
          {!signedIn ? (
            <Panel title="Entrega" icon={Truck}>
              <div className="flex flex-col items-start gap-3 rounded-2xl bg-[#F8F7F2] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#1F4D36]">Inicia sesión para continuar</p>
                  <p className="text-sm text-[#1B1B1B]/55">Así guardamos tu dirección y puedes seguir tu pedido.</p>
                </div>
                <Button asChild>
                  <Link href="/login?next=/carrito">Iniciar sesión</Link>
                </Button>
              </div>
            </Panel>
          ) : isStaff ? (
            <Panel title="Entrega" icon={Truck}>
              <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                Estás con una cuenta del equipo. Para hacer pedidos usa una cuenta de cliente.
              </p>
            </Panel>
          ) : (
            <>
              <Panel title="¿Dónde lo recibes?" icon={MapPin}>
                {addresses.length > 0 && !adding && (
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Dirección de entrega">
                    {addresses.map((a, i) => {
                      const selected = a.id === addressId;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-invalid={i === 0 && v.error("address") ? true : undefined}
                          onClick={() => {
                            setAddressId(a.id);
                            requestAnimationFrame(v.revalidate);
                          }}
                          className={cn(
                            "rounded-2xl p-4 text-left outline-none ring-1 transition-all focus-visible:ring-2 focus-visible:ring-[#8BC34A]",
                            selected ? "bg-[#F4F8F2] ring-2 ring-[#1F4D36]" : "bg-white ring-[#1F4D36]/10 hover:ring-[#1F4D36]/30",
                            !a.zone_id && "opacity-60"
                          )}
                        >
                          <span className="flex items-center gap-2 font-semibold text-[#1F4D36]">
                            {a.label}
                            {a.is_default && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                          </span>
                          <span className="mt-0.5 block text-sm text-[#1B1B1B]/65">{a.address}</span>
                          {a.details && <span className="block text-xs text-[#1B1B1B]/45">{a.details}</span>}
                          <span className={cn("mt-2 block text-xs font-medium", a.zone_id ? "text-[#2E6B1F]" : "text-red-600")}>
                            {a.zone_id ? `Cobertura · ${a.zoneName}` : "Fuera de cobertura"}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="flex min-h-[110px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1F4D36]/15 text-sm font-semibold text-[#1F4D36]/70 hover:border-[#8BC34A] hover:text-[#1F4D36]"
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
                <FieldError name={v.idFor("address")} error={v.error("address")} />
                {!hasPhone && !adding && (
                  <Field
                    label="Tu celular"
                    name={v.idFor("phone")}
                    error={v.error("phone")}
                    hint="Para avisarte cuando tu pedido vaya en camino. Lo guardamos en tu perfil."
                    className="mt-5 border-t border-[#1F4D36]/[0.06] pt-5"
                  >
                    <PhoneInput
                      value={phone}
                      onChange={(value) => {
                        setPhone(value);
                        if (v.error("phone")) requestAnimationFrame(v.revalidate);
                      }}
                      inputProps={v.field("phone")}
                    />
                  </Field>
                )}
              </Panel>

              {zone && !adding && (
                <Panel title="¿Cuándo lo recibes?" icon={CalendarDays} description={`Para entrega el mismo día, pide antes de las ${formatTime12(zone.cutoffTime)}`}>
                  {dates.length === 0 ? (
                    <p className="text-sm text-[#1B1B1B]/55">No hay fechas disponibles para esta zona en los próximos días.</p>
                  ) : (
                    <Field label="Día" name={v.idFor("date")} error={v.error("date")}>
                      <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Día de entrega">
                        {dates.map((d, i) => {
                          const selected = d.date === effectiveDate;
                          return (
                            <button
                              key={d.date}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              aria-invalid={i === 0 && v.error("date") ? true : undefined}
                              onClick={() => {
                                setDate(d.date);
                                requestAnimationFrame(v.revalidate);
                              }}
                              className={cn(
                                "flex w-[72px] shrink-0 flex-col items-center rounded-2xl py-2.5 outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-[#8BC34A]",
                                selected ? "bg-[#1F4D36] text-white ring-[#1F4D36]" : "bg-white text-[#1F4D36] ring-[#1F4D36]/10 hover:ring-[#1F4D36]/30"
                              )}
                            >
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider", selected ? "text-white/70" : "text-[#1B1B1B]/40")}>
                                {d.isToday ? "Hoy" : d.isTomorrow ? "Mañana" : d.weekday}
                              </span>
                              <span className="font-display text-xl font-bold leading-tight">{d.day}</span>
                              <span className={cn("text-[10px] font-semibold uppercase", selected ? "text-white/70" : "text-[#1B1B1B]/40")}>{d.month}</span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  )}
                  <Field label="Franja horaria" name={v.idFor("slot")} error={v.error("slot")} className="mt-5">
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Franja horaria">
                      {zone.slots.map((s, i) => {
                        const selected = s.id === effectiveSlot;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-invalid={i === 0 && v.error("slot") ? true : undefined}
                            onClick={() => {
                              setSlotId(s.id);
                              requestAnimationFrame(v.revalidate);
                            }}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-[#8BC34A]",
                              selected ? "bg-[#1F4D36] text-white ring-[#1F4D36]" : "bg-white text-[#1F4D36] ring-[#1F4D36]/10 hover:ring-[#1F4D36]/30"
                            )}
                          >
                            <Clock className="h-4 w-4" /> {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Notas para la entrega" optional name={v.idFor("notes")} className="mt-5" hint={`${notes.length}/300`}>
                    <textarea
                      {...v.field("notes")}
                      value={notes}
                      maxLength={300}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Timbre, portería, referencia…"
                      className="min-h-20 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm text-[#1B1B1B] outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
                    />
                  </Field>
                </Panel>
              )}
            </>
          )}
        </div>

        {/* Resumen */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <Panel title="Resumen">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">Productos ({count})</dt>
                <dd className="font-medium text-[#1F4D36]">{formatPrice(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">Domicilio</dt>
                <dd className="font-medium text-[#2E6B1F]">Gratis</dd>
              </div>
              <div className="flex justify-between border-t border-[#1F4D36]/[0.06] pt-3 font-display text-lg font-bold text-[#1F4D36]">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
            {effectiveDate && effectiveSlot && zone && (
              <p className="mt-4 rounded-2xl bg-[#F4F8F2] p-3 text-xs text-[#1F4D36]">
                Entrega el <strong>{formatDeliveryDate(effectiveDate)}</strong> entre{" "}
                <strong>{zone.slots.find((s) => s.id === effectiveSlot)?.label}</strong>
                {address ? ` en ${address.label}` : ""}.
              </p>
            )}
            <FieldError name={v.idFor("items")} error={v.error("items")} />
            {signedIn && !isStaff ? (
              <Button className="mt-5 w-full" size="lg" type="button" disabled={pending || adding} onClick={() => v.submit(submit)}>
                <Lock className="h-4 w-4" />
                {pending ? "Creando pedido…" : "Continuar al pago"}
              </Button>
            ) : (
              <Button className="mt-5 w-full" size="lg" asChild>
                <Link href="/login?next=/carrito">Iniciar sesión para pedir</Link>
              </Button>
            )}
            <p className="mt-3 text-center text-[11px] leading-snug text-[#1B1B1B]/40">
              El total final se confirma con los precios vigentes al pagar. Al continuar aceptas los{" "}
              <Link href="/legal/terminos" target="_blank" className="underline">
                Términos y condiciones
              </Link>
              .
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
