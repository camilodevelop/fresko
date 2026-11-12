"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, LogOut, Minus, Plus, Settings, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { KioskBuilder } from "@/components/counter/KioskBuilder";
import { KioskProductSheet } from "@/components/counter/KioskProductSheet";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";
import type { CounterCatalog, CounterProduct } from "@/lib/counter";
import { placeKioskOrder } from "@/app/admin/mostrador/actions";
import { signOut } from "@/app/actions/auth";

type Line = { key: string; slug: string; name: string; price: number; quantity: number; options?: string[]; details?: string };

/** Si nadie toca la pantalla en este tiempo, se borra el pedido a medias. */
const IDLE_MS = 120_000;
/** Tiempo que se muestra el código antes de volver al inicio. */
const DONE_MS = 25_000;

/** Pantalla táctil del mostrador: el cliente arma su pedido y paga en caja. */
export function KioskScreen({
  kitchenId,
  kitchenName,
  catalog,
  canPanel = false,
}: {
  kitchenId: string;
  kitchenName: string;
  catalog: CounterCatalog;
  /** Personal con panel (cajero, admin): muestra "Volver al panel". */
  canPanel?: boolean;
}) {
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<Line[]>([]);
  const [category, setCategory] = useState("todas");
  const [building, setBuilding] = useState<{ slug: string; name: string; price: number } | null>(null);
  const [detail, setDetail] = useState<CounterProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [done, setDone] = useState<{ code: string; name: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setLines([]);
    setName("");
    setCartOpen(false);
    setBuilding(null);
    setDetail(null);
    setDone(null);
    setCategory("todas");
  };

  // Cada toque en la pantalla reinicia la cuenta de inactividad.
  const [touch, setTouch] = useState(0);
  useEffect(() => {
    const bump = () => setTouch((t) => t + 1);
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, []);

  // Reinicio por inactividad (pedido, armador o detalle a medias) y al terminar (código en pantalla).
  useEffect(() => {
    if (idle.current) clearTimeout(idle.current);
    if (done) idle.current = setTimeout(reset, DONE_MS);
    else if (lines.length || name || building || detail || cartOpen) idle.current = setTimeout(reset, IDLE_MS);
    return () => {
      if (idle.current) clearTimeout(idle.current);
    };
  }, [lines, name, done, cartOpen, building, detail, touch]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of catalog.products) seen.set(p.category, p.categoryName);
    return [...seen.entries()];
  }, [catalog.products]);
  const shown = catalog.products.filter((p) => category === "todas" || p.category === category);
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  const add = (p: { slug: string; name: string; price: number }, options?: string[], details?: string, quantity = 1) =>
    setLines((prev) => {
      if (!options) {
        const found = prev.find((l) => l.slug === p.slug && !l.options);
        if (found) return prev.map((l) => (l === found ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l));
      }
      return [...prev, { key: `${p.slug}-${Date.now()}`, slug: p.slug, name: p.name, price: p.price, quantity, options, details }];
    });
  const bump = (key: string, d: number) =>
    setLines((prev) => prev.flatMap((l) => (l.key !== key ? [l] : l.quantity + d <= 0 ? [] : [{ ...l, quantity: Math.min(20, l.quantity + d) }])));

  const send = () =>
    start(async () => {
      const r = await placeKioskOrder({
        kitchenId,
        items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity, options: l.options })),
        name,
      });
      if (r.code) {
        setCartOpen(false);
        setDone({ code: r.code, name: name.trim() });
      } else notify(r);
    });

  if (done) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#1F4D36] px-6 text-center text-white">
        <CheckCircle2 className="h-20 w-20 text-[#C5E1A5]" />
        <p className="mt-6 text-lg text-white/75">¡Listo, {done.name}! Tu pedido es el</p>
        <p className="mt-2 font-display text-7xl font-bold tracking-tight sm:text-8xl">{done.code}</p>
        <p className="mt-8 max-w-md text-xl leading-relaxed">
          Acércate a la <strong>caja</strong> para pagar. Lo preparamos apenas pagues y te llamamos por tu nombre.
        </p>
        <Button variant="fresh" size="lg" className="mt-10 h-14 px-10 text-lg" onClick={reset}>
          Hacer otro pedido
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F8F7F2] pb-32">
      <header className="sticky top-0 z-30 border-b border-[#1F4D36]/[0.07] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-[#1F4D36]">FRESKO</p>
            <p className="text-sm text-[#1B1B1B]/55">Pide aquí y paga en caja · {kitchenName}</p>
          </div>
          <div className="flex items-center gap-4">
            {lines.length > 0 && (
              <button type="button" onClick={reset} className="text-sm font-semibold text-[#1B1B1B]/50 hover:text-red-700">
                Empezar de nuevo
              </button>
            )}
            {/* Discreto: para el personal (cerrar sesión de la pantalla o volver al panel). */}
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-label="Opciones de la pantalla"
              className="rounded-full p-2 text-[#1B1B1B]/25 transition hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 pb-4">
          {[["todas", "Todo"] as [string, string], ...categories].map(([slug, label]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setCategory(slug)}
              className={cn(
                "shrink-0 rounded-full px-6 py-3 text-base font-semibold transition",
                category === slug ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 pt-5 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => {
          const inCart = lines.filter((l) => l.slug === p.slug).reduce((s, l) => s + l.quantity, 0);
          return (
            <div
              key={p.slug}
              className={cn(
                "relative overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition",
                inCart ? "border-[#8BC34A]" : "border-transparent"
              )}
            >
              {inCart > 0 && (
                <span className="absolute left-3 top-3 z-10 flex h-9 min-w-9 items-center justify-center rounded-full bg-[#8BC34A] px-2 text-base font-bold text-[#1F4D36] shadow">
                  {inCart}
                </span>
              )}
              {/* Tocar el plato abre su detalle (o el armador); el "+" lo agrega de una vez. */}
              <button type="button" onClick={() => (p.builder ? setBuilding(p) : setDetail(p))} className="block w-full text-left active:scale-[0.98]">
                <span className="relative block aspect-square bg-[#F4F8F2]">
                  <Image src={p.image} alt="" fill sizes="(min-width: 1024px) 280px, 45vw" className="object-cover" />
                  {p.tag && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[#1F4D36]">{p.tag}</span>}
                </span>
                <span className="block p-4 pr-16">
                  <span className="line-clamp-2 font-display text-lg font-bold leading-tight text-[#1F4D36]">{p.name}</span>
                  <span className="mt-1 block text-base text-[#1B1B1B]/60">
                    {p.builder ? `Desde ${formatPrice(p.price)}` : formatPrice(p.price)}
                    {!p.builder && p.nutrition ? <span className="text-sm text-[#1B1B1B]/40"> · {Math.round(p.nutrition.kcal)} kcal</span> : null}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-[#7CB342]">{p.builder ? "Toca para armarlo a tu gusto" : "Toca para ver qué lleva"}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label={p.builder ? `Armar ${p.name}` : `Agregar ${p.name}`}
                onClick={() => (p.builder ? setBuilding(p) : add(p))}
                className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1F4D36] text-white shadow-lg active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          );
        })}
      </div>

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1F4D36]/10 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(31,77,54,0.1)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-bold text-[#1F4D36]">{formatPrice(total)}</p>
              <p className="text-sm text-[#1B1B1B]/55">
                {count} {count === 1 ? "producto" : "productos"}
              </p>
            </div>
            <Button size="lg" className="h-14 px-10 text-lg" onClick={() => setCartOpen(true)}>
              <ShoppingBag className="h-5 w-5" />
              Ver mi pedido
            </Button>
          </div>
        </div>
      )}

      {building && (
        <KioskBuilder
          name={building.name}
          options={catalog.builderOptions}
          basePrice={building.price}
          onClose={() => setBuilding(null)}
          onDone={(b) => {
            add({ slug: building.slug, name: `${building.name} (personalizado)`, price: b.price }, b.optionIds, b.names.join(", "));
            setBuilding(null);
          }}
        />
      )}

      {detail && (
        <KioskProductSheet
          product={detail}
          onClose={() => setDetail(null)}
          onAdd={(q) => {
            add(detail, undefined, undefined, q);
            setDetail(null);
          }}
        />
      )}

      {menu && (
        <Sheet title="Opciones de la pantalla" description="Solo para el personal de FRESKO." onClose={() => setMenu(false)}>
          <div className="space-y-3">
            {canPanel && (
              <Link
                href="/admin/mostrador"
                className="flex h-12 w-full items-center justify-center rounded-full border-2 border-[#1F4D36] text-sm font-semibold text-[#1F4D36] hover:bg-[#1F4D36]/5"
              >
                Volver al panel
              </Link>
            )}
            <form action={signOut}>
              <Button type="submit" className="w-full" size="lg">
                <LogOut className="h-4 w-4" />
                Cerrar sesión de esta pantalla
              </Button>
            </form>
          </div>
        </Sheet>
      )}

      {cartOpen && (
        <Sheet
          title="Tu pedido"
          description="Revisa y escribe tu nombre: te llamamos cuando esté listo."
          onClose={() => setCartOpen(false)}
          footer={
            <Button size="lg" className="h-14 w-full text-lg" disabled={pending || !lines.length || name.trim().length < 2} onClick={send}>
              Enviar pedido · {formatPrice(total)}
            </Button>
          }
        >
          <ul className="divide-y divide-[#1F4D36]/[0.06]">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-[#1F4D36]">{l.name}</p>
                  {l.details && <p className="text-xs text-[#1B1B1B]/50">{l.details}</p>}
                  <p className="text-sm text-[#1B1B1B]/60">{formatPrice(l.price * l.quantity)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Quitar uno" onClick={() => bump(l.key, -1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F8F2] text-[#1F4D36]">
                    {l.quantity === 1 ? <Trash2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                  </button>
                  <span className="w-6 text-center text-lg font-bold">{l.quantity}</span>
                  <button type="button" aria-label="Agregar uno" onClick={() => bump(l.key, 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F8F2] text-[#1F4D36]">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <label htmlFor="kiosk-name" className="mt-5 block text-sm font-semibold text-[#1B1B1B]/70">
            Tu nombre
          </label>
          <Input id="kiosk-name" className="mt-2 h-14 text-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Laura" maxLength={40} autoComplete="off" />
          <p className="mt-4 rounded-2xl bg-[#F4F8F2] px-4 py-3 text-sm text-[#1F4D36]">El pago se hace en la caja. Preparamos tu pedido apenas pagues.</p>
        </Sheet>
      )}
    </main>
  );
}
