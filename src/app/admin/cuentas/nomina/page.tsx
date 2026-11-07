import { PayrollManager } from "@/components/finance/PayrollManager";
import { loadKitchens } from "@/lib/operations";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { todayBogota } from "@/lib/subscriptions";

export default async function NominaPage() {
  const session = await requirePermission("finance.manage");
  const supabase = await createClient();
  const [{ data: roles }, { data: pay }, kitchens] = await Promise.all([
    supabase.from("roles").select("id, key, name, kitchen_assignable"),
    supabase.from("employee_pay").select("user_id, kitchen_id, pay_type, amount, active, starts_on"),
    loadKitchens(),
  ]);
  // Equipo: quien tiene un rol de operación (cocina o domicilios), más quien ya tenga un pago registrado.
  // El administrador de cocina registra la nómina de su equipo (cocineros y domiciliarios), no la suya.
  const staffRoles = (roles ?? []).filter((r) => r.key !== "cliente" && r.key !== "admin" && (session.allKitchens || r.kitchen_assignable));
  const { data: links } = staffRoles.length
    ? await supabase.from("user_roles").select("user_id, role_id").in("role_id", staffRoles.map((r) => r.id))
    : { data: [] as { user_id: string; role_id: string }[] };
  const ids = [...new Set([...(links ?? []).map((l) => l.user_id), ...(pay ?? []).map((p) => p.user_id)])].filter((id) => session.allKitchens || id !== session.userId);
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email, active").in("id", ids) : { data: [] };
  const roleNames = (uid: string) =>
    (links ?? [])
      .filter((l) => l.user_id === uid)
      .map((l) => staffRoles.find((r) => r.id === l.role_id)?.name)
      .filter(Boolean)
      .join(" · ");
  const rows = (people ?? [])
    .map((p) => ({ id: p.id, name: p.full_name || p.email || "Sin nombre", roles: roleNames(p.id), active: p.active, pay: (pay ?? []).find((x) => x.user_id === p.id) ?? null }))
    .sort((a, b) => Number(Boolean(b.pay)) - Number(Boolean(a.pay)) || a.name.localeCompare(b.name));

  return <PayrollManager rows={rows} kitchens={kitchens.map((k) => ({ id: k.id, name: k.name }))} monthStart={`${todayBogota().slice(0, 8)}01`} allowGeneral={session.allKitchens} />;
}
