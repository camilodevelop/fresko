import { PlansManager } from "@/components/catalog/PlansManager";
import { loadPlans, loadPricingSettings } from "@/lib/catalog-admin";
import { recommendedBaseValue } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default async function PlanesPage() {
  const supabase = await createClient();
  const [plans, settings, { data: products }] = await Promise.all([
    loadPlans(),
    loadPricingSettings(),
    supabase.from("products").select("price").eq("active", true).eq("kind", "fixed"),
  ]);
  return (
    <PlansManager
      plans={plans}
      baseValue={settings.planBaseValue}
      recommended={recommendedBaseValue((products ?? []).map((p) => p.price))}
    />
  );
}
