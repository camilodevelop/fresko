import { PageHeader } from "@/components/dashboard/ui";
import { SectionTabs } from "@/components/dashboard/SectionTabs";
import { requirePermission } from "@/lib/supabase/auth";

export default async function AjustesVentaLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("catalog.manage");
  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes de venta"
        description="Las reglas con las que se vende: planes de suscripción y sus descuentos, las opciones del armador y cómo se sugieren los precios."
      />
      <SectionTabs
        tabs={[
          { href: "/admin/ajustes-venta/planes", label: "Planes" },
          { href: "/admin/ajustes-venta/armador", label: "Armador" },
          { href: "/admin/ajustes-venta/precios", label: "Precios sugeridos" },
        ]}
      />
      {children}
    </div>
  );
}
