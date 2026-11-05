import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, ShieldCheck, Sparkles } from "lucide-react";
import { PaymentBox } from "@/components/cart/PaymentBox";
import { DiscardSubscriptionButton } from "@/components/subscriptions/DiscardSubscriptionButton";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { formatDeliveryDate } from "@/lib/delivery";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Pago del plan | FRESKO" };

export default async function PagoSuscripcionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const session = await requireConsentedSession(`/pago/suscripcion/${id}`);
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, code, plan_name, portions, discount, base_value, validity_days, status, payment_status, total, orders(id, delivery_date, slot_label, status, order_items(name, quantity))")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!sub) notFound();
  if (sub.status !== "pendiente_pago") redirect(`/cuenta/suscripcion/${sub.code}`);

  const deliveries = sub.orders.filter((o) => o.status !== "cancelado").sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  const scheduled = deliveries.reduce((s, o) => s + o.order_items.reduce((x, i) => x + i.quantity, 0), 0);

  return (
    <>
      <Navbar />
      <ScrollToTop />
      <main className="min-h-screen bg-[#F8F7F2] pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7CB342]">Plan {sub.code}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1F4D36]">Pago</h1>

          <div className="mt-6 grid items-start gap-6 sm:mt-8 md:grid-cols-[minmax(0,1fr)_340px]">
            {/* En móvil el pago va primero: el botón se ve sin bajar. */}
            <section className="order-2 rounded-3xl bg-white p-5 ring-1 ring-[#1F4D36]/[0.07] sm:p-6 md:order-none">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-[#1F4D36]">{sub.plan_name}</h2>
                  <p className="text-sm text-[#1B1B1B]/55">
                    {sub.portions} platos · −{Math.round(Number(sub.discount) * 100)}% · {sub.validity_days} días para usarlos desde el pago
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-[#F4F8F2] p-3">
                  <p className="font-display text-2xl font-bold text-[#1F4D36]">{scheduled}</p>
                  <p className="text-[11px] text-[#1B1B1B]/50">platos programados</p>
                </div>
                <div className="rounded-2xl bg-[#F8F7F2] p-3">
                  <p className="font-display text-2xl font-bold text-[#1F4D36]">{sub.portions - scheduled}</p>
                  <p className="text-[11px] text-[#1B1B1B]/50">por programar después</p>
                </div>
              </div>

              {deliveries.length > 0 && (
                <>
                  <h3 className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">
                    <CalendarDays className="h-3.5 w-3.5" /> Entregas
                  </h3>
                  <ul className="mt-2 divide-y divide-[#1F4D36]/[0.06] text-sm">
                    {deliveries.map((o) => (
                      <li key={o.id} className="flex justify-between gap-4 py-2.5">
                        <span className="font-medium text-[#1F4D36]">
                          {formatDeliveryDate(o.delivery_date, { weekday: "short", day: "numeric", month: "short" }, true)}
                          <span className="block text-xs font-normal text-[#1B1B1B]/45">{o.slot_label}</span>
                        </span>
                        <span className="text-right text-xs text-[#1B1B1B]/60">{o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-4 flex justify-between border-t border-[#1F4D36]/[0.06] pt-4 font-display text-lg font-bold text-[#1F4D36]">
                <span>Total</span>
                <span>{formatPrice(sub.total)}</span>
              </div>
            </section>

            <div className="order-1 space-y-4 md:sticky md:top-24 md:order-none">
              <PaymentBox kind="subscription" orderId={sub.id} code={sub.code} total={sub.total} rejected={sub.payment_status === "rechazado"} />
              <p className="flex items-center justify-center gap-1.5 text-xs text-[#1B1B1B]/45">
                <ShieldCheck className="h-4 w-4" /> Pago seguro · la pasarela real se conecta al final
              </p>
              <div className="flex items-center justify-center gap-3 text-xs">
                <Link href="/cuenta/suscripcion" className="text-[#1F4D36]/60 underline hover:text-[#1F4D36]">
                  Pagar más tarde
                </Link>
                <DiscardSubscriptionButton subscriptionId={sub.id} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
