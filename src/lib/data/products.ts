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
};

/** Categoría tal como se muestra en el sitio. */
export type MenuCategory = {
  slug: string;
  name: string;
  description: string;
  image: string;
};
