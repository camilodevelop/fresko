import type { NavGroup, NavItem } from "@/components/dashboard/types";
import type { Permission } from "@/lib/supabase/auth";

/** Basta con tener uno de los permisos de la lista. */
type AdminItem = NavItem & { permission: Permission | Permission[] };

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
      { href: "/admin/pedidos", label: "Pedidos", icon: "package", permission: "orders.view", description: "Pedidos del día, estados y entregas." },
      { href: "/admin/suscripciones", label: "Suscripciones", icon: "repeat", permission: "orders.view", description: "Planes vendidos, platos usados y vigencias." },
      { href: "/admin/cocina", label: "Cocina", icon: "chef", permission: "kitchen.prepare", description: "Producción por franja y plato, tiempos y etiquetas." },
      { href: "/admin/alistamiento", label: "Alistamiento", icon: "package", permission: "kitchen.prepare", description: "Rutas por domiciliario y orden de empaque." },
      { href: "/admin/novedades", label: "Novedades", icon: "alert", permission: ["kitchen.prepare", "orders.view"], description: "Platos o pedidos que no se pudieron preparar o empacar." },
      { href: "/admin/rutas", label: "Mis rutas", icon: "truck", permission: "delivery.deliver", description: "Entregas en orden de ruta con evidencia." },
    ],
  },
  {
    label: "Productos",
    items: [
      { href: "/admin/catalogo", label: "Catálogo", icon: "salad", permission: "catalog.manage", description: "Productos, recetas e ingredientes." },
      { href: "/admin/inventario", label: "Inventario", icon: "boxes", permission: "inventory.view", description: "Stock, alertas y pérdidas." },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/ajustes-venta", label: "Ajustes de venta", icon: "sliders", permission: "catalog.manage", description: "Planes y descuentos, armador y precios sugeridos." },
      { href: "/admin/zonas", label: "Cobertura", icon: "map", permission: "zones.manage", description: "Países, ciudades, zonas y franjas." },
      { href: "/admin/operacion", label: "Operación", icon: "chef", permission: "zones.manage", description: "Cocinas y domiciliarios por zona y franja." },
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
    items: g.items.filter((i) => (Array.isArray(i.permission) ? i.permission : [i.permission]).some((p) => permissions.has(p))),
  })).filter((g) => g.items.length > 0);
}
