const PRODUCT_IMAGE = "/images/bowl.png";

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
    price: 9900,
    image: PRODUCT_IMAGE,
    category: "ensaladas",
    tag: "Más pedido",
  },
  {
    id: "verde",
    name: "FRESKO Verde",
    ingredients: "Espinaca, brócoli, pepino, semillas, vinagreta",
    price: 9900,
    image: PRODUCT_IMAGE,
    category: "ensaladas",
  },
  {
    id: "custom",
    name: "Arma tu ensalada",
    ingredients: "Elige base, vegetales, proteína y salsa a tu gusto",
    price: 9900,
    image: PRODUCT_IMAGE,
    category: "ensaladas",
  },
  {
    id: "tropical",
    name: "FRESKO Tropical",
    ingredients: "Espinaca, mango, aguacate, coco, vinagreta",
    price: 9900,
    image: PRODUCT_IMAGE,
    category: "ensaladas",
  },
  {
    id: "mediterraneo",
    name: "FRESKO Mediterráneo",
    ingredients: "Mix verde, hummus, aceitunas, tomate, feta",
    price: 9900,
    image: PRODUCT_IMAGE,
    category: "ensaladas",
  },
  {
    id: "jamon",
    name: "FRESKO Jamón",
    ingredients: "Mix fresko, jamón serrano, huevo, aceitunas",
    price: 9900,
    image: PRODUCT_IMAGE,
    category: "ensaladas",
  },
  {
    id: "pollo",
    name: "FRESKO Pollo",
    ingredients: "Lechuga, pollo grillado, maíz, queso, ranch",
    price: 19900,
    image: PRODUCT_IMAGE,
    category: "bowls",
  },
  {
    id: "salmon",
    name: "FRESKO Salmón",
    ingredients: "Arroz, salmón, aguacate, edamame, salsa soya",
    price: 19900,
    image: PRODUCT_IMAGE,
    category: "bowls",
    tag: "Nuevo",
  },
  {
    id: "camaron",
    name: "FRESKO Camarón",
    ingredients: "Arroz, camarón, aguacate, edamame, salsa soya",
    price: 19900,
    image: PRODUCT_IMAGE,
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
    description:
      "Complementa el almuerzo de tu familia con una ensalada siempre fresca y saludable.",
    image: PRODUCT_IMAGE,
    href: "/menu?categoria=ensaladas",
  },
  {
    id: "bowls",
    name: "Bowls",
    description:
      "Resuelve tus comidas con una receta balanceada y llena de sabor.",
    image: PRODUCT_IMAGE,
    href: "/menu?categoria=bowls",
  },
] as const;
