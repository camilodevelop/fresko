export type NavIcon =
  | "home"
  | "package"
  | "repeat"
  | "calendar"
  | "map"
  | "user"
  | "users"
  | "shield"
  | "chef"
  | "truck"
  | "salad"
  | "boxes";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  description?: string;
  /** Se muestra deshabilitado con la etiqueta "Pronto". */
  soon?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

/** Cookie que recuerda si el menú lateral está colapsado. */
export const SIDEBAR_COOKIE = "fresko_sidebar";
