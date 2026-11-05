/**
 * Reglas de entrega del lado del cliente (espejo de public.delivery_date_allowed).
 * La validación definitiva la hace la base de datos al crear el pedido.
 */

export type ZoneDelivery = {
  id: string;
  name: string;
  timezone: string;
  cutoffTime: string; // "08:00"
  deliveryDays: number[]; // ISO 1 = lunes … 7 = domingo
  slots: { id: string; label: string; start: string; end: string }[];
};

export const MAX_DAYS_AHEAD = 30;

/** Fecha y hora local "ahora" en la zona horaria dada. */
function localNow(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function isoWeekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export type DeliveryDay = { date: string; weekday: string; day: number; month: string; isToday: boolean; isTomorrow: boolean };

/** Próximas fechas en las que se puede entregar en la zona. */
export function availableDates(zone: ZoneDelivery, limit = 14, now = new Date(), maxAhead = MAX_DAYS_AHEAD): DeliveryDay[] {
  const { date: today, time } = localNow(zone.timezone, now);
  const out: DeliveryDay[] = [];
  for (let i = 0; i <= maxAhead && out.length < limit; i++) {
    const iso = addDays(today, i);
    if (!zone.deliveryDays.includes(isoWeekday(iso))) continue;
    if (i === 0 && time >= zone.cutoffTime.slice(0, 5)) continue;
    const [y, m, d] = iso.split("-").map(Number);
    const local = new Date(Date.UTC(y, m - 1, d, 12));
    out.push({
      date: iso,
      weekday: new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" }).format(local).replace(".", ""),
      day: d,
      month: new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" }).format(local).replace(".", ""),
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return out;
}

/** "jueves 5 de noviembre" (o "Jueves 5 de noviembre" con `capital`). */
export function formatDeliveryDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" },
  capital = false
) {
  const [y, m, d] = iso.split("-").map(Number);
  const text = new Intl.DateTimeFormat("es-CO", { ...opts, timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d, 12)))
    .replace(",", "")
    .replace(/\.(?=\s|$)/g, "");
  return capital ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export const ORDER_STATUS: Record<string, { label: string; tone: "green" | "blue" | "amber" | "red" | "gray" | "dark" }> = {
  pendiente_pago: { label: "Pendiente de pago", tone: "amber" },
  confirmado: { label: "Confirmado", tone: "blue" },
  en_preparacion: { label: "En preparación", tone: "amber" },
  en_camino: { label: "En camino", tone: "dark" },
  entregado: { label: "Entregado", tone: "green" },
  no_entregado: { label: "No entregado", tone: "red" },
  cancelado: { label: "Cancelado", tone: "red" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "gray" }> = {
  pendiente: { label: "Sin pagar", tone: "amber" },
  aprobado: { label: "Pagado", tone: "green" },
  rechazado: { label: "Pago rechazado", tone: "red" },
  reembolsado: { label: "Reembolsado", tone: "gray" },
};

/** Orden del flujo para la línea de tiempo. */
export const ORDER_FLOW = ["confirmado", "en_preparacion", "en_camino", "entregado"] as const;

/** "07:00" → "7:00 a. m."; "13:30" → "1:30 p. m." */
export function formatTime12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "a. m." : "p. m.";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
