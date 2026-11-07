import Link from "next/link";
import { CalendarDays, ChefHat, ClipboardList, Package, Truck, Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge } from "@/components/dashboard/ui";
import { OrderFilters } from "@/components/admin-orders/OrderFilters";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/OrderStatusBadge";
import { todayBogota } from "@/lib/account";
import { ORDER_STATUS, formatDeliveryDate } from "@/lib/delivery";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPrice } from "@/lib/utils";

const VIEWS = [
  { id: "hoy", label: "Para hoy" },
  { id: "proximos", label: "Próximos" },
  { id: "pendientes", label: "Sin pagar" },
  { id: "todos", label: "Todos" },
] as const;

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; estado?: string; fecha?: string; q?: string }>;
}) {
  await requirePermission("orders.view");
  const { vista = "hoy", estado = "", fecha = "", q = "" } = await searchParams;
  const supabase = await createClient();
  const today = todayBogota();

  let query = supabase
    .from("orders")
    .select("id, code, kind, status, payment_status, total, delivery_date, slot_label, created_at, contact_name, address_snapshot, zones(name), order_items(quantity)")
    .order("delivery_date", { ascending: vista !== "todos" })
    .order("slot_label")
    .order("created_at", { ascending: false })
    .limit(200);

  // Buscar por código (más de 3 caracteres) busca en todas las fechas; si no, filtra por fecha y vista.
  const term = q.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  // Fecha que muestra el selector: la elegida o, en "Para hoy", la de hoy.
  const shownDate = validDate ? fecha : vista === "hoy" ? today : "";
  if (term.length > 3) query = query.ilike("code", `%${term}%`);
  else if (validDate) query = query.eq("delivery_date", fecha);
  else if (vista === "hoy") query = query.eq("delivery_date", today).neq("status", "pendiente_pago");
  else if (vista === "proximos") query = query.gt("delivery_date", today).neq("status", "pendiente_pago");
  else if (vista === "pendientes") query = query.eq("status", "pendiente_pago");
  if (estado && ORDER_STATUS[estado]) query = query.eq("status", estado);

  const [{ data: orders }, { data: todayOrders }] = await Promise.all([
    query,
    supabase.from("orders").select("status, total").eq("delivery_date", today).neq("status", "pendiente_pago").neq("status", "cancelado"),
  ]);
  const t = todayOrders ?? [];
  const count = (s: string) => t.filter((o) => o.status === s).length;
  const sales = t.reduce((sum, o) => sum + o.total, 0);

  const link = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ vista, ...(estado && { estado }), ...(fecha && { fecha }), ...(q && { q }), ...patch });
    for (const [k, v] of [...params.entries()]) if (!v) params.delete(k);
    return `/admin/pedidos?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Pedidos"
        description="Todo lo que hay que preparar y entregar. Cambia el estado desde el detalle de cada pedido."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Pedidos para hoy" value={t.length} tone="dark" />
        <StatCard icon={ChefHat} label="Por preparar" value={count("confirmado")} hint={`${count("en_preparacion")} en preparación`} />
        <StatCard icon={Truck} label="En camino" value={count("en_camino")} hint={`${count("entregado")} entregados`} tone="fresh" />
        <StatCard icon={Wallet} label="Ventas de hoy" value={formatPrice(sales)} />
      </div>

      <Panel
        bodyClassName="p-0"
        title={`${orders?.length ?? 0} pedidos`}
        actions={
          <OrderFilters q={q} fecha={term.length > 3 ? "" : shownDate} />
        }
      >
        <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-6 [&::-webkit-scrollbar]:hidden">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={`/admin/pedidos?vista=${v.id}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                vista === v.id && !fecha ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36]/70 hover:text-[#1F4D36]"
              )}
            >
              {v.label}
            </Link>
          ))}
          <span className="mx-1 w-px shrink-0 bg-[#1F4D36]/10" />
          {["confirmado", "en_preparacion", "en_camino", "entregado", "no_entregado", "cancelado"].map((s) => (
            <Link
              key={s}
              href={link({ estado: estado === s ? "" : s })}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                estado === s ? "bg-[#E8F3DC] text-[#1F4D36] ring-1 ring-[#8BC34A]" : "text-[#1B1B1B]/45 hover:text-[#1F4D36]"
              )}
            >
              {ORDER_STATUS[s].label}
            </Link>
          ))}
        </div>

        {orders && orders.length > 0 ? (
          <>
          {/* Móvil: tarjetas */}
          <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06] md:hidden">
            {orders.map((o) => {
              const addr = o.address_snapshot as { address: string };
              const items = o.order_items.reduce((s, i) => s + i.quantity, 0);
              return (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.code}`} className="block px-5 py-4 active:bg-[#F8F7F2]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-display font-bold text-[#1F4D36]">{o.code}</span>
                      <span className="font-semibold text-[#1F4D36]">{formatPrice(o.total)}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#1B1B1B]/70">
                      <span className={cn("font-medium", o.delivery_date === today && "text-[#1F4D36]")}>
                        {o.delivery_date === today ? "Hoy" : formatDeliveryDate(o.delivery_date, { weekday: "short", day: "numeric", month: "short" }, true)}
                      </span>{" "}
                      · {o.slot_label} · {items} {items === 1 ? "plato" : "platos"}
                    </p>
                    <p className="truncate text-xs text-[#1B1B1B]/45">
                      {o.contact_name || "Sin nombre"} · {addr.address}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <OrderStatusBadge status={o.status} />
                      {o.kind === "suscripcion" ? <StatusBadge tone="blue" dot={false}>Plan</StatusBadge> : <PaymentStatusBadge status={o.payment_status} />}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                  <th className="px-6 py-3">Pedido</th>
                  <th className="px-3 py-3">Entrega</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Zona</th>
                  <th className="px-3 py-3 text-center">Platos</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const addr = o.address_snapshot as { address: string };
                  const items = o.order_items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr key={o.id} className="relative cursor-pointer border-b border-[#1F4D36]/[0.05] last:border-0 hover:bg-[#F8F7F2]/60">
                      <td className="px-6 py-3">
                        <Link href={`/admin/pedidos/${o.code}`} className="font-semibold text-[#1F4D36] after:absolute after:inset-0 hover:underline">
                          {o.code}
                        </Link>
                        <div className="mt-0.5">
                          {o.kind === "suscripcion" ? <StatusBadge tone="blue" dot={false}>Plan</StatusBadge> : <PaymentStatusBadge status={o.payment_status} />}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className={cn("font-medium", o.delivery_date === today ? "text-[#1F4D36]" : "text-[#1B1B1B]/70")}>
                          {o.delivery_date === today ? "Hoy" : formatDeliveryDate(o.delivery_date, { weekday: "short", day: "numeric", month: "short" }, true)}
                        </p>
                        <p className="text-xs text-[#1B1B1B]/45">{o.slot_label}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-[#1B1B1B]/75">{o.contact_name || "Sin nombre"}</p>
                        <p className="max-w-[220px] truncate text-xs text-[#1B1B1B]/45">{addr.address}</p>
                      </td>
                      <td className="px-3 py-3 text-[#1B1B1B]/60">{o.zones?.name}</td>
                      <td className="px-3 py-3 text-center font-semibold text-[#1F4D36]">{items}</td>
                      <td className="px-3 py-3">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-[#1F4D36]">{formatPrice(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={vista === "hoy" ? CalendarDays : Package}
              title={vista === "hoy" && !fecha ? "No hay pedidos para hoy" : "Sin pedidos"}
              description="Prueba con otra vista o fecha."
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
