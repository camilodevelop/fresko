import { redirect } from "next/navigation";

/** Se movió a Configuración → Ajustes de venta → Impuestos. */
export default function ImpuestosPage() {
  redirect("/admin/ajustes-venta/impuestos");
}
