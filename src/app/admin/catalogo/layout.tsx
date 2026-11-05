import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { PageHeader } from "@/components/dashboard/ui";
import { requirePermission } from "@/lib/supabase/auth";

export default async function CatalogoLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("catalog.manage");
  return (
    <div>
      <PageHeader
        eyebrow="Productos"
        title="Catálogo"
        description="Productos con su receta, categorías del menú e ingredientes con su costo. El costo sale de la receta y el sistema sugiere el precio con tu margen."
      />
      <CatalogTabs />
      {children}
    </div>
  );
}
