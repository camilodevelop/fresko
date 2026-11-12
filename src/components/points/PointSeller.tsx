"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bus,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Lock,
  Minus,
  PackageCheck,
  Plus,
  ReceiptText,
  ShoppingBag,
  Store,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { fieldLabelClass } from "@/components/dashboard/ui";
import { CloseSheet, MoneyField, PaymentPicker, time } from "@/components/counter/CounterPOS";
import { notify, toast } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";
import type { CashSessionView, PaymentMethod } from "@/lib/counter";
import type { LoadView, PointSale, PointStockLine } from "@/lib/points";
import { cancelPointSale, closeLoad, closePointCash, openPointCash, receiveLoad, sellAtPoint, setTransport } from "@/app/admin/punto/actions";

/** "3 h 20 min" hasta vencer (o "vencido"). */
function left(iso: string | null, now: number) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "vencido";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `${h} h ${m} min` : `${m} min`;
}

type Line = { productId: string; name: string; price: number; quantity: number };
type Tab = "vender" | "ventas" | "cierre";

/** Pantalla del vendedor, pensada para el celular: un paso a la vez y la venta siempre a la mano. */
export function PointSeller({
  point,
  load,
  stock,
  session,
  sales,
  methods,
  nearExpiry,
  now: serverNow,
}: {
  point: { id: string; name: string; address: string; schedule: string };
  load: LoadView | null;
  stock: PointStockLine[];
  session: (CashSessionView & { cashOut: number }) | null;
  sales: PointSale[];
  methods: PaymentMethod[];
  nearExpiry: number;
  /** Hora del servidor al cargar (los vencimientos se calculan igual en servidor y navegador). */
  now: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>(load?.status === "cerrada" ? "cierre" : "vender");
  const [lines, setLines] = useState<Line[]>([]);
  const [opening, setOpening] = useState(0);
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState<{ code: string; change: number; total: number } | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [transportOpen, setTransportOpen] = useState(false);
  const [closingLoad, setClosingLoad] = useState(false);
  const [closingCash, setClosingCash] = useState(false);
  const [cancelling, setCancelling] = useState<PointSale | null>(null);
  // Los vencimientos avanzan; cada minuto también se trae lo último (avisos, despacho).
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      router.refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [router]);

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const available = stock.reduce((s, x) => s + x.available, 0);
  const okSales = sales.filter((s) => s.status === "entregado");
  const soldTotal = okSales.reduce((a, s) => a + s.total, 0);

  // Paso en el que va el vendedor.
  const step: "esperando" | "recibir" | "caja" | "vender" | "cerrado" =
    load?.status === "despachada"
      ? "recibir"
      : load?.status === "cerrada" && !session
        ? "cerrado"
        : stock.length === 0 && !load
          ? "esperando"
          : !session && load?.status !== "cerrada"
            ? "caja"
            : "vender";

  const add = (s: PointStockLine) =>
    setLines((prev) => {
      const found = prev.find((l) => l.productId === s.productId);
      if ((found?.quantity ?? 0) >= s.available) {
        toast.error(`Solo quedan ${s.available} de ${s.name}.`);
        return prev;
      }
      return found
        ? prev.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { productId: s.productId, name: s.name, price: s.price, quantity: 1 }];
    });
  const bump = (pid: string, d: number) => {
    if (d > 0) {
      const s = stock.find((x) => x.productId === pid);
      if (s) add(s);
      return;
    }
    setLines((prev) => prev.flatMap((l) => (l.productId !== pid ? [l] : l.quantity + d <= 0 ? [] : [{ ...l, quantity: l.quantity + d }])));
  };

  const steps = [
    { id: "recibir", label: "Recibir", done: Boolean(load && load.status !== "despachada") },
    { id: "caja", label: "Caja", done: Boolean(session) || load?.status === "cerrada" },
    { id: "vender", label: "Vender", done: load?.status === "cerrada" },
    { id: "cerrar", label: "Cerrar", done: load?.status === "cerrada" && !session },
  ];

  return (
    <div className="-mx-4 -mt-2 flex min-h-[calc(100dvh-7rem)] flex-col sm:mx-0">
      {/* Encabezado: punto, pasos del día y caja */}
      <header className="rounded-b-3xl bg-[#1F4D36] px-5 pb-4 pt-5 text-white sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C5E1A5]">
              <Store className="h-3.5 w-3.5" /> Mi punto
            </p>
            <p className="truncate font-display text-xl font-bold">{point.name}</p>
            {point.schedule && <p className="truncate text-xs text-white/65">{point.schedule}</p>}
          </div>
          {session && (
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-white/60">Efectivo en caja</p>
              <p className="font-display text-lg font-bold">{formatPrice(session.expectedCash)}</p>
            </div>
          )}
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Pasos del día">
          {steps.map((s, i) => {
            const current = !s.done && steps.slice(0, i).every((x) => x.done);
            return (
              <li key={s.id} className="text-center">
                <span
                  className={cn(
                    "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    s.done ? "bg-[#8BC34A] text-[#1F4D36]" : current ? "bg-white text-[#1F4D36]" : "bg-white/15 text-white/60"
                  )}
                >
                  {s.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("mt-1 block text-[11px] font-semibold", current ? "text-white" : "text-white/60")}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className={cn("flex-1 space-y-4 px-4 pt-4 sm:px-0", step === "vender" ? (lines.length ? "pb-48 lg:pb-4" : "pb-24 lg:pb-4") : "pb-4")}>
        {/* Siguiente paso, grande y único */}
        {step === "esperando" && (
          <Hero icon={Clock} title="Esperando tu carga" text="Cuando la cocina despache los platos te llega un aviso y aquí aparece para recibirlos." />
        )}
        {step === "recibir" && load && (
          <Hero
            icon={PackageCheck}
            title="Llegó tu carga"
            text={`${load.lines.reduce((s, l) => s + l.dispatched, 0)} platos despachados. Cuéntalos al recibir: si falta algo, queda registrado.`}
            action={
              <Button size="lg" variant="fresh" className="h-14 w-full text-base" onClick={() => setReceiving(true)}>
                Recibir la carga <ChevronRight className="h-5 w-5" />
              </Button>
            }
          />
        )}
        {step === "caja" && (
          <Hero
            icon={Wallet}
            title="Abre tu caja"
            text="Cuenta el efectivo con el que empiezas para dar vueltas."
            action={
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(async () => {
                    notify(await openPointCash(point.id, opening));
                    router.refresh();
                  });
                }}
              >
                <MoneyField id="opening" label="Base inicial" value={opening} onChange={setOpening} />
                <div className="flex flex-wrap gap-2">
                  {[0, 20000, 50000, 100000].map((v) => (
                    <button key={v} type="button" onClick={() => setOpening(v)} className="rounded-full bg-[#F4F8F2] px-3 py-1.5 text-xs font-semibold text-[#1F4D36]">
                      {v ? formatPrice(v) : "Sin base"}
                    </button>
                  ))}
                </div>
                <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pending}>
                  Abrir caja y empezar a vender
                </Button>
              </form>
            }
          />
        )}
        {step === "cerrado" && <Hero icon={CheckCircle2} title="¡Listo por hoy!" text={`Vendiste ${formatPrice(soldTotal)} en ${okSales.length} ${okSales.length === 1 ? "venta" : "ventas"}. El punto y la caja están cerrados.`} />}

        {/* Pestañas */}
        {step === "vender" && tab === "vender" && (
          <section aria-label="Vender">
            {stock.length === 0 ? (
              <Hero icon={CheckCircle2} title="¡Se vendió todo!" text="No quedan platos en el punto. Ve a Cierre para cerrar el día." />
            ) : (
              <>
                <p className="mb-3 text-sm text-[#1B1B1B]/55">
                  Toca un plato para agregarlo · quedan <strong className="text-[#1F4D36]">{available}</strong>
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {stock.map((s) => {
                    const inCart = lines.find((l) => l.productId === s.productId)?.quantity ?? 0;
                    const ms = s.nextExpiry ? new Date(s.nextExpiry).getTime() - now : 0;
                    const soon = s.nextExpiry && ms < 2 * 3_600_000;
                    const leftQty = s.available - inCart;
                    return (
                      <button
                        key={s.productId}
                        type="button"
                        disabled={s.available === 0}
                        onClick={() => add(s)}
                        className={cn(
                          "relative overflow-hidden rounded-3xl border-[3px] bg-white text-left shadow-sm transition active:scale-[0.96] disabled:opacity-45",
                          inCart ? "border-[#8BC34A]" : "border-transparent"
                        )}
                      >
                        {inCart > 0 && (
                          <span className="absolute right-2 top-2 z-10 flex h-9 min-w-9 items-center justify-center rounded-full bg-[#8BC34A] px-2 text-base font-bold text-[#1F4D36] shadow">
                            {inCart}
                          </span>
                        )}
                        <span className="relative block aspect-[4/3] bg-[#F4F8F2]">
                          <Image src={s.image} alt="" fill sizes="50vw" className="object-cover" />
                          {s.nextExpiry && (
                            <span
                              className={cn(
                                "absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow",
                                soon ? "bg-red-600 text-white" : "bg-white/90 text-[#1F4D36]"
                              )}
                            >
                              <Clock className="h-3 w-3" /> {left(s.nextExpiry, now)}
                            </span>
                          )}
                        </span>
                        <span className="block p-3">
                          <span className="line-clamp-2 text-[15px] font-bold leading-tight text-[#1F4D36]">{s.name}</span>
                          <span className="mt-1 flex items-baseline justify-between gap-1">
                            <span className="text-sm font-semibold text-[#1B1B1B]/70">{formatPrice(s.price)}</span>
                            <span className={cn("text-xs font-bold", leftQty <= 1 ? "text-amber-700" : "text-[#1B1B1B]/45")}>Quedan {leftQty}</span>
                          </span>
                          {s.expired > 0 && <span className="mt-0.5 block text-[11px] font-semibold text-red-700">{s.expired} vencidos · no se venden</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {step === "vender" && tab === "ventas" && (
          <section aria-label="Ventas" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-[#1B1B1B]/50">Vendido hoy</p>
                <p className="font-display text-2xl font-bold text-[#1F4D36]">{formatPrice(soldTotal)}</p>
                <p className="text-xs text-[#1B1B1B]/50">
                  {okSales.length} {okSales.length === 1 ? "venta" : "ventas"}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-[#1B1B1B]/50">Por método</p>
                {session?.totals.length ? (
                  session.totals.map((t) => (
                    <p key={t.method} className="flex justify-between text-sm">
                      <span>{t.method}</span>
                      <strong className="text-[#1F4D36]">{formatPrice(t.net)}</strong>
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-[#1B1B1B]/45">—</p>
                )}
              </div>
            </div>
            {sales.length === 0 ? (
              <p className="rounded-3xl bg-white p-6 text-center text-sm text-[#1B1B1B]/50">Aún no hay ventas hoy.</p>
            ) : (
              <ul className="divide-y divide-[#1F4D36]/[0.06] overflow-hidden rounded-3xl bg-white shadow-sm">
                {sales.map((s) => (
                  <li key={s.id} className={cn("flex items-center gap-3 px-4 py-3", s.status !== "entregado" && "opacity-50")}>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold text-[#1F4D36]", s.status !== "entregado" && "line-through")}>{s.items}</p>
                      <p className="text-xs text-[#1B1B1B]/50">
                        {time(s.at)} · {s.method} · {s.code}
                        {s.status !== "entregado" && " · anulada"}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatPrice(s.total)}</span>
                    {s.status === "entregado" && session && (
                      <button type="button" onClick={() => setCancelling(s)} className="rounded-full p-2 text-[#1B1B1B]/35 hover:bg-red-50 hover:text-red-700" aria-label={`Anular ${s.code}`}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {step === "vender" && tab === "cierre" && (
          <section aria-label="Cierre" className="space-y-3">
            <p className="text-sm text-[#1B1B1B]/55">Al terminar la jornada, en este orden:</p>
            <ActionCard
              n={1}
              icon={Bus}
              title="Transporte"
              text={load?.transportCost ? `${formatPrice(load.transportCost)}${load.transportFromCash ? " · pagado con la venta" : ""}` : "Registra lo que pagaste para llegar (si aplica)"}
              done={Boolean(load?.transportCost)}
              disabled={!load || load.status === "cerrada"}
              onClick={() => setTransportOpen(true)}
            />
            <ActionCard
              n={2}
              icon={ClipboardCheck}
              title="Cerrar el punto"
              text={load?.status === "cerrada" ? "Hecho: lo que sobró ya tiene destino" : "Cuenta lo que quedó: vuelve a cocina, equipo, donación o pérdida"}
              done={load?.status === "cerrada"}
              disabled={load?.status !== "en_venta"}
              onClick={() => setClosingLoad(true)}
            />
            <ActionCard
              n={3}
              icon={Lock}
              title="Cerrar la caja"
              text={session ? `Cuenta el efectivo · debería haber ${formatPrice(session.expectedCash)}` : "Caja cerrada"}
              done={!session}
              disabled={!session || load?.status === "en_venta"}
              onClick={() => setClosingCash(true)}
            />
            {load?.status === "en_venta" && <p className="text-xs text-[#1B1B1B]/45">La caja se cierra después de cerrar el punto.</p>}
          </section>
        )}
      </div>

      {/* Abajo: el pedido en curso flota sobre las pestañas */}
      {step === "vender" && (
        // En el celular va fija al borde de la pantalla; en pantallas grandes, al final del contenido.
        <div className="fixed inset-x-0 bottom-0 z-30 lg:sticky">
          {tab === "vender" && lines.length > 0 && (
            <div className="px-4 pb-3 sm:px-0">
              <button
                type="button"
                onClick={() => setCheckout(true)}
                className="flex w-full items-center gap-3 rounded-3xl bg-[#1F4D36] p-3 pr-4 text-left text-white shadow-xl shadow-[#1F4D36]/30 transition active:scale-[0.98]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#8BC34A] font-display text-xl font-bold text-[#1F4D36]">{count}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-white/65">{count === 1 ? "1 plato" : `${count} platos`} · toca para cobrar</span>
                  <span className="block truncate text-sm font-semibold">{lines.map((l) => (l.quantity > 1 ? `${l.quantity}× ${l.name}` : l.name)).join(", ")}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-xl font-bold">{formatPrice(total)}</span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#C5E1A5]">
                    Cobrar <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>
            </div>
          )}
          <div className="border-t border-[#1F4D36]/10 bg-white/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(31,77,54,0.06)] backdrop-blur sm:rounded-t-3xl">
          <nav className="grid grid-cols-3" aria-label="Secciones">
            {(
              [
                ["vender", "Vender", ShoppingBag, available ? String(available) : ""],
                ["ventas", "Ventas", ReceiptText, okSales.length ? String(okSales.length) : ""],
                ["cierre", "Cierre", Lock, ""],
              ] as const
            ).map(([id, label, Icon, badge]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold", tab === id ? "text-[#1F4D36]" : "text-[#1B1B1B]/40")}
              >
                <Icon className="h-6 w-6" />
                {label}
                {badge && <span className="absolute right-[calc(50%-1.6rem)] top-1.5 rounded-full bg-[#8BC34A] px-1.5 text-[10px] font-bold text-[#1F4D36]">{badge}</span>}
                {tab === id && <span className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-[#1F4D36]" />}
              </button>
            ))}
          </nav>
          </div>
        </div>
      )}

      {checkout && (
        <CheckoutSheet
          pointId={point.id}
          lines={lines}
          methods={methods}
          bump={bump}
          onClose={() => setCheckout(false)}
          onDone={(r) => {
            setCheckout(false);
            setLines([]);
            setDone(r);
            router.refresh();
          }}
        />
      )}
      {done && <SoldSheet sale={done} onClose={() => setDone(null)} />}
      {receiving && load && (
        <ReceiveSheet
          load={load}
          onClose={() => setReceiving(false)}
          onDone={() => {
            setReceiving(false);
            router.refresh();
          }}
        />
      )}
      {transportOpen && load && (
        <TransportSheet
          load={load}
          hasCash={Boolean(session)}
          onClose={() => setTransportOpen(false)}
          onDone={() => {
            setTransportOpen(false);
            router.refresh();
          }}
        />
      )}
      {closingLoad && load && (
        <CloseLoadSheet
          loadId={load.id}
          stock={stock}
          nearExpiry={nearExpiry}
          onClose={() => setClosingLoad(false)}
          onDone={() => {
            setClosingLoad(false);
            router.refresh();
            if (session) setClosingCash(true);
          }}
        />
      )}
      {closingCash && session && (
        <CloseSheet
          session={session}
          openOrders={0}
          closeAction={closePointCash}
          onClose={() => setClosingCash(false)}
          onDone={() => {
            setClosingCash(false);
            router.refresh();
          }}
        />
      )}
      {cancelling && (
        <CancelSaleSheet
          sale={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Tarjeta grande del siguiente paso. */
function Hero({ icon: Icon, title, text, action }: { icon: typeof Clock; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F3DC] text-[#1F4D36]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 font-display text-xl font-bold text-[#1F4D36]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[#1B1B1B]/60">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ActionCard({ n, icon: Icon, title, text, done, disabled, onClick }: { n: number; icon: typeof Clock; title: string; text: string; done: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-50", done && "ring-2 ring-[#8BC34A]/50")}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", done ? "bg-[#8BC34A] text-[#1F4D36]" : "bg-[#F4F8F2] text-[#1F4D36]")}>
        {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[#1F4D36]">
          {n}. {title}
        </span>
        <span className="block text-sm text-[#1B1B1B]/55">{text}</span>
      </span>
      {!disabled && <ChevronRight className="h-5 w-5 shrink-0 text-[#1B1B1B]/30" />}
    </button>
  );
}

/** Cobro: revisar, método y efectivo recibido. */
function CheckoutSheet({
  pointId,
  lines,
  methods,
  bump,
  onClose,
  onDone,
}: {
  pointId: string;
  lines: Line[];
  methods: PaymentMethod[];
  bump: (pid: string, d: number) => void;
  onClose: () => void;
  onDone: (r: { code: string; change: number; total: number }) => void;
}) {
  const [pending, start] = useTransition();
  const [methodId, setMethodId] = useState<string | null>(methods[0]?.id ?? null);
  const [received, setReceived] = useState(0);
  const [reference, setReference] = useState("");
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const method = methods.find((m) => m.id === methodId);
  useEffect(() => {
    if (lines.length === 0) onClose();
  }, [lines.length, onClose]);
  return (
    <Sheet
      title={`Cobrar ${formatPrice(total)}`}
      onClose={onClose}
      footer={
        <Button
          size="lg"
          className="h-14 w-full text-lg"
          disabled={pending || !methodId || (method?.kind === "efectivo" && received > 0 && received < total)}
          onClick={() =>
            start(async () => {
              const r = await sellAtPoint({
                pointId,
                items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
                methodId: methodId!,
                received: method?.kind === "efectivo" ? received || total : null,
                reference,
              });
              if (r.error) notify(r);
              else onDone({ code: (r.ok ?? "").match(/FR-\d+/)?.[0] ?? "", change: r.change ?? 0, total });
            })
          }
        >
          Confirmar venta · {formatPrice(total)}
        </Button>
      }
    >
      <ul className="mb-4 divide-y divide-[#1F4D36]/[0.06]">
        {lines.map((l) => (
          <li key={l.productId} className="flex items-center gap-2 py-2">
            <span className="flex-1 text-sm font-semibold text-[#1F4D36]">{l.name}</span>
            <button type="button" aria-label="Quitar uno" onClick={() => bump(l.productId, -1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F8F2]">
              {l.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            </button>
            <span className="w-6 text-center font-bold">{l.quantity}</span>
            <button type="button" aria-label="Agregar uno" onClick={() => bump(l.productId, 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F8F2]">
              <Plus className="h-4 w-4" />
            </button>
            <span className="w-20 text-right text-sm tabular-nums">{formatPrice(l.price * l.quantity)}</span>
          </li>
        ))}
      </ul>
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
    </Sheet>
  );
}

/** Confirmación grande después de vender (sobre todo el vuelto). */
function SoldSheet({ sale, onClose }: { sale: { code: string; change: number; total: number }; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, sale.change > 0 ? 8000 : 3000);
    return () => clearTimeout(t);
  }, [sale, onClose]);
  return (
    <Sheet title="Venta registrada" onClose={onClose} footer={<Button size="lg" className="h-14 w-full text-lg" onClick={onClose}>Seguir vendiendo</Button>}>
      <div className="py-4 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-[#8BC34A]" />
        <p className="mt-3 text-sm text-[#1B1B1B]/55">
          {sale.code} · {formatPrice(sale.total)}
        </p>
        {sale.change > 0 ? (
          <>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-[#1B1B1B]/50">Vuelto</p>
            <p className="font-display text-5xl font-bold text-[#1F4D36]">{formatPrice(sale.change)}</p>
          </>
        ) : (
          <p className="mt-4 font-display text-2xl font-bold text-[#1F4D36]">¡Listo!</p>
        )}
      </div>
    </Sheet>
  );
}

function Counter({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max: number; label: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <button type="button" aria-label={`${label}: menos`} disabled={value <= 0} onClick={() => onChange(value - 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F8F2] disabled:opacity-40">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-7 text-center font-bold">{value}</span>
      <button type="button" aria-label={`${label}: más`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F8F2] disabled:opacity-40">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function ReceiveSheet({ load, onClose, onDone }: { load: LoadView; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  const lines = load.lines.filter((l) => l.dispatched > 0);
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(lines.map((l) => [l.productId, l.dispatched])));
  const missing = lines.reduce((s, l) => s + l.dispatched - (qty[l.productId] ?? 0), 0);
  return (
    <Sheet
      title="Recibir la carga"
      description="Cuenta cada plato. Lo que no llegue queda como faltante."
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (notify(await receiveLoad(load.id, lines.map((l) => ({ productId: l.productId, quantity: qty[l.productId] ?? 0 }))))) onDone();
            })
          }
        >
          Confirmar recepción{missing > 0 ? ` · faltan ${missing}` : ""}
        </Button>
      }
    >
      <ul className="divide-y divide-[#1F4D36]/[0.06]">
        {lines.map((l) => (
          <li key={l.productId} className="flex items-center gap-3 py-3">
            <span className="flex-1">
              <span className="block font-semibold text-[#1F4D36]">{l.name}</span>
              <span className="text-xs text-[#1B1B1B]/50">Despachados: {l.dispatched}</span>
            </span>
            <Counter label={`Recibidos de ${l.name}`} value={qty[l.productId] ?? 0} max={l.dispatched} onChange={(n) => setQty({ ...qty, [l.productId]: n })} />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function TransportSheet({ load, hasCash, onClose, onDone }: { load: LoadView; hasCash: boolean; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(load.transportCost);
  const [fromCash, setFromCash] = useState(load.transportFromCash);
  const [note, setNote] = useState("");
  return (
    <Sheet
      title="Transporte al punto"
      description="Se registra como gasto de transporte de la cocina."
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (notify(await setTransport(load.id, amount, fromCash && amount > 0, note))) onDone();
            })
          }
        >
          Guardar transporte
        </Button>
      }
    >
      <div className="space-y-4">
        <MoneyField id="transport" label="¿Cuánto pagaste?" autoFocus value={amount} onChange={setAmount} />
        <div>
          <label htmlFor="transport-note" className={fieldLabelClass}>
            Detalle (opcional)
          </label>
          <Input id="transport-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. taxi, bus" maxLength={80} />
        </div>
        <label className={cn("flex items-start gap-3 rounded-2xl bg-[#F4F8F2] p-4 text-sm", !hasCash && "opacity-50")}>
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#1F4D36]" checked={fromCash} disabled={!hasCash} onChange={(e) => setFromCash(e.target.checked)} />
          <span>
            <strong className="block text-[#1F4D36]">Lo pagué con el efectivo de la venta</strong>
            {hasCash ? "Se descuenta del efectivo que debe haber en la caja." : "Abre la caja para poder pagarlo con la venta."}
          </span>
        </label>
      </div>
    </Sheet>
  );
}

type Fate = { returned: number; staff: number; donated: number; lost: number };

function CloseLoadSheet({ loadId, stock, nearExpiry, onClose, onDone }: { loadId: string; stock: PointStockLine[]; nearExpiry: number; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  // Por defecto: lo que aún puede volver, vuelve; lo vencido, pérdida.
  const [fate, setFate] = useState<Record<string, Fate>>(
    Object.fromEntries(stock.map((s) => [s.productId, { returned: s.returnable, staff: 0, donated: 0, lost: s.expired }]))
  );
  const set = (pid: string, k: keyof Fate, n: number) => setFate({ ...fate, [pid]: { ...fate[pid], [k]: n } });
  const rows = stock.map((s) => {
    const f = fate[s.productId];
    const counted = f.returned + f.staff + f.donated + f.lost;
    return { s, f, counted, missing: s.available + s.expired - counted };
  });
  const totalMissing = rows.reduce((a, r) => a + Math.max(0, r.missing), 0);
  return (
    <Sheet
      title="Cerrar el punto"
      description={`Cuenta lo que quedó. Solo vuelve a cocina lo que tenga más de ${nearExpiry} h de vida útil; lo demás va al equipo, se dona o es pérdida.`}
      onClose={onClose}
      className="md:w-[min(760px,calc(100%-3rem))]"
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || rows.some((r) => r.missing < 0)}
          onClick={() =>
            start(async () => {
              if (notify(await closeLoad(loadId, rows.map((r) => ({ productId: r.s.productId, ...r.f }))))) onDone();
            })
          }
        >
          Cerrar el punto{totalMissing > 0 ? ` · faltan ${totalMissing}` : ""}
        </Button>
      }
    >
      {stock.length === 0 ? (
        <p className="text-sm text-[#1B1B1B]/55">No quedó nada: ¡se vendió todo!</p>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ s, f, missing }) => {
            const remaining = s.available + s.expired;
            const free = (k: keyof Fate) => f[k] + Math.max(0, missing);
            return (
              <li key={s.productId} className="rounded-2xl bg-[#F8F7F2] p-4">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-[#1F4D36]">{s.name}</strong>
                  <span className="text-xs text-[#1B1B1B]/55">
                    Deberían quedar {remaining}
                    {s.expired ? ` (${s.expired} vencidos)` : ""} · pueden volver {s.returnable}
                  </span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  {(
                    [
                      ["returned", "Vuelve a cocina", Math.min(s.returnable, free("returned"))],
                      ["staff", "Equipo", free("staff")],
                      ["donated", "Donación", free("donated")],
                      ["lost", "Pérdida", free("lost")],
                    ] as const
                  ).map(([k, label, max]) => (
                    <div key={k}>
                      <p className="mb-1 text-xs font-semibold text-[#1B1B1B]/60">{label}</p>
                      <Counter label={`${label} de ${s.name}`} value={f[k]} max={max} onChange={(n) => set(s.productId, k, n)} />
                    </div>
                  ))}
                </div>
                {missing > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> {missing} sin contar: quedarán como faltante.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

function CancelSaleSheet({ sale, onClose, onDone }: { sale: PointSale; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <Sheet
      title={`Anular ${sale.code}`}
      description={`Se devuelven ${formatPrice(sale.total)} y los platos vuelven al punto.`}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={pending || note.trim().length < 3}
          onClick={() =>
            start(async () => {
              if (notify(await cancelPointSale(sale.id, note))) onDone();
            })
          }
        >
          Anular venta
        </Button>
      }
    >
      <label htmlFor="cancel-sale" className={fieldLabelClass}>
        Motivo
      </label>
      <Input id="cancel-sale" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. me equivoqué de plato" maxLength={250} />
    </Sheet>
  );
}
