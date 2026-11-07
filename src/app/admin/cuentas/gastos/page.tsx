import { EntriesManager } from "@/components/finance/EntriesManager";
import { loadKitchens } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { todayBogota } from "@/lib/subscriptions";

export default async function GastosPage() {
  const session = await requirePermission("finance.manage");
  const supabase = await createClient();
  const [{ data: entries }, kitchens] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("id, kitchen_id, kind, category, description, amount, entry_date, recurring, ends_on")
      .order("entry_date", { ascending: false })
      .limit(300),
    loadKitchens(),
  ]);
  return <EntriesManager entries={entries ?? []} kitchens={kitchens.map((k) => ({ id: k.id, name: k.name }))} today={todayBogota()} allowGeneral={session.allKitchens} />;
}
