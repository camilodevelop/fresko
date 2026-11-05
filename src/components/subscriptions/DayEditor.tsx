"use client";

import Image from "next/image";
import { useState } from "react";
import { Clock, MapPin, Minus, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/data/products";
import { availableDates, formatDeliveryDate, formatTime12, type ZoneDelivery } from "@/lib/delivery";
import { isCutoutImage } from "@/lib/product-image";
import type { PlanDelivery, PlanDish, PlanTerms } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import { DishPicker, PlanPriceTag, type BuilderSetup } from "./DishPicker";

export type PlanAddress = { id: string; label: string; address: string; zone_id: string | null };

/**
 * Editor de un día del plan: platos (con cantidad), franja, dirección y notas.
 * `onSave` puede ser asíncrono (cuando guarda en el servidor) y devolver false si falló.
 */
export function DayEditor({
  date,
  initial,
  addresses,
  zones,
  products,
  builder,
  terms,
  available,
  maxAhead,
  title,
  saveLabel = "Listo",
  pending = false,
  footerNote,
  onSave,
  onRemove,
  onClose,
}: {
  date: string;
  initial: PlanDelivery;
  addresses: PlanAddress[];
  zones: ZoneDelivery[];
  products: MenuItem[];
  builder: BuilderSetup;
  terms: PlanTerms;
  /** Platos que se pueden usar en esta entrega (los libres del plan + los que ya tiene). */
  available: number;
  maxAhead: number;
  title?: string;
  saveLabel?: string;
  pending?: boolean;
  footerNote?: (dishes: PlanDish[]) => React.ReactNode;
  onSave: (delivery: PlanDelivery) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const [dishes, setDishes] = useState<PlanDish[]>(initial.dishes);
  const [slotId, setSlotId] = useState(initial.slotId);
  const [addressId, setAddressId] = useState(initial.addressId);
  const [notes, setNotes] = useState(initial.notes);
  const [picking, setPicking] = useState(initial.dishes.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const count = dishes.reduce((s, d) => s + d.quantity, 0);
  const remaining = available - count;
  const address = addresses.find((a) => a.id === addressId);
  const zone = zones.find((z) => z.id === address?.zone_id);
  const slots = zone?.slots ?? [];
  const effectiveSlot = slots.some((s) => s.id === slotId) ? slotId : "";
  const dayOpen = zone ? availableDates(zone, 400, new Date(), maxAhead).some((d) => d.date === date) : false;

  const add = (dish: PlanDish) => {
    setError(null);
    setDishes((list) => {
      const same = !dish.options && list.find((d) => d.slug === dish.slug && !d.options);
      return same ? list.map((d) => (d === same ? { ...d, quantity: d.quantity + 1 } : d)) : [...list, dish];
    });
    setPicking(false);
  };

  const setQty = (key: string, q: number) => setDishes((list) => (q <= 0 ? list.filter((d) => d.key !== key) : list.map((d) => (d.key === key ? { ...d, quantity: q } : d))));

  const save = () => {
    if (dishes.length === 0) return setError("Agrega al menos un plato.");
    if (!address) return setError("Elige la dirección de entrega.");
    if (!zone) return setError("Esa dirección no tiene cobertura.");
    if (!dayOpen) return setError("En esa dirección no hay reparto este día (o ya pasó la hora de corte).");
    if (!effectiveSlot) return setError("Elige la franja horaria.");
    if (remaining < 0) return setError(`Te quedan ${available} platos para esta entrega.`);
    onSave({ date, slotId: effectiveSlot, addressId, notes: notes.trim(), dishes });
  };

  return (
    <Sheet
      title={title ?? formatDeliveryDate(date, { weekday: "long", day: "numeric", month: "long" }, true)}
      description={
        <span>
          {count} {count === 1 ? "plato" : "platos"} en esta entrega · te quedan <strong className="text-[#1F4D36]">{Math.max(0, remaining)}</strong>
        </span>
      }
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
          {footerNote?.(dishes)}
          <div className="flex items-center justify-between gap-2">
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-700 hover:bg-red-50"
                disabled={pending}
                onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
              >
                <Trash2 className="h-4 w-4" /> {confirmRemove ? "¿Seguro? Toca para quitarla" : "Quitar entrega"}
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" disabled={pending} onClick={save}>
              {pending ? "Guardando…" : saveLabel}
            </Button>
          </div>
        </div>
      }
    >
      {/* Platos */}
      {dishes.length > 0 && (
        <ul className="space-y-2">
          {dishes.map((d) => (
            <li key={d.key} className="flex items-center gap-3 rounded-2xl border border-[#1F4D36]/[0.08] p-2 pr-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F4F8F2]">
                <Image src={d.image} alt="" fill sizes="48px" className={isCutoutImage(d.image) ? "object-contain p-1" : "object-cover"} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#1F4D36]">{d.name}</span>
                {d.details && <span className="block truncate text-[11px] text-[#1B1B1B]/45">{d.details}</span>}
                <PlanPriceTag price={d.price} terms={terms} />
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Quitar uno"
                  onClick={() => setQty(d.key, d.quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1F4D36]/15 text-[#1F4D36] hover:bg-[#F4F8F2]"
                >
                  {d.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </button>
                <span className="w-6 text-center text-sm font-semibold">{d.quantity}</span>
                <button
                  type="button"
                  aria-label="Agregar uno"
                  disabled={remaining <= 0}
                  onClick={() => setQty(d.key, d.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1F4D36]/15 text-[#1F4D36] hover:bg-[#F4F8F2] disabled:opacity-30"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {picking ? (
        <div className={cn(dishes.length > 0 && "mt-5")}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Elige un plato</p>
            {dishes.length > 0 && (
              <button type="button" onClick={() => setPicking(false)} className="text-xs font-semibold text-[#1F4D36]/70 hover:text-[#1F4D36]">
                Cerrar menú
              </button>
            )}
          </div>
          <DishPicker products={products} builder={builder} terms={terms} onPick={add} remaining={remaining} />
        </div>
      ) : (
        <button
          type="button"
          disabled={remaining <= 0}
          onClick={() => setPicking(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#1F4D36]/15 py-3 text-sm font-semibold text-[#1F4D36] hover:border-[#8BC34A] hover:bg-[#F4F8F2] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> {remaining > 0 ? "Agregar otro plato" : "No te quedan platos"}
        </button>
      )}

      {/* Dónde y cuándo */}
      <div className="mt-6 space-y-4 border-t border-[#1F4D36]/[0.06] pt-5">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">
            <Clock className="h-3.5 w-3.5" /> Franja
          </p>
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
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
            {slots.length === 0 && <p className="text-sm text-[#1B1B1B]/45">Elige una dirección con cobertura.</p>}
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">
            <MapPin className="h-3.5 w-3.5" /> Dirección
          </p>
          <select
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            className="h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm"
            aria-label="Dirección de entrega"
          >
            {addresses.map((a) => (
              <option key={a.id} value={a.id} disabled={!a.zone_id}>
                {a.label} · {a.address}
                {!a.zone_id ? " (sin cobertura)" : ""}
              </option>
            ))}
          </select>
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Notas (opcional)</span>
          <input
            value={notes}
            maxLength={300}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Timbre, portería…"
            className="h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
          />
        </label>
      </div>
    </Sheet>
  );
}
