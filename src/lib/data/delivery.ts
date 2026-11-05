// Temporal hasta la fase de pedidos: allí las franjas salen de la zona en la base de datos.
export const DELIVERY_SLOTS = [
  { id: "am", label: "11:00 – 13:00" },
  { id: "pm", label: "13:00 – 15:00" },
] as const;

export type DeliverySlotId = (typeof DELIVERY_SLOTS)[number]["id"];

export function minDeliveryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDeliveryDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}

export function slotLabel(id?: string): string {
  return DELIVERY_SLOTS.find((s) => s.id === id)?.label ?? "";
}
