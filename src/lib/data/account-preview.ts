/**
 * Datos de EJEMPLO para "Mi cuenta" mientras no existen pedidos ni suscripciones
 * reales (fases 3 y 4). Se reemplazan por consultas a la base de datos.
 */
import type { StatusTone } from "@/components/dashboard/ui";

export const PREVIEW_PLAN = {
  name: "Plan Smart",
  category: "Bowls + ensaladas",
  total: 20,
  used: 6,
  scheduled: 9,
  startsOn: "2026-11-01",
  endsOn: "2026-12-01",
  price: 349000,
};

export type PreviewDelivery = {
  date: string;
  slot: string;
  items: { name: string; qty: number; premium?: boolean }[];
  status: "programada" | "en_preparacion" | "en_camino" | "entregada";
  editable: boolean;
};

export const DELIVERY_STATUS: Record<PreviewDelivery["status"], { label: string; tone: StatusTone }> = {
  programada: { label: "Programada", tone: "blue" },
  en_preparacion: { label: "En preparación", tone: "amber" },
  en_camino: { label: "En camino", tone: "dark" },
  entregada: { label: "Entregada", tone: "green" },
};

export const PREVIEW_DELIVERIES: PreviewDelivery[] = [
  { date: "2026-11-05", slot: "11:00 – 13:00", items: [{ name: "FRESKO Pollo", qty: 1 }, { name: "FRESKO Clásico", qty: 1 }], status: "en_camino", editable: false },
  { date: "2026-11-06", slot: "13:00 – 15:00", items: [{ name: "FRESKO Salmón", qty: 1, premium: true }], status: "programada", editable: true },
  { date: "2026-11-09", slot: "11:00 – 13:00", items: [{ name: "Bowl personalizado", qty: 1 }], status: "programada", editable: true },
  { date: "2026-11-10", slot: "11:00 – 13:00", items: [{ name: "FRESKO Tropical", qty: 2 }], status: "programada", editable: true },
  { date: "2026-11-12", slot: "13:00 – 15:00", items: [{ name: "FRESKO Camarón", qty: 1, premium: true }], status: "programada", editable: true },
];

export type PreviewOrder = {
  id: string;
  date: string;
  kind: "Suscripción" | "Pedido";
  summary: string;
  total: number;
  status: { label: string; tone: StatusTone };
};

export const PREVIEW_ORDERS: PreviewOrder[] = [
  { id: "FR-1048", date: "2026-11-05", kind: "Suscripción", summary: "FRESKO Pollo, FRESKO Clásico", total: 0, status: { label: "En camino", tone: "dark" } },
  { id: "FR-1045", date: "2026-11-04", kind: "Suscripción", summary: "FRESKO Verde", total: 0, status: { label: "Entregado", tone: "green" } },
  { id: "FR-1041", date: "2026-11-03", kind: "Pedido", summary: "2× FRESKO Mediterráneo", total: 19800, status: { label: "Entregado", tone: "green" } },
  { id: "FR-1037", date: "2026-11-01", kind: "Suscripción", summary: "Plan Smart · 20 porciones", total: 349000, status: { label: "Pagado", tone: "green" } },
  { id: "FR-1029", date: "2026-10-28", kind: "Pedido", summary: "Bowl personalizado", total: 21500, status: { label: "Cancelado", tone: "red" } },
];

export const PREVIEW_ADDRESSES = [
  { label: "Casa", address: "Calle 38 Sur # 78-20", detail: "Apto 502, torre 3", zone: "Kennedy", primary: true },
  { label: "Oficina", address: "Av. Américas # 71C-60", detail: "Piso 4, recepción", zone: "Kennedy", primary: false },
];

export function formatLongDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
}

export function formatShortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

export function dayParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(date).replace(".", ""),
    day: d,
    month: new Intl.DateTimeFormat("es-CO", { month: "short" }).format(date).replace(".", ""),
  };
}
