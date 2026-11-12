import type { StatusTone } from "@/components/dashboard/ui";
import type { LoadStatus } from "@/lib/points";

/** Estados de la carga de un punto, para mostrar. */
export const LOAD_STATUS_UI: Record<LoadStatus, { label: string; tone: StatusTone }> = {
  planeada: { label: "Planeada", tone: "gray" },
  en_produccion: { label: "En cocina", tone: "amber" },
  despachada: { label: "En camino", tone: "blue" },
  en_venta: { label: "Vendiendo", tone: "green" },
  cerrada: { label: "Cerrada", tone: "dark" },
  cancelada: { label: "Cancelada", tone: "red" },
};
