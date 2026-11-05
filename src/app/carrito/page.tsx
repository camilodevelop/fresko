import type { Metadata } from "next";
import { CheckoutView } from "@/components/cart/CheckoutView";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getActiveZones } from "@/lib/data/zones";
import { loadDeliveryZones, loadMyAddresses } from "@/lib/orders";
import { getSession } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Carrito | FRESKO" };

export default async function CarritoPage() {
  const session = supabaseConfigured ? await getSession() : null;
  if (session?.needsConsent) redirect("/legal/aceptar?next=/carrito");
  const supabase = session ? await createClient() : null;
  const [addresses, deliveryZones, coverageZones, profile] = await Promise.all([
    session ? loadMyAddresses(session.userId) : Promise.resolve([]),
    supabaseConfigured ? loadDeliveryZones() : Promise.resolve([]),
    getActiveZones(),
    supabase && session
      ? supabase.from("profiles").select("phone").eq("id", session.userId).single().then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8F7F2] pt-24 pb-16">
        <CheckoutView
          signedIn={Boolean(session)}
          isStaff={Boolean(session?.isStaff)}
          hasPhone={Boolean(profile?.phone)}
          addresses={addresses}
          deliveryZones={deliveryZones}
          coverageZones={coverageZones}
        />
      </main>
      <Footer />
    </>
  );
}
