export type MenuCategory = "all" | "ensaladas" | "bowls";

export type MenuItem = {
  id: string;
  name: string;
  ingredients: string;
  price: number;
  image: string;
  category: Exclude<MenuCategory, "all">;
  tag?: string;
};

export const CATEGORY_LABELS: Record<
  Exclude<MenuCategory, "all">,
  string
> = {
  ensaladas: "Ensaladas",
  bowls: "Bowls",
};

export const MENU_TABS: { id: MenuCategory; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "ensaladas", label: "Ensaladas" },
  { id: "bowls", label: "Bowls" },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "clasico",
    name: "FRESKO Clásico",
    ingredients: "Mix verde, tomate, pepino, zanahoria, aderezo limón",
    price: 10000,
    image: "/images/bowl.png",
    category: "ensaladas",
    tag: "Más pedido",
  },
  {
    id: "verde",
    name: "FRESKO Verde",
    ingredients: "Espinaca, brócoli, pepino, semillas, vinagreta",
    price: 9500,
    image: "/images/ejemplo.png",
    category: "ensaladas",
  },
  {
    id: "custom",
    name: "Arma tu ensalada",
    ingredients: "Elige base, vegetales, proteína y salsa a tu gusto",
    price: 10000,
    image: "/images/bowl.png",
    category: "ensaladas",
  },
  {
    id: "tropical",
    name: "FRESKO Tropical",
    ingredients: "Espinaca, mango, aguacate, coco, vinagreta",
    price: 12500,
    image: "/images/ejemplo.png",
    category: "ensaladas",
  },
  {
    id: "mediterraneo",
    name: "FRESKO Mediterráneo",
    ingredients: "Mix verde, hummus, aceitunas, tomate, feta",
    price: 13000,
    image: "/images/bowl.png",
    category: "ensaladas",
  },
  {
    id: "jamon",
    name: "FRESKO Jamón",
    ingredients: "Mix fresko, jamón serrano, huevo, aceitunas",
    price: 13500,
    image: "/images/ejemplo.png",
    category: "ensaladas",
  },
  {
    id: "pollo",
    name: "FRESKO Pollo",
    ingredients: "Lechuga, pollo grillado, maíz, queso, ranch",
    price: 14000,
    image: "/images/bowl.png",
    category: "bowls",
  },
  {
    id: "salmon",
    name: "FRESKO Salmón",
    ingredients: "Arroz, salmón, aguacate, edamame, salsa soya",
    price: 16000,
    image: "/images/ejemplo.png",
    category: "bowls",
    tag: "Nuevo",
  },
  {
    id: "camaron",
    name: "FRESKO Camarón",
    ingredients: "Arroz, camarón, aguacate, edamame, salsa soya",
    price: 16500,
    image: "/images/bowl.png",
    category: "bowls",
    tag: "Premium",
  },
];

/** Productos más pedidos en la home */
export const MOST_ORDERED_PRODUCTS = MENU_ITEMS.filter((item) =>
  ["clasico", "tropical", "pollo", "jamon", "camaron", "salmon"].includes(
    item.id
  )
);

export const PRODUCT_CATEGORIES = [
  {
    id: "ensaladas",
    name: "Ensaladas",
    description: "Frescas, ligeras y listas para personalizar a tu gusto.",
    image: "/images/ejemplo.png",
    href: "/menu?categoria=ensaladas",
  },
  {
    id: "bowls",
    name: "Bowls",
    description: "Recetas completas, balanceadas y llenas de sabor.",
    image: "/images/bowl.png",
    href: "/menu?categoria=bowls",
  },
] as const;
