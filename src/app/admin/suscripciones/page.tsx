import Link from "next/link";
import { AlertTriangle, Repeat, Salad, Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge } from "@/components/dashboard/ui";
import { formatDeliveryDate } from "@/lib/delivery";
import { requirePermission } from "@/lib/supabase/auth";
import { daysBetween, SUBSCRIPTION_STATUS, todayBogota } from "@/lib/subscriptions";
import { loadAllSubscriptions } from "@/lib/subscriptions-data";
import { cn, formatPrice } from "@/lib/utils";

const VIEWS = [
  { id: "activas", label: "Activas" },
  { id: "por-vencer", label: "Por vencer" },
  { id: "pendientes", label: "Sin pagar" },
  { id: "vencidas", label: "Vencidas" },
  { id: "todas", label: "Todas" },
] as const;

export default async function SuscripcionesAdminPage({ searchParams }: { searchParams: Promise<{ vista?: string; q?: string }> }) {
  await requirePermission("orders.view");
  const { vista = "activas", q = "" } = await searchParams;
  const all = await loadAllSubscriptions();
  const today = todayBogota();
  const term = q.trim().toLowerCase();

  const soon = (s: (typeof all)[number]) => s.state === "activa" && daysBetween(today, s.expiresOn) <= 7 && s.portions - s.used > 0;
  const shown = all
    .filter((s) =>
      vista === "activas" ? s.state === "activa" : vista === "por-vencer" ? soon(s) : vista === "pendientes" ? s.state === "pendiente_pago" : vista === "vencidas" ? s.state === "vencida" : true
    )
    .filter((s) => !term || s.code.toLowerCase().includes(term) || s.customer?.email.toLowerCase().includes(term) || s.customer?.full_name.toLowerCase().includes(term));

  const active = all.filter((s) => s.state === "activa");
  const month = today.slice(0, 7);
  const soldThisMonth = all.filter((s) => s.state !== "pendiente_pago" && s.startsOn.startsWith(month)).reduce((x, s) => x + s.total, 0);
  const freePortions = active.reduce((x, s) => x + (s.portions - s.used), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Suscripciones"
        description="Planes vendidos y cómo los usa cada cliente. Las entregas programadas aparecen también en Pedidos."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Repeat} label="Planes activos" value={active.length} tone="dark" />
        <StatCard icon={AlertTriangle} label="Por vencer (7 días)" value={all.filter(soon).length} hint="Con platos sin programar" />
        <StatCard icon={Salad} label="Platos por programar" value={freePortions} hint="En planes activos" tone="fresh" />
        <StatCard icon={Wallet} label="Vendido este mes" value={formatPrice(soldThisMonth)} />
      </div>

      <Panel
        bodyClassName="p-0"
        title={`${shown.length} suscripciones`}
        actions={
          <form className="w-full sm:w-auto" action="/admin/suscripciones">
            <input type="hidden" name="vista" value={vista} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Código, nombre o correo"
              aria-label="Buscar suscripción"
              className="h-9 w-full rounded-full border border-[#1F4D36]/12 bg-[#F8F7F2] px-4 text-sm outline-none focus:border-[#8BC34A] focus:bg-white sm:w-60"
            />
          </form>
        }
      >
        <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap sm:px-6 [&::-webkit-scrollbar]:hidden">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={`/admin/suscripciones?vista=${v.id}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                vista === v.id ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36]/70 hover:text-[#1F4D36]"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Repeat} title="Sin suscripciones" description="Prueba con otra vista o búsqueda." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
            {shown.map((s) => {
              const status = SUBSCRIPTION_STATUS[s.state] ?? SUBSCRIPTION_STATUS.activa;
              const left = daysBetween(today, s.expiresOn);
              return (
                <li key={s.id}>
                  <Link href={`/admin/suscripciones/${s.code}`} className="grid gap-3 px-5 py-4 hover:bg-[#F8F7F2]/70 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-[#1F4D36]">
                        {s.code} <span className="font-normal text-[#1B1B1B]/50">· {s.planName}</span>
                      </p>
                      <p className="truncate text-xs text-[#1B1B1B]/50">
                        {s.customer?.full_name || "Sin nombre"} · {s.customer?.email}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#1B1B1B]/50">
                        <span>
                          {s.used}/{s.portions} platos
                        </span>
                        <span>{s.delivered} entregados</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EEF3EA]">
                        <div className="h-full rounded-full bg-[#8BC34A]" style={{ width: `${Math.min(100, (s.used / s.portions) * 100)}%` }} />
                      </div>
                    </div>
                    <p className="text-xs text-[#1B1B1B]/55">
                      {s.state === "activa"
                        ? `Vence ${formatDeliveryDate(s.expiresOn, { day: "numeric", month: "short" })} · ${left} ${left === 1 ? "día" : "días"}`
                        : s.state === "vencida"
                          ? `Venció ${formatDeliveryDate(s.expiresOn, { day: "numeric", month: "short" })}`
                          : `Creada ${formatDeliveryDate(s.createdAt.slice(0, 10), { day: "numeric", month: "short" })}`}
                    </p>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <span className="font-semibold text-[#1F4D36]">{formatPrice(s.total)}</span>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
