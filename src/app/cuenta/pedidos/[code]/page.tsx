import { ScrollToTop } from "@/components/ui/scroll-to-top";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CreditCard, MapPin, MessageSquareText, PartyPopper } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/ui";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { OrderLiveRefresh } from "@/components/orders/OrderLiveRefresh";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS, formatDeliveryDate } from "@/lib/delivery";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function PedidoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pagado?: string }>;
}) {
  const [{ code }, { pagado }] = await Promise.all([params, searchParams]);
  const session = await requireSession(`/cuenta/pedidos/${code}`);
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, code, kind, status, payment_status, total, delivered_at, delivery_photo_path, subtotal, delivery_fee, delivery_date, slot_label, address_snapshot, notes, created_at, subscriptions(code, plan_name), order_items(id, name, quantity, unit_price, line_total, options), order_events(id, status, note, created_at)"
    )
    .eq("code", code.toUpperCase())
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!order) notFound();
  // Foto de la entrega (bucket privado): enlace temporal.
  const photo = order.delivery_photo_path
    ? (await supabase.storage.from("delivery-proofs").createSignedUrl(order.delivery_photo_path, 3600)).data?.signedUrl ?? null
    : null;

  const address = order.address_snapshot as { label: string; address: string; details: string };
  const events = [...order.order_events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

  return (
    <div>
      <ScrollToTop />
      <OrderLiveRefresh orderId={order.id} />
      <PageHeader
        back={{ href: "/cuenta/pedidos", label: "Mis pedidos" }}
        eyebrow={`Pedido del ${fmt.format(new Date(order.created_at))}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.code}
            <OrderStatusBadge status={order.status} />
          </span>
        }
        actions={
          order.kind === "suscripcion" && order.subscriptions ? (
            <Button variant="secondary" asChild>
              <Link href={`/cuenta/suscripcion/${order.subscriptions.code}`}>Entrega de tu {order.subscriptions.plan_name} · Cambiarla</Link>
            </Button>
          ) : (
          order.status === "pendiente_pago" && (
            <div className="flex flex-wrap items-center gap-2">
              <CancelOrderButton orderId={order.id} />
              <Button asChild>
                <Link href={`/pago/${order.id}`}>
                  <CreditCard className="h-4 w-4" /> Pagar ahora
                </Link>
              </Button>
            </div>
          )
          )
        }
      />

      {pagado && order.status === "confirmado" && (
        <div className="mb-6 flex items-center gap-3 rounded-3xl bg-[#1F4D36] p-5 text-white">
          <PartyPopper className="h-6 w-6 shrink-0 text-[#C5E1A5]" />
          <div>
            <p className="font-display font-bold">¡Gracias! Tu pedido está confirmado.</p>
            <p className="text-sm text-white/70">Te avisaremos cuando esté en preparación y cuando vaya en camino.</p>
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel title="Estado">
            <OrderTimeline status={order.status} />
            {photo && (
              <a href={photo} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-3 rounded-2xl bg-[#F4F8F2] p-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado temporal */}
                <img src={photo} alt="Foto de la entrega" className="h-16 w-16 rounded-xl object-cover" />
                <span>
                  <span className="block font-semibold text-[#1F4D36]">Foto de la entrega</span>
                  <span className="text-xs text-[#1B1B1B]/50">
                    {order.delivered_at
                      ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(order.delivered_at))
                      : ""}{" "}
                    · toca para ampliar
                  </span>
                </span>
              </a>
            )}
          </Panel>

          <Panel title="Productos">
            <ul className="divide-y divide-[#1F4D36]/[0.06] text-sm">
              {order.order_items.map((item) => {
                const opts = (item.options as { name: string }[]) ?? [];
                return (
                  <li key={item.id} className="flex justify-between gap-4 py-3 first:pt-0">
                    <span>
                      <span className="font-medium text-[#1F4D36]">
                        {item.quantity}× {item.name}
                      </span>
                      {opts.length > 0 && <span className="block text-xs text-[#1B1B1B]/45">{opts.map((o) => o.name).join(", ")}</span>}
                      {item.quantity > 1 && <span className="block text-xs text-[#1B1B1B]/40">{formatPrice(item.unit_price)} c/u</span>}
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
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Entrega">
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <CalendarDays className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                <div>
                  <p className="font-semibold text-[#1F4D36]">{formatDeliveryDate(order.delivery_date, { weekday: "long", day: "numeric", month: "long" }, true)}</p>
                  <p className="text-[#1B1B1B]/55">{order.slot_label}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                <div>
                  <p className="font-semibold text-[#1F4D36]">{address.label}</p>
                  <p className="text-[#1B1B1B]/65">{address.address}</p>
                  {address.details && <p className="text-[#1B1B1B]/45">{address.details}</p>}
                </div>
              </div>
              {order.notes && (
                <div className="flex gap-3">
                  <MessageSquareText className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                  <p className="text-[#1B1B1B]/65">{order.notes}</p>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#1F4D36]/[0.06] pt-3">
                <span className="text-[#1B1B1B]/55">Pago</span>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
            </div>
          </Panel>

          <Panel title="Historial">
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8BC34A]" />
                  <div>
                    <p className="font-medium text-[#1F4D36]">{e.note || ORDER_STATUS[e.status]?.label || e.status}</p>
                    <p className="text-xs text-[#1B1B1B]/40">{fmt.format(new Date(e.created_at))}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
