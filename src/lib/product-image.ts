/** Imagen genérica (bowl recortado con fondo transparente) para productos sin foto. */
export const FALLBACK_PRODUCT_IMAGE = "/images/bowl.png";

/**
 * Las fotos llenan el recuadro (cover); la imagen genérica y los PNG recortados
 * se muestran completos (contain) para no cortar el bowl.
 */
export function isCutoutImage(src: string | null | undefined) {
  return !src || src === FALLBACK_PRODUCT_IMAGE || /\.png($|\?)/i.test(src);
}

/** Fotos incluidas en el proyecto (public/images/productos, licencia Unsplash). */
export const STOCK_PRODUCT_IMAGES = [
  { src: "/images/productos/fresko-clasico.webp", label: "Ensalada verde" },
  { src: "/images/productos/fresko-verde.webp", label: "Ensalada fresca" },
  { src: "/images/productos/fresko-tropical.webp", label: "Bowl tropical" },
  { src: "/images/productos/fresko-mediterraneo.webp", label: "Mediterránea" },
  { src: "/images/productos/fresko-jamon.webp", label: "Atún y huevo" },
  { src: "/images/productos/fresko-pollo.webp", label: "Pollo" },
  { src: "/images/productos/fresko-salmon.webp", label: "Salmón" },
  { src: "/images/productos/fresko-camaron.webp", label: "Camarón" },
  { src: "/images/productos/arma-tu-bowl.webp", label: "Bowl de colores" },
  { src: "/images/productos/arma-tu-ensalada.webp", label: "César" },
  { src: "/images/productos/categoria-ensaladas.webp", label: "Garbanzos" },
  { src: "/images/productos/categoria-bowls.webp", label: "Pollo y arroz" },
];

/** Fotos de ingredientes incluidas en el proyecto (public/images/ingredientes). */
export const STOCK_INGREDIENT_IMAGES = [
  "arroz-cocido", "espinaca-baby", "lechuga-crespa", "mix-verde", "aceitunas", "brocoli", "edamame", "maiz-tierno",
  "pepino", "tomate", "zanahoria", "aguacate", "coco-rallado", "mango", "atun", "camaron", "huevo", "hummus",
  "jamon-serrano", "pollo", "salmon", "tofu", "queso-feta", "queso-fresco", "croutons", "semillas", "nueces",
  "aderezo-limon", "aderezo-yogurt",
].map((file) => ({ src: `/images/ingredientes/${file}.webp`, label: file.replace(/-/g, " ") }));
