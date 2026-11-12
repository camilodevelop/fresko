import { redirect } from "next/navigation";
import { requireConsentedSession } from "@/lib/supabase/auth";

export default async function OperacionPage() {
  const session = await requireConsentedSession("/admin/operacion");
  const can = (p: string) => session.permissions.has(p);
  redirect(can("zones.manage") ? "/admin/operacion/cocinas" : can("points.manage") ? "/admin/operacion/puntos" : "/admin/operacion/platos");
}
