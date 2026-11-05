import { redirect } from "next/navigation";

// Las categorías de producto viven ahora dentro de Productos.
export default function CategoriasPage() {
  redirect("/admin/catalogo?vista=categorias");
}
