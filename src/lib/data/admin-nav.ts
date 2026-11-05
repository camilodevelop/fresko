import type { NavGroup, NavItem } from "@/components/dashboard/types";
import type { Permission } from "@/lib/supabase/auth";

type AdminItem = NavItem & { permission: Permission };

const ADMIN_GROUPS: { label: string; items: AdminItem[] }[] = [
  {
    label: "General",
    items: [
      { href: "/admin", label: "Inicio", icon: "home", permission: "admin.access", description: "Resumen de tu rol." },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/admin/cocina", label: "Cocina", icon: "chef", permission: "kitchen.prepare", soon: true, description: "Producción del día y preparados." },
      { href: "/admin/rutas", label: "Rutas", icon: "truck", permission: "delivery.deliver", soon: true, description: "Entregas por zona y franja, en orden de ruta." },
    ],
  },
  {
    label: "Productos",
    items: [
      { href: "/admin/catalogo", label: "Catálogo", icon: "salad", permission: "catalog.manage", soon: true, description: "Productos, recetas e ingredientes." },
      { href: "/admin/inventario", label: "Inventario", icon: "boxes", permission: "inventory.view", soon: true, description: "Stock, alertas y pérdidas." },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/zonas", label: "Cobertura", icon: "map", permission: "zones.manage", description: "Países, ciudades, zonas y franjas." },
      { href: "/admin/usuarios", label: "Usuarios", icon: "users", permission: "users.manage", description: "Asigna roles a cada persona." },
      { href: "/admin/roles", label: "Roles y permisos", icon: "shield", permission: "roles.manage", description: "Qué puede hacer cada rol." },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/admin/perfil", label: "Mi perfil", icon: "user", permission: "admin.access", description: "Foto, datos de contacto y contraseña." },
    ],
  },
];

/** Menú del panel filtrado por los permisos del usuario. */
export function adminNavFor(permissions: Set<string>): NavGroup[] {
  return ADMIN_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter((i) => permissions.has(i.permission)),
  })).filter((g) => g.items.length > 0);
}
