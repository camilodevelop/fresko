import { PageHeader } from "@/components/dashboard/ui";
import { SectionTabs } from "@/components/dashboard/SectionTabs";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { forbidden } from "next/navigation";

/** Configuración → Operación: cómo trabaja cada cocina (cada pestaña con su permiso). */
export default async function OperacionLayout({ children }: { children: React.ReactNode }) {
  const session = await requireConsentedSession("/admin/operacion");
  const can = (p: string) => session.permissions.has(p);
  const tabs = [
    ...(can("zones.manage") ? [{ href: "/admin/operacion/cocinas", label: "Cocinas" }, { href: "/admin/operacion/domicilios", label: "Domicilios" }] : []),
    ...(can("points.manage") ? [{ href: "/admin/operacion/puntos", label: "Puntos de venta" }] : []),
    ...(can("catalog.manage") ? [{ href: "/admin/operacion/platos", label: "Platos preparados" }] : []),
  ];
  if (!tabs.length) forbidden();
  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Operación"
        description="Cómo trabaja cada cocina: dónde está y qué zonas atiende, cómo se reparte a domicilio, sus puntos de venta con vendedores y QR, y cuánto duran los platos preparados."
      />
      <SectionTabs tabs={tabs} />
      {children}
    </div>
  );
}
