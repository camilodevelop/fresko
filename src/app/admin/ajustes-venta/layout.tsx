import { PageHeader } from "@/components/dashboard/ui";
import { SectionTabs } from "@/components/dashboard/SectionTabs";
import { requirePermission } from "@/lib/supabase/auth";

export default async function AjustesVentaLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePermission("catalog.manage");
  const taxes = session.permissions.has("finance.manage") && session.allKitchens;
  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes de venta"
        description="Las reglas comerciales: planes de suscripción y sus descuentos, opciones del armador, cómo se sugieren los precios, el precio en cada canal, los métodos de pago y el impuesto incluido en los precios."
      />
      <SectionTabs
        tabs={[
          { href: "/admin/ajustes-venta/planes", label: "Planes" },
          { href: "/admin/ajustes-venta/armador", label: "Armador" },
          { href: "/admin/ajustes-venta/precios", label: "Precios sugeridos" },
          { href: "/admin/ajustes-venta/canales", label: "Precios por canal" },
          { href: "/admin/ajustes-venta/pagos", label: "Métodos de pago" },
          ...(taxes ? [{ href: "/admin/ajustes-venta/impuestos", label: "Impuestos" }] : []),
        ]}
      />
      {children}
    </div>
  );
}
