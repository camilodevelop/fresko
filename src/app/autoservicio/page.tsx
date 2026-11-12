import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { KioskScreen } from "@/components/counter/KioskScreen";
import { loadCounterCatalog } from "@/lib/counter";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pide aquí | FRESKO" };

/** Pantalla de autoservicio del mostrador (cuenta con rol "Pantalla de autoservicio" o un cajero). */
export default async function AutoservicioPage({ searchParams }: { searchParams: Promise<{ cocina?: string }> }) {
  const session = await requireConsentedSession("/autoservicio");
  if (!session.permissions.has("counter.kiosk") && !session.permissions.has("counter.sell")) forbidden();
  const { cocina } = await searchParams;

  const supabase = await createClient();
  const { data: kitchens } = await supabase.from("kitchens").select("id, name").eq("active", true).order("name");
  const kitchen = (kitchens ?? []).find((k) => k.id === cocina) ?? kitchens?.[0];
  if (!kitchen) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#F8F7F2] p-8 text-center">
        <p className="max-w-sm text-[#1F4D36]">Esta pantalla no tiene una cocina asignada. Pide al administrador que la asigne en Usuarios.</p>
      </main>
    );
  }

  return (
    <KioskScreen
      key={kitchen.id}
      kitchenId={kitchen.id}
      kitchenName={kitchen.name}
      catalog={await loadCounterCatalog("mostrador")}
      canPanel={session.permissions.has("admin.access")}
    />
  );
}
