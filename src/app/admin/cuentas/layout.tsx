import { PageHeader } from "@/components/dashboard/ui";
import { CuentasTabs } from "@/components/finance/CuentasTabs";
import { requirePermission } from "@/lib/supabase/auth";

export default async function CuentasLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePermission("reports.view");
  return (
    <div>
      <PageHeader
        eyebrow="Negocio"
        title="Cuentas"
        description="Ventas cobradas, costo real de ingredientes y empaques, pérdidas, gastos y utilidad, por cocina o consolidado."
      />
      <CuentasTabs canManage={session.permissions.has("finance.manage")} />
      {children}
    </div>
  );
}
