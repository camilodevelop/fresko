import { PaymentMethodsManager } from "@/components/catalog/PaymentMethodsManager";
import { createClient } from "@/lib/supabase/server";

export default async function PagosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("payment_methods").select("id, name, kind, needs_reference, active, sort").order("sort").order("name");
  return (
    <PaymentMethodsManager
      methods={(data ?? []).map((m) => ({ id: m.id, name: m.name, kind: m.kind as "efectivo" | "digital", needsReference: m.needs_reference, active: m.active, sort: m.sort }))}
    />
  );
}
