import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { PaymentBox } from "@/components/cart/PaymentBox";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { formatDeliveryDate } from "@/lib/delivery";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Pago | FRESKO" };

export default async function PagoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const session = await requireConsentedSession(`/pago/${id}`);
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, code, status, payment_status, total, subtotal, delivery_fee, delivery_date, slot_label, address_snapshot, order_items(id, name, quantity, line_total, options)")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!order) notFound();
  if (order.status !== "pendiente_pago") redirect(`/cuenta/pedidos/${order.code}`);

  const address = order.address_snapshot as { label: string; address: string; details: string };

  return (
    <>
      <Navbar />
      <ScrollToTop />
      <main className="min-h-screen bg-[#F8F7F2] pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7CB342]">Pedido {order.code}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1F4D36]">Pago</h1>

          <div className="mt-6 grid items-start gap-6 sm:mt-8 md:grid-cols-[minmax(0,1fr)_340px]">
            {/* En móvil el pago va primero: el botón se ve sin bajar. */}
            <section className="order-2 rounded-3xl bg-white p-5 ring-1 ring-[#1F4D36]/[0.07] sm:p-6 md:order-none">
              <h2 className="font-display font-bold text-[#1F4D36]">Resumen del pedido</h2>
              <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] text-sm">
                {order.order_items.map((item) => {
                  const opts = (item.options as { name: string }[]) ?? [];
                  return (
                    <li key={item.id} className="flex justify-between gap-4 py-3">
                      <span>
                        <span className="font-medium text-[#1F4D36]">
                          {item.quantity}× {item.name}
                        </span>
                        {opts.length > 0 && <span className="block text-xs text-[#1B1B1B]/45">{opts.map((o) => o.name).join(", ")}</span>}
                      </span>
                      <span className="font-semibold text-[#1F4D36]">{formatPrice(item.line_total)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-2 space-y-1.5 border-t border-[#1F4D36]/[0.06] pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#1B1B1B]/55">Subtotal</dt>
                  <dd>{formatPrice(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#1B1B1B]/55">Domicilio</dt>
                  <dd className="text-[#2E6B1F]">{order.delivery_fee ? formatPrice(order.delivery_fee) : "Gratis"}</dd>
                </div>
                <div className="flex justify-between pt-1 font-display text-lg font-bold text-[#1F4D36]">
                  <dt>Total</dt>
                  <dd>{formatPrice(order.total)}</dd>
                </div>
              </dl>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl bg-[#F8F7F2] p-4 text-sm">
                  <CalendarDays className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                  <div>
                    <p className="font-semibold text-[#1F4D36]">{formatDeliveryDate(order.delivery_date, { weekday: "long", day: "numeric", month: "long" }, true)}</p>
                    <p className="text-[#1B1B1B]/55">{order.slot_label}</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl bg-[#F8F7F2] p-4 text-sm">
                  <MapPin className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1F4D36]">{address.label}</p>
                    <p className="truncate text-[#1B1B1B]/55">{address.address}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="order-1 space-y-4 md:sticky md:top-24 md:order-none">
              <PaymentBox orderId={order.id} code={order.code} total={order.total} rejected={order.payment_status === "rechazado"} />
              <p className="flex items-center justify-center gap-1.5 text-xs text-[#1B1B1B]/45">
                <ShieldCheck className="h-4 w-4" /> Pago seguro · la pasarela real se conecta al final
              </p>
              <p className="text-center text-xs">
                <Link href={`/cuenta/pedidos/${order.code}`} className="text-[#1F4D36]/60 underline hover:text-[#1F4D36]">
                  Pagar más tarde
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
