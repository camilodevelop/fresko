import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Mail, Phone, Wallet } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { PageHeader, Panel, StatusBadge } from "@/components/dashboard/ui";
import { formatDeliveryDate } from "@/lib/delivery";
import { formatPhone } from "@/lib/phone";
import { requirePermission } from "@/lib/supabase/auth";
import { SUBSCRIPTION_STATUS } from "@/lib/subscriptions";
import { loadSubscriptionDetail } from "@/lib/subscriptions-data";
import { formatPrice } from "@/lib/utils";

export default async function SuscripcionAdminDetalle({ params }: { params: Promise<{ code: string }> }) {
  await requirePermission("orders.view");
  const { code } = await params;
  if (!/^SU-\d+$/.test(code)) notFound();
  const sub = await loadSubscriptionDetail(code);
  if (!sub) notFound();
  const status = SUBSCRIPTION_STATUS[sub.state] ?? SUBSCRIPTION_STATUS.activa;
  const paid = sub.payments.filter((p) => p.status === "aprobado").reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/suscripciones", label: "Suscripciones" }}
        eyebrow={sub.code}
        title={sub.planName}
        description={`${sub.portions} platos · −${Math.round(sub.discount * 100)}% · valor base ${formatPrice(sub.baseValue)}`}
        actions={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Entregas" icon={CalendarDays} bodyClassName="p-0" description={`${sub.used} de ${sub.portions} platos usados · ${sub.delivered} entregados`}>
          {sub.deliveries.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[#1B1B1B]/50 sm:px-6">Todavía no hay entregas programadas.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
              {sub.deliveries.map((d) => (
                <li key={d.orderId}>
                  <Link href={`/admin/pedidos/${d.code}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-[#F8F7F2]/70 sm:px-6">
                    <span className="w-28 shrink-0 text-sm font-semibold text-[#1F4D36]">
                      {formatDeliveryDate(d.date, { weekday: "short", day: "numeric", month: "short" }, true)}
                      <span className="block text-xs font-normal text-[#1B1B1B]/45">{d.slotLabel}</span>
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-[#1B1B1B]/70">
                      {d.dishes.map((x) => `${x.quantity}× ${x.name}`).join(", ")}
                      <span className="block text-xs text-[#1B1B1B]/45">
                        {d.code} · {d.addressLabel}
                      </span>
                    </span>
                    <OrderStatusBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4 xl:sticky xl:top-24">
          <Panel title="Cliente">
            <p className="font-semibold text-[#1F4D36]">{sub.customer?.full_name || "Sin nombre"}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#1B1B1B]/60">
              <Mail className="h-4 w-4" /> {sub.customer?.email}
            </p>
            {sub.customer?.phone && (
              <p className="mt-1 flex items-center gap-2 text-sm text-[#1B1B1B]/60">
                <Phone className="h-4 w-4" /> {formatPhone(sub.customer.phone)}
              </p>
            )}
          </Panel>
          <Panel title="Vigencia">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">Desde</dt>
                <dd>{formatDeliveryDate(sub.startsOn, { day: "numeric", month: "short", year: "numeric" })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">Hasta</dt>
                <dd>{formatDeliveryDate(sub.expiresOn, { day: "numeric", month: "short", year: "numeric" })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1B1B1B]/55">Platos por programar</dt>
                <dd className="font-semibold text-[#1F4D36]">{sub.state === "activa" ? sub.portions - sub.used : 0}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Pagos" icon={Wallet}>
            <ul className="space-y-1.5 text-sm">
              {sub.payments.map((p, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-[#1B1B1B]/60">
                    {p.kind === "compra" ? "Compra del plan" : "Diferencia por cambio"}
                    <span className="block text-[11px] text-[#1B1B1B]/40">
                      {new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(p.created_at))}
                    </span>
                  </span>
                  <span className={p.status === "aprobado" ? "font-semibold text-[#1F4D36]" : "text-red-700 line-through"}>{formatPrice(p.amount)}</span>
                </li>
              ))}
              {sub.payments.length === 0 && <li className="text-[#1B1B1B]/45">Sin pagos.</li>}
            </ul>
            <p className="mt-3 flex justify-between border-t border-[#1F4D36]/[0.06] pt-3 font-semibold text-[#1F4D36]">
              <span>Total pagado</span>
              <span>{formatPrice(paid)}</span>
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
