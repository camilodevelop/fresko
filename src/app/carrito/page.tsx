"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DeliveryPicker } from "@/components/cart/DeliveryPicker";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import {
  formatDeliveryDate,
  minDeliveryDate,
  slotLabel,
} from "@/lib/data/delivery";
import { cn, formatPrice } from "@/lib/utils";

export default function CarritoPage() {
  const {
    cart,
    total,
    setQuantity,
    removeItem,
    setDeliveryMode,
    setPackageDelivery,
    setLineDelivery,
  } = useCart();
  const minDate = minDeliveryDate();

  const packageReady = Boolean(cart.packageDate && cart.packageSlotId);
  const itemsReady =
    cart.deliveryMode === "package"
      ? packageReady
      : cart.lines.every((line) => line.date && line.slotId);

  const whatsappText = () => {
    const lines = cart.lines
      .map((line) => {
        const when =
          cart.deliveryMode === "package"
            ? `${formatDeliveryDate(cart.packageDate!)} · ${slotLabel(cart.packageSlotId)}`
            : `${formatDeliveryDate(line.date!)} · ${slotLabel(line.slotId)}`;
        const extras = line.details ? ` [${line.details}]` : "";
        return `• ${line.quantity}x ${line.name}${extras} (${formatPrice(line.price)}) — ${when}`;
      })
      .join("\n");
    const mode =
      cart.deliveryMode === "package"
        ? "Paquete (misma entrega)"
        : "Entrega por producto";
    return `Hola FRESKO, quiero este pedido:\n${mode}\n${lines}\nTotal: ${formatPrice(total)}`;
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8F7F2] pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-[#1F4D36] sm:text-4xl">
            Carrito
          </h1>
          <p className="mt-2 text-sm text-[#1B1B1B]/60">
            Agrega productos y elige la fecha y franja de entrega: para todo el
            paquete o por cada producto.
          </p>

          {cart.lines.length === 0 ? (
            <div className="mt-10 rounded-3xl bg-white p-10 text-center">
              <p className="text-[#1B1B1B]/60">Aún no hay productos.</p>
              <Button className="mt-6" asChild>
                <Link href="/menu">Ver menú</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <div className="flex rounded-full bg-white p-1">
                  {(
                    [
                      ["package", "Todo el paquete"],
                      ["perItem", "Por producto"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDeliveryMode(mode)}
                      className={cn(
                        "flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider",
                        cart.deliveryMode === mode
                          ? "bg-[#1F4D36] text-white"
                          : "text-[#1F4D36]/60"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {cart.deliveryMode === "package" && (
                  <div className="rounded-3xl border border-[#1F4D36]/8 bg-white p-5">
                    <h2 className="font-display text-lg font-bold text-[#1F4D36]">
                      Entrega del paquete
                    </h2>
                    <p className="mt-1 text-sm text-[#1B1B1B]/55">
                      Todos los productos llegan el mismo día, en la misma franja.
                    </p>
                    <div className="mt-4">
                      <DeliveryPicker
                        date={cart.packageDate}
                        slotId={cart.packageSlotId}
                        minDate={minDate}
                        onDate={(date) => setPackageDelivery(date, cart.packageSlotId)}
                        onSlot={(slotId) =>
                          setPackageDelivery(cart.packageDate, slotId)
                        }
                      />
                    </div>
                  </div>
                )}

                <ul className="space-y-4">
                  {cart.lines.map((line) => (
                    <li
                      key={line.productId}
                      className="rounded-3xl border border-[#1F4D36]/8 bg-white p-4 sm:p-5"
                    >
                      <div className="flex gap-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F4F8F2]">
                          <Image
                            src={line.image}
                            alt=""
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-display font-bold text-[#1F4D36]">
                                {line.name}
                              </p>
                              {line.details && (
                                <p className="mt-1 text-xs leading-relaxed text-[#1B1B1B]/45">
                                  {line.details}
                                </p>
                              )}
                              <p className="text-sm text-[#1B1B1B]/50">
                                {formatPrice(line.price)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(line.productId)}
                              className="text-[#1F4D36]/40 hover:text-red-600"
                              aria-label="Quitar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F8F2]"
                              onClick={() =>
                                setQuantity(line.productId, line.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F8F2]"
                              onClick={() =>
                                setQuantity(line.productId, line.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {cart.deliveryMode === "perItem" && (
                        <div className="mt-4 border-t border-[#1F4D36]/8 pt-4">
                          <DeliveryPicker
                            date={line.date}
                            slotId={line.slotId}
                            minDate={minDate}
                            onDate={(date) =>
                              setLineDelivery(line.productId, date, line.slotId)
                            }
                            onSlot={(slotId) =>
                              setLineDelivery(line.productId, line.date, slotId)
                            }
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="font-display text-lg font-bold text-[#1F4D36]">
                  Resumen
                </h2>
                <p className="mt-4 flex justify-between text-sm">
                  <span className="text-[#1B1B1B]/55">Productos</span>
                  <span className="font-semibold text-[#1F4D36]">
                    {cart.lines.reduce((s, l) => s + l.quantity, 0)}
                  </span>
                </p>
                <p className="mt-2 flex justify-between font-display text-xl font-bold text-[#1F4D36]">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </p>
                {!itemsReady && (
                  <p className="mt-3 text-xs text-amber-800">
                    Elige fecha y franja horaria para continuar.
                  </p>
                )}
                <Button
                  className="mt-6 w-full"
                  disabled={!itemsReady}
                  asChild={itemsReady}
                >
                  {itemsReady ? (
                    <a
                      href={`https://wa.me/573001234567?text=${encodeURIComponent(whatsappText())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Enviar pedido
                    </a>
                  ) : (
                    "Enviar pedido"
                  )}
                </Button>
                <Button variant="secondary" className="mt-3 w-full" asChild>
                  <Link href="/menu">Seguir comprando</Link>
                </Button>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
