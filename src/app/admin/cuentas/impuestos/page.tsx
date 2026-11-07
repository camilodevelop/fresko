import { TaxManager } from "@/components/finance/TaxManager";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { todayBogota } from "@/lib/subscriptions";

export default async function ImpuestosPage() {
  await requirePermission("finance.manage");
  const supabase = await createClient();
  const { data } = await supabase.from("tax_rates").select("id, name, rate, valid_from").order("valid_from", { ascending: false });
  return <TaxManager rates={(data ?? []).map((r) => ({ ...r, rate: Number(r.rate) }))} today={todayBogota()} />;
}
