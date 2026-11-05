"use client";

import { SectionTabs } from "@/components/dashboard/SectionTabs";

export function CatalogTabs() {
  return (
    <SectionTabs
      tabs={[
        { href: "/admin/catalogo", label: "Productos", exact: true, match: /^\/admin\/catalogo\/(nuevo|categorias|[0-9a-f-]{36})/ },
        { href: "/admin/catalogo/ingredientes", label: "Ingredientes" },
      ]}
    />
  );
}
