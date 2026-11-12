import { forbidden } from "next/navigation";
import { TaxManager } from "@/components/finance/TaxManager";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { todayBogota } from "@/lib/subscriptions";

/** Impuesto incluido en los precios (IVA o impoconsumo) y desde cuándo rige cada tasa. */
export default async function ImpuestosPage() {
  const session = await requirePermission("finance.manage");
  if (!session.allKitchens) forbidden();
  const supabase = await createClient();
  const { data } = await supabase.from("tax_rates").select("id, name, rate, valid_from").order("valid_from", { ascending: false });
  return <TaxManager rates={(data ?? []).map((r) => ({ ...r, rate: Number(r.rate) }))} today={todayBogota()} />;
}
