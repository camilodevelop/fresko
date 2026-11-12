"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ChefHat, Clock, HandPlatter, Lock, Minus, Monitor, Plus, ReceiptText, Trash2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Panel, StatusBadge, fieldLabelClass } from "@/components/dashboard/ui";
import { CounterBuilder } from "@/components/counter/CounterBuilder";
import { notify, toast } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";
import type { CashSessionView, CounterCatalog, CounterOrder, PaymentMethod } from "@/lib/counter";
import {
  cancelCounterOrder,
  chargeOrder,
  closeCash,
  deliverCounterOrder,
  openCash,
  sellAtCounter,
} from "@/app/admin/mostrador/actions";

type Line = { key: string; slug: string; name: string; price: number; quantity: number; options?: string[]; details?: string; /** De la vitrina (ya preparado). */ stock?: boolean };

const money = (v: string) => Number(v.replace(/\D/g, "") || 0);
const showMoney = (n: number) => (n ? new Intl.NumberFormat("es-CO").format(n) : "");
/** Hora de Bogotá (UTC−5) igual en servidor y navegador (Intl varía entre motores y rompe la hidratación). */
export const time = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 5 * 3_600_000);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
};

export function MoneyField({ value, onChange, label, autoFocus, id }: { value: number; onChange: (n: number) => void; label: string; autoFocus?: boolean; id: string }) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/45">$</span>
        <Input id={id} inputMode="numeric" autoFocus={autoFocus} className="pl-8 text-base font-semibold" value={showMoney(value)} onChange={(e) => onChange(money(e.target.value))} />
      </div>
    </div>
  );
}

/** Elegir método, recibido y referencia: se usa en la venta nueva y al cobrar un pedido de la pantalla. */
export function PaymentPicker({
  methods,
  total,
  methodId,
  setMethodId,
  received,
  setReceived,
  reference,
  setReference,
}: {
  methods: PaymentMethod[];
  total: number;
  methodId: string | null;
  setMethodId: (id: string) => void;
  received: number;
  setReceived: (n: number) => void;
  reference: string;
  setReference: (s: string) => void;
}) {
  const method = methods.find((m) => m.id === methodId);
  const quick = [...new Set([total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 20000) * 20000, 50000, 100000])].filter((v) => v >= total).slice(0, 4);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethodId(m.id)}
            aria-pressed={methodId === m.id}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-semibold transition",
              methodId === m.id ? "border-[#1F4D36] bg-[#1F4D36] text-white" : "border-[#1F4D36]/10 bg-white text-[#1F4D36] hover:border-[#8BC34A]"
            )}
          >
            {m.kind === "efectivo" ? <Banknote className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            {m.name}
          </button>
        ))}
      </div>
      {method?.kind === "efectivo" && (
        <div className="space-y-2 rounded-2xl bg-[#F4F8F2] p-3">
          <MoneyField id="received" label="Recibido" value={received} onChange={setReceived} />
          <div className="flex flex-wrap gap-1.5">
            {quick.map((v) => (
              <button key={v} type="button" onClick={() => setReceived(v)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1F4D36] hover:bg-[#E8F3DC]">
                {v === total ? "Exacto" : formatPrice(v)}
              </button>
            ))}
          </div>
          <p className={cn("text-sm font-semibold", !received || received >= total ? "text-[#2E6B1F]" : "text-amber-800")}>
            {!received
              ? total
                ? "Sin escribir el recibido se cobra exacto."
                : ""
              : received >= total
                ? `Vuelto: ${formatPrice(received - total)}`
                : `Faltan ${formatPrice(total - received)}`}
          </p>
        </div>
      )}
      {method && method.kind !== "efectivo" && (
        <div>
          <label htmlFor="reference" className={fieldLabelClass}>
            Referencia {method.needsReference ? "(obligatoria)" : "(opcional)"}
          </label>
          <Input id="reference" className="mt-1.5" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Número de la transacción" />
        </div>
      )}
    </div>
  );
}

export function CounterPOS({
  kitchenId,
  kitchenName,
  catalog,
  methods,
  session,
  orders,
  elsewhere,
}: {
  kitchenId: string;
  kitchenName: string;
  catalog: CounterCatalog;
  methods: PaymentMethod[];
  session: CashSessionView | null;
  orders: CounterOrder[];
  elsewhere: { name: string } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<Line[]>([]);
  const [category, setCategory] = useState<string>("todas");
  const [building, setBuilding] = useState<{ slug: string; name: string; price: number } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [methodId, setMethodId] = useState<string | null>(methods[0]?.id ?? null);
  const [received, setReceived] = useState(0);
  const [reference, setReference] = useState("");
  const [opening, setOpening] = useState(0);
  const [closing, setClosing] = useState(false);
  const [charging, setCharging] = useState<CounterOrder | null>(null);
  const [cancelling, setCancelling] = useState<CounterOrder | null>(null);

  // La caja se actualiza sola: pedidos de la pantalla de autoservicio y platos que salen de cocina.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of catalog.products) seen.set(p.category, p.categoryName);
    return [...seen.entries()];
  }, [catalog.products]);
  const shown = catalog.products.filter((p) => category === "todas" || p.category === category);
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const method = methods.find((m) => m.id === methodId);

  // Si hay en la vitrina, sale de ahí (ya preparado); si no, va a cocina.
  const stockLeft = (slug: string, list: Line[]) =>
    (catalog.products.find((x) => x.slug === slug)?.inStock ?? 0) - list.filter((l) => l.slug === slug && l.stock).reduce((n, l) => n + l.quantity, 0);
  const add = (p: { slug: string; name: string; price: number }, options?: string[], details?: string) =>
    setLines((prev) => {
      if (!options) {
        const stock = stockLeft(p.slug, prev) > 0;
        const found = prev.find((l) => l.slug === p.slug && !l.options && Boolean(l.stock) === stock);
        if (found) return prev.map((l) => (l === found ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l));
        return [...prev, { key: `${p.slug}-${stock ? "v" : "c"}-${Date.now()}`, slug: p.slug, name: p.name, price: p.price, quantity: 1, stock }];
      }
      return [...prev, { key: `${p.slug}-${Date.now()}`, slug: p.slug, name: p.name, price: p.price, quantity: 1, options, details }];
    });
  /** Pasar una línea de vitrina a "preparar en cocina" (o al revés si alcanza). */
  const toggleStock = (key: string) =>
    setLines((prev) => {
      const l = prev.find((x) => x.key === key);
      if (!l) return prev;
      if (!l.stock && stockLeft(l.slug, prev) < l.quantity) {
        toast.error("No hay suficientes en la vitrina.");
        return prev;
      }
      return prev.map((x) => (x.key === key ? { ...x, stock: !x.stock } : x));
    });
  const bump = (key: string, d: number) =>
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key) return [l];
        if (l.quantity + d <= 0) return [];
        if (d > 0 && l.stock && stockLeft(l.slug, prev) < d) {
          toast.error("No quedan más en la vitrina: agrega el plato otra vez para prepararlo.");
          return [l];
        }
        return [{ ...l, quantity: Math.min(50, l.quantity + d) }];
      })
    );

  const reset = () => {
    setLines([]);
    setName("");
    setPhone("");
    setNotes("");
    setReceived(0);
    setReference("");
    setMethodId(methods[0]?.id ?? null);
  };

  const sell = (charge: boolean) =>
    start(async () => {
      if (charge && method?.kind === "efectivo" && received > 0 && received < total) {
        toast.error("El efectivo recibido es menor que el total.");
        return;
      }
      const r = await sellAtCounter({
        kitchenId,
        items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity, options: l.options, stock: l.stock })),
        name,
        phone,
        notes,
        methodId: charge ? methodId : null,
        received: charge && method?.kind === "efectivo" ? received || total : null,
        reference,
      });
      if (notify(r) || r.code) reset();
      router.refresh();
    });

  const pendingPay = orders.filter((o) => o.status === "pendiente_pago");
  const inKitchen = orders.filter((o) => (o.status === "confirmado" || o.status === "en_preparacion") && !o.preparedAt);
  const ready = orders.filter((o) => (o.status === "confirmado" || o.status === "en_preparacion") && o.preparedAt);
  const delivered = orders.filter((o) => o.status === "entregado");

  return (
    <div className="space-y-5">
      {/* Caja */}
      {session ? (
        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-[#1F4D36]/[0.07] bg-white px-4 py-3 text-sm">
          <StatusBadge tone="green">Caja abierta · {time(session.openedAt)}</StatusBadge>
          <span className="rounded-full bg-[#F4F8F2] px-3 py-1.5 text-[#1F4D36]">
            Base <strong>{formatPrice(session.openingAmount)}</strong>
          </span>
          <span className="rounded-full bg-[#F4F8F2] px-3 py-1.5 text-[#1F4D36]">
            Efectivo en cajón <strong>{formatPrice(session.expectedCash)}</strong>
          </span>
          {session.totals
            .filter((t) => t.kind !== "efectivo" && t.net)
            .map((t) => (
              <span key={t.method} className="rounded-full bg-[#F4F8F2] px-3 py-1.5 text-[#1F4D36]">
                {t.method} <strong>{formatPrice(t.net)}</strong>
              </span>
            ))}
          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setClosing(true)}>
            <Lock className="h-3.5 w-3.5" />
            Cerrar caja
          </Button>
        </div>
      ) : (
        <Panel title="Abre la caja para vender" description={`Cuenta el efectivo con el que empiezas en ${kitchenName}.`} icon={Wallet}>
          {elsewhere ? (
            <p className="text-sm text-amber-800">Tienes una caja abierta en {elsewhere.name}. Ciérrala allá antes de abrir aquí.</p>
          ) : (
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  notify(await openCash(kitchenId, opening));
                  router.refresh();
                });
              }}
            >
              <div className="w-48">
                <MoneyField id="opening" label="Base inicial" value={opening} onChange={setOpening} />
              </div>
              <Button type="submit" disabled={pending}>
                Abrir caja
              </Button>
            </form>
          )}
        </Panel>
      )}

      {/* Venta */}
      <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]", !session && "pointer-events-none opacity-50")} aria-disabled={!session}>
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[["todas", "Todo"] as [string, string], ...categories].map(([slug, label]) => (
              <button
                key={slug}
                type="button"
                onClick={() => setCategory(slug)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition",
                  category === slug ? "bg-[#1F4D36] text-white" : "bg-white text-[#1F4D36] hover:bg-[#E8F3DC]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => (p.builder ? setBuilding(p) : add(p))}
                className="group overflow-hidden rounded-3xl border border-[#1F4D36]/[0.07] bg-white text-left transition hover:border-[#8BC34A] hover:shadow-md active:scale-[0.98]"
              >
                <span className="relative block aspect-[4/3] bg-[#F4F8F2]">
                  <Image src={p.image} alt="" fill sizes="(min-width: 1280px) 200px, 45vw" className="object-cover" />
                  {p.inStock > 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-[#1F4D36] px-2.5 py-1 text-[11px] font-bold text-white shadow">Vitrina · {p.inStock}</span>
                  )}
                </span>
                <span className="block p-3">
                  <span className="line-clamp-2 text-sm font-semibold leading-tight text-[#1F4D36]">{p.name}</span>
                  <span className="mt-1 block text-sm text-[#1B1B1B]/60">{p.builder ? `Desde ${formatPrice(p.price)}` : formatPrice(p.price)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="Pedido" icon={ReceiptText} bodyClassName="space-y-4">
            {lines.length === 0 ? (
              <p className="rounded-2xl bg-[#F4F8F2] px-4 py-6 text-center text-sm text-[#1B1B1B]/50">Toca un producto para agregarlo.</p>
            ) : (
              <ul className="divide-y divide-[#1F4D36]/[0.06]">
                {lines.map((l) => (
                  <li key={l.key} className="flex items-start gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1F4D36]">{l.name}</p>
                      {l.details && <p className="text-[11px] leading-snug text-[#1B1B1B]/50">{l.details}</p>}
                      {!l.options && (
                        <button
                          type="button"
                          onClick={() => toggleStock(l.key)}
                          className={cn(
                            "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            l.stock ? "bg-[#E8F3DC] text-[#2E6B1F]" : "bg-amber-50 text-amber-800"
                          )}
                          title="Cambiar entre vitrina y preparar en cocina"
                        >
                          {l.stock ? "De vitrina · listo" : "Preparar en cocina"}
                        </button>
                      )}
                      <p className="text-xs text-[#1B1B1B]/55">{formatPrice(l.price * l.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Quitar uno" onClick={() => bump(l.key, -1)} className="rounded-full p-1.5 text-[#1F4D36] hover:bg-[#F4F8F2]">
                        {l.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
                      <button type="button" aria-label="Agregar uno" onClick={() => bump(l.key, 1)} className="rounded-full p-1.5 text-[#1F4D36] hover:bg-[#F4F8F2]">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="cust" className={fieldLabelClass}>
                  Nombre (para llamarlo)
                </label>
                <Input id="cust" className="mt-1.5 h-10" value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" maxLength={60} />
              </div>
              <div>
                <label htmlFor="phone" className={fieldLabelClass}>
                  Celular
                </label>
                <Input id="phone" className="mt-1.5 h-10" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" maxLength={20} />
              </div>
            </div>
            <div>
              <label htmlFor="notes" className={fieldLabelClass}>
                Nota para cocina
              </label>
              <Input id="notes" className="mt-1.5 h-10" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. sin cebolla" maxLength={300} />
            </div>
            <div className="flex items-baseline justify-between border-t border-[#1F4D36]/[0.07] pt-3">
              <span className="text-sm font-semibold text-[#1B1B1B]/60">Total</span>
              <span className="font-display text-2xl font-bold text-[#1F4D36]">{formatPrice(total)}</span>
            </div>
            <PaymentPicker
              methods={methods}
              total={total}
              methodId={methodId}
              setMethodId={setMethodId}
              received={received}
              setReceived={setReceived}
              reference={reference}
              setReference={setReference}
            />
            <div className="flex gap-2">
              <Button className="flex-1" size="lg" disabled={pending || !lines.length || !methodId} onClick={() => sell(true)}>
                Cobrar {total ? formatPrice(total) : ""}
              </Button>
              <Button variant="secondary" size="lg" className="px-4" disabled={pending || !lines.length} onClick={() => sell(false)} title="Guardar para cobrar después">
                Por cobrar
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Pedidos del día */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OrdersColumn title="Por cobrar" icon={Clock} empty="Nada pendiente de pago." orders={pendingPay}>
          {(o) => (
            <>
              <Button size="sm" disabled={!session || pending} onClick={() => setCharging(o)}>
                Cobrar
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setCancelling(o)}>
                Anular
              </Button>
            </>
          )}
        </OrdersColumn>
        <OrdersColumn title="En cocina" icon={ChefHat} empty="La cocina no tiene pedidos de mostrador." orders={inKitchen}>
          {(o) =>
            !o.inKitchen && (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setCancelling(o)}>
                Anular y devolver
              </Button>
            )
          }
        </OrdersColumn>
        <OrdersColumn title="Listos para entregar" icon={HandPlatter} empty="Cuando la cocina termine, aparecen aquí." orders={ready} highlight>
          {(o) => (
            <Button
              size="sm"
              variant="fresh"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  notify(await deliverCounterOrder(o.id));
                  router.refresh();
                })
              }
            >
              Entregar
            </Button>
          )}
        </OrdersColumn>
      </div>
      {delivered.length > 0 && (
        <details className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#1F4D36]">
            Entregados hoy · {delivered.length} · {formatPrice(delivered.reduce((s, o) => s + o.total, 0))}
          </summary>
          <ul className="mt-3 divide-y divide-[#1F4D36]/[0.06] text-sm">
            {delivered.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <strong className="text-[#1F4D36]">{o.code}</strong> {o.customer && `· ${o.customer}`} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </span>
                <span className="text-[#1B1B1B]/55">
                  {o.method} · {formatPrice(o.total)} · {time(o.deliveredAt)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {building && (
        <Sheet title={building.name} description="Arma el bowl con lo que pide el cliente." onClose={() => setBuilding(null)}>
          <CounterBuilder
            options={catalog.builderOptions}
            basePrice={building.price}
            onDone={(b) => {
              add({ slug: building.slug, name: `${building.name} (personalizado)`, price: b.price }, b.optionIds, b.names.join(", "));
              setBuilding(null);
            }}
          />
        </Sheet>
      )}

      {charging && session && (
        <ChargeSheet
          order={charging}
          methods={methods}
          onClose={() => setCharging(null)}
          onDone={() => {
            setCharging(null);
            router.refresh();
          }}
        />
      )}

      {cancelling && (
        <CancelSheet
          order={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            router.refresh();
          }}
        />
      )}

      {closing && session && (
        <CloseSheet
          session={session}
          openOrders={inKitchen.length + ready.length}
          onClose={() => setClosing(false)}
          onDone={() => {
            setClosing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function OrdersColumn({
  title,
  icon: Icon,
  empty,
  orders,
  highlight,
  children,
}: {
  title: string;
  icon: typeof Clock;
  empty: string;
  orders: CounterOrder[];
  highlight?: boolean;
  children: (o: CounterOrder) => React.ReactNode;
}) {
  return (
    <Panel title={`${title} · ${orders.length}`} icon={Icon} className={cn(highlight && orders.length > 0 && "border-[#8BC34A] ring-2 ring-[#8BC34A]/30")}>
      {orders.length === 0 ? (
        <p className="text-sm text-[#1B1B1B]/45">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl bg-[#F8F7F2] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-display text-[#1F4D36]">{o.code}</strong>
                {o.customer && <span className="text-sm font-semibold text-[#1B1B1B]/75">{o.customer}</span>}
                {o.source === "autoservicio" && (
                  <StatusBadge tone="blue" dot={false}>
                    <Monitor className="h-3 w-3" /> Pantalla
                  </StatusBadge>
                )}
                <span className="ml-auto text-xs text-[#1B1B1B]/50">{time(o.paidAt ?? o.createdAt)}</span>
              </div>
              <ul className="mt-1.5 text-xs text-[#1B1B1B]/65">
                {o.items.map((i, n) => (
                  <li key={n}>
                    {i.quantity}× {i.name}
                    {i.options.length > 0 && <span className="text-[#1B1B1B]/45"> — {i.options.join(", ")}</span>}
                  </li>
                ))}
              </ul>
              {o.notes && <p className="mt-1 text-xs italic text-amber-800">“{o.notes}”</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="mr-auto text-sm font-semibold text-[#1F4D36]">
                  {formatPrice(o.total)}
                  {o.method && <span className="font-normal text-[#1B1B1B]/50"> · {o.method}</span>}
                </span>
                {children(o)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ChargeSheet({ order, methods, onClose, onDone }: { order: CounterOrder; methods: PaymentMethod[]; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [methodId, setMethodId] = useState<string | null>(methods[0]?.id ?? null);
  const [received, setReceived] = useState(0);
  const [reference, setReference] = useState("");
  const method = methods.find((m) => m.id === methodId);
  return (
    <Sheet
      title={`Cobrar ${order.code}`}
      description={`${order.customer || "Cliente"} · ${formatPrice(order.total)}`}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || !methodId}
          onClick={() =>
            start(async () => {
              if (notify(await chargeOrder(order.id, methodId!, method?.kind === "efectivo" ? received || order.total : null, reference))) onDone();
            })
          }
        >
          Cobrar {formatPrice(order.total)}
        </Button>
      }
    >
      <ul className="mb-4 text-sm text-[#1B1B1B]/70">
        {order.items.map((i, n) => (
          <li key={n}>
            {i.quantity}× {i.name}
          </li>
        ))}
      </ul>
      <PaymentPicker
        methods={methods}
        total={order.total}
        methodId={methodId}
        setMethodId={setMethodId}
        received={received}
        setReceived={setReceived}
        reference={reference}
        setReference={setReference}
      />
    </Sheet>
  );
}

function CancelSheet({ order, onClose, onDone }: { order: CounterOrder; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const paid = order.status !== "pendiente_pago";
  return (
    <Sheet
      title={paid ? `Anular y devolver ${order.code}` : `Anular ${order.code}`}
      description={paid ? `Se devuelven ${formatPrice(order.total)} por ${order.method ?? "el mismo método"} desde tu caja.` : "El pedido no se ha pagado."}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || (paid && note.trim().length < 3)}
          onClick={() =>
            start(async () => {
              if (notify(await cancelCounterOrder(order.id, note))) onDone();
            })
          }
        >
          <X className="h-4 w-4" />
          {paid ? "Anular y devolver" : "Anular pedido"}
        </Button>
      }
    >
      <label htmlFor="cancel-note" className={fieldLabelClass}>
        Motivo {paid ? "(obligatorio)" : "(opcional)"}
      </label>
      <Input id="cancel-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. el cliente se arrepintió" maxLength={250} />
    </Sheet>
  );
}

export function CloseSheet({
  session,
  openOrders,
  onClose,
  onDone,
  closeAction = closeCash,
}: {
  session: CashSessionView & { cashOut?: number };
  openOrders: number;
  onClose: () => void;
  onDone: () => void;
  /** Acción de cierre (mostrador por defecto; el punto usa la suya). */
  closeAction?: (sessionId: string, counted: number, note: string) => Promise<{ ok?: string; error?: string }>;
}) {
  const [pending, start] = useTransition();
  const [counted, setCounted] = useState(0);
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState("");
  const diff = counted - session.expectedCash;
  return (
    <Sheet
      title="Cerrar caja"
      description={`Abierta a las ${time(session.openedAt)} · cuenta el efectivo del cajón.`}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || !touched || (openOrders > 0 && note.trim().length < 3)}
          onClick={() =>
            start(async () => {
              if (notify(await closeAction(session.id, counted, note))) onDone();
            })
          }
        >
          <Lock className="h-4 w-4" />
          Cerrar caja
        </Button>
      }
    >
      <div className="space-y-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#1B1B1B]/50">
            <tr>
              <th className="pb-2 font-semibold">Método</th>
              <th className="pb-2 text-right font-semibold">Ventas</th>
              <th className="pb-2 text-right font-semibold">Devoluciones</th>
              <th className="pb-2 text-right font-semibold">Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F4D36]/[0.06]">
            {session.totals.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-[#1B1B1B]/45">
                  Sin ventas en esta caja.
                </td>
              </tr>
            )}
            {session.totals.map((t) => (
              <tr key={t.method}>
                <td className="py-2 font-semibold text-[#1F4D36]">
                  {t.method} <span className="font-normal text-[#1B1B1B]/45">· {t.count}</span>
                </td>
                <td className="py-2 text-right">{formatPrice(t.sales)}</td>
                <td className="py-2 text-right">{t.refunds ? `−${formatPrice(t.refunds)}` : "—"}</td>
                <td className="py-2 text-right font-semibold">{formatPrice(t.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rounded-2xl bg-[#F4F8F2] p-4 text-sm">
          <p className="flex justify-between">
            <span>Base</span>
            <span>{formatPrice(session.openingAmount)}</span>
          </p>
          {session.cashOut ? (
            <p className="mt-1 flex justify-between">
              <span>Salidas (transporte pagado con la venta)</span>
              <span>−{formatPrice(session.cashOut)}</span>
            </p>
          ) : null}
          <p className="mt-1 flex justify-between font-semibold text-[#1F4D36]">
            <span>Efectivo que debería haber</span>
            <span>{formatPrice(session.expectedCash)}</span>
          </p>
        </div>
        <MoneyField
          id="counted"
          label="Efectivo contado"
          autoFocus
          value={counted}
          onChange={(n) => {
            setCounted(n);
            setTouched(true);
          }}
        />
        {touched && (
          <p className={cn("rounded-2xl px-4 py-3 text-sm font-semibold", diff === 0 ? "bg-[#E8F3DC] text-[#2E6B1F]" : diff > 0 ? "bg-sky-50 text-sky-800" : "bg-red-50 text-red-700")}>
            {diff === 0 ? "Cuadra exacto." : diff > 0 ? `Sobran ${formatPrice(diff)}.` : `Faltan ${formatPrice(-diff)}.`}
          </p>
        )}
        {openOrders > 0 && (
          <p className="text-sm text-amber-800">
            Hay {openOrders} {openOrders === 1 ? "pedido cobrado sin entregar" : "pedidos cobrados sin entregar"}. Escribe una nota para cerrar igual.
          </p>
        )}
        <div>
          <label htmlFor="close-note" className={fieldLabelClass}>
            Nota {openOrders > 0 || diff !== 0 ? "" : "(opcional)"}
          </label>
          <Input id="close-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. se pagó un domicilio con efectivo de la caja" maxLength={300} />
        </div>
      </div>
    </Sheet>
  );
}
