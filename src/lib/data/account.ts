import type { NavGroup } from "@/components/dashboard/types";

export const ACCOUNT_NAV_GROUPS: NavGroup[] = [
  {
    label: "Mi cuenta",
    items: [
      { href: "/cuenta", label: "Inicio", icon: "home", description: "Resumen de tu cuenta y accesos rápidos." },
      { href: "/cuenta/pedidos", label: "Mis pedidos", icon: "package", description: "Historial y estado de tus bowls y ensaladas." },
      { href: "/cuenta/suscripcion", label: "Mi suscripción", icon: "repeat", description: "Plan activo, porciones y vigencia." },
      { href: "/cuenta/entregas", label: "Entregas", icon: "calendar", description: "Calendario y franjas de tus próximas entregas." },
      { href: "/cuenta/direcciones", label: "Direcciones", icon: "map", description: "Dónde recibes tus pedidos en cobertura." },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/cuenta/perfil", label: "Mi perfil", icon: "user", description: "Foto, datos de contacto y contraseña." },
    ],
  },
];
