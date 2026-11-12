import { redirect } from "next/navigation";

/** Se movió a Configuración → Operación → Platos preparados. */
export default function VidaUtilPage() {
  redirect("/admin/operacion/platos");
}
