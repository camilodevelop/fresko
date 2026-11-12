import { OperationsSettings } from "@/components/operations/OperationsSettings";
import { requirePermission } from "@/lib/supabase/auth";
import { loadOperationsData } from "../load";

export default async function Page() {
  await requirePermission("zones.manage");
  return <OperationsSettings section="cocinas" {...await loadOperationsData()} />;
}
