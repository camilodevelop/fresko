import type { Nutrition } from "@/lib/nutrition";

/** Producto tal como se muestra en el menú público. */
export type MenuItem = {
  id: string; // slug
  name: string;
  ingredients: string;
  price: number;
  image: string;
  category: string; // slug de la categoría
  categoryName: string;
  tag?: string;
  /** "Arma tu…": lleva al armador en vez de agregar directo al carrito. */
  builder?: boolean;
  /** Por porción; null si el producto no tiene información. */
  nutrition: Nutrition | null;
  allergens: string[];
  dietaryTags: string[];
};

/** Categoría tal como se muestra en el sitio. */
export type MenuCategory = {
  slug: string;
  name: string;
  description: string;
  image: string;
};
