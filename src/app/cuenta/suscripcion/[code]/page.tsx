import { notFound } from "next/navigation";
import { PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { ManagerLoader } from "@/components/subscriptions/ManagerLoader";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { getBuilderConfig, getMenuItems } from "@/lib/data/catalog";
import { loadDeliveryZones, loadMyAddresses } from "@/lib/orders";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { SUBSCRIPTION_STATUS } from "@/lib/subscriptions";
import { loadSubscriptionDetail } from "@/lib/subscriptions-data";
import { formatPrice } from "@/lib/utils";

export default async function SuscripcionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pagado?: string }>;
}) {
  const [{ code }, { pagado }] = await Promise.all([params, searchParams]);
  if (!/^SU-\d+$/.test(code)) notFound();
  const session = await requireConsentedSession(`/cuenta/suscripcion/${code}`);
  const [sub, products, builder, addresses, deliveryZones] = await Promise.all([
    loadSubscriptionDetail(code, session.userId),
    getMenuItems(),
    getBuilderConfig(),
    loadMyAddresses(session.userId),
    loadDeliveryZones(),
  ]);
  if (!sub) notFound();
  const status = SUBSCRIPTION_STATUS[sub.state] ?? SUBSCRIPTION_STATUS.activa;

  return (
    <div>
      <ScrollToTop />
      <PageHeader
        back={{ href: "/cuenta/suscripcion", label: "Mis planes" }}
        eyebrow={sub.code}
        title={sub.planName}
        description={`${sub.portions} platos · −${Math.round(sub.discount * 100)}% · pagado ${formatPrice(sub.total)}`}
        actions={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      />
      {pagado && sub.state === "activa" && (
        <div className="mb-6 rounded-3xl bg-[#1F4D36] p-5 text-white">
          <p className="font-display text-lg font-bold">¡Tu plan está activo!</p>
          <p className="mt-1 text-sm text-white/70">Programa los platos que te faltan cuando quieras, antes de que venza la vigencia.</p>
        </div>
      )}
      <ManagerLoader
        sub={sub}
        products={products}
        builder={builder.product ? { slug: builder.product.slug, name: builder.product.name, price: builder.product.price, options: builder.options } : null}
        addresses={addresses}
        deliveryZones={deliveryZones}
      />
    </div>
  );
}
