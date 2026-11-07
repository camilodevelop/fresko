import Link from "next/link";
import { IncidentResolve } from "@/components/admin-orders/IncidentResolve";
import { OrderTrace } from "@/components/admin-orders/OrderTrace";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, MapPin, MessageSquareText, Phone, UserRound } from "lucide-react";
import { OrderStatusActions } from "@/components/admin-orders/OrderStatusActions";
import { PageHeader, Panel } from "@/components/dashboard/ui";
import { OrderLiveRefresh } from "@/components/orders/OrderLiveRefresh";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ORDER_STATUS, formatDeliveryDate } from "@/lib/delivery";
import { formatPhone, whatsappDigits } from "@/lib/phone";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function AdminPedidoPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await requirePermission("orders.view");
  const canManage = session.permissions.has("orders.manage");
  const { code } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, code, kind, status, payment_status, total, delivered_at, delivery_photo_path, on_hold, order_incidents(stage, item_name, quantity, reason, note, created_at, resolution, photo_path), subtotal, delivery_fee, delivery_date, slot_label, address_snapshot, notes, contact_name, contact_phone, created_at, paid_at, zones(name), subscriptions(code, plan_name), profiles!orders_user_id_fkey(email), order_items(id, name, quantity, unit_price, line_total, options), order_events(id, status, note, created_at, profiles(full_name)), payments(id, status, amount, reference, provider, created_at)"
    )
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!order) notFound();

  const addr = order.address_snapshot as { label: string; address: string; details: string; lat: number; lng: number };
  const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  const events = [...order.order_events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const phoneDigits = whatsappDigits(order.contact_phone);

  return (
    <div>
      <OrderLiveRefresh orderId={order.id} />
      <PageHeader
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        eyebrow={`Creado ${fmt.format(new Date(order.created_at))}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.code}
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment_status} />
            {order.subscriptions && (
              <Link
                href={`/admin/suscripciones/${order.subscriptions.code}`}
                className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:underline"
              >
                {order.subscriptions.plan_name} · {order.subscriptions.code}
              </Link>
            )}
          </span>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <IncidentResolve
            orderId={order.id}
            status={order.status}
            onHold={order.on_hold}
            incidents={await Promise.all(
              order.order_incidents.map(async (n) => ({
                ...n,
                photoUrl: n.photo_path ? ((await supabase.storage.from("delivery-proofs").createSignedUrl(n.photo_path, 3600)).data?.signedUrl ?? null) : null,
              }))
            )}
            canManage={canManage}
          />

          <OrderTrace order={order} showMoney={session.permissions.has("reports.view")} />

          <Panel title="Detalle de la compra" description={`${order.order_items.reduce((s, i) => s + i.quantity, 0)} platos`}>
            <ul className="divide-y divide-[#1F4D36]/[0.06] text-sm">
              {order.order_items.map((item) => {
                const opts = (item.options as { name: string; step: string }[]) ?? [];
                return (
                  <li key={item.id} className="flex justify-between gap-4 py-3 first:pt-0">
                    <span className="flex gap-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#1F4D36] px-2 font-display text-sm font-bold text-white">
                        {item.quantity}
                      </span>
                      <span>
                        <span className="font-semibold text-[#1F4D36]">{item.name}</span>
                        {opts.length > 0 && <span className="block text-xs text-[#1B1B1B]/55">{opts.map((o) => o.name).join(" · ")}</span>}
                      </span>
                    </span>
                    <span className="text-[#1B1B1B]/60">{formatPrice(item.line_total)}</span>
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
                <dd>{order.delivery_fee ? formatPrice(order.delivery_fee) : "Gratis"}</dd>
              </div>
              <div className="flex justify-between pt-1 font-display text-lg font-bold text-[#1F4D36]">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Historial">
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8BC34A]" />
                  <div>
                    <p className="font-medium text-[#1F4D36]">
                      {ORDER_STATUS[e.status]?.label ?? e.status}
                      {e.note && <span className="font-normal text-[#1B1B1B]/55"> · {e.note}</span>}
                    </p>
                    <p className="text-xs text-[#1B1B1B]/40">
                      {fmt.format(new Date(e.created_at))}
                      {e.profiles?.full_name && ` · ${e.profiles.full_name}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          {canManage && (
            <Panel title="Acciones">
              <OrderStatusActions orderId={order.id} status={order.status} />
            </Panel>
          )}

          <Panel title="Entrega">
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <CalendarDays className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                <div>
                  <p className="font-semibold text-[#1F4D36]">{formatDeliveryDate(order.delivery_date, { weekday: "long", day: "numeric", month: "long" }, true)}</p>
                  <p className="text-[#1B1B1B]/55">
                    {order.slot_label} · {order.zones?.name}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                <div className="min-w-0">
                  <p className="font-semibold text-[#1F4D36]">{addr.address}</p>
                  {addr.details && <p className="text-[#1B1B1B]/55">{addr.details}</p>}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${addr.lat},${addr.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1F4D36] underline"
                  >
                    Abrir en el mapa <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              {order.notes && (
                <div className="flex gap-3">
                  <MessageSquareText className="h-5 w-5 shrink-0 text-[#1F4D36]" />
                  <p className="text-[#1B1B1B]/65">{order.notes}</p>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Cliente">
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-[#1F4D36]" />
                <span>
                  <span className="block font-semibold text-[#1F4D36]">{order.contact_name || "Sin nombre"}</span>
                  <span className="text-[#1B1B1B]/50">{order.profiles?.email}</span>
                </span>
              </p>
              {phoneDigits && (
                <p className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-[#1F4D36]" />
                  <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="font-medium text-[#1F4D36] underline">
                    {formatPhone(order.contact_phone)}
                  </a>
                </p>
              )}
            </div>
          </Panel>

          {order.payments.length > 0 && (
            <Panel title="Pagos">
              <ul className="space-y-2 text-xs">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-[#F8F7F2] px-3 py-2">
                    <span>
                      <span className="font-semibold text-[#1F4D36]">{p.reference}</span>
                      <span className="block text-[#1B1B1B]/45">
                        {p.provider} · {fmt.format(new Date(p.created_at))}
                      </span>
                    </span>
                    <span className={p.status === "aprobado" ? "font-semibold text-[#2E6B1F]" : "font-semibold text-red-600"}>
                      {p.status === "aprobado" ? "Aprobado" : "Rechazado"}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
