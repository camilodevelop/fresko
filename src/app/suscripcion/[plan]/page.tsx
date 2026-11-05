import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { PlannerLoader } from "@/components/subscriptions/PlannerLoader";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { getBuilderConfig, getMenuItems, getPlans } from "@/lib/data/catalog";
import { getActiveZones } from "@/lib/data/zones";
import { loadDeliveryZones, loadMyAddresses } from "@/lib/orders";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Arma tu plan | FRESKO" };

export default async function SuscripcionPage({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: slug } = await params;
  const session = await requireConsentedSession(`/suscripcion/${slug}`);
  const supabase = await createClient();
  const [{ plans, baseValue }, products, builder, addresses, deliveryZones, coverageZones, { data: profile }, { data: planRow }] = await Promise.all([
    getPlans(),
    getMenuItems(),
    getBuilderConfig(),
    loadMyAddresses(session.userId),
    loadDeliveryZones(),
    getActiveZones(),
    supabase.from("profiles").select("phone").eq("id", session.userId).single(),
    supabase.from("subscription_plans").select("id").eq("slug", slug).eq("active", true).maybeSingle(),
  ]);
  const plan = plans.find((p) => p.slug === slug);
  if (!plan || !planRow) notFound();

  if (session.isStaff) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#F8F7F2] pt-28 pb-16">
          <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center ring-1 ring-[#1F4D36]/[0.07]">
            <p className="font-display text-xl font-bold text-[#1F4D36]">Estás con una cuenta del equipo</p>
            <p className="mt-2 text-sm text-[#1B1B1B]/60">Para comprar un plan usa una cuenta de cliente.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <ScrollToTop />
      <main className="min-h-screen bg-[#F8F7F2] pt-24 pb-16">
        <PlannerLoader
          plan={{
            id: planRow.id,
            slug: plan.slug,
            name: plan.name,
            description: plan.description,
            portions: plan.portions,
            discount: plan.discount,
            validityDays: plan.validityDays,
            benefits: plan.benefits,
          }}
          baseValue={baseValue}
          products={products}
          builder={
            builder.product
              ? { slug: builder.product.slug, name: builder.product.name, price: builder.product.price, options: builder.options }
              : null
          }
          addresses={addresses}
          deliveryZones={deliveryZones}
          coverageZones={coverageZones}
          hasPhone={Boolean(profile?.phone)}
        />
      </main>
      <Footer />
    </>
  );
}
